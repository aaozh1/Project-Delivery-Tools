import { useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { Button, PrivacyNotice } from '../components'
import { baht } from '../lib/format'
import { STATUS } from '../lib/status'
import { PROJECTS, SERVICE_LINE_LABELS } from '../data/projects'
import type { ServiceLine } from '../data/projects'

/**
 * S0 · Handoff Form — BD กรอก "สิ่งที่สัญญากับลูกค้า" หลังปิดการขาย ก่อนงานเข้าคิววางแผนของ Senior
 * ตอบคำถาม: เราสัญญาอะไรไว้? (brief §4 ขั้น 0. HANDOFF · ภาคผนวก C: HandoffBrief = Promise List)
 *
 * โครงหน้า: ซ้ายฟอร์ม (~60%) · ขวาแผงสรุปสด (sticky) — ความครบของข้อมูล + เส้นทางข้อมูล + ปุ่มส่ง
 * Promise List คือหัวใจ: ทุกข้อจะกลายเป็นกล่อง "เทียบกับที่ BD สัญญาไว้" ใน S3 (Project Plan)
 * และเป็นฐานให้ระบบเปิด VariationOrder (source: scope_gap) เมื่อแผนไม่ตรงสัญญา
 * ยังไม่มี backend — ส่ง/เก็บร่างเป็น state ภายในหน้า
 */

type PromiseKind = 'deliverable' | 'deadline' | 'revision' | 'other'

interface PromiseItem {
  id: number
  text: string
  kind: PromiseKind
}

const PROMISE_KINDS: readonly { key: PromiseKind; label: string }[] = [
  { key: 'deliverable', label: 'Deliverable' },
  { key: 'deadline', label: 'กำหนดส่ง' },
  { key: 'revision', label: 'รอบแก้' },
  { key: 'other', label: 'อื่น ๆ' },
] as const

/** ตัวอย่างตั้งต้น — คำที่ BD มักสัญญาในใบเสนอราคา (แทนด้วยข้อมูลจริงเมื่อมี data layer) */
const INITIAL_PROMISES: PromiseItem[] = [
  { id: 1, text: '3D perspective 5 ภาพ', kind: 'deliverable' },
  { id: 2, text: 'ส่งงานทั้งหมดภายใน ธ.ค. 2569', kind: 'deadline' },
  { id: 3, text: 'แก้แบบได้ไม่เกิน 2 รอบต่องวด', kind: 'revision' },
]

const LINE_KEYS: readonly ServiceLine[] = ['AR', 'ID', 'HS', 'GR'] as const

/** Squad ที่กำลังดูแลงานแต่ละสาย — สรุปจากทะเบียนโครงการกลาง ใช้เป็นข้อมูลประกอบเท่านั้น */
const SQUADS_BY_LINE: Record<ServiceLine, string[]> = { AR: [], ID: [], HS: [], GR: [] }
for (const p of PROJECTS) {
  if (!SQUADS_BY_LINE[p.line].includes(p.squad)) SQUADS_BY_LINE[p.line].push(p.squad)
}
const ALL_SQUADS = [...new Set(PROJECTS.map((p) => p.squad))].sort()

/* CSS เฉพาะหน้า — จำเป็นสำหรับ pseudo-state (hover/focus/placeholder/disabled)
 * ทุกค่าสีอ้าง var(--dpm-*) ตามกติกา */
const PAGE_CSS = `
.hf-field {
  width: 100%; box-sizing: border-box; height: 34px; padding: 0 12px;
  font-family: inherit; font-size: 14px; color: var(--dpm-ink);
  background: var(--dpm-surface); border: 1px solid var(--dpm-border);
  border-radius: var(--dpm-radius-control); transition: border-color 400ms ease;
}
.hf-field:hover:not(:disabled) { border-color: var(--dpm-ink); }
.hf-field:focus { outline: none; border-color: var(--dpm-accent); }
.hf-field::placeholder { color: var(--dpm-mute); }
.hf-field:disabled { color: var(--dpm-sub); background: var(--dpm-subtle); cursor: not-allowed; }
textarea.hf-field { height: auto; min-height: 76px; padding: 10px 12px; line-height: 1.6; resize: vertical; }
.hf-ghost {
  border: 0; background: transparent; padding: 2px 6px; font-family: inherit;
  font-size: 12px; color: var(--dpm-sub); cursor: pointer;
  border-radius: var(--dpm-radius-control); transition: color 150ms ease;
}
.hf-ghost:hover:not(:disabled) { color: var(--dpm-red); }
fieldset.hf-form { border: 0; padding: 0; margin: 0; min-width: 0; }
fieldset.hf-form:disabled .dpm-chip {
  color: var(--dpm-disabled); background: var(--dpm-subtle);
  border-color: var(--dpm-border); border-style: solid; cursor: not-allowed;
}
fieldset.hf-form:disabled .dpm-chip.is-selected { color: var(--dpm-sub); background: var(--dpm-hover); }
fieldset.hf-form:disabled .hf-ghost { color: var(--dpm-disabled); cursor: not-allowed; }
`

/* ── สไตล์ที่ใช้ซ้ำ ─────────────────────────────────────── */

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: 'var(--dpm-mute)',
  marginBottom: 6,
}

const hintStyle: CSSProperties = { fontSize: 11, color: 'var(--dpm-mute)', lineHeight: 1.5 }

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      {children}
      {hint !== undefined && <div style={{ ...hintStyle, marginTop: 5 }}>{hint}</div>}
    </div>
  )
}

export function HandoffFormPage() {
  /* ── ข้อมูลโครงการ ── */
  const [client, setClient] = useState('')
  const [projectName, setProjectName] = useState('')
  const [line, setLine] = useState<ServiceLine | null>(null)
  const [valueRaw, setValueRaw] = useState('')
  const [squad, setSquad] = useState<string | null>(null)

  /* ── Promise List (หัวใจของหน้า) ── */
  const [promises, setPromises] = useState<PromiseItem[]>(INITIAL_PROMISES)
  const [newText, setNewText] = useState('')
  const [newKind, setNewKind] = useState<PromiseKind>('deliverable')
  const [nextId, setNextId] = useState(INITIAL_PROMISES.length + 1)

  /* ── เงื่อนไขที่ตกลง ── */
  const [revisionRounds, setRevisionRounds] = useState('2')
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')

  /* ── สถานะฟอร์ม (ยังไม่มี backend — state ภายในหน้า) ── */
  const [submitted, setSubmitted] = useState(false)
  const [submittedAt, setSubmittedAt] = useState('')
  const [draftSavedAt, setDraftSavedAt] = useState('')

  const contractValue = Number(valueRaw.replace(/[^\d]/g, '')) || 0
  const rounds = Number(revisionRounds)
  const roundsFilled = revisionRounds.trim() !== '' && Number.isFinite(rounds) && rounds >= 0

  const addPromise = () => {
    const text = newText.trim()
    if (text === '') return
    setPromises((prev) => [...prev, { id: nextId, text, kind: newKind }])
    setNextId((n) => n + 1)
    setNewText('')
  }

  const removePromise = (id: number) => {
    setPromises((prev) => prev.filter((p) => p.id !== id))
  }

  const onNewPromiseKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addPromise()
    }
  }

  const nowLabel = () =>
    new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

  /* ── ความครบของข้อมูล (คำนวณสด synchronous) ── */
  const checklist: { label: string; done: boolean; required: boolean }[] = [
    { label: 'ชื่อลูกค้า', done: client.trim() !== '', required: true },
    { label: 'ชื่อโครงการ', done: projectName.trim() !== '', required: true },
    { label: 'มูลค่าสัญญา', done: contractValue > 0, required: true },
    { label: 'Promise อย่างน้อย 1 รายการ', done: promises.length > 0, required: true },
    { label: 'สายงาน', done: line !== null, required: false },
    { label: 'จำนวนรอบแก้ที่ตกลง', done: roundsFilled, required: false },
    { label: 'วันที่สัญญาส่งมอบ', done: dueDate !== '', required: false },
  ]
  const doneCount = checklist.filter((c) => c.done).length
  const progressPct = Math.round((doneCount / checklist.length) * 100)
  const missingRequired = checklist.filter((c) => c.required && !c.done).map((c) => c.label)
  const readyToSubmit = missingRequired.length === 0

  const headerStatus = submitted ? STATUS.ok : STATUS.warn
  const squadOptions = line !== null && SQUADS_BY_LINE[line].length > 0 ? SQUADS_BY_LINE[line] : ALL_SQUADS

  return (
    <div
      style={{
        maxWidth: 'var(--dpm-page-max-w)',
        margin: '0 auto',
        padding: '0 var(--dpm-page-pad-x)',
      }}
    >
      <style>{PAGE_CSS}</style>

      {/* ── หัวหน้า ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 16,
          padding: '16px 0 14px',
          borderBottom: '1px solid var(--dpm-border)',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="dpm-mono" style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>
              S0
            </span>
            <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>
              Handoff — เราสัญญาอะไรไว้?
            </h1>
          </div>
          <div style={{ marginTop: 5, fontSize: 13, color: 'var(--dpm-sub)', lineHeight: 1.6, maxWidth: 760 }}>
            ข้อมูลชุดนี้จะกลายเป็นกล่อง <b style={{ color: 'var(--dpm-ink)' }}>"เทียบกับที่ BD สัญญาไว้"</b>{' '}
            ในหน้าวางแผนของ Senior — ถ้ากรอกไม่ครบ
            ระบบจะเตือน scope gap ระหว่างแผนกับสัญญาให้ไม่ได้
            และงานที่แถมเกินขอบเขตจะไม่มีหลักฐานให้เปิด VO ย้อนหลัง
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: headerStatus.color,
              transition: 'color 400ms ease',
            }}
          >
            <span style={{ fontSize: 9 }}>{headerStatus.mark}</span>
            {submitted ? 'ส่งเข้าคิววางแผนแล้ว' : 'ร่าง — ยังไม่ส่งเข้าคิว'}
          </span>
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--dpm-mute)' }}>
            ผู้กรอก: คุณบี (BD / Sales)
          </div>
        </div>
      </div>

      {/* ── grid ซ้ายฟอร์ม / ขวาสรุป ────────────────────── */}
      <div
        style={{
          padding: '24px 0 80px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.5fr) minmax(360px,1fr)',
          gap: 32,
          alignItems: 'start',
        }}
      >
        {/* ═══ ซ้าย: ฟอร์ม (ล็อกทั้งชุดหลังส่ง — ถอนกลับมาแก้ได้จากแผงขวา) ═══ */}
        <fieldset className="hf-form" disabled={submitted}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ── ข้อมูลโครงการ ── */}
            <div className="dpm-card">
              <div className="dpm-card__header">
                <span className="dpm-card__title">ข้อมูลโครงการ</span>
                <span className="dpm-card__hint">ตามใบเสนอราคาที่ลูกค้าตกลง</span>
              </div>
              <div className="dpm-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="ชื่อลูกค้า">
                    <input
                      className="hf-field"
                      value={client}
                      placeholder="เช่น บจก. ทองหล่อ ฮอสพิทาลิตี้"
                      onChange={(e) => setClient(e.target.value)}
                    />
                  </Field>
                  <Field label="ชื่อโครงการ">
                    <input
                      className="hf-field"
                      value={projectName}
                      placeholder="เช่น Café ทองหล่อ ชั้น 2"
                      onChange={(e) => setProjectName(e.target.value)}
                    />
                  </Field>
                </div>

                <Field label="สายงาน">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {LINE_KEYS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        className={`dpm-chip${line === k ? ' is-selected' : ''}`}
                        aria-pressed={line === k}
                        onClick={() => setLine((cur) => (cur === k ? null : k))}
                      >
                        <span className="dpm-mono" style={{ fontSize: 11 }}>{k}</span>
                        {SERVICE_LINE_LABELS[k]}
                      </button>
                    ))}
                  </div>
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field
                    label="มูลค่าสัญญา (บาท)"
                    hint={
                      contractValue > 0
                        ? `อ่านว่า ${baht(contractValue)}`
                        : 'ยอดตามใบเสนอราคา ไม่รวม VAT'
                    }
                  >
                    <input
                      className="hf-field"
                      inputMode="numeric"
                      value={valueRaw}
                      placeholder="เช่น 3000000"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                      onChange={(e) => setValueRaw(e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Squad ที่คาดว่าจะรับ (ข้อมูลประกอบ — ไม่บังคับ)"
                    hint="การมอบหมายจริงเป็นสิทธิ์ของหัวหน้าแผนกตอนรีวิวแผน — ระบุไว้ช่วยให้จัดคิวเร็วขึ้น"
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {squadOptions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`dpm-chip${squad === s ? ' is-selected' : ''}`}
                          aria-pressed={squad === s}
                          onClick={() => setSquad((cur) => (cur === s ? null : s))}
                        >
                          Squad {s}
                        </button>
                      ))}
                      {squad === null && (
                        <span className="dpm-chip is-empty">ยังไม่ระบุ</span>
                      )}
                    </div>
                  </Field>
                </div>
              </div>
            </div>

            {/* ── Promise List — หัวใจของหน้า (กล่องเน้นสูงสุดกล่องเดียวของหน้านี้) ── */}
            <div className="dpm-card dpm-card--critical">
              <div className="dpm-card__header">
                <span className="dpm-card__title">Promise List — สิ่งที่สัญญากับลูกค้า</span>
                <span className="dpm-card__hint">{promises.length} รายการ</span>
                <span style={{ flex: 1 }} />
                <span style={hintStyle}>ทุกข้อจะถูกเทียบกับแผนของ Senior อัตโนมัติ</span>
              </div>
              <div>
                {promises.length === 0 && (
                  <div
                    style={{
                      margin: '14px 18px',
                      padding: '14px 16px',
                      border: '1px dashed var(--dpm-border)',
                      borderRadius: 'var(--dpm-radius-control)',
                      fontSize: 13,
                      color: 'var(--dpm-sub)',
                      lineHeight: 1.6,
                    }}
                  >
                    ยังไม่มีรายการสัญญา — เพิ่มอย่างน้อย 1 รายการจากช่องด้านล่าง
                    (คัดจากใบเสนอราคาหรืออีเมลที่ตกลงกับลูกค้า) จึงจะส่งเข้าคิววางแผนได้
                  </div>
                )}
                {promises.map((p, i) => (
                  <div
                    key={p.id}
                    className="dpm-table-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '28px 96px minmax(0,1fr) 44px',
                      alignItems: 'center',
                      gap: 12,
                      padding: '11px 18px',
                    }}
                  >
                    <span className="dpm-mono" style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--dpm-sub)',
                        background: 'var(--dpm-subtle)',
                        borderRadius: 'var(--dpm-radius-badge)',
                        padding: '3px 8px',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {PROMISE_KINDS.find((k) => k.key === p.kind)?.label}
                    </span>
                    <span style={{ fontSize: 14, lineHeight: 1.5 }}>{p.text}</span>
                    <button
                      type="button"
                      className="hf-ghost"
                      aria-label={`ลบรายการ ${p.text}`}
                      onClick={() => removePromise(p.id)}
                    >
                      ลบ
                    </button>
                  </div>
                ))}

                {/* แถวเพิ่มรายการใหม่ */}
                <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {PROMISE_KINDS.map((k) => (
                      <button
                        key={k.key}
                        type="button"
                        className={`dpm-chip${newKind === k.key ? ' is-selected' : ''}`}
                        aria-pressed={newKind === k.key}
                        onClick={() => setNewKind(k.key)}
                      >
                        {k.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      className="hf-field"
                      value={newText}
                      placeholder='พิมพ์คำสัญญาตามที่คุยกับลูกค้า เช่น "walkthrough animation 1 ตัว" แล้วกด Enter'
                      onChange={(e) => setNewText(e.target.value)}
                      onKeyDown={onNewPromiseKey}
                    />
                    <Button variant="secondary" disabled={newText.trim() === ''} onClick={addPromise}>
                      + เพิ่ม
                    </Button>
                  </div>
                  <span style={hintStyle}>
                    เขียนเป็นข้อสั้น ๆ ข้อละเรื่อง ระบุจำนวนชัด — ระบบเทียบ "5 ภาพ" กับแผนได้
                    แต่เทียบ "ภาพสวย ๆ หลายมุม" ไม่ได้
                  </span>
                </div>
              </div>
            </div>

            {/* ── เงื่อนไขที่ตกลงกับลูกค้า ── */}
            <div className="dpm-card">
              <div className="dpm-card__header">
                <span className="dpm-card__title">เงื่อนไขที่ตกลงกับลูกค้า</span>
                <span className="dpm-card__hint">กลายเป็นโควตาตั้งต้นของทุกงวดในแผน</span>
              </div>
              <div className="dpm-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32, flexWrap: 'wrap' }}>
                  <Field
                    label="จำนวนรอบแก้ต่องวด"
                    hint="เกินโควตานี้ = เข้าเกณฑ์เปิด VO (revision_over_quota)"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        className="dpm-input"
                        inputMode="numeric"
                        value={revisionRounds}
                        onChange={(e) => setRevisionRounds(e.target.value.replace(/[^\d]/g, ''))}
                      />
                      <span style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>รอบ</span>
                    </div>
                  </Field>
                  <Field label="วันที่สัญญาส่งมอบงานทั้งหมด" hint="Senior ใช้เป็นเส้นตายรวมตอนวางไทม์ไลน์">
                    <input
                      type="date"
                      className="hf-field"
                      style={{ width: 190 }}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="หมายเหตุเงื่อนไขพิเศษ (ไม่บังคับ)">
                  <textarea
                    className="hf-field"
                    value={note}
                    placeholder="เช่น ลูกค้าขอประชุมหน้างานทุก 2 สัปดาห์ · งวดสุดท้ายจ่ายหลังตรวจรับ 30 วัน · มีผู้รับเหมาของลูกค้าเอง"
                    onChange={(e) => setNote(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </div>
        </fieldset>

        {/* ═══ ขวา: แผงสรุป (sticky) ═══ */}
        <div style={{ position: 'sticky', top: 96, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* ── ความครบของข้อมูล ── */}
          <div className="dpm-card">
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderBottom: '1px solid var(--dpm-border)',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600 }}>ความครบของข้อมูล</span>
              <span style={{ fontSize: 13, color: 'var(--dpm-sub)', fontVariantNumeric: 'tabular-nums' }}>
                {doneCount}/{checklist.length} · {progressPct}%
              </span>
            </div>
            <div style={{ padding: '14px 18px 16px' }}>
              <div
                style={{
                  position: 'relative',
                  height: 8,
                  background: 'var(--dpm-subtle)',
                  borderRadius: 'var(--dpm-radius-bar)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${progressPct}%`,
                    background: 'var(--dpm-ink)',
                    borderRadius: 'var(--dpm-radius-bar)',
                    transition: 'width 260ms ease',
                  }}
                />
              </div>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {checklist.map((c) => (
                  <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span
                      aria-label={c.done ? 'กรอกแล้ว' : 'ยังไม่กรอก'}
                      style={{
                        fontSize: 10,
                        width: 12,
                        color: c.done ? 'var(--dpm-green)' : 'var(--dpm-mute)',
                        transition: 'color 400ms ease',
                      }}
                    >
                      {c.done ? '✓' : '○'}
                    </span>
                    <span style={{ color: c.done ? 'var(--dpm-ink)' : 'var(--dpm-sub)' }}>{c.label}</span>
                    <span style={{ flex: 1 }} />
                    {c.required && !c.done && (
                      <span style={{ fontSize: 11, color: 'var(--dpm-yellow)', fontWeight: 600 }}>
                        ต้องมีก่อนส่ง
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── ข้อมูลนี้ไปไหนต่อ ── */}
          <div className="dpm-card">
            <div className="dpm-card__header">
              <span className="dpm-card__title" style={{ fontSize: 14 }}>ข้อมูลนี้ไปไหนต่อ</span>
            </div>
            <div className="dpm-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                {
                  no: '1',
                  text: 'ส่งเข้าคิววางแผน — Senior ของ Squad ที่รับงานเปิดหน้า Project Plan (S3) และเห็น Promise List ชุดนี้ทั้งชุด',
                },
                {
                  no: '2',
                  text: 'ระหว่างวางแผน ระบบเทียบแผนกับสัญญาอัตโนมัติ — Deliverable ขาด กำหนดส่งเลย หรือโควตาแก้ไม่ตรง จะขึ้นเป็นประเด็นในกล่อง "เทียบกับที่ BD สัญญาไว้"',
                },
                {
                  no: '3',
                  text: 'งานที่หลุดจากสัญญาหลังเริ่มทำ มีหลักฐานให้เปิด VO (source: scope_gap) — ไม่กลายเป็นงานแถมเงียบ ๆ',
                },
              ].map((step) => (
                <div key={step.no} style={{ display: 'flex', gap: 10 }}>
                  <span
                    className="dpm-mono"
                    style={{
                      flexShrink: 0,
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      color: 'var(--dpm-sub)',
                      background: 'var(--dpm-subtle)',
                      borderRadius: 'var(--dpm-radius-badge)',
                    }}
                  >
                    {step.no}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.6 }}>{step.text}</span>
                </div>
              ))}
            </div>
          </div>

          <PrivacyNotice
            variant="positive"
            text="คุณเห็นเฉพาะโครงการของลูกค้าที่คุณดูแล — ฟอร์มนี้หลังส่งจะเปิดให้ Senior ของ Squad ที่รับงาน หัวหน้าแผนก และ Head of Project Delivery · BD ไม่เห็นตัวเลขต้นทุนภายใน (COL/Margin) ของแผนที่ตามมา"
          />

          {/* ── ส่ง / เก็บร่าง ── */}
          {submitted ? (
            <div
              className="dpm-card"
              style={{ borderColor: 'var(--dpm-green)', padding: '14px 16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--dpm-green)' }}>●</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  ส่งเข้าคิววางแผนแล้ว · {submittedAt} น.
                </span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.6 }}>
                ฟอร์มถูกล็อกไว้เพื่อให้แผนของ Senior อ้างอิงชุดสัญญาเดียวกัน —
                ยังแก้ได้ตราบใดที่ Senior ยังไม่เริ่มวางแผน
              </div>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Button variant="secondary" onClick={() => setSubmitted(false)}>
                  ถอนกลับมาแก้
                </Button>
                <span style={hintStyle}>ถ้าแผนเริ่มแล้ว: แจ้ง Senior เปิด VO แทน</span>
              </div>
            </div>
          ) : (
            <div className="dpm-card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Button
                  variant="primary"
                  disabled={!readyToSubmit}
                  onClick={() => {
                    setSubmitted(true)
                    setSubmittedAt(nowLabel())
                  }}
                >
                  ส่งเข้าคิววางแผน
                </Button>
                <Button variant="secondary" onClick={() => setDraftSavedAt(nowLabel())}>
                  เก็บเป็นร่าง
                </Button>
              </div>
              {/* ปุ่มปิดใช้งานต้องมีคำอธิบายข้างปุ่มเสมอ + ทางออก */}
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 7,
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: readyToSubmit ? 'var(--dpm-green)' : 'var(--dpm-sub)',
                  transition: 'color 400ms ease',
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    paddingTop: 2,
                    color: readyToSubmit ? 'var(--dpm-green)' : 'var(--dpm-yellow)',
                  }}
                >
                  {readyToSubmit ? '✓' : '◆'}
                </span>
                <span>
                  {readyToSubmit
                    ? 'ครบขั้นต่ำแล้ว — ส่งได้เลย ส่วนที่เหลือเพิ่มทีหลังได้ก่อน Senior เริ่มวางแผน'
                    : `ส่งได้เมื่อกรอกครบขั้นต่ำ — ยังขาด: ${missingRequired.join(' · ')} · ระหว่างนี้เก็บเป็นร่างไว้ก่อนได้`}
                </span>
              </div>
              {draftSavedAt !== '' && (
                <div style={{ ...hintStyle, marginTop: 8 }}>
                  บันทึกร่างล่าสุด {draftSavedAt} น. — ร่างเห็นเฉพาะคุณ ยังไม่เข้าคิวของ Senior
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
