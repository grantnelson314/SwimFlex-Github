/**
 * Single-choice segmented control built from real radio inputs in a <fieldset>.
 * Used for readiness (1–5), RPE (1–10) and pool length. `allowNone` adds a "Skip" option
 * for optional answers.
 */
export default function ScaleSelect({
  name,
  legend,
  options,
  value,
  onChange,
  hint,
  error,
  allowNone = false,
  columns,
}) {
  const all = allowNone ? [...options, { value: null, label: 'Skip' }] : options
  const cols = columns ?? Math.min(all.length, 5)

  return (
    <fieldset className="field field--group">
      <legend className="field__label">{legend}</legend>
      <div className="segmented" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {all.map((opt) => {
          const id = `${name}-${opt.value ?? 'none'}`
          const checked = value === opt.value
          return (
            <div key={id} className="segmented__item">
              <input
                id={id}
                className="segmented__input"
                type="radio"
                name={name}
                checked={checked}
                onChange={() => onChange(opt.value)}
              />
              <label htmlFor={id} className="segmented__label">
                {opt.label}
              </label>
            </div>
          )
        })}
      </div>
      {hint && !error && <p className="field__hint">{hint}</p>}
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
