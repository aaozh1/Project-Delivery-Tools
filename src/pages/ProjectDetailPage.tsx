import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  DualProgressBar,
  LockIcon,
  MoneyFigure,
  NoAccessBlock,
  PhaseStatusPill,
  PhaseTrack,
  RevisionCounter,
  RiskFlag,
  StatusMark,
} from '../components'
import { healthLevel, type PhaseStatus, type RiskLevel } from '../lib/status'
import { baht, bahtAbbrev, percent, personWeeks } from '../lib/format'
import { PROJECTS, SERVICE_LINE_LABELS, type Project, type ProjectPhase } from '../data/projects'
import { useRole } from '../auth/RoleContext'
import { canSeeMoney, ROLE_LABELS } from '../auth/roles'

/**
 * S4 · Project Detail / Status — "โครงการนี้อยู่ตรงไหน?"
 * ผู้ใช้: ทุกคน — จึงเป็นหน้าเดียวที่ต้องอยู่ได้ทั้งแบบเห็นเงินและไม่เห็นเงิน
 * (designer/bd เห็นความคืบหน้า/งวด/นาฬิกาครบ แต่ส่วนการเงินเป็น NoAccessBlock ตาม §5)
 */

/* ── mock ประกอบหน้า (แทนด้วย data layer จริงภายหลัง) ─────────────── */

/**
 * Margin ณ ปัจจุบัน / พยากรณ์ตอนจบ ต่อโครงการ (%)
 * ค่าชุดเดียวกับหน้า Portfolio (S1) เพื่อให้เลขสองหน้าตรงกัน —
 * เมื่อมี data layer จริงต้องคำนวณจากสูตร EAC ภาคผนวก A:
 * EAC = คน-สัปดาห์ที่ใช้แล้ว ÷ (คืบหน้า% ÷ 100) · Margin ตอนจบ = สัญญา − (EAC × blended_rate + ต้นทุนที่เหลือ)
 */
const MARGIN_MOCK: Record<string, { now: number; forecast: number }> = {
  'ID-2026-004': { now: 6, forecast: -4 },
  'AR-2025-011': { now: 27, forecast: 25 },
  'AR-2026-002': { now: 24, forecast: 19 },
  'HS-2026-007': { now: 35, forecast: 34 },
  'GR-2026-014': { now: 40, forecast: 41 },
  'ID-2026-009': { now: 31, forecast: 30 },
}

/** เจ้าของนาฬิกาใน ClockLog (ภาคผนวก C) — สีตามสเปก Clock Ownership Bar */
type ClockOwner = 'us' | 'client' | 'gov'

const CLOCK_OWNER_META: Record<ClockOwner, { label: string; color: string; text: string }> = {
  us: { label: 'ทีมเรา', color: 'var(--dpm-ink)', text: 'var(--dpm-bg)' },
  client: { label: 'ลูกค้า', color: 'var(--dpm-blue)', text: 'var(--dpm-bg)' },
  gov: { label: 'ราชการ', color: 'var(--dpm-mute)', text: 'var(--dpm-bg)' },
}

interface ClockSegment {
  owner: ClockOwner
  days: number
  note: string
}

/**
 * ClockLog อย่างย่อของแต่ละโครงการ (mock) — ช่วงเวลาต่อเนื่องว่า "งานค้างอยู่กับใคร"
 * ยอดวันช้าสะสม (delayUs/delayClient ใน projects.ts) คือส่วนที่เกินแผนของแต่ละฝั่ง
 * ไม่ใช่ผลรวมของแถบทั้งเส้น
 */
const CLOCK_LOG: Record<string, ClockSegment[]> = {
  'ID-2026-004': [
    { owner: 'us', days: 15, note: 'เริ่มงวด 3 — ทำแบบก่อสร้างชุดแรก' },
    { owner: 'client', days: 6, note: 'รอลูกค้าคอนเฟิร์มวัสดุ FF&E' },
    { owner: 'us', days: 21, note: 'แก้แบบรอบ 2–3' },
    { owner: 'client', days: 5, note: 'รออนุมัติแบบหลังแก้' },
    { owner: 'us', days: 9, note: 'กำลังทำ (ช่วงปัจจุบัน)' },
  ],
  'AR-2025-011': [
    { owner: 'us', days: 24, note: 'ทำ Construction Doc' },
    { owner: 'client', days: 8, note: 'รอลูกค้ารีวิวแบบ' },
    { owner: 'gov', days: 14, note: 'ยื่นเขตพิจารณาแบบขออนุญาต' },
    { owner: 'us', days: 6, note: 'ปรับตามข้อสังเกตเขต' },
    { owner: 'client', days: 12, note: 'รอลูกค้าอนุมัติชุดสุดท้าย (ช่วงปัจจุบัน)' },
  ],
  'AR-2026-002': [
    { owner: 'us', days: 12, note: 'ทำ Schematic' },
    { owner: 'client', days: 10, note: 'รอข้อมูลผังการใช้พื้นที่คลัง' },
    { owner: 'us', days: 8, note: 'ปรับผังตามข้อมูลใหม่' },
    { owner: 'client', days: 8, note: 'รอลูกค้ารีวิว (ช่วงปัจจุบัน)' },
  ],
  'HS-2026-007': [
    { owner: 'us', days: 10, note: 'ทำ Concept Design' },
    { owner: 'client', days: 3, note: 'รอนัดนำเสนอ' },
    { owner: 'us', days: 7, note: 'กำลังทำ (ช่วงปัจจุบัน)' },
  ],
  'GR-2026-014': [
    { owner: 'us', days: 9, note: 'พัฒนาแบบตาม Concept ที่อนุมัติ' },
    { owner: 'client', days: 4, note: 'รอฟีดแบ็กชุดแรก' },
    { owner: 'us', days: 8, note: 'ปรับตามฟีดแบ็ก' },
    { owner: 'client', days: 2, note: 'รอลูกค้ารีวิว (ช่วงปัจจุบัน)' },
  ],
  'ID-2026-009': [
    { owner: 'us', days: 11, note: 'ทำ DD + 3D' },
    { owner: 'client', days: 4, note: 'รอคอนเฟิร์มสเปควัสดุ' },
    { owner: 'us', days: 13, note: 'กำลังทำ (ช่วงปัจจุบัน)' },
  ],
}

interface TeamMember {
  name: string
  position: string
  /** คน-สัปดาห์ที่จัดสรรให้โครงการนี้ในสัปดาห์ปัจจุบัน */
  pw: number
}

/** ทีมที่จัดสรรให้โครงการในสัปดาห์นี้ (mock ตาม Squad — ค่าจริงมาจาก WeeklyAllocation) */
const TEAM_THIS_WEEK: Record<string, TeamMember[]> = {
  A: [
    { name: 'คุณเอ', position: 'Senior (หัวหน้า Squad A)', pw: 0.5 },
    { name: 'คุณซี', position: 'Mid Designer', pw: 1.0 },
    { name: 'คุณดา', position: 'Junior Designer', pw: 0.75 },
    { name: 'คุณต้น', position: 'Draftsman', pw: 1.0 },
  ],
  C: [
    { name: 'คุณโอ๊ค', position: 'Senior (หัวหน้า Squad C)', pw: 0.5 },
    { name: 'คุณแพร', position: 'Mid Architect', pw: 1.0 },
    { name: 'คุณภูมิ', position: 'Junior Architect', pw: 0.75 },
  ],
  D: [
    { name: 'คุณหนึ่ง', position: 'Senior (หัวหน้า Squad D)', pw: 0.25 },
    { name: 'คุณฝน', position: 'Mid Architect', pw: 0.75 },
    { name: 'คุณเจมส์', position: 'Junior Architect', pw: 0.5 },
  ],
  F: [
    { name: 'คุณมิ้นท์', position: 'Senior (หัวหน้า Squad F)', pw: 0.5 },
    { name: 'คุณกัน', position: 'Graphic Designer', pw: 1.0 },
    { name: 'คุณพลอย', position: 'Junior Graphic', pw: 0.5 },
  ],
}

/** สถานะเก็บเงินของงวด สรุปจากสถานะงวด 6 ขั้น — ทุกสถานะมีสัญลักษณ์คู่สี */
const BILLING_STATE: Record<
  PhaseStatus,
  { mark: string; color: string; label: string; action?: { label: string; to: string } }
> = {
  paid: { mark: '✓', color: 'var(--dpm-green)', label: 'รับเงินแล้ว' },
  billed: { mark: '✓', color: 'var(--dpm-accent)', label: 'วางบิลแล้ว · รอรับเงิน' },
  approved: {
    mark: '◆',
    color: 'var(--dpm-yellow)',
    label: 'อนุมัติแล้ว · ยังไม่วางบิล',
    action: { label: 'สั่งวางบิล', to: '/finance' },
  },
  delivered: { mark: '○', color: 'var(--dpm-mute)', label: 'รอลูกค้าอนุมัติ' },
  'in-progress': { mark: '○', color: 'var(--dpm-mute)', label: 'ยังไม่ถึงรอบเก็บเงิน' },
  'not-started': { mark: '○', color: 'var(--dpm-mute)', label: 'ยังไม่เริ่มงวด' },
}

/** งวดที่นับเป็นรับรู้รายได้แล้ว = ผ่านการอนุมัติของลูกค้าขึ้นไป */
const RECOGNIZED: PhaseStatus[] = ['approved', 'billed', 'paid']

/* ── ชิ้นส่วนย่อยของหน้า ─────────────────────────────────────────── */

const cardHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 10,
  padding: '12px 18px',
  borderBottom: '1px solid var(--dpm-border)',
}

/** ช่องมูลค่าที่จำกัดสิทธิ์ — บอกว่าจำกัด ไม่ใช่ปล่อยว่างให้เดา (คำอธิบายเต็มอยู่ที่ NoAccessBlock) */
function RestrictedMoney({ size = 13 }: { size?: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: size,
        color: 'var(--dpm-mute)',
      }}
    >
      <LockIcon size={14} color="var(--dpm-mute)" />
      จำกัดสิทธิ์
    </span>
  )
}

/** ตัวเลือกโครงการ — ชิปสลับดูโครงการอื่นจากทะเบียนกลาง */
function ProjectPicker({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (code: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '14px 0 0' }}>
      {PROJECTS.map((p) => {
        const isSelected = p.code === selected
        return (
          <button
            key={p.code}
            type="button"
            className={`dpm-chip${isSelected ? ' is-selected' : ''}`}
            onClick={() => onSelect(p.code)}
            aria-pressed={isSelected}
            style={{ fontFamily: 'inherit' }}
          >
            <StatusMark level={healthLevel(p.usedPct, p.progressPct)} size={8} />
            <span className="dpm-mono" style={{ fontSize: 11 }}>
              {p.code}
            </span>
            {p.name}
          </button>
        )
      })}
    </div>
  )
}

/** แถวสรุปบน 5 ช่อง — โครงเดียวกับแถบ KPI ของ Portfolio (S1) */
function SummaryStrip({ project, moneyVisible }: { project: Project; moneyVisible: boolean }) {
  const gap = project.usedPct - project.progressPct
  const health = healthLevel(project.usedPct, project.progressPct)
  const currentPhase = project.phases.find((ph) => ph.no === project.currentPhase)
  const fin = MARGIN_MOCK[project.code] ?? { now: 0, forecast: 0 }
  const marginColor =
    fin.forecast < 0 ? 'var(--dpm-red)' : fin.forecast < 20 ? 'var(--dpm-yellow)' : 'var(--dpm-ink)'
  const marginLevel: RiskLevel | null = fin.forecast < 0 ? 'critical' : fin.forecast < 20 ? 'warn' : null
  const usedColor =
    health === 'critical' ? 'var(--dpm-red)' : health === 'warn' ? 'var(--dpm-yellow)' : 'var(--dpm-ink)'

  const cells: {
    label: string
    value: ReactNode
    valueColor?: string
    note: ReactNode
    noteColor?: string
  }[] = [
    {
      label: 'มูลค่าสัญญา',
      value: moneyVisible ? bahtAbbrev(project.contractValue) : <RestrictedMoney size={16} />,
      note: moneyVisible
        ? `${project.phases.length} งวดงาน`
        : `เห็นได้: HoPD · HoD · Senior · Admin`,
    },
    {
      label: 'งวดปัจจุบัน',
      value: `${project.currentPhase}/${project.phases.length}`,
      note: currentPhase ? currentPhase.name : '—',
    },
    {
      label: 'คืบหน้างวดนี้',
      value: `${project.progressPct}%`,
      note: 'จากน้ำหนัก Deliverable ที่เสร็จ',
    },
    {
      label: 'ใช้คน-สัปดาห์',
      value: `${project.usedPct}%`,
      valueColor: usedColor,
      note: (
        <>
          {health !== 'ok' && <StatusMark level={health} size={9} />}
          {gap > 0 ? `ใช้แรงงานเร็วกว่างาน ${gap} จุด` : 'เดินคู่กันตามแผน'}
        </>
      ),
      noteColor: health !== 'ok' ? usedColor : undefined,
    },
    {
      label: 'พยากรณ์ Margin ตอนจบ',
      value: moneyVisible ? percent(fin.forecast) : <RestrictedMoney size={16} />,
      valueColor: moneyVisible ? marginColor : undefined,
      note: moneyVisible ? (
        <>
          {marginLevel && <StatusMark level={marginLevel} size={9} />}
          ณ ปัจจุบัน {percent(fin.now)} · สูตร EAC ภาคผนวก A
        </>
      ) : (
        `เห็นได้: HoPD · HoD · Senior · Admin`
      ),
      noteColor: moneyVisible && marginLevel ? marginColor : undefined,
    },
  ]

  return (
    <div className="dpm-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          style={{
            padding: '14px 18px',
            borderRight: i < cells.length - 1 ? '1px solid var(--dpm-border)' : 'none',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--dpm-sub)', marginBottom: 6 }}>{cell.label}</div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              color: cell.valueColor ?? 'var(--dpm-ink)',
            }}
          >
            {cell.value}
          </div>
          <div
            style={{
              fontSize: 11,
              color: cell.noteColor ?? 'var(--dpm-mute)',
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {cell.note}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Clock Ownership Bar — ตอนนี้นาฬิกาอยู่กับใคร และที่ผ่านมาเวลาไปค้างอยู่กับฝั่งไหน */
function ClockOwnershipBar({ project }: { project: Project }) {
  const segments = CLOCK_LOG[project.code] ?? []
  const totalDays = segments.reduce((sum, s) => sum + s.days, 0)
  const current = segments[segments.length - 1]

  const usDelayColor =
    project.delayUs > 5
      ? 'var(--dpm-red)'
      : project.delayUs > 0
        ? 'var(--dpm-yellow)'
        : 'var(--dpm-mute)'
  const usDelayMark = project.delayUs > 5 ? '▲' : project.delayUs > 0 ? '◆' : '○'
  const clDelayColor = project.delayClient > 0 ? 'var(--dpm-blue)' : 'var(--dpm-mute)'

  return (
    <div className="dpm-card">
      <div style={cardHeaderStyle}>
        <span className="dpm-card__title">นาฬิกาโครงการอยู่กับใคร</span>
        <span className="dpm-card__hint">
          {totalDays} วันที่ผ่านมา · ตอนนี้อยู่กับ{' '}
          <b style={{ color: current ? CLOCK_OWNER_META[current.owner].color : 'var(--dpm-ink)' }}>
            {current ? CLOCK_OWNER_META[current.owner].label : '—'}
          </b>
        </span>
      </div>
      <div className="dpm-card__body">
        {/* แถบแบ่งช่วงตามเจ้าของนาฬิกา — ความกว้างตามจำนวนวัน */}
        <div
          style={{
            display: 'flex',
            height: 18,
            borderRadius: 'var(--dpm-radius-bar)',
            overflow: 'hidden',
            gap: 1,
          }}
        >
          {segments.map((seg, i) => {
            const meta = CLOCK_OWNER_META[seg.owner]
            const widthPct = totalDays > 0 ? (seg.days / totalDays) * 100 : 0
            return (
              <div
                key={i}
                title={`${meta.label} ${seg.days} วัน — ${seg.note}`}
                style={{
                  width: `${widthPct}%`,
                  minWidth: 14,
                  background: meta.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'width 260ms ease',
                }}
              >
                {widthPct >= 8 && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: meta.text }}>
                    {seg.days}d
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <div
          style={{
            marginTop: 5,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--dpm-mute)',
          }}
        >
          <span>เริ่มงวดปัจจุบัน</span>
          <span>วันนี้</span>
        </div>

        {/* legend + สรุปช้าสะสมแยกเจ้าของ (Slip แยกเจ้าของ — ภาคผนวก A) */}
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {(Object.keys(CLOCK_OWNER_META) as ClockOwner[]).map((owner) => (
              <span
                key={owner}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: 'var(--dpm-sub)',
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 8,
                    borderRadius: 'var(--dpm-radius-bar)',
                    background: CLOCK_OWNER_META[owner].color,
                    display: 'inline-block',
                  }}
                />
                {CLOCK_OWNER_META[owner].label}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>
            ช้าสะสม:{' '}
            <span style={{ color: usDelayColor, fontWeight: 600 }}>
              <span style={{ fontSize: 9 }}>{usDelayMark}</span> เรา {project.delayUs} วัน
            </span>
            {' · '}
            <span style={{ color: clDelayColor, fontWeight: project.delayClient > 5 ? 600 : 400 }}>
              ลูกค้า {project.delayClient} วัน
            </span>
          </div>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--dpm-mute)', lineHeight: 1.5 }}>
          นาฬิกา = ฝั่งที่งานค้างอยู่ด้วย ณ ช่วงเวลานั้น (ClockLog) · ช้าสะสมนับเฉพาะวันที่เกินแผนของแต่ละฝั่ง
        </div>
      </div>
    </div>
  )
}

/** การ์ดงวดเดียวในรายการงวดทั้งหมด */
function PhaseCard({
  phase,
  project,
  moneyVisible,
}: {
  phase: ProjectPhase
  project: Project
  moneyVisible: boolean
}) {
  const isCurrent = phase.no === project.currentPhase
  const overQuota = phase.revisionUsed > phase.revisionQuota

  return (
    <div
      style={{
        borderBottom: '1px solid var(--dpm-border)',
        padding: '14px 18px 16px',
        background: isCurrent ? 'var(--dpm-surface)' : 'var(--dpm-bg)',
      }}
    >
      {/* หัวการ์ด: เลขงวด · ชื่อ · น้ำหนัก% · มูลค่า */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '40px minmax(0,1fr) 56px 120px',
          alignItems: 'baseline',
          gap: 12,
        }}
      >
        <span className="dpm-mono" style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
          {String(phase.no).padStart(2, '0')}
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
          {isCurrent && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--dpm-accent)',
                border: '1px solid var(--dpm-accent)',
                borderRadius: 'var(--dpm-radius-badge)',
                padding: '1px 6px',
                verticalAlign: 'middle',
              }}
            >
              งวดปัจจุบัน
            </span>
          )}
        </span>
        <span style={{ fontSize: 13, color: 'var(--dpm-sub)', textAlign: 'right' }}>
          {phase.weightPct}%
        </span>
        <span style={{ textAlign: 'right' }}>
          {moneyVisible ? <MoneyFigure value={phase.value} size={14} /> : <RestrictedMoney />}
        </span>
      </div>

      {/* งวดปัจจุบัน: เส้นทาง 6 ขั้น + แถบซ้อนสองชั้น · งวดอื่น: ป้ายสถานะเดี่ยว */}
      {isCurrent ? (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <PhaseTrack current={phase.status} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--dpm-mute)', marginBottom: 5 }}>
              ความคืบหน้างาน เทียบ คน-สัปดาห์ที่ใช้ (งวดนี้)
            </div>
            <DualProgressBar progress={project.progressPct} used={project.usedPct} />
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          <PhaseStatusPill status={phase.status} />
        </div>
      )}

      {/* รอบแก้แบบต่องวด — เกินโควตาต้องเห็นแดงพร้อมทางออกเสมอ */}
      <div style={{ marginTop: 12 }}>
        <RevisionCounter used={phase.revisionUsed} quota={phase.revisionQuota} />
        {overQuota && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link
              to="/vo"
              className="dpm-btn dpm-btn--secondary"
              style={{ color: 'var(--dpm-accent)', textDecoration: 'none' }}
            >
              ส่งให้ HoD ตัดสิน →
            </Link>
            <span style={{ fontSize: 11, color: 'var(--dpm-sub)' }}>
              เปิดเป็น Variation Order ในหน้า VO &amp; Revision Log
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/** บล็อกการเงินของโครงการ — เฉพาะบทบาทที่เห็นเงินตาม §5 */
function FinanceBlock({ project }: { project: Project }) {
  const recognized = project.phases
    .filter((ph) => RECOGNIZED.includes(ph.status))
    .reduce((sum, ph) => sum + ph.value, 0)
  const collected = project.phases
    .filter((ph) => ph.status === 'paid')
    .reduce((sum, ph) => sum + ph.value, 0)
  const outstanding = recognized - collected

  return (
    <div className="dpm-card">
      <div style={cardHeaderStyle}>
        <span className="dpm-card__title">การเงินของโครงการ</span>
        <span className="dpm-card__hint">เห็นได้เฉพาะ HoPD · HoD · Senior · Admin</span>
      </div>

      {project.phases.map((phase) => {
        const billing = BILLING_STATE[phase.status]
        return (
          <div
            key={phase.no}
            style={{
              display: 'grid',
              gridTemplateColumns: '30px minmax(0,1fr) 104px',
              gap: 10,
              alignItems: 'center',
              padding: '10px 18px',
              borderBottom: '1px solid var(--dpm-border)',
            }}
          >
            <span className="dpm-mono" style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
              {String(phase.no).padStart(2, '0')}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {phase.name}
              </div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: 11,
                  color: billing.color,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span style={{ fontSize: 9 }}>{billing.mark}</span>
                {billing.label}
                {billing.action && (
                  <>
                    {' — '}
                    <Link to={billing.action.to} style={{ fontSize: 11 }}>
                      {billing.action.label} →
                    </Link>
                  </>
                )}
              </div>
            </div>
            <span style={{ textAlign: 'right' }}>
              <MoneyFigure value={phase.value} size={13} />
            </span>
          </div>
        )
      })}

      {/* สรุปรวม — รับรู้แล้ว / รับเงินแล้ว / ค้างรับ */}
      <div style={{ padding: '12px 18px', borderTop: '1px solid var(--dpm-ink)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0' }}>
          <span style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>
            รับรู้รายได้แล้ว
            <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}> (งวดที่อนุมัติขึ้นไป)</span>
          </span>
          <MoneyFigure value={recognized} size={15} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0' }}>
          <span style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>รับเงินแล้ว</span>
          <MoneyFigure value={collected} size={15} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>ค้างรับ</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {outstanding > 0 && <StatusMark level="warn" size={9} />}
            <MoneyFigure value={outstanding} size={16} />
          </span>
        </div>
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--dpm-mute)' }}>
          มูลค่าสัญญารวม {baht(project.contractValue)} · ค้างรับ = รับรู้แล้ว − รับเงินแล้ว
        </div>
      </div>
    </div>
  )
}

/** ทีมที่จัดสรรให้โครงการนี้ในสัปดาห์ปัจจุบัน */
function TeamCard({ project }: { project: Project }) {
  const members = TEAM_THIS_WEEK[project.squad] ?? []
  const totalPw = members.reduce((sum, m) => sum + m.pw, 0)

  return (
    <div className="dpm-card">
      <div style={cardHeaderStyle}>
        <span className="dpm-card__title">ทีมที่จัดสรรสัปดาห์นี้</span>
        <span className="dpm-card__hint">Squad {project.squad} · สัปดาห์ 32 (4–8 ส.ค. 2569)</span>
      </div>
      {members.map((m, i) => (
        <div
          key={m.name}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 18px',
            borderBottom: i < members.length - 1 ? '1px solid var(--dpm-border)' : 'none',
          }}
        >
          <div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</span>
            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--dpm-sub)' }}>{m.position}</span>
          </div>
          <span style={{ fontSize: 13 }}>
            <b style={{ fontWeight: 600 }}>{personWeeks(m.pw)}</b>{' '}
            <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>คน-สัปดาห์</span>
          </span>
        </div>
      ))}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 18px',
          borderTop: '1px solid var(--dpm-border)',
          background: 'var(--dpm-subtle)',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>
          รวม <b style={{ color: 'var(--dpm-ink)' }}>{personWeeks(totalPw)}</b> คน-สัปดาห์
        </span>
        <Link to="/allocate" style={{ fontSize: 12 }}>
          เปิดหน้าจัดสรรกำลังคน →
        </Link>
      </div>
    </div>
  )
}

/* ── หน้า ────────────────────────────────────────────────────────── */

export function ProjectDetailPage() {
  const { role } = useRole()
  const moneyVisible = canSeeMoney(role)
  const [selectedCode, setSelectedCode] = useState('ID-2026-004')
  const project = PROJECTS.find((p) => p.code === selectedCode) ?? PROJECTS[0]
  const health = healthLevel(project.usedPct, project.progressPct)

  return (
    <div
      style={{
        maxWidth: 'var(--dpm-page-max-w)',
        margin: '0 auto',
        padding: '0 var(--dpm-page-pad-x) 64px',
      }}
    >
      {/* ── หัวโครงการ ─────────────────────────────────── */}
      <div style={{ padding: '14px 0 16px', borderBottom: '1px solid var(--dpm-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span className="dpm-mono" style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>
                {project.code}
              </span>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>
                {project.name}
              </h1>
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: 'var(--dpm-sub)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <RiskFlag level={health} />
              <span style={{ color: 'var(--dpm-border)' }}>|</span>
              <span>ลูกค้า {project.client}</span>
              <span style={{ color: 'var(--dpm-border)' }}>|</span>
              <span>Squad {project.squad}</span>
              <span style={{ color: 'var(--dpm-border)' }}>|</span>
              <span>BD {project.bd}</span>
              <span style={{ color: 'var(--dpm-border)' }}>|</span>
              <span>สายงาน{SERVICE_LINE_LABELS[project.line]}</span>
            </div>
          </div>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>
            ข้อมูล ณ จันทร์ 3 ส.ค. 2569 · 08:00 น.
          </span>
        </div>

        {/* ตัวเลือกโครงการ */}
        <ProjectPicker selected={project.code} onSelect={setSelectedCode} />
      </div>

      <div style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SummaryStrip project={project} moneyVisible={moneyVisible} />

        <ClockOwnershipBar project={project} />

        {/* ── ซ้าย: รายการงวดทั้งหมด · ขวา: การเงิน + ทีม ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.6fr) minmax(340px,1fr)',
            gap: 20,
            alignItems: 'start',
          }}
        >
          <div className="dpm-card">
            <div style={cardHeaderStyle}>
              <span className="dpm-card__title">งวดงานทั้งหมด</span>
              <span className="dpm-card__hint">
                {project.phases.length} งวด · น้ำหนักรวม 100% · สถานะเดินหน้าทางเดียว 6 ขั้น
              </span>
            </div>
            {project.phases.map((phase) => (
              <PhaseCard
                key={phase.no}
                phase={phase}
                project={project}
                moneyVisible={moneyVisible}
              />
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {moneyVisible ? (
              <FinanceBlock project={project} />
            ) : (
              <NoAccessBlock
                title="ตัวเลขการเงินของโครงการจำกัดสิทธิ์"
                reason={`มูลค่างวด สถานะเก็บเงิน และ Margin เปิดให้ HoPD · หัวหน้าแผนก · หัวหน้า Squad · Admin/บัญชี — บทบาทปัจจุบันของคุณคือ ${ROLE_LABELS[role]} ซึ่งเห็นความคืบหน้าและงวดงานได้ครบตามปกติ นี่คือกติกาของระบบ ไม่ใช่ข้อผิดพลาด`}
                contact="ติดต่อ คุณณัฐพงศ์ (Head of Project Delivery) เพื่อขอปรับสิทธิ์"
              />
            )}

            <TeamCard project={project} />
          </div>
        </div>
      </div>
    </div>
  )
}
