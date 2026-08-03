import { PHASE_STATUS_LABEL, PHASE_STATUS_ORDER, type PhaseStatus } from '../lib/status'

const PILL_STYLE: Record<
  PhaseStatus,
  { mark: string; fg: string; bg: string; border: string; dashed?: boolean }
> = {
  'not-started': { mark: '○', fg: 'var(--dpm-mute)', bg: 'var(--dpm-surface)', border: 'var(--dpm-border)', dashed: true },
  'in-progress': { mark: '◐', fg: 'var(--dpm-ink)', bg: 'var(--dpm-subtle)', border: 'var(--dpm-border)' },
  delivered: { mark: '◑', fg: 'var(--dpm-ink)', bg: 'var(--dpm-surface)', border: 'var(--dpm-ink)' },
  approved: { mark: '✓', fg: 'var(--dpm-bg)', bg: 'var(--dpm-ink)', border: 'var(--dpm-ink)' },
  billed: { mark: '✓', fg: 'var(--dpm-bg)', bg: 'var(--dpm-accent)', border: 'var(--dpm-accent)' },
  paid: { mark: '✓', fg: 'var(--dpm-bg)', bg: 'var(--dpm-green)', border: 'var(--dpm-green)' },
}

/** ป้ายสถานะงวดงานเดี่ยว — ใช้ในตาราง */
export function PhaseStatusPill({ status }: { status: PhaseStatus }) {
  const s = PILL_STYLE[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 13,
        padding: '7px 13px',
        borderRadius: 'var(--dpm-radius-control)',
        color: s.fg,
        background: s.bg,
        border: `1px ${s.dashed ? 'dashed' : 'solid'} ${s.border}`,
      }}
    >
      <span style={{ fontSize: 9 }}>{s.mark}</span>
      {PHASE_STATUS_LABEL[status]}
    </span>
  )
}

const TRACK_SHORT_LABEL: Record<PhaseStatus, string> = {
  'not-started': 'ยังไม่เริ่ม',
  'in-progress': 'กำลังทำ',
  delivered: 'ส่งลูกค้า',
  approved: 'อนุมัติ',
  billed: 'วางบิล',
  paid: 'รับเงิน',
}

/** แถบเส้นทาง 6 ช่อง — ใช้ในหน้ารายละเอียดงวด บอกว่าเดินมาถึงขั้นไหน */
export function PhaseTrack({ current }: { current: PhaseStatus }) {
  const currentIdx = PHASE_STATUS_ORDER.indexOf(current)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {PHASE_STATUS_ORDER.map((status, i) => {
        const reached = i <= currentIdx
        return (
          <div key={status} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                height: 6,
                background: reached ? 'var(--dpm-ink)' : 'var(--dpm-subtle)',
                borderRadius: 'var(--dpm-radius-bar)',
                marginRight: 3,
              }}
            />
            <span
              style={{
                fontSize: 11,
                color:
                  i === currentIdx ? 'var(--dpm-ink)' : reached ? 'var(--dpm-sub)' : 'var(--dpm-mute)',
                fontWeight: i === currentIdx ? 600 : 400,
              }}
            >
              {TRACK_SHORT_LABEL[status]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
