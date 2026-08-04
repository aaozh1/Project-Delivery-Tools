import { Button } from '../../components'
import { TextButton } from './TextButton'

interface SaveBarProps {
  dirtyCount: number
  onRevert: () => void
  onSave: () => void
}

/**
 * แถบบันทึก sticky ล่างจอ
 * บันทึกแล้ว: พื้นหลัก เส้นกรอบปกติ ปุ่มเทาปิดใช้งาน (เหตุผลอยู่ในบรรทัดรอง)
 * ยังไม่บันทึก: พื้นเหลืองจาง เส้น+แถบซ้าย 4px เหลือง ตัวอักษรรอง amber + ลิงก์ย้อนกลับ
 */
export function SaveBar({ dirtyCount, onRevert, onSave }: SaveBarProps) {
  const dirty = dirtyCount > 0
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 20,
        borderTop: `1px solid ${dirty ? 'var(--dpm-yellow)' : 'var(--dpm-border)'}`,
        background: dirty ? 'var(--dpm-tint-yellow)' : 'var(--dpm-bg)',
        transition: 'background 150ms ease, border-color 400ms ease',
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          padding: '12px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <span
          style={{
            width: 4,
            height: 32,
            borderRadius: 'var(--dpm-radius-bar)',
            background: dirty ? 'var(--dpm-yellow)' : 'var(--dpm-border)',
            display: 'block',
            flexShrink: 0,
          }}
        />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dpm-ink)' }}>
            {dirty ? `แก้แล้วยังไม่บันทึก · ${dirtyCount} ค่า` : 'บันทึกล่าสุดเรียบร้อย'}
          </div>
          <div
            style={{
              fontSize: 11,
              color: dirty ? 'var(--dpm-amber-text)' : 'var(--dpm-mute)',
              marginTop: 2,
            }}
          >
            {dirty
              ? 'ค่าใหม่ยังไม่มีผล — ระบบยังใช้ค่าเดิมอยู่จนกดบันทึก'
              : 'ค่าที่แสดงคือค่าที่ระบบใช้อยู่จริง'}
          </div>
        </div>
        <span style={{ flex: 1 }} />
        {dirty && (
          <TextButton
            color="var(--dpm-amber-text)"
            style={{ fontSize: 12, padding: '8px 14px' }}
            onClick={onRevert}
          >
            ย้อนกลับค่าเดิม
          </TextButton>
        )}
        <Button variant="primary" disabled={!dirty} onClick={onSave}>
          บันทึก
        </Button>
      </div>
    </div>
  )
}
