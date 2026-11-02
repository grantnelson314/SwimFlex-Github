import { CheckIcon } from '../status/Icons.jsx'

/** Multi-select list of real checkboxes in a <fieldset>, styled as large tappable rows. */
export default function CheckboxGroup({ name, legend, options, values, onChange, hint, error }) {
  function toggle(value) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value])
  }

  return (
    <fieldset className="field field--group">
      <legend className="field__label">{legend}</legend>
      <div className="check-grid">
        {options.map((opt) => {
          const id = `${name}-${opt.value}`
          const checked = values.includes(opt.value)
          return (
            <div key={id} className="check-grid__item">
              <input
                id={id}
                className="check-grid__input"
                type="checkbox"
                checked={checked}
                onChange={() => toggle(opt.value)}
              />
              <label htmlFor={id} className="check-grid__label">
                <span className="check-grid__box" aria-hidden="true">
                  {checked && <CheckIcon width={14} height={14} />}
                </span>
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
