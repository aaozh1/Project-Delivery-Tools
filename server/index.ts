/**
 * DPM API — Express + SQLite
 * ชั้นนี้คือที่ enforce ตารางสิทธิ์ §5 ของจริง (client เป็นเพียงการแสดงผล):
 * - cost_rate: อ่านได้เฉพาะ HoPD และการเปิดดูทุกครั้งเขียน Audit Log
 * - Business Rules: แก้ได้เฉพาะ HoPD และการแก้เขียน Audit Log
 * - ตัวเลขเงินของโครงการ: ถูกตัดออกจาก payload สำหรับ Designer (ไม่ใช่แค่ซ่อนใน UI)
 * - BD: เห็นเฉพาะโครงการของลูกค้าตน
 */
import express from 'express'
import cookieParser from 'cookie-parser'
import { randomUUID } from 'node:crypto'
import { db } from './db.js'

type Role = 'hopd' | 'hod' | 'senior' | 'designer' | 'bd' | 'admin'

interface Staff {
  id: number
  name: string
  role: Role
  position: string
  squad: string | null
}

const app = express()
app.use(express.json())
app.use(cookieParser())

const COOKIE = 'dpm_session'

/* ── auth ─────────────────────────────────────────────── */

function currentStaff(req: express.Request): Staff | null {
  const token = req.cookies?.[COOKIE] as string | undefined
  if (!token) return null
  const row = db
    .prepare(
      `SELECT s.id, s.name, s.role, s.position, s.squad
       FROM sessions ss JOIN staff s ON s.id = ss.staff_id WHERE ss.token = ?`,
    )
    .get(token) as Staff | undefined
  return row ?? null
}

function audit(actor: Staff, action: string, target: string, detail?: string) {
  db.prepare('INSERT INTO audit_log (actor, role, action, target, detail) VALUES (?, ?, ?, ?, ?)').run(
    actor.name,
    actor.role,
    action,
    target,
    detail ?? null,
  )
}

/** สิทธิ์ไม่พอ = 403 พร้อมคำอธิบายและผู้ติดต่อ — client แสดงเป็น NoAccess ไม่ใช่ error แดง */
function forbidden(res: express.Response, reason: string) {
  res.status(403).json({
    error: 'restricted',
    reason,
    contact: 'ติดต่อ คุณณัฐพงศ์ (Head of Project Delivery)',
  })
}

function requireAuth(req: express.Request, res: express.Response): Staff | null {
  const staff = currentStaff(req)
  if (!staff) {
    res.status(401).json({ error: 'unauthenticated' })
    return null
  }
  return staff
}

/**
 * dev login — เลือกบทบาทแล้วได้ session ของบุคคลสมมติบทบาทนั้น
 * โปรดักชันจริงต้องแทนด้วย SSO/รหัสผ่าน แต่โครง session + สิทธิ์ฝั่ง server ใช้อันเดียวกัน
 */
app.post('/api/auth/login', (req, res) => {
  const role = String(req.body?.role ?? '')
  const staff = db
    .prepare('SELECT id, name, role, position, squad FROM staff WHERE role = ? AND active = 1')
    .get(role) as Staff | undefined
  if (!staff) {
    res.status(400).json({ error: 'unknown_role' })
    return
  }
  const token = randomUUID()
  db.prepare('INSERT INTO sessions (token, staff_id) VALUES (?, ?)').run(token, staff.id)
  audit(staff, 'auth.login', `role:${staff.role}`)
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax' })
  res.json({ staff })
})

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies?.[COOKIE] as string | undefined
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
  res.clearCookie(COOKIE)
  res.json({ ok: true })
})

app.get('/api/auth/me', (req, res) => {
  const staff = currentStaff(req)
  if (!staff) {
    res.status(401).json({ error: 'unauthenticated' })
    return
  }
  res.json({ staff })
})

/* ── โครงการ ──────────────────────────────────────────── */

app.get('/api/projects', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return

  let projects = db.prepare('SELECT * FROM projects').all() as Array<Record<string, unknown>>

  // §3: BD เห็นเฉพาะโครงการของลูกค้าตน
  if (staff.role === 'bd') projects = projects.filter((p) => p.bd === staff.name)

  const phaseStmt = db.prepare('SELECT * FROM phases WHERE project_code = ? ORDER BY no')
  const hideMoney = staff.role === 'designer' // §5: Designer ไม่เห็นยอดเงินของโครงการ

  const result = projects.map((p) => {
    const phases = (phaseStmt.all(p.code) as Array<Record<string, unknown>>).map((ph) => ({
      no: ph.no,
      name: ph.name,
      weightPct: ph.weight_pct,
      value: hideMoney ? null : ph.value,
      status: ph.status,
      revisionQuota: ph.revision_quota,
      revisionUsed: ph.revision_used,
    }))
    return {
      code: p.code,
      name: p.name,
      client: p.client,
      bd: p.bd,
      line: p.line,
      squad: p.squad,
      status: p.status,
      contractValue: hideMoney ? null : p.contract_value,
      currentPhase: p.current_phase,
      progressPct: p.progress_pct,
      usedPct: p.used_pct,
      delayUs: p.delay_us,
      delayClient: p.delay_client,
      phases,
    }
  })
  res.json({ projects: result, moneyVisible: !hideMoney })
})

/* ── Business Rules ───────────────────────────────────── */

app.get('/api/rules', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  const rows = db.prepare('SELECT key, value FROM business_rules').all() as Array<{
    key: string
    value: string
  }>
  res.json({ rules: Object.fromEntries(rows.map((r) => [r.key, r.value])) })
})

app.put('/api/rules', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  if (staff.role !== 'hopd') {
    forbidden(res, 'การแก้กฎธุรกิจเปิดให้เฉพาะ Head of Project Delivery')
    return
  }
  const rules = req.body?.rules as Record<string, string> | undefined
  if (!rules || typeof rules !== 'object') {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const existing = db.prepare('SELECT key, value FROM business_rules').all() as Array<{
    key: string
    value: string
  }>
  const before = new Map(existing.map((r) => [r.key, r.value]))
  const upd = db.prepare('UPDATE business_rules SET value = ? WHERE key = ?')
  const changed: string[] = []
  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(rules)) {
      if (!before.has(key)) continue
      if (before.get(key) !== String(value)) {
        upd.run(String(value), key)
        changed.push(`${key}: ${before.get(key)} → ${value}`)
      }
    }
  })
  tx()
  if (changed.length > 0) audit(staff, 'rules.update', 'business_rules', changed.join(' · '))
  const rows = db.prepare('SELECT key, value FROM business_rules').all() as Array<{
    key: string
    value: string
  }>
  res.json({ rules: Object.fromEntries(rows.map((r) => [r.key, r.value])), changed: changed.length })
})

/* ── อัตราค่าแรง (จำกัดสิทธิ์ + audit ทุกการเปิดดู) ────── */

app.get('/api/rates', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  if (staff.role !== 'hopd') {
    forbidden(res, 'ตารางอัตราค่าแรงเปิดให้เฉพาะ Head of Project Delivery และฝ่ายบุคคล')
    return
  }
  // รายการโดยไม่มีตัวเลข — ตัวเลขต้องขอทีละแถวผ่าน /reveal เพื่อให้ audit ได้เป็นรายการ
  const rows = db
    .prepare('SELECT position, headcount, effective_from FROM position_rates')
    .all() as Array<{ position: string; headcount: number; effective_from: string }>
  res.json({
    rates: rows.map((r) => ({ position: r.position, headcount: r.headcount, updated: r.effective_from })),
  })
})

app.post('/api/rates/reveal', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  if (staff.role !== 'hopd') {
    forbidden(res, 'การเปิดดูเรตเปิดให้เฉพาะ Head of Project Delivery')
    return
  }
  const position = String(req.body?.position ?? '')
  const row = db
    .prepare('SELECT position, cost_rate_per_week FROM position_rates WHERE position = ?')
    .get(position) as { position: string; cost_rate_per_week: number } | undefined
  if (!row) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  audit(staff, 'rate.reveal', `position:${row.position}`)
  const today = db
    .prepare(
      "SELECT COUNT(*) AS n FROM audit_log WHERE action = 'rate.reveal' AND actor = ? AND date(at) = date('now')",
    )
    .get(staff.name) as { n: number }
  res.json({ position: row.position, costRatePerWeek: row.cost_rate_per_week, revealsToday: today.n })
})

/* ── Audit Log ────────────────────────────────────────── */

app.get('/api/audit', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  if (staff.role !== 'hopd') {
    forbidden(res, 'Audit Log เปิดให้เฉพาะ Head of Project Delivery')
    return
  }
  const limit = Math.min(200, Number(req.query.limit) || 50)
  const rows = db
    .prepare('SELECT actor, role, action, target, detail, at FROM audit_log ORDER BY id DESC LIMIT ?')
    .all(limit)
  res.json({ entries: rows })
})

/* ── การจัดสรรรายสัปดาห์ (S6) — แหล่งเดียวของ COL จริง ─── */

const ALLOC_WRITERS: Role[] = ['senior', 'hod', 'hopd']

function validAllocValue(v: unknown): v is number {
  return typeof v === 'number' && v >= 0 && v <= 1 && Math.abs(v * 4 - Math.round(v * 4)) < 1e-9
}

app.get('/api/allocations', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  const week = Number(req.query.week)
  if (!Number.isInteger(week)) {
    res.status(400).json({ error: 'bad_week' })
    return
  }
  const rows = db
    .prepare('SELECT member, project_code, person_weeks FROM weekly_allocations WHERE week = ?')
    .all(week) as Array<{ member: string; project_code: string; person_weeks: number }>
  res.json({
    week,
    entries: rows.map((r) => ({ member: r.member, projectCode: r.project_code, personWeeks: r.person_weeks })),
  })
})

app.put('/api/allocations', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  if (!ALLOC_WRITERS.includes(staff.role)) {
    forbidden(res, 'การจัดสรรกำลังคนทำได้โดยหัวหน้า Squad ขึ้นไป — จัดสรรได้เฉพาะสมาชิกใน Squad ตน')
    return
  }
  const { week, member, projectCode, personWeeks } = req.body ?? {}
  if (!Number.isInteger(week) || typeof member !== 'string' || typeof projectCode !== 'string' || !validAllocValue(personWeeks)) {
    res.status(400).json({ error: 'bad_request', hint: 'personWeeks ต้องเป็นทวีคูณของ 0.25 ในช่วง 0–1' })
    return
  }
  db.prepare(
    `INSERT INTO weekly_allocations (week, member, project_code, person_weeks) VALUES (?, ?, ?, ?)
     ON CONFLICT(week, member, project_code) DO UPDATE SET person_weeks = excluded.person_weeks`,
  ).run(week, member, projectCode, personWeeks)
  res.json({ ok: true })
})

app.put('/api/allocations/bulk', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  if (!ALLOC_WRITERS.includes(staff.role)) {
    forbidden(res, 'การจัดสรรกำลังคนทำได้โดยหัวหน้า Squad ขึ้นไป')
    return
  }
  const { week, entries } = req.body ?? {}
  if (!Number.isInteger(week) || !Array.isArray(entries)) {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const up = db.prepare(
    `INSERT INTO weekly_allocations (week, member, project_code, person_weeks) VALUES (?, ?, ?, ?)
     ON CONFLICT(week, member, project_code) DO UPDATE SET person_weeks = excluded.person_weeks`,
  )
  const tx = db.transaction(() => {
    for (const e of entries as Array<{ member: string; projectCode: string; personWeeks: number }>) {
      if (typeof e.member !== 'string' || typeof e.projectCode !== 'string' || !validAllocValue(e.personWeeks)) {
        throw new Error('bad_entry')
      }
      up.run(week, e.member, e.projectCode, e.personWeeks)
    }
  })
  try {
    tx()
  } catch {
    res.status(400).json({ error: 'bad_entry' })
    return
  }
  res.json({ ok: true })
})

app.post('/api/allocations/confirm', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  if (!ALLOC_WRITERS.includes(staff.role)) {
    forbidden(res, 'การยืนยันรอบสัปดาห์ทำได้โดยหัวหน้า Squad ขึ้นไป')
    return
  }
  const week = Number(req.body?.week)
  audit(staff, 'allocation.confirm', `week:${week}`)
  res.json({ ok: true })
})

/* ── Variation Orders (S8) ────────────────────────────── */

const thaiDate = () =>
  new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })

interface VoRow {
  id: string
  project_code: string
  source: string
  detail: string
  person_weeks: number
  status: string
  agreed_value: number | null
  reason: string | null
  decided_by: string | null
  decided_date: string | null
  linked_phase: string | null
  submitted_by: string
  submitted_date: string
}

function voJson(r: VoRow) {
  return {
    id: r.id,
    projectCode: r.project_code,
    source: r.source,
    detail: r.detail,
    personWeeks: r.person_weeks,
    status: r.status,
    agreedValue: r.agreed_value ?? undefined,
    reason: r.reason ?? undefined,
    decidedBy: r.decided_by ?? undefined,
    decidedDate: r.decided_date ?? undefined,
    linkedPhase: r.linked_phase ?? undefined,
    submittedBy: r.submitted_by,
    submittedDate: r.submitted_date,
  }
}

const VO_VIEWERS: Role[] = ['hopd', 'hod', 'senior', 'bd']

app.get('/api/vos', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  if (!VO_VIEWERS.includes(staff.role)) {
    forbidden(res, 'ข้อมูล VO เปิดให้ HoPD หัวหน้าแผนก หัวหน้า Squad และ BD ตามตารางสิทธิ์')
    return
  }
  const rows = db.prepare('SELECT * FROM variation_orders ORDER BY id DESC').all() as VoRow[]
  res.json({ vos: rows.map(voJson) })
})

app.post('/api/vos', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  // §5: Senior/BD สร้างได้ (📝) · HoD/HoPD สร้างและอนุมัติได้
  if (!VO_VIEWERS.includes(staff.role)) {
    forbidden(res, 'การเปิด VO ทำได้โดย Senior ขึ้นไป หรือ BD')
    return
  }
  const { projectCode, source, detail, personWeeks, linkedPhase } = req.body ?? {}
  const validPw =
    typeof personWeeks === 'number' &&
    personWeeks > 0 &&
    personWeeks <= 20 &&
    Math.abs(personWeeks * 4 - Math.round(personWeeks * 4)) < 1e-9
  if (
    typeof projectCode !== 'string' ||
    !['revision_over_quota', 'client_request', 'scope_gap'].includes(source) ||
    typeof detail !== 'string' ||
    detail.length === 0 ||
    !validPw
  ) {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const max = db
    .prepare("SELECT MAX(CAST(substr(id, 9) AS INTEGER)) AS n FROM variation_orders WHERE id LIKE 'VO-2026-%'")
    .get() as { n: number | null }
  const id = `VO-2026-${String((max.n ?? 0) + 1).padStart(3, '0')}`
  db.prepare(
    `INSERT INTO variation_orders (id, project_code, source, detail, person_weeks, status, linked_phase, submitted_by, submitted_date)
     VALUES (?, ?, ?, ?, ?, 'proposed', ?, ?, ?)`,
  ).run(id, projectCode, source, detail, personWeeks, linkedPhase ?? null, staff.name, thaiDate())
  const row = db.prepare('SELECT * FROM variation_orders WHERE id = ?').get(id) as VoRow
  res.json({ vo: voJson(row) })
})

app.post('/api/vos/:id/decide', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  if (staff.role !== 'hod' && staff.role !== 'hopd') {
    forbidden(res, 'การอนุมัติ VO เป็นของหัวหน้าแผนกขึ้นไป — Senior/BD เสนอได้แต่ตัดสินไม่ได้')
    return
  }
  const { status, reason, agreedValue } = req.body ?? {}
  if (!['billable', 'goodwill', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'bad_status' })
    return
  }
  if ((status === 'goodwill' || status === 'rejected') && (typeof reason !== 'string' || reason.length === 0)) {
    res.status(400).json({ error: 'reason_required', hint: 'การแถม/ปฏิเสธต้องมีเหตุผลกำกับเสมอ' })
    return
  }
  const row = db.prepare('SELECT * FROM variation_orders WHERE id = ?').get(req.params.id) as VoRow | undefined
  if (!row) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  db.prepare(
    `UPDATE variation_orders SET status = ?, agreed_value = ?, reason = ?, decided_by = ?, decided_date = ? WHERE id = ?`,
  ).run(
    status,
    status === 'billable' ? (typeof agreedValue === 'number' ? agreedValue : Math.round(row.person_weeks * 19000)) : null,
    typeof reason === 'string' && reason.length > 0 ? reason : null,
    `${staff.name} (${staff.role === 'hopd' ? 'HoPD' : 'HoD'})`,
    thaiDate(),
    row.id,
  )
  audit(staff, 'vo.decide', row.id, `${row.status} → ${status}${reason ? ` · ${reason}` : ''}`)
  const updated = db.prepare('SELECT * FROM variation_orders WHERE id = ?').get(row.id) as VoRow
  res.json({ vo: voJson(updated) })
})

/* ── Billing (S9) ─────────────────────────────────────── */

interface InvoiceRow {
  id: string
  code: string
  project: string
  client: string
  phase_no: number
  phase_name: string
  value: number
  stage: string
  waiting_days: number
  billed_on: string | null
  aging_days: number
  billed_this_month: number
  paid_on: string | null
  paid_this_month: number
}

function invoiceJson(r: InvoiceRow) {
  return {
    id: r.id,
    code: r.code,
    project: r.project,
    client: r.client,
    phaseNo: r.phase_no,
    phaseName: r.phase_name,
    value: r.value,
    stage: r.stage,
    waitingDays: r.waiting_days,
    billedOn: r.billed_on,
    agingDays: r.aging_days,
    billedThisMonth: r.billed_this_month === 1,
    paidOn: r.paid_on,
    paidThisMonth: r.paid_this_month === 1,
  }
}

const BILLING_VIEWERS: Role[] = ['admin', 'hopd', 'hod', 'bd']
const BILLING_WRITERS: Role[] = ['admin', 'hopd']

app.get('/api/billing', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  if (!BILLING_VIEWERS.includes(staff.role)) {
    forbidden(res, 'ข้อมูลการวางบิลเปิดให้ Admin/บัญชี HoPD HoD และ BD ตามตารางสิทธิ์')
    return
  }
  const rows = db.prepare('SELECT * FROM invoices').all() as InvoiceRow[]
  res.json({ items: rows.map(invoiceJson) })
})

function billingTransition(
  req: express.Request,
  res: express.Response,
  from: string,
  to: string,
  patch: (id: string) => void,
  action: string,
) {
  const staff = requireAuth(req, res)
  if (!staff) return
  if (!BILLING_WRITERS.includes(staff.role)) {
    forbidden(res, 'การบันทึกวางบิล/รับเงินทำได้โดย Admin/บัญชี หรือ HoPD')
    return
  }
  const row = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as InvoiceRow | undefined
  if (!row) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  if (row.stage !== from) {
    res.status(409).json({ error: 'wrong_stage', hint: `สถานะปัจจุบันคือ ${row.stage} — เดินหน้าทางเดียว ${from} → ${to}` })
    return
  }
  patch(row.id)
  audit(staff, action, row.id, `${row.code} งวด ${row.phase_no} · ฿${row.value.toLocaleString('en-US')}`)
  const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(row.id) as InvoiceRow
  res.json({ item: invoiceJson(updated) })
}

app.post('/api/billing/:id/bill', (req, res) => {
  billingTransition(req, res, 'approved', 'billed', (id) => {
    db.prepare(
      "UPDATE invoices SET stage = 'billed', billed_on = 'วันนี้', aging_days = 0, billed_this_month = 1 WHERE id = ?",
    ).run(id)
  }, 'billing.bill')
})

app.post('/api/billing/:id/receive', (req, res) => {
  billingTransition(req, res, 'billed', 'paid', (id) => {
    db.prepare("UPDATE invoices SET stage = 'paid', paid_on = 'วันนี้', paid_this_month = 1 WHERE id = ?").run(id)
  }, 'billing.receive')
})

/* ── Handoff (S0) — ส่งแล้วเกิดโครงการจริงสถานะ "รอวางแผน" ── */

app.post('/api/handoff', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  if (staff.role !== 'bd' && staff.role !== 'hopd') {
    forbidden(res, 'การส่ง Handoff เป็นหน้าที่ของ BD/Sales')
    return
  }
  const { client, projectName, line, contractValue, squad, revisionRounds, dueDate, note, promises } = req.body ?? {}
  if (typeof client !== 'string' || typeof projectName !== 'string' || !Array.isArray(promises) || promises.length === 0) {
    res.status(400).json({ error: 'bad_request', hint: 'ต้องมี ลูกค้า ชื่อโครงการ และ Promise อย่างน้อย 1 รายการ' })
    return
  }

  // gen รหัสโครงการจากสายงาน: <LINE>-2026-<เลขถัดไป>
  const prefix = ['AR', 'ID', 'HS', 'GR'].includes(String(line)) ? String(line) : 'ID'
  const max = db
    .prepare("SELECT MAX(CAST(substr(code, 9) AS INTEGER)) AS n FROM projects WHERE code LIKE ? || '-2026-%'")
    .get(prefix) as { n: number | null }
  const projectCode = `${prefix}-2026-${String((max.n ?? 0) + 1).padStart(3, '0')}`

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO projects (code, name, client, bd, line, squad, contract_value,
        current_phase, progress_pct, used_pct, delay_us, delay_client, status, budget_pw, base_used_pw)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 'planning', 0, 0)`,
    ).run(
      projectCode,
      projectName,
      client,
      staff.role === 'bd' ? staff.name : 'คุณบี',
      prefix,
      typeof squad === 'string' && squad ? squad : 'A',
      typeof contractValue === 'number' ? contractValue : 0,
    )
    db.prepare(
      `INSERT INTO handoff_briefs (client, project_name, line, contract_value, squad, revision_rounds, due_date, note, promises, submitted_by, project_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      client,
      projectName,
      typeof line === 'string' ? line : null,
      typeof contractValue === 'number' ? contractValue : null,
      typeof squad === 'string' ? squad : null,
      String(revisionRounds ?? ''),
      typeof dueDate === 'string' ? dueDate : null,
      typeof note === 'string' ? note : null,
      JSON.stringify(promises),
      staff.name,
      projectCode,
    )
  })
  tx()
  audit(staff, 'handoff.submit', projectCode, `${projectName} · ลูกค้า ${client} · promise ${promises.length} รายการ`)
  res.json({ projectCode })
})

/** คิว Handoff — Senior เปิดดูเพื่อรับโครงการไปวางแผน */
app.get('/api/handoff', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  if (!['senior', 'hod', 'hopd', 'bd'].includes(staff.role)) {
    forbidden(res, 'คิว Handoff เปิดให้ทีมส่งมอบงานและ BD')
    return
  }
  const rows = db
    .prepare(
      `SELECT h.project_code, h.client, h.project_name, h.line, h.contract_value, h.revision_rounds,
              h.due_date, h.note, h.promises, h.submitted_by, h.at, p.status AS project_status
       FROM handoff_briefs h LEFT JOIN projects p ON p.code = h.project_code
       ORDER BY h.id DESC`,
    )
    .all() as Array<Record<string, unknown>>
  res.json({
    briefs: rows.map((r) => ({
      projectCode: r.project_code,
      client: r.client,
      projectName: r.project_name,
      line: r.line,
      contractValue: r.contract_value,
      revisionRounds: r.revision_rounds,
      dueDate: r.due_date,
      note: r.note,
      promises: JSON.parse(String(r.promises ?? '[]')) as unknown[],
      submittedBy: r.submitted_by,
      at: r.at,
      projectStatus: r.project_status,
    })),
  })
})

/* ── แผนงวดงาน (S3 → S5) — วงจร วางแผน → รีวิว → อนุมัติ ── */

interface PlanRow {
  id: number
  project_code: string
  phases: string
  total_pw: number
  margin_pct: number
  status: string
  submitted_by: string
  submitted_at: string
  decided_by: string | null
  decided_at: string | null
  reason: string | null
}

function planJson(r: PlanRow) {
  const project = db
    .prepare('SELECT name, client, contract_value, squad, line FROM projects WHERE code = ?')
    .get(r.project_code) as { name: string; client: string; contract_value: number; squad: string; line: string } | undefined
  return {
    id: r.id,
    projectCode: r.project_code,
    projectName: project?.name ?? r.project_code,
    client: project?.client ?? '',
    contractValue: project?.contract_value ?? 0,
    squad: project?.squad ?? '',
    line: project?.line ?? '',
    phases: JSON.parse(r.phases) as unknown[],
    totalPw: r.total_pw,
    marginPct: r.margin_pct,
    status: r.status,
    submittedBy: r.submitted_by,
    submittedAt: r.submitted_at,
    decidedBy: r.decided_by ?? undefined,
    decidedAt: r.decided_at ?? undefined,
    reason: r.reason ?? undefined,
  }
}

app.get('/api/plans', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  if (!['senior', 'hod', 'hopd'].includes(staff.role)) {
    forbidden(res, 'แผนงวดงานเปิดให้ Senior ขึ้นไป')
    return
  }
  const status = typeof req.query.status === 'string' ? req.query.status : null
  const rows = (
    status
      ? db.prepare('SELECT * FROM plans WHERE status = ? ORDER BY id DESC').all(status)
      : db.prepare('SELECT * FROM plans ORDER BY id DESC').all()
  ) as PlanRow[]
  res.json({ plans: rows.map(planJson) })
})

app.post('/api/plans', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  if (!['senior', 'hod', 'hopd'].includes(staff.role)) {
    forbidden(res, 'การส่งแผนทำได้โดยหัวหน้า Squad ขึ้นไป')
    return
  }
  const { projectCode, phases, totalPw, marginPct } = req.body ?? {}
  if (
    typeof projectCode !== 'string' ||
    !Array.isArray(phases) ||
    phases.length === 0 ||
    typeof totalPw !== 'number' ||
    typeof marginPct !== 'number'
  ) {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const project = db.prepare('SELECT code FROM projects WHERE code = ?').get(projectCode)
  if (!project) {
    res.status(404).json({ error: 'project_not_found' })
    return
  }
  const info = db
    .prepare(
      `INSERT INTO plans (project_code, phases, total_pw, margin_pct, submitted_by) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(projectCode, JSON.stringify(phases), totalPw, marginPct, staff.name)
  db.prepare("UPDATE projects SET status = 'in_review' WHERE code = ? AND status IN ('planning','in_review')").run(projectCode)
  audit(staff, 'plan.submit', projectCode, `${phases.length} งวด · ${totalPw} คส. · Margin ${marginPct}%`)
  const row = db.prepare('SELECT * FROM plans WHERE id = ?').get(info.lastInsertRowid) as PlanRow
  res.json({ plan: planJson(row) })
})

app.post('/api/plans/:id/decide', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  if (staff.role !== 'hod' && staff.role !== 'hopd') {
    forbidden(res, 'การอนุมัติ/ตีกลับแผนเป็นของหัวหน้าแผนกขึ้นไป')
    return
  }
  const { approve, reason } = req.body ?? {}
  if (typeof approve !== 'boolean') {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  if (!approve && (typeof reason !== 'string' || reason.length < 10)) {
    res.status(400).json({ error: 'reason_required', hint: 'การตีกลับต้องมีเหตุผลอย่างน้อย 10 ตัวอักษร' })
    return
  }
  const row = db.prepare('SELECT * FROM plans WHERE id = ?').get(Number(req.params.id)) as PlanRow | undefined
  if (!row) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  if (row.status !== 'proposed') {
    res.status(409).json({ error: 'already_decided' })
    return
  }

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE plans SET status = ?, decided_by = ?, decided_at = datetime('now'), reason = ? WHERE id = ?`,
    ).run(approve ? 'approved' : 'rejected', staff.name, typeof reason === 'string' ? reason : null, row.id)
    if (approve) {
      // แผนอนุมัติ → งวดงานกลายเป็นของจริง โครงการเริ่มเดิน
      const phases = JSON.parse(row.phases) as Array<{ no: number; name: string; weightPct: number; value: number }>
      db.prepare('DELETE FROM phases WHERE project_code = ?').run(row.project_code)
      const ins = db.prepare(
        `INSERT INTO phases (project_code, no, name, weight_pct, value, status, revision_quota, revision_used)
         VALUES (?, ?, ?, ?, ?, ?, 2, 0)`,
      )
      for (const ph of phases) {
        ins.run(row.project_code, ph.no, ph.name, ph.weightPct, ph.value, ph.no === 1 ? 'in-progress' : 'not-started')
      }
      db.prepare(
        "UPDATE projects SET status = 'active', current_phase = 1, budget_pw = ? WHERE code = ?",
      ).run(row.total_pw, row.project_code)
    } else {
      db.prepare("UPDATE projects SET status = 'planning' WHERE code = ?").run(row.project_code)
    }
  })
  tx()
  audit(staff, 'plan.decide', row.project_code, `${approve ? 'อนุมัติ' : 'ตีกลับ'}${reason ? ` · ${reason}` : ''}`)
  const updated = db.prepare('SELECT * FROM plans WHERE id = ?').get(row.id) as PlanRow
  res.json({ plan: planJson(updated) })
})

/* ── Metrics — ตัวเลข derive จากตารางจัดสรรจริง (WeeklyAllocation = แหล่งเดียวของ COL) ── */

app.get('/api/metrics', (req, res) => {
  const staff = requireAuth(req, res)
  if (!staff) return
  if (staff.role === 'bd') {
    forbidden(res, 'ตัวเลขภาระงานภายในเปิดให้ทีมส่งมอบงาน — BD ดูสถานะโครงการได้จากหน้าลูกค้าของฉัน')
    return
  }

  const allocs = db
    .prepare('SELECT week, member, project_code, person_weeks FROM weekly_allocations')
    .all() as Array<{ week: number; member: string; project_code: string; person_weeks: number }>

  // % โหลดรายคนของเดือนปัจจุบัน = เฉลี่ยรายสัปดาห์ที่มีข้อมูล × 100
  const byMemberWeek = new Map<string, Map<number, number>>()
  for (const a of allocs) {
    const weeks = byMemberWeek.get(a.member) ?? new Map<number, number>()
    weeks.set(a.week, (weeks.get(a.week) ?? 0) + a.person_weeks)
    byMemberWeek.set(a.member, weeks)
  }
  let memberLoads = [...byMemberWeek.entries()].map(([member, weeks]) => {
    const totals = [...weeks.values()]
    const loadPct = Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 100)
    const projectCount = new Set(allocs.filter((a) => a.member === member && a.person_weeks > 0).map((a) => a.project_code)).size
    return { member, loadPct, projectCount }
  })
  // §5: Designer เห็นภาระงานของตัวเองเท่านั้น
  if (staff.role === 'designer') memberLoads = memberLoads.filter((m) => m.member === staff.name)

  // การใช้กำลังคนสัปดาห์ปัจจุบัน (สัปดาห์ล่าสุดที่มีข้อมูล)
  const latestWeek = Math.max(0, ...allocs.map((a) => a.week))
  const weekAllocs = allocs.filter((a) => a.week === latestWeek)
  const memberCount = new Set(weekAllocs.map((a) => a.member)).size || 1
  const utilizationPct = Math.round(
    (weekAllocs.reduce((a, b) => a + b.person_weeks, 0) / memberCount) * 100,
  )

  // % ใช้ไปต่อโครงการ = (ฐานก่อนระบบ + Σ จัดสรรในระบบ) ÷ งบคน-สัปดาห์
  const byProject = new Map<string, number>()
  for (const a of allocs) byProject.set(a.project_code, (byProject.get(a.project_code) ?? 0) + a.person_weeks)
  const projects = db
    .prepare('SELECT code, budget_pw, base_used_pw FROM projects WHERE budget_pw > 0')
    .all() as Array<{ code: string; budget_pw: number; base_used_pw: number }>
  const projectUsage = projects.map((p) => {
    const usedPw = p.base_used_pw + (byProject.get(p.code) ?? 0)
    return { code: p.code, usedPw: Math.round(usedPw * 100) / 100, budgetPw: p.budget_pw, usedPct: Math.round((usedPw / p.budget_pw) * 100) }
  })

  res.json({ latestWeek, utilizationPct, memberLoads, projectUsage })
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'dpm-api' })
})

const PORT = Number(process.env.PORT) || 3001
app.listen(PORT, () => {
  console.log(`DPM API listening on http://localhost:${PORT}`)
})
