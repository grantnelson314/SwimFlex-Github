/**
 * Action types and creators for the shared app state.
 * Phone and (later) the smartwatch simulator dispatch the same actions.
 */
import { SessionActionTypes } from '../features/session/sessionReducer.js'

export const ActionTypes = {
  SELECT_WORKOUT: 'workouts/select',
  SET_PRIORITY_SET: 'workouts/setPrioritySet',
  SET_ADAPTATION_RESULT: 'adaptation/setResult',
  ACCEPT_RECOMMENDATION: 'adaptation/accept',
  CLEAR_ADAPTATION: 'adaptation/clear',
  UPDATE_PROPOSED_WORKOUT: 'adaptation/updateProposed',
  ADD_WORKOUT: 'workouts/add',
  RESET_DEMO: 'demo/reset',
  RETURN_TO_TUESDAY: 'demo/returnToTuesday',
  SET_WATCH_VISIBLE: 'watch/setVisible',
  SET_WATCH_CONNECTED: 'watch/setConnected',
  ...SessionActionTypes,
}

/**
 * Store the swimmer's request and the engine's result (computed outside React).
 * Nothing is applied by this action — a recommendation stays 'proposed' until accepted.
 */
export const setAdaptationResult = (request, result) => ({
  type: ActionTypes.SET_ADAPTATION_RESULT,
  request,
  result,
})

/** The swimmer chose "Use Adjusted Workout". */
export const acceptRecommendation = () => ({ type: ActionTypes.ACCEPT_RECOMMENDATION })

/** Keep Original / Cancel / Return: drop the request and any proposal. */
export const clearAdaptation = () => ({ type: ActionTypes.CLEAR_ADAPTATION })

/**
 * Manual Adjustment "Save Changes": replace the CURRENT PROPOSAL with the swimmer's edits.
 * `edits` = { sets: [{ id, repetitions, distancePerRepYards, intervalSeconds }], prioritySetId }.
 * The saved workout is never modified and the adaptation engine is never re-run.
 */
export const updateProposedWorkout = (edits) => ({
  type: ActionTypes.UPDATE_PROPOSED_WORKOUT,
  edits,
})

/** @param {string|null} workoutId */
export const selectWorkout = (workoutId) => ({
  type: ActionTypes.SELECT_WORKOUT,
  workoutId,
})

/**
 * Mark a set as the Priority Set. Pass `setId = null` to clear it.
 * This is always a user-initiated action — the system never changes it silently.
 */
export const setPrioritySet = (workoutId, setId) => ({
  type: ActionTypes.SET_PRIORITY_SET,
  workoutId,
  setId,
})

/**
 * Save a workout the swimmer entered (pasted or built manually) to My Workouts.
 * The workout comes from workoutBuilder.buildWorkoutFromDraft; invalid ones are ignored.
 */
export const addWorkout = (workout) => ({ type: ActionTypes.ADD_WORKOUT, workout })

/**
 * Demo menu: restore the original demo workouts and clear the active session,
 * the current proposal and any answers on Adapt Workout. Watch visibility is kept.
 */
export const resetDemo = () => ({ type: ActionTypes.RESET_DEMO })
/** One-step clean demo start: no session, no proposal, canonical Tuesday Threshold selected. */
export const returnToTuesday = () => ({ type: ActionTypes.RETURN_TO_TUESDAY })

/* ---------- Active session ---------- */

/**
 * Create an active session from a workout (adjusted OR original — same architecture).
 * Does nothing if an unfinished session already exists.
 */
export const startSession = ({
  workout,
  sourceWorkoutId,
  kind = 'adjusted',
  autoStart = true,
  sessionId = `session-${Date.now()}`,
  now = Date.now(),
}) => ({
  type: ActionTypes.START_SESSION,
  workout,
  sourceWorkoutId,
  kind,
  autoStart,
  sessionId,
  now,
})

export const beginSession = () => ({ type: ActionTypes.BEGIN_SESSION, now: Date.now() })
export const pauseSession = () => ({ type: ActionTypes.PAUSE_SESSION, now: Date.now() })
export const resumeSession = () => ({ type: ActionTypes.RESUME_SESSION, now: Date.now() })
export const endSession = () => ({ type: ActionTypes.END_SESSION, now: Date.now() })

/** The shared clock: `dt` real seconds since the last tick. */
export const tickSession = (dt, demoMode) => ({ type: ActionTypes.TICK_SESSION, dt, demoMode })

/** Manual progression for sets without an interval ("Set done"). */
export const completeRep = () => ({ type: ActionTypes.COMPLETE_REP })

/** Manual override: skip to the next set. */
export const nextSet = () => ({ type: ActionTypes.NEXT_SET })

/** Quick Adjust "Apply & Continue" (the adjustment comes from quickAdjust.js). */
export const applySessionAdjustment = (adjustment) => ({
  type: ActionTypes.APPLY_SESSION_ADJUSTMENT,
  adjustment,
  now: Date.now(),
})

/** Done / Return to My Workouts after a finished session. */
export const clearSession = () => ({ type: ActionTypes.CLEAR_SESSION })

/**
 * Entering Quick Adjust (phone or watch): pause progression. A RUNNING session is paused and
 * flagged so endQuickAdjust(true) can resume it; an already-paused session is left alone.
 */
export const beginQuickAdjust = () => ({ type: ActionTypes.BEGIN_QUICK_ADJUST, now: Date.now() })

/**
 * Leaving Quick Adjust. resume: true (Apply / Keep) resumes only if Quick Adjust paused it;
 * resume: false (Pain or injury) keeps the session paused.
 */
export const endQuickAdjust = (resume = true) => ({
  type: ActionTypes.END_QUICK_ADJUST,
  resume,
  now: Date.now(),
})

/* ---------- Smartwatch simulator (presentation only) ---------- */

/** Show/hide the simulated watch. The watch never owns workout state; this is just visibility. */
export const setWatchVisible = (visible) => ({ type: ActionTypes.SET_WATCH_VISIBLE, visible })

/** Optional simulated connection indicator. */
export const setWatchConnected = (connected) => ({ type: ActionTypes.SET_WATCH_CONNECTED, connected })
