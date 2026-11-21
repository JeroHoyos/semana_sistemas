// The logged-in person (null without a session). Set by updateSessionUi (scripts/auth.ts);
// pages without the login dialog keep it null.
export let currentUser = null;

export function setCurrentUser(user) {
  currentUser = user;
}
