import { describe, expect, it } from 'vitest'
import { recommendWorkout } from '../features/adaptation/adaptationEngine.js'
import { CONSTRAINTS, createDefaultRequest } from '../features/adaptation/adaptationRequest.js'
import {
  QUICK_ADJUST_REASONS,
  proposeQuickAdjust,
} from '../features/adaptation/quickAdjust.js'
import {
  SESSION_STATUS,
  applyIntervalAdjustment,
  beginSession,
  completeCurrentRep,
  createSession,
  pauseSession,
  resumeSession,
  skipToNextSet,
  tickSession,
} from '../features/session/sessionReducer.js'
import {
  getCountdownSeconds,
  getCurrentInterval,
  getCurrentSet,
  getSetProgress,
} from '../features/session/sessionSelectors.js'
import {
  DEMO_INTERVAL_SECONDS,
  getSimulationIntervalSeconds,
  getTimeScale,
  resolveDemoMode,
} from '../features/session/timer.js'
import { SEED_WORKOUT_IDS, createSeedWorkouts } from '../features/workouts/workoutData.js'
import { calculateWorkoutYards, formatSetNotation } from '../features/workouts/workoutUtils.js'
import {
  acceptRecommendation,
  applySessionAdjustment,
  clearSession,
  completeRep,
  endSession,
  pauseSession as pauseAction,
  setAdaptationResult,
  startSession,
  tickSession as tickAction,
} from '../state/actions.js'
import { appReducer, createInitialState } from '../state/appReducer.js'

const tuesday = () => createSeedWorkouts().find((w) => w.id === SEED_WORKOUT_IDS.tuesdayThreshold)

/** Canonical adjusted workout (2,100 yd / 40 min). */
function adjustedTuesday() {
  const workout = tuesday()
  return recommendWorkout(workout, {
    ...createDefaultRequest(workout),
    constraint: CONSTRAINTS.lessTime,
    availableMinutes: 40,
    readiness: 3,
  }).adjustedWorkout
}

/** A running session positioned at the main set (6 × 200 @ 2:50), rep 1. */
function sessionAtMainSet(workout = tuesday()) {
  let s = createSession(workout, { sessionId: 's1', now: 1000 })
  s = skipToNextSet(s) // warm-up -> pre-set
  s = skipToNextSet(s) // pre-set -> main set
  return s
}

const REAL = { demoMode: false }
const DEMO = { demoMode: true }

describe('creating an active session', () => {
  it('creates a running session from the ADJUSTED workout', () => {
    const adjusted = adjustedTuesday()
    const s = createSession(adjusted, {
      sessionId: 's1',
      sourceWorkoutId: 'tuesday-threshold',
      workoutKind: 'adjusted',
      now: 5,
    })
    expect(s.status).toBe(SESSION_STATUS.running)
    expect(s.workoutKind).toBe('adjusted')
    expect(s.sourceWorkoutId).toBe('tuesday-threshold')
    expect(calculateWorkoutYards(s.workout)).toBe(2100)
    expect(s.currentSetIndex).toBe(0)
    expect(s.currentRepIndex).toBe(0)
    expect(s.totalElapsedSeconds).toBe(0)
    expect(s.adaptationsApplied).toEqual([])
    expect(s.startedAt).toBe(5)
  })

  it('works the same way for the ORIGINAL workout', () => {
    const s = createSession(tuesday(), { workoutKind: 'original', sourceWorkoutId: 'tuesday-threshold' })
    expect(s.workoutKind).toBe('original')
    expect(calculateWorkoutYards(s.workout)).toBe(2500)
  })

  it('can start in a ready state, then begin', () => {
    let s = createSession(tuesday(), { autoStart: false })
    expect(s.status).toBe(SESSION_STATUS.ready)
    expect(tickSession(s, 10, REAL)).toBe(s) // no time passes while ready
    s = beginSession(s, 99)
    expect(s.status).toBe(SESSION_STATUS.running)
  })

  it('runs on a snapshot, never the saved workout object', () => {
    const adjusted = adjustedTuesday()
    const s = createSession(adjusted)
    expect(s.workout).not.toBe(adjusted)
    s.workout.sets[0].repetitions = 99
    expect(adjusted.sets[0].repetitions).toBe(1)
  })
})

describe('pause / resume', () => {
  it('does not advance while paused and continues on resume', () => {
    let s = sessionAtMainSet()
    s = tickSession(s, 60, REAL)
    expect(getCountdownSeconds(s)).toBe(110)

    s = pauseSession(s)
    expect(s.status).toBe(SESSION_STATUS.paused)
    const frozen = tickSession(s, 500, REAL)
    expect(frozen).toBe(s)
    expect(getCountdownSeconds(frozen)).toBe(110)

    s = resumeSession(s)
    expect(s.status).toBe(SESSION_STATUS.running)
    s = tickSession(s, 10, REAL)
    expect(getCountdownSeconds(s)).toBe(100)
  })

  it('only pauses a running session and only resumes a paused one', () => {
    const ready = createSession(tuesday(), { autoStart: false })
    expect(pauseSession(ready)).toBe(ready)
    const running = createSession(tuesday())
    expect(resumeSession(running)).toBe(running)
  })
})

describe('automatic rep advancement (no tapping per rep)', () => {
  it('counts down, then advances the rep and resets the countdown', () => {
    let s = sessionAtMainSet()
    expect(getCurrentSet(s).id).toBe('main-set')
    expect(getCurrentInterval(s)).toBe(170)
    expect(getCountdownSeconds(s)).toBe(170)

    s = tickSession(s, 100, REAL)
    expect(s.currentRepIndex).toBe(0)
    expect(getCountdownSeconds(s)).toBe(70)

    s = tickSession(s, 70, REAL)
    expect(s.currentRepIndex).toBe(1)
    expect(getCountdownSeconds(s)).toBe(170)
    expect(s.completedYards).toBe(200)
    expect(s.advanceCount).toBeGreaterThan(0)
  })

  it('carries leftover time into the next rep', () => {
    let s = sessionAtMainSet()
    s = tickSession(s, 345, REAL) // 2 reps (340) + 5 s
    expect(s.currentRepIndex).toBe(2)
    expect(getCountdownSeconds(s)).toBe(165)
    expect(s.completedYards).toBe(400)
  })

  it('reports progress through the set', () => {
    let s = sessionAtMainSet()
    expect(getSetProgress(s)).toBe(0)
    s = tickSession(s, 3 * 170, REAL)
    expect(getSetProgress(s)).toBeCloseTo(0.5, 5)
  })
})

describe('automatic set advancement', () => {
  it('moves to the next set after the final rep', () => {
    let s = sessionAtMainSet()
    s = tickSession(s, 6 * 170, REAL)
    expect(getCurrentSet(s).id).toBe('speed')
    expect(s.currentRepIndex).toBe(0)
    expect(getCountdownSeconds(s)).toBe(35)
    expect(s.completedYards).toBe(1200)
    expect(s.status).toBe(SESSION_STATUS.running)
  })

  it('waits for manual progression on a set with no interval', () => {
    let s = createSession(tuesday()) // warm-up: 400 easy, no interval
    expect(getCurrentInterval(s)).toBeNull()
    expect(getCountdownSeconds(s)).toBeNull()
    s = tickSession(s, 120, REAL)
    expect(getCurrentSet(s).id).toBe('warmup')
    expect(s.totalElapsedSeconds).toBe(120)

    s = completeCurrentRep(s) // "Set done"
    expect(getCurrentSet(s).id).toBe('pre-set')
    expect(s.completedYards).toBe(400)
  })

  it('skipping a set does not count its remaining yards', () => {
    let s = sessionAtMainSet()
    s = skipToNextSet(s)
    expect(getCurrentSet(s).id).toBe('speed')
    expect(s.completedYards).toBe(0)
  })

  it('completes the workout after the final set', () => {
    let s = createSession(tuesday())
    s = completeCurrentRep(s) // warm-up
    s = tickSession(s, 8 * 60 + 6 * 170 + 8 * 35, REAL) // pre-set, main, speed
    expect(getCurrentSet(s).id).toBe('cool-down')
    s = completeCurrentRep(s) // cool-down
    expect(s.status).toBe(SESSION_STATUS.completed)
    expect(s.completedYards).toBe(2500)
    expect(getSetProgress(s)).toBe(1)
    expect(tickSession(s, 50, REAL)).toBe(s)
  })
})

describe('demo timing (display interval vs simulated interval)', () => {
  it('simulates a 2:50 interval in about 8 seconds', () => {
    expect(getSimulationIntervalSeconds(170, true)).toBe(DEMO_INTERVAL_SECONDS)
    expect(getSimulationIntervalSeconds(170, true)).toBe(8)
    expect(getSimulationIntervalSeconds(170, false)).toBe(170)
    expect(getTimeScale(170, true)).toBeCloseTo(21.25, 5)
    expect(getTimeScale(170, false)).toBe(1)
  })

  it('never stretches an interval that is already shorter than the demo interval', () => {
    expect(getSimulationIntervalSeconds(5, true)).toBe(5)
    expect(getTimeScale(5, true)).toBe(1)
    expect(getTimeScale(null, true)).toBe(1)
  })

  it('advances a rep after ~8 real seconds in demo mode, while still showing 2:50', () => {
    let s = sessionAtMainSet()
    expect(getCurrentInterval(s)).toBe(170) // displayed interval is the real one
    s = tickSession(s, 4, DEMO)
    expect(s.currentRepIndex).toBe(0)
    expect(getCountdownSeconds(s)).toBe(Math.ceil(170 - 4 * 21.25)) // 85
    s = tickSession(s, 4, DEMO)
    expect(s.currentRepIndex).toBe(1)
    expect(getCurrentInterval(s)).toBe(170) // unchanged by demo mode
    expect(s.totalElapsedSeconds).toBeCloseTo(170, 5) // elapsed stays in real workout time
  })

  it('does not accelerate when demo mode is off', () => {
    let s = sessionAtMainSet()
    s = tickSession(s, 8, REAL)
    expect(s.currentRepIndex).toBe(0)
    expect(getCountdownSeconds(s)).toBe(162)
  })

  it('reads the developer flag from the URL (default on)', () => {
    expect(resolveDemoMode('')).toBe(true)
    expect(resolveDemoMode('?demo=on')).toBe(true)
    expect(resolveDemoMode('?demo=off')).toBe(false)
    expect(resolveDemoMode('?demo=0')).toBe(false)
  })
})

describe('Quick Adjust: 6 × 200 @ 2:50, RPE 8, interval too fast', () => {
  const adjust = (session) =>
    proposeQuickAdjust(session, { reason: QUICK_ADJUST_REASONS.intervalTooFast, rpe: 8 })

  it('proposes 6 × 200 free @ 3:00 and explains it', () => {
    const s = sessionAtMainSet()
    const result = adjust(s)
    expect(result.type).toBe('suggestion')
    expect(result.before).toBe('6 × 200 free @ 2:50')
    expect(result.after).toBe('6 × 200 free @ 3:00')
    expect(result.fromIntervalSeconds).toBe(170)
    expect(result.toIntervalSeconds).toBe(180)
    expect(result.explanation).toBe('Keeps all 6 reps while making the interval more achievable.')
  })

  it('applying it changes the session interval and preserves all 6 reps', () => {
    let s = sessionAtMainSet()
    const result = adjust(s)
    s = applyIntervalAdjustment(s, result.adjustment, 2000)

    const main = getCurrentSet(s)
    expect(formatSetNotation(main)).toBe('6 × 200 free @ 3:00')
    expect(main.repetitions).toBe(6)
    expect(main.distancePerRepYards).toBe(200)
    expect(getCurrentInterval(s)).toBe(180)
    expect(calculateWorkoutYards(s.workout)).toBe(2500) // distance untouched
  })

  it('records the applied adjustment in session history', () => {
    let s = sessionAtMainSet()
    s = tickSession(s, 30, REAL)
    s = applyIntervalAdjustment(s, adjust(s).adjustment, 2000)

    expect(s.adaptationsApplied).toHaveLength(1)
    expect(s.adaptationsApplied[0]).toMatchObject({
      id: 'adj-1',
      type: 'intervalAdjusted',
      reason: 'intervalTooFast',
      rpe: 8,
      setId: 'main-set',
      fromIntervalSeconds: 170,
      toIntervalSeconds: 180,
    })
    expect(s.adaptationsApplied[0].atElapsedSeconds).toBeGreaterThanOrEqual(30)
  })

  it('updates the countdown: the current rep gains the extra 10 s, later reps use 3:00', () => {
    let s = sessionAtMainSet()
    s = tickSession(s, 60, REAL) // 110 s left on a 170 s rep
    s = applyIntervalAdjustment(s, adjust(s).adjustment)
    expect(getCountdownSeconds(s)).toBe(120)

    s = tickSession(s, 120, REAL) // rep 1 done -> rep 2 starts at the NEW interval
    expect(s.currentRepIndex).toBe(1)
    expect(getCountdownSeconds(s)).toBe(180)
  })

  it('does not change the saved/adjusted workout it started from', () => {
    const adjusted = adjustedTuesday()
    let s = createSession(adjusted)
    s = skipToNextSet(skipToNextSet(s))
    s = applyIntervalAdjustment(s, adjust(s).adjustment)
    expect(adjusted.sets.find((x) => x.id === 'main-set').intervalSeconds).toBe(170)
    expect(tuesday().sets.find((x) => x.id === 'main-set').intervalSeconds).toBe(170)
  })

  it('ignores an adjustment for a set that has already finished', () => {
    let s = sessionAtMainSet()
    const { adjustment } = adjust(s)
    s = tickSession(s, 6 * 170, REAL) // main set finished
    const after = applyIntervalAdjustment(s, adjustment)
    expect(after).toBe(s)
    expect(after.adaptationsApplied).toHaveLength(0)
  })

  it('suggests nothing for a low RPE or a set without an interval', () => {
    const s = sessionAtMainSet()
    expect(proposeQuickAdjust(s, { reason: 'intervalTooFast', rpe: 5 }).type).toBe('noChangeNeeded')
    const warmup = createSession(tuesday())
    expect(proposeQuickAdjust(warmup, { reason: 'intervalTooFast', rpe: 8 }).type).toBe('noChangeNeeded')
  })

  it('requires an RPE for Interval too fast', () => {
    const s = sessionAtMainSet()
    expect(proposeQuickAdjust(s, { reason: 'intervalTooFast' }).type).toBe('invalidRequest')
  })

  it('labels the other options as limited instead of inventing advice', () => {
    const s = sessionAtMainSet()
    for (const reason of ['fatigue', 'runningOutOfTime', 'equipment', 'poolConditions']) {
      const result = proposeQuickAdjust(s, { reason, rpe: 9 })
      expect(result.type).toBe('limited')
      expect(result.adjustment).toBeUndefined()
    }
  })
})

describe('Quick Adjust: pain / injury', () => {
  it('routes to the Safety Boundary and produces no adjustment', () => {
    const s = sessionAtMainSet()
    const result = proposeQuickAdjust(s, { reason: QUICK_ADJUST_REASONS.painOrInjury, rpe: 9 })
    expect(result.type).toBe('safetyBoundary')
    expect(result.adjustment).toBeUndefined()
    expect(result.toIntervalSeconds).toBeUndefined()
  })
})

describe('session actions through the shared app state', () => {
  const adjusted = () => adjustedTuesday()

  it('starts a session from the adjusted workout without touching saved workouts', () => {
    const state = createInitialState()
    const saved = state.workouts
    const next = appReducer(
      state,
      startSession({ workout: adjusted(), sourceWorkoutId: 'tuesday-threshold', sessionId: 'a', now: 1 }),
    )
    expect(next.activeSession.status).toBe('running')
    expect(calculateWorkoutYards(next.activeSession.workout)).toBe(2100)
    expect(next.workouts).toBe(saved)
    expect(calculateWorkoutYards(next.workouts[0])).toBe(2500)
  })

  it('never silently replaces a workout in progress', () => {
    let state = appReducer(createInitialState(), startSession({ workout: adjusted(), sessionId: 'a', now: 1 }))
    const again = appReducer(state, startSession({ workout: tuesday(), sessionId: 'b', now: 2 }))
    expect(again).toBe(state)
    expect(again.activeSession.sessionId).toBe('a')

    state = appReducer(state, endSession())
    expect(state.activeSession.status).toBe('ended')
    const fresh = appReducer(state, startSession({ workout: tuesday(), sessionId: 'b', now: 3 }))
    expect(fresh.activeSession.sessionId).toBe('b') // finished sessions can be replaced
  })

  it('ticks, pauses and advances through reducer actions', () => {
    let state = appReducer(createInitialState(), startSession({ workout: tuesday(), sessionId: 'a', now: 1 }))
    state = appReducer(state, completeRep()) // warm-up done
    state = appReducer(state, tickAction(8 * 60, false))
    expect(state.activeSession.currentSetIndex).toBe(2) // pre-set finished on its own
    state = appReducer(state, pauseAction())
    const frozen = appReducer(state, tickAction(500, false))
    expect(frozen).toBe(state)
  })

  it('clears a finished session (Done)', () => {
    let state = appReducer(createInitialState(), startSession({ workout: tuesday(), sessionId: 'a', now: 1 }))
    state = appReducer(state, endSession())
    state = appReducer(state, clearSession())
    expect(state.activeSession).toBeNull()
  })

  it('applies an interval adjustment through the reducer and records it', () => {
    let state = appReducer(createInitialState(), startSession({ workout: tuesday(), sessionId: 'a', now: 1 }))
    const session = sessionAtMainSet()
    const { adjustment } = proposeQuickAdjust(session, { reason: 'intervalTooFast', rpe: 8 })
    state = { ...state, activeSession: session }
    state = appReducer(state, applySessionAdjustment(adjustment))
    expect(state.activeSession.adaptationsApplied).toHaveLength(1)
    expect(getCurrentInterval(state.activeSession)).toBe(180)
  })

  it('full flow: accept the recommendation, then run it as a session', () => {
    const workout = tuesday()
    const request = { ...createDefaultRequest(workout), constraint: CONSTRAINTS.lessTime, availableMinutes: 40, readiness: 3 }
    let state = createInitialState()
    state = appReducer(state, setAdaptationResult(request, recommendWorkout(workout, request)))
    state = appReducer(state, acceptRecommendation())
    state = appReducer(
      state,
      startSession({ workout: state.recommendation.adjustedWorkout, sourceWorkoutId: workout.id, now: 1 }),
    )
    expect(calculateWorkoutYards(state.activeSession.workout)).toBe(2100)
    expect(state.workouts[0].sets[1].repetitions).toBe(8) // saved pre-set untouched
  })
})
