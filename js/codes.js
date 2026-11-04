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
    const used = title.id === inUse;
    const name = isDebugger ? `<span class="glitch-text" data-text="${text}">${text}</span>` : text;
    const classes = [
      'title-item title-item--unlocked',
      used ? 'title-item--in-use' : '',
      isDebugger ? 'title-item--debugger' : '',
      isNocturnal ? 'title-item--nocturnal' : '',
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
    const { data: profiles, error } = await supabaseClient
      .from('perfiles')
      .select('id, monstruo');
    if (error || !profiles) return 0;

    return profiles.filter(({ monstruo }) => {
      const titles = Array.isArray(monstruo?.titulos) ? monstruo.titulos : [];
      return titles.includes(titleId) || monstruo?.titulo === titleId;
    }).length;
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
  const { data, error } = await supabaseClient.auth.updateUser({ data: { ...meta, titulos: titles } });
  if (error) throw error;

  // Sync to the perfiles table so it counts towards the limit and shows on the Scare Meter
  try {
    const monster = meta.monstruo || {};
    const updated = { ...monster, titulos: [...new Set([...(monster.titulos || []), title.id])] };
    await syncProfile(meta.full_name || currentUser.email.split('@')[0], updated);
  } catch (syncError) {
    console.warn('Could not sync the title to perfiles:', syncError);
  }

  updateSessionUi(data.user);   // refreshes the ID card and the collection with the new title
  return { status: 'new', title };
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
      showCodeMessage(`Ese código ya lo canjeaste: tienes el título «${name}».`, 'info', edit);
    } else if (status === 'sold-out') {
      showCodeMessage(`¡Cupos agotados! El título «${name}» era una edición limitada de ${limit || 5} personas y ya fue reclamado en su totalidad.`, 'error');
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
