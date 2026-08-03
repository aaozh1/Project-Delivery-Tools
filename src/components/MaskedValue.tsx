import { useState } from 'react'

interface MaskedValueProps {
  /** คำอธิบายค่า เช่น "เรตกลาง Senior / คน-สัปดาห์" */
  label: string
  /** ค่าจริง — แสดงเมื่อผู้ใช้กดเปิดดูเท่านั้น */
  value: string
  /** เรียกเมื่อผู้ใช้เปิดดู — ต้องบันทึก Audit Log ทุกครั้ง (ฝั่ง data layer) */
  onReveal?: () => void
}

/**
 * Masked Value Field — ค่าอ่อนไหว (เรตค่าแรง) ปิดเป็น •••••• เป็นค่าตั้งต้น
 * การเปิดดูถูกบันทึกลง Audit Log พร้อมชื่อ วันเวลา และแถวที่เปิด — แจ้งผู้ใช้ตรง ๆ
 */
export function MaskedValue({ label, value, onReveal }: MaskedValueProps) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div
      style={{
        border: '1px solid var(--dpm-border)',
        borderRadius: 'var(--dpm-radius-card)',
        background: revealed ? 'var(--dpm-bg)' : 'var(--dpm-surface)',
        padding: '14px 16px',
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>{label}</div>
      <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            fontSize: 19,
            fontWeight: 600,
            color: revealed ? 'var(--dpm-ink)' : 'var(--dpm-mute)',
            letterSpacing: revealed ? undefined : '0.08em',
          }}
        >
          {revealed ? value : '••••••'}
        </span>
        <button
          type="button"
          className="dpm-btn dpm-btn--secondary"
          style={{ height: 26, fontSize: 11, padding: '0 10px' }}
          onClick={() => {
            if (!revealed) onReveal?.()
            setRevealed((r) => !r)
          }}
        >
          {revealed ? 'ปิด' : 'เปิดดู'}
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--dpm-sub)', lineHeight: 1.5 }}>
        การเปิดดูจะถูกบันทึกลง Audit Log
      </div>
    </div>
  )
}
