/**
 * Quick Adjust (DESIGN.md §8, PLAN.md Feature 6): a narrow, deterministic in-workout change.
 * Reuses the Rule Set C primitive (RPE -> interval) from adaptationRules.js.
 * Pure functions — no React, no AI.
 *
 * Result types:
 *   'suggestion'      a proposed interval change to Apply or Keep
 *   'safetyBoundary'  pain/injury: no adjustment is produced
 *   'noChangeNeeded'  nothing to change for this set / RPE
 *   'limited'         option shown, but not adapted mid-workout in this prototype (or its input is missing)
 *   'remainingSuggestion' / 'impossibleTimeTarget'  running out of time (see remainingTime.js)
 *   'invalidRequest'  missing input
 */
import { formatInterval } from '../../utils/time.js'
import { formatSetNotation } from '../workouts/workoutUtils.js'
import { getCurrentSet } from '../session/sessionSelectors.js'
import { adjustIntervalForRpe, fatigueRestBump, getEffectiveReadiness } from './adaptationRules.js'
import { proposeRemainingTime } from './remainingTime.js'

export const QUICK_ADJUST_REASONS = {
  intervalTooFast: 'intervalTooFast',
  fatigue: 'fatigue',
  runningOutOfTime: 'runningOutOfTime',
  equipment: 'equipment',
  poolConditions: 'poolConditions',
  painOrInjury: 'painOrInjury',
}

export const QUICK_ADJUST_ORDER = [
  QUICK_ADJUST_REASONS.intervalTooFast,
  QUICK_ADJUST_REASONS.fatigue,
  QUICK_ADJUST_REASONS.runningOutOfTime,
  QUICK_ADJUST_REASONS.equipment,
  QUICK_ADJUST_REASONS.poolConditions,
  QUICK_ADJUST_REASONS.painOrInjury,
]

export const QUICK_ADJUST_LABELS = {
  intervalTooFast: 'Interval too fast',
  fatigue: 'Fatigue',
  runningOutOfTime: 'Running out of time',
  equipment: 'Equipment',
  poolConditions: 'Pool conditions',
  painOrInjury: 'Pain or injury concern',
}

/**
 * Reasons that are shown but intentionally not adapted mid-workout in this prototype.
 * They are clearly labeled, never a made-up recommendation. (`fatigue` and `runningOutOfTime`
 * only land here when the input they need was not given.)
 */
const LIMITED_MESSAGES = {
  fatigue: 'Tell SwimFlex how fresh you feel (1–5) to get a rest suggestion for this set.',
  runningOutOfTime: 'Tell SwimFlex how many minutes you have left to shorten the rest of the workout.',
  equipment: 'Prototype limit: SwimFlex can’t swap equipment mid-workout. Finish the set, then adapt a workout from My Workouts.',
  poolConditions: 'Prototype limit: SwimFlex can’t change pool length mid-workout. Finish the set, then adapt a workout from My Workouts.',
}

/**
 * Propose a Quick Adjust for the CURRENT set of a session (or, for running out of time,
 * the sets after it).
 * @param session  the active session
 * @param input    { reason, rpe, readiness, availableMinutes }
 *                 intervalTooFast: rpe 1–10 required
 *                 fatigue:         readiness 1–5 required, rpe optional
 *                 runningOutOfTime: availableMinutes required
 */
export function proposeQuickAdjust(
  session,
  { reason, rpe = null, readiness = null, availableMinutes = null } = {},
) {
  if (reason === QUICK_ADJUST_REASONS.painOrInjury) {
    // Safety first: never produce an adjustment, whatever else was entered.
    return { type: 'safetyBoundary', reason }
  }

  if (reason === QUICK_ADJUST_REASONS.runningOutOfTime) {
    if (availableMinutes == null) return limited(reason)
    return proposeRemainingTime(session, availableMinutes)
  }

  if (reason === QUICK_ADJUST_REASONS.fatigue) {
    if (readiness == null) return limited(reason)
    return proposeFatigueAdjust(session, { readiness, rpe })
  }

  if (reason in LIMITED_MESSAGES) return limited(reason)

  if (reason !== QUICK_ADJUST_REASONS.intervalTooFast) {
    return { type: 'invalidRequest', errors: [{ field: 'reason', message: 'Choose what changed.' }] }
  }

  if (!(Number.isInteger(rpe) && rpe >= 1 && rpe <= 10)) {
    return { type: 'invalidRequest', errors: [{ field: 'rpe', message: 'Choose an RPE from 1 to 10.' }] }
  }
  const set = getCurrentSet(session)
  if (!set || !set.intervalSeconds) {
    return {
      type: 'noChangeNeeded',
      reason,
      message: 'This set has no send-off interval to adjust.',
    }
  }

  const { bumpSeconds } = adjustIntervalForRpe(set, rpe)
  if (bumpSeconds === 0) {
    return {
      type: 'noChangeNeeded',
      reason,
      message: `An RPE of ${rpe}/10 is within a manageable range, so SwimFlex isn’t suggesting an interval change.`,
    }
  }

  return buildIntervalSuggestion(set, {
    reason,
    bumpSeconds,
    extra: { rpe },
    inputSummary: `RPE ${rpe}/10`,
    firstRationale: `RPE ${rpe}/10 adds ${bumpSeconds} seconds to the interval (${formatInterval(set.intervalSeconds)} → ${formatInterval(set.intervalSeconds + bumpSeconds)}).`,
    explanation: `Keeps all ${set.repetitions} reps while making the interval more achievable.`,
  })
}

function limited(reason) {
  return { type: 'limited', reason, message: LIMITED_MESSAGES[reason] }
}

/** Feeling tired mid-workout: a little more rest on the set being swum (same table as Adapt Workout). */
function proposeFatigueAdjust(session, { readiness, rpe }) {
  const reason = QUICK_ADJUST_REASONS.fatigue
  if (!(Number.isInteger(readiness) && readiness >= 1 && readiness <= 5)) {
    return { type: 'invalidRequest', errors: [{ field: 'readiness', message: 'Choose a readiness from 1 to 5.' }] }
  }
  if (rpe != null && !(Number.isInteger(rpe) && rpe >= 1 && rpe <= 10)) {
    return { type: 'invalidRequest', errors: [{ field: 'rpe', message: 'RPE must be between 1 and 10.' }] }
  }

  const set = getCurrentSet(session)
  if (!set || !set.intervalSeconds) {
    return { type: 'noChangeNeeded', reason, message: 'This set has no send-off interval to adjust.' }
  }

  const effective = getEffectiveReadiness(readiness, rpe)
  const bumpSeconds = fatigueRestBump(effective)
  if (bumpSeconds === 0) {
    return {
      type: 'noChangeNeeded',
      reason,
      message: `A readiness of ${readiness}/5 doesn’t need a change, so SwimFlex isn’t suggesting one.`,
    }
  }

  const to = formatInterval(set.intervalSeconds + bumpSeconds)
  return buildIntervalSuggestion(set, {
    reason,
    bumpSeconds,
    extra: { readiness, rpe },
    inputSummary: `Readiness ${readiness}/5`,
    firstRationale: `Readiness ${readiness}/5${rpe != null ? ` with RPE ${rpe}/10` : ''} adds ${bumpSeconds} seconds of rest (${formatInterval(set.intervalSeconds)} → ${to}).`,
    explanation: `Adds ${bumpSeconds} seconds of rest and keeps all ${set.repetitions} reps. This is a training suggestion, not medical advice.`,
  })
}

/** The one suggestion shape shared by "interval too fast" and "fatigue" (phone and watch). */
function buildIntervalSuggestion(set, { reason, bumpSeconds, extra, inputSummary, firstRationale, explanation }) {
  const previousIntervalSeconds = set.intervalSeconds
  const newIntervalSeconds = previousIntervalSeconds + bumpSeconds
  const to = formatInterval(newIntervalSeconds)
  const before = formatSetNotation(set)
  const after = formatSetNotation({ ...set, intervalSeconds: newIntervalSeconds })

  return {
    type: 'suggestion',
    reason,
    ...extra,
    inputSummary,
    setId: set.id,
    setName: set.name,
    repetitions: set.repetitions,
    distancePerRepYards: set.distancePerRepYards,
    fromIntervalSeconds: previousIntervalSeconds,
    toIntervalSeconds: newIntervalSeconds,
    bumpSeconds,
    before,
    after,
    explanation,
    rationale: [
      firstRationale,
      `All ${set.repetitions} repetitions of ${set.repetitions} × ${set.distancePerRepYards} are kept; only the interval changes.`,
      'Your saved workout is not changed — this applies to today’s session only.',
    ],
    // What the session records and applies on "Apply & Continue".
    adjustment: {
      type: 'intervalAdjusted',
      reason,
      ...extra,
      setId: set.id,
      setName: set.name,
      toIntervalSeconds: newIntervalSeconds,
      summary: `${before} → @ ${to}`,
    },
  }
}