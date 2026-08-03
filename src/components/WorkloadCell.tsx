import { STATUS, loadLevel } from '../lib/status'
import { LockIcon } from './LockIcon'

interface WorkloadCellProps {
  /** % โหลดของเดือนนั้น — ไม่ส่ง = ยังไม่มีการจัดสรร */
  pct?: number
  /** จำนวนโครงการที่ไม่ซ้ำกันในเดือนนั้น */
  projectCount?: number
  /** เกณฑ์จำนวนโครงการพร้อมกันของตำแหน่ง (Senior 2 · Mid 3 · Junior 2) */
  projectLimit?: number
  state?: 'data' | 'empty' | 'loading' | 'locked'
  onAllocate?: () => void
}

/**
 * ช่องภาระงาน — สองตัวเลขในช่องเดียว: % โหลด + จำนวนโครงการ
 * จุด = โครงการ (อ่านแบบ pre-attentive) · จุดแดง = เกินเกณฑ์ตำแหน่ง
 * แถบสเกล 0–120% มีขีดอ้างอิง 100% ที่ 83.3%
 * คนที่โหลด 100% ใน 2 โครงการ ต่างจาก 100% ใน 5 โครงการ — จำนวนโครงการจับความล้าที่ % มองไม่เห็น
 */
export function WorkloadCell({
  pct,
  projectCount = 0,
  projectLimit = 3,
  state = 'data',
  onAllocate,
}: WorkloadCellProps) {
  const base: React.CSSProperties = {
    border: '1px solid var(--dpm-border)',
    borderRadius: 'var(--dpm-radius-control)',
    padding: '10px 12px',
    minHeight: 74,
    background: state === 'locked' ? 'var(--dpm-bg)' : 'var(--dpm-surface)',
  }

  if (state === 'loading') {
    return (
      <div style={base}>
        <div className="dpm-skeleton">
          <div className="dpm-skeleton__block" style={{ width: 52, height: 16 }} />
          <div className="dpm-skeleton__block" style={{ marginTop: 7, width: '100%', height: 4, borderRadius: 2 }} />
          <div className="dpm-skeleton__block" style={{ marginTop: 9, width: 64, height: 8 }} />
        </div>
      </div>
    )
  }

  if (state === 'locked') {
    return (
      <div style={{ ...base, display: 'flex', alignItems: 'center', gap: 9 }}>
        <LockIcon />
        <span style={{ fontSize: 11, color: 'var(--dpm-sub)', lineHeight: 1.45 }}>
          เห็นได้เฉพาะแผนกเจ้าของข้อมูล
        </span>
      </div>
    )
  }

  if (state === 'empty' || pct === undefined) {
    return (
      <div style={{ ...base, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--dpm-mute)' }}>ยังไม่มีการจัดสรร</div>
        {onAllocate && (
          <a
            role="button"
            tabIndex={0}
            onClick={onAllocate}
            style={{ marginTop: 4, fontSize: 11, cursor: 'pointer' }}
          >
            จัดสรรกำลังคน
          </a>
        )}
      </div>
    )
  }

  const level = loadLevel(pct)
  const meta = STATUS[level]
  const overLimit = projectCount > projectLimit
  const barW = Math.min(100, (pct / 120) * 100)
  const pips = Array.from({ length: Math.max(projectCount, projectLimit) }, (_, k) => ({
    active: k < projectCount,
    beyond: k >= projectLimit,
  }))

  return (
    <div style={base}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 9, color: meta.color }}>{meta.mark}</span>
        <span style={{ fontSize: 17, fontWeight: 600, color: meta.color, lineHeight: 1.1 }}>{pct}%</span>
      </div>
      <div
        style={{
          marginTop: 5,
          height: 4,
          background: 'var(--dpm-subtle)',
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
            width: `${barW}%`,
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
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
        {pips.map((p, k) => (
          <span
            key={k}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: p.active ? (p.beyond ? 'var(--dpm-red)' : 'var(--dpm-ink)') : 'var(--dpm-surface)',
              border: `1px solid ${p.active ? (p.beyond ? 'var(--dpm-red)' : 'var(--dpm-ink)') : 'var(--dpm-border)'}`,
            }}
          />
        ))}
        <span
          style={{
            fontSize: 11,
            color: overLimit ? 'var(--dpm-red)' : 'var(--dpm-sub)',
            marginLeft: 2,
            whiteSpace: 'nowrap',
          }}
        >
          {overLimit ? 'เกินเกณฑ์' : `${projectCount} โครงการ`}
        </span>
      </div>
    </div>
  )
}
