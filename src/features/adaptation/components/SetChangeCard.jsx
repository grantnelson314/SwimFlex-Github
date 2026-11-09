import Card from '../../../components/cards/Card.jsx'
import StatusBadge from '../../../components/status/StatusBadge.jsx'
import { formatYards } from '../../../utils/format.js'
import {
  calculateSetYards,
  formatSetNotation,
  getRoleLabel,
} from '../../workouts/workoutUtils.js'

/** One set on Proposed Changes with an explicit original-vs-adjusted comparison. */
export default function SetChangeCard({ change }) {
  const { originalSet, adjustedSet, changeType, explanation } = change
  const wasYards = calculateSetYards(originalSet)
  const nowYards = calculateSetYards(adjustedSet)

  return (
    <li>
      <Card selected={changeType === 'preserved'} className="change-card">
        <div className="change-card__top">
          <span className="set-card__role">{getRoleLabel(originalSet.role)}</span>
          <StatusBadge status={changeType} />
        </div>

        <div className="set-compare" aria-label={`${getRoleLabel(originalSet.role)} original and adjusted comparison`}>
          <div className="set-compare__row">
            <p className="set-compare__label">Original</p>
            <p className="set-compare__notation">{formatSetNotation(originalSet)}</p>
            <p className="set-compare__yards">{formatYards(wasYards)}</p>
          </div>
          <div className="set-compare__row set-compare__row--adjusted">
            <p className="set-compare__label">Adjusted</p>
            <p className="set-compare__notation">{formatSetNotation(adjustedSet)}</p>
            <p className="set-compare__yards">{formatYards(nowYards)}</p>
          </div>
        </div>

        <p className="change-card__why">{explanation}</p>
      </Card>
    </li>
  )
}
