/* =============================================
   TEAM REGISTRATION (inscripciones.html)
   For the competitions with `team` in ACTIVITIES (data.js). Whoever creates a team is its captain:
   they leave their phone, design the banner and sign up the others by the email of their account.
   Everything goes through the Supabase functions in supabase/teams.sql, which enforce the limits;
   the checks here only spare the person a request that would fail.
   ============================================= */

const TEAM_ACTIVITIES = ACTIVITIES.filter((activity) => activity.team);

// The competition on screen: the one in the address (inscripciones.html?id=futbol) or the first one
let shownActivity = TEAM_ACTIVITIES.find((activity) => activity.id === new URLSearchParams(location.search).get('id'))
  || TEAM_ACTIVITIES[0];

let teams = null;        // every team of every competition (rows from equipos_inscritos); null until loaded
let loadFailed = false;

const teamsShown = () => (teams || []).filter((team) => team.actividad === shownActivity.id);
const myTeam = () => teamsShown().find((team) => team.miembros?.some((member) => member.id === currentUser?.id));
const noSpotsLeft = () => shownActivity.team.maxTeams && teamsShown().length >= shownActivity.team.maxTeams;
const loadingText = () => (loadFailed
  ? 'No se pudieron cargar los equipos. Recarga la página en un momento.'
  : 'Cargando equipos…');

function showMessage(element, text, isError = true) {
  element.textContent = text;
  element.className = `auth-message ${isError ? 'auth-message--error' : 'auth-message--success'}`;
  element.hidden = false;
}


/* ---------- Drawing the page ---------- */

function render() {
  renderTabs();
  renderSummary();
  renderMyTeam();
  renderTeamList();
}

function renderTabs() {
  $('#registration-tabs').innerHTML = TEAM_ACTIVITIES.map((activity) => `
    <button class="day" type="button" data-id="${activity.id}" aria-pressed="${activity === shownActivity}">
      ${ICONS[activity.icon]}
      <strong>${activity.team.tab}</strong>
    </button>
  `).join('');
}

// The same fact boxes as an activity page. With a team limit, a bar shows how full it is.
function renderSummary() {
  const { team } = shownActivity;
  const day = findDay(shownActivity.day);
  const count = teamsShown().length;
  let signedUp = `${count} ${count === 1 ? 'equipo' : 'equipos'}`;
  if (team.maxTeams) {
    signedUp = `${count} de ${team.maxTeams} equipos
      <span class="registration__bar" style="--filled: ${Math.min(100, count / team.maxTeams * 100)}%"></span>`;
  }
  if (!teams) signedUp = loadFailed ? '—' : '…';

  const facts = [
    { icon: ICONS.calendar, name: 'Cuándo', value: `${day.name} ${day.date}, ${shownActivity.start}` },
    { icon: ICONS.people, name: 'Equipos', value: `Hasta ${team.size} personas` },
    { icon: ICONS.trophy, name: 'Inscritos', value: signedUp },
  ];

  $('#registration-summary').innerHTML = `
    <dl class="event__facts">
      ${facts.map((fact) => `<div><dt>${fact.icon}${fact.name}</dt><dd>${fact.value}</dd></div>`).join('')}
    </dl>
  `;
}

function renderMyTeam() {
  const panel = $('#my-team');

  if (!currentUser) {
    panel.innerHTML = `
      <p class="registration__text">Inicia sesión con tu carnet para crear un equipo o ver en cuál te inscribieron.</p>
      <button class="hero__button auth-form__submit" type="button" data-action="login">Iniciar sesión</button>
    `;
    return;
  }
  if (!teams) {
    panel.innerHTML = `<p class="registration__text">${loadingText()}</p>`;
    return;
  }

  const team = myTeam();
  if (team) {
    panel.innerHTML = teamCard(team, true);
  } else if (noSpotsLeft()) {
    panel.innerHTML = `
      <p class="registration__text">Ya se llenaron los ${shownActivity.team.maxTeams} cupos. Si un capitán te inscribe en su equipo, aparecerá aquí.</p>
    `;
  } else {
    panel.innerHTML = `
      <p class="registration__text">
        Aún no estás en un equipo de esta competencia. Crea uno y quedarás de capitán,
        o pídele a un capitán que te inscriba con tu correo <strong>${escapeHtml(currentUser.email)}</strong>.
      </p>
      <button class="hero__button auth-form__submit" type="button" data-action="create">Crear equipo</button>
    `;
  }
}

function renderTeamList() {
  const shown = teamsShown();
  let html = shown.map((team) => `<li>${teamCard(team)}</li>`).join('');
  if (!teams) html = `<li class="registration__text">${loadingText()}</li>`;
  else if (!shown.length) html = '<li class="registration__text">Aún no hay equipos. ¡Inscribe el primero!</li>';
  $('#team-list').innerHTML = html;
}

// A team with its banner, members (and an empty row per free spot) and the captain's phone.
// In "Tu equipo" (manage) it also gets the captain's tools, or the button to leave.
function teamCard(team, manage = false) {
  const { size } = shownActivity.team;
  const members = team.miembros || [];
  const full = members.length >= size;
  const captainTools = manage && team.capitan_id === currentUser?.id;
  const freeSpots = '<li class="team__slot"><span class="team__avatar"></span>Cupo libre</li>'
    .repeat(Math.max(0, size - members.length));
  const phone = team.celular
    ? `<a href="tel:${escapeHtml(team.celular)}">${escapeHtml(team.celular)}</a>`
    : 'inicia sesión para verlo';

  let actions = '';
  if (captainTools) {
    const addForm = full ? '' : `
      <form class="team__add" data-team="${team.id}">
        <input type="email" name="correo" placeholder="correo@unal.edu.co" required aria-label="Correo de la persona a inscribir">
        <button class="week-button" type="submit">Inscribir</button>
      </form>
    `;
    actions = `
      ${addForm}
      <div class="team__buttons">
        <button class="week-button" type="button" data-action="edit">Editar equipo</button>
        <button class="week-button team__danger" type="button" data-action="dissolve" data-team="${team.id}">Disolver equipo</button>
      </div>
    `;
  } else if (manage) {
    actions = `
      <div class="team__buttons">
        <button class="week-button team__danger" type="button" data-action="leave" data-team="${team.id}">Salirme del equipo</button>
      </div>
    `;
  }

  return `
    <article class="team ${manage ? 'team--mine' : ''}">
      <div class="team__banner">${drawBanner(team.bandera)}</div>
      <div>
        <h3 class="team__name">${escapeHtml(team.nombre)}</h3>
        <p class="team__count">
          ${members.length} de ${size}
          ${full ? '<span class="team__badge team__badge--full">Completo</span>' : ''}
        </p>
        <ul class="team__members">
          ${members.map((member) => `
            <li>
              <span class="team__avatar">${drawCustomMonster(member.monstruo || {})}</span>
              <span class="team__who">${escapeHtml(member.nombre)}<small>@${escapeHtml(member.usuario)}</small></span>
              ${member.id === team.capitan_id ? '<span class="team__badge">Capitán</span>' : ''}
              ${captainTools && member.id !== team.capitan_id
                ? `<button class="team__remove" type="button" data-action="remove" data-team="${team.id}" data-member="${member.id}" aria-label="Quitar a ${escapeHtml(member.nombre)}">✕</button>`
                : ''}
            </li>
          `).join('')}
          ${freeSpots}
        </ul>
        <p class="team__captain">Celular del capitán: ${phone}</p>
        ${actions}
      </div>
    </article>
  `;
}


/* ---------- Reading and changing the teams ---------- */

async function loadTeams() {
  const { data, error } = await supabaseClient.rpc('equipos_inscritos');
  if (error) console.error('Could not load the teams:', error);
  loadFailed = Boolean(error);
  teams = error ? null : data;
  render();
}

// Calls a function from teams.sql (its errors already come in Spanish) and reads the teams again
async function changeTeam(button, name, params, success) {
  $('#team-message').hidden = true;
  button.disabled = true;
  const { error } = await supabaseClient.rpc(name, params);
  button.disabled = false;
  if (error) {
    showMessage($('#team-message'), translateError(error));
    return;
  }
  await loadTeams();
  showMessage($('#team-message'), success, false);
}

$('#my-team').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, team, member } = button.dataset;

  if (action === 'login') {
    setAuthMode(false);
    $('#auth-modal').showModal();
  } else if (action === 'create') {
    openTeamForm(null);
  } else if (action === 'edit') {
    openTeamForm(myTeam());
  } else if (action === 'leave' && confirm('¿Seguro que quieres salirte del equipo?')) {
    changeTeam(button, 'quitar_miembro', { p_equipo: team, p_usuario: currentUser.id }, 'Saliste del equipo.');
  } else if (action === 'remove' && confirm('¿Quitar a esta persona del equipo?')) {
    changeTeam(button, 'quitar_miembro', { p_equipo: team, p_usuario: member }, 'Quitaste a la persona del equipo.');
  } else if (action === 'dissolve' && confirm('¿Disolver el equipo? Sus integrantes quedarán libres para unirse a otro.')) {
    changeTeam(button, 'eliminar_equipo', { p_equipo: team }, 'Disolviste el equipo.');
  }
});

// The captain signs up someone by the email of their account
$('#my-team').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  const email = form.correo.value.trim().toLowerCase();
  changeTeam(form.querySelector('button'), 'agregar_miembro', { p_equipo: form.dataset.team, p_correo: email },
    `Inscribiste a ${email}.`);
});

$('#registration-tabs').addEventListener('click', (event) => {
  const tab = event.target.closest('[data-id]');
  if (!tab) return;
  shownActivity = findActivity(tab.dataset.id);
  history.replaceState(null, '', `?id=${shownActivity.id}`);
  closeTeamForm();
  $('#team-message').hidden = true;
  render();
});


/* ---------- Team form and banner designer ---------- */

// The options of each selector, in the order they show. The colors are the cloth's (fondo) and the
// letters' (tinta), starting with those of the fraternity banners in the reference photo;
// the rest of the parts come from BANNER_OPTIONS (icons.js).
const BANNER_COLORS = {
  fondo: [
    ['#2f8f5b', 'Verde'], ['#f4f4ef', 'Blanco'], ['#f6e21c', 'Amarillo'], ['#3c4a92', 'Azul noche'],
    ['#5b3a26', 'Café'], ['#f3b9c8', 'Rosa'], ['#9c3fb3', 'Morado'], ['#1667c2', 'Azul'], ['#c8323b', 'Rojo'],
    ['#24262b', 'Negro'], ['#f08a24', 'Naranja'], ['#35b6b4', 'Turquesa'], ['#7a1f3d', 'Vinotinto'],
    ['#c9a227', 'Dorado'], ['#7a8794', 'Gris'], ['#7fc8f8', 'Celeste'],
  ],
  tinta: [
    ['#f5c814', 'Amarillo'], ['#1f6fd0', 'Azul'], ['#c0282d', 'Rojo'], ['#9a5ce0', 'Lila'], ['#ffffff', 'Blanco'],
    ['#17181b', 'Negro'], ['#2f9e5b', 'Verde'], ['#f08a24', 'Naranja'], ['#e0b73b', 'Dorado'],
    ['#35b6b4', 'Turquesa'], ['#f3b9c8', 'Rosa'], ['#8fe36b', 'Verde baba'],
  ],
};
const BANNER_LABELS = {
  fondo: 'Color de la tela', tinta: 'Color de las letras', forma: 'Forma', estampado: 'Estampado',
  borde: 'Borde', contorno: 'Contorno de las letras', fuente: 'Fuente', adorno: 'Detalle',
};
const BANNER_CHOICES = Object.fromEntries(Object.keys(BANNER_LABELS).map((part) => [part, BANNER_COLORS[part]
  ? BANNER_COLORS[part].map(([value, label]) => ({ value, label }))
  : Object.entries(BANNER_OPTIONS[part]).map(([value, option]) => ({ value, label: option.label }))]));

// Greek letters that do not look like Latin ones, for fraternity names like ΣΣΚ
const GREEK_LETTERS = ['Γ', 'Δ', 'Θ', 'Λ', 'Ξ', 'Π', 'Σ', 'Φ', 'Ψ', 'Ω'];

let banner = {};   // the banner being designed, with the same keys as DEFAULT_BANNER (icons.js)

// One group per part: colors are round swatches; the other parts, a small banner that shows
// how yours would look with that option (updateBanner draws them)
$('#banner-pickers').innerHTML = Object.entries(BANNER_CHOICES).map(([part, options]) => `
  <fieldset class="banner-picker">
    <legend>${BANNER_LABELS[part]}</legend>
    <div class="banner-picker__options ${BANNER_COLORS[part] ? '' : 'banner-picker__options--tiles'}">
      ${options.map(({ value, label }) => (BANNER_COLORS[part]
        ? `<button class="banner-picker__swatch" type="button" data-part="${part}" data-value="${value}"
            style="--swatch: ${value}" title="${label}" aria-label="${label}"></button>`
        : `<button class="banner-picker__tile" type="button" data-part="${part}" data-value="${value}">
            <span class="banner-picker__thumb"></span>${label}
          </button>`)).join('')}
    </div>
  </fieldset>
`).join('');

$('#greek-letters').innerHTML = GREEK_LETTERS.map((letter) => `<button class="random-button" type="button">${letter}</button>`).join('');

// team: the team to edit, or null to create one.
// The defaults fill any part a banner saved before that part existed.
function openTeamForm(team) {
  banner = team
    ? { ...DEFAULT_BANNER, ...team.bandera }
    : { ...DEFAULT_BANNER, letras: '', fondo: BANNER_CHOICES.fondo[0].value, tinta: BANNER_CHOICES.tinta[0].value };
  $('#team-name').value = team?.nombre || '';
  $('#team-phone').value = team?.celular || '';
  $('#banner-letters').value = banner.letras;
  $('#team-form-message').hidden = true;
  $('#team-message').hidden = true;
  $('#my-team').hidden = true;
  $('#team-form').hidden = false;
  updateBanner();
}

function closeTeamForm() {
  $('#team-form').hidden = true;
  $('#my-team').hidden = false;
}

// Redraws the big banner, marks the chosen options and redraws each small banner with the current design.
// The buttons stay in place, so the keyboard focus is not lost.
function updateBanner() {
  banner.letras = $('#banner-letters').value.toUpperCase();
  $('#banner-preview').innerHTML = drawBanner(banner);
  for (const button of $$('#banner-pickers [data-part]')) {
    const { part, value } = button.dataset;
    button.setAttribute('aria-pressed', banner[part] === value);
    const thumb = button.querySelector('.banner-picker__thumb');
    if (thumb) thumb.innerHTML = drawBanner({ ...banner, [part]: value });
  }
}

$('#banner-pickers').addEventListener('click', (event) => {
  const button = event.target.closest('[data-part]');
  if (!button) return;
  banner[button.dataset.part] = button.dataset.value;
  updateBanner();
});

// A random option for every part except the letters. The letters' color never repeats the cloth's.
$('#btn-random-banner').addEventListener('click', () => {
  const pick = (options) => options[Math.floor(Math.random() * options.length)].value;
  for (const part of Object.keys(BANNER_CHOICES)) banner[part] = pick(BANNER_CHOICES[part]);
  const fondoLabel = BANNER_CHOICES.fondo.find((option) => option.value === banner.fondo).label;
  banner.tinta = pick(BANNER_CHOICES.tinta.filter((option) => option.label !== fondoLabel));
  updateBanner();
});

$('#banner-letters').addEventListener('input', updateBanner);

$('#greek-letters').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  const input = $('#banner-letters');
  if (!button || input.value.length >= input.maxLength) return;
  input.value += button.textContent;
  updateBanner();
});

$('#btn-cancel-team').addEventListener('click', closeTeamForm);

$('#team-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('#btn-save-team');
  button.disabled = true;
  $('#team-form-message').hidden = true;

  const { error } = await supabaseClient.rpc('guardar_equipo', {
    p_actividad: shownActivity.id,
    p_nombre: $('#team-name').value,
    p_celular: $('#team-phone').value,
    p_bandera: { ...banner, letras: banner.letras.trim() },
  });
  button.disabled = false;
  if (error) {
    showMessage($('#team-form-message'), translateError(error));
    return;
  }
  closeTeamForm();
  await loadTeams();
  showMessage($('#team-message'), '¡Equipo guardado!', false);
});


/* ---------- Startup ---------- */

// auth.js announces every session change. Phones only come with a session, so the teams are read
// again each time. They are also read at startup: the session may have been announced before this file loaded.
document.addEventListener('idcard:session', () => {
  if (!currentUser) closeTeamForm();
  loadTeams();
});

$('#registration-decorations').innerHTML = ['magnifier', 'computer', 'ball'].map((name) => drawPixelArt(PIXEL_ART[name])).join('');
$('#footer-crest').innerHTML = drawCrest();
render();
loadTeams();
