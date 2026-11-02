import { setWatchVisible } from '../../../state/actions.js'
import { useAppDispatch, useAppState } from '../../../state/AppContext.jsx'
import WatchShell from './WatchShell.jsx'

/**
 * Companion panel for the simulated watch. On wide screens it sits beside the phone; on narrow
 * screens it becomes a bottom drawer (CSS only). Renders nothing while hidden, so the phone is
 * fully usable on its own.
 */
export default function WatchPanel() {
  const { watch } = useAppState()
  const dispatch = useAppDispatch()
  if (!watch.visible) return null

  return (
    <aside className="watch-panel" aria-label="Smartwatch companion">
      <div className="watch-panel__head">
        <h2 className="watch-panel__title">Smartwatch</h2>
        <button type="button" className="watch-panel__close" onClick={() => dispatch(setWatchVisible(false))}>
          Close
        </button>
      </div>
      <WatchShell />
      <p className="watch-panel__note">Simulated companion. Not a real device integration.</p>
    </aside>
  )
}
