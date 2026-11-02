/**
 * Turning a draft (from pasted text or the manual builder) into a saved workout.
 * Pure functions: validation, ids, role/name assignment, and the estimated time.
 * No React, no generative workout creation: the swimmer's own sets are never invented or changed.
 */
import {
  DEFAULT_POOL_LENGTH_YARDS,
  EFFORTS,
  EQUIPMENT,
  ROLE_LABELS,
  SET_ROLES,
  STROKES,
  TRAINING_FOCUS,
} from './workoutData.js'
import { calculateSetYards, estimateWorkoutSeconds } from './workoutUtils.js'

export const DRAFT_LIMITS = {
  repetitions: { min: 1, max: 99 },
  distancePerRepYards: { min: 5, max: 2000 },
  intervalSeconds: { min: 10, max: 900 },
}

let draftCounter = 0

/** A blank, valid-looking set for the manual builder. `key` is UI-only (stripped on save). */
export function createBlankSet(overrides = {}) {
  draftCounter += 1
  return {
    key: `draft-${draftCounter}`,
    name: '',
    role: 'other',
    repetitions: 1,
    distancePerRepYards: 100,
    stroke: 'free',
    effort: 'moderate',
    intervalSeconds: null,
    equipment: [],
    notes: '',
    ...overrides,
  }
}

export function createBlankDraft() {
  return {
    name: '',
    focus: 'aerobic',
    sets: [createBlankSet({ name: 'Warm-up', role: 'warmup', distancePerRepYards: 300, stroke: 'choice', effort: 'easy' })],
  }
}

const isInt = (n) => Number.isInteger(n)
const inRange = (n, { min, max }) => isInt(n) && n >= min && n <= max

/**
 * Field-level errors for one draft set. Empty object = valid.
 * Keys: name, repetitions, distancePerRepYards, intervalSeconds
 */
export function validateDraftSet(set) {
  const errors = {}
  if (!set.name || !String(set.name).trim()) errors.name = 'Give this set a name.'
  if (!inRange(set.repetitions, DRAFT_LIMITS.repetitions)) {
    errors.repetitions = `Reps must be ${DRAFT_LIMITS.repetitions.min}–${DRAFT_LIMITS.repetitions.max}.`
  }
  if (!inRange(set.distancePerRepYards, DRAFT_LIMITS.distancePerRepYards)) {
    errors.distancePerRepYards = `Distance must be ${DRAFT_LIMITS.distancePerRepYards.min}–${DRAFT_LIMITS.distancePerRepYards.max} yd.`
  }
  if (set.intervalSeconds != null && !inRange(set.intervalSeconds, DRAFT_LIMITS.intervalSeconds)) {
    errors.intervalSeconds = 'Interval must be between :10 and 15:00.'
  }
  if (!STROKES.includes(set.stroke)) errors.stroke = 'Choose a stroke.'
  return errors
}

/**
 * Validate a whole draft. Returns { valid, name, sets, bySet }:
 *   name   message for the workout name (or undefined)
 *   sets   message when there are no sets (or undefined)
 *   bySet  { [set.key]: { field: message } } only for sets with problems
 */
export function validateWorkoutDraft(draft) {
  const result = { valid: true, name: undefined, sets: undefined, bySet: {} }
  if (!draft.name || !String(draft.name).trim()) result.name = 'Give your workout a name.'
  if (!Array.isArray(draft.sets) || draft.sets.length === 0) result.sets = 'Add at least one set.'
  ;(draft.sets ?? []).forEach((set) => {
    const errors = validateDraftSet(set)
    if (Object.keys(errors).length > 0) result.bySet[set.key] = errors
  })
  result.valid = !result.name && !result.sets && Object.keys(result.bySet).length === 0
  return result
}

/* ---------- Roles, names and ids ---------- */

const slug = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'workout'

const ROLE_ID_BASE = {
  warmup: 'warmup',
  preset: 'pre-set',
  main: 'main-set',
  speed: 'speed',
  technique: 'technique',
  cooldown: 'cool-down',
  other: 'other',
}

/**
 * Guess a role for each parsed set, in plain deterministic rules:
 *   first set without an interval            -> warm-up (when there are 2+ sets)
 *   last set without an interval             -> cool-down (when there are 2+ sets)
 *   the interval set with the most yards     -> main set
 *   interval sets before the main set        -> pre-set
 *   interval sets after the main set         -> speed (fast), technique (drill), else other
 * The swimmer can change any role afterwards in the builder.
 */
export function guessRoles(sets) {
  const roles = sets.map(() => 'other')
  if (sets.length >= 2) {
    if (!sets[0].intervalSeconds && sets[0].repetitions === 1) roles[0] = 'warmup'
    const last = sets.length - 1
    if (!sets[last].intervalSeconds && sets[last].repetitions === 1 && roles[last] !== 'warmup') {
      roles[last] = 'cooldown'
    }
  }
  let mainIndex = -1
  sets.forEach((set, i) => {
    if (!set.intervalSeconds || roles[i] !== 'other') return
    if (mainIndex === -1 || calculateSetYards(set) > calculateSetYards(sets[mainIndex])) mainIndex = i
  })
  if (mainIndex >= 0) roles[mainIndex] = 'main'
  sets.forEach((set, i) => {
    if (roles[i] !== 'other') return
    if (mainIndex >= 0 && i < mainIndex) roles[i] = 'preset'
    else if (set.effort === 'fast') roles[i] = 'speed'
    else if (set.stroke === 'drillSwim') roles[i] = 'technique'
  })
  return roles
}

/** Name for a set from its role; repeats get a number: "Pre-set", "Pre-set 2". */
export function defaultSetName(role, taken) {
  const base = ROLE_LABELS[role] ?? 'Set'
  let name = base
  let n = 2
  while (taken.includes(name)) {
    name = `${base} ${n}`
    n += 1
  }
  return name
}

/** Unique, readable workout id such as "morning-swim" or "morning-swim-2". */
export function createWorkoutId(name, existingIds = []) {
  const base = `custom-${slug(name)}`
  if (!existingIds.includes(base)) return base
  let n = 2
  while (existingIds.includes(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

/**
 * Build the saved workout from a valid draft. Throws nothing: call validateWorkoutDraft first.
 * - set ids come from roles ("main-set", "main-set-2"), unique within the workout
 * - estimatedDurationMinutes uses the same prototype time model as the adaptation engine
 * - no Priority Set is chosen for the swimmer (they pick it on Review Workout)
 */
export function buildWorkoutFromDraft(draft, existingWorkoutIds = []) {
  const usedSetIds = []
  const sets = draft.sets.map((set) => {
    const role = SET_ROLES.includes(set.role) ? set.role : 'other'
    const base = ROLE_ID_BASE[role]
    let id = base
    let n = 2
    while (usedSetIds.includes(id)) {
      id = `${base}-${n}`
      n += 1
    }
    usedSetIds.push(id)
    return {
      id,
      name: String(set.name).trim(),
      role,
      repetitions: set.repetitions,
      distancePerRepYards: set.distancePerRepYards,
      stroke: set.stroke,
      intervalSeconds: set.intervalSeconds ?? null,
      effort: EFFORTS.includes(set.effort) ? set.effort : 'moderate',
      equipment: (set.equipment ?? []).filter((item) => EQUIPMENT.includes(item)),
      notes: set.notes ?? '',
    }
  })

  const workout = {
    id: createWorkoutId(draft.name, existingWorkoutIds),
    name: String(draft.name).trim(),
    focus: TRAINING_FOCUS.includes(draft.focus) ? draft.focus : 'aerobic',
    estimatedDurationMinutes: 1,
    poolLengthYards: DEFAULT_POOL_LENGTH_YARDS,
    prioritySetId: null,
    isUserCreated: true,
    sets,
  }
  workout.estimatedDurationMinutes = Math.max(1, Math.round(estimateWorkoutSeconds(workout) / 60))
  return workout
}

/**
 * Final check the app reducer uses before saving: a complete workout with valid sets.
 * (The draft check gives friendly field messages; this is the safety net.)
 */
export function isSavableWorkout(workout) {
  if (!workout || typeof workout.id !== 'string' || !workout.name?.trim()) return false
  if (!Array.isArray(workout.sets) || workout.sets.length === 0) return false
  return workout.sets.every(
    (s) =>
      typeof s.id === 'string' &&
      inRange(s.repetitions, DRAFT_LIMITS.repetitions) &&
      inRange(s.distancePerRepYards, DRAFT_LIMITS.distancePerRepYards) &&
      (s.intervalSeconds == null || inRange(s.intervalSeconds, DRAFT_LIMITS.intervalSeconds)),
  )
}
