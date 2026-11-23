/* =====================================================================
   ข้อมูลตัวอย่าง (ชื่อสมมติ) — Demo.build(refDate) สร้างข้อมูลย้อนหลัง 6 สัปดาห์จากวันอ้างอิง
   ใช้สุ่มแบบกำหนดค่าเริ่ม (seed) จึงได้ข้อมูลชุดเดิมทุกครั้ง
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
    else root.Demo = factory(root.Core);
})(typeof self !== 'undefined' ? self : this, function (Core) {
    'use strict';

    function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

    const BOYS = ['กฤติน', 'ชินพัฒน์', 'ธนพล', 'ปวริศ', 'ภูมิพัฒน์', 'ณภัทร', 'ธีรเดช', 'วรเมธ', 'กันตพงศ์', 'พีรวัส', 'ศุภกร', 'อชิระ', 'ณัฐวุฒิ', 'ภาคิน', 'ธนกฤต', 'รัชชานนท์', 'ปุณณวิช', 'เตชิต', 'จิรายุ', 'สิรวิชญ์', 'ก้องภพ', 'ธนวัฒน์', 'พงศกร', 'กวิน', 'นภัสกร', 'ชยพล', 'วชิรวิทย์', 'ณัฐดนัย', 'ภัทรพล'];
    const GIRLS = ['กัญญาภัค', 'ชนัญชิดา', 'ณัฐณิชา', 'พิชชาภา', 'ปุณยวีร์', 'ภัทรนันท์', 'ศิรประภา', 'อรปรียา', 'ธัญชนก', 'กมลชนก', 'พิมพ์มาดา', 'ณิชาภัทร', 'สุพิชญา', 'วริศรา', 'เบญญาภา', 'ปภาวรินทร์', 'ชญานิศ', 'นันท์นภัส', 'ขวัญข้าว', 'อัญรินทร์', 'ญาณิศา', 'ธนพร', 'ปาณิสรา', 'กชกร', 'วรัญญา', 'มนัสนันท์', 'ภัคจิรา', 'รุจิรา', 'ศศิกานต์'];
    const NICK_B = ['ภูมิ', 'ต้นกล้า', 'ปั้น', 'ไอซ์', 'เก่ง', 'ตะวัน', 'บอส', 'ฟิวส์', 'ข้าวโพด', 'ภู', 'กัปตัน', 'ออม', 'เพชร', 'นนท์', 'ไท', 'ปลื้ม', 'ฟ้าใส', 'พีท', 'อิน', 'ซัน', 'คิม', 'ต้น', 'โอม', 'ภีม', 'เจได', 'บีม', 'ธาม', 'วิน', 'กาย'];
    const NICK_G = ['ใบเตย', 'น้ำหวาน', 'มายด์', 'แพรวา', 'ปิ่น', 'ขิม', 'ใบบัว', 'มะปราง', 'น้ำฝน', 'ข้าวหอม', 'พลอย', 'มิว', 'แก้ม', 'ฝ้าย', 'เอวา', 'ไข่มุก', 'ปาย', 'เฟิร์น', 'ขวัญ', 'อิงฟ้า', 'จูน', 'ส้ม', 'แพม', 'น้ำใส', 'ใบข้าว', 'กิ่ง', 'มีน', 'พิม', 'ดาว'];
    const LAST = ['บุญมา', 'แสงอรุณ', 'วิเศษสุข', 'ศรีเมือง', 'ชื่นใจ', 'บัวแก้ว', 'กิจเจริญ', 'มั่นคง', 'ทองดี', 'สุขสวัสดิ์', 'ใจดี', 'รุ่งเรือง', 'พรหมมา', 'แก้วประเสริฐ', 'ศรีสุข', 'บุญรอด', 'เพชรรัตน์', 'สมบูรณ์', 'อินทร์แก้ว', 'ทองคำ', 'วงศ์ใหญ่', 'คำแสน', 'สายสุวรรณ', 'จันทร์หอม', 'ภูมิใจ', 'ปัญญาดี', 'เรืองศรี', 'ชัยมงคล', 'สิทธิโชค', 'ดวงแก้ว'];

    function skillsFrom(preset) {
        const p = Core.PRESETS[preset];
        const mk = (kind) => (x, i) => ({ id: `k_${kind}${String(i + 1).padStart(2, '0')}`, name: x[0], icon: x[1], points: x[2], kind });
        return p.pos.map(mk('pos')).concat(p.neg.map(mk('neg')));
    }
    function rewardsFrom() { return Core.REWARD_PRESET.map((x, i) => ({ id: `w_${String(i + 1).padStart(2, '0')}`, name: x[0], icon: x[1], cost: x[2] })); }

    function build(refDate) {
        const ref = refDate ? new Date(refDate) : new Date();
        const r = rng(20261024);
        const classes = [
            { id: 'c_demo01', name: 'ป.5/1', groups: [] },
            { id: 'c_demo02', name: 'ป.5/2', groups: [] },
        ];
        const students = [];
        let bi = 0, gi = 0;
        classes.forEach((c, ci) => {
            const n = ci === 0 ? 30 : 28;
            for (let i = 0; i < n; i += 1) {
                const boy = i % 2 === 0;
                const first = boy ? BOYS[bi % BOYS.length] : GIRLS[gi % GIRLS.length];
                const nick = boy ? NICK_B[bi++ % NICK_B.length] : NICK_G[gi++ % NICK_G.length];
                students.push({
                    id: `s_${ci + 1}${String(i + 1).padStart(2, '0')}`,
                    classId: c.id, no: i + 1,
                    prefix: boy ? 'ด.ช.' : 'ด.ญ.',
                    firstName: first, lastName: LAST[(i * 7 + ci * 3) % LAST.length], nick,
                    avatar: (i * 7 + ci * 11) % 24,
                });
            }
            // จับกลุ่มไว้แล้ว 5 กลุ่ม
            const ids = students.filter((s) => s.classId === c.id).map((s) => s.id);
            const names = ['กลุ่มดาวเรือง', 'กลุ่มทานตะวัน', 'กลุ่มกุหลาบ', 'กลุ่มมะลิ', 'กลุ่มชบา'];
            c.groups = Core.makeGroups(ids, 5, r).map((m, i) => ({ id: `g_${ci + 1}${i + 1}`, name: names[i], members: m }));
        });

        const skills = skillsFrom('basic');
        const pos = skills.filter((k) => k.kind === 'pos');
        const neg = skills.filter((k) => k.kind === 'neg');
        const rewards = rewardsFrom();
        const events = [];
        const redeems = [];
        // นักเรียนแต่ละคนมี "นิสัย" ต่างกัน → กระดานผู้นำดูสมจริง
        const habit = new Map(students.map((s) => [s.id, 0.35 + r() * 0.9]));
        const day0 = Core.startOfDay(ref);
        let n = 0;
        for (let back = 41; back >= 0; back -= 1) {
            const d = new Date(day0); d.setDate(day0.getDate() - back);
            if (d.getDay() === 0 || d.getDay() === 6) continue; // เสาร์-อาทิตย์
            classes.forEach((c) => {
                const list = students.filter((s) => s.classId === c.id);
                const count = 24 + Math.floor(r() * 14);
                for (let i = 0; i < count; i += 1) {
                    // คนที่ "นิสัยดี" ถูกสุ่มบ่อยกว่า
                    let s = list[Math.floor(r() * list.length)];
                    if (r() > habit.get(s.id)) s = list[Math.floor(r() * list.length)];
                    const good = r() < 0.86;
                    const k = good ? pos[Math.floor(r() * pos.length)] : neg[Math.floor(r() * neg.length)];
                    const t = new Date(d); t.setHours(8 + Math.floor(r() * 7), Math.floor(r() * 60), 0, 0);
                    if (back === 0 && t > ref) t.setTime(ref.getTime() - (i + 1) * 60000);
                    events.push({ id: `e_demo${String(++n).padStart(5, '0')}`, t: t.toISOString(), sid: s.id, skillId: k.id, pts: good ? k.points : -k.points, note: '' });
                }
            });
            // ทุกวันศุกร์มีการแลกรางวัล
            if (d.getDay() === 5) {
                for (let i = 0; i < 4; i += 1) {
                    const s = students[Math.floor(r() * students.length)];
                    const w = rewards[Math.floor(r() * 3)];
                    const t = new Date(d); t.setHours(15, 10 + i * 3, 0, 0);
                    redeems.push({ id: `x_demo${String(redeems.length + 1).padStart(4, '0')}`, t: t.toISOString(), sid: s.id, rewardId: w.id, cost: w.cost });
                }
            }
        }
        // ไม่ให้แต้มคงเหลือติดลบจากการแลก
        const bal = Core.balances({ students, events, redeems: [] });
        const kept = [];
        redeems.forEach((x) => { if (bal.get(x.sid) >= x.cost) { bal.set(x.sid, bal.get(x.sid) - x.cost); kept.push(x); } });

        const y = ref.getFullYear() + 543;
        return {
            app: 'vs-class-points', schemaVersion: 1,
            school: { name: 'โรงเรียนบ้านหนองบัวทอง', agency: 'โรงเรียนบ้านหนองบัวทอง', academicYear: String(ref.getMonth() >= 4 ? y : y - 1), semester: ref.getMonth() >= 4 && ref.getMonth() <= 9 ? '1' : '2', director: 'ผู้อำนวยการโรงเรียนบ้านหนองบัวทอง', teacherName: 'นางสาวสุดารัตน์ ใจงาม', teacherPosition: 'ครู วิทยฐานะครูชำนาญการ' },
            classes, students, skills, rewards, events, redeems: kept,
            settings: { classId: 'c_demo01', sound: true, theme: 'mango' },
        };
    }

    return { build, skillsFrom, rewardsFrom };
});
