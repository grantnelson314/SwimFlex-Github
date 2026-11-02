import { CheckIcon } from './Icons.jsx'

/**
 * Per-set change status. Always text (never color alone); Preserved also carries a checkmark.
 * Statuses (DESIGN.md): Reduced, Preserved, Unchanged, Replaced (+ Interval adjusted).
 */
const STATUS = {
  reduced: { label: 'Reduced', tone: 'warning' },
  preserved: { label: 'Preserved', tone: 'primary', check: true },
  unchanged: { label: 'Unchanged', tone: 'neutral' },
  replaced: { label: 'Replaced', tone: 'primary' },
  intervalAdjusted: { label: 'Interval adjusted', tone: 'warning' },
  // Manual Adjustment only (the engine never increases a set).
  increased: { label: 'Increased', tone: 'primary' },
  edited: { label: 'Edited', tone: 'primary' },
}

export default function StatusBadge({ status }) {
  const { label, tone, check } = STATUS[status] ?? { label: status, tone: 'neutral' }
  return (
    <span className={`chip chip--${tone}`}>
      {check && <CheckIcon width={14} height={14} />}
      {label}
    </span>
  )
}
