/**
 * Read-only view models for the simulated smartwatch.
 *
 * The watch keeps NO workout state of its own: every value below is derived from the same
 * shared app state (`activeSession`, `recommendation`) the phone reads. Pure functions, so
 * "what is the watch showing?" is testable without rendering anything.
 */
import { RESULT_TYPES } from '../adaptation/adaptationEngine.js'
import {
  getCountdownSeconds,
  getCurrentInterval,
  getCurrentSet,
  isTimedSet,
} from '../session/sessionSelectors.js'
import { SESSION_STATUS, isFinished, isUnfinished } from '../session/sessionReducer.js'
import { FOCUS_LABELS, ROLE_LABELS } from '../workouts/workoutData.js'
import { calculateWorkoutYards, formatPoolSetTitle } from '../workouts/workoutUtils.js'

export const WATCH_SCREENS = {
  none: 'none', // nothing to show yet
  ready: 'ready', // accepted workout not started
  pool: 'pool', // running
  paused: 'paused',
  complete: 'complete', // completed or ended
}

/**
 * Which main watch screen the shared state calls for.
 * (Quick Adjust / safety screens are transient local UI layered on top by the watch shell.)
 */
export function selectWatchScreen(state) {
  const session = state.activeSession
  if (session) {
    if (isFinished(session)) return WATCH_SCREENS.complete
    if (session.status === SESSION_STATUS.ready) return WATCH_SCREENS.ready
    if (session.status === SESSION_STATUS.paused) return WATCH_SCREENS.paused
    return WATCH_SCREENS.pool
  }
  const rec = state.recommendation
  if (rec?.type === RESULT_TYPES.recommendation && rec.status === 'accepted') return WATCH_SCREENS.ready
  return WATCH_SCREENS.none
}

/**
 * "Workout Ready": an accepted adjusted workout, or a session created but not yet begun.
 * `startsWith` tells the watch which shared action Start should dispatch.
 */
export function selectWatchReady(state) {
  const session = state.activeSession
  if (isUnfinished(session) && session.status === SESSION_STATUS.ready) {
    return buildReady(session.workout, 'session')
  }
  const rec = state.recommendation
  if (!session && rec?.type === RESULT_TYPES.recommendation && rec.status === 'accepted') {
    return { ...buildReady(rec.adjustedWorkout, 'proposal'), sourceWorkoutId: rec.sourceWorkoutId }
  }
  return null
}

function buildReady(workout, startsWith) {
  return {
    startsWith,
    workout,
    name: workout.name,
    yards: calculateWorkoutYards(workout),
    minutes: workout.estimatedDurationMinutes,
    focus: (FOCUS_LABELS[workout.focus] ?? '').toUpperCase(),
  }
}

/** Compact set title for a small screen: "200 FREE". */
export const formatWatchSetTitle = (set) => formatPoolSetTitle(set).replace(' yd ', ' ').toUpperCase()

/** "Pool Mode" content straight from the shared session. */
export function selectWatchPool(session) {
  const set = getCurrentSet(session)
  if (!set) return null
  return {
    label: (ROLE_LABELS[set.role] ?? set.name).toUpperCase(),
    showReps: set.repetitions > 1,
    repText: `REP ${session.currentRepIndex + 1} OF ${set.repetitions}`,
    title: formatWatchSetTitle(set),
    timed: isTimedSet(session),
    intervalSeconds: getCurrentInterval(session),
    countdownSeconds: getCountdownSeconds(session),
    advanceCount: session.advanceCount,
  }
}

/** "Paused": current set and rep, nothing else. */
export function selectWatchPaused(session) {
  const set = getCurrentSet(session)
  if (!set) return null
  return {
    setName: ROLE_LABELS[set.role] ?? set.name,
    showReps: set.repetitions > 1,
    repText: `Rep ${session.currentRepIndex + 1} of ${set.repetitions}`,
  }
}

/** "Complete": distance, elapsed time and number of adjustments. No analytics. */
export function selectWatchComplete(session) {
  return {
    ended: session.status === SESSION_STATUS.ended,
    yards: session.completedYards,
    elapsedSeconds: session.totalElapsedSeconds,
    adjustments: session.adaptationsApplied.length,
  }
}
