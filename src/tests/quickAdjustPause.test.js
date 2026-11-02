import { describe, expect, it } from 'vitest'
import { proposeQuickAdjust } from '../features/adaptation/quickAdjust.js'
import {
  SESSION_STATUS,
  applyIntervalAdjustment,
  beginQuickAdjust,
  createSession,
  endQuickAdjust,
  endSession,
  pauseSession,
  resumeSession,
  skipToNextSet,
  tickSession,
} from '../features/session/sessionReducer.js'
import { getCountdownSeconds, getCurrentInterval, getCurrentSet } from '../features/session/sessionSelectors.js'
import { SEED_WORKOUT_IDS, createSeedWorkouts } from '../features/workouts/workoutData.js'
import {
  applySessionAdjustment,
  beginQuickAdjust as beginQuickAdjustAction,
  endQuickAdjust as endQuickAdjustAction,
  pauseSession as pauseAction,
  resumeSession as resumeAction,
  startSession,
  tickSession as tickAction,
} from '../state/actions.js'
import { appReducer, createInitialState } from '../state/appReducer.js'

const tuesday = () => createSeedWorkouts().find((w) => w.id === SEED_WORKOUT_IDS.tuesdayThreshold)
const REAL = { demoMode: false }

/** Running session on the main set (6 × 200 @ 2:50), 60 s into rep 1. */
function runningAtMainSet() {
  let s = createSession(tuesday(), { sessionId: 's1', now: 1 })
  s = skipToNextSet(skipToNextSet(s))
  return tickSession(s, 60, REAL)
}

const suggestion = (s) => proposeQuickAdjust(s, { reason: 'intervalTooFast', rpe: 8 })

describe('Quick Adjust pauses progression', () => {
  it('pauses a running session and preserves set, rep, countdown and elapsed time', () => {
    const before = runningAtMainSet()
    const held = beginQuickAdjust(before)

    expect(held.status).toBe(SESSION_STATUS.paused)
    expect(held.quickAdjustHold).toBe(true)
    expect(held.currentSetIndex).toBe(before.currentSetIndex)
    expect(held.currentRepIndex).toBe(before.currentRepIndex)
    expect(held.remainingIntervalSeconds).toBe(before.remainingIntervalSeconds)
    expect(held.totalElapsedSeconds).toBe(before.totalElapsedSeconds)
    expect(getCountdownSeconds(held)).toBe(110)
  })

  it('nothing advances while Quick Adjust is open', () => {
    const held = beginQuickAdjust(runningAtMainSet())
    const later = tickSession(held, 1000, REAL)
    expect(later).toBe(held)
    expect(getCountdownSeconds(later)).toBe(110)
    expect(later.currentRepIndex).toBe(0)
  })

  it('only holds a RUNNING session (ready and finished sessions are untouched)', () => {
    const ready = createSession(tuesday(), { autoStart: false })
    expect(beginQuickAdjust(ready)).toBe(ready)
    const ended = endSession(runningAtMainSet())
    expect(beginQuickAdjust(ended)).toBe(ended)
  })
})

describe('leaving Quick Adjust resumes a session it paused', () => {
  it('Apply & Continue: applies 2:50 -> 3:00, then resumes where it left off', () => {
    let s = beginQuickAdjust(runningAtMainSet())
    s = applyIntervalAdjustment(s, suggestion(s).adjustment)
    s = endQuickAdjust(s, { resume: true })

    expect(s.status).toBe(SESSION_STATUS.running)
    expect(s.quickAdjustHold).toBe(false)
    expect(getCurrentInterval(s)).toBe(180)
    expect(getCurrentSet(s).repetitions).toBe(6)
    expect(s.adaptationsApplied).toHaveLength(1)
    expect(s.currentRepIndex).toBe(0)
    expect(getCountdownSeconds(s)).toBe(120) // 110 s left + the 10 s added

    expect(getCountdownSeconds(tickSession(s, 20, REAL))).toBe(100) // and it counts down again
  })

  it('Keep Current Set: no change, then resumes', () => {
    const before = runningAtMainSet()
    let s = beginQuickAdjust(before)
    s = endQuickAdjust(s, { resume: true })

    expect(s.status).toBe(SESSION_STATUS.running)
    expect(getCurrentInterval(s)).toBe(170)
    expect(s.adaptationsApplied).toHaveLength(0)
    expect(getCountdownSeconds(s)).toBe(getCountdownSeconds(before))
  })
})

describe('a session that was already paused stays paused', () => {
  it('begin does not set the hold, so leaving does not resume', () => {
    let s = pauseSession(runningAtMainSet())
    s = beginQuickAdjust(s)
    expect(s.status).toBe(SESSION_STATUS.paused)
    expect(s.quickAdjustHold).toBeFalsy()

    s = applyIntervalAdjustment(s, suggestion(s).adjustment)
    s = endQuickAdjust(s, { resume: true })
    expect(s.status).toBe(SESSION_STATUS.paused)
    expect(getCurrentInterval(s)).toBe(180) // the adjustment itself still applied
  })

  it('Keep on an already-paused session also leaves it paused', () => {
    let s = pauseSession(runningAtMainSet())
    s = endQuickAdjust(beginQuickAdjust(s), { resume: true })
    expect(s.status).toBe(SESSION_STATUS.paused)
  })
})

describe('Pain / injury keeps the session paused', () => {
  it('clears the hold without resuming', () => {
    let s = beginQuickAdjust(runningAtMainSet())
    expect(proposeQuickAdjust(s, { reason: 'painOrInjury' }).type).toBe('safetyBoundary')
    s = endQuickAdjust(s, { resume: false })

    expect(s.status).toBe(SESSION_STATUS.paused)
    expect(s.quickAdjustHold).toBe(false)
    expect(s.adaptationsApplied).toHaveLength(0)
  })

  it('a later cleanup (leaving the Quick Adjust screen) cannot resume it', () => {
    let s = endQuickAdjust(beginQuickAdjust(runningAtMainSet()), { resume: false })
    s = endQuickAdjust(s, { resume: true }) // what useQuickAdjustHold's cleanup dispatches
    expect(s.status).toBe(SESSION_STATUS.paused)
  })
})

describe('hold edge cases', () => {
  it('a duplicate end never resumes a session the swimmer paused afterwards', () => {
    let s = endQuickAdjust(beginQuickAdjust(runningAtMainSet()), { resume: true })
    expect(s.status).toBe(SESSION_STATUS.running)
    s = pauseSession(s)
    s = endQuickAdjust(s, { resume: true })
    expect(s.status).toBe(SESSION_STATUS.paused)
  })

  it('an explicit Resume (e.g. from the other device) takes over the hold', () => {
    let s = beginQuickAdjust(runningAtMainSet())
    s = resumeSession(s)
    expect(s.status).toBe(SESSION_STATUS.running)
    expect(s.quickAdjustHold).toBe(false)
    s = endQuickAdjust(s, { resume: true })
    expect(s.status).toBe(SESSION_STATUS.running)
  })

  it('ending the workout during Quick Adjust clears the hold', () => {
    const s = endSession(beginQuickAdjust(runningAtMainSet()))
    expect(s.status).toBe(SESSION_STATUS.ended)
    expect(s.quickAdjustHold).toBe(false)
  })

  it('an adjustment is recorded once even if applied twice', () => {
    let s = beginQuickAdjust(runningAtMainSet())
    const { adjustment } = suggestion(s)
    s = applyIntervalAdjustment(s, adjustment)
    const again = applyIntervalAdjustment(s, adjustment)
    expect(again).toBe(s)
    expect(again.adaptationsApplied).toHaveLength(1)
    expect(getCurrentInterval(again)).toBe(180)
  })
})

describe('through the shared app state', () => {
  function appAtMainSet() {
    let state = appReducer(createInitialState(), startSession({ workout: tuesday(), sessionId: 's1', now: 1 }))
    state = { ...state, activeSession: runningAtMainSet() }
    return state
  }

  it('begin -> apply -> end resumes and updates the interval', () => {
    let state = appAtMainSet()
    state = appReducer(state, beginQuickAdjustAction())
    expect(state.activeSession.status).toBe('paused')
    state = appReducer(state, tickAction(500, false))
    expect(state.activeSession.currentRepIndex).toBe(0) // frozen

    const { adjustment } = suggestion(state.activeSession)
    state = appReducer(state, applySessionAdjustment(adjustment))
    state = appReducer(state, endQuickAdjustAction(true))
    expect(state.activeSession.status).toBe('running')
    expect(getCurrentInterval(state.activeSession)).toBe(180)
    expect(state.activeSession.adaptationsApplied).toHaveLength(1)
  })

  it('pause before Quick Adjust stays paused after it', () => {
    let state = appReducer(appAtMainSet(), pauseAction())
    state = appReducer(state, beginQuickAdjustAction())
    state = appReducer(state, endQuickAdjustAction(true))
    expect(state.activeSession.status).toBe('paused')
  })

  it('the Safety Boundary path (end with resume false) stays paused; Resume then works', () => {
    let state = appReducer(appAtMainSet(), beginQuickAdjustAction())
    state = appReducer(state, endQuickAdjustAction(false))
    state = appReducer(state, endQuickAdjustAction(true))
    expect(state.activeSession.status).toBe('paused')
    state = appReducer(state, resumeAction())
    expect(state.activeSession.status).toBe('running')
  })

  it('ignores Quick Adjust actions when there is no session', () => {
    const state = createInitialState()
    expect(appReducer(state, beginQuickAdjustAction())).toBe(state)
    expect(appReducer(state, endQuickAdjustAction(true))).toBe(state)
  })
})
