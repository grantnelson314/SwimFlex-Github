# SwimFlex — PLAN.md

## Project Status

This is a new functional prototype based on the revised M3 SwimFlex design.

The prototype should be built as:

- React.
- Vite.
- JavaScript or TypeScript.
- Responsive mobile-first web app.
- Simulated smartwatch companion.
- Shared in-browser state.
- Local-only persistence.
- No production backend.
- No real Apple Watch integration.
- No real AI/LLM dependency required for M4.

The goal is to make M4 close to the final presentation version so the three weeks after M4 can focus on M5 evaluation, usability fixes, and presentation preparation.

---

## Recommended Technical Direction

Preferred:

- React + Vite.
- React Router if routing is useful.
- Plain CSS, CSS Modules, or a small organized stylesheet system.
- Context + reducer or another lightweight shared-state approach.
- `localStorage` for persistence.

Do not add Redux, a backend, authentication, or a large UI framework unless there is a specific need.

If the repository is empty, Cursor may initialize Vite.

---

## Product Goal

SwimFlex helps former competitive swimmers adapt an **existing structured workout** when current conditions no longer match the original plan.

Examples:

- Less time than expected.
- Feeling more fatigued.
- Workout is too difficult for current swim fitness.
- Missing equipment.
- Different pool setup.
- Conditions change during the workout.

The system should:

1. Understand the existing workout structure.
2. Preserve the user-selected Priority Set when possible.
3. Recommend a transparent adaptation.
4. Explain what changed and why.
5. Allow the swimmer to accept, reject, or revise.
6. Support low-touch in-workout use.
7. Demonstrate how a smartwatch companion could support timing and quick adjustments.

---

## Prototype Scope

### Core M4 features

1. Workout library.
2. Add/paste workout.
3. Structured workout review.
4. Training focus.
5. Priority Set selection.
6. Constraint selection.
7. Readiness/RPE input.
8. Equipment/pool inputs.
9. Rule-based workout adaptation.
10. Original vs adjusted comparison.
11. Manual overrides.
12. Pool Mode.
13. Interval timing.
14. Automatic rep progression.
15. Quick Adjust.
16. Safety boundary for pain/injury.
17. Simulated smartwatch companion.
18. Shared phone/watch state.
19. Three M5 evaluation scenarios.
20. Local persistence.
21. Demo timing mode.

### Not required for M4

- Real generative AI.
- Real Apple Watch integration.
- Native mobile app.
- Backend.
- Authentication.
- Cloud database.
- Payments.
- Subscription tiers.
- Social feed.
- Production medical/health recommendations.
- Garmin integration.
- HealthKit.
- Advanced physiological modeling.

---

# Feature 1: Workout Library and Workout Entry

## Purpose

Allow a swimmer to select an existing workout or add one that already exists elsewhere.

## Related screens

- My Workouts.
- Add Workout.
- Review Workout.

## Seed workouts

### Tuesday Threshold

- Focus: Threshold.
- Original: 2,500 yd.
- Estimated time: 52 min.

Sets:

1. Warm-up — 400 yd easy swim, choice.
2. Pre-set — 8 × 50 drill/swim @ 1:00.
3. Main set — 6 × 200 free @ 2:50.
4. Speed — 8 × 25 fast @ :35.
5. Cool-down — 300 yd easy choice.

Default Priority Set:

- Main set — 6 × 200 free @ 2:50.

### Easy Aerobic Reset

- Focus: Recovery.
- 1,800 yd.
- 40 min.

Use primarily as a second saved-workout example.

---

## Userflow 1: Select a Saved Workout

```text
START: User opens My Workouts.
User selects Tuesday Threshold.
System opens Review Workout.
System shows total distance, estimated time, focus, and all sets.
User can select or change the Priority Set.
END.
```

---

## Userflow 2: Add an Existing Workout

```text
START: User selects Add Workout.
User chooses Paste Workout or Build Manually.
User enters/pastes workout text.
Prototype converts it into structured sets.
User confirms or edits the structure.
User saves the workout.
System returns to Review Workout.
END.
```

For M4, workout parsing may use:

- Simple deterministic parsing.
- Preset demo recognition.
- Simulated parsing for known test inputs.

Do not let parsing complexity delay the core prototype.

---

## Acceptance Criteria

- Saved workouts appear on first load.
- User can open a workout.
- User can add a workout.
- User can edit set properties.
- User can choose workout focus.
- User can mark one set as Priority Set.
- Data persists after browser refresh.

---

# Feature 2: Constraint Capture

## Purpose

Collect only the information required for adaptation.

## Primary constraints

- Less time.
- Feeling tired.
- Workout too difficult.
- Missing equipment.
- Pool limitation.
- Pain or injury concern.

---

## Conditional Inputs

### Less Time

Inputs:

- Available minutes.
- Readiness.
- Equipment available.

### Feeling Tired

Inputs:

- Readiness 1–5.
- Optional RPE.
- Optional preference:
  - More rest.
  - Less volume.
  - Let SwimFlex decide.

### Workout Too Difficult

Inputs:

- RPE.
- Current set/interval.
- Optional preference:
  - Slower interval.
  - Fewer reps.
  - Let SwimFlex decide.

### Missing Equipment

Inputs:

- Fins.
- Paddles.
- Pull buoy.
- Kickboard.
- Other.

### Pool Limitation

Inputs:

- Pool length.
- Crowded lane.
- No pace clock.
- Other.

Prototype pool-length options:

- 25 yd.
- 20 yd.

### Pain or Injury Concern

Do not collect workout-adjustment parameters.

Route to Safety Boundary.

---

## Acceptance Criteria

- Constraint selection changes relevant inputs.
- User does not answer irrelevant questions.
- Selections are visible before adaptation.
- Pain/injury bypasses Proposed Changes.

---

# Feature 3: Adaptation Engine

## Purpose

Produce repeatable recommendations for prototype testing.

This is a **deterministic prototype engine**.

Do not represent it as medically or scientifically authoritative.

The same inputs should produce the same output for every participant.

---

## Global Rules

1. Preserve Priority Set by default.
2. Never silently modify the Priority Set.
3. Show every change before it becomes active.
4. Prefer small changes over replacing the entire workout.
5. Keep workout purpose visible.
6. Preserve a basic warm-up and cool-down when possible.
7. If no reasonable adaptation exists, require user review.
8. Pain/injury bypasses normal adaptation.
9. User overrides always win.

---

## Rule Set A: Less Time

Inputs:

- Original estimated duration.
- Available duration.
- Workout focus.
- Priority Set.
- Current readiness.

Prototype strategy:

1. Calculate required time reduction.
2. Keep Priority Set unchanged.
3. Reduce lower-priority supporting volume.
4. Prefer reducing:
   - Pre-set/supporting work.
   - Secondary speed/technique work not marked Priority.
   - Excess warm-up volume.
5. Keep a cool-down when possible.
6. Stop when target duration is approximately met.
7. Show original and adjusted totals.

### Canonical demo

Original:

- 2,500 yd.
- 52 min.

Available:

- 40 min.

Adjusted:

- 2,100 yd.
- 40 min.

Changes:

- Warm-up: 400 → 300 yd.
- Pre-set: 8 × 50 → 4 × 50.
- Main set: 6 × 200 @ 2:50 preserved.
- Speed: 8 × 25 → 4 × 25.
- Cool-down: 300 yd unchanged.

Explanation:

`Your priority threshold set is preserved. Supporting volume was reduced to save 12 minutes without changing the primary training stimulus.`

---

## Rule Set B: Feeling Tired

Inputs:

- Readiness.
- RPE.
- Workout focus.
- Priority Set.

Prototype behavior:

- Readiness 4–5: minimal/no change.
- Readiness 3: small interval/rest adjustment if requested.
- Readiness 1–2: increase rest/interval first and reduce secondary volume if necessary.
- Preserve Priority Set structure unless user approves changing it.
- Explain the result.

Do not claim physiological optimality.

---

## Rule Set C: Workout Too Difficult

Inputs:

- Current interval.
- RPE.
- Rep count.

Preferred sequence:

1. Increase send-off interval.
2. Keep reps if user wants to preserve volume.
3. If still too difficult, offer fewer reps.
4. Ask before changing Priority Set.

Canonical Quick Adjust:

- Current: 6 × 200 @ 2:50.
- RPE: 8/10.
- Suggested: 6 × 200 @ 3:00.
- Reason: Keep all six repetitions while making the interval more achievable.

---

## Rule Set D: Missing Equipment

Inputs:

- Equipment used by workout.
- Equipment available.

Prototype behavior:

- Identify affected sets.
- Offer a predefined replacement.
- Mark change as `Replaced`.
- If no defined replacement exists, require manual choice.

Example:

- `4 × 100 pull with paddles`
- May become a predefined no-paddle variation.

Do not claim exact physiological equivalence.

---

## Rule Set E: Pool Limitation

Prototype behavior:

- Identify the limitation.
- Show which sets are affected.
- Use predefined demo logic.
- Preserve intent approximately.
- Clearly label recommendation as a suggestion.

Preferred M5 demo:

- Planned 25 yd pool.
- Available 20 yd pool.
- System proposes a reviewable adjusted version.

---

## Rule Set F: Pain / Injury

No normal adaptation.

Show:

`SwimFlex can't assess pain, injury, or illness.`

`Consider stopping the workout rather than relying on an automated training adjustment.`

Actions:

- End Workout.
- Return to Workout.

---

## Acceptance Criteria

- Less Time canonical demo exactly matches M3.
- Fatigue scenario produces predictable result.
- Too Difficult scenario produces predictable interval change.
- Missing Equipment or Pool Limitation has at least one branch.
- Recommendation explains its reasoning.
- User can accept, reject, or manually revise.
- Pain/injury never returns a normal optimization.

---

# Feature 4: Proposed Changes and Manual Control

## Purpose

Make recommendations inspectable.

## Proposed Changes content

- Original yards.
- Adjusted yards.
- Original time.
- Adjusted time.
- Net savings.
- Priority Set state.
- Per-set status.
- Rationale.
- Optional `How SwimFlex decided`.

Statuses:

- Reduced.
- Preserved.
- Unchanged.
- Replaced.

Actions:

- Use Adjusted Workout.
- Make Changes.
- Keep Original.

---

## Manual Adjustment

Allow editing:

- Rep count.
- Distance.
- Interval.
- Rest.
- Priority Set.

Recalculate:

- Total distance.
- Estimated duration.

---

## Acceptance Criteria

- Every system change is visible.
- No change is applied silently.
- Manual edits update totals.
- Manual edits are not overwritten automatically.
- User can restore original workout.

---

# Feature 5: Pool Mode and Timing

## Purpose

Make the active workout usable with minimal interaction.

## Required behavior

- Show current set.
- Show current rep.
- Show send-off interval.
- Show countdown to next send-off.
- Track elapsed session time.
- Automatically advance reps when timing is active.
- Transition to next set after final rep.
- Provide Pause.
- Provide Next Set/Skip override.
- Provide Quick Adjust.

The user should not have to click after every repetition.

---

## Demo Mode

M5 should not require participants to wait multiple minutes.

Add developer/demo timing mode:

- A displayed interval of `2:50` can simulate in 5–10 seconds.
- UI still displays the real interval.
- A developer flag controls acceleration.

Do not expose confusing debug controls to participants.

---

## Acceptance Criteria

- Timer starts.
- Timer pauses/resumes.
- Rep progresses automatically.
- Current set updates.
- Quick Adjust works.
- Demo mode accelerates evaluation.

---

# Feature 6: Quick Adjust

## Purpose

Support changing conditions during the workout.

## Flow

```text
START: User is in Pool Mode.
User selects Quick Adjust.
User enters RPE/readiness.
User chooses what changed.
System applies a narrow deterministic rule.
System shows Suggested Change.
User chooses Apply or Keep Current.
Phone and simulated watch update.
User returns to Pool Mode.
END.
```

---

## Supported reasons

- Interval too fast.
- Fatigue.
- Running out of time.
- Equipment.
- Pool conditions.
- Pain/injury concern.

---

## Acceptance Criteria

- Quick Adjust requires only a few taps.
- Canonical scenario requires no typing.
- Adjustment can be rejected.
- Simulated watch updates.
- Pain/injury opens Safety Boundary.

---

# Feature 7: Simulated Smartwatch Companion

## Purpose

Demonstrate how a wearable companion could reduce phone interaction during swimming.

This is not a real smartwatch integration.

## Shared State

Phone and watch simulator use the same application state.

When the phone changes:

- Active workout.
- Current set.
- Current rep.
- Timer status.
- Interval.
- Applied adjustment.

The watch should update immediately.

When the watch simulator changes:

- Start.
- Pause/resume.
- Quick Adjust.
- Apply adjustment.
- End workout.

The phone should update immediately.

---

## Watch Userflow 1: Send/Start Workout

```text
User accepts adapted workout on phone.
User selects Start Workout.
System marks workout active.
Smartwatch simulator shows Workout Ready.
User selects Start on smartwatch.
Phone and watch enter active-session state.
Timer begins.
```

---

## Watch Userflow 2: Follow Workout

```text
Smartwatch shows current set and interval.
Timer counts down.
Rep progresses automatically.
User can monitor workout without using the phone view.
```

---

## Watch Userflow 3: Quick Adjust

```text
User selects Adjust on smartwatch.
User selects Too Fast.
Watch shows @ 2:50 -> @ 3:00.
User selects Apply.
Shared state updates.
Phone view reflects new interval.
```

---

## Simulated Connectivity

Because this is a browser prototype, do not implement real wireless connectivity.

Optionally include a simple developer/demo state:

- Connected.
- Disconnected.

If disconnected:

- Watch may show last known state.
- Reconnect restores current shared state.

This is optional and should not delay core work.

---

## Acceptance Criteria

- Smartwatch panel can open.
- Watch receives active workout state.
- Current set is visible.
- Timer/progress is visible.
- Pause/resume works.
- Quick Adjust can be initiated.
- Applying watch adjustment updates phone.
- Phone remains fully usable without watch panel.

---

# Feature 8: Safety Boundary

## Purpose

Make ethical limitations visible in the interface.

## Required behavior

Pain/injury concern:

- Does not trigger normal adaptation.
- Shows explicit limitation.
- Allows End Workout or Return.

Visible disclaimer:

`SwimFlex provides training suggestions, not medical or injury advice.`

---

## Acceptance Criteria

- Safety message is visible.
- System does not diagnose.
- System does not encourage training through pain.
- User can exit.

---

# Three M5-Ready Scenarios

Build M4 so these can be tested without changing code between participants.

---

## Scenario 1 — Less Time

Starting point:

- Tuesday Threshold.
- 2,500 yd.
- 52 min.
- Main set marked Priority.

Task:

- Adapt to 40 minutes.

Expected:

- 2,100 yd.
- 40 min.
- Priority main set preserved.
- Supporting volume reduced.

Tests:

- Adaptation comprehension.
- Trust.
- Transparency.
- Priority Set.

---

## Scenario 2 — Fatigue / Interval Too Fast

Starting point:

- Active main set.
- 6 × 200 @ 2:50.

Task:

- Report RPE 8/10.
- Select Interval too fast.

Expected:

- 6 × 200 @ 3:00.

Tests:

- Quick Adjust.
- Poolside interaction.
- Timer behavior.
- Smartwatch usefulness.

---

## Scenario 3 — Environmental Constraint

Preferred:

- Pool limitation.
- Planned 25 yd pool.
- Available 20 yd pool.

Alternative:

- Missing equipment.

Task:

- Tell SwimFlex the condition.
- Review adaptation.
- Accept or reject.

Tests:

- Breadth of adaptation.
- Explanation.
- User control.

---

# Local Data and Persistence

Use:

- Seed JSON/data module.
- `localStorage`.

Persist:

- Saved workouts.
- Priority Set selection.
- User-created workouts.
- Relevant preferences.
- Optional last active session.

Do not add a cloud backend.

---

# Error and Edge States

Handle:

- No workouts.
- Empty pasted workout.
- Invalid set input.
- No Priority Set selected.
- Target time too short to preserve Priority Set.
- Timer paused.
- Workout already active.
- User attempts to leave active workout.
- Safety boundary.

If target time is too short:

- Do not silently destroy Priority Set.
- Explain the conflict.
- Offer:
  - Increase available time.
  - Allow Priority Set modification.
  - Manually edit workout.

---

# Accessibility

- Semantic HTML.
- Real buttons and form labels.
- ARIA labels where useful.
- Keyboard support where practical.
- Large mobile tap areas.
- Status uses text + color.
- Pool Mode uses large type.
- Smartwatch simulator stays readable.

---

# Testing Requirements

## Unit-test candidates

- Yardage calculation.
- Estimated time calculation.
- Less Time adaptation.
- Priority Set preservation.
- Quick Adjust interval change.
- Safety routing.
- State reducer/actions.

## Manual tests

- Navigation.
- Local persistence.
- Timer.
- Demo timer.
- Smartwatch shared state.
- Quick Adjust from watch.
- Refresh behavior.
- M5 scenarios.
- Mobile responsive layout.

---

# Suggested Project Milestones

## Phase 1 — Foundation

- [ ] Initialize React + Vite if needed.
- [ ] Add design tokens.
- [ ] Add shared models/data structures.
- [ ] Add seed workouts.
- [ ] Create navigation/state shell.
- [ ] Build My Workouts.
- [ ] Build Review Workout.

## Phase 2 — Adaptation

- [ ] Constraint selection.
- [ ] Adaptation request data.
- [ ] Adaptation engine.
- [ ] Less Time rules.
- [ ] Proposed Changes.
- [ ] Manual editing.
- [ ] Safety boundary.

## Phase 3 — Active Workout

- [ ] Session state.
- [ ] Timer service/hook.
- [ ] Pool Mode.
- [ ] Automatic rep progression.
- [ ] Quick Adjust.
- [ ] Demo timing.

## Phase 4 — Smartwatch Simulation

- [ ] Watch device panel.
- [ ] Workout Ready.
- [ ] Watch Pool Mode.
- [ ] Pause/resume.
- [ ] Watch Quick Adjust.
- [ ] Shared state updates.

## Phase 5 — Breadth and Polish

- [ ] Fatigue branch.
- [ ] Pool/equipment branch.
- [ ] Error states.
- [ ] Accessibility.
- [ ] Visual matching with DESIGN.md.
- [ ] M5 scenarios.
- [ ] Presentation-ready demo data.
- [ ] Remove debug UI.
- [ ] No console errors.

---

# Definition of Done for M4

M4 is ready when:

- [ ] User can select Tuesday Threshold.
- [ ] User can mark/change Priority Set.
- [ ] User can adapt 52 min to 40 min.
- [ ] Recommendation shows what changed and why.
- [ ] User can accept, reject, or manually modify.
- [ ] Pool Mode runs with a timer.
- [ ] Reps progress without per-rep clicking.
- [ ] Quick Adjust supports 2:50 → 3:00.
- [ ] Safety boundary works.
- [ ] One environmental branch works.
- [ ] Smartwatch simulator receives active workout.
- [ ] Smartwatch shows set/timer/progress.
- [ ] Smartwatch can trigger/apply Quick Adjust.
- [ ] Phone and watch remain synchronized.
- [ ] Demo can be completed quickly.
- [ ] UI matches DESIGN.md.
- [ ] No flow is blocked by unfinished backend work.

---

# Suggested Initial Cursor Prompt

After placing `DESIGN.md`, `PLAN.md`, `ARCHITECTURE.md`, `WATCH.md`, and `CURSOR.md` in the repository root:

```text
Please read DESIGN.md, PLAN.md, ARCHITECTURE.md, WATCH.md, and CURSOR.md completely before making changes.

This is SwimFlex, an HCI functional prototype.

Build it as a React + Vite responsive web application. The primary interface should behave like a mobile app. The project also includes a simulated smartwatch companion interface that shares workout and session state with the phone interface.

Do not build a native iOS or watchOS app. Do not use Apple Watch APIs.

Follow DESIGN.md exactly for colors, layout, typography, and interaction hierarchy. Use the architecture in ARCHITECTURE.md. Use the simulated wearable behavior in WATCH.md. Use deterministic prototype adaptation rules from PLAN.md instead of adding an external AI API.

First inspect the repository and report:
1. Existing files and folders.
2. Whether a React/Vite project already exists.
3. What files you recommend creating.
4. Any assumptions you are making.

Then begin Phase 1 only:
1. Initialize React/Vite if needed.
2. Create shared data/models and design tokens.
3. Add Tuesday Threshold and Easy Aerobic Reset seed workouts.
4. Build My Workouts.
5. Build Review Workout.
6. Implement Priority Set selection.

Do not add unrelated features. Keep the project runnable after each phase.
```
