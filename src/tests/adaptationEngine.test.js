import { describe, expect, it } from 'vitest'
import { RESULT_TYPES, isConstraintSupported, recommendWorkout } from '../features/adaptation/adaptationEngine.js'
import {
  CONSTRAINTS,
  createDefaultRequest,
  validateAdaptationRequest,
} from '../features/adaptation/adaptationRequest.js'
import { intervalBumpForRpe } from '../features/adaptation/adaptationRules.js'
import { SEED_WORKOUT_IDS, createSeedWorkouts } from '../features/workouts/workoutData.js'
import {
  areSetsEqual,
  calculateWorkoutYards,
  formatSetNotation,
} from '../features/workouts/workoutUtils.js'

const seed = (id) => createSeedWorkouts().find((w) => w.id === id)
const tuesday = () => seed(SEED_WORKOUT_IDS.tuesdayThreshold)

function lessTimeRequest(workout, overrides = {}) {
  return {
    ...createDefaultRequest(workout),
    constraint: CONSTRAINTS.lessTime,
    availableMinutes: 40,
    readiness: 3,
    ...overrides,
  }
}

function difficultyRequest(workout, overrides = {}) {
  return {
    ...createDefaultRequest(workout),
    constraint: CONSTRAINTS.workoutTooDifficult,
    rpe: 8,
    targetSetId: 'main-set',
    ...overrides,
  }
}

const changeFor = (rec, setId) => rec.changes.find((c) => c.originalSetId === setId)
const adjustedSet = (rec, setId) => rec.adjustedWorkout.sets.find((s) => s.id === setId)

describe('canonical Less Time (M3): Tuesday Threshold, 40 min, readiness 3', () => {
  const workout = tuesday()
  const rec = recommendWorkout(workout, lessTimeRequest(workout))

  it('returns a recommendation', () => {
    expect(rec.type).toBe(RESULT_TYPES.recommendation)
    expect(rec.status).toBe('proposed')
  })

  it('2,500 yd -> 2,100 yd', () => {
    expect(rec.originalYards).toBe(2500)
    expect(rec.adjustedYards).toBe(2100)
    expect(calculateWorkoutYards(rec.adjustedWorkout)).toBe(2100)
    expect(rec.yardsChanged).toBe(-400)
  })

  it('52 min -> 40 min, 12 min saved', () => {
    expect(rec.originalMinutes).toBe(52)
    expect(rec.adjustedMinutes).toBe(40)
    expect(rec.adjustedWorkout.estimatedDurationMinutes).toBe(40)
    expect(rec.estimatedMinutesSaved).toBe(12)
  })

  it('applies exactly the M3 set changes', () => {
    expect(adjustedSet(rec, 'warmup').distancePerRepYards).toBe(300)
    expect(adjustedSet(rec, 'warmup').repetitions).toBe(1)
    expect(formatSetNotation(adjustedSet(rec, 'pre-set'))).toBe('4 × 50 drill/swim @ 1:00')
    expect(formatSetNotation(adjustedSet(rec, 'main-set'))).toBe('6 × 200 free @ 2:50')
    expect(formatSetNotation(adjustedSet(rec, 'speed'))).toBe('4 × 25 fast @ :35')
    expect(adjustedSet(rec, 'cool-down').distancePerRepYards).toBe(300)
  })

  it('labels each set Reduced / Preserved / Unchanged', () => {
    expect(changeFor(rec, 'warmup').changeType).toBe('reduced')
    expect(changeFor(rec, 'pre-set').changeType).toBe('reduced')
    expect(changeFor(rec, 'main-set').changeType).toBe('preserved')
    expect(changeFor(rec, 'speed').changeType).toBe('reduced')
    expect(changeFor(rec, 'cool-down').changeType).toBe('unchanged')
  })

  it('uses the exact M3 explanation', () => {
    expect(rec.explanation).toBe(
      'Your priority threshold set is preserved. Supporting volume was reduced to save 12 minutes without changing the primary training stimulus.',
    )
  })

  it('"How SwimFlex decided" covers the five required points', () => {
    const text = rec.rationale.join('\n')
    expect(text).toMatch(/Priority Set preserved/)
    expect(text).toMatch(/12 minutes needed to be removed/)
    expect(text).toMatch(/Lower-priority supporting volume was reduced first/)
    expect(text).toMatch(/Cool-down retained/)
    expect(text).toMatch(/Threshold main set unchanged/)
  })

  it('does not require extra review and does not mutate the source workout', () => {
    expect(rec.requiresUserReview).toBe(false)
    expect(calculateWorkoutYards(workout)).toBe(2500)
    expect(workout.estimatedDurationMinutes).toBe(52)
  })

  it('is deterministic', () => {
    const again = recommendWorkout(workout, lessTimeRequest(workout))
    expect(again).toEqual(rec)
  })
})

describe('Priority Set preservation', () => {
  it('keeps the Priority Set identical in the adjusted workout', () => {
    const workout = tuesday()
    const rec = recommendWorkout(workout, lessTimeRequest(workout))
    const before = workout.sets.find((s) => s.id === 'main-set')
    expect(areSetsEqual(before, adjustedSet(rec, 'main-set'))).toBe(true)
    expect(rec.priority).toMatchObject({ setId: 'main-set', status: 'preserved' })
    expect(rec.adjustedWorkout.prioritySetId).toBe('main-set')
  })

  it('never reduces a non-main Priority Set (speed) and protects it too', () => {
    const workout = tuesday()
    workout.prioritySetId = 'speed'
    const rec = recommendWorkout(workout, lessTimeRequest(workout, { prioritySetId: 'speed' }))
    expect(rec.type).toBe(RESULT_TYPES.recommendation)
    expect(areSetsEqual(workout.sets.find((s) => s.id === 'speed'), adjustedSet(rec, 'speed'))).toBe(true)
    expect(changeFor(rec, 'speed').changeType).toBe('preserved')
  })

  it('stops reducing as soon as the target is met (smaller cut = fewer changes)', () => {
    const workout = tuesday()
    const rec = recommendWorkout(workout, lessTimeRequest(workout, { availableMinutes: 46 }))
    expect(rec.type).toBe(RESULT_TYPES.recommendation)
    expect(rec.adjustedMinutes).toBeLessThanOrEqual(46)
    expect(rec.adjustedYards).toBeGreaterThan(2100)
    expect(changeFor(rec, 'warmup').changeType).toBe('unchanged')
    expect(changeFor(rec, 'main-set').changeType).toBe('preserved')
  })

  it('keeps a cool-down and the Priority Set when going deeper (35 min)', () => {
    const workout = tuesday()
    const rec = recommendWorkout(workout, lessTimeRequest(workout, { availableMinutes: 35 }))
    expect(rec.type).toBe(RESULT_TYPES.recommendation)
    expect(rec.adjustedMinutes).toBeLessThanOrEqual(35)
    expect(changeFor(rec, 'main-set').changeType).toBe('preserved')
    expect(adjustedSet(rec, 'cool-down').distancePerRepYards).toBeGreaterThanOrEqual(200)
    expect(adjustedSet(rec, 'warmup').distancePerRepYards).toBeGreaterThanOrEqual(200)
  })

  it('refuses an impossible target instead of changing the Priority Set', () => {
    const workout = tuesday()
    const result = recommendWorkout(workout, lessTimeRequest(workout, { availableMinutes: 20 }))
    expect(result.type).toBe(RESULT_TYPES.impossibleTimeTarget)
    expect(result.minimumMinutes).toBeGreaterThan(20)
    expect(result.options).toContain('increaseTime')
  })

  it('reports no change when the workout already fits', () => {
    const workout = tuesday()
    const result = recommendWorkout(workout, lessTimeRequest(workout, { availableMinutes: 60 }))
    expect(result.type).toBe(RESULT_TYPES.noChangeNeeded)
  })

  it('flags review if the main set had to be shortened (no Priority Set selected)', () => {
    const workout = seed(SEED_WORKOUT_IDS.easyAerobicReset)
    const rec = recommendWorkout(workout, {
      ...createDefaultRequest(workout),
      constraint: CONSTRAINTS.lessTime,
      availableMinutes: 28,
      readiness: 3,
    })
    expect(rec.type).toBe(RESULT_TYPES.recommendation)
    expect(rec.priority.status).toBe('none')
    expect(rec.requiresUserReview).toBe(true)
  })
})

describe('Workout Too Difficult: 6 × 200 @ 2:50, RPE 8', () => {
  const workout = tuesday()
  const rec = recommendWorkout(workout, difficultyRequest(workout))

  it('suggests 6 × 200 @ 3:00', () => {
    expect(rec.type).toBe(RESULT_TYPES.recommendation)
    expect(formatSetNotation(workout.sets.find((s) => s.id === 'main-set'))).toBe('6 × 200 free @ 2:50')
    expect(formatSetNotation(adjustedSet(rec, 'main-set'))).toBe('6 × 200 free @ 3:00')
    expect(adjustedSet(rec, 'main-set').intervalSeconds).toBe(180)
  })

  it('preserves all 6 reps and total yardage', () => {
    expect(adjustedSet(rec, 'main-set').repetitions).toBe(6)
    expect(rec.adjustedYards).toBe(2500)
    expect(rec.yardsChanged).toBe(0)
  })

  it('marks the interval change and asks for approval of the Priority Set', () => {
    expect(changeFor(rec, 'main-set').changeType).toBe('intervalAdjusted')
    expect(rec.priority.status).toBe('intervalAdjusted')
    expect(rec.requiresUserReview).toBe(true)
  })

  it('explains the interval increase while preserving set structure', () => {
    expect(rec.explanation).toMatch(/increased from 2:50 to 3:00/)
    expect(rec.explanation).toMatch(/All 6 reps are kept/)
    expect(rec.explanation).toMatch(/set structure is preserved/)
  })

  it('only changes the targeted set', () => {
    for (const id of ['warmup', 'pre-set', 'speed', 'cool-down']) {
      expect(changeFor(rec, id).changeType).toBe('unchanged')
    }
  })

  it('RPE table is deterministic', () => {
    expect([5, 6, 7, 8, 9, 10].map(intervalBumpForRpe)).toEqual([0, 0, 5, 10, 15, 20])
  })

  it('makes no change at low RPE', () => {
    const result = recommendWorkout(workout, difficultyRequest(workout, { rpe: 5 }))
    expect(result.type).toBe(RESULT_TYPES.noChangeNeeded)
  })
})

describe('Pain / injury routes to the Safety Boundary', () => {
  it('returns safetyBoundary and no adjusted workout', () => {
    const workout = tuesday()
    const result = recommendWorkout(workout, {
      ...createDefaultRequest(workout),
      constraint: CONSTRAINTS.painOrInjury,
    })
    expect(result.type).toBe(RESULT_TYPES.safetyBoundary)
    expect(result.adjustedWorkout).toBeUndefined()
    expect(result.changes).toBeUndefined()
  })

  it('still routes to the Safety Boundary even if other inputs are filled in', () => {
    const workout = tuesday()
    const result = recommendWorkout(workout, lessTimeRequest(workout, { constraint: CONSTRAINTS.painOrInjury, rpe: 9 }))
    expect(result.type).toBe(RESULT_TYPES.safetyBoundary)
  })

  it('does not even need a valid workout', () => {
    const result = recommendWorkout(null, { constraint: CONSTRAINTS.painOrInjury, workoutId: 'x' })
    expect(result.type).toBe(RESULT_TYPES.safetyBoundary)
  })
})

describe('validation and unsupported rule sets', () => {
  it('rejects bad inputs', () => {
    const workout = tuesday()
    expect(recommendWorkout(workout, lessTimeRequest(workout, { availableMinutes: 0 })).type).toBe(
      RESULT_TYPES.invalidRequest,
    )
    expect(recommendWorkout(workout, lessTimeRequest(workout, { readiness: 6 })).type).toBe(
      RESULT_TYPES.invalidRequest,
    )
    expect(recommendWorkout(workout, difficultyRequest(workout, { rpe: 11 })).type).toBe(
      RESULT_TYPES.invalidRequest,
    )
    expect(recommendWorkout(workout, difficultyRequest(workout, { rpe: null })).type).toBe(
      RESULT_TYPES.invalidRequest,
    )
  })

  it('requires a constraint', () => {
    const workout = tuesday()
    expect(validateAdaptationRequest(createDefaultRequest(workout), workout)).toHaveLength(1)
  })

  // Phase 5 built the last three rule sets, so this test (which used Feeling Tired as the
  // example of a rule set "not built yet") now checks that every constraint is supported
  // and that an unknown one is rejected instead.
  it('supports every constraint and rejects unknown ones', () => {
    const workout = tuesday()
    Object.values(CONSTRAINTS).forEach((constraint) => {
      expect(isConstraintSupported(constraint)).toBe(true)
    })
    const result = recommendWorkout(workout, {
      ...createDefaultRequest(workout),
      constraint: 'somethingElse',
    })
    expect(result.type).toBe(RESULT_TYPES.invalidRequest)
  })
})
