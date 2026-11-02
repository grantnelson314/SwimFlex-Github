# SwimFlex — DESIGN.md

## Project Overview

This file is the visual and interaction source of truth for the SwimFlex prototype.

SwimFlex is a responsive web application designed to behave like a polished mobile app. It is intended for former competitive swimmers who now train independently and need help adapting an **existing structured workout** when the workout no longer fits the situation that day.

The prototype includes:

- A responsive mobile-first phone interface.
- A simulated smartwatch companion interface.
- Rule-based workout adaptation.
- Pool Mode with timing and automatic rep progression.
- Quick Adjust during the workout.
- Shared state between the phone view and smartwatch simulator.

The smartwatch is a **prototype concept**, not a real Apple Watch integration.

Do not turn SwimFlex into a generic fitness tracker, social platform, calorie app, or coaching marketplace. Keep the product focused on **workout adaptation, transparency, swimmer control, and poolside usability**.

---

## Brand Personality

SwimFlex should feel:

- Experienced, not beginner-focused.
- Calm and practical.
- Athletic without looking aggressive.
- Trustworthy without presenting itself as an unquestionable coach.
- Fast to scan.
- Familiar to former competitive swimmers.
- Clean enough for an HCI study and polished enough for a final presentation.

Avoid:

- Gamification.
- Streaks and achievement badges.
- Social feeds.
- Calorie tracking.
- Nutrition features.
- Generic motivational content.
- Busy analytics dashboards.
- Excessive gradients or decorative illustrations.

---

## Design Goals

1. Make **Adapt Workout** the primary action.
2. Preserve the concepts and visual direction from the final M3 Figma screens.
3. Use familiar swim notation such as `6 × 200 Free @ 2:50`.
4. Make system recommendations transparent.
5. Keep the swimmer in control of consequential changes.
6. Keep pre-swim planning detailed enough to be useful.
7. Keep in-workout interaction extremely simple.
8. Make the phone and smartwatch views feel like one connected product.
9. Do not rely on color alone to communicate state.
10. Keep tap targets large and mobile-friendly.
11. Make the prototype easy to demo and test in a desktop browser.

---

## Visual Design Tokens

These values are based on the final M3 screen design.

### Primary

- Primary Blue: `#1769E0`
- Primary Dark: `#0C54B8`
- Primary Tint: `#EAF3FF`
- Pool Mode Tint: `#F4F8FE`

### Neutral

- App Background: `#F8FAFC`
- Surface / Card: `#FFFFFF`
- Main Text: `#112136`
- Secondary Text: `#5B6F8B`
- Subtle Text: `#73849A`
- Border: `#DCE4ED`
- Soft Neutral Surface: `#F0F4F7`

### Semantic

- Success Green: `#17835F`
- Success Tint: `#E7F7F1`
- Warning / Caution: `#D97706`
- Warning Tint: `#FFF7E8`
- Safety / Error: `#C2413B`
- Safety Tint: `#FEF2F2`

Use semantic colors sparingly.

---

## CSS Token Recommendation

Define reusable CSS variables near the root of the app.

```css
:root {
  --color-primary: #1769E0;
  --color-primary-dark: #0C54B8;
  --color-primary-tint: #EAF3FF;
  --color-pool-tint: #F4F8FE;

  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-text: #112136;
  --color-text-secondary: #5B6F8B;
  --color-text-subtle: #73849A;
  --color-border: #DCE4ED;
  --color-neutral-soft: #F0F4F7;

  --color-success: #17835F;
  --color-success-tint: #E7F7F1;
  --color-warning: #D97706;
  --color-warning-tint: #FFF7E8;
  --color-danger: #C2413B;
  --color-danger-tint: #FEF2F2;
}
```

Do not invent a second unrelated color system.

---

## Typography

Use a clean system font stack.

Recommended:

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

If Inter is not already included, use the system stack rather than making typography setup block progress.

### Phone hierarchy

- Screen title: large, regular/medium weight.
- Primary metric: large, bold.
- Section title: medium, semibold.
- Body: regular.
- Supporting text: regular, secondary color.
- Small labels: uppercase or semibold only when needed.

### Pool Mode hierarchy

The current set must dominate the screen.

Example:

`MAIN SET · THRESHOLD`

`REP 2 OF 6`

# `200 yd Free`

## `@ 2:50`

`Next send-off in 1:14`

No other element should compete visually with the set and timing.

### Smartwatch hierarchy

Use very little text.

Priority order:
1. Current set.
2. Interval / timer.
3. Rep progress.
4. Pause / Adjust controls.

---

## Shape and Spacing

- Card corner radius: `16–20px`.
- Primary button corner radius: `14–16px`.
- Chips/pills: heavily rounded.
- Phone page padding: `16–24px`.
- Card spacing: `12–16px`.
- Avoid heavy shadows.
- Prefer thin borders and subtle background separation.

---

## App Shell and Device Presentation

### Mobile-first behavior

The actual app should be responsive and usable directly in the browser at mobile widths.

### Desktop presentation mode

On desktop, center the mobile app inside a constrained phone-sized column.

Recommended phone viewport width:

- Approx. `390–430px`.

Do not force the entire desktop browser to mimic a phone frame unless it helps presentation.

A subtle surrounding panel is acceptable.

### Simulated Smartwatch

The smartwatch should be shown as a separate compact device panel.

Possible presentation patterns:

- Phone view on the left + watch view on the right.
- A `Smartwatch` button that opens a companion panel.
- A presentation/demo screen showing both devices simultaneously.

The watch should share the same app state as the phone.

---

# Core Phone Screens

## 1. My Workouts

Purpose:
Give the swimmer a fast entry point into adaptation.

Required elements:

- Title: `My Workouts`
- Primary filled button: `Adapt Workout`
- Secondary outlined/tinted button: `Add Workout`
- Saved workout list

Each workout shows:

- Name
- Focus
- Distance in yards
- Estimated time

Seed workouts:

- Tuesday Threshold — 2,500 yd — 52 min — Threshold
- Easy Aerobic Reset — 1,800 yd — 40 min — Recovery

Rules:

- Adapt Workout must be visually more prominent than Add Workout.
- Do not add a dashboard full of analytics.

---

## 2. Add Workout

Purpose:
Allow an existing workout to be entered.

Prototype options:

- Paste/type workout text.
- Build manually.

Example:

```text
400 easy swim
8 × 50 drill/swim @ 1:00
6 × 200 free @ 2:50
8 × 25 fast @ :35
300 easy choice
```

For the prototype, parsing may be deterministic or simulated.

Do not make AI workout generation from scratch the main feature.

---

## 3. Review Workout

Purpose:
Confirm structure and tell SwimFlex what matters most.

Required:

- Workout name.
- Total yards.
- Estimated time.
- Training focus.
- Structured set cards.
- Priority Set control.

Priority Set microcopy:

`Preserve this set when adapting`

Selected state:

- Blue border/tint.
- Checkmark.
- Text label `Priority Set`.

Do not rely on an icon alone.

---

## 4. Adapt Workout

Purpose:
Capture what changed today.

Prompt:

`What's different today?`

Primary constraint choices:

- Less time.
- Feeling tired.
- Workout too difficult.
- Missing equipment.
- Pool limitation.
- Pain or injury concern.

Context inputs:

- Available time.
- Readiness 1–5.
- RPE where relevant.
- Equipment available.
- Pool length / pool limitation when relevant.

Safety copy:

`SwimFlex provides training suggestions, not medical or injury advice.`

If pain or injury is selected, do not create a normal training adaptation.

---

## 5. Proposed Changes

Purpose:
Make the adaptation transparent.

This is one of the most important screens in SwimFlex.

Required:

- Original vs adjusted distance.
- Original vs adjusted estimated time.
- Summary such as `400 yd less`.
- Summary such as `12 min saved`.
- Confirmation that Priority Set is preserved when applicable.
- Per-set status:
  - Reduced.
  - Preserved.
  - Unchanged.
  - Replaced.
- Short explanation:
  - `Why SwimFlex made these changes`
- Actions:
  - Use Adjusted Workout.
  - Make Changes.
  - Keep Original.

Optional expandable area:

`How SwimFlex decided`

Example rules shown:

- Priority Set preserved.
- 12 minutes needed to be removed.
- Lower-priority volume reduced first.
- Cool-down retained.
- Main threshold stimulus unchanged.

---

## 6. Manual Adjustment

Purpose:
Allow the swimmer to override the recommendation.

Editable:

- Repetitions.
- Distance.
- Interval.
- Rest.
- Priority status.

Totals update after each edit.

The system must not silently overwrite manual user changes.

---

## 7. Pool Mode — Phone

Purpose:
Provide a low-touch in-workout interface.

Required:

- Current set.
- Rep number.
- Interval.
- Countdown / next send-off.
- Elapsed workout time.
- Pause.
- Quick Adjust.
- Next Set / Skip override.

Important:

The user should **not** need to tap Next after every repetition.

When timing is active, rep progress should advance automatically.

---

## 8. Quick Adjust

Purpose:
Make a narrow change without rebuilding the workout.

Inputs:

- RPE / readiness.
- Interval too fast.
- Fatigue.
- Running out of time.
- Equipment issue.
- Pool condition.
- Pain or injury concern.

Example:

`6 × 200 @ 2:50` → `6 × 200 @ 3:00`

Explanation:

`Keeps all 6 reps while making the interval more achievable.`

Actions:

- Apply & Continue.
- Keep Current Set.

---

## 9. Safety Boundary

Use when the user indicates:

- Pain.
- Injury concern.
- Illness concern.
- A condition outside normal workout fatigue.

Suggested copy:

`SwimFlex can't assess pain, injury, or illness.`

`Consider stopping the workout rather than relying on an automated training adjustment.`

Actions:

- End Workout.
- Return to Workout.

Do not diagnose.
Do not suggest medical treatment.

---

# Simulated Smartwatch Screens

The smartwatch is a prototype companion.

It is not a real Apple Watch integration and should not use Apple-specific APIs.

## Watch 1. Workout Ready

Show:

- Workout name.
- Adjusted yards.
- Estimated time.
- Focus.
- Start button.

Example:

```text
Tuesday Threshold
2,100 yd · ~40 min
Threshold

[ Start ]
```

---

## Watch 2. Pool Mode

Show:

- Set type.
- Rep progress.
- Distance/stroke.
- Interval.
- Countdown.

Example:

```text
MAIN SET
2 / 6
200 FREE
@ 2:50
1:14
```

Primary actions:

- Pause.
- Adjust.

Automatic rep progression is preferred.

---

## Watch 3. Quick Adjust

Keep choices short.

Examples:

- Too fast.
- Fatigued.
- Less time.
- Equipment.
- Pool change.
- Pain/injury.

If a change is proposed:

`@ 2:50 → @ 3:00`

Actions:

- Apply.
- Keep.

---

## Watch 4. Paused

Show:

- Paused state.
- Current set.
- Resume.
- End Workout.

---

## Watch 5. Workout Complete

Show:

- Completed distance.
- Elapsed time.
- Number of adaptations.
- Done.

Do not turn the watch into an analytics dashboard.

---

# Smartwatch Simulator Visual Style

The simulated watch should:

- Use the same SwimFlex blue and neutral palette.
- Have a rounded watch-like frame.
- Be compact.
- Avoid copying Apple Watch branding.
- Avoid trademarked Apple Watch hardware details.
- Clearly appear as a generic smartwatch concept.

Suggested container:

- Width: `250–300px`.
- Rounded outer shell.
- Dark or neutral bezel.
- Inner display uses SwimFlex colors.

---

# Interaction Modalities

## Phone touch

Best for:

- Workout selection.
- Review.
- Constraints.
- Explanations.
- Manual editing.

## Smartwatch touch

Best for:

- Starting the workout.
- Checking current set.
- Timing.
- Pausing.
- Quick Adjust.
- Progress.

## Simulated haptics

Because this is a browser prototype, real haptics are not required.

Use optional visual cues such as:

- Brief pulse animation.
- Highlight on send-off.
- Small toast/confirmation.

Do not make this distracting.

## Voice

Voice is not a core M4 requirement.

It may be mentioned as a future interaction idea, but do not let it delay development.

---

# Accessibility

- Use semantic HTML.
- Use real `button`, `input`, and `label` elements.
- Add useful ARIA labels.
- Maintain accessible contrast.
- Do not encode statuses only with color.
- Keep mobile tap targets large.
- Support keyboard interaction where practical.
- Avoid tiny text in Pool Mode.
- Smartwatch controls must remain simple and readable.

---

# Animation

Use animation only when it clarifies state:

- Selected constraint.
- Priority Set change.
- Proposed change comparison.
- Timer progress.
- Rep advancement.
- Smartwatch confirmation.

Avoid decorative animation.

---

# Design Do / Do Not

## Do

- Preserve the final M3 visual direction.
- Keep Primary Blue `#1769E0`.
- Use yards.
- Use swim shorthand.
- Keep Priority Set visible.
- Explain every automated recommendation.
- Make timing obvious.
- Keep smartwatch interactions glanceable.
- Keep the phone interface usable independently from the smartwatch.

## Do Not

- Generate a new visual theme.
- Add unnecessary tabs.
- Add social features.
- Add generic health dashboards.
- Add medical claims.
- Automatically alter Priority Set without clear approval.
- Require phone interaction after every rep.
- Imply the smartwatch simulator is a real Apple Watch integration.
