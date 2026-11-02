import WatchButton from './WatchButton.jsx'

/**
 * Watch 5 — Safety Boundary (compact version of the phone message).
 * No training recommendation is ever generated here, and the session stays paused.
 */
export default function WatchSafetyBoundary({ onEnd, onBack }) {
  return (
    <div className="watch-screen" role="alert">
      <div className="watch-pool">
        <h2 className="watch-safety__title">SwimFlex can’t assess pain or injury.</h2>
        <p className="watch-safety__body">Consider stopping the workout.</p>
      </div>
      <div className="watch-actions">
        <WatchButton variant="primary" className="watch-btn--wide" onClick={onEnd}>
          End Workout
        </WatchButton>
        <WatchButton className="watch-btn--wide" onClick={onBack}>
          Back
        </WatchButton>
      </div>
    </div>
  )
}
