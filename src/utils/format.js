/**
 * Display formatting helpers. SwimFlex uses yards, never meters.
 */

/** 2500 -> "2,500 yd" */
export function formatYards(yards) {
  return `${Number(yards ?? 0).toLocaleString('en-US')} yd`
}

/** 52 -> "52 min" */
export function formatMinutes(minutes) {
  return `${Math.round(minutes ?? 0)} min`
}

/** Net distance change as plain words: -400 -> "400 yd less", 0 -> "Same distance". */
export function describeYardsChange(yardsChanged) {
  if (yardsChanged < 0) return `${formatYards(-yardsChanged)} less`
  if (yardsChanged > 0) return `${formatYards(yardsChanged)} more`
  return 'Same distance'
}

/** Net time change as plain words: 12 -> "12 min saved", -1 -> "1 min added". */
export function describeMinutesChange(minutesSaved) {
  if (minutesSaved > 0) return `${minutesSaved} min saved`
  if (minutesSaved < 0) return `${-minutesSaved} min added`
  return 'Same time'
}
