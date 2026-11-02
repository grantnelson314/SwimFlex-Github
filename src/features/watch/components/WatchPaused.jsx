import WatchButton from './WatchButton.jsx'

/** Watch 4 — Paused: current set, rep, Resume, End Workout. */
export default function WatchPaused({ model, onResume, onEnd }) {
  return (
    <div className="watch-screen">
      <div className="watch-pool">
        <p className="watch-kicker watch-kicker--state">PAUSED</p>
        <h2 className="watch-paused__set">{model.setName}</h2>
        {model.showReps && <p className="watch-pool__rep">{model.repText}</p>}
      </div>
      <div className="watch-actions">
        <WatchButton variant="primary" className="watch-btn--wide" onClick={onResume}>
          Resume
        </WatchButton>
        <WatchButton className="watch-btn--wide" onClick={onEnd}>
          End Workout
        </WatchButton>
      </div>
    </div>
  )
}
