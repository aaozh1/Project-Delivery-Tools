import { useEffect, useState } from 'react'
import { AdminSidebar } from './admin/AdminSidebar'
import { BusinessRulesView } from './admin/BusinessRulesView'
import { RatesView } from './admin/RatesView'
import { AuditView } from './admin/AuditView'
import { SaveBar } from './admin/SaveBar'
import { ConfirmSaveModal } from './admin/ConfirmSaveModal'
import { RULE_DEFAULTS, RULE_KEYS, computeCritImpact } from './admin/adminData'
import type { AdminView, RuleKey, RuleValues } from './admin/adminData'
import { tryApi } from '../api/client'

interface RulesResponse {
  rules: Record<string, string>
}

/** แปลง rules จาก server เป็น RuleValues โดยยึดคีย์ที่ระบบรู้จัก */
function mergeRules(server: Record<string, string>): RuleValues {
  const merged = { ...RULE_DEFAULTS }
  for (const key of RULE_KEYS) {
    if (key in server) merged[key] = server[key]
  }
  return merged
}

/**
 * S11 — Admin Console (HoPD เท่านั้น)
 * โครง: เมนูซ้าย 240px + แถบดำเต็มความกว้าง + เนื้อหา + แถบบันทึก sticky ล่างจอ
 * dirty state เทียบทุกคีย์กับค่าที่บันทึกไว้ล่าสุดแบบ string · บันทึกต้องผ่าน modal
 * โหมด server: ค่าอ่าน/เขียนผ่าน API (PUT จำกัดสิทธิ์ HoPD + เขียน Audit Log ฝั่งเซิร์ฟเวอร์)
 * โหมด offline: ทำงานกับค่าตั้งต้นฝั่ง client
 */
export function AdminConsolePage() {
  const [view, setView] = useState<AdminView>('rules')
  const [saved, setSaved] = useState<RuleValues>({ ...RULE_DEFAULTS })
  const [values, setValues] = useState<RuleValues>({ ...RULE_DEFAULTS })
  const [source, setSource] = useState<'server' | 'mock'>('mock')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [lastEdit, setLastEdit] = useState('แก้ล่าสุดโดย คุณณัฐพงศ์ · 28 ก.ค. 2569 14:32')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await tryApi<RulesResponse>('/api/rules')
      if (cancelled || !res) return
      const merged = mergeRules(res.rules)
      setSaved(merged)
      setValues(merged)
      setSource('server')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const critImpact = computeCritImpact(values, saved)
  const dirtyCount = RULE_KEYS.filter((k) => String(values[k]) !== String(saved[k])).length

  const setRule = (key: RuleKey, value: string) => setValues((v) => ({ ...v, [key]: value }))

  const confirmSave = async () => {
    if (source === 'server') {
      const res = await tryApi<RulesResponse>('/api/rules', {
        method: 'PUT',
        body: JSON.stringify({ rules: values }),
      })
      if (res) {
        const merged = mergeRules(res.rules)
        setSaved(merged)
        setValues(merged)
        setConfirmOpen(false)
        setLastEdit('แก้ล่าสุดโดย คุณณัฐพงศ์ · เมื่อสักครู่ (บันทึกที่เซิร์ฟเวอร์ + Audit Log)')
        return
      }
    }
    setSaved({ ...values })
    setConfirmOpen(false)
    setLastEdit('แก้ล่าสุดโดย คุณณัฐพงศ์ · เมื่อสักครู่')
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--dpm-h-topnav))' }}>
      <AdminSidebar view={view} onNavigate={setView} />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* แถบดำเต็มความกว้าง — หน้านี้ต้องรู้สึกหนักแน่น ไม่ใช่หน้าตั้งค่าธรรมดา */}
        <div
          style={{
            background: 'var(--dpm-ink)',
            color: 'var(--dpm-bg)',
            padding: '12px 32px',
            display: 'flex',
            alignItems: 'baseline',
            gap: 16,
          }}
        >
          <span style={{ fontSize: 13, lineHeight: 1.55 }}>
            ค่าทุกค่าในหน้านี้มีผลกับทุกโครงการทั้งบริษัททันทีที่บันทึก —
            สถานะไฟ การเตือน และสายอนุมัติจะคำนวณใหม่ทั้งหมด
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--dpm-mute)', whiteSpace: 'nowrap' }}>
            {source === 'mock' && 'โหมดไม่มีเซิร์ฟเวอร์ · '}
            {lastEdit}
          </span>
        </div>

        {view === 'rules' && (
          <BusinessRulesView values={values} onSet={setRule} critImpact={critImpact} />
        )}
        {view === 'rates' && <RatesView />}
        {view === 'audit' && <AuditView />}

        {view === 'rules' && (
          <SaveBar
            dirtyCount={dirtyCount}
            onRevert={() => setValues({ ...saved })}
            onSave={() => setConfirmOpen(true)}
          />
        )}
      </div>

      {confirmOpen && (
        <ConfirmSaveModal
          values={values}
          saved={saved}
          critImpact={critImpact}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void confirmSave()}
        />
      )}
    </div>
  )
}
