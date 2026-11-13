/* =============================================
   PRE-REGISTER CTA (index.html)
   A big button in the speakers section that opens a modal to pick any conference and
   pre-register right there, without leaving the home page. Shares the same Supabase RPCs
   as the per-conference section (js/pre-register.js) and the same caps (js/data.js).

   index.html loads supabase.js and auth.js, so this reuses the live session (currentUser)
   and the login modal. A logged-out visitor is sent to the login modal first.
   ============================================= */

(function () {
  const openButton = document.getElementById('btn-prereg-open');
  const modal = document.getElementById('prereg-modal');
  if (!openButton || !modal || typeof supabaseClient === 'undefined') return;

  const body = document.getElementById('prereg-modal-body');
  const messageEl = document.getElementById('prereg-modal-message');

  // Conferences and workshops that take pre-registration, in schedule order.
  const CONFERENCES = ACTIVITIES.filter((activity) => activity.preRegister);

  let selectedId = CONFERENCES[0]?.id || null;
  let counts = {};          // activityId -> number pre-registered
  let mine = new Set();     // activityIds where the current user is already pre-registered
  let loaded = false;

  const selected = () => CONFERENCES.find((c) => c.id === selectedId) || CONFERENCES[0];

  function showError(text) {
    messageEl.textContent = text;
    messageEl.className = 'auth-message auth-message--error';
    messageEl.hidden = false;
  }

  function translate(error) {
    const msg = String(error?.message || 'No se pudo completar la operación.');
    return typeof translateError === 'function' ? translateError(error) : msg;
  }

  /* ---------- Data ---------- */

  async function loadCounts() {
    const results = await Promise.all(CONFERENCES.map((c) =>
      supabaseClient.rpc('conteo_preinscritos_conferencia', { p_actividad: c.id })));
    counts = {};
    CONFERENCES.forEach((c, i) => {
      counts[c.id] = results[i].error ? null : Number(results[i].data) || 0;
    });
  }

  // Which conferences the logged-in user is already pre-registered to.
  async function loadMine() {
    mine = new Set();
    if (!currentUser) return;
    const results = await Promise.all(CONFERENCES.map((c) =>
      supabaseClient.rpc('preinscritos_conferencia', { p_actividad: c.id })));
    CONFERENCES.forEach((c, i) => {
      const list = results[i].error ? [] : (results[i].data || []);
      if (list.some((person) => person.usuario_id === currentUser.id)) mine.add(c.id);
    });
  }

  async function loadAll() {
    await Promise.all([loadCounts(), loadMine()]);
    loaded = true;
    render();
  }

  /* ---------- Rendering ---------- */

  function dayLabel(activity) {
    const day = findDay(activity.day);
    return day ? `${day.name} ${day.date}` : '';
  }

  function conferenceOptions() {
    return CONFERENCES.map((c) => {
      const count = counts[c.id];
      const max = c.preRegister.max;
      const full = count !== null && count >= max && !mine.has(c.id);
      const alreadyIn = mine.has(c.id);
      const left = count === null ? null : Math.max(0, max - count);
      const spots = count === null
        ? 'cupos: —'
        : (alreadyIn ? '✓ ya estás inscrito' : (full ? 'cupos agotados' : `quedan ${left} de ${max} cupos`));

      return `
        <button class="prereg-option ${c.id === selectedId ? 'prereg-option--active' : ''}"
          type="button" data-id="${c.id}" aria-pressed="${c.id === selectedId}">
          <span class="prereg-option__title">${escapeHtml(c.title)}</span>
          <span class="prereg-option__meta">
            <span>${ICONS.calendar}${escapeHtml(dayLabel(c))}</span>
            ${c.place ? `<span>${ICONS.pin}${escapeHtml(c.place)}</span>` : ''}
          </span>
          <span class="prereg-option__spots ${alreadyIn ? 'prereg-option__spots--in' : (full ? 'prereg-option__spots--full' : '')}">${spots}</span>
        </button>
      `;
    }).join('');
  }

  function actionArea() {
    const c = selected();
    if (!c) return '';
    const count = counts[c.id];
    const max = c.preRegister.max;

    if (!currentUser) {
      return `
        <p class="registration__text">Inicia sesión con tu carnet para inscribirte.</p>
        <button class="hero__button auth-form__submit prereg-modal__cta" type="button" data-action="login">Iniciar sesión o crear carnet</button>
      `;
    }
    if (mine.has(c.id)) {
      return `
        <a class="hero__button auth-form__submit prereg-modal__cta" href="${activityLink(c.id)}">
          Ver conferencia ${ICONS.arrow}
        </a>
      `;
    }
    if (count !== null && count >= max) {
      return `
        <p class="registration__text">Se agotaron los ${max} cupos de inscripción de esta conferencia. Aún puedes asistir el día del evento y recibir 8 puntos.</p>
      `;
    }
    return `
      <button class="hero__button auth-form__submit prereg-modal__cta" type="button" data-action="preregister">
        Inscribirme ${ICONS.arrow}
      </button>
    `;
  }

  function render() {
    if (!CONFERENCES.length) {
      body.innerHTML = '<p class="registration__text">Aún no hay conferencias con inscripción abierta.</p>';
      return;
    }
    if (!loaded) {
      body.innerHTML = '<p class="registration__text">Cargando conferencias…</p>';
      return;
    }
    body.innerHTML = `
      <p class="registration__text">Elige la conferencia a la que quieres asegurar tu cupo:</p>
      <div class="prereg-options" id="prereg-options">${conferenceOptions()}</div>
      <div class="prereg-modal__action" id="prereg-action">${actionArea()}</div>
    `;
  }

  /* ---------- Actions ---------- */

  async function preRegister(button) {
    const c = selected();
    button.disabled = true;
    messageEl.hidden = true;
    const { error } = await supabaseClient.rpc('preinscribirse_conferencia', {
      p_actividad: c.id,
      p_modalidad: c.preRegister.modalidad,
    });
    button.disabled = false;
    if (error) return showError(translate(error));
    await loadAll();   // the action area now shows the "Ver conferencia" button
  }

  body.addEventListener('click', async (event) => {
    const option = event.target.closest('.prereg-option');
    if (option) {
      selectedId = option.dataset.id;
      messageEl.hidden = true;
      render();
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'login') {
      modal.close();
      if (typeof setAuthMode === 'function') setAuthMode(false);
      document.getElementById('auth-modal')?.showModal();
    } else if (action === 'preregister') {
      await preRegister(event.target.closest('[data-action]'));
    }
  });

  /* ---------- Open / close ---------- */

  function open() {
    messageEl.hidden = true;
    render();
    modal.showModal();
    if (!loaded || currentUser) loadAll();
  }

  openButton.addEventListener('click', open);
  document.getElementById('prereg-plush').addEventListener('click', open);
  document.getElementById('btn-prereg-close').addEventListener('click', () => modal.close());
  modal.addEventListener('click', (event) => { if (event.target === modal) modal.close(); });

  // When the session changes (log in/out), refresh what the modal shows if it is open.
  document.addEventListener('idcard:session', () => {
    if (modal.open) loadAll();
  });

  // Warm up the counts so the button can show something fast when opened.
  loadAll();
})();
