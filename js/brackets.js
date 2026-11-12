/* =============================================
   BRACKETS
   The knockout bracket on a competition's page (evento.html?id=clash-royale), for the activities
   with `bracket: true` in js/data.js. It reads the 'llaves' table (supabase/brackets.sql).
   Supervisors mark the winners and edit the participants right here; Supabase checks that they
   really are supervisors.
   ============================================= */

const BYE = Symbol('bye');   // empty first-round slot: whoever faces it goes through
const ROUND_NAMES = { 1: 'Final', 2: 'Semifinal', 4: 'Cuartos de final', 8: 'Octavos de final', 16: 'Dieciseisavos' };

let bracket = null;          // { participantes, ganadores } as stored, or null if it has not started
let bracketAdmin = false;         // supervisor: shows the controls
let reseeded = false;        // the editor list came from "Cargar inscritos": its results start empty
let bracketBusy = false;     // a write is on its way


/* ---------- Building the rounds ---------- */

// The first round, two by two, with a bye for each null. If the count is not a power of two, the
// missing byes are spread one per match (top slots first, then bottom ones), so nobody gets two.
function firstRound(names) {
  const size = 2 ** Math.ceil(Math.log2(Math.max(names.length, 2)));
  const half = size / 2;
  const slots = names.length === size
    ? names
    : Array.from({ length: size }, (_, i) => names[i % 2 ? half + (i - 1) / 2 : i / 2]);
  return slots.map((name) => name ?? BYE);
}

// Which side goes through: a bye lets the other one through; two people need a result marked.
function winnerSide([top, bottom], marked) {
  if (top === BYE) return bottom === BYE ? null : 1;
  if (bottom === BYE) return 0;
  if (top === null || bottom === null) return null;   // a rival is not decided yet
  return marked === 0 || marked === 1 ? marked : null;
}

// Every round's matches, and the champion. A side is a name, BYE, or null (not decided yet).
function buildRounds({ participantes, ganadores }) {
  let sides = firstRound(participantes);
  const rounds = [];
  while (sides.length > 1) {
    const round = rounds.length;
    const matches = [];
    for (let m = 0; m < sides.length / 2; m++) {
      const pair = [sides[2 * m], sides[2 * m + 1]];
      matches.push({ key: `${round}-${m}`, sides: pair, winner: winnerSide(pair, ganadores[`${round}-${m}`]) });
    }
    rounds.push(matches);
    sides = matches.map(({ sides: pair, winner }) => (winner !== null ? pair[winner] : pair.every((s) => s === BYE) ? BYE : null));
  }
  return { rounds, champion: typeof sides[0] === 'string' ? sides[0] : null };
}


/* ---------- Drawing ---------- */

function sideHtml(match, i) {
  const name = match.sides[i];
  const state = typeof name !== 'string' ? 'empty' : match.winner === i ? 'won' : match.winner !== null ? 'lost' : '';
  const text = name === BYE ? 'Pase libre' : name === null ? 'Por definir' : escapeHtml(name);
  const playable = bracketAdmin && match.sides.every((side) => typeof side === 'string');

  return playable
    ? `<button type="button" class="bracket__side bracket__side--${state}" data-match="${match.key}" data-side="${i}">${text}</button>`
    : `<span class="bracket__side bracket__side--${state}">${text}</span>`;
}

function bracketHtml() {
  const { rounds, champion } = buildRounds(bracket);
  return `
    <div class="bracket__scroll">
      <div class="bracket__rounds">
        ${rounds.map((matches) => `
          <div class="bracket__round">
            <h3>${ROUND_NAMES[matches.length] || `Ronda de ${matches.length * 2}`}</h3>
            <ol>${matches.map((match) => `<li class="bracket__match">${sideHtml(match, 0)}${sideHtml(match, 1)}</li>`).join('')}</ol>
          </div>
        `).join('')}
        <div class="bracket__round bracket__round--champion">
          <h3>Campeón</h3>
          <ol><li class="bracket__match"><span class="bracket__side bracket__side--${champion ? 'won' : 'empty'}">${ICONS.trophy}${champion ? escapeHtml(champion) : 'Por definir'}</span></li></ol>
        </div>
      </div>
    </div>
    ${bracketAdmin ? '<p class="event__bio">Toca un nombre para marcarlo como ganador; tócalo otra vez para quitarlo.</p>' : ''}
  `;
}

// Supervisors: the participants, one per line, ready to edit
function editorHtml() {
  const lines = bracket ? firstRound(bracket.participantes).map((name) => (name === BYE ? '-' : name)).join('\n') : '';
  return `
    <details class="bracket__editor" ${bracket ? '' : 'open'}>
      <summary>${bracket ? 'Editar participantes' : 'Iniciar llaves'}</summary>
      <p class="event__bio">Un nombre por línea: el 1.º juega contra el 2.º, el 3.º contra el 4.º… Escribe - para un pase libre.
        «Cargar inscritos» los pone al azar y empieza sin resultados. Guardar la lista vacía borra las llaves.</p>
      <textarea class="bracket__names" rows="10" spellcheck="false">${escapeHtml(lines)}</textarea>
      <div class="auth-edit__buttons">
        <button type="button" class="week-button auth-edit__cancel" data-action="load">Cargar inscritos</button>
        <button type="button" class="hero__button auth-form__submit auth-edit__save" data-action="save">Guardar llaves</button>
      </div>
    </details>
  `;
}

function renderBracket() {
  reseeded = false;   // the editor shows what is stored again
  if (!bracket && !bracketAdmin) {
    $('#bracket').innerHTML = '';
    return;
  }
  $('#bracket').innerHTML = `
    <h2 class="event__subtitle">Llaves</h2>
    ${bracket ? bracketHtml() : '<p class="event__bio">Las llaves todavía no han empezado.</p>'}
    ${bracketAdmin ? editorHtml() : ''}
    <p class="bracket__message" role="status"></p>
  `;
}


/* ---------- Reading and saving ---------- */

async function loadBracket() {
  const { data, error } = await supabaseClient.from('llaves').select('participantes, ganadores').eq('actividad', activity.id).maybeSingle();
  if (error) console.warn('[Llaves]', error.message);
  else bracket = data;
}

// Runs a write, then reads the bracket again (it also brings what other supervisors marked).
// If it fails, the page stays as it is so nothing typed in the editor is lost.
async function saveBracket(rpc, params) {
  if (bracketBusy) return false;
  bracketBusy = true;
  const { error } = await supabaseClient.rpc(rpc, { p_actividad: activity.id, ...params });
  if (!error) await loadBracket();
  bracketBusy = false;
  if (error) $('.bracket__message').textContent = `No se pudo guardar: ${error.message}`;
  else renderBracket();
  return !error;
}

// Marks a side as the winner, or clears it if it already was. The later matches it fed are cleared:
// whoever went through may have changed.
function markWinner(key, side) {
  const [round, match] = key.split('-').map(Number);
  const changes = { [key]: bracket.ganadores[key] === side ? null : side };
  const rounds = Math.log2(firstRound(bracket.participantes).length);
  for (let r = round + 1, m = match >> 1; r < rounds; r++, m >>= 1) changes[`${r}-${m}`] = null;
  saveBracket('marcar_ganadores', { p_ganadores: changes });
}

async function saveNames() {
  const names = $('.bracket__names').value.split('\n').map((line) => line.trim()).filter(Boolean);
  if (!names.length && !confirm('¿Borrar las llaves de esta competencia?')) return;
  await saveBracket('guardar_llave', {
    p_participantes: names.map((name) => (name === '-' ? null : name)),
    p_ganadores: reseeded ? {} : bracket?.ganadores ?? {},
  });
}

// Fills the editor with whoever is signed up, shuffled
async function loadRegistered() {
  const { data, error } = activity.team
    ? await supabaseClient.rpc('equipos_inscritos')
    : await supabaseClient.rpc('inscritos_individuales', { p_actividad: activity.id });
  if (error) {
    $('.bracket__message').textContent = `No se pudieron leer los inscritos: ${error.message}`;
    return;
  }
  const names = data.filter((row) => !activity.team || row.actividad === activity.id).map((row) => row.nombre);
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  $('.bracket__names').value = firstRound(names).map((name) => (name === BYE ? '-' : name)).join('\n');
  reseeded = true;
  $('.bracket__message').textContent = `${names.length} inscritos al azar. Revisa y toca «Guardar llaves».`;
}

$('#bracket')?.addEventListener('click', (event) => {
  const side = event.target.closest('[data-match]');
  if (side) markWinner(side.dataset.match, Number(side.dataset.side));
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'save') saveNames();
  if (action === 'load') loadRegistered();
});

async function startBracket() {
  const { data } = await supabaseClient.auth.getSession();
  bracketAdmin = isCurrentSupervisor(data.session?.user ?? null);
  await loadBracket();
  renderBracket();
}

if (activity?.bracket) startBracket();
