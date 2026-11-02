/**
 * Adaptation request model: constraint types, defaults, and validation.
 * Pure data + functions — no React.
 */
import { EQUIPMENT, EQUIPMENT_LABELS } from '../workouts/workoutData.js'
import { getIntervalSets, getPrioritySet } from '../workouts/workoutUtils.js'

export const CONSTRAINTS = {
  lessTime: 'lessTime',
  feelingTired: 'feelingTired',
  workoutTooDifficult: 'workoutTooDifficult',
  missingEquipment: 'missingEquipment',
  poolLimitation: 'poolLimitation',
  painOrInjury: 'painOrInjury',
}

/** Display order on the Adapt Workout screen (DESIGN.md). */
export const CONSTRAINT_ORDER = [
  CONSTRAINTS.lessTime,
  CONSTRAINTS.feelingTired,
  CONSTRAINTS.workoutTooDifficult,
  CONSTRAINTS.missingEquipment,
  CONSTRAINTS.poolLimitation,
  CONSTRAINTS.painOrInjury,
]

export const CONSTRAINT_LABELS = {
  lessTime: 'Less time',
  feelingTired: 'Feeling tired',
  workoutTooDifficult: 'Workout too difficult',
  missingEquipment: 'Missing equipment',
  poolLimitation: 'Pool limitation',
  painOrInjury: 'Pain or injury concern',
}

export { EQUIPMENT_LABELS }

/** What the swimmer prefers when they are feeling tired (Rule Set B). */
export const FATIGUE_PREFERENCES = ['moreRest', 'lessVolume', 'decide']
export const FATIGUE_PREFERENCE_LABELS = {
  moreRest: 'More rest',
  lessVolume: 'Less volume',
  decide: 'Let SwimFlex decide',
}

export const POOL_LENGTH_OPTIONS = [25, 20]

export const POOL_ISSUES = ['crowdedLane', 'noPaceClock']
export const POOL_ISSUE_LABELS = {
  crowdedLane: 'Crowded lane',
  noPaceClock: 'No pace clock',
}

/** Default available time: about 12 minutes less than planned, rounded to 5 (52 -> 40). */
function defaultAvailableMinutes(workout) {
  return Math.max(10, Math.floor((workout.estimatedDurationMinutes - 12) / 5) * 5)
}

/** The set most likely to be "too hard": the Priority Set if it has an interval, else a main set. */
export function getDefaultTargetSetId(workout) {
  const intervalSets = getIntervalSets(workout)
  const priority = getPrioritySet(workout)
  if (priority?.intervalSeconds) return priority.id
  return (intervalSets.find((s) => s.role === 'main') ?? intervalSets[0])?.id ?? null
}

/** A blank request for a workout. `constraint` stays null until the swimmer chooses. */
export function createDefaultRequest(workout) {
  return {
    workoutId: workout.id,
    constraint: null,
    availableMinutes: defaultAvailableMinutes(workout),
    readiness: 3,
    rpe: null,
    fatiguePreference: 'decide',
    availableEquipment: [...EQUIPMENT],
    poolLengthYards: 25,
    poolIssues: [],
    targetSetId: getDefaultTargetSetId(workout),
    prioritySetId: workout.prioritySetId ?? null,
  }
}

const isInt = (n) => Number.isInteger(n)

/**
 * Validate only the fields relevant to the chosen constraint.
 * Returns an array of { field, message }; empty means valid.
 * Pain/injury has nothing to validate (it never produces an adaptation).
 */
export function validateAdaptationRequest(request, workout) {
  const errors = []
  const add = (field, message) => errors.push({ field, message })

  if (!request || !CONSTRAINT_ORDER.includes(request.constraint)) {
    add('constraint', 'Choose what is different today.')
    return errors
  }

  const needsReadiness =
    request.constraint === CONSTRAINTS.lessTime || request.constraint === CONSTRAINTS.feelingTired
  if (needsReadiness && !(isInt(request.readiness) && request.readiness >= 1 && request.readiness <= 5)) {
    add('readiness', 'Readiness must be between 1 and 5.')
  }

  switch (request.constraint) {
    case CONSTRAINTS.lessTime:
      if (!(isInt(request.availableMinutes) && request.availableMinutes > 0)) {
        add('availableMinutes', 'Enter the minutes you have (more than 0).')
      }
      break

    case CONSTRAINTS.feelingTired:
      if (request.rpe != null && !(isInt(request.rpe) && request.rpe >= 1 && request.rpe <= 10)) {
        add('rpe', 'RPE must be between 1 and 10.')
      }
      if (request.fatiguePreference != null && !FATIGUE_PREFERENCES.includes(request.fatiguePreference)) {
        add('fatiguePreference', 'Choose how SwimFlex should adjust.')
      }
      break

    case CONSTRAINTS.missingEquipment:
      if (!Array.isArray(request.availableEquipment)) {
        add('availableEquipment', 'Choose the equipment you have today.')
      } else if (EQUIPMENT.every((item) => request.availableEquipment.includes(item))) {
        add('availableEquipment', 'Mark at least one item you don’t have today.')
      }
      break

    case CONSTRAINTS.workoutTooDifficult: {
      if (!(isInt(request.rpe) && request.rpe >= 1 && request.rpe <= 10)) {
        add('rpe', 'Choose an RPE from 1 to 10.')
      }
      const target = workout?.sets.find((s) => s.id === request.targetSetId)
      if (!target || !target.intervalSeconds) {
        add('targetSetId', 'Choose a set that has a send-off interval.')
      }
      break
    }

    case CONSTRAINTS.poolLimitation:
      if (!POOL_LENGTH_OPTIONS.includes(request.poolLengthYards)) {
        add('poolLengthYards', 'Choose a pool length.')
      }
      break

    default:
      break
  }

  return errors
}
