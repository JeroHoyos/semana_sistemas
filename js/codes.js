/* =============================================
   CODES AND TITLES
   The "¿Tienes un código?" section of the Scare Meter. The person types a code (won, for example,
   by finding an easter egg) and, if valid, unlocks the matching title from TITLES (js/data.js).
   The title is stored in their account (user_metadata.titulos) and they pick it later
   in "Editar carnet" (js/auth.js).

   The codes are not written in the page: only their SHA-256 hash. Generate them with
   node tools/hash-code.js "THE CODE"
   ============================================= */

// Must be identical to normalizeCode() in tools/hash-code.js:
// no accents, uppercase, no spaces, hyphens or underscores ("supervisor-sustos" and "SUPERVISOR SUSTOS" are equal)
function normalizeCode(text) {
  return stripAccents(text)
    .toUpperCase()
    .replace(/[\s\-_]+/g, '');
}

// SHA-256 as hex text. crypto.subtle only exists on secure pages (https or localhost).
async function hashOf(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

const userStyle = () => currentUser?.user_metadata?.monstruo?.estilo;


/* ---------- Message below the form ---------- */

// kind: 'success' | 'error' | 'info'. action (optional): { text, onClick } adds a button to the message.
function showCodeMessage(text, kind, action) {
  const box = $('#codes-message');
  const button = $('#codes-action');
  box.className = `codes__message codes__message--${kind}`;
  $('#codes-message-text').textContent = text;
  button.hidden = !action;
  button.textContent = action?.text || '';
  button.onclick = action?.onClick || null;
  box.hidden = false;
}


/* ---------- Title collection ---------- */

const STAR_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.5 2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8Z"/></svg>';
const LOCK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

// One card per title: icon, name, short description and its status (in use / unlocked / locked)
function renderCollection() {
  const list = $('#codes-collection');
  const count = $('#codes-count');
  const progress = $('#codes-progress');

  if (!currentUser) {
    count.textContent = 'Inicia sesión para guardar tus títulos en tu carnet.';
    progress.hidden = true;
    list.innerHTML = '';
    return;
  }

  const unlocked = new Set(unlockedTitles(currentUser).map((title) => title.id));
  const inUse = chosenTitleOf(currentUser).id;
  const style = userStyle();
  count.textContent = `Tus títulos: ${unlocked.size} de ${TITLES.length}`;
  progress.hidden = false;
  progress.firstElementChild.style.width = `${(unlocked.size / TITLES.length) * 100}%`;

  list.innerHTML = TITLES.map((title) => {
    const limited = title.limit ? `<span class="title-item__limit">Solo ${title.limit}</span>` : '';

    if (!unlocked.has(title.id)) {
      return `<li class="title-item title-item--locked">
        <span class="title-item__icon">${LOCK_ICON}</span>
        <span class="title-item__text">
          <span class="title-item__name"><span class="visually-hidden">Bloqueado: </span>Título secreto ${limited}</span>
          <span class="title-item__desc">${title.hint || 'Consigue su código para descubrirlo.'}</span>
        </span>
      </li>`;
    }

    const text = titleText(title, style);
    const isDebugger = title.id === 'debugger';
    const isNocturnal = title.id === 'terror-nocturno';
    const isQRGang = title.id === 'qr-gang';
    const used = title.id === inUse;
    const name = isDebugger ? `<span class="glitch-text" data-text="${text}">${text}</span>` : text;
    const classes = [
      'title-item title-item--unlocked',
      used ? 'title-item--in-use' : '',
      isDebugger ? 'title-item--debugger' : '',
      isNocturnal ? 'title-item--nocturnal' : '',
      isQRGang ? 'title-item--qrgang' : '',
      title.id === 'video-futbol' ? 'title-item--phenomenon' : '',
      title.id === 'konami' ? 'title-item--konami' : '',
    ].filter(Boolean).join(' ');

    return `<li class="${classes}">
      <span class="title-item__icon">${STAR_ICON}</span>
      <span class="title-item__text">
        <span class="title-item__name">${name} ${limited}</span>
        ${title.description ? `<span class="title-item__desc">${title.description}</span>` : ''}
      </span>
      ${used ? '<span class="title-item__status">En uso</span>' : ''}
    </li>`;
  }).join('');
}

document.addEventListener('idcard:session', renderCollection);
renderCollection();   // auth.js may have notified before this file loaded


/* ---------- Redeeming ---------- */

// After 5 wrong codes in a row it waits half a minute: this stops trying them one by one by hand
const MAX_ATTEMPTS = 5;
const WAIT_SECONDS = 30;
let failedAttempts = 0;
let blockedUntil = 0;

// Asks the database in real time how many people have unlocked a limited title
async function countRedemptions(titleId) {
  try {
    const { data, error } = await supabaseClient.rpc('contar_canjes', { p_titulo: titleId });
    if (error) {
      console.warn('Could not count redemptions via RPC:', error);
      return 0;
    }
    return Number(data) || 0;
  } catch (err) {
    console.warn('Could not count redemptions:', err);
    return 0;
  }
}

async function redeemCode(text) {
  const hash = await hashOf(normalizeCode(text));
  const title = TITLES.find((t) => !t.free && t.codeHash === hash);
  if (!title) return { status: 'invalid' };

  if (unlockedTitles(currentUser).some((t) => t.id === title.id)) {
    return { status: 'repeated', title };
  }

  // Check the redemption limit if the title has one
  if (title.limit > 0) {
    const redeemed = await countRedemptions(title.id);
    if (redeemed >= title.limit) {
      return { status: 'sold-out', title, limit: title.limit };
    }
  }

  const meta = currentUser.user_metadata || {};
  const titles = [...new Set([...(meta.titulos || []), title.id])];
  const monster = meta.monstruo || {};
  const carnetEstilo = title.id === 'qr-gang' ? 'vice' : (monster.carnet_estilo || 'clasico');
  const updatedMonster = { ...monster, titulos: titles, carnet_estilo: carnetEstilo };

  const { data, error } = await supabaseClient.auth.updateUser({
    data: { ...meta, titulos: titles, monstruo: updatedMonster, carnet_estilo: carnetEstilo },
  });
  if (error) throw error;

  // Sync to the perfiles table so it counts towards the limit and shows on the Scare Meter
  try {
    await syncProfile(meta.full_name || currentUser.email.split('@')[0], updatedMonster);
  } catch (syncError) {
    console.warn('Could not sync the title to perfiles:', syncError);
  }

  updateSessionUi(data.user);   // refreshes the ID card and the collection with the new title
  return { status: 'new', title };
}


/* ---------- Vice City unlock animation and audio ---------- */

let viceAudio = null;

function playViceMusic() {
  try {
    if (!viceAudio) {
      viceAudio = new Audio('audio/vice-city.mp3');
      viceAudio.loop = true;
      viceAudio.volume = 0.8;
    }
    viceAudio.currentTime = 0;
    viceAudio.play().catch((err) => console.log('Audio autoplay info:', err));
    updateViceAudioButton(true);
  } catch (err) {
    console.warn('Audio error:', err);
  }
}

function stopViceMusic() {
  if (viceAudio) {
    viceAudio.pause();
    updateViceAudioButton(false);
  }
}

function toggleViceMusic() {
  if (!viceAudio) {
    playViceMusic();
    return;
  }
  if (viceAudio.paused) {
    viceAudio.play().catch(() => {});
    updateViceAudioButton(true);
  } else {
    viceAudio.pause();
    updateViceAudioButton(false);
  }
}

function updateViceAudioButton(isPlaying) {
  const icon = document.querySelector('#vice-audio-icon');
  const text = document.querySelector('#vice-audio-text');
  if (icon) icon.textContent = isPlaying ? '🔊' : '🔇';
  if (text) text.textContent = isPlaying ? 'Música activa' : 'Música pausada';
}

function getViceUnlockModal() {
  let modal = document.querySelector('#vice-unlock-modal');
  if (modal) return modal;

  modal = document.createElement('dialog');
  modal.id = 'vice-unlock-modal';
  modal.className = 'auth-modal vice-unlock-modal';
  modal.setAttribute('aria-labelledby', 'vice-unlock-title');
  modal.innerHTML = `
    <div class="auth-modal__box vice-unlock-box">
      <button class="auth-modal__close vice-unlock-close" id="btn-close-vice-unlock" type="button" aria-label="Cerrar">✕</button>
      <div class="vice-unlock-scanlines" aria-hidden="true"></div>
      
      <div class="vice-unlock-header">
        <span class="vice-unlock-palm">🌴</span>
        <span>DESBLOQUEO ESPECIAL</span>
        <span class="vice-unlock-palm">🌴</span>
      </div>

      <h2 class="vice-unlock-title" id="vice-unlock-title">VICE CITY</h2>

      <div class="vice-unlock-preview-wrap">
        <div class="vice-unlock-shimmer"></div>
        <div id="vice-unlock-preview" class="speakers__idcard"></div>
      </div>

      <p class="vice-unlock-desc">
        ¡Has desbloqueado el diseño cromático <strong>Vice City</strong> y el título exclusivo <strong>QR Gang</strong>! Tu carnet ha sido transformado.
      </p>

      <div class="vice-unlock-actions">
        <button type="button" class="vice-unlock-audio-btn" id="btn-toggle-vice-audio">
          <span id="vice-audio-icon">🔊</span>
          <span id="vice-audio-text">Música activa</span>
        </button>
        <button type="button" class="hero__button vice-unlock-equip-btn" id="btn-equip-vice">
          <span>Ver mi carnet</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </div>
    </div>
  `;
  document.body.append(modal);

  modal.querySelector('#btn-close-vice-unlock').addEventListener('click', () => modal.close());
  modal.addEventListener('close', () => stopViceMusic());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });

  modal.querySelector('#btn-toggle-vice-audio').addEventListener('click', toggleViceMusic);

  modal.querySelector('#btn-equip-vice').addEventListener('click', () => {
    modal.close();
    if (typeof openIdCardEdit === 'function') {
      openIdCardEdit();
    }
  });

  return modal;
}

function showViceUnlockAnimation() {
  const modal = getViceUnlockModal();
  const preview = document.querySelector('#vice-unlock-preview');
  if (preview && typeof scarerIdCard === 'function') {
    const user = currentUser;
    const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Tu Nombre';
    const monster = { ...(user?.user_metadata?.monstruo || chosenMonster()), carnet_estilo: 'vice' };
    const qrTitle = findTitle('qr-gang') || { id: 'qr-gang', name: 'QR Gang' };
    const medal = typeof userMedal !== 'undefined' ? userMedal : null;
    preview.innerHTML = scarerIdCard(name, user?.email || 'estudiante@unal.edu.co', monster, qrTitle, medal);
  }
  modal.showModal();
  playViceMusic();
}

$('#codes-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $('#codes-input');

  if (!normalizeCode(input.value)) {
    showCodeMessage('Escribe tu código primero.', 'error');
    return;
  }
  if (!currentUser) {
    // The code stays typed: after logging in, pressing "Canjear" again is enough
    showCodeMessage('Inicia sesión para canjear tu código: así el título queda guardado en tu carnet.', 'info');
    $('#auth-modal').showModal();
    return;
  }
  if (!window.crypto?.subtle) {
    showCodeMessage('Este navegador no puede validar códigos en esta dirección. Abre la página con https.', 'error');
    return;
  }
  if (Date.now() < blockedUntil) {
    const left = Math.ceil((blockedUntil - Date.now()) / 1000);
    showCodeMessage(`Demasiados intentos. Espera ${left} segundos y prueba de nuevo.`, 'error');
    return;
  }

  const button = $('#codes-button');
  const buttonText = button.querySelector('span');
  button.disabled = true;
  buttonText.textContent = 'Canjeando…';

  try {
    const { status, title, limit } = await redeemCode(input.value);
    const name = title && titleText(title, userStyle());
    const edit = { text: 'Editar mi carnet', onClick: openIdCardEdit };

    if (status === 'invalid') {
      failedAttempts++;
      if (failedAttempts >= MAX_ATTEMPTS) {
        failedAttempts = 0;
        blockedUntil = Date.now() + WAIT_SECONDS * 1000;
        showCodeMessage(`Ese código no existe. Demasiados intentos: espera ${WAIT_SECONDS} segundos.`, 'error');
      } else {
        showCodeMessage('Ese código no existe. Revisa que esté bien escrito.', 'error');
      }
      return;
    }

    failedAttempts = 0;
    input.value = '';
    if (status === 'repeated') {
      if (title?.id === 'qr-gang') {
        showViceUnlockAnimation();
      }
      showCodeMessage(`Ese código ya lo canjeaste: tienes el estilo Vice City y el título «${name}».`, 'info', edit);
    } else if (status === 'sold-out') {
      showCodeMessage(`¡Cupos agotados! El título «${name}» era una edición limitada de ${limit || 5} personas y ya fue reclamado en su totalidad.`, 'error');
    } else if (title?.id === 'qr-gang') {
      showViceUnlockAnimation();
      showCodeMessage(`¡Desbloqueaste el estilo de carnet Vice City y el título «${name}»! Ya puedes activarlo en tu carnet.`, 'success', edit);
    } else {
      showCodeMessage(`¡Desbloqueaste el título «${name}»! Ya puedes ponértelo en tu carnet.`, 'success', edit);
    }
  } catch (error) {
    console.error('Could not redeem the code:', error);
    const message = String(error?.message || '');
    if (message.includes('JWT') || message.includes('token') || message.includes('session') || message.includes('User from sub') || message.includes('Auth') || message.includes('user not found')) {
      showCodeMessage('Tu sesión expiró o cambió en Supabase. Cierra sesión y vuelve a ingresar.', 'error', {
        text: 'Volver a ingresar',
        onClick: async () => {
          await supabaseClient.auth.signOut();
          $('#auth-modal').showModal();
        },
      });
    } else {
      showCodeMessage(translateError(error) || 'No se pudo guardar el título. Revisa tu conexión e intenta de nuevo.', 'error');
    }
  } finally {
    button.disabled = false;
    buttonText.textContent = 'Canjear';
  }
});
