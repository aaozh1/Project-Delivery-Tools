import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Button, SkillTag } from '../components'
import {
  EXPOSURE_ROWS,
  PROFILE,
  STAGES,
  SUGGESTED_TOPICS,
  type ExposureLevel,
  type OneOnOneTopic,
} from './growth/data'

/** grid ของ Exposure Matrix — ใช้ร่วมกันทั้งหัวคอลัมน์ แถวข้อมูล และแถวสรุป */
const MATRIX_COLS = '132px repeat(6, minmax(0,1fr))'

type MatrixVariant = 'v1' | 'v2'

/**
 * สไตล์ช่องตาราง 3 ระดับ — ทั้งสองแนวห้ามใช้สีบอกระดับ
 * ใช้น้ำหนักหมึก + สัญลักษณ์เท่านั้น (อ่านได้ทั้งคนตาบอดสีและตอนพิมพ์ขาวดำ)
 */
const LEVEL_META: Record<
  ExposureLevel,
  {
    bg: string
    border: string
    borderStyle: 'solid' | 'dashed'
    mark: string
    markColor: string
    label: string
    labelColor: string
  }
> = {
  0: {
    bg: 'var(--dpm-surface)',
    border: 'var(--dpm-border)',
    borderStyle: 'dashed',
    mark: '',
    markColor: 'var(--dpm-mute)',
    label: 'ยังไม่เคย',
    labelColor: 'var(--dpm-mute)',
  },
  1: {
    bg: 'var(--dpm-border)',
    border: 'var(--dpm-border)',
    borderStyle: 'solid',
    mark: '◐',
    markColor: 'var(--dpm-sub)',
    label: 'เคย',
    labelColor: 'var(--dpm-sub)',
  },
  2: {
    bg: 'var(--dpm-ink)',
    border: 'var(--dpm-ink)',
    borderStyle: 'solid',
    mark: '✓',
    markColor: 'var(--dpm-bg)',
    label: 'ชำนาญ',
    labelColor: 'var(--dpm-disabled)',
  },
}

/** ลิงก์ข้อความสีเน้น (hover → หมึกเข้ม ตามสเปก ไม่มีเงา/ขีดเส้นใต้) */
function LinkText({
  children,
  onClick,
  fontSize = 12,
}: {
  children: ReactNode
  onClick?: () => void
  fontSize?: number
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        fontFamily: 'inherit',
        fontSize,
        color: hover ? 'var(--dpm-ink)' : 'var(--dpm-accent)',
        cursor: 'pointer',
        transition: 'color 150ms ease',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

/** ปุ่มสลับแนวตาราง (segment control ขนาดเล็ก) */
function VariantSegment({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: 'inherit',
        fontSize: 12,
        padding: '5px 12px',
        borderRadius: 'var(--dpm-radius-badge)',
        border: 'none',
        cursor: 'pointer',
        color: active ? 'var(--dpm-ink)' : 'var(--dpm-sub)',
        background: active ? 'var(--dpm-subtle)' : 'transparent',
        fontWeight: active ? 600 : 400,
        transition: 'background 150ms ease, color 150ms ease',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

const sectionCard: CSSProperties = {
  border: '1px solid var(--dpm-border)',
  borderRadius: 'var(--dpm-radius-card)',
  background: 'var(--dpm-surface)',
  overflow: 'hidden',
}

/**
 * S14 · Growth Profile — Exposure Matrix + สรุป 12 เดือน + บันทึกและการติดตาม + หัวข้อ 1-on-1
 * ผู้ใช้: หัวหน้าแผนกตอนคุย 1-on-1 และตัวพนักงานเอง
 *
 * กติกาจริยธรรม (จาก handoff §8): ไม่มีการจัดอันดับระหว่างพนักงาน · เทียบได้เฉพาะ
 * ตัวเองในอดีต + ค่าเฉลี่ยแผนก · ใช้คำว่า "ยังไม่เคย" (ห้าม "ขาด"/"อ่อน") · ไม่มีคะแนน/เกรด
 */
export function GrowthProfilePage() {
  const [matrixVariant, setMatrixVariant] = useState<MatrixVariant>('v1')
  const [topics, setTopics] = useState<OneOnOneTopic[]>(SUGGESTED_TOPICS)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const v1 = matrixVariant === 'v1'

  /** คอลัมน์ที่ว่างทั้งคอลัมน์ — จุดเดียวที่ใช้สีน้ำเงินหมึกในตาราง (Site และ Permit) */
  const emptyCols = STAGES.map((_, j) => EXPOSURE_ROWS.every((r) => r.cells[j] === 0))

  /** แถวสรุปล่าง: เคยทำในกี่ประเภทงาน (n/4 หรือ "ยังไม่เคย") */
  const colSummary = STAGES.map((_, j) => EXPOSURE_ROWS.filter((r) => r.cells[j] > 0).length)

  const removeTopic = (id: number) => setTopics((ts) => ts.filter((t) => t.id !== id))

  const addTopic = () => {
    const title = draft.trim()
    if (!title) return
    const nextId = topics.reduce((m, t) => Math.max(m, t.id), 0) + 1
    setTopics((ts) => [...ts, { id: nextId, title, why: 'หัวข้อที่คุณเพิ่มเอง' }])
    setDraft('')
    setAdding(false)
  }

  const logPct = (PROFILE.weeklyLogDone / PROFILE.weeklyLogTotal) * 100
  // แถบเทียบเดียวของหน้า: สเกลตั้งให้ขีดค่าเฉลี่ยแผนกอยู่ที่ 60% ของแถบ (ตาม prototype)
  const reworkScaleMax = PROFILE.reworkDeptAvgPct / 0.6
  const reworkSelfW = (PROFILE.reworkSelfPct / reworkScaleMax) * 100
  const reworkCompareText =
    PROFILE.reworkSelfPct < PROFILE.reworkDeptAvgPct
      ? 'น้อยกว่าค่าเฉลี่ย'
      : PROFILE.reworkSelfPct > PROFILE.reworkDeptAvgPct
        ? 'มากกว่าค่าเฉลี่ย'
        : 'เท่ากับค่าเฉลี่ย'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dpm-bg)' }}>
      {/* ── หัวหน้า ─────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--dpm-border)' }}>
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '20px var(--dpm-page-pad-x)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: 'var(--dpm-mute)', letterSpacing: '0.06em' }}>
              GROWTH PROFILE
            </div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em' }}>
                {PROFILE.name}
              </h1>
              <span style={{ fontSize: 14, color: 'var(--dpm-sub)' }}>{PROFILE.role}</span>
              <span style={{ fontSize: 13, color: 'var(--dpm-mute)' }}>{PROFILE.squadLine}</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--dpm-mute)' }}>
              หน้านี้เทียบกับตัวคุณเองในอดีตและค่าเฉลี่ยแผนกเท่านั้น — ไม่มีการจัดอันดับระหว่างพนักงาน
            </div>
          </div>
          <Button variant="secondary">ส่งออกสำหรับ 1-on-1</Button>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '24px var(--dpm-page-pad-x) 80px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* ── บล็อก 1 · Exposure Matrix (พระเอก) ─────────────── */}
        <div style={sectionCard}>
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--dpm-border)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>ประสบการณ์ที่ผ่านมา</div>
              <div style={{ marginTop: 3, fontSize: 12, color: 'var(--dpm-sub)' }}>
                ประเภทงาน × ขั้นตอนงาน — ช่องว่างคือสิ่งที่ยังไม่เคยทำ ไม่ใช่สิ่งที่ทำไม่ได้
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>รูปแบบ</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  border: '1px solid var(--dpm-border)',
                  borderRadius: 'var(--dpm-radius-control)',
                  background: 'var(--dpm-bg)',
                  padding: 3,
                }}
              >
                <VariantSegment
                  label="แนว 1 · แผนที่ช่องว่าง"
                  active={v1}
                  onClick={() => setMatrixVariant('v1')}
                />
                <VariantSegment
                  label="แนว 2 · ป้ายคำ"
                  active={!v1}
                  onClick={() => setMatrixVariant('v2')}
                />
              </div>
            </div>
          </div>

          <div style={{ padding: '18px 20px 20px' }}>
            {/* หัวคอลัมน์ — สีน้ำเงินหมึกเฉพาะคอลัมน์ที่ว่างทั้งคอลัมน์ */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: MATRIX_COLS,
                gap: 8,
                alignItems: 'end',
                marginBottom: 8,
              }}
            >
              <div />
              {STAGES.map((label, j) => (
                <div
                  key={label}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: emptyCols[j] ? 'var(--dpm-accent)' : 'var(--dpm-ink)',
                    textAlign: 'center',
                    paddingBottom: 4,
                    borderBottom: `1px solid ${emptyCols[j] ? 'var(--dpm-accent)' : 'var(--dpm-border)'}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* แถวข้อมูล */}
            {EXPOSURE_ROWS.map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: MATRIX_COLS,
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {row.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--dpm-mute)', marginTop: 1 }}>
                    {row.note}
                  </div>
                </div>
                {row.cells.map((lv, j) => {
                  const meta = LEVEL_META[lv]
                  return (
                    <div
                      key={j}
                      style={{
                        height: v1 ? 40 : 44,
                        borderRadius: 'var(--dpm-radius-control)',
                        background: meta.bg,
                        border: `1px ${meta.borderStyle} ${meta.border}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3,
                      }}
                    >
                      <span style={{ fontSize: 12, color: meta.markColor, lineHeight: 1 }}>
                        {v1 ? meta.mark : lv === 0 ? '—' : meta.mark}
                      </span>
                      {!v1 && (
                        <span style={{ fontSize: 10, color: meta.labelColor, lineHeight: 1 }}>
                          {meta.label}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}

            {/* แถวสรุปล่าง — จุดที่สองที่ใช้สีน้ำเงินหมึก */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: MATRIX_COLS,
                gap: 8,
                alignItems: 'center',
                marginTop: 12,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>เคยทำในกี่ประเภทงาน</div>
              {colSummary.map((n, j) => (
                <div key={j} style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: n === 0 ? 'var(--dpm-accent)' : 'var(--dpm-sub)',
                    }}
                  >
                    {n === 0 ? 'ยังไม่เคย' : `${n} / 4`}
                  </span>
                </div>
              ))}
            </div>

            {/* legend */}
            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: '1px solid var(--dpm-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                flexWrap: 'wrap',
                fontSize: 11,
                color: 'var(--dpm-sub)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <span
                  style={{
                    width: 26,
                    height: 16,
                    borderRadius: 'var(--dpm-radius-badge)',
                    background: 'var(--dpm-ink)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--dpm-bg)',
                    fontSize: 10,
                  }}
                >
                  ✓
                </span>
                ชำนาญ — ทำมาแล้วหลายโครงการ
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <span
                  style={{
                    width: 26,
                    height: 16,
                    borderRadius: 'var(--dpm-radius-badge)',
                    background: 'var(--dpm-border)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--dpm-sub)',
                    fontSize: 10,
                  }}
                >
                  ◐
                </span>
                เคย — ทำมาแล้วอย่างน้อยหนึ่งครั้ง
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <span
                  style={{
                    width: 26,
                    height: 16,
                    borderRadius: 'var(--dpm-radius-badge)',
                    background: 'var(--dpm-surface)',
                    border: '1px dashed var(--dpm-border)',
                    display: 'inline-block',
                  }}
                />
                ยังไม่เคย — โอกาสที่รออยู่
              </span>
            </div>
          </div>

          {/* ใต้ตาราง: ช่องว่างสำคัญ + อุปสรรค + ทางออก (ปุ่มสำคัญที่สุดในหน้า) */}
          <div
            style={{
              borderTop: '1px solid var(--dpm-border)',
              background: 'var(--dpm-subtle)',
              padding: '16px 20px',
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1fr) 200px',
              gap: 20,
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 10, color: 'var(--dpm-accent)', paddingTop: 4 }}>◆</span>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                  ช่องว่างสำคัญ: <b>ยังไม่เคยคุมหน้างาน (Site Supervision)</b> เลยใน 2 ปี —
                  เป็นเงื่อนไขของการขึ้นเป็น Senior
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 10, color: 'var(--dpm-yellow)', paddingTop: 4 }}>◆</span>
                <div style={{ fontSize: 13, color: 'var(--dpm-sub)', lineHeight: 1.6 }}>
                  อุปสรรค: Squad A ไม่มีงาน Site ใน 6 เดือนข้างหน้า และการย้ายข้าม Squad
                  ต้องผ่านหัวหน้าแผนก — หัวหน้า Squad แก้เรื่องนี้เองไม่ได้
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <Button variant="primary" style={{ width: '100%' }}>
                ส่งเรื่องถึงหัวหน้าแผนก
              </Button>
              <span style={{ fontSize: 11, color: 'var(--dpm-sub)', textAlign: 'center' }}>
                ส่งได้ทั้ง{PROFILE.name}และหัวหน้า Squad
              </span>
            </div>
          </div>
        </div>

        {/* ── บล็อก 2 + 3 (grid 2 คอลัมน์) ───────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr)',
            gap: 20,
            alignItems: 'start',
          }}
        >
          {/* บล็อก 2 · สรุป 12 เดือน */}
          <div style={sectionCard}>
            <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--dpm-border)' }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>สรุป 12 เดือนที่ผ่านมา</div>
              <div style={{ marginTop: 2, fontSize: 11, color: 'var(--dpm-mute)' }}>
                {PROFILE.periodLabel}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                borderBottom: '1px solid var(--dpm-border)',
              }}
            >
              <div style={{ padding: '14px 18px', borderRight: '1px solid var(--dpm-border)' }}>
                <div style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>โครงการที่ร่วม</div>
                <div style={{ marginTop: 4, fontSize: 30, fontWeight: 600, lineHeight: 1 }}>
                  {PROFILE.projectCount}
                </div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                <div style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>คน-สัปดาห์รวม</div>
                <div style={{ marginTop: 4, fontSize: 30, fontWeight: 600, lineHeight: 1 }}>
                  {PROFILE.totalPersonWeeks}
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--dpm-border)' }}>
              <div style={{ fontSize: 12, color: 'var(--dpm-sub)', marginBottom: 10 }}>
                ลักษณะงานที่ทำ
              </div>
              <div
                style={{
                  display: 'flex',
                  height: 12,
                  borderRadius: 'var(--dpm-radius-bar)',
                  overflow: 'hidden',
                  gap: 1,
                }}
              >
                {PROFILE.workMix.map((m) => (
                  <div key={m.label} style={{ width: `${m.pct}%`, background: m.color }} />
                ))}
              </div>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {PROFILE.workMix.map((m) => (
                  <div
                    key={m.label}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13 }}
                  >
                    <span
                      style={{
                        width: 11,
                        height: 11,
                        borderRadius: 'var(--dpm-radius-bar)',
                        background: m.color,
                        display: 'block',
                      }}
                    />
                    <span style={{ flex: 1 }}>{m.label}</span>
                    <span style={{ fontWeight: 600 }}>{m.pct}%</span>
                  </div>
                ))}
                {/* แถบเทียบเดียวของหน้า — ค่าตัวเอง vs ขีดค่าเฉลี่ยแผนก */}
                <div style={{ marginTop: 2, paddingLeft: 20 }}>
                  <div
                    style={{
                      position: 'relative',
                      height: 5,
                      background: 'var(--dpm-subtle)',
                      borderRadius: 'var(--dpm-radius-bar)',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${reworkSelfW}%`,
                        background: 'var(--dpm-yellow)',
                        borderRadius: 'var(--dpm-radius-bar)',
                        transition: 'width 260ms ease',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: '60%',
                        top: -4,
                        bottom: -4,
                        width: 1,
                        background: 'var(--dpm-sub)',
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 5, fontSize: 11, color: 'var(--dpm-sub)' }}>
                    แก้งานเดิมของคุณ {PROFILE.reworkSelfPct}% · เส้นคือค่าเฉลี่ยแผนก{' '}
                    {PROFILE.reworkDeptAvgPct}% — {reworkCompareText}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: 'var(--dpm-sub)', marginBottom: 9 }}>
                ทักษะที่ใช้บ่อย
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PROFILE.frequentSkills.map((s) => (
                  <SkillTag key={s} label={s} />
                ))}
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--dpm-sub)', marginBottom: 9 }}>
                ทักษะใหม่ปีนี้
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <SkillTag label={PROFILE.newSkill.label} isNew />
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--dpm-accent)',
                    border: '1px solid var(--dpm-border)',
                    background: 'var(--dpm-bg)',
                    borderRadius: 'var(--dpm-radius-pill)',
                    padding: '4px 10px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {PROFILE.newSkill.since}
                </span>
              </div>
            </div>
          </div>

          {/* บล็อก 3 · บันทึกและการติดตาม + หัวข้อ 1-on-1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={sectionCard}>
              <div
                style={{
                  padding: '13px 18px',
                  borderBottom: '1px solid var(--dpm-border)',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                บันทึกและการติดตาม
              </div>
              <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--dpm-border)' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>บันทึกรายสัปดาห์</span>
                  <span style={{ fontSize: 13 }}>
                    <b style={{ fontSize: 19, fontWeight: 600 }}>{PROFILE.weeklyLogDone}</b>{' '}
                    <span style={{ color: 'var(--dpm-mute)' }}>
                      / {PROFILE.weeklyLogTotal} สัปดาห์
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 8,
                    height: 6,
                    background: 'var(--dpm-subtle)',
                    borderRadius: 'var(--dpm-radius-bar)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${logPct}%`,
                      background: 'var(--dpm-green)',
                      borderRadius: 'var(--dpm-radius-bar)',
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 9,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* ไม่มี % compliance — เป็นคำขอบคุณตามข้อกำหนดจริยธรรม */}
                  <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
                    เขียนสม่ำเสมอมาก ขอบคุณครับ
                  </span>
                  <LinkText>ดูไทม์ไลน์</LinkText>
                </div>
              </div>

              <div style={{ padding: '15px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                  <span style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>
                    เรื่องที่เคยขอความช่วยเหลือ
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--dpm-yellow)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <span style={{ fontSize: 9 }}>◆</span>ยังไม่ได้ตอบ 1 เรื่อง
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    padding: '11px 13px',
                    border: '1px solid var(--dpm-yellow)',
                    borderRadius: 'var(--dpm-radius-control)',
                    background: 'var(--dpm-surface)',
                  }}
                >
                  <div style={{ fontSize: 14, lineHeight: 1.5 }}>{PROFILE.helpRequest.quote}</div>
                  <div
                    style={{
                      marginTop: 5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
                      {PROFILE.helpRequest.meta}
                    </span>
                    <LinkText>จับคู่ผู้สอน</LinkText>
                  </div>
                </div>
              </div>
            </div>

            {/* หัวข้อสำหรับ 1-on-1 ครั้งหน้า (พื้นรอง) */}
            <div style={{ ...sectionCard, background: 'var(--dpm-subtle)' }}>
              <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--dpm-border)' }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>หัวข้อสำหรับ 1-on-1 ครั้งหน้า</div>
                <div style={{ marginTop: 2, fontSize: 11, color: 'var(--dpm-sub)' }}>
                  ระบบเสนอจากข้อมูลด้านบน — แก้หรือลบได้
                </div>
              </div>
              <div style={{ background: 'var(--dpm-surface)' }}>
                {topics.map((t, i) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '22px minmax(0,1fr) 26px',
                      gap: 10,
                      alignItems: 'start',
                      padding: '13px 18px',
                      borderBottom: '1px solid var(--dpm-border)',
                    }}
                  >
                    <span
                      className="dpm-mono"
                      style={{ fontSize: 12, color: 'var(--dpm-mute)', paddingTop: 2 }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <div style={{ fontSize: 14, lineHeight: 1.5 }}>{t.title}</div>
                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 12,
                          color: 'var(--dpm-sub)',
                          lineHeight: 1.5,
                        }}
                      >
                        {t.why}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTopic(t.id)}
                      aria-label={`ลบหัวข้อ ${t.title}`}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        fontFamily: 'inherit',
                        fontSize: 13,
                        color: 'var(--dpm-mute)',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'color 150ms ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--dpm-ink)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--dpm-mute)'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {topics.length === 0 && (
                  <div
                    style={{
                      padding: '13px 18px',
                      borderBottom: '1px solid var(--dpm-border)',
                      fontSize: 12,
                      color: 'var(--dpm-mute)',
                    }}
                  >
                    ยังไม่มีหัวข้อ — เพิ่มหัวข้อของคุณเองได้ด้านล่าง
                  </div>
                )}

                {adding ? (
                  <div
                    style={{
                      padding: '12px 18px',
                      borderBottom: '1px solid var(--dpm-border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <input
                      className="dpm-input"
                      style={{ flex: 1, width: 'auto', textAlign: 'left', fontWeight: 400 }}
                      placeholder="หัวข้อที่อยากคุย"
                      value={draft}
                      autoFocus
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addTopic()
                        if (e.key === 'Escape') {
                          setAdding(false)
                          setDraft('')
                        }
                      }}
                    />
                    <Button variant="secondary" onClick={addTopic}>
                      เพิ่ม
                    </Button>
                  </div>
                ) : null}

                <div
                  style={{
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <LinkText onClick={() => setAdding((a) => !a)}>
                    {adding ? 'ยกเลิกการเพิ่ม' : '+ เพิ่มหัวข้อของคุณเอง'}
                  </LinkText>
                  <span style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
                    {PROFILE.nextOneOnOne}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
