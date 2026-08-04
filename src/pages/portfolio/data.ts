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
  { code: 'ID-2026-009', name: 'สำนักงาน BTS อโศก', dept: 'ID', squad: 'A', phase: '2/4', progress: 41, used: 41, usDelay: 0, clDelay: 0, marginNow: 30, marginFc: 31, status: 'ok' },
  { code: 'ID-2026-011', name: 'ร้านค้าปลีก สยาม', dept: 'ID', squad: 'A', phase: '2/4', progress: 25, used: 32, usDelay: 2, clDelay: 0, marginNow: 28, marginFc: 26, status: 'warn' },
  { code: 'ID-2026-020', name: 'โรงแรมบูทีค เขาใหญ่', dept: 'ID', squad: 'B', phase: '2/4', progress: 30, used: 38, usDelay: 0, clDelay: 5, marginNow: 29, marginFc: 27, status: 'warn' },
  { code: 'ID-2026-015', name: 'คลินิกทันตกรรม ราชพฤกษ์', dept: 'ID', squad: 'B', phase: '1/4', progress: 12, used: 10, usDelay: 0, clDelay: 0, marginNow: 33, marginFc: 33, status: 'ok' },
  { code: 'AR-2025-011', name: 'อาคารสำนักงานพระราม 9', dept: 'AR', squad: 'C', phase: '4/5', progress: 78, used: 74, usDelay: 0, clDelay: 12, marginNow: 22, marginFc: 24, status: 'ok' },
  { code: 'AR-2026-005', name: 'อาคารพาณิชย์ ลาดพร้าว', dept: 'AR', squad: 'C', phase: '3/5', progress: 40, used: 58, usDelay: 4, clDelay: 2, marginNow: 21, marginFc: 16, status: 'critical' },
  { code: 'AR-2026-013', name: 'โรงงานสมุทรสาคร', dept: 'AR', squad: 'C', phase: '1/5', progress: 10, used: 9, usDelay: 0, clDelay: 3, marginNow: 26, marginFc: 26, status: 'ok' },
  { code: 'HS-2026-003', name: 'บ้านคุณวิภา พัฒนาการ', dept: 'House', squad: 'D', phase: '3/4', progress: 55, used: 68, usDelay: 5, clDelay: 0, marginNow: 25, marginFc: 20, status: 'warn' },
  { code: 'HS-2026-010', name: 'บ้านสวนพุทธมณฑล', dept: 'House', squad: 'D', phase: '1/4', progress: 8, used: 6, usDelay: 0, clDelay: 0, marginNow: 30, marginFc: 30, status: 'ok' },
  { code: 'GR-2026-008', name: 'Campaign ฤดูฝน', dept: 'Graphic', squad: 'F', phase: '2/3', progress: 45, used: 55, usDelay: 3, clDelay: 1, marginNow: 35, marginFc: 30, status: 'warn' },
]

/** หัวหน้าและสายงานของแต่ละ Squad — ใช้เป็นหัว window ในตารางแยกตาม Squad */
export const SQUAD_META: Record<string, { lead: string; dept: Dept }> = {
  A: { lead: 'คุณเอ', dept: 'ID' },
  B: { lead: 'คุณเอฟ', dept: 'ID' },
  C: { lead: 'คุณเค', dept: 'AR' },
  D: { lead: 'คุณดล', dept: 'House' },
  F: { lead: 'คุณฝน', dept: 'Graphic' },
}

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
