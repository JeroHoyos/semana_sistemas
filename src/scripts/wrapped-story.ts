/* =============================================
   WRAPPED STORY (index.html, loaded only when "Ver mi wrapped" is pressed)
   A full-screen story in the style of Spotify Wrapped, with original music made live with Web Audio.
   It runs inside an iframe (srcdoc) so its own styles and short class names never meet Tailwind or
   global.css. wrapped-story.html is the page; this module only fills its %%KEYS%% with the person's data.
   Every text a person typed (names) goes through escapeHtml; monster colors through monsterColor.
   ============================================= */
import template from './wrapped-story.html?raw';
import { COMPANIES, GROUPS, SPEAKERS, ACTIVITIES } from '@/data/content';
import { escapeHtml, findDay, titleText } from '@/lib/common';
import { drawCrest, drawCustomMonster, monsterColor } from '@/lib/icons';
import { PIXEL_ART, drawPixelArt } from '@/lib/pixel-art';
import { storyData, type Wrapped } from '@/lib/wrapped';

const KIND = {
	talk: { label: 'Charlas', color: '#8b5fd6', card: 'CHARLA' },
	workshop: { label: 'Talleres', color: '#1f9d7a', card: 'TALLER' },
	competition: { label: 'Competencia', color: '#ff2a4b', card: 'COMPETENCIA' },
	social: { label: 'Social', color: '#d97706', card: 'SOCIAL' },
};
const AURAS = {
	talk: [['Mente', 'Curiosa'], 'Viniste a escuchar, preguntar y aprender. Te llevas más ideas que nadie.'],
	workshop: [['Alma', 'Constructora'], 'Viniste a meter las manos al código. Si se puede construir, lo construyes.'],
	competition: [['Fiera', 'Competitiva'], 'Viniste a ganar. Cada reto fue una excusa para darlo todo.'],
	estratega: [['Estratega', 'del Susto'], 'Mitad cerebro, mitad adrenalina: escuchas, aprendes y luego compites.'],
	libre: [['Espíritu', 'Libre'], 'Viviste la Semana a tu manera: entre el Sustómetro, los juegos y los secretos.'],
} as const;
const TITLE_COLORS = ['#1667c2', '#2f9e5b', '#c4358c', '#d97706', '#8b5fd6', '#0e7490'];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const shortTitle = (title: string) => title.replace(/^(Torneo|Carrera) de /, '');
const inner = (svg: string) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

// The monster saying hello: the ID card drawing plus a waving arm
function wavingMonster(monster, color: string) {
	const arm = `<g class="arm"><path d="M100 74 Q116 62 118 40" fill="none" stroke="#2a2f36" stroke-width="13" stroke-linecap="round"/><path d="M100 74 Q116 62 118 40" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"/><circle cx="118" cy="36" r="8.5" fill="${color}" stroke="#2a2f36" stroke-width="2.5"/></g>`;
	return `<svg viewBox="0 0 132 100" preserveAspectRatio="xMidYMax meet">${inner(drawCustomMonster(monster))}${arm}</svg>`;
}

// The whole monster, with legs and arms, for the chase (the pupils get a class so they can look around)
function fullMonster(monster) {
	const color = monsterColor(monster);
	const body = inner(drawCustomMonster(monster)).replaceAll('fill="#05080c"', 'class="pup" fill="#05080c"');
	const leg = (c: string, x: number) => `<g class="${c}"><rect x="${x - 8}" y="96" width="16" height="26" rx="7" fill="${color}" stroke="#2a2f36" stroke-width="2.5"/><ellipse cx="${x + 3}" cy="124" rx="12" ry="6" fill="#2a2f36"/></g>`;
	const arm = (c: string, x1: number, x2: number) => `<g class="${c}"><path d="M${x1} 72 Q${x2} 84 ${x2} 96" fill="none" stroke="#2a2f36" stroke-width="11" stroke-linecap="round"/><path d="M${x1} 72 Q${x2} 84 ${x2} 96" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/></g>`;
	return `<svg viewBox="-8 0 136 132">${leg('legL', 42)}${leg('legR', 78)}${arm('armL', 18, 6)}${arm('armR', 102, 114)}${body}</svg>`;
}

function fill(w: Wrapped) {
	const s = storyData(w);
	const me = drawCustomMonster(w.monstruo);
	const color = monsterColor(w.monstruo);
	const name = w.nombre.trim() || 'Asustador';
	const style = typeof w.monstruo.estilo === 'string' ? w.monstruo.estilo : '';
	const [auraName, auraText] = AURAS[s.aura];
	const best = s.best;
	const mate = s.mate;
	const mateWord = mate?.monstruo?.estilo === 'femenino' ? 'tu compañera' : 'tu compañero';
	const placeOf = (id: string) => s.places.find((p) => p.id === id)?.place;

	// Fan of activity cards (up to 5), spread around the center
	const cards = s.attended.slice(0, 5);
	const fan = cards.map((a, i) => {
		const o = i - (cards.length - 1) / 2;
		const kind = KIND[a.type] ?? KIND.social;
		const title = a.title.length > 42 ? `${a.title.slice(0, 40)}…` : a.title;
		return `<div class="card" style="background:${kind.color};--x:${o * 56}px;--r:${o * 7.5}deg;--y:${Math.abs(o) * 10}px;--d:${0.7 + i * 0.15}s"><small>${kind.card}</small>${escapeHtml(title)}</div>`;
	}).join('');

	const above = [...w.vecinos].reverse();
	const board = above.map((p, i) => `<div class="rk" style="animation-delay:${0.3 + i * 0.1}s"><b>#${w.puesto - above.length + i}</b><span class="mi">${drawCustomMonster(p.monstruo)}</span><span>${escapeHtml(p.nombre)}</span><span>${p.puntos}</span></div>`).join('')
		+ `<div class="rk me" style="animation-delay:${0.3 + above.length * 0.1}s"><b>#${w.puesto}</b><span class="mi">${me}</span><span>Tú</span><span>${w.puntos}</span></div>`;

	const medalArt = !best ? '' : drawPixelArt(best.place === 1 ? PIXEL_ART.medal01 : best.place === 2 ? PIXEL_ART.medal10 : best.place === 3 ? PIXEL_ART.medal11 : PIXEL_ART.cup);
	const bestLine = !best ? '' : ['¡Campeón! Nadie pudo contigo.', 'Llegaste a la gran final. Plata… <span class="acc">por ahora.</span>', 'Podio asegurado. Bronce con sabor a gloria.'][best.place - 1] ?? 'Entre los mejores. El próximo año vas por la medalla.';
	const bestTeam = best && w.equipos.some((e) => e.actividad === best.id);

	const teams = w.equipos.map((team) => {
		const activity = ACTIVITIES.find((a) => a.id === team.actividad);
		const kind = activity ? KIND[activity.type] ?? KIND.competition : KIND.competition;
		const names = team.companeros.map((p) => escapeHtml(p.nombre.split(' ')[0]));
		const withWho = names.length ? `con ${names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}` : names[0]}` : 'en solitario';
		const place = placeOf(team.actividad);
		return `<div class="team b" style="--c:${kind.color};--an:left"><div><b>${escapeHtml(activity?.title ?? team.nombre)}</b><p>${withWho}${place ? ` · ${place}.º puesto` : ''}</p></div><div class="mates">${team.companeros.slice(0, 3).map((p) => `<span>${drawCustomMonster(p.monstruo)}</span>`).join('')}</div></div>`;
	}).join('');

	const titles = s.titles.map((t, i) => `<div class="ttl" style="--d:${0.8 + i * 0.3}s"><span class="band" style="background:${TITLE_COLORS[i % TITLE_COLORS.length]}">${escapeHtml(titleText(t, style))}</span><p>${escapeHtml(t.description ?? '')}</p>${t.limit ? `<span class="rare">SOLO ${t.limit} LO TIENEN</span>` : ''}</div>`).join('');
	const missing = s.titlesTotal - s.titles.length;

	const kinds = (['talk', 'competition', 'workshop'] as const).filter((k) => s.share[k] > 0);
	const rank = w.puntos > 0 ? `#${w.puesto} · Top ${s.top}%` : '—';
	const stats: [string, string][] = [
		['SUSTÓMETRO', `${w.puntos} pts`],
		['RANKING', rank],
		['MEJOR PUESTO', best ? `${best.place}° ${shortTitle(best.title)}` : '—'],
		['ASISTENCIA', `${s.attended.length} · ${String(s.hours).replace('.', ',')} h`],
		[mate?.monstruo?.estilo === 'femenino' ? 'COMPAÑERA' : 'COMPAÑERO', mate ? mate.nombre.split(' ').slice(0, 2).join(' ') : '—'],
		['TÍTULOS', `${s.titles.length} / ${s.titlesTotal}`],
	];

	// Floating collage: five pieces of the week, with fallbacks when something is missing
	const pieces = [
		[`<span style="font-size:44px">${w.puntos}</span>sustos`, '#e04848'],
		[me, 'var(--me)'],
		best ? [`<span style="font-size:42px">${best.place}°</span>${escapeHtml(shortTitle(best.title))}`, '#c4358c'] : [`<span style="font-size:42px">${s.titles.length}</span>títulos`, '#c4358c'],
		mate ? [escapeHtml(mate.nombre), '#1f9d7a'] : [`<span style="font-size:36px">${s.attended.length}</span>actividades`, '#1f9d7a'],
		[`<span style="font-size:36px">${w.puntos > 0 ? `#${w.puesto}` : '👾'}</span>${w.puntos > 0 ? `Top ${s.top}%` : 'Asustador'}`, 'var(--acc);color:var(--ink)'],
	];
	const spots = ['left:4%;top:20px;width:118px;height:138px;--r:-10deg;--fx:-200px;--fy:-100px', 'left:30%;top:70px;width:150px;height:170px;--r:3deg;--fx:0px;--fy:300px;padding:6px', 'right:4%;top:14px;width:118px;height:130px;--r:12deg;--fx:200px;--fy:-80px', 'left:8%;top:200px;width:112px;height:110px;--r:8deg;--fx:-200px;--fy:200px', 'right:6%;top:185px;width:122px;height:120px;--r:-8deg;--fx:220px;--fy:200px'];
	const collage = pieces.map(([html, bg], i) => `<div style="${spots[i]};background:${bg};--d:${0.5 + i * 0.2}s">${html}</div>`).join('');

	const data = {
		points: w.puntos,
		color,
		name,
		meSvg: me,
		bucket: s.bucket,
		search: best ? best.title.slice(0, Math.max(6, Math.ceil(best.title.length * 0.7))) : '',
		aura: auraName,
		stats,
	};

	const values: Record<string, string> = {
		MECOLOR: color,
		CREST: drawCrest(),
		ME: me,
		ME_WAVE: wavingMonster(w.monstruo, color),
		FULL_ME: fullMonster(w.monstruo),
		FULL_MATE: mate ? fullMonster(mate.monstruo) : '',
		FIRST: escapeHtml(name.split(' ')[0]),
		NAME: escapeHtml(name.split(' ').slice(0, 2).join(' ')),
		MONSTRUOS: String(w.monstruos),
		SUSTOS: String(w.sustos),
		N_ACTIVIDADES: String(ACTIVITIES.length),
		N_PONENTES: String(SPEAKERS.filter((sp) => sp.name).length),
		COMPANIES: COMPANIES.map((c) => `<div class="co"><img src="${c.logo}" alt="${escapeHtml(c.name)}"></div>`).join(''),
		SPEAKERS: SPEAKERS.filter((sp) => sp.photo).map((sp) => `<div class="sp" style="--c:${sp.color}"><div><img src="${sp.photo}" alt=""></div><p>${escapeHtml(sp.name)}</p></div>`).join(''),
		GROUPS: GROUPS.filter((g) => g.logo).map((g) => `<div class="gr"><img src="${g.logo}" alt="${escapeHtml(g.name)}"></div>`).join(''),
		SKIP_ATT: s.attended.length ? '' : '1',
		N_ATT: plural(s.attended.length, 'vez', 'veces'),
		FAN: fan,
		HOURS: String(s.hours),
		HOURS_DEC: Number.isInteger(s.hours) ? '0' : '1',
		N_COMP: String(s.competitions),
		COMP_LABEL: s.competitions === 1 ? 'competencia' : 'competencias',
		RANK_BIG: w.puntos > 0 ? `Top ${s.top}%` : '—',
		RANK_SMALL: w.puntos > 0 ? 'de todo el campus' : 'aún sin sustos',
		TANK_LEFT: w.puntos < 100 ? String(100 - w.puntos) : '💥',
		TANK_LEFT_LABEL: w.puntos < 100 ? 'sustos para reventarlo 😱' : '¡reventaste el tanque!',
		SKIP_RANK: w.puntos > 0 ? '' : '1',
		PARTICIPANTES: String(w.participantes),
		PUESTO: String(w.puesto),
		RANK_LINE: w.puesto === 1 ? '¡Nadie asustó más que <span class="acc">tú</span>!' : `Superaste al <span class="acc">${100 - s.top}%</span> de los asustadores.`,
		BOARD: board,
		GAP_LINE: s.gap > 0 ? `A solo <b class="acc">${plural(s.gap, 'susto', 'sustos')}</b> del puesto ${w.puesto - 1} 👀` : 'Lo más alto del Sustómetro 👑',
		SKIP_BEST: best ? '' : '1',
		MEDAL: medalArt,
		BEST_TITLE: escapeHtml(best?.title ?? ''),
		BEST_DAY: escapeHtml(best ? findDay(best.day)?.name ?? '' : ''),
		BEST_PLACE: String(best?.place ?? ''),
		BEST_OF: best?.of ? `de ${best.of} ${bestTeam ? 'equipos' : 'participantes'}` : '',
		BEST_LINE: bestLine,
		SKIP_MATE: mate ? '' : '1',
		MATE_WORD: mateWord,
		MATE_NAME: escapeHtml(mate?.nombre ?? ''),
		MATE_LINE: mate ? `${plural(mate.teams.length, 'competencia', 'competencias')} en el mismo equipo. Inseparables (aunque no siempre coordinados).` : '',
		TEAMS: teams,
		TITLES_HEAD: `Desbloqueaste ${plural(s.titles.length, 'título', 'títulos')}`,
		TITLES: titles,
		LOCKS: '<span>🔒</span>'.repeat(missing),
		TITLES_LINE: missing ? `Te ${missing === 1 ? 'quedó 1' : `quedaron ${missing}`} por descubrir… ¿el próximo año?` : '¡Los coleccionaste todos! Leyenda.',
		AURA_NAME: auraName.join(' '),
		AURA_BR: auraName.join('<br>'),
		AURA_TEXT: auraText,
		METER: kinds.map((k) => `<span style="--c:${KIND[k].color}" data-w="${s.share[k]}"></span>`).join(''),
		LEGEND: kinds.map((k) => `<span style="--c:${KIND[k].color}">${KIND[k].label} ${s.share[k]}%</span>`).join(''),
		COLLAGE: collage,
		STATS: stats.map(([k, v]) => `<div><small>${k}</small><b>${escapeHtml(v)}</b></div>`).join(''),
		// "<" escaped so a name can never close the script tag
		DATA: JSON.stringify(data).replaceAll('<', '\\u003c'),
	};
	return template.replace(/%%([A-Z_]+)%%/g, (_, key) => values[key] ?? '');
}

export function openStory(w: Wrapped) {
	const overlay = document.createElement('div');
	overlay.className = 'wrapped-story';
	const frame = document.createElement('iframe');
	frame.title = 'Tu wrapped de la Semana de Sistemas';
	frame.allow = 'autoplay; web-share';
	frame.srcdoc = fill(w);
	overlay.append(frame);
	document.body.append(overlay);
	document.documentElement.style.overflow = 'hidden';

	const close = (event: MessageEvent) => {
		if (event.source !== frame.contentWindow || event.data !== 'wrapped-close') return;
		window.removeEventListener('message', close);
		overlay.remove();   // removing the iframe also stops its music
		document.documentElement.style.overflow = '';
	};
	window.addEventListener('message', close);
	frame.focus();
}
