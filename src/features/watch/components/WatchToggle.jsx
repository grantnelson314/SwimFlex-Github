import { setWatchVisible } from '../../../state/actions.js'
import { useAppDispatch, useAppState } from '../../../state/AppContext.jsx'

/** The "Smartwatch" button that shows/hides the companion panel. */
export default function WatchToggle() {
  const { watch } = useAppState()
  const dispatch = useAppDispatch()
  return (
    <button
      type="button"
      className="watch-toggle"
      aria-pressed={watch.visible}
      onClick={() => dispatch(setWatchVisible(!watch.visible))}
    >
      <span className="watch-toggle__icon" aria-hidden="true" />
      {watch.visible ? 'Hide Smartwatch' : 'Show Smartwatch'}
    </button>
  )
}
