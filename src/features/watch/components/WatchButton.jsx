/**
 * Large, high-contrast watch button. Always a real <button> with visible text
 * (never color alone). Variants: primary (filled), secondary (outlined).
 */
export default function WatchButton({ variant = 'secondary', className = '', children, ...rest }) {
  return (
    <button type="button" className={`watch-btn watch-btn--${variant} ${className}`.trim()} {...rest}>
      {children}
    </button>
  )
}
