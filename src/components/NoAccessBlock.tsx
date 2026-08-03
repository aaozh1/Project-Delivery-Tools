import { LockIcon } from './LockIcon'
import { Button } from './Button'

interface NoAccessBlockProps {
  title?: string
  /** เหตุผล — ต้องอธิบายว่าใครเห็นได้ และย้ำว่าไม่ใช่ข้อผิดพลาด */
  reason: string
  /** ตำแหน่ง (ไม่ใช่ชื่อระบบ) ของคนที่ติดต่อได้ เช่น "ติดต่อ คุณณัฐพงศ์ (HoPD)" */
  contact: string
  cta?: string
  onRequest?: () => void
}

/**
 * สถานะ "ไม่มีสิทธิ์เข้าถึง" ระดับบล็อก — ต้องไม่ดูเหมือน error
 * กติกา: พื้นเทากลาง ตัวอักษรสีปกติ ไม่ใช้แดง · ห้ามใช้คำว่า "ผิดพลาด" "ไม่ได้รับอนุญาต" "Forbidden"
 */
export function NoAccessBlock({
  title = 'ข้อมูลนี้จำกัดสิทธิ์',
  reason,
  contact,
  cta = 'ขอสิทธิ์เข้าถึง',
  onRequest,
}: NoAccessBlockProps) {
  return (
    <div
      style={{
        border: '1px solid var(--dpm-border)',
        borderRadius: 'var(--dpm-radius-card)',
        background: 'var(--dpm-subtle)',
        padding: 16,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <span style={{ paddingTop: 2 }}>
        <LockIcon size={18} color="var(--dpm-sub)" />
      </span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        <div style={{ marginTop: 5, fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.6 }}>{reason}</div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button variant="primary" style={{ height: 32, fontSize: 12 }} onClick={onRequest}>
            {cta}
          </Button>
          <span style={{ fontSize: 11, color: 'var(--dpm-sub)' }}>{contact}</span>
        </div>
      </div>
    </div>
  )
}
