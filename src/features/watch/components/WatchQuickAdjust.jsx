import { WATCH_QUICK_ADJUST_OPTIONS } from '../watchQuickAdjust.js'
import WatchButton from './WatchButton.jsx'

/** Watch 3 — Quick Adjust reason: "What's changed?" with short, tappable choices. */
export default function WatchQuickAdjust({ onChoose, onBack }) {
  return (
    <div className="watch-screen">
      <h2 className="watch-prompt">What’s changed?</h2>
      <div className="watch-options">
        {WATCH_QUICK_ADJUST_OPTIONS.map(({ reason, label }) => (
          <WatchButton key={reason} className="watch-btn--option" onClick={() => onChoose(reason)}>
            {label}
          </WatchButton>
        ))}
      </div>
      <WatchButton className="watch-btn--wide" onClick={onBack}>
        Back
      </WatchButton>
    </div>
  )
}
