import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Button from '../../../components/buttons/Button.jsx'
import Card from '../../../components/cards/Card.jsx'
import ScreenHeader from '../../../components/layout/ScreenHeader.jsx'
import { CheckIcon } from '../../../components/status/Icons.jsx'
import { startSession } from '../../../state/actions.js'
import { useAppDispatch, useAppState } from '../../../state/AppContext.jsx'
import { formatMinutes, formatYards } from '../../../utils/format.js'
import { isUnfinished } from '../../session/sessionReducer.js'
import { calculateWorkoutYards, formatSetNotation, getRoleLabel, getWorkoutById } from '../../workouts/workoutUtils.js'
import { RESULT_TYPES } from '../adaptationEngine.js'

/**
 * Shown after "Use Adjusted Workout": confirms what was accepted and starts it.
 * Starting creates an active session from the ADJUSTED workout and opens Pool Mode.
 * The original saved workout is never overwritten.
 */
export default function AdjustedWorkoutReadyPage() {
  const { workoutId } = useParams()
  const { workouts, recommendation: rec, activeSession } = useAppState()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const workout = getWorkoutById(workouts, workoutId)
  if (!workout) return <Navigate to="/" replace />
  // Started from the phone OR the watch: follow the session into Pool Mode.
  if (isUnfinished(activeSession) && activeSession.sourceWorkoutId === workout.id) {
    return <Navigate to="/session" replace />
  }
  if (rec?.type !== RESULT_TYPES.recommendation || rec.sourceWorkoutId !== workout.id || rec.status !== 'accepted') {
    return <Navigate to={`/adapt/${workout.id}`} replace />
  }

  const adjusted = rec.adjustedWorkout
  const inProgress = isUnfinished(activeSession)

  function start() {
    dispatch(startSession({ workout: adjusted, sourceWorkoutId: workout.id, kind: 'adjusted' }))
    navigate('/session')
  }

  return (
    <div className="screen">
      <div className="phone__scroll">
        <ScreenHeader title="Adjusted workout ready" subtitle={workout.name} />

        <Card className="summary-card">
          <div className="summary-card__metrics">
            <div>
              <p className="summary-card__value">{formatYards(calculateWorkoutYards(adjusted))}</p>
              <p className="summary-card__label">Total</p>
            </div>
            <div>
              <p className="summary-card__value">{formatMinutes(adjusted.estimatedDurationMinutes)}</p>
              <p className="summary-card__label">Estimated time</p>
            </div>
          </div>
        </Card>

        <ul className="stack ready-list">
          {adjusted.sets.map((set) => (
            <li key={set.id}>
              <Card selected={set.id === adjusted.prioritySetId} className="set-card">
                <span className="set-card__role">{getRoleLabel(set.role)}</span>
                <p className="set-card__notation">{formatSetNotation(set)}</p>
                {set.id === adjusted.prioritySetId && (
                  <p className="ready-list__priority">
                    <CheckIcon width={16} height={16} /> Priority Set
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>

        <p className="section-help">Your original workout is unchanged.</p>
      </div>

      <div className="action-bar">
        <div className="stack">
          {inProgress ? (
            <>
              <p className="section-help action-bar__note">You already have a workout in progress.</p>
              <Button variant="primary" block to="/session">
                Resume Workout in Progress
              </Button>
            </>
          ) : (
            <Button variant="primary" block onClick={start}>
              Start Workout
            </Button>
          )}
          <Button variant="ghost" block to="/">
            Back to My Workouts
          </Button>
        </div>
      </div>
    </div>
  )
}
