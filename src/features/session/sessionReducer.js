/**
 * Active workout session logic (ARCHITECTURE.md "Active Session Model", "Session and Timer Logic").
 *
 * Everything here is a PURE function of (session, inputs): no React, no Date.now(), no timers.
 * The one shared clock (SessionClock) dispatches `tick` actions; the phone UI and the future
 * smartwatch simulator both read/write this same state.
 *
 * Session shape:
 * {
 *   sessionId, sourceWorkoutId, workoutKind: 'adjusted' | 'original',
 *   workout,                 // snapshot the session runs; the saved workout is never touched
 *   status,                  // 'ready' | 'running' | 'paused' | 'completed' | 'ended'
 *   currentSetIndex, currentRepIndex,           // 0-based
 *   repElapsedSeconds,       // workout seconds into the current rep
 *   remainingIntervalSeconds,// countdown to next send-off (null when the set has no interval)
 *   totalElapsedSeconds,     // workout seconds since the timer first ran
 *   completedYards,          // yards of reps actually completed
 *   advanceCount,            // increments on every rep/set advance (UI send-off cue)
 *   adaptationsApplied: [],  // in-workout adjustments, in order
 *   quickAdjustHold,         // true when Quick Adjust auto-paused a RUNNING session (so it can auto-resume)
 *   startedAt, lastUpdatedAt
 * }
 */
import { areSetsEqual, cloneWorkout } from '../workouts/workoutUtils.js'
import { getTimeScale } from './timer.js'

export const SESSION_STATUS = {
  ready: 'ready',
  running: 'running',
  paused: 'paused',
  completed: 'completed',
  ended: 'ended',
}

const EPS = 1e-9

export const isUnfinished = (session) =>
  !!session && [SESSION_STATUS.ready, SESSION_STATUS.running, SESSION_STATUS.paused].includes(session.status)

export const isFinished = (session) =>
  !!session && [SESSION_STATUS.completed, SESSION_STATUS.ended].includes(session.status)

/* ---------- Creation ---------- */

/**
 * Create a session from a workout (adjusted or original — same architecture).
 * autoStart=true starts the timer immediately (phone "Start Workout");
 * autoStart=false leaves it 'ready' (used by the smartwatch "Workout Ready" screen later).
 */
export function createSession(
  workout,
  { sessionId = 'session-1', sourceWorkoutId, workoutKind = 'adjusted', autoStart = true, now = 0 } = {},
) {
  const snapshot = cloneWorkout(workout)
  const first = snapshot.sets[0]
  return {
    sessionId,
    sourceWorkoutId: sourceWorkoutId ?? workout.sourceWorkoutId ?? workout.id,
    workoutKind,
    workout: snapshot,
    status: autoStart ? SESSION_STATUS.running : SESSION_STATUS.ready,
    currentSetIndex: 0,
    currentRepIndex: 0,
    repElapsedSeconds: 0,
    remainingIntervalSeconds: first?.intervalSeconds ?? null,
    totalElapsedSeconds: 0,
    completedYards: 0,
    advanceCount: 0,
    adaptationsApplied: [],
    quickAdjustHold: false,
    startedAt: autoStart ? now : null,
    lastUpdatedAt: now,
  }
}

/* ---------- Status transitions ---------- */

/** ready -> running (the "Start" tap on a ready session). */
export function beginSession(session, now = session.lastUpdatedAt) {
  if (session.status !== SESSION_STATUS.ready) return session
  return { ...session, status: SESSION_STATUS.running, startedAt: now, lastUpdatedAt: now }
}

export function pauseSession(session, now = session.lastUpdatedAt) {
  if (session.status !== SESSION_STATUS.running) return session
  return { ...session, status: SESSION_STATUS.paused, lastUpdatedAt: now }
}

export function resumeSession(session, now = session.lastUpdatedAt) {
  if (session.status !== SESSION_STATUS.paused) return session
  // An explicit resume takes over from any Quick Adjust hold.
  return { ...session, status: SESSION_STATUS.running, quickAdjustHold: false, lastUpdatedAt: now }
}

export function endSession(session, now = session.lastUpdatedAt) {
  if (!isUnfinished(session)) return session
  return {
    ...session,
    status: SESSION_STATUS.ended,
    quickAdjustHold: false,
    remainingIntervalSeconds: null,
    lastUpdatedAt: now,
  }
}

/* ---------- Quick Adjust hold ---------- */

/**
 * Entering Quick Adjust (phone or watch) freezes progression. If the session was RUNNING it is
 * paused and marked with quickAdjustHold so leaving Quick Adjust can resume it. If it was
 * already paused (or not started) nothing changes, so it correctly stays paused afterwards.
 * Set, rep, countdown and elapsed time are untouched.
 */
export function beginQuickAdjust(session, now = session.lastUpdatedAt) {
  if (session.status !== SESSION_STATUS.running) return session
  return { ...session, status: SESSION_STATUS.paused, quickAdjustHold: true, lastUpdatedAt: now }
}

/**
 * Leaving Quick Adjust. Resumes only a session that Quick Adjust itself paused, and only when
 * esume is true (Apply / Keep). esume: false (Pain or injury) clears the hold but leaves the
 * session paused. Safe to call more than once: with no hold it does nothing.
 */
export function endQuickAdjust(session, { resume = true, now = session.lastUpdatedAt } = {}) {
  if (!session.quickAdjustHold) return session
  const base = { ...session, quickAdjustHold: false, lastUpdatedAt: now }
  if (resume && session.status === SESSION_STATUS.paused) return { ...base, status: SESSION_STATUS.running }
  return base
}

/* ---------- Rep / set progression ---------- */

function moveToSet(session, index) {
  if (index >= session.workout.sets.length) {
    return { ...session, status: SESSION_STATUS.completed, remainingIntervalSeconds: null, repElapsedSeconds: 0 }
  }
  return {
    ...session,
    currentSetIndex: index,
    currentRepIndex: 0,
    repElapsedSeconds: 0,
    remainingIntervalSeconds: session.workout.sets[index].intervalSeconds ?? null,
    advanceCount: session.advanceCount + 1,
  }
}

/**
 * Finish the current rep: count its yards, then move to the next rep, or the next set after
 * the final rep, or complete the workout after the final set.
 * Used automatically at send-off, and manually for sets that have no interval.
 */
export function completeCurrentRep(session) {
  if (!isUnfinished(session) || session.status === SESSION_STATUS.ready) return session
  const set = session.workout.sets[session.currentSetIndex]
  const counted = { ...session, completedYards: session.completedYards + set.distancePerRepYards }

  if (counted.currentRepIndex + 1 < set.repetitions) {
    return {
      ...counted,
      currentRepIndex: counted.currentRepIndex + 1,
      repElapsedSeconds: 0,
      remainingIntervalSeconds: set.intervalSeconds ?? null,
      advanceCount: counted.advanceCount + 1,
    }
  }
  return moveToSet(counted, counted.currentSetIndex + 1)
}

/** Manual override: skip to the next set. Reps not yet swum are NOT counted as completed. */
export function skipToNextSet(session) {
  if (!isUnfinished(session) || session.status === SESSION_STATUS.ready) return session
  return moveToSet(session, session.currentSetIndex + 1)
}

/* ---------- Ticking ---------- */

/**
 * Advance the session by `realDtSeconds` of wall-clock time.
 * Reps advance automatically when a countdown reaches zero; leftover time carries into the
 * next rep/set (so a long gap can advance several reps). Sets without an interval just
 * accumulate elapsed time and wait for manual progression.
 */
export function tickSession(session, realDtSeconds, { demoMode = false } = {}) {
  if (session.status !== SESSION_STATUS.running || !(realDtSeconds > 0)) return session

  let s = session
  let realLeft = realDtSeconds
  let guard = 0

  while (realLeft > EPS && s.status === SESSION_STATUS.running && guard++ < 1000) {
    if (s.remainingIntervalSeconds == null) {
      s = {
        ...s,
        totalElapsedSeconds: s.totalElapsedSeconds + realLeft,
        repElapsedSeconds: s.repElapsedSeconds + realLeft,
      }
      break
    }

    const set = s.workout.sets[s.currentSetIndex]
    const scale = getTimeScale(set.intervalSeconds, demoMode)
    const realNeeded = s.remainingIntervalSeconds / scale

    if (realLeft < realNeeded - EPS) {
      const workoutSeconds = realLeft * scale
      s = {
        ...s,
        remainingIntervalSeconds: s.remainingIntervalSeconds - workoutSeconds,
        repElapsedSeconds: s.repElapsedSeconds + workoutSeconds,
        totalElapsedSeconds: s.totalElapsedSeconds + workoutSeconds,
      }
      realLeft = 0
    } else {
      // Countdown finishes inside this tick: bank the time, advance, carry the leftover.
      s = { ...s, totalElapsedSeconds: s.totalElapsedSeconds + s.remainingIntervalSeconds, remainingIntervalSeconds: 0 }
      realLeft -= realNeeded
      s = completeCurrentRep(s)
    }
  }
  return s
}

/* ---------- In-workout adjustments ---------- */

/**
 * Apply an interval adjustment to ONE set of the running session (Quick Adjust, Apply & Continue).
 *  - Only the session's own workout snapshot changes; the saved workout never does.
 *  - Repetitions and distance are untouched.
 *  - If it is the set being swum, the current countdown moves by the interval change.
 *  - Ignored if the set is already finished or the session is over.
 *  - Ignored if the set is already at the target interval, so an adjustment is recorded once.
 * The adjustment is recorded in `adaptationsApplied`.
 */
export function applyIntervalAdjustment(session, adjustment, now = session.lastUpdatedAt) {
  if (!isUnfinished(session)) return session
  const index = session.workout.sets.findIndex((s) => s.id === adjustment.setId)
  if (index < 0 || index < session.currentSetIndex) return session

  const workout = cloneWorkout(session.workout)
  const set = workout.sets[index]
  const previousInterval = set.intervalSeconds
  if (!previousInterval) return session
  // Already at the target interval (e.g. a double tap): record nothing a second time.
  if (previousInterval === adjustment.toIntervalSeconds) return session
  set.intervalSeconds = adjustment.toIntervalSeconds

  let remaining = session.remainingIntervalSeconds
  if (index === session.currentSetIndex && remaining != null) {
    remaining = Math.max(0, remaining + (adjustment.toIntervalSeconds - previousInterval))
  }

  const record = {
    ...adjustment,
    id: `adj-${session.adaptationsApplied.length + 1}`,
    fromIntervalSeconds: previousInterval,
    atElapsedSeconds: session.totalElapsedSeconds,
  }

  return {
    ...session,
    workout,
    remainingIntervalSeconds: remaining,
    adaptationsApplied: [...session.adaptationsApplied, record],
    lastUpdatedAt: now,
  }
}

/**
 * Apply a Running Out of Time adjustment: swap in the proposed (shorter) versions of sets
 * that have NOT started yet. Quick Adjust only ever adapts the remaining workout:
 *  - the set being swum and every finished set are never rewritten;
 *  - a set is only replaced if it still matches what the proposal was built from, so a stale
 *    or repeated apply changes nothing and is not recorded twice.
 * The adjustment (with its per-set changes) is recorded in daptationsApplied.
 */
export function applyRemainingAdjustment(session, adjustment, now = session.lastUpdatedAt) {
  if (!isUnfinished(session)) return session

  const workout = cloneWorkout(session.workout)
  const applied = []
  for (const change of adjustment.changes ?? []) {
    const index = workout.sets.findIndex((s) => s.id === change.setId)
    if (index < 0 || index <= session.currentSetIndex) continue
    if (!areSetsEqual(workout.sets[index], change.beforeSet)) continue
    workout.sets[index] = JSON.parse(JSON.stringify(change.afterSet))
    applied.push(change)
  }
  if (applied.length === 0) return session

  const record = {
    ...adjustment,
    changes: applied,
    id: `adj-${session.adaptationsApplied.length + 1}`,
    atElapsedSeconds: session.totalElapsedSeconds,
  }

  return {
    ...session,
    workout,
    adaptationsApplied: [...session.adaptationsApplied, record],
    lastUpdatedAt: now,
  }
}

/* ---------- Action dispatcher (used by the app reducer) ---------- */

export const SessionActionTypes = {
  START_SESSION: 'session/start',
  BEGIN_SESSION: 'session/begin',
  PAUSE_SESSION: 'session/pause',
  RESUME_SESSION: 'session/resume',
  TICK_SESSION: 'session/tick',
  COMPLETE_REP: 'session/completeRep',
  NEXT_SET: 'session/nextSet',
  APPLY_SESSION_ADJUSTMENT: 'session/applyAdjustment',
  END_SESSION: 'session/end',
  BEGIN_QUICK_ADJUST: 'session/beginQuickAdjust',
  END_QUICK_ADJUST: 'session/endQuickAdjust',
  CLEAR_SESSION: 'session/clear',
}

/** Handles every session action except START (creation) and CLEAR (removal), which the app reducer owns. */
export function sessionReducer(session, action) {
  if (!session) return session
  switch (action.type) {
    case SessionActionTypes.BEGIN_SESSION:
      return beginSession(session, action.now)
    case SessionActionTypes.PAUSE_SESSION:
      return pauseSession(session, action.now)
    case SessionActionTypes.RESUME_SESSION:
      return resumeSession(session, action.now)
    case SessionActionTypes.TICK_SESSION:
      return tickSession(session, action.dt, { demoMode: action.demoMode })
    case SessionActionTypes.COMPLETE_REP:
      return completeCurrentRep(session)
    case SessionActionTypes.NEXT_SET:
      return skipToNextSet(session)
    case SessionActionTypes.APPLY_SESSION_ADJUSTMENT:
      return action.adjustment?.type === 'remainingReduced'
        ? applyRemainingAdjustment(session, action.adjustment, action.now)
        : applyIntervalAdjustment(session, action.adjustment, action.now)
    case SessionActionTypes.END_SESSION:
      return endSession(session, action.now)
    case SessionActionTypes.BEGIN_QUICK_ADJUST:
      return beginQuickAdjust(session, action.now)
    case SessionActionTypes.END_QUICK_ADJUST:
      return endQuickAdjust(session, { resume: action.resume, now: action.now })
    default:
      return session
  }
}
