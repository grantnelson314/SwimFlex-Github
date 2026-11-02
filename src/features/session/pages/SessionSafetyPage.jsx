import { Navigate, useNavigate } from 'react-router-dom'
import ScreenHeader from '../../../components/layout/ScreenHeader.jsx'
import { endSession } from '../../../state/actions.js'
import { useAppDispatch, useAppState } from '../../../state/AppContext.jsx'
import SafetyBoundaryPanel from '../../adaptation/components/SafetyBoundaryPanel.jsx'
import { isFinished } from '../sessionReducer.js'

/**
 * In-workout Safety Boundary (Quick Adjust > Pain or injury concern).
 * Reuses the same panel and wording as the pre-workout flow. The session is already paused,
 * and no training adjustment is offered.
 */
export default function SessionSafetyPage() {
  const { activeSession: session } = useAppState()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  if (!session) return <Navigate to="/" replace />
  if (isFinished(session)) return <Navigate to="/session/complete" replace />

  return (
    <div className="screen">
      <div className="phone__scroll">
        <ScreenHeader title="Safety check" subtitle={session.workout.name} />

        <SafetyBoundaryPanel
          returnLabel="Return to Workout"
          endLabel="End Workout"
          onReturn={() => navigate('/session')}
          onEnd={() => {
            dispatch(endSession())
            navigate('/session/complete')
          }}
        />

        <p className="disclaimer">SwimFlex provides training suggestions, not medical or injury advice.</p>
      </div>
    </div>
  )
}
