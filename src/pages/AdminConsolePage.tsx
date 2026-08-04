import { useState } from 'react'
import { AdminSidebar } from './admin/AdminSidebar'
import { BusinessRulesView } from './admin/BusinessRulesView'
import { RatesView } from './admin/RatesView'
import { SaveBar } from './admin/SaveBar'
import { ConfirmSaveModal } from './admin/ConfirmSaveModal'
import { RULE_DEFAULTS, RULE_KEYS, computeCritImpact } from './admin/adminData'
import type { AdminView, RuleKey, RuleValues } from './admin/adminData'

/**
 * S11 — Admin Console (HoPD เท่านั้น)
 * โครง: เมนูซ้าย 240px + แถบดำเต็มความกว้าง + เนื้อหา + แถบบันทึก sticky ล่างจอ
 * dirty state เทียบทุกคีย์กับค่าที่บันทึกไว้ล่าสุดแบบ string · บันทึกต้องผ่าน modal
 * ที่คำนวณผลกระทบจากข้อมูลจริง ไม่ใช่ข้อความคงที่
 */
export function AdminConsolePage() {
  const [view, setView] = useState<AdminView>('rules')
  const [saved, setSaved] = useState<RuleValues>({ ...RULE_DEFAULTS })
  const [values, setValues] = useState<RuleValues>({ ...RULE_DEFAULTS })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [lastEdit, setLastEdit] = useState('แก้ล่าสุดโดย คุณณัฐพงศ์ · 28 ก.ค. 2569 14:32')

  const critImpact = computeCritImpact(values, saved)
  const dirtyCount = RULE_KEYS.filter((k) => String(values[k]) !== String(saved[k])).length

  const setRule = (key: RuleKey, value: string) => setValues((v) => ({ ...v, [key]: value }))

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
            {lastEdit}
          </span>
        </div>

        {view === 'rules' ? (
          <BusinessRulesView values={values} onSet={setRule} critImpact={critImpact} />
        ) : (
          <RatesView />
        )}

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
          onConfirm={() => {
            setSaved({ ...values })
            setConfirmOpen(false)
            setLastEdit('แก้ล่าสุดโดย คุณณัฐพงศ์ · เมื่อสักครู่')
          }}
        />
      )}
    </div>
  )
}
