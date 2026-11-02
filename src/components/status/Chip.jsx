/** Heavily rounded label pill. Tones: primary (default), neutral, warning. */
export default function Chip({ tone = 'primary', icon, children, className = '' }) {
  return (
    <span className={`chip chip--${tone} ${className}`.trim()}>
      {icon}
      {children}
    </span>
  )
}
