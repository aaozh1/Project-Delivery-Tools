import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RoleProvider } from './auth/RoleContext'
import { AppShell } from './shell/AppShell'
import { HomePage } from './pages/HomePage'
import { DesignSystemPage } from './pages/DesignSystemPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { PortfolioPage } from './pages/PortfolioPage'
import { ProjectPlanPage } from './pages/ProjectPlanPage'
import { AllocateCapacityPage } from './pages/AllocateCapacityPage'
import { PersonalWorkloadPage } from './pages/PersonalWorkloadPage'
import { DepartmentBoardPage } from './pages/DepartmentBoardPage'
import { AdminConsolePage } from './pages/AdminConsolePage'
import { WeeklyLogPage } from './pages/WeeklyLogPage'
import { GrowthProfilePage } from './pages/GrowthProfilePage'
import { SCREENS } from './pages/screens'

const PAGES: Record<string, React.ComponentType> = {
  '/portfolio': PortfolioPage,
  '/plan': ProjectPlanPage,
  '/allocate': AllocateCapacityPage,
  '/workload': PersonalWorkloadPage,
  '/department': DepartmentBoardPage,
  '/admin': AdminConsolePage,
  '/weekly-log': WeeklyLogPage,
  '/growth': GrowthProfilePage,
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

function AppRoutes() {
  return (
    <RoleProvider>
      <Routes>
        <Route element={<AppShell />}>
          {/* หน้าแรก = Portfolio Control Room (หน้าที่ HoPD เปิดทุกเช้า) */}
          <Route index element={<PortfolioPage />} />
          <Route path="/screens" element={<HomePage />} />
          <Route path="/design-system" element={<DesignSystemPage />} />
          {SCREENS.map((screen) => {
            const Page = PAGES[screen.path]
            return (
              <Route
                key={screen.id}
                path={screen.path}
                element={Page ? <Page /> : <PlaceholderPage screen={screen} />}
              />
            )
          })}
        </Route>
      </Routes>
    </RoleProvider>
  )
}
