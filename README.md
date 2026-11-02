# SwimFlex

HCI functional prototype: a responsive, mobile-first React + Vite web app that helps former competitive swimmers adapt an **existing** workout, with a simulated smartwatch companion (coming in a later phase).

Browser-only. No backend, no authentication, no external AI. Distances are in **yards**. Data is stored in `localStorage`.

Design and build contracts: `DESIGN.md`, `PLAN.md`, `ARCHITECTURE.md`, `WATCH.md`, `CURSOR.md`.

## Run locally (Windows / PowerShell)

```powershell
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```powershell
npm run build    # production build into dist/
npm run preview  # serve the production build
npm test         # unit tests (Vitest)
npm run lint     # oxlint
```

To reset saved data, clear the site's `swimflex_workouts` key in browser DevTools -> Application -> Local Storage, then refresh.

## Status

- Phase 1 (Foundation): My Workouts, Review Workout, Priority Set selection, shared state, seed data, design tokens.
- Phase 2 (Adaptation): Adapt Workout, deterministic engine (Less Time, Workout Too Difficult, Pain/Injury Safety Boundary), Proposed Changes, Manual Adjustment.
- Phase 3 (Active workout): Start Workout, Pool Mode with an automatic timer, Quick Adjust, Workout Complete.
- Phase 4 (Smartwatch simulator): a generic simulated watch that shares the phone's session state. Quick Adjust now pauses the workout while it is open and resumes it afterwards (unless it was already paused, or you report pain/injury).
- Phase 5 (Breadth and polish):
  - Adapt Workout now handles Less Time, Feeling Tired, Workout Too Difficult, Missing Equipment, Pool Limitation (25 to 20 yd) and the Pain/Injury Safety Boundary. Every result goes through Proposed Changes.
  - Quick Adjust (phone) also handles Fatigue, Running out of time (remaining workout only), and a limited Equipment/Pool notice. The watch asks for an RPE (6-10) after "Too fast", asks readiness for "Fatigued", offers simple minutes for "Less time", and says "Review on phone" for Equipment and Pool change.
  - Add Workout: Paste Workout (deterministic parser, no AI) or Build Manually.
  - Demo menu (top bar): Return to Tuesday Threshold (one step: clears any workout and proposal, restores the canonical Tuesday Threshold and its default Priority Set), Clear active workout, Reset demo data (removes workouts you added).
  - Older saved data: `swimflex_demo_version` tracks the seed version. When it is older, the two seed workouts are brought up to date (for example Easy Aerobic Reset's equipment) and workouts you added are kept. Bump `SEED_DATA_VERSION` in `seedMigration.js` whenever the seed workouts change.

Adaptation rules live in `src/features/adaptation/` (`adaptationEngine.js`, `adaptationRules.js`, `adaptationRequest.js`, one module per constraint such as `adaptFatigue.js`, `adaptEquipment.js`, `adaptPool.js`, and `remainingTime.js`) and contain no React. The workout text parser is `src/features/workouts/workoutParser.js`.

SwimFlex gives training suggestions only. It is not medical advice, and it does not claim that a substituted piece of equipment is equivalent.

Session logic lives in src/features/session/: sessionReducer.js (pure state machine), `timer.js` (demo timing), sessionSelectors.js, and useWorkoutTimer.js / SessionClock (the single clock, mounted once in App.jsx). Pool Mode pages only display session state and dispatch actions.

## Demo timing

Pool Mode always shows the real interval (for example 2:50). By default (demoMode on) the simulation completes any interval in about 8 seconds so testing and presentations don't wait minutes; elapsed time stays in workout time. There is no on-screen control for this. Open the app with `?demo=off` (for example http://localhost:5173/?demo=off) to run at real speed.

## Smartwatch simulator

Use **Show Smartwatch** above the phone. On wide screens the watch sits beside the phone; on narrow screens it opens as a drawer. The watch has no state or timer of its own: it renders the same `activeSession` as the phone (`src/features/watch/watchSelectors.js`) and dispatches the same actions, so a rep advance, pause, Quick Adjust or end on either device appears on both immediately. It is a generic concept device, not an Apple Watch integration.
