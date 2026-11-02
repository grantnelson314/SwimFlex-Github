import { formatInterval } from '../../../utils/time.js'
import WatchButton from './WatchButton.jsx'

/** Watch 4 — Adjustment Proposal: @ 2:50 ↓ @ 3:00, "Keep 6 reps", Apply / Keep. */
export default function WatchAdjustmentProposal({ suggestion, onApply, onKeep }) {
  return (
    <div className="watch-screen">
      <div className="watch-pool">
        <p className="watch-kicker watch-kicker--state">SUGGESTED</p>
        <p className="watch-proposal__from">
          <span className="visually-hidden">Now </span>@ {formatInterval(suggestion.fromIntervalSeconds)}
        </p>
        <p className="watch-proposal__arrow" aria-hidden="true">
          ↓
        </p>
        <p className="watch-proposal__to">
          <span className="visually-hidden">Suggested </span>@ {formatInterval(suggestion.toIntervalSeconds)}
        </p>
        <p className="watch-proposal__keep">Keep {suggestion.repetitions} reps</p>
        <p className="watch-proposal__note">{suggestion.inputSummary}</p>
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
