import Card from '../../../components/cards/Card.jsx'
import Chip from '../../../components/status/Chip.jsx'
import { CheckIcon } from '../../../components/status/Icons.jsx'
import {
  describeMinutesChange,
  describeYardsChange,
  formatMinutes,
  formatYards,
} from '../../../utils/format.js'

const PRIORITY_COPY = {
  preserved: (p) => `Priority Set kept: ${p.setName} — ${p.notation}`,
  intervalAdjusted: (p) => `Priority Set kept: ${p.setName} — structure preserved, interval adjusted`,
  modified: (p) => `Priority Set changed: ${p.setName} — review carefully`,
  userChanged: (p) => `Priority Set chosen by you: ${p.setName}${p.notation ? ` — ${p.notation}` : ''}`,
  none: () => 'No Priority Set selected',
}

/** Original vs adjusted distance/time, net change summaries, and Priority Set confirmation. */
export default function ComparisonCard({ recommendation: rec }) {
  const priorityLine = PRIORITY_COPY[rec.priority.status]?.(rec.priority)
  const priorityOk = ['preserved', 'intervalAdjusted', 'userChanged'].includes(rec.priority.status)

  return (
    <Card className="comparison-card">
      <div className="comparison">
        <div className="comparison__col">
          <p className="comparison__heading">Original</p>
          <p className="comparison__value">{formatYards(rec.originalYards)}</p>
          <p className="comparison__value comparison__value--secondary">
            {formatMinutes(rec.originalMinutes)}
          </p>
        </div>
        <div className="comparison__arrow" aria-hidden="true">
          →
        </div>
        <div className="comparison__col comparison__col--adjusted">
          <p className="comparison__heading">Adjusted</p>
          <p className="comparison__value">{formatYards(rec.adjustedYards)}</p>
          <p className="comparison__value comparison__value--secondary">
            {formatMinutes(rec.adjustedMinutes)}
          </p>
        </div>
      </div>

      <div className="comparison__chips">
        <Chip tone={rec.yardsChanged < 0 ? 'success' : 'neutral'}>{describeYardsChange(rec.yardsChanged)}</Chip>
        <Chip tone={rec.estimatedMinutesSaved > 0 ? 'success' : 'neutral'}>
          {describeMinutesChange(rec.estimatedMinutesSaved)}
        </Chip>
      </div>

      {priorityLine && (
        <p className={`comparison__priority ${priorityOk ? '' : 'comparison__priority--warn'}`}>
          {priorityOk && <CheckIcon width={16} height={16} />}
          <span>{priorityLine}</span>
        </p>
      )}
    </Card>
  )
}
