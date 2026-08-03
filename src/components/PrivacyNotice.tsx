interface PrivacyNoticeProps {
  /** ใครเห็นข้อมูลนี้บ้าง เช่น "หัวหน้า Squad หัวหน้าแผนก และตัวคุณ เห็นบันทึกนี้ — ไม่มีใครอื่น" */
  text: string
  /** positive = กล่องกำกับเชิงบวก (พื้นรอง + ● เขียว) เช่น "ไม่ถูกนำไปคิดคะแนน" */
  variant?: 'line' | 'positive'
}

/**
 * แถบความเป็นส่วนตัว — ทุกหน้าที่เก็บข้อมูลจากทีมต้องบอกว่าใครเห็นข้อมูลนี้บ้าง
 * วางติดกับสิ่งที่มันเกี่ยวข้อง ไม่ใช่แถบเตือนสีแรงบนหัว
 */
export function PrivacyNotice({ text, variant = 'line' }: PrivacyNoticeProps) {
  if (variant === 'positive') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '10px 12px',
          background: 'var(--dpm-subtle)',
          borderRadius: 'var(--dpm-radius-control)',
          fontSize: 11,
          color: 'var(--dpm-sub)',
          lineHeight: 1.5,
        }}
      >
        <span style={{ fontSize: 9, color: 'var(--dpm-green)', paddingTop: 2 }}>●</span>
        {text}
      </div>
    )
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 11,
        color: 'var(--dpm-sub)',
        lineHeight: 1.5,
      }}
    >
      <span style={{ fontSize: 9, color: 'var(--dpm-yellow)' }}>◆</span>
      {text}
    </div>
  )
}
