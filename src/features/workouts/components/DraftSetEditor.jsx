import Button from '../../../components/buttons/Button.jsx'
import CheckboxGroup from '../../../components/forms/CheckboxGroup.jsx'
import IntervalStepper from '../../../components/forms/IntervalStepper.jsx'
import NumberStepper from '../../../components/forms/NumberStepper.jsx'
import TextField from '../../../components/forms/TextField.jsx'
import { CheckIcon, InfoIcon } from '../../../components/status/Icons.jsx'
import {
  EFFORTS,
  EFFORT_LABELS,
  EQUIPMENT,
  EQUIPMENT_LABELS,
  ROLE_LABELS,
  SET_ROLES,
  STROKES,
  STROKE_LABELS,
} from '../workoutData.js'
import { DRAFT_LIMITS, validateDraftSet } from '../workoutBuilder.js'
import { formatSetNotation } from '../workoutUtils.js'

const EQUIPMENT_OPTIONS = EQUIPMENT.map((value) => ({ value, label: EQUIPMENT_LABELS[value] }))
const DEFAULT_INTERVAL_SECONDS = 60

/**
 * One set in the manual builder: name, type, reps, distance, stroke, effort, interval, equipment.
 * Controlled: values live in the parent's draft; edits go up through onChange(patch).
 */
export default function DraftSetEditor({ index, set, errors = {}, onChange, onRemove }) {
  const id = (field) => `${set.key}-${field}`
  const hasInterval = set.intervalSeconds != null
  // Show the swim notation only while the numbers are usable.
  const usable = Object.keys(validateDraftSet({ ...set, name: 'x' })).length === 0
  const notation = usable ? formatSetNotation(set) : null

  return (
    <li className="builder-set">
      <div className="builder-set__head">
        <h3 className="builder-set__title">Set {index + 1}</h3>
        {notation && <span className="builder-set__notation">{notation}</span>}
      </div>

      {set.needsReviewText && (
        <p className="callout callout--warning" role="status">
          <InfoIcon />
          <span>
            I couldn’t read this line: <strong>“{set.needsReviewText}”</strong>. Fill in the set below.
          </span>
        </p>
      )}

      <div className="builder-set__fields">
        <TextField
          id={id('name')}
          label="Set name"
          value={set.name}
          onChange={(name) => onChange({ name })}
          error={errors.name}
          maxLength={40}
        />

        <div className="field">
          <label className="field__label" htmlFor={id('role')}>
            Set type
          </label>
          <select
            id={id('role')}
            className="select"
            value={set.role}
            onChange={(e) => onChange({ role: e.target.value })}
          >
            {SET_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>

        <NumberStepper
          id={id('reps')}
          label="Reps"
          value={set.repetitions}
          onChange={(repetitions) => onChange({ repetitions })}
          min={DRAFT_LIMITS.repetitions.min}
          max={DRAFT_LIMITS.repetitions.max}
          step={1}
          error={errors.repetitions}
        />

        <NumberStepper
          id={id('distance')}
          label="Distance per rep"
          value={set.distancePerRepYards}
          onChange={(distancePerRepYards) => onChange({ distancePerRepYards })}
          min={DRAFT_LIMITS.distancePerRepYards.min}
          max={DRAFT_LIMITS.distancePerRepYards.max}
          step={25}
          unit="yd"
          error={errors.distancePerRepYards}
        />

        <div className="field">
          <label className="field__label" htmlFor={id('stroke')}>
            Stroke
          </label>
          <select
            id={id('stroke')}
            className="select"
            value={set.stroke}
            onChange={(e) => onChange({ stroke: e.target.value })}
          >
            {STROKES.map((stroke) => (
              <option key={stroke} value={stroke}>
                {STROKE_LABELS[stroke]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={id('effort')}>
            Effort
          </label>
          <select
            id={id('effort')}
            className="select"
            value={set.effort}
            onChange={(e) => onChange({ effort: e.target.value })}
          >
            {EFFORTS.map((effort) => (
              <option key={effort} value={effort}>
                {EFFORT_LABELS[effort]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <div className="check-grid">
            <div className="check-grid__item">
              <input
                id={id('has-interval')}
                className="check-grid__input"
                type="checkbox"
                checked={hasInterval}
                onChange={(e) =>
                  onChange({ intervalSeconds: e.target.checked ? DEFAULT_INTERVAL_SECONDS : null })
                }
              />
              <label htmlFor={id('has-interval')} className="check-grid__label">
                <span className="check-grid__box" aria-hidden="true">
                  {hasInterval && <CheckIcon width={14} height={14} />}
                </span>
                Has a send-off interval
              </label>
            </div>
          </div>
        </div>

        {hasInterval && (
          <IntervalStepper
            id={id('interval')}
            label="Send-off interval"
            value={set.intervalSeconds}
            onChange={(intervalSeconds) => onChange({ intervalSeconds })}
            min={DRAFT_LIMITS.intervalSeconds.min}
            max={DRAFT_LIMITS.intervalSeconds.max}
            error={errors.intervalSeconds}
          />
        )}

        <CheckboxGroup
          name={id('equipment')}
          legend="Equipment (optional)"
          options={EQUIPMENT_OPTIONS}
          values={set.equipment}
          onChange={(equipment) => onChange({ equipment })}
        />
      </div>

      <Button variant="ghost" onClick={onRemove} aria-label={`Remove set ${index + 1}`}>
        Remove set
      </Button>
    </li>
  )
}
