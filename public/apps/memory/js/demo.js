/* =====================================================================
   ข้อมูลตัวอย่าง (ชื่อสมมติทั้งหมด) — ชุดเนื้อหา 6 วิชา + ผลการแข่งขัน 2 รายการ
   ภาพใช้อีโมจิ (ไม่ต้องมีไฟล์รูป) · ใช้ได้ทั้งเบราว์เซอร์และ Node (dev/build-docs.js)
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
    else root.Demo = factory(root.Engine);
})(typeof self !== 'undefined' ? self : this, function (Engine) {
    'use strict';

    const P = (id, a, b) => ({ id, a, b, img: '', note: '' });
    function sets() {
        const now = '2026-10-20T08:00:00.000Z';
        const mk = (id, name, subject, level, kind, color, icon, desc, pairs) => ({ id, name, subject, level, kind, color, icon, desc, pairs, createdAt: now, updatedAt: now });
        return [
            mk('set_animal', 'Animals สัตว์น่ารัก', 'ภาษาอังกฤษ', 'ป.1–ป.3', 'image', '#7c3aed', 'fa-paw', 'จับคู่ภาพสัตว์กับคำศัพท์ภาษาอังกฤษ', [
                P('an1', '🐶', 'dog'), P('an2', '🐱', 'cat'), P('an3', '🐘', 'elephant'), P('an4', '🐟', 'fish'),
                P('an5', '🐦', 'bird'), P('an6', '🐰', 'rabbit'), P('an7', '🐯', 'tiger'), P('an8', '🐒', 'monkey'),
                P('an9', '🐢', 'turtle'), P('an10', '🐮', 'cow'), P('an11', '🦆', 'duck'), P('an12', '🐍', 'snake'),
            ]),
            mk('set_idiom', 'สำนวนไทยน่ารู้', 'ภาษาไทย', 'ป.4–ป.6', 'word', '#db2777', 'fa-book-open', 'จับคู่สำนวนกับความหมาย', [
                P('id1', 'น้ำขึ้นให้รีบตัก', 'มีโอกาสควรรีบทำ'), P('id2', 'ขี่ช้างจับตั๊กแตน', 'ลงทุนมากแต่ได้ผลน้อย'),
                P('id3', 'กระต่ายตื่นตูม', 'ตกใจง่ายโดยไม่ไตร่ตรอง'), P('id4', 'ตำน้ำพริกละลายแม่น้ำ', 'ใช้จ่ายสิ้นเปลืองโดยเปล่าประโยชน์'),
                P('id5', 'ไก่งามเพราะขน คนงามเพราะแต่ง', 'การแต่งตัวช่วยให้ดูดี'), P('id6', 'น้ำร้อนปลาเป็น น้ำเย็นปลาตาย', 'พูดตรงอาจไม่ดี พูดอ่อนหวานได้ผลกว่า'),
                P('id7', 'หนีเสือปะจระเข้', 'หนีภัยหนึ่งเจออีกภัยหนึ่ง'), P('id8', 'เข็นครกขึ้นภูเขา', 'ทำงานที่ยากลำบากมาก'),
                P('id9', 'ช้าๆ ได้พร้าเล่มงาม', 'ค่อยทำอย่างรอบคอบผลงานจะดี'), P('id10', 'จับปลาสองมือ', 'หวังได้สองอย่างพร้อมกัน'),
                P('id11', 'ปิดทองหลังพระ', 'ทำความดีโดยไม่หวังชื่อเสียง'), P('id12', 'รักวัวให้ผูก รักลูกให้ตี', 'รักลูกต้องอบรมสั่งสอน'),
            ]),
            mk('set_times', 'สูตรคูณแม่ 6–9', 'คณิตศาสตร์', 'ป.1–ป.3', 'qa', '#2563eb', 'fa-calculator', 'จับคู่โจทย์การคูณกับคำตอบ', [
                P('tm1', '6 × 7', '42'), P('tm2', '7 × 8', '56'), P('tm3', '8 × 9', '72'), P('tm4', '9 × 6', '54'),
                P('tm5', '6 × 8', '48'), P('tm6', '7 × 7', '49'), P('tm7', '8 × 8', '64'), P('tm8', '9 × 9', '81'),
                P('tm9', '6 × 6', '36'), P('tm10', '7 × 9', '63'), P('tm11', '8 × 4', '32'), P('tm12', '9 × 3', '27'),
            ]),
            mk('set_sky', 'ปรากฏการณ์ธรรมชาติ', 'วิทยาศาสตร์', 'ป.4–ป.6', 'image', '#0891b2', 'fa-cloud-sun-rain', 'จับคู่ภาพกับชื่อปรากฏการณ์และวัตถุท้องฟ้า', [
                P('sk1', '☀️', 'ดวงอาทิตย์'), P('sk2', '🌙', 'ดวงจันทร์'), P('sk3', '🌍', 'โลก'), P('sk4', '🪐', 'ดาวเสาร์'),
                P('sk5', '🌈', 'รุ้งกินน้ำ'), P('sk6', '⚡', 'ฟ้าแลบ'), P('sk7', '🌧️', 'ฝนตก'), P('sk8', '❄️', 'หิมะ'),
                P('sk9', '🌋', 'ภูเขาไฟ'), P('sk10', '🌊', 'คลื่น'), P('sk11', '☄️', 'ดาวหาง'), P('sk12', '🌪️', 'พายุหมุน'),
            ]),
            mk('set_asean', 'ประเทศอาเซียนและเมืองหลวง', 'สังคมศึกษา', 'ม.1–ม.3', 'word', '#b45309', 'fa-earth-asia', 'จับคู่ชื่อประเทศสมาชิกอาเซียนกับเมืองหลวง', [
                P('as1', 'ไทย', 'กรุงเทพมหานคร'), P('as2', 'ลาว', 'เวียงจันทน์'), P('as3', 'กัมพูชา', 'พนมเปญ'), P('as4', 'เวียดนาม', 'ฮานอย'),
                P('as5', 'มาเลเซีย', 'กัวลาลัมเปอร์'), P('as6', 'อินโดนีเซีย', 'จาการ์ตา'), P('as7', 'ฟิลิปปินส์', 'มะนิลา'), P('as8', 'บรูไน', 'บันดาร์เสรีเบกาวัน'),
                P('as9', 'เมียนมา', 'เนปิดอ'), P('as10', 'สิงคโปร์', 'สิงคโปร์'),
            ]),
            mk('set_device', 'อุปกรณ์คอมพิวเตอร์', 'วิทยาการคำนวณ', 'ป.4–ป.6', 'image', '#16a34a', 'fa-laptop-code', 'จับคู่ภาพอุปกรณ์กับชื่อเรียก', [
                P('dv1', '⌨️', 'แป้นพิมพ์'), P('dv2', '🖱️', 'เมาส์'), P('dv3', '🖥️', 'จอภาพ'), P('dv4', '🖨️', 'เครื่องพิมพ์'),
                P('dv5', '💾', 'แผ่นบันทึกข้อมูล'), P('dv6', '📷', 'กล้องถ่ายภาพ'), P('dv7', '🎧', 'หูฟัง'), P('dv8', '📱', 'สมาร์ตโฟน'),
                P('dv9', '💻', 'คอมพิวเตอร์โน้ตบุ๊ก'), P('dv10', '🔋', 'แบตเตอรี่'),
            ]),
        ];
    }

    /* จำลองการเล่นด้วยกติกาจริง (ผลคงที่ทุกครั้งเพราะกำหนด seed) */
    function playMemory(set) {
        const g = Engine.newGame(set, 'memory', ['ทีมเสือ', 'ทีมช้าง', 'ทีมนกฮูก', 'ทีมโลมา'].map((name) => ({ name })), { level: 'normal' }, { seed: 5, id: 'g_demo001', now: '2026-10-21T02:30:00.000Z', title: 'เกมจับคู่ความจำทบทวนคำศัพท์ภาษาอังกฤษ', dateText: '21 ตุลาคม 2569', place: 'ห้องเรียน ป.3/1' });
        const rand = Engine.rng(11);
        const seen = {};
        let guard = 0;
        while (!Engine.isOver(g) && guard < 500) {
            guard += 1;
            const closed = g.cards.map((c, i) => i).filter((i) => !g.cards[i].by);
            const i = closed[Math.floor(rand() * closed.length)];
            Engine.flip(g, i);
            const mate = closed.find((j) => j !== i && seen[j] && g.cards[j].k === g.cards[i].k);
            const j = mate != null && rand() < 0.8 ? mate : closed.filter((x) => x !== i)[Math.floor(rand() * (closed.length - 1))];
            seen[i] = true; seen[j] = true;
            const r = Engine.flip(g, j);
            if (r.type === 'miss') Engine.closeMiss(g);
        }
        g.judges = ['นางสาวพิมพ์ชนก ศรีสวัสดิ์', 'นายธนวัฒน์ ใจเย็น', 'นางวรรณา แสงทอง'];
        return finish(g, '2026-10-21T03:10:00.000Z');
    }
    function playQuiz(set) {
        const g = Engine.newGame(set, 'quiz', ['ทีมสีแดง', 'ทีมสีน้ำเงิน', 'ทีมสีเขียว'].map((name) => ({ name })), { level: 'normal', rounds: 9 }, { seed: 21, id: 'g_demo002', now: '2026-10-23T06:00:00.000Z', title: 'ทายใจสำนวนไทย ท้ายคาบเรียน', dateText: '23 ตุลาคม 2569', place: 'ห้องเรียน ป.5/2' });
        const rand = Engine.rng(5);
        while (!Engine.isOver(g)) {
            const q = Engine.question(g);
            const right = rand() < 0.72;
            Engine.answer(g, right ? q.pair.b : q.choices.find((c) => c !== q.pair.b), Math.round(4 + rand() * 15));
        }
        g.judges = ['นายสมเกียรติ รักเรียน', '', ''];
        return finish(g, '2026-10-23T06:25:00.000Z');
    }
    function finish(g, at) { g.status = 'done'; g.finishedAt = at; return g; }

    function build() {
        const s = sets();
        return {
            app: 'vs-memory-game', schemaVersion: 1, createdAt: '2026-10-20T08:00:00.000Z', updatedAt: '2026-10-23T06:25:00.000Z',
            school: { name: 'โรงเรียนบ้านหนองบัวทอง', agency: 'กลุ่มบริหารวิชาการ โรงเรียนบ้านหนองบัวทอง', academicYear: '2569', semester: '2', director: 'ผู้อำนวยการโรงเรียนบ้านหนองบัวทอง', reporterName: 'นางสาวพิมพ์ชนก ศรีสวัสดิ์', reporterPosition: 'ครูชำนาญการ' },
            settings: { level: 'normal', rounds: 10, points: 10, speedBonus: 5, time: 0, sound: true, teamPreset: 'animal', teamCount: 4, volume: 0.8, cardBack: 'star' },
            sets: s,
            games: [playQuiz(s[1]), playMemory(s[0])],
            live: null,
        };
    }
    return { build, sets };
});
