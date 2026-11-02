import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Button from '../../../components/buttons/Button.jsx'
import Card from '../../../components/cards/Card.jsx'
import ScreenHeader from '../../../components/layout/ScreenHeader.jsx'
import Chip from '../../../components/status/Chip.jsx'
import { InfoIcon } from '../../../components/status/Icons.jsx'
import { selectWorkout, setPrioritySet, startSession } from '../../../state/actions.js'
import { useAppDispatch, useAppState } from '../../../state/AppContext.jsx'
import { formatMinutes, formatYards } from '../../../utils/format.js'
import { isUnfinished } from '../../session/sessionReducer.js'
import SetCard from '../components/SetCard.jsx'
import {
  calculateWorkoutYards,
  getFocusLabel,
  getPrioritySet,
  getWorkoutById,
} from '../workoutUtils.js'

export default function ReviewWorkoutPage() {
  const { workoutId } = useParams()
  const { workouts, selectedWorkoutId, activeSession } = useAppState()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [announcement, setAnnouncement] = useState('')

  const workout = getWorkoutById(workouts, workoutId)

  // Keep shared "selected workout" in sync when arriving via URL / refresh.
  useEffect(() => {
    if (workout && selectedWorkoutId !== workout.id) dispatch(selectWorkout(workout.id))
  }, [workout, selectedWorkoutId, dispatch])

  if (!workout) return <Navigate to="/" replace />

  const priority = getPrioritySet(workout)

  function togglePriority(set) {
    const isCurrent = workout.prioritySetId === set.id
    dispatch(setPrioritySet(workout.id, isCurrent ? null : set.id))
    setAnnouncement(
      isCurrent
        ? `${set.name} is no longer the Priority Set.`
        : `${set.name} is now the Priority Set.`,
    )
  }

  return (
    <div className="screen">
      <div className="phone__scroll">
        <ScreenHeader title={workout.name} backTo="/" backLabel="My Workouts" />

        <Card className="summary-card">
          <div className="summary-card__metrics">
            <div>
              <p className="summary-card__value">{formatYards(calculateWorkoutYards(workout))}</p>
              <p className="summary-card__label">Total</p>
            </div>
            <div>
              <p className="summary-card__value">
                {formatMinutes(workout.estimatedDurationMinutes)}
              </p>
              <p className="summary-card__label">Estimated time</p>
            </div>
          </div>
          <div className="summary-card__focus">
            <span className="summary-card__label">Training focus</span>
            <Chip>{getFocusLabel(workout.focus)}</Chip>
          </div>
        </Card>

        <section className="review-sets" aria-labelledby="sets-heading">
          <h2 id="sets-heading" className="section-title">
            Sets
          </h2>
          <p className="section-help">
            Choose the set that matters most today. Preserve this set when adapting.
          </p>

          {!priority && (
            <p className="callout callout--warning" role="status">
              <InfoIcon />
              <span>
                <strong>No Priority Set selected.</strong> SwimFlex won&apos;t know which set to
                protect when adapting.
              </span>
            </p>
          )}

          <ul className="stack">
            {workout.sets.map((set) => (
              <SetCard
                key={set.id}
                set={set}
                isPriority={workout.prioritySetId === set.id}
                onTogglePriority={() => togglePriority(set)}
              />
            ))}
          </ul>
        </section>

        <p className="visually-hidden" role="status" aria-live="polite">
          {announcement}
        </p>
      </div>

      <div className="action-bar">
        <div className="stack">
          <Button variant="primary" block to={`/adapt/${workout.id}`}>
            Adapt Workout
          </Button>
          {isUnfinished(activeSession) ? (
            <Button variant="ghost" block to="/session">
              Resume Workout in Progress
            </Button>
          ) : (
            <Button
              variant="ghost"
              block
              onClick={() => {
                dispatch(startSession({ workout, sourceWorkoutId: workout.id, kind: 'original' }))
                navigate('/session')
              }}
            >
              Start Original Workout
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
