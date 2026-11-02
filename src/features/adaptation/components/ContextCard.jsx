import Card from '../../../components/cards/Card.jsx'

/**
 * "What you told SwimFlex": the situation a recommendation was built for
 * (planned vs available pool, unavailable equipment, readiness). Presentation only.
 */
export default function ContextCard({ context }) {
  if (!context?.items?.length) return null
  return (
    <Card as="section" aria-label={context.heading} className="context-card">
      <h2 className="section-title">{context.heading}</h2>
      <dl className="context-card__list">
        {context.items.map((item) => (
          <div key={item.label} className="context-card__row">
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
