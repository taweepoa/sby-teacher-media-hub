/* =====================================================================
   กติกาเกมบันไดงูตอบคำถาม (ไม่แตะหน้าจอ — ใช้ได้ทั้งเบราว์เซอร์และ Node เพื่อทดสอบ)
   - กระดาน 30–100 ช่อง เดินแบบงูเลื้อย (ช่อง 1 มุมล่างซ้าย)
   - ชนิดช่อง: q = คำถาม, bonus = โบนัสเดินหน้า, skip = หยุด 1 ตา, again = ทอยอีกครั้ง
   - บันได (จากล่างขึ้นบน) และงู (จากหัวลงหาง) เก็บเป็นคู่ [ต้นทาง, ปลายทาง]
   - ตกช่องคำถาม: ตอบถูก = เดินต่อ opts.rightStep ช่อง / ผิดหรือหมดเวลา = ถอย opts.wrongStep ช่อง
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /* ขนาดกระดานที่รองรับ: จำนวนช่อง → คอลัมน์ (แถวเต็มทุกแถว เดินงูเลื้อยได้สวย) */
    const SIZES = [
        { n: 30, cols: 6 }, { n: 36, cols: 6 }, { n: 40, cols: 8 }, { n: 48, cols: 8 }, { n: 50, cols: 10 },
        { n: 60, cols: 10 }, { n: 64, cols: 8 }, { n: 70, cols: 10 }, { n: 80, cols: 10 }, { n: 90, cols: 10 }, { n: 100, cols: 10 },
    ];
    const CELL_TYPES = {
        normal: { label: 'ช่องธรรมดา', short: 'ธรรมดา', icon: 'fa-circle' },
        q: { label: 'ช่องคำถาม', short: 'คำถาม', icon: 'fa-circle-question' },
        bonus: { label: 'ช่องโบนัส (เดินหน้าเพิ่ม)', short: 'โบนัส', icon: 'fa-star' },
        skip: { label: 'ช่องหยุดพัก (ข้าม 1 ตา)', short: 'ข้ามตา', icon: 'fa-hourglass-half' },
        again: { label: 'ช่องทอยอีกครั้ง', short: 'ทอยอีก', icon: 'fa-dice' },
    };
    const QTYPES = {
        mc: { label: 'ปรนัย (เลือกตอบ)', short: 'ปรนัย', icon: 'fa-list-ol' },
        tf: { label: 'ถูก / ผิด', short: 'ถูก/ผิด', icon: 'fa-circle-half-stroke' },
        fill: { label: 'เติมคำ', short: 'เติมคำ', icon: 'fa-pen' },
    };
    const CHOICE_LABELS = ['ก', 'ข', 'ค', 'ง'];
    const TEAM_COLORS = ['#ef4444', '#2563eb', '#f59e0b', '#16a34a', '#9333ea', '#0891b2'];
    const TEAM_ICONS = ['fa-dragon', 'fa-fish', 'fa-crow', 'fa-frog', 'fa-hippo', 'fa-otter'];
    const TEAM_PRESETS = {
        color: { label: 'สี', names: ['ทีมสีแดง', 'ทีมสีน้ำเงิน', 'ทีมสีเหลือง', 'ทีมสีเขียว', 'ทีมสีม่วง', 'ทีมสีฟ้า'] },
        animal: { label: 'สัตว์', names: ['ทีมมังกร', 'ทีมปลาวาฬ', 'ทีมนกอินทรี', 'ทีมกบน้อย', 'ทีมฮิปโป', 'ทีมนาก'] },
        group: { label: 'กลุ่ม', names: ['กลุ่มที่ 1', 'กลุ่มที่ 2', 'กลุ่มที่ 3', 'กลุ่มที่ 4', 'กลุ่มที่ 5', 'กลุ่มที่ 6'] },
        house: { label: 'คณะสี', names: ['คณะสีแดง', 'คณะสีน้ำเงิน', 'คณะสีเหลือง', 'คณะสีเขียว', 'คณะสีม่วง', 'คณะสีชมพู'] },
    };
    const AWARDS = ['ชนะเลิศ', 'รองชนะเลิศอันดับ 1', 'รองชนะเลิศอันดับ 2'];

    function defaultOpts() {
        return { time: 30, rightStep: 2, wrongStep: 2, bonusStep: 3, exact: false, maxTurns: 0, autoJudgeFill: true };
    }
    function normOpts(o) {
        const d = defaultOpts();
        const x = Object.assign({}, d, o || {});
        const clamp = (v, a, b, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : def; };
        return {
            time: clamp(x.time, 0, 300, d.time),
            rightStep: clamp(x.rightStep, 0, 10, d.rightStep),
            wrongStep: clamp(x.wrongStep, 0, 10, d.wrongStep),
            bonusStep: clamp(x.bonusStep, 1, 10, d.bonusStep),
            exact: !!x.exact,
            maxTurns: clamp(x.maxTurns, 0, 200, 0),
            autoJudgeFill: x.autoJudgeFill !== false,
        };
    }

    /* สุ่มแบบกำหนด seed ได้ (ทดสอบซ้ำได้ผลเดิม) */
    function rng(seed) {
        let s = (Number(seed) >>> 0) || 0x9e3779b9;
        return () => {
            s = (s + 0x6D2B79F5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function shuffle(arr, rand) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a;
    }

    const sizeOf = (n) => SIZES.find((s) => s.n === Number(n)) || SIZES[SIZES.length - 1];
    /* ตำแหน่งช่อง → แถว/คอลัมน์บนจอ (แถว 0 = บนสุด) */
    function cellPos(cell, cols, n) {
        const rows = n / cols;
        const i = cell - 1;
        const rFromBottom = Math.floor(i / cols);
        const c = rFromBottom % 2 === 0 ? i % cols : cols - 1 - (i % cols);
        return { row: rows - 1 - rFromBottom, col: c, rFromBottom };
    }

    /* สร้างกระดานอัตโนมัติ: กระจายบันได/งู/ช่องคำถาม/ช่องพิเศษไม่ให้ทับกัน */
    function autoBoard(n, o) {
        const opt = Object.assign({ ladders: null, snakes: null, qRatio: 0.3, bonus: null, skip: null, again: null, seed: Date.now() }, o || {});
        const size = sizeOf(n);
        const N = size.n;
        const cols = size.cols;
        const rand = rng(opt.seed);
        const k = N / 100;
        const nL = opt.ladders == null ? Math.max(3, Math.round(8 * k)) : opt.ladders;
        const nS = opt.snakes == null ? Math.max(3, Math.round(8 * k)) : opt.snakes;
        const used = new Set([1, N]);
        const ladders = [];
        const snakes = [];
        const free = (c) => c > 1 && c < N && !used.has(c);
        const rowsN = N / cols;
        /* แถว/คอลัมน์บนจอ ↔ เลขช่อง (แถวนับจากล่าง) */
        const at = (r, c) => r * cols + (r % 2 === 0 ? c : cols - 1 - c) + 1;
        const maxDr = Math.max(2, Math.round(rowsN * 0.45));
        const tryPair = (isLadder) => {
            for (let t = 0; t < 400; t += 1) {
                const a = 2 + Math.floor(rand() * (N - 2));
                if (!free(a)) continue;
                const p = cellPos(a, cols, N);
                const dr = 1 + Math.floor(rand() * maxDr);
                const r2 = isLadder ? p.rFromBottom + dr : p.rFromBottom - dr;
                const c2 = p.col + Math.floor(rand() * 5) - 2; // เอียงไม่เกิน 2 คอลัมน์ — สวยและไม่ทับกันมาก
                if (r2 < 0 || r2 >= rowsN || c2 < 0 || c2 >= cols) continue;
                const b = at(r2, c2);
                if (!free(b) || b <= 1 || b >= N) continue;
                used.add(a); used.add(b);
                return [a, b];
            }
            return null;
        };
        for (let i = 0; i < nL; i += 1) { const p = tryPair(true); if (p) ladders.push(p); }
        for (let i = 0; i < nS; i += 1) { const p = tryPair(false); if (p) snakes.push(p); }
        const cells = {};
        const pickFree = () => {
            const pool = [];
            for (let c = 2; c < N; c += 1) if (!used.has(c)) pool.push(c);
            if (!pool.length) return 0;
            const c = pool[Math.floor(rand() * pool.length)];
            used.add(c);
            return c;
        };
        const nB = opt.bonus == null ? Math.max(1, Math.round(3 * k)) : opt.bonus;
        const nK = opt.skip == null ? Math.max(1, Math.round(3 * k)) : opt.skip;
        const nA = opt.again == null ? Math.max(1, Math.round(2 * k)) : opt.again;
        for (let i = 0; i < nB; i += 1) { const c = pickFree(); if (c) cells[c] = 'bonus'; }
        for (let i = 0; i < nK; i += 1) { const c = pickFree(); if (c) cells[c] = 'skip'; }
        for (let i = 0; i < nA; i += 1) { const c = pickFree(); if (c) cells[c] = 'again'; }
        const nQ = Math.round((N - 2) * opt.qRatio);
        for (let i = 0; i < nQ; i += 1) { const c = pickFree(); if (c) cells[c] = 'q'; }
        return { n: N, cols, ladders: ladders.sort((a, b) => a[0] - b[0]), snakes: snakes.sort((a, b) => b[0] - a[0]), cells };
    }

    /* ตรวจ/ซ่อมกระดาน (มาจากไฟล์หรือแก้มือ) — ตัดคู่ที่ผิดกติกาหรือทับกันออก */
    function normBoard(b) {
        const size = sizeOf(b && b.n);
        const N = size.n;
        const used = new Set([1, N]);
        const okPair = (p, up) => {
            if (!Array.isArray(p)) return null;
            const a = Math.round(Number(p[0]));
            const z = Math.round(Number(p[1]));
            if (!(a > 1 && a < N && z > 1 && z <= N) || used.has(a) || used.has(z) || (up ? z <= a : z >= a) || (!up && z >= N)) return null;
            used.add(a); used.add(z);
            return [a, z];
        };
        const ladders = ((b && b.ladders) || []).map((p) => okPair(p, true)).filter(Boolean);
        const snakes = ((b && b.snakes) || []).map((p) => okPair(p, false)).filter(Boolean);
        const cells = {};
        Object.entries((b && b.cells) || {}).forEach(([c, t]) => {
            const n = Number(c);
            if (CELL_TYPES[t] && t !== 'normal' && n > 1 && n < N && !used.has(n)) cells[n] = t;
        });
        return { n: N, cols: size.cols, ladders, snakes, cells };
    }
    function boardStats(b) {
        const v = Object.values(b.cells);
        return { ladders: b.ladders.length, snakes: b.snakes.length, q: v.filter((t) => t === 'q').length, bonus: v.filter((t) => t === 'bonus').length, skip: v.filter((t) => t === 'skip').length, again: v.filter((t) => t === 'again').length };
    }
    /* ช่องนี้มีอะไร: บันได/งู/ชนิดช่อง */
    function cellInfo(b, c) {
        const L = b.ladders.find((p) => p[0] === c);
        if (L) return { kind: 'ladder', to: L[1] };
        const S = b.snakes.find((p) => p[0] === c);
        if (S) return { kind: 'snake', to: S[1] };
        return { kind: b.cells[c] || 'normal' };
    }

    /* ---------- ตรวจคำตอบ ---------- */
    const normAns = (s) => String(s == null ? '' : s).toLowerCase().replace(/[\s.,!?'"“”‘’()]/g, '').replace(/๐/g, '0').replace(/๑/g, '1').replace(/๒/g, '2').replace(/๓/g, '3').replace(/๔/g, '4').replace(/๕/g, '5').replace(/๖/g, '6').replace(/๗/g, '7').replace(/๘/g, '8').replace(/๙/g, '9');
    /* เฉลยเติมคำหลายแบบคั่นด้วย / เช่น "กรุงเทพมหานคร/กรุงเทพฯ" */
    const answersOf = (q) => String(q.answer == null ? '' : q.answer).split('/').map((s) => s.trim()).filter(Boolean);
    function answerText(q) {
        if (q.type === 'mc') { const i = Number(q.answer); return `${CHOICE_LABELS[i] || '?'}. ${(q.choices || [])[i] || ''}`; }
        if (q.type === 'tf') return q.answer === true || q.answer === 'true' ? 'ถูก' : 'ผิด';
        return answersOf(q).join(' หรือ ');
    }
    function check(q, given) {
        if (given == null || given === '') return false;
        if (q.type === 'mc') return Number(given) === Number(q.answer);
        if (q.type === 'tf') return String(given) === String(q.answer === true || q.answer === 'true');
        const g = normAns(given);
        return answersOf(q).some((a) => normAns(a) === g);
    }

    /* ---------- เกม ---------- */
    function newGame(board, set, teams, opts, meta) {
        const m = meta || {};
        const b = normBoard(board);
        const rand = rng(m.seed == null ? Date.now() : m.seed);
        const qs = (set && set.questions ? set.questions : []).filter((q) => q && q.q);
        return {
            id: m.id || `g_${Date.now().toString(36)}${Math.floor(rand() * 1e6).toString(36)}`,
            title: m.title || '', dateText: m.dateText || '', place: m.place || '', judges: m.judges || [],
            setId: set ? set.id : '', setName: set ? set.name : '', subject: set ? set.subject : '',
            boardName: m.boardName || '',
            board: b,
            questions: shuffle(qs, rand).map((q) => JSON.parse(JSON.stringify(q))),
            qNext: 0,
            opts: normOpts(opts),
            teams: teams.slice(0, 6).map((t, i) => ({ id: `t${i + 1}`, name: t.name || TEAM_PRESETS.color.names[i], color: t.color || TEAM_COLORS[i], icon: t.icon || TEAM_ICONS[i], pos: 0, skip: 0, finishAt: 0, right: 0, wrong: 0 })),
            turn: 0, round: 1, moves: 0,
            phase: 'roll', pending: null, lastDice: 0,
            log: [], status: 'playing', seed: Math.floor(rand() * 1e9),
            startedAt: m.startedAt || new Date().toISOString(), finishedAt: null,
        };
    }

    const cur = (g) => g.teams[g.turn];
    /* ทีมที่ยังไม่เข้าเส้นชัย */
    const activeTeams = (g) => g.teams.filter((t) => !t.finishAt);

    function nextTurn(g) {
        if (isOver(g)) return;
        for (let k = 0; k < g.teams.length; k += 1) {
            const prev = g.turn;
            g.turn = (g.turn + 1) % g.teams.length;
            if (g.turn <= prev) g.round += 1;
            const t = g.teams[g.turn];
            if (t.finishAt) continue;
            if (t.skip > 0) {
                t.skip -= 1;
                g.log.push({ team: t.id, kind: 'skipped', round: g.round, from: t.pos, to: t.pos });
                continue;
            }
            break;
        }
        g.phase = 'roll';
        if (g.opts.maxTurns && g.round > g.opts.maxTurns) finish(g);
    }

    function finish(g) {
        g.status = 'done';
        g.phase = 'done';
        g.finishedAt = g.finishedAt || new Date().toISOString();
    }
    /* จบเกมเมื่อมีทีมแรกเข้าเส้นชัย (ผู้ชนะ) — อันดับที่เหลือตามตำแหน่ง */
    function isOver(g) { return g.status === 'done'; }

    /* เดินทีละช่อง: คืนเส้นทาง (ใช้ทำแอนิเมชัน) — exact: เกินช่องสุดท้ายเด้งกลับ */
    function walk(g, from, steps) {
        const N = g.board.n;
        const path = [];
        let p = from;
        let dir = steps >= 0 ? 1 : -1;
        for (let i = 0; i < Math.abs(steps); i += 1) {
            if (dir > 0 && p >= N) { if (g.opts.exact) dir = -1; else break; }
            p += dir;
            if (p < 1) { p = 1; break; }
            path.push(p);
        }
        return { to: p, path };
    }

    /* หลังหยุดที่ช่องใดช่องหนึ่ง: บันได/งู/ช่องพิเศษ → คืนเหตุการณ์ */
    function land(g, t, ev) {
        const N = g.board.n;
        if (t.pos >= N) {
            t.pos = N;
            ev.push({ kind: 'win', at: N });
            t.finishAt = ++g.moves;
            finish(g);
            return 'win';
        }
        const info = cellInfo(g.board, t.pos);
        if (info.kind === 'ladder' || info.kind === 'snake') {
            ev.push({ kind: info.kind, from: t.pos, to: info.to });
            t.pos = info.to;
            if (t.pos >= N) return land(g, t, ev);
            return info.kind;
        }
        if (info.kind === 'q') {
            if (!g.questions.length) { ev.push({ kind: 'q-none', at: t.pos }); return 'none'; }
            const q = g.questions[g.qNext % g.questions.length];
            g.qNext += 1;
            g.pending = { qid: q.id, cell: t.pos, team: t.id, askedAt: Date.now() };
            g.phase = 'question';
            ev.push({ kind: 'question', at: t.pos, qid: q.id });
            return 'question';
        }
        if (info.kind === 'bonus') {
            const w = walk(g, t.pos, g.opts.bonusStep);
            ev.push({ kind: 'bonus', from: t.pos, to: w.to, path: w.path });
            t.pos = w.to;
            const r = land(g, t, ev);
            return r === 'none' ? 'bonus' : r;
        }
        if (info.kind === 'skip') { t.skip += 1; ev.push({ kind: 'skip', at: t.pos }); return 'skip'; }
        if (info.kind === 'again') { ev.push({ kind: 'again', at: t.pos }); return 'again'; }
        return 'none';
    }

    /* ทอยลูกเต๋า (dice = ค่าที่สุ่มได้จากหน้าจอ หรือส่งมาเพื่อทดสอบ) */
    function roll(g, dice) {
        if (g.phase !== 'roll' || isOver(g)) return null;
        const t = cur(g);
        const d = Math.max(1, Math.min(6, Math.round(Number(dice)) || 1));
        g.lastDice = d;
        const from = t.pos;
        const w = walk(g, from, d);
        t.pos = w.to;
        const ev = [{ kind: 'move', from, to: w.to, path: w.path }];
        const res = land(g, t, ev);
        const entry = { team: t.id, kind: 'roll', round: g.round, dice: d, from, to: t.pos, events: ev.map((e) => e.kind).filter((k) => k !== 'move') };
        g.log.push(entry);
        if (res !== 'question' && res !== 'again' && res !== 'win') nextTurn(g);
        if (res === 'again') g.phase = 'roll';
        return { team: t, dice: d, from, to: t.pos, events: ev, result: res };
    }

    const pendingQuestion = (g) => (g.pending ? g.questions.find((q) => q.id === g.pending.qid) || null : null);

    /* ตอบคำถาม: ok = ถูก/ผิด (ผู้ใช้หรือระบบตัดสิน), given = คำตอบที่เลือก, secs = เวลาที่ใช้ */
    function answer(g, ok, given, secs) {
        if (g.phase !== 'question' || !g.pending) return null;
        const t = cur(g);
        const q = pendingQuestion(g);
        const from = t.pos;
        const steps = ok ? g.opts.rightStep : -g.opts.wrongStep;
        const w = walk(g, from, steps);
        t.pos = w.to;
        if (ok) t.right += 1; else t.wrong += 1;
        const ev = [{ kind: ok ? 'right' : 'wrong', from, to: w.to, path: w.path }];
        g.pending = null;
        g.phase = 'roll';
        let res = 'none';
        // ตอบถูก/ผิดแล้วไปตกบันได/งู/เส้นชัยได้ (ไม่ถามคำถามซ้อนเพื่อไม่ให้ยืดเยื้อ)
        if (steps !== 0) {
            const info = cellInfo(g.board, t.pos);
            if (t.pos >= g.board.n) res = land(g, t, ev);
            else if (info.kind === 'ladder' || info.kind === 'snake') res = land(g, t, ev);
        }
        const last = g.log[g.log.length - 1];
        const qlog = { team: t.id, kind: 'answer', round: g.round, qid: q ? q.id : '', q: q ? q.q : '', type: q ? q.type : '', given: given == null ? null : given, ok: !!ok, secs: secs == null ? null : Math.round(secs), from, to: t.pos, cell: last ? last.to : from, events: ev.map((e) => e.kind) };
        g.log.push(qlog);
        if (res !== 'win') nextTurn(g);
        return { team: t, ok: !!ok, from, to: t.pos, events: ev, result: res };
    }

    /* ข้ามคำถาม (ครูกดข้าม) = ไม่เดินไม่ถอย */
    function skipQuestion(g) {
        if (g.phase !== 'question') return null;
        const t = cur(g);
        const q = pendingQuestion(g);
        g.log.push({ team: t.id, kind: 'answer', round: g.round, qid: q ? q.id : '', q: q ? q.q : '', type: q ? q.type : '', given: null, ok: null, skipped: true, secs: null, from: t.pos, to: t.pos, cell: t.pos, events: [] });
        g.pending = null;
        g.phase = 'roll';
        nextTurn(g);
        return true;
    }

    /* อันดับ: เข้าเส้นชัยก่อน → ตำแหน่งไกลกว่า → ตอบถูกมากกว่า */
    function ranking(g) {
        const list = g.teams.map((t) => Object.assign({}, t));
        list.sort((a, b) => {
            if (a.finishAt && b.finishAt) return a.finishAt - b.finishAt;
            if (a.finishAt) return -1;
            if (b.finishAt) return 1;
            return b.pos - a.pos || b.right - a.right || a.wrong - b.wrong;
        });
        let rank = 0;
        list.forEach((t, i) => {
            const prev = list[i - 1];
            const tie = prev && !t.finishAt && !prev.finishAt && prev.pos === t.pos && prev.right === t.right && prev.wrong === t.wrong;
            rank = tie ? rank : i + 1;
            t.rank = rank;
            t.award = g.status === 'done' && rank <= 3 ? AWARDS[rank - 1] : '';
        });
        return list;
    }
    function questionLog(g) { return g.log.filter((l) => l.kind === 'answer'); }
    function progress(g) {
        const lead = Math.max(...g.teams.map((t) => t.pos));
        return { lead, label: `รอบที่ ${g.round} • ทีมนำอยู่ช่อง ${lead}/${g.board.n}` };
    }

    return {
        SIZES, CELL_TYPES, QTYPES, CHOICE_LABELS, TEAM_COLORS, TEAM_ICONS, TEAM_PRESETS, AWARDS,
        defaultOpts, normOpts, rng, shuffle, sizeOf, cellPos, autoBoard, normBoard, boardStats, cellInfo,
        answersOf, answerText, check, normAns,
        newGame, roll, answer, skipQuestion, pendingQuestion, nextTurn, finish, isOver, cur, activeTeams, walk,
        ranking, questionLog, progress,
    };
});
