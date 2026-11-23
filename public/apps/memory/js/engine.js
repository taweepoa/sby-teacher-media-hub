/* =====================================================================
   กติกาเกมจับคู่ความจำ (ไม่แตะหน้าจอ — ใช้ร่วมกันทั้งเบราว์เซอร์และ Node ใน dev/test-engine.js)
   4 โหมด:
   - memory : เปิดไพ่จับคู่ ทีมผลัดกันเปิด 2 ใบ ถ้าเป็นคู่กันได้คะแนนและเล่นต่อ ไม่ใช่คู่ → ทีมถัดไป
   - match  : ลากเส้นจับคู่ ทีมละรอบ ภายในเวลาที่กำหนด ถูกคู่ละ X คะแนน
   - quiz   : ทายใจ/เลือกคำตอบจับเวลา ทีมผลัดกันตอบ ตอบไวได้โบนัส
   - box    : กล่องสุ่มรางวัล ตอบถูกแล้วเลือกเปิดกล่อง (คะแนน/คูณ 2/กล่องว่าง/หักคะแนน)
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const MODES = {
        memory: { label: 'จับคู่ความจำ (เปิดไพ่)', short: 'เปิดไพ่', icon: 'fa-clone', color: '#7216a0' },
        match: { label: 'จับคู่เร็ว (ลากเส้น)', short: 'ลากเส้น', icon: 'fa-wave-square', color: '#0A84FF' },
        quiz: { label: 'ทายใจ เลือกคำตอบจับเวลา', short: 'ทายใจ', icon: 'fa-stopwatch', color: '#FF375F' },
        box: { label: 'กล่องสุ่มรางวัล', short: 'กล่องรางวัล', icon: 'fa-gift', color: '#FF9F0A' },
    };
    const LEVELS = {
        easy: { label: 'ง่าย', memoryPairs: 6, matchPairs: 4, matchTime: 90, quizTime: 30, choices: 3, boxes: 9 },
        normal: { label: 'ปานกลาง', memoryPairs: 8, matchPairs: 5, matchTime: 60, quizTime: 20, choices: 4, boxes: 12 },
        hard: { label: 'ยาก', memoryPairs: 12, matchPairs: 6, matchTime: 45, quizTime: 10, choices: 4, boxes: 16 },
    };
    const TEAM_PRESETS = {
        color: { label: 'ทีมสี', names: ['ทีมสีแดง', 'ทีมสีน้ำเงิน', 'ทีมสีเขียว', 'ทีมสีเหลือง', 'ทีมสีม่วง', 'ทีมสีส้ม'] },
        animal: { label: 'ทีมสัตว์', names: ['ทีมเสือ', 'ทีมช้าง', 'ทีมนกฮูก', 'ทีมโลมา', 'ทีมกระต่าย', 'ทีมม้าลาย'] },
        number: { label: 'กลุ่มที่ 1–6', names: ['กลุ่มที่ 1', 'กลุ่มที่ 2', 'กลุ่มที่ 3', 'กลุ่มที่ 4', 'กลุ่มที่ 5', 'กลุ่มที่ 6'] },
        fruit: { label: 'ทีมผลไม้', names: ['ทีมมะม่วง', 'ทีมองุ่น', 'ทีมแตงโม', 'ทีมสับปะรด', 'ทีมมังคุด', 'ทีมส้มโอ'] },
    };
    const TEAM_COLORS = ['#ef4444', '#2563eb', '#16a34a', '#eab308', '#9333ea', '#f97316'];
    const TEAM_ICONS = ['fa-fire', 'fa-water', 'fa-leaf', 'fa-sun', 'fa-gem', 'fa-bolt'];
    const AWARDS = ['ชนะเลิศ', 'รองชนะเลิศอันดับ 1', 'รองชนะเลิศอันดับ 2'];
    /* กล่องรางวัล: t = ชนิด, v = ค่า */
    const BOX_BAG = [
        { t: 'add', v: 10 }, { t: 'add', v: 20 }, { t: 'add', v: 30 }, { t: 'add', v: 50 },
        { t: 'add', v: 10 }, { t: 'add', v: 20 }, { t: 'x2', v: 2 }, { t: 'zero', v: 0 },
        { t: 'minus', v: 10 }, { t: 'add', v: 40 }, { t: 'add', v: 15 }, { t: 'add', v: 25 },
        { t: 'x2', v: 2 }, { t: 'zero', v: 0 }, { t: 'add', v: 100 }, { t: 'minus', v: 20 },
    ];

    function defaultOpts() {
        return { level: 'normal', rounds: 10, points: 10, speedBonus: 5, time: 0, sound: true };
    }
    function normOpts(o) {
        const d = Object.assign(defaultOpts(), o || {});
        const n = (v, lo, hi, def) => { const x = Number(v); return Number.isFinite(x) ? Math.max(lo, Math.min(hi, Math.round(x))) : def; };
        if (!LEVELS[d.level]) d.level = 'normal';
        d.rounds = n(d.rounds, 1, 100, 10);
        d.points = n(d.points, 1, 1000, 10);
        d.speedBonus = n(d.speedBonus, 0, 1000, 5);
        d.time = n(d.time, 0, 600, 0); // 0 = ใช้ค่าตามระดับความยาก
        d.sound = d.sound !== false;
        return d;
    }
    const timeOf = (g) => g.opts.time || (g.mode === 'match' ? LEVELS[g.opts.level].matchTime : LEVELS[g.opts.level].quizTime);

    /* สุ่มแบบกำหนดเมล็ดได้ (ผลเท่ากันทั้ง Node และ Chrome) */
    function rng(seed) {
        let s = (seed >>> 0) || 1;
        return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    }
    function shuffle(arr, rand) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a;
    }
    const validPairs = (set) => (set.pairs || []).filter((p) => p && (p.a || p.img) && p.b);

    function makeTeams(teams) {
        return teams.slice(0, 6).map((t, i) => ({ id: `t${i + 1}`, name: t.name || `ทีม ${i + 1}`, color: t.color || TEAM_COLORS[i], icon: t.icon || TEAM_ICONS[i], score: 0 }));
    }

    /**
     * เกมใหม่ — set: {name, kind, pairs:[{id,a,b,img}]}, mode, teams: [{name}], opts
     * สุ่มลำดับทุกครั้ง (seed เปลี่ยนตามเวลา เว้นแต่ส่ง seed มาเพื่อทดสอบ)
     */
    function newGame(set, mode, teams, opts, extra) {
        const o = normOpts(opts);
        const e = extra || {};
        const seed = e.seed || (Date.now() % 2147483647);
        const rand = rng(seed);
        const L = LEVELS[o.level];
        const pairs = shuffle(validPairs(set), rand).map((p) => ({ id: p.id, a: p.a || '', b: p.b, img: p.img || '' }));
        const g = {
            id: e.id || `g_${Date.now().toString(36)}${Math.floor(rand() * 1e6).toString(36)}`,
            mode: MODES[mode] ? mode : 'memory',
            setId: set.id || '', setName: set.name || '', subject: set.subject || '', kind: set.kind || 'word',
            title: e.title || '', dateText: e.dateText || '', place: e.place || '', judges: [],
            opts: o, seed, teams: makeTeams(teams), turn: 0, status: 'playing',
            startedAt: e.now || new Date().toISOString(), finishedAt: null,
            pairs: [], log: [], adjusts: [], step: 0,
        };
        if (g.mode === 'memory') {
            g.pairs = pairs.slice(0, Math.min(L.memoryPairs, pairs.length));
            const cards = [];
            g.pairs.forEach((p) => { cards.push({ k: p.id, side: 'a' }); cards.push({ k: p.id, side: 'b' }); });
            g.cards = shuffle(cards, rand).map((c) => Object.assign(c, { by: null }));
            g.open = [];
            g.flips = 0;
        } else if (g.mode === 'match') {
            const per = Math.min(L.matchPairs, pairs.length);
            const total = Math.max(1, Math.min(o.rounds, Math.floor(pairs.length / Math.max(1, per)) || 1));
            g.pairs = pairs.slice(0, per * total);
            g.rounds = [];
            for (let r = 0; r < total; r += 1) {
                const grp = g.pairs.slice(r * per, r * per + per);
                if (grp.length < 2) break;
                g.rounds.push({ left: shuffle(grp.map((p) => p.id), rand), right: shuffle(grp.map((p) => p.id), rand) });
            }
        } else {
            g.pairs = pairs.slice(0, Math.min(o.rounds, pairs.length));
            const nChoices = Math.min(L.choices, pairs.length);
            g.questions = g.pairs.map((p) => {
                const others = shuffle(pairs.filter((x) => x.id !== p.id && x.b !== p.b), rand).slice(0, nChoices - 1).map((x) => x.b);
                return { k: p.id, choices: shuffle([p.b].concat(others), rand) };
            });
            if (g.mode === 'box') {
                g.boxes = shuffle(BOX_BAG.slice(0, L.boxes), rand).map((b) => Object.assign({}, b, { by: null }));
                g.awaitBox = false;
            }
        }
        return g;
    }

    const pairOf = (g, id) => g.pairs.find((p) => p.id === id) || null;
    const team = (g) => g.teams[g.turn % g.teams.length];
    const nextTurn = (g) => { g.turn = (g.turn + 1) % g.teams.length; };
    function addScore(g, teamId, pts) { const t = g.teams.find((x) => x.id === teamId); if (t) t.score += pts; }

    function progress(g) {
        if (g.mode === 'memory') { const done = g.cards.filter((c) => c.by).length / 2; return { current: done, total: g.pairs.length, label: `จับคู่แล้ว ${done}/${g.pairs.length} คู่` }; }
        if (g.mode === 'match') return { current: Math.min(g.step + 1, g.rounds.length), total: g.rounds.length, label: `รอบที่ ${Math.min(g.step + 1, g.rounds.length)}/${g.rounds.length}` };
        return { current: Math.min(g.step + 1, g.questions.length), total: g.questions.length, label: `ข้อที่ ${Math.min(g.step + 1, g.questions.length)}/${g.questions.length}` };
    }
    function isOver(g) {
        if (g.mode === 'memory') return g.cards.every((c) => c.by);
        if (g.mode === 'match') return g.step >= g.rounds.length;
        return g.step >= g.questions.length && !g.awaitBox;
    }

    /* ---------- memory ---------- */
    /** เปิดไพ่ใบที่ idx → {type:'open'|'match'|'miss'|'ignore'} (miss: UI แสดงค้างไว้ครู่หนึ่งแล้วเรียก closeMiss) */
    function flip(g, idx) {
        const c = g.cards[idx];
        if (!c || c.by || g.open.includes(idx) || g.open.length >= 2 || g.status !== 'playing') return { type: 'ignore' };
        g.open.push(idx);
        g.flips += 1;
        if (g.open.length < 2) return { type: 'open' };
        const [i, j] = g.open;
        const t = team(g);
        if (g.cards[i].k === g.cards[j].k) {
            g.cards[i].by = t.id; g.cards[j].by = t.id;
            g.open = [];
            addScore(g, t.id, g.opts.points);
            const p = pairOf(g, g.cards[i].k);
            g.log.push({ team: t.id, a: p.a, b: p.b, ok: true, points: g.opts.points });
            return { type: 'match', team: t.id, over: isOver(g) };
        }
        return { type: 'miss', team: t.id };
    }
    function closeMiss(g) { if (g.open.length === 2) { g.open = []; nextTurn(g); } }

    /* ---------- match ---------- */
    /** links: {leftId: rightId} → ตรวจคำตอบรอบนี้ ให้คะแนนทีมที่ถึงตา แล้วไปรอบถัดไป */
    function submitMatch(g, links, timeLeft) {
        const r = g.rounds[g.step];
        if (!r) return null;
        const t = team(g);
        const correct = r.left.filter((id) => links && links[id] === id).length;
        const allOk = correct === r.left.length;
        const bonus = allOk && timeLeft > 0 ? g.opts.speedBonus : 0;
        const pts = correct * g.opts.points + bonus;
        addScore(g, t.id, pts);
        g.log.push({ team: t.id, round: g.step + 1, correct, total: r.left.length, bonus, points: pts, timeLeft: Math.max(0, Math.round(timeLeft || 0)) });
        r.result = { team: t.id, links: Object.assign({}, links), correct };
        g.step += 1;
        nextTurn(g);
        return { team: t.id, correct, total: r.left.length, bonus, points: pts, over: isOver(g) };
    }

    /* ---------- quiz / box ---------- */
    const question = (g) => { const q = g.questions && g.questions[g.step]; return q ? Object.assign({ pair: pairOf(g, q.k) }, q) : null; };
    /** choice = ข้อความที่ทีมเลือก (null = หมดเวลา) */
    function answer(g, choice, timeLeft) {
        const q = question(g);
        if (!q || g.awaitBox) return null;
        const t = team(g);
        const ok = choice != null && choice === q.pair.b;
        let pts = 0;
        if (g.mode === 'quiz' && ok) pts = g.opts.points + (timeLeft >= timeOf(g) / 2 ? g.opts.speedBonus : 0);
        if (g.mode === 'box' && ok && !g.boxes.some((b) => !b.by)) pts = g.opts.points; // กล่องหมดแล้ว ได้คะแนนปกติ
        if (pts) addScore(g, t.id, pts);
        g.log.push({ team: t.id, a: q.pair.a, b: q.pair.b, chose: choice, ok, points: pts, timeLeft: Math.max(0, Math.round(timeLeft || 0)) });
        if (g.mode === 'box' && ok && g.boxes.some((b) => !b.by)) { g.awaitBox = true; return { ok, team: t.id, points: pts, box: true }; }
        g.step += 1;
        nextTurn(g);
        return { ok, team: t.id, points: pts, over: isOver(g) };
    }
    /** เปิดกล่องรางวัล (หลังตอบถูก) */
    function openBox(g, idx) {
        const b = g.boxes[idx];
        if (!g.awaitBox || !b || b.by) return null;
        const t = team(g);
        b.by = t.id;
        let pts = 0;
        if (b.t === 'add') pts = b.v;
        else if (b.t === 'minus') pts = -Math.min(b.v, Math.max(0, t.score));
        else if (b.t === 'x2') pts = Math.max(0, t.score) || g.opts.points;
        addScore(g, t.id, pts);
        const last = g.log[g.log.length - 1];
        if (last) { last.box = boxLabel(b); last.points += pts; }
        g.awaitBox = false;
        g.step += 1;
        nextTurn(g);
        return { box: b, points: pts, team: t.id, over: isOver(g) };
    }
    function boxLabel(b) {
        if (b.t === 'add') return `+${b.v}`;
        if (b.t === 'minus') return `−${b.v}`;
        if (b.t === 'x2') return 'คูณ 2';
        return 'กล่องว่าง';
    }
    /** ข้ามข้อ/รอบ (ครูกดข้าม) */
    function skip(g) {
        if (g.mode === 'memory') return;
        if (g.mode === 'match') { const r = g.rounds[g.step]; if (r) { g.log.push({ team: team(g).id, round: g.step + 1, correct: 0, total: r.left.length, bonus: 0, points: 0, skipped: true }); g.step += 1; nextTurn(g); } return; }
        if (g.awaitBox) { g.awaitBox = false; g.step += 1; nextTurn(g); return; }
        const q = question(g);
        if (q) { g.log.push({ team: team(g).id, a: q.pair.a, b: q.pair.b, chose: null, ok: false, points: 0, skipped: true }); g.step += 1; nextTurn(g); }
    }
    function adjust(g, teamId, delta, reason) {
        addScore(g, teamId, delta);
        g.adjusts.push({ team: teamId, delta, reason: reason || '' });
    }

    /** อันดับ: คะแนนเท่ากัน = อันดับร่วม · ได้รางวัลเฉพาะทีมที่มีคะแนน > 0 */
    function ranking(g) {
        const stat = (t) => {
            const mine = g.log.filter((l) => l.team === t.id);
            const ok = g.mode === 'match' ? mine.reduce((a, l) => a + (l.correct || 0), 0) : mine.filter((l) => l.ok).length;
            return { ok, tries: g.mode === 'match' ? mine.reduce((a, l) => a + (l.total || 0), 0) : mine.length };
        };
        const list = g.teams.map((t) => Object.assign({}, t, stat(t))).sort((a, b) => b.score - a.score || b.ok - a.ok);
        let rank = 0; let prev = null;
        list.forEach((t, i) => {
            if (prev === null || t.score !== prev) rank = i + 1;
            prev = t.score;
            t.rank = rank;
            t.award = rank <= 3 && t.score > 0 ? AWARDS[rank - 1] : '';
        });
        return list;
    }

    return {
        MODES, LEVELS, TEAM_PRESETS, TEAM_COLORS, TEAM_ICONS, AWARDS, BOX_BAG,
        defaultOpts, normOpts, timeOf, rng, shuffle, validPairs, makeTeams, newGame, pairOf, team, nextTurn,
        progress, isOver, flip, closeMiss, submitMatch, question, answer, openBox, boxLabel, skip, adjust, ranking,
    };
});
