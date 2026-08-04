/**
 * ข้อมูล mock ของ S9 Billing & Cash — มุมมอง Admin/บัญชี
 *
 * ที่มาของค่า:
 * - งวดงานหลัก ดึงจากทะเบียนกลาง `src/data/projects.ts` (PROJECTS):
 *   status `approved` = รอวางบิล · `billed` = วางบิลแล้วรอรับเงิน · `paid` = รับเงินแล้ว
 * - วันที่/จำนวนวัน (รออนุมัติกี่วัน · วางบิลเมื่อไหร่ · ค้างมากี่วัน) ยังไม่มีใน
 *   ทะเบียนกลาง จึง mock ไว้ใน PHASE_BILLING_META — เมื่อมี data layer จริง
 *   ค่าเหล่านี้มาจากบันทึกวางบิล/รับเงิน (Audit Log)
 * - PROJECTS เป็นชุดตัวอย่าง 5 จาก 24 โครงการของบริษัท ใบแจ้งหนี้ค้างรับใน
 *   OUTSTANDING_INVOICES จึงเป็นโครงการนอกชุดตัวอย่าง mock ให้สอดคล้องตัวเลข S1
 *   (เงินค้างรับมีก้อนเก่าเกิน 90 วัน ฿1.2M)
 * - เกณฑ์ธุรกิจอ่านจาก Business Rules (S11): วางบิลภายใน 7 วันหลังอนุมัติ ·
 *   ค้างรับเกิน 60 วัน = ไฟแดง — hardcode ชั่วคราวจนกว่ามี data layer จริง
 */

import { PROJECTS } from '../../data/projects'

/** เกณฑ์ตั้งต้นจาก Business Rules (S11) */
export const BILL_WAIT_LIMIT_DAYS = 7
export const AGING_WARN_DAYS = 30
export const AGING_CRITICAL_DAYS = 60

/** ขั้นของงวดในสายการเงิน (ส่วนท้ายของสถานะงวดงาน 6 ขั้น) */
export type BillingStage = 'approved' | 'billed' | 'paid'

export interface BillingItem {
  /** `${รหัสโครงการ}-${เลขงวด}` — ใช้เป็น key ของ state */
  id: string
  code: string
  project: string
  client: string
  phaseNo: number
  phaseName: string
  value: number
  stage: BillingStage
  /** stage = approved: รอวางบิลมากี่วันนับจากวันที่ลูกค้าอนุมัติ */
  waitingDays: number
  /** stage = billed/paid: วันที่วางบิล และอายุหนี้ (วัน) */
  billedOn: string | null
  agingDays: number
  billedThisMonth: boolean
  /** stage = paid: วันที่รับเงิน */
  paidOn: string | null
  paidThisMonth: boolean
}

interface PhaseBillingMeta {
  waitingDays?: number
  billedOn?: string
  agingDays?: number
  paidOn?: string
  paidThisMonth?: boolean
}

/** วันที่/อายุ mock รายงวด — วันนี้คือ อังคาร 4 ส.ค. 2569 */
const PHASE_BILLING_META: Record<string, PhaseBillingMeta> = {
  // อนุมัติ 23 ก.ค. 69 → รอมา 12 วัน เกินเกณฑ์ 7 วัน — ตรงการ์ดเตือนใน S1
  'AR-2025-011-4': { waitingDays: 12 },
  // รับเงินต้นเดือน ส.ค. — แสดงในส่วน "รับเงินแล้วเดือนนี้"
  'AR-2025-011-3': { billedOn: '18 มิ.ย. 69', paidOn: '2 ส.ค. 69', paidThisMonth: true },
  'ID-2026-009-1': { billedOn: '30 มิ.ย. 69', paidOn: '1 ส.ค. 69', paidThisMonth: true },
  // งวด paid อื่น ๆ รับเงินก่อนเดือนนี้ — ไม่อยู่ในขอบเขตหน้านี้
}

/** แปลงงวดจากทะเบียนกลางเป็นรายการฝั่งการเงิน */
function itemsFromProjects(): BillingItem[] {
  const items: BillingItem[] = []
  for (const p of PROJECTS) {
    for (const ph of p.phases) {
      const id = `${p.code}-${ph.no}`
      const meta = PHASE_BILLING_META[id]
      const base = {
        id,
        code: p.code,
        project: p.name,
        client: p.client,
        phaseNo: ph.no,
        phaseName: ph.name,
        value: ph.value,
      }
      if (ph.status === 'approved') {
        items.push({
          ...base,
          stage: 'approved',
          waitingDays: meta?.waitingDays ?? 0,
          billedOn: null,
          agingDays: 0,
          billedThisMonth: false,
          paidOn: null,
          paidThisMonth: false,
        })
      } else if (ph.status === 'billed') {
        items.push({
          ...base,
          stage: 'billed',
          waitingDays: 0,
          billedOn: meta?.billedOn ?? null,
          agingDays: meta?.agingDays ?? 0,
          billedThisMonth: false,
          paidOn: null,
          paidThisMonth: false,
        })
      } else if (ph.status === 'paid' && meta?.paidThisMonth) {
        items.push({
          ...base,
          stage: 'paid',
          waitingDays: 0,
          billedOn: meta.billedOn ?? null,
          agingDays: 0,
          billedThisMonth: false,
          paidOn: meta.paidOn ?? null,
          paidThisMonth: true,
        })
      }
    }
  }
  return items
}

/**
 * ใบแจ้งหนี้ค้างรับจากโครงการนอกชุดตัวอย่าง PROJECTS (บริษัทมี 24 โครงการ)
 * ครอบคลุมครบสามช่วงอายุหนี้ <30 · 30–60 · >60 วัน ให้ตรงภาพรวม S1
 */
const OUTSTANDING_INVOICES: BillingItem[] = [
  {
    id: 'ID-2025-018-3',
    code: 'ID-2025-018',
    project: 'โรงแรมล้านนา เชียงใหม่',
    client: 'บจก. ล้านนา ฮอสพิทาลิตี้',
    phaseNo: 3,
    phaseName: 'Working Drawing + FF&E',
    value: 950_000,
    stage: 'billed',
    waitingDays: 0,
    billedOn: '10 ก.ค. 69',
    agingDays: 25,
    billedThisMonth: false,
    paidOn: null,
    paidThisMonth: false,
  },
  {
    id: 'AR-2025-006-2',
    code: 'AR-2025-006',
    project: 'โรงงานอาหารอยุธยา',
    client: 'บจก. อยุธยา ฟู้ดส์',
    phaseNo: 2,
    phaseName: 'Schematic',
    value: 1_400_000,
    stage: 'billed',
    waitingDays: 0,
    billedOn: '20 มิ.ย. 69',
    agingDays: 45,
    billedThisMonth: false,
    paidOn: null,
    paidThisMonth: false,
  },
  {
    id: 'HS-2025-003-3',
    code: 'HS-2025-003',
    project: 'บ้านคุณวิภา พัฒนาการ',
    client: 'คุณวิภา',
    phaseNo: 3,
    phaseName: 'แบบก่อสร้าง + ขออนุญาต',
    value: 1_200_000,
    stage: 'billed',
    waitingDays: 0,
    billedOn: '28 เม.ย. 69',
    agingDays: 98,
    billedThisMonth: false,
    paidOn: null,
    paidThisMonth: false,
  },
]

export const INITIAL_BILLING_ITEMS: BillingItem[] = [
  ...itemsFromProjects(),
  ...OUTSTANDING_INVOICES,
]

/** งวดที่ส่งลูกค้าแล้วรออนุมัติ — จะเข้าคิววางบิลเมื่อลูกค้าอนุมัติ */
export const AWAITING_APPROVAL = PROJECTS.flatMap((p) =>
  p.phases
    .filter((ph) => ph.status === 'delivered')
    .map((ph) => ({ code: p.code, phaseNo: ph.no, phaseName: ph.name, value: ph.value })),
)
