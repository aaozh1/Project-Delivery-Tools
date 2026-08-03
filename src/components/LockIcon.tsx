interface LockIconProps {
  /** ความกว้างตัวล็อก (px) — 14 ระดับช่อง/ปุ่ม · 18 ระดับบล็อก */
  size?: 14 | 18
  color?: string
}

/**
 * ไอคอนล็อกสร้างจาก 2 div ตามสเปก (ไม่มีไฟล์ไอคอน)
 * ครึ่งวงบน = border ไม่มีขอบล่าง · ตัวล็อก = สี่เหลี่ยม radius 2px
 */
export function LockIcon({ size = 14, color = 'var(--dpm-mute)' }: LockIconProps) {
  const shackleW = size === 18 ? 11 : 8
  const shackleH = size === 18 ? 6 : 5
  const bodyH = size === 18 ? 12 : 9
  return (
    <span aria-hidden style={{ width: size, flexShrink: 0, display: 'block' }}>
      <span
        style={{
          display: 'block',
          width: shackleW,
          height: shackleH,
          margin: '0 auto',
          border: `1.5px solid ${color}`,
          borderBottom: 'none',
          borderRadius: `${shackleH}px ${shackleH}px 0 0`,
        }}
      />
      <span
        style={{
          display: 'block',
          width: size,
          height: bodyH,
          background: color,
          borderRadius: 'var(--dpm-radius-bar)',
        }}
      />
    </span>
  )
}
