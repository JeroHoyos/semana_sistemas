/* =============================================
   REGISTRATION (inscripciones.html)
   Handles both team competitions (observacion, maraton, futbol) and individual
   competitions (atletismo, videojuegos).
   Everything goes through Supabase RPC functions which enforce rules and limits.
   ============================================= */

const REGISTRATION_ACTIVITIES = ACTIVITIES.filter((activity) => activity.team || activity.individual);
const TEAM_ACTIVITIES = ACTIVITIES.filter((activity) => activity.team);

// The competition on screen: the one in the URL (?id=...) or the first one
let shownActivity = REGISTRATION_ACTIVITIES.find((activity) => activity.id === new URLSearchParams(location.search).get('id'))
  || REGISTRATION_ACTIVITIES[0];

const isIndividual = () => Boolean(shownActivity?.individual);

let teams = null;                   // every team of every team competition; null until loaded
let loadFailed = false;
let freeAgents = null;              // players looking for a team; null until loaded
let loadFreeAgentsFailed = false;
let individualRegistrations = null; // participants in current individual competition; null until loaded
let loadIndividualFailed = false;

const teamsShown = () => (teams || []).filter((team) => team.actividad === shownActivity.id);
const myTeam = () => teamsShown().find((team) => team.miembros?.some((member) => member.id === currentUser?.id));
const myIndividual = () => (individualRegistrations || []).find((reg) => reg.usuario_id === currentUser?.id);

const noSpotsLeft = () => {
  if (isIndividual()) {
    return Boolean(shownActivity.individual.max && (individualRegistrations || []).length >= shownActivity.individual.max);
  }
  return Boolean(shownActivity.team?.maxTeams && teamsShown().length >= shownActivity.team.maxTeams);
};

const loadingText = () => {
  if (isIndividual()) {
    return loadIndividualFailed ? 'No se pudieron cargar los participantes. Recarga la página.' : 'Cargando participantes…';
  }
  return loadFailed ? 'No se pudieron cargar los equipos. Recarga la página en un momento.' : 'Cargando equipos…';
};

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
  renderFreeAgents();
}

// One row per day, with the day's name above its tabs
function renderTabs() {
  const days = DAYS.filter((day) => REGISTRATION_ACTIVITIES.some((activity) => activity.day === day.id));
  $('#registration-tabs').innerHTML = days.map((day) => `
    <div class="registration__day">
      <span class="registration__day-name">${day.name} ${day.date}</span>
      <div class="registration__day-tabs">
        ${REGISTRATION_ACTIVITIES.filter((activity) => activity.day === day.id).map(tabButton).join('')}
      </div>
    </div>
  `).join('');
}

function tabButton(activity) {
  const tabName = activity.team?.tab || activity.individual?.tab || activity.title;
  return `
    <button class="day" type="button" data-id="${activity.id}" aria-pressed="${activity === shownActivity}">
      ${ICONS[activity.icon]}
      <strong>${escapeHtml(tabName)}</strong>
    </button>
  `;
}

// Summary fact boxes: day, modality / team size, and registered count with progress bar
function renderSummary() {
  const day = findDay(shownActivity.day);
  let facts = [];

  if (isIndividual()) {
    const { individual } = shownActivity;
    const count = (individualRegistrations || []).length;
    let signedUp = `${count} ${count === 1 ? 'participante' : 'participantes'}`;
    if (individual.max) {
      signedUp = `${count} de ${individual.max} participantes
        <span class="registration__bar" style="--filled: ${Math.min(100, (count / individual.max) * 100)}%"></span>`;
    }
    if (!individualRegistrations) signedUp = loadIndividualFailed ? '—' : '…';

    facts = [
      { icon: ICONS.calendar, name: 'Cuándo', value: `${day.name} ${day.date}, ${shownActivity.start}` },
      { icon: ICONS.people, name: 'Modalidad', value: 'Individual (1 persona)' },
      { icon: ICONS.trophy, name: 'Inscritos', value: signedUp },
    ];
  } else {
    const { team } = shownActivity;
    const count = teamsShown().length;
    let signedUp = `${count} ${count === 1 ? 'equipo' : 'equipos'}`;
    if (team.maxTeams) {
      signedUp = `${count} de ${team.maxTeams} equipos
        <span class="registration__bar" style="--filled: ${Math.min(100, (count / team.maxTeams) * 100)}%"></span>`;
    }
    if (!teams) signedUp = loadFailed ? '—' : '…';

    facts = [
      { icon: ICONS.calendar, name: 'Cuándo', value: `${day.name} ${day.date}, ${shownActivity.start}` },
      { icon: ICONS.people, name: 'Equipos', value: `Hasta ${team.size} personas` },
      { icon: ICONS.trophy, name: 'Inscritos', value: signedUp },
    ];
  }

  $('#registration-summary').innerHTML = `
    <dl class="event__facts">
      ${facts.map((fact) => `<div><dt>${fact.icon}${fact.name}</dt><dd>${fact.value}</dd></div>`).join('')}
    </dl>
  `;
}

function renderMyTeam() {
  const panel = $('#my-team');
  const myHeading = $('#my-team-heading');
  const listHeading = $('#team-list-heading');
  const buscandoSec = $('#buscando-equipo');
  const introEl = $('#registration-intro');

  if (isIndividual()) {
    if (myHeading) myHeading.textContent = 'Tu inscripción';
    if (listHeading) listHeading.textContent = 'Participantes inscritos';
    if (buscandoSec) buscandoSec.hidden = true;
    if (introEl) {
      introEl.textContent = 'Inscríbete individualmente con tu carnet y tu número de celular. Los cupos son limitados.';
    }

    if (!currentUser) {
      panel.innerHTML = `
        <p class="registration__text">Inicia sesión con tu carnet para inscribirte a esta competencia.</p>
        <div class="team__actions-row">
          <button class="hero__button auth-form__submit" type="button" data-action="login">Iniciar sesión</button>
        </div>
      `;
      return;
    }
    if (!individualRegistrations) {
      panel.innerHTML = `<p class="registration__text">${loadingText()}</p>`;
      return;
    }

    const reg = myIndividual();
    if (reg) {
      const position = individualRegistrations.findIndex((r) => r.usuario_id === currentUser.id) + 1;
      const phoneDisplay = reg.celular ? escapeHtml(reg.celular) : 'No especificado';
      panel.innerHTML = `
        <div class="my-registration-card">
          <div class="my-registration-card__content">
            <span class="my-registration-card__avatar">${drawCustomMonster(reg.monstruo || currentUser.user_metadata?.monstruo || {})}</span>
            <div class="my-registration-card__info">
              <div class="my-registration-card__top">
                <span class="team__badge" style="background: #e6f7ec; color: #1a7f37; border: 1px solid #b7ebc6;">✓ Inscrito</span>
                <span class="team__badge">Cupo #${position} de ${shownActivity.individual.max}</span>
              </div>
              <h3 class="my-registration-card__name">${escapeHtml(reg.nombre || currentUser.user_metadata?.full_name || 'Asustador')}</h3>
              <p class="my-registration-card__user">@${escapeHtml(reg.usuario || (currentUser.email ? currentUser.email.split('@')[0] : ''))}</p>
              <p class="my-registration-card__phone">Celular registrado: <strong>${phoneDisplay}</strong></p>
            </div>
          </div>
          <button class="week-button team__danger my-registration-card__cancel-btn" type="button" data-action="cancel-individual">
            Cancelar inscripción
          </button>
        </div>
      `;
    } else if (noSpotsLeft()) {
      panel.innerHTML = `
        <p class="registration__text">Ya se llenaron los ${shownActivity.individual.max} cupos disponibles para esta competencia.</p>
      `;
    } else {
      panel.innerHTML = `
        <form class="individual-form" id="individual-form">
          <p class="registration__text">
            Te inscribirás con tu cuenta <strong>${escapeHtml(currentUser.user_metadata?.full_name || 'Estudiante')}</strong> (${escapeHtml(currentUser.email)}).
            Ingresa tu número de celular para asegurar tu cupo en <strong>${escapeHtml(shownActivity.title)}</strong>.
          </p>
          <div class="individual-form__row">
            <label class="auth-field" style="margin: 0; flex: 1; min-width: 220px;">
              <span>Número de celular / WhatsApp</span>
              <input type="tel" id="individual-phone" maxlength="20" required placeholder="Ej. 300 123 4567" autocomplete="tel">
            </label>
            <button class="hero__button auth-form__submit auth-edit__save" id="btn-submit-individual" type="submit" style="margin-top: 0; height: 44px;">
              Inscribirme
            </button>
          </div>
          <p class="auth-message" id="individual-form-message" hidden></p>
        </form>
      `;
    }
    return;
  }

  // Team competition
  if (myHeading) myHeading.textContent = 'Tu equipo';
  if (listHeading) listHeading.textContent = 'Equipos inscritos';
  if (buscandoSec) buscandoSec.hidden = false;
  if (introEl) {
    introEl.textContent = 'Arma tu equipo y hazle su bandera. Quien crea el equipo queda de capitán: deja su celular e inscribe a los demás con el correo de su carnet.';
  }

  const inThisList = freeAgents?.some((agent) => agent.usuario_id === currentUser?.id);
  const findTeamLabel = inThisList ? 'Editar mis datos' : 'Buscar equipo';

  if (!currentUser) {
    panel.innerHTML = `
      <p class="registration__text">Inicia sesión con tu carnet para crear un equipo, ver en cuál te inscribieron o buscar uno.</p>
      <div class="team__actions-row">
        <button class="hero__button auth-form__submit" type="button" data-action="login">Iniciar sesión</button>
        <button class="hero__button hero__button--find-team" type="button" data-action="open-find-team">Buscar equipo</button>
      </div>
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
      <div class="team__actions-row">
        <button class="hero__button hero__button--find-team" type="button" data-action="open-find-team">${findTeamLabel}</button>
      </div>
    `;
  } else {
    panel.innerHTML = `
      <p class="registration__text">
        Aún no estás en un equipo de esta competencia. Crea uno y quedarás de capitán,
        o pídele a un capitán que te inscriba con tu correo <strong>${escapeHtml(currentUser.email)}</strong>.
      </p>
      <div class="team__actions-row">
        <button class="hero__button auth-form__submit" type="button" data-action="create">Crear equipo</button>
        <button class="hero__button hero__button--find-team" type="button" data-action="open-find-team">${findTeamLabel}</button>
      </div>
    `;
  }
}

function renderTeamList() {
  if (isIndividual()) {
    if (!individualRegistrations) {
      $('#team-list').innerHTML = `<li class="registration__text">${loadingText()}</li>`;
      return;
    }
    if (!individualRegistrations.length) {
      $('#team-list').innerHTML = '<li class="registration__text">Aún no hay participantes inscritos. ¡Sé el primero en inscribirte!</li>';
      return;
    }

    $('#team-list').innerHTML = individualRegistrations.map((p, index) => {
      const isMe = p.usuario_id === currentUser?.id;
      const cleanPhone = (p.celular || '').replace(/\D/g, '');
      const waUrl = cleanPhone ? `https://wa.me/57${cleanPhone.replace(/^57/, '')}` : null;
      const phoneDisplay = p.celular
        ? `<div class="free-agent__contacts">
             <a class="whatsapp-button" href="${waUrl}" target="_blank" rel="noopener">
               ${ICONS.whatsapp}
               <span>WhatsApp</span>
             </a>
             <a class="phone-link" href="tel:${escapeHtml(p.celular)}">${escapeHtml(p.celular)}</a>
           </div>`
        : '<span class="free-agent__anon">Inicia sesión para ver el contacto</span>';

      return `
        <li class="participant-card ${isMe ? 'participant-card--me' : ''}">
          <span class="participant-card__num">#${index + 1}</span>
          <span class="team__avatar">${drawCustomMonster(p.monstruo || {})}</span>
          <div class="participant-card__info">
            <div class="participant-card__top">
              <span class="team__who">${escapeHtml(p.nombre)}<small>@${escapeHtml(p.usuario)}</small></span>
              ${isMe ? '<span class="team__badge">Tú</span>' : ''}
            </div>
            <div class="participant-card__actions">
              ${phoneDisplay}
            </div>
          </div>
        </li>
      `;
    }).join('');
    return;
  }

  const shown = teamsShown();
  let html = shown.map((team) => `<li>${teamCard(team)}</li>`).join('');
  if (!teams) html = `<li class="registration__text">${loadingText()}</li>`;
  else if (!shown.length) html = '<li class="registration__text">Aún no hay equipos. ¡Inscribe el primero!</li>';
  $('#team-list').innerHTML = html;
}

function renderFreeAgents() {
  const section = $('#buscando-equipo');
  if (isIndividual()) {
    if (section) section.hidden = true;
    return;
  }
  if (section) section.hidden = false;

  const list = $('#free-agents-list');
  if (!list) return;

  if (!freeAgents) {
    list.innerHTML = `<li class="registration__text">${loadFreeAgentsFailed ? 'No se pudo cargar la lista.' : 'Cargando lista…'}</li>`;
    return;
  }

  if (!freeAgents.length) {
    list.innerHTML = '<li class="registration__text">Aún no hay personas buscando equipo en esta competencia. ¡Sé el primero en anotarte!</li>';
    return;
  }

  list.innerHTML = freeAgents.map((agent) => {
    const isMe = agent.usuario_id === currentUser?.id;
    const cleanPhone = (agent.celular || '').replace(/\D/g, '');
    const waUrl = cleanPhone ? `https://wa.me/57${cleanPhone.replace(/^57/, '')}` : null;
    const phoneDisplay = agent.celular
      ? `<div class="free-agent__contacts">
           <a class="whatsapp-button" href="${waUrl}" target="_blank" rel="noopener">
             ${ICONS.whatsapp}
             <span>WhatsApp</span>
           </a>
           <a class="phone-link" href="tel:${escapeHtml(agent.celular)}">${escapeHtml(agent.celular)}</a>
         </div>`
      : '<span class="free-agent__anon">Inicia sesión para ver el contacto</span>';

    const positions = (Array.isArray(agent.posiciones) ? agent.posiciones : [])
      .map((pos) => `<span class="position-badge">${escapeHtml(pos)}</span>`)
      .join('');

    const leaveBtn = isMe
      ? '<button class="week-button team__danger free-agent__leave-btn" type="button" data-action="leave-free-agent">Salirme de la lista</button>'
      : '';

    return `
      <li class="free-agent-card ${isMe ? 'free-agent-card--me' : ''}">
        <span class="team__avatar">${drawCustomMonster(agent.monstruo || {})}</span>
        <div class="free-agent-card__info">
          <div class="free-agent-card__top">
            <span class="team__who">${escapeHtml(agent.nombre)}<small>@${escapeHtml(agent.usuario)}</small></span>
            ${isMe ? '<span class="team__badge">Tú</span>' : ''}
          </div>
          ${positions ? `<div class="free-agent-card__positions">${positions}</div>` : ''}
          <div class="free-agent-card__actions">
            ${phoneDisplay}
            ${leaveBtn}
          </div>
        </div>
      </li>
    `;
  }).join('');
}

// A team with its banner, members (and an empty row per free spot) and the captain's phone.
function teamCard(team, manage = false) {
  const { size } = shownActivity.team || { size: 1 };
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


/* ---------- Reading and changing data ---------- */

async function loadTeams() {
  if (!currentUser || isIndividual()) return;
  const { data, error } = await supabaseClient.rpc('equipos_inscritos');
  if (error) console.error('Could not load the teams:', error);
  loadFailed = Boolean(error);
  teams = error ? null : data;
  render();
}

async function loadFreeAgents() {
  if (!currentUser || isIndividual()) return;
  const { data, error } = await supabaseClient.rpc('personas_buscando_equipo', { p_actividad: shownActivity.id });
  if (error) console.error('Could not load the free agents:', error);
  loadFreeAgentsFailed = Boolean(error);
  freeAgents = error ? null : data;
  renderFreeAgents();
  renderMyTeam();
}

async function loadIndividualRegistrations() {
  if (!currentUser || !isIndividual()) return;
  const { data, error } = await supabaseClient.rpc('inscritos_individuales', { p_actividad: shownActivity.id });
  if (error) console.error('Could not load individual registrations:', error);
  loadIndividualFailed = Boolean(error);
  individualRegistrations = error ? null : data;
  render();
}

// Calls a function from teams.sql and reads the teams again
async function changeTeam(button, name, params, success) {
  $('#team-message').hidden = true;
  button.disabled = true;
  const { error } = await supabaseClient.rpc(name, params);
  button.disabled = false;
  if (error) {
    showMessage($('#team-message'), translateError(error));
    return;
  }
  await Promise.all([loadTeams(), loadFreeAgents()]);
  showMessage($('#team-message'), success, false);
}

$('#my-team').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, team, member } = button.dataset;

  if (action === 'login') {
    setAuthMode(false);
    $('#auth-modal').showModal();
  } else if (action === 'cancel-individual' && confirm('¿Seguro que deseas cancelar tu inscripción?')) {
    button.disabled = true;
    const { error } = await supabaseClient.rpc('cancelar_inscripcion_individual', { p_actividad: shownActivity.id });
    button.disabled = false;
    if (error) {
      showMessage($('#team-message'), translateError(error));
      return;
    }
    await loadIndividualRegistrations();
    showMessage($('#team-message'), 'Cancelaste tu inscripción.', false);
  } else if (action === 'create') {
    openTeamForm(null);
  } else if (action === 'open-find-team') {
    openFindTeamModal();
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

// Handling form submissions in #my-team (individual signup or captain adding member)
$('#my-team').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;

  if (form.id === 'individual-form') {
    const button = $('#btn-submit-individual');
    const phoneInput = $('#individual-phone');
    const phone = phoneInput ? phoneInput.value.trim() : '';
    if (!phone) return;

    button.disabled = true;
    $('#individual-form-message').hidden = true;
    const { error } = await supabaseClient.rpc('inscribirse_individual', {
      p_actividad: shownActivity.id,
      p_celular: phone,
    });
    button.disabled = false;
    if (error) {
      showMessage($('#individual-form-message'), translateError(error));
      return;
    }
    await loadIndividualRegistrations();
    showMessage($('#team-message'), '¡Te has inscrito con éxito!', false);
    return;
  }

  // The captain signs up someone by the email of their account
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
  $('#free-agents-message').hidden = true;
  freeAgents = null;
  individualRegistrations = null;
  render();

  if (isIndividual()) {
    loadIndividualRegistrations();
  } else {
    loadTeams();
    loadFreeAgents();
  }
});


/* ---------- Team form and banner designer ---------- */

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

const GREEK_LETTERS = ['Γ', 'Δ', 'Θ', 'Λ', 'Ξ', 'Π', 'Σ', 'Φ', 'Ψ', 'Ω'];

let banner = {};

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

function openTeamForm(team) {
  const isEditing = Boolean(team);
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

  const membersBox = $('#team-form-members-box');
  const membersInputs = $('#team-form-member-inputs');
  if (isEditing) {
    membersBox.hidden = true;
    membersInputs.innerHTML = '';
  } else {
    membersBox.hidden = false;
    const { size } = shownActivity.team || { size: 3 };
    let slotsHtml = '';
    for (let i = 2; i <= size; i++) {
      const isRequired = i <= 3;
      slotsHtml += `
        <label class="auth-field">
          <span>Integrante ${i} ${isRequired ? '<strong class="team-form__required">(Obligatorio)</strong>' : '<span class="team-form__optional">(Opcional)</span>'}</span>
          <input type="email" class="team-form__member-email" placeholder="correo@unal.edu.co" ${isRequired ? 'required' : ''} autocomplete="email">
        </label>
      `;
    }
    membersInputs.innerHTML = slotsHtml;
  }

  updateBanner();
}

function closeTeamForm() {
  $('#team-form').hidden = true;
  $('#my-team').hidden = false;
}

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

  const isEditing = Boolean(myTeam());
  let memberEmails = [];

  if (!isEditing) {
    const inputs = Array.from($$('#team-form-member-inputs input[type="email"]'));
    memberEmails = inputs.map((input) => input.value.trim().toLowerCase()).filter(Boolean);

    if (memberEmails.length < 2) {
      showMessage($('#team-form-message'), 'Debes ingresar al menos 2 integrantes más (mínimo 3 personas con el capitán).');
      button.disabled = false;
      return;
    }

    if (currentUser?.email && memberEmails.includes(currentUser.email.toLowerCase())) {
      showMessage($('#team-form-message'), 'No te incluyas en los integrantes; tú ya quedas como capitán con tu cuenta.');
      button.disabled = false;
      return;
    }

    const uniqueEmails = new Set(memberEmails);
    if (uniqueEmails.size !== memberEmails.length) {
      showMessage($('#team-form-message'), 'No puedes repetir el mismo correo dos veces.');
      button.disabled = false;
      return;
    }
  }

  const { error } = await supabaseClient.rpc('guardar_equipo', {
    p_actividad: shownActivity.id,
    p_nombre: $('#team-name').value,
    p_celular: $('#team-phone').value,
    p_bandera: { ...banner, letras: banner.letras.trim() },
    p_miembros: memberEmails,
  });
  button.disabled = false;
  if (error) {
    showMessage($('#team-form-message'), translateError(error));
    return;
  }
  closeTeamForm();
  await Promise.all([loadTeams(), loadFreeAgents()]);
  showMessage($('#team-message'), '¡Equipo guardado!', false);
});


/* ---------- Free agents pool (Bolsa de jugadores) ---------- */

function updateFindTeamModalPositions() {
  const isFutbol = $('#find-team-activity').value === 'futbol';
  $('#find-team-positions-box').hidden = !isFutbol;
}

$('#find-team-activity').innerHTML = TEAM_ACTIVITIES.map((activity) => `
  <option value="${activity.id}">${escapeHtml(activity.team.tab)}</option>
`).join('');

$('#find-team-activity').addEventListener('change', updateFindTeamModalPositions);

function openFindTeamModal() {
  if (!currentUser) {
    setAuthMode(false);
    $('#auth-modal').showModal();
    return;
  }
  if (myTeam()) {
    alert('Ya haces parte de un equipo en esta competencia. Si deseas buscar equipo, salte primero de tu equipo actual.');
    return;
  }

  $('#find-team-activity').value = isIndividual() ? TEAM_ACTIVITIES[0].id : shownActivity.id;
  updateFindTeamModalPositions();

  const existing = freeAgents?.find((agent) => agent.usuario_id === currentUser.id);
  $('#find-team-phone').value = existing?.celular || '';
  const positions = existing?.posiciones || [];
  for (const checkbox of $$('#find-team-positions-box input[type="checkbox"]')) {
    checkbox.checked = positions.includes(checkbox.value);
  }

  $('#find-team-form-message').hidden = true;
  $('#find-team-modal').showModal();
}

$('#btn-open-find-team')?.addEventListener('click', openFindTeamModal);

$('#btn-close-find-team').addEventListener('click', () => $('#find-team-modal').close());
$('#btn-cancel-find-team').addEventListener('click', () => $('#find-team-modal').close());

$('#find-team-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('#btn-save-find-team');
  button.disabled = true;
  $('#find-team-form-message').hidden = true;

  const activity = $('#find-team-activity').value;
  const phone = $('#find-team-phone').value;
  let positions = [];
  if (activity === 'futbol') {
    positions = Array.from($$('#find-team-positions-box input[type="checkbox"]:checked')).map((cb) => cb.value);
  }

  const { error } = await supabaseClient.rpc('anotarse_busqueda_equipo', {
    p_actividad: activity,
    p_celular: phone,
    p_posiciones: positions,
  });

  button.disabled = false;
  if (error) {
    showMessage($('#find-team-form-message'), translateError(error));
    return;
  }

  $('#find-team-modal').close();
  if (activity !== shownActivity.id) {
    shownActivity = findActivity(activity);
    history.replaceState(null, '', `?id=${shownActivity.id}`);
    render();
    await Promise.all([loadTeams(), loadFreeAgents()]);
  } else {
    await loadFreeAgents();
  }
  showMessage($('#free-agents-message'), '¡Te anotaste en la lista para buscar equipo!', false);
});

$('#free-agents-list').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action="leave-free-agent"]');
  if (!button) return;
  if (!confirm('¿Seguro que quieres salirte de la lista de búsqueda de equipo?')) return;

  button.disabled = true;
  const { error } = await supabaseClient.rpc('salir_busqueda_equipo', { p_actividad: shownActivity.id });
  button.disabled = false;
  if (error) {
    showMessage($('#free-agents-message'), translateError(error));
    return;
  }
  await loadFreeAgents();
  showMessage($('#free-agents-message'), 'Saliste de la lista de búsqueda de equipo.', false);
});


/* ---------- Startup ---------- */

document.addEventListener('idcard:session', () => {
  if (!currentUser) closeTeamForm();
  if (isIndividual()) {
    loadIndividualRegistrations();
  } else {
    loadTeams();
    loadFreeAgents();
  }
});

$('#registration-decorations').innerHTML = ['magnifier', 'computer', 'ball'].map((name) => drawPixelArt(PIXEL_ART[name])).join('');
$('#find-team-eye-icon').innerHTML = drawPixelArt(PIXEL_ART.magnifier);
$('#footer-crest').innerHTML = drawCrest();
render();

function loadActivityData() {
  if (!currentUser) return;
  if (isIndividual()) {
    loadIndividualRegistrations();
  } else {
    loadTeams();
    loadFreeAgents();
  }
}

if (currentUser) {
  loadActivityData();
}

document.addEventListener('idcard:session', () => {
  if (currentUser) {
    loadActivityData();
  } else {
    teams = null;
    freeAgents = null;
    individualRegistrations = null;
    render();
  }
});

// The section only shows with a session (js/auth.js), so the link from the home page waits for it
document.addEventListener('idcard:session', function scrollToPool() {
  if (!currentUser || location.hash !== '#buscando-equipo') return;
  document.removeEventListener('idcard:session', scrollToPool);
  setTimeout(() => {
    $('#buscando-equipo')?.scrollIntoView({ behavior: 'smooth' });
  }, 250);
});
