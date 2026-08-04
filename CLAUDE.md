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

หน้าจอครบทั้ง 15 หน้า (P0 ทั้ง 8 + P1/P2 ทั้ง 7) — ดู route ใน `src/App.tsx` · ทะเบียนหน้าอยู่ใน `src/pages/screens.ts`
สิทธิ์ระดับ route อยู่ที่ `src/auth/roles.ts` (SCREEN_ACCESS ตามตาราง §5) มีตัวสลับบทบาทที่มุมขวาบนสำหรับทดลองมุมมอง
mock data: ทะเบียนโครงการกลางที่หลายหน้าใช้ร่วมอยู่ที่ `src/data/projects.ts` · ของเฉพาะหน้าอยู่ `src/pages/*/data.ts` หรือ constant ในไฟล์ พร้อม comment ที่มาของค่า

ที่เหลือ (ต้องมี backend infrastructure ก่อน):
1. **Backend + data layer จริง** — API + DB ตามโครงภาคผนวก C · แทน mock ทุกไฟล์ · เกณฑ์ธุรกิจทุกค่าอ่านจาก Business Rules (S11) ไม่ hardcode
2. **Auth จริง + enforce ฝั่ง server** — ชั้นสิทธิ์ปัจจุบัน (`src/auth/`) คุมเฉพาะการแสดงผล ฝั่ง server ต้องตรวจซ้ำทุก request · กติกา Squad บังคับที่ backend · `cost_rate` รายคนเห็นได้เฉพาะ HoPD และการเปิดดูต้องเขียน Audit Log จริง
3. **Real-time** เฉพาะจุดที่ handoff ระบุ: Live Margin Panel (S3) และ Allocation Grid (S6)
