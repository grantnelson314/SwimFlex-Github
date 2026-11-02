import { useEffect, useState } from 'react'
import {
  applySessionAdjustment,
  beginSession,
  clearSession,
  completeRep,
  endQuickAdjust,
  endSession,
  pauseSession,
  resumeSession,
  startSession,
} from '../../../state/actions.js'
import { useAppDispatch, useAppState } from '../../../state/AppContext.jsx'
import { isFinished } from '../../session/sessionReducer.js'
import { useQuickAdjustHold } from '../../session/useQuickAdjustHold.js'
import { formatInterval } from '../../../utils/time.js'
import {
  WATCH_SCREENS,
  selectWatchComplete,
  selectWatchPaused,
  selectWatchPool,
  selectWatchReady,
  selectWatchScreen,
} from '../watchSelectors.js'
import {
  WATCH_INPUT_STEP,
  WATCH_READINESS_OPTIONS,
  WATCH_RPE_OPTIONS,
  getWatchTimeOptions,
  proposeWatchQuickAdjust,
} from '../watchQuickAdjust.js'
import WatchAdjustmentProposal from './WatchAdjustmentProposal.jsx'
import WatchComplete from './WatchComplete.jsx'
import WatchNotice from './WatchNotice.jsx'
import WatchPaused from './WatchPaused.jsx'
import WatchPicker from './WatchPicker.jsx'
import WatchPoolMode from './WatchPoolMode.jsx'
import WatchQuickAdjust from './WatchQuickAdjust.jsx'
import WatchRemainingProposal from './WatchRemainingProposal.jsx'
import WatchSafetyBoundary from './WatchSafetyBoundary.jsx'
import WatchWorkoutReady from './WatchWorkoutReady.jsx'

/**
 * The simulated watch: a rounded generic wearable showing ONE screen at a time.
 *
 * It owns no workout state and no timer. Which main screen to show comes from the shared app
 * state (selectWatchScreen); every button dispatches the same actions the phone uses. The only
 * local state is presentation: which Quick Adjust step is open, and a brief confirmation.
 */
function WatchShellBody() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const session = state.activeSession

  // Local, presentation-only:
  //   null | { step: 'reasons' | 'rpe' | 'readiness' | 'time' | 'proposal' | 'remaining' | 'notice' | 'safety', ... }
  const [flow, setFlow] = useState(null)
  const [toast, setToast] = useState(null)

  const screen = selectWatchScreen(state)
  // A Quick Adjust flow only makes sense for a live session (it may end from the phone meanwhile).
  const activeFlow = flow && session && !isFinished(session) ? flow : null

  // Quick Adjust pauses the shared session and (unless it was already paused) resumes it on exit.
  useQuickAdjustHold(activeFlow !== null)

  // Brief confirmation only; not a workout timer.
  useEffect(() => {
    if (!toast) return undefined
    const id = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(id)
  }, [toast])

  /* ----- intents: all dispatch shared actions ----- */

  function start() {
    const ready = selectWatchReady(state)
    if (!ready) return
    if (ready.startsWith === 'session') dispatch(beginSession())
    else dispatch(startSession({ workout: ready.workout, sourceWorkoutId: ready.sourceWorkoutId, kind: 'adjusted' }))
  }

  /** Ask the shared Quick Adjust rules, then show whichever small screen fits the answer. */
  function propose(reason, input) {
    const result = proposeWatchQuickAdjust(session, reason, input)
    if (result.type === 'safetyBoundary') {
      // Clear the hold WITHOUT resuming: the session stays paused behind the safety message.
      dispatch(endQuickAdjust(false))
      setFlow({ step: 'safety' })
    } else if (result.type === 'suggestion') {
      setFlow({ step: 'proposal', result })
    } else if (result.type === 'remainingSuggestion') {
      setFlow({ step: 'remaining', result })
    } else {
      setFlow({ step: 'notice', result })
    }
  }

  function chooseReason(reason) {
    const inputStep = WATCH_INPUT_STEP[reason]
    if (!inputStep) {
      propose(reason) // pain/injury, equipment, pool change: no input needed
    } else if (inputStep === 'time' && getWatchTimeOptions(session).length === 0) {
      setFlow({
        step: 'notice',
        result: { type: 'noChangeNeeded', message: 'Very little workout is left, so there is nothing to shorten.' },
      })
    } else {
      setFlow({ step: inputStep, reason })
    }
  }

  function apply() {
    const result = activeFlow.result
    dispatch(applySessionAdjustment(result.adjustment))
    dispatch(endQuickAdjust(true))
    setFlow(null)
    setToast(
      result.type === 'remainingSuggestion'
        ? `Applied · ${result.availableMinutes} min`
        : `Applied @ ${formatInterval(result.toIntervalSeconds)}`,
    )
  }

  function keep() {
    dispatch(endQuickAdjust(true))
    setFlow(null)
  }

  /* ----- which screen ----- */

  let content
  let announcement = ''

  if (activeFlow?.step === 'reasons') {
    content = <WatchQuickAdjust onChoose={chooseReason} onBack={() => setFlow(null)} />
  } else if (activeFlow?.step === 'rpe') {
    content = (
      <WatchPicker
        title="How hard?"
        hint="Effort so far (RPE)"
        options={WATCH_RPE_OPTIONS.map((rpe) => ({ value: rpe, label: String(rpe), ariaLabel: `RPE ${rpe} of 10` }))}
        columns={3}
        onChoose={(rpe) => propose(activeFlow.reason, { rpe })}
        onBack={() => setFlow({ step: 'reasons' })}
      />
    )
  } else if (activeFlow?.step === 'readiness') {
    content = (
      <WatchPicker
        title="How fresh?"
        hint="1 tired – 5 fresh"
        options={WATCH_READINESS_OPTIONS.map((n) => ({ value: n, label: String(n), ariaLabel: `Readiness ${n} of 5` }))}
        columns={3}
        onChoose={(readiness) => propose(activeFlow.reason, { readiness })}
        onBack={() => setFlow({ step: 'reasons' })}
      />
    )
  } else if (activeFlow?.step === 'time') {
    content = (
      <WatchPicker
        title="Time left?"
        hint="Minutes you have"
        options={getWatchTimeOptions(session).map((m) => ({
          value: m,
          label: `${m} min`,
          ariaLabel: `${m} minutes left`,
        }))}
        columns={2}
        onChoose={(availableMinutes) => propose(activeFlow.reason, { availableMinutes })}
        onBack={() => setFlow({ step: 'reasons' })}
      />
    )
  } else if (activeFlow?.step === 'proposal') {
    content = <WatchAdjustmentProposal suggestion={activeFlow.result} onApply={apply} onKeep={keep} />
  } else if (activeFlow?.step === 'remaining') {
    content = <WatchRemainingProposal suggestion={activeFlow.result} onApply={apply} onKeep={keep} />
  } else if (activeFlow?.step === 'notice') {
    const { result } = activeFlow
    // "No change" is a real answer; anything the watch can't settle goes to the phone.
    const noChange = result.type === 'noChangeNeeded'
    let body = result.message
    if (result.type === 'limited') body = 'Open the phone to adjust this.'
    else if (result.type === 'impossibleTimeTarget') body = `${result.availableMinutes} min is too short for this set. Review on phone.`
    else if (result.type === 'invalidRequest') body = 'Open the phone to adjust this.'
    content = (
      <WatchNotice
        title={noChange ? 'No change' : 'Review on phone'}
        body={body}
        onBack={() => setFlow({ step: 'reasons' })}
      />
    )
  } else if (activeFlow?.step === 'safety') {
    content = <WatchSafetyBoundary onEnd={() => dispatch(endSession())} onBack={() => setFlow(null)} />
  } else if (screen === WATCH_SCREENS.ready) {
    content = <WatchWorkoutReady ready={selectWatchReady(state)} onStart={start} />
  } else if (screen === WATCH_SCREENS.pool) {
    const model = selectWatchPool(session)
    announcement = `${model.label}. ${model.showReps ? model.repText.toLowerCase() + '. ' : ''}${model.title}.`
    content = (
      <WatchPoolMode
        model={model}
        onPause={() => dispatch(pauseSession())}
        onAdjust={() => setFlow({ step: 'reasons' })}
        onSetDone={() => dispatch(completeRep())}
      />
    )
  } else if (screen === WATCH_SCREENS.paused) {
    content = (
      <WatchPaused
        model={selectWatchPaused(session)}
        onResume={() => dispatch(resumeSession())}
        onEnd={() => dispatch(endSession())}
      />
    )
  } else if (screen === WATCH_SCREENS.complete) {
    content = <WatchComplete model={selectWatchComplete(session)} onDone={() => dispatch(clearSession())} />
  } else {
    content = (
      <div className="watch-screen watch-screen--center">
        <p className="watch-kicker">SwimFlex</p>
        <p className="watch-notice__body">No workout yet. Accept an adjusted workout on your phone.</p>
      </div>
    )
  }

  return (
    <div className="watch-device" role="group" aria-label="Simulated smartwatch">
      <div className="watch-device__strap watch-device__strap--top" aria-hidden="true" />
      <div className="watch-device__frame">
        <div className="watch-device__screen">
          <div className="watch-status">
            <span className="watch-status__name">SwimFlex</span>
            <span className="watch-status__conn">
              <span
                className={`watch-status__dot ${state.watch.connected ? '' : 'watch-status__dot--off'}`}
                aria-hidden="true"
              />
              {state.watch.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {content}
          {toast && (
            <p className="watch-toast" role="status">
              {toast}
            </p>
          )}
          <p className="visually-hidden" role="status" aria-live="polite">
            {announcement}
          </p>
        </div>
      </div>
      <div className="watch-device__strap watch-device__strap--bottom" aria-hidden="true" />
    </div>
  )
}

/**
 * Remounts the watch body for each new session, so a half-finished Quick Adjust screen from
 * a cleared or ended session can never reappear on the next workout.
 */
export default function WatchShell() {
  const sessionId = useAppState().activeSession?.sessionId ?? 'none'
  return <WatchShellBody key={sessionId} />
}
