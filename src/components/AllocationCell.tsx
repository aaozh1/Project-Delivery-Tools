import { personWeeks, snapQuarter } from '../lib/format'

export type AllocationCellState = 'normal' | 'disabled' | 'error' | 'loading' | 'locked'

interface AllocationCellProps {
  /** ค่า 0–1 ทวีคูณของ 0.25 */
  value: number
  onChange?: (value: number) => void
  /**
   * normal = กดได้ · disabled = ปิดรอบแล้ว · error = แถวรวมเกิน 1.00
   * loading = กำลังดึงข้อมูล · locked = คนนอก Squad (จัดสรรไม่ได้ตามกติกา)
   */
  state?: AllocationCellState
  /** ป้ายอธิบายสำหรับ screen reader เช่น "จัดสรรคุณซีให้ ID-2026-004" */
  label?: string
}

const QUARTERS = [1, 2, 3, 4] as const

/**
 * ช่องจัดสรรคน-สัปดาห์ — กลไกหลักของหน้าจัดสรรกำลังคน
 * 4 ก้อน ก้อนละ 0.25 · คลิกก้อนที่ n = n×0.25 คลิกเดียวจบ · คลิกก้อนเดิมซ้ำ = ล้างเป็น 0
 * ค่าที่ผิดกติกาเป็นไปไม่ได้เพราะไม่มีให้กด
 */
export function AllocationCell({ value, onChange, state = 'normal', label }: AllocationCellProps) {
  const v = snapQuarter(value)
  const interactive = state === 'normal' || state === 'error'

  const wrapStyle: Record<AllocationCellState, React.CSSProperties> = {
    normal: { background: 'var(--dpm-surface)', borderColor: 'var(--dpm-border)' },
    disabled: { background: 'var(--dpm-subtle)', borderColor: 'var(--dpm-border)' },
    error: { background: 'var(--dpm-tint-red)', borderColor: 'var(--dpm-red)' },
    loading: { background: 'var(--dpm-bg)', borderColor: 'var(--dpm-border)' },
    locked: { background: 'var(--dpm-subtle)', borderColor: 'var(--dpm-border)' },
  }

  const valueColor =
    state === 'error'
      ? 'var(--dpm-red)'
      : state === 'disabled' || state === 'loading'
        ? 'var(--dpm-disabled)'
        : state === 'locked'
          ? 'var(--dpm-sub)'
          : v > 0
            ? 'var(--dpm-ink)'
            : 'var(--dpm-mute)'

  return (
    <div
      role="group"
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        height: 38,
        padding: '0 8px',
        borderRadius: 'var(--dpm-radius-control)',
        border: '1px solid',
        transition: 'background 200ms ease, border-color 400ms ease',
        ...wrapStyle[state],
      }}
    >
      <div style={{ display: 'flex', gap: 2 }}>
        {QUARTERS.map((q) => {
          const target = q * 0.25
          const filled = state === 'loading' ? false : v >= target - 0.0001
          let bg = 'var(--dpm-surface)'
          let border = 'var(--dpm-border)'
          let dashed = false
          if (state === 'loading') {
            bg = 'var(--dpm-subtle)'
          } else if (state === 'error') {
            bg = filled ? 'var(--dpm-red)' : 'var(--dpm-surface)'
            border = 'var(--dpm-red)'
          } else if (state === 'disabled' || state === 'locked') {
            bg = filled ? 'var(--dpm-disabled)' : 'var(--dpm-subtle)'
            border = filled ? 'var(--dpm-disabled)' : 'var(--dpm-border)'
          } else if (filled) {
            bg = 'var(--dpm-ink)'
            border = 'var(--dpm-ink)'
          } else if (v === 0) {
            dashed = true
          }
          return (
            <button
              key={q}
              type="button"
              disabled={!interactive}
              aria-label={`${personWeeks(target)} คน-สัปดาห์`}
              aria-pressed={filled}
              onClick={(e) => {
                e.stopPropagation()
                if (!onChange) return
                onChange(Math.abs(v - target) < 0.001 ? 0 : target)
              }}
              style={{
                width: 20,
                height: 24,
                padding: 0,
                borderRadius: 'var(--dpm-radius-bar)',
                background: bg,
                border: `1px ${dashed ? 'dashed' : 'solid'} ${border}`,
                cursor: interactive ? 'pointer' : 'not-allowed',
              }}
            />
          )
        })}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: valueColor, minWidth: 30 }}>
        {state === 'loading' ? '—' : v > 0 ? personWeeks(v) : 'ว่าง'}
      </span>
    </div>
  )
}
