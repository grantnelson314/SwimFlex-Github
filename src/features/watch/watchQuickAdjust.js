/**
 * Watch Quick Adjust: short labels and tiny pickers over the SAME rules the phone uses
 * (adaptation/quickAdjust.js). There is no second implementation of the adjustment logic here.
 *
 * Which branches the watch completes by itself (WATCH.md: keep it glanceable; complex changes
 * go to the phone):
 *   Too fast  -> RPE picker (6-10) -> interval suggestion      (same RPE table as the phone)
 *   Fatigued  -> readiness picker (1-5) -> interval suggestion
 *   Less time -> minutes-left picker -> trim the remaining sets
 *   Equipment / Pool change -> "Review on phone"
 *   Pain/injury -> Safety Boundary
 */
import { QUICK_ADJUST_REASONS, proposeQuickAdjust } from '../adaptation/quickAdjust.js'
import { estimateRemainingMinutes } from '../adaptation/remainingTime.js'

/**
 * Used ONLY when a caller asks for "Too fast" without choosing an RPE. The watch UI never
 * assumes it: after "Too fast" the swimmer always picks an RPE first.
 */
export const WATCH_ASSUMED_RPE = 8

/** Compact RPE choices. RPE 6 or lower means "no change", exactly like the phone. */
export const WATCH_RPE_OPTIONS = [6, 7, 8, 9, 10]

/** Compact readiness choices: 1 = very tired, 5 = fresh. */
export const WATCH_READINESS_OPTIONS = [1, 2, 3, 4, 5]

export const WATCH_QUICK_ADJUST_OPTIONS = [
  { reason: QUICK_ADJUST_REASONS.intervalTooFast, label: 'Too fast' },
  { reason: QUICK_ADJUST_REASONS.fatigue, label: 'Fatigued' },
  { reason: QUICK_ADJUST_REASONS.runningOutOfTime, label: 'Less time' },
  { reason: QUICK_ADJUST_REASONS.equipment, label: 'Equipment' },
  { reason: QUICK_ADJUST_REASONS.poolConditions, label: 'Pool change' },
  { reason: QUICK_ADJUST_REASONS.painOrInjury, label: 'Pain/injury' },
]

/** Which small input (if any) a reason needs before a suggestion can be made on the watch. */
export const WATCH_INPUT_STEP = {
  [QUICK_ADJUST_REASONS.intervalTooFast]: 'rpe',
  [QUICK_ADJUST_REASONS.fatigue]: 'readiness',
  [QUICK_ADJUST_REASONS.runningOutOfTime]: 'time',
}

const WATCH_TIME_CHOICES = [5, 10, 15, 20, 25, 30, 40, 45, 60]

/** Up to four "minutes left" choices, all shorter than what is left (the longest ones). */
export function getWatchTimeOptions(session) {
  const left = estimateRemainingMinutes(session)
  return WATCH_TIME_CHOICES.filter((m) => m < left).slice(-4)
}

/**
 * Same result types as proposeQuickAdjust:
 *   suggestion | remainingSuggestion | safetyBoundary | limited | noChangeNeeded | impossibleTimeTarget | ...
 *
 * @param input  { rpe, readiness, availableMinutes } - whichever the picker collected
 */
export function proposeWatchQuickAdjust(session, reason, input = {}) {
  const rpe =
    reason === QUICK_ADJUST_REASONS.intervalTooFast ? (input.rpe ?? WATCH_ASSUMED_RPE) : (input.rpe ?? null)
  return proposeQuickAdjust(session, {
    reason,
    rpe,
    readiness: input.readiness ?? null,
    availableMinutes: input.availableMinutes ?? null,
  })
}
