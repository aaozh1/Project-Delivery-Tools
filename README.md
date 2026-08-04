# DPM — Design Project Manager

ระบบภายในสำหรับบริษัทออกแบบสถาปัตยกรรม/ตกแต่งภายใน (ไทย)
ควบคุมโครงการ 4 สายงาน: สถาปัตยกรรม (AR) · ตกแต่งภายใน (ID) · บ้านพักอาศัย (House) · กราฟิก (Graphic)

หน่วยวัดงานเดียวของระบบคือ **คน-สัปดาห์ (person-week)** — 1.00 = ทำงานเต็มสัปดาห์ให้โครงการเดียว ป้อนทีละ 0.25
**ไม่มีการลงเวลารายชั่วโมง/รายวันโดยเจตนา**

## เริ่มต้น

```bash
npm install
npm run dev      # เปิด dev server
npm run build    # type-check + build production
```

Stack: Vite · React 18 · TypeScript · React Router · ฟอนต์ IBM Plex Sans Thai / IBM Plex Mono (self-host ผ่าน Fontsource)

## โครงสร้าง

```
docs/
  design-brief-dpm-v0.5.md     เอกสารแม่ — โจทย์ บทบาท สิทธิ์ สูตรคำนวณ โครงสร้างข้อมูล
  design-handoff/              design reference จากขั้น Design
    README.md                  สเปกละเอียดรายหน้าจอ + design tokens
    DESIGN_SYSTEM.md           สรุประบบภาพและกติกาองค์กรแบบย่อ
    designs/*.dc.html          prototype hi-fi 9 หน้า (เปิดในเบราว์เซอร์ได้ ต้องมี support.js)
src/
  styles/
    tokens.css                 design tokens ทั้งหมดเป็น CSS variables — แหล่งอ้างอิงเดียว
    global.css                 reset · ฟอนต์ · keyframes (dpmSkeleton, dpmBreathe)
    components.css             คลาส .dpm-* (ปุ่ม ช่องกรอก การ์ด ชิป ฯลฯ)
  lib/
    status.ts                  ระดับสถานะ 4 ระดับ + สถานะงวดงาน 6 ขั้น + เกณฑ์
    format.ts                  รูปแบบจำนวนเงิน ฿ / % / คน-สัปดาห์
  components/                  component พื้นฐานที่ใช้ร่วมทุกหน้า (ดูรายการใน index.ts)
  shell/AppShell.tsx           แถบนำทางบน 56px + โครงหน้า
  pages/
    DesignSystemPage.tsx       หน้าอ้างอิง token + component ทุกสถานะ (/design-system)
    screens.ts                 ทะเบียนหน้าจอทั้งหมดตาม brief §6
```

## สถานะการพัฒนา

- [x] Design system: tokens · ฟอนต์ · component พื้นฐานทุกสถานะ · app shell + routing
- [x] S1 Portfolio Control Room (`/` และ `/portfolio`)
- [x] S3 Project Plan Workspace (`/plan`)
- [x] S6 จัดสรรกำลังคน (`/allocate`)
- [x] S7 ภาระงานรายบุคคล (`/workload`)
- [x] S2 Department Board (`/department`)
- [x] S11 Admin Console (`/admin`)
- [x] S13 บันทึกงานรายสัปดาห์ (`/weekly-log`)
- [x] S14 Growth Profile (`/growth`)
- [ ] Data layer จริง (ตอนนี้เป็น mock data ใน `src/pages/*/data.ts` — component รับ props ล้วน)
- [ ] Auth + enforce สิทธิ์ฝั่ง server (ตาราง §5 ของ brief — กติกา Squad ต้องบังคับที่ backend ด้วย)
- [ ] หน้า P1/P2 ที่เหลือนอก handoff: S0 Handoff · S4 Project Detail · S5 Review · S8 VO · S9 Billing · S10 Closeout · S12 BD Portal

สเปกละเอียดของแต่ละหน้าอยู่ใน `docs/design-handoff/README.md` และ prototype `.dc.html`

## กติกาที่ต้องคงไว้เสมอ (สรุปจาก handoff)

1. อารมณ์สตูดิโอสถาปัตยกรรม — สงบ แม่นยำ มีระเบียบ · เส้นบาง 1px แทนเงาทุกกรณี
2. สีเน้นเดียว `#2B4C7E` · ห้าม gradient · ห้าม drop shadow · ห้ามไอคอนหลากสี
3. สถานะต้องมีทั้งสี + สัญลักษณ์ (`▲◆●○`) ทุกที่ — ห้ามพึ่งสีอย่างเดียว
4. ทุกที่ที่บอกว่า "ทำไม่ได้" ต้องบอกด้วยว่า "ต้องทำอย่างไร" และติดต่อใคร (ระบุตำแหน่ง)
5. ภาษาไทยทั้งหมด · label ต้อง `nowrap` · ชื่อยาวใช้ ellipsis · คำต้องไม่ล้นกล่อง
6. ตัวเลขเป็น tabular-nums ทุกที่ (ตั้งที่ body แล้ว)
7. กติกา Squad เป็นเรื่องของสิทธิ์ ต้อง enforce ที่ backend ด้วย ไม่ใช่แค่ซ่อนปุ่ม
8. เกณฑ์ธุรกิจทุกค่า (เป้า Margin เกณฑ์เตือน ฯลฯ) ต้องอ่านจาก Business Rules — ห้าม hardcode ในหน้าจอ
