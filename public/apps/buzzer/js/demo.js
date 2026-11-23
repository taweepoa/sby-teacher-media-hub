/* =====================================================================
   ข้อมูลตัวอย่าง (ชื่อสมมติทั้งหมด) — ใช้ทั้งปุ่ม "ทดลองด้วยข้อมูลตัวอย่าง" และ dev/build-docs.js
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
    else root.Demo = factory(root.Core);
})(typeof self !== 'undefined' ? self : this, function (Core) {
    'use strict';
    // ภาพประกอบคำถาม (SVG ฝังในข้อมูล ไม่ต้องใช้ไฟล์ภายนอก)
    const svg = (body) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260"><rect width="400" height="260" rx="18" fill="#fff7ed"/>${body}</svg>`);
    const IMG_SUN = svg('<circle cx="200" cy="130" r="62" fill="#FF9F0A"/><g stroke="#FF9F0A" stroke-width="10" stroke-linecap="round"><line x1="200" y1="20" x2="200" y2="48"/><line x1="200" y1="212" x2="200" y2="240"/><line x1="90" y1="130" x2="118" y2="130"/><line x1="282" y1="130" x2="310" y2="130"/><line x1="122" y1="52" x2="142" y2="72"/><line x1="258" y1="188" x2="278" y2="208"/><line x1="278" y1="52" x2="258" y2="72"/><line x1="142" y1="188" x2="122" y2="208"/></g>');
    const IMG_TRI = svg('<polygon points="200,30 340,220 60,220" fill="#30D158" opacity=".85"/><text x="200" y="250" font-size="22" text-anchor="middle" fill="#0f172a">ด้านยาวเท่ากันทุกด้าน</text>');
    const IMG_DROP = svg('<path d="M200 30 C260 110 300 150 300 180 a100 100 0 0 1 -200 0 C100 150 140 110 200 30z" fill="#0A84FF"/><text x="200" y="190" font-size="40" text-anchor="middle" fill="#fff" font-weight="bold">H₂O</text>');

    const Q = (id, cat, text, answer, points, img) => ({ id, cat, text, answer, points: points || '', img: img || '' });
    const questions = [
        Q('q_d01', 'วิทยาศาสตร์', 'ดาวเคราะห์ดวงใดอยู่ใกล้ดวงอาทิตย์มากที่สุด', 'ดาวพุธ'),
        Q('q_d02', 'วิทยาศาสตร์', 'ภาพนี้คือแหล่งพลังงานหลักของโลก เรียกว่าอะไร', 'ดวงอาทิตย์', '', IMG_SUN),
        Q('q_d03', 'วิทยาศาสตร์', 'สูตรเคมีในภาพคือสารใด', 'น้ำ', '', IMG_DROP),
        Q('q_d04', 'วิทยาศาสตร์', 'อวัยวะใดของพืชทำหน้าที่สังเคราะห์ด้วยแสงเป็นหลัก', 'ใบ'),
        Q('q_d05', 'วิทยาศาสตร์', 'หน่วยวัดแรงในระบบเอสไอ (SI) คือหน่วยใด', 'นิวตัน'),
        Q('q_d06', 'วิทยาศาสตร์', 'น้ำเดือดที่อุณหภูมิกี่องศาเซลเซียส (ที่ระดับน้ำทะเล)', '100 องศาเซลเซียส'),
        Q('q_d07', 'วิทยาศาสตร์', 'สัตว์ที่หายใจด้วยเหงือกในวัยอ่อนและหายใจด้วยปอดเมื่อโตเต็มวัย คือสัตว์กลุ่มใด', 'สัตว์สะเทินน้ำสะเทินบก (เช่น กบ)', 20),
        Q('q_d08', 'คณิตศาสตร์', 'รูปสามเหลี่ยมในภาพเรียกว่าสามเหลี่ยมชนิดใด', 'สามเหลี่ยมด้านเท่า', '', IMG_TRI),
        Q('q_d09', 'คณิตศาสตร์', '12 × 12 มีค่าเท่าใด', '144'),
        Q('q_d10', 'คณิตศาสตร์', 'มุมภายในของรูปสามเหลี่ยมรวมกันได้กี่องศา', '180 องศา'),
        Q('q_d11', 'คณิตศาสตร์', 'จำนวนเฉพาะที่น้อยที่สุดคือจำนวนใด', '2'),
        Q('q_d12', 'ความรู้รอบตัว', 'วันภาษาไทยแห่งชาติตรงกับวันที่เท่าใด', '29 กรกฎาคม'),
        Q('q_d13', 'ความรู้รอบตัว', 'แม่น้ำสายสำคัญที่ไหลผ่านกรุงเทพมหานครคือแม่น้ำใด', 'แม่น้ำเจ้าพระยา'),
        Q('q_d14', 'ความรู้รอบตัว', 'ประเทศไทยมีกี่จังหวัด (รวมกรุงเทพมหานคร)', '77 จังหวัด'),
        Q('q_d15', 'ภาษาไทย', 'คำว่า "ปรัชญา" มีกี่พยางค์', '3 พยางค์ (ปรัด-ชะ-ยา)', 20),
        Q('q_d16', 'ภาษาไทย', 'ผู้แต่งเรื่องพระอภัยมณีคือใคร', 'สุนทรภู่'),
        Q('q_d17', 'ภาษาอังกฤษ', 'What is the opposite of "ancient"?', 'modern'),
        Q('q_d18', 'คอมพิวเตอร์', 'อุปกรณ์ใดทำหน้าที่เป็น "สมอง" ของคอมพิวเตอร์', 'หน่วยประมวลผลกลาง (CPU)'),
    ];
    const teams = [
        { id: 't_d1', name: 'ทีมสายฟ้า', color: '#FF375F', key: 'KeyA', members: 'ด.ช.ภูมิ ใจกล้า, ด.ญ.ปุณณดา รักเรียน, ด.ช.ธีรเดช มีสุข' },
        { id: 't_d2', name: 'ทีมดาวเหนือ', color: '#0A84FF', key: 'KeyL', members: 'ด.ญ.กานต์ธิดา แสงเพชร, ด.ช.ณภัทร ทองคำ, ด.ญ.พิมพ์ลดา ชัยมงคล' },
        { id: 't_d3', name: 'ทีมพยัคฆ์', color: '#30D158', key: 'KeyQ', members: 'ด.ช.กิตติพัฒน์ บุญยืน, ด.ญ.อรอุมา ศรีสวัสดิ์, ด.ช.วรเมธ ใจงาม' },
        { id: 't_d4', name: 'ทีมอินทรี', color: '#FF9F0A', key: 'KeyP', members: 'ด.ญ.ชลธิชา พรหมมา, ด.ช.ศุภกร คงดี, ด.ญ.นันทิชา วงศ์ใหญ่' },
    ];

    /* ผลการแข่งขันที่จบแล้ว 1 รายการ (ใช้ดูรายงาน/กระดานคะแนน/ประกาศผู้ชนะ) */
    function pastMatch() {
        const plan = [ // [ข้อ, [[ทีม, ms]...], [[ทีม, ผล]...]]
            ['q_d01', [['t_d2', 412], ['t_d1', 538], ['t_d4', 901]], [['t_d2', 'ok']]],
            ['q_d02', [['t_d1', 377], ['t_d3', 402]], [['t_d1', 'ok']]],
            ['q_d04', [['t_d3', 455], ['t_d2', 610]], [['t_d3', 'bad'], ['t_d2', 'ok']]],
            ['q_d05', [['t_d4', 520], ['t_d1', 533], ['t_d2', 744]], [['t_d4', 'ok']]],
            ['q_d06', [['t_d1', 298], ['t_d2', 315]], [['t_d1', 'ok']]],
            ['q_d07', [['t_d2', 640], ['t_d3', 702]], [['t_d2', 'bad'], ['t_d3', 'ok']]],
            ['q_d09', [['t_d1', 351], ['t_d4', 360], ['t_d3', 488]], [['t_d1', 'ok']]],
            ['q_d10', [['t_d4', 433]], [['t_d4', 'ok']]],
            ['q_d12', [['t_d2', 389], ['t_d1', 402]], [['t_d2', 'ok']]],
            ['q_d13', [['t_d3', 471], ['t_d1', 590]], [['t_d3', 'bad'], ['t_d1', 'ok']]],
            ['q_d15', [['t_d1', 512], ['t_d2', 530]], [['t_d1', 'bad'], ['t_d2', 'ok']]],
            ['q_d16', [['t_d4', 366], ['t_d2', 371]], [['t_d4', 'ok']]],
        ];
        const scores = { t_d1: 0, t_d2: 0, t_d3: 0, t_d4: 0 };
        const log = plan.map(([qid, pr, ev], i) => {
            const q = questions.find((x) => x.id === qid);
            const pts = Number(q.points) || 10;
            const events = ev.map(([team, result]) => {
                const delta = result === 'ok' ? pts : -5;
                scores[team] += delta;
                return { team, result, delta };
            });
            return { no: i + 1, qid, text: q.text, answer: q.answer, points: pts, presses: pr.map(([team, ms]) => ({ team, ms })), events };
        });
        return {
            id: 'm_d001', regNo: 1, name: 'วิชาวิทยาศาสตร์และความรู้รอบตัว', level: 'มัธยมศึกษาปีที่ 1–3',
            place: 'หอประชุมโรงเรียน', organizer: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี', date: '2026-08-18',
            teams: teams.map((t) => ({ id: t.id, name: t.name, color: t.color, members: t.members })), scores, log, status: 'done',
            judges: ['นางสาวกมลวรรณ ศรีประเสริฐ', 'นายธนากร พูลสวัสดิ์'], createdAt: '2026-08-18T09:00:00.000Z', finishedAt: '2026-08-18T10:15:00.000Z',
        };
    }

    function build() {
        return {
            app: 'vs-buzzer', schemaVersion: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            school: {
                name: 'โรงเรียนบ้านหนองบัววิทยา', agency: 'โรงเรียนบ้านหนองบัววิทยา สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาตัวอย่าง',
                director: 'นายสมพงษ์ ทองประเสริฐ', directorPos: 'ผู้อำนวยการโรงเรียนบ้านหนองบัววิทยา',
                reporter: 'นางสาววิภาวรรณ ใจดี', reporterPos: 'ครู ชำนาญการ', docPrefix: 'ศธ ๐๔๒๓๔.๑๒/', academicYear: '2569',
            },
            settings: { points: 10, penalty: 5, answerSec: 15, armDelay: 0, sound: true, volume: 0.7, allowPass: true, autoNext: false },
            teams: teams.map((t) => ({ ...t })),
            questions: questions.map((q) => ({ ...q })),
            matches: [pastMatch()],
            templates: { ...Core.DEFAULT_TEMPLATES },
            prizes: Core.DEFAULT_PRIZES.map((p) => ({ ...p })),
            nextRegNo: 2,
        };
    }
    return { build };
});
