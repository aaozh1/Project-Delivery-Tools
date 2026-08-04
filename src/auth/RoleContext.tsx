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
 * บทบาทปัจจุบันของผู้ใช้ — ยังไม่มีระบบ auth จริง จึงเป็นตัวสลับสำหรับทดลองมุมมอง
 * เมื่อมี backend: ค่านี้ต้องมาจาก session จริง และ server ต้องตรวจสิทธิ์ซ้ำทุก request
 */
export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return VALID.includes(stored as Role) ? (stored as Role) : 'hopd'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, role)
  }, [role])

  return (
    <RoleContext.Provider value={{ role, setRole: setRoleState }}>{children}</RoleContext.Provider>
  )
}

export function useRole(): RoleContextValue {
  return useContext(RoleContext)
}
