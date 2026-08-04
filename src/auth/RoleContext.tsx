import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Role } from './roles'

interface RoleContextValue {
  role: Role
  setRole: (role: Role) => void
}

const RoleContext = createContext<RoleContextValue>({ role: 'hopd', setRole: () => undefined })

const STORAGE_KEY = 'dpm.role'
const VALID: Role[] = ['hopd', 'hod', 'senior', 'designer', 'bd', 'admin']

/**
 * บทบาทปัจจุบันของผู้ใช้ — ตัวสลับสำหรับทดลองมุมมอง (แทนหน้า login ระหว่างพัฒนา)
 * ทุกครั้งที่บทบาทเปลี่ยน จะ login ต่อ API เพื่อให้ session ฝั่ง server ตรงกัน —
 * server คือผู้ตัดสินสิทธิ์จริง (ตัดข้อมูลเงิน/ปฏิเสธ endpoint ตามตาราง §5)
 * ไม่มีเซิร์ฟเวอร์ = ใช้ได้ต่อแบบ mock ฝั่ง client
 */
export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return VALID.includes(stored as Role) ? (stored as Role) : 'hopd'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, role)
    // sync session ฝั่ง server (fire-and-forget — offline ก็ทำงานต่อได้)
    void fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    }).catch(() => undefined)
  }, [role])

  return (
    <RoleContext.Provider value={{ role, setRole: setRoleState }}>{children}</RoleContext.Provider>
  )
}

export function useRole(): RoleContextValue {
  return useContext(RoleContext)
}
