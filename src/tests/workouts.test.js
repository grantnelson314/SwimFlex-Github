import { describe, expect, it } from 'vitest'
import {
  SEED_WORKOUT_IDS,
  createSeedWorkouts,
} from '../features/workouts/workoutData.js'
import {
  calculateSetYards,
  calculateWorkoutYards,
  formatSetNotation,
  getPrioritySet,
} from '../features/workouts/workoutUtils.js'
import {
  describeMinutesChange,
  describeYardsChange,
  formatMinutes,
  formatYards,
} from '../utils/format.js'
import { formatElapsedTime, formatInterval } from '../utils/time.js'

const byId = (id) => createSeedWorkouts().find((w) => w.id === id)

describe('time formatting', () => {
  it('formats intervals in swim notation', () => {
    expect(formatInterval(170)).toBe('2:50')
    expect(formatInterval(180)).toBe('3:00')
    expect(formatInterval(60)).toBe('1:00')
    expect(formatInterval(35)).toBe(':35')
  })

  it('formats elapsed time', () => {
    expect(formatElapsedTime(74)).toBe('1:14')
    expect(formatElapsedTime(2468)).toBe('41:08')
    expect(formatElapsedTime(3725)).toBe('1:02:05')
  })
})

describe('display formatting', () => {
  it('uses yards with thousands separators', () => {
    expect(formatYards(2500)).toBe('2,500 yd')
    expect(formatMinutes(52)).toBe('52 min')
  })

  it('describes net changes in plain words', () => {
    expect(describeYardsChange(-400)).toBe('400 yd less')
    expect(describeYardsChange(0)).toBe('Same distance')
    expect(describeMinutesChange(12)).toBe('12 min saved')
    expect(describeMinutesChange(-1)).toBe('1 min added')
  })
})

describe('seed workouts', () => {
  it('Tuesday Threshold matches PLAN.md', () => {
    const w = byId(SEED_WORKOUT_IDS.tuesdayThreshold)
    expect(calculateWorkoutYards(w)).toBe(2500)
    expect(w.estimatedDurationMinutes).toBe(52)
    expect(w.focus).toBe('threshold')
    expect(w.sets.map(formatSetNotation)).toEqual([
      '400 easy choice',
      '8 × 50 drill/swim @ 1:00',
      '6 × 200 free @ 2:50',
      '8 × 25 fast @ :35',
      '300 easy choice',
    ])
  })

  it('Tuesday Threshold defaults the main set as Priority Set', () => {
    const w = byId(SEED_WORKOUT_IDS.tuesdayThreshold)
    expect(w.prioritySetId).toBe('main-set')
    expect(getPrioritySet(w).id).toBe('main-set')
    expect(calculateSetYards(getPrioritySet(w))).toBe(1200)
  })

  it('Easy Aerobic Reset is 1,800 yd / 40 min / recovery with no Priority Set', () => {
    const w = byId(SEED_WORKOUT_IDS.easyAerobicReset)
    expect(calculateWorkoutYards(w)).toBe(1800)
    expect(w.estimatedDurationMinutes).toBe(40)
    expect(w.focus).toBe('recovery')
    expect(getPrioritySet(w)).toBeNull()
  })

  it('returns fresh copies so the seed cannot be mutated', () => {
    const a = createSeedWorkouts()
    a[0].sets[0].repetitions = 99
    expect(createSeedWorkouts()[0].sets[0].repetitions).toBe(1)
  })
})
