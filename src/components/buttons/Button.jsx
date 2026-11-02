import { Link } from 'react-router-dom'

/**
 * Button hierarchy (DESIGN.md): primary (filled blue) > secondary (tinted/outlined) > ghost.
 * Renders a router <Link> when `to` is provided, otherwise a real <button>.
 */
export default function Button({
  variant = 'primary',
  to,
  block = false,
  icon,
  children,
  className = '',
  ...rest
}) {
  const classes = ['btn', `btn--${variant}`, block ? 'btn--block' : '', className]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {icon}
      <span>{children}</span>
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" className={classes} {...rest}>
      {content}
    </button>
  )
}
