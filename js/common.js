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

// Names and emails are typed by each person: anything that goes into innerHTML passes through here
function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Removes accents, so "futbol" finds "Fútbol"
const stripAccents = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '');

// What goes before the @ in an email
const handleOf = (email) => (email?.includes('@') ? email.split('@')[0] : 'estudiante');

// A person's points on the Scare Meter: a clown always counts as 0 (person is a row from 'perfiles')
const scarePoints = (person) => (isClown(person.correo, person.nombre, person) ? 0 : Number(person.puntos) || 0);

// The distinct scores above 0, best first: people with equal points share a place
const pointTiers = (allPoints) => [...new Set(allPoints.filter((p) => p > 0))].sort((a, b) => b - a);

// Podium with ties. If nobody has points yet, everyone shares gold.
function medalFor(points, allPoints) {
  const tiers = pointTiers(allPoints);
  if (!tiers.length) return 'gold';
  return ['gold', 'silver', 'bronze'][tiers.indexOf(points)] ?? null;
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
