import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Button, PrivacyNotice, SkillTag } from '../components'
import { personWeeks } from '../lib/format'

/**
 * S13 — บันทึกงานรายสัปดาห์ (Weekly Log)
 * หน้าเทียบ 2 เวอร์ชันเหมือน prototype: มือถือ 390×844 (กรอบ radius 28px) และเดสก์ท็อป
 * ใช้ state ชุดเดียวกันร่วมกันทั้งสองเวอร์ชัน — ติ๊กในกรอบมือถือ เดสก์ท็อปขยับตาม
 *
 * หลักการจาก handoff: ข้อมูลนี้ใช้เพื่อการพัฒนาอาชีพของเจ้าตัวเป็นหลัก ไม่ใช่เพื่อรายงานเจ้านาย
 * — ทุกคำถามเป็นคำพูดจริง ไม่มี label แข็ง ๆ ไม่มีดาวแดงบังคับกรอก
 */

type WorkKind = 'plan' | 'client' | 'rework' | 'oos'
type EffortAnswer = 'less' | 'same' | 'more'
type Variant = 'mobile' | 'desktop'

interface Task {
  label: string
  done: boolean
}

interface ProjectLog {
  code: string
  name: string
  phase: number
  /** คน-สัปดาห์ที่ถูกจัดสรรไว้ (ทวีคูณ 0.25) */
  allocated: number
  kind: WorkKind
  effort: EffortAnswer
  tasks: Task[]
}

const KINDS: { key: WorkKind; label: string }[] = [
  { key: 'plan', label: 'ตามแผน' },
  { key: 'client', label: 'แก้ตามลูกค้า' },
  { key: 'rework', label: 'แก้งานเดิม' },
  { key: 'oos', label: 'นอกขอบเขต' },
]

const EFFORTS: { key: EffortAnswer; label: string }[] = [
  { key: 'less', label: 'น้อยกว่า' },
  { key: 'same', label: 'ตรง' },
  { key: 'more', label: 'มากกว่า' },
]

/** กลไกสร้างความไว้ใจ — ข้อความเปลี่ยนตามคำตอบ ไม่ใช่การจับผิด */
const EFFORT_HINT: Record<EffortAnswer, string> = {
  less: 'ดีเลย — เหลือกำลังไว้ให้งานอื่น หัวหน้า Squad จะเห็นและปรับแผนสัปดาห์หน้าให้',
  same: 'ตรงตามแผน ไม่ต้องอธิบายเพิ่ม',
  more: 'บอกไว้ได้เลย ข้อมูลนี้ช่วยให้การประมาณงวดต่อไปแม่นขึ้น ไม่ใช่การจับผิด',
}

/** mock data — แทนด้วย data layer จริงภายหลัง (งานติ๊กดึงจากงานที่ได้รับมอบหมาย ไม่ต้องพิมพ์) */
const INITIAL_PROJECTS: ProjectLog[] = [
  {
    code: 'ID-2026-004',
    name: 'Café ทองหล่อ',
    phase: 3,
    allocated: 0.5,
    kind: 'plan',
    effort: 'same',
    tasks: [
      { label: 'Working Drawing ชั้น 2', done: true },
      { label: 'Detail ห้องน้ำ', done: true },
      { label: 'Reflected Ceiling Plan', done: false },
    ],
  },
  {
    code: 'ID-2026-009',
    name: 'สำนักงาน BTS อโศก',
    phase: 2,
    allocated: 0.5,
    kind: 'plan',
    effort: 'same',
    tasks: [
      { label: 'ผังพื้นชั้น 8 ปรับตามคอมเมนต์', done: false },
      { label: 'เลือกวัสดุพื้น', done: false },
      { label: 'ประชุมกับผู้รับเหมา', done: false },
    ],
  },
]

const INITIAL_SKILLS: Record<string, boolean> = {
  AutoCAD: true,
  SketchUp: true,
  Enscape: true,
  Revit: false,
  Photoshop: false,
}

const PRIVACY_LINE = 'หัวหน้า Squad หัวหน้าแผนก และตัวคุณ เห็นบันทึกนี้ — ไม่มีใครอื่น'
const NOTE_PLACEHOLDER =
  'เช่น ลอง Enscape ทำภาพกลางคืนครั้งแรก ใช้เวลาเยอะกว่าที่คิด · หรือ ยังไม่ค่อยเข้าใจการเขียน Detail กันซึม อยากให้ใครสอนสักรอบ'

/* CSS เฉพาะหน้า — จำเป็นสำหรับ pseudo-state (hover/focus/placeholder) ที่ inline style ทำไม่ได้
 * ทุกค่าสีอ้าง var(--dpm-*) ตามกติกา */
const PAGE_CSS = `
.wl-task {
  display: flex; align-items: center; width: 100%;
  border: 0; background: transparent; font: inherit; text-align: left;
  border-radius: var(--dpm-radius-control); padding: 0 4px; cursor: pointer;
  transition: background 150ms ease;
}
.wl-task:hover { background: var(--dpm-bg); }
.wl-link {
  border: 0; background: transparent; padding: 0; font-family: inherit;
  color: var(--dpm-accent); cursor: pointer; transition: color 150ms ease;
}
.wl-link:hover { color: var(--dpm-ink); }
.wl-effort {
  flex: 1; text-align: center; font-family: inherit; cursor: pointer;
  color: var(--dpm-sub); background: var(--dpm-surface);
  border: 1px solid var(--dpm-border); border-radius: var(--dpm-radius-control);
  transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
}
.wl-effort:hover { border-color: var(--dpm-ink); color: var(--dpm-ink); }
.wl-effort.is-selected {
  color: var(--dpm-bg); background: var(--dpm-ink); border-color: var(--dpm-ink);
}
.wl-effort.is-selected:hover { color: var(--dpm-bg); }
.wl-textarea {
  width: 100%; box-sizing: border-box; margin-top: 10px; padding: 11px 12px;
  border: 1px solid var(--dpm-border); border-radius: var(--dpm-radius-control);
  background: var(--dpm-bg); font-family: inherit; font-size: 14px; line-height: 1.6;
  color: var(--dpm-ink); resize: vertical; transition: border-color 400ms ease;
}
.wl-textarea:focus { outline: none; border-color: var(--dpm-accent); }
.wl-textarea::placeholder { color: var(--dpm-mute); }
.wl-inline-input {
  box-sizing: border-box; font-family: inherit; color: var(--dpm-ink);
  background: var(--dpm-surface); border: 1px dashed var(--dpm-accent);
}
.wl-inline-input:focus { outline: none; }
.wl-inline-input::placeholder { color: var(--dpm-mute); }
.wl-ghost {
  border: 0; background: transparent; padding: 0; font-family: inherit;
  font-size: 12px; color: var(--dpm-sub); cursor: pointer; transition: color 150ms ease;
}
.wl-ghost:hover { color: var(--dpm-ink); }
`

/* ── สถานะร่วมของทั้งสองเวอร์ชัน ─────────────────────────────── */

interface LogActions {
  toggleCard: (i: number) => void
  toggleTask: (i: number, j: number) => void
  setKind: (i: number, kind: WorkKind) => void
  setEffort: (i: number, effort: EffortAnswer) => void
  startAddTask: (i: number) => void
  commitAddTask: (i: number, label: string) => void
  cancelAddTask: () => void
}

/* ── ส่วนย่อยที่ใช้ร่วมทั้งมือถือ/เดสก์ท็อป ───────────────────── */

function inlineInputKeys(onCommit: (value: string) => void, onCancel: () => void) {
  return (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onCommit(e.currentTarget.value.trim())
    if (e.key === 'Escape') onCancel()
  }
}

/** รายการติ๊ก "ทำอะไรไปบ้าง" — ดึงจากงานที่ได้รับมอบหมาย ไม่ต้องพิมพ์เอง */
function TaskChecklist({
  project,
  index,
  variant,
  adding,
  actions,
}: {
  project: ProjectLog
  index: number
  variant: Variant
  adding: boolean
  actions: LogActions
}) {
  const m = variant === 'mobile'
  const box = m ? 20 : 18
  return (
    <div>
      <div
        style={
          m
            ? { fontSize: 13, fontWeight: 600, marginBottom: 8 }
            : { fontSize: 12, color: 'var(--dpm-mute)', marginBottom: 6 }
        }
      >
        ทำอะไรไปบ้าง
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: m ? 2 : 1 }}>
        {project.tasks.map((t, j) => (
          <button
            key={j}
            type="button"
            className="wl-task"
            role="checkbox"
            aria-checked={t.done}
            style={{ gap: m ? 11 : 10, minHeight: m ? 'var(--dpm-h-touch-row)' : 32 }}
            onClick={() => actions.toggleTask(index, j)}
          >
            <span
              style={{
                width: box,
                height: box,
                borderRadius: m ? 'var(--dpm-radius-control)' : 'var(--dpm-radius-badge)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: m ? 11 : 10,
                background: t.done ? 'var(--dpm-ink)' : 'var(--dpm-surface)',
                border: `1px solid ${t.done ? 'var(--dpm-ink)' : 'var(--dpm-border)'}`,
                color: 'var(--dpm-bg)',
              }}
            >
              {t.done ? '✓' : ''}
            </span>
            <span style={{ fontSize: 14, color: t.done ? 'var(--dpm-ink)' : 'var(--dpm-sub)' }}>
              {t.label}
            </span>
          </button>
        ))}

        {adding ? (
          <div style={{ display: 'flex', alignItems: 'center', minHeight: m ? 40 : 32, padding: '0 4px' }}>
            <input
              className="wl-inline-input"
              autoFocus={m}
              placeholder="พิมพ์งานแล้วกด Enter · Esc ยกเลิก"
              style={{
                width: '100%',
                height: m ? 36 : 28,
                padding: '0 10px',
                fontSize: 13,
                borderRadius: 'var(--dpm-radius-control)',
              }}
              onKeyDown={inlineInputKeys(
                (value) => (value ? actions.commitAddTask(index, value) : actions.cancelAddTask()),
                actions.cancelAddTask,
              )}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', minHeight: m ? 40 : 24, padding: m ? '0 4px' : '4px 4px 0' }}>
            <button
              type="button"
              className="wl-link"
              style={{ fontSize: m ? 13 : 12 }}
              onClick={() => actions.startAddTask(index)}
            >
              + เพิ่มงานที่ไม่อยู่ในรายการ
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/** ชิปเลือกหนึ่ง "ลักษณะงานสัปดาห์นี้" — ที่เลือกพื้นดำตัวขาว */
function KindChips({
  project,
  index,
  variant,
  actions,
}: {
  project: ProjectLog
  index: number
  variant: Variant
  actions: LogActions
}) {
  const m = variant === 'mobile'
  return (
    <div>
      <div
        style={
          m
            ? { fontSize: 13, fontWeight: 600, marginBottom: 8 }
            : { fontSize: 12, color: 'var(--dpm-mute)', marginBottom: 6 }
        }
      >
        {m ? 'ลักษณะงานสัปดาห์นี้' : 'ลักษณะงาน'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: m ? 6 : 5 }}>
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            className={`dpm-chip${project.kind === k.key ? ' is-selected' : ''}`}
            style={m ? { fontSize: 13, padding: '9px 14px' } : { fontSize: 12, padding: '6px 11px' }}
            onClick={() => actions.setKind(index, k.key)}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** 3 ปุ่มเท่ากัน น้อยกว่า/ตรง/มากกว่า + บรรทัดข้อความเปลี่ยนตามคำตอบ (มือถือ) */
function EffortPicker({
  project,
  index,
  variant,
  actions,
}: {
  project: ProjectLog
  index: number
  variant: Variant
  actions: LogActions
}) {
  const m = variant === 'mobile'
  return (
    <div>
      <div
        style={
          m
            ? { fontSize: 13, fontWeight: 600, marginBottom: 8 }
            : { fontSize: 12, color: 'var(--dpm-mute)', marginBottom: 6 }
        }
      >
        {m
          ? `ใช้เวลาเทียบกับที่จัดสรรไว้ ${personWeeks(project.allocated)}`
          : 'ใช้เวลาเทียบกับที่จัดสรร'}
      </div>
      <div style={{ display: 'flex', gap: m ? 6 : 5 }}>
        {EFFORTS.map((e) => (
          <button
            key={e.key}
            type="button"
            className={`wl-effort${project.effort === e.key ? ' is-selected' : ''}`}
            style={m ? { fontSize: 13, padding: '11px 8px' } : { fontSize: 12, padding: '8px 6px' }}
            onClick={() => actions.setEffort(index, e.key)}
          >
            {e.label}
          </button>
        ))}
      </div>
      {m && (
        <div style={{ marginTop: 7, fontSize: 11, color: 'var(--dpm-sub)', lineHeight: 1.5 }}>
          {EFFORT_HINT[project.effort]}
        </div>
      )}
    </div>
  )
}

/** การ์ดโครงการที่ระบบเติมให้ — พับได้ การ์ดที่พับยังบอกข้อมูลพอ (รหัส ชื่อ สถานะ คน-สัปดาห์) */
function ProjectCard({
  project,
  index,
  open,
  variant,
  adding,
  actions,
}: {
  project: ProjectLog
  index: number
  open: boolean
  variant: Variant
  adding: boolean
  actions: LogActions
}) {
  const touched = project.tasks.some((t) => t.done)
  const status = touched ? 'บันทึกแล้ว' : 'ยังไม่ได้บันทึก'
  const statusColor = touched ? 'var(--dpm-green)' : 'var(--dpm-mute)'
  const caret = open ? '▼' : '▶'

  if (variant === 'mobile') {
    return (
      <div
        style={{
          border: `1px solid ${open ? 'var(--dpm-ink)' : 'var(--dpm-border)'}`,
          borderRadius: 'var(--dpm-radius-card)',
          background: 'var(--dpm-surface)',
          overflow: 'hidden',
        }}
      >
        <div
          role="button"
          aria-expanded={open}
          style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          onClick={() => actions.toggleCard(index)}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="dpm-mono" style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>
                {project.code}
              </span>
              <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>งวด {project.phase}</span>
            </div>
            <div style={{ marginTop: 3, fontSize: 15, fontWeight: 600 }}>{project.name}</div>
            <div style={{ marginTop: 3, fontSize: 12, color: statusColor }}>{status}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{personWeeks(project.allocated)}</div>
            <div style={{ fontSize: 10, color: 'var(--dpm-mute)' }}>คน-สัปดาห์</div>
          </div>
          <span style={{ fontSize: 10, color: 'var(--dpm-mute)' }}>{caret}</span>
        </div>

        {open && (
          <div style={{ padding: '2px 16px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <TaskChecklist project={project} index={index} variant={variant} adding={adding} actions={actions} />
            <KindChips project={project} index={index} variant={variant} actions={actions} />
            <EffortPicker project={project} index={index} variant={variant} actions={actions} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        border: `1px solid ${open ? 'var(--dpm-ink)' : 'var(--dpm-border)'}`,
        borderRadius: 'var(--dpm-radius-card)',
        background: 'var(--dpm-surface)',
        overflow: 'hidden',
      }}
    >
      <div
        role="button"
        aria-expanded={open}
        style={{
          padding: '13px 16px',
          display: 'grid',
          gridTemplateColumns: '14px minmax(0,1fr) 96px 52px',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          borderBottom: `1px solid ${open ? 'var(--dpm-border)' : 'transparent'}`,
        }}
        onClick={() => actions.toggleCard(index)}
      >
        <span style={{ fontSize: 10, color: 'var(--dpm-mute)' }}>{caret}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {project.name}
          </div>
          <div style={{ marginTop: 2, fontSize: 11, color: 'var(--dpm-mute)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span className="dpm-mono">{project.code}</span> · งวด {project.phase}
          </div>
        </div>
        <span style={{ fontSize: 12, color: statusColor, whiteSpace: 'nowrap', textAlign: 'right' }}>{status}</span>
        <span style={{ fontSize: 15, fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>
          {personWeeks(project.allocated)}
        </span>
      </div>

      {open && (
        <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 226px', gap: 20 }}>
          <TaskChecklist project={project} index={index} variant={variant} adding={adding} actions={actions} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <KindChips project={project} index={index} variant={variant} actions={actions} />
            <EffortPicker project={project} index={index} variant={variant} actions={actions} />
          </div>
        </div>
      )}
    </div>
  )
}

/** การ์ดทักษะ/โปรแกรม — toggle สะสมเข้าโปรไฟล์การเติบโต */
function SkillsCard({
  skills,
  addingSkill,
  onToggle,
  onStartAdd,
  onCommitAdd,
  onCancelAdd,
}: {
  skills: Record<string, boolean>
  addingSkill: boolean
  onToggle: (name: string) => void
  onStartAdd: () => void
  onCommitAdd: (name: string) => void
  onCancelAdd: () => void
}) {
  return (
    <div className="dpm-card" style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>ทักษะ / โปรแกรมที่ใช้สัปดาห์นี้</div>
      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--dpm-mute)' }}>
        สะสมไว้ในโปรไฟล์การเติบโตของคุณ
      </div>
      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {Object.keys(skills).map((name) => (
          <SkillTag key={name} label={name} selected={skills[name]} onClick={() => onToggle(name)} />
        ))}
        {addingSkill ? (
          <input
            className="wl-inline-input"
            autoFocus
            placeholder="ชื่อทักษะ · Enter"
            style={{ width: 130, height: 30, padding: '0 12px', fontSize: 12, borderRadius: 'var(--dpm-radius-pill)' }}
            onKeyDown={inlineInputKeys((value) => (value ? onCommitAdd(value) : onCancelAdd()), onCancelAdd)}
          />
        ) : (
          <SkillTag label="+ เพิ่ม" addable onClick={onStartAdd} />
        )}
      </div>
    </div>
  )
}

/** ช่องข้อความเปิด — ไม่บังคับ และบอกชัดว่าไม่ถูกนำไปคิดคะแนน */
function NoteCard({
  note,
  rows,
  onChange,
}: {
  note: string
  rows: number
  onChange: (value: string) => void
}) {
  return (
    <div className="dpm-card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>ได้เรียนรู้อะไร หรือติดอะไรอยู่</span>
        <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>ไม่บังคับ</span>
      </div>
      <textarea
        className="wl-textarea"
        rows={rows}
        placeholder={NOTE_PLACEHOLDER}
        value={note}
        onChange={(e) => onChange(e.target.value)}
      />
      <div style={{ marginTop: 9 }}>
        <PrivacyNotice
          variant="positive"
          text="ส่วนนี้ใช้เพื่อการพูดคุยและพัฒนา ไม่ถูกนำไปคิดเป็นคะแนนประเมิน"
        />
      </div>
    </div>
  )
}

/* ── หน้า ────────────────────────────────────────────────────── */

export function WeeklyLogPage() {
  const [openCard, setOpenCard] = useState(0)
  const [projects, setProjects] = useState<ProjectLog[]>(INITIAL_PROJECTS)
  const [skills, setSkills] = useState<Record<string, boolean>>(INITIAL_SKILLS)
  const [note, setNote] = useState('')
  const [addingTask, setAddingTask] = useState<number | null>(null)
  const [addingSkill, setAddingSkill] = useState(false)

  const patchProject = (i: number, patch: Partial<ProjectLog>) =>
    setProjects((list) => list.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))

  const actions: LogActions = {
    toggleCard: (i) => setOpenCard((cur) => (cur === i ? -1 : i)),
    toggleTask: (i, j) =>
      setProjects((list) =>
        list.map((p, idx) =>
          idx === i
            ? { ...p, tasks: p.tasks.map((t, k) => (k === j ? { ...t, done: !t.done } : t)) }
            : p,
        ),
      ),
    setKind: (i, kind) => patchProject(i, { kind }),
    setEffort: (i, effort) => patchProject(i, { effort }),
    startAddTask: (i) => setAddingTask(i),
    commitAddTask: (i, label) => {
      setProjects((list) =>
        list.map((p, idx) => (idx === i ? { ...p, tasks: [...p.tasks, { label, done: true }] } : p)),
      )
      setAddingTask(null)
    },
    cancelAddTask: () => setAddingTask(null),
  }

  const toggleSkill = (name: string) => setSkills((s) => ({ ...s, [name]: !s[name] }))
  const commitAddSkill = (name: string) => {
    setSkills((s) => ({ ...s, [name]: true }))
    setAddingSkill(false)
  }

  /* ความคืบหน้า — โครงการนับว่า "บันทึกแล้ว" เมื่อติ๊กงานอย่างน้อยหนึ่งรายการ */
  const loggedCount = projects.filter((p) => p.tasks.some((t) => t.done)).length
  const totalTasks = projects.reduce((a, p) => a + p.tasks.length, 0)
  const doneTasks = projects.reduce((a, p) => a + p.tasks.filter((t) => t.done).length, 0)
  const progressNote =
    loggedCount === projects.length
      ? `ครบทั้ง ${projects.length} โครงการแล้ว · ติ๊กงาน ${doneTasks}/${totalTasks}`
      : `บันทึกแล้ว ${loggedCount} จาก ${projects.length} โครงการ`
  const progressPct = (loggedCount / projects.length) * 100

  const skillsCard = (
    <SkillsCard
      skills={skills}
      addingSkill={addingSkill}
      onToggle={toggleSkill}
      onStartAdd={() => setAddingSkill(true)}
      onCommitAdd={commitAddSkill}
      onCancelAdd={() => setAddingSkill(false)}
    />
  )

  return (
    <div
      style={{
        minHeight: 'calc(100vh - var(--dpm-h-topnav))',
        background: 'var(--dpm-subtle)',
        padding: 32,
        display: 'flex',
        gap: 40,
        alignItems: 'flex-start',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}
    >
      <style>{PAGE_CSS}</style>

      {/* ═══ มือถือ 390×844 ═══ */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>มือถือ</span>
          <span style={{ fontSize: 11, color: 'var(--dpm-sub)' }}>
            390 × 844 · หน้าจอหลักที่ใช้จริงทุกวันศุกร์
          </span>
        </div>

        <div
          style={{
            width: 390,
            border: '1px solid var(--dpm-border)',
            borderRadius: 28,
            background: 'var(--dpm-bg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 22px',
              fontSize: 11,
              color: 'var(--dpm-sub)',
            }}
          >
            <span>16:42</span>
            <span>ศุกร์ 8 ส.ค.</span>
          </div>

          <div style={{ padding: '6px 20px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                  บันทึกงาน
                  <br />
                  สัปดาห์ 32
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--dpm-sub)' }}>4–8 ส.ค. 2569</div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--dpm-sub)',
                  border: '1px solid var(--dpm-border)',
                  background: 'var(--dpm-surface)',
                  borderRadius: 'var(--dpm-radius-pill)',
                  padding: '5px 11px',
                  whiteSpace: 'nowrap',
                }}
              >
                ประมาณ 5 นาที
              </span>
            </div>
            <div style={{ marginTop: 12 }}>
              <PrivacyNotice text={PRIVACY_LINE} />
            </div>
          </div>

          <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>สัปดาห์นี้คุณถูกจัดสรรไว้ที่</div>

            {projects.map((p, i) => (
              <ProjectCard
                key={p.code}
                project={p}
                index={i}
                open={openCard === i}
                variant="mobile"
                adding={addingTask === i}
                actions={actions}
              />
            ))}

            {skillsCard}
            <NoteCard note={note} rows={4} onChange={setNote} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button style={{ width: '100%', height: 48, fontSize: 15, fontWeight: 500 }}>
                ส่งบันทึก
              </Button>
              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--dpm-mute)' }}>{progressNote}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ เดสก์ท็อป ═══ */}
      <div style={{ flex: 1, minWidth: 640, maxWidth: 900 }}>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>เดสก์ท็อป</span>
          <span style={{ fontSize: 11, color: 'var(--dpm-sub)' }}>
            เนื้อหาเดียวกัน เรียงสองคอลัมน์ ทำเสร็จได้ในหน้าจอเดียวไม่ต้องเลื่อน
          </span>
        </div>

        <div
          style={{
            border: '1px solid var(--dpm-border)',
            borderRadius: 'var(--dpm-radius-card)',
            background: 'var(--dpm-bg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--dpm-border)',
              background: 'var(--dpm-surface)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>
                  บันทึกงานสัปดาห์ 32
                </h1>
                <span style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>4–8 ส.ค. 2569</span>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--dpm-sub)',
                    border: '1px solid var(--dpm-border)',
                    borderRadius: 'var(--dpm-radius-pill)',
                    padding: '3px 10px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ประมาณ 5 นาที
                </span>
              </div>
              <div style={{ marginTop: 6 }}>
                <PrivacyNotice text={PRIVACY_LINE} />
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>{progressNote}</div>
              <div
                style={{
                  marginTop: 6,
                  width: 180,
                  height: 5,
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
                    width: `${progressPct}%`,
                    background: 'var(--dpm-green)',
                    borderRadius: 'var(--dpm-radius-bar)',
                    transition: 'width 240ms ease',
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '20px 24px',
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1.25fr) minmax(0,1fr)',
              gap: 20,
              alignItems: 'start',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>สัปดาห์นี้คุณถูกจัดสรรไว้ที่</span>
                <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>คน-สัปดาห์</span>
              </div>

              {projects.map((p, i) => (
                <ProjectCard
                  key={p.code}
                  project={p}
                  index={i}
                  open={openCard === i}
                  variant="desktop"
                  adding={addingTask === i}
                  actions={actions}
                />
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {skillsCard}
              <NoteCard note={note} rows={5} onChange={setNote} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Button style={{ height: 42, fontSize: 14, padding: '0 26px' }}>ส่งบันทึก</Button>
                <button type="button" className="wl-ghost">
                  เก็บเป็นร่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
