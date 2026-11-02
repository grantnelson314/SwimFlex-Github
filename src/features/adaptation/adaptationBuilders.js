/**
 * Shared building blocks for every adaptation rule set (pure, no React).
 *
 * Each rule set (less time, tired, difficulty, equipment, pool) produces an `adjusted`
 * workout and then uses these helpers to describe it in the one recommendation shape the
 * Proposed Changes screen understands.
 */
import {
  areSetsEqual,
  calculateSetYards,
  calculateWorkoutYards,
  estimateAdjustedMinutes,
  formatSetNotation,
  getPrioritySet,
} from '../workouts/workoutUtils.js'

export const RESULT_TYPES = {
  recommendation: 'recommendation',
  safetyBoundary: 'safetyBoundary',
  noChangeNeeded: 'noChangeNeeded',
  impossibleTimeTarget: 'impossibleTimeTarget',
  invalidRequest: 'invalidRequest',
  unsupportedConstraint: 'unsupportedConstraint',
}

export const minutesText = (n) => `${n} ${Math.abs(n) === 1 ? 'minute' : 'minutes'}`

/**
 * 'none'            no Priority Set selected
 * 'preserved'       identical to the original
 * 'intervalAdjusted' structure kept (reps/distance/stroke), only the interval differs
 * 'modified'        reps/distance/etc. changed (requires explicit user review)
 */
export function getPriorityStatus(original, adjusted, prioritySetId) {
  const before = original.sets.find((s) => s.id === prioritySetId)
  if (!before) return 'none'
  const after = adjusted.sets.find((s) => s.id === prioritySetId)
  if (!after) return 'modified'
  if (areSetsEqual(before, after)) return 'preserved'
  if (areSetsEqual({ ...before, intervalSeconds: 0 }, { ...after, intervalSeconds: 0 })) {
    return 'intervalAdjusted'
  }
  return 'modified'
}

const UNCHANGED_TEXT = {
  cooldown: 'Cool-down kept so the session still finishes easy.',
  warmup: 'Warm-up kept as planned.',
  main: 'Main set kept as planned.',
}

const sameList = (a = [], b = []) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())

/**
 * Compare every original set with its adjusted twin (same index) and describe it.
 * changeType: preserved | unchanged | intervalAdjusted | replaced | reduced | increased | edited
 *   replaced = same structure, different stroke or equipment (a substitution)
 */
export function buildChanges(original, adjusted, prioritySetId, explainChanged) {
  return original.sets.map((originalSet, i) => {
    const adjustedSet = adjusted.sets[i]
    const isPriority = originalSet.id === prioritySetId

    if (areSetsEqual(originalSet, adjustedSet)) {
      return {
        originalSetId: originalSet.id,
        originalSet,
        adjustedSet,
        changeType: isPriority ? 'preserved' : 'unchanged',
        explanation: isPriority
          ? 'Priority Set kept exactly as planned.'
          : (UNCHANGED_TEXT[originalSet.role] ?? 'No change needed.'),
      }
    }

    const onlyInterval = areSetsEqual(
      { ...originalSet, intervalSeconds: 0 },
      { ...adjustedSet, intervalSeconds: 0 },
    )
    const sameShape =
      originalSet.repetitions === adjustedSet.repetitions &&
      originalSet.distancePerRepYards === adjustedSet.distancePerRepYards
    const substituted =
      originalSet.stroke !== adjustedSet.stroke || !sameList(originalSet.equipment, adjustedSet.equipment)
    const yardsDiff = calculateSetYards(adjustedSet) - calculateSetYards(originalSet)

    let changeType = 'edited'
    if (onlyInterval) changeType = 'intervalAdjusted'
    else if (sameShape && substituted) changeType = 'replaced'
    else if (yardsDiff < 0) changeType = 'reduced'
    else if (yardsDiff > 0) changeType = 'increased'
    return {
      originalSetId: originalSet.id,
      originalSet,
      adjustedSet,
      changeType,
      explanation: explainChanged(originalSet, adjustedSet, changeType),
    }
  })
}

/**
 * Wrap an adjusted workout into the recommendation the UI renders.
 *
 *   context      optional { heading, items: [{ label, value }] } shown above the changes
 *                (e.g. planned vs available pool length)
 *   extraReview  true | string: the engine went beyond what is normally safe to apply
 *                without a closer look (string = the reason shown to the swimmer)
 */
export function finalizeRecommendation({
  constraint,
  workout,
  adjusted,
  prioritySetId,
  changes,
  summary,
  explanation,
  rationale,
  extraReview = false,
  context = null,
}) {
  const adjustedMinutes = estimateAdjustedMinutes(workout, adjusted)
  const originalMinutes = workout.estimatedDurationMinutes
  const originalYards = calculateWorkoutYards(workout)
  const adjustedYards = calculateWorkoutYards(adjusted)

  const adjustedWorkout = {
    ...adjusted,
    id: `${workout.id}-adjusted`,
    sourceWorkoutId: workout.id,
    isAdjusted: true,
    estimatedDurationMinutes: adjustedMinutes,
  }

  const priorityStatus = getPriorityStatus(workout, adjustedWorkout, prioritySetId)
  const prioritySet = getPrioritySet({ ...workout, prioritySetId })

  let reviewReason = null
  if (typeof extraReview === 'string') reviewReason = extraReview
  else if (extraReview) reviewReason = 'This proposal goes beyond trimming supporting work.'
  else if (priorityStatus === 'intervalAdjusted') {
    reviewReason = 'This changes the interval of your Priority Set. Its reps and distance are kept.'
  } else if (priorityStatus === 'modified') {
    reviewReason = 'This changes your Priority Set, so please look at it before you use it.'
  }

  return {
    type: RESULT_TYPES.recommendation,
    id: `rec-${workout.id}-${constraint}`,
    status: 'proposed',
    constraint,
    sourceWorkoutId: workout.id,
    adjustedWorkout,
    changes,
    summary,
    explanation,
    rationale,
    context,
    originalYards,
    adjustedYards,
    originalMinutes,
    adjustedMinutes,
    yardsChanged: adjustedYards - originalYards,
    // Positive = saved, negative = added.
    estimatedMinutesSaved: originalMinutes - adjustedMinutes,
    priority: {
      setId: prioritySet?.id ?? null,
      setName: prioritySet?.name ?? null,
      notation: prioritySet ? formatSetNotation(prioritySet) : null,
      status: priorityStatus,
    },
    // Explicit extra review whenever the Priority Set is touched at all, or when the
    // engine had to go beyond supporting work (Priority Set Invariant, ARCHITECTURE.md).
    requiresUserReview: reviewReason !== null,
    reviewReason,
  }
}
