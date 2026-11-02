import { Link } from 'react-router-dom'
import { ChevronLeftIcon } from '../status/Icons.jsx'

/** Screen title with an optional back link and subtitle. */
export default function ScreenHeader({ title, subtitle, backTo, backLabel = 'Back' }) {
  return (
    <header className="screen-header-block">
      {backTo && (
        <Link to={backTo} className="back-link">
          <ChevronLeftIcon />
          <span>{backLabel}</span>
        </Link>
      )}
      <h1 className="screen-title">{title}</h1>
      {subtitle && <p className="screen-subtitle">{subtitle}</p>}
    </header>
  )
}
