import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AllocationCell, Button, ConstraintNotice } from '../components'
import { baht, personWeeks, snapQuarter } from '../lib/format'
import { STATUS } from '../lib/status'
import {
  COST_RATE,
  INITIAL_GRID,
  LAST_WEEK_GRID,
  MEMBERS,
  MOVED_OUT_NOTE,
  PROJECTS,
} from './allocate/data'
import { tryApi } from '../api/client'

/* สัปดาห์ปัจจุบัน/ก่อนหน้าของ mock — เมื่อมีปฏิทินจริงค่านี้มาจากระบบ */
const CURRENT_WEEK = 32
const PREV_WEEK = 31

interface AllocResponse {
  week: number
  entries: Array<{ member: string; projectCode: string; personWeeks: number }>
}

/** แปลงรายการจาก API เป็น grid ตามลำดับ MEMBERS × PROJECTS */
function gridFromEntries(entries: AllocResponse['entries']): number[][] {
  const grid = MEMBERS.map(() => PROJECTS.map(() => 0))
  for (const e of entries) {
    const i = MEMBERS.findIndex((m) => m.name === e.member)
    const j = PROJECTS.findIndex((p) => p.code === e.projectCode)
    if (i >= 0 && j >= 0) grid[i][j] = snapQuarter(e.personWeeks)
  }
  return grid
}

function entriesFromGrid(grid: number[][]): AllocResponse['entries'] {
  return grid.flatMap((row, i) =>
    row.map((pw, j) => ({ member: MEMBERS[i].name, projectCode: PROJECTS[j].code, personWeeks: pw })),
  )
}

/**
 * S6 — จัดสรรกำลังคน (Allocate Capacity)
 * ผู้ใช้: หัวหน้า Squad สัปดาห์ละครั้ง (ศุกร์) · เป้าหมาย: จัดสรรทั้ง Squad เสร็จใน 3 นาที
 * แหล่งข้อมูลเดียวที่ใช้คำนวณต้นทุนค่าแรงจริง — ความเร็วในการกรอกสำคัญกว่าความสวย
 */

/** grid เดียวกันทุกแถวรวมแถบสรุป เพื่อให้คอลัมน์ตรงกันเป๊ะ (ตามสเปก handoff §3) */
const GRID_COLS = '212px 116px repeat(3, minmax(158px,1fr)) 100px'
const EPS = 0.0001
const CELL_BORDER = '1px solid var(--dpm-border)'

/** ตำแหน่งของข้อเสนอที่ 1: คุณดี (แถว 2) × ID-2026-011 (คอลัมน์ 2) เพิ่มให้ 0.25 */
const SUGGESTION_ROW = 2
const SUGGESTION_COL = 2

const weekNavBtn: React.CSSProperties = {
  width: 26,
  padding: '3px 0',
  textAlign: 'center',
  fontSize: 13,
  fontFamily: 'inherit',
  color: 'var(--dpm-sub)',
  background: 'none',
  border: 'none',
  borderRadius: 'var(--dpm-radius-badge)',
  cursor: 'pointer',
}

export function AllocateCapacityPage() {
  /** grid[member][project] — ค่า 0–1 ขั้น 0.25 ตามสเปก State Management */
  const [grid, setGrid] = useState<number[][]>(() => INITIAL_GRID.map((row) => [...row]))
  const [flash, setFlash] = useState(false)
  const [suggestionDone, setSuggestionDone] = useState(false)
  const [hodSent, setHodSent] = useState(false)
  const [constraintPending, setConstraintPending] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  /* วูบตัวเลขต้นทุน: setTimeout เดียว 900ms ยกเลิกด้วย clearTimeout เมื่อเปลี่ยนซ้ำ — ห้าม count-up */
  const flashTimer = useRef<number | undefined>(undefined)
  const pulse = () => {
    window.clearTimeout(flashTimer.current)
    setFlash(true)
    flashTimer.current = window.setTimeout(() => setFlash(false), 900)
  }
  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  /* โหลดการจัดสรรสัปดาห์นี้จากเซิร์ฟเวอร์ (ไม่มีเซิร์ฟเวอร์ = ใช้ค่า mock เดิม) */
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await tryApi<AllocResponse>(`/api/allocations?week=${CURRENT_WEEK}`)
      if (!cancelled && res && res.entries.length > 0) setGrid(gridFromEntries(res.entries))
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setCell = (row: number, col: number, value: number) => {
    const v = snapQuarter(value)
    setGrid((g) => g.map((r, i) => (i === row ? r.map((x, j) => (j === col ? v : x)) : r)))
    setConfirmed(false)
    pulse()
    // เขียนลงเซิร์ฟเวอร์ทันทีทีละช่อง (WeeklyAllocation คือแหล่งเดียวของ COL จริง)
    void tryApi('/api/allocations', {
      method: 'PUT',
      body: JSON.stringify({
        week: CURRENT_WEEK,
        member: MEMBERS[row].name,
        projectCode: PROJECTS[col].code,
        personWeeks: v,
      }),
    })
  }

  /* เติมทั้งตารางในคลิกเดียว — ปกติสัปดาห์ใหม่เปลี่ยนจากเดิมแค่ ~20% */
  const copyLastWeek = () => {
    void (async () => {
      const res = await tryApi<AllocResponse>(`/api/allocations?week=${PREV_WEEK}`)
      const next =
        res && res.entries.length > 0 ? gridFromEntries(res.entries) : LAST_WEEK_GRID.map((row) => [...row])
      setGrid(next)
      setConfirmed(false)
      pulse()
      void tryApi('/api/allocations/bulk', {
        method: 'PUT',
        body: JSON.stringify({ week: CURRENT_WEEK, entries: entriesFromGrid(next) }),
      })
    })()
  }

  const applySuggestion = () => {
    if (suggestionDone) return
    setSuggestionDone(true)
    setCell(
      SUGGESTION_ROW,
      SUGGESTION_COL,
      snapQuarter(Math.min(1, (grid[SUGGESTION_ROW][SUGGESTION_COL] ?? 0) + 0.25)),
    )
  }

  /* ── ค่าที่คำนวณสด (synchronous — ห้ามปุ่มคำนวณ ห้าม debounce) ───────────── */

  const rows = MEMBERS.map((m, i) => {
    const total = snapQuarter(grid[i].reduce((a, b) => a + b, 0))
    const over = total > 1 + EPS
    const overCap = !over && total > m.capacity + EPS
    const underCap = !over && !overCap && total < m.capacity - EPS
    const free = Math.max(0, m.capacity - total)
    const meta = over ? STATUS.critical : overCap ? STATUS.warn : underCap ? STATUS.low : STATUS.ok
    /* ตอนพอดี capacity ตัวเลขเป็นหมึกดำคู่ ● ตาม prototype (สีสถานะเต็มใช้เฉพาะตอนมีเรื่องต้องรู้) */
    const totalColor =
      over || overCap || underCap ? meta.color : 'var(--dpm-ink)'
    const capText = over
      ? `เกินเต็มสัปดาห์ — ลดลง ${personWeeks(total - 1)}`
      : overCap
        ? `เกินกำลังที่ว่างจริง ${personWeeks(m.capacity)}`
        : `กำลังรับได้ ${personWeeks(m.capacity)}`
    const capColor = over ? STATUS.critical.color : overCap ? STATUS.warn.color : 'var(--dpm-mute)'
    return { member: m, total, over, overCap, free, meta, totalColor, capText, capColor }
  })

  const colStats = PROJECTS.map((p, j) => {
    const colPW = snapQuarter(grid.reduce((a, row) => a + (row[j] ?? 0), 0))
    /* ต้นทุนจริง = Σ(pw × เรตต้นทุนรวมภาระตามตำแหน่ง) — ดู comment ของ COST_RATE ใน allocate/data.ts */
    const cost = grid.reduce((a, row, i) => a + (row[j] ?? 0) * COST_RATE[MEMBERS[i].role], 0)
    const usedPct = Math.round(((p.spent + cost) / p.budget) * 100)
    const budgetMeta = usedPct >= 90 ? STATUS.critical : usedPct >= 60 ? STATUS.warn : STATUS.ok
    const budgetText = usedPct >= 90 ? 'เกือบเต็มงบ' : usedPct >= 60 ? 'ใกล้เต็ม' : 'ปกติ'
    return { project: p, colPW, cost, usedPct, budgetMeta, budgetText }
  })

  const grandPW = snapQuarter(rows.reduce((a, r) => a + r.total, 0))
  const grandCost = colStats.reduce((a, s) => a + s.cost, 0)
  const problems = rows.filter((r) => r.over).length
  const warns = rows.filter((r) => r.overCap).length

  const statusLine = problems
    ? `มี ${problems} คนที่จัดเกิน 1.00 คน-สัปดาห์ — แก้ให้ครบก่อนยืนยัน`
    : warns
      ? `มี ${warns} คนที่จัดเกินกำลังที่ว่างจริง (วันลา) — ยืนยันได้แต่ต้นทุนจะคลาดเคลื่อน`
      : 'กรอกครบทุกคนแล้ว พร้อมยืนยัน'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dpm-bg)' }}>
      {/* ── หัวบน: ชื่อหน้า · ตัวเลือกสัปดาห์ · ปุ่มคัดลอก ─────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'var(--dpm-bg)',
          borderBottom: CELL_BORDER,
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
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>
              จัดสรรกำลังคน — Squad A (คุณเอ)
            </h1>
            <div style={{ marginTop: 3, fontSize: 12, color: 'var(--dpm-sub)' }}>
              สมาชิก 4 คน · รับผิดชอบ 3 โครงการ · แผนก ID
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: CELL_BORDER,
              borderRadius: 'var(--dpm-radius-control)',
              background: 'var(--dpm-surface)',
              padding: '4px 4px 4px 12px',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>สัปดาห์ 32</span>
            <span style={{ fontSize: 12, color: 'var(--dpm-sub)', whiteSpace: 'nowrap' }}>
              4–8 ส.ค. 2569
            </span>
            <button type="button" aria-label="สัปดาห์ก่อนหน้า" style={weekNavBtn}>
              ‹
            </button>
            <button type="button" aria-label="สัปดาห์ถัดไป" style={weekNavBtn}>
              ›
            </button>
            <button
              type="button"
              style={{
                fontSize: 12,
                fontFamily: 'inherit',
                color: 'var(--dpm-sub)',
                background: 'none',
                border: 'none',
                borderLeft: CELL_BORDER,
                borderRadius: 0,
                padding: '3px 10px',
                cursor: 'pointer',
              }}
            >
              วันนี้
            </button>
          </div>
          <Button variant="primary" onClick={copyLastWeek}>
            คัดลอกจากสัปดาห์ก่อน
          </Button>
        </div>
      </div>

      <div
        style={{
          maxWidth: 'var(--dpm-page-max-w)',
          margin: '0 auto',
          padding: '20px var(--dpm-page-pad-x) 80px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* ── แถบข้อจำกัดพร้อมทางออก — อ่านเป็นการอธิบายกติกา ไม่ใช่การบล็อก ── */}
        <ConstraintNotice
          text="จัดสรรได้เฉพาะสมาชิก Squad A — ถ้าต้องการคนจาก Squad อื่น หัวหน้าแผนกเป็นผู้ย้ายให้"
          how={
            constraintPending
              ? 'ส่งคำขอแล้ว — รอหัวหน้าแผนกพิจารณา ผลจะแจ้งกลับทางการแจ้งเตือน'
              : 'ระบุคนและช่วงเวลาที่ต้องการ แล้วส่งคำขอให้หัวหน้าแผนกเป็นผู้ย้ายเข้า Squad A'
          }
          cta={constraintPending ? 'ส่งคำขอแล้ว · รออนุมัติ' : 'ส่งคำขอถึงหัวหน้าแผนก'}
          state={constraintPending ? 'pending' : 'normal'}
          onAction={() => setConstraintPending(true)}
        />

        {/* ── ตารางจัดสรร ─────────────────────────────────────────────────── */}
        <div className="dpm-card">
          {/* หัวตาราง */}
          <div
            className="dpm-table-head"
            style={{ display: 'grid', gridTemplateColumns: GRID_COLS }}
          >
            <div style={{ padding: '10px 16px', fontSize: 11 }}>สมาชิก</div>
            <div
              style={{ padding: '10px 12px', fontSize: 11, textAlign: 'right', borderLeft: CELL_BORDER }}
            >
              รวมสัปดาห์นี้
            </div>
            {PROJECTS.map((p) => (
              <div key={p.code} style={{ padding: '10px 12px', borderLeft: CELL_BORDER, minWidth: 0 }}>
                <div
                  className="dpm-mono"
                  style={{ fontSize: 12, fontWeight: 500, color: 'var(--dpm-ink)' }}
                >
                  {p.code}
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
                  {p.name} · งวด {p.phase}
                </div>
              </div>
            ))}
            <div
              style={{ padding: '10px 12px', fontSize: 11, textAlign: 'right', borderLeft: CELL_BORDER }}
            >
              ว่าง
            </div>
          </div>

          {/* แถวสมาชิก */}
          {rows.map((r, i) => (
            <div
              key={r.member.name}
              style={{
                display: 'grid',
                gridTemplateColumns: GRID_COLS,
                borderBottom: CELL_BORDER,
                background: r.over ? 'var(--dpm-tint-red)' : 'var(--dpm-surface)',
                transition: 'background 200ms ease',
              }}
            >
              <div style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{r.member.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>{r.member.role}</span>
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color:
                      r.member.noteKind === 'leave'
                        ? STATUS.warn.color
                        : r.member.noteKind === 'new'
                          ? 'var(--dpm-accent)'
                          : 'var(--dpm-mute)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span style={{ fontSize: 9 }}>
                    {r.member.noteKind === 'leave'
                      ? STATUS.warn.mark
                      : r.member.noteKind === 'new'
                        ? '+'
                        : '·'}
                  </span>
                  {r.member.note}
                </div>
              </div>

              <div style={{ padding: 12, borderLeft: CELL_BORDER, textAlign: 'right' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'flex-end',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 10, color: r.totalColor }}>{r.meta.mark}</span>
                  <span style={{ fontSize: 20, fontWeight: 600, color: r.totalColor }}>
                    {personWeeks(r.total)}
                  </span>
                </div>
                <div style={{ marginTop: 3, fontSize: 11, color: r.capColor }}>{r.capText}</div>
              </div>

              {PROJECTS.map((p, j) => (
                <div
                  key={p.code}
                  style={{
                    padding: 12,
                    borderLeft: CELL_BORDER,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <AllocationCell
                    value={grid[i][j] ?? 0}
                    state={r.over ? 'error' : 'normal'}
                    label={`จัดสรร${r.member.name}ให้ ${p.code}`}
                    onChange={(v) => setCell(i, j, v)}
                  />
                </div>
              ))}

              {/* คอลัมน์ว่าง: เศษกำลังที่เหลือเป็นน้ำเงิน 600 · ไม่เหลือ = — จาง */}
              <div
                style={{
                  padding: 12,
                  borderLeft: CELL_BORDER,
                  textAlign: 'right',
                  fontSize: 14,
                  color: r.free > EPS ? STATUS.low.color : 'var(--dpm-mute)',
                  fontWeight: r.free > EPS ? 600 : 400,
                }}
              >
                {r.free > EPS ? personWeeks(r.free) : '—'}
              </div>
            </div>
          ))}

          {/* แถบสรุป 1 — คน-สัปดาห์รวมต่อโครงการ */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: GRID_COLS,
              borderBottom: CELL_BORDER,
              background: 'var(--dpm-bg)',
            }}
          >
            <div style={{ padding: '9px 16px', fontSize: 12, color: 'var(--dpm-sub)' }}>
              คน-สัปดาห์รวม
            </div>
            <div
              style={{
                padding: '9px 12px',
                borderLeft: CELL_BORDER,
                textAlign: 'right',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {personWeeks(grandPW)}
            </div>
            {colStats.map((s) => (
              <div
                key={s.project.code}
                style={{ padding: '9px 12px', borderLeft: CELL_BORDER, fontSize: 14, fontWeight: 600 }}
              >
                {personWeeks(s.colPW)}
              </div>
            ))}
            <div style={{ borderLeft: CELL_BORDER }} />
          </div>

          {/* แถบสรุป 2 — ต้นทุนสัปดาห์นี้ (ตัวเลขวูบเป็นสีเน้น 900ms แล้วกลับดำ เมื่อค่าเปลี่ยน) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: GRID_COLS,
              borderBottom: CELL_BORDER,
              background: 'var(--dpm-bg)',
            }}
          >
            <div style={{ padding: '9px 16px', fontSize: 12, color: 'var(--dpm-sub)' }}>
              ต้นทุนสัปดาห์นี้
            </div>
            <div
              style={{
                padding: '9px 12px',
                borderLeft: CELL_BORDER,
                textAlign: 'right',
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {baht(grandCost)}
            </div>
            {colStats.map((s) => (
              <div
                key={s.project.code}
                style={{
                  padding: '9px 12px',
                  borderLeft: CELL_BORDER,
                  fontSize: 16,
                  fontWeight: 600,
                  transition: 'color 400ms ease',
                  color: flash ? 'var(--dpm-accent)' : 'var(--dpm-ink)',
                }}
              >
                {baht(s.cost)}
              </div>
            ))}
            <div style={{ borderLeft: CELL_BORDER }} />
          </div>

          {/* แถบสรุป 3 — สะสม/งบของงวด: % + แถบ + สถานะ (≥90 แดง ▲ / ≥60 เหลือง ◆ / เขียว ●) */}
          <div style={{ display: 'grid', gridTemplateColumns: GRID_COLS, background: 'var(--dpm-bg)' }}>
            <div style={{ padding: '9px 16px 14px', fontSize: 12, color: 'var(--dpm-sub)' }}>
              สะสม / งบของงวด
            </div>
            <div style={{ borderLeft: CELL_BORDER }} />
            {colStats.map((s) => (
              <div key={s.project.code} style={{ padding: '9px 12px 14px', borderLeft: CELL_BORDER }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: s.budgetMeta.color }}>
                    {s.usedPct}%
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>/ 100%</span>
                </div>
                <div
                  style={{
                    marginTop: 5,
                    height: 6,
                    background: 'var(--dpm-border)',
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
                      width: `${Math.min(100, s.usedPct)}%`,
                      background: s.budgetMeta.color,
                      transition: 'width 260ms ease',
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    color: s.budgetMeta.color,
                  }}
                >
                  <span style={{ fontSize: 9 }}>{s.budgetMeta.mark}</span>
                  {s.budgetText}
                </div>
              </div>
            ))}
            <div style={{ borderLeft: CELL_BORDER }} />
          </div>
        </div>

        {/* บรรทัดใต้ตาราง: คนย้ายออก + วิธีใช้ช่อง */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            fontSize: 11,
            color: 'var(--dpm-mute)',
          }}
        >
          <span>{MOVED_OUT_NOTE}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 14, whiteSpace: 'nowrap' }}>
            <span>คลิกช่องสี่เหลี่ยมเพื่อกำหนดค่า · คลิกซ้ำเพื่อล้าง</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  background: 'var(--dpm-ink)',
                  borderRadius: 'var(--dpm-radius-bar)',
                  display: 'inline-block',
                }}
              />
              0.25 ต่อช่อง
            </span>
          </span>
        </div>

        {/* ── กล่องล่าง: ข้อเสนอ (ซ้าย) + สถานะการกรอก (ขวา) ─────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) 340px',
            gap: 16,
            alignItems: 'start',
          }}
        >
          <div className="dpm-card">
            <div
              style={{
                padding: '11px 16px',
                borderBottom: CELL_BORDER,
                background: 'var(--dpm-subtle)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ข้อเสนอ
            </div>
            {/* ข้อเสนอ 1 — อยู่ใน Squad เดียวกัน ลงมือได้ทันที */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1fr) 150px',
                gap: 12,
                alignItems: 'center',
                padding: '13px 16px',
                borderBottom: CELL_BORDER,
              }}
            >
              <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                คุณดี ว่าง <b>0.25 คน-สัปดาห์</b> —{' '}
                <span className="dpm-mono" style={{ fontSize: 12 }}>
                  ID-2026-011
                </span>{' '}
                งวด 2 ต้องการคนช่วยสัปดาห์นี้
                <div style={{ fontSize: 12, color: 'var(--dpm-sub)', marginTop: 3 }}>
                  อยู่ใน Squad A จัดสรรได้ทันที ไม่ต้องขออนุมัติ
                </div>
              </div>
              <Button variant="primary" onClick={applySuggestion} disabled={suggestionDone}>
                {suggestionDone ? 'จัดแล้ว ✓' : 'จัดให้ 0.25'}
              </Button>
            </div>
            {/* ข้อเสนอ 2 — ต้องข้าม Squad จึงต้องส่งเรื่องถึง HoD */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1fr) 150px',
                gap: 12,
                alignItems: 'center',
                padding: '13px 16px',
              }}
            >
              <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                คุณซี ยังไม่เคยผ่านงาน <b>Site Supervision</b> และ Squad A ไม่มีงาน Site ใน 6
                เดือนข้างหน้า
                <div style={{ fontSize: 12, color: 'var(--dpm-sub)', marginTop: 3 }}>
                  ต้องทำ: ขอหัวหน้าแผนกส่งไปร่วมงาน Site ของ Squad อื่นชั่วคราว — คุณส่งเรื่องได้
                  แต่อนุมัติที่ HoD
                </div>
              </div>
              <Button variant="secondary" onClick={() => setHodSent(true)} disabled={hodSent}>
                {hodSent ? 'ส่งเรื่องแล้ว ✓' : 'ส่งเรื่องถึง HoD'}
              </Button>
            </div>
          </div>

          <div className="dpm-card" style={{ padding: '14px 16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>สถานะการกรอก</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: 'var(--dpm-mute)',
                }}
              >
                <span className="dpm-live-dot" style={{ display: 'inline-block' }} />
                {flash ? 'กำลังคำนวณ' : 'สด'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.6 }}>{statusLine}</div>
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: CELL_BORDER,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              {/* ปุ่มปิดใช้งานต้องมีคำอธิบายข้างปุ่มเสมอว่าทำไมกดไม่ได้ + ต้องแก้เท่าไร */}
              <span
                style={{
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: problems ? 'var(--dpm-red)' : 'var(--dpm-sub)',
                }}
              >
                {problems
                  ? `กดไม่ได้ — มี ${problems} คนเกิน 1.00 ลดช่องที่เป็นสีแดงลงก่อน`
                  : confirmed
                    ? 'ยืนยันสัปดาห์ 32 แล้ว — แก้ไขได้จนถึงปิดรอบ'
                    : 'ปิดรอบ ศุกร์ 17:00'}
              </span>
              <Button
                variant="primary"
                disabled={problems > 0 || confirmed}
                onClick={() => {
                  setConfirmed(true)
                  // บันทึกการยืนยันรอบสัปดาห์ลง Audit Log ฝั่งเซิร์ฟเวอร์
                  void tryApi('/api/allocations/confirm', {
                    method: 'POST',
                    body: JSON.stringify({ week: CURRENT_WEEK }),
                  })
                }}
              >
                {confirmed ? 'ยืนยันแล้ว ✓' : 'ยืนยันสัปดาห์นี้'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
