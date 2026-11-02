import { useEffect } from 'react'
import { beginQuickAdjust, endQuickAdjust } from '../../state/actions.js'
import { useAppDispatch } from '../../state/AppContext.jsx'

/**
 * While `active` is true (the phone's Quick Adjust screen, or the watch's Quick Adjust flow),
 * workout progression is paused. All the logic lives in sessionReducer.js:
 *  - a RUNNING session is paused and flagged, then resumed when Quick Adjust is left;
 *  - an already-paused session stays paused;
 *  - screens that must keep the session paused (Pain or injury) call endQuickAdjust(false)
 *    themselves first, which clears the flag so this cleanup does nothing.
 * Leaving Quick Adjust any other way (back link, browser back, Keep, Apply) therefore resumes.
 */
export function useQuickAdjustHold(active = true) {
  const dispatch = useAppDispatch()
  useEffect(() => {
    if (!active) return undefined
    dispatch(beginQuickAdjust())
    return () => dispatch(endQuickAdjust(true))
  }, [active, dispatch])
}
