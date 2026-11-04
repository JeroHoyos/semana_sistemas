/* =============================================
   PAGE LOGIC
   Takes the data from data.js and builds each section.
   ============================================= */

// '09:30' → 9.5
function toHours(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + minutes / 60;
}

// Removes accents and capitals so "futbol" finds "Fútbol"
const normalize = (text) => stripAccents(text).toLowerCase();


/* ---------- Hero ---------- */

function renderHero() {
  $('#hero-days').innerHTML = DAYS
    .map((day) => `<li>${day.short}${day.date ? `<small>${day.date}</small>` : ''}</li>`)
    .join('');
}


/* ---------- Speakers ---------- */

function renderSpeakers() {
  $('#speakers-thumbnails').innerHTML = SPEAKERS.map((speaker, index) => `
    <button class="thumbnail" data-index="${index}">
      <span class="thumbnail__photo">${speakerPortrait(speaker)}</span>
      <span class="thumbnail__name">${speaker.name || 'Por anunciar'}</span>
    </button>
  `).join('');

  $('#speakers-thumbnails').addEventListener('click', (event) => {
    const button = event.target.closest('.thumbnail');
    if (button) showIdCard(Number(button.dataset.index));
  });

  // Rotation pauses while the mouse or keyboard focus is on the speakers.
  // On leaving it counts from zero again, so the chosen ID card shows for its full time.
  const section = $('#ponentes');
  section.addEventListener('mouseenter', pauseIdCards);
  section.addEventListener('mouseleave', rotateIdCards);
  section.addEventListener('focusin', pauseIdCards);
  section.addEventListener('focusout', rotateIdCards);

  showIdCard(0);
  rotateIdCards();
}

// Every SECONDS_PER_IDCARD it moves on to the next speaker (no rotation if the person asked for less motion)
const SECONDS_PER_IDCARD = 7;
let currentIdCard = 0;
let idCardTimer;

function rotateIdCards() {
  pauseIdCards();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  idCardTimer = setInterval(() => {
    showIdCard((currentIdCard + 1) % SPEAKERS.length);
  }, SECONDS_PER_IDCARD * 1000);
}

function pauseIdCards() {
  clearInterval(idCardTimer);
}

function showIdCard(index) {
  const speaker = SPEAKERS[index];
  currentIdCard = index;

  $$('.thumbnail').forEach((button, i) => button.setAttribute('aria-pressed', i === index));

  // If the speaker has an activity, the ID card links to that activity's page
  const activity = ACTIVITIES.find((a) => a.speaker === speaker.id);
  if (!activity) {
    swapIdCard(speakerIdCard(speaker));
    return;
  }

  const type = ACTIVITY_TYPES[activity.type].singular.toLowerCase();
  swapIdCard(`
    <a class="idcard-link" href="${activityLink(activity.id)}" aria-label="Ver ${type}: ${activity.title}">
      ${speakerIdCard(speaker)}
      <span class="idcard-link__text">Ver su ${type} ${ICONS.arrow}</span>
    </a>
  `);
}

// College-style ID card. A speaker not announced yet shows "Clasificado",
// and an unconfirmed one, "Por confirmar".
// --letters adjusts the name's size so it fits on the card.
function speakerIdCard(speaker) {
  const isMystery = !speaker.name;
  const name = speaker.name || '· · ·';
  let stamp = '';
  if (isMystery) stamp = '<span class="idcard__stamp">Clasificado</span>';
  else if (speaker.unconfirmed) stamp = '<span class="idcard__stamp idcard__stamp--pending">Por confirmar</span>';

  return `
    <article class="idcard ${isMystery ? 'idcard--mystery' : ''}">
      <div class="idcard__crest">${drawCrest()}</div>
      <div class="idcard__brand">
        <span class="idcard__week">Semana</span>
        <span class="idcard__systems">— de sistemas —</span>
      </div>
      <div class="idcard__name" style="--letters: ${name.length}">${name}</div>
      <div class="idcard__role">${speaker.role}</div>
      <div class="idcard__band">${speaker.credential}</div>
      <div class="idcard__photo">
        ${speakerPortrait(speaker)}
        ${stamp}
      </div>
    </article>
  `;
}

// The current ID card slides out slowly to the left and the new one comes in from the right.
// idCardTurn keeps an old change from overwriting a newer one on quick clicks.
let idCardTurn = 0;

function swapIdCard(html) {
  const container = $('#speakers-idcard');
  const previous = container.firstElementChild;
  const turn = ++idCardTurn;

  if (!previous || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    container.innerHTML = html;
    return;
  }

  previous.getAnimations().forEach((animation) => animation.cancel());
  previous.animate(
    [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-40px)' }],
    { duration: 600, easing: 'ease-in', fill: 'forwards' },
  );
  setTimeout(() => {
    if (turn !== idCardTurn) return;
    container.innerHTML = html;
    container.firstElementChild.animate(
      [{ opacity: 0, transform: 'translateX(40px)' }, { opacity: 1, transform: 'none' }],
      { duration: 900, easing: 'ease-out' },
    );
  }, 600);
}


/* ---------- Schedule ---------- */

// The schedule is kept in sessionStorage (lasts while the tab is open) so that, on opening an
// activity and coming back, it stays as it was: same day, tab, search or week view.
const SCHEDULE_KEY = 'schedule';

function readSavedSchedule() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SCHEDULE_KEY)) || {};
    // If the data changed and that day or tab no longer exists, the defaults are used
    if (!findDay(saved.day)) delete saved.day;
    if (saved.type !== 'all' && !ACTIVITY_TYPES[saved.type]) delete saved.type;
    return saved;
  } catch {
    return {};   // the browser blocks sessionStorage: the schedule starts as usual
  }
}

function saveSchedule() {
  try {
    sessionStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
  } catch {
    // without sessionStorage the schedule works the same, it just is not remembered
  }
}

// What the person has chosen in the schedule
const schedule = {
  day: DAYS[0].id,   // selected day
  type: 'all',       // tab: 'all' or a key of ACTIVITY_TYPES
  search: '',        // search box text
  weekView: false,   // true = grid with the whole week
  ...readSavedSchedule(),
};

// Creates the schedule buttons and wires their events (called only once)
function prepareSchedule() {
  $('#schedule-days').innerHTML = DAYS.map((day, i) => `
    <button class="day" data-day="${day.id}">
      <strong>${day.short}</strong>
      <span>${day.date || `Día ${i + 1}`}</span>
    </button>
  `).join('');

  const tabs = [{ id: 'all', name: 'Todo', color: '#0a2c52' }];
  for (const [id, type] of Object.entries(ACTIVITY_TYPES)) {
    tabs.push({ id, name: type.plural, color: type.color, icon: type.icon });
  }
  // "Todo" has a dot; each type, its icon in its color
  $('#schedule-tabs').innerHTML = tabs.map((tab) => `
    <button class="tab" data-type="${tab.id}" style="--color: ${tab.color}">
      ${tab.icon ? ICONS[tab.icon] : ''}${tab.name} <span class="tab__count"></span>
    </button>
  `).join('');

  $('#schedule-days').addEventListener('click', (event) => {
    const button = event.target.closest('.day');
    if (!button) return;
    schedule.day = button.dataset.day;
    schedule.weekView = false;
    renderSchedule();
  });

  $('#schedule-tabs').addEventListener('click', (event) => {
    const button = event.target.closest('.tab');
    if (!button) return;
    schedule.type = button.dataset.type;
    renderSchedule();
  });

  $('#search-input').value = schedule.search;   // the saved search, if there was one
  $('#search-input').addEventListener('input', (event) => {
    schedule.search = event.target.value.trim();
    renderSchedule();
  });

  $('#week-toggle').addEventListener('click', () => {
    schedule.weekView = !schedule.weekView;
    renderSchedule();
  });
}

// Redraws the schedule from the current state (and saves it for coming back)
function renderSchedule() {
  saveSchedule();

  // Step 1: filter by day and search. Searching or the week view use all three days.
  const useAllDays = schedule.search || schedule.weekView;
  const filtered = ACTIVITIES.filter((activity) =>
    (useAllDays || activity.day === schedule.day) && matchesSearch(activity));

  // Step 2: filter by the chosen tab
  const visible = filtered.filter((activity) => schedule.type === 'all' || activity.type === schedule.type);

  updateButtons(filtered);
  updateTitle(visible.length);

  $('#schedule-list').hidden = schedule.weekView;
  $('#schedule-week').hidden = !schedule.weekView;

  if (schedule.weekView) {
    renderWeek(visible);
  } else {
    renderList(visible);
  }
}

function matchesSearch(activity) {
  if (!schedule.search) return true;

  const speaker = findSpeaker(activity.speaker);
  const text = [
    activity.title,
    ACTIVITY_TYPES[activity.type].plural,
    findDay(activity.day).name,
    speaker?.name,
    speaker?.role,
    findGroup(activity.organizer)?.name,
    activity.place,
  ].filter(Boolean).join(' ');

  return normalize(text).includes(normalize(schedule.search));
}

// Marks the active day, tab and "Semana" button, and counts the activities on each tab
function updateButtons(filtered) {
  // Scoped: the login dialog's tabs also use .day
  $$('#schedule-days .day').forEach((button) => {
    const active = !schedule.search && !schedule.weekView && button.dataset.day === schedule.day;
    button.setAttribute('aria-pressed', active);
  });

  $$('.tab').forEach((button) => {
    const type = button.dataset.type;
    const count = filtered.filter((activity) => type === 'all' || activity.type === type).length;
    button.querySelector('.tab__count').textContent = `(${count})`;
    button.setAttribute('aria-pressed', type === schedule.type);
    button.classList.toggle('tab--empty', count === 0);
  });

  $('#week-toggle').setAttribute('aria-pressed', schedule.weekView);
}

function updateTitle(count) {
  const activities = `${count} ${count === 1 ? 'actividad' : 'actividades'}`;
  const scheduled = `${activities} ${count === 1 ? 'programada' : 'programadas'}`;
  let title;
  let subtitle;

  if (schedule.search) {
    title = `Resultados para “${schedule.search}”`;
    subtitle = `${activities} en toda la semana`;
  } else if (schedule.weekView) {
    title = 'Toda la semana';
    subtitle = scheduled;
  } else {
    const day = findDay(schedule.day);
    const number = DAYS.indexOf(day) + 1;
    title = `Día ${number} — ${day.name}${day.date ? `, ${day.date}` : ''}`;
    subtitle = scheduled;
  }

  $('#schedule-title').textContent = title;
  $('#schedule-subtitle').textContent = subtitle;
}


/* ---------- Schedule: list view ---------- */

function renderList(activities) {
  if (activities.length === 0) {
    $('#schedule-list').innerHTML = `
      <li class="schedule__empty">${ICONS.eye} Ningún monstruo por aquí. Prueba otra búsqueda o pestaña.</li>
    `;
    return;
  }

  $('#schedule-list').innerHTML = activities.map(activityCard).join('');
}

function activityCard(activity) {
  const type = ACTIVITY_TYPES[activity.type];
  const speaker = findSpeaker(activity.speaker);
  const group = findGroup(activity.organizer);
  const overlapping = findOverlapping(activity);

  // Searching mixes all three days, so each activity shows its day
  const day = schedule.search ? `${findDay(activity.day).name} · ` : '';

  const details = [];
  if (speaker) {
    details.push(`<span><span class="avatar">${speakerPortrait(speaker)}</span>${speaker.name || 'Por anunciar'}</span>`);
  }
  if (group) {
    details.push(`<span>${groupLogo(group)}Organiza ${group.name}</span>`);
  }
  if (activity.place) {
    details.push(`<span>${ICONS.pin}${activity.place}</span>`);
  }
  if (overlapping.length > 0) {
    const names = overlapping.map((other) => other.title).join(' y ');
    details.push(`<span class="activity__overlap">${ICONS.overlap}A la vez que ${names}</span>`);
  }

  // The card uses its type's color (not each competition's own) so the type is recognized.
  // The title link covers the whole card (see .activity__title a::after in the CSS)
  return `
    <li class="activity" style="--color: ${type.color}; --bg: ${type.bg}">
      <span class="activity__type">${ICONS[type.icon]}${type.singular}</span>
      <h4 class="activity__title"><a href="${activityLink(activity.id)}">${activity.title}</a></h4>
      <p class="activity__time">${day}${activity.start} – ${activity.end}</p>
      <div class="activity__details">${details.join('')}</div>
      <span class="activity__more">Ver detalles ${ICONS.arrow}</span>
    </li>
  `;
}


/* ---------- Schedule: week view ---------- */

function renderWeek(visible) {
  const visibleIds = visible.map((activity) => activity.id);
  const firstHour = Math.floor(Math.min(...ACTIVITIES.map((a) => toHours(a.start))));
  const lastHour = Math.ceil(Math.max(...ACTIVITIES.map((a) => toHours(a.end))));

  let hours = '';
  for (let hour = firstHour; hour < lastHour; hour++) {
    hours += `<span>${hour}:00</span>`;
  }

  // One column per day, with its activities spread into lanes
  const columns = DAYS.map((day) => {
    const ofTheDay = ACTIVITIES.filter((activity) => activity.day === day.id);
    const blocks = assignLanes(ofTheDay)
      .map((activity) => activityBlock(activity, firstHour, visibleIds.includes(activity.id)))
      .join('');
    return `<div class="week-grid__column">${blocks}</div>`;
  }).join('');

  $('#schedule-week').innerHTML = `
    <div class="week-grid__grid">
      <div class="week-grid__header"></div>
      ${DAYS.map((day) => `<div class="week-grid__header">${day.name}</div>`).join('')}
      <div class="week-grid__hours">${hours}</div>
      ${columns}
    </div>
  `;
}

// An activity's block on the grid. Those that do not pass the filters look dimmed.
// The --from, --span, --lane and --lanes variables place the block (see .block in the CSS).
function activityBlock(activity, firstHour, isVisible) {
  const type = ACTIVITY_TYPES[activity.type];
  const dimmed = isVisible ? '' : 'block--dimmed';
  const narrow = activity.lanes > 1 ? 'block--narrow' : '';   // shares the time with another one
  const position = `
    --from: ${toHours(activity.start) - firstHour};
    --span: ${toHours(activity.end) - toHours(activity.start)};
    --lane: ${activity.lane};
    --lanes: ${activity.lanes};`;

  return `
    <a class="block ${dimmed} ${narrow}" href="${activityLink(activity.id)}" title="${activity.title}"
      style="--color: ${type.color}; --bg: ${type.bg}; ${position}">
      <strong>${activity.title}</strong>
      <span class="block__place">${ICONS.pin}${activity.place || 'Por confirmar'}</span>
      <span>${activity.start} – ${activity.end}</span>
    </a>
  `;
}

// Activities that overlap go side by side in "lanes" so they do not cover each other.
// Only those that overlap are split: the day is cut into groups of activities chained by
// their times, and each group has its own lanes. An activity alone takes the full width.
function assignLanes(activities) {
  const result = [];
  let group = [];
  let laneFreeAt = [];   // time at which each lane of the group becomes free
  let groupEnd = '';     // time at which the group's last activity ends

  // When a group closes its lane count is known: all its activities split the same way
  const closeGroup = () => {
    group.forEach((activity) => result.push({ ...activity, lanes: laneFreeAt.length }));
    group = [];
    laneFreeAt = [];
  };

  const sorted = [...activities].sort((a, b) => a.start.localeCompare(b.start));
  for (const activity of sorted) {
    if (activity.start >= groupEnd) closeGroup();   // overlaps nothing in the group: another one starts

    let lane = laneFreeAt.findIndex((time) => time <= activity.start);
    if (lane === -1) lane = laneFreeAt.length;   // none free: open another
    laneFreeAt[lane] = activity.end;
    group.push({ ...activity, lane });
    if (activity.end > groupEnd) groupEnd = activity.end;
  }
  closeGroup();

  return result;
}


/* ---------- Competitions ---------- */

function renderCompetitions() {
  const competitions = ACTIVITIES.filter((activity) => activity.type === 'competition');

  $('#competitions-list').innerHTML = competitions.map((activity) => {
    const day = findDay(activity.day);
    const group = findGroup(activity.organizer);
    return `
      <a class="competition" href="${activityLink(activity.id)}" style="--color: ${activity.color}">
        <span class="competition__image">
          <span class="competition__day">${day.short}</span>
          ${ICONS[activity.icon]}
        </span>
        <span class="competition__title">${ICONS.eye}${activity.title}</span>
        <span class="competition__time">${day.name} · ${activity.start} – ${activity.end}</span>
        <span class="competition__summary">${activity.summary}</span>
        ${group ? `<span class="competition__organizer">${groupLogo(group)}Organiza ${group.name}</span>` : ''}
      </a>
    `;
  }).join('');
}


/* ---------- Student groups ---------- */

// --letters adjusts the name's size so it fits on the pennant.
// A group with a logo gets it as a round patch on the pole.
// A group with a link makes the pennant a link that opens its page in another tab.
function renderGroups() {
  $('#groups-list').innerHTML = GROUPS.map((group) => {
    const tag = group.link ? 'a' : 'span';
    const target = group.link ? `href="${group.link}" target="_blank" rel="noopener"` : '';
    return `
      <li class="group" style="--color: ${group.color}; --letters: ${group.name.length}">
        <${tag} class="pennant ${group.logo ? 'pennant--with-logo' : ''}" ${target}>
          <span class="pennant__cloth"><span class="pennant__name">${group.name}</span></span>
          ${group.logo ? `<img class="pennant__logo" src="${group.logo}" alt="Logo de ${group.name}">` : ''}
        </${tag}>
        <span class="group__type">${group.type}</span>
      </li>
    `;
  }).join('');
}


/* ---------- Gallery ---------- */

const isVideo = (item) => item.file.endsWith('.mp4');

// Two rows that scroll by themselves in opposite directions; the second starts halfway through the list.
// Each row carries its photos twice in a row: the animation reaches the middle and restarts
// with no visible jump (see .gallery__track in the CSS). The copies and the second row are hidden
// from screen readers and the keyboard, so each photo is announced only once.
function renderGallery() {
  const indexes = GALLERY.map((_, i) => i);
  const middle = Math.ceil(GALLERY.length / 2);
  const rows = [indexes, [...indexes.slice(middle), ...indexes.slice(0, middle)]];

  const photos = (order, hidden) => order.map((i) => galleryPhoto(i, hidden)).join('');

  $('#gallery-carousel').innerHTML = rows.map((order, r) => `
    <div class="gallery__row">
      <div class="gallery__track">
        <ul class="gallery__group" ${r > 0 ? 'aria-hidden="true"' : ''}>${photos(order, r > 0)}</ul>
        <ul class="gallery__group" aria-hidden="true">${photos(order, true)}</ul>
      </div>
    </div>
  `).join('');

  $('#gallery-grid').innerHTML = photos(indexes, false);

  $('#galeria').addEventListener('click', (event) => {
    const photo = event.target.closest('.gallery__photo');
    if (photo) openViewer(Number(photo.dataset.index));
  });

  $('#gallery-toggle').addEventListener('click', () => {
    const showAll = $('#gallery-grid').hidden;
    $('#gallery-grid').hidden = !showAll;
    $('#gallery-carousel').hidden = showAll;
    $('#gallery-toggle').setAttribute('aria-pressed', showAll);
    $('#gallery-toggle-text').textContent = showAll ? 'Ver carrusel' : 'Ver todo';
  });

  watchVideos();
}

function galleryPhoto(index, hidden) {
  const item = GALLERY[index];
  const media = isVideo(item)
    ? `<video src="${item.file}" poster="${item.poster || ''}" muted loop playsinline preload="metadata"
        disablepictureinpicture disableremoteplayback></video>`
    : `<img src="${item.file}" alt="" loading="lazy">`;
  return `
    <li>
      <button class="gallery__photo" data-index="${index}" aria-label="Ampliar: ${item.text}" ${hidden ? 'tabindex="-1"' : ''}>
        ${media}
      </button>
    </li>
  `;
}

// Gallery videos only play while on screen
// (and never by themselves if the person asked for less motion: they play when enlarged).
function watchVideos() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target: video, isIntersecting }) => {
      if (isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
  });
  $$('.gallery video').forEach((video) => observer.observe(video));
}


/* ---------- Gallery: viewer ---------- */

let viewerPhoto = 0;

function openViewer(index) {
  viewerPhoto = (index + GALLERY.length) % GALLERY.length;   // from the last it goes to the first and back
  const item = GALLERY[viewerPhoto];

  $('#viewer-media').innerHTML = isVideo(item)
    ? `<video src="${item.file}" poster="${item.poster || ''}" controls autoplay muted loop playsinline
        disablepictureinpicture disableremoteplayback aria-label="${item.text}"></video>`
    : `<img src="${item.file}" alt="${item.text}">`;
  $('#viewer-count').textContent = `${viewerPhoto + 1} / ${GALLERY.length}`;

  if (!$('#viewer').open) $('#viewer').showModal();
}

$('#viewer-prev').addEventListener('click', () => openViewer(viewerPhoto - 1));
$('#viewer-next').addEventListener('click', () => openViewer(viewerPhoto + 1));
$('#viewer-close').addEventListener('click', () => $('#viewer').close());

// The viewer takes the whole screen: a click that missed the photo and the buttons closes it
$('#viewer').addEventListener('click', (event) => {
  if (event.target === $('#viewer')) $('#viewer').close();
});

// Keyboard arrows move on (except on the video bar, where they seek)
$('#viewer').addEventListener('keydown', (event) => {
  if (event.target.tagName === 'VIDEO') return;
  if (event.key === 'ArrowLeft') openViewer(viewerPhoto - 1);
  if (event.key === 'ArrowRight') openViewer(viewerPhoto + 1);
});

// On closing the media is removed so a video does not keep playing
$('#viewer').addEventListener('close', () => {
  $('#viewer-media').innerHTML = '';
});


/* ---------- Startup ---------- */

renderHero();
renderSpeakers();
prepareSchedule();
renderSchedule();
renderCompetitions();
renderGroups();
renderGallery();
$('#footer-crest').innerHTML = drawCrest();
