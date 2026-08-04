import { useState, type CSSProperties } from 'react'
import {
  Button,
  ConstraintNotice,
  MoneyFigure,
  NoAccessBlock,
  RevisionCounter,
  StatusMark,
} from '../components'
import { useRole } from '../auth/RoleContext'
import { ROLE_PERSONA, type Role } from '../auth/roles'
import { baht, bahtAbbrev, personWeeks, snapQuarter } from '../lib/format'
import { STATUS, type RiskLevel } from '../lib/status'
import { PROJECTS, findProject } from '../data/projects'
import {
  BLENDED_RATE,
  INITIAL_VOS,
  OVER_QUOTA_PHASES,
  SOURCE_META,
  SOURCE_ORDER,
  TODAY_LABEL,
  VO_STATUS_META,
  voCost,
  type OverQuotaPhase,
  type Vo,
  type VoSource,
} from './vo/data'

/**
 * S8 · VO & Revision Log — Senior / HoD
 * คำถามที่ตอบ: "แถมงานไปกี่บาท แก้กี่รอบ?" (brief §6)
 * หน้านี้ไม่มี prototype — ออกแบบตามแบบแผนของ S1 (แถบ KPI + ตาราง) และ S2 (ป้ายชนิดไม่พึ่งสี)
 * สิทธิ์ตาม §5: HoPD/HoD เปิดและอนุมัติ VO ได้ · Senior/BD เปิดได้แต่อนุมัติไม่ได้ (📝/❌)
 */

/** grid คงที่ของตาราง VO — ใช้ค่าเดียวกันทั้งหัวและแถว */
const TABLE_GRID = '104px 146px minmax(220px,1fr) 128px 168px 122px 170px'

/** ป้ายบทบาทย่อสำหรับบันทึกผู้เสนอ/ผู้ตัดสิน */
const ROLE_SHORT: Record<Role, string> = {
  hopd: 'HoPD',
  hod: 'HoD',
  senior: 'Senior',
  designer: 'Designer',
  bd: 'BD',
  admin: 'Admin',
}

const smallBtnStyle: CSSProperties = { height: 28, padding: '0 10px', fontSize: 11 }

/* ───────────────────────── ป้ายที่มา 3 ชนิด ───────────────────────── */

/** กล่องสัญลักษณ์ที่มา — รูป+น้ำหนักหมึกต่างกัน อ่านได้แม้พิมพ์ขาวดำ (แนว KindBox ของ S2) */
function SourceBadge({ source, size = 18 }: { source: VoSource; size?: number }) {
  const meta = SOURCE_META[source]
  return (
    <span
      aria-label={meta.label}
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: 'var(--dpm-radius-badge)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        background: meta.boxBg,
        border: `1px ${meta.boxStyle} ${meta.boxBorder}`,
        color: meta.glyphColor,
      }}
    >
      {meta.glyph}
    </span>
  )
}

/* ───────────────────────── แถบ KPI 4 ช่อง ───────────────────────── */

interface Kpi {
  label: string
  value: string
  note: string
  noteLevel?: RiskLevel
}

/** แถบ KPI สไตล์ S1 — ตัวเลข 34px · note พร้อมสัญลักษณ์คู่สี */
function KpiStrip({ kpis }: { kpis: Kpi[] }) {
  return (
    <div
      className="dpm-card"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${kpis.length}, 1fr)`, marginBottom: 24 }}
    >
      {kpis.map((kpi, i) => (
        <div
          key={kpi.label}
          style={{
            padding: '16px 20px',
            borderRight: i < kpis.length - 1 ? '1px solid var(--dpm-border)' : 'none',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--dpm-sub)', marginBottom: 6 }}>{kpi.label}</div>
          <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {kpi.value}
          </div>
          <div
            style={{
              fontSize: 11,
              color: kpi.noteLevel ? STATUS[kpi.noteLevel].color : 'var(--dpm-mute)',
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {kpi.noteLevel && <StatusMark level={kpi.noteLevel} size={9} />}
            {kpi.note}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ───────────────────── ฟอร์มเปิด VO ใหม่ ───────────────────── */

interface VoFormSeed {
  projectCode: string
  source: VoSource
  detail: string
  pw: number
  linkedPhase?: string
}

interface VoFormProps {
  seed: VoFormSeed
  onSubmit: (fields: VoFormSeed) => void
  onCancel: () => void
}

const fieldLabelStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--dpm-mute)',
  marginBottom: 6,
}

const inputBoxStyle: CSSProperties = {
  fontFamily: 'inherit',
  fontSize: 13,
  color: 'var(--dpm-ink)',
  background: 'var(--dpm-surface)',
  border: '1px solid var(--dpm-border)',
  borderRadius: 'var(--dpm-radius-control)',
}

/** Stepper −/+ ทีละ 0.25 ไม่ต่ำกว่า 0 — แบบแผนเดียวกับ S3 · snapQuarter กันทศนิยมเพี้ยน */
function QuarterStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const btnStyle: CSSProperties = {
    width: 30,
    padding: '6px 0',
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
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid var(--dpm-border)',
        borderRadius: 'var(--dpm-radius-control)',
        overflow: 'hidden',
        background: 'var(--dpm-bg)',
      }}
    >
      <button
        type="button"
        aria-label="ลด 0.25 คน-สัปดาห์"
        style={btnStyle}
        onClick={() => onChange(snapQuarter(value - 0.25))}
      >
        −
      </button>
      <span
        style={{
          width: 64,
          textAlign: 'center',
          fontSize: 14,
          fontWeight: 600,
          background: 'var(--dpm-surface)',
          padding: '6px 0',
        }}
      >
        {personWeeks(value)}
      </span>
      <button
        type="button"
        aria-label="เพิ่ม 0.25 คน-สัปดาห์"
        style={btnStyle}
        onClick={() => onChange(snapQuarter(value + 0.25))}
      >
        +
      </button>
    </div>
  )
}

function VoForm({ seed, onSubmit, onCancel }: VoFormProps) {
  const [projectCode, setProjectCode] = useState(seed.projectCode)
  const [source, setSource] = useState<VoSource>(seed.source)
  const [detail, setDetail] = useState(seed.detail)
  const [pw, setPw] = useState(seed.pw)

  const cost = voCost(pw)
  const ready = detail.trim().length > 0 && pw > 0
  const project = findProject(projectCode)

  return (
    <div className="dpm-card dpm-card--critical" style={{ marginBottom: 24 }}>
      <div className="dpm-card__header">
        <span className="dpm-card__title">เปิด VO ใหม่</span>
        <span className="dpm-card__hint">
          ส่งแล้วเข้าตารางเป็นสถานะ "เสนอ" — รอหัวหน้าแผนกตัดสินเก็บเงินหรือแถม
        </span>
      </div>
      <div className="dpm-card__body">
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {/* โครงการ */}
          <div>
            <div style={fieldLabelStyle}>โครงการ</div>
            <select
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
              style={{ ...inputBoxStyle, height: 32, padding: '0 10px', minWidth: 240 }}
            >
              {PROJECTS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
            {project && (
              <div style={{ marginTop: 5, fontSize: 11, color: 'var(--dpm-mute)' }}>
                Squad {project.squad} · มูลค่าสัญญา {bahtAbbrev(project.contractValue)}
              </div>
            )}
          </div>

          {/* ที่มา 3 ชิป */}
          <div>
            <div style={fieldLabelStyle}>ที่มา</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {SOURCE_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`dpm-chip${source === s ? ' is-selected' : ''}`}
                  onClick={() => setSource(s)}
                >
                  <span aria-hidden>{SOURCE_META[s].glyph}</span>
                  {SOURCE_META[s].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* รายละเอียด */}
        <div style={{ marginTop: 16 }}>
          <div style={fieldLabelStyle}>รายละเอียดงานที่เพิ่มจากสัญญาเดิม</div>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="งานอะไร นอกขอบเขตข้อไหนของสัญญา ลูกค้ารับรู้แล้วหรือยัง"
            style={{
              ...inputBoxStyle,
              width: '100%',
              minHeight: 64,
              padding: '8px 10px',
              lineHeight: 1.55,
              resize: 'vertical',
            }}
          />
        </div>

        {/* ประเมินแรงงาน → ต้นทุนคำนวณสด */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div>
            <div style={fieldLabelStyle}>ประเมินแรงงานเพิ่ม (คน-สัปดาห์)</div>
            <QuarterStepper value={pw} onChange={setPw} />
          </div>
          <div style={{ paddingTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>ต้นทุนประเมิน</span>
              <MoneyFigure value={cost} size={22} />
            </div>
            <div style={{ marginTop: 3, fontSize: 11, color: 'var(--dpm-mute)' }}>
              = {personWeeks(pw)} คน-สัปดาห์ × เรตกลาง {baht(BLENDED_RATE)} — จากเรตกลางตามตำแหน่ง
              ไม่ใช่เงินเดือนจริง
            </div>
          </div>
        </div>

        {/* ปุ่มส่ง */}
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            variant="primary"
            disabled={!ready}
            onClick={() => onSubmit({ projectCode, source, detail: detail.trim(), pw, linkedPhase: seed.linkedPhase })}
          >
            ส่งเรื่องเสนอ VO
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            ยกเลิก
          </Button>
          {!ready && (
            <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>
              กรอกรายละเอียดและประเมินคน-สัปดาห์มากกว่า 0 ก่อนส่ง
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────── แถวตาราง VO ───────────────────── */

interface VoRowProps {
  vo: Vo
  canApprove: boolean
  /** แถวที่กำลังกรอกเหตุผลแถม */
  reasonOpen: boolean
  reasonDraft: string
  onReasonDraft: (v: string) => void
  onOpenReason: () => void
  onCancelReason: () => void
  onBillable: () => void
  onGoodwill: () => void
}

function VoRow({
  vo,
  canApprove,
  reasonOpen,
  reasonDraft,
  onReasonDraft,
  onOpenReason,
  onCancelReason,
  onBillable,
  onGoodwill,
}: VoRowProps) {
  const project = findProject(vo.projectCode)
  const status = VO_STATUS_META[vo.status]
  const cost = voCost(vo.personWeeks)

  return (
    <div
      className="dpm-table-row"
      style={{
        display: 'grid',
        gridTemplateColumns: TABLE_GRID,
        gap: 12,
        padding: '13px 20px',
        alignItems: 'start',
      }}
    >
      {/* รหัสโครงการ + เลข VO */}
      <div>
        <div className="dpm-mono" style={{ fontSize: 12, fontWeight: 500 }}>
          {vo.projectCode}
        </div>
        <div className="dpm-mono" style={{ fontSize: 10, color: 'var(--dpm-mute)', marginTop: 3 }}>
          {vo.id}
        </div>
        {project && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--dpm-sub)',
              marginTop: 3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {project.name}
          </div>
        )}
      </div>

      {/* ที่มา */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <SourceBadge source={vo.source} />
        <span style={{ fontSize: 12 }}>{SOURCE_META[vo.source].label}</span>
      </div>

      {/* รายละเอียด */}
      <div style={{ fontSize: 13, lineHeight: 1.55 }}>{vo.detail}</div>

      {/* ประเมินต้นทุน */}
      <div style={{ textAlign: 'right' }}>
        <MoneyFigure value={cost} size={14} />
        <div style={{ fontSize: 10, color: 'var(--dpm-mute)', marginTop: 2 }}>
          {personWeeks(vo.personWeeks)} คส. × เรตกลาง
        </div>
      </div>

      {/* สถานะ */}
      <div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: status.color,
          }}
        >
          <span aria-hidden style={{ fontSize: 11 }}>{status.mark}</span>
          {status.label}
        </span>
        {vo.status === 'billable' && (
          <div style={{ fontSize: 11, color: 'var(--dpm-green)', marginTop: 3 }}>
            เรียกเก็บ {baht(vo.agreedValue ?? cost)}
          </div>
        )}
        {vo.reason && (
          <div style={{ fontSize: 11, color: 'var(--dpm-sub)', marginTop: 3, lineHeight: 1.5 }}>
            "{vo.reason}"
          </div>
        )}
      </div>

      {/* ผู้ตัดสิน + วันที่ */}
      <div>
        {vo.decidedBy ? (
          <>
            <div style={{ fontSize: 12 }}>{vo.decidedBy}</div>
            <div style={{ fontSize: 11, color: 'var(--dpm-mute)', marginTop: 2 }}>{vo.decidedDate}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>รอหัวหน้าแผนก</div>
            <div style={{ fontSize: 11, color: 'var(--dpm-mute)', marginTop: 2 }}>
              เสนอ {vo.submittedDate}
            </div>
          </>
        )}
      </div>

      {/* ปุ่มตามสิทธิ์ */}
      <div>
        {vo.status !== 'proposed' ? (
          <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>ตัดสินแล้ว</span>
        ) : canApprove ? (
          reasonOpen ? (
            <div>
              <input
                value={reasonDraft}
                onChange={(e) => onReasonDraft(e.target.value)}
                placeholder="เหตุผลที่ตัดสินใจแถม"
                autoFocus
                style={{
                  fontFamily: 'inherit',
                  fontSize: 12,
                  width: '100%',
                  height: 28,
                  padding: '0 8px',
                  color: 'var(--dpm-ink)',
                  background: 'var(--dpm-surface)',
                  border: '1px solid var(--dpm-border)',
                  borderRadius: 'var(--dpm-radius-control)',
                }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button
                  type="button"
                  className="dpm-btn dpm-btn--primary"
                  style={smallBtnStyle}
                  disabled={reasonDraft.trim().length === 0}
                  onClick={onGoodwill}
                >
                  ยืนยันแถม
                </button>
                <button
                  type="button"
                  className="dpm-btn dpm-btn--secondary"
                  style={smallBtnStyle}
                  onClick={onCancelReason}
                >
                  ยกเลิก
                </button>
              </div>
              {reasonDraft.trim().length === 0 && (
                <div style={{ fontSize: 10, color: 'var(--dpm-mute)', marginTop: 4 }}>
                  การแถมต้องบันทึกเหตุผลเสมอ
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="dpm-btn dpm-btn--primary"
                  style={smallBtnStyle}
                  onClick={onBillable}
                >
                  ✓ เก็บเงิน
                </button>
                <button
                  type="button"
                  className="dpm-btn dpm-btn--secondary"
                  style={smallBtnStyle}
                  onClick={onOpenReason}
                >
                  แถม…
                </button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--dpm-mute)', marginTop: 4 }}>
                แถมได้ แต่ต้องบันทึกเหตุผล
              </div>
            </div>
          )
        ) : (
          <div>
            <button
              type="button"
              className="dpm-btn dpm-btn--secondary"
              style={smallBtnStyle}
              disabled
              title="การอนุมัติ VO เป็นของหัวหน้าแผนกขึ้นไป"
            >
              อนุมัติ VO
            </button>
            <div style={{ fontSize: 10, color: 'var(--dpm-mute)', marginTop: 4, lineHeight: 1.5 }}>
              การอนุมัติ VO เป็นของหัวหน้าแผนกขึ้นไป
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────────────────── การ์ดรอบแก้เกินโควตา ───────────────────── */

interface RevisionCardProps {
  item: OverQuotaPhase
  /** VO ที่ผูกกับงวดนี้ (ถ้ามี) */
  linkedVo?: Vo
  onCreateVo: () => void
}

function RevisionCard({ item, linkedVo, onCreateVo }: RevisionCardProps) {
  const { project, phase, overCount } = item
  const estPw = snapQuarter(overCount * 0.75)

  return (
    <div className="dpm-card">
      <div className="dpm-card__header">
        <span className="dpm-mono" style={{ fontSize: 12, fontWeight: 500 }}>
          {project.code}
        </span>
        <span className="dpm-card__title" style={{ fontSize: 14 }}>
          {project.name}
        </span>
        <span className="dpm-card__hint">
          งวด {phase.no} · {phase.name} · Squad {project.squad}
        </span>
      </div>
      <div className="dpm-card__body">
        <RevisionCounter
          used={phase.revisionUsed}
          quota={phase.revisionQuota}
          note={`เกินโควตา ${overCount} รอบ — ประเมินแรงงานรอบเกิน ≈ ${personWeeks(estPw)} คน-สัปดาห์ (${baht(voCost(estPw))} จากเรตกลาง)`}
        />
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--dpm-ink)' }}>
          <b>ต้องทำ:</b> ให้หัวหน้าแผนก (HoD) ตัดสินว่าเก็บเงินเพิ่มหรือแถม
        </div>
        <div style={{ marginTop: 12 }}>
          {linkedVo ? (
            linkedVo.status === 'proposed' ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--dpm-blue)',
                }}
              >
                <span aria-hidden style={{ fontSize: 11 }}>○</span>
                เปิด VO แล้ว ({linkedVo.id}) — รออนุมัติในตารางด้านบน
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: linkedVo.status === 'billable' ? 'var(--dpm-green)' : 'var(--dpm-sub)',
                }}
              >
                <span aria-hidden style={{ fontSize: 11 }}>✓</span>
                ตัดสินแล้ว — {VO_STATUS_META[linkedVo.status].label} โดย {linkedVo.decidedBy}
              </span>
            )
          ) : (
            <Button variant="secondary" onClick={onCreateVo}>
              ↻ เปิด VO จากรอบเกินนี้
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────── หน้า ─────────────────────────────── */

export function VariationOrderPage() {
  const { role } = useRole()
  const canApprove = role === 'hopd' || role === 'hod'
  const canView = canApprove || role === 'senior' || role === 'bd'
  const persona = `${ROLE_PERSONA[role]} (${ROLE_SHORT[role]})`

  const [vos, setVos] = useState<Vo[]>(INITIAL_VOS)
  const [formOpen, setFormOpen] = useState(false)
  const [formSeed, setFormSeed] = useState<VoFormSeed>({
    projectCode: PROJECTS[0].code,
    source: 'client_request',
    detail: '',
    pw: 1,
  })
  /** เปลี่ยน key เพื่อ remount ฟอร์มเมื่อ prefill ใหม่ */
  const [formKey, setFormKey] = useState(0)
  /** แถวที่กำลังกรอกเหตุผลแถม + ข้อความเหตุผล */
  const [reasonFor, setReasonFor] = useState<string | null>(null)
  const [reasonDraft, setReasonDraft] = useState('')
  /** สถานะปุ่มทางออกของ Senior/BD (แจ้งหัวหน้าแผนก) */
  const [notified, setNotified] = useState(false)

  /* ── คำนวณสดจาก state ── */
  const billableVos = vos.filter((v) => v.status === 'billable')
  const goodwillVos = vos.filter((v) => v.status === 'goodwill')
  const proposedCount = vos.filter((v) => v.status === 'proposed').length
  const billableSum = billableVos.reduce((a, v) => a + (v.agreedValue ?? voCost(v.personWeeks)), 0)
  const goodwillSum = goodwillVos.reduce((a, v) => a + voCost(v.personWeeks), 0)
  /** งวดเกินโควตาที่ยังไม่มี VO ตัดสิน (เสนอค้างอยู่ก็ยังนับว่ายังไม่ตัดสิน) */
  const undecidedPhases = OVER_QUOTA_PHASES.filter(
    (p) =>
      !vos.some(
        (v) => v.linkedPhase === p.key && (v.status === 'billable' || v.status === 'goodwill'),
      ),
  )

  const kpis: Kpi[] = [
    {
      label: 'มูลค่า VO ที่เก็บเงินได้ (ปี 2569)',
      value: bahtAbbrev(billableSum),
      note: `จาก ${billableVos.length} รายการที่อนุมัติเก็บเงิน`,
    },
    {
      label: 'มูลค่าที่ตัดสินใจแถม (สะสมปี 2569)',
      value: bahtAbbrev(goodwillSum),
      note: `จาก ${goodwillVos.length} รายการ — ทุกบาทมีผู้ตัดสินและเหตุผล`,
      noteLevel: 'warn',
    },
    {
      label: 'VO รออนุมัติ',
      value: String(proposedCount),
      // เก่าสุดคือ VO-2026-017 เสนอ 28 ก.ค. — วันนี้ 4 ส.ค. = 7 วัน
      note: proposedCount > 0 ? 'เก่าสุดรอมา 7 วัน' : 'ไม่มีรายการค้าง',
      noteLevel: proposedCount > 0 ? 'warn' : 'ok',
    },
    {
      label: 'รอบแก้เกินโควตาที่ยังไม่ตัดสิน',
      value: String(undecidedPhases.length),
      note:
        undecidedPhases.length > 0
          ? 'ต้นทุนกำลังเดินโดยยังไม่มีข้อตกลงว่าใครจ่าย'
          : 'ทุกงวดเกินโควตามีคำตัดสินแล้ว',
      noteLevel: undecidedPhases.length > 0 ? 'critical' : 'ok',
    },
  ]

  /* ── การกระทำ ── */
  const nextVoId = () => {
    const max = vos.reduce((m, v) => Math.max(m, Number(v.id.slice(v.id.lastIndexOf('-') + 1))), 0)
    return `VO-2026-${String(max + 1).padStart(3, '0')}`
  }

  const submitVo = (fields: VoFormSeed) => {
    const vo: Vo = {
      id: nextVoId(),
      projectCode: fields.projectCode,
      source: fields.source,
      detail: fields.detail,
      personWeeks: fields.pw,
      status: 'proposed',
      linkedPhase: fields.linkedPhase,
      submittedBy: persona,
      submittedDate: TODAY_LABEL,
    }
    setVos((prev) => [vo, ...prev])
    setFormOpen(false)
  }

  const openBlankForm = () => {
    setFormSeed({ projectCode: PROJECTS[0].code, source: 'client_request', detail: '', pw: 1 })
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }

  const openFormFromPhase = (p: OverQuotaPhase) => {
    setFormSeed({
      projectCode: p.project.code,
      source: 'revision_over_quota',
      detail: `รอบแก้แบบรอบที่ ${p.phase.revisionUsed} ของงวด ${p.phase.no} (${p.phase.name}) เกินโควตา ${p.overCount} รอบ`,
      pw: snapQuarter(p.overCount * 0.75) || 0.75,
      linkedPhase: p.key,
    })
    setFormKey((k) => k + 1)
    setFormOpen(true)
    window.scrollTo({ top: 0 })
  }

  const decideBillable = (id: string) =>
    setVos((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              status: 'billable' as const,
              // มูลค่าเรียกเก็บตั้งต้น = ต้นทุนประเมิน — ตัวจริงต้องตกลงกับลูกค้าเมื่อมี data layer
              agreedValue: voCost(v.personWeeks),
              decidedBy: persona,
              decidedDate: TODAY_LABEL,
            }
          : v,
      ),
    )

  const decideGoodwill = (id: string, reason: string) => {
    setVos((prev) =>
      prev.map((v) =>
        v.id === id
          ? { ...v, status: 'goodwill' as const, reason, decidedBy: persona, decidedDate: TODAY_LABEL }
          : v,
      ),
    )
    setReasonFor(null)
    setReasonDraft('')
  }

  /* ── บทบาทที่เข้าหน้านี้ไม่ได้ (Designer/Admin ตาม §5) — ไม่ใช่ error ── */
  if (!canView) {
    return (
      <div
        style={{
          maxWidth: 'var(--dpm-page-max-w)',
          margin: '0 auto',
          padding: '24px var(--dpm-page-pad-x) 64px',
        }}
      >
        <h1 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>
          VO & Revision Log
        </h1>
        <NoAccessBlock
          reason="ข้อมูล VO และการตัดสินเก็บเงิน/แถมเปิดให้ HoPD หัวหน้าแผนก หัวหน้า Squad และ BD ตามตารางสิทธิ์ — บทบาทของคุณไม่อยู่ในขอบเขตนี้ ซึ่งเป็นกติกาปกติของระบบ"
          contact="ติดต่อ คุณณัฐพงศ์ (HoPD) หากงานของคุณต้องใช้ข้อมูลหน้านี้"
        />
      </div>
    )
  }

  return (
    <div
      style={{
        maxWidth: 'var(--dpm-page-max-w)',
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
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>
            VO & Revision Log
          </h1>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--dpm-sub)' }}>
            งานที่เพิ่มจากสัญญาเดิม — เก็บเงินหรือแถม ต้องเป็นการตัดสินใจ ไม่ใช่เรื่องที่เกิดเงียบ ๆ
          </div>
        </div>
        <Button variant="primary" onClick={formOpen ? () => setFormOpen(false) : openBlankForm}>
          {formOpen ? 'ปิดฟอร์ม VO' : '+ เปิด VO ใหม่'}
        </Button>
      </div>

      {/* ฟอร์มเปิด VO ใหม่ — key เปลี่ยนเมื่อ prefill ใหม่ เพื่อ reset ช่องกรอก */}
      {formOpen && (
        <VoForm key={formKey} seed={formSeed} onSubmit={submitVo} onCancel={() => setFormOpen(false)} />
      )}

      <KpiStrip kpis={kpis} />

      {/* ข้อจำกัดของ Senior/BD ต้องมาพร้อมทางออก (📝 เปิดได้ · ❌ อนุมัติ) */}
      {!canApprove && (
        <div style={{ marginBottom: 16 }}>
          <ConstraintNotice
            text="บทบาทของคุณเปิด VO ได้ แต่การอนุมัติ VO เป็นของหัวหน้าแผนกขึ้นไป"
            how="รายการที่คุณส่งจะเข้าสถานะ 'เสนอ' และรอหัวหน้าแผนกตัดสินว่าเก็บเงินเพิ่มหรือแถม"
            cta={notified ? 'แจ้งแล้ว · รอตัดสิน' : 'แจ้งหัวหน้าแผนก (คุณกิตติ)'}
            state={notified ? 'pending' : 'normal'}
            onAction={() => setNotified(true)}
          />
        </div>
      )}

      {/* ตาราง VO */}
      <div className="dpm-card" style={{ marginBottom: 28 }}>
        <div
          className="dpm-table-head"
          style={{
            display: 'grid',
            gridTemplateColumns: TABLE_GRID,
            gap: 12,
            padding: '10px 20px 8px',
            fontSize: 11,
          }}
        >
          <div>โครงการ / เลข VO</div>
          <div>ที่มา</div>
          <div>รายละเอียด</div>
          <div style={{ textAlign: 'right' }}>ประเมินต้นทุน</div>
          <div>สถานะ</div>
          <div>ผู้ตัดสิน · วันที่</div>
          <div>การอนุมัติ</div>
        </div>

        {vos.map((vo) => (
          <VoRow
            key={vo.id}
            vo={vo}
            canApprove={canApprove}
            reasonOpen={reasonFor === vo.id}
            reasonDraft={reasonDraft}
            onReasonDraft={setReasonDraft}
            onOpenReason={() => {
              setReasonFor(vo.id)
              setReasonDraft('')
            }}
            onCancelReason={() => {
              setReasonFor(null)
              setReasonDraft('')
            }}
            onBillable={() => decideBillable(vo.id)}
            onGoodwill={() => decideGoodwill(vo.id, reasonDraft.trim())}
          />
        ))}

        {/* ท้ายตาราง + legend ที่มา (อ่านได้แม้พิมพ์ขาวดำ) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            fontSize: 12,
            color: 'var(--dpm-mute)',
          }}
        >
          <span>
            {vos.length} รายการ · ปี 2569 · ต้นทุนประเมินจากเรตกลางตามตำแหน่ง {baht(BLENDED_RATE)}
            /คน-สัปดาห์
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {SOURCE_ORDER.map((s) => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <SourceBadge source={s} size={15} />
                {SOURCE_META[s].label}
              </span>
            ))}
          </span>
        </div>
      </div>

      {/* รอบแก้แบบเกินโควตาต่อโครงการ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>รอบแก้แบบเกินโควตา — รอคำตัดสิน</h2>
        {undecidedPhases.length > 0 && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--dpm-bg)',
              background: 'var(--dpm-red)',
              borderRadius: 'var(--dpm-radius-control)',
              padding: '2px 7px',
            }}
          >
            {undecidedPhases.length}
          </span>
        )}
        <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>
          ทุกงวดที่แก้เกินโควตาต้องจบด้วย VO — เก็บเงินเพิ่มหรือแถมอย่างมีเหตุผล
        </span>
      </div>

      {OVER_QUOTA_PHASES.length === 0 ? (
        <div className="dpm-card" style={{ padding: '20px', fontSize: 13, color: 'var(--dpm-mute)' }}>
          ไม่มีงวดที่แก้แบบเกินโควตาในขณะนี้
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {OVER_QUOTA_PHASES.map((item) => (
            <RevisionCard
              key={item.key}
              item={item}
              // VO ที่ถูกปฏิเสธไม่นับเป็นคำตัดสินของงวด — ยังเปิด VO ใหม่ได้
              linkedVo={vos.find((v) => v.linkedPhase === item.key && v.status !== 'rejected')}
              onCreateVo={() => openFormFromPhase(item)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
