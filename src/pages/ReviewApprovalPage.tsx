import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Button, ConstraintNotice, MoneyFigure, RiskFlag } from '../components'
import { STATUS, type RiskLevel } from '../lib/status'
import { baht, percent, personWeeks } from '../lib/format'
import { REVIEW_KINDS } from './department/data'
import { tryApi } from '../api/client'

interface ServerPlan {
  id: number
  projectCode: string
  projectName: string
  marginPct: number
  status: string
  submittedBy: string
  decidedBy?: string
  reason?: string
}

/**
 * S5 · Review & Approval — หัวหน้าแผนก (HoD) · คำถาม: "ผ่านหรือตีกลับ?"
 * เปิดจากรายการ "แผนงาน ID-2026-011" ในคิวรีวิวของ Department Board (S2)
 * ซ้ายสรุปแผนที่ Senior ส่งมา (อ่านอย่างเดียว) · ขวาแผงตัดสิน 3 คำถามของ HoD
 * ตามวงจร §4 ของ brief: ทำได้จริง? Squad ไหว? Margin ผ่าน? → อนุมัติ+มอบให้ Squad หรือตีกลับ
 */

/* ── mock ข้อมูลแผนที่ส่งมา ──────────────────────────────────
 * ID-2026-011 ร้านค้าปลีก สยาม — รายการเดียวกับคิวรีวิวใน S2
 * (waitDays 4 · "Margin 18% ต่ำกว่าเป้า 30% อยู่ 12 จุด")
 * งวดตาม Template ID ภาคผนวก B: Concept 20 · DD+3D 30 · WD+FF&E 35 · Site 15
 */

const PROJECT_CODE = 'ID-2026-011'
const PROJECT_NAME = 'ร้านค้าปลีก สยาม'
const SUBMITTER = 'คุณเอ'
const SUBMITTER_ROLE = 'หัวหน้า Squad A (Senior)'
const WAIT_DAYS = 4
const CONTRACT = 1_200_000

interface PlanPhase {
  no: string
  name: string
  weeks: string
  /** สัดส่วนมูลค่างวด (%) รวม 100 */
  pct: number
  /** คน-สัปดาห์ตามตำแหน่ง (ทวีคูณ 0.25) */
  sr: number
  mid: number
  jr: number
}

/** รวม 36.00 คน-สัปดาห์ → Sr 8.00 · Mid 14.00 · Jr 14.00 */
const PLAN_PHASES: PlanPhase[] = [
  { no: '01', name: 'Concept', weeks: '3 สัปดาห์', pct: 20, sr: 1.5, mid: 2.5, jr: 2.5 },
  { no: '02', name: 'DD + 3D', weeks: '5 สัปดาห์', pct: 30, sr: 2.5, mid: 4.5, jr: 4.5 },
  { no: '03', name: 'Working Drawing + FF&E', weeks: '6 สัปดาห์', pct: 35, sr: 2.5, mid: 5.0, jr: 5.5 },
  { no: '04', name: 'Site Supervision', weeks: '8 สัปดาห์', pct: 15, sr: 1.5, mid: 2.0, jr: 1.5 },
]

/**
 * ต้นทุนตามแผน (จากเรตกลางตามตำแหน่ง — brief ภาคผนวก A)
 * COL = 8.00×30,000 + 14.00×17,000 + 14.00×10,000 = ฿618,000
 * Margin = 1,200,000 − (618,000 + 36,000 + 150,000 + 180,000) = ฿216,000 = 18.0%
 */
const COL = 618_000
const SOFTWARE_COST = 36_000
const OUTSOURCE_COST = 150_000
const OVERHEAD_COST = 180_000
const MARGIN = CONTRACT - COL - SOFTWARE_COST - OUTSOURCE_COST - OVERHEAD_COST
const MARGIN_PCT = (MARGIN / CONTRACT) * 100
/** เป้าสายงาน ID จาก Business Rules (S11) · เป้าบริษัท 30% */
const MARGIN_TARGET_ID = 32
const MARGIN_TARGET_COMPANY = 30

/** ค่าเฉลี่ยโครงการ ID มูลค่าใกล้กัน (฿1.0–1.5M) จาก Benchmark Library */
const BENCHMARK_PW = 30
/** กำลังว่างจริงของ Squad A ช่วง ก.ย. 69 – ก.พ. 70 (จากหน้าจัดสรรกำลังคน S6) */
const SQUAD_FREE_PW = 29.5

const TOTAL_SR = PLAN_PHASES.reduce((s, p) => s + p.sr, 0)
const TOTAL_MID = PLAN_PHASES.reduce((s, p) => s + p.mid, 0)
const TOTAL_JR = PLAN_PHASES.reduce((s, p) => s + p.jr, 0)
const TOTAL_PW = TOTAL_SR + TOTAL_MID + TOTAL_JR
const CAPACITY_PCT = Math.round((SQUAD_FREE_PW / TOTAL_PW) * 100) // = 82%

/* ── checklist 3 ข้อของ HoD (ตามวงจร §4) ───────────────────── */

interface ChecklistItem {
  id: string
  question: string
  /** ข้อมูลประกอบการตัดสิน — มาคู่สัญลักษณ์+สีเสมอ */
  evidence: string
  level: RiskLevel
}

const CHECKLIST: ChecklistItem[] = [
  {
    id: 'feasible',
    question: 'ทำได้จริงไหม — ไทม์ไลน์และขอบเขต',
    evidence: `22 สัปดาห์ (ก.ย. 69 – ก.พ. 70) · สูงกว่า benchmark ${personWeeks(TOTAL_PW - BENCHMARK_PW)} คน-สัปดาห์ · เผื่อรอลูกค้ารวม 21 วัน`,
    level: 'warn',
  },
  {
    id: 'capacity',
    question: 'Squad มีกำลังไหม',
    evidence: `Squad A ว่างจริง ${personWeeks(SQUAD_FREE_PW)} จาก ${personWeeks(TOTAL_PW)} คน-สัปดาห์ที่แผนต้องใช้ = ${percent(CAPACITY_PCT)}`,
    level: 'warn',
  },
  {
    id: 'margin',
    question: 'Margin ผ่านเป้าไหม',
    evidence: `${MARGIN_PCT.toFixed(1)}% — ต่ำกว่าเป้าสายงาน ID (${MARGIN_TARGET_ID}%) อยู่ ${(MARGIN_TARGET_ID - MARGIN_PCT).toFixed(1)} จุด`,
    level: 'critical',
  },
]

/* ── ประวัติการรีวิว (PlanReview — brief ภาคผนวก C) ─────────── */

interface PlanReviewEvent {
  id: string
  /** ส่งรีวิว / ตีกลับ / อนุมัติ */
  kind: 'submit' | 'reject' | 'approve'
  who: string
  role: string
  date: string
  /** เหตุผล (บังคับเมื่อตีกลับ) */
  reason?: string
  note?: string
}

const PLAN_REVIEWS: PlanReviewEvent[] = [
  {
    id: 'r1',
    kind: 'submit',
    who: 'คุณเอ',
    role: 'หัวหน้า Squad A',
    date: '22 ก.ค. 2569',
    note: 'ส่งครั้งแรก · 39.50 คน-สัปดาห์ · Margin 14.5%',
  },
  {
    id: 'r2',
    kind: 'reject',
    who: 'คุณกิตติ',
    role: 'หัวหน้าแผนก',
    date: '24 ก.ค. 2569',
    reason:
      'Margin 14.5% ต่ำกว่าเป้ามากเกินไป — ให้ตัด 3D ที่เกินขอบเขตสัญญาออก และลด Junior ในงวด 3 ลง แล้วส่งกลับมาใหม่',
  },
  {
    id: 'r3',
    kind: 'submit',
    who: 'คุณเอ',
    role: 'หัวหน้า Squad A',
    date: '31 ก.ค. 2569',
    note: `ส่งใหม่ ครั้งที่ 2 · ${personWeeks(TOTAL_PW)} คน-สัปดาห์ · Margin ${MARGIN_PCT.toFixed(1)}% — รอรีวิวอยู่ ${WAIT_DAYS} วัน`,
  },
]

const REVIEW_EVENT_META: Record<PlanReviewEvent['kind'], { mark: string; color: string; label: string }> = {
  submit: { mark: '▤', color: 'var(--dpm-sub)', label: 'ส่งรีวิว' },
  reject: { mark: '◆', color: 'var(--dpm-yellow)', label: 'ตีกลับ' },
  approve: { mark: '●', color: 'var(--dpm-green)', label: 'อนุมัติ' },
}

/* ── สไตล์ที่ใช้ซ้ำ ─────────────────────────────────────────── */

const numCell: CSSProperties = { fontSize: 13, textAlign: 'right' }
const linkStyle: CSSProperties = { fontSize: 12, cursor: 'pointer' }

/** กล่องสัญลักษณ์ชนิด "แผนงาน" — สไตล์เดียวกับคิวรีวิวใน S2 (▤ กรอบหมึกบนพื้นขาว) */
function PlanKindBox() {
  const k = REVIEW_KINDS.plan
  return (
    <span
      aria-label={k.label}
      style={{
        width: 26,
        height: 26,
        flex: 'none',
        borderRadius: 'var(--dpm-radius-badge)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        background: k.boxBg,
        border: `1px ${k.boxStyle} ${k.boxBorder}`,
        color: k.glyphColor,
      }}
    >
      {k.glyph}
    </span>
  )
}

type Decision = 'deciding' | 'approved' | 'rejected'
const REJECT_REASON_MIN = 10

export function ReviewApprovalPage() {
  const [decision, setDecision] = useState<Decision>('deciding')
  /** ติ๊กยืนยันรายข้อ — อนุมัติได้เมื่อครบ 3 ข้อ (ยืนยันว่าพิจารณาแล้วจริง) */
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  /** แผน ID-2026-011 บนเซิร์ฟเวอร์ (ถ้ามี) — การตัดสินจะเขียนที่เซิร์ฟเวอร์จริง + audit */
  const [livePlanId, setLivePlanId] = useState<number | null>(null)
  /** แผนอื่นที่รอรีวิวอยู่ (เช่น แผนที่เพิ่งส่งจาก S3) — โชว์เป็นคิวให้รู้ว่ามีงานต่อ */
  const [otherPending, setOtherPending] = useState<ServerPlan[]>([])
  /** ถ้าแผน 011 ถูกตัดสินไปแล้วในระบบ — แจ้งสถานะจริงแทนให้ตัดสินซ้ำ */
  const [alreadyDecided, setAlreadyDecided] = useState<ServerPlan | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await tryApi<{ plans: ServerPlan[] }>('/api/plans')
      if (cancelled || !res) return
      const mine = res.plans.filter((p) => p.projectCode === PROJECT_CODE)
      const proposed = mine.find((p) => p.status === 'proposed')
      if (proposed) setLivePlanId(proposed.id)
      else if (mine[0]) setAlreadyDecided(mine[0])
      setOtherPending(res.plans.filter((p) => p.status === 'proposed' && p.projectCode !== PROJECT_CODE))
    })()
    return () => {
      cancelled = true
    }
  }, [])

  /** ตัดสินผ่านเซิร์ฟเวอร์เมื่อมีแผนจริง — offline ก็ยังเดิน state ฝั่งหน้าเหมือนเดิม */
  const decide = (approve: boolean) => {
    setDecision(approve ? 'approved' : 'rejected')
    if (livePlanId !== null) {
      void tryApi(`/api/plans/${livePlanId}/decide`, {
        method: 'POST',
        body: JSON.stringify({ approve, reason: approve ? undefined : reason.trim() }),
      })
    }
  }

  const checkedCount = CHECKLIST.filter((c) => checked[c.id]).length
  const allChecked = checkedCount === CHECKLIST.length
  const reasonLen = reason.trim().length
  const reasonReady = reasonLen >= REJECT_REASON_MIN

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }))

  /* แถบ Margin: สเกล 0–50% · ขีดเป้า ID 32% ปักที่ 64% ของความกว้าง */
  const marginBarW = Math.max(0, Math.min(100, MARGIN_PCT * (100 / 50)))
  const marginColor = MARGIN_PCT >= MARGIN_TARGET_ID ? 'var(--dpm-green)' : MARGIN_PCT >= 20 ? 'var(--dpm-yellow)' : 'var(--dpm-red)'

  /** รายการ PlanReview ที่แสดง — เติมผลการตัดสินของวันนี้ต่อท้ายเมื่อกดแล้ว */
  const reviewEvents: PlanReviewEvent[] =
    decision === 'deciding'
      ? PLAN_REVIEWS
      : [
          ...PLAN_REVIEWS,
          decision === 'approved'
            ? {
                id: 'live',
                kind: 'approve',
                who: 'คุณกิตติ',
                role: 'หัวหน้าแผนก',
                date: 'เมื่อสักครู่',
                note: 'อนุมัติ — ส่งต่อ HoPD อนุมัติร่วม (Margin ต่ำกว่าเป้า)',
              }
            : {
                id: 'live',
                kind: 'reject',
                who: 'คุณกิตติ',
                role: 'หัวหน้าแผนก',
                date: 'เมื่อสักครู่',
                reason: reason.trim(),
              },
        ]

  return (
    <div
      style={{
        maxWidth: 'var(--dpm-page-max-w)',
        margin: '0 auto',
        padding: '0 var(--dpm-page-pad-x)',
      }}
    >
      {/* ── หัว: ชนิดรีวิว · รหัส · ผู้ส่ง · รอกี่วัน · ลิงก์กลับคิว ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '14px 0',
          borderBottom: '1px solid var(--dpm-border)',
        }}
      >
        <Link
          to="/department"
          aria-label="กลับคิวรีวิวของแผนก"
          style={{
            fontSize: 16,
            color: 'var(--dpm-sub)',
            padding: '4px 8px',
            borderRadius: 'var(--dpm-radius-control)',
          }}
        >
          ←
        </Link>
        <PlanKindBox />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{REVIEW_KINDS.plan.label}</span>
            <span className="dpm-mono" style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>
              {PROJECT_CODE}
            </span>
            <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>{PROJECT_NAME}</h1>
          </div>
          <div style={{ marginTop: 3, fontSize: 12, color: 'var(--dpm-sub)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{REVIEW_KINDS.plan.hint}</span>
            <span style={{ color: 'var(--dpm-border)' }}>|</span>
            <span>
              ส่งโดย {SUBMITTER} · {SUBMITTER_ROLE}
            </span>
            <span style={{ color: 'var(--dpm-border)' }}>|</span>
            <span>มูลค่าสัญญา {baht(CONTRACT)}</span>
          </div>
        </div>
        <span style={{ flex: 1 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 6 }}>
            <span style={{ fontSize: 9, color: 'var(--dpm-yellow)' }}>◆</span>
            <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--dpm-yellow)', lineHeight: 1 }}>
              {WAIT_DAYS}
            </span>
            <span style={{ fontSize: 12, color: 'var(--dpm-yellow)' }}>วัน</span>
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--dpm-mute)' }}>รอรีวิว · เกินเกณฑ์แผนก 2 วัน</div>
        </div>
      </div>

      {/* สถานะจริงจากเซิร์ฟเวอร์ — แผนนี้ถูกตัดสินแล้ว / มีแผนอื่นรอคิว */}
      {(alreadyDecided || otherPending.length > 0) && (
        <div
          style={{
            maxWidth: 'var(--dpm-page-max-w)',
            margin: '0 auto',
            padding: '12px var(--dpm-page-pad-x) 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {alreadyDecided && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: 'var(--dpm-subtle)',
                borderRadius: 'var(--dpm-radius-card)',
                fontSize: 13,
              }}
            >
              <span style={{ fontSize: 9, color: alreadyDecided.status === 'approved' ? 'var(--dpm-green)' : 'var(--dpm-yellow)' }}>
                {alreadyDecided.status === 'approved' ? '✓' : '◆'}
              </span>
              แผน {PROJECT_CODE} ถูกตัดสินไปแล้วในระบบ —{' '}
              {alreadyDecided.status === 'approved' ? 'อนุมัติ' : 'ตีกลับ'}โดย {alreadyDecided.decidedBy}
              {alreadyDecided.reason && (
                <span style={{ color: 'var(--dpm-sub)' }}>· เหตุผล: {alreadyDecided.reason}</span>
              )}
              <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>(หน้านี้แสดงเป็นบันทึกย้อนหลัง — ปุ่มตัดสินถูกปิด)</span>
            </div>
          )}
          {otherPending.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                border: '1px solid var(--dpm-yellow)',
                background: 'var(--dpm-tint-yellow)',
                borderRadius: 'var(--dpm-radius-card)',
                fontSize: 13,
              }}
            >
              <span style={{ fontSize: 9, color: 'var(--dpm-yellow)' }}>◆</span>
              มีแผนรอรีวิวต่อคิว:{' '}
              <span className="dpm-mono" style={{ fontSize: 12 }}>
                {p.projectCode}
              </span>{' '}
              {p.projectName} · Margin {p.marginPct}% · ส่งโดย {p.submittedBy}
              <span style={{ fontSize: 11, color: 'var(--dpm-amber-text)' }}>
                — จะขึ้นมาแสดงเมื่อแผนปัจจุบันถูกตัดสิน
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── โครงหลัก: ซ้ายสรุปแผน ~1.4 : ขวาแผงตัดสิน 1 ─────────── */}
      <div
        style={{
          padding: '24px 0 32px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.4fr) minmax(380px,1fr)',
          gap: 28,
          alignItems: 'start',
        }}
      >
        {/* ═══ ซ้าย: สรุปแผนที่ส่งมา (อ่านอย่างเดียว) ═══ */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="dpm-card">
            <div className="dpm-card__header">
              <span className="dpm-card__title">สรุปแผนที่ส่งมา</span>
              <span className="dpm-card__hint">Template ID — 4 งวด · ส่งครั้งที่ 2 · 31 ก.ค. 2569</span>
              <span style={{ flex: 1 }} />
              <a style={linkStyle}>เปิดแผนเต็มใน Workspace</a>
            </div>

            {/* ตารางงวด: ชื่อ · % · มูลค่า · คน-สัปดาห์ Sr/Mid/Jr */}
            <div
              className="dpm-table-head"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1.5fr) 48px 104px 62px 62px 62px 84px',
                gap: 10,
                padding: '7px 16px',
              }}
            >
              <span>งวดงาน</span>
              <span style={{ textAlign: 'right' }}>%</span>
              <span style={{ textAlign: 'right' }}>มูลค่า</span>
              <span style={{ textAlign: 'right' }}>Sr</span>
              <span style={{ textAlign: 'right' }}>Mid</span>
              <span style={{ textAlign: 'right' }}>Jr</span>
              <span style={{ textAlign: 'right' }}>รวม คน-สัปดาห์</span>
            </div>
            {PLAN_PHASES.map((p) => (
              <div
                key={p.no}
                className="dpm-table-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1.5fr) 48px 104px 62px 62px 62px 84px',
                  gap: 10,
                  alignItems: 'baseline',
                  padding: '11px 16px',
                }}
              >
                <span style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className="dpm-mono" style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
                    {p.no}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {p.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--dpm-mute)', whiteSpace: 'nowrap' }}>{p.weeks}</span>
                </span>
                <span style={{ ...numCell, color: 'var(--dpm-sub)' }}>{p.pct}</span>
                <span style={{ ...numCell, fontWeight: 600 }}>{baht((CONTRACT * p.pct) / 100)}</span>
                <span style={numCell}>{personWeeks(p.sr)}</span>
                <span style={numCell}>{personWeeks(p.mid)}</span>
                <span style={numCell}>{personWeeks(p.jr)}</span>
                <span style={{ ...numCell, fontWeight: 600 }}>{personWeeks(p.sr + p.mid + p.jr)}</span>
              </div>
            ))}
            {/* แถวรวม */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1.5fr) 48px 104px 62px 62px 62px 84px',
                gap: 10,
                alignItems: 'baseline',
                padding: '11px 16px',
                background: 'var(--dpm-subtle)',
                borderTop: '1px solid var(--dpm-ink)',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>รวม 4 งวด</span>
              <span style={{ ...numCell, fontWeight: 600 }}>100</span>
              <span style={{ ...numCell, fontWeight: 600 }}>{baht(CONTRACT)}</span>
              <span style={{ ...numCell, fontWeight: 600 }}>{personWeeks(TOTAL_SR)}</span>
              <span style={{ ...numCell, fontWeight: 600 }}>{personWeeks(TOTAL_MID)}</span>
              <span style={{ ...numCell, fontWeight: 600 }}>{personWeeks(TOTAL_JR)}</span>
              <span style={{ ...numCell, fontSize: 15, fontWeight: 600 }}>{personWeeks(TOTAL_PW)}</span>
            </div>
            <div style={{ padding: '10px 16px', fontSize: 11, color: 'var(--dpm-mute)', lineHeight: 1.6 }}>
              ต้นทุนตามแผน (จากเรตกลางตามตำแหน่ง): COL {baht(-COL)} · ซอฟต์แวร์ {baht(-SOFTWARE_COST)} ·
              ผู้ร่วมงานภายนอก {baht(-OUTSOURCE_COST)} · ดำเนินการส่วนกลาง {baht(-OVERHEAD_COST)}
            </div>
          </div>

          {/* เทียบ benchmark — เส้นอ้างอิงซ้ายแบบเดียวกับ S3 */}
          <div
            style={{
              borderLeft: '2px solid var(--dpm-border)',
              padding: '4px 0 4px 14px',
              fontSize: 12,
              color: 'var(--dpm-sub)',
              lineHeight: 1.6,
            }}
          >
            อ้างอิง: โครงการ ID ขนาดใกล้กัน (฿1.0–1.5M) จาก 5 โครงการที่ผ่านมา ใช้เฉลี่ย{' '}
            <b style={{ color: 'var(--dpm-ink)', fontWeight: 600 }}>{BENCHMARK_PW} คน-สัปดาห์</b> — แผนนี้{' '}
            <b style={{ color: 'var(--dpm-ink)', fontWeight: 600 }}>{personWeeks(TOTAL_PW)} คน-สัปดาห์</b>{' '}
            (สูงกว่าเฉลี่ย {personWeeks(TOTAL_PW - BENCHMARK_PW)})
          </div>

          {/* กล่องเทียบ Handoff ของ BD — 1 ประเด็นค้าง (กรอบเหลืองแบบ S3) */}
          <div className="dpm-card" style={{ borderColor: 'var(--dpm-yellow)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '11px 16px',
                borderBottom: '1px solid var(--dpm-border)',
                background: 'var(--dpm-subtle)',
              }}
            >
              <span style={{ fontSize: 10, color: 'var(--dpm-yellow)' }}>◆</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>เทียบกับ Handoff ของ BD — เหลือ 1 ประเด็นค้าง</span>
              <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>อีก 2 ประเด็นแก้แล้วในรอบก่อน</span>
              <span style={{ flex: 1 }} />
              <a style={linkStyle}>ดูใบเสนอราคา</a>
            </div>
            <div style={{ padding: '12px 16px', fontSize: 13, lineHeight: 1.55 }}>
              BD สัญญาลูกค้าว่าได้ <b>3D ภายใน 6 ภาพ</b> แต่แผนงวด 2 มี{' '}
              <b style={{ color: 'var(--dpm-yellow)' }}>4 ภาพ</b>
              <div style={{ fontSize: 12, color: 'var(--dpm-sub)', marginTop: 3 }}>
                ต้องทำ: ให้{SUBMITTER}เพิ่ม 2 ภาพ (+1.00 คน-สัปดาห์ Junior — Margin ลดอีกราว 0.8 จุด)
                หรือขอ BD (คุณบี) แก้ขอบเขตกับลูกค้า — ใช้เป็นเหตุผลตีกลับได้
              </div>
            </div>
          </div>
        </div>

        {/* ═══ ขวา: แผงตัดสิน (sticky) ═══ */}
        <div style={{ position: 'sticky', top: 76, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {decision === 'deciding' ? (
            <div className="dpm-card dpm-card--critical">
              {/* Margin ของแผน เทียบเป้าสายงาน */}
              <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--dpm-border)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>Margin ของแผนนี้</div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 34,
                        fontWeight: 600,
                        letterSpacing: '-0.02em',
                        lineHeight: 1,
                        color: marginColor,
                      }}
                    >
                      {MARGIN_PCT.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <MoneyFigure value={MARGIN} size={18} problem={MARGIN_PCT < 20} />
                    <div style={{ marginTop: 3, fontSize: 11, color: 'var(--dpm-mute)' }}>จากสัญญา {baht(CONTRACT)}</div>
                  </div>
                </div>
                {/* แถบสเกล 0–50% · ขีดเป้า ID 32% */}
                <div
                  style={{
                    marginTop: 12,
                    position: 'relative',
                    height: 10,
                    background: 'var(--dpm-subtle)',
                    borderRadius: 'var(--dpm-radius-bar)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${marginBarW}%`,
                      background: marginColor,
                      borderRadius: 'var(--dpm-radius-bar)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: `${MARGIN_TARGET_ID * (100 / 50)}%`,
                      top: -4,
                      bottom: -4,
                      width: 1,
                      background: 'var(--dpm-ink)',
                    }}
                  />
                </div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <RiskFlag
                    level="critical"
                    label={`ต่ำกว่าเป้าสายงาน ID ${MARGIN_TARGET_ID}% อยู่ ${(MARGIN_TARGET_ID - MARGIN_PCT).toFixed(1)} จุด`}
                  />
                  <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>เป้าบริษัท {MARGIN_TARGET_COMPANY}%</span>
                </div>
              </div>

              {/* checklist 3 ข้อของ HoD — ติ๊กยืนยันเองทีละข้อ */}
              <div style={{ padding: '12px 18px 6px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>คำถาม 3 ข้อก่อนตัดสิน</span>
                  <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
                    ยืนยันแล้ว {checkedCount}/{CHECKLIST.length}
                  </span>
                </div>
                <div style={{ marginTop: 8 }}>
                  {CHECKLIST.map((c) => {
                    const meta = STATUS[c.level]
                    const on = !!checked[c.id]
                    return (
                      <label
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 11,
                          padding: '10px 0',
                          borderBottom: '1px solid var(--dpm-border)',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(c.id)}
                          style={{ width: 15, height: 15, marginTop: 2, accentColor: 'var(--dpm-accent)', cursor: 'pointer' }}
                        />
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: on ? 'var(--dpm-ink)' : 'var(--dpm-sub)' }}>
                            {c.question}
                          </span>
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 6,
                              marginTop: 3,
                              fontSize: 12,
                              color: 'var(--dpm-sub)',
                              lineHeight: 1.5,
                            }}
                          >
                            <span aria-label={meta.label} style={{ fontSize: 9, color: meta.color, paddingTop: 3 }}>
                              {meta.mark}
                            </span>
                            {c.evidence}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* ปุ่มตัดสิน */}
              <div style={{ padding: '12px 18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Button
                  variant="primary"
                  disabled={!allChecked || alreadyDecided !== null}
                  onClick={() => decide(true)}
                  style={{ width: '100%' }}
                >
                  อนุมัติและมอบให้ Squad
                </Button>
                {!allChecked && (
                  <div style={{ fontSize: 11, color: 'var(--dpm-mute)', textAlign: 'center', lineHeight: 1.5 }}>
                    ติ๊กยืนยันให้ครบ 3 ข้อก่อนอนุมัติ — เหลืออีก {CHECKLIST.length - checkedCount} ข้อ
                  </div>
                )}
                {!rejectOpen ? (
                  <Button variant="secondary" onClick={() => setRejectOpen(true)} style={{ width: '100%' }}>
                    ตีกลับให้แก้
                  </Button>
                ) : (
                  <div
                    style={{
                      border: '1px solid var(--dpm-yellow)',
                      borderRadius: 'var(--dpm-radius-card)',
                      background: 'var(--dpm-tint-yellow)',
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>ตีกลับให้แก้ — ต้องบอกเหตุผล</div>
                    <div style={{ marginTop: 3, fontSize: 12, color: 'var(--dpm-amber-text)', lineHeight: 1.5 }}>
                      เขียนให้{SUBMITTER}รู้ว่าต้องแก้อะไร (อย่างน้อย {REJECT_REASON_MIN} ตัวอักษร) —
                      เหตุผลถูกบันทึกใน PlanReview และส่งถึงผู้ส่งแผน
                    </div>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      placeholder="เช่น ตัดขอบเขต 3D ที่เกินสัญญา แล้วลด Junior งวด 3 ให้ Margin ขึ้นเกิน 25% ..."
                      autoFocus
                      style={{
                        marginTop: 8,
                        width: '100%',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        fontSize: 13,
                        lineHeight: 1.55,
                        color: 'var(--dpm-ink)',
                        background: 'var(--dpm-surface)',
                        border: '1px solid var(--dpm-border)',
                        borderRadius: 'var(--dpm-radius-control)',
                        padding: '8px 10px',
                        resize: 'vertical',
                      }}
                    />
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Button
                        variant="secondary"
                        disabled={!reasonReady || alreadyDecided !== null}
                        onClick={() => decide(false)}
                      >
                        ยืนยันตีกลับ
                      </Button>
                      <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
                        {reasonReady ? 'พร้อมส่ง' : `พิมพ์แล้ว ${reasonLen}/${REJECT_REASON_MIN} ตัวอักษร`}
                      </span>
                      <span style={{ flex: 1 }} />
                      <a
                        style={linkStyle}
                        onClick={() => {
                          setRejectOpen(false)
                          setReason('')
                        }}
                      >
                        ยกเลิก
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : decision === 'approved' ? (
            /* ── ผลลัพธ์: อนุมัติแล้ว (การ์ดเขียว) ── */
            <div
              className="dpm-card"
              style={{ borderColor: 'var(--dpm-green)', background: 'var(--dpm-tint-green)' }}
            >
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ fontSize: 14, color: 'var(--dpm-green)' }}>✓</span>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>อนุมัติแล้ว — รอ HoPD อนุมัติร่วม</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: 'var(--dpm-sub)', lineHeight: 1.6 }}>
                  Margin {MARGIN_PCT.toFixed(1)}% ต่ำกว่าเป้า ตามสายอนุมัติแผนจึงยังไม่ถึงมือ Squad ทันที
                </div>
                <div
                  style={{
                    marginTop: 12,
                    background: 'var(--dpm-surface)',
                    border: '1px solid var(--dpm-border)',
                    borderRadius: 'var(--dpm-radius-control)',
                    padding: '12px 14px',
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--dpm-mute)', marginBottom: 4 }}>ขั้นถัดไป</div>
                  1. ระบบส่งแผนถึง HoPD (คุณณัฐ) แล้ว — รออนุมัติร่วม
                  <br />
                  2. เมื่อ HoPD อนุมัติ ระบบมอบงานให้ Squad A และแจ้ง{SUBMITTER}ทันที
                  <br />
                  3. รายการนี้ออกจากคิว "รอฉันรีวิว" ของคุณแล้ว
                </div>
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Link to="/department" className="dpm-btn dpm-btn--primary">
                    กลับคิวรีวิว
                  </Link>
                  <a style={linkStyle}>ดูสถานะการอนุมัติ</a>
                </div>
              </div>
            </div>
          ) : (
            /* ── ผลลัพธ์: ตีกลับแล้ว (การ์ดเหลือง) ── */
            <div
              className="dpm-card"
              style={{ borderColor: 'var(--dpm-yellow)', background: 'var(--dpm-tint-yellow)' }}
            >
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ fontSize: 11, color: 'var(--dpm-yellow)' }}>◆</span>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>ตีกลับให้แก้แล้ว</span>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    background: 'var(--dpm-surface)',
                    border: '1px solid var(--dpm-border)',
                    borderRadius: 'var(--dpm-radius-control)',
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>เหตุผลของคุณ</div>
                  <div style={{ marginTop: 3, fontSize: 13, lineHeight: 1.6 }}>{reason.trim()}</div>
                </div>
                <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7 }}>
                  <div style={{ fontSize: 11, color: 'var(--dpm-mute)', marginBottom: 4 }}>ขั้นถัดไป</div>
                  1. ระบบแจ้ง{SUBMITTER} (หัวหน้า Squad A) พร้อมเหตุผลแล้ว
                  <br />
                  2. แผนกลับสถานะ "กำลังวางแผน" — {SUBMITTER}แก้และส่งใหม่ได้ทันที
                  <br />
                  3. เมื่อส่งใหม่ (ครั้งที่ 3) รายการจะกลับเข้าคิวรีวิวของคุณ
                </div>
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Link to="/department" className="dpm-btn dpm-btn--secondary">
                    กลับคิวรีวิว
                  </Link>
                  <a style={linkStyle} onClick={() => setDecision('deciding')}>
                    เปลี่ยนใจ — กลับไปพิจารณา
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* สายอนุมัติ: Margin ต่ำกว่าเป้า → HoPD บังคับ (Business Rules S11) */}
          {decision === 'deciding' && (
            <ConstraintNotice
              text="แผนนี้ Margin ต่ำกว่าเป้า — การอนุมัติของคุณยังไม่สิ้นสุด"
              how='ตามสายอนุมัติ "Margin ต่ำกว่าเป้า → HoPD บังคับ" ระบบจะส่งต่อให้ HoPD อนุมัติร่วมโดยอัตโนมัติ'
              cta="ดูสายอนุมัติ"
            />
          )}
        </div>
      </div>

      {/* ── ล่าง: ประวัติการรีวิว (PlanReview) ───────────────────── */}
      <div className="dpm-card" style={{ marginBottom: 80 }}>
        <div className="dpm-card__header">
          <span className="dpm-card__title" style={{ fontSize: 14 }}>
            ประวัติการรีวิว
          </span>
          <span className="dpm-card__hint">PlanReview — ใคร อนุมัติ/ตีกลับ เมื่อไหร่ เหตุผล</span>
        </div>
        <div style={{ padding: '14px 18px 16px' }}>
          {reviewEvents.map((ev, i) => {
            const meta = REVIEW_EVENT_META[ev.kind]
            const last = i === reviewEvents.length - 1
            return (
              <div key={ev.id} style={{ display: 'flex', gap: 14 }}>
                {/* เส้น timeline + จุดสัญลักษณ์ */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 22 }}>
                  <span
                    aria-label={meta.label}
                    style={{
                      width: 22,
                      height: 22,
                      flex: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: meta.color,
                      background: 'var(--dpm-surface)',
                      border: `1px solid ${ev.kind === 'submit' ? 'var(--dpm-border)' : meta.color}`,
                      borderRadius: '50%',
                    }}
                  >
                    {meta.mark}
                  </span>
                  {!last && <span style={{ width: 1, flex: 1, background: 'var(--dpm-border)', minHeight: 10 }} />}
                </div>
                <div style={{ paddingBottom: last ? 0 : 14, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                    <span style={{ fontSize: 13 }}>
                      {ev.who} · {ev.role}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>{ev.date}</span>
                  </div>
                  {ev.note && (
                    <div style={{ marginTop: 3, fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.55 }}>{ev.note}</div>
                  )}
                  {ev.reason && (
                    <div
                      style={{
                        marginTop: 5,
                        fontSize: 12,
                        color: 'var(--dpm-ink)',
                        lineHeight: 1.55,
                        background: 'var(--dpm-subtle)',
                        borderLeft: '2px solid var(--dpm-yellow)',
                        borderRadius: 'var(--dpm-radius-badge)',
                        padding: '7px 12px',
                      }}
                    >
                      เหตุผล: {ev.reason}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
