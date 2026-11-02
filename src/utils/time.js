/**
 * Time formatting helpers. Single source of truth — do not re-implement in components.
 */

const pad2 = (n) => String(n).padStart(2, '0')

/**
 * Format a send-off interval in swim notation.
 *   170 -> "2:50", 60 -> "1:00", 35 -> ":35"
 */
export function formatInterval(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return ''
  const total = Math.max(0, Math.round(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return m === 0 ? `:${pad2(s)}` : `${m}:${pad2(s)}`
}

/**
 * Format an elapsed/countdown time as clock text.
 *   74 -> "1:14", 2468 -> "41:08", 3725 -> "1:02:05"
 */
export function formatElapsedTime(seconds) {
  const total = Math.max(0, Math.round(seconds ?? 0))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`
}
