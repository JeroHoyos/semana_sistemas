// Wrapped: cache key, checks for the data kept in localStorage, and the story numbers (no DOM, no Supabase).
// Bump WRAPPED_VERSION when the shape of mi_wrapped() changes, so old copies are ignored.
import { ACTIVITIES, TITLES } from '@/data/content';
import { buildRounds } from '@/lib/brackets';
import { stripAccents } from '@/lib/common';

export const WRAPPED_VERSION = 2;
const KEY_PREFIX = 'semana_sistemas_wrapped_';

type Monster = Record<string, unknown>;
type Person = { nombre: string; monstruo: Monster };
type Result = { nombre: string; puesto: number | string };

export type Wrapped = {
	puntos: number;
	puesto: number;
	participantes: number;
	juegos: { juego: string; puntaje: number; partidas: number }[];
	actividades: number;
	secretos: number;
	nombre: string;
	monstruo: Monster;
	vecinos: (Person & { puntos: number })[];
	monstruos: number;
	sustos: number;
	asistencias: string[];
	individuales: string[];
	equipos: { actividad: string; nombre: string; companeros: (Person & { id: string })[] }[];
	clasificaciones: { actividad: string; resultados: Result[] }[];
	llaves: { actividad: string; participantes: (string | null)[]; ganadores: Record<string, number> }[];
};

// One entry per person: a shared browser never shows another person's wrapped.
export const wrappedKey = (userId: string) => `${KEY_PREFIX}${WRAPPED_VERSION}_${userId}`;

const isList = (value: unknown, check: (item: any) => boolean) => Array.isArray(value) && value.every(check);
const isText = (value: unknown) => typeof value === 'string';
const isPerson = (p: any) => isText(p?.nombre) && !!p.monstruo && typeof p.monstruo === 'object';

export function isWrapped(value: unknown): value is Wrapped {
	const w = value as Wrapped | null;
	return (
		!!w &&
		typeof w === 'object' &&
		[w.puntos, w.puesto, w.participantes, w.actividades, w.secretos, w.monstruos, w.sustos].every(Number.isFinite) &&
		isList(w.juegos, (g) => isText(g?.juego) && Number.isFinite(g.puntaje) && Number.isFinite(g.partidas)) &&
		isPerson(w) &&
		isList(w.vecinos, (p) => isPerson(p) && Number.isFinite(p.puntos)) &&
		isList(w.asistencias, isText) &&
		isList(w.individuales, isText) &&
		isList(w.equipos, (e) => isText(e?.actividad) && isText(e.nombre) && isList(e.companeros, (p) => isPerson(p) && isText(p.id))) &&
		isList(w.clasificaciones, (c) => isText(c?.actividad) && Array.isArray(c.resultados)) &&
		isList(w.llaves, (l) => isText(l?.actividad) && Array.isArray(l.participantes) && !!l.ganadores && typeof l.ganadores === 'object')
	);
}

// The saved text, or null if it is missing or broken (the browser can edit it).
export function parseWrapped(raw: string | null): Wrapped | null {
	try {
		const value = raw ? JSON.parse(raw) : null;
		return isWrapped(value) ? value : null;
	} catch {
		return null;
	}
}

/* ---------- Story numbers ---------- */

const same = (a: unknown, b: unknown) => stripAccents(String(a ?? '')).trim().toLowerCase() === stripAccents(String(b ?? '')).trim().toLowerCase();
const hours = (start: string, end: string) => {
	const [h1, m1] = start.split(':').map(Number);
	const [h2, m2] = end.split(':').map(Number);
	return (h2 * 60 + m2 - h1 * 60 - m1) / 60;
};

// Where a name finished in a bracket: champion 1, final loser 2, activity.thirdPlace 3,
// otherwise the best place of the round they went out in (out in the quarterfinals → 5).
function bracketPlace(bracket, name: string, thirdPlace?: string) {
	if (!bracket.participantes.some((p) => same(p, name))) return null;
	const { rounds, champion } = buildRounds(bracket);
	if (same(champion, name)) return 1;
	if (thirdPlace && same(thirdPlace, name)) return 3;
	for (let r = 0; r < rounds.length; r++) {
		const lost = rounds[r].find((m) => m.winner !== null && same(m.sides[1 - m.winner], name));
		if (lost) return 2 ** (rounds.length - r - 1) + 1;
	}
	return null; // still in a bracket that never finished
}

// Every number and choice the story shows, computed from mi_wrapped() (titles come in the monster, as the ID card saves them).
export function storyData(w: Wrapped) {
	// Activities the person was at: attended talks/workshops and the competitions they entered
	const competitions = [...w.individuales, ...w.equipos.map((e) => e.actividad)];
	const attended = [...new Set([...w.asistencias, ...competitions])]
		.map((id) => ACTIVITIES.find((a) => a.id === id))
		.filter(Boolean);
	const totalHours = attended.reduce((sum, a) => sum + hours(a.start, a.end), 0);

	// Places in competitions: by the person's name or their team's name
	const places = competitions.map((id) => {
		const activity = ACTIVITIES.find((a) => a.id === id);
		if (!activity) return null;
		const name = w.equipos.find((e) => e.actividad === id)?.nombre ?? w.nombre;
		const standing = w.clasificaciones.find((c) => c.actividad === id);
		const bracket = w.llaves.find((l) => l.actividad === id);
		const row = standing?.resultados.find((r) => same(r.nombre, name));
		const place = row && Number.isFinite(Number(row.puesto)) ? Number(row.puesto) : bracket ? bracketPlace(bracket, name, activity.thirdPlace) : null;
		const of = standing ? standing.resultados.length : bracket ? bracket.participantes.filter(Boolean).length : 0;
		return place ? { id, title: activity.title, day: activity.day, place, of } : null;
	}).filter(Boolean).sort((a, b) => a.place - b.place);

	// Favorite teammate: the one shared in the most team competitions
	const counts = new Map<string, { person: Person; teams: string[] }>();
	w.equipos.forEach((team) => team.companeros.forEach((p) => {
		const entry = counts.get(p.id) ?? { person: p, teams: [] };
		entry.teams.push(team.actividad);
		counts.set(p.id, entry);
	}));
	const mate = [...counts.values()].sort((a, b) => b.teams.length - a.teams.length)[0] ?? null;

	// Aura: the share of each kind of activity
	const kinds = ['talk', 'workshop', 'competition'] as const;
	const share = Object.fromEntries(kinds.map((k) => [k, attended.length ? Math.round((attended.filter((a) => a.type === k).length / attended.length) * 100) : 0]));
	const [first, second] = [...kinds].sort((a, b) => share[b] - share[a]);
	const aura = !attended.length ? 'libre'
		: share[first] - share[second] <= 15 && share[second] > 0 ? 'estratega'
		: first;

	const titleIds = Array.isArray(w.monstruo.titulos) ? w.monstruo.titulos.filter(isText) : [];
	const titles = ['asustador', ...titleIds]
		.filter((id, i, all) => all.indexOf(id) === i)
		.map((id) => TITLES.find((t) => t.id === id && !t.adminOnly))
		.filter(Boolean);

	const top = w.participantes ? Math.max(1, Math.ceil((w.puesto / w.participantes) * 100)) : 100;
	return {
		attended,
		hours: Math.round(totalHours * 10) / 10,
		competitions: attended.filter((a) => a.type === 'competition').length,
		places,
		best: places[0] ?? null,
		mate: mate && { ...mate.person, teams: mate.teams },
		aura,
		share,
		titles,
		titlesTotal: TITLES.filter((t) => !t.adminOnly).length,
		top,
		bucket: w.puesto <= 3 ? 'top3' : w.puesto <= 10 ? 'top10' : w.puesto <= 50 ? 'top50' : 'more',
		gap: w.vecinos.length ? w.vecinos[0].puntos - w.puntos : 0,
	};
}
