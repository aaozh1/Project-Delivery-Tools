import { useState, type CSSProperties } from 'react'
import { Button, MoneyFigure, PhaseStatusPill, StatusMark } from '../components'
import { STATUS, type RiskLevel } from '../lib/status'
import { baht, bahtAbbrev } from '../lib/format'
import {
  AGING_CRITICAL_DAYS,
  AGING_WARN_DAYS,
  AWAITING_APPROVAL,
  BILL_WAIT_LIMIT_DAYS,
  INITIAL_BILLING_ITEMS,
  type BillingItem,
} from './billing/data'

/**
 * S9 — Billing & Cash · ผู้ใช้: Admin/บัญชี
 * คำถามของหน้า: "เดือนนี้วางบิลได้เท่าไหร่?"
 * โครงหน้า: KPI 4 ช่อง (สไตล์ S1) → คิวอนุมัติแล้วรอวางบิล (กล่องเน้นเดียวของหน้า)
 * → ตารางใบแจ้งหนี้ค้างรับ → สรุปอายุหนี้ + รับเงินแล้วเดือนนี้
 */

/** grid คงที่ของตารางใบแจ้งหนี้ — ใช้ค่าเดียวกันทั้งหัว แถว และแถวรวม */
const TABLE_GRID = '112px minmax(140px,1fr) minmax(130px,1fr) 116px 92px 84px 128px 118px'

const sum = (items: BillingItem[]) => items.reduce((acc, it) => acc + it.value, 0)

/** ระดับสถานะจากอายุหนี้ — เกณฑ์ตั้งต้นจาก Business Rules (S11) */
function agingLevel(days: number): RiskLevel {
  if (days > AGING_CRITICAL_DAYS) return 'critical'
  if (days >= AGING_WARN_DAYS) return 'warn'
  return 'ok'
}

/* ───────────────────────── แถว KPI 4 ช่อง ───────────────────────── */

interface Kpi {
  label: string
  value: string
  valueColor?: string
  note: string
  noteLevel?: RiskLevel
}

function KpiStrip({ items }: { items: BillingItem[] }) {
  const approved = items.filter((it) => it.stage === 'approved')
  const billed = items.filter((it) => it.stage === 'billed')
  const paidThisMonth = items.filter((it) => it.stage === 'paid' && it.paidThisMonth)
  const overdueQueue = approved.filter((it) => it.waitingDays > BILL_WAIT_LIMIT_DAYS)
  const over60 = billed.filter((it) => it.agingDays > AGING_CRITICAL_DAYS)
  const billableThisMonth = sum(approved) + sum(billed.filter((it) => it.billedThisMonth))
  const oldestAging = over60.reduce((max, it) => Math.max(max, it.agingDays), 0)

  const kpis: Kpi[] = [
    {
      label: 'วางบิลได้เดือนนี้',
      value: bahtAbbrev(billableThisMonth),
      note:
        approved.length > 0
          ? overdueQueue.length > 0
            ? `รอวางบิล ${approved.length} งวด · เกินเกณฑ์ ${BILL_WAIT_LIMIT_DAYS} วัน ${overdueQueue.length} งวด`
            : `รอวางบิล ${approved.length} งวด`
          : 'วางบิลครบทุกงวดที่อนุมัติแล้ว',
      noteLevel: overdueQueue.length > 0 ? 'critical' : undefined,
    },
    {
      label: 'รับเงินแล้วเดือนนี้',
      value: bahtAbbrev(sum(paidThisMonth)),
      note: `${paidThisMonth.length} รายการ · รอบเดือน ส.ค. 69`,
    },
    {
      label: 'ค้างรับทั้งหมด',
      value: bahtAbbrev(sum(billed)),
      note: `${billed.length} ใบแจ้งหนี้`,
    },
    {
      label: `ค้างเกิน ${AGING_CRITICAL_DAYS} วัน`,
      value: bahtAbbrev(sum(over60)),
      valueColor: over60.length > 0 ? 'var(--dpm-red)' : 'var(--dpm-mute)',
      note:
        over60.length > 0
          ? `${over60.length} ใบ · เก่าสุด ${oldestAging} วัน`
          : `ไม่มีหนี้เกิน ${AGING_CRITICAL_DAYS} วัน`,
      noteLevel: over60.length > 0 ? 'critical' : undefined,
    },
  ]

  return (
    <div
      className="dpm-card"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}
    >
      {kpis.map((kpi, i) => (
        <div
          key={kpi.label}
          style={{
            padding: '16px 20px',
            borderRight: i < kpis.length - 1 ? '1px solid var(--dpm-border)' : 'none',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--dpm-sub)', marginBottom: 6 }}>{kpi.label}</div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: kpi.valueColor ?? 'var(--dpm-ink)',
              transition: 'color 400ms ease',
            }}
          >
            {kpi.value}
          </div>
          <div
            style={{
              fontSize: 11,
              color: kpi.noteLevel ? STATUS[kpi.noteLevel].color : 'var(--dpm-mute)',
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {kpi.noteLevel && <StatusMark level={kpi.noteLevel} size={9} />}
            {kpi.note}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─────────────── คิว "อนุมัติแล้ว รอวางบิล" — กล่องเน้นเดียวของหน้า ─────────────── */

function QueueRow({
  item,
  last,
  onBill,
}: {
  item: BillingItem
  last: boolean
  onBill: (id: string) => void
}) {
  const overdue = item.waitingDays > BILL_WAIT_LIMIT_DAYS
  const level: RiskLevel = overdue ? 'critical' : 'ok'
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
        padding: '18px 20px',
        borderBottom: last ? 'none' : '1px solid var(--dpm-border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 88, flexShrink: 0, paddingTop: 2 }}>
        <StatusMark level={level} size={overdue ? 11 : 10} />
        <span style={{ fontSize: 12, fontWeight: 600, color: STATUS[level].color }}>
          {STATUS[level].label}
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
          <span className="dpm-mono" style={{ fontSize: 13, fontWeight: 500 }}>
            {item.code}
          </span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{item.project}</span>
          <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>{item.client}</span>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.55 }}>
          งวด {item.phaseNo} · {item.phaseName} — อนุมัติแล้ว รอวางบิลมา{' '}
          <b style={{ color: overdue ? 'var(--dpm-red)' : 'var(--dpm-ink)' }}>
            {item.waitingDays} วัน
          </b>{' '}
          <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>
            (เกณฑ์ {BILL_WAIT_LIMIT_DAYS} วัน)
          </span>
        </div>
        {overdue && (
          <div
            style={{
              marginTop: 8,
              padding: '8px 12px',
              background: 'var(--dpm-subtle)',
              borderLeft: '2px solid var(--dpm-red)',
              borderRadius: '0 var(--dpm-radius-control) var(--dpm-radius-control) 0',
              fontSize: 13,
            }}
          >
            ต้องทำ: ออกใบแจ้งหนี้วันนี้ มิฉะนั้นเลื่อนไปรอบเก็บเงินเดือนหน้า
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 10,
          width: 168,
          flexShrink: 0,
        }}
      >
        <MoneyFigure value={item.value} size={20} />
        <Button variant="primary" style={{ width: '100%' }} onClick={() => onBill(item.id)}>
          วางบิล
        </Button>
      </div>
    </div>
  )
}

function BillingQueue({
  items,
  onBill,
}: {
  items: BillingItem[]
  onBill: (id: string) => void
}) {
  const queue = items.filter((it) => it.stage === 'approved')
  const hasOverdue = queue.some((it) => it.waitingDays > BILL_WAIT_LIMIT_DAYS)

  return (
    <div className="dpm-card dpm-card--critical" style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          padding: '14px 20px',
          borderBottom: '1px solid var(--dpm-border)',
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600 }}>อนุมัติแล้ว รอวางบิล</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--dpm-bg)',
            background: hasOverdue ? 'var(--dpm-red)' : 'var(--dpm-ink)',
            borderRadius: 'var(--dpm-radius-control)',
            padding: '2px 7px',
            transition: 'background 700ms ease',
          }}
        >
          {queue.length}
        </span>
        <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>
          เกณฑ์: วางบิลภายใน {BILL_WAIT_LIMIT_DAYS} วันหลังลูกค้าอนุมัติ
        </span>
      </div>

      {queue.map((item, i) => (
        <QueueRow key={item.id} item={item} last={i === queue.length - 1} onBill={onBill} />
      ))}

      {queue.length === 0 && (
        <div
          style={{
            padding: '20px',
            fontSize: 13,
            color: 'var(--dpm-sub)',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <StatusMark level="ok" size={9} />
          ไม่มีงวดค้างวางบิล — งวดที่ลูกค้าอนุมัติใหม่จะเข้าคิวที่นี่อัตโนมัติ
        </div>
      )}

      {AWAITING_APPROVAL.length > 0 && (
        <div
          style={{
            padding: '10px 20px',
            borderTop: '1px solid var(--dpm-border)',
            background: 'var(--dpm-subtle)',
            fontSize: 12,
            color: 'var(--dpm-mute)',
          }}
        >
          ใกล้เข้าคิว (ส่งลูกค้าแล้ว รออนุมัติ):{' '}
          {AWAITING_APPROVAL.map((ph, i) => (
            <span key={`${ph.code}-${ph.phaseNo}`}>
              {i > 0 && ' · '}
              <span className="dpm-mono">{ph.code}</span> งวด {ph.phaseNo} {baht(ph.value)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ───────────────────── ตารางใบแจ้งหนี้ค้างรับ ───────────────────── */

function InvoiceRow({
  item,
  onReceive,
}: {
  item: BillingItem
  onReceive: (id: string) => void
}) {
  const level = agingLevel(item.agingDays)
  const agingColor = level === 'ok' ? 'var(--dpm-sub)' : STATUS[level].color
  return (
    <div
      className={`dpm-table-row${level === 'critical' ? ' is-critical' : ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: TABLE_GRID,
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
      }}
    >
      <div>
        <div className="dpm-mono" style={{ fontSize: 12 }}>
          {item.code}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--dpm-mute)',
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.project}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>งวด {item.phaseNo}</div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--dpm-mute)',
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.phaseName}
        </div>
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--dpm-sub)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {item.client}
      </div>
      <div style={{ textAlign: 'right' }}>
        <MoneyFigure value={item.value} size={14} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>{item.billedOn ?? '—'}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <StatusMark level={level} size={9} />
        <span
          style={{
            fontSize: 13,
            color: agingColor,
            fontWeight: level === 'critical' ? 600 : 400,
          }}
        >
          {item.agingDays} วัน
        </span>
      </div>
      <div>
        <PhaseStatusPill status="billed" />
      </div>
      <div style={{ textAlign: 'right' }}>
        <Button variant="secondary" onClick={() => onReceive(item.id)}>
          บันทึกรับเงิน
        </Button>
      </div>
    </div>
  )
}

function LegendItem({ level, text }: { level: RiskLevel; text: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <StatusMark level={level} size={9} />
      {text}
    </span>
  )
}

function InvoiceTable({
  items,
  onReceive,
}: {
  items: BillingItem[]
  onReceive: (id: string) => void
}) {
  const billed = items
    .filter((it) => it.stage === 'billed')
    .sort((a, b) => b.agingDays - a.agingDays)

  const headCell: CSSProperties = { whiteSpace: 'nowrap' }

  return (
    <div className="dpm-card" style={{ marginBottom: 24 }}>
      <div className="dpm-card__header">
        <span className="dpm-card__title">ใบแจ้งหนี้ค้างรับ</span>
        <span className="dpm-card__hint">เรียงตามอายุหนี้ เก่าสุดก่อน</span>
      </div>

      <div
        className="dpm-table-head"
        style={{
          display: 'grid',
          gridTemplateColumns: TABLE_GRID,
          gap: 12,
          padding: '10px 20px 8px',
          fontSize: 11,
        }}
      >
        <div style={headCell}>รหัสโครงการ</div>
        <div style={headCell}>งวด</div>
        <div style={headCell}>ลูกค้า</div>
        <div style={{ ...headCell, textAlign: 'right' }}>จำนวนเงิน</div>
        <div style={headCell}>วางบิลเมื่อ</div>
        <div style={headCell}>ค้างมา</div>
        <div style={headCell}>สถานะ</div>
        <div />
      </div>

      {billed.map((item) => (
        <InvoiceRow key={item.id} item={item} onReceive={onReceive} />
      ))}

      {billed.length === 0 && (
        <div
          style={{
            padding: '20px',
            fontSize: 13,
            color: 'var(--dpm-mute)',
            borderBottom: '1px solid var(--dpm-border)',
          }}
        >
          ไม่มีใบแจ้งหนี้ค้างรับ — งวดที่กด "วางบิล" จากคิวด้านบนจะมาแสดงที่นี่
        </div>
      )}

      {/* แถวรวม + legend อายุหนี้ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: TABLE_GRID,
          gap: 12,
          alignItems: 'center',
          padding: '12px 20px',
          fontSize: 12,
          color: 'var(--dpm-mute)',
        }}
      >
        <div style={{ gridColumn: '1 / 4' }}>รวมค้างรับ {billed.length} ใบแจ้งหนี้</div>
        <div style={{ textAlign: 'right' }}>
          <MoneyFigure value={sum(billed)} size={14} />
        </div>
        <div
          style={{
            gridColumn: '5 / 9',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 16,
          }}
        >
          <LegendItem level="ok" text={`น้อยกว่า ${AGING_WARN_DAYS} วัน`} />
          <LegendItem level="warn" text={`${AGING_WARN_DAYS}–${AGING_CRITICAL_DAYS} วัน`} />
          <LegendItem level="critical" text={`เกิน ${AGING_CRITICAL_DAYS} วัน`} />
        </div>
      </div>
    </div>
  )
}

/* ───────────────────── สรุปอายุหนี้ค้างรับ ───────────────────── */

function AgingSummary({ items }: { items: BillingItem[] }) {
  const billed = items.filter((it) => it.stage === 'billed')
  const total = sum(billed)
  const buckets: { level: RiskLevel; label: string; items: BillingItem[] }[] = [
    {
      level: 'ok',
      label: `น้อยกว่า ${AGING_WARN_DAYS} วัน`,
      items: billed.filter((it) => it.agingDays < AGING_WARN_DAYS),
    },
    {
      level: 'warn',
      label: `${AGING_WARN_DAYS}–${AGING_CRITICAL_DAYS} วัน`,
      items: billed.filter(
        (it) => it.agingDays >= AGING_WARN_DAYS && it.agingDays <= AGING_CRITICAL_DAYS,
      ),
    },
    {
      level: 'critical',
      label: `เกิน ${AGING_CRITICAL_DAYS} วัน`,
      items: billed.filter((it) => it.agingDays > AGING_CRITICAL_DAYS),
    },
  ]

  return (
    <div className="dpm-card">
      <div className="dpm-card__header">
        <span className="dpm-card__title">อายุหนี้ค้างรับ</span>
        <span className="dpm-card__hint">สัดส่วนตามยอดเงิน</span>
      </div>
      <div className="dpm-card__body">
        {total > 0 ? (
          <div style={{ display: 'flex', gap: 2, height: 16, marginBottom: 16 }}>
            {buckets.map((b) => {
              const value = sum(b.items)
              if (value === 0) return null
              return (
                <div
                  key={b.level}
                  style={{
                    width: `${(value / total) * 100}%`,
                    background: STATUS[b.level].color,
                    borderRadius: 'var(--dpm-radius-bar)',
                    transition: 'width 260ms ease',
                  }}
                />
              )
            })}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--dpm-mute)', marginBottom: 16 }}>
            ไม่มียอดค้างรับในขณะนี้
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {buckets.map((b) => {
            const value = sum(b.items)
            return (
              <div
                key={b.level}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
              >
                <StatusMark level={b.level} size={9} />
                <span style={{ color: 'var(--dpm-sub)', flex: 1 }}>
                  {b.label}
                  <span style={{ color: 'var(--dpm-mute)' }}> · {b.items.length} ใบ</span>
                </span>
                <MoneyFigure value={value} size={13} problem={b.level === 'critical' && value > 0} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────── รับเงินแล้วเดือนนี้ ───────────────────── */

function ReceivedThisMonth({ items }: { items: BillingItem[] }) {
  const paid = items
    .filter((it) => it.stage === 'paid' && it.paidThisMonth)
    .sort((a, b) => (b.paidOn === 'วันนี้' ? 1 : 0) - (a.paidOn === 'วันนี้' ? 1 : 0))

  return (
    <div className="dpm-card">
      <div className="dpm-card__header">
        <span className="dpm-card__title">รับเงินแล้วเดือนนี้</span>
        <span className="dpm-card__hint">
          {paid.length} รายการ · รวม {bahtAbbrev(sum(paid))}
        </span>
      </div>
      <div className="dpm-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {paid.map((item) => {
          const fresh = item.paidOn === 'วันนี้'
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                fontSize: 13,
                color: fresh ? 'var(--dpm-ink)' : 'var(--dpm-mute)',
                transition: 'color 400ms ease',
              }}
            >
              <span style={{ color: 'var(--dpm-green)', fontSize: 11 }}>✓</span>
              <span style={{ width: 56, flexShrink: 0, fontSize: 12 }}>{item.paidOn}</span>
              <span className="dpm-mono" style={{ fontSize: 12 }}>
                {item.code}
              </span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                งวด {item.phaseNo} · {item.project}
              </span>
              <span style={{ fontWeight: 600, color: fresh ? 'var(--dpm-ink)' : 'var(--dpm-sub)' }}>
                {baht(item.value)}
              </span>
            </div>
          )
        })}
        {paid.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--dpm-mute)' }}>
            ยังไม่มีรายการรับเงินในเดือนนี้ — กด "บันทึกรับเงิน" ในตารางใบแจ้งหนี้เมื่อเงินเข้า
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────── หน้า ─────────────────────────────── */

export function BillingCashPage() {
  const [items, setItems] = useState<BillingItem[]>(INITIAL_BILLING_ITEMS)

  /** อนุมัติแล้ว → วางบิลแล้ว (เดินหน้าทางเดียวตามสถานะงวด 6 ขั้น) */
  const billItem = (id: string) =>
    setItems((prev) =>
      prev.map((it) =>
        it.id === id && it.stage === 'approved'
          ? { ...it, stage: 'billed', billedOn: 'วันนี้', agingDays: 0, billedThisMonth: true }
          : it,
      ),
    )

  /** วางบิลแล้ว → รับเงินแล้ว */
  const receiveItem = (id: string) =>
    setItems((prev) =>
      prev.map((it) =>
        it.id === id && it.stage === 'billed'
          ? { ...it, stage: 'paid', paidOn: 'วันนี้', paidThisMonth: true }
          : it,
      ),
    )

  return (
    <div
      style={{
        maxWidth: 'var(--dpm-page-max-w)',
        margin: '0 auto',
        padding: '24px var(--dpm-page-pad-x) 64px',
      }}
    >
      {/* หัวหน้า */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Billing &amp; Cash
          </h1>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--dpm-sub)' }}>
            วันอังคารที่ 4 สิงหาคม 2569 · รอบเก็บเงินเดือน ส.ค. · มุมมอง Admin/บัญชี
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>
          เกณฑ์จาก Business Rules: วางบิลภายใน {BILL_WAIT_LIMIT_DAYS} วันหลังอนุมัติ · ค้างรับเกิน{' '}
          {AGING_CRITICAL_DAYS} วัน = ไฟแดง
        </div>
      </div>

      <KpiStrip items={items} />

      <BillingQueue items={items} onBill={billItem} />

      <InvoiceTable items={items} onReceive={receiveItem} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.15fr 1fr',
          gap: 16,
          alignItems: 'start',
          marginBottom: 24,
        }}
      >
        <AgingSummary items={items} />
        <ReceivedThisMonth items={items} />
      </div>

      {/* บรรทัดกำกับการควบคุม */}
      <div
        style={{
          borderTop: '1px solid var(--dpm-border)',
          paddingTop: 14,
          fontSize: 12,
          color: 'var(--dpm-mute)',
          lineHeight: 1.7,
        }}
      >
        การกด "วางบิล" และ "บันทึกรับเงิน" ทุกครั้งถูกเขียนลง Audit Log (ผู้ทำ · เวลา · งวดงาน) ·
        ตัวเลขวางบิลต้องตรงกับใบกำกับภาษีในระบบบัญชีหลัก — DPM ไม่ใช่ระบบบัญชี
        เป็นมุมมองการควบคุมการเก็บเงินของโครงการ
      </div>
    </div>
  )
}
