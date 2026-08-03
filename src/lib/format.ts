/**
 * การแสดงจำนวนเงินและตัวเลขตามสเปก:
 * - จำนวนเต็มในตารางที่ต้องบวกเลขด้วยตา: ฿1,800,000
 * - ค่าใช้จ่าย: −฿842,000 ใช้ − (minus sign) นำหน้า ไม่ใช้วงเล็บ
 * - ตัวเลขระดับผู้บริหาร: ฿48.2M (ทศนิยม 1 ตำแหน่ง) · พื้นที่จำกัด: ฿842K
 * - คน-สัปดาห์: ทศนิยม 2 ตำแหน่งเสมอ (ยกเว้นตัวเลขรวมระดับสรุป)
 */

const MINUS = '−' // − ขีดยาว ไม่ใช่ hyphen

export function baht(value: number): string {
  const sign = value < 0 ? MINUS : ''
  return `${sign}฿${Math.abs(value).toLocaleString('en-US')}`
}

export function bahtAbbrev(value: number): string {
  const sign = value < 0 ? MINUS : ''
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${sign}฿${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}฿${Math.round(abs / 1_000)}K`
  return `${sign}฿${abs.toLocaleString('en-US')}`
}

export function percent(value: number): string {
  const sign = value < 0 ? MINUS : ''
  return `${sign}${Math.abs(Math.round(value))}%`
}

/** คน-สัปดาห์: ทศนิยม 2 ตำแหน่งเสมอ เช่น 0.50 · 1.25 */
export function personWeeks(value: number): string {
  return value.toFixed(2)
}

/** ปัดค่าคน-สัปดาห์ให้เป็นทวีคูณของ 0.25 กันเลขทศนิยมเพี้ยน */
export function snapQuarter(value: number): number {
  return Math.max(0, Math.round(value * 4) / 4)
}
