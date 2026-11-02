import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../../components/buttons/Button.jsx'
import ScaleSelect from '../../../components/forms/ScaleSelect.jsx'
import TextField from '../../../components/forms/TextField.jsx'
import ScreenHeader from '../../../components/layout/ScreenHeader.jsx'
import { InfoIcon, PlusIcon } from '../../../components/status/Icons.jsx'
import { addWorkout, selectWorkout } from '../../../state/actions.js'
import { useAppDispatch, useAppState } from '../../../state/AppContext.jsx'
import { formatMinutes, formatYards } from '../../../utils/format.js'
import DraftSetEditor from '../components/DraftSetEditor.jsx'
import { FOCUS_LABELS, TRAINING_FOCUS } from '../workoutData.js'
import {
  buildWorkoutFromDraft,
  createBlankDraft,
  createBlankSet,
  defaultSetName,
  validateWorkoutDraft,
} from '../workoutBuilder.js'
import { parseWorkoutText } from '../workoutParser.js'

const MODES = [
  { value: 'paste', label: 'Paste Workout' },
  { value: 'build', label: 'Build Manually' },
]

const EXAMPLE = `400 easy swim
8 x 50 drill/swim @ 1:00
6 x 200 free @ 2:50
8 x 25 fast @ :35
300 easy choice`

/**
 * Add Workout (DESIGN.md §2): enter a workout you already swim.
 *   Paste Workout  -> a deterministic parser reads the text; unreadable lines are shown back
 *                     with the original text so they can be corrected
 *   Build Manually -> add or edit sets directly
 * Both end in the same editable list of sets, then Save -> Review Workout.
 * Nothing is generated: SwimFlex only structures what the swimmer entered.
 */
export default function AddWorkoutPage() {
  const { workouts } = useAppState()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const [mode, setMode] = useState('paste')
  const [text, setText] = useState('')
  const [pasteError, setPasteError] = useState(null)
  const [failures, setFailures] = useState([])
  // `draft` is null until the swimmer is in the builder step (after reading text, or Build Manually).
  const [draft, setDraft] = useState(null)
  const [validation, setValidation] = useState(null)

  function changeMode(next) {
    setMode(next)
    setPasteError(null)
    setFailures([])
    setValidation(null)
    setDraft(next === 'build' ? createBlankDraft() : null)
  }

  /* ----- Paste Workout ----- */

  function readText(e) {
    e.preventDefault()
    const parsed = parseWorkoutText(text)
    if (parsed.isEmpty) {
      setPasteError('Paste or type your workout first, one set per line.')
      setFailures([])
      return
    }
    setPasteError(null)
    setFailures(parsed.failures)
    if (parsed.failures.length === 0) {
      setDraft({ name: '', focus: 'aerobic', sets: parsed.sets, fromText: true })
      setValidation(null)
    }
  }

  /** Continue with what was readable; each unreadable line becomes a set to fill in. */
  function fixInBuilder() {
    const parsed = parseWorkoutText(text)
    const names = parsed.sets.map((s) => s.name)
    const placeholders = parsed.failures.map((f) => {
      const name = defaultSetName('other', names)
      names.push(name)
      return createBlankSet({ name, needsReviewText: f.text })
    })
    setDraft({ name: '', focus: 'aerobic', sets: [...parsed.sets, ...placeholders], fromText: true })
    setFailures([])
    setValidation(null)
  }

  /* ----- Builder ----- */

  function patchDraft(patch) {
    setDraft((d) => ({ ...d, ...patch }))
  }

  function patchSet(key, patch) {
    setDraft((d) => ({
      ...d,
      sets: d.sets.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    }))
    setValidation(null)
  }

  function addSet() {
    setDraft((d) => ({
      ...d,
      sets: [...d.sets, createBlankSet({ name: defaultSetName('other', d.sets.map((s) => s.name)) })],
    }))
    setValidation(null)
  }

  function removeSet(key) {
    setDraft((d) => ({ ...d, sets: d.sets.filter((s) => s.key !== key) }))
    setValidation(null)
  }

  function save(e) {
    e.preventDefault()
    const result = validateWorkoutDraft(draft)
    setValidation(result)
    if (!result.valid) return
    const workout = buildWorkoutFromDraft(
      draft,
      workouts.map((w) => w.id),
    )
    dispatch(addWorkout(workout))
    dispatch(selectWorkout(workout.id))
    navigate(`/workouts/${workout.id}`)
  }

  const summary = draft ? summarize(draft) : null

  return (
    <div className="screen">
      <div className="phone__scroll">
        <ScreenHeader title="Add Workout" backTo="/" backLabel="My Workouts" />

        <div className="stack stack--sections">
          <ScaleSelect
            name="add-mode"
            legend="How do you want to add it?"
            options={MODES}
            value={mode}
            onChange={changeMode}
            columns={2}
          />

          {mode === 'paste' && !draft && (
            <form id="paste-form" className="stack" onSubmit={readText} noValidate>
              <TextField
                id="workout-text"
                label="Your workout"
                value={text}
                onChange={(value) => {
                  setText(value)
                  setPasteError(null)
                  setFailures([])
                }}
                multiline
                rows={8}
                placeholder={EXAMPLE}
                hint="One set per line, in yards. Example: 8 x 50 drill/swim @ 1:00"
                error={pasteError}
              />

              {failures.length > 0 && (
                <section className="callout callout--warning callout--block" aria-labelledby="unread-heading">
                  <p id="unread-heading">
                    <strong>
                      I couldn’t read {failures.length} {failures.length === 1 ? 'line' : 'lines'}.
                    </strong>{' '}
                    Your text is still above. Fix it there, or continue and fill in the details yourself.
                  </p>
                  <ul className="parse-failures">
                    {failures.map((failure) => (
                      <li key={failure.lineNumber}>
                        <span className="parse-failures__text">
                          Line {failure.lineNumber}: “{failure.text}”
                        </span>
                        <span className="parse-failures__why">{failure.message}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="callout__actions">
                    <Button variant="secondary" onClick={fixInBuilder}>
                      Fill in the details
                    </Button>
                  </div>
                </section>
              )}
            </form>
          )}

          {draft && (
            <form id="builder-form" className="stack stack--sections" onSubmit={save} noValidate>
              {draft.fromText && (
                <p className="callout callout--info" role="status">
                  <InfoIcon />
                  <span>
                    <strong>Check your sets.</strong> SwimFlex read your text; change anything that isn’t right
                    before saving.
                  </span>
                </p>
              )}

              <div className="inputs-card">
                <TextField
                  id="workout-name"
                  label="Workout name"
                  value={draft.name}
                  onChange={(name) => {
                    patchDraft({ name })
                    setValidation(null)
                  }}
                  error={validation?.name}
                  maxLength={50}
                  placeholder="Morning Swim"
                />
                <div className="field">
                  <label className="field__label" htmlFor="workout-focus">
                    Training focus
                  </label>
                  <select
                    id="workout-focus"
                    className="select"
                    value={draft.focus}
                    onChange={(e) => patchDraft({ focus: e.target.value })}
                  >
                    {TRAINING_FOCUS.map((focus) => (
                      <option key={focus} value={focus}>
                        {FOCUS_LABELS[focus]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <section aria-labelledby="builder-sets-heading">
                <h2 id="builder-sets-heading" className="section-title">
                  Sets
                </h2>
                {validation?.sets && (
                  <p className="field__error" role="alert">
                    {validation.sets}
                  </p>
                )}
                <ul className="stack">
                  {draft.sets.map((set, index) => (
                    <DraftSetEditor
                      key={set.key}
                      index={index}
                      set={set}
                      errors={validation?.bySet[set.key]}
                      onChange={(patch) => patchSet(set.key, patch)}
                      onRemove={() => removeSet(set.key)}
                    />
                  ))}
                </ul>
                <div className="builder-add">
                  <Button variant="secondary" block onClick={addSet} icon={<PlusIcon />}>
                    Add a set
                  </Button>
                </div>
              </section>

              {summary && (
                <p className="readout" aria-live="polite">
                  <span className="readout__label">Total (estimate)</span>
                  <span className="readout__value">
                    {formatYards(summary.yards)} · {formatMinutes(summary.minutes)}
                  </span>
                </p>
              )}

              {validation && !validation.valid && (
                <p className="callout callout--warning" role="alert">
                  <InfoIcon />
                  <span>Please fix the highlighted fields before saving.</span>
                </p>
              )}
            </form>
          )}
        </div>
      </div>

      <div className="action-bar">
        <div className="stack">
          {draft ? (
            <Button variant="primary" block type="submit" form="builder-form">
              Save Workout
            </Button>
          ) : (
            <Button variant="primary" block type="submit" form="paste-form">
              Read Workout
            </Button>
          )}
          {draft?.fromText ? (
            <Button
              variant="ghost"
              block
              onClick={() => {
                setDraft(null)
                setValidation(null)
              }}
            >
              Edit Text
            </Button>
          ) : (
            <Button variant="ghost" block to="/">
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Live total for the builder, from the sets that currently hold usable numbers. */
function summarize(draft) {
  const usable = draft.sets.filter(
    (s) => Number.isInteger(s.repetitions) && s.repetitions > 0 && Number.isInteger(s.distancePerRepYards) && s.distancePerRepYards > 0,
  )
  if (usable.length === 0) return null
  const workout = buildWorkoutFromDraft(
    { name: 'preview', focus: draft.focus, sets: usable.map((s) => ({ ...s, name: s.name || 'Set' })) },
    [],
  )
  return {
    yards: workout.sets.reduce((sum, s) => sum + s.repetitions * s.distancePerRepYards, 0),
    minutes: workout.estimatedDurationMinutes,
  }
}
