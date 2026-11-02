/**
 * Rule Set D: Missing Equipment (deterministic prototype rules).
 *
 * The swimmer marks equipment they don't have. Every set that uses it is replaced with its
 * predefined prototype substitution (reps, distance and interval stay the same) and marked
 * "Replaced". A set whose equipment has no predefined substitution is left unchanged and
 * flagged for a manual choice. Substitutions are never described as equivalent training.
 */
import { EQUIPMENT, EQUIPMENT_LABELS } from '../workouts/workoutData.js'
import { cloneWorkout, formatEquipmentList, formatSetNotation, getPrioritySet } from '../workouts/workoutUtils.js'
import { RESULT_TYPES, buildChanges, finalizeRecommendation } from './adaptationBuilders.js'
import { CONSTRAINTS } from './adaptationRequest.js'
import { getEquipmentSubstitution } from './adaptationRules.js'

const labelOf = (item) => EQUIPMENT_LABELS[item] ?? item

/**
 * Pure helper: the substituted version of one set, plus what happened.
 * Returns null when the set doesn't use any unavailable equipment.
 */
export function substituteEquipment(set, availableEquipment) {
  const missing = (set.equipment ?? []).filter((item) => !availableEquipment.includes(item))
  if (missing.length === 0) return null

  let next = { ...set, equipment: (set.equipment ?? []).filter((item) => availableEquipment.includes(item)) }
  const notes = []
  const needsManualChoice = []

  for (const item of missing) {
    const substitution = getEquipmentSubstitution(item)
    if (!substitution) {
      // No predefined replacement: keep the set as it is and ask the swimmer to choose.
      next = { ...next, equipment: [...next.equipment, item] }
      needsManualChoice.push(item)
      continue
    }
    notes.push(substitution.note(next))
    next = substitution.apply(next)
  }

  return { missing, adjustedSet: next, notes, needsManualChoice }
}

export function adaptForEquipment(workout, request, prioritySetId) {
  const available = request.availableEquipment
  const adjusted = cloneWorkout(workout)
  const details = {}

  adjusted.sets.forEach((set, index) => {
    const result = substituteEquipment(set, available)
    if (!result) return
    adjusted.sets[index] = result.adjustedSet
    details[set.id] = result
  })

  const affectedIds = Object.keys(details)
  const markedMissing = EQUIPMENT.filter((item) => !available.includes(item))

  if (affectedIds.length === 0) {
    return {
      type: RESULT_TYPES.noChangeNeeded,
      constraint: CONSTRAINTS.missingEquipment,
      message: `None of the sets in this workout use ${formatEquipmentList(markedMissing)}, so no change is needed.`,
    }
  }

  const manualSets = affectedIds.filter((id) => details[id].needsManualChoice.length > 0)

  const changes = buildChanges(workout, adjusted, prioritySetId, (before) => {
    const d = details[before.id]
    return `Replaced because ${formatEquipmentList(d.missing)} ${d.missing.length === 1 ? 'isn’t' : 'aren’t'} available: ${before.name.toLowerCase()} will be ${d.notes.join(' and ')}. Reps, distance and interval are unchanged. This is a prototype recommendation, not an exact equivalent.`
  }).map((change) => {
    const d = details[change.originalSetId]
    // A set whose equipment has no predefined substitution stays as it is, with a clear reason.
    if (d && d.needsManualChoice.length > 0 && change.changeType === 'unchanged') {
      return {
        ...change,
        explanation: `No prototype replacement is defined for ${formatEquipmentList(d.needsManualChoice)}. Choose your own change with Make Changes.`,
      }
    }
    return change
  })

  const prioritySet = getPrioritySet({ ...workout, prioritySetId })
  const replacedNames = changes.filter((c) => c.changeType === 'replaced').map((c) => c.originalSet.name)

  const rationale = [
    `You marked ${formatEquipmentList(markedMissing)} as not available today.`,
    `${affectedIds.length} ${affectedIds.length === 1 ? 'set uses' : 'sets use'} it: ${affectedIds
      .map((id) => workout.sets.find((s) => s.id === id).name)
      .join(', ')}.`,
    'Each affected set was swapped for a predefined prototype substitution. Reps, distance and send-off interval were kept.',
    'These are simple prototype substitutions. SwimFlex does not claim the swap gives the same training effect.',
  ]
  if (prioritySet) {
    rationale.push(
      details[prioritySet.id]
        ? `Your Priority Set (${prioritySet.name}) used missing equipment, so its notation changed. Please review it.`
        : `Priority Set preserved: ${prioritySet.name} (${formatSetNotation(prioritySet)}).`,
    )
  }
  if (manualSets.length > 0) {
    rationale.push('Some sets have no predefined substitution and were left unchanged for you to edit.')
  }

  const explanation = `${replacedNames.length > 0 ? replacedNames.join(' and ') : 'Affected sets'} used equipment you don’t have, so ${
    replacedNames.length === 1 ? 'it was' : 'they were'
  } swapped for a simpler version. Distances and intervals stay the same. This is a prototype recommendation, not a claim that the replacement trains the same thing.`

  return finalizeRecommendation({
    constraint: CONSTRAINTS.missingEquipment,
    workout,
    adjusted,
    prioritySetId,
    changes,
    summary: `Replaced sets that need ${formatEquipmentList(markedMissing.filter((item) => Object.values(details).some((d) => d.missing.includes(item))))}`,
    explanation,
    rationale,
    extraReview: manualSets.length > 0 ? 'Some sets need your own choice because no replacement is defined.' : false,
    context: {
      heading: 'Equipment today',
      items: [
        { label: 'Not available', value: markedMissing.map(labelOf).join(', ') },
        {
          label: 'Affected sets',
          value: affectedIds.map((id) => workout.sets.find((s) => s.id === id).name).join(', '),
        },
      ],
    },
  })
}
