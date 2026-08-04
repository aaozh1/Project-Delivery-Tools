/**
 * DPM API client — fetch ผ่าน /api (Vite proxy ไปยัง server พอร์ต 3001)
 * ทุกจุดที่เรียกต้องรองรับกรณีไม่มีเซิร์ฟเวอร์ (เปิดแบบ static) — เรียกผ่าน tryApi
 * แล้ว fallback เป็น mock ฝั่ง client เพื่อให้เดโม่ยังใช้ได้
 */

export class ApiRestrictedError extends Error {
  reason: string
  contact: string
  constructor(reason: string, contact: string) {
    super(reason)
    this.name = 'ApiRestrictedError'
    this.reason = reason
    this.contact = contact
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  })
  if (res.status === 403) {
    const body = (await res.json().catch(() => ({}))) as { reason?: string; contact?: string }
    throw new ApiRestrictedError(
      body.reason ?? 'จำกัดสิทธิ์ตามบทบาท',
      body.contact ?? 'ติดต่อ คุณณัฐพงศ์ (Head of Project Delivery)',
    )
  }
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return (await res.json()) as T
}

/** เรียก API — คืน null เมื่อเซิร์ฟเวอร์ไม่พร้อม (offline/static) เพื่อให้ผู้เรียก fallback เป็น mock */
export async function tryApi<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    return await api<T>(path, init)
  } catch (err) {
    if (err instanceof ApiRestrictedError) throw err
    return null
  }
}
