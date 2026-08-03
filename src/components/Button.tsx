import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
  children: ReactNode
}

/**
 * ปุ่มมาตรฐาน — หลัก 38px · รอง 34px
 * ปุ่มที่ปิดใช้งานต้องมีคำอธิบายข้างปุ่มเสมอว่าทำไมกดไม่ได้ (ผู้เรียกรับผิดชอบ)
 * ขณะโหลดปุ่มคงความกว้างเดิม ไม่กระโดด — ผู้เรียกควรคงข้อความยาวใกล้เดิม
 */
export function Button({ variant = 'primary', loading = false, children, ...rest }: ButtonProps) {
  return (
    <button
      className={`dpm-btn dpm-btn--${variant}${loading ? ' is-loading' : ''}`}
      aria-busy={loading || undefined}
      {...rest}
    >
      {children}
    </button>
  )
}
