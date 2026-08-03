/** ทะเบียนหน้าจอทั้งหมดตาม Design Brief §6 — ใช้ทั้งใน routing และหน้า directory */
export interface ScreenMeta {
  id: string
  path: string
  title: string
  user: string
  question: string
  priority: 'P0' | 'P1' | 'P2'
  designFile?: string
}

export const SCREENS: ScreenMeta[] = [
  {
    id: 'S1',
    path: '/portfolio',
    title: 'Portfolio Control Room',
    user: 'Head of Project Delivery',
    question: 'วันนี้ต้องเข้าไปแก้เรื่องอะไร?',
    priority: 'P0',
    designFile: 'Portfolio Control Room.dc.html',
  },
  {
    id: 'S3',
    path: '/plan',
    title: 'Project Plan Workspace',
    user: 'หัวหน้า Squad (Senior)',
    question: 'แผนนี้ทำได้จริง เหลือกำไรเท่าไหร่?',
    priority: 'P0',
    designFile: 'Project Plan Workspace.dc.html',
  },
  {
    id: 'S6',
    path: '/allocate',
    title: 'จัดสรรกำลังคน',
    user: 'หัวหน้า Squad (Senior)',
    question: 'สัปดาห์นี้คนใน Squad ทำโครงการไหน?',
    priority: 'P0',
    designFile: 'Allocate Capacity.dc.html',
  },
  {
    id: 'S7',
    path: '/workload',
    title: 'ภาระงานรายบุคคล',
    user: 'HoD · HoPD · เจ้าตัว',
    question: 'แต่ละคนทำกี่โครงการ แต่ละเดือน โหลดเท่าไหร่?',
    priority: 'P0',
    designFile: 'Personal Workload.dc.html',
  },
  {
    id: 'S2',
    path: '/department',
    title: 'Department Board',
    user: 'หัวหน้าแผนก (HoD)',
    question: 'รอรีวิวอะไร Squad สมดุลไหม ใครควรได้โตต่อ?',
    priority: 'P0',
    designFile: 'Department Board.dc.html',
  },
  {
    id: 'S11',
    path: '/admin',
    title: 'Admin Console',
    user: 'Head of Project Delivery',
    question: 'ตั้งค่าและคุมสิทธิ์ทั้งระบบ',
    priority: 'P0',
    designFile: 'Admin Console.dc.html',
  },
  {
    id: 'S13',
    path: '/weekly-log',
    title: 'บันทึกงานรายสัปดาห์',
    user: 'ทุกคน (มือถือเป็นหลัก)',
    question: 'สัปดาห์นี้ทำอะไร เรียนรู้อะไร?',
    priority: 'P1',
    designFile: 'Weekly Log.dc.html',
  },
  {
    id: 'S14',
    path: '/growth',
    title: 'Growth Profile',
    user: 'HoD + เจ้าตัว',
    question: 'เก่งอะไร ยังไม่เคยทำอะไร?',
    priority: 'P1',
    designFile: 'Growth Profile.dc.html',
  },
  {
    id: 'S9',
    path: '/finance',
    title: 'Billing & Cash',
    user: 'Admin / บัญชี',
    question: 'เดือนนี้วางบิลได้เท่าไหร่?',
    priority: 'P2',
  },
]
