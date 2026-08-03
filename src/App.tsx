import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './shell/AppShell'
import { HomePage } from './pages/HomePage'
import { DesignSystemPage } from './pages/DesignSystemPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SCREENS } from './pages/screens'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="/design-system" element={<DesignSystemPage />} />
          {SCREENS.map((screen) => (
            <Route key={screen.id} path={screen.path} element={<PlaceholderPage screen={screen} />} />
          ))}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
