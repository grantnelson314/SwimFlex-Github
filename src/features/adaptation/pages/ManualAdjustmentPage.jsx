import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Button from '../../../components/buttons/Button.jsx'
import Card from '../../../components/cards/Card.jsx'
import ScreenHeader from '../../../components/layout/ScreenHeader.jsx'
import { CheckIcon, InfoIcon } from '../../../components/status/Icons.jsx'
import { clearAdaptation, updateProposedWorkout } from '../../../state/actions.js'
import { useAppDispatch, useAppState } from '../../../state/AppContext.jsx'
import { describeMinutesChange, describeYardsChange, formatMinutes, formatYards } from '../../../utils/format.js'
import {
  calculateSetYards,
  calculateWorkoutYards,
  estimateAdjustedMinutes,
  getWorkoutById,
} from '../../workouts/workoutUtils.js'
import { RESULT_TYPES } from '../adaptationEngine.js'
import { getBaselineRecommendation, pickEditableFields, validateManualEdits } from '../manualAdjustment.js'
import ManualSetEditor from '../components/ManualSetEditor.jsx'

const draftFrom = (adjustedWorkout) => ({
  sets: adjustedWorkout.sets.map((s) => ({ id: s.id, ...pickEditableFields(s) })),
  prioritySetId: adjustedWorkout.prioritySetId ?? null,
})

const sameDraft = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Manual Adjustment (DESIGN.md §6). The swimmer's edits override the recommendation.
 * This screen never re-runs the adaptation engine; Save replaces the current PROPOSAL only.
 */
export default function ManualAdjustmentPage() {
  const { workoutId } = useParams()
  const { workouts, recommendation: rec } = useAppState()

  const workout = getWorkoutById(workouts, workoutId)
  if (!workout) return <Navigate to="/" replace />
  if (rec?.type !== RESULT_TYPES.recommendation || rec.sourceWorkoutId !== workout.id || rec.status !== 'proposed') {
    return <Navigate to={`/adapt/${workout.id}`} replace />
  }
  return <ManualEditor workout={workout} rec={rec} />
}

function ManualEditor({ workout, rec }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  // Start from the CURRENT proposal (the recommendation, or an earlier manual save).
  const [draft, setDraft] = useState(() => draftFrom(rec.adjustedWorkout))
  const baselineDraft = useMemo(() => draftFrom(getBaselineRecommendation(rec).adjustedWorkout), [rec])
  const atRecommendation = sameDraft(draft, baselineDraft)

  const errors = useMemo(() => validateManualEdits(draft, workout), [draft, workout])
  const valid = errors.length === 0

  // Live totals from the existing yardage + time model. While a field is mid-edit/invalid,
  // that field falls back to the proposal's value so the totals never show NaN.
  const draftWorkout = useMemo(
    () => ({
      ...rec.adjustedWorkout,
      prioritySetId: draft.prioritySetId,
      sets: rec.adjustedWorkout.sets.map((set) => {
        const d = draft.sets.find((s) => s.id === set.id)
        const ok = (v, fallback) => (Number.isFinite(v) ? v : fallback)
        return {
          ...set,
          repetitions: ok(d.repetitions, set.repetitions),
          distancePerRepYards: ok(d.distancePerRepYards, set.distancePerRepYards),
          intervalSeconds: set.intervalSeconds ? ok(d.intervalSeconds, set.intervalSeconds) : null,
        }
      }),
    }),
    [draft, rec.adjustedWorkout],
  )
  const totalYards = calculateWorkoutYards(draftWorkout)
  const totalMinutes = estimateAdjustedMinutes(workout, draftWorkout)
  const originalYards = calculateWorkoutYards(workout)
  const priorityName = draftWorkout.sets.find((s) => s.id === draft.prioritySetId)?.name

  const updateSet = (setId, patch) =>
    setDraft((cur) => ({ ...cur, sets: cur.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }))

  const togglePriority = (setId) =>
    setDraft((cur) => ({ ...cur, prioritySetId: cur.prioritySetId === setId ? null : setId }))

  function save() {
    if (!valid) return
    dispatch(updateProposedWorkout(draft))
    navigate(`/adapt/${workout.id}/proposed`)
  }

  return (
    <div className="screen">
      <div className="phone__scroll">
        <ScreenHeader
          title="Manual Adjustment"
          subtitle={workout.name}
          backTo={`/adapt/${workout.id}/proposed`}
          backLabel="Proposed Changes"
        />

        <p className="callout callout--info" role="note">
          <InfoIcon />
          <span>
            Your edits override the recommendation. SwimFlex recalculates the totals but won&apos;t
            re-run its adaptation rules. Your saved workout isn&apos;t changed.
          </span>
        </p>

        <Card className="manual-totals" aria-live="polite">
          <div className="summary-card__metrics">
            <div>
              <p className="summary-card__value" data-testid="manual-total-yards">
                {formatYards(totalYards)}
              </p>
              <p className="summary-card__label">Total</p>
            </div>
            <div>
              <p className="summary-card__value" data-testid="manual-total-minutes">
                {formatMinutes(totalMinutes)}
              </p>
              <p className="summary-card__label">Estimated time</p>
            </div>
          </div>
          <p className="manual-totals__delta">
            vs. original {formatYards(originalYards)}: {describeYardsChange(totalYards - originalYards).toLowerCase()},{' '}
            {describeMinutesChange(workout.estimatedDurationMinutes - totalMinutes).toLowerCase()}
          </p>
          <p className="manual-totals__priority">
            {priorityName ? (
              <>
                <CheckIcon width={16} height={16} /> Priority Set: <strong>{priorityName}</strong>
              </>
            ) : (
              'No Priority Set selected'
            )}
          </p>
        </Card>

        <div className="stack stack--sections">
          <section aria-labelledby="manual-sets-heading">
            <h2 id="manual-sets-heading" className="section-title">
              Sets
            </h2>
            <ul className="stack">
              {draftWorkout.sets.map((set) => (
                <ManualSetEditor
                  key={set.id}
                  set={rec.adjustedWorkout.sets.find((s) => s.id === set.id)}
                  draft={draft.sets.find((s) => s.id === set.id)}
                  yards={calculateSetYards(set)}
                  isPriority={draft.prioritySetId === set.id}
                  errors={errors.filter((e) => e.setId === set.id)}
                  onChange={(patch) => updateSet(set.id, patch)}
                  onTogglePriority={() => togglePriority(set.id)}
                />
              ))}
            </ul>
          </section>

          <Button variant="secondary" block disabled={atRecommendation} onClick={() => setDraft(baselineDraft)}>
            Reset to Recommendation
          </Button>
        </div>
      </div>

      <div className="action-bar">
        <div className="stack">
          <Button variant="primary" block disabled={!valid} onClick={save}>
            Save Changes
          </Button>
          <div className="action-row">
            <Button variant="secondary" block to={`/adapt/${workout.id}/proposed`}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              block
              onClick={() => {
                dispatch(clearAdaptation())
                navigate(`/workouts/${workout.id}`)
              }}
            >
              Keep Original
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
