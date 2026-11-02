import { useEffect } from 'react'
import { tickSession } from '../../state/actions.js'
import { useAppDispatch, useAppState } from '../../state/AppContext.jsx'
import { SESSION_STATUS } from './sessionReducer.js'
import { TICK_MS } from './timer.js'

/**
 * The single wall-clock for the active session. While the session is running it dispatches
 * `tick` actions with the REAL seconds elapsed; all countdown / rep-advance logic lives in
 * the pure sessionReducer, not here and not in any page.
 */
export function useWorkoutTimer() {
  const { activeSession, settings } = useAppState()
  const dispatch = useAppDispatch()
  const running = activeSession?.status === SESSION_STATUS.running
  const demoMode = settings.demoMode

  useEffect(() => {
    if (!running) return undefined
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      const dt = (now - last) / 1000
      last = now
      dispatch(tickSession(dt, demoMode))
    }, TICK_MS)
    return () => clearInterval(id)
  }, [running, demoMode, dispatch])
}
