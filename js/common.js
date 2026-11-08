/* =============================================
   SHARED FUNCTIONS
   Used by the main page (main.js), each activity page (event.js) and the Scare Meter.
   ============================================= */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const findDay = (id) => DAYS.find((day) => day.id === id);
const findSpeaker = (id) => SPEAKERS.find((speaker) => speaker.id === id);
const findActivity = (id) => ACTIVITIES.find((activity) => activity.id === id);
const findGroup = (id) => GROUPS.find((group) => group.id === id);
const findTitle = (id) => TITLES.find((title) => title.id === id);

// How a title reads according to the monster's style (Asustador / Asustadora, Rey / Reina…)
function titleText(title, style) {
  return style === 'femenino' && title.feminine ? title.feminine : title.name;
}

// Names and emails are typed by each person: anything that goes into innerHTML passes through here
function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Removes accents, so "futbol" finds "Fútbol"
const stripAccents = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '');

// The date in Colombia as 'YYYY-MM-DD', wherever the person's device thinks it is
const colombiaDay = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(date);

// Whether the given or logged-in user is a supervisor (by app_metadata set in Supabase or verified admin account)
function isCurrentSupervisor(user = (typeof currentUser !== 'undefined' ? currentUser : null)) {
  if (!user) return false;
  if (user.app_metadata && user.app_metadata.supervisor === true) return true;
  const email = user.email || '';
  const name = user.user_metadata?.full_name || user.user_metadata?.name || '';
  return typeof isSupervisorAccount === 'function' ? isSupervisorAccount(email, name) : false;
}


// What goes before the @ in an email
const handleOf = (email) => (email?.includes('@') ? email.split('@')[0] : 'estudiante');

// A person's points on the Scare Meter: a clown always counts as 0 (person is a row from 'perfiles')
const scarePoints = (person) => (isClown(person?.correo || person?.usuario, person?.nombre, person) ? 0 : Number(person?.puntos) || 0);

// The distinct scores above 0, best first: people with equal points share a place
const pointTiers = (allPoints) => [...new Set(allPoints.filter((p) => p > 0))].sort((a, b) => b - a);

// Podium with ties. If nobody has points yet, everyone shares gold.
function medalFor(points, allPoints) {
  const tiers = pointTiers(allPoints);
  if (!tiers.length) return 'gold';
  return ['gold', 'silver', 'bronze'][tiers.indexOf(points)] ?? null;
}

// Medal from a dense rank or medal tier (1 = gold, 2 = silver, 3 = bronze, >3 = null)
function medalForTier(tier) {
  if (!tier || tier < 1 || tier > 3) return null;
  return ['gold', 'silver', 'bronze'][tier - 1] ?? null;
}

// The speaker's photo if there is one; otherwise their monster (with "?" if not announced yet)
function speakerPortrait(speaker) {
  return speaker.photo ? `<img src="${speaker.photo}" alt="">` : drawMonster(speaker.color, !speaker.name);
}

// Small round logo of a group (empty if the group has none)
function groupLogo(group) {
  return group.logo ? `<span class="avatar"><img src="${group.logo}" alt=""></span>` : '';
}

// Address of the page with all the information about an activity
const activityLink = (id) => `evento.html?id=${encodeURIComponent(id)}`;

// Two activities overlap if they are on the same day and their times intersect.
// 'HH:MM' times can be compared directly as text.
function overlaps(a, b) {
  return a.day === b.day && a.start < b.end && b.start < a.end;
}

// The other activities happening at the same time
function findOverlapping(activity) {
  return ACTIVITIES.filter((other) => other !== activity && overlaps(other, activity));
}

// Night suspension mode (10:30 PM to 7:00 AM Colombia time, America/Bogota UTC-5)
function isNightSuspension(date = new Date()) {
  try {
    const f = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota',
      hourCycle: 'h23',
      hour: 'numeric',
      minute: 'numeric'
    }).formatToParts(date);
    const h = Number(f.find((x) => x.type === 'hour')?.value || 0);
    const m = Number(f.find((x) => x.type === 'minute')?.value || 0);
    const mins = h * 60 + m;
    return mins >= 1350 || mins < 420;
  } catch (e) {
    const utcMins = date.getUTCHours() * 60 + date.getUTCMinutes();
    const bogotaMins = (utcMins - 300 + 1440) % 1440;
    return bogotaMins >= 1350 || bogotaMins < 420;
  }
}
