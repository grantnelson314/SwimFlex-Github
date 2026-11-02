import { Link } from 'react-router-dom'
import Chip from '../../../components/status/Chip.jsx'
import { ChevronRightIcon } from '../../../components/status/Icons.jsx'
import { formatMinutes, formatYards } from '../../../utils/format.js'
import { calculateWorkoutYards, getFocusLabel, getPrioritySet } from '../workoutUtils.js'

/** One saved workout in My Workouts: name, focus, yards, estimated time, Priority Set. */
export default function WorkoutCard({ workout, onOpen }) {
  const priority = getPrioritySet(workout)

  return (
    <li>
      <Link
        to={`/workouts/${workout.id}`}
        className="card workout-card"
        onClick={() => onOpen?.(workout.id)}
      >
        <div className="workout-card__body">
          <div className="workout-card__top">
            <h3 className="workout-card__name">{workout.name}</h3>
            <Chip>{getFocusLabel(workout.focus)}</Chip>
          </div>
          <p className="workout-card__meta">
            <strong>{formatYards(calculateWorkoutYards(workout))}</strong>
            <span aria-hidden="true"> · </span>
            <span className="visually-hidden">, </span>
            {formatMinutes(workout.estimatedDurationMinutes)}
          </p>
          <p className="workout-card__priority">
            {priority ? `Priority Set: ${priority.name}` : 'No Priority Set selected'}
          </p>
        </div>
        <ChevronRightIcon className="workout-card__chevron" />
      </Link>
    </li>
  )
}
