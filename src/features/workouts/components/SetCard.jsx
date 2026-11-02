import Card from '../../../components/cards/Card.jsx'
import { formatYards } from '../../../utils/format.js'
import { calculateSetYards, formatSetNotation, getRoleLabel } from '../workoutUtils.js'
import PrioritySetControl from './PrioritySetControl.jsx'

/** A structured set: role, swim notation, yards, and the Priority Set control. */
export default function SetCard({ set, isPriority, onTogglePriority }) {
  return (
    <li>
      <Card selected={isPriority} className="set-card">
        <div className="set-card__top">
          <span className="set-card__role">{getRoleLabel(set.role)}</span>
          <span className="set-card__yards">{formatYards(calculateSetYards(set))}</span>
        </div>
        <p className="set-card__notation">{formatSetNotation(set)}</p>
        <PrioritySetControl
          setName={set.name}
          selected={isPriority}
          onToggle={onTogglePriority}
        />
      </Card>
    </li>
  )
}
