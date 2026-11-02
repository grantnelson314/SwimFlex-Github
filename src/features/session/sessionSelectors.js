/**
 * Read-only helpers over a session. Presentation components (phone Pool Mode now, the
 * smartwatch simulator later) use these instead of re-deriving values.
 */
import { calculateWorkoutYards } from '../workouts/workoutUtils.js'

export const getCurrentSet = (session) => session?.workout.sets[session.currentSetIndex] ?? null

export const getNextSet = (session) => session?.workout.sets[session.currentSetIndex + 1] ?? null

/** The real (displayed) send-off interval of the current set, or null. */
export const getCurrentInterval = (session) => getCurrentSet(session)?.intervalSeconds ?? null

/** True when the current set has a send-off interval and advances on its own. */
export const isTimedSet = (session) => getCurrentInterval(session) != null

/** 0..1 progress through the current set, counting the fraction of the rep in progress. */
export function getSetProgress(session) {
  const set = getCurrentSet(session)
  if (!set) return 0
  if (session.status === 'completed') return 1
  const interval = set.intervalSeconds
  const repFraction = interval ? Math.min(1, session.repElapsedSeconds / interval) : 0
  return Math.min(1, (session.currentRepIndex + repFraction) / set.repetitions)
}

/** Yards the session would cover if every rep were completed as currently planned. */
export const getPlannedYards = (session) => calculateWorkoutYards(session.workout)

/** Whole seconds to show on the countdown (never shows 0:00 before the send-off fires). */
export const getCountdownSeconds = (session) =>
  session?.remainingIntervalSeconds == null ? null : Math.max(0, Math.ceil(session.remainingIntervalSeconds - 1e-6))
