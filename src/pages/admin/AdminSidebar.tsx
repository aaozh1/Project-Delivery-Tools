import { useState } from 'react'
import { ADMIN_MENU } from './adminData'
import type { AdminView } from './adminData'

interface AdminSidebarProps {
  view: AdminView
  onNavigate: (view: AdminView) => void
}

/**
 * เมนูซ้าย 240px พื้นรอง — 11 หมวดตามสเปก
 * หมวด "กฎธุรกิจ" และ "อัตราค่าแรง" คลิกสลับได้ · หมวดอื่นเป็นรายการเฉย ๆ
 */
export function AdminSidebar({ view, onNavigate }: AdminSidebarProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  return (
    <aside
      style={{
        width: 'var(--dpm-sidebar-w)',
        flexShrink: 0,
        background: 'var(--dpm-subtle)',
        borderRight: '1px solid var(--dpm-border)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--dpm-border)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.14em' }}>DPM</span>
          <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>Admin Console</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--dpm-sub)', lineHeight: 1.5 }}>
          เข้าถึงได้เฉพาะ
          <br />
          <b style={{ color: 'var(--dpm-ink)' }}>Head of Project Delivery</b>
        </div>
      </div>

      <nav style={{ padding: '8px 8px 20px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {ADMIN_MENU.map((item) => {
          const active = item.view !== undefined && item.view === view
          const clickable = item.view !== undefined
          const hovered = hoveredKey === item.key
          const rowStyle = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            width: '100%',
            padding: '8px 12px',
            borderRadius: 'var(--dpm-radius-control)',
            border: 'none',
            font: 'inherit',
            textAlign: 'left' as const,
            cursor: clickable ? 'pointer' : 'default',
            transition: 'background 150ms ease',
            background: active
              ? 'var(--dpm-surface)'
              : hovered
                ? 'var(--dpm-hover)'
                : 'transparent',
          }
          const inner = (
            <>
              <span
                style={{
                  fontSize: 13,
                  color: active ? 'var(--dpm-ink)' : 'var(--dpm-sub)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {item.label}
              </span>
              {item.chip && (
                <span
                  style={{
                    fontSize: 9,
                    color: 'var(--dpm-sub)',
                    border: '1px solid var(--dpm-border)',
                    borderRadius: 'var(--dpm-radius-badge)',
                    padding: '1px 5px',
                    background: 'var(--dpm-surface)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.chip}
                </span>
              )}
            </>
          )
          return clickable ? (
            <button
              key={item.key}
              type="button"
              style={rowStyle}
              onMouseEnter={() => setHoveredKey(item.key)}
              onMouseLeave={() => setHoveredKey(null)}
              onClick={() => item.view && onNavigate(item.view)}
            >
              {inner}
            </button>
          ) : (
            <div
              key={item.key}
              style={rowStyle}
              onMouseEnter={() => setHoveredKey(item.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              {inner}
            </div>
          )
        })}
      </nav>

      <div style={{ flex: 1 }} />
      <div
        style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--dpm-border)',
          fontSize: 11,
          color: 'var(--dpm-mute)',
          lineHeight: 1.5,
        }}
      >
        การแก้ไขทุกครั้งบันทึกลง Audit Log พร้อมชื่อผู้แก้
      </div>
    </aside>
  )
}
