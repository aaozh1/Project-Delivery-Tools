/**
 * บทบาทและสิทธิ์การเข้าหน้าจอ — ตาม Design Brief §3 (บทบาท) และ §5 (Permission Matrix)
 * หมายเหตุสำคัญ: ชั้นนี้คุมการแสดงผลฝั่ง client เท่านั้น —
 * เมื่อมี backend จริง กติกาทั้งหมดต้อง enforce ฝั่ง server ซ้ำอีกชั้น (โดยเฉพาะ cost_rate และกติกา Squad)
 */

export type Role = 'hopd' | 'hod' | 'senior' | 'designer' | 'bd' | 'admin'

export const ROLE_LABELS: Record<Role, string> = {
  hopd: 'Head of Project Delivery',
  hod: 'หัวหน้าแผนก (HoD)',
  senior: 'หัวหน้า Squad (Senior)',
  designer: 'Designer / Draftsman',
  bd: 'BD / Sales',
  admin: 'Admin / บัญชี',
}

/** ชื่อสมมติของผู้ใช้แต่ละบทบาทใน mock */
export const ROLE_PERSONA: Record<Role, string> = {
  hopd: 'คุณณัฐพงศ์',
  hod: 'คุณกิตติ',
  senior: 'คุณเอ',
  designer: 'คุณซี',
  bd: 'คุณบี',
  admin: 'คุณแอน',
}

const ALL: Role[] = ['hopd', 'hod', 'senior', 'designer', 'bd', 'admin']

/**
 * เส้นทาง → บทบาทที่เปิดดูได้ (อย่างน้อยระดับ 👁 ตามตาราง §5)
 * ขอบเขตข้อมูลภายในหน้า (เช่น เห็นเฉพาะแผนกตน / ของตัวเอง) เป็นหน้าที่ของแต่ละหน้า
 */
export const SCREEN_ACCESS: Record<string, Role[]> = {
  '/portfolio': ['hopd', 'hod', 'senior', 'admin'],
  '/department': ['hopd', 'hod'],
  '/plan': ['hopd', 'hod', 'senior'],
  '/allocate': ['hopd', 'hod', 'senior'],
  '/workload': ['hopd', 'hod', 'senior', 'designer'],
  '/admin': ['hopd'],
  '/weekly-log': ['hopd', 'hod', 'senior', 'designer'],
  '/growth': ['hopd', 'hod', 'senior', 'designer'],
  '/handoff': ['bd', 'hopd'],
  '/project': ALL,
  '/review': ['hopd', 'hod'],
  '/vo': ['hopd', 'hod', 'senior', 'bd'],
  '/finance': ['admin', 'hopd', 'hod', 'bd'],
  '/closeout': ['hopd', 'hod'],
  '/bd': ['bd', 'hopd'],
  '/screens': ALL,
  '/design-system': ALL,
}

export function canAccess(role: Role, path: string): boolean {
  const allowed = SCREEN_ACCESS[path]
  return allowed ? allowed.includes(role) : true
}

/** หน้าแรกตามบทบาท — แต่ละบทบาทมี "หน้าจอบ้าน" ของตัวเอง (brief §3) */
export const HOME_BY_ROLE: Record<Role, string> = {
  hopd: '/portfolio',
  hod: '/department',
  senior: '/plan',
  designer: '/weekly-log',
  bd: '/bd',
  admin: '/finance',
}

/** เห็นยอด COL / Margin ของโครงการหรือไม่ (§5: Designer และ BD ไม่เห็นตัวเลขเงินภายใน) */
export function canSeeMoney(role: Role): boolean {
  return role !== 'designer' && role !== 'bd'
}
