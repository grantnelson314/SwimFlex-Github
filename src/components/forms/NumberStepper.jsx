/** Numeric input with large −/+ buttons (tap-friendly) and a real labelled <input>. */
export default function NumberStepper({
  id,
  label,
  value,
  onChange,
  min = 1,
  max = 300,
  step = 5,
  unit,
  hint,
  error,
}) {
  const current = Number.isFinite(value) ? value : ''

  function bump(delta) {
    const base = Number.isFinite(value) ? value : min
    onChange(Math.min(max, Math.max(min, base + delta)))
  }

  function handleInput(e) {
    const raw = e.target.value
    onChange(raw === '' ? null : Number(raw))
  }

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="stepper">
        <button
          type="button"
          className="stepper__btn"
          aria-label={`Decrease ${label.toLowerCase()} by ${step}`}
          onClick={() => bump(-step)}
        >
          −
        </button>
        <input
          id={id}
          className="stepper__input"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={current}
          onChange={handleInput}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          className="stepper__btn"
          aria-label={`Increase ${label.toLowerCase()} by ${step}`}
          onClick={() => bump(step)}
        >
          +
        </button>
        {unit && <span className="stepper__unit">{unit}</span>}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
