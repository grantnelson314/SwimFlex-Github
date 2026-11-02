/**
 * Seed workouts + allowed enum values (ARCHITECTURE.md "Core Data Models").
 * All distances are in YARDS.
 *
 * Total yards are NEVER stored — they are derived from sets (see workoutUtils.js).
 */

/** @typedef {'threshold'|'sprint'|'aerobic'|'technique'|'recovery'|'racePace'} TrainingFocus */
export const TRAINING_FOCUS = ['threshold', 'sprint', 'aerobic', 'technique', 'recovery', 'racePace']

export const FOCUS_LABELS = {
  threshold: 'Threshold',
  sprint: 'Sprint',
  aerobic: 'Aerobic',
  technique: 'Technique',
  recovery: 'Recovery',
  racePace: 'Race pace',
}

/** @typedef {'warmup'|'preset'|'main'|'speed'|'technique'|'cooldown'|'other'} SetRole */
export const SET_ROLES = ['warmup', 'preset', 'main', 'speed', 'technique', 'cooldown', 'other']

export const ROLE_LABELS = {
  warmup: 'Warm-up',
  preset: 'Pre-set',
  main: 'Main set',
  speed: 'Speed',
  technique: 'Technique',
  cooldown: 'Cool-down',
  other: 'Other',
}

/** @typedef {'fins'|'paddles'|'pullBuoy'|'kickboard'} Equipment */
export const EQUIPMENT = ['fins', 'paddles', 'pullBuoy', 'kickboard']

export const EQUIPMENT_LABELS = {
  fins: 'Fins',
  paddles: 'Paddles',
  pullBuoy: 'Pull buoy',
  kickboard: 'Kickboard',
}

/** The pool length (yards) every seed workout is written for. */
export const DEFAULT_POOL_LENGTH_YARDS = 25

/** Display text for stroke values used in swim notation. */
export const STROKE_LABELS = {
  free: 'free',
  back: 'back',
  breast: 'breast',
  fly: 'fly',
  im: 'IM',
  choice: 'choice',
  drillSwim: 'drill/swim',
  pull: 'pull',
  kick: 'kick',
}

export const STROKES = Object.keys(STROKE_LABELS)

/** Effort words understood by notation and the manual builder. */
export const EFFORTS = ['easy', 'moderate', 'threshold', 'fast']
export const EFFORT_LABELS = {
  easy: 'Easy',
  moderate: 'Moderate',
  threshold: 'Threshold',
  fast: 'Fast',
}

export const SEED_WORKOUT_IDS = {
  tuesdayThreshold: 'tuesday-threshold',
  easyAerobicReset: 'easy-aerobic-reset',
}

/**
 * Tuesday Threshold — matches PLAN.md exactly.
 *   400 + 8×50 (400) + 6×200 (1,200) + 8×25 (200) + 300 = 2,500 yd, 52 min.
 * Default Priority Set: the main set.
 */
const tuesdayThreshold = {
  id: SEED_WORKOUT_IDS.tuesdayThreshold,
  name: 'Tuesday Threshold',
  focus: 'threshold',
  estimatedDurationMinutes: 52,
  poolLengthYards: DEFAULT_POOL_LENGTH_YARDS,
  prioritySetId: 'main-set',
  sets: [
    {
      id: 'warmup',
      name: 'Warm-up',
      role: 'warmup',
      repetitions: 1,
      distancePerRepYards: 400,
      stroke: 'choice',
      intervalSeconds: null,
      effort: 'easy',
      equipment: [],
      notes: '',
    },
    {
      id: 'pre-set',
      name: 'Pre-set',
      role: 'preset',
      repetitions: 8,
      distancePerRepYards: 50,
      stroke: 'drillSwim',
      intervalSeconds: 60,
      effort: 'easy',
      equipment: [],
      notes: '',
    },
    {
      id: 'main-set',
      name: 'Main set',
      role: 'main',
      repetitions: 6,
      distancePerRepYards: 200,
      stroke: 'free',
      intervalSeconds: 170,
      effort: 'threshold',
      equipment: [],
      notes: '',
    },
    {
      id: 'speed',
      name: 'Speed',
      role: 'speed',
      repetitions: 8,
      distancePerRepYards: 25,
      stroke: 'choice',
      intervalSeconds: 35,
      effort: 'fast',
      equipment: [],
      notes: '',
    },
    {
      id: 'cool-down',
      name: 'Cool-down',
      role: 'cooldown',
      repetitions: 1,
      distancePerRepYards: 300,
      stroke: 'choice',
      intervalSeconds: null,
      effort: 'easy',
      equipment: [],
      notes: '',
    },
  ],
}

/**
 * Easy Aerobic Reset — PLAN.md defines only the totals (1,800 yd, 40 min, Recovery).
 * The set list below is PROTOTYPE-INVENTED to sum to exactly 1,800 yd:
 *   300 + 6×50 (300) + 5×200 (1,000) + 200 = 1,800 yd.
 * It is also the demo workout that uses equipment (kickboard, pull buoy, paddles), so the
 * Missing Equipment adaptation has real sets to substitute.
 * No Priority Set is defined by the docs, so none is selected by default.
 */
const easyAerobicReset = {
  id: SEED_WORKOUT_IDS.easyAerobicReset,
  name: 'Easy Aerobic Reset',
  focus: 'recovery',
  estimatedDurationMinutes: 40,
  poolLengthYards: DEFAULT_POOL_LENGTH_YARDS,
  prioritySetId: null,
  sets: [
    {
      id: 'warmup',
      name: 'Warm-up',
      role: 'warmup',
      repetitions: 1,
      distancePerRepYards: 300,
      stroke: 'choice',
      intervalSeconds: null,
      effort: 'easy',
      equipment: [],
      notes: '',
    },
    {
      id: 'pre-set',
      name: 'Pre-set',
      role: 'preset',
      repetitions: 6,
      distancePerRepYards: 50,
      stroke: 'kick',
      intervalSeconds: 65,
      effort: 'easy',
      equipment: ['kickboard'],
      notes: '',
    },
    {
      id: 'main-set',
      name: 'Main set',
      role: 'main',
      repetitions: 5,
      distancePerRepYards: 200,
      stroke: 'pull',
      intervalSeconds: 200,
      effort: 'easy',
      equipment: ['pullBuoy', 'paddles'],
      notes: '',
    },
    {
      id: 'cool-down',
      name: 'Cool-down',
      role: 'cooldown',
      repetitions: 1,
      distancePerRepYards: 200,
      stroke: 'choice',
      intervalSeconds: null,
      effort: 'easy',
      equipment: [],
      notes: '',
    },
  ],
}

/** Returns fresh deep copies so callers can never mutate the seed. */
export function createSeedWorkouts() {
  return JSON.parse(JSON.stringify([tuesdayThreshold, easyAerobicReset]))
}
