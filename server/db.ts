/**
 * DPM data layer — SQLite (better-sqlite3)
 * โครงตาม Design Brief ภาคผนวก C (เฉพาะส่วนที่ API ปัจจุบันใช้)
 * seed จากข้อมูลชุดเดียวกับ src/data/projects.ts — เมื่อย้ายไป PostgreSQL
 * เปลี่ยนเฉพาะไฟล์นี้กับ query ใน index.ts ได้โดย schema เดิม
 */
import Database from 'better-sqlite3'
import type { Database as SqliteDatabase } from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const DB_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dpm.sqlite')

export const db: SqliteDatabase = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('hopd','hod','senior','designer','bd','admin')),
  position TEXT NOT NULL,
  squad TEXT,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS business_rules (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- เรตต่อคน-สัปดาห์ตามตำแหน่ง — cost_rate จำกัดสิทธิ์ HoPD และการอ่านถูกบันทึก Audit
CREATE TABLE IF NOT EXISTS position_rates (
  position TEXT PRIMARY KEY,
  headcount INTEGER NOT NULL,
  cost_rate_per_week INTEGER NOT NULL,
  effective_from TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  bd TEXT NOT NULL,
  line TEXT NOT NULL,
  squad TEXT NOT NULL,
  contract_value INTEGER NOT NULL,
  current_phase INTEGER NOT NULL,
  progress_pct INTEGER NOT NULL,
  used_pct INTEGER NOT NULL,
  delay_us INTEGER NOT NULL,
  delay_client INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS phases (
  id INTEGER PRIMARY KEY,
  project_code TEXT NOT NULL REFERENCES projects(code),
  no INTEGER NOT NULL,
  name TEXT NOT NULL,
  weight_pct INTEGER NOT NULL,
  value INTEGER NOT NULL,
  status TEXT NOT NULL,
  revision_quota INTEGER NOT NULL,
  revision_used INTEGER NOT NULL,
  UNIQUE (project_code, no)
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  detail TEXT,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

const seeded = db.prepare('SELECT COUNT(*) AS n FROM staff').get() as { n: number }
if (seeded.n === 0) seed()

function seed() {
  const insStaff = db.prepare(
    'INSERT INTO staff (name, role, position, squad) VALUES (?, ?, ?, ?)',
  )
  insStaff.run('คุณณัฐพงศ์', 'hopd', 'Principal', null)
  insStaff.run('คุณกิตติ', 'hod', 'Principal', null)
  insStaff.run('คุณเอ', 'senior', 'Senior', 'A')
  insStaff.run('คุณซี', 'designer', 'Mid', 'A')
  insStaff.run('คุณบี', 'bd', 'BD', null)
  insStaff.run('คุณแอน', 'admin', 'Admin', null)

  // เกณฑ์ตั้งต้นชุดเดียวกับ src/pages/admin/adminData.ts (RULE_DEFAULTS)
  const rules: Record<string, string> = {
    marginAR: '30', marginID: '32', marginHS: '28', marginGR: '40',
    warnGap: '5', critGap: '15', billDays: '7', arDays: '60',
    fullWeek: '1.00', step: '0.25', overload: '1.00',
    underPct: '65', underMonths: '2', utilTarget: '75',
    maxSr: '2', maxMid: '3', maxJr: '2',
    squadMin: '3', squadMax: '6', projPerSquad: '4', moveWeeks: '8',
    borrow: 'hod',
  }
  const insRule = db.prepare('INSERT INTO business_rules (key, value) VALUES (?, ?)')
  for (const [k, v] of Object.entries(rules)) insRule.run(k, v)

  // ชุดเดียวกับ RATE_ROWS ใน src/pages/admin/adminData.ts
  const insRate = db.prepare(
    'INSERT INTO position_rates (position, headcount, cost_rate_per_week, effective_from) VALUES (?, ?, ?, ?)',
  )
  insRate.run('Principal', 2, 86000, '1 ม.ค. 2569')
  insRate.run('Senior', 6, 60000, '1 ม.ค. 2569')
  insRate.run('Mid', 11, 40000, '1 ม.ค. 2569')
  insRate.run('Junior', 14, 24800, '1 เม.ย. 2569')
  insRate.run('Intern', 3, 9600, '1 เม.ย. 2569')

  // โครงการชุดเดียวกับ src/data/projects.ts
  const insProject = db.prepare(
    `INSERT INTO projects (code, name, client, bd, line, squad, contract_value,
      current_phase, progress_pct, used_pct, delay_us, delay_client)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const insPhase = db.prepare(
    `INSERT INTO phases (project_code, no, name, weight_pct, value, status, revision_quota, revision_used)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  type PhaseSeed = [number, string, number, number, string, number, number]
  const projects: Array<{
    row: [string, string, string, string, string, string, number, number, number, number, number, number]
    phases: PhaseSeed[]
  }> = [
    {
      row: ['ID-2026-004', 'Café ทองหล่อ', 'บจก. ทองหล่อ ฮอสพิทาลิตี้', 'คุณบี', 'ID', 'A', 3000000, 3, 45, 132, 9, 4],
      phases: [
        [1, 'Concept', 20, 600000, 'paid', 2, 1],
        [2, 'DD + 3D', 30, 900000, 'paid', 2, 2],
        [3, 'Working Drawing + FF&E', 35, 1050000, 'in-progress', 2, 3],
        [4, 'Site Supervision', 15, 450000, 'not-started', 1, 0],
      ],
    },
    {
      row: ['AR-2025-011', 'อาคารสำนักงานพระราม 9', 'บจก. พระราม 9 ดีเวลลอปเมนท์', 'คุณบี', 'AR', 'C', 6000000, 4, 78, 74, 0, 12],
      phases: [
        [1, 'Conceptual', 15, 900000, 'paid', 2, 1],
        [2, 'Schematic', 20, 1200000, 'paid', 2, 2],
        [3, 'Design Development', 25, 1500000, 'paid', 2, 1],
        [4, 'Construction Doc', 30, 1800000, 'approved', 2, 0],
        [5, 'Bidding & CA', 10, 600000, 'not-started', 1, 0],
      ],
    },
    {
      row: ['AR-2026-002', 'โกดังบางนา', 'บจก. บางนา โลจิสติกส์', 'คุณเบล', 'AR', 'C', 4200000, 2, 38, 71, 3, 18],
      phases: [
        [1, 'Conceptual', 15, 630000, 'paid', 2, 1],
        [2, 'Schematic', 20, 840000, 'in-progress', 2, 1],
        [3, 'Design Development', 25, 1050000, 'not-started', 2, 0],
        [4, 'Construction Doc', 30, 1260000, 'not-started', 2, 0],
        [5, 'Bidding & CA', 10, 420000, 'not-started', 1, 0],
      ],
    },
    {
      row: ['HS-2026-007', 'บ้านคุณสมชาย ทองหล่อ', 'คุณสมชาย', 'คุณบี', 'HS', 'D', 1800000, 1, 18, 14, 0, 0],
      phases: [
        [1, 'Concept Design', 20, 360000, 'in-progress', 2, 0],
        [2, 'DD + 3D', 30, 540000, 'not-started', 2, 0],
        [3, 'แบบก่อสร้าง + ขออนุญาต', 40, 720000, 'not-started', 1, 0],
        [4, 'ที่ปรึกษาช่วงก่อสร้าง', 10, 180000, 'not-started', 1, 0],
      ],
    },
    {
      row: ['GR-2026-014', 'Rebrand XYZ', 'บจก. XYZ กรุ๊ป', 'คุณเบล', 'GR', 'F', 850000, 2, 60, 52, 0, 2],
      phases: [
        [1, 'Brief + Concept', 30, 255000, 'paid', 2, 1],
        [2, 'Design Development', 40, 340000, 'delivered', 2, 2],
        [3, 'Final Artwork', 30, 255000, 'not-started', 1, 0],
      ],
    },
    {
      row: ['ID-2026-009', 'สำนักงาน BTS อโศก', 'บจก. อโศก แคปปิตอล', 'คุณบี', 'ID', 'A', 2500000, 2, 41, 41, 0, 0],
      phases: [
        [1, 'Concept', 20, 500000, 'paid', 2, 1],
        [2, 'DD + 3D', 30, 750000, 'in-progress', 2, 3],
        [3, 'Working Drawing + FF&E', 35, 875000, 'not-started', 2, 0],
        [4, 'Site Supervision', 15, 375000, 'not-started', 1, 0],
      ],
    },
  ]

  const tx = db.transaction(() => {
    for (const p of projects) {
      insProject.run(...p.row)
      for (const ph of p.phases) insPhase.run(p.row[0], ...ph)
    }
  })
  tx()
}
