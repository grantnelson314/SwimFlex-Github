/**
 * Quick Adjust: Running out of time (PLAN.md Feature 6), in the middle of a workout.
 *
 * The swimmer says how many minutes they have left. SwimFlex adapts ONLY the remaining
 * workout: sets that have not started yet. The set being swum and everything already done
 * are never rewritten. A Priority Set that is still ahead is never reduced.
 *
 * It reuses the Less Time reduction stages (adaptationRules.reduceSupportingVolume) and the
 * same prototype time model, so the numbers agree with the Adapt Workout screen.
 * Pure functions: no React, no timers, no randomness.
 *
 * Result types: 'remainingSuggestion' | 'noChangeNeeded' | 'impossibleTimeTarget' | 'invalidRequest'
 */
import { formatSetNotation, calculateSetYards, cloneWorkout, estimateSetSeconds, areSetsEqual } from '../workouts/workoutUtils.js'
import { reduceSupportingVolume } from './adaptationRules.js'

/** Modeled seconds of work left: the current set from the current rep, plus every later set. */
export function estimateRemainingSeconds(session) {
  const { sets } = session.workout
  const current = sets[session.currentSetIndex]
  if (!current) return 0
  const repsLeft = Math.max(1, current.repetitions - session.currentRepIndex)
  const currentSeconds = estimateSetSeconds({ ...current, repetitions: repsLeft })
  const later = sets.slice(session.currentSetIndex + 1).reduce((sum, s) => sum + estimateSetSeconds(s), 0)
  return currentSeconds + later
}

export const estimateRemainingMinutes = (session) => Math.ceil(estimateRemainingSeconds(session) / 60)

/** A sensible starting value for the "minutes left" control: about 70% of what is left, in 5s. */
export function defaultAvailableMinutes(session) {
  return Math.max(5, Math.floor((estimateRemainingMinutes(session) * 0.7) / 5) * 5)
}

/** Short wording used on the watch: "Speed 8 → 4 reps". */
function shortChangeLabel(before, after) {
  if (before.repetitions !== after.repetitions) {
    return `${before.name} ${before.repetitions} → ${after.repetitions} reps`
  }
  return `${before.name} ${before.distancePerRepYards} → ${after.distancePerRepYards} yd`
}

function describeChange(before, after) {
  if (before.repetitions !== after.repetitions) {
    return `Reduced from ${before.repetitions} to ${after.repetitions} reps to fit your remaining time.`
  }
  return `Shortened from ${before.distancePerRepYards} to ${after.distancePerRepYards} yd to fit your remaining time.`
}

/**
 * @param session           the active session
 * @param availableMinutes  minutes the swimmer has left
 */
export function proposeRemainingTime(session, availableMinutes) {
  if (!(Number.isInteger(availableMinutes) && availableMinutes > 0)) {
    return {
      type: 'invalidRequest',
      errors: [{ field: 'availableMinutes', message: 'Enter the minutes you have left (more than 0).' }],
    }
  }

  const reason = 'runningOutOfTime'
  const remainingSeconds = estimateRemainingSeconds(session)
  const remainingMinutes = Math.ceil(remainingSeconds / 60)
  const requiredSeconds = remainingSeconds - availableMinutes * 60

  if (requiredSeconds <= 0) {
    return {
      type: 'noChangeNeeded',
      reason,
      message: `About ${remainingMinutes} min of workout is left, so it already fits in ${availableMinutes} min. No change is needed.`,
    }
  }

  const { workout, currentSetIndex } = session
  if (currentSetIndex >= workout.sets.length - 1) {
    return {
      type: 'noChangeNeeded',
      reason,
      message: 'You’re on the last set, so there is nothing later to shorten. Use End Workout whenever you need to stop.',
    }
  }

  const prioritySetId = workout.prioritySetId ?? null
  const adjusted = cloneWorkout(workout)
  const { remainingSeconds: stillNeeded } = reduceSupportingVolume(
    adjusted,
    workout,
    prioritySetId,
    requiredSeconds,
    (_set, index) => index > currentSetIndex, // never the current set, never finished sets
  )

  const afterSeconds = estimateRemainingSeconds({ ...session, workout: adjusted })

  if (stillNeeded > 0) {
    const minimumMinutes = Math.ceil(afterSeconds / 60)
    return {
      type: 'impossibleTimeTarget',
      reason,
      availableMinutes,
      minimumMinutes,
      message: `${availableMinutes} min is too short to keep your current set${
        prioritySetId ? ' and your Priority Set' : ''
      }. Even after trimming the later sets, the shortest it can get is about ${minimumMinutes} min. Choose more time, or use End Workout when you need to stop.`,
    }
  }

  const changes = workout.sets
    .map((beforeSet, index) => ({ beforeSet, afterSet: adjusted.sets[index], index }))
    .filter(({ beforeSet, afterSet, index }) => index > currentSetIndex && !areSetsEqual(beforeSet, afterSet))
    .map(({ beforeSet, afterSet }) => ({
      setId: beforeSet.id,
      setName: beforeSet.name,
      role: beforeSet.role,
      beforeSet,
      afterSet,
      before: formatSetNotation(beforeSet),
      after: formatSetNotation(afterSet),
      yardsBefore: calculateSetYards(beforeSet),
      yardsAfter: calculateSetYards(afterSet),
      short: shortChangeLabel(beforeSet, afterSet),
      explanation: describeChange(beforeSet, afterSet),
    }))

  const afterMinutes = Math.ceil(afterSeconds / 60)
  const yardsRemoved = changes.reduce((sum, c) => sum + (c.yardsBefore - c.yardsAfter), 0)
  const currentSet = workout.sets[currentSetIndex]
  const priority = prioritySetId ? workout.sets.find((s) => s.id === prioritySetId) : null
  const priorityIndex = priority ? workout.sets.indexOf(priority) : -1
  const touchedMain = changes.some((c) => c.role === 'main')

  const rationale = [
    `You have ${availableMinutes} min left. About ${remainingMinutes} min of workout remains.`,
    `Only the sets after ${currentSet.name} were changed. ${currentSet.name} and anything you have already swum are untouched.`,
    `Lower-priority supporting sets were shortened first: ${changes.map((c) => c.setName).join(', ')}.`,
  ]
  if (priority && priorityIndex > currentSetIndex) {
    rationale.push(`Priority Set preserved: ${priority.name} (${formatSetNotation(priority)}).`)
  } else if (priority && priorityIndex <= currentSetIndex) {
    rationale.push(`Your Priority Set (${priority.name}) is already underway or finished, so it is not changed.`)
  }
  if (touchedMain) rationale.push('Supporting sets alone were not enough, so a later main set was shortened too.')
  rationale.push('Your saved workout is not changed. This applies to today’s session only.')

  const summary = `Fit the rest into about ${availableMinutes} min`

  return {
    type: 'remainingSuggestion',
    reason,
    availableMinutes,
    remainingMinutesBefore: remainingMinutes,
    remainingMinutesAfter: afterMinutes,
    yardsRemoved,
    changes,
    requiresReview: touchedMain,
    explanation: `${changes.map((c) => c.setName).join(' and ')} ${
      changes.length === 1 ? 'is' : 'are'
    } shortened so the rest of your workout fits in about ${availableMinutes} min.${
      priority && priorityIndex > currentSetIndex ? ' Your Priority Set is kept as planned.' : ''
    }`,
    rationale,
    adjustment: {
      type: 'remainingReduced',
      reason,
      availableMinutes,
      summary,
      changes,
    },
  }
}
