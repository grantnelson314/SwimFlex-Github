import { Navigate, useNavigate, useParams } from 'react-router-dom'
import ScreenHeader from '../../../components/layout/ScreenHeader.jsx'
import { clearAdaptation } from '../../../state/actions.js'
import { useAppDispatch, useAppState } from '../../../state/AppContext.jsx'
import { getWorkoutById } from '../../workouts/workoutUtils.js'
import SafetyBoundaryPanel from '../components/SafetyBoundaryPanel.jsx'
import { RESULT_TYPES } from '../adaptationEngine.js'

/** Pain/injury concern: no adjusted workout exists, so there is nothing to propose. */
export default function SafetyBoundaryPage() {
  const { workoutId } = useParams()
  const { workouts, recommendation } = useAppState()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const workout = getWorkoutById(workouts, workoutId)
  if (!workout) return <Navigate to="/" replace />
  if (recommendation?.type !== RESULT_TYPES.safetyBoundary) {
    return <Navigate to={`/adapt/${workout.id}`} replace />
  }

  return (
    <div className="screen">
      <div className="phone__scroll">
        <ScreenHeader title="Safety check" subtitle={workout.name} />

        <SafetyBoundaryPanel
          returnLabel="Return to Workout"
          endLabel="Cancel Adaptation"
          onReturn={() => {
            dispatch(clearAdaptation())
            navigate(`/workouts/${workout.id}`)
          }}
          onEnd={() => {
            dispatch(clearAdaptation())
            navigate('/')
          }}
        />

        <p className="disclaimer">SwimFlex provides training suggestions, not medical or injury advice.</p>
      </div>
    </div>
  )
}
