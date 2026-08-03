import { Link } from 'react-router-dom'
import { SCREENS } from './screens'

/** หน้าแรกชั่วคราว — สารบัญหน้าจอทั้งหมด (เมื่อ S1 พร้อม หน้าแรกจะเป็น Portfolio Control Room) */
export function HomePage() {
  return (
    <div
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '40px var(--dpm-page-pad-x)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>
          DPM — Design Project Manager
        </h1>
      </div>
      <p style={{ marginTop: 6, fontSize: 13, color: 'var(--dpm-sub)', maxWidth: 640, lineHeight: 1.6 }}>
        เครื่องมือควบคุมขอบเขตงาน เวลา และต้นทุนค่าแรงของทุกโครงการ ในหน่วยคน-สัปดาห์
        สำหรับบริษัทออกแบบ 4 สายงาน: สถาปัตยกรรม · ตกแต่งภายใน · บ้านพักอาศัย · กราฟิก
      </p>

      <div
        style={{
          marginTop: 32,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 16,
        }}
      >
        {SCREENS.map((s) => (
          <Link
            key={s.id}
            to={s.path}
            className="dpm-card"
            style={{ padding: '16px 18px', color: 'inherit', display: 'block' }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="dpm-mono" style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
                {s.id}
              </span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{s.title}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>{s.priority}</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.5 }}>
              {s.user}
            </div>
            <div style={{ marginTop: 2, fontSize: 12, color: 'var(--dpm-mute)', lineHeight: 1.5 }}>
              {s.question}
            </div>
          </Link>
        ))}

        <Link
          to="/design-system"
          className="dpm-card dpm-card--critical"
          style={{ padding: '16px 18px', color: 'inherit', display: 'block' }}
        >
          <div style={{ fontSize: 15, fontWeight: 600 }}>Design System</div>
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.5 }}>
            Token ทุกค่าและ Component ทุกสถานะ — แหล่งอ้างอิงเดียวตอนพัฒนา
          </div>
        </Link>
      </div>
    </div>
  )
}
