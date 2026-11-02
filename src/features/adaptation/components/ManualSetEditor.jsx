import Card from '../../../components/cards/Card.jsx'
import IntervalStepper from '../../../components/forms/IntervalStepper.jsx'
import NumberStepper from '../../../components/forms/NumberStepper.jsx'
import { formatYards } from '../../../utils/format.js'
import PrioritySetControl from '../../workouts/components/PrioritySetControl.jsx'
import { getRoleLabel } from '../../workouts/workoutUtils.js'
import { MANUAL_LIMITS } from '../manualAdjustment.js'

/** One editable set: reps, distance per rep, interval, and the Priority Set toggle. */
export default function ManualSetEditor({ set, draft, yards, isPriority, errors, onChange, onTogglePriority }) {
  const err = (field) => errors.find((e) => e.field === field)?.message
  const hasInterval = Boolean(set.intervalSeconds)

  return (
    <li>
      <Card selected={isPriority} className="manual-set">
        <div className="manual-set__top">
          <div>
            <span className="set-card__role">{getRoleLabel(set.role)}</span>
            <h3 className="manual-set__name">{set.name}</h3>
          </div>
          <p className="manual-set__yards" aria-label={`${set.name} total`}>
            {formatYards(yards)}
          </p>
        </div>

        <div className="manual-set__fields">
          <NumberStepper
            id={`manual-${set.id}-reps`}
            label="Repetitions"
            value={draft.repetitions}
            onChange={(v) => onChange({ repetitions: v })}
            min={MANUAL_LIMITS.repetitions.min}
            max={MANUAL_LIMITS.repetitions.max}
            step={1}
            error={err('repetitions')}
          />
          <NumberStepper
            id={`manual-${set.id}-distance`}
            label="Distance per rep"
            value={draft.distancePerRepYards}
            onChange={(v) => onChange({ distancePerRepYards: v })}
            min={25}
            max={MANUAL_LIMITS.distancePerRepYards.max}
            step={25}
            unit="yd"
            error={err('distancePerRepYards')}
          />
          {hasInterval ? (
            <IntervalStepper
              id={`manual-${set.id}-interval`}
              value={draft.intervalSeconds}
              onChange={(v) => onChange({ intervalSeconds: v })}
              min={MANUAL_LIMITS.intervalSeconds.min}
              max={MANUAL_LIMITS.intervalSeconds.max}
              error={err('intervalSeconds')}
            />
          ) : (
            <p className="field__hint">No send-off interval. You move on yourself in Pool Mode.</p>
          )}
        </div>

        <PrioritySetControl setName={set.name} selected={isPriority} onToggle={onTogglePriority} />
      </Card>
    </li>
  )
}
