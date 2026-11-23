/* =====================================================================
   แกนหลักของเกมเศรษฐี (ใช้ได้ทั้งเบราว์เซอร์และ Node — dev/test-core.js, dev/build-docs.js)
   - ค่าเริ่มต้น/แม่แบบข้อความ (แก้ได้ทุกช่องในหน้า "ตั้งค่าแม่แบบ")
   - ตรรกะเกม: จัดลำดับคำถามง่าย→ยาก, บันไดคะแนน, จุดปลอดภัย, ตัวช่วย 3 อย่าง
   - ข้อมูลตัวอย่าง (ชื่อโรงเรียน/นักเรียนสมมติทั้งหมด)
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Core = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const APP_ID = 'vs-millionaire-quiz';
    const LETTERS = ['ก', 'ข', 'ค', 'ง'];
    const LEVELS = [
        { v: 1, label: 'ง่าย', cls: 'ok' },
        { v: 2, label: 'ปานกลาง', cls: 'warn' },
        { v: 3, label: 'ยาก', cls: 'bad' },
    ];
    const LIFELINES = {
        fifty: { label: 'ตัดเหลือ 2 ตัวเลือก', short: '50:50', icon: 'fa-scissors' },
        ask: { label: 'ถามเพื่อนในห้อง', short: 'ถามเพื่อน', icon: 'fa-people-group' },
        swap: { label: 'ขอเปลี่ยนคำถาม', short: 'เปลี่ยนข้อ', icon: 'fa-arrows-rotate' },
    };
    const STATUS = {
        win: { label: 'ชนะเลิศ (ตอบครบ)', cls: 'ok', icon: 'fa-crown' },
        walk: { label: 'ขอหยุดรับคะแนน', cls: 'info', icon: 'fa-hand' },
        lose: { label: 'ตอบผิด', cls: 'bad', icon: 'fa-xmark' },
        timeout: { label: 'หมดเวลา', cls: 'warn', icon: 'fa-hourglass-end' },
    };

    /* ---------- ค่าเริ่มต้น (แก้ได้ในหน้าตั้งค่าแม่แบบ) ---------- */
    function defaultSettings() {
        return {
            ladder: [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000],
            safe: [5, 10],               // ขั้นที่เป็นจุดปลอดภัย (นับจากขั้นที่ 1 ของบันได 15 ขั้น)
            unit: 'คะแนน',
            time: [30, 45, 60],          // วินาทีต่อข้อ ตามระดับ ง่าย/ปานกลาง/ยาก (0 = ไม่จับเวลา)
            suspense: 2,                 // วินาทีลุ้นก่อนเฉลย
            sound: true,
            volume: 0.8,
            lifelines: { fifty: true, ask: true, swap: true },
            askMode: 'count',            // count = ครูนับมือนักเรียนแล้วกรอก · sim = จำลองผลโหวต
            classSize: 30,
        };
    }
    function defaultTexts() {
        return {
            activity: 'กิจกรรมเกมเศรษฐีตอบคำถามในชั้นเรียน',
            objective: 'เพื่อส่งเสริมให้นักเรียนทบทวนความรู้ กล้าแสดงออก และมีส่วนร่วมในการเรียนรู้อย่างสนุกสนาน',
            memoSubject: 'รายงานผลการจัด{กิจกรรม}',
            memoP1: 'ตามที่ข้าพเจ้าได้จัด{กิจกรรม} {ชั้นเรียน} ภาคเรียนที่ {ภาคเรียน} ปีการศึกษา {ปีการศึกษา} {วัตถุประสงค์} นั้น',
            memoP2: 'บัดนี้ การจัดกิจกรรมดังกล่าวได้ดำเนินการเรียบร้อยแล้ว ระหว่างวันที่ {ช่วงวันที่} มีผู้เข้าร่วมเล่นทั้งสิ้น {จำนวนครั้ง} ครั้ง ใช้ชุดคำถาม {ชุดคำถาม} ผู้ตอบได้คะแนนสูงสุด ได้แก่ {ผู้ชนะ} รายละเอียดตามสรุปผลที่แนบมาพร้อมนี้',
            memoEnd: 'จึงเรียนมาเพื่อโปรดทราบ',
            reportTitle: 'สรุปผลการจัดกิจกรรมเกมเศรษฐีตอบคำถาม',
            certTitle: 'เกียรติบัตร',
            certGive: 'ขอมอบเกียรติบัตรฉบับนี้ไว้เพื่อแสดงว่า',
            certReason: 'ได้รับรางวัลผู้ชนะ {กิจกรรม} วิชา{วิชา} ได้ {คะแนน} {หน่วย}',
            certWish: 'ขอให้มีความสุข ความเจริญ และตั้งใจศึกษาเล่าเรียนต่อไป',
            certSigner: 'ผู้อำนวยการ{โรงเรียน}',
        };
    }
    function defaultSchool() {
        return { name: '', agency: '', director: '', teacher: '', teacherPosition: 'ครู', className: '', semester: '1', academicYear: '' };
    }

    /* ---------- เครื่องมือ ---------- */
    const fmt = (n) => Number(n || 0).toLocaleString('en-US');
    function rng(seed) { // สุ่มแบบกำหนดเมล็ดได้ (ทดสอบซ้ำได้)
        let s = (seed >>> 0) || 1;
        return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    function shuffle(arr, rand) { // Fisher–Yates
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a;
    }
    /** แทนค่า {ชื่อช่อง} ในข้อความแม่แบบ — ช่องที่ไม่มีข้อมูลเว้นจุดไข่ปลา (ห้ามเดา) */
    function fill(tpl, vars) {
        return String(tpl || '').replace(/\{([^{}]+)\}/g, (m, k) => {
            const v = vars[k];
            return v === undefined || v === null || String(v).trim() === '' ? '.'.repeat(20) : String(v);
        }).replace(/\s+/g, ' ').trim();
    }

    /* ---------- บันได/จุดปลอดภัย ---------- */
    /** บันไดของเกมที่มี n ข้อ: ใช้ "ขั้นบนสุด n ขั้น" ของบันไดที่ตั้งไว้ (รางวัลสูงสุดเท่าเดิม) */
    function ladderFor(settings, n) {
        const L = settings.ladder;
        const cut = Math.max(0, L.length - n);
        const prizes = L.slice(cut);
        const safe = settings.safe.map((s) => s - cut).filter((s) => s >= 1 && s < prizes.length);
        return { prizes, safe };
    }
    /** คะแนนที่ได้เมื่อตอบผิด/หมดเวลา = จุดปลอดภัยสูงสุดที่ผ่านมาแล้ว */
    function safePrize(g) {
        let p = 0;
        g.safe.forEach((s) => { if (s <= g.idx) p = Math.max(p, g.prizes[s - 1]); });
        return p;
    }
    const currentPrize = (g) => (g.idx > 0 ? g.prizes[g.idx - 1] : 0);

    /** จัดลำดับคำถาม: ง่าย→ยาก (คงลำดับเดิมในระดับเดียวกัน) n ข้อแรก = ใช้เล่น ที่เหลือ = ข้อสำรองสำหรับตัวช่วยเปลี่ยนคำถาม */
    function splitDeck(questions, n) {
        const sorted = questions.map((q, i) => ({ q, i })).sort((a, b) => (a.q.level - b.q.level) || (a.i - b.i)).map((x) => x.q);
        return { deck: sorted.slice(0, n), spares: sorted.slice(n) };
    }
    function gameSize(settings, set) { return Math.min(settings.ladder.length, set.questions.length); }

    function newGame(set, settings, who, opts) {
        const n = gameSize(settings, set);
        const { deck, spares } = splitDeck(set.questions, n);
        const { prizes, safe } = ladderFor(settings, n);
        const o = opts || {};
        return {
            id: o.id || `g_${Date.now().toString(36)}${Math.floor(Math.random() * 1e5).toString(36)}`,
            startedAt: o.startedAt || new Date().toISOString(),
            mode: who.mode === 'team' ? 'team' : 'single',
            player: who.name || '',
            members: who.members || [],
            className: who.className || '',
            setId: set.id,
            setName: set.name,
            subject: set.subject || '',
            unit: settings.unit,
            deck: JSON.parse(JSON.stringify(deck)),
            spares: JSON.parse(JSON.stringify(spares)),
            prizes,
            safe,
            idx: 0,                      // จำนวนข้อที่ตอบถูกแล้ว = ข้อปัจจุบัน (0-based)
            phase: 'ask',                // ask → locked → reveal → (next | over)
            picked: null,
            hidden: [],
            votes: null,
            lifelines: { fifty: !!settings.lifelines.fifty, ask: !!settings.lifelines.ask, swap: !!settings.lifelines.swap && spares.length > 0 },
            used: [],
            log: [],
            status: 'play',
            won: 0,
            seed: o.seed || Math.floor(Math.random() * 1e9),
        };
    }
    const question = (g) => g.deck[g.idx];

    function useFifty(g) {
        if (!g.lifelines.fifty || g.phase !== 'ask') return false;
        const q = question(g);
        const rand = rng(g.seed + g.idx * 7 + 1);
        const wrong = [0, 1, 2, 3].filter((i) => i !== q.answer && q.choices[i]);
        const keep = wrong[Math.floor(rand() * wrong.length)];
        g.hidden = wrong.filter((i) => i !== keep);
        g.lifelines.fifty = false;
        g.used.push({ k: 'fifty', at: g.idx + 1 });
        return true;
    }
    /** ผลโหวตจำลอง (ร้อยละ) — ข้อง่ายเพื่อนตอบถูกมาก ข้อยากกระจาย */
    function simulateVotes(q, hidden, seed) {
        const rand = rng(seed);
        const base = { 1: [62, 82], 2: [45, 66], 3: [32, 52] }[q.level] || [45, 65];
        const vis = [0, 1, 2, 3].filter((i) => !hidden.includes(i) && q.choices[i]);
        const pct = [0, 0, 0, 0];
        let right = Math.round(base[0] + rand() * (base[1] - base[0]));
        if (vis.length === 2) right = Math.min(90, right + 12);
        pct[q.answer] = right;
        const others = vis.filter((i) => i !== q.answer);
        const w = others.map(() => 0.3 + rand());
        const sw = w.reduce((a, b) => a + b, 0) || 1;
        let left = 100 - right;
        others.forEach((i, k) => { const v = k === others.length - 1 ? left : Math.round((100 - right) * w[k] / sw); pct[i] = v; left -= v; });
        return pct;
    }
    /** แปลงจำนวนมือที่ครูนับได้เป็นร้อยละ (รวม = 100) */
    function countsToPct(counts) {
        const total = counts.reduce((a, b) => a + (Number(b) || 0), 0);
        if (!total) return [0, 0, 0, 0];
        const raw = counts.map((c) => (Number(c) || 0) * 100 / total);
        const pct = raw.map(Math.floor);
        let rest = 100 - pct.reduce((a, b) => a + b, 0);
        raw.map((v, i) => ({ i, f: v - Math.floor(v) })).sort((a, b) => b.f - a.f).forEach((x) => { if (rest > 0 && counts[x.i] > 0) { pct[x.i] += 1; rest -= 1; } });
        return pct;
    }
    function useAsk(g, pct) {
        if (!g.lifelines.ask || g.phase !== 'ask') return false;
        g.votes = pct;
        g.lifelines.ask = false;
        g.used.push({ k: 'ask', at: g.idx + 1 });
        return true;
    }
    function useSwap(g) {
        if (!g.lifelines.swap || g.phase !== 'ask' || !g.spares.length) return false;
        const cur = question(g);
        // ข้อสำรองระดับใกล้เคียงที่สุด
        let best = 0;
        g.spares.forEach((q, i) => { if (Math.abs(q.level - cur.level) < Math.abs(g.spares[best].level - cur.level)) best = i; });
        const nq = g.spares.splice(best, 1)[0];
        g.deck[g.idx] = nq;
        g.log.push({ n: g.idx + 1, text: cur.text, pick: null, answer: cur.answer, ok: null, swapped: true });
        g.hidden = [];
        g.votes = null;
        g.lifelines.swap = false;
        g.used.push({ k: 'swap', at: g.idx + 1 });
        return true;
    }

    function lock(g, choice) {
        if (g.phase !== 'ask' || g.hidden.includes(choice)) return false;
        g.picked = choice;
        g.phase = 'locked';
        return true;
    }
    function unlock(g) { if (g.phase === 'locked') { g.picked = null; g.phase = 'ask'; } }
    /** เฉลย: คืนค่า true ถ้าถูก */
    function reveal(g) {
        if (g.phase !== 'locked') return null;
        const q = question(g);
        const ok = g.picked === q.answer;
        g.log.push({ n: g.idx + 1, text: q.text, pick: g.picked, answer: q.answer, ok });
        g.phase = 'reveal';
        if (ok) {
            g.idx += 1;
            if (g.idx >= g.deck.length) finish(g, 'win');
        } else finish(g, 'lose');
        return ok;
    }
    function timeout(g) {
        if (g.phase !== 'ask' && g.phase !== 'locked') return;
        const q = question(g);
        g.log.push({ n: g.idx + 1, text: q.text, pick: null, answer: q.answer, ok: false, timeout: true });
        g.phase = 'reveal';
        finish(g, 'timeout');
    }
    function walkAway(g) {
        if (g.phase !== 'ask' || g.status !== 'play') return;
        finish(g, 'walk');
    }
    function next(g) {
        if (g.phase !== 'reveal' || g.status !== 'play') return false;
        g.phase = 'ask'; g.picked = null; g.hidden = []; g.votes = null;
        return true;
    }
    function finish(g, status) {
        g.status = status;
        g.won = status === 'win' ? g.prizes[g.prizes.length - 1] : status === 'walk' ? currentPrize(g) : safePrize(g);
        g.endedAt = new Date().toISOString();
        if (status !== 'lose' && status !== 'timeout') g.phase = 'over';
    }
    /** บันทึกผลเกม (เก็บในประวัติ) */
    function toResult(g) {
        return {
            id: g.id, date: g.endedAt || g.startedAt, mode: g.mode, player: g.player, members: g.members, className: g.className,
            setId: g.setId, setName: g.setName, subject: g.subject, total: g.deck.length, correct: g.idx,
            won: g.won, top: g.prizes[g.prizes.length - 1], unit: g.unit, status: g.status,
            used: g.used.map((u) => u.k), log: g.log,
        };
    }

    /* ======================= ข้อมูลตัวอย่าง ======================= */
    const Q = (level, text, choices, answer, explain) => ({ level, text, choices, answer, explain: explain || '' });
    const SAMPLE_SETS = [
        {
            id: 'set_sci', name: 'วิทยาศาสตร์รอบรู้ ป.6', subject: 'วิทยาศาสตร์', grade: 'ป.6', color: '#16a34a', icon: 'fa-flask',
            questions: [
                Q(1, 'พืชสร้างอาหารด้วยกระบวนการใด', ['การหายใจ', 'การสังเคราะห์ด้วยแสง', 'การคายน้ำ', 'การย่อยอาหาร'], 1),
                Q(1, 'น้ำบริสุทธิ์เดือดที่อุณหภูมิกี่องศาเซลเซียส (ที่ระดับน้ำทะเล)', ['50', '80', '100', '120'], 2),
                Q(1, 'อวัยวะใดทำหน้าที่สูบฉีดเลือดไปเลี้ยงร่างกาย', ['หัวใจ', 'ปอด', 'ตับ', 'ไต'], 0),
                Q(1, 'ดาวเคราะห์ดวงใดอยู่ใกล้ดวงอาทิตย์มากที่สุด', ['ดาวศุกร์', 'โลก', 'ดาวอังคาร', 'ดาวพุธ'], 3),
                Q(1, 'น้ำแข็งมีสถานะเป็นอะไร', ['ของแข็ง', 'ของเหลว', 'แก๊ส', 'พลาสมา'], 0),
                Q(2, 'พืชปล่อยแก๊สใดออกมาจากการสังเคราะห์ด้วยแสง', ['คาร์บอนไดออกไซด์', 'ไนโตรเจน', 'ออกซิเจน', 'ไฮโดรเจน'], 2),
                Q(2, 'ร่างกายผู้ใหญ่มีกระดูกประมาณกี่ชิ้น', ['106', '206', '306', '406'], 1),
                Q(2, 'หน่วยของแรงในระบบเอสไอ (SI) คือข้อใด', ['จูล', 'วัตต์', 'ปาสคาล', 'นิวตัน'], 3),
                Q(2, 'สัตว์ชนิดใดเป็นสัตว์เลี้ยงลูกด้วยน้ำนม', ['ฉลาม', 'โลมา', 'เต่าทะเล', 'ปลาหมึก'], 1, 'โลมาหายใจด้วยปอดและเลี้ยงลูกด้วยน้ำนม'),
                Q(2, 'ข้อใดเป็นแหล่งพลังงานหมุนเวียน', ['ถ่านหิน', 'น้ำมันดิบ', 'พลังงานแสงอาทิตย์', 'แก๊สธรรมชาติ'], 2),
                Q(3, 'สัญลักษณ์ทางเคมีของทองคำคือข้อใด', ['Ag', 'Au', 'Go', 'Gd'], 1, 'Au มาจากภาษาละติน aurum'),
                Q(3, 'ส่วนใดของเซลล์ควบคุมการทำงานของเซลล์และเก็บสารพันธุกรรม', ['นิวเคลียส', 'ไซโทพลาซึม', 'ผนังเซลล์', 'แวคิวโอล'], 0),
                Q(3, 'แสงจากดวงอาทิตย์เดินทางมาถึงโลกใช้เวลาประมาณเท่าใด', ['8 วินาที', '8 นาที', '8 ชั่วโมง', '8 วัน'], 1),
                Q(3, 'สารละลายที่เป็นกลางมีค่า pH เท่าใด', ['0', '5', '7', '14'], 2),
                Q(3, 'นักวิทยาศาสตร์คนใดเสนอกฎการเคลื่อนที่ 3 ข้อ', ['กาลิเลโอ กาลิเลอี', 'อัลเบิร์ต ไอน์สไตน์', 'ชาลส์ ดาร์วิน', 'ไอแซก นิวตัน'], 3),
                Q(2, 'ดาวเคราะห์ดวงใดใหญ่ที่สุดในระบบสุริยะ', ['ดาวเสาร์', 'ดาวพฤหัสบดี', 'ดาวเนปจูน', 'โลก'], 1),
                Q(3, 'แก๊สชนิดใดมีมากที่สุดในอากาศ', ['ออกซิเจน', 'คาร์บอนไดออกไซด์', 'ไนโตรเจน', 'อาร์กอน'], 2, 'ไนโตรเจนมีประมาณร้อยละ 78 ของอากาศ'),
            ],
        },
        {
            id: 'set_math', name: 'คณิตคิดเร็ว ป.6', subject: 'คณิตศาสตร์', grade: 'ป.6', color: '#2563eb', icon: 'fa-square-root-variable',
            questions: [
                Q(1, '25 + 37 เท่ากับเท่าใด', ['52', '62', '63', '72'], 1),
                Q(1, '9 × 8 เท่ากับเท่าใด', ['72', '64', '81', '56'], 0),
                Q(1, 'รูปสามเหลี่ยมมีมุมกี่มุม', ['2', '3', '4', '5'], 1),
                Q(1, '1 ชั่วโมงมีกี่นาที', ['30', '100', '60', '24'], 2),
                Q(1, 'จำนวนใดเป็นจำนวนคู่', ['15', '27', '33', '48'], 3),
                Q(2, '144 ÷ 12 เท่ากับเท่าใด', ['11', '12', '13', '14'], 1),
                Q(2, '25% ของ 80 เท่ากับเท่าใด', ['20', '25', '16', '40'], 0),
                Q(2, 'รูปสี่เหลี่ยมจัตุรัสยาวด้านละ 7 เซนติเมตร มีพื้นที่เท่าใด', ['28 ตารางเซนติเมตร', '49 ตารางเซนติเมตร', '14 ตารางเซนติเมตร', '56 ตารางเซนติเมตร'], 1),
                Q(2, 'ค.ร.น. ของ 4 และ 6 คือข้อใด', ['12', '24', '2', '10'], 0),
                Q(2, '3/4 เขียนเป็นทศนิยมได้เท่าใด', ['0.34', '0.25', '0.75', '0.43'], 2),
                Q(3, 'มุมภายในทั้งสามมุมของรูปสามเหลี่ยมรวมกันได้กี่องศา', ['90 องศา', '180 องศา', '270 องศา', '360 องศา'], 1),
                Q(3, 'จำนวนเฉพาะที่น้อยที่สุดคือข้อใด', ['0', '1', '2', '3'], 2),
                Q(3, 'ถ้า 3x + 5 = 20 แล้ว x เท่ากับเท่าใด', ['3', '4', '5', '6'], 2, '3x = 15 ดังนั้น x = 5'),
                Q(3, '2 ยกกำลัง 10 เท่ากับเท่าใด', ['100', '512', '1,000', '1,024'], 3),
                Q(3, 'วงกลมรัศมี 7 เซนติเมตร มีความยาวเส้นรอบวงเท่าใด (ใช้ π ≈ 22/7)', ['22 เซนติเมตร', '44 เซนติเมตร', '49 เซนติเมตร', '154 เซนติเมตร'], 1, '2 × 22/7 × 7 = 44'),
                Q(2, 'ห.ร.ม. ของ 12 และ 18 คือข้อใด', ['3', '6', '9', '36'], 1),
                Q(3, 'ค่าเฉลี่ยของ 4, 8, 9 และ 11 เท่ากับเท่าใด', ['7', '8', '9', '10'], 1, '(4 + 8 + 9 + 11) ÷ 4 = 8'),
            ],
        },
        {
            id: 'set_thai', name: 'ภาษาไทยหรรษา', subject: 'ภาษาไทย', grade: 'ป.5–ป.6', color: '#db2777', icon: 'fa-book-open',
            questions: [
                Q(1, 'พยัญชนะไทยมีทั้งหมดกี่ตัว', ['42', '44', '46', '48'], 1),
                Q(1, 'คำใดสะกดถูกต้อง', ['อนุญาต', 'อนุญาติ', 'อนุญาตท์', 'อนุยาต'], 0),
                Q(1, 'คำว่า "ม้า" ใช้รูปวรรณยุกต์ใด', ['ไม้เอก', 'ไม้โท', 'ไม้ตรี', 'ไม้จัตวา'], 1),
                Q(1, 'คำใดเป็นคำนาม', ['วิ่ง', 'สวย', 'โรงเรียน', 'อย่างไร'], 2),
                Q(1, 'คำใดมีอักษรควบกล้ำ', ['ปลา', 'ปาก', 'นาที', 'มะละกอ'], 0),
                Q(2, 'สระในภาษาไทยมีกี่รูป', ['18', '21', '32', '44'], 1),
                Q(2, 'สำนวน "น้ำขึ้นให้รีบตัก" หมายถึงข้อใด', ['ควรรีบทำงานบ้าน', 'มีโอกาสควรรีบทำ', 'ต้องประหยัดน้ำ', 'อย่าใจร้อน'], 1),
                Q(2, 'คำราชาศัพท์ของคำว่า "กิน" สำหรับพระมหากษัตริย์คือข้อใด', ['รับประทาน', 'ฉัน', 'เสวย', 'ทาน'], 2),
                Q(2, 'ศิลาจารึกหลักที่ 1 กล่าวถึงพระมหากษัตริย์พระองค์ใดว่าทรงประดิษฐ์อักษรไทย', ['พ่อขุนรามคำแหงมหาราช', 'สมเด็จพระนเรศวรมหาราช', 'สมเด็จพระเจ้าตากสินมหาราช', 'พระบาทสมเด็จพระจุลจอมเกล้าเจ้าอยู่หัว'], 0),
                Q(2, 'คำใดเป็นคำซ้อน', ['ไฟฟ้า', 'เด็ก ๆ', 'บ้านเรือน', 'แม่น้ำ'], 2),
                Q(3, 'วันภาษาไทยแห่งชาติตรงกับวันที่เท่าใด', ['29 กรกฎาคม', '26 มิถุนายน', '16 มกราคม', '2 เมษายน'], 0),
                Q(3, 'กาพย์ยานี 11 หนึ่งบาทมีกี่คำ', ['7', '9', '11', '16'], 2, 'วรรคหน้า 5 คำ วรรคหลัง 6 คำ รวม 11 คำ'),
                Q(3, 'ผู้แต่งเรื่อง "พระอภัยมณี" คือใคร', ['ศรีปราชญ์', 'เจ้าพระยาพระคลัง (หน)', 'สุนทรภู่', 'พระบาทสมเด็จพระพุทธเลิศหล้านภาลัย'], 2),
                Q(3, 'ข้อใดเป็นอักษรกลางทั้งหมด', ['ข ฉ ถ ผ', 'ก จ ด ต', 'ค ง ช ซ', 'ก ข ค ง'], 1),
                Q(3, 'คำว่า "พระราชนิพนธ์" หมายถึงข้อใด', ['บทเพลงของพระมหากษัตริย์', 'คำสั่งของพระมหากษัตริย์', 'จดหมายของพระมหากษัตริย์', 'งานประพันธ์ของพระมหากษัตริย์'], 3),
                Q(2, 'คำว่า "นักเรียน" มีกี่พยางค์', ['1', '2', '3', '4'], 1),
                Q(3, 'เรื่อง "ขุนช้างขุนแผน" แต่งด้วยคำประพันธ์ประเภทใด', ['เสภา', 'ลิลิต', 'โคลง', 'ฉันท์'], 0),
            ],
        },
        {
            id: 'set_soc', name: 'รอบรู้สังคมไทยและโลก', subject: 'สังคมศึกษา', grade: 'ม.1', color: '#b45309', icon: 'fa-earth-asia',
            questions: [
                Q(1, 'เมืองหลวงของประเทศไทยคือข้อใด', ['เชียงใหม่', 'กรุงเทพมหานคร', 'ขอนแก่น', 'ภูเก็ต'], 1),
                Q(1, 'ธงชาติไทยมีกี่สี', ['2 สี', '3 สี', '4 สี', '5 สี'], 1),
                Q(1, 'สัตว์ประจำชาติไทยคือข้อใด', ['ช้าง', 'เสือ', 'ไก่', 'ม้า'], 0),
                Q(1, 'ประเทศไทยมีกี่จังหวัด (นับรวมกรุงเทพมหานคร)', ['75', '76', '77', '78'], 2),
                Q(1, 'วันแม่แห่งชาติตรงกับวันที่เท่าใด', ['5 ธันวาคม', '14 กุมภาพันธ์', '13 เมษายน', '12 สิงหาคม'], 3),
                Q(2, 'แม่น้ำสายใดไหลผ่านกรุงเทพมหานคร', ['แม่น้ำโขง', 'แม่น้ำเจ้าพระยา', 'แม่น้ำมูล', 'แม่น้ำปิง'], 1),
                Q(2, 'ยอดเขาที่สูงที่สุดในประเทศไทยคือข้อใด', ['ดอยอินทนนท์', 'ดอยสุเทพ', 'ภูกระดึง', 'เขาใหญ่'], 0),
                Q(2, 'ประเทศไทยประกาศใช้รัฐธรรมนูญฉบับแรกในปี พ.ศ. ใด', ['2482', '2500', '2475', '2540'], 2),
                Q(2, 'ประเทศใดไม่มีพรมแดนทางบกติดกับประเทศไทย', ['ลาว', 'เวียดนาม', 'กัมพูชา', 'มาเลเซีย'], 1),
                Q(2, 'สกุลเงินของประเทศญี่ปุ่นคือข้อใด', ['หยวน', 'วอน', 'ดอลลาร์', 'เยน'], 3),
                Q(3, 'กรุงศรีอยุธยาเสียกรุงครั้งที่ 2 ในปี พ.ศ. ใด', ['2112', '2310', '2325', '2411'], 1),
                Q(3, 'มหาสมุทรใดใหญ่ที่สุดในโลก', ['มหาสมุทรแอตแลนติก', 'มหาสมุทรอินเดีย', 'มหาสมุทรแปซิฟิก', 'มหาสมุทรอาร์กติก'], 2),
                Q(3, 'ทวีปใดมีพื้นที่ใหญ่ที่สุดในโลก', ['แอฟริกา', 'เอเชีย', 'ยุโรป', 'อเมริกาเหนือ'], 1),
                Q(3, 'สำนักงานใหญ่ขององค์การสหประชาชาติ (UN) ตั้งอยู่ที่เมืองใด', ['ปารีส', 'ลอนดอน', 'เจนีวา', 'นิวยอร์ก'], 3),
                Q(3, 'เส้นศูนย์สูตรแบ่งโลกออกเป็นส่วนใด', ['ซีกโลกตะวันออกและตะวันตก', 'ซีกโลกเหนือและใต้', 'เขตร้อนและเขตหนาว', 'กลางวันและกลางคืน'], 1),
                Q(2, 'จังหวัดใดอยู่เหนือสุดของประเทศไทย', ['เชียงใหม่', 'เชียงราย', 'น่าน', 'แม่ฮ่องสอน'], 1),
                Q(3, 'พระมหากษัตริย์พระองค์ใดทรงสถาปนากรุงรัตนโกสินทร์', ['สมเด็จพระเจ้าตากสินมหาราช', 'พระบาทสมเด็จพระจุลจอมเกล้าเจ้าอยู่หัว', 'พระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช', 'สมเด็จพระนเรศวรมหาราช'], 2),
            ],
        },
        {
            id: 'set_eng', name: 'English Challenge', subject: 'ภาษาอังกฤษ', grade: 'ป.6', color: '#7c3aed', icon: 'fa-language',
            questions: [
                Q(1, 'What color is the sky on a clear day?', ['Green', 'Blue', 'Red', 'Black'], 1),
                Q(1, 'คำว่า "แมว" ภาษาอังกฤษคือข้อใด', ['Dog', 'Cow', 'Cat', 'Rat'], 2),
                Q(1, 'How many days are there in a week?', ['Seven', 'Five', 'Six', 'Eight'], 0),
                Q(1, 'What is the opposite of "hot"?', ['Warm', 'Cold', 'Big', 'Fast'], 1),
                Q(2, 'She ___ to school every day.', ['go', 'goes', 'going', 'gone'], 1),
                Q(2, 'What is the past tense of "eat"?', ['eated', 'eats', 'eaten', 'ate'], 3),
                Q(2, 'What is the plural of "child"?', ['childs', 'childes', 'children', 'childrens'], 2),
                Q(2, 'I have lived here ___ 2020.', ['for', 'since', 'at', 'on'], 1),
                Q(3, 'If it rains tomorrow, we ___ at home.', ['will stay', 'stayed', 'staying', 'have stayed'], 0),
                Q(3, 'Which word is an adverb?', ['quick', 'quickly', 'quicker', 'quickness'], 1),
                Q(3, 'คำว่า "library" แปลว่าอะไร', ['ร้านหนังสือ', 'ห้องเรียน', 'ห้องสมุด', 'ห้องทดลอง'], 2),
                Q(3, 'The book ___ by many students last year.', ['read', 'reads', 'is reading', 'was read'], 3),
            ],
        },
    ];

    const SAMPLE_PLAYERS = [
        { name: 'ด.ช.ภูมิพัฒน์ ใจแก้ว', className: 'ป.6/1' }, { name: 'ด.ญ.ปุณณดา ศรีสวัสดิ์', className: 'ป.6/1' },
        { name: 'ด.ช.ธนกฤต แสงทอง', className: 'ป.6/1' }, { name: 'ด.ญ.กัญญาณัฐ มีสุข', className: 'ป.6/1' },
        { name: 'ด.ช.ปัณณวิชญ์ บุญมา', className: 'ป.6/2' }, { name: 'ด.ญ.ชนิสรา พรหมวงศ์', className: 'ป.6/2' },
        { name: 'ด.ช.กฤตภาส ทองดี', className: 'ป.6/2' }, { name: 'ด.ญ.อรปรียา คำแสน', className: 'ป.6/2' },
        { name: 'ด.ช.ณัฐวุฒิ ศรีจันทร์', className: 'ป.6/1' }, { name: 'ด.ญ.พิมพ์ชนก วงศ์ใหญ่', className: 'ป.6/2' },
    ];
    const SAMPLE_TEAMS = [
        { name: 'ทีมดาวทอง', className: 'ป.6/1', members: ['ด.ช.ภูมิพัฒน์ ใจแก้ว', 'ด.ญ.ปุณณดา ศรีสวัสดิ์', 'ด.ช.ธนกฤต แสงทอง'] },
        { name: 'ทีมพลังเพชร', className: 'ป.6/2', members: ['ด.ช.ปัณณวิชญ์ บุญมา', 'ด.ญ.ชนิสรา พรหมวงศ์', 'ด.ช.กฤตภาส ทองดี'] },
        { name: 'ทีมนักคิดน้อย', className: 'ป.6/1', members: ['ด.ญ.กัญญาณัฐ มีสุข', 'ด.ช.ณัฐวุฒิ ศรีจันทร์'] },
    ];

    let uidSeq = 0;
    const uid = (p) => `${p}_demo${(uidSeq += 1).toString(36).padStart(3, '0')}`;

    /** เล่นเกมจำลองเพื่อสร้างประวัติผลตัวอย่าง (กำหนดผลได้แน่นอน) */
    function simulateResult(set, settings, who, plan, date, seed) {
        const g = newGame(set, settings, who, { id: uid('g'), startedAt: date, seed });
        const rand = rng(seed);
        for (let guard = 0; guard < 40 && g.status === 'play'; guard += 1) {
            const q = question(g);
            if (plan.swapAt === g.idx + 1 && g.lifelines.swap) useSwap(g);
            if (plan.fiftyAt === g.idx + 1 && g.lifelines.fifty) useFifty(g);
            if (plan.askAt === g.idx + 1 && g.lifelines.ask) useAsk(g, simulateVotes(question(g), g.hidden, seed + g.idx));
            if (plan.walkAt === g.idx + 1) { walkAway(g); break; }
            const wrongPick = [0, 1, 2, 3].find((i) => i !== question(g).answer && !g.hidden.includes(i));
            const pick = plan.failAt === g.idx + 1 ? wrongPick : question(g).answer;
            void q; void rand;
            lock(g, pick);
            reveal(g);
            if (g.status === 'play') next(g);
        }
        g.endedAt = date;
        return toResult(g);
    }

    function buildDemo() {
        uidSeq = 0;
        const settings = defaultSettings();
        const sets = SAMPLE_SETS.map((s) => Object.assign({}, s, { questions: s.questions.map((q) => Object.assign({ id: uid('q') }, q)) }));
        const players = SAMPLE_PLAYERS.map((p) => Object.assign({ id: uid('p'), type: 'single', members: [] }, p));
        const teams = SAMPLE_TEAMS.map((t) => Object.assign({ id: uid('t'), type: 'team' }, t));
        const S = (id) => sets.find((s) => s.id === id);
        const P = (i) => ({ mode: 'single', name: players[i].name, className: players[i].className });
        const T = (i) => ({ mode: 'team', name: teams[i].name, className: teams[i].className, members: teams[i].members });
        const D = (y, m, d, h, mi) => new Date(Date.UTC(y, m - 1, d, h - 7, mi)).toISOString(); // เวลาไทย
        const results = [
            simulateResult(S('set_sci'), settings, P(0), { fiftyAt: 9, askAt: 12, failAt: 13 }, D(2026, 9, 14, 10, 20), 11),
            simulateResult(S('set_sci'), settings, P(1), { askAt: 7, fiftyAt: 11, swapAt: 14 }, D(2026, 9, 14, 10, 45), 12),
            simulateResult(S('set_sci'), settings, P(2), { failAt: 6 }, D(2026, 9, 14, 11, 5), 13),
            simulateResult(S('set_math'), settings, P(4), { fiftyAt: 10, walkAt: 13 }, D(2026, 9, 21, 13, 15), 14),
            simulateResult(S('set_math'), settings, P(5), { askAt: 9, fiftyAt: 12, failAt: 14 }, D(2026, 9, 21, 13, 40), 15),
            simulateResult(S('set_thai'), settings, T(0), { askAt: 8, fiftyAt: 11, swapAt: 13 }, D(2026, 10, 5, 9, 30), 16),
            simulateResult(S('set_thai'), settings, T(1), { fiftyAt: 7, askAt: 10, failAt: 12 }, D(2026, 10, 5, 10, 0), 17),
            simulateResult(S('set_thai'), settings, T(2), { failAt: 9, askAt: 8 }, D(2026, 10, 5, 10, 25), 18),
            simulateResult(S('set_soc'), settings, P(3), { swapAt: 8, fiftyAt: 11, askAt: 13, walkAt: 15 }, D(2026, 10, 19, 14, 0), 19),
            simulateResult(S('set_eng'), settings, P(8), { fiftyAt: 9, askAt: 10 }, D(2026, 10, 20, 9, 10), 20),
        ];
        const certs = [];
        let no = 0;
        results.filter((r) => r.status === 'win').forEach((r) => {
            no += 1;
            certs.push({ id: uid('c'), no, year: '2569', resultId: r.id, name: r.player, members: r.members, date: r.date, reason: '' });
        });
        return {
            app: APP_ID,
            schemaVersion: 1,
            school: {
                name: 'โรงเรียนบ้านดอนทองพิทยา', agency: 'โรงเรียนบ้านดอนทองพิทยา สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสุวรรณภูมิ เขต 2',
                director: 'นายวรวิทย์ ทองประเสริฐ', teacher: 'นางสาวศิริพร ใจงาม', teacherPosition: 'ครู วิทยฐานะครูชำนาญการ',
                className: 'ชั้นประถมศึกษาปีที่ 6', semester: '2', academicYear: '2569',
            },
            settings,
            texts: defaultTexts(),
            sets,
            players,
            teams,
            results: results.reverse(),
            certs: certs.reverse(),
            certSeq: { '2569': no },
        };
    }

    return {
        APP_ID, LETTERS, LEVELS, LIFELINES, STATUS,
        defaultSettings, defaultTexts, defaultSchool, fmt, fill, rng, shuffle,
        ladderFor, safePrize, currentPrize, splitDeck, gameSize, newGame, question,
        useFifty, useAsk, useSwap, simulateVotes, countsToPct, lock, unlock, reveal, timeout, walkAway, next, finish, toResult,
        SAMPLE_SETS, buildDemo,
    };
});
