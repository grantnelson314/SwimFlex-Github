/**
 * Timer math and demo timing. Pure functions — no React, no clocks.
 *
 * Two separate concepts (ARCHITECTURE.md "Demo Timer Mode"):
 *   displayIntervalSeconds     the REAL send-off interval, e.g. 170 (2:50). Shown in the UI.
 *   simulationIntervalSeconds  how long that interval takes on the wall clock. In demo mode
 *                              it is shortened (~8 s) so testers don't wait minutes.
 *
 * All session time (countdown, elapsed) is kept in "workout seconds". Only the tick converts
 * real wall-clock seconds into workout seconds using getTimeScale().
 */

/** A displayed interval of 2:50 completes in about this many real seconds in demo mode. */
export const DEMO_INTERVAL_SECONDS = 8

/** How often the shared clock ticks (ms). */
export const TICK_MS = 200

/** Real seconds a send-off interval takes on the wall clock. */
export function getSimulationIntervalSeconds(displayIntervalSeconds, demoMode) {
  if (!displayIntervalSeconds) return null
  return demoMode
    ? Math.min(displayIntervalSeconds, DEMO_INTERVAL_SECONDS)
    : displayIntervalSeconds
}

/**
 * Workout seconds that pass per real second. 1 outside demo mode (and for sets without an
 * interval); 170 / 8 = 21.25 for a 2:50 interval in demo mode.
 */
export function getTimeScale(displayIntervalSeconds, demoMode) {
  const sim = getSimulationIntervalSeconds(displayIntervalSeconds, demoMode)
  return sim ? displayIntervalSeconds / sim : 1
}

/**
 * Developer flag: demo mode is ON by default; open the app with `?demo=off` (or 0/false)
 * to run at real speed. There is deliberately no on-screen control.
 */
export function resolveDemoMode(search = '') {
  const value = new URLSearchParams(search).get('demo')
  if (value == null) return true
  return !['off', '0', 'false', 'no'].includes(value.toLowerCase())
}
