import { useState, type ReactNode } from 'react'
import {
  AllocationCell,
  Button,
  ConstraintNotice,
  DualProgressBar,
  MaskedValue,
  MoneyFigure,
  NoAccessBlock,
  PhaseStatusPill,
  PhaseTrack,
  RequestCard,
  RevisionCounter,
  RiskFlag,
  SkillTag,
  SquadBalanceBar,
  WorkloadCell,
} from '../components'
import { PHASE_STATUS_ORDER } from '../lib/status'

/* ────────────────────────────────────────────────────────── */

const COLOR_GROUPS = [
  {
    title: 'พื้นหลังและเส้น',
    items: [
      { hex: '#FAFAF8', use: 'พื้นหลังหลักของทุกหน้า' },
      { hex: '#FFFFFF', use: 'พื้นการ์ดและแถวตาราง' },
      { hex: '#F2F1ED', use: 'พื้นรอง · แถบด้านข้าง · หัวตาราง' },
      { hex: '#E8E7E2', use: 'พื้นตอนชี้เมาส์บนพื้นรอง' },
      { hex: '#E3E2DD', use: 'เส้นกรอบ 1px ทุกเส้น' },
    ],
  },
  {
    title: 'ตัวอักษร',
    items: [
      { hex: '#1C1C1A', use: 'ตัวอักษรหลัก · ตัวเลขสำคัญ' },
      { hex: '#6B6B66', use: 'ตัวอักษรรอง · คำอธิบาย' },
      { hex: '#9A9A94', use: 'ตัวอักษรจาง · label เล็ก' },
      { hex: '#C9C8C3', use: 'ตัวอักษรสถานะปิดใช้งาน' },
    ],
  },
  {
    title: 'สีเน้น (เดียว) และสถานะ',
    items: [
      { hex: '#2B4C7E', use: 'สีเน้นเดียวของระบบ · ปุ่มหลัก ลิงก์' },
      { hex: '#2F7A4F', use: 'เขียว ปกติ · สัญลักษณ์ ●' },
      { hex: '#C79A2E', use: 'เหลือง เตือน · สัญลักษณ์ ◆' },
      { hex: '#B33A3A', use: 'แดง วิกฤต · สัญลักษณ์ ▲' },
      { hex: '#5B7C99', use: 'น้ำเงิน โหลดต่ำ · สัญลักษณ์ ○' },
      { hex: '#8A6E1F', use: 'ตัวอักษรบนพื้นเหลืองจาง (แถบยังไม่บันทึก)' },
    ],
  },
  {
    title: 'พื้นจางของสถานะ · ใช้เฉพาะแถวหรือช่องที่ต้องเน้น',
    items: [
      { hex: '#FBF1F1', use: 'พื้นแถววิกฤต' },
      { hex: '#FBF6EA', use: 'พื้นแถบเตือน · แถบยังไม่บันทึก' },
      { hex: '#F3F7F3', use: 'พื้นช่องสถานะปกติ (โหมดสแกน)' },
      { hex: '#F1F4F7', use: 'พื้นช่องโหลดต่ำ (โหมดสแกน)' },
    ],
  },
]

const TYPE_SCALE = [
  { size: 40, weight: 600, tracking: '-0.02em', sample: '฿622,000', use: 'Margin ตัวเลขพระเอกในแผงคำนวณ' },
  { size: 34, weight: 600, tracking: '-0.02em', sample: '฿48.2M', use: 'ตัวเลข KPI แถบบนสุด (อ่านจากระยะ 2 ม.)' },
  { size: 30, weight: 600, tracking: '-0.01em', sample: '44', use: 'ตัวเลขสรุปในการ์ด' },
  { size: 24, weight: 600, tracking: '-0.015em', sample: 'คุณซี', use: 'ชื่อในหัว Growth Profile' },
  { size: 22, weight: 600, tracking: '-0.01em', sample: 'Portfolio Control Room', use: 'ชื่อหน้า (H1)' },
  { size: 20, weight: 600, tracking: '-0.01em', sample: 'จัดสรรกำลังคน — Squad A', use: 'ชื่อหน้าในแถบนำทาง · ตัวเลขรวมในแถว' },
  { size: 18, weight: 600, tracking: '0', sample: 'ประสบการณ์ที่ผ่านมา', use: 'หัวข้อบล็อกใหญ่ · % ในช่องภาระงาน' },
  { size: 17, weight: 600, tracking: '0', sample: 'ต้องตัดสินใจ', use: 'หัวข้อบล็อก · ตัวเลขเด่นในช่องตาราง' },
  { size: 16, weight: 600, tracking: '0', sample: '฿1,800,000', use: 'จำนวนเงินในแถวสรุป' },
  { size: 15, weight: 600, tracking: '0', sample: 'Café ทองหล่อ', use: 'ชื่อโครงการในแถวตาราง' },
  { size: 14, weight: 500, tracking: '0', sample: 'ใช้คน-สัปดาห์ไปแล้ว 132%', use: 'เนื้อหาหลัก · ประโยคในกฎธุรกิจ' },
  { size: 13, weight: 400, tracking: '0', sample: 'เรียงตามความเสี่ยง', use: 'ปุ่ม · เมนู · เนื้อหารอง' },
  { size: 12, weight: 400, tracking: '0', sample: 'Squad D (คุณเอ) · ลูกค้า คุณสมชาย', use: 'คำอธิบาย · หัวคอลัมน์' },
  { size: 11, weight: 400, tracking: '0', sample: 'ปรับทีละ 0.25 คน-สัปดาห์', use: 'label เล็ก · หมายเหตุ · legend' },
  { size: 10, weight: 400, tracking: '0', sample: 'คน-สัปดาห์', use: 'หน่วยใต้ตัวเลข (เล็กสุดที่ใช้ได้)' },
]

const SPACING = [
  { px: 2, use: 'ช่องไฟระหว่างก้อน 0.25' },
  { px: 4, use: 'ระยะในป้ายเล็ก' },
  { px: 6, use: 'ระยะไอคอน–ข้อความ' },
  { px: 8, use: 'หน่วยฐาน · gap ทั่วไป' },
  { px: 12, use: 'ระยะในช่องตาราง' },
  { px: 16, use: 'padding การ์ด · gap บล็อก' },
  { px: 20, use: 'padding การ์ดใหญ่' },
  { px: 24, use: 'gap คอลัมน์หลัก' },
  { px: 32, use: 'padding ซ้าย-ขวาของหน้า' },
  { px: 40, use: 'ระยะระหว่างหมวดใหญ่' },
]

const RADII = [
  { px: 2, use: 'แถบข้อมูล · ก้อน 0.25' },
  { px: 3, use: 'กล่องสัญลักษณ์เล็ก · ป้ายตัวเลข' },
  { px: 4, use: 'ปุ่ม · ช่องกรอก · ป้ายสถานะ' },
  { px: 6, use: 'การ์ด · กล่องใหญ่ · modal' },
  { px: 20, use: 'ชิปตัวเลือก · แท็กทักษะ (pill)' },
]

const HEIGHTS = [
  { px: 56, use: 'แถบนำทางบน' },
  { px: 44, use: 'แถวติ๊กบนมือถือ (hit target ต่ำสุด)' },
  { px: 38, use: 'ปุ่มหลัก desktop · ช่องจัดสรร' },
  { px: 34, use: 'ปุ่มรอง' },
  { px: 30, use: 'ช่องกรอกตัวเลขกลางประโยค' },
  { px: 37, use: 'หัวตาราง (padding 9px)' },
  { px: 52, use: 'แถวตารางบรรทัดเดียว (padding 14px)' },
  { px: 74, use: 'แถวตารางสองบรรทัด / ช่องภาระงาน' },
  { px: 8, use: 'แถบสมดุล Squad' },
  { px: 7, use: 'แถบซ้อนสองชั้น (ชั้นละ 7px เว้น 3px)' },
]

/* ────────────────────────────────────────────────────────── */

function Section({ index, title, hint, children }: { index: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          paddingBottom: 10,
          borderBottom: '1px solid var(--dpm-ink)',
          marginBottom: 18,
        }}
      >
        <span className="dpm-mono" style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
          {index}
        </span>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>{title}</h2>
        {hint && <span style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function StateLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 11, color: 'var(--dpm-mute)', marginBottom: 7 }}>{children}</div>
}

/* ────────────────────────────────────────────────────────── */

export function DesignSystemPage() {
  const [alloc, setAlloc] = useState(0.5)

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px var(--dpm-page-pad-x) 100px' }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em' }}>
          Design Token และชุด Component พื้นฐาน
        </h1>
        <div style={{ marginTop: 5, fontSize: 13, color: 'var(--dpm-sub)' }}>
          ค่าทุกค่าในหน้านี้คือค่าที่ใช้จริงในทั้ง 8 หน้าจอ · ใช้เป็นแหล่งอ้างอิงเดียวตอนพัฒนา ·
          เทียบกับ docs/design-handoff/designs/Design System.dc.html
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
        {/* 01 สี */}
        <Section index="01" title="สี" hint="19 ค่า · สีเน้นเดียว · สถานะ 4 ระดับ + พื้นจางของแต่ละสถานะ">
          {COLOR_GROUPS.map((g) => (
            <div key={g.title} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--dpm-mute)', marginBottom: 8 }}>{g.title}</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 10,
                }}
              >
                {g.items.map((c) => (
                  <div key={c.hex} className="dpm-card">
                    <div style={{ height: 56, background: c.hex, borderBottom: '1px solid var(--dpm-border)' }} />
                    <div style={{ padding: '9px 12px' }}>
                      <div className="dpm-mono" style={{ fontSize: 12, fontWeight: 500 }}>
                        {c.hex}
                      </div>
                      <div style={{ marginTop: 3, fontSize: 11, color: 'var(--dpm-sub)', lineHeight: 1.45 }}>
                        {c.use}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>

        {/* 02 ตัวอักษร */}
        <Section
          index="02"
          title="ตัวอักษร"
          hint="IBM Plex Sans Thai · ตัวเลขเป็น tabular-nums ทุกที่ · IBM Plex Mono เฉพาะรหัสโครงการ"
        >
          <div className="dpm-card">
            <div
              className="dpm-table-head"
              style={{ display: 'grid', gridTemplateColumns: '74px 74px minmax(0,1fr) 260px' }}
            >
              <div style={{ padding: '8px 14px' }}>ขนาด</div>
              <div style={{ padding: '8px 12px', borderLeft: '1px solid var(--dpm-border)' }}>น้ำหนัก</div>
              <div style={{ padding: '8px 12px', borderLeft: '1px solid var(--dpm-border)' }}>ตัวอย่าง</div>
              <div style={{ padding: '8px 12px', borderLeft: '1px solid var(--dpm-border)' }}>ใช้ที่ไหน</div>
            </div>
            {TYPE_SCALE.map((t) => (
              <div
                key={t.size}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '74px 74px minmax(0,1fr) 260px',
                  borderBottom: '1px solid var(--dpm-border)',
                  alignItems: 'center',
                }}
              >
                <div className="dpm-mono" style={{ padding: '10px 14px', fontSize: 12 }}>
                  {t.size}
                </div>
                <div
                  className="dpm-mono"
                  style={{ padding: '10px 12px', fontSize: 12, color: 'var(--dpm-sub)', borderLeft: '1px solid var(--dpm-border)' }}
                >
                  {t.weight}
                </div>
                <div style={{ padding: '10px 12px', borderLeft: '1px solid var(--dpm-border)', overflow: 'hidden' }}>
                  <span
                    style={{
                      fontSize: t.size,
                      fontWeight: t.weight,
                      letterSpacing: t.tracking,
                      lineHeight: 1.2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t.sample}
                  </span>
                </div>
                <div
                  style={{
                    padding: '10px 12px',
                    fontSize: 12,
                    color: 'var(--dpm-sub)',
                    borderLeft: '1px solid var(--dpm-border)',
                    lineHeight: 1.45,
                  }}
                >
                  {t.use}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 03 ระยะห่าง มุมโค้ง ความสูง */}
        <Section index="03" title="ระยะห่าง มุมโค้ง ความสูง">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16 }}>
            <div className="dpm-card">
              <div
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--dpm-border)',
                  background: 'var(--dpm-subtle)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                ระยะห่าง · ฐาน 8px
              </div>
              {SPACING.map((s) => (
                <div
                  key={s.px}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '52px minmax(0,1fr) 110px',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 14px',
                    borderBottom: '1px solid var(--dpm-border)',
                  }}
                >
                  <span className="dpm-mono" style={{ fontSize: 12 }}>
                    {s.px}
                  </span>
                  <span
                    style={{ height: 8, background: 'var(--dpm-ink)', borderRadius: 2, width: s.px, display: 'block' }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--dpm-sub)', textAlign: 'right' }}>{s.use}</span>
                </div>
              ))}
            </div>

            <div className="dpm-card">
              <div
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--dpm-border)',
                  background: 'var(--dpm-subtle)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                มุมโค้ง
              </div>
              {RADII.map((r) => (
                <div
                  key={r.px}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '52px 48px minmax(0,1fr)',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 14px',
                    borderBottom: '1px solid var(--dpm-border)',
                  }}
                >
                  <span className="dpm-mono" style={{ fontSize: 12 }}>
                    {r.px}
                  </span>
                  <span
                    style={{
                      width: 34,
                      height: 26,
                      background: 'var(--dpm-subtle)',
                      border: '1px solid var(--dpm-border)',
                      borderRadius: r.px,
                      display: 'block',
                    }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--dpm-sub)', lineHeight: 1.4 }}>{r.use}</span>
                </div>
              ))}
            </div>

            <div className="dpm-card">
              <div
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--dpm-border)',
                  background: 'var(--dpm-subtle)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                ความสูงแถวและปุ่ม
              </div>
              {HEIGHTS.map((h) => (
                <div
                  key={h.px + h.use}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '52px minmax(0,1fr)',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 14px',
                    borderBottom: '1px solid var(--dpm-border)',
                  }}
                >
                  <span className="dpm-mono" style={{ fontSize: 12 }}>
                    {h.px}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--dpm-sub)', lineHeight: 1.4 }}>{h.use}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* 04 Component */}
        <Section index="04" title="ชุด Component" hint="แต่ละตัวแสดงทุกสถานะที่เป็นไปได้">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* ช่องจัดสรร */}
            <div className="dpm-card">
              <div className="dpm-card__header">
                <span className="dpm-card__title">ช่องจัดสรรคน-สัปดาห์</span>
                <span className="dpm-card__hint">
                  ค่าที่เลือกได้ 0.25 / 0.50 / 0.75 / 1.00 · หนึ่งก้อน = 0.25 · คลิกเดียวจบ
                </span>
              </div>
              <div
                className="dpm-card__body"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(216px, 1fr))', gap: 16 }}
              >
                <div>
                  <StateLabel>ปกติ · กดได้จริง</StateLabel>
                  <AllocationCell value={alloc} onChange={setAlloc} label="ตัวอย่างช่องจัดสรร" />
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--dpm-mute)' }}>
                    คลิกก้อนที่ต้องการ · คลิกซ้ำเพื่อล้าง
                  </div>
                </div>
                <div>
                  <StateLabel>ผิดพลาด · รวมเกิน 1.00</StateLabel>
                  <AllocationCell value={1.0} state="error" />
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--dpm-red)' }}>
                    เกินเต็มสัปดาห์ — ลดลง 0.25
                  </div>
                </div>
                <div>
                  <StateLabel>ปิดใช้งาน · ปิดรอบแล้ว</StateLabel>
                  <AllocationCell value={0.5} state="disabled" />
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--dpm-sub)' }}>
                    สัปดาห์นี้ปิดรอบแล้ว — ขอเปิดรอบย้อนหลังที่หัวหน้าแผนก
                  </div>
                </div>
                <div>
                  <StateLabel>ว่างเปล่า · ยังไม่จัดสรร</StateLabel>
                  <AllocationCell value={0} onChange={() => undefined} />
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--dpm-mute)' }}>
                    คนนี้ยังไม่ได้รับงานในสัปดาห์นี้
                  </div>
                </div>
                <div>
                  <StateLabel>กำลังโหลด</StateLabel>
                  <AllocationCell value={0} state="loading" />
                </div>
                <div>
                  <StateLabel>ไม่มีสิทธิ์ · คนนอก Squad</StateLabel>
                  <AllocationCell value={0.5} state="locked" />
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--dpm-sub)' }}>
                    จัดสรรได้เฉพาะสมาชิก Squad ของคุณ — ขอย้ายคนที่หัวหน้าแผนก
                  </div>
                </div>
              </div>
            </div>

            {/* ช่องภาระงาน */}
            <div className="dpm-card">
              <div className="dpm-card__header">
                <span className="dpm-card__title">ช่องภาระงาน</span>
                <span className="dpm-card__hint">
                  จำนวนโครงการ + % โหลด ในช่องเดียว · จุด = โครงการ · จุดแดง = เกินเกณฑ์ตำแหน่ง
                </span>
              </div>
              <div
                className="dpm-card__body"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 14 }}
              >
                <div>
                  <StateLabel>วิกฤต · เกิน 110%</StateLabel>
                  <WorkloadCell pct={118} projectCount={3} projectLimit={2} />
                </div>
                <div>
                  <StateLabel>เตือน · 100–110%</StateLabel>
                  <WorkloadCell pct={105} projectCount={2} projectLimit={2} />
                </div>
                <div>
                  <StateLabel>ปกติ · 65–100%</StateLabel>
                  <WorkloadCell pct={95} projectCount={2} projectLimit={2} />
                </div>
                <div>
                  <StateLabel>โหลดต่ำ · ต่ำกว่า 65%</StateLabel>
                  <WorkloadCell pct={45} projectCount={1} projectLimit={2} />
                </div>
                <div>
                  <StateLabel>ว่างเปล่า</StateLabel>
                  <WorkloadCell state="empty" onAllocate={() => undefined} />
                </div>
                <div>
                  <StateLabel>กำลังโหลด</StateLabel>
                  <WorkloadCell state="loading" />
                </div>
                <div>
                  <StateLabel>ไม่มีสิทธิ์เข้าถึง</StateLabel>
                  <WorkloadCell state="locked" />
                </div>
              </div>
            </div>

            {/* แถบสมดุล + แถบซ้อน */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
              <div className="dpm-card">
                <div className="dpm-card__header">
                  <span className="dpm-card__title">แถบสมดุล Squad</span>
                </div>
                <div className="dpm-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <SquadBalanceBar name="Squad A" pct={102} />
                  <SquadBalanceBar name="Squad B" pct={118} />
                  <SquadBalanceBar name="Squad C" pct={85} />
                  <SquadBalanceBar name="Squad D" pct={55} />
                  <div style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
                    เส้นดำ = ระดับ 100% · แถบยาวเกินเส้นคือรับงานเกินกำลัง
                  </div>
                </div>
              </div>

              <div className="dpm-card">
                <div className="dpm-card__header">
                  <span className="dpm-card__title">แถบซ้อนสองชั้น · ใช้ไป เทียบ คืบหน้า</span>
                </div>
                <div className="dpm-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <StateLabel>ใช้แรงงานเร็วกว่างานมาก · วิกฤต</StateLabel>
                    <DualProgressBar progress={45} used={132} />
                  </div>
                  <div>
                    <StateLabel>เร็วกว่าเล็กน้อย · เตือน</StateLabel>
                    <DualProgressBar progress={38} used={71} />
                  </div>
                  <div>
                    <StateLabel>เดินคู่กันตามแผน · ปกติ</StateLabel>
                    <DualProgressBar progress={60} used={52} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--dpm-mute)', lineHeight: 1.5 }}>
                    ชั้นบน = ความคืบหน้างาน · ชั้นล่าง = คน-สัปดาห์ที่ใช้ · ขีดตั้งบนชั้นล่างคือตำแหน่งของความคืบหน้า
                  </div>
                </div>
              </div>
            </div>

            {/* สถานะงวดงาน */}
            <div className="dpm-card">
              <div className="dpm-card__header">
                <span className="dpm-card__title">ป้ายสถานะงวดงาน 6 ขั้น</span>
                <span className="dpm-card__hint">เดินหน้าทางเดียว · ขั้นที่ยังไม่ถึงเป็นเส้นประ</span>
              </div>
              <div className="dpm-card__body">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {PHASE_STATUS_ORDER.map((s) => (
                    <PhaseStatusPill key={s} status={s} />
                  ))}
                </div>
                <PhaseTrack current="approved" />
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--dpm-mute)' }}>
                  ตัวอย่างงวด 3 ของ ID-2026-004: เดินมาถึง “อนุมัติแล้ว” · ค้างรอวางบิล 12 วัน
                </div>
              </div>
            </div>

            {/* ป้ายความเสี่ยง + เงิน */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
              <div className="dpm-card">
                <div className="dpm-card__header">
                  <span className="dpm-card__title">ป้ายความเสี่ยง 4 ระดับ</span>
                  <span className="dpm-card__hint">สี + สัญลักษณ์ + คำ</span>
                </div>
                <div className="dpm-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {(
                    [
                      ['critical', 'ส่วนต่างเกิน 15 จุด · โหลดเกิน 110%'],
                      ['warn', 'ส่วนต่าง 5–15 จุด · โหลด 100–110%'],
                      ['ok', 'ส่วนต่างต่ำกว่า 5 จุด · โหลด 65–100%'],
                      ['low', 'โหลดต่ำกว่า 65% — ไม่ใช่ความผิด เป็นโอกาสรับงาน'],
                    ] as const
                  ).map(([level, rule]) => (
                    <div
                      key={level}
                      style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', alignItems: 'center', gap: 12 }}
                    >
                      <RiskFlag level={level} />
                      <span style={{ fontSize: 12, color: 'var(--dpm-sub)' }}>{rule}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 12,
                      borderTop: '1px solid var(--dpm-border)',
                      fontSize: 11,
                      color: 'var(--dpm-mute)',
                      lineHeight: 1.55,
                    }}
                  >
                    ห้ามใช้สีอย่างเดียวสื่อสถานะ — ผู้ชายไทยราว 8% ตาบอดสี
                    ทุกป้ายจึงมีสัญลักษณ์ต่างรูปกำกับ และอ่านได้เมื่อพิมพ์ขาวดำ
                  </div>
                </div>
              </div>

              <div className="dpm-card">
                <div className="dpm-card__header">
                  <span className="dpm-card__title">การแสดงจำนวนเงิน</span>
                </div>
                <div className="dpm-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {(
                    [
                      [<MoneyFigure key="a" value={1_800_000} size={20} />, 'จำนวนเต็ม ใช้ในแผงคำนวณและตารางที่ต้องบวกเลขด้วยตา'],
                      [<MoneyFigure key="b" value={-842_000} size={20} />, 'ค่าใช้จ่าย ใช้ − นำหน้า ไม่ใช้วงเล็บ ไม่ใช้สีแดงถ้าเป็นรายการปกติ'],
                      [<MoneyFigure key="c" value={48_200_000} abbrev size={24} />, 'ตัวเลขระดับผู้บริหาร ย่อ M ทศนิยม 1 ตำแหน่ง'],
                      [<MoneyFigure key="d" value={842_000} abbrev size={20} />, 'ย่อ K เมื่อพื้นที่จำกัด (ในการ์ดหรือช่องตารางแคบ)'],
                      [
                        <span key="e" style={{ fontSize: 20, fontWeight: 600, color: 'var(--dpm-red)' }}>−4%</span>,
                        'เปอร์เซ็นต์ติดลบที่เป็นปัญหาจริง เช่น Margin ขาดทุน — ใส่สีแดงได้ (ห้ามผสม ฿ กับ %)',
                      ],
                      [<MoneyFigure key="f" value={null} size={20} />, 'ยังไม่มีข้อมูล แสดง ฿0 สีจาง ไม่แสดงช่องว่างเปล่า'],
                    ] as const
                  ).map(([node, use], i) => (
                    <div
                      key={i}
                      style={{ display: 'grid', gridTemplateColumns: '150px minmax(0,1fr)', alignItems: 'baseline', gap: 14 }}
                    >
                      {node}
                      <span style={{ fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.45 }}>{use}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ข้อจำกัดพร้อมทางออก */}
            <div className="dpm-card">
              <div className="dpm-card__header">
                <span className="dpm-card__title">แถบข้อจำกัดพร้อมทางออก</span>
                <span className="dpm-card__hint">ทุกที่ที่บอกว่า “ทำไม่ได้” ต้องบอกด้วยว่า “ต้องทำอย่างไร”</span>
              </div>
              <div className="dpm-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <StateLabel>ปกติ · อธิบายกติกาพร้อมทางออก</StateLabel>
                  <ConstraintNotice
                    text="จัดสรรได้เฉพาะสมาชิก Squad A"
                    how="ถ้าต้องการคนจาก Squad อื่น หัวหน้าแผนกเป็นผู้ย้ายให้"
                    cta="ส่งคำขอถึงหัวหน้าแผนก"
                  />
                </div>
                <div>
                  <StateLabel>ส่งคำขอแล้ว · รออนุมัติ</StateLabel>
                  <ConstraintNotice
                    state="pending"
                    text="ส่งคำขอย้ายคุณเคเข้า Squad A แล้ว"
                    how="รอหัวหน้าแผนกพิจารณา · ส่งเมื่อ 2 ส.ค. 09:12"
                    cta="ดูสถานะคำขอ"
                  />
                </div>
              </div>
            </div>

            {/* การ์ดคำขอ + แท็ก/ตัวนับ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
              <div className="dpm-card">
                <div className="dpm-card__header">
                  <span className="dpm-card__title">การ์ดคำขอ</span>
                </div>
                <div className="dpm-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <StateLabel>ปกติ · คำขอกำลังเสริม</StateLabel>
                    <RequestCard
                      kind="capacity"
                      age="ขอมา 2 วัน"
                      body="Squad B ขอ Mid เพิ่ม 1 คน เป็นเวลา 6 สัปดาห์"
                      reason="เหตุผล: ID-2026-020 เข้างวด DD · Squad C มีคนว่างพอ 0.5 คน-สัปดาห์/สัปดาห์"
                      impact="ผลกระทบ: Squad C ขึ้นเป็น 96% ใน ต.ค."
                    />
                  </div>
                  <div>
                    <StateLabel>ปกติ · คำขอย้ายคน</StateLabel>
                    <RequestCard
                      kind="transfer"
                      age="ขอมา 5 วัน"
                      body="ย้ายคุณซี จาก Squad A ไป Squad C 4 สัปดาห์"
                      reason="เหตุผล: ต้องการประสบการณ์งาน Site ที่ Squad A ไม่มี · เกินเกณฑ์รีวิว 3 วัน"
                      impact="ผลกระทบ: Squad A ลด 0.5 คน-สัปดาห์/สัปดาห์"
                    />
                  </div>
                  <div>
                    <StateLabel>ปิดใช้งาน · ไม่มีสิทธิ์อนุมัติ</StateLabel>
                    <RequestCard
                      kind="transfer"
                      state="readonly"
                      age="ขอมา 1 วัน"
                      body="ย้ายคุณเค จาก Squad C ไป Squad B 6 สัปดาห์"
                      reason="คำขอนี้อนุมัติโดยหัวหน้าแผนก Interior — คุณดูได้แต่ไม่ได้เป็นผู้อนุมัติ"
                      impact="ติดต่อ คุณกิตติ (HoD Interior)"
                    />
                  </div>
                  <div>
                    <StateLabel>ตัดสินใจแล้ว</StateLabel>
                    <RequestCard
                      kind="capacity"
                      state="decided"
                      age="อนุมัติเมื่อ 1 ส.ค."
                      body="อนุมัติ Mid 1 คน 6 สัปดาห์ ให้ Squad B"
                      reason="ผู้อนุมัติ: คุณกิตติ · เริ่มมีผลสัปดาห์ 33"
                      impact="ย้อนกลับได้ภายใน 7 วัน"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="dpm-card">
                  <div className="dpm-card__header">
                    <span className="dpm-card__title">แท็กทักษะ</span>
                  </div>
                  <div className="dpm-card__body" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <SkillTag label="AutoCAD" />
                    <SkillTag label="SketchUp" selected />
                    <SkillTag label="Revit" isNew />
                    <SkillTag label="+ เพิ่มทักษะ" addable />
                    <SkillTag label="Rhino" disabled />
                  </div>
                </div>

                <div className="dpm-card">
                  <div className="dpm-card__header">
                    <span className="dpm-card__title">ตัวนับรอบแก้แบบ</span>
                  </div>
                  <div className="dpm-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <StateLabel>ปกติ · ยังอยู่ในโควตา</StateLabel>
                      <RevisionCounter used={1} quota={2} />
                    </div>
                    <div>
                      <StateLabel>เตือน · ใช้โควตาครบ</StateLabel>
                      <RevisionCounter used={2} quota={2} />
                    </div>
                    <div>
                      <StateLabel>วิกฤต · เกินโควตา</StateLabel>
                      <RevisionCounter
                        used={3}
                        quota={2}
                        note="เกินโควตา 1 รอบ · ต้นทุนเพิ่ม 2.5 คน-สัปดาห์ — ต้องให้หัวหน้าแผนกตัดสินว่าเก็บเงินเพิ่มหรือแถม"
                      />
                    </div>
                    <div>
                      <StateLabel>ว่างเปล่า · ยังไม่มีการแก้</StateLabel>
                      <RevisionCounter used={0} quota={2} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ไม่มีสิทธิ์เข้าถึง */}
            <div className="dpm-card dpm-card--critical">
              <div className="dpm-card__header">
                <span className="dpm-card__title">สถานะ “ไม่มีสิทธิ์เข้าถึง”</span>
                <span className="dpm-card__hint">ต้องไม่ดูเหมือนข้อผิดพลาด — บอกเหตุผลและบอกว่าติดต่อใคร</span>
              </div>
              <div
                style={{
                  padding: 18,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: 16,
                }}
              >
                <div>
                  <StateLabel>ระดับช่องข้อมูล · ตัวเลขถูกปิด</StateLabel>
                  <MaskedValue label="เรตกลาง Senior / คน-สัปดาห์" value="฿30,000" />
                </div>
                <div>
                  <StateLabel>ระดับบล็อก · แทนที่เนื้อหาทั้งกล่อง</StateLabel>
                  <NoAccessBlock
                    reason="ตัวเลขต้นทุนค่าแรงเปิดให้เฉพาะ Head of Project Delivery และฝ่ายบุคคล — ไม่ใช่ข้อผิดพลาด และไม่ต้องแจ้งฝ่ายไอที"
                    contact="ติดต่อ คุณณัฐพงศ์ (HoPD)"
                  />
                </div>
                <div>
                  <StateLabel>ระดับปุ่ม · กดไม่ได้แต่บอกทางออก</StateLabel>
                  <div
                    style={{
                      border: '1px solid var(--dpm-border)',
                      borderRadius: 'var(--dpm-radius-card)',
                      background: 'var(--dpm-bg)',
                      padding: 16,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Button variant="secondary" disabled>
                        ย้ายคนข้าม Squad
                      </Button>
                    </div>
                    <div style={{ marginTop: 9, fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.6 }}>
                      หัวหน้า Squad ย้ายคนข้าม Squad ไม่ได้ตามกติกา — ส่งคำขอให้หัวหน้าแผนกอนุมัติแทน
                    </div>
                    <div style={{ marginTop: 9 }}>
                      <a role="button" tabIndex={0} style={{ fontSize: 12, cursor: 'pointer' }}>
                        ส่งคำขอถึงหัวหน้าแผนก →
                      </a>
                    </div>
                  </div>
                </div>
                <div>
                  <StateLabel>เทียบกับสถานะผิดพลาดจริง (ไม่ใช่เรื่องสิทธิ์)</StateLabel>
                  <div
                    style={{
                      border: '1px solid var(--dpm-red)',
                      borderRadius: 'var(--dpm-radius-card)',
                      background: 'var(--dpm-surface)',
                      padding: 16,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 11,
                    }}
                  >
                    <span style={{ fontSize: 10, color: 'var(--dpm-red)', paddingTop: 3 }}>▲</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dpm-red)' }}>
                        โหลดข้อมูลไม่สำเร็จ
                      </div>
                      <div style={{ marginTop: 5, fontSize: 12, color: 'var(--dpm-sub)', lineHeight: 1.6 }}>
                        ลองใหม่อีกครั้ง ถ้ายังไม่ได้ให้แจ้งฝ่ายไอที · รหัสอ้างอิง DPM-5031
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <Button variant="danger" style={{ height: 32, fontSize: 12 }}>
                          ลองใหม่
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: '13px 18px',
                  borderTop: '1px solid var(--dpm-border)',
                  background: 'var(--dpm-subtle)',
                  fontSize: 11,
                  color: 'var(--dpm-sub)',
                  lineHeight: 1.6,
                }}
              >
                กติกาการเขียน: สถานะจำกัดสิทธิ์ใช้พื้นเทากลางและตัวอักษรสีปกติ ไม่ใช้แดง · ห้ามใช้คำว่า
                “ผิดพลาด” “ไม่ได้รับอนุญาต” หรือ “Forbidden” · ต้องระบุตำแหน่งของคนที่ติดต่อได้เสมอ
                ไม่ใช่แค่ “ผู้ดูแลระบบ”
              </div>
            </div>

            {/* ปุ่มและช่องกรอก */}
            <div className="dpm-card">
              <div className="dpm-card__header">
                <span className="dpm-card__title">ปุ่มและช่องกรอก · ทุกสถานะ</span>
              </div>
              <div
                className="dpm-card__body"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}
              >
                <div>
                  <StateLabel>ปกติ (ลอง hover / กด / โฟกัสได้จริง)</StateLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                    <Button>บันทึก</Button>
                    <Button variant="secondary">ยกเลิก</Button>
                    <input className="dpm-input" defaultValue="32" />
                    <div style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
                      ปุ่มหลัก 38px · ปุ่มรอง 34px · ช่องกรอก 30px
                    </div>
                  </div>
                </div>
                <div>
                  <StateLabel>ปิดใช้งาน</StateLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                    <Button disabled>บันทึก</Button>
                    <Button variant="secondary" disabled>
                      ยกเลิก
                    </Button>
                    <input className="dpm-input" disabled value="32" readOnly />
                    <div style={{ fontSize: 11, color: 'var(--dpm-sub)' }}>
                      ต้องมีคำอธิบายข้างปุ่มเสมอว่าทำไมกดไม่ได้
                    </div>
                  </div>
                </div>
                <div>
                  <StateLabel>ผิดพลาด</StateLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                    <Button variant="danger">ลองใหม่</Button>
                    <input className="dpm-input is-error" value="132" readOnly />
                    <div style={{ fontSize: 11, color: 'var(--dpm-red)' }}>
                      ค่าเกินเกณฑ์ — ต้องบอกด้วยว่าต้องแก้เป็นเท่าไร
                    </div>
                  </div>
                </div>
                <div>
                  <StateLabel>กำลังโหลด</StateLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                    <Button loading>กำลังบันทึก…</Button>
                    <div style={{ fontSize: 11, color: 'var(--dpm-mute)' }}>
                      ปุ่มคงความกว้างเดิม ไม่กระโดด · ห้าม spinner
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
