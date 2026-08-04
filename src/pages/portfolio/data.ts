/**
 * Mock data ของหน้า Portfolio Control Room (S1)
 * ค่าตรงกับ prototype `docs/design-handoff/designs/Portfolio Control Room.dc.html`
 * — แทนที่ด้วย data layer จริงเมื่อพร้อม (เกณฑ์ต้องอ่านจาก Admin Console ห้าม hardcode)
 */
import type { RiskLevel } from '../../lib/status'

export type Dept = 'AR' | 'ID' | 'House' | 'Graphic'
export type FilterKey = 'all' | Dept
export type MarginMode = 'now' | 'forecast'

export interface ProjectRow {
  code: string
  name: string
  dept: Dept
  squad: string
  /** งวดปัจจุบัน/ทั้งหมด เช่น '3/4' */
  phase: string
  /** % ความคืบหน้างาน */
  progress: number
  /** % คน-สัปดาห์ที่ใช้ไปเทียบงบ */
  used: number
  /** วันที่ช้าฝั่งเรา */
  usDelay: number
  /** วันที่ช้าฝั่งลูกค้า */
  clDelay: number
  /** Margin % ณ ปัจจุบัน */
  marginNow: number
  /** Margin % พยากรณ์ตอนจบ */
  marginFc: number
  status: RiskLevel
}

export const PROJECTS: ProjectRow[] = [
  {
    code: 'ID-2026-004',
    name: 'Café ทองหล่อ',
    dept: 'ID',
    squad: 'A',
    phase: '3/4',
    progress: 45,
    used: 132,
    usDelay: 9,
    clDelay: 4,
    marginNow: 6,
    marginFc: -4,
    status: 'critical',
  },
  {
    code: 'AR-2026-002',
    name: 'โกดังบางนา',
    dept: 'AR',
    squad: 'C',
    phase: '2/5',
    progress: 38,
    used: 71,
    usDelay: 3,
    clDelay: 18,
    marginNow: 24,
    marginFc: 19,
    status: 'warn',
  },
  {
    code: 'HS-2026-007',
    name: 'บ้านคุณสมชาย',
    dept: 'House',
    squad: 'D',
    phase: '1/4',
    progress: 18,
    used: 14,
    usDelay: 0,
    clDelay: 0,
    marginNow: 35,
    marginFc: 34,
    status: 'ok',
  },
  {
    code: 'GR-2026-014',
    name: 'Rebrand XYZ',
    dept: 'Graphic',
    squad: 'F',
    phase: '2/3',
    progress: 60,
    used: 52,
    usDelay: 0,
    clDelay: 2,
    marginNow: 40,
    marginFc: 41,
    status: 'ok',
  },
]

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด 24' },
  { key: 'AR', label: 'AR 9' },
  { key: 'ID', label: 'ID 6' },
  { key: 'House', label: 'House 5' },
  { key: 'Graphic', label: 'Graphic 4' },
]

/** จำนวนโครงการที่ดำเนินอยู่ทั้งหมด (mock — ตารางแสดงเฉพาะแถวตัวอย่างจาก prototype) */
export const TOTAL_PROJECTS = 24

/** สเกลของแถบช้า เรา/ลูกค้า — ความยาวเต็มแถบ = 20 วัน */
export const MAX_DELAY_DAYS = 20
