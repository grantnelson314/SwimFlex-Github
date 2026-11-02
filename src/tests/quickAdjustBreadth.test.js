import { describe, expect, it } from 'vitest'
import { QUICK_ADJUST_REASONS, proposeQuickAdjust } from '../features/adaptation/quickAdjust.js'
import {
  defaultAvailableMinutes,
  estimateRemainingMinutes,
  estimateRemainingSeconds,
  proposeRemainingTime,
} from '../features/adaptation/remainingTime.js'
import { SESSION_STATUS } from '../features/session/sessionReducer.js'
import { getCurrentInterval } from '../features/session/sessionSelectors.js'
import {
  WATCH_INPUT_STEP,
  WATCH_READINESS_OPTIONS,
  WATCH_RPE_OPTIONS,
  getWatchTimeOptions,
  proposeWatchQuickAdjust,
} from '../features/watch/watchQuickAdjust.js'
import { SEED_WORKOUT_IDS, createSeedWorkouts } from '../features/workouts/workoutData.js'
import { calculateWorkoutYards, formatSetNotation } from '../features/workouts/workoutUtils.js'
import {
  applySessionAdjustment,
  beginQuickAdjust,
  endQuickAdjust,
  nextSet,
  startSession,
} from '../state/actions.js'
import { appReducer, createInitialState } from '../state/appReducer.js'

const tuesday = () => createSeedWorkouts().find((w) => w.id === SEED_WORKOUT_IDS.tuesdayThreshold)

/** A running session of the ORIGINAL Tuesday Threshold, optionally moved forward `skips` sets. */
function stateAtSet(skips = 0) {
  let state = appReducer(
    createInitialState(),
    startSession({ workout: tuesday(), sourceWorkoutId: SEED_WORKOUT_IDS.tuesdayThreshold, kind: 'original', sessionId: 's1', now: 1 }),
  )
  for (let i = 0; i < skips; i += 1) state = appReducer(state, nextSet())
  return state
}

const session = (state) => state.activeSession
const mainSetState = () => stateAtSet(2) // Warm-up, Pre-set done -> Main set (6 × 200 @ 2:50)
const setById = (s, id) => s.workout.sets.find((x) => x.id === id)

/* ---------- Watch RPE selector (item 1) ---------- */

describe('watch RPE selector: "Too fast" asks for an RPE first', () => {
  it('offers 6, 7, 8, 9 and 10, and Too fast needs the RPE step', () => {
    expect(WATCH_RPE_OPTIONS).toEqual([6, 7, 8, 9, 10])
    expect(WATCH_INPUT_STEP[QUICK_ADJUST_REASONS.intervalTooFast]).toBe('rpe')
  })

  const intervalFor = (rpe) => {
    const result = proposeWatchQuickAdjust(session(mainSetState()), 'intervalTooFast', { rpe })
    return result.type === 'suggestion' ? result.toIntervalSeconds : result
  }

  it('RPE 6 or lower means no change', () => {
    expect(intervalFor(6).type).toBe('noChangeNeeded')
  })

  it('RPE 7 → +5 s, RPE 8 → 2:50 becomes 3:00, RPE 9 → +15 s, RPE 10 → +20 s', () => {
    expect(intervalFor(7)).toBe(175)
    expect(intervalFor(8)).toBe(180)
    expect(intervalFor(9)).toBe(185)
    expect(intervalFor(10)).toBe(190)
  })

  it('uses the same rule as the phone (no duplicated business logic)', () => {
    WATCH_RPE_OPTIONS.forEach((rpe) => {
      const watch = proposeWatchQuickAdjust(session(mainSetState()), 'intervalTooFast', { rpe })
      const phone = proposeQuickAdjust(session(mainSetState()), { reason: 'intervalTooFast', rpe })
      expect(watch).toEqual(phone)
    })
  })

  it('the proposal says which RPE it is based on (nothing is assumed silently)', () => {
    const result = proposeWatchQuickAdjust(session(mainSetState()), 'intervalTooFast', { rpe: 9 })
    expect(result.inputSummary).toBe('RPE 9/10')
    expect(result.rpe).toBe(9)
  })

  it('applying RPE 8 from the watch gives 6 × 200 @ 3:00 for phone and watch', () => {
    let state = mainSetState()
    const result = proposeWatchQuickAdjust(session(state), 'intervalTooFast', { rpe: 8 })
    state = appReducer(state, beginQuickAdjust())
    state = appReducer(state, applySessionAdjustment(result.adjustment))
    state = appReducer(state, endQuickAdjust(true))
    expect(formatSetNotation(setById(session(state), 'main-set'))).toBe('6 × 200 free @ 3:00')
    expect(session(state).workout.sets[2].repetitions).toBe(6)
    expect(session(state).status).toBe(SESSION_STATUS.running)
    expect(session(state).adaptationsApplied).toHaveLength(1)
  })
})

/* ---------- Fatigue during the workout (phone and watch) ---------- */

describe('Quick Adjust: fatigue adds rest to the current set', () => {
  const run = (input) => proposeQuickAdjust(session(mainSetState()), { reason: 'fatigue', ...input })

  it('readiness 3 → +5 s, 2 → +10 s (2:50 → 3:00), 1 → +15 s', () => {
    expect(run({ readiness: 3 }).toIntervalSeconds).toBe(175)
    expect(run({ readiness: 2 }).toIntervalSeconds).toBe(180)
    expect(run({ readiness: 1 }).toIntervalSeconds).toBe(185)
  })

  it('readiness 4–5 needs no change; a very hard RPE counts', () => {
    expect(run({ readiness: 4 }).type).toBe('noChangeNeeded')
    expect(run({ readiness: 5 }).type).toBe('noChangeNeeded')
    expect(run({ readiness: 5, rpe: 9 }).toIntervalSeconds).toBe(175)
  })

  it('keeps all reps and makes no medical claim', () => {
    const result = run({ readiness: 2 })
    expect(result.repetitions).toBe(6)
    expect(result.explanation).toContain('not medical advice')
    expect(result.inputSummary).toBe('Readiness 2/5')
  })

  it('a set without an interval has nothing to adjust', () => {
    const result = proposeQuickAdjust(session(stateAtSet(0)), { reason: 'fatigue', readiness: 2 })
    expect(result.type).toBe('noChangeNeeded')
  })

  it('rejects an invalid readiness', () => {
    expect(run({ readiness: 9 }).type).toBe('invalidRequest')
  })

  it('the watch uses the same rule through a readiness picker', () => {
    expect(WATCH_READINESS_OPTIONS).toEqual([1, 2, 3, 4, 5])
    expect(WATCH_INPUT_STEP[QUICK_ADJUST_REASONS.fatigue]).toBe('readiness')
    const watch = proposeWatchQuickAdjust(session(mainSetState()), 'fatigue', { readiness: 2 })
    expect(watch).toEqual(run({ readiness: 2 }))
  })

  it('applies like any interval adjustment, once', () => {
    let state = mainSetState()
    const { adjustment } = run({ readiness: 2 })
    state = appReducer(state, applySessionAdjustment(adjustment))
    state = appReducer(state, applySessionAdjustment(adjustment))
    expect(getCurrentInterval(session(state))).toBe(180)
    expect(session(state).adaptationsApplied).toHaveLength(1)
  })
})

describe('Quick Adjust: equipment and pool change stay limited, and watch says "review on phone"', () => {
  it('returns limited for both, with a prototype message', () => {
    ;['equipment', 'poolConditions'].forEach((reason) => {
      const result = proposeWatchQuickAdjust(session(mainSetState()), reason)
      expect(result.type).toBe('limited')
      expect(result.message).toContain('Prototype limit')
      expect(WATCH_INPUT_STEP[reason]).toBeUndefined()
    })
  })
})

/* ---------- Running out of time (item 5) ---------- */

describe('Running out of time: only the remaining workout is adapted', () => {
  it('estimates what is left from the current set', () => {
    // Main set (6 × (170 + 30)) + Speed (8 × 65) + Cool-down (300 yd) = 2,020 s
    expect(estimateRemainingSeconds(session(mainSetState()))).toBe(2020)
    expect(estimateRemainingMinutes(session(mainSetState()))).toBe(34)
    expect(defaultAvailableMinutes(session(mainSetState()))).toBe(20)
  })

  it('30 minutes left from the main set trims Speed and keeps everything else', () => {
    const result = proposeRemainingTime(session(mainSetState()), 30)
    expect(result.type).toBe('remainingSuggestion')
    expect(result.changes.map((c) => c.setId)).toEqual(['speed'])
    expect(result.changes[0].before).toBe('8 × 25 fast @ :35')
    expect(result.changes[0].after).toBe('4 × 25 fast @ :35')
    expect(result.remainingMinutesAfter).toBeLessThanOrEqual(30)
    expect(result.rationale.join(' ')).toContain('Only the sets after Main set were changed')
  })

  it('never rewrites the current set, finished sets, or a Priority Set that is ahead', () => {
    // From the warm-up: the Priority Set (main) is still ahead and must stay as planned.
    const early = proposeRemainingTime(session(stateAtSet(0)), 45)
    expect(early.type).toBe('remainingSuggestion')
    expect(early.changes.map((c) => c.setId)).not.toContain('main-set')
    expect(early.changes.map((c) => c.setId)).not.toContain('warmup')
    expect(early.rationale.join(' ')).toContain('Priority Set preserved')

    // From the main set: warm-up, pre-set and the main set itself are never listed.
    const later = proposeRemainingTime(session(mainSetState()), 30)
    later.changes.forEach((c) => expect(['warmup', 'pre-set', 'main-set']).not.toContain(c.setId))
  })

  it('applies to the session only, once, and never to a set that has already started', () => {
    let state = mainSetState()
    const before = JSON.stringify(state.workouts)
    const { adjustment } = proposeRemainingTime(session(state), 30)

    state = appReducer(state, applySessionAdjustment(adjustment))
    expect(formatSetNotation(setById(session(state), 'speed'))).toBe('4 × 25 fast @ :35')
    expect(formatSetNotation(setById(session(state), 'main-set'))).toBe('6 × 200 free @ 2:50')
    expect(calculateWorkoutYards(session(state).workout)).toBe(2400)
    expect(session(state).adaptationsApplied).toHaveLength(1)
    expect(session(state).adaptationsApplied[0].type).toBe('remainingReduced')
    expect(JSON.stringify(state.workouts)).toBe(before) // saved workout untouched

    // A repeated apply is ignored.
    state = appReducer(state, applySessionAdjustment(adjustment))
    expect(session(state).adaptationsApplied).toHaveLength(1)

    // A proposal made earlier cannot rewrite a set the swimmer has since started.
    let later = mainSetState()
    const stale = proposeRemainingTime(session(later), 30).adjustment
    later = appReducer(later, nextSet()) // now swimming Speed
    later = appReducer(later, applySessionAdjustment(stale))
    expect(setById(session(later), 'speed').repetitions).toBe(8)
    expect(session(later).adaptationsApplied).toHaveLength(0)
  })

  it('explains when the time is too short for the Priority Set', () => {
    const result = proposeRemainingTime(session(mainSetState()), 15)
    expect(result.type).toBe('impossibleTimeTarget')
    expect(result.message).toContain('too short')
    expect(result.minimumMinutes).toBeGreaterThan(15)
  })

  it('no change when the time already fits, or when there is nothing later to shorten', () => {
    expect(proposeRemainingTime(session(mainSetState()), 60).type).toBe('noChangeNeeded')
    expect(proposeRemainingTime(session(stateAtSet(4)), 1).type).toBe('noChangeNeeded')
  })

  it('validates the minutes', () => {
    expect(proposeRemainingTime(session(mainSetState()), 0).type).toBe('invalidRequest')
    expect(proposeRemainingTime(session(mainSetState()), 12.5).type).toBe('invalidRequest')
  })

  it('goes through Quick Adjust (phone) and the watch with the same result', () => {
    const phone = proposeQuickAdjust(session(mainSetState()), { reason: 'runningOutOfTime', availableMinutes: 30 })
    const watch = proposeWatchQuickAdjust(session(mainSetState()), 'runningOutOfTime', { availableMinutes: 30 })
    expect(watch).toEqual(phone)
    expect(watch.changes[0].short).toBe('Speed 8 → 4 reps')
  })

  it('the watch offers only times shorter than what is left', () => {
    const options = getWatchTimeOptions(session(mainSetState()))
    expect(options.length).toBeGreaterThan(0)
    expect(options.length).toBeLessThanOrEqual(4)
    options.forEach((m) => expect(m).toBeLessThan(34))
  })
})
