import Button from '../../../components/buttons/Button.jsx'

/**
 * Safety Boundary (DESIGN.md §9). Shown when pain, injury or illness is indicated.
 * It never diagnoses, never suggests treatment, and never offers a training adjustment.
 * Reusable in-workout later: pass different labels/handlers.
 */
export default function SafetyBoundaryPanel({
  onReturn,
  onEnd,
  returnLabel = 'Return to Workout',
  endLabel = 'End Workout',
}) {
  return (
    <section className="safety" aria-labelledby="safety-heading" role="alert">
      <h2 id="safety-heading" className="safety__title">
        SwimFlex can’t assess pain, injury, or illness.
      </h2>
      <p className="safety__body">
        Consider stopping the workout rather than relying on an automated training adjustment.
      </p>
      <div className="stack">
        <Button variant="primary" block onClick={onReturn}>
          {returnLabel}
        </Button>
        <Button variant="secondary" block onClick={onEnd}>
          {endLabel}
        </Button>
      </div>
    </section>
  )
}
