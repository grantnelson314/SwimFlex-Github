import { describe, expect, it } from 'vitest'
import { recommendWorkout } from '../features/adaptation/adaptationEngine.js'
import { createDefaultRequest } from '../features/adaptation/adaptationRequest.js'
import { createSeedWorkouts } from '../features/workouts/workoutData.js'
import {
  acceptRecommendation,
  clearAdaptation,
  selectWorkout,
  setAdaptationResult,
  setPrioritySet,
} from '../state/actions.js'
import { appReducer, createInitialState } from '../state/appReducer.js'

describe('appReducer', () => {
  it('starts with seed workouts and inert later-phase state', () => {
    const state = createInitialState()
    expect(state.workouts.map((w) => w.id)).toEqual(['tuesday-threshold', 'easy-aerobic-reset'])
    expect(state.activeSession).toBeNull()
    expect(state.recommendation).toBeNull()
    expect(state.adaptationRequest).toBeNull()
  })

  it('selects a workout', () => {
    const next = appReducer(createInitialState(), selectWorkout('tuesday-threshold'))
    expect(next.selectedWorkoutId).toBe('tuesday-threshold')
  })

  it('changes the Priority Set for only that workout', () => {
    const state = createInitialState()
    const next = appReducer(state, setPrioritySet('tuesday-threshold', 'speed'))
    expect(next.workouts[0].prioritySetId).toBe('speed')
    expect(next.workouts[1].prioritySetId).toBeNull()
  })

  it('sets a Priority Set where none existed, and can clear it', () => {
    let state = appReducer(createInitialState(), setPrioritySet('easy-aerobic-reset', 'main-set'))
    expect(state.workouts[1].prioritySetId).toBe('main-set')
    state = appReducer(state, setPrioritySet('easy-aerobic-reset', null))
    expect(state.workouts[1].prioritySetId).toBeNull()
  })

  it('ignores unknown workout or set ids', () => {
    const state = createInitialState()
    expect(appReducer(state, setPrioritySet('nope', 'main-set'))).toBe(state)
    expect(appReducer(state, setPrioritySet('tuesday-threshold', 'nope'))).toBe(state)
  })

  describe('adaptation state', () => {
    const workout = createSeedWorkouts()[0]
    const request = { ...createDefaultRequest(workout), constraint: 'lessTime' }
    const result = recommendWorkout(workout, request)

    it('stores the request and result without applying anything', () => {
      const state = createInitialState()
      const next = appReducer(state, setAdaptationResult(request, result))
      expect(next.adaptationRequest).toBe(request)
      expect(next.recommendation.status).toBe('proposed')
      expect(next.workouts).toBe(state.workouts) // original workouts untouched
    })

    it('accepting marks the recommendation accepted but leaves saved workouts unchanged', () => {
      let state = appReducer(createInitialState(), setAdaptationResult(request, result))
      const workoutsBefore = state.workouts
      state = appReducer(state, acceptRecommendation())
      expect(state.recommendation.status).toBe('accepted')
      expect(state.workouts).toBe(workoutsBefore)
    })

    it('cannot accept a safety boundary or notice', () => {
      const painRequest = { ...request, constraint: 'painOrInjury' }
      let state = appReducer(
        createInitialState(),
        setAdaptationResult(painRequest, recommendWorkout(workout, painRequest)),
      )
      expect(state.recommendation.type).toBe('safetyBoundary')
      const after = appReducer(state, acceptRecommendation())
      expect(after).toBe(state)
    })

    it('clearing (Keep Original) drops request and proposal', () => {
      let state = appReducer(createInitialState(), setAdaptationResult(request, result))
      state = appReducer(state, clearAdaptation())
      expect(state.adaptationRequest).toBeNull()
      expect(state.recommendation).toBeNull()
    })
  })

  it('does not mutate previous state', () => {
    const state = createInitialState()
    appReducer(state, setPrioritySet('tuesday-threshold', 'speed'))
    expect(state.workouts[0].prioritySetId).toBe('main-set')
  })
})
