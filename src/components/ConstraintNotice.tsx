import { LockIcon } from './LockIcon'

interface ConstraintNoticeProps {
  /** สิ่งที่ทำไม่ได้ เช่น "จัดสรรได้เฉพาะสมาชิก Squad A" */
  text: string
  /** ทางออก — ทุกข้อจำกัดต้องมาพร้อมทางออกเสมอ */
  how: string
  /** ป้ายปุ่มทางออก เช่น "ส่งคำขอถึงหัวหน้าแผนก" */
  cta: string
  onAction?: () => void
  /** pending = ส่งคำขอแล้ว รออนุมัติ (พื้นเหลืองจาง) */
  state?: 'normal' | 'pending'
}

/**
 * แถบข้อจำกัดพร้อมทางออก — ต้องอ่านเป็นการอธิบายกติกาอย่างสุภาพ ไม่ใช่การบล็อก
 * ทุกที่ที่บอกว่า "ทำไม่ได้" ต้องบอกด้วยว่า "ต้องทำอย่างไร" และติดต่อใคร
 */
export function ConstraintNotice({ text, how, cta, onAction, state = 'normal' }: ConstraintNoticeProps) {
  const pending = state === 'pending'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '11px 14px',
        border: `1px solid ${pending ? 'var(--dpm-yellow)' : 'var(--dpm-border)'}`,
        borderRadius: 'var(--dpm-radius-card)',
        background: pending ? 'var(--dpm-tint-yellow)' : 'var(--dpm-subtle)',
        transition: 'border-color 400ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
        <LockIcon color={pending ? 'var(--dpm-amber-text)' : 'var(--dpm-sub)'} />
        <div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--dpm-ink)' }}>{text}</div>
          <div style={{ marginTop: 2, fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.5 }}>{how}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="dpm-btn dpm-btn--secondary"
        style={pending ? undefined : { color: 'var(--dpm-accent)' }}
      >
        {cta}
      </button>
    </div>
  )
}
