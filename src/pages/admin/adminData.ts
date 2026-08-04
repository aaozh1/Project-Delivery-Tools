/**
 * ข้อมูลและตรรกะของ Admin Console (S11)
 * ที่มา: docs/design-handoff/designs/Admin Console.dc.html (source of truth)
 * DEFAULTS = ค่าที่ระบบบันทึกไว้ล่าสุด — dirty state เทียบทุกคีย์กับชุดนี้แบบ string
 * ยังไม่มี data layer — ค่าคงที่ในไฟล์นี้จะถูกแทนด้วยการอ่าน/เขียนจริงภายหลัง
 */

export type AdminView = 'rules' | 'rates' | 'audit'

export interface AdminMenuItem {
  key: string
  label: string
  chip?: string
  /** หมวดที่คลิกสลับได้ใน prototype นี้ — หมวดอื่นเป็นรายการเฉย ๆ */
  view?: AdminView
}

export const ADMIN_MENU: AdminMenuItem[] = [
  { key: 'users', label: 'ผู้ใช้และสิทธิ์' },
  { key: 'squads', label: 'Squad และแผนก' },
  { key: 'rates', label: 'อัตราค่าแรง', chip: 'จำกัดสิทธิ์', view: 'rates' },
  { key: 'templates', label: 'Template' },
  { key: 'rules', label: 'กฎธุรกิจ', view: 'rules' },
  { key: 'alloc', label: 'การจัดสรรคน' },
  { key: 'growth', label: 'พัฒนาคน' },
  { key: 'overhead', label: 'ต้นทุนส่วนกลาง' },
  { key: 'calendar', label: 'ปฏิทิน / วันหยุด' },
  { key: 'notify', label: 'การแจ้งเตือน' },
  { key: 'audit', label: 'Audit Log', view: 'audit' },
]

export const RULE_DEFAULTS = {
  marginAR: '30',
  marginID: '32',
  marginHS: '28',
  marginGR: '40',
  warnGap: '5',
  critGap: '15',
  billDays: '7',
  arDays: '60',
  fullWeek: '1.00',
  step: '0.25',
  overload: '1.00',
  underPct: '65',
  underMonths: '2',
  utilTarget: '75',
  maxSr: '2',
  maxMid: '3',
  maxJr: '2',
  squadMin: '3',
  squadMax: '6',
  projPerSquad: '4',
  moveWeeks: '8',
  borrow: 'hod',
} satisfies Record<string, string>

export type RuleKey = keyof typeof RULE_DEFAULTS
export type RuleValues = Record<RuleKey, string>

export const RULE_KEYS = Object.keys(RULE_DEFAULTS) as RuleKey[]

/** ชื่อค่าที่ใช้ในกล่องยืนยัน (modal "ค่าที่เปลี่ยน") */
export const RULE_LABELS: Record<RuleKey, string> = {
  marginAR: 'เป้า Margin — สถาปัตยกรรม (%)',
  marginID: 'เป้า Margin — ตกแต่งภายใน (%)',
  marginHS: 'เป้า Margin — บ้านพักอาศัย (%)',
  marginGR: 'เป้า Margin — กราฟิก (%)',
  warnGap: 'เกณฑ์เตือน — ส่วนต่าง (จุด)',
  critGap: 'เกณฑ์วิกฤต — ส่วนต่าง (จุด)',
  billDays: 'อนุมัติแล้วยังไม่วางบิล (วัน)',
  arDays: 'เงินค้างรับ (วัน)',
  fullWeek: 'สัปดาห์เต็ม (คน-สัปดาห์)',
  step: 'ขั้นการป้อน (คน-สัปดาห์)',
  overload: 'เกณฑ์เกินกำลัง (คน-สัปดาห์)',
  underPct: 'เกณฑ์โหลดต่ำ (%)',
  underMonths: 'โหลดต่ำติดต่อกัน (เดือน)',
  utilTarget: 'เป้าการใช้กำลังคน (%)',
  maxSr: 'โครงการพร้อมกัน — Senior',
  maxMid: 'โครงการพร้อมกัน — Mid',
  maxJr: 'โครงการพร้อมกัน — Junior',
  squadMin: 'ขนาด Squad ต่ำสุด (คน)',
  squadMax: 'ขนาด Squad สูงสุด (คน)',
  projPerSquad: 'โครงการต่อ Squad',
  moveWeeks: 'ย้ายชั่วคราวสูงสุด (สัปดาห์)',
  borrow: 'การยืมคนข้าม Squad',
}

/** แปลงค่าเก็บ → ค่าอ่านได้ (เฉพาะ borrow ที่ไม่ใช่ตัวเลข) */
export function formatRuleValue(key: RuleKey, value: string): string {
  if (key === 'borrow') return value === 'hod' ? 'ผ่านการอนุมัติ HoD' : 'ไม่อนุญาต'
  return value
}

/** โครงการ Active ที่ใช้คำนวณผลกระทบจริงเมื่อเกณฑ์วิกฤตเปลี่ยน */
export interface RuleProject {
  code: string
  name: string
  /** ส่วนต่าง = ใช้คน-สัปดาห์ไป % ลบ ความคืบหน้า % */
  gap: number
}

export const ACTIVE_PROJECTS: RuleProject[] = [
  { code: 'AR-2026-005', name: 'อาคารพาณิชย์ ลาดพร้าว', gap: 18 },
  { code: 'ID-2026-009', name: 'สำนักงาน BTS อโศก', gap: 17 },
  { code: 'HS-2026-003', name: 'บ้านคุณวิภา', gap: 16 },
  { code: 'GR-2026-008', name: 'Campaign ฤดูฝน', gap: 19 },
  { code: 'ID-2026-004', name: 'Café ทองหล่อ', gap: 87 },
]

export interface CritImpact {
  /** เกณฑ์วิกฤตถูกแก้จากค่าเดิม (และ parse เป็นตัวเลขได้) */
  changed: boolean
  /** ผ่อนเกณฑ์ลง (ค่าใหม่ > ค่าเดิม) */
  loosening: boolean
  critDef: number
  crit: number
  /** โครงการที่พลิกสถานะ: ผ่อน → gap > เดิม && gap ≤ ใหม่ (แดง→เหลือง) · เข้ม → gap > ใหม่ && gap ≤ เดิม (เหลือง→แดง) */
  flipped: RuleProject[]
  /** โครงการที่ยังเป็นวิกฤตไม่ว่าเกณฑ์เดิมหรือใหม่ */
  stillRed: RuleProject[]
}

export function computeCritImpact(values: RuleValues, saved: RuleValues = RULE_DEFAULTS): CritImpact {
  const critDef = Number.parseFloat(saved.critGap)
  const crit = Number.parseFloat(values.critGap)
  const changed = !Number.isNaN(crit) && crit !== critDef
  const loosening = changed && crit > critDef
  const flipped = !changed
    ? []
    : loosening
      ? ACTIVE_PROJECTS.filter((p) => p.gap > critDef && p.gap <= crit)
      : ACTIVE_PROJECTS.filter((p) => p.gap > crit && p.gap <= critDef)
  const stillRed = !changed
    ? []
    : ACTIVE_PROJECTS.filter((p) => p.gap > Math.max(crit, critDef))
  return { changed, loosening, critDef, crit, flipped, stillRed }
}

/** สายอนุมัติ 4 เงื่อนไขตั้งต้น */
export interface ApprovalRule {
  condition: string
  approver: string
}

export const APPROVAL_RULES: ApprovalRule[] = [
  { condition: 'โครงการมูลค่าต่ำกว่า ฿1M', approver: 'HoD อนุมัติได้เลย' },
  { condition: 'โครงการมูลค่าตั้งแต่ ฿1M ขึ้นไป', approver: 'HoD + HoPD' },
  { condition: 'แผนงานที่ Margin ต่ำกว่าเป้าสายงาน', approver: 'HoPD บังคับทุกกรณี' },
  { condition: 'คำขอย้ายคนข้าม Squad', approver: 'HoD ของแผนกนั้น' },
]

/** ตารางอัตราค่าแรง — ค่า real แสดงเฉพาะเมื่อผู้ใช้กดเปิดดู (บันทึก Audit Log ทุกครั้ง) */
export interface RateRow {
  role: string
  headcount: number
  real: string
  updated: string
}

export const RATE_ROWS: RateRow[] = [
  { role: 'Principal', headcount: 2, real: '฿86,000', updated: '1 ม.ค. 2569' },
  { role: 'Senior', headcount: 6, real: '฿60,000', updated: '1 ม.ค. 2569' },
  { role: 'Mid', headcount: 11, real: '฿40,000', updated: '1 ม.ค. 2569' },
  { role: 'Junior', headcount: 14, real: '฿24,800', updated: '1 เม.ย. 2569' },
  { role: 'Intern', headcount: 3, real: '฿9,600', updated: '1 เม.ย. 2569' },
]
