# DPM — คู่มือสำหรับการพัฒนาต่อ

## โปรเจกต์นี้คืออะไร

DPM (Design Project Manager) — ระบบควบคุมโครงการของบริษัทออกแบบไทย หน่วยวัดเดียวคือ **คน-สัปดาห์** (ป้อนทีละ 0.25) **ห้ามเพิ่มการลงเวลารายชั่วโมง/รายวันเด็ดขาด** — เป็นการตัดสินใจเชิงหลักการใน brief

เอกสารที่ต้องอ่านก่อนแก้อะไร:

- `docs/design-brief-dpm-v0.5.md` — เอกสารแม่: บทบาท ตารางสิทธิ์ (§5) สูตรคำนวณ (ภาคผนวก A) โครงสร้างข้อมูล (ภาคผนวก C)
- `docs/design-handoff/README.md` — สเปกละเอียดรายหน้าจอ + tokens + interaction
- `docs/design-handoff/designs/*.dc.html` — prototype hi-fi เปิดดูในเบราว์เซอร์ได้ (ต้องมี support.js ในโฟลเดอร์เดียวกัน) ใช้เป็น reference ตอน implement หน้าจอ ห้ามพอร์ต runtime `support.js`

## คำสั่ง

```bash
npm run dev      # dev server
npm run build    # tsc -b && vite build — ต้องผ่านก่อน commit
```

## แนวทางโค้ด

- **สี/ระยะ/มุมโค้ง**: อ้าง `var(--dpm-*)` จาก `src/styles/tokens.css` เท่านั้น — ห้าม hardcode hex ใน component
- **ปุ่ม ช่องกรอก การ์ด ชิป**: ใช้คลาส `.dpm-*` จาก `src/styles/components.css` (ต้องการ pseudo-state) · ค่าที่คำนวณจากข้อมูล (ความกว้างแถบ สีสถานะ) ใส่ inline style ได้
- **สถานะ 4 ระดับ**: ใช้ `loadLevel()` / `healthLevel()` / `STATUS` จาก `src/lib/status.ts` — สัญลักษณ์ ▲◆●○ ต้องมาคู่สีเสมอ
- **จำนวนเงิน/ตัวเลข**: ใช้ `src/lib/format.ts` (− ขีดยาวนำหน้าค่าติดลบ ไม่ใช้วงเล็บ · คน-สัปดาห์ทศนิยม 2 ตำแหน่ง)
- **ค่า 0.25**: ปัดด้วย `snapQuarter()` เสมอ (`Math.round(v*4)/4`) กันทศนิยมเพี้ยน
- ภาษาไทยทั้ง UI · ห้ามใช้คำว่า "ผิดพลาด/ไม่ได้รับอนุญาต/Forbidden" กับสถานะจำกัดสิทธิ์ · ภาษากลาง: "โหลดต่ำ" ไม่ใช่ "ไม่มีงานทำ" · "เกินเกณฑ์" ไม่ใช่ "ทำงานหนักเกินไป"
- Animation ที่อนุญาต: `dpmSkeleton` `dpmBreathe` + transition ตามสเปก (width 220–300ms · color 400ms · background 700ms) — **ห้าม spinner ห้ามตัวเลขวิ่ง (count-up)**
- ทุกข้อจำกัดต้องมาพร้อมทางออก — ใช้ `ConstraintNotice` / `NoAccessBlock` ที่มี CTA เสมอ

## งานถัดไป

หน้าจอทั้ง 8 หน้า (S1 S3 S6 S7 S2 S11 S13 S14) implement ครบแล้ว — ดู route ใน `src/App.tsx`
mock data อยู่ใน `src/pages/*/data.ts` หรือ constant ในไฟล์หน้า พร้อม comment ระบุที่มาของค่า

ที่เหลือ:
1. **Data layer จริง** — แทน mock ด้วย API + state จริง · เกณฑ์ธุรกิจทุกค่าต้องอ่านจาก Business Rules (S11) ไม่ hardcode
2. **Auth + สิทธิ์** — enforce ตารางสิทธิ์ §5 ของ brief ฝั่ง server ด้วย (กติกา Squad ไม่ใช่แค่ซ่อนปุ่ม) · `cost_rate` รายคนเห็นได้เฉพาะ HoPD และการเปิดดูต้องเขียน Audit Log
3. **หน้า P1/P2 นอก handoff** — S0 · S4 · S5 · S8 · S9 · S10 · S12 (ยังเป็น PlaceholderPage / ยังไม่มี design)
