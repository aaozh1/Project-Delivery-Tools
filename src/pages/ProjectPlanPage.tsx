import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { tryApi } from '../api/client'
import type { CSSProperties, MouseEvent } from 'react'
import { Button, MoneyFigure } from '../components'
import { baht, personWeeks, snapQuarter } from '../lib/format'

/**
 * S3 · Project Plan Workspace — หน้าที่สำคัญที่สุดของทั้งระบบ
 * ซ้ายวางแผนงวด (60%) ขวาคำนวณเงินสด ๆ (40%) — ปรับคน-สัปดาห์แล้วต้นทุน/กำไรขยับทันที
 * การคำนวณทั้งหมด synchronous ห้าม debounce ห้าม spinner ห้ามตัวเลขวิ่ง
 */

type RoleKey = 'senior' | 'mid' | 'junior'

const ROLE_KEYS: readonly RoleKey[] = ['senior', 'mid', 'junior'] as const
const ROLE_LABEL: Record<RoleKey, string> = { senior: 'Senior', mid: 'Mid', junior: 'Junior' }

/**
 * เรตกลางต่อคน-สัปดาห์ตามตำแหน่ง — ใช้ประมาณการตอนวางแผนเท่านั้น
 * mock ชั่วคราว: ค่าจริงต้องอ่านจาก PositionRate ใน Admin Console
 * (สิทธิ์จำกัด + บันทึก Audit Log ทุกครั้งที่อ่าน) เมื่อมี data layer
 */
const CENTRAL_RATES: Record<RoleKey, number> = { senior: 30_000, mid: 17_000, junior: 10_000 }

const DEFAULT_CONTRACT = 1_800_000
const SOFTWARE_COST = 36_000
const OUTSOURCE_COST = 120_000
const OVERHEAD_COST = 180_000
/** คน-สัปดาห์ที่ Squad D ว่างจริงในช่วงโครงการ (mock — มาจากหน้าจัดสรรกำลังคน) */
const SQUAD_CAPACITY = 40.2
/** ค่าเฉลี่ยจาก 4 โครงการบ้าน 280–320 ตร.ม. ที่ผ่านมา */
const BENCHMARK_PW = 44
const MARGIN_TARGET_PCT = 30

interface PhaseMeta {
  no: string
  name: string
  /** สัดส่วนมูลค่างวด (%) รวมทุกงวด = 100 */
  pct: number
  dates: string
  weeksLabel: string
  /** โควตารอบแก้แบบของงวด */
  revisionQuota: number
  /** วันเผื่อรอลูกค้าอนุมัติ */
  bufferDays: number
  deliverables: string[]
  milestone: { label: string; date: string }
}

const PHASES: PhaseMeta[] = [
  {
    no: '01',
    name: 'Concept Design',
    pct: 20,
    dates: '1 ก.ย. → 26 ก.ย. 2569',
    weeksLabel: '4 สัปดาห์',
    revisionQuota: 2,
    bufferDays: 7,
    deliverables: [
      'ผังบริเวณ',
      'ผังพื้น 2 ชั้น',
      'รูปด้าน 4 ด้าน',
      'Mood board',
      '3D ภายนอก 3 ภาพ',
      'ประมาณราคาเบื้องต้น',
    ],
    milestone: { label: 'นำเสนอลูกค้า', date: '24 ก.ย. 2569' },
  },
  {
    no: '02',
    name: 'DD + 3D',
    pct: 30,
    dates: '29 ก.ย. → 14 พ.ย. 2569',
    weeksLabel: '7 สัปดาห์',
    revisionQuota: 2,
    bufferDays: 7,
    deliverables: [
      'ผังพื้นละเอียด',
      'ผังฝ้าและไฟฟ้า',
      'ผังสุขาภิบาล',
      'แบบขยายบันได',
      'แบบขยายห้องน้ำ',
      '3D ภายนอก 3 ภาพ',
      '3D ภายใน 3 ภาพ',
      'สเปควัสดุหลัก',
      'ประมาณราคาขั้น DD',
    ],
    milestone: { label: 'นำเสนอ 3D ชุดสมบูรณ์', date: '12 พ.ย. 2569' },
  },
  {
    no: '03',
    name: 'แบบก่อสร้าง + ขออนุญาต',
    pct: 40,
    dates: '17 พ.ย. 2569 → 16 ม.ค. 2570',
    weeksLabel: '9 สัปดาห์',
    revisionQuota: 1,
    bufferDays: 14,
    deliverables: [
      'แบบสถาปัตยกรรมชุดก่อสร้าง',
      'แบบโครงสร้าง',
      'แบบไฟฟ้า',
      'แบบสุขาภิบาล',
      'แบบขยายประตู-หน้าต่าง',
      'แบบขยายผนังและวัสดุ',
      'รายการประกอบแบบ',
      'BOQ',
      'รายการคำนวณโครงสร้าง',
      'ผังบริเวณยื่นขออนุญาต',
      'เอกสารยื่นขออนุญาต',
      'หนังสือรับรองผู้ออกแบบ',
    ],
    milestone: { label: 'ยื่นขออนุญาตก่อสร้าง', date: '14 ม.ค. 2570' },
  },
  {
    no: '04',
    name: 'ที่ปรึกษาช่วงก่อสร้าง',
    pct: 10,
    dates: '19 ม.ค. → 30 เม.ย. 2570',
    weeksLabel: '15 สัปดาห์',
    revisionQuota: 0,
    bufferDays: 0,
    deliverables: [
      'ตรวจหน้างานรายเดือน',
      'รายงานตรวจงานแต่ละงวด',
      'อนุมัติวัสดุและ shop drawing',
      'สรุปปิดโครงการ',
    ],
    milestone: { label: 'ส่งมอบงานก่อสร้าง', date: '30 เม.ย. 2570' },
  },
]

/** ค่าเริ่มต้น Sr/Mid/Jr ต่องวด → รวม 12/16/21 = 49 pw → COL ฿842,000 → Margin ฿622,000 = 34.6% */
const DEFAULT_ALLOC: Record<RoleKey, number>[] = [
  { senior: 3.0, mid: 4.0, junior: 5.5 },
  { senior: 4.0, mid: 6.0, junior: 7.0 },
  { senior: 4.0, mid: 5.0, junior: 6.5 },
  { senior: 1.0, mid: 1.0, junior: 2.0 },
]

/* ── สไตล์ที่ใช้ซ้ำ ─────────────────────────────────────── */

const barTrack: CSSProperties = {
  position: 'relative',
  height: 6,
  background: 'var(--dpm-subtle)',
  borderRadius: 'var(--dpm-radius-bar)',
}

const linkStyle: CSSProperties = { fontSize: 12, cursor: 'pointer' }

/** Stepper −/+ ปรับทีละ 0.25 ไม่ต่ำกว่า 0 — stopPropagation เพราะอยู่ในการ์ดที่คลิกเพื่อพับ */
function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const step = (delta: number) => (e: MouseEvent) => {
    e.stopPropagation()
    onChange(snapQuarter(value + delta))
  }
  const btnStyle: CSSProperties = {
    width: 28,
    padding: '4px 0',
    fontSize: 14,
    textAlign: 'center',
    color: 'var(--dpm-sub)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    userSelect: 'none',
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        border: '1px solid var(--dpm-border)',
        borderRadius: 'var(--dpm-radius-control)',
        overflow: 'hidden',
        background: 'var(--dpm-bg)',
      }}
    >
      <button type="button" aria-label="ลด 0.25 คน-สัปดาห์" style={btnStyle} onClick={step(-0.25)}>
        −
      </button>
      <span
        style={{
          flex: 1,
          textAlign: 'center',
          fontSize: 14,
          fontWeight: 600,
          background: 'var(--dpm-surface)',
          padding: '4px 0',
        }}
      >
        {personWeeks(value)}
      </span>
      <button type="button" aria-label="เพิ่ม 0.25 คน-สัปดาห์" style={btnStyle} onClick={step(0.25)}>
        +
      </button>
    </div>
  )
}

export function ProjectPlanPage() {
  const [alloc, setAlloc] = useState<Record<RoleKey, number>[]>(DEFAULT_ALLOC)

  /* ── โครงการที่กำลังวางแผน — ?project=CODE เปิดโครงการจริงจากเซิร์ฟเวอร์ ── */
  const [searchParams] = useSearchParams()
  const paramCode = searchParams.get('project')
  const [header, setHeader] = useState({
    code: 'HS-2026-007',
    name: 'บ้านคุณสมชาย ทองหล่อ',
    client: 'คุณสมชาย',
    squad: 'D',
    bd: 'คุณบี',
  })
  const [contract, setContract] = useState(DEFAULT_CONTRACT)
  /** โครงการสถานะ planning ที่รอ Senior รับไปวางแผน (จาก Handoff จริง) */
  const [queue, setQueue] = useState<Array<{ code: string; name: string; client: string }>>([])
  const [submitState, setSubmitState] = useState<'idle' | 'sent' | 'offline'>('idle')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await tryApi<{
        projects: Array<{ code: string; name: string; client: string; squad: string; bd: string; contractValue: number | null; status?: string }>
      }>('/api/projects')
      if (cancelled || !res) return
      if (paramCode) {
        const p = res.projects.find((x) => x.code === paramCode)
        if (p) {
          setHeader({ code: p.code, name: p.name, client: p.client, squad: p.squad, bd: p.bd })
          if (p.contractValue) setContract(p.contractValue)
        }
      }
      setQueue(
        res.projects
          .filter((x) => x.status === 'planning' && x.code !== paramCode)
          .map((x) => ({ code: x.code, name: x.name, client: x.client })),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [paramCode])

  /** ส่งแผนเข้ารีวิว — เขียนที่เซิร์ฟเวอร์ (โครงการ → in_review + audit) */
  const submitPlan = () => {
    void (async () => {
      const res = await tryApi('/api/plans', {
        method: 'POST',
        body: JSON.stringify({
          projectCode: header.code,
          phases: PHASES.map((p, i) => ({
            no: i + 1,
            name: p.name,
            weightPct: p.pct,
            value: Math.round((contract * p.pct) / 100),
            pw: { sr: alloc[i].senior, mid: alloc[i].mid, jr: alloc[i].junior },
          })),
          totalPw: totalPW,
          marginPct: Math.round(marginPct * 10) / 10,
        }),
      })
      setSubmitState(res ? 'sent' : 'offline')
    })()
  }
  /** งวดที่ขยาย (1–4) — ขยายได้ทีละอัน · 0 = พับหมด */
  const [openPhase, setOpenPhase] = useState(1)
  const [flash, setFlash] = useState(false)
  const flashTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  const bump = (phaseIdx: number, role: RoleKey, delta: number) => {
    setAlloc((prev) =>
      prev.map((r, i) => (i === phaseIdx ? { ...r, [role]: snapQuarter(r[role] + delta) } : r)),
    )
    // flash 900ms — setTimeout เดียว ยกเลิกของเดิมเมื่อมีการเปลี่ยนซ้ำ
    setFlash(true)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(false), 900)
  }

  /* ── คำนวณสดทั้งหมด (synchronous) ─────────────────────── */
  const totals: Record<RoleKey, number> = { senior: 0, mid: 0, junior: 0 }
  alloc.forEach((r) => ROLE_KEYS.forEach((k) => (totals[k] += r[k])))
  const totalPW = totals.senior + totals.mid + totals.junior
  const col = ROLE_KEYS.reduce((sum, k) => sum + totals[k] * CENTRAL_RATES[k], 0)
  const margin = contract - col - SOFTWARE_COST - OUTSOURCE_COST - OVERHEAD_COST
  const marginPct = (margin / contract) * 100
  const marginPass = marginPct >= MARGIN_TARGET_PCT
  const marginColor = marginPass
    ? 'var(--dpm-ink)'
    : marginPct >= 20
      ? 'var(--dpm-yellow)'
      : 'var(--dpm-red)'
  const maxRolePW = Math.max(totals.senior, totals.mid, totals.junior) || 1
  const colColor = col > contract * 0.5 ? 'var(--dpm-red)' : 'var(--dpm-ink)'

  const capPct = totalPW > 0 ? Math.round((SQUAD_CAPACITY / totalPW) * 100) : 100
  const capLevel: 'ok' | 'warn' | 'critical' = capPct >= 100 ? 'ok' : capPct >= 80 ? 'warn' : 'critical'
  const capColor =
    capLevel === 'ok' ? 'var(--dpm-green)' : capLevel === 'warn' ? 'var(--dpm-yellow)' : 'var(--dpm-red)'
  const capMark = capLevel === 'ok' ? '✓' : capLevel === 'warn' ? '◆' : '▲'
  const shortfall = Math.max(0, totalPW - SQUAD_CAPACITY)

  const benchDiff = totalPW - BENCHMARK_PW
  const vsBenchmark =
    Math.abs(benchDiff) < 0.25
      ? '(เท่าค่าเฉลี่ย)'
      : benchDiff > 0
        ? `(สูงกว่าเฉลี่ย ${personWeeks(benchDiff)})`
        : `(ต่ำกว่าเฉลี่ย ${personWeeks(-benchDiff)})`

  return (
    <div
      style={{
        maxWidth: 'var(--dpm-page-max-w)',
        margin: '0 auto',
        padding: '0 var(--dpm-page-pad-x)',
      }}
    >
      {/* ── หัวโครงการ ─────────────────────────────────── */}
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="dpm-mono" style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>
              {header.code}
            </span>
            <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>
              {header.name}
            </h1>
          </div>
          <div
            style={{
              marginTop: 3,
              fontSize: 12,
              color: 'var(--dpm-sub)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                color: submitState === 'sent' ? 'var(--dpm-green)' : 'var(--dpm-yellow)',
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: 9 }}>{submitState === 'sent' ? '●' : '◆'}</span>
              {submitState === 'sent' ? 'ส่งรีวิวแล้ว — รอ HoD' : 'กำลังวางแผน'}
            </span>
            <span style={{ color: 'var(--dpm-border)' }}>|</span>
            <span>Squad {header.squad} (คุณเอ)</span>
            <span style={{ color: 'var(--dpm-border)' }}>|</span>
            <span>ลูกค้า {header.client}</span>
            <span style={{ color: 'var(--dpm-border)' }}>|</span>
            <span>BD {header.bd}</span>
          </div>
        </div>
        <span style={{ flex: 1 }} />
        <Button variant="secondary">บันทึกร่าง</Button>
        <Button variant="primary" disabled={submitState === 'sent'} onClick={submitPlan}>
          {submitState === 'sent' ? 'ส่งแล้ว ✓' : 'ส่ง HoD รีวิว'}
        </Button>
      </div>

      {/* สถานะการส่ง + คิวโครงการที่รอวางแผน (จาก Handoff จริง) */}
      {submitState === 'sent' && (
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            border: '1px solid var(--dpm-green)',
            background: 'var(--dpm-tint-green)',
            borderRadius: 'var(--dpm-radius-card)',
            fontSize: 13,
          }}
        >
          <span style={{ fontSize: 10, color: 'var(--dpm-green)' }}>✓</span>
          แผน {header.code} ถูกส่งเข้าคิวรีวิวของหัวหน้าแผนกแล้ว (บันทึกที่เซิร์ฟเวอร์ + Audit Log) —
          โครงการเปลี่ยนสถานะเป็น "รอรีวิว"
          <Link to="/review" style={{ fontSize: 12 }}>
            เปิดหน้ารีวิวในมุมมอง HoD →
          </Link>
        </div>
      )}
      {submitState === 'offline' && (
        <div
          style={{
            marginTop: 10,
            padding: '10px 14px',
            background: 'var(--dpm-subtle)',
            borderRadius: 'var(--dpm-radius-card)',
            fontSize: 12,
            color: 'var(--dpm-sub)',
          }}
        >
          ยังไม่ได้เชื่อมเซิร์ฟเวอร์ — แผนยังไม่ถูกบันทึก · รัน{' '}
          <span className="dpm-mono">npm run dev:full</span> แล้วส่งอีกครั้ง
        </div>
      )}
      {queue.length > 0 && submitState !== 'sent' && (
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            padding: '10px 14px',
            background: 'var(--dpm-subtle)',
            borderRadius: 'var(--dpm-radius-card)',
            fontSize: 13,
          }}
        >
          <span style={{ fontSize: 9, color: 'var(--dpm-accent)' }}>●</span>
          <b>คิวรอวางแผนจาก BD ({queue.length})</b>
          {queue.map((q) => (
            <Link
              key={q.code}
              to={`/plan?project=${q.code}`}
              className="dpm-chip"
              style={{ textDecoration: 'none' }}
            >
              <span className="dpm-mono" style={{ fontSize: 11 }}>
                {q.code}
              </span>
              {q.name}
            </Link>
          ))}
        </div>
      )}

      {/* ── grid ซ้ายวางแผน / ขวาคำนวณ ─────────────────── */}
      <div
        style={{
          padding: '24px 0 80px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.5fr) minmax(380px,1fr)',
          gap: 32,
          alignItems: 'start',
        }}
      >
        {/* ═══ ซ้าย: วางแผนงวด ═══ */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* แถบ Template */}
          <div
            className="dpm-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>TEMPLATE</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>House — 4 งวด</span>
              <span style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>
                ปรับจากมาตรฐานแผนกบ้านพักอาศัย
              </span>
            </div>
            <Button variant="secondary">ปรับ</Button>
          </div>

          {/* กล่องอ้างอิง benchmark — เทียบกับแผนปัจจุบันแบบสด */}
          <div
            style={{
              borderLeft: '2px solid var(--dpm-border)',
              padding: '4px 0 4px 14px',
              fontSize: 12,
              color: 'var(--dpm-sub)',
              lineHeight: 1.6,
            }}
          >
            อ้างอิง: บ้าน 280–320 ตร.ม. จาก 4 โครงการที่ผ่านมา ใช้เฉลี่ย{' '}
            <b style={{ color: 'var(--dpm-ink)', fontWeight: 600 }}>{BENCHMARK_PW} คน-สัปดาห์</b> ·
            แผนนี้ตอนนี้{' '}
            <b style={{ color: 'var(--dpm-ink)', fontWeight: 600 }}>
              {personWeeks(totalPW)} คน-สัปดาห์
            </b>{' '}
            {vsBenchmark}
          </div>

          {/* การ์ดงวด 4 งวด */}
          <div className="dpm-card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 16px',
                borderBottom: '1px solid var(--dpm-border)',
                background: 'var(--dpm-subtle)',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>งวดงาน</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--dpm-green)',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span style={{ fontSize: 11 }}>✓</span>รวม 100%
                </span>
                <span style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>{baht(contract)}</span>
              </div>
            </div>

            {PHASES.map((phase, i) => {
              const expanded = openPhase === i + 1
              const roles = alloc[i]
              const phasePW = roles.senior + roles.mid + roles.junior
              const maxPhaseRole = Math.max(roles.senior, roles.mid, roles.junior) || 1
              return (
                <div key={phase.no} style={{ borderBottom: '1px solid var(--dpm-border)' }}>
                  {/* หัวการ์ดงวด — คลิกเพื่อพับ/ขยาย (ขยายได้ทีละอัน) */}
                  <div
                    className="dpm-table-row"
                    role="button"
                    aria-expanded={expanded}
                    onClick={() => setOpenPhase((cur) => (cur === i + 1 ? 0 : i + 1))}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '22px 40px minmax(0,1fr) 200px 74px 116px',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      borderBottom: 'none',
                    }}
                  >
                    <span style={{ fontSize: 10, color: 'var(--dpm-mute)' }}>
                      {expanded ? '▼' : '▶'}
                    </span>
                    <span className="dpm-mono" style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
                      {phase.no}
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {phase.name}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>{phase.dates}</span>
                    <span style={{ fontSize: 13, color: 'var(--dpm-sub)', textAlign: 'right' }}>
                      {phase.pct}%
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600, textAlign: 'right' }}>
                      {baht((contract * phase.pct) / 100)}
                    </span>
                  </div>

                  {/* การ์ดที่พับต้องยังอ่านได้ครบ: คน-สัปดาห์ · Deliverable · โควตาแก้แบบ */}
                  {!expanded && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '22px 40px minmax(0,1fr)',
                        gap: 12,
                        padding: '0 16px 12px',
                      }}
                    >
                      <div />
                      <div />
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          fontSize: 12,
                          color: 'var(--dpm-mute)',
                        }}
                      >
                        <span>{personWeeks(phasePW)} คน-สัปดาห์</span>
                        <span style={{ color: 'var(--dpm-border)' }}>|</span>
                        <span>Deliverable {phase.deliverables.length} รายการ</span>
                        <span style={{ color: 'var(--dpm-border)' }}>|</span>
                        <span>แก้แบบ {phase.revisionQuota} รอบ</span>
                      </div>
                    </div>
                  )}

                  {expanded && (
                    <div
                      style={{
                        padding: '0 16px 18px 74px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}
                    >
                      {/* บรรทัดวันที่ / โควตา / เวลาเผื่อ */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 20,
                          fontSize: 12,
                          color: 'var(--dpm-sub)',
                        }}
                      >
                        <span>
                          {phase.dates} ·{' '}
                          <b style={{ color: 'var(--dpm-ink)' }}>{phase.weeksLabel}</b>
                        </span>
                        <span style={{ color: 'var(--dpm-border)' }}>|</span>
                        <span>
                          โควตาแก้แบบ{' '}
                          <b style={{ color: 'var(--dpm-ink)' }}>{phase.revisionQuota} รอบ</b>
                        </span>
                        <span style={{ color: 'var(--dpm-border)' }}>|</span>
                        <span>
                          เผื่อรอลูกค้าอนุมัติ{' '}
                          <b style={{ color: 'var(--dpm-ink)' }}>{phase.bufferDays} วัน</b>
                        </span>
                      </div>

                      {/* Deliverable ชิป */}
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 8,
                          }}
                        >
                          <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>
                            DELIVERABLE · {phase.deliverables.length} รายการ
                          </span>
                          <a style={linkStyle}>แก้ไข</a>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {phase.deliverables.map((d) => (
                            <span
                              key={d}
                              style={{
                                fontSize: 12,
                                color: 'var(--dpm-ink)',
                                background: 'var(--dpm-subtle)',
                                borderRadius: 'var(--dpm-radius-control)',
                                padding: '5px 10px',
                              }}
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* ตารางกำลังคนตามตำแหน่ง */}
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 8,
                          }}
                        >
                          <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>
                            กำลังคนที่ต้องใช้ · ระบุเป็นตำแหน่ง ยังไม่ผูกชื่อคน
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>
                            รวม{' '}
                            <b style={{ color: 'var(--dpm-ink)' }}>{personWeeks(phasePW)}</b>{' '}
                            คน-สัปดาห์
                          </span>
                        </div>
                        <div
                          style={{
                            border: '1px solid var(--dpm-border)',
                            borderRadius: 'var(--dpm-radius-control)',
                            overflow: 'hidden',
                          }}
                        >
                          {ROLE_KEYS.map((role) => (
                            <div
                              key={role}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '96px minmax(0,1fr) 150px 96px',
                                alignItems: 'center',
                                gap: 14,
                                padding: '9px 12px',
                                borderBottom: '1px solid var(--dpm-border)',
                              }}
                            >
                              <span style={{ fontSize: 13, fontWeight: 500 }}>
                                {ROLE_LABEL[role]}
                              </span>
                              <div style={barTrack}>
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: `${(roles[role] / maxPhaseRole) * 100}%`,
                                    background: 'var(--dpm-ink)',
                                    borderRadius: 'var(--dpm-radius-bar)',
                                    transition: 'width 220ms ease',
                                  }}
                                />
                              </div>
                              <Stepper
                                value={roles[role]}
                                onChange={(v) => bump(i, role, v - roles[role])}
                              />
                              <span
                                style={{
                                  fontSize: 12,
                                  color: 'var(--dpm-mute)',
                                  textAlign: 'right',
                                }}
                              >
                                {baht(roles[role] * CENTRAL_RATES[role])}
                              </span>
                            </div>
                          ))}
                          <div
                            style={{
                              padding: '8px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <a style={linkStyle}>+ เพิ่มตำแหน่ง</a>
                            <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
                              ปรับทีละ 0.25 คน-สัปดาห์
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Milestone */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                        <span style={{ fontSize: 9, color: 'var(--dpm-accent)' }}>◆</span>
                        <span style={{ color: 'var(--dpm-sub)' }}>Milestone:</span>
                        <span style={{ fontWeight: 600 }}>{phase.milestone.label}</span>
                        <span style={{ color: 'var(--dpm-sub)' }}>{phase.milestone.date}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            <div
              style={{
                padding: '11px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <a style={{ fontSize: 13, cursor: 'pointer' }}>+ เพิ่มงวด</a>
              <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>
                4 งวด · รวม {personWeeks(totalPW)} คน-สัปดาห์
              </span>
            </div>
          </div>

          {/* กล่องเทียบ BD — กรอบเหลือง 2 ประเด็น พร้อมบรรทัด "ต้องทำ:" */}
          <div
            className="dpm-card"
            style={{ borderColor: 'var(--dpm-yellow)' }}
          >
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
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                เทียบกับที่ BD สัญญาไว้ — 2 ประเด็น
              </span>
              <span style={{ flex: 1 }} />
              <a style={linkStyle}>ดูใบเสนอราคา</a>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1fr) 150px',
                gap: 12,
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '1px solid var(--dpm-border)',
              }}
            >
              <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                BD แจ้งลูกค้าว่าได้ <b>3D 5 ภาพ</b> แต่แผนงวด 1 มี{' '}
                <b style={{ color: 'var(--dpm-yellow)' }}>3 ภาพ</b>
                <div style={{ fontSize: 12, color: 'var(--dpm-sub)', marginTop: 3 }}>
                  ต้องทำ: เพิ่ม 2 ภาพ (+1.5 คน-สัปดาห์ Junior) หรือขอ BD แก้ขอบเขตกับลูกค้า
                </div>
              </div>
              <Button variant="secondary">แก้ Deliverable</Button>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1fr) 150px',
                gap: 12,
                alignItems: 'center',
                padding: '12px 16px',
              }}
            >
              <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                BD แจ้งส่งงาน <b>ธ.ค. 2569</b> แต่แผนจบ{' '}
                <b style={{ color: 'var(--dpm-yellow)' }}>ม.ค. 2570</b>
                <div style={{ fontSize: 12, color: 'var(--dpm-sub)', marginTop: 3 }}>
                  ต้องทำ: ลดเวลาเผื่อรออนุมัติ หรือแจ้ง BD เลื่อนวันส่งมอบกับลูกค้า
                </div>
              </div>
              <Button variant="secondary">แก้ไทม์ไลน์</Button>
            </div>
          </div>
        </div>

        {/* ═══ ขวา: แผงประมาณการ (sticky top 96px) ═══ */}
        <div
          style={{
            position: 'sticky',
            top: 96,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div className="dpm-card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderBottom: '1px solid var(--dpm-border)',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600 }}>ประมาณการโครงการ</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: 'var(--dpm-mute)',
                }}
              >
                <span className="dpm-live-dot" style={{ display: 'inline-block' }} />
                {flash ? 'กำลังคำนวณ' : 'สด'}
              </span>
            </div>

            <div style={{ padding: '14px 18px 4px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  padding: '7px 0',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>มูลค่าสัญญา</span>
                <MoneyFigure value={contract} />
              </div>

              {/* COL คำนวณสดจาก state ของทุกงวด */}
              <div style={{ padding: '9px 0 7px', borderTop: '1px solid var(--dpm-border)', marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>COL (ค่าแรง)</span>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      transition: 'color 400ms ease',
                      color: colColor,
                    }}
                  >
                    {baht(-col)}
                  </span>
                </div>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {ROLE_KEYS.map((role) => (
                    <div
                      key={role}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '52px minmax(0,1fr) 96px',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>
                        {ROLE_LABEL[role]}
                      </span>
                      <div style={barTrack}>
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${(totals[role] / maxRolePW) * 100}%`,
                            background: 'var(--dpm-mute)',
                            borderRadius: 'var(--dpm-radius-bar)',
                            transition: 'width 260ms ease',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 12, textAlign: 'right' }}>
                        <b style={{ fontWeight: 600 }}>{personWeeks(totals[role])}</b>{' '}
                        <span style={{ color: 'var(--dpm-mute)' }}>คน-สัปดาห์</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 7, fontSize: 11, color: 'var(--dpm-mute)' }}>
                  คำนวณจากเรตกลางตามตำแหน่ง · Senior {baht(CENTRAL_RATES.senior)} · Mid{' '}
                  {baht(CENTRAL_RATES.mid)} · Junior {baht(CENTRAL_RATES.junior)} ต่อคน-สัปดาห์
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderTop: '1px solid var(--dpm-border)',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>ค่าซอฟต์แวร์</span>
                <span style={{ fontSize: 15 }}>{baht(-SOFTWARE_COST)}</span>
              </div>
              <div style={{ padding: '8px 0', borderTop: '1px solid var(--dpm-border)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>ผู้ร่วมงานภายนอก</span>
                  <span style={{ fontSize: 15 }}>{baht(-OUTSOURCE_COST)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginTop: 3,
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--dpm-mute)', paddingLeft: 10 }}>
                    วิศวกรโครงสร้าง
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
                    {baht(OUTSOURCE_COST)}
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  padding: '8px 0 12px',
                  borderTop: '1px solid var(--dpm-border)',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>ค่าดำเนินการส่วนกลาง</span>
                <span style={{ fontSize: 15 }}>{baht(-OVERHEAD_COST)}</span>
              </div>
            </div>

            {/* กล่อง Margin — พระเอกของแผง: border-top เข้มเส้นเดียว + flash 900ms เมื่อค่าเปลี่ยน */}
            <div
              style={{
                padding: '16px 18px 18px',
                borderTop: '1px solid var(--dpm-ink)',
                transition: 'background 700ms ease',
                background: flash ? 'var(--dpm-subtle)' : 'var(--dpm-surface)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Margin</span>
                <div
                  style={{
                    fontSize: 40,
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                    transition: 'color 400ms ease',
                    color: marginColor,
                    textAlign: 'right',
                  }}
                >
                  {baht(margin)}
                </div>
              </div>
              {/* แถบ % สเกล 0–50 · ขีดเป้า 30% ปักที่ 60% ของความกว้าง */}
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
                    width: `${Math.max(0, Math.min(100, marginPct * (100 / 50)))}%`,
                    background: marginColor,
                    borderRadius: 'var(--dpm-radius-bar)',
                    transition: 'width 300ms ease, background 400ms ease',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '60%',
                    top: -4,
                    bottom: -4,
                    width: 1,
                    background: 'var(--dpm-ink)',
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    transition: 'color 400ms ease',
                    color: marginColor,
                  }}
                >
                  {marginPct.toFixed(1)}%
                </span>
                <span
                  style={{
                    fontSize: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: marginPass ? 'var(--dpm-green)' : 'var(--dpm-yellow)',
                  }}
                >
                  <span style={{ fontSize: 11 }}>{marginPass ? '✓' : '◆'}</span>
                  {marginPass
                    ? `เป้าบริษัท ${MARGIN_TARGET_PCT}% — ผ่าน`
                    : `เป้าบริษัท ${MARGIN_TARGET_PCT}% — ต่ำกว่าเป้า ${(MARGIN_TARGET_PCT - marginPct).toFixed(1)} จุด`}
                </span>
              </div>
            </div>
          </div>

          {/* กล่องกำลัง Squad — capacity ÷ total pw คำนวณสด */}
          <div
            style={{
              border: `1px solid ${capLevel === 'ok' ? 'var(--dpm-border)' : capColor}`,
              borderRadius: 'var(--dpm-radius-card)',
              background: 'var(--dpm-surface)',
              padding: '14px 16px',
              transition: 'border-color 400ms ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: capColor }}>{capMark}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                Squad D มีกำลังพอ {capPct}% ของที่แผนนี้ต้องการ
              </span>
            </div>
            <div
              style={{
                position: 'relative',
                height: 8,
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
                  width: `${Math.min(100, capPct)}%`,
                  background: capColor,
                  borderRadius: 'var(--dpm-radius-bar)',
                  transition: 'width 260ms ease, background 400ms ease',
                }}
              />
              {/* ขีดอ้างอิง 100% ที่ขอบขวาของสเกล */}
              <div
                style={{
                  position: 'absolute',
                  left: '100%',
                  top: -4,
                  bottom: -4,
                  width: 1,
                  background: 'var(--dpm-ink)',
                }}
              />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.55 }}>
              {capPct >= 100
                ? `กำลังว่าง ${personWeeks(SQUAD_CAPACITY)} คน-สัปดาห์ · แผนต้องการ ${personWeeks(totalPW)} คน-สัปดาห์`
                : `แผนต้องการ ${personWeeks(totalPW)} คน-สัปดาห์ แต่ Squad D ว่างจริง ${personWeeks(SQUAD_CAPACITY)} — ขาด ${personWeeks(shortfall)} คน-สัปดาห์`}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.55 }}>
              ต้องทำ: ยืมคนข้าม Squad ไม่ได้ — ยืดไทม์ไลน์ ลดขอบเขต
              หรือขอหัวหน้าแผนกย้ายคนเข้า Squad D
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Button variant="secondary">ดูภาระงาน Squad</Button>
              <a style={{ fontSize: 12, cursor: 'pointer' }}>ขอย้ายคนจากหัวหน้าแผนก</a>
            </div>
          </div>

          <div style={{ textAlign: 'right', paddingRight: 2 }}>
            <a style={{ fontSize: 12, cursor: 'pointer' }}>ดูรายละเอียดต้นทุน →</a>
          </div>
        </div>
      </div>
    </div>
  )
}
