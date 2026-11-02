import { describe, expect, it } from 'vitest'
import { createSession } from '../features/session/sessionReducer.js'
import { SEED_DATA_VERSION, migrateSeedWorkouts, needsSeedMigration } from '../features/workouts/seedMigration.js'
import { SEED_WORKOUT_IDS, createSeedWorkouts } from '../features/workouts/workoutData.js'
import { calculateWorkoutYards } from '../features/workouts/workoutUtils.js'
import { returnToTuesday, selectWorkout, setPrioritySet } from '../state/actions.js'
import { appReducer, createInitialState, resolveSavedWorkouts } from '../state/appReducer.js'

const byId = (list, id) => list.find((w) => w.id === id)

function customWorkout() {
  return {
    id: 'custom-pasted',
    name: 'Pasted',
    focus: 'aerobic',
    estimatedDurationMinutes: 20,
    prioritySetId: null,
    sets: [
      {
        id: 's1',
        name: 'Swim',
        role: 'other',
        repetitions: 1,
        distancePerRepYards: 500,
        stroke: 'free',
        intervalSeconds: null,
        effort: 'easy',
        equipment: [],
        notes: '',
      },
    ],
  }
}

describe('Return to Tuesday Threshold (one-step demo reset)', () => {
  function messy() {
    const seeds = createSeedWorkouts()
    const tuesday = byId(seeds, SEED_WORKOUT_IDS.tuesdayThreshold)
    // A swimmer changed the Priority Set and edited Tuesday's sets, and added a workout.
    const edited = {
      ...tuesday,
      prioritySetId: 'speed',
      sets: tuesday.sets.map((s) => (s.id === 'main-set' ? { ...s, repetitions: 3 } : s)),
    }
    let state = createInitialState([edited, byId(seeds, SEED_WORKOUT_IDS.easyAerobicReset), customWorkout()])
    state = appReducer(state, selectWorkout(SEED_WORKOUT_IDS.easyAerobicReset))
    state = {
      ...state,
      adaptationRequest: { constraint: 'lessTime' },
      recommendation: { type: 'recommendation', status: 'accepted', sourceWorkoutId: 'tuesday-threshold' },
      activeSession: createSession(tuesday, { sourceWorkoutId: tuesday.id, workoutKind: 'original' }),
    }
    return state
  }

  it('clears the session and any proposal in one action', () => {
    const next = appReducer(messy(), returnToTuesday())
    expect(next.activeSession).toBeNull()
    expect(next.recommendation).toBeNull()
    expect(next.adaptationRequest).toBeNull()
  })

  it('selects Tuesday and restores the canonical workout and default Priority Set', () => {
    const next = appReducer(messy(), returnToTuesday())
    const tuesday = byId(next.workouts, SEED_WORKOUT_IDS.tuesdayThreshold)
    expect(next.selectedWorkoutId).toBe(SEED_WORKOUT_IDS.tuesdayThreshold)
    expect(tuesday.prioritySetId).toBe('main-set')
    expect(calculateWorkoutYards(tuesday)).toBe(2500)
    expect(tuesday.estimatedDurationMinutes).toBe(52)
  })

  it('keeps other workouts, including ones the swimmer added', () => {
    const next = appReducer(messy(), returnToTuesday())
    expect(next.workouts.map((w) => w.id).sort()).toEqual(
      ['custom-pasted', 'easy-aerobic-reset', 'tuesday-threshold'].sort(),
    )
    expect(byId(next.workouts, 'custom-pasted')).toEqual(customWorkout())
  })

  it('puts Tuesday back if it is missing', () => {
    const state = createInitialState([customWorkout()])
    const next = appReducer(state, returnToTuesday())
    expect(byId(next.workouts, SEED_WORKOUT_IDS.tuesdayThreshold)).toBeDefined()
    expect(next.workouts).toHaveLength(2)
  })

  it('works from a clean state too, and a later Priority Set choice still sticks', () => {
    let state = appReducer(createInitialState(), returnToTuesday())
    state = appReducer(state, setPrioritySet('tuesday-threshold', 'speed'))
    expect(byId(state.workouts, 'tuesday-threshold').prioritySetId).toBe('speed')
    state = appReducer(state, returnToTuesday())
    expect(byId(state.workouts, 'tuesday-threshold').prioritySetId).toBe('main-set')
  })
})

describe('older saved seed data', () => {
  // An older build of Easy Aerobic Reset had no equipment on any set.
  function oldEasy() {
    const easy = byId(createSeedWorkouts(), SEED_WORKOUT_IDS.easyAerobicReset)
    return {
      ...easy,
      poolLengthYards: undefined,
      sets: easy.sets.map((s) => ({ ...s, equipment: [], stroke: 'free' })),
    }
  }
  const usesEquipment = (w) => w.sets.some((s) => s.equipment.length > 0)

  it('only migrates when the saved version is not current', () => {
    expect(needsSeedMigration(undefined)).toBe(true)
    expect(needsSeedMigration(1)).toBe(true)
    expect(needsSeedMigration(SEED_DATA_VERSION)).toBe(false)
  })

  it('restores the Easy Aerobic Reset equipment example', () => {
    const saved = [byId(createSeedWorkouts(), 'tuesday-threshold'), oldEasy()]
    const migrated = migrateSeedWorkouts(saved)
    expect(usesEquipment(byId(migrated, 'easy-aerobic-reset'))).toBe(true)
  })

  it('never removes or edits a workout the swimmer added', () => {
    const custom = customWorkout()
    const migrated = resolveSavedWorkouts([oldEasy(), custom], undefined)
    expect(byId(migrated, 'custom-pasted')).toEqual(custom)
    expect(migrated.map((w) => w.id)).toContain('tuesday-threshold')
  })

  it("keeps the swimmer's Priority Set when a seed is refreshed", () => {
    const tuesday = { ...byId(createSeedWorkouts(), 'tuesday-threshold'), prioritySetId: 'speed' }
    const stale = { ...tuesday, estimatedDurationMinutes: 50 }
    const migrated = migrateSeedWorkouts([stale, oldEasy()])
    const t = byId(migrated, 'tuesday-threshold')
    expect(t.estimatedDurationMinutes).toBe(52)
    expect(t.prioritySetId).toBe('speed')
  })

  it('leaves current data untouched (same object contents, same order)', () => {
    const current = createSeedWorkouts()
    expect(migrateSeedWorkouts(current)).toEqual(current)
    expect(resolveSavedWorkouts(current, SEED_DATA_VERSION)).toEqual(current)
  })

  it('does not migrate saved data that already has the current version', () => {
    const custom = customWorkout()
    const saved = [custom]
    // Current version: used as-is even if a seed is absent (swimmer data is never rewritten).
    expect(resolveSavedWorkouts(saved, SEED_DATA_VERSION)).toEqual(saved)
  })

  it('falls back to seeds only when nothing valid is saved, and drops just the bad entries', () => {
    expect(resolveSavedWorkouts(undefined, undefined)).toEqual(createSeedWorkouts())
    expect(resolveSavedWorkouts([{ nope: true }], 1)).toEqual(createSeedWorkouts())
    const custom = customWorkout()
    const mixed = resolveSavedWorkouts([custom, { nope: true }], SEED_DATA_VERSION)
    expect(mixed).toEqual([custom])
  })
})
