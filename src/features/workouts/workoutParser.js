/**
 * Deterministic workout text parser for "Paste Workout" (DESIGN.md §2 Add Workout).
 * No AI, no guessing at meaning: it understands a small, documented swim notation and says
 * plainly which lines it could not read, so the swimmer can correct them.
 *
 * One set per line:  [reps x] distance [yd] [effort] [stroke] [with equipment] [@ interval]
 *
 *   400 easy swim                  -> 1 × 400, easy, choice
 *   8 x 50 drill/swim @ 1:00       -> 8 × 50, drill/swim, 1:00
 *   6 x 200 free @ 2:50            -> 6 × 200, free, 2:50
 *   8 x 25 fast @ :35              -> 8 × 25, fast, :35
 *   300 easy choice                -> 1 × 300, easy, choice
 *   4 x 100 pull with paddles @ 1:45
 *
 * Interval: m:ss, :ss, or plain seconds (after "@" or "on"). "×" and "x" both work.
 * Distances are yards.
 */
import { createBlankSet, DRAFT_LIMITS, guessRoles, defaultSetName } from './workoutBuilder.js'

const STROKE_WORDS = {
  free: 'free',
  freestyle: 'free',
  fr: 'free',
  back: 'back',
  backstroke: 'back',
  breast: 'breast',
  breaststroke: 'breast',
  fly: 'fly',
  butterfly: 'fly',
  im: 'im',
  choice: 'choice',
  swim: 'choice',
  'drill/swim': 'drillSwim',
  drill: 'drillSwim',
  pull: 'pull',
  kick: 'kick',
}

const EFFORT_WORDS = {
  easy: 'easy',
  moderate: 'moderate',
  mod: 'moderate',
  steady: 'moderate',
  threshold: 'threshold',
  thresh: 'threshold',
  fast: 'fast',
  sprint: 'fast',
}

const EQUIPMENT_WORDS = {
  fins: 'fins',
  fin: 'fins',
  paddles: 'paddles',
  paddle: 'paddles',
  'pull buoy': 'pullBuoy',
  pullbuoy: 'pullBuoy',
  buoy: 'pullBuoy',
  kickboard: 'kickboard',
  'kick board': 'kickboard',
  board: 'kickboard',
}

const fail = (message) => ({ ok: false, message })

/** "1:30" -> 90, ":35" -> 35, "90" -> 90. Returns null if it is not a clean interval. */
export function parseIntervalText(text) {
  const t = text.trim()
  let seconds = null
  let match
  if ((match = /^(\d{1,2}):(\d{2})$/.exec(t))) {
    if (Number(match[2]) >= 60) return null
    seconds = Number(match[1]) * 60 + Number(match[2])
  } else if ((match = /^:(\d{1,2})$/.exec(t))) {
    seconds = Number(match[1])
  } else if (/^\d+$/.test(t)) {
    seconds = Number(t)
  }
  return seconds
}

function parseEquipment(text) {
  const names = text
    .split(/,|&|\+|\band\b/)
    .map((part) => part.trim())
    .filter(Boolean)
  const equipment = []
  for (const name of names) {
    const item = EQUIPMENT_WORDS[name]
    if (!item) return { error: `I don’t recognize the equipment “${name}”.` }
    if (!equipment.includes(item)) equipment.push(item)
  }
  return { equipment }
}

/**
 * Parse ONE line. Returns { ok: true, set } with set fields
 * { repetitions, distancePerRepYards, stroke, effort, intervalSeconds, equipment }
 * or { ok: false, message }.
 */
export function parseSetLine(line) {
  let text = String(line ?? '')
    .toLowerCase()
    .replace(/×/g, 'x')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return fail('This line is empty.')

  // 1) interval: "@ 1:00", "@1:00", "on 1:30"
  let intervalSeconds = null
  const intervalMatch = /(?:@|\bon\b)\s*(\d{1,2}:\d{2}|:\d{1,2}|\d+)/.exec(text)
  if (intervalMatch) {
    intervalSeconds = parseIntervalText(intervalMatch[1])
    if (intervalSeconds == null) return fail(`I couldn’t read the interval “${intervalMatch[1]}”.`)
    text = `${text.slice(0, intervalMatch.index)} ${text.slice(intervalMatch.index + intervalMatch[0].length)}`
      .replace(/\s+/g, ' ')
      .trim()
  } else if (/@/.test(text)) {
    return fail('I couldn’t read the interval after “@”. Try something like @ 1:30.')
  }

  // 2) equipment: "with paddles", "w/ fins and paddles"
  let equipment = []
  const equipmentMatch = /\b(?:with|w\/|using)\s+(.+)$/.exec(text)
  if (equipmentMatch) {
    const parsed = parseEquipment(equipmentMatch[1])
    if (parsed.error) return fail(parsed.error)
    equipment = parsed.equipment
    text = text.slice(0, equipmentMatch.index).trim()
  }

  // 3) "[reps x] distance [yd]"
  const head = /^(?:(\d+)\s*x\s*)?(\d+)\s*(?:yards|yard|yds|yd|y)?(?=\s|$)\s*(.*)$/.exec(text)
  if (!head) return fail('I couldn’t find the distance. Start with something like 8 x 50 or 400.')
  const repetitions = head[1] ? Number(head[1]) : 1
  const distancePerRepYards = Number(head[2])
  const rest = head[3].trim()

  // 4) effort and stroke words, in any order
  let stroke = null
  let effort = null
  for (const word of rest ? rest.split(' ') : []) {
    if (word in EFFORT_WORDS) effort = EFFORT_WORDS[word]
    else if (word in STROKE_WORDS) stroke = STROKE_WORDS[word]
    else return fail(`I don’t recognize “${word}”.`)
  }

  if (repetitions < DRAFT_LIMITS.repetitions.min || repetitions > DRAFT_LIMITS.repetitions.max) {
    return fail(`Reps must be ${DRAFT_LIMITS.repetitions.min}–${DRAFT_LIMITS.repetitions.max}.`)
  }
  if (
    distancePerRepYards < DRAFT_LIMITS.distancePerRepYards.min ||
    distancePerRepYards > DRAFT_LIMITS.distancePerRepYards.max
  ) {
    return fail(
      `Distance must be ${DRAFT_LIMITS.distancePerRepYards.min}–${DRAFT_LIMITS.distancePerRepYards.max} yd.`,
    )
  }
  if (
    intervalSeconds != null &&
    (intervalSeconds < DRAFT_LIMITS.intervalSeconds.min || intervalSeconds > DRAFT_LIMITS.intervalSeconds.max)
  ) {
    return fail('The interval must be between :10 and 15:00.')
  }

  return {
    ok: true,
    set: {
      repetitions,
      distancePerRepYards,
      stroke: stroke ?? (equipment.includes('kickboard') ? 'kick' : 'choice'),
      effort: effort ?? 'moderate',
      intervalSeconds,
      equipment,
    },
  }
}

/**
 * Parse a whole pasted workout.
 * Returns {
 *   isEmpty,          true when there is nothing but whitespace
 *   sets,             draft sets (with guessed roles and names) for every line that parsed
 *   failures,         [{ lineNumber, text, message }] for lines that did not
 *   originalText,     exactly what was pasted, so it can be shown back for correction
 * }
 * Failed lines are never dropped silently, and never turned into invented sets.
 */
export function parseWorkoutText(text) {
  const originalText = String(text ?? '')
  const lines = originalText.split(/\r?\n/)
  const parsed = []
  const failures = []

  lines.forEach((raw, i) => {
    if (!raw.trim()) return
    const result = parseSetLine(raw)
    if (result.ok) parsed.push(result.set)
    else failures.push({ lineNumber: i + 1, text: raw.trim(), message: result.message })
  })

  const roles = guessRoles(parsed)
  const names = []
  const sets = parsed.map((set, i) => {
    const name = defaultSetName(roles[i], names)
    names.push(name)
    return createBlankSet({ ...set, role: roles[i], name })
  })

  return { isEmpty: lines.every((l) => !l.trim()), sets, failures, originalText }
}
