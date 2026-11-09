import { Navigate, Route, Routes } from 'react-router-dom'
import AdaptWorkoutPage from '../features/adaptation/pages/AdaptWorkoutPage.jsx'
import AdjustedWorkoutReadyPage from '../features/adaptation/pages/AdjustedWorkoutReadyPage.jsx'
import ManualAdjustmentPage from '../features/adaptation/pages/ManualAdjustmentPage.jsx'
import ProposedChangesPage from '../features/adaptation/pages/ProposedChangesPage.jsx'
import SafetyBoundaryPage from '../features/adaptation/pages/SafetyBoundaryPage.jsx'
import PoolModePage from '../features/session/pages/PoolModePage.jsx'
import QuickAdjustPage from '../features/session/pages/QuickAdjustPage.jsx'
import SessionSafetyPage from '../features/session/pages/SessionSafetyPage.jsx'
import WorkoutCompletePage from '../features/session/pages/WorkoutCompletePage.jsx'
import AddWorkoutPage from '../features/workouts/pages/AddWorkoutPage.jsx'
import ChooseWorkoutPage from '../features/workouts/pages/ChooseWorkoutPage.jsx'
import MyWorkoutsPage from '../features/workouts/pages/MyWorkoutsPage.jsx'
import ReviewWorkoutPage from '../features/workouts/pages/ReviewWorkoutPage.jsx'

/**
 * Phone flow (ARCHITECTURE.md):
 * My Workouts -> Review Workout -> Adapt Workout -> Proposed Changes
 *   -> (Manual Adjustment) -> Start Workout -> Pool Mode -> Quick Adjust -> Workout Complete
 * Adapt Workout and Quick Adjust -> Safety Boundary for pain/injury.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MyWorkoutsPage />} />
      <Route path="/choose-workout" element={<ChooseWorkoutPage />} />
      <Route path="/workouts/:workoutId" element={<ReviewWorkoutPage />} />
      <Route path="/adapt/:workoutId" element={<AdaptWorkoutPage />} />
      <Route path="/adapt/:workoutId/proposed" element={<ProposedChangesPage />} />
      <Route path="/adapt/:workoutId/manual" element={<ManualAdjustmentPage />} />
      <Route path="/adapt/:workoutId/safety" element={<SafetyBoundaryPage />} />
      <Route path="/adapt/:workoutId/ready" element={<AdjustedWorkoutReadyPage />} />
      <Route path="/session" element={<PoolModePage />} />
      <Route path="/session/quick-adjust" element={<QuickAdjustPage />} />
      <Route path="/session/safety" element={<SessionSafetyPage />} />
      <Route path="/session/complete" element={<WorkoutCompletePage />} />
      <Route path="/add-workout" element={<AddWorkoutPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
