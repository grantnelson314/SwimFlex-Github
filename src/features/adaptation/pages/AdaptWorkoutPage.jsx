import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import Button from '../../../components/buttons/Button.jsx'
import ScreenHeader from '../../../components/layout/ScreenHeader.jsx'
import { InfoIcon } from '../../../components/status/Icons.jsx'
import { clearAdaptation, setAdaptationResult } from '../../../state/actions.js'
import { useAppDispatch, useAppState } from '../../../state/AppContext.jsx'
import { formatMinutes, formatYards } from '../../../utils/format.js'
import {
  calculateWorkoutYards,
  formatSetNotation,
  getPrioritySet,
  getWorkoutById,
} from '../../workouts/workoutUtils.js'
import ConstraintInputs from '../components/ConstraintInputs.jsx'
import ConstraintPicker from '../components/ConstraintPicker.jsx'
import { RESULT_TYPES, recommendWorkout } from '../adaptationEngine.js'
import { CONSTRAINTS, createDefaultRequest } from '../adaptationRequest.js'

export default function AdaptWorkoutPage() {
  const { workoutId } = useParams()
  const { workouts, adaptationRequest } = useAppState()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const workout = getWorkoutById(workouts, workoutId)

  // Start from the swimmer's previous answers if they come back here (e.g. from Proposed Changes).
  const [request, setRequest] = useState(() => {
    if (!workout) return null
    const defaults = createDefaultRequest(workout)
    if (adaptationRequest?.workoutId !== workout.id) return defaults
    const restoredConstraint =
      adaptationRequest.constraint === CONSTRAINTS.painOrInjury ? null : adaptationRequest.constraint
    return { ...defaults, ...adaptationRequest, constraint: restoredConstraint }
  })
  const [errors, setErrors] = useState([])
  const [notice, setNotice] = useState(null)

  if (!workout) return <Navigate to="/" replace />

  const priority = getPrioritySet(workout)

  function patchRequest(patch) {
    setRequest((r) => ({ ...r, ...patch }))
    setErrors([])
    setNotice(null)
  }

  /** Pain/injury goes straight to the Safety Boundary — no normal adaptation controls. */
  function handleSelect(constraint) {
    if (constraint === CONSTRAINTS.painOrInjury) {
      const next = { ...request, constraint }
      dispatch(setAdaptationResult(next, recommendWorkout(workout, next)))
      navigate(`/adapt/${workout.id}/safety`)
      return
    }
    patchRequest({ constraint })
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!request.constraint) return

    const next = { ...request, prioritySetId: workout.prioritySetId ?? null }
    const result = recommendWorkout(workout, next)
    dispatch(setAdaptationResult(next, result))

    switch (result.type) {
      case RESULT_TYPES.recommendation:
        navigate(`/adapt/${workout.id}/proposed`)
        break
      case RESULT_TYPES.safetyBoundary:
        navigate(`/adapt/${workout.id}/safety`)
        break
      case RESULT_TYPES.invalidRequest:
        setErrors(result.errors) // shown inline next to each field
        setNotice(null)
        break
      default:
        setErrors([])
        setNotice(result) // noChangeNeeded / impossibleTimeTarget
    }
  }

  function increaseTime() {
    setNotice(null)
    document.getElementById('available-minutes')?.focus()
  }

  return (
    <div className="screen">
      <div className="phone__scroll">
        <ScreenHeader title="What’s different today?" backTo={`/workouts/${workout.id}`} backLabel="Review Workout" />

        <p className="context-line">
          <strong>{workout.name}</strong>
          <span aria-hidden="true"> · </span>
          {formatYards(calculateWorkoutYards(workout))}
          <span aria-hidden="true"> · </span>
          {formatMinutes(workout.estimatedDurationMinutes)}
        </p>
        <p className="context-line context-line--sub">
          {priority ? (
            <>
              Priority Set: {priority.name} — {formatSetNotation(priority)}
            </>
          ) : (
            <>
              No Priority Set selected. <Link to={`/workouts/${workout.id}`}>Choose one</Link>
            </>
          )}
        </p>

        <form id="adapt-form" className="adapt-form" onSubmit={handleSubmit} noValidate>
          <ConstraintPicker value={request.constraint} onSelect={handleSelect} />

          {request.constraint && (
            <section className="inputs-card" aria-label="Details">
              <ConstraintInputs
                workout={workout}
                request={request}
                onChange={patchRequest}
                errors={errors}
              />
            </section>
          )}

        </form>

        {notice?.type === RESULT_TYPES.noChangeNeeded && (
          <p className="callout callout--info" role="alert">
            <InfoIcon />
            <span>{notice.message}</span>
          </p>
        )}

        {notice?.type === RESULT_TYPES.impossibleTimeTarget && (
          <section className="callout callout--warning callout--block" role="alert">
            <p>
              <strong>This time is too short to keep your Priority Set.</strong> {notice.message}
            </p>
            <div className="callout__actions">
              <Button variant="secondary" onClick={increaseTime}>
                Increase available time
              </Button>
              <Button variant="ghost" to={`/adapt/${workout.id}/manual`}>
                Edit workout manually
              </Button>
            </div>
          </section>
        )}

        <p className="disclaimer">SwimFlex provides training suggestions, not medical or injury advice.</p>
      </div>

      <div className="action-bar">
        <div className="stack">
          <Button
            variant="primary"
            block
            type="submit"
            form="adapt-form"
            disabled={!request.constraint}
          >
            See Proposed Changes
          </Button>
          <Button
            variant="ghost"
            block
            onClick={() => {
              dispatch(clearAdaptation())
              navigate(`/workouts/${workout.id}`)
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
