import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { RequestCard } from '../components/RequestCard'
import { STATUS, loadLevel } from '../lib/status'
import { percent } from '../lib/format'
import {
  BALANCE_MONTHS,
  REINFORCEMENT_REQUESTS,
  REVIEW_ITEMS,
  REVIEW_KINDS,
  REVIEW_KIND_ORDER,
  SQUAD_BALANCE,
  type ReviewKind,
} from './department/data'

/**
 * S2 · Department Board — หัวหน้าแผนก Interior
 * สามหน้าที่: รีวิวงาน · ดูแลสมดุลระหว่าง Squad · ดูแลคน
 * อ้างอิง: docs/design-handoff/README.md §5 + designs/Department Board.dc.html
 */

/** ความเร่งด่วนจากจำนวนวันรอ — แดง ≥5 วัน · เหลือง ≥3 วัน · ปกติ */
function waitMeta(days: number): { color: string; mark: string; note: string; rail: string } {
  if (days >= 5)
    return { color: 'var(--dpm-red)', mark: '▲', note: 'เกินเกณฑ์ 2 วัน', rail: 'var(--dpm-red)' }
  if (days >= 3)
    return { color: 'var(--dpm-yellow)', mark: '◆', note: 'ใกล้เกินเกณฑ์', rail: 'var(--dpm-yellow)' }
  return { color: 'var(--dpm-sub)', mark: '●', note: 'อยู่ในเกณฑ์', rail: 'var(--dpm-border)' }
}

/** กล่องสัญลักษณ์ชนิดรีวิว — ต่างกันทั้งรูปและน้ำหนักหมึก อ่านได้แม้พิมพ์ขาวดำ */
function KindBox({ kind, size }: { kind: ReviewKind; size: 16 | 26 }) {
  const k = REVIEW_KINDS[kind]
  return (
    <span
      aria-label={k.label}
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: 'var(--dpm-radius-badge)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size === 26 ? 13 : 9,
        background: k.boxBg,
        border: `1px ${k.boxStyle} ${k.boxBorder}`,
        color: k.glyphColor,
      }}
    >
      {k.glyph}
    </span>
  )
}

/** ช่อง % รายเดือนของ Squad — % 18px + สัญลักษณ์ + แถบพร้อมขีด 100% (เทียบข้าม Squad ได้ด้วยตำแหน่ง) */
function BalanceCell({ pct }: { pct: number }) {
  const meta = STATUS[loadLevel(pct)]
  const barW = Math.min(100, pct * (100 / 120))
  return (
    <div style={{ padding: '11px 12px', borderLeft: '1px solid var(--dpm-border)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span aria-label={meta.label} style={{ fontSize: 9, color: meta.color }}>
          {meta.mark}
        </span>
        <span style={{ fontSize: 18, fontWeight: 600, color: meta.color, lineHeight: 1 }}>
          {percent(pct)}
        </span>
      </div>
      <div
        style={{
          marginTop: 5,
          height: 4,
          background: 'var(--dpm-subtle)',
          borderRadius: 'var(--dpm-radius-bar)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${barW}%`,
            background: meta.color,
            borderRadius: 'var(--dpm-radius-bar)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 'var(--dpm-refline-pos)',
            top: -2,
            bottom: -2,
            width: 1,
            background: 'var(--dpm-mute)',
          }}
        />
      </div>
    </div>
  )
}

type RequestDecision = 'approved' | 'rejected'

export function DepartmentBoardPage() {
  /** state การอนุมัติ/ปฏิเสธคำขอกำลังเสริม — คีย์คือ id ของคำขอ */
  const [decisions, setDecisions] = useState<Record<string, RequestDecision>>({})

  const sortedReviews = [...REVIEW_ITEMS].sort((a, b) => b.waitDays - a.waitDays)
  const pendingRequestCount = REINFORCEMENT_REQUESTS.filter((r) => !decisions[r.id]).length

  const decide = (id: string, decision: RequestDecision) =>
    setDecisions((prev) => ({ ...prev, [id]: decision }))
  const reconsider = (id: string) =>
    setDecisions((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })

  return (
    <div style={{ minHeight: '100%', background: 'var(--dpm-bg)' }}>
      {/* ── หัวแผนก — sticky ใต้แถบนำทางหลัก ─────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 'var(--dpm-h-topnav)',
          zIndex: 5,
          background: 'var(--dpm-bg)',
          borderBottom: '1px solid var(--dpm-border)',
        }}
      >
        <div
          style={{
            maxWidth: 'var(--dpm-page-max-w)',
            margin: '0 auto',
            padding: '14px var(--dpm-page-pad-x)',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <Link
            to="/"
            aria-label="กลับหน้าหลัก"
            style={{
              fontSize: 16,
              color: 'var(--dpm-sub)',
              padding: '4px 8px',
              borderRadius: 'var(--dpm-radius-control)',
            }}
          >
            ←
          </Link>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>
              แผนก Interior Design
            </h1>
            <div style={{ marginTop: 3, fontSize: 12, color: 'var(--dpm-sub)' }}>
              3 Squad · 16 คน · 6 โครงการ Active · หัวหน้าแผนก คุณกิตติ
            </div>
          </div>
          <span style={{ flex: 1 }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid var(--dpm-border)',
              borderRadius: 'var(--dpm-radius-control)',
              background: 'var(--dpm-surface)',
              padding: '4px 4px 4px 12px',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500 }}>สัปดาห์ 32</span>
            <span style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>4–8 ส.ค. 2569</span>
            <button
              type="button"
              aria-label="สัปดาห์ก่อนหน้า"
              style={{
                width: 24,
                border: 'none',
                background: 'transparent',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--dpm-sub)',
                cursor: 'pointer',
                borderRadius: 'var(--dpm-radius-badge)',
                padding: 0,
              }}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="สัปดาห์ถัดไป"
              style={{
                width: 24,
                border: 'none',
                background: 'transparent',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--dpm-sub)',
                cursor: 'pointer',
                borderRadius: 'var(--dpm-radius-badge)',
                padding: 0,
              }}
            >
              ›
            </button>
          </div>
          <Button variant="secondary">รายงานแผนก</Button>
        </div>
      </div>

      {/* ── โครงหลักสองคอลัมน์ ─────────────────────────────── */}
      <div
        style={{
          maxWidth: 'var(--dpm-page-max-w)',
          margin: '0 auto',
          padding: '20px var(--dpm-page-pad-x) 80px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.42fr) minmax(360px,1fr)',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* ── ซ้าย: รอฉันรีวิว ─────────────────────────────── */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>รอฉันรีวิว</h2>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--dpm-bg)',
                  background: 'var(--dpm-red)',
                  borderRadius: 'var(--dpm-radius-control)',
                  padding: '2px 7px',
                }}
              >
                {sortedReviews.length}
              </span>
              <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>เรียงตามรอนานที่สุด</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 11,
                color: 'var(--dpm-sub)',
              }}
            >
              {REVIEW_KIND_ORDER.map((kind) => (
                <span
                  key={kind}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
                >
                  <KindBox kind={kind} size={16} />
                  {REVIEW_KINDS[kind].label}
                </span>
              ))}
            </div>
          </div>

          <div className="dpm-card">
            {sortedReviews.map((r) => {
              const w = waitMeta(r.waitDays)
              const k = REVIEW_KINDS[r.kind]
              return (
                <div
                  key={`${r.code}-${r.title}`}
                  className="dpm-table-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '6px 148px minmax(0,1fr) 128px 116px',
                    alignItems: 'stretch',
                  }}
                >
                  {/* แถบสีซ้าย 6px = ความเร่งด่วน (แยกจากชนิด ไม่ปนกัน) */}
                  <div style={{ background: w.rail }} />

                  {/* คอลัมน์ชนิด 148px */}
                  <div style={{ padding: '14px 12px 14px 14px', borderRight: '1px solid var(--dpm-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <KindBox kind={r.kind} size={26} />
                      <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {k.label}
                      </span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--dpm-mute)', lineHeight: 1.45 }}>
                      {k.hint}
                    </div>
                  </div>

                  {/* เนื้อหา */}
                  <div style={{ padding: '14px 16px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                      <span className="dpm-mono" style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>
                        {r.code}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{r.title}</span>
                    </div>
                    <div style={{ marginTop: 5, fontSize: 13, color: 'var(--dpm-ink)', lineHeight: 1.55 }}>
                      {r.detail}
                    </div>
                    <div style={{ marginTop: 5, fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.55 }}>
                      {r.sub}
                    </div>
                  </div>

                  {/* จำนวนวันที่รอ */}
                  <div style={{ padding: '14px 12px', textAlign: 'right' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'flex-end',
                        gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 9, color: w.color }}>{w.mark}</span>
                      <span style={{ fontSize: 22, fontWeight: 600, color: w.color, lineHeight: 1 }}>
                        {r.waitDays}
                      </span>
                      <span style={{ fontSize: 12, color: w.color }}>วัน</span>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 11, color: 'var(--dpm-mute)' }}>{w.note}</div>
                  </div>

                  {/* ปุ่มหลักตามชนิด + ทางเลือกที่สอง */}
                  <div
                    style={{
                      padding: '14px 14px 14px 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      justifyContent: 'center',
                    }}
                  >
                    <Button
                      variant="primary"
                      style={{ width: '100%', height: 34, fontSize: 13, padding: '0 10px' }}
                    >
                      {r.cta}
                    </Button>
                    <button
                      type="button"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        fontSize: 11,
                        textAlign: 'center',
                        color: 'var(--dpm-sub)',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {r.cta2}
                    </button>
                  </div>
                </div>
              )
            })}
            <div
              style={{
                padding: '11px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>
                รีวิวเฉลี่ยของคุณ 2.4 วัน · เกณฑ์แผนก 2 วัน
              </span>
              <a style={{ fontSize: 12, cursor: 'pointer' }}>ดูรายการที่รีวิวแล้ว</a>
            </div>
          </div>
        </div>

        {/* ── ขวา ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ขวาบน: สมดุล Squad */}
          <div className="dpm-card">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--dpm-border)' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>สมดุล Squad — 3 เดือนข้างหน้า</div>
              <div style={{ marginTop: 3, fontSize: 11, color: 'var(--dpm-mute)' }}>
                คุณเป็นคนเดียวที่ย้ายคนข้าม Squad ได้
              </div>
            </div>

            <div
              className="dpm-table-head"
              style={{ display: 'grid', gridTemplateColumns: '112px repeat(3, minmax(0,1fr))' }}
            >
              <div style={{ padding: '7px 16px', fontSize: 11 }}>Squad</div>
              {BALANCE_MONTHS.map((mo) => (
                <div
                  key={mo}
                  style={{
                    padding: '7px 12px',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--dpm-ink)',
                    borderLeft: '1px solid var(--dpm-border)',
                  }}
                >
                  {mo}
                </div>
              ))}
            </div>

            {SQUAD_BALANCE.map((b) => (
              <div
                key={b.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '112px repeat(3, minmax(0,1fr))',
                  borderBottom: '1px solid var(--dpm-border)',
                }}
              >
                <div style={{ padding: '11px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--dpm-mute)', marginTop: 1 }}>{b.lead}</div>
                </div>
                {b.pcts.map((pct, i) => (
                  <BalanceCell key={`${b.name}-${BALANCE_MONTHS[i]}`} pct={pct} />
                ))}
              </div>
            ))}

            <div style={{ padding: '13px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--dpm-red)', paddingTop: 3 }}>▲</span>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                  ต.ค. Squad B ล้น <b style={{ color: 'var(--dpm-red)' }}>118%</b> ขณะที่ Squad C ว่าง{' '}
                  <b style={{ color: 'var(--dpm-blue)' }}>15%</b>
                  <div style={{ fontSize: 12, color: 'var(--dpm-sub)', marginTop: 3 }}>
                    ต้องทำ: ย้ายโครงการหนึ่งไป Squad C หรือย้ายสมาชิกชั่วคราว 4–6 สัปดาห์
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                <Button variant="primary" style={{ height: 30, fontSize: 12, padding: '0 14px' }}>
                  ดูภาระงานรายคน
                </Button>
                <a style={{ fontSize: 12, cursor: 'pointer' }}>จำลองการย้าย</a>
              </div>
            </div>
          </div>

          {/* ขวากลาง: คำขอกำลังเสริม */}
          <div className="dpm-card">
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--dpm-border)',
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600 }}>คำขอกำลังเสริม</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--dpm-bg)',
                  background: 'var(--dpm-sub)',
                  borderRadius: 'var(--dpm-radius-control)',
                  padding: '1px 7px',
                }}
              >
                {pendingRequestCount}
              </span>
            </div>
            <div style={{ padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {REINFORCEMENT_REQUESTS.map((req) =>
                decisions[req.id] === 'rejected' ? (
                  <div
                    key={req.id}
                    style={{
                      border: '1px solid var(--dpm-border)',
                      borderRadius: 'var(--dpm-radius-card)',
                      background: 'var(--dpm-bg)',
                      padding: '13px 15px',
                    }}
                  >
                    <div style={{ fontSize: 13, color: 'var(--dpm-sub)', lineHeight: 1.55 }}>
                      ปฏิเสธแล้ว — {req.body}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--dpm-mute)', lineHeight: 1.55 }}>
                      ระบบแจ้งผลถึงหัวหน้า Squad ผู้ขอแล้ว ·{' '}
                      <a style={{ fontSize: 12, cursor: 'pointer' }} onClick={() => reconsider(req.id)}>
                        พิจารณาใหม่
                      </a>
                    </div>
                  </div>
                ) : (
                  <RequestCard
                    key={req.id}
                    kind={req.kind}
                    body={req.body}
                    reason={req.reason}
                    age={req.age}
                    impact={req.impact}
                    state={decisions[req.id] === 'approved' ? 'decided' : 'actionable'}
                    onApprove={() => decide(req.id, 'approved')}
                    onReject={() => decide(req.id, 'rejected')}
                  />
                ),
              )}
            </div>
          </div>

          {/* ขวาล่าง: การพัฒนาคน — บนพื้นรอง แยกจากบล็อกงาน ต้องรู้สึกเชิงบวก */}
          <div className="dpm-card" style={{ background: 'var(--dpm-subtle)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--dpm-border)' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>การพัฒนาคน</div>
              <div style={{ marginTop: 3, fontSize: 11, color: 'var(--dpm-sub)' }}>
                ภาพรวมความเป็นอยู่และการเติบโตของทีม ไม่ใช่การประเมินผลงาน
              </div>
            </div>
            <div
              style={{
                padding: '14px 16px',
                background: 'var(--dpm-surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {/* นำด้วยตัวเลขบวก */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>บันทึกรายสัปดาห์</span>
                  <span style={{ fontSize: 13 }}>
                    <b style={{ fontSize: 18, fontWeight: 600 }}>14</b>{' '}
                    <span style={{ color: 'var(--dpm-mute)' }}>/ 16 คน</span>
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 7,
                    height: 6,
                    background: 'var(--dpm-subtle)',
                    borderRadius: 'var(--dpm-radius-bar)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '87.5%',
                      background: 'var(--dpm-green)',
                      borderRadius: 'var(--dpm-radius-bar)',
                    }}
                  />
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--dpm-sub)' }}>
                  เหลือ 2 คนที่ยังไม่ได้คุยสัปดาห์นี้ — คุณไอ (Squad B) · คุณแอล (Squad C)
                </div>
              </div>

              {/* โหลดต่ำเขียนเป็นโอกาส ไม่ใช่ปัญหา */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 9,
                  paddingTop: 12,
                  borderTop: '1px solid var(--dpm-border)',
                }}
              >
                <span style={{ fontSize: 10, color: 'var(--dpm-blue)', paddingTop: 3 }}>○</span>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                  <b>2 คน</b> โหลดต่ำติดต่อกัน 2 เดือน
                  <div style={{ fontSize: 12, color: 'var(--dpm-sub)', marginTop: 3 }}>
                    โอกาส: จับคู่กับงานที่ต่อยอดทักษะที่เขาตั้งเป้าไว้
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                <span style={{ fontSize: 10, color: 'var(--dpm-accent)', paddingTop: 3 }}>◆</span>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                  <b>3 เรื่อง</b> ที่ทีมขอความช่วยเหลือมา
                  <div style={{ fontSize: 12, color: 'var(--dpm-sub)', marginTop: 3 }}>
                    2 เรื่องเป็นการขอคำแนะนำเรื่องแบบ · 1 เรื่องขอปรับตารางส่วนตัว
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 12,
                  borderTop: '1px solid var(--dpm-border)',
                }}
              >
                <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
                  ข้อมูลนี้เห็นได้เฉพาะคุณและเจ้าตัว
                </span>
                <a style={{ fontSize: 12, cursor: 'pointer' }}>ดูทั้งแผนก →</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
