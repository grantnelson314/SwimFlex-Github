/** White rounded surface with a thin border (DESIGN.md: avoid heavy shadows). */
export default function Card({ as: Tag = 'div', selected = false, className = '', children, ...rest }) {
  const classes = ['card', selected ? 'card--selected' : '', className].filter(Boolean).join(' ')
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  )
}
