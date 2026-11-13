/* =============================================
   CONFERENCE PRE-REGISTRATION (evento.html?id=<conferencia>)
   Fills the #pre-register section that event.js places for talks with a preRegister config.
   Talks open a pre-inscripción with limited spots by modality (see js/data.js and
   supabase/preinscripciones-conferencias.sql). The reward copy lives in event.js; here lives
   the interactive part: session, capacity bar, sign-up / cancel and the supervisor tools.

   The activity page has no login modal, so a logged-out visitor is sent to inscripciones.html
   (which does have it) to create or log into their carnet before coming back.
   ============================================= */

(function () {
  const section = document.getElementById('pre-register');
  if (!section || typeof supabaseClient === 'undefined') return;

  const activityId = section.dataset.actividad;
  const modalidad = section.dataset.modalidad;
  const max = Number(section.dataset.max) || 0;

  const body = document.getElementById('pre-register-body');
  const adminBox = document.getElementById('pre-register-admin');
  const messageEl = document.getElementById('pre-register-message');

  let sessionUser = null;      // the logged-in user, or null
  let count = null;            // how many are pre-registered; null until loaded
  let myPreRegistration = null; // this user's pre-registration row, or null
  let people = null;           // full list (used by supervisors); null until loaded

  const isSupervisor = () => (typeof isStrictSupervisor === 'function' ? isStrictSupervisor(sessionUser) : false);
  const spotsLeft = () => (count === null ? null : Math.max(0, max - count));
  const noSpotsLeft = () => count !== null && count >= max && !myPreRegistration;

  function showMessage(text, isError = true) {
    messageEl.textContent = text;
    messageEl.className = `auth-message ${isError ? 'auth-message--error' : 'auth-message--success'}`;
    messageEl.hidden = false;
  }

  function translate(error) {
    const msg = String(error?.message || 'No se pudo completar la operación.');
    return typeof translateError === 'function' ? translateError(error) : msg;
  }

  /* ---------- Loading data ---------- */

  async function loadSession() {
    const { data } = await supabaseClient.auth.getUser();
    sessionUser = data?.user || null;
  }

  async function loadCount() {
    const { data, error } = await supabaseClient.rpc('conteo_preinscritos_conferencia', { p_actividad: activityId });
    count = error ? null : Number(data) || 0;
  }

  // The full list also tells us whether the current user is already pre-registered.
  async function loadPeople() {
    const { data, error } = await supabaseClient.rpc('preinscritos_conferencia', { p_actividad: activityId });
    people = error ? null : (data || []);
    myPreRegistration = sessionUser && people
      ? people.find((person) => person.usuario_id === sessionUser.id) || null
      : null;
  }

  /* ---------- Rendering ---------- */

  function capacityBar() {
    const filled = count === null ? 0 : Math.min(100, (count / max) * 100);
    const label = count === null
      ? 'Cargando cupos…'
      : `${count} de ${max} cupos ocupados${spotsLeft() > 0 ? `, quedan ${spotsLeft()}` : ', ¡cupos agotados!'}`;
    return `
      <p class="pre-register__count">${label}</p>
      <span class="registration__bar" style="--filled: ${filled}%"></span>
    `;
  }

  function render() {
    renderBody();
    renderAdmin();
  }

  function renderBody() {
    if (count === null) {
      body.innerHTML = '<p class="registration__text">No se pudieron cargar los cupos. Recarga la página.</p>';
      return;
    }

    // Logged out: send them to create/log into their carnet, then come back
    if (!sessionUser) {
      body.innerHTML = `
        ${capacityBar()}
        <p class="registration__text">Inicia sesión con tu carnet para pre-inscribirte a esta conferencia.</p>
        <div class="team__actions-row">
          <a class="hero__button auth-form__submit" href="inscripciones.html">Iniciar sesión o crear carnet ${ICONS.arrow}</a>
        </div>
      `;
      return;
    }

    if (myPreRegistration) {
      const attended = myPreRegistration.asistio;
      body.innerHTML = `
        ${capacityBar()}
        <div class="pre-register__status">
          <span class="team__badge" style="background: #e6f7ec; color: #1a7f37; border: 1px solid #b7ebc6;">
            ✓ Pre-inscrito${attended ? ', asistencia confirmada' : ''}
          </span>
          <p class="registration__text">
            ${attended
              ? '¡Gracias por asistir! Ya sumaste tus 10 puntos en el Sustómetro. Sigue acumulando: los que más puntos tengan se llevan un peluche de Nacho.'
              : 'Tienes tu cupo reservado. Recuerda: solo sumas los 10 puntos si <strong>asistes</strong> el día de la conferencia. Mientras más puntos acumules, más cerca del peluche de Nacho.'}
          </p>
        </div>
        ${attended ? '' : `
          <div class="team__actions-row">
            <button class="week-button team__danger" type="button" data-action="cancel">Cancelar pre-inscripción</button>
          </div>
        `}
      `;
      return;
    }

    if (noSpotsLeft()) {
      body.innerHTML = `
        ${capacityBar()}
        <p class="registration__text">Ya se llenaron los ${max} cupos de pre-inscripción. Aún puedes asistir el día de la conferencia y recibir 8 puntos.</p>
      `;
      return;
    }

    body.innerHTML = `
      ${capacityBar()}
      <div class="team__actions-row">
        <button class="hero__button auth-form__submit" type="button" data-action="preregister">Pre-inscribirme ${ICONS.arrow}</button>
      </div>
    `;
  }

  function renderAdmin() {
    if (!isSupervisor()) {
      adminBox.hidden = true;
      adminBox.innerHTML = '';
      return;
    }
    adminBox.hidden = false;

    const list = (people || []).map((person, index) => {
      const attended = person.asistio;
      return `
        <li class="participant-card">
          <span class="participant-card__num">#${index + 1}</span>
          <span class="team__avatar">${drawCustomMonster(person.monstruo || {})}</span>
          <div class="participant-card__info">
            <div class="participant-card__top">
              <span class="team__who">${escapeHtml(person.nombre)}<small>@${escapeHtml(person.usuario)}</small></span>
              ${attended ? '<span class="team__badge">Asistió, 10 pts</span>' : ''}
            </div>
            <div class="participant-card__actions pre-register__admin-actions">
              <button class="week-button" type="button" data-action="toggle-attendance"
                data-user="${person.usuario_id}" data-attended="${attended}">
                ${attended ? 'Quitar asistencia' : 'Marcar asistencia (10 pts)'}
              </button>
              <button class="week-button team__danger" type="button" data-action="admin-remove-pre" data-user="${person.usuario_id}">
                Eliminar
              </button>
            </div>
          </div>
        </li>
      `;
    }).join('');

    adminBox.innerHTML = `
      <h3 class="event__subtitle">Gestión de asistencia (admin)</h3>
      <p class="registration__text">
        Marca asistencia a quien se pre-inscribió (gana 10 puntos). Para quien llega sin pre-inscripción,
        agrégalo con su correo y recibirá 8 puntos.
      </p>
      <form class="team__add" id="pre-register-manual">
        <input type="email" name="correo" placeholder="correo@unal.edu.co" required aria-label="Correo de quien asistió sin pre-inscribirse">
        <button class="week-button" type="submit">Agregar asistente (8 pts)</button>
      </form>
      <ul class="team-list" id="pre-register-admin-list">
        ${people && people.length ? list : '<li class="registration__text">Aún no hay pre-inscritos.</li>'}
      </ul>
    `;
  }

  /* ---------- Actions ---------- */

  async function reload() {
    await Promise.all([loadCount(), loadPeople()]);
    render();
  }

  body.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action } = button.dataset;
    messageEl.hidden = true;

    if (action === 'preregister') {
      button.disabled = true;
      const { error } = await supabaseClient.rpc('preinscribirse_conferencia', {
        p_actividad: activityId,
        p_modalidad: modalidad,
      });
      button.disabled = false;
      if (error) return showMessage(translate(error));
      await reload();
      showMessage('¡Listo! Reservaste tu cupo. Asiste para sumar tus 10 puntos y acercarte al peluche de Nacho.', false);
    } else if (action === 'cancel' && confirm('¿Cancelar tu pre-inscripción? Perderás tu cupo reservado.')) {
      button.disabled = true;
      const { error } = await supabaseClient.rpc('cancelar_preinscripcion_conferencia', { p_actividad: activityId });
      button.disabled = false;
      if (error) return showMessage(translate(error));
      await reload();
      showMessage('Cancelaste tu pre-inscripción.', false);
    }
  });

  adminBox.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || !isSupervisor()) return;
    const { action, user } = button.dataset;
    messageEl.hidden = true;

    if (action === 'toggle-attendance') {
      const willAttend = button.dataset.attended !== 'true';
      button.disabled = true;
      const { error } = await supabaseClient.rpc('marcar_asistencia_conferencia', {
        p_actividad: activityId,
        p_usuario: user,
        p_asistio: willAttend,
        p_puntos: 10,
      });
      button.disabled = false;
      if (error) return showMessage(translate(error));
      await reload();
      showMessage(willAttend ? 'Asistencia marcada: +10 puntos.' : 'Asistencia retirada.', false);
    } else if (action === 'admin-remove-pre' && confirm('ADMIN: ¿Eliminar la pre-inscripción de esta persona?')) {
      button.disabled = true;
      const { error } = await supabaseClient.rpc('admin_eliminar_preinscripcion_conferencia', {
        p_actividad: activityId,
        p_usuario: user,
      });
      button.disabled = false;
      if (error) return showMessage(translate(error));
      await reload();
      showMessage('Eliminaste la pre-inscripción (admin).', false);
    }
  });

  adminBox.addEventListener('submit', async (event) => {
    if (event.target.id !== 'pre-register-manual' || !isSupervisor()) return;
    event.preventDefault();
    const button = event.target.querySelector('button');
    const correo = event.target.correo.value.trim().toLowerCase();
    if (!correo) return;
    messageEl.hidden = true;
    button.disabled = true;
    const { error } = await supabaseClient.rpc('preinscribir_manual_conferencia', {
      p_actividad: activityId,
      p_modalidad: modalidad,
      p_correo: correo,
      p_asistio: true,
      p_puntos: 8,
    });
    button.disabled = false;
    if (error) return showMessage(translate(error));
    event.target.reset();
    await reload();
    showMessage(`Agregaste a ${correo} como asistente (+8 puntos).`, false);
  });

  /* ---------- Startup ---------- */

  (async function init() {
    await loadSession();
    await reload();
  })();

  // Keep in sync if the session changes in another tab
  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    sessionUser = session?.user || null;
    await reload();
  });
})();
