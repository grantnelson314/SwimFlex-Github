import { HashRouter } from 'react-router-dom'
import PhoneShell from '../components/layout/PhoneShell.jsx'
import DemoMenu from '../features/demo/components/DemoMenu.jsx'
import SessionClock from '../features/session/components/SessionClock.jsx'
import WatchPanel from '../features/watch/components/WatchPanel.jsx'
import WatchToggle from '../features/watch/components/WatchToggle.jsx'
import { AppProvider } from '../state/AppContext.jsx'
import AppRoutes from './routes.jsx'

/**
 * One AppProvider, one SessionClock. The phone (routes) and the simulated watch (companion)
 * are two views of the same shared state.
 */
export default function App() {
  return (
    <AppProvider>
      <SessionClock />
      <HashRouter>
        <PhoneShell
          toolbar={
            <>
              <DemoMenu />
              <WatchToggle />
            </>
          }
          companion={<WatchPanel />}
        >
          <AppRoutes />
        </PhoneShell>
      </HashRouter>
    </AppProvider>
  )
}
