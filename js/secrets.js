/* =============================================
   SECRET CODES
   Hidden challenges. Only the first people who complete each one, as many as the limit of its title
   (the one in TITLES with the secret's id), get that title for the ID card; whoever comes later learns
   that the places are taken. Without a session they do nothing.
     konami        the Konami code (↑ ↑ ↓ ↓ ← → ← → B A) on the Scare Meter console's d-pad and buttons
                   (js/weekly-game.js notices it and calls claimSecret)
     video-futbol  the whole video on the football tournament page, without skipping

   Supabase remembers who found each one (supabase/secrets.sql). It also checks that the video took
   as long as it lasts, because anything checked here can be faked. It still answers with a code
   (secretos.codigo), which the page no longer shows.
   ============================================= */

// Title of the dialog when the person is the first
const SECRET_TITLES = {
  konami: 'Código Konami',
  'video-futbol': 'Revisión del VAR',
};

// places: how many people can win the secret. title: the one won ('' if it could not be saved).
const SECRET_TEXTS = {
  primero: (places, title) => (title
    ? `Estás entre las ${places} primeras personas en descubrirlo: ganaste el título «${title}» para tu carnet.`
    : `Estás entre las ${places} primeras personas en descubrirlo, pero no pudimos guardar tu título. Hazlo otra vez en un rato.`),
  tarde: (places) => `Descubriste el secreto, pero ya lo encontraron las ${places} personas que podían ganarlo.`,
  error: () => 'Encontraste un secreto, pero no pudimos revisarlo. Hazlo otra vez en un rato.',
};


/* ---------- Claiming and the dialog ---------- */

let claiming = false;

async function claimSecret(id) {
  if (claiming) return;
  claiming = true;
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;
    const { data, error } = await supabaseClient.rpc('reclamar_secreto', { p_secreto: id });
    if (error) {
      console.error('Could not claim the secret:', error);
      showSecret(id, 'error');
      return;
    }
    let title = '';
    if (data.estado === 'primero') {
      try {
        title = await grantTitle(id);
      } catch (titleError) {
        console.error('Could not save the title:', titleError);
      }
    }
    // 'incompleto': according to Supabase the video did not take as long as it lasts (sped up or faked)
    if (data.estado !== 'incompleto') showSecret(id, data.estado, title);
  } finally {
    claiming = false;
  }
}

// Saves the secret's title in the account, like a title from a code (js/codes.js); auth.js copies it
// to 'perfiles' on the next page that has it. Returns how the title reads on the person's ID card.
async function grantTitle(id) {
  // The account fresh from Supabase, not the session's copy: a title redeemed elsewhere is not lost
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) throw error;
  const meta = data.user.user_metadata;
  const titles = meta.titulos || [];
  if (!titles.includes(id)) {
    // Supabase only replaces the keys it receives: the rest of the account stays as it is
    const { error: saveError } = await supabaseClient.auth.updateUser({ data: { titulos: [...titles, id] } });
    if (saveError) throw saveError;
  }
  return titleText(findTitle(id), meta.monstruo?.estilo);
}

// Built here so every page has it without repeating its HTML. It looks like the sticker easter egg's.
function secretDialog() {
  let dialog = $('#secret-modal');
  if (dialog) return dialog;

  dialog = document.createElement('dialog');
  dialog.className = 'auth-modal easter-egg';
  dialog.id = 'secret-modal';
  dialog.setAttribute('aria-labelledby', 'secret-title');
  dialog.innerHTML = `
    <div class="auth-modal__box easter-egg__box">
      <button class="auth-modal__close" type="button" aria-label="Cerrar ventana">✕</button>
      <div class="easter-egg__photo"><img class="easter-egg__gif" id="secret-gif" alt=""></div>
      <h2 class="auth-modal__title easter-egg__title" id="secret-title"></h2>
      <p class="easter-egg__text" id="secret-text"></p>
    </div>`;
  document.body.append(dialog);

  dialog.querySelector('.auth-modal__close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  return dialog;
}

// estado: 'primero' (with the title, '' if it could not be saved), 'tarde' (someone found it first)
// or 'error' (Supabase did not answer)
function showSecret(id, estado, title = '') {
  const dialog = secretDialog();
  const late = estado === 'tarde';
  $('#secret-gif').src = late ? 'img/angry-programmer-cat.gif' : 'img/programmer-cat.gif';
  $('#secret-gif').alt = late ? 'Gato programador con gafas, enojado frente al portátil' : 'Gato programando en un portátil';
  $('#secret-title').textContent = late ? 'Otras personas llegaron primero...' : SECRET_TITLES[id];
  $('#secret-text').textContent = SECRET_TEXTS[estado](findTitle(id).limit, title);
  if (!dialog.open) dialog.showModal();
}


/* ---------- The football video, watched to the end ----------
   Each second of the video counts once, and only if it played: dragging the bar forward skips seconds,
   so the video ends with seconds missing. Supabase also notes when it started playing (empezar_secreto)
   and, on claiming, checks that the video's length went by. */

const footballVideo = new URLSearchParams(location.search).get('id') === 'futbol' && $('.event__video');

if (footballVideo) {
  const SECONDS_ALLOWED_MISSING = 5;   // the last half second of each check and the very end do not always count
  const seen = new Set();
  let player = null;
  let lastTime = 0;
  let timer = 0;
  let started = false;

  const markSeen = () => {
    const now = player.getCurrentTime();
    if (now > lastTime && now - lastTime < 2) {
      for (let second = Math.floor(lastTime); second < Math.floor(now); second++) seen.add(second);
    }
    lastTime = now;
  };

  async function noteStart() {
    started = true;
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;   // without a session the secret does nothing
    const { error } = await supabaseClient.rpc('empezar_secreto', { p_secreto: 'video-futbol' });
    if (error) console.error('Could not note the start of the video:', error);
  }

  const onStateChange = ({ data: state }) => {
    clearInterval(timer);
    if (state === YT.PlayerState.PLAYING) {
      if (!started) noteStart();
      lastTime = player.getCurrentTime();
      timer = setInterval(markSeen, 500);
    } else if (state === YT.PlayerState.ENDED) {
      markSeen();
      if (seen.size >= Math.floor(player.getDuration()) - SECONDS_ALLOWED_MISSING) claimSecret('video-futbol');
    }
  };

  window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player(footballVideo, { events: { onStateChange } });
  };
  const api = document.createElement('script');
  api.src = 'https://www.youtube.com/iframe_api';
  document.head.append(api);
}
