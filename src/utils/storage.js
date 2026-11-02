/**
 * localStorage persistence. Local-only — there is no backend.
 * All access is wrapped so private-mode / quota / corrupt-JSON failures never crash the app.
 */

export const STORAGE_KEYS = {
  workouts: 'swimflex_workouts',
  // Reserved for later phases (see ARCHITECTURE.md "Persistence"):
  preferences: 'swimflex_preferences',
  activeSession: 'swimflex_active_session',
  // Which version of the seed/demo workouts the saved data was written with.
  demoVersion: 'swimflex_demo_version',
}

/** Returns the parsed value, or `undefined` if missing/unreadable. */
export function readStorage(key) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw == null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

/** Returns true on success. */
export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeStorage(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
