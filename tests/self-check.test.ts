// Checks for the risky shared logic: run them with `pnpm test`.
import { describe, expect, it } from 'vitest';

import { ACTIVITIES, isArgenisAlias, isClown, isLargoAlias, isSupervisorAccount } from '@/data/content';
import { doomScore } from '@/games/doom';
import { BYE, buildRounds, firstRound, sortStandings } from '@/lib/brackets';
import { parseWrapped, storyData, wrappedKey } from '@/lib/wrapped';
import {
	colombiaDay,
	escapeHtml,
	findActivity,
	findGroup,
	findTitle,
	handleOf,
	isCurrentSupervisor,
	isStrictSupervisor,
	medalForTier,
	scarePoints,
	stripAccents,
} from '@/lib/common';
import { DEFAULT_BANNER, DEFAULT_MONSTER, drawBanner, drawCustomMonster, monsterColor } from '@/lib/icons';
import { PIXEL_ART } from '@/lib/pixel-art';

describe('medals', () => {
	it('come from the position tier (RPC mi_puesto_sustometro)', () => {
		expect([1, 2, 3, 4, null, 0].map(medalForTier)).toEqual(['gold', 'silver', 'bronze', null, null, null]);
	});
});

describe('clowns', () => {
	it('keep every old rule', () => {
		expect(isClown('a@unal.edu.co', 'Ana', { es_payaso: true })).toBe(true);
		expect(isClown('a@unal.edu.co', 'Ana', { monstruo: { es_payaso: 'true' } })).toBe(true);
		expect(isClown('armarina@unal.edu.co', 'Ana')).toBe(true);
		expect(isClown('a@unal.edu.co', '01101100')).toBe(true);
		expect(isClown('a@unal.edu.co', 'Armarina')).toBe(true);
		expect(isClown('a@unal.edu.co', 'Juan Armarina')).toBe(true);
		expect(isClown('argenis.marin@unal.edu.co', 'Ana')).toBe(true);
		expect(isClown('x@unal.edu.co', 'Argenis Marín')).toBe(true);
		expect(isArgenisAlias('armarin@unal.edu.co', 'Ana')).toBe(true);
		expect(isLargoAlias('imlargo@unal.edu.co', '01101100')).toBe(true);
		expect(isClown('ana@unal.edu.co', 'Ana Gómez')).toBe(false);
	});

	it('never get points', () => {
		expect(scarePoints({ correo: 'imlargo@unal.edu.co', nombre: 'x', puntos: 500 })).toBe(0);
		expect(scarePoints({ correo: 'ana@unal.edu.co', nombre: 'Ana', puntos: '40' })).toBe(40);
	});

	it('are never supervisors', () => {
		expect(isClown('saescobara@unal.edu.co', 'Santiago Escobar Arias', { es_payaso: true })).toBe(false);
		expect(isClown('lcanasq@unal.edu.co', 'Luzarait Cañas Quintero', { es_payaso: true })).toBe(false);
	});
});

describe('user text', () => {
	it('cannot become HTML', () => {
		expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe('&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;');
		expect(escapeHtml(null)).toBe('');
	});

	it('cannot inject through a monster', () => {
		expect(monsterColor({ color: '"><script>' })).toBe(DEFAULT_MONSTER.color);
		expect(monsterColor({ color: '#2f9e5b' })).toBe('#2f9e5b');
		expect(drawCustomMonster({ color: '"><script>' })).not.toContain('<script');
		expect(drawCustomMonster({ cuerpo: '__proto__', ojos: 'constructor' }).startsWith('<svg')).toBe(true);
		expect(drawCustomMonster({ accesorio: 'smoking' })).toContain('monster-smoking');
	});

	it('cannot inject through a team banner (equipos.bandera)', () => {
		const hostile = drawBanner({ letras: '<img src=x onerror=alert(1)>', fondo: '"><script>', tinta: 'red', fuente: '__proto__', adorno: 'constructor' });
		expect(hostile).not.toMatch(/<(img|script)/);
		expect(hostile).toContain(`fill="${DEFAULT_BANNER.fondo}"`);
		expect(hostile).toContain(`fill="${DEFAULT_BANNER.tinta}"`);
		expect(drawBanner({ letras: 'ΣΣΚΑΒ' })).toContain('>ΣΣΚΑ</text>');
		expect(drawBanner({ fondo: '#2f8f5b', tinta: '#f5c814' })).toContain('fill="#f5c814"');
	});
});

describe('doom points (the leaderboard accepts 1 to 1000)', () => {
	const run = (seconds, kills, items, secrets) =>
		doomScore({ tics: seconds * 35, kills, totalKills: 6, items, totalItems: 37, secrets, totalSecrets: 3 });

	it('adds up the factors', () => {
		expect(run(30, 6, 37, 3).points).toBe(1000);
		expect(run(300, 0, 0, 0).points).toBe(0);
		expect(run(60, 3, 0, 1).points).toBe(200 + 0 + 67 + 170);
		expect(doomScore({ tics: 0, kills: 0, totalKills: 0, items: 0, totalItems: 0, secrets: 0, totalSecrets: 0 }).points).toBe(200);
		expect(run(45, 2, 10, 0).lines).toHaveLength(4);
	});
});

describe('dates and text', () => {
	it('the day resets at midnight in Colombia, like registrar_puntaje_juego', () => {
		expect(colombiaDay(new Date('2026-11-05T04:59:00Z'))).toBe('2026-11-04');
		expect(colombiaDay(new Date('2026-11-05T05:00:00Z'))).toBe('2026-11-05');
	});

	it('handles and accents', () => {
		expect(handleOf('ana@unal.edu.co')).toBe('ana');
		expect(stripAccents('Fútbol')).toBe('Futbol');
	});
});

describe('supervisors', () => {
	it('only app_metadata.supervisor counts as a session flag', () => {
		expect(isCurrentSupervisor({ app_metadata: { supervisor: true } })).toBe(true);
		expect(isCurrentSupervisor({ user_metadata: { titulos: ['supervisor'] } })).toBe(false);
		expect(isCurrentSupervisor({ user_metadata: { titulo: 'supervisor' } })).toBe(false);
		expect(isCurrentSupervisor(null)).toBe(false);
	});

	it('destructive controls trust only app_metadata.supervisor', () => {
		expect(isStrictSupervisor({ app_metadata: { supervisor: true } })).toBe(true);
		expect(isStrictSupervisor({ user_metadata: { full_name: 'Santiago Escobar' } })).toBe(false);
		expect(isStrictSupervisor({ email: 'saescobara@unal.edu.co' })).toBe(false);
		expect(isStrictSupervisor({ user_metadata: { titulos: ['supervisor'] } })).toBe(false);
		expect(isStrictSupervisor(null)).toBe(false);
	});

	it('are recognized by email, handle or name', () => {
		expect(isSupervisorAccount('saescobara@unal.edu.co')).toBe(true);
		expect(isSupervisorAccount('linavarrop')).toBe(true);
		expect(isSupervisorAccount('x@unal.edu.co', 'Juan David Perez Lopez')).toBe(true);
		expect(isSupervisorAccount('lcanasq')).toBe(true);
		expect(isSupervisorAccount('x@unal.edu.co', 'Luzarait Cañas Quintero')).toBe(true);
		expect(isSupervisorAccount('juperezlo@unal.edu.co')).toBe(true);
	});
});

describe('event data', () => {
	it('finds groups, companies, activities and titles', () => {
		expect(findGroup('unalgoritmo')?.name).toBe('UNAlgoritmo');
		expect(findGroup('lovelytics')?.name).toBe('Lovelytics');
		expect(findGroup('sole')?.name).toBe('Solē');
		expect(findGroup('tcs')?.name).toBe('TCS');
		expect(findActivity('just-dance')?.title).toBe('Torneo de Just Dance');
		expect(findActivity('clash-royale')?.individual?.max).toBe(32);
		expect(findTitle('franco-impero')?.name).toBe('Franco Impero 🇮🇹');
	});

	it('pre-registration caps match cupos_conferencia (supabase/preinscripciones-conferencias.sql)', () => {
		const capByModality = { 'aula-maxima': 100, aula: 40, virtual: 70 };
		for (const activity of ACTIVITIES.filter((a) => a.preRegister)) {
			expect(activity.preRegister.max, activity.id).toBe(capByModality[activity.preRegister.modalidad]);
		}
	});

	it('competitions without a bracket use standings', () => {
		for (const id of ['observacion', 'atletismo', 'maraton']) {
			const activity = findActivity(id);
			expect(Boolean((activity?.team || activity?.individual) && !activity?.bracket), id).toBe(true);
		}
	});

	it('every row of a pixel art drawing has the same length', () => {
		for (const [name, art] of Object.entries(PIXEL_ART)) {
			expect(art.rows.every((row) => row.length === art.rows[0].length), name).toBe(true);
		}
	});
});

describe('brackets', () => {
	const slots = (names) => firstRound(names).map((side) => (side === BYE ? '-' : side));

	it('spread the byes one per match', () => {
		expect(slots(['a', 'b', 'c', 'd'])).toEqual(['a', 'b', 'c', 'd']);
		expect(slots(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toEqual(['a', 'e', 'b', 'f', 'c', 'g', 'd', '-']);
		expect(slots(['a', 'b', 'c', 'd', 'e'])).toEqual(['a', 'e', 'b', '-', 'c', '-', 'd', '-']);
		expect(slots(['a', null, 'b', 'c'])).toEqual(['a', '-', 'b', 'c']);
	});

	it('find the champion', () => {
		expect(buildRounds({ participantes: ['a', 'b', 'c', 'd'], ganadores: { '0-0': 1, '0-1': 0, '1-0': 0 } }).champion).toBe('b');
		expect(buildRounds({ participantes: ['a', 'b', 'c', 'd'], ganadores: {} }).champion).toBe(null);
		expect(buildRounds({ participantes: ['a', null, null, null], ganadores: {} }).champion).toBe('a');
		expect(buildRounds({ participantes: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], ganadores: { '0-0': 0, '0-1': 1, '0-2': 1, '1-0': 1, '1-1': 0, '2-0': 1 } }).champion).toBe('g');
	});

	it('only count a result between two people', () => {
		expect(buildRounds({ participantes: ['a', 'b', 'c'], ganadores: {} }).rounds[1][0].sides).toEqual([null, 'b']);
		expect(buildRounds({ participantes: ['a', 'b', 'c', 'd'], ganadores: { '1-0': 0 } }).rounds[1][0].winner).toBe(null);
	});

	it('sort standings by place, then DNF', () => {
		const sorted = sortStandings([
			{ nombre: 'Equipo Gamma', puesto: 'DNF' },
			{ nombre: 'Equipo Beta', puesto: 2 },
			{ nombre: 'Equipo Alfa', puesto: 1 },
			{ nombre: 'Equipo Delta', puesto: 3 },
			{ nombre: 'Equipo Epsilon', puesto: 'DNF' },
		]).map((r) => `${r.puesto}:${r.nombre}`);
		expect(sorted).toEqual(['1:Equipo Alfa', '2:Equipo Beta', '3:Equipo Delta', 'DNF:Equipo Epsilon', 'DNF:Equipo Gamma']);
	});
});

describe('wrapped cache', () => {
const sample = {
puntos: 5, puesto: 2, participantes: 10, juegos: [{ juego: 'snake', puntaje: 40, partidas: 3 }], actividades: 1, secretos: 0,
nombre: 'Ana', monstruo: {}, vecinos: [], monstruos: 20, sustos: 300, asistencias: [], individuales: [], equipos: [], clasificaciones: [], llaves: [],
};
it('keys the cache by person', () => {
expect(wrappedKey('a')).not.toBe(wrappedKey('b'));
});
it('accepts a valid copy and rejects broken or edited ones', () => {
expect(parseWrapped(JSON.stringify(sample))).toEqual(sample);
expect(parseWrapped(null)).toBeNull();
expect(parseWrapped('{oops')).toBeNull();
expect(parseWrapped(JSON.stringify({ ...sample, puntos: '<img>' }))).toBeNull();
expect(parseWrapped(JSON.stringify({ ...sample, juegos: [{ juego: 1 }] }))).toBeNull();
expect(parseWrapped(JSON.stringify({ ...sample, vecinos: [{ nombre: 1 }] }))).toBeNull();
});
});

describe('wrapped story', () => {
const base = parseWrapped(JSON.stringify({
puntos: 87, puesto: 7, participantes: 140, juegos: [], actividades: 2, secretos: 0,
nombre: 'Ana Pérez', monstruo: { titulos: ['debugger', 'supervisor'] }, vecinos: [{ nombre: 'B', monstruo: {}, puntos: 91 }],
monstruos: 150, sustos: 9000, asistencias: ['datos'], individuales: ['clash-royale'],
equipos: [{ actividad: 'maraton', nombre: 'Los Bits', companeros: [{ id: 'x', nombre: 'Sara', monstruo: {} }] }],
clasificaciones: [{ actividad: 'maraton', resultados: [{ nombre: 'los bits', puesto: 4 }] }],
llaves: [{ actividad: 'clash-royale', participantes: ['Ana Pérez', 'Leo', 'Max', 'Sol'], ganadores: { '0-0': 0, '0-1': 1, '1-0': 1 } }],
}))!;
it('finds places in standings and brackets, best first', () => {
const s = storyData(base);
expect(s.places.map((p) => [p.id, p.place])).toEqual([['clash-royale', 2], ['maraton', 4]]);
expect(s.best?.place).toBe(2);
});
it('picks the teammate, the titles and the guess bucket', () => {
const s = storyData(base);
expect(s.mate?.nombre).toBe('Sara');
expect(s.titles.map((t) => t.id)).toEqual(['asustador', 'debugger']);   // admin-only titles never show
expect(s.bucket).toBe('top10');
expect(s.gap).toBe(4);
});
});
