import { buildManualRecommendation, validateManualEdits } from '../features/adaptation/manualAdjustment.js'
import { SESSION_STATUS, createSession, isUnfinished, sessionReducer } from '../features/session/sessionReducer.js'
import { resolveDemoMode } from '../features/session/timer.js'
import { SEED_WORKOUT_IDS, createSeedWorkouts } from '../features/workouts/workoutData.js'
import { createWorkoutId, isSavableWorkout } from '../features/workouts/workoutBuilder.js'
import { migrateSeedWorkouts, needsSeedMigration } from '../features/workouts/seedMigration.js'
import { STORAGE_KEYS, readStorage } from '../utils/storage.js'
import { ActionTypes } from './actions.js'

/**
 * Shape follows ARCHITECTURE.md "State Architecture".
 * Fields for later phases exist but stay inert until those phases are built.
 */
export function createInitialState(workouts = createSeedWorkouts(), activeSession = null) {
  return {
    workouts,
    selectedWorkoutId: null,
    adaptationRequest: null, // the swimmer's inputs on Adapt Workout (not persisted)
    recommendation: null, // engine result: proposal, safetyBoundary, or notice (not persisted)
    activeSession, // see features/session/sessionReducer.js
    watch: {
      visible: false, // Phase 4
      connected: true,
    },
    settings: {
      // Developer flag only (no UI): `?demo=off` runs at real speed. See features/session/timer.js.
      demoMode: true,
    },
  }
}

function isValidWorkout(w) {
  return (
    w &&
    typeof w.id === 'string' &&
    typeof w.name === 'string' &&
    Array.isArray(w.sets) &&
    w.sets.every((s) => s && typeof s.id === 'string')
  )
}

function isValidSession(s) {
  return (
    s &&
    typeof s.sessionId === 'string' &&
    isValidWorkout(s.workout) &&
    Number.isInteger(s.currentSetIndex) &&
    s.workout.sets[s.currentSetIndex] !== undefined &&
    Array.isArray(s.adaptationsApplied)
  )
}

/**
 * Decide which workouts to start with, given what was saved (pure; tested).
 *   - nothing valid saved                → the seed workouts
 *   - saved with an older demo version   → seed examples brought up to date (seedMigration.js);
 *                                          workouts the swimmer added are kept
 *   - saved with the current version     → used as-is
 * Unreadable entries are dropped individually; they never wipe the valid ones.
 */
export function resolveSavedWorkouts(saved, savedVersion) {
  const valid = Array.isArray(saved) ? saved.filter(isValidWorkout) : []
  if (valid.length === 0) return createSeedWorkouts()
  return needsSeedMigration(savedVersion) ? migrateSeedWorkouts(valid) : valid
}

/**
 * Load saved workouts, or seed defaults ONLY if nothing valid is saved.
 * Never overwrites user data on refresh. A saved unfinished session comes back PAUSED
 * (we can't know how long the page was away), so nothing advances behind the swimmer's back.
 */
export function loadInitialState() {
  const workouts = resolveSavedWorkouts(
    readStorage(STORAGE_KEYS.workouts),
    readStorage(STORAGE_KEYS.demoVersion),
  )

  let session = readStorage(STORAGE_KEYS.activeSession)
  session = isValidSession(session) && isUnfinished(session) ? session : null
  if (session?.status === SESSION_STATUS.running) session = { ...session, status: SESSION_STATUS.paused }

  const state = createInitialState(workouts, session)
  if (typeof window !== 'undefined') {
    state.settings = { ...state.settings, demoMode: resolveDemoMode(window.location.search) }
  }
  return state
}

const SESSION_ACTION_TYPES = new Set([
  ActionTypes.BEGIN_SESSION,
  ActionTypes.PAUSE_SESSION,
  ActionTypes.RESUME_SESSION,
  ActionTypes.TICK_SESSION,
  ActionTypes.COMPLETE_REP,
  ActionTypes.NEXT_SET,
  ActionTypes.APPLY_SESSION_ADJUSTMENT,
  ActionTypes.END_SESSION,
  ActionTypes.BEGIN_QUICK_ADJUST,
  ActionTypes.END_QUICK_ADJUST,
])

export function appReducer(state, action) {
  if (SESSION_ACTION_TYPES.has(action.type)) {
    const next = sessionReducer(state.activeSession, action)
    return next === state.activeSession ? state : { ...state, activeSession: next }
  }

  switch (action.type) {
    case ActionTypes.SELECT_WORKOUT:
      return { ...state, selectedWorkoutId: action.workoutId }

    case ActionTypes.SET_PRIORITY_SET: {
      const { workoutId, setId } = action
      const target = state.workouts.find((w) => w.id === workoutId)
      if (!target) return state

      // Ignore ids that don't belong to this workout (null clears).
      if (setId !== null && !target.sets.some((s) => s.id === setId)) return state
      if (target.prioritySetId === setId) return state

      return {
        ...state,
        workouts: state.workouts.map((w) =>
          w.id === workoutId ? { ...w, prioritySetId: setId } : w,
        ),
      }
    }

    case ActionTypes.ADD_WORKOUT: {
      if (!isSavableWorkout(action.workout)) return state
      // Never overwrite a saved workout: a clashing id gets a numeric suffix.
      const id = createWorkoutId(action.workout.id.replace(/^custom-/, ''), state.workouts.map((w) => w.id))
      const workout = { ...action.workout, id, prioritySetId: action.workout.prioritySetId ?? null }
      return { ...state, workouts: [...state.workouts, workout] }
    }

    case ActionTypes.RESET_DEMO:
      // Fresh demo workouts, no session/proposal/answers. Watch visibility and settings stay.
      return { ...createInitialState(), watch: state.watch, settings: state.settings }

    case ActionTypes.RETURN_TO_TUESDAY: {
      // Clean demonstration state in one action. Workouts the swimmer added are kept; only
      // Tuesday Threshold is put back to the canonical seed (with its default Priority Set).
      const canonical = createSeedWorkouts().find((w) => w.id === SEED_WORKOUT_IDS.tuesdayThreshold)
      const exists = state.workouts.some((w) => w.id === canonical.id)
      const workouts = exists
        ? state.workouts.map((w) => (w.id === canonical.id ? canonical : w))
        : [canonical, ...state.workouts]
      return {
        ...state,
        workouts,
        selectedWorkoutId: canonical.id,
        adaptationRequest: null,
        recommendation: null,
        activeSession: null,
      }
    }

    case ActionTypes.SET_ADAPTATION_RESULT:
      return {
        ...state,
        adaptationRequest: action.request,
        recommendation: action.result,
      }

    case ActionTypes.ACCEPT_RECOMMENDATION: {
      // Only a real, still-proposed recommendation can be accepted.
      const rec = state.recommendation
      if (!rec || rec.type !== 'recommendation' || rec.status !== 'proposed') return state
      return { ...state, recommendation: { ...rec, status: 'accepted' } }
    }

    case ActionTypes.CLEAR_ADAPTATION:
      return { ...state, adaptationRequest: null, recommendation: null }

    case ActionTypes.UPDATE_PROPOSED_WORKOUT: {
      // Manual edits replace the PROPOSAL only. The saved workout is untouched and the
      // adaptation engine is not re-run.
      const rec = state.recommendation
      if (!rec || rec.type !== 'recommendation' || rec.status !== 'proposed') return state
      const original = state.workouts.find((w) => w.id === rec.sourceWorkoutId)
      if (!original) return state
      if (validateManualEdits(action.edits, original).length > 0) return state
      return { ...state, recommendation: buildManualRecommendation(original, rec, action.edits) }
    }

    case ActionTypes.START_SESSION: {
      // One session at a time: never silently replace a workout in progress.
      if (isUnfinished(state.activeSession) || !action.workout?.sets?.length) return state
      // Starting the accepted proposal marks it 'started', so a watch showing "Workout Ready"
      // (and the phone's ready page) don't offer to start the same workout twice.
      const rec = state.recommendation
      const startsProposal =
        action.kind === 'adjusted' && rec?.type === 'recommendation' && rec.status === 'accepted'
      return {
        ...state,
        recommendation: startsProposal ? { ...rec, status: 'started' } : rec,
        activeSession: createSession(action.workout, {
          sessionId: action.sessionId,
          sourceWorkoutId: action.sourceWorkoutId,
          workoutKind: action.kind,
          autoStart: action.autoStart,
          now: action.now,
        }),
      }
    }

    case ActionTypes.SET_WATCH_VISIBLE:
      return state.watch.visible === action.visible
        ? state
        : { ...state, watch: { ...state.watch, visible: action.visible } }

    case ActionTypes.SET_WATCH_CONNECTED:
      return state.watch.connected === action.connected
        ? state
        : { ...state, watch: { ...state.watch, connected: action.connected } }

    case ActionTypes.CLEAR_SESSION:
      return state.activeSession ? { ...state, activeSession: null } : state

    default:
      return state
  }
}
