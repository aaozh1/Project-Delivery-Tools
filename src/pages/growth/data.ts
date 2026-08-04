/**
 * Mock data ของหน้า Growth Profile (S14)
 * ค่าตรงกับ prototype `docs/design-handoff/designs/Growth Profile.dc.html`
 * — แทนที่ด้วย data layer จริงเมื่อพร้อม (exposure matrix + บันทึกรายสัปดาห์ + ค่าเฉลี่ยแผนก)
 *
 * กติกาจริยธรรมของหน้านี้ (ต้อง enforce ในโค้ด):
 * ใช้คำว่า "ยังไม่เคย" ห้ามใช้ "ขาด"/"อ่อน" · ไม่มีคะแนน/เกรด/% compliance
 * เทียบได้เฉพาะกับตัวเองในอดีตและค่าเฉลี่ยแผนกเท่านั้น
 */

/** 0 = ยังไม่เคย · 1 = เคย · 2 = ชำนาญ */
export type ExposureLevel = 0 | 1 | 2

export interface ExposureRow {
  label: string
  note: string
  cells: ExposureLevel[]
}

/** ขั้นตอนงาน (คอลัมน์ของ Exposure Matrix) */
export const STAGES = ['Concept', 'DD / 3D', 'Working', 'FF&E', 'Site', 'Permit']

/** ประเภทงาน (แถวของ Exposure Matrix) */
export const EXPOSURE_ROWS: ExposureRow[] = [
  { label: 'ที่พักอาศัย', note: 'บ้าน · คอนโด', cells: [2, 2, 2, 1, 0, 0] },
  { label: 'ร้านอาหาร', note: 'คาเฟ่ · ร้านอาหาร', cells: [1, 2, 2, 1, 0, 0] },
  { label: 'สำนักงาน', note: 'ออฟฟิศ · co-working', cells: [0, 1, 1, 0, 0, 0] },
  { label: 'Retail', note: 'ร้านค้าปลีก · showroom', cells: [0, 0, 0, 0, 0, 0] },
]

export interface OneOnOneTopic {
  id: number
  title: string
  why: string
}

/** หัวข้อ 1-on-1 ที่ระบบเสนอจากข้อมูลในหน้า — ผู้ใช้ลบ/เพิ่มเองได้ */
export const SUGGESTED_TOPICS: OneOnOneTopic[] = [
  {
    id: 1,
    title: 'หาทางให้ได้คุมหน้างานจริงภายในไตรมาสนี้',
    why: 'เป็นช่องว่างเดียวที่ขัดเส้นทางขึ้น Senior — ต้องอาศัยงานของ Squad อื่น',
  },
  {
    id: 2,
    title: 'จับคู่ผู้สอน Revit Family',
    why: 'ขอไว้เมื่อสัปดาห์ 32 และยังไม่มีใครตอบ',
  },
  {
    id: 3,
    title: 'อยากลองงาน Retail ไหม',
    why: 'ยังไม่เคยทำทั้งแถว — แผนกมี 2 โครงการ Retail เริ่มไตรมาสหน้า',
  },
]

/** สรุป 12 เดือน + การติดตาม */
export const PROFILE = {
  name: 'คุณซี',
  role: 'Mid-level Interior Designer',
  squadLine: 'Squad A · ร่วมงาน 2 ปี 4 เดือน',
  periodLabel: 'ส.ค. 2568 – ก.ค. 2569',
  projectCount: 7,
  totalPersonWeeks: 44,
  /** ลักษณะงาน 12 เดือน — รวม 100% */
  workMix: [
    { label: 'ตามแผน', pct: 74, color: 'var(--dpm-ink)' },
    { label: 'แก้ตามลูกค้า', pct: 19, color: 'var(--dpm-mute)' },
    { label: 'แก้งานเดิม', pct: 7, color: 'var(--dpm-yellow)' },
  ],
  /** แถบเทียบเดียวของหน้า: แก้งานเดิมของตัวเอง vs ค่าเฉลี่ยแผนก */
  reworkSelfPct: 7,
  reworkDeptAvgPct: 9,
  frequentSkills: ['AutoCAD', 'SketchUp', 'Enscape'],
  newSkill: { label: 'Revit', since: 'ใหม่ · เริ่มใช้ มี.ค. 2569' },
  weeklyLogDone: 44,
  weeklyLogTotal: 48,
  helpRequest: {
    quote: '“อยากได้คนสอน Revit Family”',
    meta: 'สัปดาห์ 32 · รอมา 1 สัปดาห์',
  },
  nextOneOnOne: '1-on-1 ครั้งถัดไป 14 ส.ค.',
}
