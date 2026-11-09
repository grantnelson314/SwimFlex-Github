import { Navigate } from 'react-router-dom'
import Button from '../../../components/buttons/Button.jsx'
import {
  beginSession,
  completeRep,
  endSession,
  nextSet,
  pauseSession,
  resumeSession,
} from '../../../state/actions.js'
import { useAppDispatch, useAppState } from '../../../state/AppContext.jsx'
import { formatInterval, formatElapsedTime } from '../../../utils/time.js'
import { FOCUS_LABELS, ROLE_LABELS } from '../../workouts/workoutData.js'
import { formatEquipmentList, formatPoolSetTitle, formatSetNotation } from '../../workouts/workoutUtils.js'
import { SESSION_STATUS, isFinished } from '../sessionReducer.js'
import {
  getCountdownSeconds,
  getCurrentSet,
  getNextSet,
  getSetProgress,
  isTimedSet,
} from '../sessionSelectors.js'

/**
 * Pool Mode (DESIGN.md §7): the current set and its timing dominate the screen.
 * This component only DISPLAYS session state and dispatches intents. The clock, rep/set
 * advancement and adjustments all live in features/session (pure reducer + SessionClock).
 */
export default function PoolModePage() {
  const { activeSession: session } = useAppState()
  const dispatch = useAppDispatch()

  if (!session) return <Navigate to="/" replace />
  if (isFinished(session)) return <Navigate to="/session/complete" replace />

  const set = getCurrentSet(session)
  const upNext = getNextSet(session)
  const timed = isTimedSet(session)
  const countdown = getCountdownSeconds(session)
  const progress = getSetProgress(session)
  const { status } = session
  const ready = status === SESSION_STATUS.ready
  const paused = status === SESSION_STATUS.paused

  const roleLabel = (ROLE_LABELS[set.role] ?? set.name).toUpperCase()
  const focusLabel = set.role === 'main' ? FOCUS_LABELS[session.workout.focus] : null
  const label = focusLabel ? `${roleLabel} · ${focusLabel.toUpperCase()}` : roleLabel
  const showReps = set.repetitions > 1
  const repText = `REP ${session.currentRepIndex + 1} OF ${set.repetitions}`

  return (
    <div className="screen screen--pool">
      <div className="phone__scroll pool">
        <p className="pool__workout">{session.workout.name}</p>

        <section className="pool__current" aria-label="Current set">
          <h1 className="pool__title">{formatPoolSetTitle(set)}</h1>
          {timed && <p className="pool__interval">@ {formatInterval(set.intervalSeconds)}</p>}
          {set.equipment?.length > 0 && (
            <p className="pool__equipment">With {formatEquipmentList(set.equipment)}</p>
          )}

          {timed ? (
            <p className="pool__countdown" data-paused={paused || undefined}>
              <span className="pool__countdown-label">
                {paused ? 'Paused · next send-off in' : 'Next send-off in'}
              </span>{' '}
              <span className="pool__countdown-time">{formatElapsedTime(countdown ?? 0)}</span>
            </p>
          ) : (
            <p className="pool__countdown pool__countdown--manual">
              No interval. Tap Set done when you finish.
            </p>
          )}

          {showReps && (
            // Re-keyed on every advance so the send-off pulse replays.
            <p className="pool__rep pool__pulse" key={session.advanceCount}>
              {repText}
            </p>
          )}
          <p className="pool__label">{label}</p>

          <div
            className="pool__progress"
            role="progressbar"
            aria-label="Progress through this set"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div className="pool__progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        </section>

        <dl className="pool__meta">
          <div>
            <dt>Elapsed</dt>
            <dd>{formatElapsedTime(session.totalElapsedSeconds)}</dd>
          </div>
          <div>
            <dt>Up next</dt>
            <dd>{upNext ? formatSetNotation(upNext) : 'Finish'}</dd>
          </div>
        </dl>

        {paused && (
          <p className="pool__paused" role="status">
            Workout paused
          </p>
        )}

        {/* Announce set/rep changes politely, without reading the ticking countdown. */}
        <p className="visually-hidden" role="status" aria-live="polite">
          {`${label}. ${showReps ? repText.toLowerCase() + '. ' : ''}${formatPoolSetTitle(set)}.`}
        </p>
      </div>

      <div className="action-bar action-bar--pool">
        <div className="stack">
          {ready ? (
            <Button variant="primary" block onClick={() => dispatch(beginSession())}>
              Start
            </Button>
          ) : (
            <>
              {!timed && !paused && (
                <Button variant="primary" block onClick={() => dispatch(completeRep())}>
                  Set done
                </Button>
              )}
              {paused ? (
                <Button variant="primary" block onClick={() => dispatch(resumeSession())}>
                  Resume
                </Button>
              ) : (
                <Button
                  variant={timed ? 'primary' : 'secondary'}
                  block
                  onClick={() => dispatch(pauseSession())}
                >
                  Pause
                </Button>
              )}
            </>
          )}
          <div className="action-row">
            {ready ? (
              <Button variant="secondary" block disabled>
                Quick Adjust
              </Button>
            ) : (
              <Button variant="secondary" block to="/session/quick-adjust">
                Quick Adjust
              </Button>
            )}
            <Button variant="secondary" block onClick={() => dispatch(nextSet())} disabled={ready}>
              {upNext ? 'Next Set' : 'Finish Workout'}
            </Button>
          </div>
          {paused && (
            <Button variant="ghost" block onClick={() => dispatch(endSession())}>
              End Workout
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
