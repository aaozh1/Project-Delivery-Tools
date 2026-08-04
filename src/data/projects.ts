/**
 * ทะเบียนโครงการกลางที่ทุกหน้าใช้ร่วมกัน — mock ตามข้อมูลใน design handoff
 * โครงตาม brief ภาคผนวก C: Project (squad_id) → Contract → Phase
 * เมื่อมี data layer จริง ไฟล์นี้ถูกแทนด้วย API
 */

import type { PhaseStatus } from '../lib/status'

export type ServiceLine = 'AR' | 'ID' | 'HS' | 'GR'

export const SERVICE_LINE_LABELS: Record<ServiceLine, string> = {
  AR: 'สถาปัตยกรรม',
  ID: 'ตกแต่งภายใน',
  HS: 'บ้านพักอาศัย',
  GR: 'กราฟิก',
}

export interface ProjectPhase {
  no: number
  name: string
  weightPct: number
  value: number
  status: PhaseStatus
  /** โควตาแก้แบบของงวด และจำนวนรอบที่ใช้ไป */
  revisionQuota: number
  revisionUsed: number
}

export interface Project {
  code: string
  name: string
  client: string
  bd: string
  line: ServiceLine
  squad: string
  contractValue: number
  currentPhase: number
  phases: ProjectPhase[]
  /** % คืบหน้า และ % คน-สัปดาห์ที่ใช้ไป ของงวดปัจจุบัน */
  progressPct: number
  usedPct: number
  /** วันช้าสะสม แยกเจ้าของนาฬิกา */
  delayUs: number
  delayClient: number
}

export const PROJECTS: Project[] = [
  {
    code: 'ID-2026-004',
    name: 'Café ทองหล่อ',
    client: 'บจก. ทองหล่อ ฮอสพิทาลิตี้',
    bd: 'คุณบี',
    line: 'ID',
    squad: 'A',
    contractValue: 3_000_000,
    currentPhase: 3,
    progressPct: 45,
    usedPct: 132,
    delayUs: 9,
    delayClient: 4,
    phases: [
      { no: 1, name: 'Concept', weightPct: 20, value: 600_000, status: 'paid', revisionQuota: 2, revisionUsed: 1 },
      { no: 2, name: 'DD + 3D', weightPct: 30, value: 900_000, status: 'paid', revisionQuota: 2, revisionUsed: 2 },
      { no: 3, name: 'Working Drawing + FF&E', weightPct: 35, value: 1_050_000, status: 'in-progress', revisionQuota: 2, revisionUsed: 3 },
      { no: 4, name: 'Site Supervision', weightPct: 15, value: 450_000, status: 'not-started', revisionQuota: 1, revisionUsed: 0 },
    ],
  },
  {
    code: 'AR-2025-011',
    name: 'อาคารสำนักงานพระราม 9',
    client: 'บจก. พระราม 9 ดีเวลลอปเมนท์',
    bd: 'คุณบี',
    line: 'AR',
    squad: 'C',
    contractValue: 6_000_000,
    currentPhase: 4,
    progressPct: 78,
    usedPct: 74,
    delayUs: 0,
    delayClient: 12,
    phases: [
      { no: 1, name: 'Conceptual', weightPct: 15, value: 900_000, status: 'paid', revisionQuota: 2, revisionUsed: 1 },
      { no: 2, name: 'Schematic', weightPct: 20, value: 1_200_000, status: 'paid', revisionQuota: 2, revisionUsed: 2 },
      { no: 3, name: 'Design Development', weightPct: 25, value: 1_500_000, status: 'paid', revisionQuota: 2, revisionUsed: 1 },
      { no: 4, name: 'Construction Doc', weightPct: 30, value: 1_800_000, status: 'approved', revisionQuota: 2, revisionUsed: 0 },
      { no: 5, name: 'Bidding & CA', weightPct: 10, value: 600_000, status: 'not-started', revisionQuota: 1, revisionUsed: 0 },
    ],
  },
  {
    code: 'AR-2026-002',
    name: 'โกดังบางนา',
    client: 'บจก. บางนา โลจิสติกส์',
    bd: 'คุณเบล',
    line: 'AR',
    squad: 'C',
    contractValue: 4_200_000,
    currentPhase: 2,
    progressPct: 38,
    usedPct: 71,
    delayUs: 3,
    delayClient: 18,
    phases: [
      { no: 1, name: 'Conceptual', weightPct: 15, value: 630_000, status: 'paid', revisionQuota: 2, revisionUsed: 1 },
      { no: 2, name: 'Schematic', weightPct: 20, value: 840_000, status: 'in-progress', revisionQuota: 2, revisionUsed: 1 },
      { no: 3, name: 'Design Development', weightPct: 25, value: 1_050_000, status: 'not-started', revisionQuota: 2, revisionUsed: 0 },
      { no: 4, name: 'Construction Doc', weightPct: 30, value: 1_260_000, status: 'not-started', revisionQuota: 2, revisionUsed: 0 },
      { no: 5, name: 'Bidding & CA', weightPct: 10, value: 420_000, status: 'not-started', revisionQuota: 1, revisionUsed: 0 },
    ],
  },
  {
    code: 'HS-2026-007',
    name: 'บ้านคุณสมชาย ทองหล่อ',
    client: 'คุณสมชาย',
    bd: 'คุณบี',
    line: 'HS',
    squad: 'D',
    contractValue: 1_800_000,
    currentPhase: 1,
    progressPct: 18,
    usedPct: 14,
    delayUs: 0,
    delayClient: 0,
    phases: [
      { no: 1, name: 'Concept Design', weightPct: 20, value: 360_000, status: 'in-progress', revisionQuota: 2, revisionUsed: 0 },
      { no: 2, name: 'DD + 3D', weightPct: 30, value: 540_000, status: 'not-started', revisionQuota: 2, revisionUsed: 0 },
      { no: 3, name: 'แบบก่อสร้าง + ขออนุญาต', weightPct: 40, value: 720_000, status: 'not-started', revisionQuota: 1, revisionUsed: 0 },
      { no: 4, name: 'ที่ปรึกษาช่วงก่อสร้าง', weightPct: 10, value: 180_000, status: 'not-started', revisionQuota: 1, revisionUsed: 0 },
    ],
  },
  {
    code: 'GR-2026-014',
    name: 'Rebrand XYZ',
    client: 'บจก. XYZ กรุ๊ป',
    bd: 'คุณเบล',
    line: 'GR',
    squad: 'F',
    contractValue: 850_000,
    currentPhase: 2,
    progressPct: 60,
    usedPct: 52,
    delayUs: 0,
    delayClient: 2,
    phases: [
      { no: 1, name: 'Brief + Concept', weightPct: 30, value: 255_000, status: 'paid', revisionQuota: 2, revisionUsed: 1 },
      { no: 2, name: 'Design Development', weightPct: 40, value: 340_000, status: 'delivered', revisionQuota: 2, revisionUsed: 2 },
      { no: 3, name: 'Final Artwork', weightPct: 30, value: 255_000, status: 'not-started', revisionQuota: 1, revisionUsed: 0 },
    ],
  },
  {
    code: 'ID-2026-009',
    name: 'สำนักงาน BTS อโศก',
    client: 'บจก. อโศก แคปปิตอล',
    bd: 'คุณบี',
    line: 'ID',
    squad: 'A',
    contractValue: 2_500_000,
    currentPhase: 2,
    progressPct: 41,
    usedPct: 41,
    delayUs: 0,
    delayClient: 0,
    phases: [
      { no: 1, name: 'Concept', weightPct: 20, value: 500_000, status: 'paid', revisionQuota: 2, revisionUsed: 1 },
      { no: 2, name: 'DD + 3D', weightPct: 30, value: 750_000, status: 'in-progress', revisionQuota: 2, revisionUsed: 3 },
      { no: 3, name: 'Working Drawing + FF&E', weightPct: 35, value: 875_000, status: 'not-started', revisionQuota: 2, revisionUsed: 0 },
      { no: 4, name: 'Site Supervision', weightPct: 15, value: 375_000, status: 'not-started', revisionQuota: 1, revisionUsed: 0 },
    ],
  },
]

export function findProject(code: string): Project | undefined {
  return PROJECTS.find((p) => p.code === code)
}
