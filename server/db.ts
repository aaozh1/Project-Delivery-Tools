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
  delay_client INTEGER NOT NULL,
  -- วงจรชีวิตโครงการ: planning (รอ/กำลังวางแผน) → in_review (ส่ง HoD แล้ว) → active → closed
  status TEXT NOT NULL DEFAULT 'active',
  -- งบคน-สัปดาห์ของทั้งโครงการ และคน-สัปดาห์ที่ใช้ไปก่อนช่วงที่มีตารางจัดสรรในระบบ
  budget_pw REAL NOT NULL DEFAULT 0,
  base_used_pw REAL NOT NULL DEFAULT 0
);
-- แผนงวดงานที่ Senior ส่งรีวิว (S3 → S5) — งวดเก็บเป็น JSON จนกว่าจะอนุมัติ
CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY,
  project_code TEXT NOT NULL,
  phases TEXT NOT NULL,
  total_pw REAL NOT NULL,
  margin_pct REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','rejected')),
  submitted_by TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_by TEXT,
  decided_at TEXT,
  reason TEXT
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
-- การจัดสรรรายสัปดาห์ — แหล่งเดียวของ COL จริง (brief: WeeklyAllocation · ไม่มี TimeEntry)
CREATE TABLE IF NOT EXISTS weekly_allocations (
  week INTEGER NOT NULL,
  member TEXT NOT NULL,
  project_code TEXT NOT NULL,
  person_weeks REAL NOT NULL,
  PRIMARY KEY (week, member, project_code)
);
CREATE TABLE IF NOT EXISTS variation_orders (
  id TEXT PRIMARY KEY,
  project_code TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('revision_over_quota','client_request','scope_gap')),
  detail TEXT NOT NULL,
  person_weeks REAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('proposed','billable','goodwill','rejected')),
  agreed_value INTEGER,
  reason TEXT,
  decided_by TEXT,
  decided_date TEXT,
  linked_phase TEXT,
  submitted_by TEXT NOT NULL,
  submitted_date TEXT NOT NULL
);
-- มุมมองการเก็บเงินของ S9 (DPM ไม่ใช่ระบบบัญชี — ตัวเลขต้องตรงกับใบกำกับภาษีในระบบบัญชีหลัก)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  project TEXT NOT NULL,
  client TEXT NOT NULL,
  phase_no INTEGER NOT NULL,
  phase_name TEXT NOT NULL,
  value INTEGER NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('approved','billed','paid')),
  waiting_days INTEGER NOT NULL DEFAULT 0,
  billed_on TEXT,
  aging_days INTEGER NOT NULL DEFAULT 0,
  billed_this_month INTEGER NOT NULL DEFAULT 0,
  paid_on TEXT,
  paid_this_month INTEGER NOT NULL DEFAULT 0
);
-- HandoffBrief จาก BD (brief ภาคผนวก C) — Promise List เก็บเป็น JSON
CREATE TABLE IF NOT EXISTS handoff_briefs (
  id INTEGER PRIMARY KEY,
  client TEXT NOT NULL,
  project_name TEXT NOT NULL,
  line TEXT,
  contract_value INTEGER,
  squad TEXT,
  revision_rounds TEXT,
  due_date TEXT,
  note TEXT,
  promises TEXT NOT NULL,
  submitted_by TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

/* migration เบา ๆ สำหรับ DB เก่าที่สร้างก่อนมีคอลัมน์ lifecycle (ไฟล์ DB เป็น ephemeral อยู่แล้ว) */
for (const stmt of [
  "ALTER TABLE projects ADD COLUMN status TEXT NOT NULL DEFAULT 'active'",
  'ALTER TABLE projects ADD COLUMN budget_pw REAL NOT NULL DEFAULT 0',
  'ALTER TABLE projects ADD COLUMN base_used_pw REAL NOT NULL DEFAULT 0',
  'ALTER TABLE handoff_briefs ADD COLUMN project_code TEXT',
]) {
  try {
    db.exec(stmt)
  } catch {
    /* มีคอลัมน์แล้ว */
  }
}

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
      current_phase, progress_pct, used_pct, delay_us, delay_client, status, budget_pw, base_used_pw)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const insPhase = db.prepare(
    `INSERT INTO phases (project_code, no, name, weight_pct, value, status, revision_quota, revision_used)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  type PhaseSeed = [number, string, number, number, string, number, number]
  const projects: Array<{
    row: [string, string, string, string, string, string, number, number, number, number, number, number, string, number, number]
    phases: PhaseSeed[]
  }> = [
    {
      row: ['ID-2026-004', 'Café ทองหล่อ', 'บจก. ทองหล่อ ฮอสพิทาลิตี้', 'คุณบี', 'ID', 'A', 3000000, 3, 45, 132, 9, 4, 'active', 30, 36.6],
      phases: [
        [1, 'Concept', 20, 600000, 'paid', 2, 1],
        [2, 'DD + 3D', 30, 900000, 'paid', 2, 2],
        [3, 'Working Drawing + FF&E', 35, 1050000, 'in-progress', 2, 3],
        [4, 'Site Supervision', 15, 450000, 'not-started', 1, 0],
      ],
    },
    {
      row: ['AR-2025-011', 'อาคารสำนักงานพระราม 9', 'บจก. พระราม 9 ดีเวลลอปเมนท์', 'คุณบี', 'AR', 'C', 6000000, 4, 78, 74, 0, 12, 'active', 60, 44.4],
      phases: [
        [1, 'Conceptual', 15, 900000, 'paid', 2, 1],
        [2, 'Schematic', 20, 1200000, 'paid', 2, 2],
        [3, 'Design Development', 25, 1500000, 'paid', 2, 1],
        [4, 'Construction Doc', 30, 1800000, 'approved', 2, 0],
        [5, 'Bidding & CA', 10, 600000, 'not-started', 1, 0],
      ],
    },
    {
      row: ['AR-2026-002', 'โกดังบางนา', 'บจก. บางนา โลจิสติกส์', 'คุณเบล', 'AR', 'C', 4200000, 2, 38, 71, 3, 18, 'active', 40, 28.4],
      phases: [
        [1, 'Conceptual', 15, 630000, 'paid', 2, 1],
        [2, 'Schematic', 20, 840000, 'in-progress', 2, 1],
        [3, 'Design Development', 25, 1050000, 'not-started', 2, 0],
        [4, 'Construction Doc', 30, 1260000, 'not-started', 2, 0],
        [5, 'Bidding & CA', 10, 420000, 'not-started', 1, 0],
      ],
    },
    {
      row: ['HS-2026-007', 'บ้านคุณสมชาย ทองหล่อ', 'คุณสมชาย', 'คุณบี', 'HS', 'D', 1800000, 1, 18, 14, 0, 0, 'active', 49, 6.9],
      phases: [
        [1, 'Concept Design', 20, 360000, 'in-progress', 2, 0],
        [2, 'DD + 3D', 30, 540000, 'not-started', 2, 0],
        [3, 'แบบก่อสร้าง + ขออนุญาต', 40, 720000, 'not-started', 1, 0],
        [4, 'ที่ปรึกษาช่วงก่อสร้าง', 10, 180000, 'not-started', 1, 0],
      ],
    },
    {
      row: ['GR-2026-014', 'Rebrand XYZ', 'บจก. XYZ กรุ๊ป', 'คุณเบล', 'GR', 'F', 850000, 2, 60, 52, 0, 2, 'active', 12, 6.2],
      phases: [
        [1, 'Brief + Concept', 30, 255000, 'paid', 2, 1],
        [2, 'Design Development', 40, 340000, 'delivered', 2, 2],
        [3, 'Final Artwork', 30, 255000, 'not-started', 1, 0],
      ],
    },
    {
      row: ['ID-2026-009', 'สำนักงาน BTS อโศก', 'บจก. อโศก แคปปิตอล', 'คุณบี', 'ID', 'A', 2500000, 2, 41, 41, 0, 0, 'active', 32, 10.4],
      phases: [
        [1, 'Concept', 20, 500000, 'paid', 2, 1],
        [2, 'DD + 3D', 30, 750000, 'in-progress', 2, 3],
        [3, 'Working Drawing + FF&E', 35, 875000, 'not-started', 2, 0],
        [4, 'Site Supervision', 15, 375000, 'not-started', 1, 0],
      ],
    },
    {
      // โครงการที่แผนกำลังรอ HoD รีวิว — ผูกกับ narrative ของ S5 (แผนงาน ID-2026-011 Margin 18%)
      row: ['ID-2026-011', 'ร้านค้าปลีก สยาม', 'บจก. สยาม รีเทล', 'คุณบี', 'ID', 'A', 1200000, 0, 0, 0, 0, 0, 'in_review', 36, 0],
      phases: [],
    },
  ]

  const tx = db.transaction(() => {
    for (const p of projects) {
      insProject.run(...p.row)
      for (const ph of p.phases) insPhase.run(p.row[0], ...ph)
    }
  })
  tx()

  // แผนของ ID-2026-011 ที่คุณเอส่งรีวิวไว้ (ตัวเลขชุดเดียวกับหน้า S5)
  db.prepare(
    `INSERT INTO plans (project_code, phases, total_pw, margin_pct, status, submitted_by, submitted_at)
     VALUES (?, ?, ?, ?, 'proposed', ?, datetime('now', '-4 days'))`,
  ).run(
    'ID-2026-011',
    JSON.stringify([
      { no: 1, name: 'Concept', weightPct: 20, value: 240000, pw: { sr: 1.5, mid: 2.5, jr: 2.5 } },
      { no: 2, name: 'DD + 3D', weightPct: 30, value: 360000, pw: { sr: 2.5, mid: 4.5, jr: 4.5 } },
      { no: 3, name: 'Working Drawing + FF&E', weightPct: 35, value: 420000, pw: { sr: 2.5, mid: 5.0, jr: 5.5 } },
      { no: 4, name: 'Site Supervision', weightPct: 15, value: 180000, pw: { sr: 1.5, mid: 2.0, jr: 1.5 } },
    ]),
    36,
    18.0,
    'คุณเอ',
  )

  // การจัดสรร Squad A — ชุดเดียวกับ src/pages/allocate/data.ts (สัปดาห์ 31 = LAST_WEEK, 32 = ปัจจุบัน)
  const allocMembers = ['คุณเอ', 'คุณซี', 'คุณดี', 'คุณอี']
  const allocProjects = ['ID-2026-004', 'ID-2026-009', 'ID-2026-011']
  const week31 = [
    [0.5, 0.5, 0],
    [0.5, 0.25, 0.25],
    [0, 0.5, 0.25],
    [0.5, 0, 0.25],
  ]
  const week32 = [
    [0.5, 0.5, 0],
    [0.5, 0.5, 0.25],
    [0, 0.5, 0.25],
    [0.5, 0, 0.5],
  ]
  const insAlloc = db.prepare(
    'INSERT INTO weekly_allocations (week, member, project_code, person_weeks) VALUES (?, ?, ?, ?)',
  )
  for (const [week, grid] of [
    [31, week31],
    [32, week32],
  ] as const) {
    grid.forEach((row, i) =>
      row.forEach((pw, j) => insAlloc.run(week, allocMembers[i], allocProjects[j], pw)),
    )
  }

  // VO ตั้งต้น — ชุดเดียวกับ src/pages/vo/data.ts (INITIAL_VOS)
  const insVo = db.prepare(
    `INSERT INTO variation_orders (id, project_code, source, detail, person_weeks, status,
      agreed_value, reason, decided_by, decided_date, linked_phase, submitted_by, submitted_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  insVo.run('VO-2026-018', 'ID-2026-004', 'client_request',
    'ลูกค้าขอเพิ่มแบบบาร์กาแฟชั้นลอย + งานไฟพิเศษเหนือเคาน์เตอร์ (นอกแบบ Concept ที่อนุมัติ)',
    3.0, 'proposed', null, null, null, null, null, 'คุณเอ', '30 ก.ค. 2569')
  insVo.run('VO-2026-017', 'AR-2026-002', 'client_request',
    'เพิ่มแบบสำนักงานหน้าโกดัง 120 ตร.ม. พร้อมโครงสร้างเบา — ลูกค้าขอหลังเห็น Schematic',
    2.5, 'proposed', null, null, null, null, null, 'คุณเค', '28 ก.ค. 2569')
  insVo.run('VO-2026-016', 'AR-2025-011', 'scope_gap',
    'แบบขยายภูมิทัศน์ลานหน้าอาคาร — สัญญาเดิมระบุขอบเขตเฉพาะตัวอาคาร',
    4.5, 'billable', 120000, null, 'คุณณัฐพงศ์ (HoPD)', '22 ก.ค. 2569', null, 'คุณเค', '15 ก.ค. 2569')
  insVo.run('VO-2026-015', 'GR-2026-014', 'client_request',
    'เพิ่ม brand guideline ฉบับ social media 12 template นอกขอบเขต Final Artwork',
    1.75, 'goodwill', null, 'ลูกค้าสัญญาระยะยาว — ลงทุนรักษาความสัมพันธ์', 'คุณกิตติ (HoD)', '8 ก.ค. 2569', null, 'คุณเอฟ', '5 ก.ค. 2569')
  insVo.run('VO-2026-014', 'HS-2026-007', 'scope_gap',
    'ขอปรับแบบจากบ้าน 2 ชั้นเป็น 3 ชั้น หลังอนุมัติ Concept แล้ว',
    6.0, 'rejected', null, 'เกินขอบเขตของ VO — เสนอเป็นสัญญาแก้ไขเพิ่มเติม (Amendment) แทน', 'คุณณัฐพงศ์ (HoPD)', '25 มิ.ย. 2569', null, 'คุณดี', '20 มิ.ย. 2569')
  insVo.run('VO-2026-012', 'AR-2025-011', 'revision_over_quota',
    'รอบแก้ที่ 3 งวด Schematic (เกินโควตา 1 รอบ) — ปรับ façade ตามข้อสังเกตลูกค้า',
    2.0, 'goodwill', null, 'ต้นเหตุจากแบบรีวิวภายในคลาดเคลื่อน — บริษัทรับผิดชอบเอง', 'คุณณัฐพงศ์ (HoPD)', '12 มิ.ย. 2569', 'AR-2025-011#2', 'คุณเค', '10 มิ.ย. 2569')

  // ใบแจ้งหนี้ตั้งต้น — ชุดเดียวกับ src/pages/billing/data.ts
  const insInv = db.prepare(
    `INSERT INTO invoices (id, code, project, client, phase_no, phase_name, value, stage,
      waiting_days, billed_on, aging_days, billed_this_month, paid_on, paid_this_month)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  insInv.run('AR-2025-011-4', 'AR-2025-011', 'อาคารสำนักงานพระราม 9', 'บจก. พระราม 9 ดีเวลลอปเมนท์',
    4, 'Construction Doc', 1800000, 'approved', 12, null, 0, 0, null, 0)
  insInv.run('HS-2025-003-3', 'HS-2025-003', 'บ้านคุณวิภา พัฒนาการ', 'คุณวิภา',
    3, 'แบบก่อสร้าง + ขออนุญาต', 1200000, 'billed', 0, '28 เม.ย. 69', 98, 0, null, 0)
  insInv.run('AR-2025-006-2', 'AR-2025-006', 'โรงงานอาหารอยุธยา', 'บจก. อยุธยา ฟู้ดส์',
    2, 'Schematic', 1400000, 'billed', 0, '20 มิ.ย. 69', 45, 0, null, 0)
  insInv.run('ID-2025-018-3', 'ID-2025-018', 'โรงแรมล้านนา เชียงใหม่', 'บจก. ล้านนา ฮอสพิทาลิตี้',
    3, 'Working Drawing + FF&E', 950000, 'billed', 0, '10 ก.ค. 69', 25, 0, null, 0)
  insInv.run('AR-2025-011-3', 'AR-2025-011', 'อาคารสำนักงานพระราม 9', 'บจก. พระราม 9 ดีเวลลอปเมนท์',
    3, 'Design Development', 1500000, 'paid', 0, '30 มิ.ย. 69', 0, 0, '2 ส.ค. 69', 1)
  insInv.run('ID-2026-009-1', 'ID-2026-009', 'สำนักงาน BTS อโศก', 'บจก. อโศก แคปปิตอล',
    1, 'Concept', 500000, 'paid', 0, '15 ก.ค. 69', 0, 0, '1 ส.ค. 69', 1)
}
