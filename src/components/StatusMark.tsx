import { STATUS, type RiskLevel } from '../lib/status'

interface StatusMarkProps {
  level: RiskLevel
  /** ขนาดสัญลักษณ์ (px) — สเปกใช้ 9–10px คู่ตัวเลข */
  size?: number
}

/** สัญลักษณ์สถานะ ▲◆●○ — ใช้คู่กับสีเสมอ ห้ามใช้สีเดี่ยว ๆ สื่อสถานะ */
export function StatusMark({ level, size = 9 }: StatusMarkProps) {
  const meta = STATUS[level]
  return (
    <span aria-label={meta.label} style={{ fontSize: size, color: meta.color, lineHeight: 1 }}>
      {meta.mark}
    </span>
  )
}
