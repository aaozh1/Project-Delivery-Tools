import { STATUS, loadLevel } from '../lib/status'

interface SquadBalanceBarProps {
  name: string
  pct: number
}

/**
 * แถบสมดุล Squad — สเกล 0–120% ขีดดำ = ระดับ 100%
 * แถบยาวเกินเส้นคือรับงานเกินกำลัง · เทียบข้าม Squad ได้ด้วยตำแหน่งแถบ ไม่ใช่แค่สี
 */
export function SquadBalanceBar({ name, pct }: SquadBalanceBarProps) {
  const level = loadLevel(pct)
  const meta = STATUS[level]
  const barW = Math.min(100, (pct / 120) * 100)
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
        <span style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, color: meta.color }}>
          <span style={{ fontSize: 9 }}>{meta.mark}</span>
          <b style={{ fontWeight: 600 }}>{pct}%</b>
          <span style={{ color: 'var(--dpm-mute)', fontWeight: 400 }}>{meta.label}</span>
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
            top: -4,
            bottom: -4,
            width: 1,
            background: 'var(--dpm-ink)',
          }}
        />
      </div>
    </div>
  )
}
