import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Button from '../../../components/buttons/Button.jsx'
import Card from '../../../components/cards/Card.jsx'
import ScreenHeader from '../../../components/layout/ScreenHeader.jsx'
import { InfoIcon } from '../../../components/status/Icons.jsx'
import { acceptRecommendation, clearAdaptation } from '../../../state/actions.js'
import { useAppDispatch, useAppState } from '../../../state/AppContext.jsx'
import { getWorkoutById } from '../../workouts/workoutUtils.js'
import ComparisonCard from '../components/ComparisonCard.jsx'
import ContextCard from '../components/ContextCard.jsx'
import DecisionDetails from '../components/DecisionDetails.jsx'
import SetChangeCard from '../components/SetChangeCard.jsx'
import { RESULT_TYPES } from '../adaptationEngine.js'

/**
 * Proposed Changes (DESIGN.md §5): the transparency screen.
 * Nothing here is applied until the swimmer chooses "Use Adjusted Workout".
 */
export default function ProposedChangesPage() {
  const { workoutId } = useParams()
  const { workouts, recommendation: rec } = useAppState()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const workout = getWorkoutById(workouts, workoutId)
  if (!workout) return <Navigate to="/" replace />
  if (rec?.type !== RESULT_TYPES.recommendation || rec.sourceWorkoutId !== workout.id) {
    return <Navigate to={`/adapt/${workout.id}`} replace />
  }

  return (
    <div className="screen">
      <div className="phone__scroll">
        <ScreenHeader
          title="Proposed Changes"
          subtitle={`${workout.name} · ${rec.summary}`}
          backTo={`/adapt/${workout.id}`}
          backLabel="Adapt Workout"
        />

        {rec.requiresUserReview && (
          <p className="callout callout--warning" role="status">
            <InfoIcon />
            <span>
              <strong>Please review before using.</strong>{' '}
              {rec.reviewReason ?? 'This proposal goes beyond trimming supporting work.'} Nothing changes
              until you approve it.
            </span>
          </p>
        )}

        {rec.source === 'manual' && (
          <p className="callout callout--info" role="status">
            <InfoIcon />
            <span>
              <strong>Edited by you.</strong> These are your own changes; SwimFlex has not re-run its
              rules. Use Make Changes to edit again or reset to the recommendation.
            </span>
          </p>
        )}

        <div className="stack stack--sections">
          <ContextCard context={rec.context} />
          <ComparisonCard recommendation={rec} />

          <Card as="section" aria-labelledby="why-heading" className="why-card">
            <h2 id="why-heading" className="section-title">
              Why SwimFlex made these changes
            </h2>
            <p>{rec.explanation}</p>
          </Card>

          <section aria-labelledby="sets-changes-heading" className="review-sets">
            <h2 id="sets-changes-heading" className="section-title">
              Set by set
            </h2>
            <ul className="stack">
              {rec.changes.map((change) => (
                <SetChangeCard key={change.originalSetId} change={change} />
              ))}
            </ul>
          </section>

          <DecisionDetails steps={rec.rationale} />
        </div>
      </div>

      <div className="action-bar">
        <div className="stack">
          <Button
            variant="primary"
            block
            onClick={() => {
              dispatch(acceptRecommendation())
              navigate(`/adapt/${workout.id}/ready`)
            }}
          >
            Use Adjusted Workout
          </Button>
          <div className="action-row">
            <Button variant="secondary" block to={`/adapt/${workout.id}/manual`}>
              Make Changes
            </Button>
            <Button
              variant="secondary"
              block
              onClick={() => {
                dispatch(clearAdaptation())
                navigate(`/workouts/${workout.id}`)
              }}
            >
              Keep Original
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
