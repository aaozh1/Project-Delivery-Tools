import { useEffect, useState } from 'react'
import { RATE_ROWS } from './adminData'
import { TextButton } from './TextButton'
import { tryApi } from '../../api/client'
import { baht } from '../../lib/format'

interface RateRowState {
  position: string
  headcount: number
  updated: string
  /** ตัวเลขจริง — มีค่าเมื่อเปิดดูแล้วเท่านั้น (server ส่งให้ทีละแถวผ่าน /reveal) */
  real: string | null
}

interface RatesResponse {
  rates: Array<{ position: string; headcount: number; updated: string }>
}

interface RevealResponse {
  position: string
  costRatePerWeek: number
  revealsToday: number
}

/**
 * หน้า "อัตราค่าแรง" — จำกัดสิทธิ์ HoPD
 * โหมด server: รายการมาโดยไม่มีตัวเลข การเปิดดูขอทีละแถวผ่าน API ซึ่งเขียน Audit Log
 * ฝั่งเซิร์ฟเวอร์จริง · โหมด offline: fallback ค่า mock ฝั่ง client
 * state อยู่ในคอมโพเนนต์ — ออกจากหน้า (unmount) แล้วทุกแถวปิดอัตโนมัติตามสเปก
 */
export function RatesView() {
  const [rows, setRows] = useState<RateRowState[]>(() =>
    RATE_ROWS.map((r) => ({ position: r.role, headcount: r.headcount, updated: r.updated, real: null })),
  )
  const [source, setSource] = useState<'server' | 'mock'>('mock')
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [revealCount, setRevealCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await tryApi<RatesResponse>('/api/rates')
      if (cancelled || !res) return
      setRows(res.rates.map((r) => ({ ...r, real: null })))
      setSource('server')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const toggle = async (row: RateRowState) => {
    const open = revealed[row.position] === true
    if (open) {
      setRevealed((r) => ({ ...r, [row.position]: false }))
      return
    }
    if (source === 'server') {
      const res = await tryApi<RevealResponse>('/api/rates/reveal', {
        method: 'POST',
        body: JSON.stringify({ position: row.position }),
      })
      if (res) {
        setRows((rs) =>
          rs.map((r) => (r.position === row.position ? { ...r, real: baht(res.costRatePerWeek) } : r)),
        )
        setRevealCount(res.revealsToday)
        setRevealed((r) => ({ ...r, [row.position]: true }))
        return
      }
    }
    // offline fallback — ตัวเลข mock ฝั่ง client (ไม่มี audit จริง)
    const mock = RATE_ROWS.find((r) => r.role === row.position)
    setRows((rs) =>
      rs.map((r) => (r.position === row.position ? { ...r, real: mock?.real ?? '—' } : r)),
    )
    setRevealCount((c) => c + 1)
    setRevealed((r) => ({ ...r, [row.position]: true }))
  }

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
            {source === 'server'
              ? `วันนี้คุณเปิดดูไปแล้ว ${revealCount} ครั้ง (นับโดยเซิร์ฟเวอร์ · ดูรายการได้ในเมนู Audit Log)`
              : `รอบนี้คุณเปิดดูไปแล้ว ${revealCount} ครั้ง (โหมดไม่มีเซิร์ฟเวอร์ — audit จริงจะเริ่มเมื่อรัน npm run server)`}
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
        {rows.map((row) => {
          const open = revealed[row.position] === true
          return (
            <div
              key={row.position}
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
              <span style={{ fontSize: 14, fontWeight: 500 }}>{row.position}</span>
              <span style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>{row.headcount} คน</span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: open ? 'var(--dpm-ink)' : 'var(--dpm-mute)',
                  letterSpacing: open ? undefined : '0.08em',
                }}
              >
                {open && row.real !== null ? row.real : '••••••'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>{row.updated}</span>
              <button
                type="button"
                className="dpm-btn dpm-btn--secondary"
                style={{ height: 28, fontSize: 11, padding: '0 12px', justifySelf: 'end' }}
                onClick={() => void toggle(row)}
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
