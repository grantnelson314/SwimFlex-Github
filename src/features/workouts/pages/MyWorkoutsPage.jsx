import Button from '../../../components/buttons/Button.jsx'
import BrandMark from '../../../components/layout/BrandMark.jsx'
import ScreenHeader from '../../../components/layout/ScreenHeader.jsx'
import { PlusIcon } from '../../../components/status/Icons.jsx'
import { selectWorkout } from '../../../state/actions.js'
import { useAppDispatch, useAppState } from '../../../state/AppContext.jsx'
import { isUnfinished } from '../../session/sessionReducer.js'
import WorkoutCard from '../components/WorkoutCard.jsx'

export default function MyWorkoutsPage() {
  const { workouts, activeSession } = useAppState()
  const dispatch = useAppDispatch()

  return (
    <div className="screen">
      <div className="phone__scroll">
        <BrandMark />
        <ScreenHeader
          title="My Workouts"
          subtitle="Choose a structured workout, then adapt it to fit today's conditions."
        />

        {isUnfinished(activeSession) && (
          <section className="resume-banner" aria-label="Workout in progress">
            <div>
              <p className="resume-banner__title">Workout in progress</p>
              <p className="resume-banner__body">{activeSession.workout.name}</p>
            </div>
            <Button variant="primary" to="/session">
              Resume
            </Button>
          </section>
        )}

        <div className="stack stack--actions">
          {workouts.length > 0 ? (
            <Button variant="primary" block to="/choose-workout">
              Adapt Workout
            </Button>
          ) : (
            <Button variant="primary" block disabled>
              Adapt Workout
            </Button>
          )}
          <Button variant="secondary" block to="/add-workout" icon={<PlusIcon />}>
            Add Workout
          </Button>
        </div>

        <section className="workout-list-section" aria-labelledby="saved-workouts-heading">
          <h2 id="saved-workouts-heading" className="section-title">
            Saved workouts
          </h2>

          {workouts.length === 0 ? (
            <p className="empty-state">
              No workouts yet. Add a workout you already swim to get started.
            </p>
          ) : (
            <ul className="stack">
              {workouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onOpen={(id) => dispatch(selectWorkout(id))}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
