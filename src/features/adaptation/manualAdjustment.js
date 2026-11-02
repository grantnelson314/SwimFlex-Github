/**
 * Manual Adjustment (DESIGN.md §6, PLAN.md "Manual Adjustment").
 *
 * The swimmer's edits OVERRIDE the recommendation ("user overrides always win"):
 *  - The adaptation engine is NEVER re-run on manual edits.
 *  - Totals are recalculated with the existing yardage + time model.
 *  - The result replaces the current PROPOSAL only; the saved workout is not modified.
 *  - The engine's original recommendation is kept as `baselineRecommendation` so
 *    "Reset to Recommendation" restores it exactly.
 *
 * Pure functions — no React.
 */
import { buildChanges, finalizeRecommendation, getPriorityStatus } from './adaptationEngine.js'
import { areSetsEqual, cloneWorkout, formatSetNotation } from '../workouts/workoutUtils.js'

export const MANUAL_LIMITS = {
  repetitions: { min: 1, max: 99 },
  distancePerRepYards: { min: 5, max: 2000 },
  intervalSeconds: { min: 10, max: 900 },
}

const isInt = (n) => Number.isInteger(n)

/** The fields a swimmer may edit on each set. Everything else (stroke, role, ...) is kept. */
export function pickEditableFields(set) {
  return {
    repetitions: set.repetitions,
    distancePerRepYards: set.distancePerRepYards,
    intervalSeconds: set.intervalSeconds ?? null,
  }
}

/**
 * Validate a draft ({ sets, prioritySetId }). Returns [{ setId, field, message }].
 * Interval is only validated for sets that already have one (sets without a send-off stay manual).
 */
export function validateManualEdits(edits, baseWorkout) {
  const errors = []
  for (const draft of edits.sets) {
    const original = baseWorkout.sets.find((s) => s.id === draft.id)
    if (!original) {
      errors.push({ setId: draft.id, field: 'set', message: 'Unknown set.' })
      continue
    }
    const { repetitions: r, distancePerRepYards: d, intervalSeconds: i } = MANUAL_LIMITS
    if (!(isInt(draft.repetitions) && draft.repetitions >= r.min && draft.repetitions <= r.max)) {
      errors.push({ setId: draft.id, field: 'repetitions', message: `Reps must be ${r.min}–${r.max}.` })
    }
    if (!(isInt(draft.distancePerRepYards) && draft.distancePerRepYards >= d.min && draft.distancePerRepYards <= d.max)) {
      errors.push({ setId: draft.id, field: 'distancePerRepYards', message: `Distance must be ${d.min}–${d.max} yd.` })
    }
    if (original.intervalSeconds && !(isInt(draft.intervalSeconds) && draft.intervalSeconds >= i.min && draft.intervalSeconds <= i.max)) {
      errors.push({ setId: draft.id, field: 'intervalSeconds', message: 'Enter a valid interval.' })
    }
  }
  if (edits.prioritySetId != null && !baseWorkout.sets.some((s) => s.id === edits.prioritySetId)) {
    errors.push({ setId: null, field: 'prioritySetId', message: 'Unknown Priority Set.' })
  }
  return errors
}

/** The baseline (engine) recommendation behind a possibly manually-edited one. */
export const getBaselineRecommendation = (recommendation) =>
  recommendation.baselineRecommendation ?? recommendation

/**
 * Build a manual proposal from edits.
 *
 * @param original        the saved workout (never modified)
 * @param recommendation  the current proposal (engine's or an earlier manual one)
 * @param edits           { sets: [{ id, repetitions, distancePerRepYards, intervalSeconds }], prioritySetId }
 *
 * If the edits equal the engine's recommendation, the engine's recommendation itself is
 * restored (this is how "Reset to Recommendation" round-trips).
 */
export function buildManualRecommendation(original, recommendation, edits) {
  const baseline = getBaselineRecommendation(recommendation)

  const adjusted = cloneWorkout(baseline.adjustedWorkout)
  adjusted.sets = adjusted.sets.map((set) => {
    const draft = edits.sets.find((s) => s.id === set.id)
    return draft ? { ...set, ...pickEditableFields(draft) } : set
  })
  adjusted.prioritySetId = edits.prioritySetId ?? null

  const sameSets = adjusted.sets.every((s, i) => areSetsEqual(s, baseline.adjustedWorkout.sets[i]))
  const samePriority = adjusted.prioritySetId === (baseline.adjustedWorkout.prioritySetId ?? null)
  if (sameSets && samePriority) return { ...baseline, status: 'proposed' }

  const prioritySetId = adjusted.prioritySetId
  const changes = buildChanges(original, adjusted, prioritySetId, (before, after, type) => {
    const verb = { reduced: 'Reduced', increased: 'Increased', edited: 'Edited', intervalAdjusted: 'Interval changed' }[type] ?? 'Changed'
    return `${verb} by you: ${formatSetNotation(before)} → ${formatSetNotation(after)}.`
  })

  const editedCount = changes.filter((c) => !['unchanged', 'preserved'].includes(c.changeType)).length
  const base = finalizeRecommendation({
    constraint: baseline.constraint,
    workout: original,
    adjusted,
    prioritySetId,
    changes,
    summary: 'Edited by you',
    explanation:
      'These are your own edits. SwimFlex recalculated the totals but did not change anything you set.',
    rationale: [],
  })

  // The swimmer chose a different Priority Set than the saved workout has.
  const userChangedPriority = prioritySetId !== (original.prioritySetId ?? null) && prioritySetId != null
  const priorityStatus = userChangedPriority
    ? 'userChanged'
    : getPriorityStatus(original, adjusted, prioritySetId)

  const rationale = [
    'You edited this workout manually, so SwimFlex did not re-run its adaptation rules.',
    `${editedCount} ${editedCount === 1 ? 'set differs' : 'sets differ'} from your saved workout.`,
    `Totals were recalculated from your edits: ${base.adjustedYards.toLocaleString('en-US')} yd, about ${base.adjustedMinutes} min.`,
  ]
  if (prioritySetId == null) rationale.push('No Priority Set is selected.')
  else if (userChangedPriority) rationale.push(`You chose ${base.priority.setName} as the Priority Set.`)
  else if (priorityStatus === 'preserved') rationale.push(`Priority Set preserved: ${base.priority.setName}.`)
  else rationale.push(`You changed the Priority Set (${base.priority.setName}) itself.`)

  return {
    ...base,
    priority: { ...base.priority, status: priorityStatus },
    rationale,
    // The swimmer made these changes deliberately, so no extra system-review flag.
    requiresUserReview: false,
    reviewReason: null,
    // Keep the situation (pool length, equipment, readiness) the proposal was built for.
    context: baseline.context ?? null,
    source: 'manual',
    baselineRecommendation: baseline,
  }
}