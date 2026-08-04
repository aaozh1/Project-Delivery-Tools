/**
 * Mock data ของหน้าจัดสรรกำลังคน (S6) — Squad A · สัปดาห์ 32 (4–8 ส.ค. 2569)
 * ที่มา: docs/design-handoff/designs/Allocate Capacity.dc.html (source of truth)
 * ยังไม่มี data layer — เมื่อมีแล้วให้แทนที่ module นี้ด้วยการดึงข้อมูลจริง
 */

export type RoleCode = 'Sr' | 'Mid' | 'Jr'

export interface AllocProject {
  code: string
  name: string
  /** งวดที่กำลังทำอยู่ */
  phase: number
  /** งบต้นทุนของงวด (บาท) */
  budget: number
  /** ต้นทุนสะสมของงวดก่อนสัปดาห์นี้ (บาท) */
  spent: number
}

export type MemberNoteKind = 'plain' | 'new' | 'leave'

export interface SquadMember {
  name: string
  role: RoleCode
  /** กำลังที่ว่างจริงของสัปดาห์นี้ — 1.00 = เต็มสัปดาห์ · ลดลงตามวันลา */
  capacity: number
  note: string
  noteKind: MemberNoteKind
}

/**
 * เรตต้นทุนต่อคน-สัปดาห์ (บาท) — เรตนี้เป็น "ต้นทุนรวมภาระ" (เงินเดือน + สวัสดิการ + ภาระแฝง)
 * จึงต่างจากเรตกลางที่ใช้ประมาณการในหน้าวางแผน (Sr ฿30,000 · Mid ฿17,000 · Jr ฿10,000)
 * ของจริงต้องอ่านจาก Admin Console → อัตราค่าแรง (สิทธิ์จำกัด + บันทึก Audit Log ทุกครั้งที่อ่าน)
 */
export const COST_RATE: Record<RoleCode, number> = { Sr: 60_000, Mid: 40_000, Jr: 24_800 }

export const PROJECTS: AllocProject[] = [
  { code: 'ID-2026-004', name: 'Café ทองหล่อ', phase: 3, budget: 900_000, spent: 549_600 },
  { code: 'ID-2026-009', name: 'สำนักงาน BTS อโศก', phase: 2, budget: 750_000, spent: 245_000 },
  { code: 'ID-2026-011', name: 'ร้านค้าปลีก สยาม', phase: 2, budget: 600_000, spent: 43_400 },
]

export const MEMBERS: SquadMember[] = [
  { name: 'คุณเอ', role: 'Sr', capacity: 1.0, note: 'หัวหน้า Squad', noteKind: 'plain' },
  { name: 'คุณซี', role: 'Mid', capacity: 1.0, note: 'รับงานต่อจากคุณเอฟ', noteKind: 'plain' },
  { name: 'คุณดี', role: 'Jr', capacity: 1.0, note: 'ย้ายเข้า Squad A เมื่อ 1 ส.ค.', noteKind: 'new' },
  { name: 'คุณอี', role: 'Jr', capacity: 0.75, note: 'ลาพักร้อน 1 วัน (พฤ. 7 ส.ค.)', noteKind: 'leave' },
]

/** ค่าจัดสรรของสัปดาห์ 31 — ใช้กับปุ่ม "คัดลอกจากสัปดาห์ก่อน" (แถว = สมาชิก · คอลัมน์ = โครงการ) */
export const LAST_WEEK_GRID: number[][] = [
  [0.5, 0.5, 0],
  [0.5, 0.25, 0.25],
  [0, 0.5, 0.25],
  [0.5, 0, 0.25],
]

/** ค่าตั้งต้นของสัปดาห์ 32 ตาม prototype (คุณอี 1.00 > capacity 0.75 → เตือนเหลืองตั้งแต่เปิดหน้า) */
export const INITIAL_GRID: number[][] = [
  [0.5, 0.5, 0],
  [0.5, 0.5, 0.25],
  [0, 0.5, 0.25],
  [0.5, 0, 0.5],
]

/** ข้อความคนที่ย้ายออกจาก Squad — แสดงเป็นบรรทัดใต้ตาราง อธิบายว่าทำไมคุณซีถึงล้น */
export const MOVED_OUT_NOTE =
  'คุณเอฟ (Mid) ย้ายออกจาก Squad A เมื่อ 31 ก.ค. — งานที่ค้างถูกโอนให้คุณซี'
