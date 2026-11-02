/**
 * Pure workout helpers — the single place for yardage math and swim notation.
 * Do not duplicate these calculations in components.
 */
import { formatInterval } from '../../utils/time.js'
import { EQUIPMENT_LABELS, FOCUS_LABELS, ROLE_LABELS, STROKE_LABELS } from './workoutData.js'

/** repetitions × distancePerRepYards */
export function calculateSetYards(set) {
  return (set?.repetitions ?? 0) * (set?.distancePerRepYards ?? 0)
}

/** Total yards, always derived from sets. */
export function calculateWorkoutYards(workout) {
  return (workout?.sets ?? []).reduce((sum, set) => sum + calculateSetYards(set), 0)
}

export function cloneWorkout(workout) {
  return JSON.parse(JSON.stringify(workout))
}

export function getFocusLabel(focus) {
  return FOCUS_LABELS[focus] ?? focus
}

export function getRoleLabel(role) {
  return ROLE_LABELS[role] ?? role
}

export function getWorkoutById(workouts, id) {
  return workouts.find((w) => w.id === id) ?? null
}

export function getPrioritySet(workout) {
  if (!workout?.prioritySetId) return null
  return workout.sets.find((s) => s.id === workout.prioritySetId) ?? null
}

/* ---------- Estimated time (prototype calibration) ----------
 *
 * PLAN.md fixes the canonical Less Time case at 2,500 yd / 52 min -> 2,100 yd / 40 min
 * but gives no formula. This is a deliberately simple, deterministic MODEL calibrated to
 * reproduce that case. It is NOT physiological and is not presented as such.
 *
 *   interval set   : repetitions x (send-off interval + REP_ALLOWANCE_SECONDS)
 *   continuous set : yards / 100 x CONTINUOUS_SECONDS_PER_100_YD
 *
 * An adjusted workout's estimate = original stored estimate + modeled change, so the
 * original always shows its documented time (52 min, 40 min).
 */
export const TIME_MODEL = {
  continuousSecondsPer100Yards: 100,
  repAllowanceSeconds: 30,
}

export function estimateSetSeconds(set) {
  const reps = set?.repetitions ?? 0
  if (set?.intervalSeconds) {
    return reps * (set.intervalSeconds + TIME_MODEL.repAllowanceSeconds)
  }
  return (calculateSetYards(set) / 100) * TIME_MODEL.continuousSecondsPer100Yards
}

export function estimateWorkoutSeconds(workout) {
  return (workout?.sets ?? []).reduce((sum, set) => sum + estimateSetSeconds(set), 0)
}

/** Whole minutes for an adjusted workout, anchored to the original's stored estimate. */
export function estimateAdjustedMinutes(originalWorkout, adjustedWorkout) {
  const deltaSeconds = estimateWorkoutSeconds(adjustedWorkout) - estimateWorkoutSeconds(originalWorkout)
  return Math.round(originalWorkout.estimatedDurationMinutes + deltaSeconds / 60)
}

/** True when two sets are identical in every field that affects training. */
export function areSetsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Sets that have a send-off interval (the ones that can be "too hard" by interval). */
export function getIntervalSets(workout) {
  return (workout?.sets ?? []).filter((s) => s.intervalSeconds)
}

/** "paddles", "pull buoy and paddles" - lowercase, for use inside a sentence. */
export function formatEquipmentList(equipment) {
  const names = (equipment ?? []).map((e) => (EQUIPMENT_LABELS[e] ?? e).toLowerCase())
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * Swim notation for a set, e.g.
 *   6 × 200 free @ 2:50
 *   8 × 25 fast @ :35
 *   400 easy choice
 * Distances are yards; the "yd" unit is shown separately on cards.
 */
export function formatSetNotation(set) {
  const { repetitions, distancePerRepYards, stroke, effort, intervalSeconds } = set

  const parts = [
    repetitions > 1 ? `${repetitions} × ${distancePerRepYards}` : `${distancePerRepYards}`,
  ]

  // Effort words that read naturally in swim shorthand.
  if (effort === 'easy' && repetitions === 1) parts.push('easy')
  if (effort === 'fast') parts.push('fast')

  // "fast choice" is written just "fast"; otherwise name the stroke.
  const omitStroke = stroke === 'choice' && effort === 'fast'
  if (!omitStroke) parts.push(STROKE_LABELS[stroke] ?? stroke)

  let notation = parts.join(' ')
  const equipmentText = formatEquipmentList(set.equipment)
  if (equipmentText) notation += ` with ${equipmentText}`
  if (intervalSeconds) notation += ` @ ${formatInterval(intervalSeconds)}`
  return notation
}

/**
 * Large Pool Mode title, per DESIGN.md: "200 yd Free".
 * The rep count is shown separately ("REP 2 OF 6"), so this is the per-rep distance only.
 */
export function formatPoolSetTitle(set) {
  const { distancePerRepYards, stroke, effort } = set
  let label
  if (stroke === 'choice') label = effort === 'fast' ? 'Fast' : effort === 'easy' ? 'Easy choice' : 'Choice'
  else label = STROKE_LABELS[stroke] ?? stroke
  return `${distancePerRepYards} yd ${label.charAt(0).toUpperCase()}${label.slice(1)}`
}
