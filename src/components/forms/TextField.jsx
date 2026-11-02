/** A labelled text input (or textarea) with optional hint and an error announced to screen readers. */
export default function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  multiline = false,
  rows = 7,
  placeholder,
  maxLength,
  autoComplete = 'off',
}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const common = {
    id,
    className: multiline ? 'textarea' : 'text-input',
    value,
    placeholder,
    maxLength,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy,
    onChange: (e) => onChange(e.target.value),
  }

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea {...common} rows={rows} spellCheck="false" />
      ) : (
        <input {...common} type="text" autoComplete={autoComplete} />
      )}
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
