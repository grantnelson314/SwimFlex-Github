import { describe, expect, it } from 'vitest'
import { RESULT_TYPES, recommendWorkout } from '../features/adaptation/adaptationEngine.js'
import { substituteEquipment } from '../features/adaptation/adaptEquipment.js'
import { CONSTRAINTS, createDefaultRequest, validateAdaptationRequest } from '../features/adaptation/adaptationRequest.js'
import {
  convertDistanceForPool,
  fatigueRestBump,
  getEffectiveReadiness,
  getEquipmentSubstitution,
} from '../features/adaptation/adaptationRules.js'
import { EQUIPMENT, SEED_WORKOUT_IDS, createSeedWorkouts } from '../features/workouts/workoutData.js'
import { areSetsEqual, calculateWorkoutYards, formatSetNotation } from '../features/workouts/workoutUtils.js'

const seed = (id) => createSeedWorkouts().find((w) => w.id === id)
const tuesday = () => seed(SEED_WORKOUT_IDS.tuesdayThreshold)
const easy = () => seed(SEED_WORKOUT_IDS.easyAerobicReset)

const adjustedSet = (rec, id) => rec.adjustedWorkout.sets.find((s) => s.id === id)
const changeFor = (rec, id) => rec.changes.find((c) => c.originalSetId === id)
const originalSet = (workout, id) => workout.sets.find((s) => s.id === id)

/* ---------- Feeling Tired ---------- */

const tiredRequest = (workout, overrides = {}) => ({
  ...createDefaultRequest(workout),
  constraint: CONSTRAINTS.feelingTired,
  readiness: 2,
  rpe: null,
  fatiguePreference: 'decide',
  ...overrides,
})

describe('Feeling Tired: canonical scenario (Tuesday Threshold, readiness 2, SwimFlex decides)', () => {
  const workout = tuesday()
  const rec = recommendWorkout(workout, tiredRequest(workout))

  it('adds rest first on supporting sets', () => {
    expect(rec.type).toBe(RESULT_TYPES.recommendation)
    expect(adjustedSet(rec, 'pre-set').intervalSeconds).toBe(70) // 1:00 -> 1:10
    expect(adjustedSet(rec, 'speed').intervalSeconds).toBe(45) // :35 -> :45
  })

  it('then trims lower-priority volume by one step', () => {
    expect(formatSetNotation(adjustedSet(rec, 'pre-set'))).toBe('7 × 50 drill/swim @ 1:10')
    expect(formatSetNotation(adjustedSet(rec, 'speed'))).toBe('7 × 25 fast @ :45')
    expect(rec.adjustedYards).toBe(2425)
  })

  it('preserves the Priority Set, warm-up and cool-down exactly', () => {
    expect(areSetsEqual(adjustedSet(rec, 'main-set'), originalSet(workout, 'main-set'))).toBe(true)
    expect(areSetsEqual(adjustedSet(rec, 'warmup'), originalSet(workout, 'warmup'))).toBe(true)
    expect(areSetsEqual(adjustedSet(rec, 'cool-down'), originalSet(workout, 'cool-down'))).toBe(true)
    expect(rec.priority.status).toBe('preserved')
    expect(changeFor(rec, 'main-set').changeType).toBe('preserved')
    expect(rec.requiresUserReview).toBe(false)
  })

  it('shows exactly what changed and why, without medical claims', () => {
    expect(changeFor(rec, 'pre-set').explanation).toContain('1:00')
    expect(changeFor(rec, 'pre-set').explanation).toContain('1:10')
    expect(changeFor(rec, 'pre-set').explanation).toContain('7 reps')
    expect(rec.explanation).toContain('readiness 2/5')
    expect(rec.explanation).toContain('not medical advice')
    expect(rec.explanation).not.toMatch(/fatigue level|recover|injur|diagnos/i)
    expect(rec.rationale.join(' ')).toContain('Priority Set preserved')
    expect(rec.context.items.map((i) => i.label)).toEqual(['Readiness', 'RPE so far', 'Preference'])
  })
})

describe('Feeling Tired: readiness bands and preferences', () => {
  const workout = tuesday()

  it('readiness 4-5 means no change', () => {
    expect(recommendWorkout(workout, tiredRequest(workout, { readiness: 4 })).type).toBe(RESULT_TYPES.noChangeNeeded)
    expect(recommendWorkout(workout, tiredRequest(workout, { readiness: 5 })).type).toBe(RESULT_TYPES.noChangeNeeded)
  })

  it('readiness 3 is a small increase in rest only', () => {
    const rec = recommendWorkout(workout, tiredRequest(workout, { readiness: 3 }))
    expect(rec.type).toBe(RESULT_TYPES.recommendation)
    expect(adjustedSet(rec, 'pre-set').intervalSeconds).toBe(65)
    expect(adjustedSet(rec, 'speed').intervalSeconds).toBe(40)
    expect(rec.adjustedYards).toBe(2500)
  })

  it('readiness 3 with “Less volume” trims one step and keeps intervals', () => {
    const rec = recommendWorkout(workout, tiredRequest(workout, { readiness: 3, fatiguePreference: 'lessVolume' }))
    expect(adjustedSet(rec, 'pre-set').repetitions).toBe(7)
    expect(adjustedSet(rec, 'pre-set').intervalSeconds).toBe(60)
  })

  it('“More rest” never cuts volume, even at readiness 1', () => {
    const rec = recommendWorkout(workout, tiredRequest(workout, { readiness: 1, fatiguePreference: 'moreRest' }))
    expect(adjustedSet(rec, 'pre-set').repetitions).toBe(8)
    expect(adjustedSet(rec, 'pre-set').intervalSeconds).toBe(75) // +15
    expect(rec.adjustedYards).toBe(2500)
  })

  it('readiness 1 with SwimFlex deciding adds rest and trims to the supporting floor', () => {
    const rec = recommendWorkout(workout, tiredRequest(workout, { readiness: 1 }))
    expect(adjustedSet(rec, 'pre-set').repetitions).toBe(4)
    expect(adjustedSet(rec, 'speed').repetitions).toBe(4)
    expect(areSetsEqual(adjustedSet(rec, 'main-set'), originalSet(workout, 'main-set'))).toBe(true)
  })

  it('a hard reported effort moves readiness down (prototype rule)', () => {
    expect(getEffectiveReadiness(5, 9)).toBe(3)
    expect(getEffectiveReadiness(2, 9)).toBe(1)
    expect(getEffectiveReadiness(4, 8)).toBe(3)
    expect(getEffectiveReadiness(4, 7)).toBe(4)
    expect(fatigueRestBump(3)).toBe(5)
    expect(fatigueRestBump(5)).toBe(0)
    expect(recommendWorkout(workout, tiredRequest(workout, { readiness: 5, rpe: 9 })).type).toBe(
      RESULT_TYPES.recommendation,
    )
  })

  it('validates readiness and preference', () => {
    expect(validateAdaptationRequest(tiredRequest(workout, { readiness: 9 }), workout).map((e) => e.field)).toContain(
      'readiness',
    )
    expect(
      validateAdaptationRequest(tiredRequest(workout, { fatiguePreference: 'nope' }), workout).map((e) => e.field),
    ).toContain('fatiguePreference')
  })

  it('is deterministic', () => {
    const request = tiredRequest(workout)
    expect(recommendWorkout(workout, request)).toEqual(recommendWorkout(workout, request))
  })
})

/* ---------- Missing Equipment ---------- */

const equipmentRequest = (workout, missing, overrides = {}) => ({
  ...createDefaultRequest(workout),
  constraint: CONSTRAINTS.missingEquipment,
  availableEquipment: EQUIPMENT.filter((e) => !missing.includes(e)),
  ...overrides,
})

describe('Missing Equipment: the demo workout really uses equipment', () => {
  it('Easy Aerobic Reset has kickboard, pull buoy and paddle sets', () => {
    const workout = easy()
    expect(formatSetNotation(originalSet(workout, 'pre-set'))).toBe('6 × 50 kick with kickboard @ 1:05')
    expect(formatSetNotation(originalSet(workout, 'main-set'))).toBe('5 × 200 pull with pull buoy and paddles @ 3:20')
    expect(calculateWorkoutYards(workout)).toBe(1800)
    expect(workout.estimatedDurationMinutes).toBe(40)
  })
})

describe('Missing Equipment: substitution (Easy Aerobic Reset, no paddles)', () => {
  const workout = easy()
  const rec = recommendWorkout(workout, equipmentRequest(workout, ['paddles']))

  it('replaces only the affected set', () => {
    expect(rec.type).toBe(RESULT_TYPES.recommendation)
    expect(formatSetNotation(adjustedSet(rec, 'main-set'))).toBe('5 × 200 pull with pull buoy @ 3:20')
    expect(changeFor(rec, 'main-set').changeType).toBe('replaced')
    expect(changeFor(rec, 'pre-set').changeType).toBe('unchanged')
    expect(changeFor(rec, 'warmup').changeType).toBe('unchanged')
  })

  it('keeps reps, distance, interval, yards and time', () => {
    expect(adjustedSet(rec, 'main-set').repetitions).toBe(5)
    expect(adjustedSet(rec, 'main-set').distancePerRepYards).toBe(200)
    expect(adjustedSet(rec, 'main-set').intervalSeconds).toBe(200)
    expect(rec.adjustedYards).toBe(1800)
    expect(rec.adjustedMinutes).toBe(40)
  })

  it('explains the substitution as a prototype recommendation, not an equivalent', () => {
    const text = changeFor(rec, 'main-set').explanation
    expect(text).toContain('paddles')
    expect(text).toContain('prototype recommendation')
    expect(text).toContain('not an exact equivalent')
    expect(rec.explanation).toContain('prototype recommendation')
    expect(rec.context.items[0]).toEqual({ label: 'Not available', value: 'Paddles' })
    expect(rec.context.items[1].value).toBe('Main set')
  })
})

describe('Missing Equipment: other substitutions', () => {
  const workout = easy()

  it('no pull buoy turns the pull set into regular freestyle (paddles kept)', () => {
    const rec = recommendWorkout(workout, equipmentRequest(workout, ['pullBuoy']))
    expect(formatSetNotation(adjustedSet(rec, 'main-set'))).toBe('5 × 200 free with paddles @ 3:20')
  })

  it('no buoy and no paddles gives plain freestyle', () => {
    const rec = recommendWorkout(workout, equipmentRequest(workout, ['pullBuoy', 'paddles']))
    expect(formatSetNotation(adjustedSet(rec, 'main-set'))).toBe('5 × 200 free @ 3:20')
  })

  it('no kickboard keeps the kick set without the board and says how to kick', () => {
    const rec = recommendWorkout(workout, equipmentRequest(workout, ['kickboard']))
    expect(formatSetNotation(adjustedSet(rec, 'pre-set'))).toBe('6 × 50 kick @ 1:05')
    expect(adjustedSet(rec, 'pre-set').notes).toContain('streamline')
    expect(changeFor(rec, 'pre-set').changeType).toBe('replaced')
  })

  it('reports no change when no set uses the missing equipment (fins)', () => {
    const rec = recommendWorkout(workout, equipmentRequest(workout, ['fins']))
    expect(rec.type).toBe(RESULT_TYPES.noChangeNeeded)
  })

  it('Tuesday Threshold uses no equipment, so nothing changes', () => {
    const t = tuesday()
    expect(recommendWorkout(t, equipmentRequest(t, ['paddles', 'fins'])).type).toBe(RESULT_TYPES.noChangeNeeded)
  })

  it('requires the swimmer to mark at least one item missing', () => {
    const errors = validateAdaptationRequest(equipmentRequest(workout, []), workout)
    expect(errors.map((e) => e.field)).toContain('availableEquipment')
  })

  it('flags equipment with no predefined substitution for a manual choice', () => {
    expect(getEquipmentSubstitution('snorkel')).toBeNull()
    const set = { ...originalSet(workout, 'main-set'), equipment: ['snorkel'] }
    const result = substituteEquipment(set, EQUIPMENT)
    expect(result.needsManualChoice).toEqual(['snorkel'])
    expect(result.adjustedSet.equipment).toEqual(['snorkel'])
  })
})

/* ---------- Pool Limitation ---------- */

const poolRequest = (workout, poolLengthYards, overrides = {}) => ({
  ...createDefaultRequest(workout),
  constraint: CONSTRAINTS.poolLimitation,
  poolLengthYards,
  ...overrides,
})

describe('Pool Limitation: 25 yd planned -> 20 yd available (Tuesday Threshold)', () => {
  const workout = tuesday()
  const rec = recommendWorkout(workout, poolRequest(workout, 20))

  it('converts per-rep distances to whole 20 yd lengths', () => {
    expect(rec.type).toBe(RESULT_TYPES.recommendation)
    expect(formatSetNotation(adjustedSet(rec, 'pre-set'))).toBe('8 × 40 drill/swim @ 1:00')
    expect(formatSetNotation(adjustedSet(rec, 'speed'))).toBe('8 × 20 fast @ :35')
  })

  it('keeps reps and intervals, and leaves sets that already fit alone', () => {
    expect(adjustedSet(rec, 'pre-set').repetitions).toBe(8)
    expect(adjustedSet(rec, 'speed').intervalSeconds).toBe(35)
    ;['warmup', 'main-set', 'cool-down'].forEach((id) => {
      expect(areSetsEqual(adjustedSet(rec, id), originalSet(workout, id))).toBe(true)
    })
    expect(rec.adjustedYards).toBe(2380)
    expect(rec.yardsChanged).toBe(-120)
    expect(rec.adjustedMinutes).toBe(52)
  })

  it('preserves the Priority Set and says which sets were affected', () => {
    expect(rec.priority.status).toBe('preserved')
    expect(rec.requiresUserReview).toBe(false)
    expect(changeFor(rec, 'pre-set').changeType).toBe('reduced')
    expect(rec.context.items).toEqual([
      { label: 'Planned pool', value: '25 yd' },
      { label: 'Available pool', value: '20 yd' },
      { label: 'Affected sets', value: 'Pre-set, Speed' },
    ])
  })

  it('explains the structure change in plain words', () => {
    expect(changeFor(rec, 'pre-set').explanation).toContain('2 lengths')
    expect(changeFor(rec, 'pre-set').explanation).toContain('40 yd')
    expect(rec.explanation).toContain('20 yd')
    expect(rec.explanation).toContain('prototype')
  })

  it('asks for a closer look when the Priority Set itself is affected', () => {
    const rec2 = recommendWorkout(workout, poolRequest(workout, 20, { prioritySetId: 'speed' }))
    expect(rec2.priority.status).toBe('modified')
    expect(rec2.requiresUserReview).toBe(true)
  })

  it('reports no change when the pool matches the plan', () => {
    expect(recommendWorkout(workout, poolRequest(workout, 25)).type).toBe(RESULT_TYPES.noChangeNeeded)
  })

  it('notes crowded lane / no pace clock without inventing changes', () => {
    const none = recommendWorkout(workout, poolRequest(workout, 25, { poolIssues: ['noPaceClock'] }))
    expect(none.type).toBe(RESULT_TYPES.noChangeNeeded)
    expect(none.message).toContain('no pace clock')
  })

  it('rejects an unsupported pool length', () => {
    expect(recommendWorkout(workout, poolRequest(workout, 33)).type).toBe(RESULT_TYPES.invalidRequest)
  })
})

describe('convertDistanceForPool', () => {
  it('keeps the same number of lengths unless the distance fits both pools', () => {
    expect(convertDistanceForPool(25, 25, 20)).toBe(20)
    expect(convertDistanceForPool(50, 25, 20)).toBe(40)
    expect(convertDistanceForPool(75, 25, 20)).toBe(60)
    expect(convertDistanceForPool(150, 25, 20)).toBe(120)
    expect(convertDistanceForPool(100, 25, 20)).toBe(100)
    expect(convertDistanceForPool(200, 25, 20)).toBe(200)
    expect(convertDistanceForPool(400, 25, 20)).toBe(400)
    expect(convertDistanceForPool(40, 20, 25)).toBe(50)
  })
})

describe('M5 Scenario 1: Less Time (still works end to end)', () => {
  it('Tuesday Threshold 52 min -> 40 min gives 2,100 yd and keeps the main set', () => {
    const workout = tuesday()
    const rec = recommendWorkout(workout, {
      ...createDefaultRequest(workout),
      constraint: CONSTRAINTS.lessTime,
      availableMinutes: 40,
    })
    expect(rec.adjustedYards).toBe(2100)
    expect(rec.adjustedMinutes).toBe(40)
    expect(rec.priority.status).toBe('preserved')
  })
})
