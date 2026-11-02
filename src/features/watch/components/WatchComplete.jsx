import { formatYards } from '../../../utils/format.js'
import { formatElapsedTime } from '../../../utils/time.js'
import WatchButton from './WatchButton.jsx'

/** Watch 5 — Complete: distance, elapsed time, adjustments, Done. Deliberately not analytics. */
export default function WatchComplete({ model, onDone }) {
  const { adjustments } = model
  return (
    <div className="watch-screen">
      <div className="watch-pool">
        <p className="watch-kicker watch-kicker--state">{model.ended ? 'ENDED' : 'COMPLETE'}</p>
        <p className="watch-complete__yards">{formatYards(model.yards)}</p>
        <p className="watch-complete__adjust">completed</p>
        <p className="watch-complete__time">{formatElapsedTime(model.elapsedSeconds)}</p>
        <p className="watch-complete__adjust">
          {adjustments} {adjustments === 1 ? 'adjustment' : 'adjustments'}
        </p>
      </div>
      <div className="watch-actions">
        <WatchButton variant="primary" className="watch-btn--wide" onClick={onDone}>
          Done
        </WatchButton>
      </div>
    </div>
  )
}
