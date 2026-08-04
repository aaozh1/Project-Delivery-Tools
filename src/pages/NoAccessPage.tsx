import { NoAccessBlock } from '../components'
import { ROLE_LABELS, SCREEN_ACCESS } from '../auth/roles'
import { useRole } from '../auth/RoleContext'

/**
 * หน้าจำกัดสิทธิ์ระดับ route — ต้องไม่ดูเหมือน error
 * บอกว่าใครเห็นหน้านี้ได้ และติดต่อใคร (ตำแหน่ง ไม่ใช่ "ผู้ดูแลระบบ")
 */
export function NoAccessPage({ path, title }: { path: string; title: string }) {
  const { role } = useRole()
  const allowed = SCREEN_ACCESS[path] ?? []
  const allowedLabels = allowed.map((r) => ROLE_LABELS[r]).join(' · ')

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px var(--dpm-page-pad-x)' }}>
      <div style={{ fontSize: 12, color: 'var(--dpm-mute)', marginBottom: 6 }}>{title}</div>
      <NoAccessBlock
        title="หน้านี้จำกัดสิทธิ์ตามบทบาท"
        reason={`หน้า ${title} เปิดให้: ${allowedLabels} — บทบาทปัจจุบันของคุณคือ ${ROLE_LABELS[role]} ซึ่งไม่อยู่ในขอบเขตนี้ตามกติกาของระบบ ไม่ใช่ข้อผิดพลาด และไม่ต้องแจ้งฝ่ายไอที`}
        contact="ติดต่อ คุณณัฐพงศ์ (Head of Project Delivery) เพื่อขอปรับสิทธิ์"
      />
      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.6 }}>
        ระหว่างพัฒนา: ใช้ตัวสลับบทบาทที่มุมขวาบนเพื่อทดลองมุมมองของบทบาทอื่นได้
      </div>
    </div>
  )
}
