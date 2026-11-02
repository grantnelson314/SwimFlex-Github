import { describe, expect, it } from 'vitest'
import { recommendWorkout } from '../features/adaptation/adaptationEngine.js'
import { CONSTRAINTS, createDefaultRequest } from '../features/adaptation/adaptationRequest.js'
import {
  buildManualRecommendation,
  getBaselineRecommendation,
  pickEditableFields,
  validateManualEdits,
} from '../features/adaptation/manualAdjustment.js'
import { SEED_WORKOUT_IDS, createSeedWorkouts } from '../features/workouts/workoutData.js'
import { calculateWorkoutYards } from '../features/workouts/workoutUtils.js'
import { acceptRecommendation, setAdaptationResult, updateProposedWorkout } from '../state/actions.js'
import { appReducer, createInitialState } from '../state/appReducer.js'

const tuesday = () => createSeedWorkouts().find((w) => w.id === SEED_WORKOUT_IDS.tuesdayThreshold)

function canonicalRecommendation(workout = tuesday()) {
  return recommendWorkout(workout, {
    ...createDefaultRequest(workout),
    constraint: CONSTRAINTS.lessTime,
    availableMinutes: 40,
    readiness: 3,
  })
}

/** Edits pre-filled from a recommendation, like the Manual Adjustment screen does. */
function editsFrom(rec) {
  return {
    sets: rec.adjustedWorkout.sets.map((s) => ({ id: s.id, ...pickEditableFields(s) })),
    prioritySetId: rec.adjustedWorkout.prioritySetId,
  }
}

const withEdit = (edits, setId, patch) => ({
  ...edits,
  sets: edits.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
})

function stateWithProposal() {
  const workout = tuesday()
  const request = { ...createDefaultRequest(workout), constraint: CONSTRAINTS.lessTime, availableMinutes: 40, readiness: 3 }
  return appReducer(createInitialState(), setAdaptationResult(request, recommendWorkout(workout, request)))
}

describe('Manual Adjustment: pre-fill and totals', () => {
  it('pre-fills from the adjusted recommendation (2,100 yd / 40 min)', () => {
    const rec = canonicalRecommendation()
    const edits = editsFrom(rec)
    expect(edits.sets.map((s) => s.repetitions)).toEqual([1, 4, 6, 4, 1])
    expect(edits.prioritySetId).toBe('main-set')
  })

  it('editing reps updates total yards and estimated time', () => {
    const original = tuesday()
    const rec = canonicalRecommendation(original)
    const manual = buildManualRecommendation(original, rec, withEdit(editsFrom(rec), 'pre-set', { repetitions: 6 }))

    expect(manual.adjustedYards).toBe(2200) // 2,100 + 2 × 50
    expect(calculateWorkoutYards(manual.adjustedWorkout)).toBe(2200)
    expect(manual.yardsChanged).toBe(-300)
    expect(manual.adjustedMinutes).toBe(43) // existing time model: 2 reps × 90 s = +3 min
    expect(manual.estimatedMinutesSaved).toBe(9)
    expect(manual.source).toBe('manual')
  })

  it('editing distance and interval also recalculates', () => {
    const original = tuesday()
    const rec = canonicalRecommendation(original)
    const manual = buildManualRecommendation(
      original,
      rec,
      withEdit(withEdit(editsFrom(rec), 'speed', { distancePerRepYards: 50 }), 'main-set', { intervalSeconds: 180 }),
    )
    expect(manual.adjustedYards).toBe(2100 + 4 * 25) // speed 4 × 50 instead of 4 × 25
    const main = manual.adjustedWorkout.sets.find((s) => s.id === 'main-set')
    expect(main.intervalSeconds).toBe(180)
    expect(main.repetitions).toBe(6)
  })

  it('labels each set honestly (increased vs reduced vs interval) and keeps the Priority Set clear', () => {
    const original = tuesday()
    const rec = canonicalRecommendation(original)
    const manual = buildManualRecommendation(
      original,
      rec,
      withEdit(withEdit(editsFrom(rec), 'warmup', { distancePerRepYards: 500 }), 'main-set', { intervalSeconds: 180 }),
    )
    const type = (id) => manual.changes.find((c) => c.originalSetId === id).changeType
    expect(type('warmup')).toBe('increased')
    expect(type('pre-set')).toBe('reduced')
    expect(type('main-set')).toBe('intervalAdjusted')
    expect(type('cool-down')).toBe('unchanged')
    expect(manual.priority.status).toBe('intervalAdjusted')
  })
})

describe('Manual Adjustment: Priority Set', () => {
  it('the swimmer can change the Priority Set (on the proposal only)', () => {
    const original = tuesday()
    const rec = canonicalRecommendation(original)
    const manual = buildManualRecommendation(original, rec, { ...editsFrom(rec), prioritySetId: 'speed' })
    expect(manual.adjustedWorkout.prioritySetId).toBe('speed')
    expect(manual.priority).toMatchObject({ setId: 'speed', status: 'userChanged' })
    expect(original.prioritySetId).toBe('main-set') // saved workout unchanged
  })

  it('can be cleared', () => {
    const original = tuesday()
    const rec = canonicalRecommendation(original)
    const manual = buildManualRecommendation(original, rec, { ...editsFrom(rec), prioritySetId: null })
    expect(manual.priority.status).toBe('none')
  })
})

describe('Manual Adjustment: validation', () => {
  it('rejects invalid values', () => {
    const original = tuesday()
    const rec = canonicalRecommendation(original)
    const base = editsFrom(rec)
    expect(validateManualEdits(base, original)).toEqual([])
    expect(validateManualEdits(withEdit(base, 'pre-set', { repetitions: 0 }), original)).toHaveLength(1)
    expect(validateManualEdits(withEdit(base, 'pre-set', { repetitions: null }), original)).toHaveLength(1)
    expect(validateManualEdits(withEdit(base, 'main-set', { distancePerRepYards: -5 }), original)).toHaveLength(1)
    expect(validateManualEdits(withEdit(base, 'main-set', { intervalSeconds: 3 }), original)).toHaveLength(1)
    expect(validateManualEdits({ ...base, prioritySetId: 'nope' }, original)).toHaveLength(1)
  })

  it('does not require an interval for sets that have none', () => {
    const original = tuesday()
    const rec = canonicalRecommendation(original)
    const edits = withEdit(editsFrom(rec), 'warmup', { intervalSeconds: null })
    expect(validateManualEdits(edits, original)).toEqual([])
  })
})

describe('Manual Adjustment: reset to recommendation', () => {
  it('restores the engine recommendation exactly when edits equal it', () => {
    const original = tuesday()
    const rec = canonicalRecommendation(original)
    const manual = buildManualRecommendation(original, rec, withEdit(editsFrom(rec), 'pre-set', { repetitions: 6 }))
    expect(getBaselineRecommendation(manual)).toEqual(rec)

    const reset = buildManualRecommendation(original, manual, editsFrom(rec))
    expect(reset).toEqual({ ...rec, status: 'proposed' })
    expect(reset.source).toBeUndefined()
    expect(reset.adjustedYards).toBe(2100)
  })

  it('keeps the engine baseline through repeated manual edits', () => {
    const original = tuesday()
    const rec = canonicalRecommendation(original)
    const first = buildManualRecommendation(original, rec, withEdit(editsFrom(rec), 'pre-set', { repetitions: 5 }))
    const second = buildManualRecommendation(original, first, withEdit(editsFrom(rec), 'pre-set', { repetitions: 6 }))
    expect(second.baselineRecommendation).toEqual(rec)
    expect(second.baselineRecommendation.baselineRecommendation).toBeUndefined()
  })
})

describe('Manual Adjustment through the shared state', () => {
  it('Save Changes updates the PROPOSAL, not the saved workout', () => {
    const state = stateWithProposal()
    const savedWorkouts = state.workouts
    const edits = withEdit(editsFrom(state.recommendation), 'pre-set', { repetitions: 6 })
    const next = appReducer(state, updateProposedWorkout(edits))

    expect(next.recommendation.adjustedYards).toBe(2200)
    expect(next.recommendation.status).toBe('proposed')
    expect(next.workouts).toBe(savedWorkouts)
    expect(calculateWorkoutYards(next.workouts[0])).toBe(2500)
    expect(next.workouts[0].sets.find((s) => s.id === 'pre-set').repetitions).toBe(8)
    expect(next.workouts[0].prioritySetId).toBe('main-set')
  })

  it('does not re-run the adaptation engine: later actions keep the manual edits', () => {
    let state = stateWithProposal()
    state = appReducer(state, updateProposedWorkout(withEdit(editsFrom(state.recommendation), 'pre-set', { repetitions: 6 })))
    // Engine alone would say 2,100 yd for these inputs; the manual 2,200 must survive.
    const again = appReducer(state, { type: 'workouts/select', workoutId: 'tuesday-threshold' })
    expect(again.recommendation.adjustedYards).toBe(2200)
    expect(again.recommendation.source).toBe('manual')

    // ...and the manual proposal is what gets accepted.
    const accepted = appReducer(again, acceptRecommendation())
    expect(accepted.recommendation.status).toBe('accepted')
    expect(accepted.recommendation.adjustedWorkout.sets.find((s) => s.id === 'pre-set').repetitions).toBe(6)
  })

  it('ignores invalid edits and edits to an accepted proposal', () => {
    const state = stateWithProposal()
    const bad = withEdit(editsFrom(state.recommendation), 'pre-set', { repetitions: 0 })
    expect(appReducer(state, updateProposedWorkout(bad))).toBe(state)

    const accepted = appReducer(state, acceptRecommendation())
    const good = withEdit(editsFrom(state.recommendation), 'pre-set', { repetitions: 6 })
    expect(appReducer(accepted, updateProposedWorkout(good))).toBe(accepted)
  })
})
