import { formatYards } from '../../../utils/format.js'
import WatchButton from './WatchButton.jsx'

/** Watch 1 — Workout Ready: what, how much, how long, and Start. */
export default function WatchWorkoutReady({ ready, onStart }) {
  return (
    <div className="watch-screen watch-screen--center">
      <h2 className="watch-ready__name">{ready.name}</h2>
      <p className="watch-ready__yards">{formatYards(ready.yards)}</p>
      <p className="watch-ready__time">~{Math.round(ready.minutes)} min</p>
      {ready.focus && <p className="watch-kicker">{ready.focus}</p>}
      <WatchButton variant="primary" onClick={onStart} className="watch-btn--wide">
        Start
      </WatchButton>
    </div>
  )
}
