/**
 * Deterministic rule primitives for the adaptation engine (PLAN.md Rule Sets A and C).
 * Pure functions + constants. No React, no randomness, no external AI.
 */
import { calculateSetYards, estimateSetSeconds } from '../workouts/workoutUtils.js'

/* ---------- Rule Set A: Less Time ---------- */

/** Distance reduction step for single-rep sets (e.g. a 400 yd warm-up). */
export const DISTANCE_STEP_YARDS = 50

/**
 * Reduction stages, applied in order until the time target is met.
 * Within a stage, roles are tried in the listed order (PLAN.md: pre-set/supporting work
 * first, then secondary speed/technique work, then excess warm-up).
 *
 * The Priority Set is excluded from every stage — it is never reduced by the engine.
 */
export const REDUCTION_STAGES = [
  {
    id: 'supporting',
    roles: ['preset', 'speed', 'technique', 'other', 'warmup'],
    requiresReview: false,
  },
  {
    id: 'deeper',
    roles: ['preset', 'speed', 'technique', 'other', 'warmup', 'cooldown'],
    requiresReview: false,
  },
  {
    // Last resort, only ever reaches a main set that is NOT the Priority Set.
    id: 'mainSet',
    roles: ['main'],
    requiresReview: true,
  },
]

const roundToStep = (value) => Math.round(value / DISTANCE_STEP_YARDS) * DISTANCE_STEP_YARDS

/**
 * The lowest value a stage may reduce a set to, measured against the ORIGINAL set.
 *   multi-rep sets  -> a minimum repetition count
 *   single-rep sets -> a minimum distance in yards
 * Stage 1 halves rep counts and trims 25% of single-rep distance
 * (400 yd warm-up -> 300 yd; 8 x 50 -> 4 x 50). Stage 2 goes deeper but keeps a basic
 * warm-up/cool-down of at least 200 yd.
 */
export function getReductionFloor(stageId, originalSet) {
  const { repetitions, distancePerRepYards } = originalSet
  const multiRep = repetitions > 1

  const stage1 = multiRep
    ? { repetitions: Math.ceil(repetitions / 2) }
    : { distancePerRepYards: Math.min(distancePerRepYards, roundToStep(distancePerRepYards * 0.75)) }

  if (stageId === 'deeper') {
    return multiRep
      ? { repetitions: Math.min(stage1.repetitions, 2) }
      : { distancePerRepYards: Math.min(stage1.distancePerRepYards, 200) }
  }
  return stage1 // 'supporting' and 'mainSet'
}

export function canReduceSet(set, floor) {
  return floor.repetitions != null
    ? set.repetitions > floor.repetitions
    : set.distancePerRepYards > floor.distancePerRepYards
}

/** Reduce a set by one step: one rep, or up to DISTANCE_STEP_YARDS (never below the floor). */
export function reduceSetOneStep(set, floor) {
  if (floor.repetitions != null) {
    return { ...set, repetitions: set.repetitions - 1 }
  }
  const nextDistance = Math.max(floor.distancePerRepYards, set.distancePerRepYards - DISTANCE_STEP_YARDS)
  return { ...set, distancePerRepYards: nextDistance }
}

/**
 * Reduce lower-priority volume stage by stage, one small step at a time, until
 * equiredSeconds have been removed (by the time model) or nothing more can be reduced.
 * Mutates djusted.sets. The Priority Set is never a candidate.
 *
 * isEligible(set, index) lets a caller restrict the work that may be touched
 * (Running Out of Time only allows sets that have not started yet).
 *
 * Returns { remainingSeconds, deepestStageBySet }; remainingSeconds > 0 means the target
 * could not be met without touching the Priority Set.
 */
export function reduceSupportingVolume(adjusted, original, prioritySetId, requiredSeconds, isEligible = () => true) {
  let remainingSeconds = requiredSeconds
  const deepestStageBySet = {}

  for (const stage of REDUCTION_STAGES) {
    if (remainingSeconds <= 0) break
    for (const role of stage.roles) {
      adjusted.sets.forEach((set, index) => {
        if (remainingSeconds <= 0 || set.role !== role || set.id === prioritySetId) return
        if (!isEligible(set, index)) return
        const originalSet = original.sets[index]
        const floor = getReductionFloor(stage.id, originalSet)
        let current = adjusted.sets[index]
        while (remainingSeconds > 0 && canReduceSet(current, floor)) {
          const next = reduceSetOneStep(current, floor)
          remainingSeconds -= estimateSetSeconds(current) - estimateSetSeconds(next)
          current = next
          deepestStageBySet[set.id] = stage.id
        }
        adjusted.sets[index] = current
      })
    }
  }

  return { remainingSeconds, deepestStageBySet }
}

/** Yards removed for display in explanations. */
export function yardsRemoved(originalSet, adjustedSet) {
  return calculateSetYards(originalSet) - calculateSetYards(adjustedSet)
}

/* ---------- Rule Set C: Workout Too Difficult / Interval Too Fast ---------- */

/**
 * Send-off interval increase by RPE (seconds). Deterministic table:
 *   RPE <= 6 -> no change     RPE 7 -> +5     RPE 8 -> +10 (canonical: 2:50 -> 3:00)
 *   RPE 9    -> +15           RPE 10 -> +20
 * Reps are always kept; fewer reps is only suggested, never applied by this rule.
 */
export const RPE_INTERVAL_BUMP_SECONDS = { 7: 5, 8: 10, 9: 15, 10: 20 }

export function intervalBumpForRpe(rpe) {
  if (rpe <= 6) return 0
  return RPE_INTERVAL_BUMP_SECONDS[Math.min(rpe, 10)] ?? 0
}

/**
 * Pure helper reused later by Quick Adjust: returns the slower interval for a set at a
 * given RPE, or the unchanged interval when no change is warranted.
 */
export function adjustIntervalForRpe(set, rpe) {
  const bump = intervalBumpForRpe(rpe)
  return {
    bumpSeconds: bump,
    previousIntervalSeconds: set.intervalSeconds,
    newIntervalSeconds: set.intervalSeconds + bump,
  }
}

/* ---------- Rule Set B: Feeling Tired ---------- */

/**
 * Readiness (1 = very tired, 5 = fresh) is the main input. A hard reported effort nudges it
 * down; a high RPE with otherwise decent readiness is not ignored:
 *   RPE >= 9 -> one point lower (never below 1)
 *   RPE >= 8 -> readiness 4-5 is treated as 3
 * These are prototype rules. They are not physiological or medical measurements.
 */
export function getEffectiveReadiness(readiness, rpe) {
  let effective = readiness
  if (rpe != null && rpe >= 9) effective = Math.max(1, effective - 1)
  if (rpe != null && rpe >= 8 && effective >= 4) effective = 3
  return effective
}

/** Extra send-off seconds for tired swimmers, by effective readiness. 4-5 -> none. */
export const FATIGUE_REST_BUMP_SECONDS = { 3: 5, 2: 10, 1: 15 }

export function fatigueRestBump(effectiveReadiness) {
  return FATIGUE_REST_BUMP_SECONDS[effectiveReadiness] ?? 0
}

/** Roles that count as secondary work: they are eased before anything else. */
export const SECONDARY_ROLES = ['preset', 'speed', 'technique', 'other']

/**
 * How many one-step volume cuts each secondary set gets, by effective readiness and preference.
 * Infinity = all the way down to the first-stage floor (same floor Less Time uses).
 *   moreRest   -> never cuts volume
 *   lessVolume -> 3: 1 step, 2: 2 steps, 1: to the floor
 *   decide     -> rest first; volume only when readiness is 2 or lower (2: 1 step, 1: to the floor)
 */
export function fatigueVolumeSteps(effectiveReadiness, preference) {
  if (preference === 'moreRest') return 0
  if (preference === 'lessVolume') return { 3: 1, 2: 2, 1: Infinity }[effectiveReadiness] ?? 0
  return { 2: 1, 1: Infinity }[effectiveReadiness] ?? 0
}

/** Whether the rest increase is part of the plan for this preference. */
export function fatigueUsesRest(preference) {
  return preference !== 'lessVolume'
}

/* ---------- Rule Set D: Missing Equipment ---------- */

/**
 * Predefined prototype substitutions. Each one returns the set without that item, plus a short
 * note in plain words. They are NOT claims of physiological equivalence: a set swum without
 * paddles feels different, and that is said on screen.
 */
export const EQUIPMENT_SUBSTITUTIONS = {
  paddles: {
    apply: (set) => ({ ...set }),
    note: () => 'swum without paddles',
  },
  fins: {
    apply: (set) => ({ ...set }),
    note: () => 'swum without fins',
  },
  pullBuoy: {
    // A pull set needs the buoy; without it the set becomes a regular swim of the same size.
    apply: (set) => (set.stroke === 'pull' ? { ...set, stroke: 'free' } : { ...set }),
    note: (set) => (set.stroke === 'pull' ? 'swum as regular freestyle instead of pull' : 'swum without a pull buoy'),
  },
  kickboard: {
    // A kickboard kick set becomes a kick on the back / in streamline (no board needed).
    apply: (set) => ({
      ...set,
      notes: set.stroke === 'kick' ? 'Kick on your back or in streamline.' : set.notes,
    }),
    note: (set) => (set.stroke === 'kick' ? 'kicked on your back or in streamline' : 'done without a kickboard'),
  },
}

/** The prototype substitution for one item, or null when none is defined. */
export function getEquipmentSubstitution(item) {
  return EQUIPMENT_SUBSTITUTIONS[item] ?? null
}

/* ---------- Rule Set E: Pool Limitation ---------- */

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b))
export const lcm = (a, b) => (a * b) / gcd(a, b)

/**
 * New per-rep distance when the pool length changes (reps, interval and stroke never change).
 *   - A distance that fits both pools exactly (a multiple of lcm(25, 20) = 100) is kept.
 *   - Otherwise the swimmer keeps the same NUMBER OF LENGTHS: 50 yd = 2 x 25 -> 2 x 20 = 40 yd.
 */
export function convertDistanceForPool(distanceYards, plannedPoolYards, availablePoolYards) {
  if (plannedPoolYards === availablePoolYards) return distanceYards
  if (distanceYards % lcm(plannedPoolYards, availablePoolYards) === 0) return distanceYards
  const lengths = Math.max(1, Math.round(distanceYards / plannedPoolYards))
  return lengths * availablePoolYards
}

/* ---------- Which constraints the engine implements ---------- */

export const SUPPORTED_CONSTRAINTS = [
  'lessTime',
  'feelingTired',
  'workoutTooDifficult',
  'missingEquipment',
  'poolLimitation',
  'painOrInjury',
]
