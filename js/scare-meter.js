/* =============================================
   SCARE METER (SUSTÓMETRO) - THE SCARE TANK
   Shows in real time everyone registered in Supabase (table 'perfiles')
   with their custom avatar, real points and the interactive Scare Tank.
   ============================================= */

const tankLiquid = $('#tank-liquid');
const hudName = $('#hud-name');
const hudPoints = $('#hud-points');
const rankingCount = $('#ranking-count');
const list = $('#scare-meter-list');
const reading = $('#scare-meter-reading');

let scarers = [];
// The person chosen with a click. Their id is kept (not their place) so they stay chosen
// when the table redraws because someone signed up or earned points.
let chosenId = null;

// Whether the logged-in user has unlocked the Supervisor de Sustos title
function isCurrentSupervisor() {
  return Boolean(currentUser) && unlockedTitles(currentUser).some((title) => title.id === 'supervisor');
}

// Real percentage from the person's points against the goal (100) or the highest score
function percentOf(points, maxPoints) {
  return Math.min(100, Math.round((points / maxPoints) * 100));
}

const maxPointsOf = (people) => Math.max(100, ...people.map(scarePoints));

// What the page shows for a person: clowns hiding behind binary names appear under their real identity
function personView(person) {
  const clown = Boolean(person.clown || isClown(person.correo, person.nombre, person));
  const alias = clown && isLargoAlias(person.correo, person.nombre);
  return {
    clown,
    points: Number(person.puntos ?? scarePoints(person)),
    handle: alias ? 'imlargo' : (person.usuario || handleOf(person.correo)),
    name: alias ? 'Juan Carlos Largo' : (person.nombre || 'Estudiante UNAL').trim(),
  };
}

// Their ID card title: for the logged-in person their session wins, otherwise the one on their table monster
function personTitle(person) {
  const isMine = currentUser && (person.id === currentUser.id || person.correo === currentUser.email);
  const id = (isMine && currentUser.user_metadata?.titulo) || person.monstruo?.titulo || person.titulo;
  return findTitle(id) || BASE_TITLE;
}

// Selects a scarer and fills or empties the Scare Tank with an animation
function selectScarer(index) {
  if (!scarers.length) return;

  const person = scarers[index];
  chosenId = person.id;
  const { clown, points, handle, name } = personView(person);

  // Liquid level in the tank (0% with 0 points)
  tankLiquid.style.height = `${percentOf(points, maxGlobalPoints)}%`;

  // Tank screen: name and points
  hudName.textContent = clown ? `🤡 ${name} [PAYASO]` : name;
  hudPoints.innerHTML = `${points} <small>pts</small>`;

  // Supervisor button on the HUD
  $('#btn-admin-edit-points').hidden = !isCurrentSupervisor();

  // Mark the selected card in the list
  $$('.scarer-card').forEach((card, i) => {
    card.setAttribute('aria-pressed', i === index ? 'true' : 'false');
  });

  // Readout below the tank (screen readers announce it too)
  // The points are already on the tank screen: only a message goes here
  if (clown) {
    writeReading('🤡 ¡HAY UN PAYASO INTENTANDO ARRUINAR LA FIESTA! Shadowban permanente por juego sucio.', name, handle);
  } else if (points === 0) {
    writeReading('¡Participa en las competencias para llenar el tanque de sustos!', name, handle);
  } else if (index === 0) {
    writeReading('¡Lidera la tabla del Sustómetro!', name, handle);
  } else {
    writeReading(`Va en el puesto ${index + 1} de la tabla del Sustómetro.`, name, handle);
  }
}

// Name and user on their own line, and the message below.
// Built with textContent rather than innerHTML because each person types their own name.
function writeReading(message, name, handle) {
  const parts = [];
  if (name) parts.push(Object.assign(document.createElement('strong'), { textContent: name }));
  if (handle) parts.push(Object.assign(document.createElement('small'), { textContent: `@${handle}` }));
  parts.push(message);
  reading.replaceChildren(...parts);
}

// What the ID card button says for each place
const IDCARD_BUTTON_TITLES = {
  gold: 'Ver carnet dorado (1° puesto)',
  silver: 'Ver carnet plateado (2° puesto)',
  bronze: 'Ver carnet de bronce (3° puesto)',
};

const PAGE_SIZE = 10;
let currentLimit = 10;
let totalGeneral = 0;
let totalFiltrados = 0;
let maxGlobalPoints = 100;
let myRankInfo = null;
let currentSearchQuery = '';
let searchDebounceTimer = null;
let isLoadingRanking = false;
let isLoadingMore = false;

function updateLoadMoreButton() {
  const moreBox = $('#ranking-more-box');
  if (!moreBox) return;
  const hasMore = scarers.length < totalFiltrados && totalFiltrados > 0;
  moreBox.hidden = !hasMore;
}

// Draws the scarer cards in the right column
function renderRanking(people, query = '') {
  scarers = people;

  if (query) {
    rankingCount.textContent = `${totalFiltrados} de ${totalGeneral} ${totalGeneral === 1 ? 'Asustador' : 'Asustadores'}`;
  } else {
    rankingCount.textContent = `${totalGeneral} ${totalGeneral === 1 ? 'Asustador Registrado' : 'Asustadores Registrados'}`;
  }

  updateLoadMoreButton();

  if (query && totalFiltrados === 0) {
    list.innerHTML = `
      <li class="ranking-empty">
        <div class="ranking-empty__box">
          <h3>Sin resultados</h3>
          <p>No se encontró ningún asustador que coincida con "<strong>${escapeHtml(query)}</strong>".</p>
        </div>
      </li>
    `;
    return;
  }

  if (totalGeneral === 0) {
    tankLiquid.style.height = '0%';
    hudName.textContent = 'Esperando asustadores';
    hudPoints.innerHTML = '0 <small>pts</small>';

    list.innerHTML = `
      <li class="ranking-empty">
        <div class="ranking-empty__box">
          <svg class="ranking-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <h3>El Tanque de Sustos está listo</h3>
          <p>Aún no hay asustadores registrados. Sé la primera persona en emitir tu Carnet de Asustador.</p>
          <button class="hero__button hero__button--session" id="btn-signup-empty" type="button">
            Crear mi Carnet
          </button>
        </div>
      </li>
    `;

    reading.textContent = 'Aún no hay asustadores registrados.';

    $('#btn-signup-empty').addEventListener('click', () => {
      setAuthMode(true);
      $('#auth-modal').showModal();
    });
    return;
  }


  const chosen = Math.max(0, people.findIndex((p) => p.id === chosenId));
  const isSupervisor = isCurrentSupervisor();

  list.innerHTML = people.map((person, i) => {
    const { clown, points, handle, name } = personView(person);
    const percent = percentOf(points, maxGlobalPoints);
    const monster = person.monstruo || {};
    const avatarColor = clown ? '#ff0033' : monsterColor(monster);

    const title = personTitle(person);
    const text = titleText(title, monster.estilo);
    let titleTag = `<span class="scarer-card__title-tag">${text}</span>`;
    if (clown) {
      titleTag = `<span class="scarer-card__title-tag scarer-card__title-tag--clown">🤡 Payaso</span>`;
    } else if (title.id === 'debugger') {
      titleTag = `<span class="scarer-card__title-tag scarer-card__title-tag--debugger"><span class="glitch-text" data-text="${text}">${text}</span></span>`;
    } else if (title.id === 'terror-nocturno') {
      titleTag = `<span class="scarer-card__title-tag scarer-card__title-tag--nocturnal">${text}</span>`;
    } else if (title.id === 'video-futbol') {
      titleTag = `<span class="scarer-card__title-tag scarer-card__title-tag--phenomenon">${text}</span>`;
    } else if (title.id === 'konami') {
      titleTag = `<span class="scarer-card__title-tag scarer-card__title-tag--konami">${text}</span>`;
    } else if (title.id === 'supervisor') {
      titleTag = `<span class="scarer-card__title-tag scarer-card__title-tag--supervisor">👑 Admin</span>`;
    } else if (title.id === 'qr-gang') {
      titleTag = `<span class="scarer-card__title-tag scarer-card__title-tag--qrgang">${text}</span>`;
    } else if (title.id === 'franco-impero') {
      titleTag = `<span class="scarer-card__title-tag scarer-card__title-tag--franco">${text}</span>`;
    }

    const medal = clown ? null : (person.medalla ?? medalForTier(person.puesto_medalla));
    let rank = person.posicion || (i + 1);
    if (clown) rank = '🤡';
    else if (person.puesto_medalla) rank = person.puesto_medalla;

    const modifier = clown ? 'clown' : medal;
    const cardClass = modifier ? `scarer-card--${modifier}` : '';
    const rankClass = `scarer-card__rank--${modifier || 'normal'}`;
    const idCardClass = modifier ? `scarer-item__idcard--${modifier}` : '';
    const idCardTitle = clown ? 'Ver Licencia de Payaso 🤡' : IDCARD_BUTTON_TITLES[medal] ?? 'Ver carnet';
    const isMine = currentUser && person.id === currentUser.id;

    const adminButton = isSupervisor
      ? `<button type="button" class="scarer-item__admin-pts" data-index="${i}" aria-label="Modificar puntos" title="Modificar puntos de ${escapeHtml(person.nombre || 'asustador')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>`
      : '';

    return `
      <li class="scarer-item ${isSupervisor ? 'scarer-item--supervisor' : ''}">
        <button type="button" class="scarer-card ${cardClass}" data-index="${i}" aria-pressed="${i === chosen ? 'true' : 'false'}">
          <div class="scarer-card__rank ${rankClass}">
            <span>${rank}</span>
          </div>

          <div class="scarer-card__avatar" style="border-color: ${avatarColor}">
            ${drawCustomMonster(monster)}
          </div>

          <div class="scarer-card__info">
            <div class="scarer-card__name">
              <span>${escapeHtml(name)}</span>
              ${isMine ? '<span class="team__badge">TÚ</span>' : ''}
              ${titleTag}
            </div>
            <div class="scarer-card__email">@${escapeHtml(handle)} · ${clown ? 'TRAMPOSO DE CIRCO' : 'UNAL'}</div>
          </div>

          <div class="scarer-card__score">
            <span class="scarer-card__pts">${points} <small>PTS</small></span>
            <span class="scarer-card__percent">${clown ? 'SHADOWBAN' : `${percent}%`}</span>
          </div>
        </button>
        <div class="scarer-item__actions">
          ${adminButton}
          <button type="button" class="scarer-item__idcard ${idCardClass}" data-index="${i}" aria-label="Ver carnet" title="${idCardTitle}">
            ${ICONS.idCard}
          </button>
        </div>
      </li>
    `;
  }).join('');

  // A short wait so the tank fills with its animation
  setTimeout(() => {
    selectScarer(chosen);
  }, 100);
}

// Opens the dialog with the ID card of a person from the table
function showIdCardOf(index) {
  const person = scarers[index];
  const { clown, points } = personView(person);
  const medal = clown ? null : (person.medalla ?? medalForTier(person.puesto_medalla));

  $('#idcard-modal-title').textContent = clown ? '🤡 Licencia de Payaso' : 'Carnet';
  $('#idcard-modal-clown-notice').hidden = !clown;

  const emailForCard = person.correo || (person.usuario ? `${person.usuario}@unal.edu.co` : '');
  $('#idcard-modal-idcard').innerHTML = scarerIdCard(
    person.nombre || 'Estudiante UNAL', emailForCard, person.monstruo || {}, personTitle(person), medal);
  $('#idcard-modal').showModal();
}

async function loadScareMeter() {
  if (!currentUser) return; // Do not load ranking without an authenticated session
  if (isLoadingRanking) return;
  isLoadingRanking = true;
  try {
    // shortcut: max limit capped at 50 per page, increase limit or add keyset pagination if leaderboard volume requires larger viewports.
    const [{ data: ranking, error: rankingError }, { data: clowns }, myPuestoRes] = await Promise.all([
      supabaseClient.rpc('ranking_sustometro', {
        p_limite: currentLimit,
        p_desplazamiento: 0,
        p_busqueda: currentSearchQuery || null,
      }),
      supabaseClient.rpc('payasos_sustometro', { p_limite: 20 }),
      currentUser ? supabaseClient.rpc('mi_puesto_sustometro') : Promise.resolve({ data: [] }),
    ]);

    if (rankingError) {
      console.error('Could not load the ranking:', rankingError);
      showScareMeterError('No se pudo sincronizar con Supabase. Revisa las políticas RLS de lectura.');
      return;
    }

    myRankInfo = (myPuestoRes?.data && myPuestoRes.data.length) ? myPuestoRes.data[0] : null;

    if (!ranking || !ranking.length) {
      scarers = [];
      totalFiltrados = 0;
      if (!currentSearchQuery) totalGeneral = 0;
      renderRanking([], currentSearchQuery);
    } else {
      totalFiltrados = ranking[0].total_filtrados || ranking.length;
      totalGeneral = ranking[0].total_general || ranking.length;
      maxGlobalPoints = Math.max(100, ranking[0].max_puntos || 0);
      renderRanking(ranking, currentSearchQuery);
    }

    if (typeof renderClowns === 'function') renderClowns(clowns || []);
    updateMyRankBanner();
  } catch (err) {
    console.error('Unexpected error:', err);
    showScareMeterError('Ocurrió un error inesperado al conectar con el servidor.');
  } finally {
    isLoadingRanking = false;
  }
}

async function loadMore() {
  if (isLoadingMore || scarers.length >= totalFiltrados) return;
  isLoadingMore = true;
  const btn = $('#btn-load-more');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Cargando más…';
  }

  try {
    const { data: newRows, error } = await supabaseClient.rpc('ranking_sustometro', {
      p_limite: PAGE_SIZE,
      p_desplazamiento: scarers.length,
      p_busqueda: currentSearchQuery || null,
    });

    if (error) throw error;
    if (newRows && newRows.length) {
      scarers = [...scarers, ...newRows];
      currentLimit = scarers.length;
      renderRanking(scarers, currentSearchQuery);
      updateMyRankBanner();
    }
  } catch (err) {
    console.error('Error loading more scarers:', err);
  } finally {
    isLoadingMore = false;
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Ver más';
    }
    updateLoadMoreButton();
  }
}

const loadMoreBtn = $('#btn-load-more');
if (loadMoreBtn) {
  loadMoreBtn.addEventListener('click', loadMore);
}

function updateMyRankBanner() {
  const banner = $('#my-rank-banner');
  if (!banner) return;

  if (!currentUser || !myRankInfo || scarers.some((p) => p.id === currentUser.id)) {
    banner.hidden = true;
    banner.innerHTML = '';
    return;
  }

  const name = (currentUser.user_metadata?.full_name || currentUser.email.split('@')[0]).trim();
  const monster = currentUser.user_metadata?.monstruo || chosenMonster();
  const handle = handleOf(currentUser.email);
  const title = chosenTitleOf(currentUser);
  const points = myRankInfo.puntos || 0;
  const percent = percentOf(points, maxGlobalPoints);
  const medal = myRankInfo.medalla || medalForTier(myRankInfo.puesto_medalla);
  const rank = myRankInfo.puesto_medalla || myRankInfo.posicion;

  const cardModifier = medal ? `scarer-card--${medal}` : '';
  const rankModifier = medal ? `scarer-card__rank--${medal}` : 'scarer-card__rank--normal';

  banner.innerHTML = `
    <span class="my-rank-banner__label">Tu puesto en la tabla</span>
    <div class="scarer-item my-rank-item">
      <button type="button" class="scarer-card ${cardModifier}" id="btn-my-rank-card" aria-pressed="${chosenId === currentUser.id ? 'true' : 'false'}">
        <div class="scarer-card__rank ${rankModifier}">
          <span>#${rank}</span>
        </div>
        <div class="scarer-card__avatar" style="border-color: ${monsterColor(monster)}">
          ${drawCustomMonster(monster)}
        </div>
        <div class="scarer-card__info">
          <div class="scarer-card__name">
            <span>${escapeHtml(name)}</span>
            <span class="team__badge">TÚ</span>
            <span class="scarer-card__title-tag">${escapeHtml(titleText(title, monster.estilo))}</span>
          </div>
          <div class="scarer-card__email">@${escapeHtml(handle)} · UNAL</div>
        </div>
        <div class="scarer-card__score">
          <span class="scarer-card__pts">${points} <small>PTS</small></span>
          <span class="scarer-card__percent">${percent}%</span>
        </div>
      </button>
    </div>
  `;
  banner.hidden = false;

  const btn = $('#btn-my-rank-card');
  if (btn) {
    btn.addEventListener('click', selectMyRank);
  }
}

function selectMyRank() {
  if (!currentUser || !myRankInfo) return;
  chosenId = currentUser.id;
  const name = (currentUser.user_metadata?.full_name || currentUser.email.split('@')[0]).trim();
  const handle = handleOf(currentUser.email);
  const points = myRankInfo.puntos || 0;

  tankLiquid.style.height = `${percentOf(points, maxGlobalPoints)}%`;
  hudName.textContent = name;
  hudPoints.innerHTML = `${points} <small>pts</small>`;
  $('#btn-admin-edit-points').hidden = !isCurrentSupervisor();

  $('.scarer-card').forEach((card) => card.setAttribute('aria-pressed', 'false'));
  const myBtn = $('#btn-my-rank-card');
  if (myBtn) myBtn.setAttribute('aria-pressed', 'true');

  writeReading(`Va en el puesto ${myRankInfo.posicion} de la tabla del Sustómetro.`, name, handle);
}

function showScareMeterError(message) {
  tankLiquid.style.height = '0%';
  rankingCount.textContent = 'Error de Conexión';
  hudName.textContent = 'Sin conexión';

  list.innerHTML = `
    <li class="ranking-error">
      <div class="ranking-empty__box">
        <svg class="ranking-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h3>Error al consultar la tabla</h3>
        <p>${message}</p>
        <button class="hero__button hero__button--session" onclick="loadScareMeter()" type="button">
          Reintentar conexión
        </button>
      </div>
    </li>
  `;

  reading.textContent = 'Error al consultar los asustadores.';
}

// Interaction events (click and keyboard). The chosen person stays on the tank until another is chosen.
list.addEventListener('click', (event) => {
  const adminButton = event.target.closest('.scarer-item__admin-pts');
  if (adminButton) {
    const index = Number(adminButton.dataset.index);
    selectScarer(index);
    openPointsModal(scarers[index]);
    return;
  }

  const idCardButton = event.target.closest('.scarer-item__idcard');
  if (idCardButton) {
    const index = Number(idCardButton.dataset.index);
    selectScarer(index);
    showIdCardOf(index);
    return;
  }

  const card = event.target.closest('.scarer-card');
  if (card) {
    selectScarer(Number(card.dataset.index));
  }
});

list.addEventListener('focusin', (event) => {
  const card = event.target.closest('.scarer-card');
  if (card) {
    selectScarer(Number(card.dataset.index));
  }
});

$('#btn-close-idcard').addEventListener('click', () => $('#idcard-modal').close());

// A click on the dark background (outside the box) closes the dialog
$('#idcard-modal').addEventListener('click', (event) => {
  if (event.target === $('#idcard-modal')) $('#idcard-modal').close();
});


/* ---------- Easter egg of the tank stickers ---------- */

// Tapping the five stickers in a row in a certain order opens a dialog. The stickers give no hints
// meanwhile. The order and the code are NOT in the page (the repository is public): Supabase's
// reclamar_easter_egg function keeps them, and also remembers who found it first.
// The page sends it the last five stickers tapped, comma separated, each time
// all five are different (for example 'python,git,cpp,linux,terminal').
// Without a session it does nothing (Supabase also refuses it: supabase/secrets.sql).
const TOTAL_STICKERS = 5;
let tappedStickers = [];

$('.tank__stickers').addEventListener('click', async (event) => {
  const sticker = event.target.closest('.sticker');
  if (!sticker || !currentUser) return;

  tappedStickers = [...tappedStickers, sticker.dataset.sticker].slice(-TOTAL_STICKERS);
  if (new Set(tappedStickers).size < TOTAL_STICKERS) return;

  const { data, error } = await supabaseClient.rpc('reclamar_easter_egg', { secuencia: tappedStickers.join(',') });
  if (error) {
    console.error('Could not check the easter egg:', error);
    return;
  }
  if (data.estado === 'incorrecto') return;

  tappedStickers = [];
  showEasterEgg(data);
});

// estado comes from Supabase: 'primero' (first, with the codigo) or 'tarde' (late) if someone already found it
function showEasterEgg({ estado, codigo }) {
  const isFirst = estado === 'primero';
  $('#easter-egg-modal').classList.toggle('easter-egg--late', !isFirst);
  $('#easter-egg-title').textContent = isFirst ? 'Conocedor de la informática' : 'Alguien más lo encontró primero...';
  $('#easter-egg-gif').src = isFirst ? 'img/programmer-cat.gif' : 'img/angry-programmer-cat.gif';
  $('#easter-egg-gif').alt = isFirst ? 'Gato programando en un portátil' : 'Gato programador con gafas, enojado frente al portátil';
  $('#easter-egg-prize').hidden = !isFirst;
  $('#easter-egg-code').textContent = codigo ?? '';
  $('#easter-egg-modal').showModal();
}

// The dialog is decorated with copies of the five tank stickers
$('#easter-egg-stickers').append(...[...$$('.tank__stickers .sticker__svg')].map((svg) => svg.cloneNode(true)));

$('#btn-close-easter-egg').addEventListener('click', () => $('#easter-egg-modal').close());

$('#easter-egg-modal').addEventListener('click', (event) => {
  if (event.target === $('#easter-egg-modal')) $('#easter-egg-modal').close();
});

// Supabase real-time subscription (only active when logged in)
let realtimeChannel = null;
let realtimeDebounceTimer = null;
let reloadPendingOnVisible = false;

function scheduleRealtimeReload() {
  if (!currentUser) return;
  clearTimeout(realtimeDebounceTimer);
  if (document.hidden) {
    reloadPendingOnVisible = true;
    return;
  }
  realtimeDebounceTimer = setTimeout(() => {
    loadScareMeter();
  }, 5000);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && reloadPendingOnVisible) {
    reloadPendingOnVisible = false;
    scheduleRealtimeReload();
  }
});

function setupScareMeterRealtime() {
  if (realtimeChannel || !currentUser) return;
  try {
    realtimeChannel = supabaseClient
      .channel('scare-meter-profile-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfiles' }, () => {
        scheduleRealtimeReload();
      })
      .subscribe();
  } catch (err) {
    console.log('Realtime is not available in this client', err);
  }
}

function teardownScareMeterRealtime() {
  if (realtimeChannel) {
    try {
      supabaseClient.removeChannel(realtimeChannel);
    } catch {}
    realtimeChannel = null;
  }
}

try {
  let lastAuthUserId = currentUser?.id ?? null;
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    const currentUserId = session?.user?.id ?? null;
    if (currentUserId !== lastAuthUserId) {
      lastAuthUserId = currentUserId;
      if (currentUserId) {
        setupScareMeterRealtime();
        loadScareMeter();
      } else {
        teardownScareMeterRealtime();
        scarers = [];
        totalFiltrados = 0;
        totalGeneral = 0;
        renderRanking([], '');
      }
    }
  });
} catch {
  console.log('Auth state listener not available');
}

// Header: three pixel art drawings, as on an activity page
$('#scare-meter-decorations').innerHTML = ['scareMonster', 'scareTank', 'ghost'].map((name) => drawPixelArt(PIXEL_ART[name])).join('');

$('#footer-crest').innerHTML = drawCrest();

/* ---------- Edit points modal (supervisor) ---------- */

let personBeingEdited = null;

function openPointsModal(person) {
  if (!person || !isCurrentSupervisor()) return;
  personBeingEdited = person;

  const avatar = $('#points-modal-avatar');
  avatar.style.borderColor = monsterColor(person.monstruo);
  avatar.innerHTML = drawCustomMonster(person.monstruo || {});
  $('#points-modal-name').textContent = (person.nombre || 'Estudiante UNAL').trim();
  $('#points-modal-email').textContent = `@${handleOf(person.correo)} · UNAL`;
  $('#points-modal-input').value = scarePoints(person);

  const message = $('#points-modal-message');
  message.hidden = true;
  message.textContent = '';

  $('#points-modal').showModal();
}

function closePointsModal() {
  $('#points-modal').close();
  personBeingEdited = null;
}

function showPointsError(text) {
  const message = $('#points-modal-message');
  message.className = 'auth-message auth-message--error';
  message.textContent = text;
  message.hidden = false;
}

$('#btn-close-points').addEventListener('click', closePointsModal);
$('#btn-cancel-points').addEventListener('click', closePointsModal);

$('#points-modal').addEventListener('click', (event) => {
  if (event.target === $('#points-modal')) closePointsModal();
});

// Shortcuts to add or subtract points quickly
$$('.points-modal__shortcut').forEach((button) => {
  button.addEventListener('click', () => {
    const input = $('#points-modal-input');
    const current = parseInt(input.value, 10) || 0;
    const delta = parseInt(button.dataset.add, 10) || 0;
    input.value = Math.max(0, current + delta);
  });
});

// Save the points in Supabase and refresh the ranking
$('#btn-save-points').addEventListener('click', async () => {
  if (!personBeingEdited) return;

  const newPoints = Math.max(0, parseInt($('#points-modal-input').value, 10) || 0);
  const button = $('#btn-save-points');
  const buttonText = button.querySelector('span');

  // A clown cannot receive points
  if (isClown(personBeingEdited.correo, personBeingEdited.nombre, personBeingEdited)) {
    showPointsError('🤡 Este usuario tiene Shadowban permanente por juego sucio y no puede recibir puntos.');
    return;
  }

  button.disabled = true;
  buttonText.textContent = 'Guardando…';
  $('#points-modal-message').hidden = true;

  try {
    // The Supabase function checks the supervisor permission
    const { error } = await supabaseClient.rpc('modificar_puntos', {
      target_id: personBeingEdited.id,
      nuevos_puntos: newPoints,
    });
    if (error) throw error;

    await loadScareMeter();
    closePointsModal();
  } catch (error) {
    console.error('Could not edit the points:', error);
    const message = String(error?.message || '');
    if (message.includes('Acceso denegado') || message.includes('supervisor')) {
      showPointsError('Acceso denegado: solo quienes tengan el título Supervisor de Sustos pueden modificar puntos.');
    } else {
      showPointsError('No se pudo guardar en Supabase. Si aún no corriste el script de seguridad en Supabase, ejecuta supabase/seguridad-y-baneo.sql en el SQL Editor.');
    }
  } finally {
    button.disabled = false;
    buttonText.textContent = 'Guardar puntos';
  }
});

// Admin button on the tank HUD
$('#btn-admin-edit-points').addEventListener('click', () => {
  const person = scarers.find((p) => p.id === chosenId) || scarers[0];
  if (person) openPointsModal(person);
});

// Check the supervisor role again when the session changes or a title is redeemed
document.addEventListener('idcard:session', () => {
  $('#btn-admin-edit-points').hidden = !isCurrentSupervisor();
  if (currentUser) {
    setupScareMeterRealtime();
    loadScareMeter();
  } else {
    teardownScareMeterRealtime();
    scarers = [];
    totalFiltrados = 0;
    totalGeneral = 0;
    renderRanking([], '');
  }
  updateMyRankBanner();
});

if (currentUser) {
  setupScareMeterRealtime();
  loadScareMeter();
}


// Search input listener for the ranking table
const searchInput = $('#ranking-search-input');
const clearSearchBtn = $('#btn-clear-search');

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.trim();
    if (clearSearchBtn) clearSearchBtn.hidden = !currentSearchQuery;

    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentLimit = PAGE_SIZE;
      loadScareMeter();
    }, 300);
  });
}

if (clearSearchBtn) {
  clearSearchBtn.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    currentSearchQuery = '';
    clearSearchBtn.hidden = true;
    currentLimit = PAGE_SIZE;
    loadScareMeter();
  });
}
