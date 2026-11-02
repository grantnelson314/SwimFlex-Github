import Card from '../../../components/cards/Card.jsx'
import StatusBadge from '../../../components/status/StatusBadge.jsx'
import { formatYards } from '../../../utils/format.js'
import {
  calculateSetYards,
  formatSetNotation,
  getRoleLabel,
} from '../../workouts/workoutUtils.js'

/** One set on Proposed Changes: status, what it was, what it becomes, and why. */
export default function SetChangeCard({ change }) {
  const { originalSet, adjustedSet, changeType, explanation } = change
  const changed = !['preserved', 'unchanged'].includes(changeType)
  const wasYards = calculateSetYards(originalSet)
  const nowYards = calculateSetYards(adjustedSet)

  return (
    <li>
      <Card selected={changeType === 'preserved'} className="change-card">
        <div className="change-card__top">
          <span className="set-card__role">{getRoleLabel(originalSet.role)}</span>
          <StatusBadge status={changeType} />
        </div>

        {changed && (
          <p className="change-card__was">
            <span className="visually-hidden">Was: </span>
            <s>{formatSetNotation(originalSet)}</s>
          </p>
        )}
        <p className="set-card__notation">
          {changed && <span className="visually-hidden">Now: </span>}
          {formatSetNotation(adjustedSet)}
        </p>

        <p className="change-card__yards">
          {changed && wasYards !== nowYards
            ? `${formatYards(wasYards)} → ${formatYards(nowYards)}`
            : formatYards(nowYards)}
        </p>
        <p className="change-card__why">{explanation}</p>
      </Card>
    </li>
  )
}
