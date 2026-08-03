import { NavLink, Outlet } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/department', label: 'แผนก' },
  { to: '/plan', label: 'โครงการ' },
  { to: '/workload', label: 'คน' },
  { to: '/finance', label: 'การเงิน' },
]

/**
 * แถบนำทาง sticky สูง 56px: โลโก้ DPM · เมนูหลัก · ช่องค้นหา ⌘K · โปรไฟล์ผู้ใช้
 * (command palette เป็นช่องแสดงผลก่อน — กลไกค้นหาจริงมาพร้อม data layer)
 */
export function AppShell() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          height: 'var(--dpm-h-topnav)',
          background: 'var(--dpm-bg)',
          borderBottom: '1px solid var(--dpm-border)',
        }}
      >
        <div
          style={{
            maxWidth: 'var(--dpm-page-max-w)',
            margin: '0 auto',
            height: '100%',
            padding: '0 var(--dpm-page-pad-x)',
            display: 'flex',
            alignItems: 'center',
            gap: 28,
          }}
        >
          <NavLink
            to="/"
            style={{ display: 'flex', alignItems: 'baseline', gap: 8, color: 'var(--dpm-ink)' }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.14em' }}>DPM</span>
          </NavLink>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  fontSize: 13,
                  padding: '7px 12px',
                  borderRadius: 'var(--dpm-radius-control)',
                  color: isActive ? 'var(--dpm-ink)' : 'var(--dpm-sub)',
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? 'var(--dpm-subtle)' : 'transparent',
                })}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <span style={{ flex: 1 }} />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: 280,
              height: 32,
              padding: '0 10px',
              border: '1px solid var(--dpm-border)',
              borderRadius: 'var(--dpm-radius-control)',
              background: 'var(--dpm-surface)',
              color: 'var(--dpm-mute)',
              fontSize: 13,
            }}
          >
            <span>ค้นหาโครงการ คน เอกสาร…</span>
            <span
              className="dpm-mono"
              style={{
                fontSize: 11,
                padding: '1px 6px',
                border: '1px solid var(--dpm-border)',
                borderRadius: 'var(--dpm-radius-badge)',
                background: 'var(--dpm-subtle)',
              }}
            >
              ⌘K
            </span>
          </div>

          <NavLink
            to="/design-system"
            style={({ isActive }) => ({
              fontSize: 12,
              color: isActive ? 'var(--dpm-ink)' : 'var(--dpm-sub)',
              fontWeight: isActive ? 600 : 400,
              whiteSpace: 'nowrap',
            })}
          >
            Design System
          </NavLink>

          <span
            aria-label="โปรไฟล์ผู้ใช้"
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--dpm-radius-control)',
              background: 'var(--dpm-accent)',
              color: 'var(--dpm-bg)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            P
          </span>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  )
}
