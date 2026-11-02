/**
 * Mobile-first app frame. On mobile it fills the viewport; on desktop it is centered as a
 * phone-width column (see .phone in global.css).
 *
 * `toolbar` (the Smartwatch toggle) sits above the phone; `companion` (the watch panel) sits
 * beside it on wide screens and becomes a drawer on narrow ones. Both are optional slots, so
 * the phone works unchanged without them.
 */
export default function PhoneShell({ children, toolbar = null, companion = null }) {
  return (
    <div className="app-shell">
      {toolbar && <div className="app-toolbar">{toolbar}</div>}
      <div className="app-stage">
        <div className="phone">{children}</div>
        {companion}
      </div>
    </div>
  )
}
