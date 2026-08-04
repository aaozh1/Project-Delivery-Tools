import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { tryApi } from '../api/client'
import { Button, StatusMark } from '../components'
import { STATUS, type RiskLevel } from '../lib/status'
import { bahtAbbrev, percent } from '../lib/format'
import {
  FILTERS,
  MAX_DELAY_DAYS,
  PROJECTS,
  SQUAD_META,
  TOTAL_PROJECTS,
  type FilterKey,
  type MarginMode,
  type ProjectRow,
} from './portfolio/data'

/** ลำดับความรุนแรงใช้เรียงแถวในแต่ละ window และเรียง window */
const RISK_ORDER: Record<RiskLevel, number> = { critical: 0, warn: 1, ok: 2, low: 3 }

/* ───────────────────────── แถบ KPI 5 ช่อง ───────────────────────── */

interface Kpi {
  label: string
  value: string
  note: string
  noteLevel?: RiskLevel
}

const KPIS: Kpi[] = [
  { label: 'งานในมือ', value: bahtAbbrev(48_200_000), note: '24 โครงการ' },
  { label: 'รับรู้รายได้แล้ว', value: bahtAbbrev(31_400_000), note: '65% ของงานในมือ' },
  {
    label: 'เงินค้างรับ',
    value: bahtAbbrev(6_800_000),
    note: `ค้างเกิน 90 วัน ${bahtAbbrev(1_200_000)}`,
    noteLevel: 'critical',
  },
  { label: 'Margin เฉลี่ย', value: '28.4%', note: 'ต่ำกว่าเป้า 2 จุด', noteLevel: 'warn' },
  { label: 'การใช้กำลังคน', value: '81%', note: 'เป้าหมาย 78–88%' },
]

interface LiveMetrics {
  latestWeek: number
  utilizationPct: number
  projectUsage: Array<{ code: string; usedPct: number }>
}

function KpiStrip({ live }: { live: LiveMetrics | null }) {
  const kpis: Kpi[] = live
    ? KPIS.map((k) =>
        k.label === 'การใช้กำลังคน'
          ? {
              label: k.label,
              value: `${live.utilizationPct}%`,
              note: `คำนวณสดจากตารางจัดสรร สัปดาห์ ${live.latestWeek} (Squad A)`,
              noteLevel: live.utilizationPct > 110 ? 'critical' : undefined,
            }
          : k,
      )
    : KPIS
  return (
    <div
      className="dpm-card"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        marginBottom: 24,
      }}
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

/* ───────────────────── กล่อง "ต้องตัดสินใจ (3)" ───────────────────── */

const decisionRowStyle = (last: boolean): CSSProperties => ({
  display: 'flex',
  gap: 16,
  padding: '18px 20px',
  borderBottom: last ? 'none' : '1px solid var(--dpm-border)',
  alignItems: 'flex-start',
})

function DecisionStatusCol({ level }: { level: RiskLevel }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        width: 88,
        flexShrink: 0,
        paddingTop: 2,
      }}
    >
      <StatusMark level={level} size={level === 'critical' ? 11 : 10} />
      <span style={{ fontSize: 12, fontWeight: 600, color: STATUS[level].color }}>
        {STATUS[level].label}
      </span>
    </div>
  )
}

function DecisionActions({
  primary,
  secondary,
  to,
}: {
  primary: string
  secondary?: string
  /** ปลายทางของปุ่มหลัก — ปุ่มใน DPM ต้องพาไปที่ที่ตัดสินใจต่อได้จริง */
  to?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 132, flexShrink: 0 }}>
      {to ? (
        <Link to={to} className="dpm-btn dpm-btn--primary" style={{ width: '100%' }}>
          {primary}
        </Link>
      ) : (
        <Button variant="primary" style={{ width: '100%' }}>
          {primary}
        </Button>
      )}
      {secondary && (
        <Button variant="secondary" style={{ width: '100%' }}>
          {secondary}
        </Button>
      )}
    </div>
  )
}

/** แถบเทียบภาระงาน Squad พร้อมขีดอ้างอิง 100% (รายการที่ 3) */
function SquadCompareBar({
  name,
  widthPct,
  valueText,
  color,
}: {
  name: string
  widthPct: number
  valueText: string
  color: string
}) {
  return (
    <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 11, color: 'var(--dpm-mute)', width: 64 }}>{name}</span>
      <div
        style={{
          position: 'relative',
          flex: 1,
          maxWidth: 320,
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
            width: `${widthPct}%`,
            background: color,
            borderRadius: 'var(--dpm-radius-bar)',
            transition: 'width 260ms ease',
          }}
        />
        {/* ขีดอ้างอิง 100% */}
        <div
          style={{
            position: 'absolute',
            left: '84.7%',
            top: -3,
            bottom: -3,
            width: 1,
            background: 'var(--dpm-ink)',
          }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, width: 44 }}>{valueText}</span>
    </div>
  )
}

function DecisionBox() {
  return (
    <div className="dpm-card dpm-card--critical" style={{ marginBottom: 28 }}>
      {/* หัวกล่อง */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid var(--dpm-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>ต้องตัดสินใจ</span>
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
            3
          </span>
          <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>
            เกินเกณฑ์ที่ตั้งไว้ · รอคุณตัดสินใจ
          </span>
        </div>
        <Button variant="secondary">ตั้งค่าเกณฑ์</Button>
      </div>

      {/* รายการ 1 — ID-2026-004 Café ทองหล่อ */}
      <div style={decisionRowStyle(false)}>
        <DecisionStatusCol level="critical" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <span className="dpm-mono" style={{ fontSize: 13, fontWeight: 500 }}>
              ID-2026-004
            </span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Café ทองหล่อ</span>
            <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>Squad A · แผนก ID</span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--dpm-ink)', lineHeight: 1.55 }}>
            ใช้คน-สัปดาห์ไปแล้ว <b style={{ color: 'var(--dpm-red)' }}>132%</b> ขณะที่งวด 3
            เสร็จเพียง <b>45%</b>
          </div>
          <div
            style={{
              marginTop: 8,
              padding: '8px 12px',
              background: 'var(--dpm-subtle)',
              borderLeft: '2px solid var(--dpm-red)',
              borderRadius: '0 var(--dpm-radius-control) var(--dpm-radius-control) 0',
              fontSize: 13,
              color: 'var(--dpm-ink)',
            }}
          >
            พยากรณ์ตอนจบ: เกินงบ <b>61%</b> → Margin เหลือ{' '}
            <b style={{ color: 'var(--dpm-red)' }}>{percent(-4)}</b>
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--dpm-sub)' }}>
            คำถามที่ต้องตอบ: หยุดขาดทุนตอนนี้ หรือ เจรจาขอเพิ่มเงินกับลูกค้า?
          </div>
        </div>
        <DecisionActions primary="ดูโครงการ" secondary="พักไว้ก่อน" to="/project" />
      </div>

      {/* รายการ 2 — AR-2025-011 */}
      <div style={decisionRowStyle(false)}>
        <DecisionStatusCol level="critical" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <span className="dpm-mono" style={{ fontSize: 13, fontWeight: 500 }}>
              AR-2025-011
            </span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>อาคารสำนักงานพระราม 9</span>
            <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>Squad C · แผนก AR</span>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.55 }}>
            งวด 4 อนุมัติแล้ว <b style={{ color: 'var(--dpm-red)' }}>12 วัน</b> แต่ยังไม่วางบิล{' '}
            <b>{bahtAbbrev(1_200_000)}</b>
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--dpm-sub)' }}>
            ต้องทำ: ส่งเรื่องให้บัญชีออกใบแจ้งหนี้ภายในวันนี้ มิฉะนั้นเลื่อนไปรอบเก็บเงินเดือนหน้า
          </div>
        </div>
        <DecisionActions primary="สั่งวางบิล" secondary="ดูงวดงาน" to="/finance" />
      </div>

      {/* รายการ 3 — Squad B ล้น */}
      <div style={decisionRowStyle(true)}>
        <DecisionStatusCol level="warn" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>
              Squad B จะรับงานล้น 118% ในเดือน ต.ค.–พ.ย.
            </span>
            <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>แผนก ID</span>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.55 }}>
            ขณะที่ Squad A เหลือกำลังว่าง <b>2.5 คน-สัปดาห์/สัปดาห์</b> ในช่วงเดียวกัน
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--dpm-sub)' }}>
            ต้องทำ: การย้ายคนข้าม Squad ทำได้เฉพาะหัวหน้าแผนก — คุณมีสิทธิ์อนุมัติ
            เปิดหน้าภาระงานเพื่อย้าย
          </div>
          <div style={{ marginTop: 5 }}>
            <SquadCompareBar
              name="Squad B"
              widthPct={84.7}
              valueText="118%"
              color="var(--dpm-yellow)"
            />
            <SquadCompareBar
              name="Squad A"
              widthPct={45.7}
              valueText="64%"
              color="var(--dpm-blue)"
            />
          </div>
        </div>
        <DecisionActions primary="ดูภาระงาน" to="/workload" />
      </div>
    </div>
  )
}

/* ─────────────────────────── ตารางโครงการ ─────────────────────────── */

/**
 * แถบซ้อนสองชั้นในตาราง — layout ต่างจาก component `DualProgressBar`
 * (ความกว้าง label 34px · มีข้อความกรณี "เดินคู่กันตามแผน") จึงทำ inline ตาม prototype
 */
function RowDualBar({ progress, used }: { progress: number; used: number }) {
  const gap = used - progress
  const usedColor =
    used > 110 ? 'var(--dpm-red)' : gap > 12 ? 'var(--dpm-yellow)' : 'var(--dpm-sub)'
  const usedWeight = gap > 12 ? 600 : 400
  const gapText =
    gap > 12
      ? `ใช้แรงงานเร็วกว่างาน ${gap} จุด`
      : gap < -8
        ? `งานเดินเร็วกว่าแรงงาน ${Math.abs(gap)} จุด`
        : 'เดินคู่กันตามแผน'
  const gapColor =
    gap > 12 ? (used > 110 ? 'var(--dpm-red)' : 'var(--dpm-yellow)') : 'var(--dpm-mute)'

  const track: CSSProperties = {
    position: 'relative',
    flex: 1,
    height: 7,
    background: 'var(--dpm-subtle)',
    borderRadius: 'var(--dpm-radius-bar)',
  }
  const fill = (width: number, background: string): CSSProperties => ({
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: `${Math.min(100, width)}%`,
    background,
    borderRadius: 'var(--dpm-radius-bar)',
    transition: 'width 260ms ease',
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={track}>
          <div style={fill(progress, 'var(--dpm-ink)')} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--dpm-sub)', width: 34, textAlign: 'right' }}>
          {progress}%
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
        <div style={track}>
          <div style={fill(used, usedColor)} />
          {/* ขีดอ้างอิงตำแหน่ง = % ความคืบหน้า */}
          <div
            style={{
              position: 'absolute',
              left: `${Math.min(100, progress)}%`,
              top: -3,
              bottom: -3,
              width: 1,
              background: 'var(--dpm-ink)',
            }}
          />
        </div>
        <span
          style={{
            fontSize: 11,
            width: 34,
            textAlign: 'right',
            color: usedColor,
            fontWeight: usedWeight,
          }}
        >
          {used}%
        </span>
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: gapColor }}>{gapText}</div>
    </div>
  )
}

/** คอลัมน์ช้า เรา/ลูกค้า — แถบแยกซ้าย-ขวาจากเส้นกลาง */
function DelaySplitBar({ usDelay, clDelay }: { usDelay: number; clDelay: number }) {
  const usW = usDelay ? Math.max(8, (usDelay / MAX_DELAY_DAYS) * 100) : 0
  const clW = clDelay ? Math.max(8, (clDelay / MAX_DELAY_DAYS) * 100) : 0
  const usColor =
    usDelay > 5 ? 'var(--dpm-red)' : usDelay > 0 ? 'var(--dpm-yellow)' : 'var(--dpm-mute)'
  const clColor = clDelay > 0 ? 'var(--dpm-blue)' : 'var(--dpm-mute)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          fontSize: 12,
          width: 30,
          textAlign: 'right',
          color: usColor,
          fontWeight: usDelay > 5 ? 600 : 400,
        }}
      >
        {usDelay}d
      </span>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: 14 }}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <div
            style={{
              height: 10,
              width: `${usW}%`,
              background: usColor,
              borderRadius: 'var(--dpm-radius-bar) 0 0 var(--dpm-radius-bar)',
              transition: 'width 260ms ease',
            }}
          />
        </div>
        <div style={{ width: 1, height: 14, background: 'var(--dpm-mute)' }} />
        <div style={{ flex: 1, display: 'flex' }}>
          <div
            style={{
              height: 10,
              width: `${clW}%`,
              background: clColor,
              borderRadius: '0 var(--dpm-radius-bar) var(--dpm-radius-bar) 0',
              transition: 'width 260ms ease',
            }}
          />
        </div>
      </div>
      <span
        style={{ fontSize: 12, width: 30, color: clColor, fontWeight: clDelay > 5 ? 600 : 400 }}
      >
        {clDelay}d
      </span>
    </div>
  )
}

/** แถวโครงการแบบกะทัดรัดใน window ของ Squad — คลิกไปหน้ารายละเอียดโครงการ */
function SquadWindowRow({ row, marginMode }: { row: ProjectRow; marginMode: MarginMode }) {
  const m = marginMode === 'forecast' ? row.marginFc : row.marginNow
  const marginColor = m < 0 ? 'var(--dpm-red)' : m < 20 ? 'var(--dpm-yellow)' : 'var(--dpm-ink)'

  return (
    <Link
      to="/project"
      className="dpm-table-row"
      style={{ display: 'block', padding: '10px 14px', color: 'inherit' }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
        <StatusMark level={row.status} size={9} />
        <span className="dpm-mono" style={{ fontSize: 11, color: 'var(--dpm-sub)' }}>
          {row.code}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
            flex: 1,
          }}
        >
          {row.name}
        </span>
        <span style={{ fontSize: 11, color: 'var(--dpm-mute)', whiteSpace: 'nowrap' }}>
          งวด {row.phase}
        </span>
        <span style={{ fontSize: 15, fontWeight: 600, color: marginColor, whiteSpace: 'nowrap' }}>
          {percent(m)}
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 132px',
          gap: 14,
          alignItems: 'start',
          marginTop: 7,
        }}
      >
        <RowDualBar progress={row.progress} used={row.used} />
        <div>
          <DelaySplitBar usDelay={row.usDelay} clDelay={row.clDelay} />
          <div style={{ marginTop: 4, fontSize: 10, color: 'var(--dpm-mute)', textAlign: 'center' }}>
            ช้า · เรา / ลูกค้า
          </div>
        </div>
      </div>
    </Link>
  )
}

/** window ย่อยของหนึ่ง Squad — เรียงกันตามแนวนอน เห็นทุก Squad พร้อมกัน */
function SquadWindow({
  squad,
  rows,
  marginMode,
}: {
  squad: string
  rows: ProjectRow[]
  marginMode: MarginMode
}) {
  const meta = SQUAD_META[squad]
  const worst = rows.reduce<RiskLevel>(
    (acc, r) => (RISK_ORDER[r.status] < RISK_ORDER[acc] ? r.status : acc),
    'ok',
  )
  const criticalCount = rows.filter((r) => r.status === 'critical').length
  const warnCount = rows.filter((r) => r.status === 'warn').length
  const summary =
    criticalCount > 0
      ? `วิกฤต ${criticalCount}`
      : warnCount > 0
        ? `เตือน ${warnCount}`
        : 'ปกติทั้งหมด'

  return (
    <div className="dpm-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          padding: '10px 14px',
          borderBottom: '1px solid var(--dpm-border)',
          background: 'var(--dpm-subtle)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600 }}>Squad {squad}</span>
        <span style={{ fontSize: 11, color: 'var(--dpm-sub)' }}>
          {meta ? `${meta.lead} · ${meta.dept}` : ''}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>{rows.length} โครงการ</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            fontWeight: 600,
            color: STATUS[worst].color,
          }}
        >
          <StatusMark level={worst} size={8} />
          {summary}
        </span>
      </div>
      <div>
        {rows.map((row) => (
          <SquadWindowRow key={row.code} row={row} marginMode={marginMode} />
        ))}
      </div>
    </div>
  )
}

function MarginToggle({
  marginMode,
  onChange,
}: {
  marginMode: MarginMode
  onChange: (mode: MarginMode) => void
}) {
  const optionStyle = (active: boolean): CSSProperties => ({
    fontSize: 10,
    fontFamily: 'inherit',
    padding: '2px 6px',
    border: 'none',
    cursor: 'pointer',
    color: active ? 'var(--dpm-bg)' : 'var(--dpm-sub)',
    background: active ? 'var(--dpm-ink)' : 'transparent',
  })
  return (
    <div
      style={{
        display: 'inline-flex',
        border: '1px solid var(--dpm-border)',
        borderRadius: 'var(--dpm-radius-control)',
        overflow: 'hidden',
        background: 'var(--dpm-bg)',
      }}
    >
      <button type="button" style={optionStyle(marginMode === 'now')} onClick={() => onChange('now')}>
        ปัจจุบัน
      </button>
      <button
        type="button"
        style={optionStyle(marginMode === 'forecast')}
        onClick={() => onChange('forecast')}
      >
        ตอนจบ
      </button>
    </div>
  )
}

/** legend ท้ายตาราง */
function LegendSwatch({ color, wide }: { color: string; wide?: boolean }) {
  return (
    <span
      style={{
        width: wide ? 14 : 1,
        height: wide ? 6 : 12,
        background: color,
        borderRadius: wide ? 'var(--dpm-radius-bar)' : 0,
        display: 'inline-block',
      }}
    />
  )
}

/* ─────────────────────────────── หน้า ─────────────────────────────── */

export function PortfolioPage() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [marginMode, setMarginMode] = useState<MarginMode>('forecast')

  /* ตัวเลขสดจากตารางจัดสรรบนเซิร์ฟเวอร์ — ใช้ไป% ของโครงการที่มีข้อมูลจริงจะทับค่า mock */
  const [live, setLive] = useState<LiveMetrics | null>(null)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await tryApi<LiveMetrics>('/api/metrics')
      if (!cancelled && res) setLive(res)
    })()
    return () => {
      cancelled = true
    }
  }, [])
  const liveUsed = new Map((live?.projectUsage ?? []).map((u) => [u.code, u.usedPct]))

  const rows = PROJECTS.filter((p) => filter === 'all' || p.dept === filter).map((p) =>
    liveUsed.has(p.code) ? { ...p, used: liveUsed.get(p.code) as number } : p,
  )

  /* จัดกลุ่มตาม Squad — window เรียงตามความเสี่ยงหนักสุดก่อน (Exception first) */
  const squads = [...new Set(rows.map((r) => r.squad))]
  const grouped = squads
    .map((squad) => {
      const squadRows = rows
        .filter((r) => r.squad === squad)
        .sort((a, b) => RISK_ORDER[a.status] - RISK_ORDER[b.status])
      const worst = squadRows.reduce<RiskLevel>(
        (acc, r) => (RISK_ORDER[r.status] < RISK_ORDER[acc] ? r.status : acc),
        'ok',
      )
      return { squad, squadRows, worst }
    })
    .sort(
      (a, b) => RISK_ORDER[a.worst] - RISK_ORDER[b.worst] || a.squad.localeCompare(b.squad),
    )

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
            Portfolio Control Room
          </h1>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--dpm-sub)' }}>
            วันจันทร์ที่ 3 สิงหาคม 2569 · ข้อมูล ณ 08:00 น. · 24 โครงการที่ดำเนินอยู่
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>
          รอบสัปดาห์ W31 · ปิดรอบคน-สัปดาห์ ศุกร์ 17:00
        </div>
      </div>

      <KpiStrip live={live} />

      {/* ── สถานะโครงการแยกตาม Squad — window ย่อยเรียงแนวนอน (ขึ้นก่อนกล่องตัดสินใจ) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {FILTERS.map((f) => {
            const selected = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                style={{
                  fontSize: 13,
                  fontFamily: 'inherit',
                  padding: '6px 12px',
                  borderRadius: 'var(--dpm-radius-control)',
                  border: 'none',
                  cursor: 'pointer',
                  color: selected ? 'var(--dpm-ink)' : 'var(--dpm-sub)',
                  background: selected ? 'var(--dpm-subtle)' : 'transparent',
                  fontWeight: selected ? 600 : 400,
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>Margin</span>
          <MarginToggle marginMode={marginMode} onChange={setMarginMode} />
          <Button variant="secondary">ส่งออก CSV</Button>
        </div>
      </div>

      {grouped.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(430px, 1fr))',
            gap: 16,
            alignItems: 'start',
          }}
        >
          {grouped.map(({ squad, squadRows }) => (
            <SquadWindow key={squad} squad={squad} rows={squadRows} marginMode={marginMode} />
          ))}
        </div>
      ) : (
        <div className="dpm-card" style={{ padding: '24px 20px', fontSize: 13, color: 'var(--dpm-mute)' }}>
          ไม่มีโครงการในสายงานนี้ ·{' '}
          <button
            type="button"
            onClick={() => setFilter('all')}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              fontFamily: 'inherit',
              fontSize: 13,
              color: 'var(--dpm-accent)',
              cursor: 'pointer',
            }}
          >
            ดูทั้งหมด
          </button>
        </div>
      )}

      {/* legend ใต้ windows */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 4px 0',
          fontSize: 12,
          color: 'var(--dpm-mute)',
        }}
      >
        <span>
          แสดง {rows.length} จาก {TOTAL_PROJECTS} โครงการ · {grouped.length} Squad ·
          เรียง window ตาม Squad ที่เสี่ยงสุดก่อน
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <LegendSwatch color="var(--dpm-ink)" wide />
            ความคืบหน้างาน
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <LegendSwatch color="var(--dpm-mute)" wide />
            คน-สัปดาห์ที่ใช้
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <LegendSwatch color="var(--dpm-ink)" />
            เส้นอ้างอิง = ความคืบหน้า
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <LegendSwatch color="var(--dpm-blue)" wide />
            ความล่าช้าฝั่งลูกค้า
          </span>
        </span>
      </div>

      {/* กล่องต้องตัดสินใจ — ย้ายลงมาใต้สถานะโครงการตาม feedback */}
      <div style={{ marginTop: 24 }}>
        <DecisionBox />
      </div>
    </div>
  )
}
