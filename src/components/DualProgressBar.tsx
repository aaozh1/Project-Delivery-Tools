import { STATUS, type RiskLevel } from '../lib/status'

interface DualProgressBarProps {
  /** % ความคืบหน้างาน (จากน้ำหนัก Deliverable ที่เสร็จ) */
  progress: number
  /** % คน-สัปดาห์ที่ใช้ไป เทียบงบ */
  used: number
}

/**
 * แถบซ้อนสองชั้น "ใช้ไป เทียบ คืบหน้า"
 * ชั้นบน = ความคืบหน้างาน (ดำ) · ชั้นล่าง = คน-สัปดาห์ที่ใช้ (สีตามระดับ)
 * ขีดตั้งบนชั้นล่างคือตำแหน่งของความคืบหน้า — แถบล่างเลยขีดเท่าไรคือใช้แรงงานเร็วกว่างานเท่านั้น
 */
export function DualProgressBar({ progress, used }: DualProgressBarProps) {
  // เกณฑ์ของแถบนี้ตามสเปก S1: ใช้ไป >110% = แดง · ส่วนต่าง >12 จุด = เตือน
  const gap = used - progress
  const level: RiskLevel = used > 110 ? 'critical' : gap > 12 ? 'warn' : 'ok'
  const meta = STATUS[level]
  const usedColor = level === 'ok' ? 'var(--dpm-sub)' : meta.color
  const note =
    gap > 0 ? `ใช้แรงงานเร็วกว่างาน ${Math.round(gap)} จุด` : `งานเดินเร็วกว่าแรงงาน ${Math.round(-gap)} จุด`
  const noteColor = level === 'ok' ? 'var(--dpm-mute)' : meta.color

  const track: React.CSSProperties = {
    position: 'relative',
    flex: 1,
    height: 7,
    background: 'var(--dpm-subtle)',
    borderRadius: 'var(--dpm-radius-bar)',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={track}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${Math.min(100, progress)}%`,
              background: 'var(--dpm-ink)',
              borderRadius: 'var(--dpm-radius-bar)',
              transition: 'width 260ms ease',
            }}
          />
        </div>
        <span style={{ fontSize: 11, color: 'var(--dpm-sub)', width: 36, textAlign: 'right' }}>
          {progress}%
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
        <div style={track}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${Math.min(100, used)}%`,
              background: usedColor,
              borderRadius: 'var(--dpm-radius-bar)',
              transition: 'width 260ms ease',
            }}
          />
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
        <span style={{ fontSize: 11, width: 36, textAlign: 'right', color: usedColor, fontWeight: 600 }}>
          {used}%
        </span>
      </div>
      <div style={{ marginTop: 5, fontSize: 11, color: noteColor }}>{note}</div>
    </div>
  )
}
