import { NavLink, Outlet } from 'react-router-dom'
import { useRole } from '../auth/RoleContext'
import { ROLE_LABELS, ROLE_PERSONA, canAccess } from '../auth/roles'
import type { Role } from '../auth/roles'

const NAV_ITEMS = [
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/department', label: 'แผนก' },
  { to: '/project', label: 'โครงการ' },
  { to: '/plan', label: 'วางแผน' },
  { to: '/workload', label: 'คน' },
  { to: '/finance', label: 'การเงิน' },
  { to: '/bd', label: 'ลูกค้าของฉัน' },
  { to: '/weekly-log', label: 'บันทึก' },
]

const ROLE_ORDER: Role[] = ['hopd', 'hod', 'senior', 'designer', 'bd', 'admin']

/** อักษรย่อ avatar จากชื่อบุคคลสมมติของบทบาท */
const AVATAR: Record<Role, string> = {
  hopd: 'ณ',
  hod: 'ก',
  senior: 'อ',
  designer: 'ซ',
  bd: 'บ',
  admin: 'แ',
}

/**
 * แถบนำทาง sticky สูง 56px: โลโก้ DPM · เมนูหลัก (กรองตามสิทธิ์ §5) ·
 * ช่องค้นหา ⌘K · ตัวสลับบทบาท (ชั่วคราวจนกว่าจะมี auth จริง) · โปรไฟล์ผู้ใช้
 */
export function AppShell() {
  const { role, setRole } = useRole()
  const visibleNav = NAV_ITEMS.filter((item) => canAccess(role, item.to))

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
            gap: 20,
          }}
        >
          <NavLink
            to="/"
            style={{ display: 'flex', alignItems: 'baseline', gap: 8, color: 'var(--dpm-ink)' }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.14em' }}>DPM</span>
          </NavLink>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {visibleNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  fontSize: 13,
                  padding: '7px 11px',
                  borderRadius: 'var(--dpm-radius-control)',
                  color: isActive ? 'var(--dpm-ink)' : 'var(--dpm-sub)',
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? 'var(--dpm-subtle)' : 'transparent',
                  whiteSpace: 'nowrap',
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
              width: 200,
              height: 32,
              padding: '0 10px',
              border: '1px solid var(--dpm-border)',
              borderRadius: 'var(--dpm-radius-control)',
              background: 'var(--dpm-surface)',
              color: 'var(--dpm-mute)',
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            <span>ค้นหา…</span>
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

          {/* ตัวสลับบทบาท — เครื่องมือทดลองมุมมองจนกว่าจะมี auth จริง */}
          <label
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
            title="สลับบทบาทเพื่อทดลองมุมมอง — เมื่อมีระบบล็อกอินจริง ส่วนนี้จะหายไป"
          >
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              aria-label="บทบาทที่ใช้ทดลองมุมมอง"
              style={{
                height: 32,
                padding: '0 8px',
                fontFamily: 'inherit',
                fontSize: 12,
                color: 'var(--dpm-sub)',
                background: 'var(--dpm-surface)',
                border: '1px solid var(--dpm-border)',
                borderRadius: 'var(--dpm-radius-control)',
                cursor: 'pointer',
              }}
            >
              {ROLE_ORDER.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <span
              aria-label={`ผู้ใช้ปัจจุบัน: ${ROLE_PERSONA[role]}`}
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
                flexShrink: 0,
              }}
            >
              {AVATAR[role]}
            </span>
          </label>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  )
}
