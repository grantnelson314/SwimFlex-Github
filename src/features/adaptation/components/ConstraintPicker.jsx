import { CheckIcon } from '../../../components/status/Icons.jsx'
import { CONSTRAINT_LABELS, CONSTRAINT_ORDER, CONSTRAINTS } from '../adaptationRequest.js'

/**
 * The six "What's different today?" choices. Buttons with aria-pressed (not radios) because
 * choosing Pain or injury concern navigates straight to the Safety Boundary.
 */
export default function ConstraintPicker({ value, onSelect }) {
  return (
    <div className="constraint-list" role="group" aria-label="What is different today?">
      {CONSTRAINT_ORDER.map((constraint) => {
        const selected = value === constraint
        return (
          <button
            key={constraint}
            type="button"
            className={`constraint-option ${selected ? 'constraint-option--selected' : ''}`}
            aria-pressed={selected}
            onClick={() => onSelect(constraint)}
          >
            <span className="constraint-option__mark" aria-hidden="true">
              {selected && <CheckIcon width={14} height={14} />}
            </span>
            <span className="constraint-option__text">
              <span className="constraint-option__label">{CONSTRAINT_LABELS[constraint]}</span>
              {constraint === CONSTRAINTS.painOrInjury && (
                <span className="constraint-option__hint">Opens a safety check, not a training change</span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
