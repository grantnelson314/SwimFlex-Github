import ScreenHeader from '../../../components/layout/ScreenHeader.jsx'
import { selectWorkout } from '../../../state/actions.js'
import { useAppDispatch, useAppState } from '../../../state/AppContext.jsx'
import WorkoutCard from '../components/WorkoutCard.jsx'

/** Explicit entry point for the home-screen Adapt Workout action. */
export default function ChooseWorkoutPage() {
  const { workouts } = useAppState()
  const dispatch = useAppDispatch()

  return (
    <div className="screen">
      <div className="phone__scroll">
        <ScreenHeader
          title="Choose a workout to adapt"
          subtitle="Select the workout you planned to swim today. You can review its Priority Set before adapting it."
          backTo="/"
          backLabel="My Workouts"
        />

        {workouts.length === 0 ? (
          <p className="empty-state">No saved workouts yet. Add a workout first, then come back to adapt it.</p>
        ) : (
          <ul className="stack" aria-label="Saved workouts available to adapt">
            {workouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onOpen={(id) => dispatch(selectWorkout(id))}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
