import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Button, MoneyFigure, RevisionCounter, RiskFlag } from '../components'
import { baht, personWeeks } from '../lib/format'
import type { RiskLevel } from '../lib/status'

/**
 * S10 · Closeout Report — "กำไรจริงเท่าไหร่?" (ผู้ใช้: HoPD)
 * ครึ่งซ้ายชำแหละตัวเลขจริง (ต่องวด · ความช้าแยกเจ้าของ · VO) —
 * ครึ่งขวาคือผลผลิตของหน้า: บันทึกเข้า Benchmark Library เพื่อให้ตัวเลขจริง
 * กลายเป็นกล่องอ้างอิงในหน้าวางแผน (S3) ของโครงการประเภทเดียวกันครั้งถัดไป
 * (วงจร brief §4: CLOSEOUT → Benchmark Library → กลับไป Plan โครงการถัดไป)
 */

interface PhaseCloseout {
  no: string
  name: string
  /** มูลค่างวดตามสัญญา */
  value: number
  planPW: number
  actualPW: number
  revisionUsed: number
  revisionQuota: number
  /** เหตุผลของงวดที่บานเกินแผนชัดเจน — แสดงเป็นแถวหมายเหตุใต้แถวงวด */
  note?: string
}

interface ClosedProject {
  code: string
  name: string
  client: string
  squad: string
  /** ฟิลด์ที่จะเข้า BenchmarkRecord (ภาคผนวก C): project_type + size */
  benchmarkType: string
  benchmarkSize: string
  contract: number
  /** เป้า Margin ตอนอนุมัติแผน และ Margin จริงตอนปิด (จาก COL จริง) */
  marginTargetPct: number
  actualMarginPct: number
  planWeeks: number
  actualWeeks: number
  closedLabel: string
  /** Slip แยกเจ้าของนาฬิกา (วัน) — สูตรภาคผนวก A */
  slipUs: number
  slipClient: number
  slipGov: number
  slipNote: string
  voCollected: number
  voCollectedReason: string
  voGiven: number
  voGivenReason: string
  phases: PhaseCloseout[]
  /** บทเรียนตั้งต้นที่ HoPD บันทึกไว้ระหว่างปิดโครงการ */
  lessons: string[]
}

/**
 * โครงการที่ปิดแล้ว (รับเงินครบทุกงวด) — mock ชั่วคราว
 * ตัวเลขจริงมาจาก WeeklyAllocation × cost_rate (HoPD เท่านั้น) เมื่อมี data layer
 * งวดตาม Template ภาคผนวก B · คน-สัปดาห์เป็นทวีคูณ 0.25 เสมอ
 */
const CLOSED_PROJECTS: ClosedProject[] = [
  {
    code: 'ID-2025-018',
    name: 'ร้านอาหารเจริญกรุง',
    client: 'บจก. เจริญกรุง ฮอสพิทาลิตี้',
    squad: 'A (คุณเอ)',
    benchmarkType: 'ตกแต่งภายใน (ID) · ร้านอาหาร',
    benchmarkSize: '420 ตร.ม. · 2 ชั้น',
    contract: 2_200_000,
    marginTargetPct: 32,
    actualMarginPct: 24,
    planWeeks: 28,
    actualWeeks: 33,
    closedLabel: 'ปิดเมื่อ 3 ก.ค. 2569',
    slipUs: 14,
    slipClient: 18,
    slipGov: 3,
    slipNote:
      'นาฬิกาที่ช้าที่สุดอยู่ฝั่งลูกค้า — รอตัดสินใจวัสดุระหว่างก่อสร้าง 18 วัน · ฝั่งเราคือรอบแก้แบบงวด Working 14 วัน · ราชการ (ตรวจระบบครัว) เพียง 3 วัน',
    voCollected: 120_000,
    voCollectedReason:
      'VO-01 · ลูกค้าขอเพิ่มออกแบบบาร์ชั้นลอย — เปิด VO ก่อนเริ่มงาน จึงเก็บเงินได้เต็ม',
    voGiven: 85_000,
    voGivenReason:
      'แก้แบบรอบ 3 งวด Working เกินโควตา — HoD ตัดสินไม่เก็บเงิน เพราะลูกค้าเพิ่งเซ็นสัญญาสาขาที่ 2 · มูลค่าคิดจากคน-สัปดาห์ที่ใช้จริง',
    phases: [
      {
        no: '01',
        name: 'Concept',
        value: 440_000,
        planPW: 6.0,
        actualPW: 6.0,
        revisionUsed: 1,
        revisionQuota: 2,
      },
      {
        no: '02',
        name: 'DD + 3D',
        value: 660_000,
        planPW: 9.5,
        actualPW: 10.25,
        revisionUsed: 2,
        revisionQuota: 2,
      },
      {
        no: '03',
        name: 'Working Drawing + FF&E',
        value: 770_000,
        planPW: 11.0,
        actualPW: 15.5,
        revisionUsed: 3,
        revisionQuota: 2,
        note: 'บาน +4.50 คน-สัปดาห์จากแก้แบบรอบ 3 — ลูกค้าปรับ mood หลังเห็นโครงสร้างจริงหน้างาน · เกินโควตา 1 รอบ HoD ตัดสินแถม (ดูสรุป VO ด้านล่าง)',
      },
      {
        no: '04',
        name: 'Site Supervision',
        value: 330_000,
        planPW: 5.5,
        actualPW: 6.75,
        revisionUsed: 0,
        revisionQuota: 1,
        note: 'ยืดตามหน้างานที่ช้ากว่าแผน 5 สัปดาห์ — ต้องเข้าตรวจงานเพิ่ม 2 รอบ',
      },
    ],
    lessons: [
      'งานร้านอาหารที่ออกแบบคู่ขนานการก่อสร้าง ควรตั้งโควตาแก้แบบงวด Working เป็น 3 รอบ และตั้งราคาเผื่อไว้ตั้งแต่เสนอราคา',
      'การตัดสินใจวัสดุของลูกค้าคือนาฬิกาที่ช้าที่สุด (18 วัน) — โครงการหน้าให้กำหนดวันตัดสินใจวัสดุเป็น Milestone ในสัญญา',
      'เปิด VO ทันทีที่ขอบเขตขยับได้เงินเต็ม (บาร์ชั้นลอย ฿120,000) — ที่ปล่อยไหลกลายเป็นงานแถม ฿85,000',
    ],
  },
  {
    code: 'ID-2025-012',
    name: 'คาเฟ่อารีย์',
    client: 'บจก. อารีย์ บรูว์',
    squad: 'A (คุณเอ)',
    benchmarkType: 'ตกแต่งภายใน (ID) · คาเฟ่',
    benchmarkSize: '180 ตร.ม. · ชั้นเดียว',
    contract: 1_450_000,
    marginTargetPct: 30,
    actualMarginPct: 33,
    planWeeks: 18,
    actualWeeks: 19,
    closedLabel: 'ปิดเมื่อ 20 มี.ค. 2569',
    slipUs: 2,
    slipClient: 5,
    slipGov: 0,
    slipNote: 'ช้ารวมเพียง 7 วัน — รอลูกค้าอนุมัติ FF&E 5 วัน · ไม่มีนาฬิกาฝั่งราชการ',
    voCollected: 40_000,
    voCollectedReason: 'VO-01 · เพิ่มแบบป้ายหน้าร้านและกราฟิกผนัง — เก็บเงินได้ก่อนผลิต',
    voGiven: 0,
    voGivenReason: 'ไม่มีงานแถม — ทุกรอบแก้อยู่ในโควตา',
    phases: [
      {
        no: '01',
        name: 'Concept',
        value: 290_000,
        planPW: 4.0,
        actualPW: 4.0,
        revisionUsed: 1,
        revisionQuota: 2,
      },
      {
        no: '02',
        name: 'DD + 3D',
        value: 435_000,
        planPW: 6.5,
        actualPW: 6.25,
        revisionUsed: 2,
        revisionQuota: 2,
      },
      {
        no: '03',
        name: 'Working Drawing + FF&E',
        value: 507_500,
        planPW: 7.5,
        actualPW: 7.25,
        revisionUsed: 1,
        revisionQuota: 2,
      },
      {
        no: '04',
        name: 'Site Supervision',
        value: 217_500,
        planPW: 3.0,
        actualPW: 2.75,
        revisionUsed: 0,
        revisionQuota: 1,
      },
    ],
    lessons: [
      'Template คาเฟ่ขนาดเล็กแม่นแล้ว — ใช้จริงต่ำกว่าแผน 0.75 คน-สัปดาห์ · ใช้เป็นฐานเสนอราคาคาเฟ่ 150–200 ตร.ม. ได้เลย',
    ],
  },
  {
    code: 'HS-2024-021',
    name: 'บ้านคุณวรรณ พระราม 2',
    client: 'คุณวรรณ',
    squad: 'D (คุณดี)',
    benchmarkType: 'บ้านพักอาศัย (HS) · บ้านเดี่ยว',
    benchmarkSize: '640 ตร.ม. · 3 ชั้น',
    contract: 2_600_000,
    marginTargetPct: 30,
    actualMarginPct: 26,
    planWeeks: 48,
    actualWeeks: 52,
    closedLabel: 'ปิดเมื่อ 14 พ.ย. 2568',
    slipUs: 6,
    slipClient: 10,
    slipGov: 12,
    slipNote:
      'นาฬิกาที่ช้าที่สุดคือราชการ — ขออนุญาตก่อสร้างนานกว่าคาด 12 วันจากข้อทักท้วงของเขต · ฝั่งลูกค้ารอเซ็นแบบ 10 วัน',
    voCollected: 0,
    voCollectedReason: 'ไม่มี VO ที่เก็บเงินได้ — ขอบเขตที่ขยับถูกตัดสินเป็นงานแถมทั้งหมด',
    voGiven: 45_000,
    voGivenReason:
      'ปรับแบบห้องครัวหลังลูกค้าเปลี่ยนผู้รับเหมา — HoD ตัดสินแถมเพื่อปิดงานให้ทันฤกษ์ขึ้นบ้าน',
    phases: [
      {
        no: '01',
        name: 'Concept',
        value: 520_000,
        planPW: 9.0,
        actualPW: 9.5,
        revisionUsed: 2,
        revisionQuota: 2,
      },
      {
        no: '02',
        name: 'DD + 3D',
        value: 780_000,
        planPW: 14.0,
        actualPW: 15.25,
        revisionUsed: 2,
        revisionQuota: 2,
      },
      {
        no: '03',
        name: 'แบบก่อสร้าง + ขออนุญาต',
        value: 1_040_000,
        planPW: 17.0,
        actualPW: 20.0,
        revisionUsed: 2,
        revisionQuota: 1,
        note: 'บาน +3.00 คน-สัปดาห์ — แก้แบบยื่นขออนุญาตเพิ่ม 2 ครั้งตามข้อทักท้วงของเขต',
      },
      {
        no: '04',
        name: 'ที่ปรึกษาช่วงก่อสร้าง',
        value: 260_000,
        planPW: 6.0,
        actualPW: 6.75,
        revisionUsed: 0,
        revisionQuota: 1,
      },
    ],
    lessons: [
      'งานขออนุญาตบ้านขนาดใหญ่ควรเผื่อนาฬิการาชการอย่างน้อย 3 สัปดาห์ — แผนนี้เผื่อไว้แค่ 1 สัปดาห์',
      'ลูกค้าเปลี่ยนผู้รับเหมากลางทาง — สัญญาหน้าให้ระบุเงื่อนไขคิดค่าแก้แบบจากเหตุภายนอก',
    ],
  },
]

/** เจ้าของนาฬิกาความช้า — สีคู่สัญลักษณ์เสมอ (อ่านได้แม้พิมพ์ขาวดำ) */
const SLIP_OWNERS = [
  { key: 'slipUs', label: 'ทีมเรา', mark: '●', color: 'var(--dpm-ink)' },
  { key: 'slipClient', label: 'ลูกค้า', mark: '◐', color: 'var(--dpm-blue)' },
  { key: 'slipGov', label: 'ราชการ', mark: '○', color: 'var(--dpm-mute)' },
] as const

type SaveState = 'idle' | 'saving' | 'saved'

/** แสดงจำนวน "จุด" ของ Margin: 8 → "8" · 8.5 → "8.5" */
function points(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

/** ระดับสถานะของส่วนต่างคน-สัปดาห์ต่องวด: เกิน ≥2 = วิกฤต · เกิน = เตือน */
function diffLevel(d: number): RiskLevel {
  if (d >= 2) return 'critical'
  if (d > 0) return 'warn'
  return 'ok'
}

/** ส่วนต่างคน-สัปดาห์พร้อมเครื่องหมาย: +4.50 · −0.25 (− ขีดยาวตามสเปก) */
function diffText(d: number): string {
  return d >= 0 ? `+${personWeeks(d)}` : `−${personWeeks(-d)}`
}

const barTrack: CSSProperties = {
  position: 'relative',
  flex: 1,
  height: 8,
  background: 'var(--dpm-subtle)',
  borderRadius: 'var(--dpm-radius-bar)',
}

const labelMute: CSSProperties = { fontSize: 11, color: 'var(--dpm-mute)', letterSpacing: '0.06em' }

/** แถวแถบเทียบ แผน/จริง หนึ่งเส้น พร้อมขีดอ้างอิง (ถ้ามี) */
function CompareBarRow({
  label,
  widthPct,
  color,
  valueText,
  tickPct,
}: {
  label: string
  widthPct: number
  color: string
  valueText: string
  tickPct?: number
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '34px minmax(0,1fr) 76px', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>{label}</span>
      <div style={barTrack}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${Math.max(0, Math.min(100, widthPct))}%`,
            background: color,
            borderRadius: 'var(--dpm-radius-bar)',
            transition: 'width 260ms ease',
          }}
        />
        {tickPct !== undefined && (
          <div
            style={{
              position: 'absolute',
              left: `${Math.min(100, tickPct)}%`,
              top: -4,
              bottom: -4,
              width: 1,
              background: 'var(--dpm-ink)',
            }}
          />
        )}
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'right', color: 'var(--dpm-ink)' }}>
        {valueText}
      </span>
    </div>
  )
}

/** grid คอลัมน์ของตารางเทียบต่องวด — ใช้ร่วมกันทั้งหัว แถว และแถวรวม */
const TABLE_COLS = '34px minmax(0,1fr) 92px 92px 104px 118px 116px'

export function CloseoutReportPage() {
  const [selectedCode, setSelectedCode] = useState(CLOSED_PROJECTS[0].code)
  /** สถานะบันทึกเข้า Benchmark แยกต่อโครงการ */
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({})
  /** บทเรียนแก้ไขได้ แยกต่อโครงการ — ตั้งต้นจาก mock */
  const [lessonsByCode, setLessonsByCode] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(CLOSED_PROJECTS.map((p): [string, string[]] => [p.code, p.lessons])),
  )
  const [addingLesson, setAddingLesson] = useState(false)
  const [lessonDraft, setLessonDraft] = useState('')
  const saveTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(saveTimer.current), [])

  const project = CLOSED_PROJECTS.find((p) => p.code === selectedCode) ?? CLOSED_PROJECTS[0]

  /* ── ตัวเลขสรุป (คำนวณจาก mock ต่องวด) ───────────────── */
  const planPW = project.phases.reduce((s, ph) => s + ph.planPW, 0)
  const actualPW = project.phases.reduce((s, ph) => s + ph.actualPW, 0)
  const totalDiff = actualPW - planPW

  const planMarginBaht = Math.round((project.contract * project.marginTargetPct) / 100)
  const actualMarginBaht = Math.round((project.contract * project.actualMarginPct) / 100)
  const marginGap = project.marginTargetPct - project.actualMarginPct
  const marginPass = marginGap <= 0
  const marginColor = marginPass
    ? 'var(--dpm-ink)'
    : project.actualMarginPct >= 20
      ? 'var(--dpm-yellow)'
      : 'var(--dpm-red)'

  const slipTotal = project.slipUs + project.slipClient + project.slipGov
  const pwScaleMax = Math.max(planPW, actualPW) * 1.1

  const currentSave: SaveState = saveState[project.code] ?? 'idle'
  const lessons = lessonsByCode[project.code] ?? []

  const saveBenchmark = () => {
    const code = project.code
    setSaveState((s) => ({ ...s, [code]: 'saving' }))
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(
      () => setSaveState((s) => ({ ...s, [code]: 'saved' })),
      600,
    )
  }

  const addLesson = () => {
    const text = lessonDraft.trim()
    if (!text) return
    setLessonsByCode((m) => ({ ...m, [project.code]: [...(m[project.code] ?? []), text] }))
    setLessonDraft('')
    setAddingLesson(false)
  }

  return (
    <div
      style={{
        maxWidth: 'var(--dpm-page-max-w)',
        margin: '0 auto',
        padding: '0 var(--dpm-page-pad-x)',
      }}
    >
      {/* ── หัวหน้า: รหัส ชื่อ สถานะปิด ระยะเวลา + เลือกโครงการปิดอื่น ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '14px 0',
          borderBottom: '1px solid var(--dpm-border)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={labelMute}>CLOSEOUT REPORT · S10</div>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="dpm-mono" style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>
              {project.code}
            </span>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>
              {project.name}
            </h1>
          </div>
          <div
            style={{
              marginTop: 5,
              fontSize: 12,
              color: 'var(--dpm-sub)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                color: 'var(--dpm-green)',
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: 11 }}>✓</span>ปิดโครงการแล้ว · รับเงินครบ
            </span>
            <span style={{ color: 'var(--dpm-border)' }}>|</span>
            <span>{project.closedLabel}</span>
            <span style={{ color: 'var(--dpm-border)' }}>|</span>
            <span>Squad {project.squad}</span>
            <span style={{ color: 'var(--dpm-border)' }}>|</span>
            <span>ลูกค้า {project.client}</span>
            <span style={{ color: 'var(--dpm-border)' }}>|</span>
            <span>
              ระยะเวลาจริง <b style={{ color: 'var(--dpm-ink)' }}>{project.actualWeeks} สัปดาห์</b>{' '}
              · แผน {project.planWeeks} สัปดาห์
            </span>
            {slipTotal > 0 ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  color: 'var(--dpm-yellow)',
                  fontWeight: 600,
                }}
              >
                <span style={{ fontSize: 9 }}>◆</span>ช้ากว่าแผน {slipTotal} วัน
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  color: 'var(--dpm-green)',
                  fontWeight: 600,
                }}
              >
                <span style={{ fontSize: 11 }}>✓</span>ตามแผน
              </span>
            )}
          </div>
        </div>
        <span style={{ flex: 1 }} />
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--dpm-sub)' }}
        >
          ดูโครงการปิดอื่น
          <select
            value={selectedCode}
            onChange={(e) => {
              setSelectedCode(e.target.value)
              setAddingLesson(false)
              setLessonDraft('')
            }}
            style={{
              fontFamily: 'inherit',
              fontSize: 13,
              height: 'var(--dpm-h-btn-secondary)',
              padding: '0 10px',
              color: 'var(--dpm-ink)',
              background: 'var(--dpm-surface)',
              border: '1px solid var(--dpm-border)',
              borderRadius: 'var(--dpm-radius-control)',
              cursor: 'pointer',
            }}
          >
            {CLOSED_PROJECTS.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ── แถวตัวเลขหัวใจ: Margin จริง เทียบเป้า · กำไรเป็นบาท · แถบแผน vs จริง ── */}
      <div
        className="dpm-card"
        style={{
          marginTop: 20,
          display: 'grid',
          gridTemplateColumns: '280px minmax(0,1fr) minmax(0,1.15fr)',
        }}
      >
        {/* Margin จริง — สไตล์เดียวกับ Margin panel ของ S3 (ตัวเลข 40px) */}
        <div style={{ padding: '16px 20px 18px', borderRight: '1px solid var(--dpm-border)' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Margin จริง</div>
          <div
            style={{
              marginTop: 10,
              fontSize: 40,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: marginColor,
            }}
          >
            {project.actualMarginPct.toFixed(1)}%
          </div>
          <div style={{ marginTop: 10 }}>
            {marginPass ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--dpm-green)',
                }}
              >
                <span style={{ fontSize: 11 }}>✓</span>
                {marginGap === 0 ? 'ตรงเป้า' : `สูงกว่าเป้า ${points(-marginGap)} จุด`}
              </span>
            ) : (
              <RiskFlag
                level={project.actualMarginPct >= 20 ? 'warn' : 'critical'}
                label={`ต่ำกว่าเป้า ${points(marginGap)} จุด`}
              />
            )}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--dpm-sub)' }}>
            เป้าตอนอนุมัติแผน {project.marginTargetPct}%
          </div>
        </div>

        {/* กำไรจริงเป็นบาท */}
        <div style={{ padding: '16px 20px 18px', borderRight: '1px solid var(--dpm-border)' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>กำไรจริง</div>
          <div style={{ marginTop: 12 }}>
            <MoneyFigure value={actualMarginBaht} size={26} />
          </div>
          <div
            style={{
              marginTop: 12,
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--dpm-sub)',
            }}
          >
            <span>แผนคาดไว้</span>
            <span style={{ fontWeight: 600, color: 'var(--dpm-ink)' }}>{baht(planMarginBaht)}</span>
          </div>
          <div
            style={{
              marginTop: 5,
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--dpm-sub)',
            }}
          >
            <span>ส่วนต่าง</span>
            <span
              style={{
                fontWeight: 600,
                color: actualMarginBaht >= planMarginBaht ? 'var(--dpm-green)' : marginColor,
              }}
            >
              {baht(actualMarginBaht - planMarginBaht)}
            </span>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--dpm-mute)', lineHeight: 1.5 }}>
            คำนวณจาก COL จริง (cost_rate รายคน) — เห็นเฉพาะ HoPD · การเปิดดูถูกบันทึก Audit Log
          </div>
        </div>

        {/* แถบเทียบ แผน vs จริง — Margin (สเกล 0–50 ขีดที่เป้า) และคน-สัปดาห์ */}
        <div style={{ padding: '16px 20px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>แผน เทียบ จริง</div>
          <div style={{ ...labelMute, marginTop: 2 }}>MARGIN % · ขีด = เป้า {project.marginTargetPct}%</div>
          <CompareBarRow
            label="แผน"
            widthPct={project.marginTargetPct * 2}
            color="var(--dpm-mute)"
            valueText={`${project.marginTargetPct.toFixed(1)}%`}
            tickPct={project.marginTargetPct * 2}
          />
          <CompareBarRow
            label="จริง"
            widthPct={project.actualMarginPct * 2}
            color={marginColor}
            valueText={`${project.actualMarginPct.toFixed(1)}%`}
            tickPct={project.marginTargetPct * 2}
          />
          <div style={{ ...labelMute, marginTop: 8 }}>คน-สัปดาห์รวม</div>
          <CompareBarRow
            label="แผน"
            widthPct={(planPW / pwScaleMax) * 100}
            color="var(--dpm-mute)"
            valueText={personWeeks(planPW)}
          />
          <CompareBarRow
            label="จริง"
            widthPct={(actualPW / pwScaleMax) * 100}
            color={totalDiff > 0 ? 'var(--dpm-yellow)' : 'var(--dpm-green)'}
            valueText={personWeeks(actualPW)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <RiskFlag
              level={diffLevel(totalDiff)}
              label={`${diffText(totalDiff)} คน-สัปดาห์จากแผน`}
            />
          </div>
        </div>
      </div>

      {/* ── grid: ซ้ายชำแหละตัวเลข / ขวา Benchmark + บทเรียน ── */}
      <div
        style={{
          padding: '20px 0 80px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.5fr) minmax(380px,1fr)',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* ═══ ซ้าย ═══ */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ตารางเทียบต่องวด */}
          <div className="dpm-card">
            <div className="dpm-card__header">
              <span className="dpm-card__title">เทียบต่องวด — แผน vs จริง</span>
              <span className="dpm-card__hint">
                คน-สัปดาห์จริงจากการจัดสรรรายสัปดาห์ (WeeklyAllocation)
              </span>
            </div>
            <div
              className="dpm-table-head"
              style={{
                display: 'grid',
                gridTemplateColumns: TABLE_COLS,
                gap: 12,
                padding: '9px 16px',
              }}
            >
              <span />
              <span>งวด</span>
              <span style={{ textAlign: 'right' }}>แผน</span>
              <span style={{ textAlign: 'right' }}>จริง</span>
              <span style={{ textAlign: 'right' }}>ส่วนต่าง</span>
              <span style={{ textAlign: 'right' }}>รอบแก้ / โควตา</span>
              <span style={{ textAlign: 'right' }}>มูลค่างวด</span>
            </div>

            {project.phases.map((ph) => {
              const d = ph.actualPW - ph.planPW
              const over = d > 0
              const critical = d >= 2
              const revOver = ph.revisionUsed > ph.revisionQuota
              const revAtQuota = ph.revisionUsed === ph.revisionQuota && ph.revisionQuota > 0
              const revColor = revOver
                ? 'var(--dpm-red)'
                : revAtQuota
                  ? 'var(--dpm-yellow)'
                  : 'var(--dpm-sub)'
              return (
                <div
                  key={ph.no}
                  style={{
                    borderBottom: '1px solid var(--dpm-border)',
                    background: critical ? 'var(--dpm-tint-red)' : 'var(--dpm-surface)',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: TABLE_COLS,
                      gap: 12,
                      alignItems: 'center',
                      padding: '12px 16px',
                    }}
                  >
                    <span className="dpm-mono" style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
                      {ph.no}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {ph.name}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--dpm-sub)', textAlign: 'right' }}>
                      {personWeeks(ph.planPW)}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>
                      {personWeeks(ph.actualPW)}
                    </span>
                    <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {d === 0 ? (
                        <span style={{ fontSize: 13, color: 'var(--dpm-mute)' }}>0.00</span>
                      ) : (
                        <RiskFlag
                          level={over ? diffLevel(d) : 'ok'}
                          label={diffText(d)}
                        />
                      )}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        color: revColor,
                      }}
                    >
                      {revOver && <span style={{ fontSize: 10 }}>▲</span>}
                      {!revOver && revAtQuota && <span style={{ fontSize: 10 }}>◆</span>}
                      {ph.revisionUsed} / {ph.revisionQuota}
                    </span>
                    <span style={{ fontSize: 13, textAlign: 'right' }}>{baht(ph.value)}</span>
                  </div>
                  {/* แถวหมายเหตุ: อธิบายว่างวดนี้บานเพราะอะไร */}
                  {ph.note && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '34px minmax(0,1fr)',
                        gap: 12,
                        padding: '0 16px 12px',
                      }}
                    >
                      <span />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {revOver && (
                          <RevisionCounter
                            used={ph.revisionUsed}
                            quota={ph.revisionQuota}
                            note={`เกินโควตา ${ph.revisionUsed - ph.revisionQuota} รอบ — HoD ตัดสินแล้ว (ดูสรุป VO)`}
                          />
                        )}
                        <div
                          style={{
                            fontSize: 12,
                            lineHeight: 1.55,
                            color: critical ? 'var(--dpm-red)' : 'var(--dpm-sub)',
                          }}
                        >
                          {ph.note}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* แถวรวม */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: TABLE_COLS,
                gap: 12,
                alignItems: 'center',
                padding: '12px 16px',
                background: 'var(--dpm-subtle)',
              }}
            >
              <span />
              <span style={{ fontSize: 13, fontWeight: 600 }}>รวมทั้งโครงการ</span>
              <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>
                {personWeeks(planPW)}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>
                {personWeeks(actualPW)}
              </span>
              <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {totalDiff === 0 ? (
                  <span style={{ fontSize: 13, color: 'var(--dpm-mute)' }}>0.00</span>
                ) : (
                  <RiskFlag level={totalDiff > 0 ? diffLevel(totalDiff) : 'ok'} label={diffText(totalDiff)} />
                )}
              </span>
              <span />
              <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>
                {baht(project.contract)}
              </span>
            </div>
          </div>

          {/* การวิเคราะห์ความช้า — Slip แยกเจ้าของนาฬิกา */}
          <div className="dpm-card">
            <div className="dpm-card__header">
              <span className="dpm-card__title">ความช้ารวม {slipTotal} วัน — นาฬิกาอยู่ที่ใคร</span>
              <span className="dpm-card__hint">Slip แยกเจ้าของ ตามสูตรภาคผนวก A</span>
            </div>
            <div className="dpm-card__body">
              {slipTotal > 0 ? (
                <>
                  {/* แถบซ้อนสัดส่วนวันช้า */}
                  <div style={{ display: 'flex', gap: 2, height: 12 }}>
                    {SLIP_OWNERS.map((o) => {
                      const days = project[o.key]
                      if (days === 0) return null
                      return (
                        <div
                          key={o.key}
                          style={{
                            width: `${(days / slipTotal) * 100}%`,
                            background: o.color,
                            borderRadius: 'var(--dpm-radius-bar)',
                            transition: 'width 260ms ease',
                          }}
                        />
                      )
                    })}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    {SLIP_OWNERS.map((o) => {
                      const days = project[o.key]
                      return (
                        <span
                          key={o.key}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                            fontSize: 13,
                            color: days > 0 ? 'var(--dpm-ink)' : 'var(--dpm-mute)',
                          }}
                        >
                          <span style={{ fontSize: 10, color: o.color }}>{o.mark}</span>
                          {o.label}{' '}
                          <b style={{ fontWeight: 600 }}>
                            {days} วัน
                          </b>
                          {days > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
                              ({Math.round((days / slipTotal) * 100)}%)
                            </span>
                          )}
                        </span>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    color: 'var(--dpm-green)',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ fontSize: 11 }}>✓</span>ส่งมอบตามแผน — ไม่มีวันช้าสะสม
                </div>
              )}
              <div
                style={{
                  marginTop: 12,
                  paddingLeft: 14,
                  borderLeft: '2px solid var(--dpm-border)',
                  fontSize: 12,
                  color: 'var(--dpm-sub)',
                  lineHeight: 1.6,
                }}
              >
                ข้อสังเกต: {project.slipNote}
              </div>
            </div>
          </div>

          {/* VO สรุป */}
          <div className="dpm-card">
            <div className="dpm-card__header">
              <span className="dpm-card__title">Variation Order สรุป</span>
              <span className="dpm-card__hint">งานเพิ่มที่เก็บเงินได้ เทียบงานที่แถม</span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '150px minmax(0,1fr)',
                gap: 12,
                alignItems: 'start',
                padding: '13px 18px',
                borderBottom: '1px solid var(--dpm-border)',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: 'var(--dpm-green)',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ fontSize: 11 }}>✓</span>เก็บเงินเพิ่มได้
                </div>
                <div style={{ marginTop: 5 }}>
                  <MoneyFigure value={project.voCollected} size={20} />
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.6, paddingTop: 2 }}>
                {project.voCollectedReason}
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '150px minmax(0,1fr)',
                gap: 12,
                alignItems: 'start',
                padding: '13px 18px',
                borderBottom: '1px solid var(--dpm-border)',
              }}
            >
              <div>
                {project.voGiven > 0 ? (
                  <RiskFlag level="warn" label="แถม (ไม่ได้เก็บ)" />
                ) : (
                  <RiskFlag level="ok" label="ไม่มีงานแถม" />
                )}
                <div style={{ marginTop: 5 }}>
                  <MoneyFigure value={-project.voGiven} size={20} problem={project.voGiven > 0} />
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.6, paddingTop: 2 }}>
                {project.voGivenReason}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                padding: '11px 18px',
                background: 'var(--dpm-subtle)',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>สุทธิจาก VO</span>
              <MoneyFigure
                value={project.voCollected - project.voGiven}
                size={16}
                problem={project.voCollected - project.voGiven < 0}
              />
            </div>
          </div>
        </div>

        {/* ═══ ขวา (sticky): Benchmark Library + บทเรียน ═══ */}
        <div
          style={{
            position: 'sticky',
            top: 76,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* กล่องเข้า Benchmark Library — ผลผลิตของหน้า จึงเป็นกล่องเน้นสูงสุดกล่องเดียว */}
          <div className="dpm-card dpm-card--critical">
            <div className="dpm-card__header">
              <span className="dpm-card__title">เข้า Benchmark Library</span>
              <span className="dpm-card__hint">ผลผลิตของการปิดโครงการ</span>
            </div>
            <div className="dpm-card__body" style={{ paddingBottom: 14 }}>
              <div style={labelMute}>สิ่งที่จะถูกบันทึก (BenchmarkRecord)</div>
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 7,
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ color: 'var(--dpm-sub)' }}>ประเภทงาน</span>
                  <span style={{ fontWeight: 600, textAlign: 'right' }}>{project.benchmarkType}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ color: 'var(--dpm-sub)' }}>ขนาด</span>
                  <span style={{ fontWeight: 600, textAlign: 'right' }}>{project.benchmarkSize}</span>
                </div>
                <div
                  style={{
                    marginTop: 3,
                    border: '1px solid var(--dpm-border)',
                    borderRadius: 'var(--dpm-radius-control)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '7px 12px',
                      fontSize: 11,
                      color: 'var(--dpm-sub)',
                      background: 'var(--dpm-subtle)',
                      borderBottom: '1px solid var(--dpm-border)',
                    }}
                  >
                    คน-สัปดาห์จริงต่องวด
                  </div>
                  {project.phases.map((ph) => (
                    <div
                      key={ph.no}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '6px 12px',
                        fontSize: 12,
                        borderBottom: '1px solid var(--dpm-border)',
                      }}
                    >
                      <span style={{ color: 'var(--dpm-sub)' }}>{ph.name}</span>
                      <span style={{ fontWeight: 600 }}>{personWeeks(ph.actualPW)}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <span>รวม</span>
                    <span>{personWeeks(actualPW)} คน-สัปดาห์</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ color: 'var(--dpm-sub)' }}>Margin จริง</span>
                  <span style={{ fontWeight: 600, color: marginColor }}>
                    {project.actualMarginPct.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                {currentSave === 'saved' ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      border: '1px solid var(--dpm-green)',
                      borderRadius: 'var(--dpm-radius-control)',
                      background: 'var(--dpm-tint-green)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--dpm-green)',
                      transition: 'border-color 400ms ease, background 700ms ease',
                    }}
                  >
                    <span style={{ fontSize: 12 }}>✓</span>
                    บันทึกเข้า Benchmark Library แล้ว
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    loading={currentSave === 'saving'}
                    onClick={saveBenchmark}
                    style={{ width: '100%' }}
                  >
                    {currentSave === 'saving' ? 'กำลังบันทึกเข้า Benchmark' : 'บันทึกเข้า Benchmark'}
                  </Button>
                )}
              </div>

              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--dpm-mute)', lineHeight: 1.6 }}>
                {currentSave === 'saved'
                  ? 'ตัวเลขชุดนี้จะปรากฏเป็นกล่องอ้างอิงในหน้าวางแผนโครงการ (S3) ทันทีที่ Senior วางแผนงานประเภทเดียวกันครั้งถัดไป'
                  : 'เมื่อบันทึก ตัวเลขชุดนี้จะกลายเป็นกล่องอ้างอิงในหน้าวางแผนโครงการ (S3) ของงานประเภทเดียวกัน — แบบเดียวกับ "บ้าน 280–320 ตร.ม. 4 โครงการที่ผ่านมา ใช้เฉลี่ย 44 คน-สัปดาห์"'}
              </div>
              {currentSave === 'saved' && (
                <div style={{ marginTop: 8 }}>
                  <a style={{ fontSize: 12, cursor: 'pointer' }}>ไปวางแผนโครงการถัดไป →</a>
                </div>
              )}
            </div>
          </div>

          {/* บทเรียนจากโครงการ */}
          <div className="dpm-card">
            <div className="dpm-card__header">
              <span className="dpm-card__title">บทเรียนจากโครงการ</span>
              <span className="dpm-card__hint">บันทึกโดย HoPD — เก็บคู่ Benchmark</span>
            </div>
            <div>
              {lessons.map((l, i) => (
                <div
                  key={`${project.code}-${i}`}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '11px 18px',
                    borderBottom: '1px solid var(--dpm-border)',
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  <span style={{ color: 'var(--dpm-mute)', paddingTop: 1 }}>·</span>
                  <span>{l}</span>
                </div>
              ))}
              {lessons.length === 0 && (
                <div style={{ padding: '12px 18px', fontSize: 13, color: 'var(--dpm-mute)' }}>
                  ยังไม่มีบทเรียนที่บันทึกไว้
                </div>
              )}

              {addingLesson && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '11px 18px',
                    borderBottom: '1px solid var(--dpm-border)',
                  }}
                >
                  <input
                    className="dpm-input"
                    style={{ flex: 1, width: 'auto', textAlign: 'left', fontWeight: 400 }}
                    placeholder="บทเรียนที่อยากส่งต่อถึงโครงการหน้า"
                    value={lessonDraft}
                    autoFocus
                    onChange={(e) => setLessonDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addLesson()
                      if (e.key === 'Escape') {
                        setAddingLesson(false)
                        setLessonDraft('')
                      }
                    }}
                  />
                  <Button variant="secondary" onClick={addLesson}>
                    เพิ่ม
                  </Button>
                </div>
              )}

              <div style={{ padding: '11px 18px' }}>
                <a
                  style={{ fontSize: 12, cursor: 'pointer' }}
                  onClick={() => {
                    setAddingLesson((a) => !a)
                    setLessonDraft('')
                  }}
                >
                  {addingLesson ? 'ยกเลิกการเพิ่ม' : '+ เพิ่มบทเรียน'}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
