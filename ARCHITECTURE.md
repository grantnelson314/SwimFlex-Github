# SwimFlex — ARCHITECTURE.md

## Purpose

Define the technical structure Cursor should follow for the Windows-friendly SwimFlex prototype.

This is an HCI functional prototype.

Prefer clear, maintainable React code over production-level complexity.

---

## Platform Direction

Use:

- React.
- Vite.
- JavaScript or TypeScript.
- Responsive web UI.
- Simulated smartwatch companion.
- `localStorage`.
- Shared application state.
- No backend.
- No real smartwatch APIs.
- No external AI service required.

If the project is new, initialize Vite.

---

## Recommended Project Structure

```text
src/
  app/
    App.jsx
    routes.jsx

  components/
    buttons/
    cards/
    forms/
    layout/
    status/

  features/
    workouts/
      components/
      pages/
      workoutData.js
      workoutUtils.js

    adaptation/
      components/
      pages/
      adaptationEngine.js
      adaptationRules.js

    session/
      components/
      pages/
      sessionReducer.js
      timer.js

    watch/
      components/
      pages/

  state/
    AppContext.jsx
    appReducer.js
    actions.js

  styles/
    tokens.css
    global.css
    components.css

  utils/
    storage.js
    time.js
    format.js

  tests/
```

Exact file names may vary, but preserve separation between:

- UI.
- Data/models.
- Adaptation logic.
- Session/timer logic.
- Shared state.
- Persistence.
- Smartwatch presentation.

Do not place all logic inside `App.jsx`.

---

# State Architecture

Use a lightweight shared-state approach.

Preferred:

- React Context + `useReducer`.

Avoid Redux unless absolutely necessary.

Suggested shape:

```js
{
  workouts: [],
  selectedWorkoutId: null,
  adaptationRequest: null,
  recommendation: null,
  activeSession: null,
  watch: {
    visible: false,
    connected: true
  },
  settings: {
    demoMode: true
  }
}
```

The phone and smartwatch simulator must read/write the same shared state.

---

# Core Data Models

Use plain JavaScript objects or TypeScript interfaces.

## Workout

```js
{
  id: "tuesday-threshold",
  name: "Tuesday Threshold",
  focus: "threshold",
  estimatedDurationMinutes: 52,
  prioritySetId: "main-set",
  sets: []
}
```

Total yards should be derived from sets.

---

## WorkoutSet

```js
{
  id: "main-set",
  name: "Main set",
  role: "main",
  repetitions: 6,
  distancePerRepYards: 200,
  stroke: "free",
  intervalSeconds: 170,
  effort: "threshold",
  equipment: [],
  notes: ""
}
```

Derived:

```js
totalYards = repetitions * distancePerRepYards
```

---

## Training Focus

Allowed values:

```text
threshold
sprint
aerobic
technique
recovery
racePace
```

---

## Set Role

Allowed values:

```text
warmup
preset
main
speed
technique
cooldown
other
```

Priority status is user-selected and should not be inferred only from role.

---

## Equipment

Allowed values:

```text
fins
paddles
pullBuoy
kickboard
```

---

# Adaptation Models

## Constraint Type

```text
lessTime
feelingTired
workoutTooDifficult
missingEquipment
poolLimitation
painOrInjury
```

---

## Adaptation Request

```js
{
  workoutId: "tuesday-threshold",
  constraint: "lessTime",
  availableMinutes: 40,
  readiness: 3,
  rpe: null,
  availableEquipment: ["fins", "pullBuoy"],
  poolLengthYards: 25,
  prioritySetId: "main-set"
}
```

Validation:

- Readiness: 1–5.
- RPE: 1–10.
- Available minutes > 0.
- Pain/injury bypasses normal recommendation.

---

## Set Change

```js
{
  originalSetId: "warmup",
  originalSet: {},
  adjustedSet: {},
  changeType: "reduced",
  explanation: "Warm-up volume was reduced to help meet the available time."
}
```

Change types:

```text
reduced
preserved
unchanged
replaced
intervalAdjusted
```

---

## Adaptation Recommendation

```js
{
  id: "rec-001",
  sourceWorkoutId: "tuesday-threshold",
  adjustedWorkout: {},
  changes: [],
  summary: "Built for 40 minutes",
  rationale: [],
  estimatedMinutesSaved: 12,
  yardsChanged: -400,
  requiresUserReview: true
}
```

---

# Adaptation Engine

Create pure functions.

Recommended:

```text
src/features/adaptation/adaptationEngine.js
src/features/adaptation/adaptationRules.js
```

Main function:

```js
recommendWorkout(workout, request)
```

Pseudo-code:

```js
switch (request.constraint) {
  case "lessTime":
    return adaptForTime(workout, request)

  case "feelingTired":
    return adaptForFatigue(workout, request)

  case "workoutTooDifficult":
    return adaptForDifficulty(workout, request)

  case "missingEquipment":
    return adaptForEquipment(workout, request)

  case "poolLimitation":
    return adaptForPool(workout, request)

  case "painOrInjury":
    return {
      type: "safetyBoundary"
    }
}
```

Do not call an external LLM.

---

## Priority Set Invariant

Before returning a recommendation:

```text
If a prioritySetId exists:
  ensure that set remains in the adjusted workout
  if it changes:
    mark recommendation as requiring explicit user review
```

For the canonical Less Time scenario, Priority Set remains unchanged.

---

# Active Session Model

Suggested:

```js
{
  sessionId: "session-001",
  workout: {},
  currentSetIndex: 0,
  currentRepIndex: 0,
  status: "ready",
  repElapsedSeconds: 0,
  remainingIntervalSeconds: null,
  totalElapsedSeconds: 0,
  adaptationsApplied: [],
  startedAt: null,
  lastUpdatedAt: Date.now()
}
```

Status:

```text
ready
running
paused
completed
ended
```

---

# Session and Timer Logic

Keep timer logic outside page components.

Recommended options:

- Custom hook: `useWorkoutTimer`.
- Session reducer + timer hook.
- Small session service module.

Responsibilities:

- Start.
- Pause/resume.
- Tick.
- Calculate countdown.
- Advance rep.
- Advance set.
- Apply interval changes.
- Finish workout.
- Support demo timing.

---

## Demo Timer Mode

Recommended setting:

```js
demoMode: true
```

Example:

- Real display interval: 170 sec (`2:50`).
- Demo progression duration: 8 sec.

The UI should continue displaying the real interval.

The timer implementation should separate:

```text
displayIntervalSeconds
simulationIntervalSeconds
```

Do not expose technical debug controls in participant-facing UI.

---

# Shared Phone / Watch State

The smartwatch simulator is not a separate application.

It should use the same React Context/reducer.

Example:

```text
Phone Pool Mode
      |
      v
Shared activeSession state
      ^
      |
Watch Pool Mode
```

If Watch Quick Adjust changes the interval:

1. Dispatch shared action.
2. Update active session.
3. Phone reflects change.
4. Watch reflects change.

No networking is required.

---

# Smartwatch Simulator Architecture

Suggested components:

```text
WatchShell
WatchWorkoutReady
WatchPoolMode
WatchQuickAdjust
WatchAdjustmentProposal
WatchPaused
WatchComplete
WatchSafetyBoundary
```

The watch shell can conditionally render based on:

```js
activeSession.status
watchScreen
```

Use shared state for workout/session content.

Use local watch UI state only for transient presentation such as:
- Which watch menu is open.
- Temporary confirmation.

Do not duplicate authoritative workout/session state inside the watch feature.

---

# Navigation

Phone flow:

```text
My Workouts
  -> Review Workout
    -> Adapt Workout
      -> Proposed Changes
        -> Manual Adjustment (optional)
        -> Start Workout
          -> Pool Mode
            -> Quick Adjust
            -> Safety Boundary
```

Add Workout branches into Review Workout.

Smartwatch flow:

```text
Workout Ready
  -> Pool Mode
    -> Quick Adjust
    -> Paused
  -> Complete
```

The phone should work even if the smartwatch panel is closed.

---

# Persistence

Use `localStorage`.

Suggested keys:

```text
swimflex_workouts
swimflex_preferences
swimflex_active_session
```

Seed default workouts only if no saved workout data exists.

Do not overwrite user-created data on refresh.

---

# Reusable Utilities

Recommended:

```text
calculateWorkoutYards(workout)
formatInterval(seconds)
formatElapsedTime(seconds)
estimateWorkoutDuration(workout)
cloneWorkout(workout)
```

Do not duplicate time/yardage calculations across components.

---

# Error Handling

Suggested error/result values:

```text
invalidRequest
impossibleTimeTarget
safetyBoundary
noEquipmentReplacement
```

For impossible time target:

- Explain target cannot be met while preserving Priority Set.
- Offer:
  - Increase available time.
  - Allow Priority Set modification.
  - Manual edit.

---

# Testing Strategy

## Unit tests

Good candidates:

- Yardage calculation.
- Interval formatting.
- Canonical Less Time adaptation.
- Priority preservation.
- RPE 8 / interval-too-fast recommendation.
- Safety routing.
- Reducer actions.

Use Vitest if tests are added.

Do not make test setup block core development.

---

## Manual tests

- Phone navigation.
- Browser refresh.
- Persistence.
- Timer.
- Pause/resume.
- Demo timer.
- Smartwatch sync.
- Quick Adjust from watch.
- Mobile widths.
- Desktop presentation.
- All M5 scenarios.

---

# Implementation Order

1. Vite setup.
2. Design tokens.
3. Shared data/models.
4. Seed workouts.
5. App state/reducer.
6. My Workouts.
7. Review Workout.
8. Adaptation engine.
9. Adapt Workout.
10. Proposed Changes.
11. Manual editing.
12. Active session.
13. Timer.
14. Pool Mode.
15. Quick Adjust.
16. Safety boundary.
17. Smartwatch simulator.
18. Alternate scenarios.
19. Polish/tests.

---

# Architectural Rules for Cursor

- Read all markdown files before coding.
- Do not create Swift/Xcode files.
- Do not create native mobile/watch apps.
- Do not add a backend.
- Do not add external AI.
- Keep adaptation rules outside React components.
- Keep timer logic outside presentational components.
- Keep phone/watch on one shared source of truth.
- Do not duplicate session state.
- Avoid unnecessary packages.
- Keep the app runnable after each phase.
- Prefer deterministic demo behavior.
- Keep functionality understandable for M5 testing.
