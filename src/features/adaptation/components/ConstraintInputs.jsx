import CheckboxGroup from '../../../components/forms/CheckboxGroup.jsx'
import NumberStepper from '../../../components/forms/NumberStepper.jsx'
import ScaleSelect from '../../../components/forms/ScaleSelect.jsx'
import { formatInterval } from '../../../utils/time.js'
import { EQUIPMENT } from '../../workouts/workoutData.js'
import { formatEquipmentList, formatSetNotation, getIntervalSets } from '../../workouts/workoutUtils.js'
import { getPlannedPoolLength } from '../adaptPool.js'
import {
  CONSTRAINTS,
  EQUIPMENT_LABELS,
  FATIGUE_PREFERENCES,
  FATIGUE_PREFERENCE_LABELS,
  POOL_ISSUES,
  POOL_ISSUE_LABELS,
  POOL_LENGTH_OPTIONS,
} from '../adaptationRequest.js'

const READINESS_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))
const RPE_OPTIONS = Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))
const EQUIPMENT_OPTIONS = EQUIPMENT.map((value) => ({ value, label: EQUIPMENT_LABELS[value] }))

/**
 * Only the questions relevant to the chosen constraint are shown (PLAN.md Feature 2).
 * Pain/injury never reaches this component — it routes to the Safety Boundary.
 * Pure presentation: values live in the parent's request; changes go up via onChange(patch).
 */
export default function ConstraintInputs({ workout, request, onChange, errors }) {
  const errorFor = (field) => errors.find((e) => e.field === field)?.message

  const readiness = (
    <ScaleSelect
      name="readiness"
      legend="Readiness (1–5)"
      options={READINESS_OPTIONS}
      value={request.readiness}
      onChange={(readiness) => onChange({ readiness })}
      hint="1 = very tired, 5 = fresh"
      error={errorFor('readiness')}
    />
  )

  switch (request.constraint) {
    case CONSTRAINTS.lessTime:
      return (
        <>
          <NumberStepper
            id="available-minutes"
            label="Available minutes"
            value={request.availableMinutes}
            onChange={(availableMinutes) => onChange({ availableMinutes })}
            min={5}
            max={180}
            unit="min"
            hint={`This workout is estimated at ${workout.estimatedDurationMinutes} min.`}
            error={errorFor('availableMinutes')}
          />
          {readiness}
          <CheckboxGroup
            name="equipment"
            legend="Equipment you have today"
            options={EQUIPMENT_OPTIONS}
            values={request.availableEquipment}
            onChange={(availableEquipment) => onChange({ availableEquipment })}
          />
        </>
      )

    case CONSTRAINTS.feelingTired:
      return (
        <>
          {readiness}
          <ScaleSelect
            name="rpe"
            legend="RPE so far (optional, 1–10)"
            options={RPE_OPTIONS}
            value={request.rpe}
            onChange={(rpe) => onChange({ rpe })}
            allowNone
            columns={6}
            hint="Rate of perceived exertion: 1 = very easy, 10 = maximal"
            error={errorFor('rpe')}
          />
          <ScaleSelect
            name="fatigue-preference"
            legend="How should SwimFlex adjust?"
            options={FATIGUE_PREFERENCES.map((value) => ({ value, label: FATIGUE_PREFERENCE_LABELS[value] }))}
            value={request.fatiguePreference}
            onChange={(fatiguePreference) => onChange({ fatiguePreference })}
            columns={3}
            error={errorFor('fatiguePreference')}
          />
        </>
      )

    case CONSTRAINTS.workoutTooDifficult: {
      const intervalSets = getIntervalSets(workout)
      const target = intervalSets.find((s) => s.id === request.targetSetId)
      return (
        <>
          <div className="field">
            <label className="field__label" htmlFor="target-set">
              Which set feels too hard?
            </label>
            <select
              id="target-set"
              className="select"
              value={request.targetSetId ?? ''}
              onChange={(e) => onChange({ targetSetId: e.target.value || null })}
            >
              {intervalSets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name} — {formatSetNotation(set)}
                </option>
              ))}
            </select>
            {errorFor('targetSetId') && <p className="field__error">{errorFor('targetSetId')}</p>}
          </div>
          {target && (
            <p className="readout">
              <span className="readout__label">Current interval</span>
              <span className="readout__value">@ {formatInterval(target.intervalSeconds)}</span>
            </p>
          )}
          <ScaleSelect
            name="rpe"
            legend="RPE (1–10)"
            options={RPE_OPTIONS}
            value={request.rpe}
            onChange={(rpe) => onChange({ rpe })}
            columns={5}
            hint="1 = very easy, 10 = maximal"
            error={errorFor('rpe')}
          />
        </>
      )
    }

    case CONSTRAINTS.missingEquipment: {
      // Here the swimmer marks what is MISSING; the request stores what is available.
      const missing = EQUIPMENT.filter((item) => !request.availableEquipment.includes(item))
      const used = [...new Set(workout.sets.flatMap((s) => s.equipment ?? []))]
      return (
        <CheckboxGroup
          name="missing-equipment"
          legend="Equipment you don’t have today"
          options={EQUIPMENT_OPTIONS}
          values={missing}
          onChange={(nowMissing) =>
            onChange({ availableEquipment: EQUIPMENT.filter((item) => !nowMissing.includes(item)) })
          }
          hint={
            used.length > 0
              ? `This workout uses ${formatEquipmentList(used)}.`
              : 'This workout doesn’t use any equipment.'
          }
          error={errorFor('availableEquipment')}
        />
      )
    }

    case CONSTRAINTS.poolLimitation:
      return (
        <>
          <p className="readout">
            <span className="readout__label">Planned pool</span>
            <span className="readout__value">{getPlannedPoolLength(workout)} yd</span>
          </p>
          <ScaleSelect
            name="pool-length"
            legend="Pool available today"
            options={POOL_LENGTH_OPTIONS.map((yd) => ({ value: yd, label: `${yd} yd` }))}
            value={request.poolLengthYards}
            onChange={(poolLengthYards) => onChange({ poolLengthYards })}
            error={errorFor('poolLengthYards')}
          />
          <CheckboxGroup
            name="pool-issues"
            legend="Anything else about the pool?"
            options={POOL_ISSUES.map((value) => ({ value, label: POOL_ISSUE_LABELS[value] }))}
            values={request.poolIssues}
            onChange={(poolIssues) => onChange({ poolIssues })}
          />
        </>
      )

    default:
      return null
  }
}
