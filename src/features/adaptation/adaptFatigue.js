/**
 * Rule Set B: Feeling Tired (deterministic prototype rules).
 *
 * Inputs: readiness 1-5, optional RPE so far, and a preference
 * (More rest / Less volume / Let SwimFlex decide).
 *
 *   effective readiness 4-5 -> no change
 *   effective readiness 3   -> small: a little more rest on supporting sets, or one small cut
 *   effective readiness 1-2 -> more rest first, then trim lower-priority volume
 *
 * Rest = the send-off interval. The Priority Set is never touched by this rule: the swimmer
 * can ease it themselves with Make Changes. SwimFlex only suggests training changes; it
 * makes no physiological or medical claims.
 */
import { formatInterval } from '../../utils/time.js'
import { cloneWorkout, formatSetNotation, getPrioritySet } from '../workouts/workoutUtils.js'
import { RESULT_TYPES, buildChanges, finalizeRecommendation } from './adaptationBuilders.js'
import { CONSTRAINTS, FATIGUE_PREFERENCE_LABELS } from './adaptationRequest.js'
import {
  SECONDARY_ROLES,
  canReduceSet,
  fatigueRestBump,
  fatigueUsesRest,
  fatigueVolumeSteps,
  getEffectiveReadiness,
  getReductionFloor,
  reduceSetOneStep,
} from './adaptationRules.js'

function describeSetChange(before, after) {
  const parts = []
  if (before.intervalSeconds !== after.intervalSeconds) {
    parts.push(
      `Rest increased: send-off @ ${formatInterval(before.intervalSeconds)} → @ ${formatInterval(after.intervalSeconds)}.`,
    )
  }
  if (before.repetitions !== after.repetitions) {
    parts.push(`Trimmed from ${before.repetitions} to ${after.repetitions} reps.`)
  }
  if (before.distancePerRepYards !== after.distancePerRepYards) {
    parts.push(`Trimmed from ${before.distancePerRepYards} to ${after.distancePerRepYards} yd per rep.`)
  }
  return parts.join(' ')
}

export function adaptForFatigue(workout, request, prioritySetId) {
  const readiness = request.readiness
  const rpe = request.rpe ?? null
  const preference = request.fatiguePreference ?? 'decide'
  const effective = getEffectiveReadiness(readiness, rpe)

  if (effective >= 4) {
    return {
      type: RESULT_TYPES.noChangeNeeded,
      constraint: CONSTRAINTS.feelingTired,
      message: `You rated your readiness ${readiness}/5${rpe != null ? ` with an RPE of ${rpe}/10` : ''}, so SwimFlex isn’t suggesting a change. If that changes during the workout, use Quick Adjust.`,
    }
  }

  const restBump = fatigueUsesRest(preference) ? fatigueRestBump(effective) : 0
  const volumeSteps = fatigueVolumeSteps(effective, preference)

  const adjusted = cloneWorkout(workout)
  adjusted.sets.forEach((set, index) => {
    if (!SECONDARY_ROLES.includes(set.role) || set.id === prioritySetId) return
    let next = { ...set }
    if (restBump && next.intervalSeconds) next.intervalSeconds += restBump
    if (volumeSteps > 0) {
      const floor = getReductionFloor('supporting', workout.sets[index])
      for (let step = 0; step < volumeSteps && canReduceSet(next, floor); step += 1) {
        next = reduceSetOneStep(next, floor)
      }
    }
    adjusted.sets[index] = next
  })

  const changes = buildChanges(workout, adjusted, prioritySetId, (before, after) => describeSetChange(before, after))
  const changedSets = changes.filter((c) => c.changeType !== 'unchanged' && c.changeType !== 'preserved')

  if (changedSets.length === 0) {
    return {
      type: RESULT_TYPES.noChangeNeeded,
      constraint: CONSTRAINTS.feelingTired,
      message:
        'There is no supporting work SwimFlex can ease without touching your Priority Set. Use Make Changes if you want to adjust the workout yourself.',
    }
  }

  const prioritySet = getPrioritySet({ ...workout, prioritySetId })
  const restSets = changedSets.filter((c) => c.originalSet.intervalSeconds !== c.adjustedSet.intervalSeconds)
  const volumeSets = changedSets.filter(
    (c) =>
      c.originalSet.repetitions !== c.adjustedSet.repetitions ||
      c.originalSet.distancePerRepYards !== c.adjustedSet.distancePerRepYards,
  )

  const rationale = [
    `You rated your readiness ${readiness}/5${rpe != null ? ` and your effort so far ${rpe}/10 (RPE)` : ''}.`,
    `Preference: ${FATIGUE_PREFERENCE_LABELS[preference]}.`,
  ]
  if (restSets.length > 0) {
    rationale.push(
      `Rest comes first: ${restBump} seconds were added to the send-off on ${restSets.map((c) => c.originalSet.name).join(', ')}.`,
    )
  }
  if (volumeSets.length > 0) {
    rationale.push(
      `Then lower-priority volume was trimmed on ${volumeSets.map((c) => c.originalSet.name).join(', ')}.`,
    )
  } else if (preference === 'decide' && effective === 3) {
    rationale.push('At this readiness a small increase in rest is enough, so no volume was cut.')
  }
  rationale.push('Warm-up and cool-down were kept as planned.')
  rationale.push(
    prioritySet
      ? `Priority Set preserved: ${prioritySet.name} (${formatSetNotation(prioritySet)}). SwimFlex won’t change it without your approval; use Make Changes if you want to ease it too.`
      : 'No Priority Set was selected, so the main set was left as planned.',
  )

  const doneParts = []
  if (restSets.length > 0) doneParts.push(`added ${restBump} seconds of rest to supporting sets`)
  if (volumeSets.length > 0) doneParts.push('trimmed supporting volume')
  const explanation = `Because you said you’re feeling tired (readiness ${readiness}/5), SwimFlex ${doneParts.join(' and ')}${
    prioritySet ? ` and kept your Priority Set as planned` : ''
  }. This is a training suggestion for the prototype, not medical advice.`

  return finalizeRecommendation({
    constraint: CONSTRAINTS.feelingTired,
    workout,
    adjusted,
    prioritySetId,
    changes,
    summary: `Eased for readiness ${readiness}/5`,
    explanation,
    rationale,
    context: {
      heading: 'What you told SwimFlex',
      items: [
        { label: 'Readiness', value: `${readiness} of 5` },
        { label: 'RPE so far', value: rpe != null ? `${rpe} of 10` : 'Not entered' },
        { label: 'Preference', value: FATIGUE_PREFERENCE_LABELS[preference] },
      ],
    },
  })
}
