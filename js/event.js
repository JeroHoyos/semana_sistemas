/* =============================================
   ACTIVITY PAGE
   Reads the id from the address (evento.html?id=maraton) and builds the page from its data.
   ============================================= */

const activity = findActivity(new URLSearchParams(location.search).get('id'));

// 'Miércoles, 18 nov' (or just 'Miércoles' if the day has no date)
function dayText(day) {
  if (!day) return 'Por definir';
  return `${day.name}${day.date ? `, ${day.date}` : ''}`;
}


/* ---------- Header ---------- */

function renderHero() {
  const type = ACTIVITY_TYPES[activity.type];

  document.title = `${activity.title} | Semana de Sistemas`;

  // Pixel art drawings above the type, if the activity has any (see pixel-art.js)
  const decorations = activity.decorations
    ? `<div class="event-hero__decorations">${activity.decorations.map((name) => drawPixelArt(PIXEL_ART[name])).join('')}</div>`
    : '';

  $('#event-hero').innerHTML = `
    ${decorations}
    <span class="event-hero__type" style="--color: ${type.color}; --bg: ${type.bg}">${ICONS[type.icon]}${type.singular}</span>
    <h1 class="event-hero__title">${activity.title}</h1>
  `;
}


/* ---------- Information ---------- */

// The card is built from sections, in this order. Each section returns its HTML,
// or '' if the activity lacks that data, so only the relevant ones show.
function renderInfo() {
  $('#event-info').innerHTML = [
    noticeSection(),
    factsSection(),
    registrationSection(),
    preRegisterSection(),
    descriptionSection(),
    standsSection(),
    activity.team || activity.individual ? '<div id="participants"></div>' : '',   // filled by js/brackets.js
    activity.bracket ? '<div id="bracket"></div>' : '',   // filled by js/brackets.js
    videoSection(activity.video),
    rulesSection(activity.rules),
    speakerSection(findSpeakers(activity)),
    groupSection(findGroup(activity.organizer)),
    overlapsSection(findOverlapping(activity)),
  ].join('');
  $('#event-info').style.setProperty('--color', activity.color || ACTIVITY_TYPES[activity.type].color);

  fitImage();
}

// Notice if the activity or one of its speakers is unconfirmed (unconfirmed field in data.js)
function noticeSection() {
  if (!activity.unconfirmed && !findSpeakers(activity).some((speaker) => speaker.unconfirmed)) return '';

  return `<p class="event__notice">${ICONS.clock}Información por confirmar: puede cambiar antes del evento.</p>`;
}

// Day, time and place
function factsSection() {
  const timeText = (activity.start && activity.end) ? `${activity.start} – ${activity.end}` : 'Por definir';
  const facts = [
    { icon: ICONS.calendar, name: 'Día', value: dayText(findDay(activity.day)) },
    { icon: ICONS.clock, name: 'Hora', value: timeText },
    { icon: ICONS.pin, name: 'Lugar', value: activity.place || 'Facultad de Minas (salón por confirmar)' },
  ];

  return `
    <dl class="event__facts">
      ${facts.map((fact) => `
        <div>
          <dt>${fact.icon}${fact.name}</dt>
          <dd>${fact.value}</dd>
        </div>
      `).join('')}
    </dl>
  `;
}

// The activity's text (each \n is a paragraph), with its stats below if it has any.
// If there is an image, it goes next to the text (on phones, above it).
// After a pre-registration it gets its own title, so the two read as separate sections.
function descriptionSection() {
  const description = activity.description || activity.summary || 'Pronto publicaremos más detalles de esta actividad.';
  const title = activity.preRegister ? '<h2 class="event__subtitle">Información</h2>' : '';
  const text = `
    <div class="event__description">
      ${description.split('\n').map((paragraph) => `<p>${paragraph}</p>`).join('')}
    </div>
    ${activity.stats ? statBoxes(activity.stats) : ''}
  `;

  if (!activity.image) return title + text;

  return `
    ${title}
    <div class="event__intro">
      <img class="event__image" src="${activity.image}" alt="Imagen de ${activity.title}">
      <div>${text}</div>
    </div>
  `;
}

// Boxes with a big value and its label below, for example "16 / jugadores" (stats field)
function statBoxes(stats) {
  return `
    <ul class="event__stats">
      ${stats.map((stat) => `<li><strong>${stat.value}</strong>${stat.label}</li>`).join('')}
    </ul>
  `;
}

// Team or individual registration call to action. The button goes before its note and right after
// the facts: nothing of variable height above it, so it sits in the same place on every competition.
function registrationSection() {
  if (activity.team) {
    return `
      <div class="event__signup">
        <a class="hero__button auth-form__submit" href="inscripciones.html?id=${activity.id}">Inscribir equipo ${ICONS.arrow}</a>
        <p class="event__bio">
          Equipos de hasta ${activity.team.size} personas${activity.team.maxTeams ? `, con cupo para ${activity.team.maxTeams} equipos` : ''}.
          Quien crea el equipo queda de capitán e inscribe a los demás con el correo de su carnet.
        </p>
      </div>
    `;
  }
  if (activity.individual) {
    return `
      <div class="event__signup">
        <a class="hero__button auth-form__submit" href="inscripciones.html?id=${activity.id}">Inscribirme ${ICONS.arrow}</a>
        <p class="event__bio">
          Inscripción individual con cupo para ${activity.individual.max} participantes.
          Solo necesitas tener tu carnet e ingresar tu número de celular.
        </p>
      </div>
    `;
  }
  return '';
}

// Pre-registration (inscripción) for conferences with limited spots.
// The interactive part (session, capacity, sign-up, supervisor tools) lives in js/pre-register.js,
// which fills #pre-register once the page knows who is logged in. Here we only place the container
// and the fixed marketing copy that explains the reward.
function preRegisterSection() {
  if (!activity.preRegister) return '';

  const { max, modalidad } = activity.preRegister;

  return `
    <section class="pre-register" id="pre-register"
      data-actividad="${activity.id}" data-modalidad="${modalidad}" data-max="${max}">
      <h2 class="event__subtitle">Inscripción</h2>

      <div class="pre-register__card">
        <img class="pre-register__plush" src="img/nacho-plush.webp" width="440" height="435" alt="">
        <h3 class="pre-register__title">Asegura tu cupo</h3>
        <p class="pre-register__prize">Quienes más puntos acumulen en el Sustómetro se llevan a <strong>Nacho</strong>.</p>
        <ul class="prereg-points">
          <li class="prereg-point prereg-point--top"><strong>+10</strong> Te inscribes y asistes</li>
          <li class="prereg-point"><strong>+8</strong> Asistes sin inscribirte</li>
          <li class="prereg-point prereg-point--zero"><strong>+0</strong> Te inscribes y no asistes</li>
        </ul>

        <div class="pre-register__body" id="pre-register-body">
          <p class="registration__text">Cargando inscripción…</p>
        </div>
        <p class="auth-message" id="pre-register-message" hidden></p>
      </div>

      <!-- Supervisor tools: list of pre-registered people and attendance -->
      <div class="pre-register__admin" id="pre-register-admin" hidden></div>
    </section>
  `;
}

// YouTube video (video field). youtube-nocookie leaves no cookies until someone presses play.
// enablejsapi lets the page know when it plays and when it ends (js/secrets.js).
function videoSection(video) {
  if (!video) return '';

  return `
    <h2 class="event__subtitle">Para entrar en calor</h2>
    <iframe class="event__video" src="https://www.youtube-nocookie.com/embed/${video.id}?enablejsapi=1"
      title="${video.title}" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"></iframe>
  `;
}

function rulesSection(rules) {
  if (!rules) return '';

  return `
    <h2 class="event__subtitle">Formato y reglas</h2>
    <dl class="event__rules">
      ${rules.map((rule) => `
        <div>
          <dt>${rule.title}</dt>
          <dd>${rule.text}</dd>
        </div>
      `).join('')}
    </dl>
  `;
}

function speakerSection(speakers) {
  if (speakers.length === 0) return '';

  return `
    <h2 class="event__subtitle">${speakers.length > 1 ? 'Ponentes' : 'Ponente'}</h2>
    ${speakers.map(speakerProfile).join('')}
  `;
}

function speakerProfile(speaker) {
  const bio = speaker.bio
    ? speaker.bio.split('\n').map((paragraph) => `<p class="event__bio">${paragraph}</p>`).join('')
    : '';

  return `
    <div class="event__profile">
      <span class="event__avatar ${speaker.photo ? 'event__avatar--photo' : ''}">${speakerPortrait(speaker)}</span>
      <div>
        <strong>${speaker.name || 'Por anunciar'}</strong>
        <span>${speaker.role}</span>
        ${bio}
        ${moreLink(speaker.link, speaker.name)}
      </div>
    </div>
  `;
}

function groupSection(group) {
  if (!group) return '';

  return `
    <h2 class="event__subtitle">Organiza</h2>
    <div class="event__profile">
      ${group.logo ? `<span class="event__avatar"><img src="${group.logo}" alt="Logo de ${group.name}"></span>` : ''}
      <div>
        <strong>${group.name}</strong>
        <span>${group.type}</span>
        ${group.description ? `<p class="event__bio">${group.description}</p>` : ''}
        ${moreLink(group.link, group.name)}
      </div>
    </div>
  `;
}

// Stands fair (stands field): every group and company with a stand text gets its stand drawn
// in its color, with its logo on the counter. Aperture's goes first and big, with its mascot.
function standsSection() {
  if (!activity.stands) return '';

  const aperture = GROUPS.filter((group) => group.id === 'aperture' && group.stand);
  const groups = GROUPS.filter((group) => group.id !== 'aperture' && group.stand);
  const list = (items) => `<ul class="stands">${items.map(standCard).join('')}</ul>`;

  return `
    <h2 class="event__subtitle">Grupos estudiantiles</h2>
    ${list([...aperture, ...groups])}
    <h2 class="event__subtitle">Empresas aliadas</h2>
    ${list(COMPANIES.filter((company) => company.stand))}
  `;
}

function standCard(group) {
  const featured = group.id === 'aperture';
  const booth = { ...PIXEL_ART.stand, palette: { ...PIXEL_ART.stand.palette, c: group.color } };

  return `
    <li class="stand ${featured ? 'stand--featured' : ''}" style="--color: ${group.color}">
      <div class="stand__booth">
        ${drawPixelArt(booth)}
        ${group.logo ? `<img class="stand__logo" src="${group.logo}" alt="Logo de ${group.name}">` : ''}
        ${featured ? apertureMascot() : ''}
      </div>
      <div class="stand__text">
        <strong>${group.name}</strong>
        <span>${group.type}</span>
        <p class="event__bio">${group.stand}</p>
        ${moreLink(group.link, group.name)}
      </div>
    </li>
  `;
}

// Aperture's mascot peeks over its counter: it hops, blinks, looks around and waves,
// between two balloons, with hearts rising and sparkles. x and y are in stand drawing pixels.
function apertureMascot() {
  const piece = (name, x, y, kind, delay = '0s') =>
    `<span class="stand__piece stand__${kind}" style="--x: ${x}; --y: ${y}; --delay: ${delay}">${drawPixelArt(PIXEL_ART[name])}</span>`;

  return `
    ${piece('balloonCyan', -8, -7, 'balloon')}
    ${piece('balloonPink', 31, -3, 'balloon', '-.8s')}
    <span class="stand__piece stand__window" style="--x: 5; --y: 5">
      <span class="stand__piece stand__mascot" style="--x: 3; --y: 1">
        ${drawPixelArt(PIXEL_ART.mascot)}
        ${piece('mascotIris', 6, 5, 'iris')}
        ${piece('mascotBlink', 0, 0, 'blink')}
      </span>
    </span>
    ${piece('mascotPaw', 7, 15, 'paw')}
    ${piece('mascotPaw', 24, 10, 'wave')}
    ${piece('heart', 2, -2, 'heart')}
    ${piece('heart', 9, -2, 'heart', '-1s')}
    ${piece('heart', 16, -2, 'heart', '-2s')}
    ${piece('sparkle', -7, 14, 'sparkle')}
    ${piece('sparkle', 34, 14, 'sparkle', '-.5s')}
    ${piece('sparkle', 33, 25, 'sparkle', '-1s')}
    <span class="stand__piece stand__bubble" style="--x: 23; --y: -9" aria-hidden="true">¡Hola!</span>
  `;
}

// "Saber más →" below a speaker or group; opens their LinkedIn, social network or page in another tab
function moreLink(link, name) {
  if (!link) return '';

  return `
    <a class="event__more" href="${link}" target="_blank" rel="noopener" aria-label="Saber más sobre ${name}">
      Saber más ${ICONS.arrow}
    </a>
  `;
}

// The other activities at the same time, with a link to each one
function overlapsSection(overlapping) {
  if (overlapping.length === 0) return '';

  return `
    <h2 class="event__subtitle">A la misma hora</h2>
    <ul class="event__overlaps">
      ${overlapping.map((other) => `
        <li>
          <a href="${activityLink(other.id)}" style="--color: ${ACTIVITY_TYPES[other.type].color}">
            <strong>${other.title}</strong>
            <span>${other.start} – ${other.end}</span>
            ${ICONS.arrow}
          </a>
        </li>
      `).join('')}
    </ul>
  `;
}

// A wide image (like Just Dance's) takes half the card; a square or tall one (a flyer) gets the bigger flyer column.
// Its size is only known once it finishes loading.
function fitImage() {
  const image = $('.event__image');
  if (!image) return;

  const measure = () => {
    const { classList } = image.parentElement;
    classList.toggle('event__intro--wide', image.naturalWidth > image.naturalHeight * 1.2);
    classList.toggle('event__intro--tall', image.naturalHeight >= image.naturalWidth * 0.95);
  };

  if (image.complete) measure();
  else image.addEventListener('load', measure);
}


/* ---------- Activity that does not exist ---------- */

// If the id in the address matches no activity
function renderNotFound() {
  $('#event-hero').innerHTML = `<h1 class="event-hero__title">Actividad no encontrada</h1>`;
  $('#event-info').innerHTML = `
    <p class="schedule__empty">${ICONS.eye} Ningún monstruo por aquí. Vuelve al horario y elige otra actividad.</p>
  `;
}


/* ---------- Startup ---------- */

if (activity) {
  renderHero();
  renderInfo();
} else {
  renderNotFound();
}
$('#footer-crest').innerHTML = drawCrest();
