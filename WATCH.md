# SwimFlex — WATCH.md

## Purpose

Define the **simulated smartwatch companion** for the SwimFlex browser prototype.

The smartwatch exists because M2 findings and M3 feedback identified poolside phone interaction as difficult.

This is not a real Apple Watch integration.

Do not use:
- watchOS.
- Swift.
- Xcode.
- WatchConnectivity.
- Apple Watch APIs.

The smartwatch should demonstrate the HCI concept of moving glanceable, timing-heavy interactions away from the phone.

---

# Product Principle

The smartwatch should answer three questions immediately:

1. What am I swimming?
2. When do I go again?
3. What do I do if this is not working?

Anything else is optional.

---

# Role of Each Interface

## Phone

Use for:

- Workout selection.
- Add Workout.
- Priority Set.
- Constraints.
- Reviewing Proposed Changes.
- Manual editing.
- Detailed explanations.
- Backup Pool Mode.

## Smartwatch

Use for:

- Workout Ready.
- Current set.
- Rep progress.
- Countdown.
- Pause/resume.
- Quick Adjust.
- Workout complete.

---

# Technical Direction

The smartwatch simulator is part of the same React application.

It should:

- Read the same shared application/session state as the phone.
- Dispatch the same reducer/actions.
- Update instantly when phone state changes.
- Update phone state when smartwatch actions are taken.

No real networking is needed.

---

# Recommended UI Structure

Suggested components:

```text
WatchShell
WatchWorkoutReady
WatchPoolMode
WatchQuickAdjust
WatchAdjustmentProposal
WatchPaused
WatchSafetyBoundary
WatchComplete
```

Possible UI:

- Phone view centered on left.
- Watch view on right on desktop.
- On narrow screens, smartwatch can open in a modal/drawer/demo panel.

---

# Watch Screen 1 — Workout Ready

Example:

```text
Tuesday Threshold

2,100 yd
~40 min
THRESHOLD

[ Start ]
```

Optional label:

`Synced from SwimFlex`

Avoid Apple-specific language.

---

# Watch Screen 2 — Pool Mode

Primary layout:

```text
MAIN SET

2 / 6

200 FREE

@ 2:50

1:14

[ Pause ] [ Adjust ]
```

Rules:

- Current set dominates.
- Countdown is highly visible.
- Rep progress is visible.
- Minimal secondary text.
- Automatic rep progression.

Optional:
- Small visual pulse at send-off.
- Brief transition state at set change.

---

# Watch Screen 3 — Quick Adjust Reason

Prompt:

`What's changed?`

Options:

- Too fast.
- Fatigued.
- Less time.
- Equipment.
- Pool change.
- Pain/injury.

No text entry required.

---

# Watch Screen 4 — Adjustment Proposal

Example:

```text
SUGGESTED

@ 2:50
   ↓
@ 3:00

Keep 6 reps

[ Apply ]
[ Keep ]
```

After Apply:

- Shared session state updates.
- Phone Pool Mode updates.
- Watch countdown uses new interval.
- Show brief confirmation.

---

# Watch Screen 5 — Safety Boundary

If Pain/Injury selected:

```text
SwimFlex can't assess
pain or injury.

Consider stopping
the workout.

[ End Workout ]
[ Back ]
```

Do not generate a training recommendation.

---

# Watch Screen 6 — Paused

```text
PAUSED

Main Set
2 / 6

[ Resume ]
[ End ]
```

---

# Watch Screen 7 — Workout Complete

```text
COMPLETE

2,100 yd
41:08

1 adjustment

[ Done ]
```

Keep it simple.

---

# Timing Behavior

The smartwatch should not require clicking after every rep.

When an interval is defined:

1. Timer starts.
2. Countdown displays.
3. At send-off:
   - Visual cue.
   - Rep increments.
   - Countdown resets.
4. After final rep:
   - Move to next set or transition state.

Manual override:

- Next Set may be available in a secondary control.
- Pause is always easy to find.

If a set has no interval:

- Manual next-set progression is acceptable.

---

# Quick Adjust Behavior

## Too Fast

Canonical:

- Current: `6 × 200 @ 2:50`
- RPE: `8/10`
- Suggest: `6 × 200 @ 3:00`

Actions:

- Apply.
- Keep.

## Fatigue

Prototype may suggest:

- More rest.
- Slower interval.
- Reduced secondary volume.

If change is complex:

`Review on phone`

## Less Time

If simple remaining-workout adaptation exists:
- Show a short summary.

Otherwise:
- Route user to phone to review changes.

## Equipment / Pool Change

If a predefined simple replacement exists:
- Show it.

Otherwise:
- Ask user to review on phone.

## Pain/Injury

Safety boundary only.

---

# Simulated Haptics / Feedback

Because this is a browser prototype, real haptics are not required.

Optional visual equivalents:

- Brief pulse around timer.
- Flash/outline at send-off.
- Confirmation animation.
- Small toast inside watch screen.

Do not use sound unless specifically requested.

---

# Shared State Rules

The smartwatch should not keep a second authoritative workout.

Use shared state for:

- Active workout.
- Current set.
- Current rep.
- Timer status.
- Interval.
- Applied adjustments.

Local watch-only state can be used for:

- Which watch menu is open.
- Whether proposal screen is open.
- Brief confirmation feedback.

---

# Optional Connection Simulation

For presentation purposes, the app may include a simple connection indicator.

Possible states:

- Connected.
- Disconnected.

If disconnected:

- Watch may show last known data.
- Actions can be disabled or queued conceptually.
- Reconnect restores current state.

This is optional.

Do not let simulated connectivity delay core functionality.

---

# M5 Evaluation Questions Supported by Smartwatch Simulation

The watch prototype should support asking:

- Is the watch easier than checking the phone poolside?
- Can the swimmer identify current set at a glance?
- Is countdown behavior understandable?
- Do users expect automatic rep progression?
- Is Quick Adjust fast enough?
- Do users trust a suggested interval change?
- Which interactions belong on watch vs phone?
- Would a real wearable version be useful?

---

# Acceptance Criteria

- [ ] Smartwatch panel renders.
- [ ] It receives the active workout from shared state.
- [ ] Workout Ready screen works.
- [ ] Start action begins session.
- [ ] Pool Mode shows current set and countdown.
- [ ] Rep progresses automatically.
- [ ] Pause/resume works.
- [ ] Quick Adjust Too Fast works.
- [ ] @ 2:50 → @ 3:00 can be applied.
- [ ] Phone immediately reflects the accepted adjustment.
- [ ] Pain/injury opens safety boundary.
- [ ] Phone remains usable if watch panel is hidden.
- [ ] No real Apple Watch integration is implied.
