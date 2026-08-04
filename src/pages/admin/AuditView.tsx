import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components'
import { tryApi } from '../../api/client'

interface AuditEntry {
  actor: string
  role: string
  action: string
  target: string
  detail: string | null
  at: string
}

const ACTION_LABEL: Record<string, string> = {
  'auth.login': 'เข้าสู่ระบบ',
  'rules.update': 'แก้กฎธุรกิจ',
  'rate.reveal': 'เปิดดูเรตค่าแรง',
}

/**
 * Audit Log — HoPD เท่านั้น อ่านจากเซิร์ฟเวอร์ (บันทึกโดย API จริง แก้ไขไม่ได้จากหน้าจอ)
 * ไม่มีเซิร์ฟเวอร์ = แสดงคำอธิบายวิธีเปิดใช้ ไม่ใช่ error
 */
export function AuditView() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)
  const [offline, setOffline] = useState(false)

  const load = useCallback(async () => {
    const res = await tryApi<{ entries: AuditEntry[] }>('/api/audit?limit=100')
    if (res) {
      setEntries(res.entries)
      setOffline(false)
    } else {
      setEntries([])
      setOffline(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div style={{ flex: 1, padding: '24px 32px 60px', maxWidth: 1120 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Audit Log
          </h1>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--dpm-sub)' }}>
            บันทึกโดยเซิร์ฟเวอร์ทุกครั้งที่มีการกระทำอ่อนไหว — อ่านได้อย่างเดียว แก้ไขไม่ได้
          </div>
        </div>
        <Button variant="secondary" onClick={() => void load()}>
          โหลดใหม่
        </Button>
      </div>

      {offline && (
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--dpm-subtle)',
            borderRadius: 'var(--dpm-radius-card)',
            fontSize: 13,
            color: 'var(--dpm-sub)',
            lineHeight: 1.6,
          }}
        >
          ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์ — Audit Log เก็บอยู่ฝั่ง API เท่านั้น
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--dpm-mute)' }}>
            วิธีเปิดใช้: รัน <span className="dpm-mono">npm run dev:full</span> (API + หน้าเว็บพร้อมกัน)
            แล้วกลับมาหน้านี้อีกครั้ง
          </div>
        </div>
      )}

      {!offline && entries !== null && (
        <div className="dpm-card">
          <div
            className="dpm-table-head"
            style={{
              display: 'grid',
              gridTemplateColumns: '150px 120px 150px minmax(0,1fr) 150px',
              padding: '9px 16px',
              gap: 10,
            }}
          >
            <span>ผู้กระทำ</span>
            <span>บทบาท</span>
            <span>การกระทำ</span>
            <span>รายละเอียด</span>
            <span>เวลา (UTC)</span>
          </div>
          {entries.length === 0 && (
            <div style={{ padding: '16px', fontSize: 13, color: 'var(--dpm-mute)' }}>
              ยังไม่มีบันทึก — ลองเปิดดูเรตค่าแรงหรือแก้กฎธุรกิจ แล้วกลับมาดูอีกครั้ง
            </div>
          )}
          {entries.map((e, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '150px 120px 150px minmax(0,1fr) 150px',
                alignItems: 'baseline',
                gap: 10,
                padding: '10px 16px',
                borderBottom: '1px solid var(--dpm-border)',
                fontSize: 13,
              }}
            >
              <span style={{ fontWeight: 500 }}>{e.actor}</span>
              <span className="dpm-mono" style={{ fontSize: 11, color: 'var(--dpm-sub)' }}>
                {e.role}
              </span>
              <span>{ACTION_LABEL[e.action] ?? e.action}</span>
              <span style={{ color: 'var(--dpm-sub)', fontSize: 12, lineHeight: 1.5 }}>
                <span className="dpm-mono" style={{ fontSize: 11 }}>
                  {e.target}
                </span>
                {e.detail && <> · {e.detail}</>}
              </span>
              <span className="dpm-mono" style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
                {e.at}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
