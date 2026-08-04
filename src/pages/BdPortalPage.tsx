import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button, LockIcon, PhaseStatusPill, RiskFlag, StatusMark } from '../components'
import { healthLevel, type PhaseStatus, type RiskLevel } from '../lib/status'
import { baht } from '../lib/format'
import { PROJECTS, SERVICE_LINE_LABELS, type Project } from '../data/projects'
import { ROLE_PERSONA } from '../auth/roles'

/**
 * S12 — BD Portal · ผู้ใช้: BD / Sales
 * คำถามของหน้า (brief §6): "โครงการลูกค้าฉันถึงไหน?"
 *
 * หลักคิด: มุมมอง "คนขายที่ต้องตอบลูกค้า" — เห็นสถานะพอที่จะตอบลูกค้าได้
 * และรู้ว่าตัวเองต้องช่วยตามอะไร แต่ไม่เห็นตัวเลขการเงินภายใน (brief §5:
 * BD เห็น COL/Margin เป็น "ไฟจราจร" เท่านั้น — หน้านี้จึงไม่แสดง % ใช้ไป/คืบหน้า
 * ไม่แสดงการจัดสรรคน แสดงเฉพาะราคาขายที่ลูกค้าเห็นในสัญญาอยู่แล้ว)
 * ขอบเขตข้อมูล: เฉพาะโครงการที่ bd = ลูกค้าตน (brief §3)
 */

const ME = ROLE_PERSONA.bd // 'คุณบี'

/** หัวหน้า Squad ของแต่ละ Squad — mock ชื่อตามที่ปรากฏในหน้าอื่น (S6: Squad A คุณเอ) */
const SQUAD_LEADS: Record<string, string> = {
  A: 'คุณเอ',
  C: 'คุณเค',
  D: 'คุณดี',
}

/** สิ่งที่ BD ตอบลูกค้าได้ ต่อระดับไฟจราจร — บอกวิธีปฏิบัติ ไม่บอกตัวเลขภายใน */
const HEALTH_GUIDE: Record<RiskLevel, string> = {
  critical: 'ทีมภายในกำลังเร่งแก้ — ก่อนยืนยันกำหนดการใหม่กับลูกค้า เช็คกับหัวหน้า Squad ก่อน',
  warn: 'มีสัญญาณต้องเฝ้าดู ทีมกำลังปรับแผน — ตอบลูกค้าตามกำหนดส่งด้านล่างได้',
  ok: 'เดินตามแผน — ตอบลูกค้าตามกำหนดส่งด้านล่างได้เลย',
  low: 'งานเดินเบากว่าแผน — มีพื้นที่รับคำขอเพิ่มจากลูกค้า',
}

interface WaitingBill {
  phaseNo: number
  value: number // ราคาขายของงวดตามสัญญา — ลูกค้าเห็นอยู่แล้ว BD แสดงได้
  billedOn: string
  overdueDays: number
}

/**
 * ข้อมูลเสริมระดับ BD ต่อโครงการ — mock (เมื่อมี data layer จริง อ่านจากปฏิทินงวด
 * และโมดูลบัญชี S9) · waitingBill ของ AR-2025-011 เดินหน้าจาก projects.ts หนึ่งขั้น:
 * สมมติว่าบัญชีวางบิลตามคำสั่ง "สั่งวางบิล" ใน S1 แล้ว จึงแสดงงวด 4 เป็น "วางบิลแล้ว"
 */
interface BdExtra {
  /** กำหนดส่งงวดถัดไป */
  nextDue: string
  nextDueNote: string
  /** เรื่องที่ค้างอยู่ฝั่งลูกค้า — ใช้เมื่อ delayClient > 0 */
  clientTopic?: string
  waitingBill?: WaitingBill
}

const BD_EXTRA: Record<string, BdExtra> = {
  'ID-2026-004': {
    nextDue: 'ศุกร์ 15 ส.ค. 2569',
    nextDueNote: 'ส่งแบบ Working Drawing ชุดแรก',
    clientTopic: 'อนุมัติรายการวัสดุ FF&E ที่ส่งให้ตั้งแต่ 28 ก.ค.',
  },
  'AR-2025-011': {
    nextDue: 'ก.ย. 2569 (ประมาณการ)',
    nextDueNote: 'เริ่มงวด 5 Bidding & CA เมื่อลูกค้ายืนยัน',
    clientTopic: 'ชำระใบแจ้งหนี้งวด 4 และยืนยันเริ่มงวด Bidding & CA',
    waitingBill: { phaseNo: 4, value: 1_800_000, billedOn: '23 ก.ค. 2569', overdueDays: 12 },
  },
  'HS-2026-007': {
    nextDue: 'ศุกร์ 29 ส.ค. 2569',
    nextDueNote: 'ส่งมอบ Concept Design',
  },
  'ID-2026-009': {
    nextDue: 'พุธ 20 ส.ค. 2569',
    nextDueNote: 'ส่งภาพ 3D ชุดแรกของงวด DD',
  },
}

const FALLBACK_EXTRA: BdExtra = { nextDue: 'รอทีมยืนยัน', nextDueNote: 'สอบถามหัวหน้า Squad ได้' }

/** VO ที่ BD คนนี้เป็นผู้ส่งเรื่อง (source: client_request) — mock */
interface BdVo {
  code: string
  projectCode: string
  title: string
  value: number // มูลค่าที่เสนอลูกค้า (ราคาขาย)
  level: RiskLevel
  statusLabel: string
  statusNote: string
}

const MY_VOS: BdVo[] = [
  {
    code: 'VO-2026-012',
    projectCode: 'ID-2026-004',
    title: 'เพิ่มแบบบาร์กาแฟชั้น 2 ตามคำขอลูกค้า',
    value: 180_000,
    level: 'warn',
    statusLabel: 'รอพิจารณา',
    statusNote: 'อยู่ที่หัวหน้าแผนก ID — ประเมินขอบเขตอยู่',
  },
  {
    code: 'VO-2026-007',
    projectCode: 'AR-2025-011',
    title: 'เพิ่มแบบป้ายอาคารและภูมิทัศน์ทางเข้า',
    value: 350_000,
    level: 'ok',
    statusLabel: 'อนุมัติแล้ว',
    statusNote: 'รวมเข้ามูลค่าสัญญาแล้ว',
  },
]

/* ── ชิ้นส่วนย่อย ─────────────────────────────────────────────── */

function FieldLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 11, color: 'var(--dpm-mute)', marginBottom: 6 }}>{children}</div>
}

/** สถานะการเก็บเงินระดับที่ BD ควรรู้ — แสดงเฉพาะราคาขายตามสัญญา ไม่มีต้นทุนภายใน */
function BillingNote({ project, waitingBill }: { project: Project; waitingBill?: WaitingBill }) {
  if (waitingBill) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusMark level="warn" size={10} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dpm-yellow)' }}>
            รอลูกค้าชำระ · ค้าง {waitingBill.overdueDays} วัน
          </span>
        </div>
        <div style={{ marginTop: 4, fontSize: 13, color: 'var(--dpm-ink)' }}>
          งวด {waitingBill.phaseNo} <b>{baht(waitingBill.value)}</b>
        </div>
        <div style={{ marginTop: 2, fontSize: 11, color: 'var(--dpm-sub)' }}>
          วางบิลเมื่อ {waitingBill.billedOn}
        </div>
      </div>
    )
  }

  const paid = project.phases.filter((ph) => ph.status === 'paid')
  if (paid.length === 0) {
    return (
      <div>
        <div style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>ยังไม่ถึงงวดเก็บเงินแรก</div>
        <div style={{ marginTop: 2, fontSize: 11, color: 'var(--dpm-mute)' }}>
          จะวางบิลเมื่อส่งมอบงวด 1
        </div>
      </div>
    )
  }

  const paidSum = paid.reduce((sum, ph) => sum + ph.value, 0)
  const lastPaid = paid[paid.length - 1]
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <StatusMark level="ok" size={10} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dpm-green)' }}>
          เก็บเงินครบถึงงวด {lastPaid.no}
        </span>
      </div>
      <div style={{ marginTop: 4, fontSize: 13, color: 'var(--dpm-ink)' }}>
        รวม <b>{baht(paidSum)}</b>
      </div>
      <div style={{ marginTop: 2, fontSize: 11, color: 'var(--dpm-sub)' }}>ไม่มีบิลรอชำระ</div>
    </div>
  )
}

/** กล่อง "นาฬิกาอยู่ที่ใคร" — บอก BD ว่าต้องช่วยตามอะไร หรือสบายใจได้ */
function ClockBox({
  project,
  clientTopic,
  followed,
  onFollowUp,
}: {
  project: Project
  clientTopic?: string
  followed: boolean
  onFollowUp: () => void
}) {
  const clientWaiting = project.delayClient > 0
  const usLate = project.delayUs > 0

  if (!clientWaiting && !usLate) {
    return (
      <div
        style={{
          marginTop: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          background: 'var(--dpm-subtle)',
          borderRadius: 'var(--dpm-radius-control)',
          fontSize: 12,
          color: 'var(--dpm-sub)',
        }}
      >
        <StatusMark level="ok" size={9} />
        นาฬิกาเดินตามแผน — ไม่มีเรื่องค้างทั้งฝั่งเราและฝั่งลูกค้า
      </div>
    )
  }

  return (
    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {clientWaiting && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '12px 14px',
            background: 'var(--dpm-tint-blue)',
            border: '1px solid var(--dpm-blue)',
            borderRadius: 'var(--dpm-radius-card)',
            transition: 'border-color 400ms ease',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <StatusMark level="low" size={10} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dpm-blue)' }}>
                นาฬิกาอยู่ที่ลูกค้า {project.delayClient} วัน
              </span>
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: 'var(--dpm-ink)', lineHeight: 1.55 }}>
              สิ่งที่คุณช่วยได้: ตามลูกค้าเรื่อง <b>{clientTopic}</b>
            </div>
          </div>
          {followed ? (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--dpm-green)',
                }}
              >
                <span style={{ fontSize: 10 }}>✓</span> บันทึกว่าตามแล้ว
              </div>
              <div style={{ marginTop: 3, fontSize: 11, color: 'var(--dpm-sub)' }}>
                แจ้งหัวหน้า Squad ให้ทราบแล้ว · ตามซ้ำได้พรุ่งนี้
              </div>
            </div>
          ) : (
            <Button variant="secondary" style={{ flexShrink: 0 }} onClick={onFollowUp}>
              บันทึกว่าตามแล้ว
            </Button>
          )}
        </div>
      )}

      {usLate && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: 'var(--dpm-subtle)',
            borderRadius: 'var(--dpm-radius-control)',
            fontSize: 12,
            color: 'var(--dpm-sub)',
          }}
        >
          <StatusMark level={project.delayUs > 5 ? 'critical' : 'warn'} size={9} />
          ฝั่งทีมช้าสะสม {project.delayUs} วัน — ทีมกำลังเร่งอยู่ คุณไม่ต้องแจ้งลูกค้าเอง
        </div>
      )}
    </div>
  )
}

/** การ์ดใหญ่ต่อโครงการ — อ่านง่าย ตอบลูกค้าได้จากการ์ดเดียว */
function ProjectCard({
  project,
  followed,
  onFollowUp,
}: {
  project: Project
  followed: boolean
  onFollowUp: () => void
}) {
  const extra = BD_EXTRA[project.code] ?? FALLBACK_EXTRA
  const health = healthLevel(project.usedPct, project.progressPct)
  const phase = project.phases.find((ph) => ph.no === project.currentPhase)
  const lead = SQUAD_LEADS[project.squad] ?? 'หัวหน้า Squad'

  /* mock เดินสถานะงวดหน้าจอไปหนึ่งขั้นเมื่อบัญชีวางบิลแล้ว (ดู comment ที่ BD_EXTRA) */
  const phaseStatus: PhaseStatus =
    extra.waitingBill && extra.waitingBill.phaseNo === project.currentPhase
      ? 'billed'
      : (phase?.status ?? 'not-started')

  return (
    <div className={`dpm-card${health === 'critical' ? ' dpm-card--critical' : ''}`}>
      {/* หัวการ์ด: ลูกค้า + โครงการ + รหัส · ไฟจราจรสุขภาพ (ไม่มีตัวเลขภายใน) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 20,
          padding: '16px 20px',
          borderBottom: '1px solid var(--dpm-border)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{project.client}</span>
            <span style={{ fontSize: 14, color: 'var(--dpm-sub)' }}>{project.name}</span>
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--dpm-mute)' }}>
            <span className="dpm-mono">{project.code}</span> · {SERVICE_LINE_LABELS[project.line]} ·
            มูลค่าสัญญา {baht(project.contractValue)} · ทีมโครงการ: {lead} (หัวหน้า Squad{' '}
            {project.squad})
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, maxWidth: 280 }}>
          <div style={{ fontSize: 11, color: 'var(--dpm-mute)', marginBottom: 4 }}>
            สุขภาพโครงการ
          </div>
          <RiskFlag level={health} />
          <div style={{ marginTop: 5, fontSize: 11, color: 'var(--dpm-sub)', lineHeight: 1.5 }}>
            {HEALTH_GUIDE[health]}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr)',
            gap: 20,
            alignItems: 'start',
          }}
        >
          <div>
            <FieldLabel>งวดปัจจุบัน</FieldLabel>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              งวด {project.currentPhase} จาก {project.phases.length}
              <span style={{ fontWeight: 400, color: 'var(--dpm-sub)' }}> · {phase?.name}</span>
            </div>
            <div style={{ marginTop: 7 }}>
              <PhaseStatusPill status={phaseStatus} />
            </div>
          </div>

          <div>
            <FieldLabel>กำหนดส่งถัดไป</FieldLabel>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{extra.nextDue}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.5 }}>
              {extra.nextDueNote}
            </div>
          </div>

          <div>
            <FieldLabel>การเก็บเงิน (ราคาขายตามสัญญา)</FieldLabel>
            <BillingNote project={project} waitingBill={extra.waitingBill} />
          </div>
        </div>

        <ClockBox
          project={project}
          clientTopic={extra.clientTopic}
          followed={followed}
          onFollowUp={onFollowUp}
        />
      </div>
    </div>
  )
}

/** ตาราง VO ที่ BD คนนี้ส่งเรื่องเอง — เห็นเฉพาะของตัว มีทางไปหน้า VO เต็ม */
function MyVoCard() {
  return (
    <div className="dpm-card">
      <div className="dpm-card__header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span className="dpm-card__title">งานเพิ่มที่คุณส่งเรื่อง (VO)</span>
          <span className="dpm-card__hint">เฉพาะคำขอจากลูกค้าที่คุณเป็นผู้ส่ง</span>
        </div>
        <Link to="/vo" style={{ fontSize: 12, color: 'var(--dpm-accent)', textDecoration: 'none' }}>
          เปิดหน้า VO ทั้งหมด →
        </Link>
      </div>
      {MY_VOS.map((vo, i) => (
        <div
          key={vo.code}
          className="dpm-table-row"
          style={{
            display: 'grid',
            gridTemplateColumns: '112px 110px minmax(0,1fr) 110px 170px',
            alignItems: 'center',
            gap: 14,
            padding: '13px 20px',
            borderBottom: i === MY_VOS.length - 1 ? 'none' : '1px solid var(--dpm-border)',
          }}
        >
          <span className="dpm-mono" style={{ fontSize: 12 }}>
            {vo.code}
          </span>
          <span className="dpm-mono" style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>
            {vo.projectCode}
          </span>
          <span
            style={{
              fontSize: 13,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {vo.title}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>
            {baht(vo.value)}
          </span>
          <div>
            <RiskFlag level={vo.level} label={vo.statusLabel} />
            <div style={{ marginTop: 2, fontSize: 11, color: 'var(--dpm-sub)' }}>
              {vo.statusNote}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── หน้า ─────────────────────────────────────────────────────── */

export function BdPortalPage() {
  /* โครงการเฉพาะลูกค้าของฉัน — ขอบเขตตาม brief §3 (BD เห็น "ลูกค้าตน") */
  const myProjects = PROJECTS.filter((p) => p.bd === ME)

  /* บันทึก "ตามลูกค้าแล้ว" ต่อโครงการ — mock state; ระบบจริงเขียนเป็น activity ให้ทีมเห็น */
  const [followed, setFollowed] = useState<Record<string, boolean>>({})

  return (
    <div
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '24px var(--dpm-page-pad-x) 64px',
      }}
    >
      {/* หัวหน้า */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>
            โครงการของลูกค้าคุณ
          </h1>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--dpm-sub)' }}>
            {ME} · BD / Sales · {myProjects.length} โครงการ · ข้อมูล ณ จันทร์ 3 ส.ค. 2569 08:00 น.
          </div>
        </div>
        <Link to="/handoff" className="dpm-btn dpm-btn--primary" style={{ textDecoration: 'none' }}>
          + ส่ง Handoff โครงการใหม่
        </Link>
      </div>

      {/* การ์ดต่อโครงการ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {myProjects.map((p) => (
          <ProjectCard
            key={p.code}
            project={p}
            followed={followed[p.code] ?? false}
            onFollowUp={() => setFollowed((cur) => ({ ...cur, [p.code]: true }))}
          />
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <MyVoCard />
      </div>

      {/* ขอบเขตข้อมูล — บรรทัดสุภาพ ไม่ใช่การบล็อก และบอกทางออกเสมอ */}
      <div
        style={{
          marginTop: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '11px 14px',
          background: 'var(--dpm-subtle)',
          border: '1px solid var(--dpm-border)',
          borderRadius: 'var(--dpm-radius-card)',
          fontSize: 12,
          color: 'var(--dpm-sub)',
          lineHeight: 1.6,
        }}
      >
        <LockIcon size={14} color="var(--dpm-sub)" />
        <span>
          คุณเห็นเฉพาะโครงการของลูกค้าคุณ และเห็นสุขภาพโครงการเป็นไฟจราจร —
          ตัวเลขต้นทุนและการจัดสรรคนภายในเป็นของทีมส่งมอบ · ต้องการรายละเอียดเพิ่ม
          ติดต่อหัวหน้า Squad ของโครงการ (ชื่อระบุไว้ในการ์ดแต่ละใบ)
        </span>
      </div>
    </div>
  )
}
