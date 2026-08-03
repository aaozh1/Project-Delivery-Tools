import { Link } from 'react-router-dom'
import type { ScreenMeta } from './screens'

/**
 * หน้ารอการพัฒนา — ตามหลัก Empty state: ข้อความสีจาง + ทางออกทันที ห้ามปล่อยช่องว่างเปล่า
 * หน้าจอจริงจะ implement ทีละหน้าตามลำดับ S1 → S3 → S6 → S7 → S2 → S11 → S13 → S14
 */
export function PlaceholderPage({ screen }: { screen: ScreenMeta }) {
  return (
    <div
      style={{
        maxWidth: 'var(--dpm-page-max-w)',
        margin: '0 auto',
        padding: '40px var(--dpm-page-pad-x)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span className="dpm-mono" style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>
          {screen.id}
        </span>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>{screen.title}</h1>
        <span
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 'var(--dpm-radius-control)',
            border: '1px solid var(--dpm-border)',
            color: 'var(--dpm-sub)',
          }}
        >
          {screen.priority}
        </span>
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--dpm-sub)' }}>
        ผู้ใช้หลัก: {screen.user} · คำถามที่หน้านี้ตอบ: {screen.question}
      </div>

      <div
        className="dpm-card"
        style={{ marginTop: 28, padding: '32px 28px', maxWidth: 640 }}
      >
        <div style={{ fontSize: 14, color: 'var(--dpm-mute)' }}>
          หน้านี้อยู่ในลำดับการพัฒนา ยังไม่เปิดใช้งาน
        </div>
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--dpm-sub)', lineHeight: 1.6 }}>
          {screen.designFile ? (
            <>
              แบบ hi-fi ของหน้านี้อยู่ที่{' '}
              <span className="dpm-mono" style={{ fontSize: 12 }}>
                docs/design-handoff/designs/{screen.designFile}
              </span>{' '}
              — เปิดในเบราว์เซอร์เพื่อดูหน้าตาและพฤติกรรมที่ต้องการ
            </>
          ) : (
            <>หน้านี้เป็นลำดับ P2 ยังไม่อยู่ในชุด design handoff ปัจจุบัน</>
          )}
        </div>
        <div style={{ marginTop: 16 }}>
          <Link to="/design-system" style={{ fontSize: 13 }}>
            ดู Design System ที่ใช้สร้างหน้านี้ →
          </Link>
        </div>
      </div>
    </div>
  )
}
