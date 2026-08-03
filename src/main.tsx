import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// ฟอนต์ self-host ตามคำแนะนำ handoff (ใช้งานออฟไลน์ในออฟฟิศได้)
import '@fontsource/ibm-plex-sans-thai/400.css'
import '@fontsource/ibm-plex-sans-thai/500.css'
import '@fontsource/ibm-plex-sans-thai/600.css'
import '@fontsource/ibm-plex-sans-thai/700.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'

import './styles/global.css'
import './styles/components.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
