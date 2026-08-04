import { PROJECTS, type Project, type ProjectPhase } from '../../data/projects'

/**
 * Mock data ของ VO & Revision Log (S8) — หน้านี้ไม่มี prototype ใน handoff
 * ออกแบบตาม brief §6 (S8: "แถมงานไปกี่บาท แก้กี่รอบ?") + ภาคผนวก C (VariationOrder)
 * รายการ VO อิงโครงการจริงใน src/data/projects.ts — แทนที่ด้วย API เมื่อมี data layer จริง
 */

/** ที่มาของ VO 3 ชนิด ตาม brief ภาคผนวก C */
export type VoSource = 'revision_over_quota' | 'client_request' | 'scope_gap'

export type VoStatus = 'proposed' | 'billable' | 'goodwill' | 'rejected'

export interface Vo {
  id: string
  projectCode: string
  source: VoSource
  detail: string
  /** ประเมินแรงงานเพิ่ม (ทวีคูณ 0.25) — ต้นทุน = ค่านี้ × เรตกลาง */
  personWeeks: number
  status: VoStatus
  /** มูลค่าที่ตกลงเรียกเก็บ (เฉพาะอนุมัติเก็บเงิน) — ไม่ระบุ = ใช้ต้นทุนประเมิน */
  agreedValue?: number
  /** เหตุผลประกอบ (บังคับเมื่อตัดสินใจแถม · ใช้กับปฏิเสธด้วย) */
  reason?: string
  decidedBy?: string
  decidedDate?: string
  /** ผูกกับงวดที่แก้เกินโควตา รูปแบบ `${code}#${phaseNo}` — ใช้ตัดรายการ "ยังไม่ตัดสิน" */
  linkedPhase?: string
  submittedBy: string
  submittedDate: string
}

/**
 * เรตกลางเฉลี่ยต่อคน-สัปดาห์ของทีมผสม — เฉลี่ยจากเรตกลางตามตำแหน่งที่ใช้ในหน้าวางแผน S3
 * (Senior ฿30,000 · Mid ฿17,000 · Junior ฿10,000) ใช้ประเมิน VO เท่านั้น ไม่ใช่เงินเดือนจริง
 * เมื่อมี data layer จริง ค่านี้ต้องอ่านจาก Business Rules (S11) ไม่ hardcode
 */
export const BLENDED_RATE = 19_000

/** ต้นทุนประเมินของ VO = คน-สัปดาห์ × เรตกลาง */
export function voCost(pw: number): number {
  return pw * BLENDED_RATE
}

/** วันนี้ในรูปแบบไทยย่อ — mock ให้ตรงกับวันอ้างอิงของระบบ (4 สิงหาคม 2569) */
export const TODAY_LABEL = '4 ส.ค. 2569'

export interface VoSourceMeta {
  label: string
  glyph: string
  boxBg: string
  boxBorder: string
  boxStyle: 'solid' | 'dashed'
  glyphColor: string
}

/**
 * ป้ายที่มา 3 ชนิด — ต่างกันทั้งรูปสัญลักษณ์และน้ำหนักหมึก (ทึบ/เส้น/เส้นประ)
 * จึงแยกได้แม้พิมพ์ขาวดำ ไม่พึ่งสี — แนวเดียวกับ REVIEW_KINDS ของ S2
 */
export const SOURCE_META: Record<VoSource, VoSourceMeta> = {
  revision_over_quota: {
    label: 'เกินโควตาแก้แบบ',
    glyph: '↻',
    boxBg: 'var(--dpm-surface)',
    boxBorder: 'var(--dpm-sub)',
    boxStyle: 'dashed',
    glyphColor: 'var(--dpm-ink)',
  },
  client_request: {
    label: 'ลูกค้าขอเพิ่ม',
    glyph: '+',
    boxBg: 'var(--dpm-ink)',
    boxBorder: 'var(--dpm-ink)',
    boxStyle: 'solid',
    glyphColor: 'var(--dpm-bg)',
  },
  scope_gap: {
    label: 'ช่องว่างขอบเขต',
    glyph: '▤',
    boxBg: 'var(--dpm-surface)',
    boxBorder: 'var(--dpm-ink)',
    boxStyle: 'solid',
    glyphColor: 'var(--dpm-ink)',
  },
}

export const SOURCE_ORDER: VoSource[] = ['revision_over_quota', 'client_request', 'scope_gap']

/** สถานะ VO — สัญลักษณ์คู่สีเสมอ อ่านได้แม้พิมพ์ขาวดำ */
export const VO_STATUS_META: Record<VoStatus, { mark: string; color: string; label: string }> = {
  proposed: { mark: '○', color: 'var(--dpm-blue)', label: 'เสนอ · รออนุมัติ' },
  billable: { mark: '✓', color: 'var(--dpm-green)', label: 'อนุมัติเก็บเงิน' },
  goodwill: { mark: '✓', color: 'var(--dpm-sub)', label: 'ตัดสินใจแถม' },
  rejected: { mark: '✕', color: 'var(--dpm-mute)', label: 'ปฏิเสธ' },
}

/**
 * รายการ VO ตั้งต้น — เรียงใหม่สุดก่อน ครบทั้ง 3 ที่มาและ 4 สถานะ
 * มูลค่า/วันที่สมมติให้สอดคล้องเรื่องราวของโครงการใน PROJECTS
 */
export const INITIAL_VOS: Vo[] = [
  {
    id: 'VO-2026-018',
    projectCode: 'ID-2026-004',
    source: 'client_request',
    detail: 'ลูกค้าขอเพิ่มบาร์กาแฟชั้นลอย + งานไฟพิเศษเหนือเคาน์เตอร์ (นอกแบบ Concept ที่อนุมัติ)',
    personWeeks: 3,
    status: 'proposed',
    submittedBy: 'คุณเอ (Senior)',
    submittedDate: '30 ก.ค. 2569',
  },
  {
    id: 'VO-2026-017',
    projectCode: 'AR-2026-002',
    source: 'client_request',
    detail: 'เพิ่มแบบสำนักงานหน้าโกดัง 120 ตร.ม. พร้อมโครงสร้างเบา — ลูกค้าขอหลังเห็น Schematic',
    personWeeks: 2.5,
    status: 'proposed',
    submittedBy: 'คุณบี (BD)',
    submittedDate: '28 ก.ค. 2569',
  },
  {
    id: 'VO-2026-016',
    projectCode: 'AR-2025-011',
    source: 'scope_gap',
    detail: 'แบบขยายภูมิทัศน์ลานหน้าอาคาร — สัญญาเดิมระบุขอบเขตเฉพาะตัวอาคาร',
    personWeeks: 4.5,
    status: 'billable',
    agreedValue: 120_000,
    decidedBy: 'คุณณัฐพงศ์ (HoPD)',
    decidedDate: '22 ก.ค. 2569',
    submittedBy: 'คุณเอ (Senior)',
    submittedDate: '15 ก.ค. 2569',
  },
  {
    id: 'VO-2026-015',
    projectCode: 'GR-2026-014',
    source: 'client_request',
    detail: 'เพิ่ม brand guideline ฉบับ social media 12 template นอกขอบเขต Final Artwork',
    personWeeks: 1.75,
    status: 'goodwill',
    reason: 'ลูกค้าสัญญาระยะยาว — ลงทุนรักษาความสัมพันธ์',
    decidedBy: 'คุณกิตติ (HoD)',
    decidedDate: '8 ก.ค. 2569',
    submittedBy: 'คุณบี (BD)',
    submittedDate: '1 ก.ค. 2569',
  },
  {
    id: 'VO-2026-014',
    projectCode: 'HS-2026-007',
    source: 'scope_gap',
    detail: 'ขอปรับแบบจากบ้าน 2 ชั้นเป็น 3 ชั้น หลังอนุมัติ Concept แล้ว',
    personWeeks: 6,
    status: 'rejected',
    reason: 'เกินขอบเขตของ VO — เสนอเป็นสัญญาแก้ไขเพิ่มเติม (Amendment) แทน',
    decidedBy: 'คุณณัฐพงศ์ (HoPD)',
    decidedDate: '25 มิ.ย. 2569',
    submittedBy: 'คุณบี (BD)',
    submittedDate: '18 มิ.ย. 2569',
  },
  {
    id: 'VO-2026-012',
    projectCode: 'AR-2025-011',
    source: 'revision_over_quota',
    detail: 'รอบแก้ที่ 3 งวด Schematic (เกินโควตา 1 รอบ) — ปรับ façade ตามข้อสังเกตลูกค้า',
    personWeeks: 2,
    status: 'goodwill',
    reason: 'ต้นเหตุจากบรีฟภายในคลาดเคลื่อน — บริษัทรับผิดชอบเอง',
    decidedBy: 'คุณณัฐพงศ์ (HoPD)',
    decidedDate: '12 มิ.ย. 2569',
    submittedBy: 'คุณเอ (Senior)',
    submittedDate: '5 มิ.ย. 2569',
  },
]

/** งวดที่แก้แบบเกินโควตา — คำนวณจากทะเบียนโครงการกลาง (ID-2026-004 งวด 3 · ID-2026-009 งวด 2) */
export interface OverQuotaPhase {
  /** `${code}#${phaseNo}` ใช้ผูกกับ Vo.linkedPhase */
  key: string
  project: Project
  phase: ProjectPhase
  overCount: number
}

export const OVER_QUOTA_PHASES: OverQuotaPhase[] = PROJECTS.flatMap((project) =>
  project.phases
    .filter((phase) => phase.revisionUsed > phase.revisionQuota)
    .map((phase) => ({
      key: `${project.code}#${phase.no}`,
      project,
      phase,
      overCount: phase.revisionUsed - phase.revisionQuota,
    })),
)
