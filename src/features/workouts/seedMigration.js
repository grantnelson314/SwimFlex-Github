/**
 * Demo-data versioning (kept deliberately simple).
 *
 * Browsers that opened an older SwimFlex may hold older copies of the seed workouts
 * (for example an Easy Aerobic Reset without the equipment used by the Missing Equipment
 * scenario). When the saved demo-data version is older than SEED_DATA_VERSION we bring the
 * SEED workouts (by id) up to date:
 *
 *   - a missing seed workout is added back;
 *   - a seed workout whose contents differ from the current seed is replaced by it, keeping
 *     the swimmer's own Priority Set choice if that set still exists;
 *   - every other workout (anything the swimmer added) is left exactly as it is.
 *
 * Seed workouts can't be edited in the app (Manual Adjustment only changes proposals, and
 * Add Workout never reuses an existing id), so the only swimmer-controlled part of a seed
 * workout is its Priority Set.
 *
 * Bump SEED_DATA_VERSION whenever the seed workouts change.
 */
import { createSeedWorkouts } from './workoutData.js'

export const SEED_DATA_VERSION = 2

function sameContent(a, b) {
  const strip = ({ prioritySetId, ...rest }) => rest // eslint-disable-line no-unused-vars
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b))
}

/** True when saved data was written by an older seed version (or by one with no version). */
export function needsSeedMigration(savedVersion) {
  return savedVersion !== SEED_DATA_VERSION
}

/**
 * Returns the workout list with the current seed examples guaranteed present and current.
 * Pure: never mutates `saved`.
 */
export function migrateSeedWorkouts(saved) {
  const seeds = createSeedWorkouts()
  const result = [...saved]

  seeds.forEach((seed) => {
    const index = result.findIndex((w) => w.id === seed.id)
    if (index === -1) {
      result.push(seed)
      return
    }
    const current = result[index]
    if (sameContent(current, seed)) return
    const keepPriority =
      current.prioritySetId && seed.sets.some((s) => s.id === current.prioritySetId)
        ? current.prioritySetId
        : seed.prioritySetId
    result[index] = { ...seed, prioritySetId: keepPriority }
  })

  return result
}
