import { describe, expect, it } from 'vitest'
import { RESULT_TYPES, recommendWorkout } from '../features/adaptation/adaptationEngine.js'
import { CONSTRAINTS, createDefaultRequest } from '../features/adaptation/adaptationRequest.js'
import { SEED_WORKOUT_IDS, createSeedWorkouts } from '../features/workouts/workoutData.js'
import {
  buildWorkoutFromDraft,
  createBlankDraft,
  createBlankSet,
  createWorkoutId,
  isSavableWorkout,
  validateWorkoutDraft,
} from '../features/workouts/workoutBuilder.js'
import { parseIntervalText, parseSetLine, parseWorkoutText } from '../features/workouts/workoutParser.js'
import { calculateWorkoutYards, formatSetNotation } from '../features/workouts/workoutUtils.js'
import {
  addWorkout,
  clearSession,
  resetDemo,
  selectWorkout,
  setAdaptationResult,
  setPrioritySet,
  setWatchVisible,
  startSession,
} from '../state/actions.js'
import { appReducer, createInitialState } from '../state/appReducer.js'

const SAMPLE = `400 easy swim
8 x 50 drill/swim @ 1:00
6 x 200 free @ 2:50
8 x 25 fast @ :35
300 easy choice`

/* ---------- Paste Workout: parsing ---------- */

describe('parseWorkoutText: the five documented example lines', () => {
  const parsed = parseWorkoutText(SAMPLE)

  it('reads every line without failures', () => {
    expect(parsed.failures).toEqual([])
    expect(parsed.sets).toHaveLength(5)
  })

  it('understands reps, distance, stroke, effort and interval', () => {
    const [warm, pre, main, speed, cool] = parsed.sets
    expect(warm).toMatchObject({ repetitions: 1, distancePerRepYards: 400, effort: 'easy', stroke: 'choice', intervalSeconds: null })
    expect(pre).toMatchObject({ repetitions: 8, distancePerRepYards: 50, stroke: 'drillSwim', intervalSeconds: 60 })
    expect(main).toMatchObject({ repetitions: 6, distancePerRepYards: 200, stroke: 'free', intervalSeconds: 170 })
    expect(speed).toMatchObject({ repetitions: 8, distancePerRepYards: 25, effort: 'fast', intervalSeconds: 35 })
    expect(cool).toMatchObject({ repetitions: 1, distancePerRepYards: 300, effort: 'easy', stroke: 'choice' })
  })

  it('round-trips to swim notation', () => {
    expect(parsed.sets.map(formatSetNotation)).toEqual([
      '400 easy choice',
      '8 × 50 drill/swim @ 1:00',
      '6 × 200 free @ 2:50',
      '8 × 25 fast @ :35',
      '300 easy choice',
    ])
  })

  it('guesses roles and names by simple rules', () => {
    expect(parsed.sets.map((s) => s.role)).toEqual(['warmup', 'preset', 'main', 'speed', 'cooldown'])
    expect(parsed.sets.map((s) => s.name)).toEqual(['Warm-up', 'Pre-set', 'Main set', 'Speed', 'Cool-down'])
  })

  it('builds a workout that matches the documented Tuesday Threshold totals', () => {
    const workout = buildWorkoutFromDraft({ name: 'Pasted Tuesday', focus: 'threshold', sets: parsed.sets })
    expect(calculateWorkoutYards(workout)).toBe(2500)
    expect(workout.estimatedDurationMinutes).toBe(52)
    expect(workout.prioritySetId).toBeNull() // the swimmer chooses it on Review Workout
    expect(workout.sets.map((s) => s.id)).toEqual(['warmup', 'pre-set', 'main-set', 'speed', 'cool-down'])
  })
})

describe('parseSetLine: notation variations', () => {
  it('accepts ×, X, no spaces, yd units and plain-second intervals', () => {
    expect(parseSetLine('8 × 50 drill/swim @ 1:00').set.repetitions).toBe(8)
    expect(parseSetLine('8X50 free @1:10').set).toMatchObject({ repetitions: 8, distancePerRepYards: 50, intervalSeconds: 70 })
    expect(parseSetLine('200 yd free').set).toMatchObject({ repetitions: 1, distancePerRepYards: 200, stroke: 'free' })
    expect(parseSetLine('4 x 100 free on 90').set.intervalSeconds).toBe(90)
  })

  it('reads equipment', () => {
    expect(parseSetLine('4 x 100 pull with paddles @ 1:45').set).toMatchObject({
      stroke: 'pull',
      equipment: ['paddles'],
      intervalSeconds: 105,
    })
    expect(parseSetLine('5 x 200 pull w/ pull buoy and paddles @ 3:20').set.equipment).toEqual(['pullBuoy', 'paddles'])
    expect(parseSetLine('6 x 50 kick with kickboard @ 1:05').set.stroke).toBe('kick')
  })

  it('parses interval text', () => {
    expect(parseIntervalText('1:30')).toBe(90)
    expect(parseIntervalText(':35')).toBe(35)
    expect(parseIntervalText('90')).toBe(90)
    expect(parseIntervalText('1:75')).toBeNull()
  })

  it('explains lines it cannot read', () => {
    expect(parseSetLine('warm up nicely').message).toContain('distance')
    expect(parseSetLine('8 x 50 flibber').message).toContain('flibber')
    expect(parseSetLine('4 x 100 pull with flippers').message).toContain('flippers')
    expect(parseSetLine('8 x 50 @').message).toContain('interval')
    expect(parseSetLine('0 x 50').ok).toBe(false)
    expect(parseSetLine('4 x 100 @ 0:05').ok).toBe(false)
    expect(parseSetLine('').ok).toBe(false)
  })
})

describe('parseWorkoutText: failures are shown back, never invented away', () => {
  const text = '400 easy swim\nwarm up nicely\n8 x 50 drill/swim @ 1:00\n\n8 x 50 flibber'
  const parsed = parseWorkoutText(text)

  it('keeps the readable sets and lists each unreadable line with its original text', () => {
    expect(parsed.sets).toHaveLength(2)
    expect(parsed.failures.map((f) => [f.lineNumber, f.text])).toEqual([
      [2, 'warm up nicely'],
      [5, '8 x 50 flibber'],
    ])
    expect(parsed.failures.every((f) => f.message.length > 0)).toBe(true)
    expect(parsed.originalText).toBe(text)
  })

  it('treats empty text as empty', () => {
    expect(parseWorkoutText('').isEmpty).toBe(true)
    expect(parseWorkoutText('  \n \n').isEmpty).toBe(true)
    expect(parseWorkoutText(SAMPLE).isEmpty).toBe(false)
  })
})

/* ---------- Build Manually ---------- */

describe('manual workout creation', () => {
  const draft = () => ({
    name: 'Pull Day',
    focus: 'aerobic',
    sets: [
      createBlankSet({ name: 'Warm-up', role: 'warmup', distancePerRepYards: 300, stroke: 'choice', effort: 'easy' }),
      createBlankSet({
        name: 'Pull set',
        role: 'main',
        repetitions: 4,
        distancePerRepYards: 100,
        stroke: 'pull',
        intervalSeconds: 105,
        equipment: ['paddles', 'pullBuoy'],
      }),
    ],
  })

  it('validates name, sets and each set field', () => {
    expect(validateWorkoutDraft(draft()).valid).toBe(true)
    expect(validateWorkoutDraft({ ...draft(), name: '  ' }).name).toBeTruthy()
    expect(validateWorkoutDraft({ name: 'x', focus: 'aerobic', sets: [] }).sets).toBeTruthy()

    const bad = draft()
    bad.sets[1].repetitions = 0
    bad.sets[1].intervalSeconds = 5
    bad.sets[0].name = ''
    const result = validateWorkoutDraft(bad)
    expect(result.valid).toBe(false)
    expect(Object.keys(result.bySet[bad.sets[1].key])).toEqual(['repetitions', 'intervalSeconds'])
    expect(result.bySet[bad.sets[0].key].name).toBeTruthy()
  })

  it('a blank draft starts with one usable set', () => {
    const blank = createBlankDraft()
    expect(blank.sets).toHaveLength(1)
    expect(validateWorkoutDraft({ ...blank, name: 'Mine' }).valid).toBe(true)
  })

  it('builds a saved workout with ids, equipment and an estimated time', () => {
    const workout = buildWorkoutFromDraft(draft(), [])
    expect(workout.id).toBe('custom-pull-day')
    expect(workout.sets.map((s) => s.id)).toEqual(['warmup', 'main-set'])
    expect(formatSetNotation(workout.sets[1])).toBe('4 × 100 pull with paddles and pull buoy @ 1:45')
    expect(calculateWorkoutYards(workout)).toBe(700)
    // Same prototype time model as the engine: 300 s continuous + 4 × (105 + 30) s = 840 s
    expect(workout.estimatedDurationMinutes).toBe(14)
  })

  it('keeps ids unique for repeated roles and repeated names', () => {
    const d = draft()
    d.sets.push(createBlankSet({ name: 'More main', role: 'main', distancePerRepYards: 100 }))
    expect(buildWorkoutFromDraft(d, []).sets.map((s) => s.id)).toEqual(['warmup', 'main-set', 'main-set-2'])
    expect(createWorkoutId('Pull Day', ['custom-pull-day'])).toBe('custom-pull-day-2')
    expect(createWorkoutId('Pull Day', ['custom-pull-day', 'custom-pull-day-2'])).toBe('custom-pull-day-3')
  })

  it('saves to My Workouts through the shared state, ready for the adaptation engine', () => {
    const workout = buildWorkoutFromDraft(draft(), createSeedWorkouts().map((w) => w.id))
    let state = appReducer(createInitialState(), addWorkout(workout))
    expect(state.workouts.map((w) => w.id)).toEqual(['tuesday-threshold', 'easy-aerobic-reset', 'custom-pull-day'])

    // Choose a Priority Set on Review Workout, then adapt it like any seed workout.
    state = appReducer(state, setPrioritySet('custom-pull-day', 'main-set'))
    const saved = state.workouts.find((w) => w.id === 'custom-pull-day')
    expect(saved.prioritySetId).toBe('main-set')
    const rec = recommendWorkout(saved, {
      ...createDefaultRequest(saved),
      constraint: CONSTRAINTS.missingEquipment,
      availableEquipment: ['fins', 'kickboard', 'pullBuoy'],
    })
    expect(rec.type).toBe(RESULT_TYPES.recommendation)
    expect(rec.adjustedWorkout.sets[1].equipment).toEqual(['pullBuoy'])
  })

  it('does not overwrite an existing workout and ignores invalid ones', () => {
    const workout = buildWorkoutFromDraft(draft(), [])
    let state = appReducer(createInitialState(), addWorkout(workout))
    state = appReducer(state, addWorkout(workout))
    expect(state.workouts.map((w) => w.id)).toEqual([
      'tuesday-threshold',
      'easy-aerobic-reset',
      'custom-pull-day',
      'custom-pull-day-2',
    ])
    const before = state
    expect(appReducer(state, addWorkout({ id: 'x', name: '', sets: [] }))).toBe(before)
    expect(isSavableWorkout({ ...workout, sets: [] })).toBe(false)
    expect(isSavableWorkout(null)).toBe(false)
  })
})

/* ---------- Demo reset ---------- */

describe('demo reset', () => {
  function messyState() {
    const tuesday = createSeedWorkouts()[0]
    const request = { ...createDefaultRequest(tuesday), constraint: CONSTRAINTS.lessTime, availableMinutes: 40 }
    let state = createInitialState()
    state = appReducer(state, setPrioritySet('tuesday-threshold', 'speed'))
    state = appReducer(state, selectWorkout('easy-aerobic-reset'))
    state = appReducer(state, addWorkout(buildWorkoutFromDraft({ name: 'Extra', focus: 'aerobic', sets: [createBlankSet({ name: 'Swim' })] }, [])))
    state = appReducer(state, setAdaptationResult(request, recommendWorkout(tuesday, request)))
    state = appReducer(state, startSession({ workout: tuesday, sourceWorkoutId: tuesday.id, kind: 'original', sessionId: 's1', now: 1 }))
    return appReducer(state, setWatchVisible(true))
  }

  it('restores the demo workouts, Tuesday Threshold’s main-set Priority and removes added workouts', () => {
    const state = appReducer(messyState(), resetDemo())
    expect(state.workouts.map((w) => w.id)).toEqual([SEED_WORKOUT_IDS.tuesdayThreshold, SEED_WORKOUT_IDS.easyAerobicReset])
    expect(state.workouts).toEqual(createSeedWorkouts())
    expect(state.workouts[0].prioritySetId).toBe('main-set')
  })

  it('clears the session, the proposal, the answers and the selection', () => {
    const state = appReducer(messyState(), resetDemo())
    expect(state.activeSession).toBeNull()
    expect(state.recommendation).toBeNull()
    expect(state.adaptationRequest).toBeNull()
    expect(state.selectedWorkoutId).toBeNull()
  })

  it('keeps the watch visible, as the presenter left it', () => {
    expect(appReducer(messyState(), resetDemo()).watch.visible).toBe(true)
  })

  it('"Clear active session" removes only the session', () => {
    const state = appReducer(messyState(), clearSession())
    expect(state.activeSession).toBeNull()
    expect(state.workouts.some((w) => w.id === 'custom-extra')).toBe(true)
    expect(state.recommendation).not.toBeNull()
  })
})
