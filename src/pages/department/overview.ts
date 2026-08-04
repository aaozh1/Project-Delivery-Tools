/**
 * ข้อมูลภาพรวมแผนกชุดใหม่ตาม feedback ผู้ใช้ — S2 Department Board
 * Stage การทำงาน 11 ขั้น: Potential/PP/CD/SD/DD/PM/EIA/TD/CR/CP/Done
 * ชื่อเต็มยืนยันโดยผู้ใช้แล้ว (4 ส.ค. 2569) — ย้ายเข้า Admin Console (ตั้งค่าได้)
 * เมื่อมี data layer จริง
 */

export const STAGES = [
  'Potential',
  'PP',
  'CD',
  'SD',
  'DD',
  'PM',
  'EIA',
  'TD',
  'CR',
  'CP',
  'Done',
] as const

export type Stage = (typeof STAGES)[number]

/** ชื่อเต็มของแต่ละ stage — แสดงเป็น tooltip/legend */
export const STAGE_LABELS: Record<Stage, string> = {
  Potential: 'โอกาสงาน ยังไม่เซ็นสัญญา',
  PP: 'Programing & Proposal',
  CD: 'Conceptual Design',
  SD: 'Schematic Design',
  DD: 'Design Development',
  PM: 'Permission Drawing Package',
  EIA: 'รายงานผลกระทบสิ่งแวดล้อม (EIA)',
  TD: 'Tender Document',
  CR: 'Construction Reference Drawing Package',
  CP: 'Construction Process',
  Done: 'ปิดโครงการ',
}

/* ── ปฏิทินของมุมมอง — 8 เดือน: ย้อนหลัง 3 · เดือนนี้ · ล่วงหน้า 4 ── */
export const MONTHS = ['พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'] as const
export const CURRENT_MONTH_INDEX = 3 // ส.ค. 69

/* ── โครงสร้าง Squad ── */
export interface SquadMember {
  name: string
  position: string
  isLead?: boolean
}

export interface SquadInfo {
  id: string
  lead: string
  members: SquadMember[]
}

export const SQUADS: SquadInfo[] = [
  {
    id: 'A',
    lead: 'คุณเอ',
    members: [
      { name: 'คุณเอ', position: 'Senior', isLead: true },
      { name: 'คุณซี', position: 'Mid' },
      { name: 'คุณดี', position: 'Junior' },
      { name: 'คุณอี', position: 'Junior' },
    ],
  },
  {
    id: 'B',
    lead: 'คุณเอฟ',
    members: [
      { name: 'คุณเอฟ', position: 'Senior', isLead: true },
      { name: 'คุณจอย', position: 'Mid' },
      { name: 'คุณเจน', position: 'Mid' },
      { name: 'คุณโจ้', position: 'Junior' },
      { name: 'คุณแจม', position: 'Junior' },
      { name: 'คุณจุน', position: 'Draftsman' },
    ],
  },
  {
    id: 'C',
    lead: 'คุณจี',
    members: [
      { name: 'คุณจี', position: 'Senior', isLead: true },
      { name: 'คุณเกด', position: 'Mid' },
      { name: 'คุณก้อง', position: 'Junior' },
      { name: 'คุณกิ๊ฟ', position: 'Junior' },
      { name: 'คุณเก่ง', position: 'Draftsman' },
    ],
  },
]

/* ── โครงการบน timeline ── */
export interface ProjectPerson {
  name: string
  position: string
  /** ช่วงเดือนที่เข้ามาช่วย (ดัชนีใน MONTHS, รวมปลายทาง) */
  from: number
  to: number
  /** stage ที่เข้าไปช่วย */
  stages: Stage[]
}

export interface TimelineProject {
  code: string
  name: string
  active: boolean
  /** stage ตามแผนเดิม รายเดือน (ดัชนีตรงกับ MONTHS) */
  plan: Stage[]
  /** stage จริง รายเดือน — อนาคต (หลังเดือนปัจจุบัน) = คาดการณ์จาก delay */
  actual: Stage[]
  /** ช้าจากแผนเดิมกี่เดือน (0 = ตามแผน) */
  delayMonths: number
  /** ต้นทุน — เปิดดูเมื่อกดขอ (HoD เห็นยอดรวมจากเรตกลาง) */
  cost: { budget: number; spent: number; forecast: number }
  people: ProjectPerson[]
}

export interface SquadTimeline {
  squadId: string
  projects: TimelineProject[]
  /** โครงการ inactive ของ Squad (พักรอลูกค้า/รอเซ็น) — นับใน KPI แต่ไม่กาง timeline */
  inactive: { code: string; name: string; reason: string }[]
}

export const TIMELINES: SquadTimeline[] = [
  {
    squadId: 'A',
    projects: [
      {
        code: 'ID-2026-004',
        name: 'Café ทองหล่อ',
        active: true,
        plan: ['SD', 'DD', 'DD', 'TD', 'CR', 'CP', 'CP', 'Done'],
        actual: ['SD', 'DD', 'DD', 'DD', 'TD', 'CR', 'CP', 'CP'],
        delayMonths: 2,
        cost: { budget: 900_000, spent: 741_600, forecast: 1_090_000 },
        people: [
          { name: 'คุณเอ', position: 'Senior', from: 0, to: 7, stages: ['SD', 'DD', 'TD'] },
          { name: 'คุณซี', position: 'Mid', from: 1, to: 6, stages: ['DD', 'TD'] },
          { name: 'คุณอี', position: 'Junior', from: 2, to: 5, stages: ['DD'] },
        ],
      },
      {
        code: 'ID-2026-009',
        name: 'สำนักงาน BTS อโศก',
        active: true,
        plan: ['CD', 'CD', 'SD', 'DD', 'DD', 'TD', 'CR', 'CP'],
        actual: ['CD', 'CD', 'SD', 'DD', 'DD', 'TD', 'CR', 'CP'],
        delayMonths: 0,
        cost: { budget: 750_000, spent: 308_000, forecast: 735_000 },
        people: [
          { name: 'คุณเอ', position: 'Senior', from: 0, to: 5, stages: ['CD', 'SD', 'DD'] },
          { name: 'คุณดี', position: 'Junior', from: 2, to: 7, stages: ['SD', 'DD'] },
        ],
      },
      {
        code: 'ID-2026-011',
        name: 'ร้านค้าปลีก สยาม',
        active: true,
        plan: ['PP', 'CD', 'SD', 'SD', 'DD', 'DD', 'TD', 'CR'],
        actual: ['PP', 'CD', 'CD', 'SD', 'SD', 'DD', 'DD', 'TD'],
        delayMonths: 1,
        cost: { budget: 600_000, spent: 118_400, forecast: 640_000 },
        people: [
          { name: 'คุณซี', position: 'Mid', from: 2, to: 7, stages: ['CD', 'SD', 'DD'] },
          { name: 'คุณดี', position: 'Junior', from: 4, to: 7, stages: ['SD', 'DD'] },
        ],
      },
    ],
    inactive: [
      { code: 'ID-2026-017', name: 'เพนต์เฮาส์ สาทร', reason: 'รอลูกค้าเซ็นสัญญา — Potential' },
    ],
  },
  {
    squadId: 'B',
    projects: [
      {
        code: 'ID-2026-020',
        name: 'โรงแรมบูทีค เขาใหญ่',
        active: true,
        plan: ['CD', 'SD', 'SD', 'DD', 'DD', 'PM', 'EIA', 'TD'],
        actual: ['CD', 'SD', 'SD', 'DD', 'DD', 'PM', 'EIA', 'TD'],
        delayMonths: 0,
        cost: { budget: 1_100_000, spent: 396_000, forecast: 1_080_000 },
        people: [
          { name: 'คุณเอฟ', position: 'Senior', from: 0, to: 7, stages: ['CD', 'SD', 'DD'] },
          { name: 'คุณจอย', position: 'Mid', from: 1, to: 6, stages: ['SD', 'DD', 'PM'] },
          { name: 'คุณแจม', position: 'Junior', from: 3, to: 7, stages: ['DD'] },
        ],
      },
      {
        code: 'ID-2026-015',
        name: 'คลินิกทันตกรรม ราชพฤกษ์',
        active: true,
        plan: ['Potential', 'PP', 'CD', 'CD', 'SD', 'DD', 'DD', 'TD'],
        actual: ['Potential', 'PP', 'PP', 'CD', 'CD', 'SD', 'DD', 'DD'],
        delayMonths: 1,
        cost: { budget: 480_000, spent: 62_400, forecast: 505_000 },
        people: [
          { name: 'คุณเจน', position: 'Mid', from: 1, to: 7, stages: ['PP', 'CD', 'SD'] },
          { name: 'คุณโจ้', position: 'Junior', from: 3, to: 7, stages: ['CD', 'SD'] },
        ],
      },
      {
        code: 'ID-2025-021',
        name: 'สำนักงานขาย รัตนาธิเบศร์',
        active: true,
        plan: ['CR', 'CP', 'CP', 'CP', 'Done', 'Done', 'Done', 'Done'],
        actual: ['CR', 'CP', 'CP', 'CP', 'CP', 'Done', 'Done', 'Done'],
        delayMonths: 1,
        cost: { budget: 350_000, spent: 341_000, forecast: 368_000 },
        people: [
          { name: 'คุณเอฟ', position: 'Senior', from: 0, to: 4, stages: ['CR', 'CP'] },
          { name: 'คุณจุน', position: 'Draftsman', from: 0, to: 3, stages: ['CP'] },
        ],
      },
    ],
    inactive: [
      { code: 'ID-2026-019', name: 'รีสอร์ตแม่ริม', reason: 'ลูกค้าพักโครงการ — รองบประมาณรอบใหม่' },
      { code: 'ID-2026-022', name: 'Show Unit บางนา', reason: 'รอผล Potential — ยื่นข้อเสนอแล้ว' },
    ],
  },
  {
    squadId: 'C',
    projects: [
      {
        code: 'ID-2025-018',
        name: 'โรงแรมล้านนา เชียงใหม่',
        active: true,
        plan: ['DD', 'TD', 'TD', 'CR', 'CP', 'CP', 'CP', 'Done'],
        actual: ['DD', 'DD', 'TD', 'TD', 'CR', 'CP', 'CP', 'CP'],
        delayMonths: 1,
        cost: { budget: 1_300_000, spent: 1_192_000, forecast: 1_365_000 },
        people: [
          { name: 'คุณจี', position: 'Senior', from: 0, to: 7, stages: ['DD', 'TD', 'CR'] },
          { name: 'คุณเกด', position: 'Mid', from: 0, to: 5, stages: ['TD', 'CR'] },
          { name: 'คุณเก่ง', position: 'Draftsman', from: 1, to: 4, stages: ['TD'] },
        ],
      },
      {
        code: 'ID-2026-016',
        name: 'ร้านอาหารริมน้ำ อยุธยา',
        active: true,
        plan: ['PP', 'CD', 'SD', 'DD', 'DD', 'TD', 'CR', 'CP'],
        actual: ['PP', 'CD', 'SD', 'DD', 'DD', 'TD', 'CR', 'CP'],
        delayMonths: 0,
        cost: { budget: 680_000, spent: 231_200, forecast: 665_000 },
        people: [
          { name: 'คุณก้อง', position: 'Junior', from: 1, to: 7, stages: ['CD', 'SD', 'DD'] },
          { name: 'คุณกิ๊ฟ', position: 'Junior', from: 3, to: 7, stages: ['DD'] },
        ],
      },
    ],
    inactive: [],
  },
]

/* ── ตัวเลขสรุปที่หน้าใช้ (derive จาก mock ชุดเดียวกันให้เลขตรงกันทั้งหน้า) ── */

export const ACTIVE_PROJECTS = TIMELINES.flatMap((t) => t.projects.filter((p) => p.active))
export const INACTIVE_PROJECTS = TIMELINES.flatMap((t) => t.inactive)

/** จำนวนโครงการ Active ต่อ stage ในเดือนปัจจุบัน */
export function stageCounts(): Record<Stage, number> {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>
  for (const p of ACTIVE_PROJECTS) counts[p.actual[CURRENT_MONTH_INDEX]] += 1
  return counts
}
