/** Compact SwimFlex identity used on the home screen. */
export default function BrandMark() {
  return (
    <div className="brand-mark" aria-label="SwimFlex — adaptive swim workouts">
      <span className="brand-mark__icon" aria-hidden="true">
        <svg viewBox="0 0 40 40" focusable="false">
          <rect width="40" height="40" rx="12" fill="currentColor" />
          <path d="M7 24c3.5-3.5 6.5-3.5 9.5 0s6 3.5 9.5 0 6-3.5 9.5 0" />
          <path className="brand-mark__wave--soft" d="M7 16c3.5-3.5 6.5-3.5 9.5 0s6 3.5 9.5 0 6-3.5 9.5 0" />
        </svg>
      </span>
      <span className="brand-mark__copy">
        <strong>SwimFlex</strong>
        <span>Adaptive swim workouts</span>
      </span>
    </div>
  )
}
