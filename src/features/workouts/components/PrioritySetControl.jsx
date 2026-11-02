import { CheckIcon } from '../../../components/status/Icons.jsx'

/**
 * Priority Set toggle for one set.
 * Selected state uses blue border/tint + checkmark + the text label "Priority Set"
 * (DESIGN.md: never rely on an icon or color alone).
 */
export default function PrioritySetControl({ setName, selected, onToggle }) {
  return (
    <button
      type="button"
      className={`priority-control ${selected ? 'priority-control--selected' : ''}`}
      aria-pressed={selected}
      aria-label={`Priority Set: ${setName}`}
      onClick={onToggle}
    >
      <span className="priority-control__mark" aria-hidden="true">
        {selected && <CheckIcon width={16} height={16} />}
      </span>
      <span className="priority-control__text">
        <span className="priority-control__label">
          {selected ? 'Priority Set' : 'Set as Priority Set'}
        </span>
        <span className="priority-control__hint">Preserve this set when adapting</span>
      </span>
    </button>
  )
}
