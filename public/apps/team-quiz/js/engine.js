/* =====================================================================
   เครื่องยนต์เกม (ไม่ขึ้นกับหน้าจอ) — ใช้ร่วมกันทั้งหน้าจอครู จอแสดงผล และ Node (dev/test-engine.js)
   สถานะเกม (live) เปลี่ยนได้ทางเดียวคือ reduce(state, action) → { state, fx }
   - คะแนนทีมคำนวณใหม่จากผลรายข้อ + การปรับคะแนนด้วยมือทุกครั้ง (ไม่มีคะแนนเพี้ยนสะสม)
   - action มีเวลา at (ms) มาด้วยเสมอ ทำให้ผลลัพธ์เหมือนกันทุกหน้าต่าง
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const MODES = {
        mc: { label: 'เลือกตอบ', icon: 'fa-list-ol', desc: 'ทุกทีมเลือกคำตอบพร้อมกัน ครูบันทึกตัวเลือกของแต่ละทีม ระบบตรวจและให้คะแนนเองเมื่อเฉลย' },
        write: { label: 'เขียนตอบ', icon: 'fa-pen-to-square', desc: 'ทุกทีมเขียนคำตอบบนกระดาษ/ไวท์บอร์ดแล้วชูพร้อมกัน ครูกดถูก/ผิดให้แต่ละทีม' },
        buzz: { label: 'กดออด', icon: 'fa-bell', desc: 'ทีมที่กดปุ่มของทีมก่อนได้สิทธิ์ตอบ ตอบผิดเปิดให้ทีมอื่นกดต่อ' },
        jeopardy: { label: 'Jeopardy', icon: 'fa-table-cells', desc: 'กระดานหมวด × คะแนน ทีมเลือกช่อง แล้วแข่งกันกดออดตอบ' },
    };
    const LETTERS = { th: ['ก', 'ข', 'ค', 'ง'], en: ['A', 'B', 'C', 'D'] };
    /* สีทีม (สด แยกกันชัดบนโปรเจกเตอร์) และไอคอน Font Awesome */
    const TEAM_COLORS = ['#e11d48', '#2563eb', '#16a34a', '#f59e0b', '#9333ea', '#0891b2', '#ea580c', '#db2777', '#4f46e5', '#65a30d'];
    const TEAM_ICONS = ['fa-dragon', 'fa-rocket', 'fa-bolt', 'fa-crown', 'fa-star', 'fa-fire', 'fa-feather', 'fa-dove', 'fa-leaf', 'fa-gem', 'fa-shield-halved', 'fa-paw', 'fa-anchor', 'fa-sun', 'fa-moon', 'fa-tree'];
    const DEFAULT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8'];
    const AWARDS = ['ชนะเลิศ', 'รองชนะเลิศอันดับ 1', 'รองชนะเลิศอันดับ 2'];
    const MAX_TEAMS = 8;
    const MIN_TEAMS = 2;

    /* action ที่ "ย้อนกลับ" ได้ (การจับเวลา/สลับหน้าจอไม่นับ) */
    const NO_UNDO = new Set(['timerStart', 'timerPause', 'timerAdd', 'timerReset', 'timeUp', 'screen', 'ping']);

    const clone = (o) => JSON.parse(JSON.stringify(o));

    /* ---------- คำถาม ---------- */
    function isChoice(q) { return !!q && q.type === 'mc' && Array.isArray(q.choices) && q.choices.length >= 2; }
    function answerText(q, letters) {
        if (!q) return '';
        if (isChoice(q)) {
            const i = q.answer;
            const L = letters || LETTERS.th;
            return Number.isInteger(i) && q.choices[i] != null ? `${L[i]}. ${q.choices[i]}` : '';
        }
        return String(q.answer || '');
    }
    function qPoints(state, q) {
        const p = Number(q && q.points);
        return Number.isFinite(p) && p > 0 ? p : (state.opts.points || 10);
    }
    /* เวลาต่อข้อ (ms) — ข้อที่กำหนดเวลาเองใช้ค่านั้น, 0 = ไม่จับเวลา */
    function qTime(state, q) {
        const t = Number(q && q.time);
        const sec = Number.isFinite(t) && t > 0 ? t : (state.opts.time || 0);
        return Math.max(0, sec) * 1000;
    }

    /* ---------- กระดาน Jeopardy: หมวด (ตามลำดับที่พบ) × ข้อในหมวด เรียงคะแนนน้อยไปมาก ---------- */
    function jeopardyGrid(deck) {
        const cats = [];
        const byName = new Map();
        deck.forEach((q) => {
            const name = String(q.category || '').trim() || 'ทั่วไป';
            if (!byName.has(name)) { const c = { name, cells: [] }; byName.set(name, c); cats.push(c); }
            byName.get(name).cells.push(q);
        });
        cats.forEach((c) => { c.cells.sort((a, b) => (Number(a.points) || 0) - (Number(b.points) || 0)); c.cells = c.cells.map((q) => q.id); });
        return { cats, rows: cats.reduce((m, c) => Math.max(m, c.cells.length), 0) };
    }

    /* ---------- สร้างสถานะเริ่มต้นของการแข่งขัน ----------
       match = { id, title, dateText, place, mode, opts:{time,points,penalty,letters}, teams:[...], deck:[...], judges:[] } */
    function newLive(match, at) {
        const t = at || Date.now();
        const teams = (match.teams || []).slice(0, MAX_TEAMS).map((tm, i) => ({
            id: tm.id || `t${i + 1}`,
            name: String(tm.name || `ทีม ${i + 1}`),
            color: tm.color || TEAM_COLORS[i % TEAM_COLORS.length],
            icon: tm.icon || TEAM_ICONS[i % TEAM_ICONS.length],
            members: Array.isArray(tm.members) ? tm.members.slice(0, 12) : [],
            key: normKey(tm.key) || DEFAULT_KEYS[i] || '',
            score: 0,
        }));
        const mode = MODES[match.mode] ? match.mode : 'mc';
        const opts = Object.assign({ time: 30, points: 10, penalty: 0, letters: 'th', touchBuzz: false }, match.opts || {});
        const s = {
            v: 1,
            rev: 0,
            at: t,
            matchId: match.id,
            title: String(match.title || 'การแข่งขันตอบคำถาม'),
            subtitle: String(match.subtitle || ''),
            setName: String(match.setName || ''),
            dateText: String(match.dateText || ''),
            mode,
            opts,
            teams,
            deck: (match.deck || []).map((q) => Object.assign({}, q)),
            idx: 0,
            screen: 'title',
            phase: mode === 'jeopardy' ? 'pick' : 'ready',
            status: 'playing',
            timer: { dur: 0, running: false, endsAt: 0, left: 0, expired: false },
            buzz: { open: false, current: null, out: [], order: [] },
            results: {},
            adjusts: [],
            turn: teams[0] ? teams[0].id : null,
            fx: { seq: 0, list: [] },
            startedAt: new Date(t).toISOString(),
            endedAt: null,
        };
        if (mode !== 'jeopardy') prepareQuestion(s, 0);
        return s;
    }

    function normKey(k) {
        const s = String(k == null ? '' : k).trim().toLowerCase();
        return /^[a-z0-9]$/.test(s) ? s : '';
    }
    /* แปลงปุ่มที่กด (KeyboardEvent) เป็นชื่อปุ่ม ไม่ขึ้นกับภาษาแป้นพิมพ์ (แป้นไทยก็ใช้ได้) */
    function keyFromEvent(e) {
        const c = e.code || '';
        let m = /^Digit(\d)$/.exec(c) || /^Numpad(\d)$/.exec(c);
        if (m) return m[1];
        m = /^Key([A-Z])$/.exec(c);
        if (m) return m[1].toLowerCase();
        return normKey(e.key);
    }

    function current(s) { return s.deck[s.idx] || null; }
    function res(s, qid) {
        if (!s.results[qid]) s.results[qid] = { status: 'open', answers: {} };
        return s.results[qid];
    }
    function ans(s, qid, teamId) {
        const r = res(s, qid);
        if (!r.answers[teamId]) r.answers[teamId] = { choice: null, result: null, awarded: 0 };
        return r.answers[teamId];
    }

    function prepareQuestion(s, idx) {
        s.idx = Math.max(0, Math.min(idx, s.deck.length - 1));
        const q = current(s);
        s.phase = 'ready';
        s.buzz = { open: false, current: null, out: [], order: [] };
        const dur = q ? qTime(s, q) : 0;
        s.timer = { dur, running: false, endsAt: 0, left: dur, expired: false };
        if (q) {
            const r = res(s, q.id);
            // เล่นข้อเดิมซ้ำ: ถ้าเคยตอบแล้วจะคงผลเดิมไว้ (แก้ได้หลังเฉลย)
            if (r.status === 'done') s.phase = 'reveal';
            else if (r.status === 'skipped') r.status = 'open';
        }
    }

    function timerLeft(t, now) {
        if (!t) return 0;
        if (t.running) return Math.max(0, t.endsAt - now);
        return Math.max(0, t.left || 0);
    }
    function startTimer(s, at) {
        const t = s.timer;
        if (!t.dur || t.running) return;
        const left = t.expired ? 0 : (t.left || t.dur);
        if (left <= 0) return;
        Object.assign(t, { running: true, endsAt: at + left, left, expired: false });
    }
    function pauseTimer(s, at) {
        const t = s.timer;
        if (!t.running) return;
        Object.assign(t, { running: false, left: Math.max(0, t.endsAt - at) });
    }

    /* คิดคะแนนของคำถามข้อหนึ่งใหม่ตามผลถูก/ผิด (เรียกซ้ำได้ ไม่บวกซ้ำ) */
    function settle(s, qid) {
        const q = s.deck.find((x) => x.id === qid);
        if (!q) return [];
        const pts = qPoints(s, q);
        const pen = Math.max(0, Number(s.opts.penalty) || 0);
        const fx = [];
        s.teams.forEach((tm) => {
            const a = ans(s, qid, tm.id);
            let r = a.result;
            if (r == null && a.choice != null && isChoice(q) && s.mode === 'mc') r = a.choice === q.answer;
            a.final = r;
            const target = r === true ? pts : r === false ? -pen : 0;
            if (target !== a.awarded) {
                if (target > a.awarded) fx.push('score');
                a.awarded = target;
            }
        });
        return fx;
    }

    function recompute(s) {
        const sc = Object.fromEntries(s.teams.map((t) => [t.id, 0]));
        Object.values(s.results).forEach((r) => {
            Object.keys(r.answers).forEach((tid) => { if (tid in sc) sc[tid] += Number(r.answers[tid].awarded) || 0; });
        });
        s.adjusts.forEach((a) => { if (a.team in sc) sc[a.team] += Number(a.delta) || 0; });
        s.teams.forEach((t) => { t.score = sc[t.id]; });
    }

    /* ---------- reducer ---------- */
    function reduce(state, action) {
        const a = action || {};
        const at = a.at || Date.now();
        if (!state || state.status === 'closed') return { state, fx: [] };
        if (state.status === 'done' && !['screen', 'adjust', 'reopenGame', 'ping'].includes(a.type)) return { state, fx: [] };
        const s = clone(Object.assign({}, state, { deck: undefined }));
        s.deck = state.deck; // คำถามไม่เปลี่ยนระหว่างเกม ใช้ร่วมกันได้
        const q = current(s);
        const fx = [];
        const team = a.team && s.teams.find((t) => t.id === a.team);
        const answering = s.mode === 'buzz' || s.mode === 'jeopardy';
        let changed = true;

        switch (a.type) {
            case 'show': {
                if (!q || s.phase !== 'ready') { changed = false; break; }
                s.phase = 'show';
                s.screen = 'question';
                if (answering) s.buzz.open = true;
                startTimer(s, at);
                fx.push('show');
                break;
            }
            case 'reveal': {
                if (!q || !['show', 'ready'].includes(s.phase)) { changed = false; break; }
                pauseTimer(s, at);
                s.phase = 'reveal';
                s.screen = 'question';
                s.buzz.open = false;
                s.buzz.current = null;
                res(s, q.id).status = 'done';
                fx.push('reveal', ...settle(s, q.id));
                break;
            }
            case 'next': {
                if (s.mode === 'jeopardy') {
                    if (s.phase === 'pick' && s.screen === 'board') { changed = false; break; }
                    if (q && s.phase !== 'pick') { const r = res(s, q.id); if (r.status !== 'done') r.status = 'skipped'; }
                    pauseTimer(s, at);
                    s.phase = 'pick';
                    s.screen = 'board';
                    s.buzz = { open: false, current: null, out: [], order: [] };
                    break;
                }
                if (q) { const r = res(s, q.id); if (r.status !== 'done') r.status = 'skipped'; }
                if (s.idx >= s.deck.length - 1) {
                    pauseTimer(s, at);
                    s.phase = 'end';
                    s.screen = 'scores';
                    s.buzz.open = false;
                    break;
                }
                prepareQuestion(s, s.idx + 1);
                s.screen = 'question';
                fx.push('next');
                break;
            }
            case 'skip': {
                if (!q) { changed = false; break; }
                if (res(s, q.id).status !== 'done') res(s, q.id).status = 'skipped';
                return reduce(s, { type: 'next', at });
            }
            case 'goto': {
                const i = Number(a.idx);
                if (!Number.isInteger(i) || i < 0 || i >= s.deck.length || s.mode === 'jeopardy') { changed = false; break; }
                if (q && s.phase !== 'reveal' && res(s, q.id).status === 'open' && i !== s.idx) res(s, q.id).status = 'skipped';
                pauseTimer(s, at);
                prepareQuestion(s, i);
                s.screen = 'question';
                break;
            }
            case 'pick': {
                const i = s.deck.findIndex((x) => x.id === a.qid);
                if (s.mode !== 'jeopardy' || i < 0 || res(s, a.qid).status === 'done') { changed = false; break; }
                prepareQuestion(s, i);
                s.phase = 'show';
                s.screen = 'question';
                s.buzz.open = true;
                if (team) s.turn = team.id;
                startTimer(s, at);
                fx.push('pick');
                break;
            }
            case 'choose': {
                if (!q || !team || !isChoice(q) || !['show', 'ready', 'reveal'].includes(s.phase)) { changed = false; break; }
                const x = ans(s, q.id, team.id);
                const c = Number(a.choice);
                x.choice = x.choice === c || !Number.isInteger(c) ? null : c;
                x.result = null; // ให้ระบบตรวจตามตัวเลือก
                if (s.phase === 'reveal') fx.push(...settle(s, q.id));
                break;
            }
            case 'mark': {
                if (!q || !team || !['show', 'ready', 'reveal'].includes(s.phase)) { changed = false; break; }
                const x = ans(s, q.id, team.id);
                const r = a.result === true || a.result === false ? a.result : null;
                x.result = x.result === r ? null : r;
                if (s.phase === 'reveal' || answering) {
                    const before = x.awarded;
                    settle(s, q.id);
                    if (x.awarded > before) fx.push('correct'); else if (x.awarded < before || x.final === false) fx.push('wrong');
                }
                break;
            }
            case 'buzz': {
                if (!q || !team || !answering || s.phase !== 'show' || !s.buzz.open || s.buzz.current || s.buzz.out.includes(team.id)) { changed = false; break; }
                s.buzz.current = team.id;
                s.buzz.order.push(team.id);
                pauseTimer(s, at);
                fx.push('buzz');
                break;
            }
            case 'assign': {
                if (!q || !team || s.phase !== 'show') { changed = false; break; }
                s.buzz.current = team.id;
                if (!s.buzz.order.includes(team.id)) s.buzz.order.push(team.id);
                s.buzz.out = s.buzz.out.filter((t) => t !== team.id);
                pauseTimer(s, at);
                fx.push('buzz');
                break;
            }
            case 'judge': {
                const cur = s.buzz.current;
                if (!q || !cur || s.phase !== 'show') { changed = false; break; }
                const x = ans(s, q.id, cur);
                if (a.result) {
                    x.result = true;
                    settle(s, q.id);
                    s.phase = 'reveal';
                    s.buzz.open = false;
                    s.turn = cur;
                    res(s, q.id).status = 'done';
                    pauseTimer(s, at);
                    fx.push('correct', 'score');
                } else {
                    x.result = false;
                    settle(s, q.id);
                    s.buzz.out.push(cur);
                    s.buzz.current = null;
                    const left = s.teams.filter((t) => !s.buzz.out.includes(t.id));
                    s.buzz.open = left.length > 0 && !s.timer.expired;
                    if (s.buzz.open) startTimer(s, at);
                    fx.push('wrong');
                }
                break;
            }
            case 'reopen': {
                if (!q || s.phase !== 'show' || !answering) { changed = false; break; }
                s.buzz.current = null;
                s.buzz.open = true;
                if (a.clearOut) s.buzz.out = [];
                if (!s.timer.expired) startTimer(s, at);
                break;
            }
            case 'timerStart': { if (s.phase === 'ready' && q) return reduce(state, Object.assign({}, a, { type: 'show' })); startTimer(s, at); changed = s.timer.running !== state.timer.running; break; }
            case 'timerPause': { pauseTimer(s, at); changed = s.timer.running !== state.timer.running; break; }
            case 'timerAdd': {
                const ms = (Number(a.sec) || 10) * 1000;
                const t = s.timer;
                if (!t.dur) t.dur = ms;
                if (t.running) t.endsAt += ms; else t.left = Math.max(0, (t.expired ? 0 : t.left) + ms);
                t.expired = false;
                if (answering && s.phase === 'show' && !s.buzz.current && s.teams.some((x) => !s.buzz.out.includes(x.id))) s.buzz.open = true;
                break;
            }
            case 'timerReset': {
                const t = s.timer;
                Object.assign(t, { running: false, endsAt: 0, left: t.dur, expired: false });
                break;
            }
            case 'timeUp': {
                const t = s.timer;
                if (!t.running || at < t.endsAt - 250) { changed = false; break; }
                Object.assign(t, { running: false, left: 0, expired: true });
                if (!s.buzz.current) s.buzz.open = false;
                fx.push('timeup');
                break;
            }
            case 'adjust': {
                const d = Number(a.delta);
                if (!team || !Number.isFinite(d) || !d) { changed = false; break; }
                s.adjusts.push({ at, team: team.id, delta: d, qid: q ? q.id : null, note: String(a.note || '') });
                if (d > 0) fx.push('score'); else fx.push('minus');
                break;
            }
            case 'screen': {
                const name = ['title', 'question', 'scores', 'board', 'final'].includes(a.name) ? a.name : null;
                if (!name || s.screen === name) { changed = false; break; }
                if (name === 'board' && s.mode !== 'jeopardy') { changed = false; break; }
                s.screen = name;
                break;
            }
            case 'finish': {
                pauseTimer(s, at);
                s.status = 'done';
                s.screen = 'final';
                s.phase = 'end';
                s.buzz.open = false;
                s.endedAt = new Date(at).toISOString();
                fx.push('fanfare');
                break;
            }
            case 'reopenGame': {
                if (state.status !== 'done') { changed = false; break; }
                s.status = 'playing';
                s.endedAt = null;
                s.screen = 'scores';
                break;
            }
            case 'teamEdit': {
                if (!team) { changed = false; break; }
                ['name', 'color', 'icon'].forEach((k) => { if (a[k]) team[k] = String(a[k]); });
                if (a.key !== undefined) team.key = normKey(a.key);
                if (Array.isArray(a.members)) team.members = a.members.map(String).slice(0, 12);
                break;
            }
            case 'opts': {
                Object.assign(s.opts, a.opts || {});
                break;
            }
            default: changed = false;
        }
        if (!changed) return { state, fx: [] };
        recompute(s);
        s.at = at;
        if (fx.length) s.fx = { seq: (state.fx ? state.fx.seq : 0) + 1, list: [...new Set(fx)], at };
        return { state: s, fx: [...new Set(fx)] };
    }

    /* ---------- สรุปผล ---------- */
    function teamStats(s) {
        return s.teams.map((t) => {
            let correct = 0;
            let wrong = 0;
            Object.values(s.results).forEach((r) => {
                const x = r.answers[t.id];
                if (!x) return;
                if (x.final === true) correct += 1;
                else if (x.final === false) wrong += 1;
            });
            const adjust = s.adjusts.filter((a) => a.team === t.id).reduce((m, a) => m + a.delta, 0);
            return { id: t.id, correct, wrong, adjust };
        });
    }
    /* อันดับแบบแข่งขัน: คะแนนเท่ากันได้อันดับเดียวกัน (1, 1, 3) */
    function ranking(s) {
        const st = Object.fromEntries(teamStats(s).map((x) => [x.id, x]));
        const list = s.teams.map((t, i) => Object.assign({ order: i }, t, st[t.id])).sort((a, b) => b.score - a.score || b.correct - a.correct || a.order - b.order);
        let rank = 0;
        list.forEach((t, i) => {
            if (i === 0 || t.score !== list[i - 1].score) rank = i + 1;
            t.rank = rank;
            t.tie = list.some((o) => o !== t && o.score === t.score);
            t.award = rank <= 3 ? AWARDS[rank - 1] : '';
        });
        return list;
    }
    function progress(s) {
        const total = s.deck.length;
        const done = Object.values(s.results).filter((r) => r.status === 'done').length;
        const skipped = Object.values(s.results).filter((r) => r.status === 'skipped').length;
        return { total, done, skipped, left: Math.max(0, total - done - skipped) };
    }
    function status(s, qid) { return (s.results[qid] && s.results[qid].status) || 'open'; }

    /* ข้อความปุ่มหลัก "ขั้นต่อไป" + action ที่จะส่ง (ใช้ทั้งปุ่มบนหน้าจอครูและปุ่ม Space/รีโมต) */
    function nextStep(s) {
        const q = current(s);
        if (s.status === 'done') return null;
        if (s.mode === 'jeopardy') {
            if (s.phase === 'pick') return s.screen === 'board' ? null : { type: 'screen', name: 'board', label: 'แสดงกระดาน', icon: 'fa-table-cells' };
            if (s.phase === 'show') return { type: 'reveal', label: 'เฉลยคำตอบ', icon: 'fa-eye' };
            return { type: 'next', label: 'กลับกระดาน', icon: 'fa-table-cells' };
        }
        if (!q) return null;
        if (s.phase === 'end') return { type: 'finish', label: 'ประกาศผล', icon: 'fa-trophy' };
        // จากหน้าชื่อการแข่งขัน/ตารางคะแนน → ขึ้นหน้า "ข้อที่ N" ก่อน แล้วค่อยแสดงคำถาม
        if (s.phase === 'ready' && s.screen !== 'question') return { type: 'screen', name: 'question', label: s.idx === 0 && s.screen === 'title' ? 'เริ่มการแข่งขัน' : `ไปข้อที่ ${s.idx + 1}`, icon: 'fa-flag-checkered' };
        if (s.phase === 'ready') return { type: 'show', label: 'แสดงคำถาม', icon: 'fa-play' };
        if (s.phase === 'show') return { type: 'reveal', label: 'เฉลยคำตอบ', icon: 'fa-eye' };
        if (s.idx >= s.deck.length - 1) return { type: 'next', label: 'สรุปคะแนน', icon: 'fa-ranking-star' };
        return { type: 'next', label: 'ข้อถัดไป', icon: 'fa-forward' };
    }

    /* แปลงสถานะเกมเป็นบันทึกผลการแข่งขัน (เก็บถาวรในข้อมูลหลัก ไม่รวมประวัติย้อนกลับ) */
    function toRecord(s, extra) {
        return Object.assign({
            id: s.matchId,
            title: s.title,
            subtitle: s.subtitle,
            setName: s.setName,
            dateText: s.dateText,
            mode: s.mode,
            opts: clone(s.opts),
            teams: clone(s.teams),
            deck: s.deck.map((q) => ({ id: q.id, type: q.type, text: q.text, choices: q.choices, answer: q.answer, points: q.points, category: q.category || '', image: q.image || '' })),
            results: clone(s.results),
            adjusts: clone(s.adjusts),
            status: s.status,
            startedAt: s.startedAt,
            endedAt: s.endedAt,
            updatedAt: new Date(s.at || Date.now()).toISOString(),
        }, extra || {});
    }

    return {
        MODES, LETTERS, TEAM_COLORS, TEAM_ICONS, DEFAULT_KEYS, AWARDS, MAX_TEAMS, MIN_TEAMS, NO_UNDO,
        newLive, reduce, settle, recompute, current, timerLeft, jeopardyGrid, ranking, teamStats, progress, status, nextStep,
        isChoice, answerText, qPoints, qTime, keyFromEvent, normKey, toRecord, clone,
    };
});
