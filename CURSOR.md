# SwimFlex — CURSOR.md

## Purpose

Use this file as the development contract for Cursor.

Before changing code, Cursor should read:

1. `DESIGN.md`
2. `PLAN.md`
3. `ARCHITECTURE.md`
4. `WATCH.md`
5. `CURSOR.md`

---

# Non-Negotiable Product Rules

- SwimFlex adapts existing workouts.
- It is not primarily a workout generator.
- Adapt Workout is the primary action.
- The swimmer chooses the Priority Set.
- Automated changes must be visible.
- User can accept, reject, or revise.
- Pain/injury must not receive a normal workout recommendation.
- Phone is the main planning interface.
- Smartwatch is a simulated in-workout companion.
- No per-rep phone clicking requirement.
- Prototype adaptation is deterministic.
- Do not add an external LLM.
- No backend/authentication unless explicitly requested later.

---

# Non-Negotiable Technical Rules

- React + Vite.
- Windows-compatible.
- Browser-based.
- Do not create Swift files.
- Do not create Xcode/watchOS projects.
- Do not use Apple APIs.
- Use shared React state for phone/watch.
- Use localStorage for persistence.
- Keep adaptation logic outside components.
- Keep timer logic centralized.
- Avoid unnecessary dependencies.

---

# Non-Negotiable Visual Rules

- Primary blue: `#1769E0`.
- Background: `#F8FAFC`.
- Surface: white.
- Main text: `#112136`.
- Use the design language from the final M3 Figma screens.
- Use yards.
- Use rounded cards.
- Pool Mode must be minimal.
- Smartwatch must be glanceable.
- Do not redesign the product.

---

# Recommended Cursor Workflow

Do not ask Cursor to build everything in one pass.

Use staged prompts.

---

## Prompt 1 — Inspect and Initialize

```text
Read DESIGN.md, PLAN.md, ARCHITECTURE.md, WATCH.md, and CURSOR.md completely before making changes.

This is SwimFlex, an HCI functional prototype.

The project must be a Windows-compatible React + Vite responsive web application. The primary interface should behave like a mobile app. It also includes a simulated smartwatch companion interface that shares workout and session state with the phone interface.

Do not build a native iOS or watchOS app. Do not create Swift files. Do not use Apple Watch APIs.

First inspect the repository and report:
1. Existing files/folders.
2. Whether React/Vite already exists.
3. What files/folders you recommend adding.
4. Any assumptions you are making.

Then begin Phase 1 only:
1. Initialize React/Vite if needed.
2. Create the structure from ARCHITECTURE.md.
3. Add shared design tokens.
4. Add Tuesday Threshold and Easy Aerobic Reset seed data.
5. Set up shared app state.
6. Build My Workouts.
7. Build Review Workout.
8. Implement Priority Set selection.

Follow DESIGN.md closely.
Keep the project runnable after each meaningful step.
Do not add unrelated features.
```

---

## Prompt 2 — Shared Models and Utilities

```text
Read the markdown files first.

Review the current implementation and add/clean up the shared workout data structures and utilities described in ARCHITECTURE.md.

Requirements:
- Workout and WorkoutSet structures.
- Derived total-yard calculations.
- Interval formatting.
- Tuesday Threshold exactly matches PLAN.md.
- Main set is the default Priority Set.
- Easy Aerobic Reset exists as second seed workout.
- Avoid duplicated calculation logic.

Do not build adaptation yet.
```

---

## Prompt 3 — Phone Phase 1 Polish

```text
Read DESIGN.md first.

Polish:
1. My Workouts
2. Review Workout
3. Priority Set selection

Match the M3 visual direction:
- #1769E0 primary blue
- #F8FAFC page background
- white rounded cards
- mobile-first layout
- yards
- Adapt Workout visually primary

Make the desktop browser presentation center the mobile app in a realistic narrow column.

Do not add dashboards, analytics, social features, or authentication.
```

---

## Prompt 4 — Adaptation Engine

```text
Read PLAN.md and ARCHITECTURE.md.

Implement deterministic adaptation logic outside React components.

Start with:
1. Less Time
2. Workout Too Difficult / Interval Too Fast
3. Pain/Injury Safety Boundary

The canonical Less Time case must convert Tuesday Threshold from:

2,500 yd / 52 min

to:

2,100 yd / 40 min

with:
- Warm-up 400 -> 300
- Pre-set 8x50 -> 4x50
- Main set 6x200 @ 2:50 preserved
- Speed 8x25 -> 4x25
- Cool-down 300 unchanged

Do not add an AI API.
```

---

## Prompt 5 — Adapt Workout + Proposed Changes

```text
Read DESIGN.md and PLAN.md.

Build:
- Adapt Workout
- Constraint selection
- Conditional inputs
- Proposed Changes
- How SwimFlex Decided
- Accept / Make Changes / Keep Original
- Safety Boundary

Connect UI to deterministic adaptation logic.

No system change should be applied silently.
```

---

## Prompt 6 — Manual Adjustment

```text
Implement Manual Adjustment.

Allow editing:
- repetitions
- distance
- interval
- Priority Set

Update total yards and estimated time.

Manual edits must not be automatically overwritten by the adaptation engine.
```

---

## Prompt 7 — Pool Mode and Timer

```text
Read Pool Mode requirements in DESIGN.md, PLAN.md, and ARCHITECTURE.md.

Implement active session state and Pool Mode.

Requirements:
- elapsed time
- interval countdown
- automatic rep progression
- pause/resume
- next set override
- Quick Adjust entry
- demo timing mode

The swimmer must not have to click after every repetition.

Keep timer logic outside the presentational page component.
```

---

## Prompt 8 — Quick Adjust

```text
Implement Quick Adjust.

Canonical path:
- active set: 6x200 @ 2:50
- RPE 8/10
- user selects Interval Too Fast
- recommendation: 6x200 @ 3:00
- user chooses Apply & Continue or Keep Current

When applied:
- update active session
- update countdown behavior
- update phone and smartwatch simulator

Pain/Injury routes to Safety Boundary.
```

---

## Prompt 9 — Smartwatch Simulator

```text
Read WATCH.md fully.

Build a generic simulated smartwatch companion inside the React app.

Required screens:
- Workout Ready
- Pool Mode
- Quick Adjust reason
- Adjustment Proposal
- Paused
- Safety Boundary
- Workout Complete

The watch must use the same shared app/session state as the phone.

Do not create Apple Watch branding.
Do not add native/watchOS code.
```

---

## Prompt 10 — Shared Phone/Watch Interaction

```text
Connect the smartwatch simulator to the shared session state.

Required:
- phone Start Workout updates watch
- watch Start begins session
- phone timer/progress updates watch
- watch pause/resume updates phone
- watch Quick Adjust updates phone
- phone Quick Adjust updates watch
- completing/ending session updates both

Do not build fake networking. Use shared React state.
```

---

## Prompt 11 — Alternate Scenario

```text
Add one environmental adaptation branch for M5.

Preferred:
planned 25-yard pool -> available 20-yard pool.

Implement deterministic recommendation and transparent explanation.

If that branch becomes too complex, implement Missing Equipment instead.

Keep the same Adapt -> Proposed Changes pattern.
```

---

## Prompt 12 — Final M4 Audit

```text
Audit the complete project against DESIGN.md and PLAN.md.

Check:
- all Definition of Done items
- three M5 scenarios
- visual consistency
- accessibility
- timer behavior
- safety boundary
- smartwatch sync
- localStorage persistence
- mobile layout
- desktop demo layout
- no unused/broken UI
- no console errors
- no unrelated features

Do not redesign the product.

Fix inconsistencies and provide a short list of remaining limitations.
```

---

# If Cursor Tries to Build Native Apps

Use:

```text
Stop. This project is Windows-only and browser-based.

Re-read ARCHITECTURE.md and WATCH.md.

Do not create Swift, Xcode, iOS, watchOS, or Apple Watch integration code. Build the phone and smartwatch experiences as synchronized React interfaces in one Vite application.
```

---

# If Cursor Tries to Add AI

Use:

```text
Do not add an LLM or external AI API.

For M4/M5, SwimFlex uses deterministic adaptation rules so every participant receives consistent behavior. Implement the rules in PLAN.md.
```

---

# If Cursor Overbuilds the Smartwatch

Use:

```text
Keep the smartwatch simulator minimal.

Planning and detailed editing belong on the phone.

The smartwatch only needs:
- workout ready
- current set/timing/progress
- pause/resume
- quick adjust
- safety boundary
- completion
```

---

# If Cursor Changes the Look

Use:

```text
Re-read DESIGN.md.

Restore the M3 SwimFlex visual direction:
- #1769E0 primary blue
- #F8FAFC background
- white rounded cards
- clean system typography
- yards
- Reduced / Preserved / Unchanged states
- minimal Pool Mode
- generic compact smartwatch simulator

Do not invent a new theme.
```
