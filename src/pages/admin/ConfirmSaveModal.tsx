import { Button } from '../../components'
import { STATUS } from '../../lib/status'
import { RULE_KEYS, RULE_LABELS, formatRuleValue } from './adminData'
import type { CritImpact, RuleValues } from './adminData'

interface ConfirmSaveModalProps {
  values: RuleValues
  /** ค่าที่ระบบบันทึกไว้ล่าสุด — ใช้เทียบหา "ค่าที่เปลี่ยน" */
  saved: RuleValues
  critImpact: CritImpact
  onCancel: () => void
  onConfirm: () => void
}

/**
 * กล่องยืนยันก่อนบันทึกกฎธุรกิจ — กว้าง 660px border 1px ink
 * ส่วนผลกระทบคำนวณจริงจากโครงการ Active ไม่ใช่ข้อความคงที่
 */
export function ConfirmSaveModal({ values, saved, critImpact, onCancel, onConfirm }: ConfirmSaveModalProps) {
  const changedKeys = RULE_KEYS.filter((k) => String(values[k]) !== String(saved[k]))
  const { changed, loosening, critDef, crit, flipped, stillRed } = critImpact
  const showImpact = changed && flipped.length > 0

  const fromStatus = loosening ? STATUS.critical : STATUS.warn
  const toStatus = loosening ? STATUS.warn : STATUS.critical

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ยืนยันการแก้กฎธุรกิจ"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'var(--dpm-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}
    >
      <div
        style={{
          width: 660,
          maxWidth: '100%',
          maxHeight: '88vh',
          overflow: 'auto',
          background: 'var(--dpm-bg)',
          border: '1px solid var(--dpm-ink)',
          borderRadius: 'var(--dpm-radius-card)',
        }}
      >
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--dpm-border)',
            background: 'var(--dpm-surface)',
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 600 }}>ยืนยันการแก้กฎธุรกิจ</div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--dpm-sub)' }}>
            ผลกระทบด้านล่างคำนวณจากโครงการ Active ทั้ง 24 โครงการ ณ ตอนนี้
          </div>
        </div>

        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ค่าที่เปลี่ยน */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--dpm-mute)', marginBottom: 8 }}>
              ค่าที่เปลี่ยน
            </div>
            <div
              style={{
                border: '1px solid var(--dpm-border)',
                borderRadius: 'var(--dpm-radius-control)',
                background: 'var(--dpm-surface)',
              }}
            >
              {changedKeys.map((k) => (
                <div
                  key={k}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,1fr) 92px 22px 92px',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--dpm-border)',
                  }}
                >
                  <span style={{ fontSize: 13 }}>{RULE_LABELS[k]}</span>
                  <span
                    style={{
                      fontSize: 14,
                      color: 'var(--dpm-mute)',
                      textAlign: 'right',
                      textDecoration: 'line-through',
                    }}
                  >
                    {formatRuleValue(k, saved[k])}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--dpm-mute)', textAlign: 'center' }}>
                    →
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 600, textAlign: 'right' }}>
                    {formatRuleValue(k, values[k])}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ผลกระทบที่เกิดขึ้นทันที — เฉพาะเมื่อเกณฑ์วิกฤตเปลี่ยนแล้วมีโครงการพลิกสถานะ */}
          {showImpact && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--dpm-mute)', marginBottom: 8 }}>
                ผลกระทบที่เกิดขึ้นทันที
              </div>
              <div
                style={{
                  border: '1px solid var(--dpm-yellow)',
                  borderRadius: 'var(--dpm-radius-control)',
                  background: 'var(--dpm-surface)',
                }}
              >
                <div
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--dpm-border)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 9,
                  }}
                >
                  <span style={{ fontSize: 10, color: STATUS.warn.color, paddingTop: 3 }}>
                    {STATUS.warn.mark}
                  </span>
                  <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                    เปลี่ยนเกณฑ์วิกฤตจาก {critDef} เป็น {crit} จุด → {flipped.length}{' '}
                    โครงการเปลี่ยนสถานะ{loosening ? 'จากแดงเป็นเหลือง' : 'จากเหลืองเป็นแดง'}
                    <div style={{ fontSize: 12, color: 'var(--dpm-sub)', marginTop: 3 }}>
                      {loosening
                        ? 'โครงการเหล่านี้จะหายจากกล่อง "ต้องตัดสินใจ" ของหน้า Portfolio Control Room ทันที'
                        : 'โครงการเหล่านี้จะเข้ากล่อง "ต้องตัดสินใจ" ของหน้า Portfolio Control Room ทันที'}
                    </div>
                  </div>
                </div>
                {flipped.map((p) => (
                  <div
                    key={p.code}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '112px minmax(0,1fr) 74px 150px',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 14px',
                      borderBottom: '1px solid var(--dpm-border)',
                    }}
                  >
                    <span className="dpm-mono" style={{ fontSize: 12 }}>
                      {p.code}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.name}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--dpm-sub)', textAlign: 'right' }}>
                      {p.gap} จุด
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        justifyContent: 'flex-end',
                      }}
                    >
                      <span style={{ color: fromStatus.color }}>
                        {fromStatus.mark} {fromStatus.label}
                      </span>
                      <span style={{ color: 'var(--dpm-mute)' }}>→</span>
                      <span style={{ color: toStatus.color, fontWeight: 600 }}>
                        {toStatus.mark} {toStatus.label}
                      </span>
                    </span>
                  </div>
                ))}
                {stillRed.length > 0 && (
                  <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--dpm-sub)' }}>
                    {stillRed
                      .map((p) => `${p.code} (ส่วนต่าง ${p.gap} จุด)`)
                      .join(' · ')}{' '}
                    ยังคงเป็นวิกฤตไม่ว่าเกณฑ์จะเป็นเท่าไร
                  </div>
                )}
              </div>
            </div>
          )}

          <div
            style={{
              fontSize: 12,
              color: 'var(--dpm-sub)',
              lineHeight: 1.6,
              padding: '12px 14px',
              background: 'var(--dpm-subtle)',
              borderRadius: 'var(--dpm-radius-control)',
            }}
          >
            บันทึกแล้วจะมีผลทันทีกับทุกหน้าจอของทุกคน ·
            การเปลี่ยนแปลงนี้ย้อนกลับได้จาก Audit Log ภายใน 30 วัน
          </div>
        </div>

        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--dpm-border)',
            background: 'var(--dpm-surface)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>
            ผู้บันทึก: คุณณัฐพงศ์ · 3 ส.ค. 2569 08:14
          </span>
          <span style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            ยืนยันและบันทึก
          </Button>
        </div>
      </div>
    </div>
  )
}
