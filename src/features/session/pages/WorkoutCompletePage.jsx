import { Navigate, useNavigate } from 'react-router-dom'
import Button from '../../../components/buttons/Button.jsx'
import Card from '../../../components/cards/Card.jsx'
import ScreenHeader from '../../../components/layout/ScreenHeader.jsx'
import { clearSession } from '../../../state/actions.js'
import { useAppDispatch, useAppState } from '../../../state/AppContext.jsx'
import { formatYards } from '../../../utils/format.js'
import { formatElapsedTime } from '../../../utils/time.js'
import { calculateWorkoutYards } from '../../workouts/workoutUtils.js'
import { SESSION_STATUS, isFinished } from '../sessionReducer.js'

/** Simple summary after the last set (or an early End Workout). Deliberately not a dashboard. */
export default function WorkoutCompletePage() {
  const { activeSession: session } = useAppState()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  if (!session) return <Navigate to="/" replace />
  if (!isFinished(session)) return <Navigate to="/session" replace />

  const endedEarly = session.status === SESSION_STATUS.ended
  const adjustments = session.adaptationsApplied.length
  const plannedYards = calculateWorkoutYards(session.workout)
  const skippedWork = session.completedYards < plannedYards

  function finish() {
    dispatch(clearSession())
    navigate('/')
  }

  return (
    <div className="screen">
      <div className="phone__scroll">
        <ScreenHeader
          title={endedEarly ? 'Workout Ended' : 'Workout Complete'}
          subtitle={session.workout.name}
        />

        <Card className="complete-card">
          <dl className="complete-stats">
            <div>
              <dt>Distance completed</dt>
              <dd>{formatYards(session.completedYards)}</dd>
            </div>
            <div>
              <dt>Elapsed time</dt>
              <dd>{formatElapsedTime(session.totalElapsedSeconds)}</dd>
            </div>
            <div>
              <dt>Adjustments</dt>
              <dd>{adjustments}</dd>
            </div>
          </dl>
          {skippedWork && (
            <p className="complete-card__note">
              Planned {formatYards(plannedYards)}. Distance completed counts only the reps you swam;
              skipped or unfinished reps and sets are not included.
            </p>
          )}
          <p className={`complete-card__note${skippedWork ? ' complete-card__note--follow' : ''}`}>
            {adjustments === 0
              ? 'No changes were made during this workout.'
              : `${adjustments} in-workout ${adjustments === 1 ? 'adjustment' : 'adjustments'} applied. Your saved workout is unchanged.`}
          </p>
        </Card>
      </div>

      <div className="action-bar">
        <div className="stack">
          <Button variant="primary" block onClick={finish}>
            Done
          </Button>
          <Button variant="secondary" block onClick={finish}>
            Return to My Workouts
          </Button>
        </div>
      </div>
    </div>
  )
}
