/* =============================================
   PARTICIPANTS AND BRACKETS
   On the page of a competition with sign-ups (evento.html?id=clash-royale), whoever is signed up,
   each with a little flag. Then the knockout bracket, for the activities with `bracket: true` in
   js/data.js. It reads the 'llaves' table (supabase/brackets.sql).
   Supervisors mark the winners and edit the participants right here; Supabase checks that they
   really are supervisors.
   ============================================= */

const BYE = Symbol('bye');   // empty first-round slot: whoever faces it goes through
const ROUND_NAMES = { 1: 'Final', 2: 'Semifinal', 4: 'Cuartos de final', 8: 'Octavos de final', 16: 'Dieciseisavos' };

let participants = [];       // whoever is signed up, as { name, banner } (a team) or { name, monster } (a person)
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

// A participant's little flag: a team flies the banner its captain designed, a person a pennant
// in their monster's color with the monster on it.
function flagHtml(participant) {
  return participant.banner
    ? drawBanner(participant.banner)
    : `<span class="monster-flag" style="--cloth: ${monsterColor(participant.monster)}">${drawCustomMonster(participant.monster)}</span>`;
}

// How far each one got in the bracket: matches won (a free pass does not count), and who lost one
function standings() {
  const wins = new Map();
  const out = new Set();
  const played = bracket
    ? buildRounds(bracket).rounds.flat().filter((match) => match.winner !== null && match.sides.every((side) => typeof side === 'string'))
    : [];
  for (const { sides, winner } of played) {
    wins.set(sides[winner], (wins.get(sides[winner]) ?? 0) + 1);
    out.add(sides[1 - winner]);
  }
  return { wins, out };
}

// A section folded under its title, closed at first so the page stays short. When it is drawn
// again it stays as the person left it.
function foldHtml(container, title, body) {
  const open = $(`${container} > .fold`)?.open ? 'open' : '';
  return `<details class="fold" ${open}><summary><h2 class="event__subtitle">${title}</h2></summary>${body}</details>`;
}

// Furthest along first: whoever is still in, by matches won, then the knocked out, with their
// flag gone dark. Ties keep sign-up order. When the order changes, the flags glide to their place.
function renderParticipants() {
  if (!participants.length) return;
  const { wins, out } = standings();
  const score = ({ name }) => (out.has(name) ? 0 : 1000) + (wins.get(name) ?? 0);
  const order = participants.map((participant, i) => ({ participant, i })).sort((a, b) => score(b.participant) - score(a.participant));
  const before = new Map([...document.querySelectorAll('.flags__item')].map((item) => [item.dataset.i, item.getBoundingClientRect()]));

  $('#participants').innerHTML = foldHtml('#participants', `Participantes · ${participants.length}`, `
    <ul class="flags">
      ${order.map(({ participant, i }) => `
        <li class="flags__item ${out.has(participant.name) ? 'flags__item--out' : ''}" data-i="${i}">${flagHtml(participant)}<span>${escapeHtml(participant.name)}</span></li>
      `).join('')}
    </ul>
  `);
  glideFlags(before);
}

// Each flag that moved starts where it was and slides, with a little bounce, to its new place
function glideFlags(before) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.flags__item').forEach((item, n) => {
    const from = before.get(item.dataset.i);
    const to = item.getBoundingClientRect();
    if (!from || (from.left === to.left && from.top === to.top)) return;
    item.animate(
      [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)` }, { transform: 'none' }],
      { duration: 800, delay: n * 25, easing: 'cubic-bezier(.3, 1.35, .5, 1)', fill: 'backwards' },
    );
  });
}

function sideHtml(match, i) {
  const name = match.sides[i];
  const state = typeof name !== 'string' ? 'empty' : match.winner === i ? 'won' : match.winner !== null ? 'lost' : '';
  const text = name === BYE ? 'Pase libre' : name === null ? 'Por definir' : escapeHtml(name);
  const playable = bracketAdmin && match.sides.every((side) => typeof side === 'string');
  const participant = typeof name === 'string' && participants.find((p) => p.name === name);
  const content = `${participant ? `<span class="bracket__flag">${flagHtml(participant)}</span>` : ''}<span title="${text}">${text}</span>`;

  return playable
    ? `<button type="button" class="bracket__side bracket__side--${state}" data-match="${match.key}" data-side="${i}">${content}</button>`
    : `<span class="bracket__side bracket__side--${state}">${content}</span>`;
}

// The slot around a match draws its lines. They light up gold along the path of whoever goes
// through: the one out once the match has a winner, the one in once someone has reached it.
function slotHtml(match) {
  const won = match.winner !== null ? ' bracket__slot--won' : '';
  const reached = match.sides.some((side) => typeof side === 'string') ? ' bracket__slot--reached' : '';
  return `<li class="bracket__slot${won}${reached}"><div class="bracket__match">${sideHtml(match, 0)}${sideHtml(match, 1)}</div></li>`;
}

function bracketHtml() {
  const { rounds, champion } = buildRounds(bracket);
  return `
    <div class="bracket__scroll">
      <div class="bracket__rounds">
        ${rounds.map((matches) => `
          <div class="bracket__round">
            <h3>${ROUND_NAMES[matches.length] || `Ronda de ${matches.length * 2}`}</h3>
            <ol>${matches.map(slotHtml).join('')}</ol>
          </div>
        `).join('')}
        <div class="bracket__round bracket__round--champion">
          <h3>Campeón</h3>
          <ol><li class="bracket__slot${champion ? ' bracket__slot--reached' : ''}">
            <div class="bracket__champion ${champion ? '' : 'bracket__champion--empty'}">${ICONS.trophy}<span>${champion ? escapeHtml(champion) : '¿Quién será?'}</span></div>
          </li></ol>
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
  renderParticipants();   // their flags show who is out
  reseeded = false;   // the editor shows what is stored again
  if (!bracket && !bracketAdmin) {
    $('#bracket').innerHTML = '';
    return;
  }
  $('#bracket').innerHTML = foldHtml('#bracket', 'Llaves', `
    ${bracket ? bracketHtml() : '<p class="event__bio">Las llaves todavía no han empezado.</p>'}
    ${bracketAdmin ? editorHtml() : ''}
    <p class="bracket__message" role="status"></p>
  `);
}


/* ---------- Reading and saving ---------- */

// Whoever is signed up, in sign-up order. Returns the error, if any.
async function loadParticipants() {
  const { data, error } = activity.team
    ? await supabaseClient.rpc('equipos_inscritos')
    : await supabaseClient.rpc('inscritos_individuales', { p_actividad: activity.id });
  if (error) return error;
  participants = data
    .filter((row) => !activity.team || row.actividad === activity.id)
    .map((row) => ({ name: row.nombre, banner: row.bandera, monster: row.monstruo || {} }));
}

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
  const error = await loadParticipants();
  if (error) {
    $('.bracket__message').textContent = `No se pudieron leer los inscritos: ${error.message}`;
    return;
  }
  const names = participants.map((participant) => participant.name);
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

// The participants come first, so the bracket can show their flags
async function startCompetition() {
  const error = await loadParticipants();
  if (error) console.warn('[Participantes]', error.message);
  renderParticipants();
  if (!activity.bracket) return;

  const { data } = await supabaseClient.auth.getSession();
  bracketAdmin = isCurrentSupervisor(data.session?.user ?? null);
  await loadBracket();
  renderBracket();
}

if (activity?.team || activity?.individual) startCompetition();
