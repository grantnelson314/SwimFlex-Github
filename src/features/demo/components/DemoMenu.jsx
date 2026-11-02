import { startTransition, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearSession, resetDemo, returnToTuesday } from '../../../state/actions.js'
import { useAppDispatch, useAppState } from '../../../state/AppContext.jsx'
import { isUnfinished } from '../../session/sessionReducer.js'
import { SEED_WORKOUT_IDS } from '../../workouts/workoutData.js'

/**
 * A small, quiet Demo menu for presenting the prototype. It sits in the toolbar next to the
 * Smartwatch button, closed by default, and has three plain actions:
 *   Return to Tuesday Threshold (clean start in one step) · Clear active session · Reset demo data
 * It never shows technical details and does not appear inside the phone screens.
 */
export default function DemoMenu() {
  const { activeSession } = useAppState()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [message, setMessage] = useState('')
  const rootRef = useRef(null)

  const hasSession = !!activeSession

  function close() {
    setOpen(false)
    setConfirmingReset(false)
  }

  // Close on Escape or when focus/click moves outside the menu.
  useEffect(() => {
    if (!open) return undefined
    function onKey(e) {
      if (e.key === 'Escape') {
        close()
        rootRef.current?.querySelector('button')?.focus()
      }
    }
    function onPointer(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  // One action: clears any session and proposal, restores the canonical Tuesday Threshold
  // (default Priority Set), and opens it ready for "Adapt Workout".
  function backToTuesday() {
    // The router navigates inside a transition. Doing both in one transition means Pool Mode
    // (which redirects home when there is no session) never renders in between and wins.
    startTransition(() => {
      dispatch(returnToTuesday())
      navigate(`/workouts/${SEED_WORKOUT_IDS.tuesdayThreshold}`)
    })
    setMessage('Ready: Tuesday Threshold, with any active workout and proposal cleared.')
    close()
  }

  function clearActiveSession() {
    dispatch(clearSession())
    navigate('/')
    setMessage('Active workout cleared.')
    close()
  }

  function reset() {
    dispatch(resetDemo())
    navigate('/')
    setMessage('Demo data was reset.')
    close()
  }

  return (
    <div className="demo-menu" ref={rootRef}>
      <button
        type="button"
        className="demo-menu__toggle"
        aria-expanded={open}
        aria-controls="demo-menu-panel"
        onClick={() => (open ? close() : setOpen(true))}
      >
        Demo
      </button>

      {open && (
        <div id="demo-menu-panel" className="demo-menu__panel" role="group" aria-label="Demo options">
          {confirmingReset ? (
            <>
              <p className="demo-menu__confirm">
                Reset the demo? Workouts you added are removed and everything returns to its starting state.
              </p>
              <div className="demo-menu__row">
                <button type="button" className="demo-menu__item demo-menu__item--danger" onClick={reset}>
                  Reset
                </button>
                <button type="button" className="demo-menu__item" onClick={() => setConfirmingReset(false)}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <button type="button" className="demo-menu__item" onClick={backToTuesday}>
                Return to Tuesday Threshold
              </button>
              <button
                type="button"
                className="demo-menu__item"
                onClick={clearActiveSession}
                disabled={!hasSession}
              >
                Clear active workout
                {!hasSession && <span className="demo-menu__hint"> · none running</span>}
                {hasSession && !isUnfinished(activeSession) && <span className="demo-menu__hint"> · finished</span>}
              </button>
              <button type="button" className="demo-menu__item" onClick={() => setConfirmingReset(true)}>
                Reset demo data…
              </button>
            </>
          )}
        </div>
      )}

      <p className="visually-hidden" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  )
}
