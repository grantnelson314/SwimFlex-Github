/** Expandable "How SwimFlex decided" — the rules behind a recommendation, in plain language. */
export default function DecisionDetails({ steps }) {
  return (
    <details className="decision">
      <summary className="decision__summary">How SwimFlex decided</summary>
      <ul className="decision__list">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
    </details>
  )
}
