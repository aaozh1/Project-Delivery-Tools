import { STATUS, type RiskLevel } from '../lib/status'

interface RiskFlagProps {
  level: RiskLevel
  /** ข้อความกำกับ — ค่าตั้งต้นคือชื่อระดับ (วิกฤต/เตือน/ปกติ/โหลดต่ำ) */
  label?: string
}

/** ป้ายความเสี่ยง 4 ระดับ: สี + สัญลักษณ์ + คำ อ่านได้แม้พิมพ์ขาวดำ */
export function RiskFlag({ level, label }: RiskFlagProps) {
  const meta = STATUS[level]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 13,
        fontWeight: 600,
        color: meta.color,
      }}
    >
      <span style={{ fontSize: 10 }}>{meta.mark}</span>
      {label ?? meta.label}
    </span>
  )
}
