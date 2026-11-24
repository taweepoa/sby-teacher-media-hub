/* =====================================================================
   จอแสดงผล (board.html) — วาดหน้าจอจากสถานะเกมที่ซิงก์มาจากหน้าจอครู
   - ไม่มีหน้าจอครูเปิดอยู่ → จอนี้ควบคุมเกมเองได้ด้วยแป้นพิมพ์/รีโมตพรีเซนต์ (โหมดจอเดียว)
   - board.html?preview=1 = ภาพย่อในหน้าจอครู (ดูอย่างเดียว ไม่มีเสียง ไม่รับแป้นพิมพ์)
   ===================================================================== */
(function () {
    'use strict';

    const PREVIEW = new URLSearchParams(location.search).has('preview');
    if (PREVIEW) document.documentElement.classList.add('preview');
    const $ = (id) => document.getElementById(id);
    const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const fmt = (n) => Number(n || 0).toLocaleString('th-TH');

    let S = null;
    let key = '';
    let shown = {};
    let lastMatch = null;
    let buzzTimer = null;
    let lastBuzz = null;

    const L = (s) => Engine.LETTERS[s.opts.letters] || Engine.LETTERS.th;

    function viewOf(s) {
        if (!s) return 'empty';
        if (s.screen === 'final') return 'final';
        if (s.screen === 'title') return 'title';
        if (s.screen === 'scores' || s.phase === 'end') return 'scores';
        if (s.screen === 'board' || (s.mode === 'jeopardy' && s.phase === 'pick')) return 'board';
        if (s.phase === 'ready') return 'ready';
        return 'question';
    }

    function teamIcon(t, cls) { return `<span class="${cls || 'ic'}"><i class="fas ${esc(t.icon)}"></i></span>`; }

    /* ---------- แถบบน ---------- */
    /* โหมดทดลองใช้: ป้ายเล็กในแถบบน (ไม่บังคำถาม/คะแนน) */
    const demoPill = () => (window.VSDemo && VSDemo.active ? `<span class="bd-pill demo" title="${esc(VSDemo.watermark)}"><i class="fas fa-flask"></i>${esc(VSDemo.watermark)}</span>` : '');
    function renderTop(s, view) {
        const top = $('bd-top');
        if (!s || view === 'title' || view === 'empty') { top.innerHTML = demoPill() ? `<span class="spacer"></span>${demoPill()}` : ''; return; }
        const p = Engine.progress(s);
        const mode = Engine.MODES[s.mode];
        let prog = '';
        if (s.mode === 'jeopardy') prog = `<span class="bd-pill"><i class="fas fa-table-cells"></i>เหลือ ${p.total - p.done} ช่อง</span>`;
        else if (view !== 'final') prog = `<span class="bd-pill hot"><i class="fas fa-circle-question"></i>ข้อ ${Math.min(s.idx + 1, p.total)} / ${p.total}</span>`;
        top.innerHTML = `
            <span class="bd-logo"><i class="fas fa-trophy"></i></span>
            <div class="tt"><b>${esc(s.title)}</b><small>${esc([s.subtitle, s.setName].filter(Boolean).join(' • '))}</small></div>
            <span class="bd-pill"><i class="fas ${mode.icon}"></i>${esc(mode.label)}</span>
            ${prog}${demoPill()}`;
    }

    /* ---------- แถบทีมด้านล่าง ---------- */
    function chipStatus(s, t, q) {
        if (!q) return '';
        const a = s.results[q.id] && s.results[q.id].answers[t.id];
        const answering = s.mode === 'buzz' || s.mode === 'jeopardy';
        if (s.phase === 'reveal' || (answering && a && a.final != null)) {
            const fin = a ? (a.final !== undefined ? a.final : a.result) : null;
            if (fin === true) return '<span class="st ok"><i class="fas fa-check"></i> ถูก</span>';
            if (fin === false) return '<span class="st bad"><i class="fas fa-xmark"></i> ผิด</span>';
            return '';
        }
        if (s.phase === 'show' && !answering && a && (a.choice != null || a.result != null)) return '<span class="st wait"><i class="fas fa-paper-plane"></i> ตอบแล้ว</span>';
        return '';
    }
    function renderStrip(s, view) {
        const strip = $('bd-strip');
        if (!s || ['empty', 'title', 'scores', 'final'].includes(view)) { strip.innerHTML = ''; return; }
        const q = view === 'question' ? Engine.current(s) : null;
        const answering = s.mode === 'buzz' || s.mode === 'jeopardy';
        const touch = !PREVIEW && s.opts.touchBuzz && answering && s.phase === 'show';
        strip.classList.toggle('many', s.teams.length > 4);
        strip.innerHTML = s.teams.map((t) => {
            const cls = ['chip'];
            if (q && answering && s.buzz.out.includes(t.id)) cls.push('out');
            if (q && s.buzz.current === t.id) cls.push('on');
            if (s.mode === 'jeopardy' && view === 'board' && s.turn === t.id) cls.push('turn');
            if (touch) cls.push('touch');
            const key = answering && t.key ? `<span class="key">${esc(t.key)}</span>` : '';
            const sub = answering ? `${key} <span class="lbl">${touch ? 'แตะเพื่อกดออด' : 'ปุ่มกดออด'}</span>` : `<span class="lbl">${t.members.length ? `${t.members.length} คน` : ''}</span>`;
            return `<div class="${cls.join(' ')}" style="--c:${esc(t.color)}" data-team="${esc(t.id)}">
                ${chipStatus(s, t, q)}
                ${teamIcon(t)}
                <div class="nm"><b>${esc(t.name)}</b><small>${sub}</small></div>
                <span class="sc" data-sc="${esc(t.id)}">${fmt(shown[t.id] ?? t.score)}</span>
            </div>`;
        }).join('');
        if (touch) strip.querySelectorAll('.chip').forEach((c) => { c.onclick = () => Link.dispatch({ type: 'buzz', team: c.dataset.team }); });
    }

    /* ---------- คะแนนเปลี่ยน: นับขึ้น + ป้าย +10 ลอยขึ้น ---------- */
    function animateScores(s) {
        s.teams.forEach((t) => {
            const from = shown[t.id];
            const to = t.score;
            shown[t.id] = to;
            if (from == null || from === to) return;
            const els = document.querySelectorAll(`[data-sc="${CSS.escape(t.id)}"]`);
            els.forEach((el) => countUp(el, from, to));
            const anchor = document.querySelector(`.chip[data-team="${CSS.escape(t.id)}"], .row[data-team="${CSS.escape(t.id)}"] .sc`);
            if (anchor) {
                const r = anchor.getBoundingClientRect();
                const d = to - from;
                const pop = document.createElement('div');
                pop.className = `pop ${d > 0 ? 'plus' : 'minus'}`;
                pop.textContent = `${d > 0 ? '+' : ''}${fmt(d)}`;
                pop.style.left = `${r.left + r.width / 2}px`;
                pop.style.top = `${r.top - 10}px`;
                document.body.appendChild(pop);
                setTimeout(() => pop.remove(), 1700);
            }
        });
    }
    function countUp(el, from, to) {
        const t0 = performance.now();
        const dur = 800;
        const step = (now) => {
            const k = Math.min(1, (now - t0) / dur);
            const e = 1 - Math.pow(1 - k, 3);
            el.textContent = fmt(Math.round(from + (to - from) * e));
            if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    /* ---------- หน้าแต่ละแบบ ---------- */
    function viewEmpty() {
        return `<div class="bd-title">
            <span class="big-ic enter"><i class="fas fa-trophy"></i></span>
            <h1 class="enter-2">เกมตอบคำถามแข่งขันแบบทีม</h1>
            <p class="enter-3">ยังไม่มีการแข่งขัน — ที่หน้าจอครูกด "เริ่มการแข่งขัน" แล้วจอนี้จะแสดงผลทันที</p>
            <div class="wait enter-3"><i class="fas fa-satellite-dish"></i> รอสัญญาณจากหน้าจอครู</div>
        </div>`;
    }
    function viewTitle(s) {
        return `<div class="bd-title">
            <span class="big-ic enter"><i class="fas fa-trophy"></i></span>
            <h1 class="enter-2">${esc(s.title)}</h1>
            ${s.subtitle || s.dateText ? `<p class="enter-2">${esc([s.subtitle, s.dateText].filter(Boolean).join(' • '))}</p>` : ''}
            <div class="lineup enter-3">${s.teams.map((t) => `<div class="lu" style="--c:${esc(t.color)}">${teamIcon(t)}<div><b>${esc(t.name)}</b><small>${esc(t.members.join(', ') || ' ')}</small></div></div>`).join('')}</div>
            <div class="wait enter-3"><i class="fas fa-hourglass-half"></i> ${esc(Engine.MODES[s.mode].label)} • ${s.deck.length} ข้อ • รอครูเริ่มการแข่งขัน</div>
        </div>`;
    }
    function modeTip(s) {
        if (s.mode === 'buzz' || s.mode === 'jeopardy') return '<i class="fas fa-bell"></i> เตรียมกดออด! ทีมที่กดก่อนได้สิทธิ์ตอบ';
        if (s.mode === 'write') return '<i class="fas fa-pen-to-square"></i> เตรียมกระดาษ/ไวท์บอร์ด เขียนคำตอบแล้วชูพร้อมกัน';
        return '<i class="fas fa-list-ol"></i> ทุกทีมเลือกคำตอบพร้อมกัน';
    }
    function viewReady(s) {
        const q = Engine.current(s);
        return `<div class="bd-ready">
            <div class="no enter">ข้อที่</div>
            <div class="num zoom-in">${s.idx + 1}</div>
            <div class="meta enter-2">
                <span class="bd-pill hot"><i class="fas fa-star"></i>${fmt(Engine.qPoints(s, q))} คะแนน</span>
                ${q.category ? `<span class="bd-pill"><i class="fas fa-tag"></i>${esc(q.category)}</span>` : ''}
                ${s.timer.dur ? `<span class="bd-pill"><i class="fas fa-stopwatch"></i>${Math.round(s.timer.dur / 1000)} วินาที</span>` : ''}
            </div>
            <div class="tip enter-3">${modeTip(s)}</div>
        </div>`;
    }

    function qSize(text, img) {
        const n = String(text || '').length;
        let v = n <= 30 ? 4.2 : n <= 60 ? 3.6 : n <= 100 ? 3.1 : n <= 160 ? 2.6 : 2.2;
        if (img) v -= 0.4;
        return v;
    }
    function cSize(choices, img) {
        const n = Math.max(...choices.map((c) => String(c).length), 1);
        let v = n <= 12 ? 2.6 : n <= 28 ? 2.2 : n <= 55 ? 1.8 : 1.5;
        if (img && n > 12) v -= 0.2;
        return v;
    }

    function answerZone(s, q) {
        const revealed = s.phase === 'reveal';
        if (Engine.isChoice(q)) {
            const Ls = L(s);
            const picks = {};
            if (revealed && s.mode === 'mc') {
                const r = s.results[q.id];
                s.teams.forEach((t) => { const a = r && r.answers[t.id]; if (a && a.choice != null) (picks[a.choice] = picks[a.choice] || []).push(t); });
            }
            const ch = q.choices.map((c, i) => `<div class="ch${revealed && i === q.answer ? ' ok' : ''}" data-ch="${i}">
                <span class="lt">${revealed && i === q.answer ? '<i class="fas fa-check"></i>' : esc(Ls[i])}</span>
                <span class="tx">${esc(c)}</span>
                <span class="who">${(picks[i] || []).map((t) => `<i class="fas ${esc(t.icon)}" style="--tc:${esc(t.color)}" title="${esc(t.name)}"></i>`).join('')}</span>
            </div>`).join('');
            return `<div class="choices" style="--cs:${cSize(q.choices, !!q.image)}">${ch}</div>${revealed && q.explain ? `<div class="explain"><i class="fas fa-lightbulb"></i>${esc(q.explain)}</div>` : ''}`;
        }
        if (revealed) {
            return `<div class="ans-card"><span class="ic"><i class="fas fa-check"></i></span><div><small>เฉลย</small><b>${esc(q.answer)}</b></div></div>${q.explain ? `<div class="explain"><i class="fas fa-lightbulb"></i>${esc(q.explain)}</div>` : ''}`;
        }
        const hint = s.mode === 'buzz' || s.mode === 'jeopardy' ? '<i class="fas fa-bell"></i> กดปุ่มของทีมเพื่อขอตอบ!' : s.mode === 'write' ? '<i class="fas fa-pen-to-square"></i> เขียนคำตอบ แล้วชูพร้อมกันเมื่อหมดเวลา' : '<i class="fas fa-comment-dots"></i> ตอบคำถามนี้';
        return `<div class="wait-ans">${hint}</div>`;
    }

    function viewQuestion(s) {
        const q = Engine.current(s);
        const src = q.image ? Img.src(q.image) : '';
        if (q.image && !src) Img.refresh(q.image).then((r) => { if (r && S) { key = ''; render(S, null, {}); } });
        const cls = ['q-body'];
        if (src) cls.push('has-img');
        if (!Engine.isChoice(q)) cls.push('no-choice');
        if (s.phase === 'reveal') cls.push('reveal');
        const tag = (s.mode === 'jeopardy' ? `<span>${esc(q.category || 'คำถาม')}</span>` : `<span>ข้อที่ ${s.idx + 1}</span>${q.category ? `<span class="alt">${esc(q.category)}</span>` : ''}`) + '<span class="ansby" id="bd-ansby" hidden></span>';
        return `<div class="bd-q">
            <div class="q-head">
                <div class="q-card enter"><div class="q-tag">${tag}<span class="alt">${fmt(Engine.qPoints(s, q))} คะแนน</span></div>
                    <p class="q-text" style="--qs:${qSize(q.text, !!src)}">${esc(q.text)}</p></div>
                <div class="timer" id="bd-timer"><svg viewBox="0 0 100 100"><circle class="trk" cx="50" cy="50" r="45"/><circle class="bar" cx="50" cy="50" r="45"/></svg><b></b></div>
            </div>
            <div class="${cls.join(' ')}" id="bd-body">
                ${src ? `<div class="q-img enter-2"><img src="${esc(src)}" alt="รูปประกอบคำถาม"></div>` : ''}
                <div class="ans-zone enter-3" id="bd-ans">${answerZone(s, q)}</div>
            </div>
        </div>`;
    }

    function rankRows(s) {
        const rk = Engine.ranking(s);
        const max = Math.max(1, ...rk.map((t) => t.score));
        const rh = rk.length > 6 ? 4.6 : rk.length > 4 ? 5.4 : 6.4;
        return rk.map((t) => `<div class="row${t.rank === 1 && t.score > 0 ? ' lead' : ''}" data-team="${esc(t.id)}" style="--c:${esc(t.color)};--w:${Math.max(0, (t.score / max) * 100).toFixed(1)}%;--rh:${rh}">
            <span class="fill"></span>
            <span class="rk r${t.rank}">${t.rank}</span>
            ${teamIcon(t)}
            <div class="nm"><b>${esc(t.name)}</b><small>ถูก ${t.correct} ข้อ${t.wrong ? ` • ผิด ${t.wrong} ข้อ` : ''}${t.members.length ? ` • ${esc(t.members.join(', '))}` : ''}</small></div>
            <span class="sc"><span data-sc="${esc(t.id)}">${fmt(shown[t.id] ?? t.score)}</span><small>คะแนน</small></span>
        </div>`).join('');
    }
    function viewScores(s) {
        const p = Engine.progress(s);
        const sub = s.phase === 'end' ? 'จบคำถามทุกข้อแล้ว — รอประกาศผล' : `ตอบแล้ว ${p.done} จาก ${p.total} ข้อ`;
        return `<div class="bd-scores"><h2 class="enter"><i class="fas fa-ranking-star"></i>ตารางคะแนน</h2>
            <div class="enter" style="text-align:center;opacity:.75;font-size:calc(var(--u)*1.4);margin-top:calc(var(--u)*-.6)">${esc(sub)}</div>
            <div class="rows" id="bd-rows">${rankRows(s)}</div></div>`;
    }

    function viewBoard(s, anim) {
        const g = Engine.jeopardyGrid(s.deck);
        const byId = new Map(s.deck.map((q) => [q.id, q]));
        let html = g.cats.map((c) => `<div class="jc-h${anim ? ' enter' : ''}">${esc(c.name)}</div>`).join('');
        for (let r = 0; r < g.rows; r += 1) {
            g.cats.forEach((c, ci) => {
                const id = c.cells[r];
                if (!id) { html += '<div class="jc empty"></div>'; return; }
                const q = byId.get(id);
                const st = Engine.status(s, id);
                const res = s.results[id];
                let by = '';
                if (st === 'done') {
                    const win = s.teams.find((t) => res && res.answers[t.id] && res.answers[t.id].final === true);
                    by = `<span class="by">${win ? `<i class="fas ${esc(win.icon)}" style="--tc:${esc(win.color)}"></i>${esc(win.name)}` : 'ไม่มีทีมตอบถูก'}</span>`;
                }
                html += `<button type="button" class="jc ${st}${anim ? ' enter' : ''}" data-qid="${esc(id)}" style="${anim ? `animation-delay:${(r * 0.06 + ci * 0.03).toFixed(2)}s` : ''}">${fmt(Engine.qPoints(s, q))}${by}</button>`;
            });
        }
        const turn = s.teams.find((t) => t.id === s.turn);
        return `<div class="bd-jeo" style="grid-template-columns:repeat(${g.cats.length},minmax(0,1fr));grid-template-rows:auto repeat(${g.rows},minmax(0,1fr))">${html}</div>
            ${turn ? `<div style="text-align:center;margin-top:calc(var(--u)*.8);font-size:calc(var(--u)*1.45);font-weight:700;opacity:.85"><i class="fas fa-hand-pointer" style="color:#fde68a"></i> ${esc(turn.name)} เลือกช่องถัดไป</div>` : ''}`;
    }

    function viewFinal(s) {
        const rk = Engine.ranking(s);
        const top = [rk.find((t) => t.rank === 2 || (t !== rk[0] && t.rank === 1)), rk[0], rk.find((t, i) => i >= 1 && t.rank === 3) || rk[2]];
        const used = new Set();
        const pd = (t, p) => {
            if (!t || used.has(t.id)) return '<div class="pd" style="visibility:hidden"></div>';
            used.add(t.id);
            return `<div class="pd p${p}" style="--c:${esc(t.color)}">
                ${p === 1 ? '<i class="fas fa-crown crown"></i>' : ''}
                <span class="av"><i class="fas ${esc(t.icon)}"></i></span>
                <b>${esc(t.name)}</b>
                <span class="aw">${esc(t.award || '')}</span>
                ${t.members.length ? `<small>${esc(t.members.join(', '))}</small>` : ''}
                <div class="base"><span class="n">${t.rank}</span><span class="s">${fmt(t.score)}</span></div>
            </div>`;
        };
        const html = [pd(top[0], 2), pd(top[1], 1), pd(top[2], 3)].join('');
        const rest = rk.filter((t) => !used.has(t.id));
        return `<div class="bd-final"><h2 class="enter"><i class="fas fa-trophy"></i>ประกาศผลการแข่งขัน</h2>
            <div class="podium">${html}</div>
            ${rest.length ? `<div class="others">${rest.map((t) => `<span style="--c:${esc(t.color)}">อันดับ ${t.rank} ${esc(t.name)} • ${fmt(t.score)}</span>`).join('')}</div>` : ''}</div>`;
    }

    /* ---------- อัปเดตบางส่วน (ไม่สร้างใหม่ทั้งหน้า) ---------- */
    function patchQuestion(s) {
        const q = Engine.current(s);
        const body = $('bd-body');
        const zone = $('bd-ans');
        if (!body || !zone || !q) return false;
        body.classList.toggle('reveal', s.phase === 'reveal');
        const html = answerZone(s, q);
        if (Engine.isChoice(q)) {
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            const fresh = tmp.querySelectorAll('.ch');
            zone.querySelectorAll('.ch').forEach((el, i) => {
                const f = fresh[i];
                if (!f) return;
                el.classList.toggle('ok', f.classList.contains('ok'));
                el.querySelector('.lt').innerHTML = f.querySelector('.lt').innerHTML;
                el.querySelector('.who').innerHTML = f.querySelector('.who').innerHTML;
            });
            const ex = zone.querySelector('.explain');
            const fx = tmp.querySelector('.explain');
            if (fx && !ex) zone.appendChild(fx);
            if (!fx && ex) ex.remove();
        } else if (zone.dataset.html !== html) {
            zone.innerHTML = html;
        }
        zone.dataset.html = html;
        return true;
    }
    function patchScores(s) {
        const box = $('bd-rows');
        if (!box) return false;
        const before = new Map([...box.children].map((el) => [el.dataset.team, el.getBoundingClientRect().top]));
        box.innerHTML = rankRows(s);
        [...box.children].forEach((el) => {
            const old = before.get(el.dataset.team);
            if (old == null) return;
            const dy = old - el.getBoundingClientRect().top;
            if (!dy) return;
            el.style.transform = `translateY(${dy}px)`;
            el.style.transition = 'none';
            requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = 'transform .9s cubic-bezier(.2,.8,.25,1)'; el.style.transform = ''; }));
        });
        return true;
    }

    /* ---------- ทีมกดออด: แสดงเต็มจอครู่หนึ่ง แล้วย่อเป็นป้าย "กำลังตอบ" บนการ์ดคำถาม ---------- */
    function ribbon(t, text, bad) {
        const r = $('bd-ansby');
        if (!r) return;
        if (!t) { r.hidden = true; return; }
        r.hidden = false;
        r.className = `ansby${bad ? ' bad' : ''}`;
        r.style.setProperty('--tc', t.color);
        r.innerHTML = `<i class="fas ${bad ? 'fa-xmark' : 'fa-bell'}"></i>${esc(t.name)} ${esc(text)}`;
    }
    function renderBuzz(s, view, info) {
        const box = $('bd-buzz');
        const cur = s && view === 'question' && s.phase === 'show' ? s.buzz.current : null;
        if (!cur) {
            if (box.classList.contains('show')) { box.className = 'bd-buzz'; box.innerHTML = ''; }
            if (lastBuzz) ribbon(null);
            lastBuzz = null;
            return;
        }
        const t = s.teams.find((x) => x.id === cur);
        if (cur === lastBuzz) { ribbon(t, 'กำลังตอบ'); return; }
        lastBuzz = cur;
        clearTimeout(buzzTimer);
        // กดสด ๆ → แสดงเต็มจอ 1.7 วินาที / เพิ่งเปิดจอ → แสดงเฉพาะป้าย
        const fresh = info && info.fx && info.fx.includes('buzz');
        if (fresh) {
            box.style.setProperty('--c', t.color);
            box.innerHTML = `<div class="flash"></div><div class="card"><span class="ic"><i class="fas fa-bell"></i></span><b>${esc(t.name)}</b><span>ได้สิทธิ์ตอบ!</span></div>`;
            box.className = 'bd-buzz show';
            buzzTimer = setTimeout(() => { box.className = 'bd-buzz'; box.innerHTML = ''; }, 1700);
        }
        ribbon(t, 'กำลังตอบ');
    }

    function flash(kind) {
        const el = document.createElement('div');
        el.className = kind === 'ok' ? 'bd-flash-ok' : 'bd-flash-bad';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1300);
    }

    /* ---------- โปรยกระดาษสี ---------- */
    let confettiRun = 0;
    function confetti(ms, amount) {
        const cv = $('bd-confetti');
        const g = cv.getContext('2d');
        const w = cv.width = window.innerWidth;
        const h = cv.height = window.innerHeight;
        const colors = ['#fde047', '#f43f5e', '#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ffffff'];
        const parts = Array.from({ length: amount || 160 }, () => ({
            x: Math.random() * w, y: -20 - Math.random() * h * 0.6, r: 4 + Math.random() * 7, c: colors[Math.floor(Math.random() * colors.length)],
            vx: -1.5 + Math.random() * 3, vy: 2 + Math.random() * 4, a: Math.random() * Math.PI, va: -0.2 + Math.random() * 0.4,
        }));
        const id = ++confettiRun;
        const t0 = performance.now();
        const step = (now) => {
            if (id !== confettiRun) return;
            g.clearRect(0, 0, w, h);
            const alive = now - t0 < ms;
            parts.forEach((p) => {
                p.x += p.vx; p.y += p.vy; p.a += p.va;
                if (p.y > h + 20 && alive) { p.y = -20; p.x = Math.random() * w; }
                g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore();
            });
            if (alive || parts.some((p) => p.y < h + 20)) requestAnimationFrame(step); else g.clearRect(0, 0, w, h);
        };
        requestAnimationFrame(step);
    }

    /* ---------- วาดหน้าจอ ---------- */
    function render(s, prev, info) {
        S = s;
        if (s && s.matchId !== lastMatch) { lastMatch = s.matchId; shown = {}; }
        if (s) s.teams.forEach((t) => { if (!(t.id in shown)) shown[t.id] = t.score; });
        if (s) Sound.set({ enabled: s.opts.sound !== false, volume: s.opts.volume == null ? 0.8 : s.opts.volume });
        const view = viewOf(s);
        const q = s ? Engine.current(s) : null;
        const k = `${view}|${view === 'question' || view === 'ready' ? (q && q.id) : ''}|${s ? s.matchId : ''}`;
        const stage = $('bd-stage');
        renderTop(s, view);
        let rebuilt = false;
        if (k !== key) {
            key = k;
            rebuilt = true;
            stage.innerHTML = view === 'empty' ? viewEmpty() : view === 'title' ? viewTitle(s) : view === 'ready' ? viewReady(s)
                : view === 'question' ? viewQuestion(s) : view === 'scores' ? viewScores(s) : view === 'board' ? viewBoard(s, true) : viewFinal(s);
            if (view === 'final') { confetti(6000, 220); }
        } else if (view === 'question') patchQuestion(s);
        else if (view === 'scores') patchScores(s);
        else if (view === 'board') stage.innerHTML = viewBoard(s, false);
        renderStrip(s, view);
        if (s) animateScores(s);
        renderBuzz(s, view, info);
        const fx = (info && info.fx) || [];
        if (!rebuilt || view === 'question') {
            if (fx.includes('correct')) { flash('ok'); confetti(1400, 90); }
            if (fx.includes('wrong') || fx.includes('timeup')) flash('bad');
            if (fx.includes('wrong') && s && s.buzz.out.length && view === 'question') {
                const t = s.teams.find((x) => x.id === s.buzz.out[s.buzz.out.length - 1]);
                if (t) {
                    ribbon(t, `ตอบไม่ถูก${s.buzz.open ? ' — ทีมอื่นกดต่อได้' : ''}`, true);
                    clearTimeout(buzzTimer);
                    buzzTimer = setTimeout(() => { if (S && !S.buzz.current) ribbon(null); }, 2600);
                }
            }
        }
        if (s && view === 'board' && !PREVIEW) {
            stage.querySelectorAll('.jc:not(.done):not(.empty)').forEach((b) => { b.onclick = () => Link.dispatch({ type: 'pick', qid: b.dataset.qid }); });
        }
        tickTimer();
        document.title = s ? `${s.title} • จอแสดงผล` : 'จอแสดงผล • เกมตอบคำถามแข่งขันแบบทีม';
    }

    /* ---------- นาฬิกา ---------- */
    function tickTimer() {
        const el = $('bd-timer');
        if (!el || !S) return;
        const t = S.timer;
        if (!t.dur) { el.className = 'timer none'; return; }
        const left = Engine.timerLeft(t, Date.now());
        const sec = Math.ceil(left / 1000);
        const p = Math.max(0, Math.min(1, left / t.dur));
        el.style.setProperty('--p', p.toFixed(4));
        const cls = ['timer'];
        if (t.expired || (left <= 0 && S.phase === 'show')) cls.push('up');
        else if (sec <= 5 && t.running) cls.push('hot');
        else if (sec <= 10 && p <= 0.34) cls.push('warn');
        if (!t.running && !t.expired && S.phase === 'show' && left > 0) cls.push('paused');
        el.className = cls.join(' ');
        const b = el.querySelector('b');
        const txt = cls.includes('up') ? 'หมดเวลา' : String(sec);
        if (b.textContent !== txt) b.textContent = txt;
    }
    function loop() { tickTimer(); requestAnimationFrame(loop); }

    /* ---------- เต็มจอ / แถบเครื่องมือ ---------- */
    function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
    function toggleFull() {
        const de = document.documentElement;
        if (isFull()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        else if (de.requestFullscreen) de.requestFullscreen().catch(() => {});
        else if (de.webkitRequestFullscreen) de.webkitRequestFullscreen();
    }
    let idleT = null;
    function wake() {
        const bd = $('bd');
        bd.classList.remove('idle', 'hide-cursor');
        document.documentElement.classList.remove('bd-idle');
        clearTimeout(idleT);
        idleT = setTimeout(() => { bd.classList.add('idle'); document.documentElement.classList.add('bd-idle'); if (isFull()) bd.classList.add('hide-cursor'); }, 3000);
    }
    function renderHud(info) {
        const st = $('bd-link');
        if (!st) return;
        const p = info || Link.peerInfo();
        st.className = `link-st${p.controls ? '' : ' solo'}`;
        st.innerHTML = p.controls ? '<i class="fas fa-circle"></i>เชื่อมต่อหน้าจอครูแล้ว' : '<i class="fas fa-circle"></i>โหมดจอเดียว (ควบคุมด้วยแป้นพิมพ์)';
    }

    /* ---------- แป้นพิมพ์ / รีโมตพรีเซนต์ ---------- */
    function onKey(e) {
        if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
        const s = Link.state;
        const k = e.key;
        const answering = s && (s.mode === 'buzz' || s.mode === 'jeopardy');
        // ปุ่มประจำทีม (กดออด) มาก่อนคีย์ลัดอื่นเสมอ
        const tk = Engine.keyFromEvent(e);
        const team = s && tk && !e.ctrlKey && !e.metaKey && !e.altKey && s.teams.find((t) => t.key === tk);
        if (team && answering) { e.preventDefault(); Link.dispatch({ type: 'buzz', team: team.id }); return; }
        if (k === 'F5' || ((k === 'f' || k === 'F') && !e.ctrlKey && !e.metaKey)) { e.preventDefault(); toggleFull(); return; }
        if (k === '?' || k === 'h' || k === 'H') { $('bd-help').classList.toggle('show'); return; }
        if (k === 'Escape') { $('bd-help').classList.remove('show'); return; }
        if (!s) return;
        if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')) { e.preventDefault(); Link.undo(); return; }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if ([' ', 'PageDown', 'ArrowRight', 'ArrowDown'].includes(k)) {
            e.preventDefault();
            const n = Engine.nextStep(s);
            if (n) Link.dispatch({ type: n.type, name: n.name });
            return;
        }
        if (['PageUp', 'ArrowLeft', 'ArrowUp'].includes(k)) { e.preventDefault(); Link.undo(); return; }
        if (answering && s.buzz.current && (k === 'Enter' || k === 'y' || k === 'Y')) { e.preventDefault(); Link.dispatch({ type: 'judge', result: true }); return; }
        if (answering && s.buzz.current && (k === 'Backspace' || k === 'Delete' || k === 'n' || k === 'N')) { e.preventDefault(); Link.dispatch({ type: 'judge', result: false }); return; }
        if (k === 't' || k === 'T') { Link.dispatch({ type: s.timer.running ? 'timerPause' : 'timerStart' }); return; }
        if (k === 's' || k === 'S' || k === 'b' || k === 'B' || k === '.') {
            const back = s.mode === 'jeopardy' && s.phase === 'pick' ? 'board' : 'question';
            Link.dispatch({ type: 'screen', name: s.screen === 'scores' ? back : 'scores' });
        }
    }

    function init() {
        // โหมดทดลองใช้: ย่อแถบของ kit เป็นปุ่มเล็กตั้งแต่เริ่ม เพื่อไม่บังจอแข่งขัน
        if (window.VSDemo && VSDemo.active) document.documentElement.classList.add('vsd-min');
        Link.init({ role: PREVIEW ? 'preview' : 'board', prio: () => 0 });
        Img.init().then(() => { key = ''; render(Link.state, null, {}); });
        Link.on((s, prev, info) => render(s, prev, info));
        if (!PREVIEW) {
            Link.onFx((fx) => Sound.playFx(fx));
            Link.onPeers(renderHud);
            renderHud();
            document.addEventListener('keydown', onKey);
            ['mousemove', 'pointerdown'].forEach((ev) => document.addEventListener(ev, wake, { passive: true }));
            wake();
            $('bd-full').onclick = toggleFull;
            $('bd-help-btn').onclick = () => $('bd-help').classList.add('show');
            $('bd-help-close').onclick = () => $('bd-help').classList.remove('show');
            const hint = $('bd-hint');
            const hideHint = () => { hint.hidden = true; };
            $('bd-hint-go').onclick = () => { hideHint(); if (!isFull()) toggleFull(); };
            $('bd-hint-x').onclick = hideHint;
            document.addEventListener('fullscreenchange', () => { if (isFull()) hideHint(); });
            if (isFull()) hideHint();
        }
        render(Link.state, null, {});
        loop();
    }

    window.Board = { render: () => { key = ''; render(Link.state, null, {}); } };
    document.addEventListener('DOMContentLoaded', init);
})();
