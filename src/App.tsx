import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { RoleProvider, useRole } from './auth/RoleContext'
import { HOME_BY_ROLE, canAccess } from './auth/roles'
import { AppShell } from './shell/AppShell'
import { HomePage } from './pages/HomePage'
import { DesignSystemPage } from './pages/DesignSystemPage'
import { NoAccessPage } from './pages/NoAccessPage'
import { PortfolioPage } from './pages/PortfolioPage'
import { ProjectPlanPage } from './pages/ProjectPlanPage'
import { AllocateCapacityPage } from './pages/AllocateCapacityPage'
import { PersonalWorkloadPage } from './pages/PersonalWorkloadPage'
import { DepartmentBoardPage } from './pages/DepartmentBoardPage'
import { AdminConsolePage } from './pages/AdminConsolePage'
import { WeeklyLogPage } from './pages/WeeklyLogPage'
import { GrowthProfilePage } from './pages/GrowthProfilePage'
import { HandoffFormPage } from './pages/HandoffFormPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ReviewApprovalPage } from './pages/ReviewApprovalPage'
import { VariationOrderPage } from './pages/VariationOrderPage'
import { BillingCashPage } from './pages/BillingCashPage'
import { CloseoutReportPage } from './pages/CloseoutReportPage'
import { BdPortalPage } from './pages/BdPortalPage'
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
  '/handoff': HandoffFormPage,
  '/project': ProjectDetailPage,
  '/review': ReviewApprovalPage,
  '/vo': VariationOrderPage,
  '/finance': BillingCashPage,
  '/closeout': CloseoutReportPage,
  '/bd': BdPortalPage,
}

/** ตรวจสิทธิ์ระดับ route ตามตาราง §5 — ไม่มีสิทธิ์ = หน้าอธิบาย ไม่ใช่ error */
function Guarded({ path, title, children }: { path: string; title: string; children: ReactNode }) {
  const { role } = useRole()
  if (!canAccess(role, path)) return <NoAccessPage path={path} title={title} />
  return <>{children}</>
}

/** หน้าแรกตามบทบาท — แต่ละบทบาทมีหน้าจอบ้านของตัวเอง (brief §3) */
function HomeRedirect() {
  const { role } = useRole()
  return <Navigate to={HOME_BY_ROLE[role]} replace />
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
          <Route index element={<HomeRedirect />} />
          <Route path="/screens" element={<HomePage />} />
          <Route path="/design-system" element={<DesignSystemPage />} />
          {SCREENS.map((screen) => {
            const Page = PAGES[screen.path]
            if (!Page) return null
            return (
              <Route
                key={screen.id}
                path={screen.path}
                element={
                  <Guarded path={screen.path} title={screen.title}>
                    <Page />
                  </Guarded>
                }
              />
            )
          })}
        </Route>
      </Routes>
    </RoleProvider>
  )
}
