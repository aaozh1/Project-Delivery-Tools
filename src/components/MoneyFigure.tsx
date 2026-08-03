import { baht, bahtAbbrev } from '../lib/format'

interface MoneyFigureProps {
  value: number | null | undefined
  /** ย่อ M/K เฉพาะพื้นที่จำกัดหรือตัวเลขระดับผู้บริหาร */
  abbrev?: boolean
  size?: number
  weight?: number
  /**
   * ใส่สีแดงเฉพาะค่าที่ "เป็นปัญหาจริง" เช่น Margin ขาดทุน —
   * ค่าใช้จ่ายปกติที่ติดลบไม่ใช้สีแดง (แสดง − นำหน้าเฉย ๆ)
   */
  problem?: boolean
}

/** จำนวนเงิน: ฿1,800,000 · −฿842,000 · ฿48.2M · ยังไม่มีข้อมูลแสดง ฿0 สีจาง */
export function MoneyFigure({ value, abbrev = false, size = 16, weight = 600, problem = false }: MoneyFigureProps) {
  const empty = value === null || value === undefined
  const n = empty ? 0 : value
  const text = abbrev ? bahtAbbrev(n) : baht(n)
  const color = empty ? 'var(--dpm-mute)' : problem ? 'var(--dpm-red)' : 'var(--dpm-ink)'
  return <span style={{ fontSize: size, fontWeight: weight, color }}>{text}</span>
}
