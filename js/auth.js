/* =============================================
   SESSION AND SCARER ID CARD (SUPABASE)
   Dialog to log in or create an account with the UNAL email.
   On signing up, the person builds their monster and gets an ID card.

   Supabase names stay in Spanish because they are live data: table and column names (perfiles,
   nombre, correo, monstruo, puntos), function names and parameters, and the keys and values stored
   in accounts (user_metadata.monstruo, titulo, titulos). Renaming them needs a database migration.
   ============================================= */

// This is Supabase's public (anon) key: it is made to live in the browser.
// The rules configured in Supabase are what protect the data. Never put the service_role key here.
const SUPABASE_URL = 'https://uwcdgpxdiigllqhhmyss.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Y2RncHhkaWlnbGxxaGhteXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MDc4ODUsImV4cCI6MjEwODI4Mzg4NX0.NuHGfN7un_7Qxg_uosrxtYcUouK593WdmQLrg9mjHjs';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Only institutional emails are accepted
const UNAL_DOMAIN = '@unal.edu.co';

// true = "Crear Carnet" tab, false = "Ingresar" tab
let signupMode = false;


/* ---------- Monster builder ---------- */

// Options for each monster part, in the order the arrows go through them.
// value: the option drawCustomMonster draws (icons.js); label: what the selector shows.
const MONSTER_CATALOG = {
  estilo: [
    { value: 'masculino', label: 'Asustador' },
    { value: 'femenino', label: 'Asustadora' },
  ],
  cuerpo: [
    { value: 'manchas', label: 'Peludo Manchas' },
    { value: 'redondo', label: 'Redondo Mike' },
    { value: 'escamas', label: 'Reptil Randall' },
    { value: 'rayas', label: 'Bestia a Rayas' },
    { value: 'gelatina', label: 'Mutante Gel' },
  ],
  color: [
    { value: '#1667c2', label: 'Azul Sulley' },
    { value: '#2f9e5b', label: 'Verde Wazowski' },
    { value: '#8b5fd6', label: 'Morado Boggs' },
    { value: '#e05a7a', label: 'Rosa Sustos' },
    { value: '#f08a24', label: 'Naranja Rugido' },
    { value: '#35b6b4', label: 'Turquesa' },
    { value: '#d23c5a', label: 'Rojo Escarlata' },
    { value: '#3b4d63', label: 'Gris Nocturno' },
  ],
  ojos: [
    { value: 'ciclope', label: '1 Ojo Cíclope' },
    { value: 'doble', label: '2 Ojos Clásicos' },
    { value: 'triple', label: '3 Ojos Mutantes' },
    { value: 'tallos', label: 'Ojos en Antena' },
    { value: 'intenso', label: 'Mirada Feroz' },
  ],
  cuernos: [
    { value: 'toro', label: 'Cuernos Toro' },
    { value: 'ramas', label: 'Cuernos Retorcidos' },
    { value: 'antenas', label: 'Antenas Luz' },
    { value: 'cresta', label: 'Cresta Dragón' },
    { value: 'serpientes', label: 'Cabello Medusa' },
    { value: 'orejas', label: 'Orejas Peludas' },
  ],
  boca: [
    { value: 'colmillos', label: 'Colmillos' },
    { value: 'rugido', label: 'Rugido Susto' },
    { value: 'sonrisa', label: 'Sonrisa MU' },
    { value: 'sierra', label: 'Dientes Sierra' },
    { value: 'brackets', label: 'Brackets' },
    { value: 'lengua', label: 'Lengua Afuera' },
  ],
  accesorio: [
    { value: 'ninguno', label: 'Al Natural' },
    { value: 'gorra', label: 'Gorra UNAL' },
    { value: 'gafas', label: 'Gafas Dev' },
    { value: 'audifonos', label: 'Audífonos' },
    { value: 'corbata', label: 'Corbata Sustos' },
    { value: 'mono', label: 'Moño Sustos' },
  ],
};

const PARTS = Object.keys(MONSTER_CATALOG);

// Position of the chosen option in each part (all start at the first one)
const monsterIndexes = Object.fromEntries(PARTS.map((part) => [part, 0]));

const chosenOption = (part) => MONSTER_CATALOG[part][monsterIndexes[part]];

// The chosen monster, for example { estilo: 'masculino', cuerpo: 'manchas', color: '#1667c2', ... }
function chosenMonster() {
  const monster = {};
  for (const part of PARTS) {
    monster[part] = chosenOption(part).value;
  }
  return monster;
}

/* ---------- ID card titles ---------- */

// The logged-in person (null without a session). Set by updateSessionUi.
let currentUser = null;

// The usual title (the "free" one in TITLES, data.js): everyone has it
const BASE_TITLE = TITLES.find((title) => title.free) || TITLES[0];

const findTitle = (id) => TITLES.find((title) => title.id === id);

// How a title reads according to the monster's style (Asustador / Asustadora, Rey / Reina…)
function titleText(title, style) {
  return style === 'femenino' && title.feminine ? title.feminine : title.name;
}

// The titles a person has: the free ones and those redeemed with a code.
// Stored in their account as a list of ids (user_metadata.titulos); an id no longer in TITLES is ignored.
function unlockedTitles(user) {
  const redeemed = user?.user_metadata?.titulos;
  return TITLES.filter((title) => title.free || (Array.isArray(redeemed) && redeemed.includes(title.id)));
}

// The title on their ID card: the chosen one (user_metadata.titulo) if still unlocked; otherwise the usual one
function chosenTitleOf(user) {
  const id = user?.user_metadata?.titulo;
  return unlockedTitles(user).find((title) => title.id === id) || BASE_TITLE;
}

// How each podium place dresses the ID card
const MEDAL_STYLES = {
  gold: { card: 'idcard idcard--gold', stamp: '<span class="idcard__stamp idcard__stamp--gold">1° PUESTO</span>', border: '#d4a017' },
  silver: { card: 'idcard idcard--silver', stamp: '<span class="idcard__stamp idcard__stamp--silver">2° PUESTO</span>', border: '#94a3b8' },
  bronze: { card: 'idcard idcard--bronze', stamp: '<span class="idcard__stamp idcard__stamp--bronze">3° PUESTO</span>', border: '#b45309' },
};

// ID card with the name, the email's user (what goes before the @), the monster, the title and the medal
function scarerIdCard(name, email, monster, title = BASE_TITLE, medal = null) {
  let shownName = name?.trim() || 'Tu Nombre Aquí';
  let handle = email?.includes('@') ? email.split('@')[0] : 'estudiante';
  const clown = isClown(email, name, monster);

  if (clown && isLargoAlias(email, name)) {
    shownName = 'JUAN CARLOS LARGO';
    handle = 'imlargo';
  }
  const role = clown ? 'TRAMPOSO DE CIRCO' : titleText(title, monster?.estilo);
  const isDebugger = !clown && title?.id === 'debugger';
  const isNocturnal = !clown && title?.id === 'terror-nocturno';

  // Long titles split into two lines so they do not hit the photo
  let bandClass = role.length > 12 ? 'idcard__band idcard__band--long' : 'idcard__band';
  if (isDebugger) bandClass += ' idcard__band--glitch';
  if (isNocturnal) bandClass += ' idcard__band--nocturnal';
  if (clown) bandClass += ' idcard__band--clown';

  const roleHtml = isDebugger
    ? `<span class="glitch-text" data-text="${role}">${role}</span>`
    : role;

  const color = monsterColor(monster);
  const medalStyle = clown ? null : MEDAL_STYLES[medal];
  const cardClass = clown ? 'idcard idcard--clown' : medalStyle?.card ?? 'idcard';
  const stamp = clown
    ? '<span class="idcard__stamp idcard__stamp--clown">🤡 LICENCIA DE PAYASO</span>'
    : medalStyle?.stamp ?? '';
  const photoBorder = clown ? '#ff0033' : medalStyle?.border ?? color;

  const brand = clown
    ? `<span class="idcard__week idcard__week--clown"><span class="idcard__tent" aria-hidden="true">🎪</span>CIRCO DE</span><span class="idcard__systems idcard__systems--clown">— PAYASOS —</span>`
    : `<span class="idcard__week">Semana</span><span class="idcard__systems">— de sistemas —</span>`;

  const nose = clown ? '<div class="clown-nose" title="Payaso">🔴</div>' : '';
  const roleLine = clown
    ? `<div class="idcard__role idcard__role--clown">@${escapeHtml(handle)} · PAYASO OFICIAL</div>`
    : `<div class="idcard__role">@${escapeHtml(handle)} · UNAL</div>`;

  return `
    <article class="${cardClass}">
      <div class="idcard__crest">${drawCrest()}</div>
      <div class="idcard__brand">
        ${brand}
      </div>
      ${stamp}
      <div class="idcard__name">${escapeHtml(shownName)}</div>
      ${roleLine}
      <div class="${bandClass}" style="background: ${clown ? '' : color}; --letters: ${role.length}">${roleHtml}</div>
      <div class="idcard__photo" style="border-color: ${photoBorder}">
        ${drawCustomMonster(monster || {})}
        ${nose}
      </div>
    </article>
  `;
}

// Shows the chosen option on each selector and redraws the sample ID card.
// When creating the card it reads the form; when editing, the name and title of the edit view.
function updatePreview() {
  for (const part of PARTS) {
    $(`#val-${part}`).textContent = chosenOption(part).label;
  }
  $('#dot-color').style.background = chosenOption('color').value;

  const monster = chosenMonster();
  if (!editing) {
    $('#signup-idcard-preview').innerHTML =
      scarerIdCard($('#auth-name').value, $('#auth-email')?.value || 'estudiante@unal.edu.co', monster);
    return;
  }

  const titles = unlockedTitles(currentUser);
  const title = titles.find((t) => t.id === titleBeingEdited) || BASE_TITLE;
  const text = titleText(title, monster.estilo);
  if (title.id === 'debugger') {
    $('#val-title').innerHTML = `<span class="glitch-text" data-text="${text}">${text}</span>`;
  } else {
    $('#val-title').textContent = text;
  }
  $$('#title-selector .arcade-selector__arrow').forEach((arrow) => { arrow.disabled = titles.length < 2; });
  $('#edit-titles-note').textContent = titles.length < 2
    ? 'Aún no tienes otros títulos. Canjea códigos en el Sustómetro para desbloquearlos.'
    : `Tienes ${titles.length} de ${TITLES.length} títulos. Canjea más códigos en el Sustómetro.`;

  $('#signup-idcard-preview').innerHTML =
    scarerIdCard($('#edit-name').value, currentUser.email, monster, title, userMedal);
}

// ‹ › arrows on each selector: go to the previous or next option (from the last one back to the first)
$('#idcard-builder').addEventListener('click', (event) => {
  const arrow = event.target.closest('.arcade-selector__arrow');
  if (!arrow) return;

  const part = arrow.closest('.arcade-selector').dataset.prop;
  const total = MONSTER_CATALOG[part].length;
  monsterIndexes[part] = (monsterIndexes[part] + Number(arrow.dataset.dir) + total) % total;
  updatePreview();
});

$('#btn-random-monster').addEventListener('click', () => {
  for (const part of PARTS) {
    monsterIndexes[part] = Math.floor(Math.random() * MONSTER_CATALOG[part].length);
  }
  updatePreview();
});

$('#auth-name').addEventListener('input', updatePreview);
if ($('#auth-email')) $('#auth-email').addEventListener('input', updatePreview);
$('#edit-name').addEventListener('input', updatePreview);


/* ---------- Editing the ID card ---------- */

// While editing, the monster selector (#idcard-builder) moves from the "Crear Carnet" view to the edit view
// and goes back on leaving, so both cases use the same buttons and the same preview.
let editing = false;
let titleBeingEdited = BASE_TITLE.id;   // id of the title being tried on the preview

function showEditMessage(text) {
  const message = $('#edit-message');
  message.textContent = text;
  message.className = 'auth-message auth-message--error';
  message.hidden = false;
}

function enterEdit() {
  if (!currentUser || editing) return;
  const meta = currentUser.user_metadata || {};

  // The selector starts with the monster the person already has
  for (const part of PARTS) {
    const index = MONSTER_CATALOG[part].findIndex((option) => option.value === meta.monstruo?.[part]);
    monsterIndexes[part] = Math.max(index, 0);
  }
  titleBeingEdited = chosenTitleOf(currentUser).id;
  editing = true;

  $('#edit-name').value = meta.full_name || currentUser.email.split('@')[0];
  $('#edit-message').hidden = true;
  $('#edit-builder-mount').append($('#idcard-builder'));
  $('#idcard-builder').hidden = false;
  $('#auth-profile-view').hidden = true;
  $('#auth-edit-view').hidden = false;
  $('#auth-title').textContent = 'Editar carnet';
  updatePreview();
}

// Discards the edit in progress and shows the saved ID card again
function leaveEdit() {
  if (!editing) return;
  editing = false;
  $('#auth-form').before($('#idcard-builder'));
  $('#idcard-builder').hidden = !signupMode;
  $('#auth-edit-view').hidden = true;
  $('#auth-profile-view').hidden = false;
  $('#auth-title').textContent = 'Carnet de Asustador';
}

// The codes section uses it to take the person straight to picking their new title
function openIdCardEdit() {
  if (!currentUser) return;
  if (!$('#auth-modal').open) $('#auth-modal').showModal();
  enterEdit();
}

// The Scare Meter reads from the 'perfiles' table, not from the account: the new name and monster
// (with the title, so the Scare Meter shows it) must be copied there.
// It tries Supabase's actualizar_perfil function first and falls back to a direct update.
async function syncProfile(name, monster) {
  const { error } = await supabaseClient.rpc('actualizar_perfil', { nuevo_nombre: name, nuevo_monstruo: monster });
  if (!error) return;

  const { error: updateError } = await supabaseClient
    .from('perfiles')
    .upsert({ id: currentUser.id, nombre: name, monstruo: monster, correo: currentUser.email }, { onConflict: 'id' });
  if (updateError) console.warn('Could not sync the profile:', updateError);
}

async function saveEdit() {
  const name = $('#edit-name').value.trim();
  if (!name) {
    showEditMessage('Escribe tu nombre para imprimirlo en el carnet.');
    return;
  }
  // Only a title the person already unlocked can stay
  const title = unlockedTitles(currentUser).find((t) => t.id === titleBeingEdited) || BASE_TITLE;

  const button = $('#btn-save-edit');
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Guardando…';
  $('#edit-message').hidden = true;

  try {
    const titleIds = unlockedTitles(currentUser).map((t) => t.id);
    const monster = { ...chosenMonster(), titulo: title.id, titulos: titleIds };
    const { data, error } = await supabaseClient.auth.updateUser({
      data: { ...currentUser.user_metadata, full_name: name, monstruo: monster, titulo: title.id, titulos: titleIds },
    });
    if (error) throw error;
    await syncProfile(name, monster);
    leaveEdit();
    updateSessionUi(data.user);
    // Only sustometro.html loads scare-meter.js
    if (typeof loadScareMeter === 'function') loadScareMeter();
  } catch (error) {
    showEditMessage(translateError(error));
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

$('#btn-edit-idcard').addEventListener('click', enterEdit);
$('#btn-cancel-edit').addEventListener('click', leaveEdit);
$('#btn-save-edit').addEventListener('click', saveEdit);

// Arrows on the title selector: go through the unlocked titles
$('#title-selector').addEventListener('click', (event) => {
  const arrow = event.target.closest('.arcade-selector__arrow');
  if (!arrow || !editing) return;

  const titles = unlockedTitles(currentUser);
  const current = titles.findIndex((title) => title.id === titleBeingEdited);
  titleBeingEdited = titles[(current + Number(arrow.dataset.dir) + titles.length) % titles.length].id;
  updatePreview();
});


/* ---------- Session dialog ---------- */

$('#auth-eye-icon').innerHTML = ICONS.eye;

// Switches between the "Ingresar" and "Crear Carnet" tabs
function setAuthMode(isSignup) {
  signupMode = isSignup;
  $('#tab-login').setAttribute('aria-pressed', !isSignup);
  $('#tab-signup').setAttribute('aria-pressed', isSignup);

  $('#auth-modal').classList.toggle('auth-modal--signup', isSignup);
  $('#idcard-builder').hidden = !isSignup;
  $('#name-field').hidden = !isSignup;
  if ($('#auth-info-login')) $('#auth-info-login').hidden = isSignup;

  $('#auth-title').textContent = isSignup ? 'Carnet de Asustador' : 'Acceso';
  $('#auth-submit-text').textContent = isSignup ? 'Emitir carnet con correo UNAL' : 'Iniciar sesión con correo UNAL';
  hideAuthMessage();

  if (isSignup) updatePreview();
}

// Message below the form: error (red) or success (green)
function showAuthMessage(text, isError = true) {
  const message = $('#auth-message');
  message.textContent = text;
  message.className = `auth-message ${isError ? 'auth-message--error' : 'auth-message--success'}`;
  message.hidden = false;
}

function hideAuthMessage() {
  const message = $('#auth-message');
  message.hidden = true;
  message.textContent = '';
}

// With a session, the dialog shows the person's ID card; without one, the form
function updateSessionUi(user) {
  currentUser = user;
  $('#btn-open-auth').classList.toggle('hero__button--signed-in', Boolean(user));
  if (user) {
    // Enforce institutional domain strictly
    if (!user.email?.toLowerCase().endsWith(UNAL_DOMAIN)) {
      supabaseClient.auth.signOut().then(() => {
        alert('Acceso restringido: Solo se permiten cuentas institucionales @unal.edu.co');
      });
      return;
    }

    // Check for pending monster from signup or initialize first-time OAuth profile
    const pendingRaw = localStorage.getItem('semana_sistemas_pending_monster');
    let pending = null;
    if (pendingRaw) {
      try { pending = JSON.parse(pendingRaw); } catch (_) {}
      localStorage.removeItem('semana_sistemas_pending_monster');
    }

    const existingMonster = user.user_metadata?.monstruo;
    if (!existingMonster || pending) {
      const fullName = (pending?.name || user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0]).trim();
      const monster = pending?.monster || chosenMonster();
      const title = BASE_TITLE;
      const titleIds = [title.id];
      const updatedMonster = { ...monster, titulo: title.id, titulos: titleIds };

      supabaseClient.auth.updateUser({
        data: {
          ...user.user_metadata,
          full_name: fullName,
          monstruo: updatedMonster,
          titulo: title.id,
          titulos: titleIds,
        },
      }).then(({ data, error }) => {
        if (!error && data?.user) {
          syncProfile(fullName, updatedMonster);
          currentUser = data.user;
          if (!editing) showProfile(data.user);
        }
      });
      return;
    }

    // If the person chose or unlocked titles in their account that are not on their monster in the table,
    // they are synced to 'perfiles' so the global count and the Scare Meter stay up to date.
    const titleId = user.user_metadata?.titulo;
    const titleIds = unlockedTitles(user).map((t) => t.id);
    const monster = user.user_metadata?.monstruo || {};
    const titleOutdated = titleId && monster.titulo !== titleId;
    const titlesOutdated = !Array.isArray(monster.titulos) || monster.titulos.length !== titleIds.length;

    if (titleOutdated || titlesOutdated) {
      const updated = { ...monster, ...(titleId ? { titulo: titleId } : {}), titulos: titleIds };
      syncProfile(user.user_metadata.full_name || user.email.split('@')[0], updated);
    }

    // Supabase notifies again each time the tab regains focus: while the person is editing
    // the profile is not repainted on top, so they do not lose their work.
    if (!editing) showProfile(user);
  } else {
    leaveEdit();
    showForm();
  }
  // For the codes section (js/codes.js): who is logged in, or their titles, changed
  document.dispatchEvent(new CustomEvent('idcard:session'));
}

let userMedal = null;   // 'gold' | 'silver' | 'bronze' | null

async function fetchUserMedal(userId) {
  const { data: profiles } = await supabaseClient.from('perfiles').select('id, nombre, correo, monstruo, puntos');
  const person = profiles?.find((p) => p.id === userId);
  return person ? medalFor(scarePoints(person), profiles.map(scarePoints)) : null;
}

function showProfile(user) {
  let fullName = user.user_metadata?.full_name || user.email.split('@')[0];
  const monster = user.user_metadata?.monstruo || chosenMonster();
  const title = chosenTitleOf(user);
  const clown = isClown(user.email, fullName, monster);

  if (clown && isLargoAlias(user.email, fullName)) fullName = 'Juan Carlos Largo';

  // Sanctioned accounts cannot edit their ID card
  $('#btn-edit-idcard').hidden = clown;

  $('#session-text').textContent = fullName.trim().split(' ')[0];   // the hero button shows the first name
  $('#auth-modal').classList.add('auth-modal--signup');
  $('#auth-form-view').hidden = true;
  $('#auth-profile-view').hidden = false;

  // Special clown notice if the user was sanctioned for hacking
  let clownNotice = $('#profile-clown-notice');
  if (clown) {
    if (!clownNotice) {
      clownNotice = document.createElement('div');
      clownNotice.id = 'profile-clown-notice';
      clownNotice.className = 'clown-notice';
      clownNotice.innerHTML = `
        <span class="clown-notice__icon">🤡🎪</span>
        <div class="clown-notice__body">
          <strong>¡HAY UN PAYASO INTENTANDO ARRUINAR LA FIESTA!</strong>
          <p>Tu cuenta ha sido sancionada con Shadowban por manipular puntos mediante inyección de código. Tu carnet ahora es público como Licencia de Payaso y tus puntos se han congelado en 0.</p>
        </div>
      `;
      $('#profile-idcard').before(clownNotice);
    }
    clownNotice.hidden = false;
    $('#auth-title').textContent = '🤡 Licencia de Payaso';
  } else {
    if (clownNotice) clownNotice.hidden = true;
    $('#auth-title').textContent = 'Carnet de Asustador';
  }

  $('#profile-idcard').innerHTML = scarerIdCard(fullName, user.email, monster, title, userMedal);
  $('#profile-email').textContent = user.email;

  // Asks asynchronously whether they are on the Scare Meter podium, to update the ID card
  fetchUserMedal(user.id).then((medal) => {
    if (medal === userMedal) return;
    userMedal = medal;
    if (!editing && !$('#auth-profile-view').hidden) {
      $('#profile-idcard').innerHTML = scarerIdCard(fullName, user.email, monster, title, userMedal);
    }
  });
}

function showForm() {
  $('#session-text').textContent = 'Iniciar sesión';
  $('#auth-form-view').hidden = false;
  $('#auth-profile-view').hidden = true;
  setAuthMode(signupMode);
}

$('#btn-open-auth').addEventListener('click', () => {
  hideAuthMessage();
  $('#auth-modal').showModal();
});

$('#btn-close-auth').addEventListener('click', () => $('#auth-modal').close());

// If the dialog closes mid-edit, whatever was not saved is discarded
$('#auth-modal').addEventListener('close', leaveEdit);

// A click on the dark background (outside the box) closes the dialog
$('#auth-modal').addEventListener('click', (event) => {
  if (event.target === $('#auth-modal')) $('#auth-modal').close();
});

$('#tab-login').addEventListener('click', () => setAuthMode(false));
$('#tab-signup').addEventListener('click', () => setAuthMode(true));


/* ---------- Creating the ID card, logging in and out ---------- */

// Supabase errors (they come in English), explained to the person in Spanish
const SUPABASE_ERRORS = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'User already registered': 'Este correo ya tiene un carnet. Ve a la pestaña Ingresar.',
};

function translateError(error) {
  const message = error.message || 'No se pudo completar la operación.';
  const known = Object.keys(SUPABASE_ERRORS).find((text) => message.includes(text));
  return known ? SUPABASE_ERRORS[known] : message;
}

// Creates the account and stores the name and the chosen monster in it
async function createIdCard({ name, email, password }) {
  if (!name) throw new Error('Escribe tu nombre para imprimirlo en el carnet.');

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { full_name: name, monstruo: chosenMonster() } },
  });
  if (error) throw error;

  // If Supabase asks to confirm the email, there is no session yet
  if (!data.session) {
    showAuthMessage(`¡Carnet creado! Revisa tu correo ${UNAL_DOMAIN} para activarlo.`, false);
    return;
  }
  showAuthMessage('¡Carnet de Asustador emitido con éxito!', false);
  setTimeout(() => $('#auth-modal').close(), 1000);
}

async function logIn({ email, password }) {
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  $('#auth-modal').close();
}

// Triggers Google Workspace / SmartKey OAuth for @unal.edu.co accounts
async function signInWithSmartKey() {
  hideAuthMessage();

  const button = $('#auth-submit');
  const buttonText = $('#auth-submit-text');
  const originalText = buttonText.textContent;
  button.disabled = true;
  buttonText.textContent = 'Conectando con SmartKey…';

  try {
    if (signupMode) {
      const chosenName = $('#auth-name').value.trim();
      try {
        localStorage.setItem('semana_sistemas_pending_monster', JSON.stringify({
          name: chosenName,
          monster: chosenMonster(),
        }));
      } catch (_) {}
    }

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          hd: 'unal.edu.co',
          prompt: 'select_account',
        },
        redirectTo: window.location.origin + window.location.pathname,
      },
    });
    if (error) throw error;
  } catch (error) {
    showAuthMessage(translateError(error));
    button.disabled = false;
    buttonText.textContent = originalText;
  }
}

// Form submit: initiates login or signup via SmartKey
$('#auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  await signInWithSmartKey();
});

$('#btn-logout').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  $('#auth-form').reset();
  $('#auth-modal').close();
});


/* ---------- Downloading the ID card as an image ---------- */

// Image width in pixels, whatever the screen size
const IDCARD_IMAGE_WIDTH = 1080;

// File name from the name on the ID card: "Ana María" → carnet-asustador-ana-maria.png
function fileNameFor(name) {
  const clean = stripAccents(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `carnet-asustador-${clean || 'unal'}.png`;
}

// htmlToImage (the html-to-image library) copies the ID card with its fonts and paints it on a canvas.
// The first time it often comes out blank because the browser has not prepared the fonts yet,
// so it repaints until the center of the card has color (3 tries at most).
async function paintIdCard(card) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const canvas = await htmlToImage.toCanvas(card, {
      pixelRatio: IDCARD_IMAGE_WIDTH / card.offsetWidth,   // measured on each try in case the window resized
      style: { boxShadow: 'none', animation: 'none' },     // without the shadow or the entry animation
    });
    const center = canvas.getContext('2d').getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
    if (center[3] > 0) return canvas.toDataURL('image/png');
  }
  throw new Error('The ID card came out blank');
}

// Turns the ID card into a PNG and downloads it. Needs no session: it also works with the sample card.
async function downloadIdCard(button) {
  const card = $(`${button.dataset.idcard} .idcard`);
  const text = button.querySelector('span');
  button.disabled = true;
  text.textContent = 'Preparando…';

  try {
    const image = await paintIdCard(card);
    const link = document.createElement('a');
    link.href = image;
    link.download = fileNameFor(card.querySelector('.idcard__name').textContent);
    link.click();
    text.textContent = 'Descargar carnet';
  } catch (error) {
    console.error(error);
    text.textContent = 'No se pudo, intenta de nuevo';
  } finally {
    button.disabled = false;
  }
}

$$('.download-button').forEach((button) => {
  button.addEventListener('click', () => downloadIdCard(button));
});


/* ---------- Startup and version control ---------- */

// If the project version changed, old sessions in the browser are closed
// and stored tokens are cleared, to avoid stale JWTs or outdated versions.
async function syncSessionVersion() {
  const savedVersion = localStorage.getItem('semana_sistemas_version');

  if (savedVersion !== PROJECT_VERSION) {
    const hadSession = Object.keys(localStorage).some((k) => k.startsWith('sb-') || k.includes('supabase'));
    if (savedVersion || hadSession) {
      try {
        await supabaseClient.auth.signOut();
      } catch {
        // Ignored if the connection fails
      }
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      }
    }
    localStorage.setItem('semana_sistemas_version', PROJECT_VERSION);
  }
}

// On page load, first make sure the version matches; then start the session
syncSessionVersion().finally(() => {
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    updateSessionUi(session?.user ?? null);
    if (window.location.hash.includes('access_token=') || window.location.search.includes('code=')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  });

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    updateSessionUi(session?.user ?? null);
  });
});
