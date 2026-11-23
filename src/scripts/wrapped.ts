/* =============================================
   WRAPPED BANNER (index.html)
   Shows the logged-in person's own summary. The first time it asks Supabase (mi_wrapped, which
   answers only for the session's user) and keeps the answer in localStorage: later visits make no request.
   ============================================= */
import { $ } from '@/lib/common';
import { supabaseClient } from '@/lib/supabase';
import { parseWrapped, wrappedKey, type Wrapped } from '@/lib/wrapped';

const GAME_NAMES: Record<string, string> = { snake: 'Snake', doom: 'Doom', defrag: 'Defrag' };
const banner = $('#wrapped');
const body = $('#wrapped-body');
const number = (value: number) => value.toLocaleString('es-CO');

function stat(value: string, label: string) {
	return `<li class="wrapped__stat"><strong>${value}</strong><span>${label}</span></li>`;
}

function showMessage(text: string) {
	body.innerHTML = `<p class="wrapped__message">${text}</p>`;
}

function showWrapped(w: Wrapped) {
	const games = w.juegos
		.filter((game) => GAME_NAMES[game.juego])
		.sort((a, b) => b.puntaje - a.puntaje);
	const best = games[0];
	body.innerHTML = `
		<ul class="wrapped__stats">
			${stat(number(w.puntos), 'puntos en el Sustómetro')}
			${stat(w.puntos > 0 ? `#${number(w.puesto)}` : '—', w.puntos > 0 ? `de ${number(w.participantes)} personas` : 'aún sin puntos')}
			${stat(number(w.actividades), w.actividades === 1 ? 'competencia' : 'competencias')}
			${stat(number(w.secretos), w.secretos === 1 ? 'secreto encontrado' : 'secretos encontrados')}
			${best ? stat(number(best.puntaje), `tu récord en ${GAME_NAMES[best.juego]}`) : ''}
		</ul>`;
}

function showLoggedOut() {
	body.innerHTML = `
		<p class="wrapped__message">Inicia sesión para ver tu resumen de la semana.</p>
		<button class="hero__button" type="button" id="wrapped-login">Iniciar sesión</button>`;
	$('#wrapped-login').addEventListener('click', () => $('#btn-open-auth').click());
}

let shownUserId: string | null | undefined;

async function showFor(userId: string | null) {
	if (userId === shownUserId) return;
	shownUserId = userId;
	if (!userId) return showLoggedOut();

	const cached = parseWrapped(localStorage.getItem(wrappedKey(userId)));
	if (cached) return showWrapped(cached);

	showMessage('Preparando tu wrapped…');
	const { data, error } = await supabaseClient.rpc('mi_wrapped');
	if (shownUserId !== userId) return; // the person changed while waiting
	const wrapped = error ? null : parseWrapped(JSON.stringify(data));
	if (!wrapped) {
		shownUserId = undefined; // try again on the next visit; nothing is cached
		return showMessage('No pudimos cargar tu wrapped. Intenta de nuevo más tarde.');
	}
	try {
		localStorage.setItem(wrappedKey(userId), JSON.stringify(wrapped));
	} catch {
		// full or blocked storage: it shows now and will be asked again next time
	}
	showWrapped(wrapped);
}

banner.hidden = false;
supabaseClient.auth.onAuthStateChange((_event, session) => {
	// Not async on purpose: supabase-js can deadlock if its callback awaits another Supabase call.
	setTimeout(() => void showFor(session?.user?.id ?? null), 0);
});
