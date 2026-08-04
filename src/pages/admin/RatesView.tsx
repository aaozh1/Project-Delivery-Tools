import { useState } from 'react'
import { RATE_ROWS } from './adminData'
import { TextButton } from './TextButton'

/**
 * หน้า "อัตราค่าแรง" — จำกัดสิทธิ์ HoPD
 * ค่าเป็น •••••• เป็นค่าตั้งต้น เปิดดูทีละแถว การเปิดดูทุกครั้งถูกบันทึกลง Audit Log
 * state อยู่ในคอมโพเนนต์นี้ — ออกจากหน้า (unmount) แล้วทุกแถวปิดอัตโนมัติตามสเปก
 */
export function RatesView() {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})
  const [revealCount, setRevealCount] = useState(0)

  return (
    <div style={{ flex: 1, padding: '24px 32px 60px', maxWidth: 1120 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>
          อัตราค่าแรง
        </h1>
        <span
          style={{
            fontSize: 10,
            color: 'var(--dpm-sub)',
            border: '1px solid var(--dpm-border)',
            borderRadius: 'var(--dpm-radius-badge)',
            padding: '2px 7px',
            background: 'var(--dpm-surface)',
          }}
        >
          จำกัดสิทธิ์
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--dpm-sub)', marginBottom: 16 }}>
        เรตต้นทุนรวมภาระต่อคน-สัปดาห์ ตามตำแหน่ง — ใช้คำนวณ COL จริงของทุกโครงการ
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '12px 16px',
          background: 'var(--dpm-subtle)',
          borderRadius: 'var(--dpm-radius-card)',
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--dpm-yellow)', paddingTop: 3 }}>▲</span>
        <div style={{ fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.6 }}>
          ค่าในหน้านี้ถูกปิดไว้เป็นค่าตั้งต้น{' '}
          <b style={{ color: 'var(--dpm-ink)' }}>การกดเปิดดูทุกครั้งจะถูกบันทึกลง Audit Log</b>{' '}
          พร้อมชื่อคุณ วันเวลา และแถวที่เปิด
          <div style={{ marginTop: 3, fontSize: 11, color: 'var(--dpm-mute)' }}>
            รอบนี้คุณเปิดดูไปแล้ว {revealCount} ครั้ง
          </div>
        </div>
      </div>

      <div className="dpm-card">
        <div
          className="dpm-table-head"
          style={{
            display: 'grid',
            gridTemplateColumns: '180px 150px repeat(2, minmax(0,1fr)) 120px',
            padding: '9px 16px',
            gap: 10,
          }}
        >
          <span>ตำแหน่ง</span>
          <span>จำนวนคน</span>
          <span>เรตต่อคน-สัปดาห์</span>
          <span>มีผลตั้งแต่</span>
          <span />
        </div>
        {RATE_ROWS.map((row, i) => {
          const open = revealed[i] === true
          return (
            <div
              key={row.role}
              style={{
                display: 'grid',
                gridTemplateColumns: '180px 150px repeat(2, minmax(0,1fr)) 120px',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                borderBottom: '1px solid var(--dpm-border)',
                background: open ? 'var(--dpm-bg)' : 'var(--dpm-surface)',
                transition: 'background 150ms ease',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500 }}>{row.role}</span>
              <span style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>{row.headcount} คน</span>
              <span
                style={{
                  fontSize: open ? 15 : 15,
                  fontWeight: 600,
                  color: open ? 'var(--dpm-ink)' : 'var(--dpm-mute)',
                  letterSpacing: open ? undefined : '0.08em',
                }}
              >
                {open ? row.real : '••••••'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>{row.updated}</span>
              <button
                type="button"
                className="dpm-btn dpm-btn--secondary"
                style={{ height: 28, fontSize: 11, padding: '0 12px', justifySelf: 'end' }}
                onClick={() => {
                  if (!open) setRevealCount((c) => c + 1)
                  setRevealed((r) => ({ ...r, [i]: !open }))
                }}
              >
                {open ? 'ปิด' : 'เปิดดู'}
              </button>
            </div>
          )
        })}
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--dpm-subtle)',
            fontSize: 11,
            color: 'var(--dpm-sub)',
            lineHeight: 1.6,
          }}
        >
          การแก้ไขเรตต้องให้ HoPD และฝ่ายบุคคลอนุมัติร่วมกัน · ระบบปิดทุกแถวเมื่อออกจากหน้านี้อัตโนมัติ
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <TextButton color="var(--dpm-accent)" style={{ fontSize: 12 }}>
          ดู Audit Log ของหน้านี้ →
        </TextButton>
      </div>
    </div>
  )
}
