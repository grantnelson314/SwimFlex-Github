import WatchButton from './WatchButton.jsx'

const MAX_LINES = 3

/** Watch — Less time: which later sets get shorter, in a few short lines. Apply / Keep. */
export default function WatchRemainingProposal({ suggestion, onApply, onKeep }) {
  const lines = suggestion.changes.slice(0, MAX_LINES)
  const more = suggestion.changes.length - lines.length

  return (
    <div className="watch-screen">
      <div className="watch-pool">
        <p className="watch-kicker watch-kicker--state">SUGGESTED</p>
        <p className="watch-remaining__title">Fit {suggestion.availableMinutes} min</p>
        <ul className="watch-remaining__list" aria-label="Later sets that change">
          {lines.map((change) => (
            <li key={change.setId}>{change.short}</li>
          ))}
        </ul>
        {more > 0 && <p className="watch-proposal__note">+{more} more · see phone</p>}
        <p className="watch-proposal__note">This set is not changed</p>
      </div>
      <div className="watch-actions">
        <WatchButton variant="primary" className="watch-btn--wide" onClick={onApply}>
          Apply
        </WatchButton>
        <WatchButton className="watch-btn--wide" onClick={onKeep}>
          Keep
        </WatchButton>
      </div>
    </div>
  )
}
