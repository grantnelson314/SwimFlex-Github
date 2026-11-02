/**
 * Deterministic adaptation engine (PLAN.md "Feature 3", ARCHITECTURE.md "Adaptation Engine").
 *
 * - Pure functions only: same inputs -> same output, for every participant.
 * - No React, no I/O, no randomness, no external AI/LLM.
 * - Never applies anything: it only RECOMMENDS. The UI shows every change and the swimmer
 *   decides (accept / make changes / keep original).
 *
 * Main entry: recommendWorkout(workout, request) -> result with a `type`:
 *   'recommendation'        a proposal to review
 *   'safetyBoundary'        pain/injury: NO adaptation is generated
 *   'noChangeNeeded'        the workout already fits / the report is within range
 *   'impossibleTimeTarget'  target can't be met while preserving the Priority Set
 *   'invalidRequest'        bad inputs
 *   'unsupportedConstraint' rule set not built yet
 */
import { formatInterval } from '../../utils/time.js'
import { FOCUS_LABELS } from '../workouts/workoutData.js'
import {
  cloneWorkout,
  estimateAdjustedMinutes,
  formatSetNotation,
  getPrioritySet,
} from '../workouts/workoutUtils.js'
import { adaptForEquipment } from './adaptEquipment.js'
import { adaptForFatigue } from './adaptFatigue.js'
import { adaptForPool } from './adaptPool.js'
import {
  RESULT_TYPES,
  buildChanges,
  finalizeRecommendation,
  getPriorityStatus,
  minutesText,
} from './adaptationBuilders.js'
import { CONSTRAINTS, validateAdaptationRequest } from './adaptationRequest.js'
import { SUPPORTED_CONSTRAINTS, adjustIntervalForRpe, reduceSupportingVolume } from './adaptationRules.js'

// Re-exported so existing imports (`from './adaptationEngine.js'`) keep working.
export { RESULT_TYPES, buildChanges, finalizeRecommendation, getPriorityStatus }

export function isConstraintSupported(constraint) {
  return SUPPORTED_CONSTRAINTS.includes(constraint)
}

/* ---------- Entry point ---------- */

export function recommendWorkout(workout, request) {
  // Safety first: pain/injury never produces a normal adaptation, whatever else is set.
  if (request?.constraint === CONSTRAINTS.painOrInjury) {
    return {
      type: RESULT_TYPES.safetyBoundary,
      constraint: CONSTRAINTS.painOrInjury,
      sourceWorkoutId: workout?.id ?? request.workoutId ?? null,
    }
  }

  if (!workout) {
    return {
      type: RESULT_TYPES.invalidRequest,
      errors: [{ field: 'workout', message: 'Workout not found.' }],
    }
  }

  const errors = validateAdaptationRequest(request, workout)
  if (errors.length > 0) return { type: RESULT_TYPES.invalidRequest, errors }

  const prioritySetId =
    'prioritySetId' in request ? request.prioritySetId : (workout.prioritySetId ?? null)

  switch (request.constraint) {
    case CONSTRAINTS.lessTime:
      return adaptForTime(workout, request, prioritySetId)

    case CONSTRAINTS.workoutTooDifficult:
      return adaptForDifficulty(workout, request, prioritySetId)

    case CONSTRAINTS.feelingTired:
      return adaptForFatigue(workout, request, prioritySetId)

    case CONSTRAINTS.missingEquipment:
      return adaptForEquipment(workout, request, prioritySetId)

    case CONSTRAINTS.poolLimitation:
      return adaptForPool(workout, request, prioritySetId)

    default:
      return {
        type: RESULT_TYPES.unsupportedConstraint,
        constraint: request.constraint,
        message: 'SwimFlex can’t suggest changes for this option yet.',
      }
  }
}

/* ---------- Rule Set A: Less Time ---------- */

const REDUCED_TEXT = {
  warmup: 'Warm-up volume was reduced to help meet the available time.',
  preset: 'Pre-set volume was cut first so your main set stays untouched.',
  speed: 'Secondary speed work was trimmed because it is not your Priority Set.',
  technique: 'Technique work was trimmed because it is not your Priority Set.',
  cooldown: 'Cool-down was shortened as a later step; a basic cool-down remains.',
  main: 'Supporting work alone could not reach your time, so this set was shortened. Please review it.',
  other: 'Supporting volume was reduced to help meet the available time.',
}

function adaptForTime(workout, request, prioritySetId) {
  const availableMinutes = request.availableMinutes
  const originalMinutes = workout.estimatedDurationMinutes
  const neededMinutes = originalMinutes - availableMinutes
  const requiredSeconds = neededMinutes * 60

  if (requiredSeconds <= 0) {
    return {
      type: RESULT_TYPES.noChangeNeeded,
      constraint: CONSTRAINTS.lessTime,
      message: `This workout is estimated at ${originalMinutes} min, so it already fits in ${availableMinutes} min. No change is needed.`,
    }
  }

  const adjusted = cloneWorkout(workout)

  // Reduce lower-priority volume stage by stage, one small step at a time,
  // and stop as soon as the target is met. The Priority Set is never a candidate.
  const { remainingSeconds, deepestStageBySet } = reduceSupportingVolume(
    adjusted,
    workout,
    prioritySetId,
    requiredSeconds,
  )

  if (remainingSeconds > 0) {
    // Target can't be met without changing the Priority Set: explain, never silently destroy it.
    const minimumMinutes = estimateAdjustedMinutes(workout, adjusted)
    return {
      type: RESULT_TYPES.impossibleTimeTarget,
      constraint: CONSTRAINTS.lessTime,
      availableMinutes,
      minimumMinutes,
      message: `${availableMinutes} min is too short to keep your Priority Set. Even after trimming supporting work, the shortest workout that keeps it is about ${minimumMinutes} min.`,
      options: ['increaseTime', 'manualEdit'],
    }
  }

  const changes = buildChanges(workout, adjusted, prioritySetId, (orig) => REDUCED_TEXT[orig.role] ?? REDUCED_TEXT.other)

  const reducedSets = changes.filter((c) => c.changeType === 'reduced')
  const usedMainSetStage = reducedSets.some((c) => c.originalSet.role === 'main')
  const usedDeeperStage = Object.values(deepestStageBySet).includes('deeper')

  const adjustedForText = { ...adjusted, estimatedDurationMinutes: estimateAdjustedMinutes(workout, adjusted) }
  const savedMinutes = originalMinutes - adjustedForText.estimatedDurationMinutes
  const focus = FOCUS_LABELS[workout.focus] ?? workout.focus
  const prioritySet = getPrioritySet({ ...workout, prioritySetId })

  // "How SwimFlex decided" — shown verbatim on the Proposed Changes screen.
  const rationale = []
  rationale.push(
    prioritySet
      ? `Priority Set preserved: ${prioritySet.name} (${formatSetNotation(prioritySet)}).`
      : 'No Priority Set was selected, so there was no specific set to protect.',
  )
  rationale.push(
    `${minutesText(neededMinutes)} needed to be removed to fit your ${availableMinutes} min (original estimate: ${originalMinutes} min).`,
  )
  rationale.push(
    `Lower-priority supporting volume was reduced first: ${reducedSets
      .filter((c) => c.originalSet.role !== 'main')
      .map((c) => c.originalSet.name)
      .join(', ')}.`,
  )
  if (usedDeeperStage) {
    rationale.push('Supporting sets were trimmed further, keeping a basic warm-up and cool-down.')
  }
  const cooldowns = changes.filter((c) => c.originalSet.role === 'cooldown')
  if (cooldowns.length > 0) {
    rationale.push(
      cooldowns.every((c) => c.changeType === 'unchanged') ? 'Cool-down retained.' : 'Cool-down kept, but shortened.',
    )
  }
  const unchangedMain = changes.filter((c) => c.originalSet.role === 'main' && c.changeType !== 'reduced')
  if (unchangedMain.length > 0) {
    rationale.push(`${focus} main set unchanged: ${formatSetNotation(unchangedMain[0].originalSet)}.`)
  }
  if (usedMainSetStage) {
    rationale.push('Because supporting work alone could not reach your time, the main set was also shortened. Please review it.')
  }
  if (request.readiness <= 2) {
    rationale.push(
      `Your readiness is low (${request.readiness}/5). SwimFlex won’t change your Priority Set without your approval — use Make Changes if you want to ease it.`,
    )
  }

  let explanation
  if (usedMainSetStage) {
    explanation = `Supporting volume was reduced to save ${minutesText(savedMinutes)}. Because that was not enough, the main set was shortened too, so please review the changes.`
  } else if (prioritySet) {
    explanation = `Your priority ${focus.toLowerCase()} set is preserved. Supporting volume was reduced to save ${minutesText(savedMinutes)} without changing the primary training stimulus.`
  } else {
    explanation = `Supporting volume was reduced to save ${minutesText(savedMinutes)}. No Priority Set was selected, so choose one next time to control what is protected.`
  }

  return finalizeRecommendation({
    constraint: CONSTRAINTS.lessTime,
    workout,
    adjusted,
    prioritySetId,
    changes,
    summary: `Built for ${availableMinutes} minutes`,
    explanation,
    rationale,
    extraReview: usedMainSetStage,
  })
}

/* ---------- Rule Set C: Workout Too Difficult / Interval Too Fast ---------- */

function adaptForDifficulty(workout, request, prioritySetId) {
  const { rpe } = request
  const targetIndex = workout.sets.findIndex((s) => s.id === request.targetSetId)
  const targetSet = workout.sets[targetIndex]
  const { bumpSeconds, previousIntervalSeconds, newIntervalSeconds } = adjustIntervalForRpe(targetSet, rpe)

  if (bumpSeconds === 0) {
    return {
      type: RESULT_TYPES.noChangeNeeded,
      constraint: CONSTRAINTS.workoutTooDifficult,
      message: `An RPE of ${rpe}/10 is within a manageable range, so SwimFlex isn’t suggesting an interval change.`,
    }
  }

  const adjusted = cloneWorkout(workout)
  adjusted.sets[targetIndex] = { ...targetSet, intervalSeconds: newIntervalSeconds }

  const from = formatInterval(previousIntervalSeconds)
  const to = formatInterval(newIntervalSeconds)
  const structure = `${targetSet.repetitions} × ${targetSet.distancePerRepYards}`

  const changes = buildChanges(
    workout,
    adjusted,
    prioritySetId,
    () =>
      `Interval increased from ${from} to ${to}. All ${targetSet.repetitions} reps were kept, so the set structure is unchanged.`,
  )

  const rationale = [
    'Increasing the send-off interval is the first adjustment tried, because it keeps the set intact.',
    `RPE ${rpe}/10 adds ${bumpSeconds} seconds to the interval (${from} → ${to}).`,
    `All ${targetSet.repetitions} repetitions of ${structure} were kept; only the interval changed.`,
  ]
  if (targetSet.id === prioritySetId) {
    rationale.push(
      'This is your Priority Set. Its structure is preserved, but its interval changed, so it needs your approval before it is used.',
    )
  } else if (prioritySetId) {
    rationale.push('Your Priority Set was not changed.')
  }
  rationale.push('If it is still too hard, fewer reps can be chosen manually with Make Changes.')

  return finalizeRecommendation({
    constraint: CONSTRAINTS.workoutTooDifficult,
    workout,
    adjusted,
    prioritySetId,
    changes,
    summary: `Interval eased: @ ${from} → @ ${to}`,
    explanation: `The ${targetSet.name} interval is being increased from ${from} to ${to} because it felt too hard (RPE ${rpe}/10). All ${targetSet.repetitions} reps are kept, so the set structure is preserved and the interval becomes more achievable.`,
    rationale,
  })
}
