import { formatInterval } from '../../utils/time.js'

/**
 * Interval editor in swim notation: shows "2:50" and nudges by 5 seconds.
 * Value is whole seconds (the same unit the workout model stores).
 */
export default function IntervalStepper({
  id,
  label = 'Interval',
  value,
  onChange,
  min = 10,
  max = 900,
  step = 5,
  error,
}) {
  const valid = Number.isFinite(value)

  function bump(delta) {
    const base = valid ? value : min
    onChange(Math.min(max, Math.max(min, base + delta)))
  }

  return (
    <div className="field">
      <span className="field__label" id={`${id}-label`}>
        {label}
      </span>
      <div className="stepper" role="group" aria-labelledby={`${id}-label`}>
        <button
          type="button"
          className="stepper__btn"
          aria-label={`Decrease ${label.toLowerCase()} by ${step} seconds`}
          onClick={() => bump(-step)}
        >
          −
        </button>
        <output id={id} className="stepper__value" aria-live="polite">
          {valid ? `@ ${formatInterval(value)}` : '—'}
        </output>
        <button
          type="button"
          className="stepper__btn"
          aria-label={`Increase ${label.toLowerCase()} by ${step} seconds`}
          onClick={() => bump(step)}
        >
          +
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
