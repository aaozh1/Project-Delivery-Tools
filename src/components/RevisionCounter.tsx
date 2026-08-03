interface RevisionCounterProps {
  /** จำนวนรอบแก้ที่ใช้ไป */
  used: number
  /** โควตารอบแก้ของงวดนี้ */
  quota: number
  /** หมายเหตุเพิ่มเติม เช่น ต้นทุนของรอบที่เกิน */
  note?: string
}

/**
 * ตัวนับรอบแก้แบบ — pip ละหนึ่งรอบ
 * ในโควตา = ดำ · ครบโควตา = เหลือง · เกินโควตา = แดง (ต้องให้ HoD ตัดสินเก็บเงิน/แถม)
 */
export function RevisionCounter({ used, quota, note }: RevisionCounterProps) {
  const over = used > quota
  const atQuota = used === quota && quota > 0
  const color = over ? 'var(--dpm-red)' : atQuota ? 'var(--dpm-yellow)' : used > 0 ? 'var(--dpm-ink)' : 'var(--dpm-mute)'
  const pipCount = Math.max(used, quota)
  const text =
    used === 0 ? 'ยังไม่มีรอบแก้แบบ' : `รอบที่ ${used} / โควตา ${quota}`
  const defaultNote =
    used === 0
      ? `โควตา ${quota} รอบในงวดนี้`
      : over
        ? `เกินโควตา ${used - quota} รอบ — ต้องให้หัวหน้าแผนกตัดสินว่าเก็บเงินเพิ่มหรือแถม`
        : atQuota
          ? 'ครบโควตาแล้ว รอบต่อไปต้องขออนุมัติ'
          : `เหลือ ${quota - used} รอบในงวดนี้`

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: pipCount }, (_, k) => {
            const filled = k < used
            const pipColor = over ? 'var(--dpm-red)' : atQuota ? 'var(--dpm-yellow)' : 'var(--dpm-ink)'
            return (
              <span
                key={k}
                style={{
                  width: 22,
                  height: 8,
                  borderRadius: 'var(--dpm-radius-bar)',
                  background: filled ? pipColor : 'var(--dpm-surface)',
                  border: `1px ${filled ? 'solid' : 'dashed'} ${filled ? pipColor : 'var(--dpm-border)'}`,
                  display: 'block',
                }}
              />
            )
          })}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{text}</span>
      </div>
      <div
        style={{
          marginTop: 5,
          fontSize: 11,
          color: over ? 'var(--dpm-red)' : atQuota ? 'var(--dpm-yellow)' : 'var(--dpm-mute)',
          lineHeight: 1.45,
        }}
      >
        {note ?? defaultNote}
      </div>
    </div>
  )
}
