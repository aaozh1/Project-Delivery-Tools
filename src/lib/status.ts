/**
 * ระดับสถานะ/ความเสี่ยง 4 ระดับของระบบ
 * ทุกสถานะต้องแสดงทั้งสีและสัญลักษณ์คู่กันเสมอ (ห้ามพึ่งสีอย่างเดียว)
 */
export type RiskLevel = 'critical' | 'warn' | 'ok' | 'low'

export interface StatusMeta {
  mark: string
  /** CSS variable อ้างจาก tokens.css */
  color: string
  hex: string
  label: string
}

export const STATUS: Record<RiskLevel, StatusMeta> = {
  critical: { mark: '▲', color: 'var(--dpm-red)', hex: '#B33A3A', label: 'วิกฤต' },
  warn: { mark: '◆', color: 'var(--dpm-yellow)', hex: '#C79A2E', label: 'เตือน' },
  ok: { mark: '●', color: 'var(--dpm-green)', hex: '#2F7A4F', label: 'ปกติ' },
  low: { mark: '○', color: 'var(--dpm-blue)', hex: '#5B7C99', label: 'โหลดต่ำ' },
}

/**
 * ระดับสถานะจาก % โหลดรายบุคคล/Squad
 * เกณฑ์ตั้งต้น (ต้องอ่านจาก Business Rules ใน Admin Console เมื่อมี data layer จริง):
 * แดง >110 · เหลือง 100–110 · เขียว 65–100 · น้ำเงิน <65
 */
export function loadLevel(pct: number): RiskLevel {
  if (pct > 110) return 'critical'
  if (pct >= 100) return 'warn'
  if (pct >= 65) return 'ok'
  return 'low'
}

/**
 * ระดับสถานะสุขภาพโครงการจากส่วนต่าง ใช้ไป% − คืบหน้า%
 * เกณฑ์ตั้งต้น: เตือนเกิน 5 จุด · วิกฤตเกิน 15 จุด (ตั้งค่าได้ใน Admin Console)
 */
export function healthLevel(
  usedPct: number,
  progressPct: number,
  warnGap = 5,
  criticalGap = 15,
): RiskLevel {
  const gap = usedPct - progressPct
  if (gap > criticalGap || usedPct > 110) return 'critical'
  if (gap > warnGap) return 'warn'
  return 'ok'
}

/** สถานะงวดงาน 6 ขั้น เดินหน้าทางเดียว */
export type PhaseStatus =
  | 'not-started'
  | 'in-progress'
  | 'delivered'
  | 'approved'
  | 'billed'
  | 'paid'

export const PHASE_STATUS_ORDER: PhaseStatus[] = [
  'not-started',
  'in-progress',
  'delivered',
  'approved',
  'billed',
  'paid',
]

export const PHASE_STATUS_LABEL: Record<PhaseStatus, string> = {
  'not-started': 'ยังไม่เริ่ม',
  'in-progress': 'กำลังทำ',
  delivered: 'ส่งลูกค้าแล้ว',
  approved: 'อนุมัติแล้ว',
  billed: 'วางบิลแล้ว',
  paid: 'รับเงินแล้ว',
}
