import WatchButton from './WatchButton.jsx'

/**
 * A compact one-tap picker for the watch (RPE 6–10, readiness 1–5, minutes left).
 * Each choice is a real button with visible text and a spoken label; tapping one answers
 * the question immediately, so there is no separate confirm step.
 */
export default function WatchPicker({ title, hint, options, columns = 3, onChoose, onBack }) {
  return (
    <div className="watch-screen">
      <div className="watch-picker__head">
        <h2 className="watch-prompt">{title}</h2>
        {hint && <p className="watch-picker__hint">{hint}</p>}
      </div>
      <div className="watch-picker__grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {options.map((option) => (
          <WatchButton
            key={option.value}
            className="watch-btn--option"
            aria-label={option.ariaLabel}
            onClick={() => onChoose(option.value)}
          >
            {option.label}
          </WatchButton>
        ))}
      </div>
      <WatchButton className="watch-btn--wide" onClick={onBack}>
        Back
      </WatchButton>
    </div>
  )
}
