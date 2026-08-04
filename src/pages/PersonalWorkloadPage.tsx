import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Button, StatusMark, WorkloadCell } from '../components'
import { STATUS, loadLevel, type RiskLevel } from '../lib/status'
import { percent, personWeeks } from '../lib/format'

/**
 * S7 · ภาระงานรายบุคคล — designs/Personal Workload.dc.html
 * ผู้ใช้: หัวหน้าแผนก · ผู้บริหาร · พนักงานเปิดดูของตัวเองได้
 * แนวคิดหลัก: แสดงสองตัวเลขคู่กันเสมอ (จำนวนโครงการ + % โหลด) —
 * คนที่โหลด 100% ใน 2 โครงการ ต่างจาก 100% ใน 5 โครงการอย่างสิ้นเชิง
 */

/* ────────────────────────── ข้อมูลตัวอย่างตาม prototype (แทนด้วย data layer จริงภายหลัง) ── */

const MONTHS = ['ส.ค. 69', 'ก.ย. 69', 'ต.ค. 69', 'พ.ย. 69', 'ธ.ค. 69', 'ม.ค. 70']
const PERIOD_LABEL = 'ส.ค. 2569 – ม.ค. 2570'

type RoleKey = 'Sr' | 'Mid' | 'Jr'

/** เกณฑ์จำนวนโครงการพร้อมกันตามตำแหน่ง (อ่านจากกฎธุรกิจใน Admin Console เมื่อมี data layer) */
const PROJECT_LIMIT: Record<RoleKey, number> = { Sr: 2, Mid: 3, Jr: 2 }

interface MemberData {
  name: string
  role: RoleKey
  /** % โหลดรายเดือน 6 เดือน */
  load: number[]
  /** จำนวนโครงการที่ทำพร้อมกันรายเดือน */
  count: number[]
}

interface SquadData {
  key: string
  name: string
  lead: string
  totals: number[]
  members: MemberData[]
}

const SQUADS: SquadData[] = [
  {
    key: 'A',
    name: 'Squad A',
    lead: 'คุณเอ',
    totals: [102, 96, 96, 84, 55, 78],
    members: [
      { name: 'คุณเอ', role: 'Sr', load: [110, 105, 95, 90, 45, 72], count: [3, 3, 2, 2, 1, 2] },
      { name: 'คุณซี', role: 'Mid', load: [95, 98, 102, 88, 70, 84], count: [2, 2, 3, 3, 2, 2] },
      { name: 'คุณดี', role: 'Jr', load: [60, 85, 90, 75, 50, 68], count: [1, 2, 2, 1, 1, 2] },
      { name: 'คุณอี', role: 'Jr', load: [92, 95, 97, 93, 80, 86], count: [2, 2, 2, 2, 2, 2] },
    ],
  },
  {
    key: 'B',
    name: 'Squad B',
    lead: 'คุณเอฟ',
    totals: [88, 92, 118, 120, 95, 90],
    members: [
      { name: 'คุณเอฟ', role: 'Sr', load: [92, 96, 124, 126, 98, 94], count: [2, 3, 3, 3, 2, 2] },
      { name: 'คุณจี', role: 'Mid', load: [86, 90, 120, 122, 96, 88], count: [2, 2, 3, 3, 2, 2] },
      { name: 'คุณเอช', role: 'Mid', load: [90, 94, 116, 118, 94, 90], count: [2, 2, 3, 3, 2, 2] },
      { name: 'คุณไอ', role: 'Jr', load: [84, 88, 112, 116, 92, 88], count: [1, 2, 2, 2, 2, 2] },
    ],
  },
  {
    key: 'C',
    name: 'Squad C',
    lead: 'คุณจีน',
    totals: [76, 80, 85, 91, 88, 84],
    members: [
      { name: 'คุณจีน', role: 'Sr', load: [80, 84, 88, 94, 90, 86], count: [2, 2, 2, 2, 2, 2] },
      { name: 'คุณเค', role: 'Mid', load: [78, 82, 86, 92, 90, 84], count: [2, 2, 2, 3, 2, 2] },
      { name: 'คุณแอล', role: 'Jr', load: [70, 74, 81, 87, 84, 82], count: [1, 1, 2, 2, 2, 1] },
    ],
  },
]

interface TimelineRow {
  code: string
  name: string
  phase: number
  /** ระดับต่อเดือน: 2 = ช่วงงานหนัก · 1 = ช่วงเริ่ม/ปิดงาน · 0 = ไม่มีงาน */
  bars: number[]
}

/** มุมมองรายบุคคล — prototype มีข้อมูลไทม์ไลน์ของคุณซีคนเดียว */
const PERSON = {
  name: 'คุณซี',
  role: 'Mid' as RoleKey,
  squad: 'A',
  timeline: [
    { code: 'ID-2026-004', name: 'Café ทองหล่อ', phase: 3, bars: [2, 2, 1, 0, 0, 0] },
    { code: 'ID-2026-009', name: 'สำนักงาน BTS อโศก', phase: 2, bars: [1, 2, 2, 1, 0, 0] },
    { code: 'ID-2026-011', name: 'ร้านค้าปลีก สยาม', phase: 1, bars: [0, 0, 1, 2, 2, 2] },
    { code: 'ID-2026-015', name: 'คอนโด สุขุมวิท 31', phase: 1, bars: [0, 0, 0, 1, 1, 2] },
  ] satisfies TimelineRow[],
  loads: [95, 98, 102, 88, 70, 84],
  pws: [4.1, 4.2, 4.4, 3.8, 3.0, 3.6],
}

/* ────────────────────────── ค่าคงที่ของ layout ─────────────────────────── */

const GRID_COLS = '216px repeat(6, minmax(118px, 1fr)) 96px'
const PERSON_COLS = '250px repeat(6, minmax(110px, 1fr))'

/** พื้นช่องสีสถานะจางของแนว 2 (โหมดสแกน) */
const TINT: Record<RiskLevel, string> = {
  critical: 'var(--dpm-tint-red)',
  warn: 'var(--dpm-tint-yellow)',
  ok: 'var(--dpm-tint-green)',
  low: 'var(--dpm-tint-blue)',
}

const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
const barWidth = (pct: number) => Math.min(100, pct * (100 / 120))

/* ────────────────────────── ชิ้นส่วนย่อย ───────────────────────────────── */

interface HoverBoxProps {
  style: CSSProperties
  hoverStyle?: CSSProperties
  onClick?: () => void
  title?: string
  children?: ReactNode
}

/** กล่องที่มี pseudo-state hover ด้วย inline style (สเปกห้ามเงา/ขยับตำแหน่งเป็น hover effect) */
function HoverBox({ style, hoverStyle, onClick, title, children }: HoverBoxProps) {
  const [hover, setHover] = useState(false)
  return (
    <div
      style={hover && hoverStyle ? { ...style, ...hoverStyle } : style}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      title={title}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}

const SEG_WRAP: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  border: '1px solid var(--dpm-border)',
  borderRadius: 'var(--dpm-radius-control)',
  background: 'var(--dpm-surface)',
  padding: 3,
}

interface SegOptionProps {
  active: boolean
  disabled?: boolean
  title?: string
  onClick?: () => void
  children: ReactNode
}

/** ตัวเลือกใน segmented control — ตัวที่ปิดใช้งานต้องมีคำอธิบายว่าทำไม (ผ่าน title) */
function SegOption({ active, disabled = false, title, onClick, children }: SegOptionProps) {
  return (
    <HoverBox
      style={{
        fontSize: 12,
        padding: '5px 12px',
        borderRadius: 'var(--dpm-radius-badge)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'var(--dpm-disabled)' : active ? 'var(--dpm-ink)' : 'var(--dpm-sub)',
        background: active ? 'var(--dpm-subtle)' : 'transparent',
        fontWeight: active ? 600 : 400,
        whiteSpace: 'nowrap',
      }}
      hoverStyle={disabled || active ? undefined : { color: 'var(--dpm-ink)' }}
      onClick={disabled ? undefined : onClick}
      title={title}
    >
      {children}
    </HoverBox>
  )
}

/** ช่องข้อมูลแนว 2 · ช่องความร้อน — เลขโครงการในกล่องเล็กซ้าย · % 19px ขวา */
function HeatCell({ pct, count, limit }: { pct: number; count: number; limit: number }) {
  const level = loadLevel(pct)
  const meta = STATUS[level]
  const over = count > limit
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: over ? 'var(--dpm-red)' : 'var(--dpm-sub)',
          border: `1px solid ${over ? 'var(--dpm-red)' : 'var(--dpm-border)'}`,
          borderRadius: 'var(--dpm-radius-badge)',
          minWidth: 20,
          textAlign: 'center',
          padding: '2px 0',
        }}
      >
        {count}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <StatusMark level={level} />
          <span style={{ fontSize: 19, fontWeight: 600, color: meta.color, lineHeight: 1 }}>
            {percent(pct)}
          </span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--dpm-mute)', marginTop: 3, whiteSpace: 'nowrap' }}>
          {over ? 'เกินเกณฑ์' : `${count} โครงการ`}
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────── มุมมองตารางรวม ─────────────────────────────── */

const LEGEND: { level: RiskLevel; label: string }[] = [
  { level: 'critical', label: 'เกิน 110%' },
  { level: 'warn', label: '100–110%' },
  { level: 'ok', label: '65–100%' },
  { level: 'low', label: 'ต่ำกว่า 65% (โหลดต่ำ)' },
]

interface GridSectionProps {
  cellVariant: 'v1' | 'v2'
  onCellVariant: (v: 'v1' | 'v2') => void
  openSquads: Record<string, boolean>
  onToggleSquad: (key: string) => void
  onOpenPerson: () => void
}

function GridSection({
  cellVariant,
  onCellVariant,
  openSquads,
  onToggleSquad,
  onOpenPerson,
}: GridSectionProps) {
  return (
    <>
      {/* legend เกณฑ์สี + ตัวสลับรูปแบบช่อง (มุมขวาบน) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            fontSize: 11,
            color: 'var(--dpm-sub)',
          }}
        >
          {LEGEND.map((it) => (
            <span key={it.level} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <StatusMark level={it.level} />
              {it.label}
            </span>
          ))}
          <span style={{ color: 'var(--dpm-border)' }}>|</span>
          <span>จุด = จำนวนโครงการที่ทำพร้อมกัน</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>รูปแบบช่อง</span>
          <div style={SEG_WRAP}>
            <SegOption active={cellVariant === 'v1'} onClick={() => onCellVariant('v1')}>
              แนว 1 · ตัวเลข + จุด
            </SegOption>
            <SegOption active={cellVariant === 'v2'} onClick={() => onCellVariant('v2')}>
              แนว 2 · ช่องความร้อน
            </SegOption>
          </div>
        </div>
      </div>

      {/* ตารางรวม จัดกลุ่มตาม Squad พับ/ขยายได้อิสระ */}
      <div className="dpm-card">
        <div
          className="dpm-table-head"
          style={{ display: 'grid', gridTemplateColumns: GRID_COLS }}
        >
          <div style={{ padding: '9px 16px', fontSize: 11 }}>Squad / สมาชิก</div>
          {MONTHS.map((mo) => (
            <div
              key={mo}
              style={{
                padding: '9px 12px',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--dpm-ink)',
                borderLeft: '1px solid var(--dpm-border)',
              }}
            >
              {mo}
            </div>
          ))}
          <div
            style={{
              padding: '9px 12px',
              fontSize: 11,
              textAlign: 'right',
              borderLeft: '1px solid var(--dpm-border)',
            }}
          >
            เฉลี่ย
          </div>
        </div>

        {SQUADS.map((sq) => {
          const open = !!openSquads[sq.key]
          return (
            <div key={sq.key}>
              {/* แถว Squad — % รวมต่อเดือน 16px/600 + สัญลักษณ์ เห็นได้แม้พับ */}
              <HoverBox
                style={{
                  display: 'grid',
                  gridTemplateColumns: GRID_COLS,
                  borderBottom: '1px solid var(--dpm-border)',
                  background: 'var(--dpm-bg)',
                  cursor: 'pointer',
                }}
                hoverStyle={{ background: 'var(--dpm-subtle)' }}
                onClick={() => onToggleSquad(sq.key)}
              >
                <div style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 9, color: 'var(--dpm-mute)' }}>{open ? '▼' : '▶'}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{sq.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--dpm-mute)', whiteSpace: 'nowrap' }}>
                    ({sq.lead}) · {sq.members.length} คน{open ? '' : ' · คลิกเพื่อขยาย'}
                  </span>
                </div>
                {sq.totals.map((p, i) => {
                  const meta = STATUS[loadLevel(p)]
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '11px 12px',
                        borderLeft: '1px solid var(--dpm-border)',
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 6,
                      }}
                    >
                      <StatusMark level={loadLevel(p)} />
                      <span style={{ fontSize: 16, fontWeight: 600, color: meta.color }}>
                        {percent(p)}
                      </span>
                    </div>
                  )
                })}
                <div
                  style={{
                    padding: '11px 12px',
                    borderLeft: '1px solid var(--dpm-border)',
                    textAlign: 'right',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--dpm-sub)',
                  }}
                >
                  {percent(avg(sq.totals))}
                </div>
              </HoverBox>

              {/* แถวสมาชิก (เมื่อขยาย) */}
              {open &&
                sq.members.map((m) => {
                  const limit = PROJECT_LIMIT[m.role]
                  const meanCount = (
                    m.count.reduce((a, b) => a + b, 0) / m.count.length
                  ).toFixed(1)
                  return (
                    <div
                      key={m.name}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: GRID_COLS,
                        borderBottom: '1px solid var(--dpm-border)',
                        background: 'var(--dpm-surface)',
                      }}
                    >
                      <HoverBox
                        style={{ padding: '10px 16px 10px 38px', cursor: 'pointer' }}
                        hoverStyle={{ background: 'var(--dpm-bg)' }}
                        onClick={onOpenPerson}
                        title="ดูไทม์ไลน์รายโครงการ"
                      >
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span
                            style={{ fontSize: 14, fontWeight: 500, color: 'var(--dpm-accent)' }}
                          >
                            {m.name}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>{m.role}</span>
                        </div>
                        <div
                          style={{
                            marginTop: 2,
                            fontSize: 11,
                            color: 'var(--dpm-mute)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          เกณฑ์โครงการพร้อมกัน {limit} โครงการ
                        </div>
                      </HoverBox>

                      {m.load.map((p, i) =>
                        cellVariant === 'v1' ? (
                          <div
                            key={i}
                            style={{
                              borderLeft: '1px solid var(--dpm-border)',
                              padding: '4px 5px',
                            }}
                          >
                            <WorkloadCell pct={p} projectCount={m.count[i]} projectLimit={limit} />
                          </div>
                        ) : (
                          <div
                            key={i}
                            style={{
                              borderLeft: '1px solid var(--dpm-border)',
                              padding: '9px 12px',
                              background: TINT[loadLevel(p)],
                            }}
                          >
                            <HeatCell pct={p} count={m.count[i] ?? 0} limit={limit} />
                          </div>
                        ),
                      )}

                      <div
                        style={{
                          borderLeft: '1px solid var(--dpm-border)',
                          padding: '10px 12px',
                          textAlign: 'right',
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dpm-sub)' }}>
                          {percent(avg(m.load))}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--dpm-mute)', marginTop: 2 }}>
                          เฉลี่ย {meanCount} โครงการ
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )
        })}
      </div>

      <IssuesCard onOpenPerson={onOpenPerson} />
    </>
  )
}

/* ────────────────────────── กล่องประเด็นที่พบ ──────────────────────────── */

function IssuesCard({ onOpenPerson }: { onOpenPerson: () => void }) {
  const rowStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '76px minmax(0, 1fr) 150px',
    gap: 14,
    alignItems: 'center',
    padding: '13px 16px',
  }
  const tagStyle = (color: string): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    fontWeight: 600,
    color,
  })
  const noteStyle: CSSProperties = { fontSize: 12, color: 'var(--dpm-sub)', marginTop: 3 }

  return (
    <div className="dpm-card">
      <div
        style={{
          padding: '11px 16px',
          borderBottom: '1px solid var(--dpm-border)',
          background: 'var(--dpm-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>ประเด็นที่พบ</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--dpm-bg)',
            background: 'var(--dpm-sub)',
            borderRadius: 'var(--dpm-radius-control)',
            padding: '1px 7px',
          }}
        >
          3
        </span>
        <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>
          อ่านได้ทั้งในแง่ความเสี่ยงโครงการ และความเป็นอยู่ของทีม
        </span>
      </div>

      <div style={{ ...rowStyle, borderBottom: '1px solid var(--dpm-border)' }}>
        <div style={tagStyle('var(--dpm-red)')}>
          <StatusMark level="critical" size={10} />
          เกินเกณฑ์
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55 }}>
          คุณเอ ทำ <b>3 โครงการพร้อมกัน</b> ใน ส.ค.–ก.ย. เกินเกณฑ์ 2 โครงการของตำแหน่ง Senior
          <div style={noteStyle}>
            ต้องทำ: โอน ID-2026-011 ให้คุณอี หรือเลื่อนงวด 1 ไป ต.ค. — ทั้งสองทางอยู่ใน Squad A
            ทำได้เอง
          </div>
        </div>
        <Button variant="primary">ดูรายละเอียด</Button>
      </div>

      <div style={{ ...rowStyle, borderBottom: '1px solid var(--dpm-border)' }}>
        <div style={tagStyle('var(--dpm-red)')}>
          <StatusMark level="critical" size={10} />
          เกินกำลัง
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55 }}>
          Squad B ล้น <b>118–120%</b> ใน ต.ค.–พ.ย. ขณะที่ Squad A เหลือพื้นที่ <b>16%</b>
          <div style={noteStyle}>
            ต้องทำ: ย้ายโครงการหนึ่งไป Squad A หรือย้ายสมาชิกชั่วคราว — การย้ายข้าม Squad
            ต้องอนุมัติโดยคุณ (หัวหน้าแผนก)
          </div>
        </div>
        <Button variant="primary">ดูทางเลือก</Button>
      </div>

      <div style={rowStyle}>
        <div style={tagStyle('var(--dpm-blue)')}>
          <StatusMark level="low" size={10} />
          โหลดต่ำ
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55 }}>
          คุณดี โหลดต่ำกว่า 65% ติดต่อกัน <b>2 เดือน</b> (ส.ค. 60% · ธ.ค. 50%)
          <div style={noteStyle}>
            ต้องทำ: เพิ่มงานที่ต่อยอดทักษะ — Growth Profile ระบุว่ายังขาดประสบการณ์งานร้านค้าปลีก
          </div>
        </div>
        <Button variant="secondary" onClick={onOpenPerson}>
          ดู Growth Profile
        </Button>
      </div>
    </div>
  )
}

/* ────────────────────────── มุมมองรายบุคคล ─────────────────────────────── */

function PersonSection({ onBack }: { onBack: () => void }) {
  const limit = PROJECT_LIMIT[PERSON.role]

  // จำนวนโครงการพร้อมกันต่อเดือน — คำนวณจากไทม์ไลน์ ต้องตรงกับตัวเลขในตารางรวม
  const monthCounts = MONTHS.map(
    (_, i) => PERSON.timeline.filter((t) => (t.bars[i] ?? 0) > 0).length,
  )

  const barStyle = (v: number) =>
    v === 2
      ? { bg: 'var(--dpm-ink)', border: 'var(--dpm-ink)', fg: 'var(--dpm-bg)', label: 'หนัก' }
      : v === 1
        ? {
            bg: 'var(--dpm-border)',
            border: 'var(--dpm-border)',
            fg: 'var(--dpm-sub)',
            label: 'เริ่ม/ปิด',
          }
        : { bg: 'var(--dpm-surface)', border: 'var(--dpm-border)', fg: 'transparent', label: '·' }

  const summaryLabel: CSSProperties = { padding: '9px 16px', fontSize: 12, color: 'var(--dpm-sub)' }
  const summaryCell: CSSProperties = { borderLeft: '1px solid var(--dpm-border)', padding: '9px 12px' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* หัวข้อ ชื่อ/ตำแหน่ง/Squad + ปุ่ม Growth Profile + ปุ่มกลับ */}
      <div
        className="dpm-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 600 }}>{PERSON.name}</span>
          <span style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>
            {PERSON.role} · Squad {PERSON.squad}
          </span>
          <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>
            เกณฑ์โครงการพร้อมกัน {limit} โครงการ
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button variant="secondary">ดู Growth Profile</Button>
          <Button variant="secondary" onClick={onBack}>
            ← กลับตารางรวม
          </Button>
        </div>
      </div>

      {/* ไทม์ไลน์รายโครงการ */}
      <div className="dpm-card">
        <div
          className="dpm-table-head"
          style={{ display: 'grid', gridTemplateColumns: PERSON_COLS }}
        >
          <div style={{ padding: '9px 16px', fontSize: 11 }}>โครงการ</div>
          {MONTHS.map((mo) => (
            <div
              key={mo}
              style={{
                padding: '9px 12px',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--dpm-ink)',
                borderLeft: '1px solid var(--dpm-border)',
              }}
            >
              {mo}
            </div>
          ))}
        </div>

        {PERSON.timeline.map((t) => (
          <div
            key={t.code}
            style={{
              display: 'grid',
              gridTemplateColumns: PERSON_COLS,
              borderBottom: '1px solid var(--dpm-border)',
              alignItems: 'center',
              background: 'var(--dpm-surface)',
            }}
          >
            <div style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span className="dpm-mono" style={{ fontSize: 12 }}>
                  {t.code}
                </span>
                <span style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>งวด {t.phase}</span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--dpm-mute)',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {t.name}
              </div>
            </div>
            {t.bars.map((v, i) => {
              const b = barStyle(v)
              return (
                <div key={i} style={{ borderLeft: '1px solid var(--dpm-border)', padding: 12 }}>
                  <div
                    style={{
                      height: 16,
                      borderRadius: 'var(--dpm-radius-bar)',
                      background: b.bg,
                      border: `1px solid ${b.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: 10, color: b.fg }}>{b.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {/* แถวสรุป 1: จำนวนโครงการพร้อมกัน (คำนวณจากไทม์ไลน์) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: PERSON_COLS,
            borderBottom: '1px solid var(--dpm-border)',
            background: 'var(--dpm-bg)',
          }}
        >
          <div style={summaryLabel}>จำนวนโครงการพร้อมกัน</div>
          {monthCounts.map((n, i) => {
            const over = n > limit
            const color = over ? 'var(--dpm-red)' : n <= 1 ? 'var(--dpm-blue)' : 'var(--dpm-ink)'
            const note = over ? 'เกินเกณฑ์' : n <= 1 ? 'โฟกัสเดียว' : 'ในเกณฑ์'
            return (
              <div
                key={i}
                style={{ ...summaryCell, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span style={{ fontSize: 15, fontWeight: 600, color }}>{n}</span>
                <span style={{ fontSize: 11, color }}>{note}</span>
              </div>
            )
          })}
        </div>

        {/* แถวสรุป 2: คน-สัปดาห์ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: PERSON_COLS,
            borderBottom: '1px solid var(--dpm-border)',
            background: 'var(--dpm-bg)',
          }}
        >
          <div style={summaryLabel}>คน-สัปดาห์</div>
          {PERSON.pws.map((w, i) => (
            <div key={i} style={{ ...summaryCell, fontSize: 15, fontWeight: 600 }}>
              {personWeeks(w)}
            </div>
          ))}
        </div>

        {/* แถวสรุป 3: % โหลด พร้อมแถบและขีด 100% */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: PERSON_COLS,
            background: 'var(--dpm-bg)',
          }}
        >
          <div style={{ ...summaryLabel, paddingBottom: 14 }}>% โหลด</div>
          {PERSON.loads.map((p, i) => {
            const level = loadLevel(p)
            const meta = STATUS[level]
            return (
              <div key={i} style={{ ...summaryCell, paddingBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <StatusMark level={level} />
                  <span style={{ fontSize: 17, fontWeight: 600, color: meta.color }}>
                    {percent(p)}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 5,
                    height: 4,
                    background: 'var(--dpm-border)',
                    borderRadius: 'var(--dpm-radius-bar)',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${barWidth(p)}%`,
                      background: meta.color,
                      borderRadius: 'var(--dpm-radius-bar)',
                      transition: 'width 260ms ease',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 'var(--dpm-refline-pos)',
                      top: -2,
                      bottom: -2,
                      width: 1,
                      background: 'var(--dpm-mute)',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* legend ของไทม์ไลน์ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          fontSize: 11,
          color: 'var(--dpm-sub)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 22,
              height: 12,
              background: 'var(--dpm-ink)',
              borderRadius: 'var(--dpm-radius-bar)',
              display: 'inline-block',
            }}
          />
          ช่วงงานหนัก
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 22,
              height: 12,
              background: 'var(--dpm-border)',
              borderRadius: 'var(--dpm-radius-bar)',
              display: 'inline-block',
            }}
          />
          ช่วงเริ่ม/ปิดงาน
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 22,
              height: 12,
              background: 'var(--dpm-surface)',
              border: '1px solid var(--dpm-border)',
              borderRadius: 'var(--dpm-radius-bar)',
              display: 'inline-block',
            }}
          />
          ไม่มีงานในเดือนนั้น
        </span>
        <span style={{ color: 'var(--dpm-border)' }}>|</span>
        <span>เส้นบนแถบ % คือระดับ 100%</span>
      </div>
    </div>
  )
}

/* ────────────────────────── หน้า ───────────────────────────────────────── */

export function PersonalWorkloadPage() {
  const [view, setView] = useState<'grid' | 'person'>('grid')
  const [cellVariant, setCellVariant] = useState<'v1' | 'v2'>('v1')
  const [openSquads, setOpenSquads] = useState<Record<string, boolean>>({
    A: true,
    B: false,
    C: false,
  })

  const isPerson = view === 'person'

  return (
    <div>
      {/* หัวบนของหน้า — sticky ใต้แถบนำทางหลัก */}
      <div
        style={{
          position: 'sticky',
          top: 'var(--dpm-h-topnav)',
          zIndex: 5,
          background: 'var(--dpm-bg)',
          borderBottom: '1px solid var(--dpm-border)',
        }}
      >
        <div
          style={{
            maxWidth: 'var(--dpm-page-max-w)',
            margin: '0 auto',
            padding: '14px var(--dpm-page-pad-x)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {isPerson && (
            <HoverBox
              style={{
                fontSize: 16,
                color: 'var(--dpm-sub)',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 'var(--dpm-radius-control)',
              }}
              hoverStyle={{ background: 'var(--dpm-subtle)', color: 'var(--dpm-ink)' }}
              onClick={() => setView('grid')}
              title="กลับไปตารางรวม"
            >
              ←
            </HoverBox>
          )}
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>
              {isPerson ? `ภาระงานรายบุคคล · ${PERSON.name}` : 'ภาระงานรายบุคคล'}
            </h1>
            <div style={{ marginTop: 3, fontSize: 12, color: 'var(--dpm-sub)' }}>
              {isPerson
                ? `มุมมองรายคน — ไทม์ไลน์โครงการ ${PERIOD_LABEL}`
                : 'แผนก Interior · 3 Squad · 11 คน · คลิกชื่อคนเพื่อดูไทม์ไลน์รายโครงการ'}
            </div>
          </div>
          <span style={{ flex: 1 }} />

          {/* มุมมอง รายเดือน/รายสัปดาห์ — รายสัปดาห์รอข้อมูลการจัดสรรรายสัปดาห์ */}
          <div style={SEG_WRAP}>
            <SegOption active>รายเดือน</SegOption>
            <SegOption
              active={false}
              disabled
              title="มุมมองรายสัปดาห์จะเปิดใช้เมื่อเชื่อมข้อมูลการจัดสรรรายสัปดาห์ — ตอนนี้ใช้มุมมองรายเดือน"
            >
              รายสัปดาห์
            </SegOption>
          </div>

          <HoverBox
            style={{
              fontSize: 12,
              color: 'var(--dpm-ink)',
              border: '1px solid var(--dpm-border)',
              background: 'var(--dpm-surface)',
              borderRadius: 'var(--dpm-radius-control)',
              padding: '7px 12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            hoverStyle={{ borderColor: 'var(--dpm-ink)' }}
          >
            แผนก Interior ▾
          </HoverBox>

          {/* ตัวเลือกช่วงเวลา */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid var(--dpm-border)',
              borderRadius: 'var(--dpm-radius-control)',
              background: 'var(--dpm-surface)',
              padding: '4px 4px 4px 12px',
            }}
          >
            <HoverBox
              style={{
                width: 22,
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--dpm-sub)',
                cursor: 'pointer',
                borderRadius: 'var(--dpm-radius-badge)',
              }}
              hoverStyle={{ background: 'var(--dpm-subtle)', color: 'var(--dpm-ink)' }}
              title="ช่วงก่อนหน้า — ข้อมูลตัวอย่างครอบคลุมช่วงนี้ช่วงเดียว"
            >
              ‹
            </HoverBox>
            <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
              {PERIOD_LABEL}
            </span>
            <HoverBox
              style={{
                width: 22,
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--dpm-sub)',
                cursor: 'pointer',
                borderRadius: 'var(--dpm-radius-badge)',
              }}
              hoverStyle={{ background: 'var(--dpm-subtle)', color: 'var(--dpm-ink)' }}
              title="ช่วงถัดไป — ข้อมูลตัวอย่างครอบคลุมช่วงนี้ช่วงเดียว"
            >
              ›
            </HoverBox>
          </div>

          <Button variant="secondary">ส่งออก Excel</Button>
        </div>
      </div>

      <div
        style={{
          maxWidth: 'var(--dpm-page-max-w)',
          margin: '0 auto',
          padding: '20px var(--dpm-page-pad-x) 80px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {isPerson ? (
          <PersonSection onBack={() => setView('grid')} />
        ) : (
          <GridSection
            cellVariant={cellVariant}
            onCellVariant={setCellVariant}
            openSquads={openSquads}
            onToggleSquad={(key) => setOpenSquads((s) => ({ ...s, [key]: !s[key] }))}
            onOpenPerson={() => setView('person')}
          />
        )}
      </div>
    </div>
  )
}
