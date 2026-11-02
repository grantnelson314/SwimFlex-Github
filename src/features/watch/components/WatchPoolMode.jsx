import { formatElapsedTime, formatInterval } from '../../../utils/time.js'
import WatchButton from './WatchButton.jsx'

/**
 * Watch 2 — Pool Mode. Everything shown comes from the shared session (see watchSelectors.js);
 * there is no watch timer. Rep and countdown update automatically when the shared clock ticks.
 */
export default function WatchPoolMode({ model, onPause, onAdjust, onSetDone }) {
  return (
    <div className="watch-screen">
      <div className="watch-pool">
        <p className="watch-kicker">{model.label}</p>
        {model.showReps && (
          // Re-keyed on every advance so the send-off pulse replays.
          <p className="watch-pool__rep watch-pulse" key={model.advanceCount}>
            {model.repText}
          </p>
        )}
        <h2 className="watch-pool__title">{model.title}</h2>
        {model.timed ? (
          <>
            <p className="watch-pool__interval">@ {formatInterval(model.intervalSeconds)}</p>
            <p className="watch-pool__countdown" aria-label="Next send-off in">
              {formatElapsedTime(model.countdownSeconds ?? 0)}
            </p>
          </>
        ) : (
          <p className="watch-pool__manual">No interval</p>
        )}
      </div>

      <div className="watch-actions">
        {!model.timed && (
          <WatchButton variant="primary" className="watch-btn--wide" onClick={onSetDone}>
            Set done
          </WatchButton>
        )}
        <div className="watch-actions__row">
          <WatchButton variant={model.timed ? 'primary' : 'secondary'} onClick={onPause}>
            Pause
          </WatchButton>
          <WatchButton onClick={onAdjust}>Adjust</WatchButton>
        </div>
      </div>
    </div>
  )
}
