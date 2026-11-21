/* =============================================
   SHARED FUNCTIONS
   Used by the main page (main.js), each activity page (event.js) and the Scare Meter.
   ============================================= */


import { ACTIVITIES, COMPANIES, DAYS, GROUPS, SPEAKERS, TITLES, isClown, isSupervisorAccount } from '@/data/content';
import { drawMonster } from '@/lib/icons';
import { currentUser } from '@/lib/session';

export const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector);
export const $$ = <T extends Element = HTMLElement>(selector: string) => document.querySelectorAll<T>(selector);

export const findDay = (id) => DAYS.find((day) => day.id === id);
export const findSpeakers = (activity) => SPEAKERS.filter((speaker) => activity.speakers?.includes(speaker.id));
export const findActivity = (id) => ACTIVITIES.find((activity) => activity.id === id);
export const findGroup = (id) => GROUPS.find((group) => group.id === id) || COMPANIES.find((c) => c.id === id);
export const findTitle = (id) => TITLES.find((title) => title.id === id);

// How a title reads according to the monster's style (Asustador / Asustadora, Rey / Reina…)
export function titleText(title, style) {
  return style === 'femenino' && title.feminine ? title.feminine : title.name;
}

// Names and emails are typed by each person: anything that goes into innerHTML passes through here
export function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Removes accents, so "futbol" finds "Fútbol"
export const stripAccents = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '');

// The date in Colombia as 'YYYY-MM-DD', wherever the person's device thinks it is
export const colombiaDay = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(date);

// Whether the given or logged-in user is a supervisor (by app_metadata set in Supabase or verified admin account)
export function isCurrentSupervisor(user = currentUser) {
  if (!user) return false;
  if (user.app_metadata && user.app_metadata.supervisor === true) return true;
  const email = user.email || '';
  const name = user.user_metadata?.full_name || user.user_metadata?.name || '';
  return isSupervisorAccount(email, name);
}

// Strict supervisor check for DESTRUCTIVE controls (deleting sign-ups, granting points).
// It trusts ONLY app_metadata.supervisor, the flag set by hand with SQL in Supabase that the
// browser cannot forge. Unlike isCurrentSupervisor, it does NOT fall back to name/email, so
// someone who renames their account "Santiago Escobar" never even sees these buttons. The server
// functions (es_supervisor()) enforce the same, so this only hides the UI; it is not the gate.
export function isStrictSupervisor(user = currentUser) {
  return Boolean(user && user.app_metadata && user.app_metadata.supervisor === true);
}


// What goes before the @ in an email
export const handleOf = (email) => (email?.includes('@') ? email.split('@')[0] : 'estudiante');

// A person's points on the Scare Meter: a clown always counts as 0 (person is a row from 'perfiles')
export const scarePoints = (person) => (isClown(person?.correo || person?.usuario, person?.nombre, person) ? 0 : Number(person?.puntos) || 0);

// Medal from a dense rank or medal tier (1 = gold, 2 = silver, 3 = bronze, >3 = null)
export function medalForTier(tier) {
  if (!tier || tier < 1 || tier > 3) return null;
  return ['gold', 'silver', 'bronze'][tier - 1] ?? null;
}

// The speaker's photo if there is one; otherwise their monster (with "?" if not announced yet)
export function speakerPortrait(speaker) {
  return speaker.photo ? `<img src="${speaker.photo}" alt="">` : drawMonster(speaker.color, !speaker.name);
}

// Small round logo of a group (empty if the group has none)
export function groupLogo(group) {
  return group.logo ? `<span class="avatar"><img src="${group.logo}" alt=""></span>` : '';
}

// Address of the page with all the information about an activity
export const activityLink = (id) => `evento.html?id=${encodeURIComponent(id)}`;

// Two activities overlap if they are on the same day and their times intersect.
// 'HH:MM' times can be compared directly as text.
function overlaps(a, b) {
  return Boolean(a.day && b.day && a.day === b.day && a.start && a.end && b.start && b.end && a.start < b.end && b.start < a.end);
}

// The other activities happening at the same time
export function findOverlapping(activity) {
  return ACTIVITIES.filter((other) => other !== activity && overlaps(other, activity));
}

// The week 1 game (Snake) closes at 8 p.m. Colombia time: the same time is in juego_terminado (supabase/weekly-game.sql)
export const WEEK_1_ENDS = Date.parse('2026-11-08T20:00:00-05:00');
// The week 2 game (Doom) closes at 8 p.m. Colombia time: the same time is in juego_terminado (supabase/weekly-game.sql)
export const WEEK_2_ENDS = Date.parse('2026-11-15T20:00:00-05:00');
// The week 3 game (Defrag) closes at 2 p.m. Colombia time: the same time is in juego_terminado (supabase/weekly-game.sql)
export const WEEK_3_ENDS = Date.parse('2026-11-20T14:00:00-05:00');

// A notice in the style of the reward window. text and button are HTML.
export function showNoticeDialog(icon, eyebrow, title, text, button) {
  const notice = document.createElement('dialog');
  notice.className = 'auth-modal reward-modal';
  notice.setAttribute('aria-label', title);
  notice.innerHTML = `
    <div class="auth-modal__box reward-modal__box">
      <button class="auth-modal__close" type="button" aria-label="Cerrar ventana">✕</button>
      <div class="reward-stage">
        <div class="reward-icon-box">${icon}</div>
        <p class="section-title__eyebrow">${eyebrow}</p>
        <h2 class="auth-modal__title reward-modal__title">${title}</h2>
        <p class="reward-desc">${text}</p>
        ${button}
      </div>
    </div>`;
  // The X, the button and a tap outside the box all close it
  notice.addEventListener('click', (event) => {
    if (event.target === notice || (event.target as Element).closest('.auth-modal__close, .reward-btn')) notice.close();
  });
  document.body.append(notice);
  notice.showModal();
}
