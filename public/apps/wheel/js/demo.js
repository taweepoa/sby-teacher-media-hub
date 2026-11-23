/* =====================================================================
   ข้อมูลตัวอย่าง (ชื่อสมมติทั้งหมด): ม.2/1 35 คน • ม.2/2 34 คน • รายการหัวข้อโครงงาน 8 หัวข้อ
   + ของรางวัล + ประวัติการสุ่มย้อนหลัง (วงล้อ จับกลุ่ม ลำดับนำเสนอ ตัวเลข จับฉลาก ที่นั่ง)
   ใช้ตัวสุ่มแบบกำหนดค่าเริ่มต้น (seed) เพื่อให้ข้อมูลตัวอย่างเหมือนเดิมทุกครั้ง — การสุ่มจริงในระบบใช้ RNG (crypto)
   ใช้ได้ทั้งเบราว์เซอร์และ Node (dev/build-docs.js)
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
    else root.Demo = factory(root.Engine);
})(typeof self !== 'undefined' ? self : this, function (Engine) {
    'use strict';

    const BOYS = ['ธนกฤต', 'ภูมิพัฒน์', 'ณัฐวุฒิ', 'กิตติพัฒน์', 'ปิยะพงษ์', 'ศุภกร', 'ธีรภัทร', 'วรเมธ', 'ภาคิน', 'ชยพล', 'อัครพล', 'ณภัทร',
        'พีรพัฒน์', 'ธนวัฒน์', 'กันตภณ', 'ปุณณวิช', 'รัชชานนท์', 'ศิวกร', 'ธนภัทร', 'จิรายุ', 'วีรภัทร', 'ภัทรพล', 'ปกรณ์', 'นนทพัทธ์',
        'สิรภพ', 'กฤตภาส', 'ณัฐนนท์', 'พงศกร', 'ธราเทพ', 'อนุชิต', 'ศรัณย์', 'เตชินท์', 'ปัณณวัฒน์', 'คณิน', 'ภูริ', 'วชิรวิทย์'];
    const GIRLS = ['ณัฐธิดา', 'ปุณยวีร์', 'กัญญาณัฐ', 'พิมพ์ชนก', 'ชนิสรา', 'ธัญชนก', 'วรรณกานต์', 'ศิริกาญจน์', 'กมลชนก', 'ภัทรวดี',
        'ปาณิสรา', 'สุพิชญา', 'อรปรียา', 'ณิชาภัทร', 'ธนพร', 'ชญานิศ', 'ปวีณ์ธิดา', 'เบญญาภา', 'กชพร', 'รินรดา', 'พรนภัส', 'ญาดา',
        'อภิสรา', 'ขวัญข้าว', 'มณีรัตน์', 'ศุภิสรา', 'นันทิชา', 'ปริยากร', 'กานต์ธิดา', 'จิราพัชร', 'วริศรา', 'ธมลวรรณ', 'ฐิติชญา', 'ลลิตา', 'แพรวา', 'ชลธิชา'];
    const BOY_NICK = ['ต้นกล้า', 'ภูมิ', 'บอส', 'กิต', 'เปา', 'ศุภ', 'ธีร์', 'เมฆ', 'คิน', 'ชิน', 'อั๋น', 'ปั้น', 'พีท', 'ธัน', 'กัน', 'ปุณ', 'นนท์', 'วิน', 'ไทม์', 'จิว', 'ภัทร', 'ปอนด์', 'กร', 'นิว',
        'ภพ', 'ฟิล์ม', 'นัท', 'พงศ์', 'เทพ', 'ชิต', 'ฟ้าใส', 'เต้', 'ปัณ', 'คิม', 'ภู', 'วิว'];
    const GIRL_NICK = ['น้ำฝน', 'ปุณ', 'กัญ', 'พิมพ์', 'ชมพู่', 'ธัญ', 'วาว', 'ศิริ', 'กมล', 'แพม', 'ปาล์ม', 'ใบเตย', 'อร', 'ณิชา', 'พลอย', 'ญาญ่า', 'ปวีณ์', 'เบญ', 'กช', 'ริน', 'พร', 'ญาดา',
        'อ้อม', 'ขวัญ', 'มณี', 'ส้ม', 'นัน', 'ปริม', 'กานต์', 'จีจี้', 'วิว', 'ใบบัว', 'ฐิติ', 'ลลิล', 'แพรว', 'ชล'];
    const SURNAMES = ['สุขสวัสดิ์', 'ศรีสุข', 'แก้วมณี', 'ทองดี', 'บุญมา', 'จันทร์หอม', 'พรหมวงศ์', 'สมบูรณ์ชัย', 'รุ่งเรืองศรี', 'วงศ์ใหญ่',
        'ชัยมงคล', 'ศักดิ์ดี', 'มีสุข', 'บุญประเสริฐ', 'อินทรสุวรรณ', 'เพชรรัตน์', 'ปัญญาดี', 'คำแก้ว', 'สายทอง', 'ทองคำ', 'ศรีวงศ์',
        'กาญจนวงศ์', 'นาคสวัสดิ์', 'พึ่งบุญ', 'ใจงาม', 'สุวรรณรัตน์', 'เรืองชัย', 'แก้วประเสริฐ', 'บุญเรือง', 'ธนสาร', 'รักษ์ไทย',
        'จันทร์เพ็ญ', 'ศรีประเสริฐ', 'อ่อนศรี', 'พลอยงาม', 'ประเสริฐสุข', 'ภูมิใจ', 'หอมจันทร์', 'ทรัพย์มาก', 'วงศ์สวัสดิ์', 'คงเจริญ',
        'สิทธิโชค', 'นิลสุวรรณ', 'ดวงแก้ว', 'มั่นคง', 'เจริญผล', 'ชาญชัย', 'รัตนพันธ์', 'ศรีอ่อน', 'โพธิ์ทอง', 'ผลบุญ', 'อุดมสุข'];

    const CLASSES = [
        { id: 'l_demo001', name: 'ม.2/1', boys: 17, total: 35, codeStart: 26201, absent: [9, 26], weights: { 3: 2, 15: 2, 22: 3 }, note: 'ครูประจำชั้น: ครูกมลวรรณ' },
        { id: 'l_demo002', name: 'ม.2/2', boys: 18, total: 34, codeStart: 26241, absent: [5], weights: {}, note: '' },
    ];
    const TOPICS = ['เกมตอบคำถามด้วย Scratch', 'ระบบรดน้ำต้นไม้อัตโนมัติด้วย micro:bit', 'แอปจดรายรับรายจ่ายนักเรียน', 'เว็บไซต์แนะนำแหล่งท่องเที่ยวชุมชน',
        'หุ่นยนต์เดินตามเส้น', 'แบบสอบถามออนไลน์ด้วย Google Forms', 'สื่ออินโฟกราฟิกความปลอดภัยออนไลน์', 'เครื่องวัดอุณหภูมิห้องเรียน'];
    const PRIZES = [
        { id: 'p_demo001', name: 'ชุดปากกาเจล 5 สี', qty: 3 },
        { id: 'p_demo002', name: 'สมุดโน้ตปกแข็ง', qty: 3 },
        { id: 'p_demo003', name: 'กระบอกน้ำเก็บความเย็น', qty: 2 },
        { id: 'p_demo004', name: 'ตุ๊กตาหมีน้อย', qty: 1 },
        { id: 'p_demo005', name: 'บัตรของขวัญร้านสหกรณ์ 50 บาท', qty: 1 },
    ];

    /* ตัวสุ่มแบบกำหนด seed (เฉพาะสร้างข้อมูลตัวอย่าง) */
    function seeded(seed) {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function shuffleWith(rand, arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i -= 1) {
            const j = Math.floor(rand() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    const sid = (prefix, n) => `${prefix}_demo${String(n).padStart(3, '0')}`;

    function people() {
        const rand = seeded(2569);
        const used = new Set();
        let n = 0;
        return CLASSES.map((c) => {
            const items = [];
            for (let i = 1; i <= c.total; i += 1) {
                const boy = i <= c.boys;
                let k, first, last, guard = 0;
                do {
                    k = Math.floor(rand() * (boy ? BOYS : GIRLS).length);
                    first = (boy ? BOYS : GIRLS)[k];
                    last = SURNAMES[Math.floor(rand() * SURNAMES.length)];
                    guard += 1;
                } while ((used.has(`${first} ${last}`) || used.has(`${c.name}:${first}`)) && guard < 300);
                used.add(`${first} ${last}`);
                used.add(`${c.name}:${first}`);
                n += 1;
                items.push({
                    id: sid('s', n),
                    no: i,
                    code: String(c.codeStart + i - 1),
                    prefix: boy ? 'ด.ช.' : 'ด.ญ.',
                    firstName: first,
                    lastName: last,
                    nick: (boy ? BOY_NICK : GIRL_NICK)[k] || '',
                    gender: boy ? 'm' : 'f',
                    weight: c.weights[i] || 1,
                    active: !c.absent.includes(i),
                });
            }
            return { id: c.id, kind: 'class', name: c.name, note: c.note, items };
        });
    }

    /* แจกกลุ่มแบบเดียวกับ Engine.makeGroups (คละเพศ) แต่ใช้ตัวสุ่ม seed */
    function demoGroups(rand, list, g) {
        const act = list.items.filter((s) => s.active);
        const m = shuffleWith(rand, act.filter((s) => s.gender === 'm'));
        const f = shuffleWith(rand, act.filter((s) => s.gender === 'f'));
        const seq = m.length >= f.length ? m.concat(f) : f.concat(m);
        const groups = Array.from({ length: g }, (_, i) => ({ no: i + 1, members: [], leaderId: null }));
        seq.forEach((p, k) => groups[k % g].members.push(p));
        groups.forEach((gr) => {
            gr.members = shuffleWith(rand, gr.members).map(Engine.snap);
            gr.leaderId = gr.members[0].id;
        });
        return groups;
    }

    function build(nowArg) {
        // เวลาอ้างอิงของประวัติตัวอย่าง: ช่วงเวลาเรียน (ถ้าเปิดนอกเวลาเรียน ใช้บ่าย 14:40 ของวันเรียนล่าสุด)
        const now = nowArg ? new Date(nowArg) : new Date();
        const hr = now.getHours();
        if (hr < 8 || hr >= 17) {
            if (hr < 8) now.setDate(now.getDate() - 1);
            now.setHours(14, 40, 0, 0);
        }
        const ago = (min) => new Date(now.getTime() - min * 60000).toISOString();
        const rand = seeded(19102569);
        const lists = people();
        const [c1, c2] = lists;
        lists.push({
            id: 'l_demo003',
            kind: 'custom',
            name: 'หัวข้อโครงงานคอมพิวเตอร์',
            note: 'รายการกำหนดเอง ใช้สุ่มหัวข้อให้แต่ละกลุ่ม',
            items: TOPICS.map((t, i) => ({ id: sid('t', i + 1), no: i + 1, code: '', prefix: '', firstName: t, lastName: '', nick: '', gender: '', weight: 1, active: true })),
        });

        const history = [];
        const add = (min, mode, list, title, data) => history.push({ id: sid('h', history.length + 1), at: ago(min), mode, listId: list ? list.id : '', listName: list ? list.name : '', title, data });

        // วงล้อ: วันนี้สุ่มตอบคำถามไปแล้ว 4 คน (ยังอยู่ในรอบที่ 2 → นำออกจากวงล้อแล้ว)
        const present1 = c1.items.filter((s) => s.active);
        const picked = shuffleWith(rand, present1).slice(0, 4);
        picked.forEach((s, i) => add(6 + (3 - i) * 7, 'wheel', c1, 'สุ่มตอบคำถาม', { person: Engine.snap(s), pool: present1.length - i, round: 2, weighted: false }));
        const older = shuffleWith(rand, present1).slice(0, 3);
        older.forEach((s, i) => add(60 * 24 + 30 + i * 9, 'wheel', c1, 'สุ่มตอบคำถาม', { person: Engine.snap(s), pool: present1.length - i, round: 1, weighted: false }));

        // จับกลุ่ม (เมื่อวาน) 8 กลุ่ม คละเพศ + หัวหน้ากลุ่ม
        const groups = demoGroups(rand, c1, 8);
        add(60 * 24 + 95, 'group', c1, 'จับกลุ่มทำโครงงานคอมพิวเตอร์', {
            groups,
            opts: { mode: 'count', value: 8, leftover: 'spread', mixGender: true, leaders: true },
            total: groups.reduce((a, g) => a + g.members.length, 0),
            activity: 'โครงงานคอมพิวเตอร์',
        });
        // ลำดับนำเสนอของ 8 กลุ่ม (เมื่อวาน) พร้อมหัวข้อที่สุ่มได้
        const topicOrder = shuffleWith(rand, TOPICS);
        const presentOrder = shuffleWith(rand, groups.map((g) => g.no));
        add(60 * 24 + 80, 'order', c1, 'ลำดับการนำเสนอโครงงาน', {
            source: 'group',
            items: presentOrder.map((no) => {
                const g = groups[no - 1];
                return { label: `กลุ่มที่ ${no}`, sub: `${topicOrder[no - 1]} • หัวหน้า ${g.members[0].first}`, members: g.members.map((m) => m.name) };
            }),
            done: presentOrder.map((_, i) => i < 5),
            activity: 'นำเสนอโครงงานคอมพิวเตอร์',
        });
        // สุ่มตัวเลข
        add(60 * 24 * 2 + 40, 'number', c1, 'สุ่มเลขที่ส่งการบ้าน', { min: 1, max: 35, count: 3, unique: true, numbers: [27, 4, 18] });
        // จับฉลากของรางวัล ม.2/2 (สัปดาห์ก่อน)
        const units = PRIZES.flatMap((p) => Array.from({ length: p.qty }, () => p));
        const winners = shuffleWith(rand, c2.items.filter((s) => s.active)).slice(0, units.length);
        add(60 * 24 * 6 + 20, 'prize', c2, 'จับฉลากของขวัญปีใหม่', {
            draws: units.map((p, i) => ({ prize: p.name, person: Engine.snap(winners[i]) })),
            done: true,
        });
        // สุ่มที่นั่ง ม.2/2 5 × 7 สลับชาย-หญิง (สัปดาห์ก่อน)
        const act2 = c2.items.filter((s) => s.active);
        const m = shuffleWith(rand, act2.filter((s) => s.gender === 'm'));
        const f = shuffleWith(rand, act2.filter((s) => s.gender === 'f'));
        const [a, b] = m.length >= f.length ? [m, f] : [f, m];
        const grid = Array.from({ length: 5 }, () => Array(7).fill(null));
        let placed = 0;
        for (let r = 0; r < 5; r += 1) {
            for (let c = 0; c < 7; c += 1) {
                if (placed >= act2.length) break;
                const want = (r + c) % 2 === 0 ? a : b;
                const alt = want === a ? b : a;
                const p = want.length ? want.pop() : alt.pop();
                grid[r][c] = p ? Engine.snap(p) : null;
                placed += 1;
            }
        }
        add(60 * 24 * 7 + 15, 'seat', c2, 'ผังที่นั่งประจำเดือนพฤศจิกายน', { rows: 5, cols: 7, alternate: true, grid });

        history.sort((x, y) => (x.at < y.at ? 1 : -1));
        return {
            app: 'vs-random-picker',
            schemaVersion: 1,
            createdAt: ago(60 * 24 * 10),
            updatedAt: now.toISOString(),
            school: {
                name: 'โรงเรียนบ้านหนองบัววิทยาคม',
                agency: '',
                teacherName: 'นางสาวกมลวรรณ ใจดี',
                teacherPosition: 'ครู',
                subject: 'วิทยาการคำนวณ',
                academicYear: String(now.getFullYear() + 543),
                semester: now.getMonth() >= 4 && now.getMonth() <= 9 ? '1' : '2',
            },
            lists,
            currentListId: c1.id,
            wheel: { removed: { [c1.id]: picked.map((s) => s.id) }, round: { [c1.id]: 2 } },
            prizes: PRIZES.map((p) => Object.assign({}, p)),
            prizeSession: null,
            numberSession: { min: 1, max: 35, count: 1, unique: true, drawn: [] },
            history,
            settings: { noRepeat: true, useWeight: false, duration: 7, sound: true, volume: 0.8, confetti: true, label: 'no-first', palette: 'coral' },
        };
    }

    return { build, CLASSES, TOPICS, PRIZES };
});
