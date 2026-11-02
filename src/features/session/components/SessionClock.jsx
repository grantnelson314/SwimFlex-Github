import { useWorkoutTimer } from '../useWorkoutTimer.js'

/**
 * Mounted ONCE at the app root (see App.jsx). It owns the only clock in the app, so the
 * session keeps running on any screen — and the future smartwatch simulator shares it.
 * Renders nothing.
 */
export default function SessionClock() {
  useWorkoutTimer()
  return null
}
