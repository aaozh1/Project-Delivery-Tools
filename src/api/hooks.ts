import { useEffect, useState } from 'react'
import { PROJECTS } from '../data/projects'
import type { Project } from '../data/projects'
import { useRole } from '../auth/RoleContext'
import { tryApi } from './client'

interface ProjectsResponse {
  projects: Array<
    Omit<Project, 'contractValue' | 'phases'> & {
      contractValue: number | null
      phases: Array<Omit<Project['phases'][number], 'value'> & { value: number | null }>
    }
  >
  moneyVisible: boolean
}

export interface ProjectsData {
  projects: Project[]
  /** server = ผ่าน API ที่ enforce สิทธิ์ฝั่งเซิร์ฟเวอร์แล้ว · mock = fallback ฝั่ง client */
  source: 'server' | 'mock'
}

/**
 * ทะเบียนโครงการ — พยายามอ่านจาก API ก่อน (server ตัดข้อมูลเงินให้ตามสิทธิ์
 * และกรองโครงการตามขอบเขต BD) · ไม่มีเซิร์ฟเวอร์ = ใช้ mock ฝั่ง client
 * ค่าเงินที่ server ตัดออก (null) แปลงเป็น 0 เพื่อคงชนิดข้อมูล — UI ซ่อนส่วนเงินตามสิทธิ์อยู่แล้ว
 */
export function useProjects(): ProjectsData {
  const { role } = useRole()
  const [data, setData] = useState<ProjectsData>({ projects: PROJECTS, source: 'mock' })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await tryApi<ProjectsResponse>('/api/projects')
      if (cancelled) return
      if (!res) {
        setData({ projects: PROJECTS, source: 'mock' })
        return
      }
      const projects: Project[] = res.projects.map((p) => ({
        ...p,
        contractValue: p.contractValue ?? 0,
        phases: p.phases.map((ph) => ({ ...ph, value: ph.value ?? 0 })),
      }))
      setData({ projects, source: 'server' })
    })()
    return () => {
      cancelled = true
    }
  }, [role])

  return data
}
