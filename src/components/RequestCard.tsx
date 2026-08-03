import { Button } from './Button'

export type RequestKind = 'capacity' | 'transfer'
export type RequestCardState = 'actionable' | 'readonly' | 'decided'

interface RequestCardProps {
  /** capacity = คำขอกำลังเสริม (+) · transfer = คำขอย้ายคน (⇄) */
  kind: RequestKind
  /** เนื้อหาคำขอ เช่น "Squad B ขอ Mid เพิ่ม 1 คน เป็นเวลา 6 สัปดาห์" */
  body: string
  /** เหตุผลประกอบ */
  reason: string
  /** อายุคำขอ เช่น "ขอมา 2 วัน" */
  age: string
  /** บรรทัดผลกระทบ เช่น "ผลกระทบ: Squad C ขึ้นเป็น 96% ใน ต.ค." */
  impact: string
  /**
   * actionable = ผู้ดูมีสิทธิ์อนุมัติ · readonly = ดูได้แต่ไม่ได้เป็นผู้อนุมัติ
   * (ระบุใน impact ว่าติดต่อใคร) · decided = ตัดสินใจแล้ว
   */
  state?: RequestCardState
  onApprove?: () => void
  onReject?: () => void
}

const KIND_LABEL: Record<RequestKind, string> = { capacity: 'กำลังเสริม', transfer: 'ย้ายคน' }
const KIND_GLYPH: Record<RequestKind, string> = { capacity: '+', transfer: '⇄' }

/** การ์ดคำขอกำลังเสริม/ย้ายคน — กลไกที่ทำให้กติกา "ห้ามข้าม Squad" ไม่กลายเป็นทางตัน */
export function RequestCard({
  kind,
  body,
  reason,
  age,
  impact,
  state = 'actionable',
  onApprove,
  onReject,
}: RequestCardProps) {
  const decided = state === 'decided'
  const readonly = state === 'readonly'
  return (
    <div
      style={{
        border: `1px solid ${decided ? 'var(--dpm-green)' : 'var(--dpm-border)'}`,
        borderRadius: 'var(--dpm-radius-card)',
        background: readonly ? 'var(--dpm-bg)' : 'var(--dpm-surface)',
        padding: '13px 15px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 'var(--dpm-radius-badge)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            background: decided ? 'var(--dpm-green)' : kind === 'transfer' ? 'var(--dpm-subtle)' : 'var(--dpm-surface)',
            border: `1px solid ${decided ? 'var(--dpm-green)' : kind === 'transfer' ? 'var(--dpm-border)' : 'var(--dpm-ink)'}`,
            color: decided ? 'var(--dpm-bg)' : readonly ? 'var(--dpm-mute)' : 'var(--dpm-ink)',
          }}
        >
          {decided ? '✓' : KIND_GLYPH[kind]}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: decided ? 'var(--dpm-green)' : readonly ? 'var(--dpm-sub)' : 'var(--dpm-ink)',
          }}
        >
          {KIND_LABEL[kind]}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>{age}</span>
      </div>
      <div
        style={{
          marginTop: 9,
          fontSize: 14,
          lineHeight: 1.55,
          color: readonly || decided ? 'var(--dpm-sub)' : 'var(--dpm-ink)',
        }}
      >
        {body}
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.55 }}>{reason}</div>
      <div style={{ marginTop: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
        {decided ? (
          <span
            style={{
              fontSize: 12,
              borderRadius: 'var(--dpm-radius-control)',
              padding: '7px 16px',
              color: 'var(--dpm-green)',
              background: 'var(--dpm-tint-green)',
              border: '1px solid var(--dpm-green)',
            }}
          >
            อนุมัติแล้ว
          </span>
        ) : (
          <>
            <Button variant="primary" style={{ height: 34, fontSize: 12 }} disabled={readonly} onClick={onApprove}>
              อนุมัติ
            </Button>
            <Button variant="secondary" disabled={readonly} onClick={onReject}>
              ปฏิเสธ
            </Button>
          </>
        )}
        <span style={{ fontSize: 11, color: 'var(--dpm-mute)', marginLeft: 2 }}>{impact}</span>
      </div>
    </div>
  )
}
