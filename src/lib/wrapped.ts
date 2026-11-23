// Wrapped: cache key and checks for the data kept in localStorage (no DOM, no Supabase).
// Bump WRAPPED_VERSION when the shape of mi_wrapped() changes, so old copies are ignored.
export const WRAPPED_VERSION = 1;
const KEY_PREFIX = 'semana_sistemas_wrapped_';

export type Wrapped = {
	puntos: number;
	puesto: number;
	participantes: number;
	juegos: { juego: string; puntaje: number; partidas: number }[];
	actividades: number;
	secretos: number;
};

// One entry per person: a shared browser never shows another person's wrapped.
export const wrappedKey = (userId: string) => `${KEY_PREFIX}${WRAPPED_VERSION}_${userId}`;

export function isWrapped(value: unknown): value is Wrapped {
	const w = value as Wrapped | null;
	return (
		!!w &&
		typeof w === 'object' &&
		[w.puntos, w.puesto, w.participantes, w.actividades, w.secretos].every(Number.isFinite) &&
		Array.isArray(w.juegos) &&
		w.juegos.every((g) => typeof g?.juego === 'string' && Number.isFinite(g.puntaje) && Number.isFinite(g.partidas))
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
