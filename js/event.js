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

  document.title = `${activity.title} · Semana de Sistemas`;

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
    descriptionSection(),
    videoSection(activity.video),
    rulesSection(activity.rules),
    speakerSection(findSpeaker(activity.speaker)),
    groupSection(findGroup(activity.organizer)),
    overlapsSection(findOverlapping(activity)),
  ].join('');
  $('#event-info').style.setProperty('--color', activity.color || ACTIVITY_TYPES[activity.type].color);

  fitWideImage();
}

// Notice if the activity or its speaker is unconfirmed (unconfirmed field in data.js)
function noticeSection() {
  if (!activity.unconfirmed && !findSpeaker(activity.speaker)?.unconfirmed) return '';

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
function descriptionSection() {
  const description = activity.description || activity.summary || 'Pronto publicaremos más detalles de esta actividad.';
  const text = `
    <div class="event__description">
      ${description.split('\n').map((paragraph) => `<p>${paragraph}</p>`).join('')}
    </div>
    ${activity.stats ? statBoxes(activity.stats) : ''}
  `;

  if (!activity.image) return text;

  return `
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

function speakerSection(speaker) {
  if (!speaker) return '';

  const bio = speaker.bio
    ? speaker.bio.split('\n').map((paragraph) => `<p class="event__bio">${paragraph}</p>`).join('')
    : '';

  return `
    <h2 class="event__subtitle">Ponente</h2>
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

// A wide image (like Just Dance's) gets more room than a square one.
// Its size is only known once it finishes loading.
function fitWideImage() {
  const image = $('.event__image');
  if (!image) return;

  const measure = () => image.parentElement.classList.toggle(
    'event__intro--wide', image.naturalWidth > image.naturalHeight * 1.2);

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
