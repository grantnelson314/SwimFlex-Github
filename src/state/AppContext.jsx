import { createContext, useContext, useEffect, useReducer } from 'react'
import { isUnfinished } from '../features/session/sessionReducer.js'
import { SEED_DATA_VERSION } from '../features/workouts/seedMigration.js'
import { STORAGE_KEYS, removeStorage, writeStorage } from '../utils/storage.js'
import { appReducer, loadInitialState } from './appReducer.js'

const AppStateContext = createContext(null)
const AppDispatchContext = createContext(null)

/**
 * Single shared source of truth for the phone UI and (later) the smartwatch simulator.
 * Persistence is a side effect handled here, not in the reducer.
 */
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, undefined, loadInitialState)

  useEffect(() => {
    writeStorage(STORAGE_KEYS.workouts, state.workouts)
    // Saved data is now current, so it is not migrated again on the next load.
    writeStorage(STORAGE_KEYS.demoVersion, SEED_DATA_VERSION)
  }, [state.workouts])

  // Persist the active session at BOUNDARIES only (start, rep/set change, pause, adjustment),
  // not on every clock tick. A restored session comes back paused (see loadInitialState).
  const session = state.activeSession
  const sessionKey = session
    ? [
        session.sessionId,
        session.status,
        session.currentSetIndex,
        session.currentRepIndex,
        session.adaptationsApplied.length,
        session.quickAdjustHold ? 'hold' : '',
      ].join('|')
    : null

  useEffect(() => {
    if (session && isUnfinished(session)) writeStorage(STORAGE_KEYS.activeSession, session)
    else removeStorage(STORAGE_KEYS.activeSession)
    // `session` is intentionally read at boundary changes only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey])

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>{children}</AppDispatchContext.Provider>
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (ctx === null) throw new Error('useAppState must be used inside <AppProvider>')
  return ctx
}

export function useAppDispatch() {
  const ctx = useContext(AppDispatchContext)
  if (ctx === null) throw new Error('useAppDispatch must be used inside <AppProvider>')
  return ctx
}
