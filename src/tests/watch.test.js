import { describe, expect, it } from 'vitest'
import { recommendWorkout } from '../features/adaptation/adaptationEngine.js'
import { CONSTRAINTS, createDefaultRequest } from '../features/adaptation/adaptationRequest.js'
import { SESSION_STATUS } from '../features/session/sessionReducer.js'
import { getCurrentInterval } from '../features/session/sessionSelectors.js'
import {
  WATCH_ASSUMED_RPE,
  WATCH_QUICK_ADJUST_OPTIONS,
  proposeWatchQuickAdjust,
} from '../features/watch/watchQuickAdjust.js'
import {
  WATCH_SCREENS,
  formatWatchSetTitle,
  selectWatchComplete,
  selectWatchPaused,
  selectWatchPool,
  selectWatchReady,
  selectWatchScreen,
} from '../features/watch/watchSelectors.js'
import { SEED_WORKOUT_IDS, createSeedWorkouts } from '../features/workouts/workoutData.js'
import { calculateWorkoutYards } from '../features/workouts/workoutUtils.js'
import {
  acceptRecommendation,
  applySessionAdjustment,
  beginQuickAdjust,
  beginSession,
  clearSession,
  completeRep,
  endQuickAdjust,
  endSession,
  nextSet,
  pauseSession,
  resumeSession,
  setAdaptationResult,
  setWatchConnected,
  setWatchVisible,
  startSession,
  tickSession,
} from '../state/actions.js'
import { appReducer, createInitialState } from '../state/appReducer.js'

const tuesday = () => createSeedWorkouts().find((w) => w.id === SEED_WORKOUT_IDS.tuesdayThreshold)

/** The state after the swimmer tapped "Use Adjusted Workout" on the phone (2,100 yd / 40 min). */
function stateWithAcceptedWorkout() {
  const workout = tuesday()
  const request = { ...createDefaultRequest(workout), constraint: CONSTRAINTS.lessTime, availableMinutes: 40, readiness: 3 }
  let state = appReducer(createInitialState(), setAdaptationResult(request, recommendWorkout(workout, request)))
  return appReducer(state, acceptRecommendation())
}

/** What pressing Start on the watch does (the same action creator the watch dispatches). */
function startFromWatch(state) {
  const ready = selectWatchReady(state)
  return ready.startsWith === 'session'
    ? appReducer(state, beginSession())
    : appReducer(
        state,
        startSession({ workout: ready.workout, sourceWorkoutId: ready.sourceWorkoutId, kind: 'adjusted', sessionId: 'w1', now: 1 }),
      )
}

const toMainSet = (state) => appReducer(appReducer(state, nextSet()), nextSet())
const session = (state) => state.activeSession

describe('watch reads the shared state', () => {
  it('shows nothing before any workout is accepted', () => {
    expect(selectWatchScreen(createInitialState())).toBe(WATCH_SCREENS.none)
    expect(selectWatchReady(createInitialState())).toBeNull()
  })

  it('Workout Ready: the accepted adjusted workout', () => {
    const state = stateWithAcceptedWorkout()
    expect(selectWatchScreen(state)).toBe(WATCH_SCREENS.ready)
    const ready = selectWatchReady(state)
    expect(ready).toMatchObject({ name: 'Tuesday Threshold', yards: 2100, minutes: 40, focus: 'THRESHOLD' })
  })

  it('does not offer Ready for a proposal that has not been accepted', () => {
    const workout = tuesday()
    const request = { ...createDefaultRequest(workout), constraint: CONSTRAINTS.lessTime }
    const state = appReducer(createInitialState(), setAdaptationResult(request, recommendWorkout(workout, request)))
    expect(selectWatchScreen(state)).toBe(WATCH_SCREENS.none)
  })

  it('Pool Mode: reads the current set, rep, interval and countdown from the active session', () => {
    const state = toMainSet(startFromWatch(stateWithAcceptedWorkout()))
    expect(selectWatchScreen(state)).toBe(WATCH_SCREENS.pool)
    expect(selectWatchPool(session(state))).toMatchObject({
      label: 'MAIN SET',
      showReps: true,
      repText: 'REP 1 OF 6',
      title: '200 FREE',
      timed: true,
      intervalSeconds: 170,
      countdownSeconds: 170,
    })
  })

  it('formats compact set titles', () => {
    const sets = tuesday().sets
    expect(formatWatchSetTitle(sets.find((s) => s.id === 'main-set'))).toBe('200 FREE')
    expect(formatWatchSetTitle(sets.find((s) => s.id === 'pre-set'))).toBe('50 DRILL/SWIM')
    expect(formatWatchSetTitle(sets.find((s) => s.id === 'speed'))).toBe('25 FAST')
    expect(formatWatchSetTitle(sets.find((s) => s.id === 'warmup'))).toBe('400 EASY CHOICE')
  })
})

describe('watch Start uses the shared session', () => {
  it('creates the same active session the phone would, from the adjusted workout', () => {
    const state = startFromWatch(stateWithAcceptedWorkout())
    expect(session(state).status).toBe(SESSION_STATUS.running)
    expect(session(state).workoutKind).toBe('adjusted')
    expect(session(state).sourceWorkoutId).toBe('tuesday-threshold')
    expect(calculateWorkoutYards(session(state).workout)).toBe(2100)
    expect(calculateWorkoutYards(state.workouts[0])).toBe(2500) // saved workout untouched
  })

  it('Workout Ready is no longer offered once the session exists (or after it finishes)', () => {
    let state = startFromWatch(stateWithAcceptedWorkout())
    expect(selectWatchReady(state)).toBeNull()
    expect(state.recommendation.status).toBe('started')

    state = appReducer(state, endSession())
    state = appReducer(state, clearSession())
    expect(selectWatchScreen(state)).toBe(WATCH_SCREENS.none) // not "Ready" again for the same workout
  })

  it('shows Pool Mode instead of Ready when a session is already active', () => {
    let state = appReducer(stateWithAcceptedWorkout(), startSession({ workout: tuesday(), sessionId: 'p1', now: 1 }))
    expect(selectWatchScreen(state)).toBe(WATCH_SCREENS.pool)
  })

  it('a session created but not begun shows Ready, and Start begins that same session', () => {
    let state = appReducer(
      createInitialState(),
      startSession({ workout: tuesday(), sessionId: 'r1', autoStart: false, now: 1 }),
    )
    expect(selectWatchScreen(state)).toBe(WATCH_SCREENS.ready)
    expect(selectWatchReady(state).startsWith).toBe('session')
    state = startFromWatch(state)
    expect(session(state).sessionId).toBe('r1')
    expect(session(state).status).toBe(SESSION_STATUS.running)
  })
})

describe('watch pause / resume update the shared session', () => {
  it('Pause from the watch pauses the one shared session; the phone reads the same status', () => {
    let state = toMainSet(startFromWatch(stateWithAcceptedWorkout()))
    state = appReducer(state, pauseSession())
    expect(session(state).status).toBe(SESSION_STATUS.paused) // what phone Pool Mode renders
    expect(selectWatchScreen(state)).toBe(WATCH_SCREENS.paused)
    expect(selectWatchPaused(session(state))).toEqual({ setName: 'Main set', showReps: true, repText: 'Rep 1 of 6' })
  })

  it('Resume from the watch resumes the same session', () => {
    let state = toMainSet(startFromWatch(stateWithAcceptedWorkout()))
    const id = session(state).sessionId
    state = appReducer(appReducer(state, pauseSession()), resumeSession())
    expect(session(state).status).toBe(SESSION_STATUS.running)
    expect(session(state).sessionId).toBe(id)
    expect(selectWatchScreen(state)).toBe(WATCH_SCREENS.pool)
  })

  it('a pause made on the phone shows on the watch (same state)', () => {
    let state = startFromWatch(stateWithAcceptedWorkout())
    state = appReducer(state, pauseSession()) // the phone's Pause dispatches this same action
    expect(selectWatchScreen(state)).toBe(WATCH_SCREENS.paused)
  })

  it('the paused watch does not advance while the shared clock ticks', () => {
    let state = toMainSet(startFromWatch(stateWithAcceptedWorkout()))
    state = appReducer(state, pauseSession())
    const frozen = appReducer(state, tickSession(500, false))
    expect(frozen).toBe(state)
  })
})

describe('phone progression appears on the watch', () => {
  it('rep progression from the shared clock updates the watch immediately', () => {
    let state = toMainSet(startFromWatch(stateWithAcceptedWorkout()))
    state = appReducer(state, tickSession(100, false))
    expect(selectWatchPool(session(state))).toMatchObject({ repText: 'REP 1 OF 6', countdownSeconds: 70 })

    state = appReducer(state, tickSession(70, false)) // send-off
    expect(selectWatchPool(session(state))).toMatchObject({ repText: 'REP 2 OF 6', countdownSeconds: 170 })
  })

  it('demo timing flows through: 8 real seconds advances a 2:50 rep on the watch', () => {
    let state = toMainSet(startFromWatch(stateWithAcceptedWorkout()))
    state = appReducer(state, tickSession(8, true))
    expect(selectWatchPool(session(state)).repText).toBe('REP 2 OF 6')
    expect(selectWatchPool(session(state)).intervalSeconds).toBe(170) // still displays the real interval
  })

  it('set progression updates the watch', () => {
    let state = toMainSet(startFromWatch(stateWithAcceptedWorkout()))
    state = appReducer(state, tickSession(6 * 170, false))
    expect(selectWatchPool(session(state))).toMatchObject({ label: 'SPEED', title: '25 FAST', repText: 'REP 1 OF 4' })
  })

  it('a set without an interval is manual on the watch too', () => {
    let state = startFromWatch(stateWithAcceptedWorkout()) // warm-up
    const model = selectWatchPool(session(state))
    expect(model).toMatchObject({ label: 'WARM-UP', timed: false, showReps: false, intervalSeconds: null })
    state = appReducer(state, completeRep())
    expect(selectWatchPool(session(state)).label).toBe('PRE-SET')
  })

  it('Start on the phone is picked up by the watch (no separate start needed)', () => {
    const state = appReducer(
      stateWithAcceptedWorkout(),
      startSession({ workout: tuesday(), sessionId: 'phone', now: 1 }),
    )
    expect(selectWatchScreen(state)).toBe(WATCH_SCREENS.pool)
  })
})

describe('watch Quick Adjust', () => {
  const options = WATCH_QUICK_ADJUST_OPTIONS.map((o) => o.label)

  it('offers the six short choices', () => {
    expect(options).toEqual(['Too fast', 'Fatigued', 'Less time', 'Equipment', 'Pool change', 'Pain/injury'])
  })

  it('Too fast reuses the existing rule: @ 2:50 -> @ 3:00, keep 6 reps', () => {
    const state = toMainSet(startFromWatch(stateWithAcceptedWorkout()))
    const result = proposeWatchQuickAdjust(session(state), 'intervalTooFast')
    expect(result.type).toBe('suggestion')
    expect(result).toMatchObject({
      fromIntervalSeconds: 170,
      toIntervalSeconds: 180,
      repetitions: 6,
      before: '6 × 200 free @ 2:50',
      after: '6 × 200 free @ 3:00',
    })
    expect(result.adjustment.rpe).toBe(WATCH_ASSUMED_RPE)
    expect(WATCH_ASSUMED_RPE).toBe(8)
  })

  it('Apply updates the shared session (phone and watch), once, and resumes it', () => {
    let state = toMainSet(startFromWatch(stateWithAcceptedWorkout()))
    state = appReducer(state, tickSession(60, false))

    state = appReducer(state, beginQuickAdjust()) // opening the watch Adjust flow
    expect(session(state).status).toBe(SESSION_STATUS.paused)

    const { adjustment } = proposeWatchQuickAdjust(session(state), 'intervalTooFast')
    state = appReducer(state, applySessionAdjustment(adjustment))
    state = appReducer(state, endQuickAdjust(true))

    expect(session(state).status).toBe(SESSION_STATUS.running)
    expect(getCurrentInterval(session(state))).toBe(180)
    expect(selectWatchPool(session(state))).toMatchObject({ intervalSeconds: 180, repText: 'REP 1 OF 6' })
    expect(session(state).workout.sets.find((s) => s.id === 'main-set').repetitions).toBe(6)
    expect(session(state).adaptationsApplied).toHaveLength(1)
    expect(state.workouts[0].sets.find((s) => s.id === 'main-set').intervalSeconds).toBe(170) // saved
  })

  it('the adjustment is not duplicated by a repeated Apply', () => {
    let state = toMainSet(startFromWatch(stateWithAcceptedWorkout()))
    const { adjustment } = proposeWatchQuickAdjust(session(state), 'intervalTooFast')
    state = appReducer(state, applySessionAdjustment(adjustment))
    state = appReducer(state, applySessionAdjustment(adjustment))
    expect(session(state).adaptationsApplied).toHaveLength(1)
    expect(getCurrentInterval(session(state))).toBe(180)
  })

  it('later reps use @ 3:00 after Apply', () => {
    let state = toMainSet(startFromWatch(stateWithAcceptedWorkout()))
    const { adjustment } = proposeWatchQuickAdjust(session(state), 'intervalTooFast')
    state = appReducer(state, applySessionAdjustment(adjustment))
    state = appReducer(state, tickSession(180, false))
    expect(selectWatchPool(session(state))).toMatchObject({ repText: 'REP 2 OF 6', countdownSeconds: 180 })
  })

  it('Keep makes no interval change and resumes', () => {
    let state = toMainSet(startFromWatch(stateWithAcceptedWorkout()))
    state = appReducer(state, beginQuickAdjust())
    state = appReducer(state, endQuickAdjust(true))
    expect(getCurrentInterval(session(state))).toBe(170)
    expect(session(state).adaptationsApplied).toHaveLength(0)
    expect(session(state).status).toBe(SESSION_STATUS.running)
  })

  it('Keep leaves a session that was already paused paused', () => {
    let state = toMainSet(startFromWatch(stateWithAcceptedWorkout()))
    state = appReducer(state, pauseSession())
    state = appReducer(state, beginQuickAdjust())
    state = appReducer(state, endQuickAdjust(true))
    expect(session(state).status).toBe(SESSION_STATUS.paused)
  })

  it('Pain/injury routes to the safety state: no adjustment, session stays paused', () => {
    let state = toMainSet(startFromWatch(stateWithAcceptedWorkout()))
    state = appReducer(state, beginQuickAdjust())
    const result = proposeWatchQuickAdjust(session(state), 'painOrInjury')
    expect(result.type).toBe('safetyBoundary')
    expect(result.adjustment).toBeUndefined()

    state = appReducer(state, endQuickAdjust(false)) // what the watch does before showing the safety screen
    expect(session(state).status).toBe(SESSION_STATUS.paused)
    expect(session(state).adaptationsApplied).toHaveLength(0)

    state = appReducer(state, endQuickAdjust(true)) // leaving the flow ("Back") must not resume it
    expect(session(state).status).toBe(SESSION_STATUS.paused)
    expect(selectWatchScreen(state)).toBe(WATCH_SCREENS.paused)
  })

  it('Safety End Workout ends the shared session', () => {
    let state = toMainSet(startFromWatch(stateWithAcceptedWorkout()))
    state = appReducer(state, beginQuickAdjust())
    state = appReducer(state, endQuickAdjust(false))
    state = appReducer(state, endSession())
    expect(session(state).status).toBe(SESSION_STATUS.ended) // the phone redirects to its complete screen
    expect(selectWatchScreen(state)).toBe(WATCH_SCREENS.complete)
  })

  it('other options point to the phone instead of inventing advice', () => {
    const state = toMainSet(startFromWatch(stateWithAcceptedWorkout()))
    for (const reason of ['fatigue', 'runningOutOfTime', 'equipment', 'poolConditions']) {
      const result = proposeWatchQuickAdjust(session(state), reason)
      expect(result.type).toBe('limited')
      expect(result.adjustment).toBeUndefined()
    }
  })
})

describe('watch completion', () => {
  function finishedState() {
    let state = startFromWatch(stateWithAcceptedWorkout())
    state = appReducer(state, completeRep()) // warm-up
    state = appReducer(state, tickSession(4 * 60 + 6 * 170 + 4 * 35, false)) // pre-set, main, speed
    return appReducer(state, completeRep()) // cool-down
  }

  it('a completed shared session produces the watch completion state', () => {
    const state = finishedState()
    expect(session(state).status).toBe(SESSION_STATUS.completed)
    expect(selectWatchScreen(state)).toBe(WATCH_SCREENS.complete)
    const model = selectWatchComplete(session(state))
    expect(model).toMatchObject({ ended: false, yards: 2100, adjustments: 0 })
    expect(model.elapsedSeconds).toBeGreaterThan(0)
  })

  it('counts in-workout adjustments', () => {
    let state = toMainSet(startFromWatch(stateWithAcceptedWorkout()))
    const { adjustment } = proposeWatchQuickAdjust(session(state), 'intervalTooFast')
    state = appReducer(state, applySessionAdjustment(adjustment))
    state = appReducer(state, endSession())
    expect(selectWatchComplete(session(state))).toMatchObject({ ended: true, adjustments: 1 })
  })

  it('Done clears the shared session for both phone and watch', () => {
    let state = appReducer(finishedState(), clearSession())
    expect(state.activeSession).toBeNull()
    expect(selectWatchScreen(state)).toBe(WATCH_SCREENS.none)
  })
})

describe('watch panel visibility and connection indicator', () => {
  it('toggles visibility without touching workout state', () => {
    const state = startFromWatch(stateWithAcceptedWorkout())
    const shown = appReducer(state, setWatchVisible(true))
    expect(shown.watch.visible).toBe(true)
    expect(shown.activeSession).toBe(state.activeSession)
    expect(appReducer(shown, setWatchVisible(true))).toBe(shown)
    expect(appReducer(shown, setWatchVisible(false)).watch.visible).toBe(false)
  })

  it('has a simple connected flag (default connected)', () => {
    const state = createInitialState()
    expect(state.watch.connected).toBe(true)
    expect(appReducer(state, setWatchConnected(false)).watch.connected).toBe(false)
  })
})
