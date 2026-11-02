import WatchButton from './WatchButton.jsx'

/**
 * Quick Adjust options without a watch-sized rule yet (and "no change needed" results).
 * WATCH.md: when a change is complex, send the swimmer to the phone instead of inventing advice.
 */
export default function WatchNotice({ title, body, onBack }) {
  return (
    <div className="watch-screen">
      <div className="watch-pool">
        <h2 className="watch-prompt">{title}</h2>
        <p className="watch-notice__body">{body}</p>
      </div>
      <div className="watch-actions">
        <WatchButton variant="primary" className="watch-btn--wide" onClick={onBack}>
          Back
        </WatchButton>
      </div>
    </div>
  )
}
