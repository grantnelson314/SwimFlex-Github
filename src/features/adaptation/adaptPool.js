/**
 * Rule Set E: Pool Limitation (deterministic prototype rules).
 *
 * Planned pool length (default 25 yd) vs the pool available today (e.g. 20 yd).
 * Reps, send-off intervals and strokes are kept. Each rep's distance is converted so it
 * still fits whole lengths of the available pool (see convertDistanceForPool):
 *   50 yd = 2 lengths of 25 -> 2 lengths of 20 = 40 yd;   25 yd -> 20 yd
 *   Distances that fit both pools exactly (multiples of 100) are not touched.
 */
import { DEFAULT_POOL_LENGTH_YARDS } from '../workouts/workoutData.js'
import { cloneWorkout, formatSetNotation, getPrioritySet } from '../workouts/workoutUtils.js'
import { RESULT_TYPES, buildChanges, finalizeRecommendation } from './adaptationBuilders.js'
import { CONSTRAINTS, POOL_ISSUE_LABELS } from './adaptationRequest.js'
import { convertDistanceForPool } from './adaptationRules.js'

export function getPlannedPoolLength(workout) {
  return workout?.poolLengthYards ?? DEFAULT_POOL_LENGTH_YARDS
}

const lengthsText = (n) => `${n} ${n === 1 ? 'length' : 'lengths'}`

export function adaptForPool(workout, request, prioritySetId) {
  const planned = getPlannedPoolLength(workout)
  const available = request.poolLengthYards
  const issues = (request.poolIssues ?? []).map((i) => POOL_ISSUE_LABELS[i] ?? i)
  const issuesNote =
    issues.length > 0
      ? ` You also noted: ${issues.join(', ').toLowerCase()}. SwimFlex doesn’t change the workout for that in this prototype; Pool Mode and the watch still give you the send-off countdown.`
      : ''

  if (planned === available) {
    return {
      type: RESULT_TYPES.noChangeNeeded,
      constraint: CONSTRAINTS.poolLimitation,
      message: `The pool is ${available} yd, the same length this workout was planned for, so no change is needed.${issuesNote}`,
    }
  }

  const adjusted = cloneWorkout(workout)
  adjusted.sets.forEach((set, index) => {
    const distance = convertDistanceForPool(set.distancePerRepYards, planned, available)
    if (distance !== set.distancePerRepYards) {
      adjusted.sets[index] = { ...set, distancePerRepYards: distance }
    }
  })

  const changes = buildChanges(workout, adjusted, prioritySetId, (before, after) => {
    const lengths = Math.round(before.distancePerRepYards / planned)
    return `${before.distancePerRepYards} yd is ${lengthsText(lengths)} of a ${planned} yd pool. In a ${available} yd pool the same ${lengthsText(lengths)} is ${after.distancePerRepYards} yd per rep. Reps, interval and stroke are unchanged.`
  })

  const affected = changes.filter((c) => c.changeType !== 'unchanged' && c.changeType !== 'preserved')
  if (affected.length === 0) {
    return {
      type: RESULT_TYPES.noChangeNeeded,
      constraint: CONSTRAINTS.poolLimitation,
      message: `Every set in this workout already fits a ${available} yd pool, so no change is needed.${issuesNote}`,
    }
  }

  const prioritySet = getPrioritySet({ ...workout, prioritySetId })
  const affectedNames = affected.map((c) => c.originalSet.name)

  const rationale = [
    `Planned pool: ${planned} yd. Available today: ${available} yd.`,
    `${affected.length} ${affected.length === 1 ? 'set doesn’t' : 'sets don’t'} fit whole ${available} yd lengths: ${affectedNames.join(', ')}.`,
    'Each affected rep keeps the same number of lengths, so a 50 is still 2 lengths and a 25 is still 1 length.',
    'Reps, send-off intervals and strokes were kept, so the structure and timing of the workout stay the same.',
    'Distances that fit both pools exactly (such as 100s and 200s) were left alone.',
  ]
  if (prioritySet) {
    rationale.push(
      affected.some((c) => c.originalSetId === prioritySet.id)
        ? `Your Priority Set (${prioritySet.name}) needed a different distance, so please review it.`
        : `Priority Set preserved: ${prioritySet.name} (${formatSetNotation(prioritySet)}).`,
    )
  }
  if (issuesNote) rationale.push(issuesNote.trim())

  const yardsChange = changes.reduce(
    (sum, c) =>
      sum +
      c.adjustedSet.repetitions * c.adjustedSet.distancePerRepYards -
      c.originalSet.repetitions * c.originalSet.distancePerRepYards,
    0,
  )
  const explanation = `Your pool is ${available} yd instead of ${planned} yd. ${affectedNames.join(' and ')} ${
    affectedNames.length === 1 ? 'was' : 'were'
  } shortened to whole ${available} yd lengths${yardsChange !== 0 ? ` (${Math.abs(yardsChange)} yd ${yardsChange < 0 ? 'less' : 'more'} in total)` : ''}. Reps and intervals are unchanged${
    prioritySet && !affected.some((c) => c.originalSetId === prioritySet.id) ? ', and your Priority Set is preserved' : ''
  }. This is a prototype suggestion.`

  return finalizeRecommendation({
    constraint: CONSTRAINTS.poolLimitation,
    workout,
    adjusted,
    prioritySetId,
    changes,
    summary: `Adjusted for a ${available} yd pool`,
    explanation,
    rationale,
    context: {
      heading: 'Pool today',
      items: [
        { label: 'Planned pool', value: `${planned} yd` },
        { label: 'Available pool', value: `${available} yd` },
        { label: 'Affected sets', value: affectedNames.join(', ') },
      ],
    },
  })
}
