import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Button from '../../../components/buttons/Button.jsx'
import Card from '../../../components/cards/Card.jsx'
import NumberStepper from '../../../components/forms/NumberStepper.jsx'
import ScaleSelect from '../../../components/forms/ScaleSelect.jsx'
import ScreenHeader from '../../../components/layout/ScreenHeader.jsx'
import { InfoIcon } from '../../../components/status/Icons.jsx'
import StatusBadge from '../../../components/status/StatusBadge.jsx'
import { applySessionAdjustment, endQuickAdjust } from '../../../state/actions.js'
import { useAppDispatch, useAppState } from '../../../state/AppContext.jsx'
import { formatYards } from '../../../utils/format.js'
import { formatSetNotation } from '../../workouts/workoutUtils.js'
import DecisionDetails from '../../adaptation/components/DecisionDetails.jsx'
import {
  QUICK_ADJUST_LABELS,
  QUICK_ADJUST_ORDER,
  QUICK_ADJUST_REASONS,
  proposeQuickAdjust,
} from '../../adaptation/quickAdjust.js'
import { defaultAvailableMinutes, estimateRemainingMinutes } from '../../adaptation/remainingTime.js'
import { isFinished } from '../sessionReducer.js'
import { getCurrentSet } from '../sessionSelectors.js'
import { useQuickAdjustHold } from '../useQuickAdjustHold.js'

const READINESS_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))
const RPE_OPTIONS = Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))
const REASON_OPTIONS = QUICK_ADJUST_ORDER.map((value) => ({ value, label: QUICK_ADJUST_LABELS[value] }))

/**
 * Quick Adjust (DESIGN.md §8): a narrow change made DURING the workout, without rebuilding it.
 *   Interval too fast / Fatigue -> a new interval for the CURRENT set
 *   Running out of time        -> shorter LATER sets (the current set is never rewritten)
 * Suggestions come from features/adaptation/quickAdjust.js; applying one is a session action.
 * Progression is paused while this screen is open (useQuickAdjustHold) and resumes on the way out,
 * unless the session was already paused or the swimmer reports pain or injury.
 */
export default function QuickAdjustPage() {
  const { activeSession: session } = useAppState()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const [rpe, setRpe] = useState(null)
  const [readiness, setReadiness] = useState(null)
  const [minutes, setMinutes] = useState(() => (session ? defaultAvailableMinutes(session) : 15))
  const [reason, setReason] = useState(null)
  const [errors, setErrors] = useState({})
  const [result, setResult] = useState(null)

  useQuickAdjustHold(true)

  if (!session) return <Navigate to="/" replace />
  if (isFinished(session)) return <Navigate to="/session/complete" replace />

  const set = getCurrentSet(session)
  const clearErrors = () => setErrors({})

  function submit(e) {
    e.preventDefault()
    if (!reason) {
      setErrors({ reason: 'Choose what is happening.' })
      return
    }
    if (reason === QUICK_ADJUST_REASONS.fatigue && readiness == null) {
      setErrors({ readiness: 'Choose a readiness from 1 to 5.' })
      return
    }
    const outcome = proposeQuickAdjust(session, {
      reason,
      rpe,
      readiness,
      availableMinutes: reason === QUICK_ADJUST_REASONS.runningOutOfTime ? minutes : null,
    })

    if (outcome.type === 'safetyBoundary') {
      // The hold already paused the session. Clear it WITHOUT resuming so it stays paused
      // behind the Safety Boundary. No adjustment is produced.
      dispatch(endQuickAdjust(false))
      navigate('/session/safety')
      return
    }
    if (outcome.type === 'invalidRequest') {
      setErrors(Object.fromEntries(outcome.errors.map((x) => [x.field === 'availableMinutes' ? 'minutes' : x.field, x.message])))
      return
    }
    setErrors({})
    setResult(outcome)
  }

  function apply() {
    dispatch(applySessionAdjustment(result.adjustment))
    dispatch(endQuickAdjust(true))
    navigate('/session')
  }

  /* ----- Result: new interval for the current set ----- */
  if (result?.type === 'suggestion') {
    return (
      <div className="screen">
        <div className="phone__scroll">
          <ScreenHeader
            title="Quick Adjust"
            subtitle={`${result.setName} · ${QUICK_ADJUST_LABELS[result.reason]}, ${result.inputSummary}`}
          />

          <div className="stack stack--sections">
            <Card className="qa-proposal">
              <p className="comparison__heading">Current set</p>
              <p className="qa-proposal__before">
                <span className="visually-hidden">Was: </span>
                <s>{result.before}</s>
              </p>
              <p className="comparison__heading">Proposed</p>
              <p className="qa-proposal__after">{result.after}</p>
            </Card>

            <Card as="section" aria-labelledby="qa-why" className="why-card">
              <h2 id="qa-why" className="section-title">
                Why
              </h2>
              <p>{result.explanation}</p>
            </Card>

            <DecisionDetails steps={result.rationale} />
          </div>
        </div>

        <div className="action-bar">
          <div className="stack">
            <Button variant="primary" block onClick={apply}>
              Apply &amp; Continue
            </Button>
            <Button variant="secondary" block to="/session">
              Keep Current Set
            </Button>
          </div>
        </div>
      </div>
    )
  }

  /* ----- Result: shorter remaining workout ----- */
  if (result?.type === 'remainingSuggestion') {
    return (
      <div className="screen">
        <div className="phone__scroll">
          <ScreenHeader
            title="Quick Adjust"
            subtitle={`Remaining workout · about ${result.availableMinutes} min left`}
          />

          {result.requiresReview && (
            <p className="callout callout--warning" role="status">
              <InfoIcon />
              <span>
                <strong>Please review before applying.</strong> Supporting sets alone were not enough, so a later
                main set was shortened too.
              </span>
            </p>
          )}

          <div className="stack stack--sections">
            <Card className="qa-proposal">
              <p className="comparison__heading">Time left</p>
              <p className="qa-proposal__after qa-proposal__after--time">
                About {result.remainingMinutesBefore} min <span aria-hidden="true">→</span>
                <span className="visually-hidden"> to </span> about {result.remainingMinutesAfter} min
              </p>
              <p className="qa-proposal__note">
                {formatYards(result.yardsRemoved)} less in the sets still to come. The set you’re swimming now is
                not changed.
              </p>
            </Card>

            <Card as="section" aria-labelledby="qa-why" className="why-card">
              <h2 id="qa-why" className="section-title">
                Why
              </h2>
              <p>{result.explanation}</p>
            </Card>

            <section aria-labelledby="qa-sets" className="review-sets">
              <h2 id="qa-sets" className="section-title">
                Sets that change
              </h2>
              <ul className="stack">
                {result.changes.map((change) => (
                  <li key={change.setId}>
                    <Card className="change-card">
                      <div className="change-card__top">
                        <span className="set-card__role">{change.setName}</span>
                        <StatusBadge status="reduced" />
                      </div>
                      <p className="change-card__was">
                        <span className="visually-hidden">Was: </span>
                        <s>{change.before}</s>
                      </p>
                      <p className="set-card__notation">
                        <span className="visually-hidden">Now: </span>
                        {change.after}
                      </p>
                      <p className="change-card__why">{change.explanation}</p>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>

            <DecisionDetails steps={result.rationale} />
          </div>
        </div>

        <div className="action-bar">
          <div className="stack">
            <Button variant="primary" block onClick={apply}>
              Apply &amp; Continue
            </Button>
            <Button variant="secondary" block to="/session">
              Keep Workout As Is
            </Button>
          </div>
        </div>
      </div>
    )
  }

  /* ----- Result: nothing to change / limited / too short ----- */
  if (result) {
    const limited = result.type === 'limited'
    const tooShort = result.type === 'impossibleTimeTarget'
    return (
      <div className="screen">
        <div className="phone__scroll">
          <ScreenHeader title="Quick Adjust" subtitle={QUICK_ADJUST_LABELS[result.reason]} />
          <p className={`callout ${tooShort ? 'callout--warning' : 'callout--info'}`} role="status">
            <InfoIcon />
            <span>
              {limited && <strong>Not available mid-workout. </strong>}
              {tooShort && <strong>That’s too short. </strong>}
              {result.message}
            </span>
          </p>
          <p className="section-help">Your workout is unchanged.</p>
        </div>
        <div className="action-bar">
          <div className="stack">
            <Button variant="primary" block to="/session">
              Back to Pool Mode
            </Button>
            <Button variant="ghost" block onClick={() => setResult(null)}>
              Choose something else
            </Button>
          </div>
        </div>
      </div>
    )
  }

  /* ----- Form ----- */
  return (
    <form className="screen" onSubmit={submit} noValidate>
      <div className="phone__scroll">
        <ScreenHeader
          title="Quick Adjust"
          subtitle={set ? `Current set: ${formatSetNotation(set)}` : undefined}
          backTo="/session"
          backLabel="Pool Mode"
        />

        <div className="stack stack--sections">
          <ScaleSelect
            name="qa-reason"
            legend="What’s happening?"
            options={REASON_OPTIONS}
            value={reason}
            onChange={(v) => {
              setReason(v)
              clearErrors()
            }}
            columns={2}
            error={errors.reason}
          />

          {reason === QUICK_ADJUST_REASONS.intervalTooFast && (
            <ScaleSelect
              name="qa-rpe"
              legend="RPE so far (1–10)"
              options={RPE_OPTIONS}
              value={rpe}
              onChange={(v) => {
                setRpe(v)
                clearErrors()
              }}
              hint="Rate of perceived exertion: 1 is very easy, 10 is all-out."
              error={errors.rpe}
            />
          )}

          {reason === QUICK_ADJUST_REASONS.fatigue && (
            <>
              <ScaleSelect
                name="qa-readiness"
                legend="How fresh do you feel? (1–5)"
                options={READINESS_OPTIONS}
                value={readiness}
                onChange={(v) => {
                  setReadiness(v)
                  clearErrors()
                }}
                hint="1 = very tired, 5 = fresh"
                error={errors.readiness}
              />
              <ScaleSelect
                name="qa-fatigue-rpe"
                legend="RPE so far (optional, 1–10)"
                options={RPE_OPTIONS}
                value={rpe}
                onChange={(v) => {
                  setRpe(v)
                  clearErrors()
                }}
                allowNone
                columns={6}
                error={errors.rpe}
              />
            </>
          )}

          {reason === QUICK_ADJUST_REASONS.runningOutOfTime && (
            <NumberStepper
              id="qa-minutes"
              label="Minutes left"
              value={minutes}
              onChange={(v) => {
                setMinutes(v)
                clearErrors()
              }}
              min={5}
              max={180}
              unit="min"
              hint={`About ${estimateRemainingMinutes(session)} min of workout is left. Only the sets after this one are shortened.`}
              error={errors.minutes}
            />
          )}

          {(reason === QUICK_ADJUST_REASONS.equipment || reason === QUICK_ADJUST_REASONS.poolConditions) && (
            <p className="callout callout--info" role="status">
              <InfoIcon />
              <span>
                <strong>Not available mid-workout.</strong> SwimFlex can adapt for{' '}
                {reason === QUICK_ADJUST_REASONS.equipment ? 'missing equipment' : 'a different pool length'} before
                you start, from Adapt Workout.
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="action-bar">
        <div className="stack">
          <Button variant="primary" block type="submit">
            {reason === QUICK_ADJUST_REASONS.painOrInjury ? 'Continue' : 'See Suggestion'}
          </Button>
          <Button variant="ghost" block to="/session">
            Keep Current Set
          </Button>
        </div>
      </div>
    </form>
  )
}
