import type { RequestKind } from '../../components/RequestCard'

/**
 * Mock data ของ Department Board (S2) — ค่าตาม prototype
 * `docs/design-handoff/designs/Department Board.dc.html`
 * ยังไม่มี data layer — แทนที่ module นี้ด้วยข้อมูลจริงเมื่อต่อ backend
 */

/** 4 ชนิดของรายการรอรีวิว — เป็นการตัดสินใจคนละแบบสิ้นเชิง ต้องแยกออกในเสี้ยววินาที */
export type ReviewKind = 'deliver' | 'plan' | 'revision' | 'move'

export interface ReviewKindMeta {
  label: string
  /** บรรทัดบอกประเภทการตัดสินใจ */
  hint: string
  glyph: string
  boxBg: string
  boxBorder: string
  boxStyle: 'solid' | 'dashed'
  glyphColor: string
}

/**
 * กล่องสัญลักษณ์ 4 ชนิด — ต่างกันทั้งรูปและน้ำหนักหมึก
 * จึงแยกได้แม้พิมพ์ขาวดำ (ไม่พึ่งสี)
 */
export const REVIEW_KINDS: Record<ReviewKind, ReviewKindMeta> = {
  deliver: {
    label: 'งานส่งมอบ',
    hint: 'ตรวจคุณภาพงาน',
    glyph: '▣',
    boxBg: 'var(--dpm-ink)',
    boxBorder: 'var(--dpm-ink)',
    boxStyle: 'solid',
    glyphColor: 'var(--dpm-bg)',
  },
  plan: {
    label: 'แผนงาน',
    hint: 'อนุมัติตัวเลข',
    glyph: '▤',
    boxBg: 'var(--dpm-surface)',
    boxBorder: 'var(--dpm-ink)',
    boxStyle: 'solid',
    glyphColor: 'var(--dpm-ink)',
  },
  revision: {
    label: 'เกินโควตาแก้แบบ',
    hint: 'ตัดสินเชิงพาณิชย์',
    glyph: '↻',
    boxBg: 'var(--dpm-surface)',
    boxBorder: 'var(--dpm-sub)',
    boxStyle: 'dashed',
    glyphColor: 'var(--dpm-ink)',
  },
  move: {
    label: 'ย้ายคน',
    hint: 'จัดคนข้าม Squad',
    glyph: '⇄',
    boxBg: 'var(--dpm-subtle)',
    boxBorder: 'var(--dpm-border)',
    boxStyle: 'solid',
    glyphColor: 'var(--dpm-ink)',
  },
}

/** ลำดับชนิดใน legend มุมขวาของหัวข้อ */
export const REVIEW_KIND_ORDER: ReviewKind[] = ['deliver', 'plan', 'revision', 'move']

export interface ReviewItem {
  kind: ReviewKind
  code: string
  title: string
  /** จำนวนวันที่รอ — ใช้ทั้งเรียงลำดับ แถบความเร่งด่วน และสัญลักษณ์ */
  waitDays: number
  detail: string
  /** บรรทัด "ต้องทำ:" หรือคำถามที่ต้องตอบ */
  sub: string
  /** ปุ่มหลักตามชนิด (ตรวจ / ดู / ตัดสิน / พิจารณา) */
  cta: string
  /** ลิงก์ทางเลือกที่สอง */
  cta2: string
}

export const REVIEW_ITEMS: ReviewItem[] = [
  {
    kind: 'deliver',
    code: 'ID-2026-004',
    title: 'ส่งงาน งวด 3',
    waitDays: 5,
    detail: 'Deliverable ครบ 12/12 · Café ทองหล่อ · Squad A',
    sub: 'เกินเกณฑ์รีวิว 3 วัน — ลูกค้านัดประชุม 6 ส.ค.',
    cta: 'ตรวจ',
    cta2: 'มอบให้คนอื่นตรวจ',
  },
  {
    kind: 'plan',
    code: 'ID-2026-011',
    title: 'แผนงานโครงการ',
    waitDays: 4,
    detail: 'โดยคุณเอ · Margin 18% — ต่ำกว่าเป้า 30% อยู่ 12 จุด',
    sub: 'ต้องทำ: อนุมัติทั้งที่ต่ำกว่าเป้า หรือให้กลับไปตัดขอบเขต',
    cta: 'ดู',
    cta2: 'ส่งกลับให้แก้',
  },
  {
    kind: 'revision',
    code: 'ID-2026-009',
    title: 'ขอแก้แบบรอบที่ 3',
    waitDays: 3,
    detail: 'เกินโควตา 2 รอบ · ต้นทุนเพิ่มประมาณ 2.5 คน-สัปดาห์ (฿100,000)',
    sub: 'คำถาม: เก็บเงินเพิ่ม หรือ แถมเพื่อรักษาความสัมพันธ์?',
    cta: 'ตัดสิน',
    cta2: 'ขอความเห็น BD',
  },
  {
    kind: 'move',
    code: 'Squad A → C',
    title: 'ขอย้ายคุณซี 4 สัปดาห์',
    waitDays: 2,
    detail: 'เหตุผล: ต้องการประสบการณ์งาน Site ที่ Squad A ไม่มี',
    sub: 'ผลกระทบ: Squad A ลดลง 0.5 คน-สัปดาห์/สัปดาห์ ใน ก.ย.',
    cta: 'พิจารณา',
    cta2: 'คุยกับหัวหน้า Squad',
  },
  {
    kind: 'deliver',
    code: 'ID-2026-020',
    title: 'ส่งงาน งวด 1',
    waitDays: 1,
    detail: 'Deliverable ครบ 8/8 · ร้านอาหารเอกมัย · Squad B',
    sub: 'ยังอยู่ในเกณฑ์รีวิว 2 วัน',
    cta: 'ตรวจ',
    cta2: 'มอบให้คนอื่นตรวจ',
  },
]

/** สมดุล Squad — 3 เดือนข้างหน้า */
export const BALANCE_MONTHS = ['ส.ค. 69', 'ก.ย. 69', 'ต.ค. 69']

export interface SquadBalance {
  name: string
  lead: string
  /** % โหลดรายเดือน ตามลำดับ BALANCE_MONTHS */
  pcts: [number, number, number]
}

export const SQUAD_BALANCE: SquadBalance[] = [
  { name: 'Squad A', lead: 'คุณเอ · 4 คน', pcts: [102, 96, 96] },
  { name: 'Squad B', lead: 'คุณเอฟ · 6 คน', pcts: [88, 92, 118] },
  { name: 'Squad C', lead: 'คุณจีน · 6 คน', pcts: [76, 80, 85] },
]

/** คำขอกำลังเสริม — แสดงผ่าน RequestCard */
export interface ReinforcementRequest {
  id: string
  kind: RequestKind
  body: string
  reason: string
  age: string
  impact: string
}

export const REINFORCEMENT_REQUESTS: ReinforcementRequest[] = [
  {
    id: 'req-squad-b-mid',
    kind: 'capacity',
    body: 'Squad B ขอ Mid เพิ่ม 1 คน เป็นเวลา 6 สัปดาห์',
    reason: 'เหตุผล: ID-2026-020 เข้างวด DD · Squad C มีคุณเคว่างพอ 0.5 คน-สัปดาห์/สัปดาห์',
    age: 'ขอมา 2 วัน',
    impact: 'ผลกระทบ: Squad C ขึ้นเป็น 96% ใน ต.ค.',
  },
  {
    id: 'req-squad-a-site',
    kind: 'transfer',
    body: 'Squad A ขอให้คุณซีได้งาน Site เพื่อการเติบโต',
    reason: 'Squad A ไม่มีงาน Site ใน 6 เดือนข้างหน้า — ต้องอาศัยงานของ Squad อื่น',
    age: 'ขอมา 4 วัน',
    impact: 'ผลกระทบ: 3 โครงการที่มีช่วงคุมงานใน ก.ย.–ธ.ค.',
  },
]
