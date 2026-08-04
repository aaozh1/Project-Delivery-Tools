import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

interface TextButtonProps {
  children: ReactNode
  color?: string
  hoverColor?: string
  style?: CSSProperties
  onClick?: () => void
}

/**
 * ปุ่มข้อความเปล่า (ลิงก์เชิงการกระทำ) — hover เปลี่ยนเฉพาะสีตามสเปก
 * ห้ามใช้เงาหรือการขยับตำแหน่งเป็น hover effect
 */
export function TextButton({
  children,
  color = 'var(--dpm-mute)',
  hoverColor = 'var(--dpm-ink)',
  style,
  onClick,
}: TextButtonProps) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        fontFamily: 'inherit',
        cursor: 'pointer',
        transition: 'color 150ms ease',
        color: hover ? hoverColor : color,
        ...style,
      }}
    >
      {children}
    </button>
  )
}
