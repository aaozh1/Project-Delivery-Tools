import type { CSSProperties, ReactNode } from 'react'
import { STATUS } from '../../lib/status'
import { APPROVAL_RULES, RULE_LABELS } from './adminData'
import type { CritImpact, RuleKey, RuleValues } from './adminData'
import { TextButton } from './TextButton'

/* ── ชิ้นส่วนย่อยของหน้า ── */

/** ข้อความในประโยค — 14px + nowrap ห้ามให้คำตกบรรทัด */
function Txt({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span style={{ fontSize: 14, whiteSpace: 'nowrap', ...style }}>{children}</span>
}

/** ประโยคกฎ: flex align-center gap 8 line-height 1 — บรรทัดไม่กระโดดเมื่อพิมพ์ */
function Row({ children, wrap }: { children: ReactNode; wrap?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        lineHeight: 1,
        flexWrap: wrap ? 'wrap' : undefined,
      }}
    >
      {children}
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section
      style={{
        border: '1px solid var(--dpm-border)',
        borderRadius: 'var(--dpm-radius-card)',
        background: 'var(--dpm-surface)',
      }}
    >
      <div
        style={{
          padding: '11px 18px',
          borderBottom: '1px solid var(--dpm-border)',
          background: 'var(--dpm-subtle)',
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
        {hint && <span style={{ fontSize: 11, color: 'var(--dpm-sub)' }}>{hint}</span>}
      </div>
      {children}
    </section>
  )
}

/** body มาตรฐานของ section: กอง rule ทีละบรรทัด */
function SectionBody({ children, row }: { children: ReactNode; row?: boolean }) {
  return (
    <div
      style={
        row
          ? {
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              flexWrap: 'wrap',
              lineHeight: 1,
            }
          : { padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }
      }
    >
      {children}
    </div>
  )
}

interface RuleInputProps {
  ruleKey: RuleKey
  values: RuleValues
  onSet: (key: RuleKey, value: string) => void
  /** ค่าทศนิยม — กว้าง 64px */
  wide?: boolean
  /** กรอบเหลืองเมื่อค่าที่มีผลกว้างถูกแก้ */
  warn?: boolean
  /** ค่ารากของระบบ — พื้นรอง ตัวอักษรรอง */
  root?: boolean
}

/** ช่องกรอกกลางประโยค — สูง 30px คงที่ ใช้คลาส dpm-input */
function RuleInput({ ruleKey, values, onSet, wide, warn, root }: RuleInputProps) {
  return (
    <input
      type="text"
      inputMode={wide ? 'decimal' : 'numeric'}
      aria-label={RULE_LABELS[ruleKey]}
      className={`dpm-input${wide ? ' dpm-input--wide' : ''}${warn ? ' is-warn' : ''}`}
      style={root ? { background: 'var(--dpm-subtle)', color: 'var(--dpm-sub)' } : undefined}
      value={values[ruleKey]}
      onChange={(e) => onSet(ruleKey, e.target.value)}
    />
  )
}

/* ── หน้า "กฎธุรกิจ" ── */

interface BusinessRulesViewProps {
  values: RuleValues
  onSet: (key: RuleKey, value: string) => void
  critImpact: CritImpact
}

export function BusinessRulesView({ values, onSet, critImpact }: BusinessRulesViewProps) {
  const borrow = values.borrow
  const segBtn = (selected: boolean, selectedBg: string): CSSProperties => ({
    fontSize: 13,
    padding: '5px 12px',
    borderRadius: 'var(--dpm-radius-badge)',
    border: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'background 150ms ease, color 150ms ease',
    color: selected ? 'var(--dpm-bg)' : 'var(--dpm-sub)',
    background: selected ? selectedBg : 'transparent',
    fontWeight: selected ? 600 : 400,
  })

  return (
    <div style={{ flex: 1, padding: '24px 32px 120px', maxWidth: 1120 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>
            กฎธุรกิจ
          </h1>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--dpm-sub)' }}>
            เกณฑ์ที่ระบบใช้ตัดสินว่าอะไรคือปกติ เตือน หรือวิกฤต · แก้ได้เองโดยไม่ต้องผ่านทีมพัฒนา
          </div>
        </div>
        <button type="button" className="dpm-btn dpm-btn--secondary">
          ดูประวัติการแก้
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* เป้า Margin ต่อสายงาน */}
        <Section title="เป้า Margin ต่อสายงาน">
          <SectionBody row>
            {(
              [
                ['marginAR', 'สถาปัตย์'],
                ['marginID', 'ตกแต่งภายใน'],
                ['marginHS', 'บ้านพักอาศัย'],
                ['marginGR', 'กราฟิก'],
              ] as const
            ).map(([key, label]) => (
              <Row key={key}>
                <Txt style={{ color: 'var(--dpm-sub)', width: 100 }}>{label}</Txt>
                <RuleInput ruleKey={key} values={values} onSet={onSet} />
                <Txt>%</Txt>
              </Row>
            ))}
          </SectionBody>
        </Section>

        {/* เกณฑ์สุขภาพโครงการ */}
        <Section
          title="เกณฑ์สุขภาพโครงการ"
          hint="ส่วนต่าง = ใช้คน-สัปดาห์ไป % ลบ ความคืบหน้า %"
        >
          <SectionBody>
            <Row>
              <span style={{ fontSize: 9, color: STATUS.warn.color }}>{STATUS.warn.mark}</span>
              <Txt>
                ขึ้นสถานะ <b>เตือน</b> เมื่อส่วนต่างเกิน
              </Txt>
              <RuleInput ruleKey="warnGap" values={values} onSet={onSet} />
              <Txt>จุด</Txt>
            </Row>
            <Row>
              <span style={{ fontSize: 9, color: STATUS.critical.color }}>
                {STATUS.critical.mark}
              </span>
              <Txt>
                ขึ้นสถานะ <b>วิกฤต</b> เมื่อส่วนต่างเกิน
              </Txt>
              <RuleInput
                ruleKey="critGap"
                values={values}
                onSet={onSet}
                warn={critImpact.changed}
              />
              <Txt>จุด</Txt>
              {critImpact.changed && (
                <span style={{ fontSize: 12, color: 'var(--dpm-yellow)', marginLeft: 4 }}>
                  {critImpact.loosening
                    ? 'ผ่อนเกณฑ์ลง — โครงการบางส่วนจะหลุดจากสถานะแดง'
                    : 'เข้มขึ้น — โครงการจะเข้าสถานะแดงเร็วขึ้น'}
                </span>
              )}
            </Row>
          </SectionBody>
        </Section>

        {/* การเงิน */}
        <Section title="การเงิน">
          <SectionBody>
            <Row>
              <Txt>งวดที่อนุมัติแล้วยังไม่วางบิลเกิน</Txt>
              <RuleInput ruleKey="billDays" values={values} onSet={onSet} />
              <Txt>วัน = ขึ้นเตือน</Txt>
            </Row>
            <Row>
              <Txt>เงินค้างรับเกิน</Txt>
              <RuleInput ruleKey="arDays" values={values} onSet={onSet} />
              <Txt>วัน = ขึ้นไฟแดง</Txt>
            </Row>
          </SectionBody>
        </Section>

        {/* กำลังคน */}
        <Section title="กำลังคน" hint="หน่วยคน-สัปดาห์ · ระบบนี้ไม่มีการลงเวลารายชั่วโมงโดยเจตนา">
          <SectionBody>
            <Row wrap>
              <Txt>สัปดาห์เต็ม =</Txt>
              <RuleInput ruleKey="fullWeek" values={values} onSet={onSet} wide root />
              <Txt>คน-สัปดาห์ · ป้อนทีละ</Txt>
              <RuleInput ruleKey="step" values={values} onSet={onSet} wide root />
              <span style={{ fontSize: 12, color: 'var(--dpm-mute)' }}>
                — สองค่านี้เป็นรากของการคำนวณทั้งระบบ แก้ได้แต่ควรอย่างยิ่งที่จะไม่แก้
              </span>
            </Row>
            <Row>
              <Txt>
                ถือว่า <b>เกินกำลัง</b> เมื่อจัดสรรเกิน
              </Txt>
              <RuleInput ruleKey="overload" values={values} onSet={onSet} wide />
              <Txt>คน-สัปดาห์ ต่อคนต่อสัปดาห์</Txt>
            </Row>
            <Row>
              <Txt>
                ถือว่า <b>โหลดต่ำ</b> เมื่อต่ำกว่า
              </Txt>
              <RuleInput ruleKey="underPct" values={values} onSet={onSet} />
              <Txt>% ติดต่อกัน</Txt>
              <RuleInput ruleKey="underMonths" values={values} onSet={onSet} />
              <Txt>เดือน</Txt>
            </Row>
            <Row>
              <Txt>เป้าการใช้กำลังคนของบริษัท</Txt>
              <RuleInput ruleKey="utilTarget" values={values} onSet={onSet} />
              <Txt>%</Txt>
            </Row>
          </SectionBody>
        </Section>

        {/* จำนวนโครงการพร้อมกัน */}
        <Section
          title="จำนวนโครงการพร้อมกัน"
          hint="เตือนเมื่อคนหนึ่งทำเกินจำนวนนี้ในเดือนเดียวกัน"
        >
          <SectionBody row>
            {(
              [
                ['maxSr', 'Senior'],
                ['maxMid', 'Mid'],
                ['maxJr', 'Junior'],
              ] as const
            ).map(([key, label]) => (
              <Row key={key}>
                <Txt style={{ color: 'var(--dpm-sub)', width: 52 }}>{label}</Txt>
                <RuleInput ruleKey={key} values={values} onSet={onSet} />
                <Txt>โครงการ</Txt>
              </Row>
            ))}
          </SectionBody>
        </Section>

        {/* Squad */}
        <Section title="Squad">
          <SectionBody>
            <Row>
              <Txt>ขนาด Squad ที่เหมาะสม</Txt>
              <RuleInput ruleKey="squadMin" values={values} onSet={onSet} />
              <Txt style={{ color: 'var(--dpm-mute)' }}>–</Txt>
              <RuleInput ruleKey="squadMax" values={values} onSet={onSet} />
              <Txt>คน</Txt>
            </Row>
            <Row>
              <Txt>จำนวนโครงการต่อ Squad ไม่ควรเกิน</Txt>
              <RuleInput ruleKey="projPerSquad" values={values} onSet={onSet} />
              <Txt>โครงการ</Txt>
            </Row>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', lineHeight: 1 }}
              role="radiogroup"
              aria-label={RULE_LABELS.borrow}
            >
              <Txt>การยืมคนข้าม Squad</Txt>
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
                <button
                  type="button"
                  role="radio"
                  aria-checked={borrow === 'no'}
                  style={segBtn(borrow === 'no', 'var(--dpm-ink)')}
                  onClick={() => onSet('borrow', 'no')}
                >
                  ไม่อนุญาต
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={borrow === 'hod'}
                  style={segBtn(borrow === 'hod', 'var(--dpm-accent)')}
                  onClick={() => onSet('borrow', 'hod')}
                >
                  ผ่านการอนุมัติ HoD
                </button>
              </div>
            </div>
            <Row>
              <Txt>ระยะเวลาย้ายชั่วคราวสูงสุด</Txt>
              <RuleInput ruleKey="moveWeeks" values={values} onSet={onSet} />
              <Txt>สัปดาห์</Txt>
            </Row>
          </SectionBody>
        </Section>

        {/* สายอนุมัติ */}
        <Section title="สายอนุมัติ">
          <div>
            {APPROVAL_RULES.map((rule) => (
              <div
                key={rule.condition}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1fr) 220px 40px',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 18px',
                  borderBottom: '1px solid var(--dpm-border)',
                }}
              >
                <span style={{ fontSize: 14 }}>{rule.condition}</span>
                <span style={{ fontSize: 13, color: 'var(--dpm-sub)' }}>{rule.approver}</span>
                <TextButton style={{ fontSize: 13, textAlign: 'center' }}>แก้</TextButton>
              </div>
            ))}
            <div style={{ padding: '11px 18px' }}>
              <TextButton color="var(--dpm-accent)" style={{ fontSize: 13 }}>
                + เพิ่มเงื่อนไข
              </TextButton>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
