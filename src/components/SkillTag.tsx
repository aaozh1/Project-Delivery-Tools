interface SkillTagProps {
  label: string
  selected?: boolean
  /** ทักษะใหม่ปีนี้ — กรอบสีเน้น + ป้าย "ใหม่" */
  isNew?: boolean
  /** ปุ่ม "+ เพิ่มทักษะ" กรอบประ */
  addable?: boolean
  disabled?: boolean
  onClick?: () => void
}

/** แท็กทักษะ/โปรแกรม — pill radius 20px ใช้ในบันทึกรายสัปดาห์และ Growth Profile */
export function SkillTag({ label, selected, isNew, addable, disabled, onClick }: SkillTagProps) {
  const cls = [
    'dpm-chip',
    selected && 'is-selected',
    isNew && 'is-new',
    addable && 'is-addable',
    disabled && 'is-disabled',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={cls} disabled={disabled} onClick={onClick} style={{ border: undefined }}>
      {label}
      {isNew && <span style={{ fontSize: 10, color: 'var(--dpm-accent)' }}>ใหม่</span>}
    </button>
  )
}
