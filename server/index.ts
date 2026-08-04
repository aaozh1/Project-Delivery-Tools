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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'dpm-api' })
})

const PORT = Number(process.env.PORT) || 3001
app.listen(PORT, () => {
  console.log(`DPM API listening on http://localhost:${PORT}`)
})
