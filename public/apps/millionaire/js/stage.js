/* =====================================================================
   หน้าจอเกมโชว์ (#/play) — ไฟสปอตไลต์ น้ำเงิน-ทอง บันไดคะแนน ตัวช่วย 3 อย่าง จับเวลา เสียง แอนิเมชันเฉลย
   สถานะเกมเก็บใน Store.data.live (รีเฟรชหน้าแล้วเล่นต่อได้) จบเกมแล้วบันทึกลงประวัติผลอัตโนมัติ
   ===================================================================== */
(function () {
    'use strict';

    const L = Core.LETTERS;
    let timer = null;
    let busy = false;       // ระหว่างลุ้นเฉลย กันกดซ้ำ
    let paused = false;     // หยุดเวลาระหว่างใช้ตัวช่วย
    let last = 0;

    const g = () => Store.data.live;
    const S = () => Store.data.settings;
    const fmt = Core.fmt;
    const save = () => Store.commit('live', { quiet: true });

    function timeFor(q) { return S().time[(q.level || 1) - 1] || 0; }
    function startQuestion() {
        const game = g();
        const q = Core.question(game);
        game.timeLeft = timeFor(q);
        game.timeTotal = game.timeLeft;
        paused = false;
        save();
    }

    /* ---------- บันทึกผลเมื่อจบเกม ---------- */
    function recordIfDone() {
        const game = g();
        if (!game || game.status === 'play' || game.saved) return;
        game.saved = true;
        const r = Core.toResult(game);
        const i = Store.data.results.findIndex((x) => x.id === r.id);
        if (i >= 0) Store.data.results[i] = r; else Store.data.results.unshift(r);
        Store.commit('result');
    }

    /* ---------- ส่วนประกอบหน้าจอ ---------- */
    /** ข้อที่แสดงบนจอ (0-based): หลังตอบถูก idx เลื่อนไปข้อถัดไปแล้ว แต่ต้องโชว์ข้อที่เพิ่งเฉลยจนกว่าจะกด "ข้อต่อไป" */
    function shownIdx(game) {
        const justRight = game.phase === 'reveal' && (game.status === 'play' || game.status === 'win');
        return Math.min(justRight ? game.idx - 1 : game.idx, game.deck.length - 1);
    }
    /** ขั้นบันไดที่ไฮไลต์ */
    function curStep(game) {
        if (game.status === 'lose' || game.status === 'timeout') return 0;
        if (game.status === 'walk') return game.idx;
        return shownIdx(game) + 1;
    }
    function ladderHTML(game) {
        const rows = game.prizes.map((p, i) => {
            const step = i + 1;
            const cls = [step === curStep(game) ? 'cur' : '', step <= game.idx && step !== curStep(game) ? 'done' : '', game.safe.includes(step) || step === game.prizes.length ? 'safe' : ''].join(' ');
            return `<li class="${cls}"><span class="n">${step}</span><span class="p">${fmt(p)}</span>${game.safe.includes(step) ? '<i class="fas fa-shield-halved" title="จุดปลอดภัย"></i>' : step === game.prizes.length ? '<i class="fas fa-crown" title="รางวัลสูงสุด"></i>' : ''}</li>`;
        }).reverse().join('');
        return `<aside class="mq-ladder" aria-label="บันไดคะแนน"><div class="mq-ladder-h"><i class="fas fa-stairs"></i> บันได${U.esc(game.unit)}</div><ol>${rows}</ol>
            <div class="mq-ladder-f"><i class="fas fa-shield-halved"></i> จุดปลอดภัย = ตอบผิดแล้วยังได้คะแนนขั้นนี้</div></aside>`;
    }
    function lifelineBtn(k, game) {
        const def = Core.LIFELINES[k];
        const enabledInSettings = S().lifelines[k];
        if (!enabledInSettings) return '';
        const avail = game.lifelines[k] && game.status === 'play' && game.phase === 'ask';
        const used = !game.lifelines[k];
        return `<button type="button" class="mq-life${used ? ' used' : ''}" data-life="${k}" ${avail ? '' : 'disabled'} title="${U.esc(def.label)}${k === 'swap' && !game.spares.length && !used ? ' (ไม่มีข้อสำรอง)' : ''}">
            ${k === 'fifty' ? '<b>50:50</b>' : `<i class="fas ${def.icon}"></i>`}<small>${U.esc(def.short)}</small>${used ? '<span class="x"><i class="fas fa-xmark"></i></span>' : ''}</button>`;
    }
    function timerHTML(game) {
        if (!game.timeTotal || game.status !== 'play') return '<div class="mq-timer off" id="mq-timer"><i class="fas fa-infinity"></i></div>';
        const pct = Math.max(0, game.timeLeft / game.timeTotal);
        return `<div class="mq-timer${game.timeLeft <= 5 ? ' warn' : ''}" id="mq-timer" style="--p:${pct}"><b>${Math.ceil(game.timeLeft)}</b><small>วินาที</small></div>`;
    }
    function votesHTML(game) {
        if (!game.votes || game.status !== 'play') return '';
        return `<div class="mq-votes" id="mq-votes"><div class="mq-votes-h"><i class="fas fa-people-group"></i> เพื่อนในห้องโหวต</div>
            <div class="mq-bars">${game.votes.map((v, i) => `<div class="mq-bar${game.hidden.includes(i) ? ' off' : ''}"><span class="pc">${game.hidden.includes(i) ? '' : `${v}%`}</span><span class="col"><span style="--h:${v}%"></span></span><b>${L[i]}</b></div>`).join('')}</div></div>`;
    }
    function answersHTML(game) {
        const q = game.deck[shownIdx(game)];
        const last = game.log[game.log.length - 1];
        const showReveal = game.phase === 'reveal' || game.phase === 'over';
        return q.choices.map((c, i) => {
            const cls = ['mq-ans'];
            if (game.hidden.includes(i)) cls.push('gone');
            if (game.phase === 'locked' && game.picked === i) cls.push('locked');
            if (showReveal && last && !last.swapped) {
                if (i === last.answer) cls.push('right');
                else if (i === last.pick) cls.push('wrong');
            }
            return `<button type="button" class="${cls.join(' ')}" data-ans="${i}" ${game.phase === 'ask' && !game.hidden.includes(i) ? '' : 'tabindex="-1"'}><span class="lt">${L[i]}</span><span class="tx">${U.esc(c)}</span></button>`;
        }).join('');
    }
    function bannerHTML(game) {
        const last = game.log[game.log.length - 1];
        const u = U.esc(game.unit);
        if (game.status === 'win') {
            return `<div class="mq-banner win"><i class="fas fa-crown"></i><div><b>สุดยอด! ตอบถูกครบทุกข้อ</b><span>ได้รับ ${fmt(game.won)} ${u}</span></div>
                <div class="mq-banner-act"><button type="button" class="btn-x cta lg" data-act="cert"><i class="fas fa-award"></i>ออกเกียรติบัตรผู้ชนะ</button><button type="button" class="btn-x ghost lg" data-act="again"><i class="fas fa-rotate"></i>ผู้เล่นคนต่อไป</button></div></div>`;
        }
        if (game.status === 'walk') {
            return `<div class="mq-banner walk"><i class="fas fa-hand"></i><div><b>ขอหยุดรับคะแนน</b><span>ได้รับ ${fmt(game.won)} ${u}</span></div>
                <div class="mq-banner-act"><button type="button" class="btn-x cta lg" data-act="cert"><i class="fas fa-award"></i>ออกเกียรติบัตร</button><button type="button" class="btn-x ghost lg" data-act="again"><i class="fas fa-rotate"></i>ผู้เล่นคนต่อไป</button></div></div>`;
        }
        if (game.status === 'lose' || game.status === 'timeout') {
            const q = game.deck[game.idx];
            return `<div class="mq-banner lose"><i class="fas ${game.status === 'timeout' ? 'fa-hourglass-end' : 'fa-heart-crack'}"></i><div><b>${game.status === 'timeout' ? 'หมดเวลา!' : 'เสียใจด้วย ตอบไม่ถูก'}</b>
                <span>คำตอบที่ถูกคือ ${L[last.answer]}. ${U.esc(q.choices[last.answer])} • ได้รับ ${fmt(game.won)} ${u}${game.won ? ' (จุดปลอดภัย)' : ''}</span>${q.explain ? `<em>${U.esc(q.explain)}</em>` : ''}</div>
                <div class="mq-banner-act"><button type="button" class="btn-x orange lg" data-act="again"><i class="fas fa-rotate"></i>ผู้เล่นคนต่อไป</button><a class="btn-x ghost lg" href="#/results"><i class="fas fa-list"></i>ดูประวัติผล</a></div></div>`;
        }
        if (game.phase === 'reveal') {
            const q = game.deck[game.idx - 1];
            const safeNow = game.safe.includes(game.idx);
            return `<div class="mq-banner ok"><i class="fas fa-circle-check"></i><div><b>ถูกต้อง!${safeNow ? ' ถึงจุดปลอดภัยแล้ว' : ''}</b><span>สะสม ${fmt(Core.currentPrize(game))} ${u}</span>${q && q.explain ? `<em>${U.esc(q.explain)}</em>` : ''}</div>
                <div class="mq-banner-act"><button type="button" class="btn-x cta lg" data-act="next"><i class="fas fa-forward"></i>ข้อต่อไป <kbd>N</kbd></button></div></div>`;
        }
        return '';
    }
    function actionsHTML(game) {
        if (game.status !== 'play') return '';
        if (game.phase === 'locked') {
            return `<div class="mq-actions"><button type="button" class="btn-x cta lg mq-final" data-act="final"><i class="fas fa-lock"></i>ยืนยันคำตอบสุดท้าย <kbd>Enter</kbd></button>
                <button type="button" class="btn-x ghost lg" data-act="unlock"><i class="fas fa-rotate-left"></i>เปลี่ยนใจ</button></div>`;
        }
        if (game.phase === 'ask') {
            const now = Core.currentPrize(game);
            return `<div class="mq-actions"><span class="mq-hint"><i class="fas fa-hand-pointer"></i> แตะคำตอบ หรือกด 1–4 / ก–ง</span>
                ${game.idx > 0 ? `<button type="button" class="btn-x ghost" data-act="walk"><i class="fas fa-hand"></i>ขอหยุดรับ ${fmt(now)}</button>` : ''}</div>`;
        }
        return '';
    }

    function render(view) {
        const game = g();
        if (!game) {
            view.innerHTML = `<div class="panel"><div class="empty-state"><span class="ic-box lg"><i class="fas fa-gamepad"></i></span><h3>ยังไม่มีเกมที่กำลังเล่น</h3><p>เลือกชุดคำถามและผู้เล่น แล้วกดเริ่มเกม</p><a class="btn-x primary lg" href="#/new"><i class="fas fa-play"></i>เริ่มเกมใหม่</a></div></div>`;
            return;
        }
        const q = game.deck[shownIdx(game)];
        const stepNo = shownIdx(game) + 1;
        const lv = Core.LEVELS.find((l) => l.v === q.level) || Core.LEVELS[0];
        view.innerHTML = `
        <div class="mq-stage ph-${game.phase} st-${game.status}" id="mq-stage">
            <div class="mq-lights" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
            <div class="mq-top">
                <div class="mq-who"><span class="mq-av"><i class="fas ${game.mode === 'team' ? 'fa-users' : 'fa-user-graduate'}"></i></span>
                    <div><b>${U.esc(game.player)}</b><small>${U.esc([game.className, game.setName].filter(Boolean).join(' • '))}</small></div></div>
                <div class="mq-lifes">${['fifty', 'ask', 'swap'].map((k) => lifelineBtn(k, game)).join('')}</div>
                ${timerHTML(game)}
                <div class="mq-tools">
                    <button type="button" class="mq-tool" data-act="sound" title="เปิด/ปิดเสียง"><i class="fas ${S().sound ? 'fa-volume-high' : 'fa-volume-xmark'}"></i></button>
                    <button type="button" class="mq-tool" data-act="full" title="เต็มจอ (F)"><i class="fas fa-expand"></i></button>
                    <button type="button" class="mq-tool" data-act="quit" title="ออกจากเกม"><i class="fas fa-xmark"></i></button>
                </div>
            </div>
            <div class="mq-body">
                <div class="mq-play">
                    <div class="mq-step"><span>คำถามข้อที่ <b>${stepNo}</b> / ${game.deck.length}</span><span class="tag ${lv.cls}">${lv.label}</span><span>ชิง <b>${fmt(game.prizes[stepNo - 1])}</b> ${U.esc(game.unit)}</span></div>
                    <div class="mq-q" id="mq-q"><span>${U.esc(q.text)}</span></div>
                    <div class="mq-answers">${answersHTML(game)}</div>
                    ${actionsHTML(game)}
                    ${bannerHTML(game)}
                    ${votesHTML(game)}
                </div>
                ${ladderHTML(game)}
            </div>
            ${game.status === 'win' ? '<div class="mq-confetti" aria-hidden="true">' + Array.from({ length: 60 }, (_, i) => `<i style="--x:${(i * 37) % 100};--d:${(i % 7) * 0.35}s;--c:${['#ffd700', '#ff375f', '#30d158', '#0a84ff', '#bf5af2', '#ff9f0a'][i % 6]}"></i>`).join('') + '</div>' : ''}
        </div>`;
        bind(view);
    }

    let viewEl = null;
    function rerender() { if (viewEl && App.current === 'play') render(viewEl); }

    function bind(view) {
        view.querySelectorAll('[data-ans]').forEach((b) => { b.onclick = () => pick(Number(b.dataset.ans)); });
        view.querySelectorAll('[data-life]').forEach((b) => { b.onclick = () => lifeline(b.dataset.life); });
        view.querySelectorAll('[data-act]').forEach((b) => { b.onclick = () => act(b.dataset.act); });
    }

    function pick(i) {
        const game = g();
        if (busy || !game || game.status !== 'play') return;
        if (game.phase === 'locked' && game.picked !== i) Core.unlock(game);
        if (!Core.lock(game, i)) return;
        Sound.play('lock');
        save(); rerender();
    }
    async function finalAnswer() {
        const game = g();
        if (busy || !game || game.phase !== 'locked') return;
        busy = true;
        const stage = document.getElementById('mq-stage');
        if (stage) stage.classList.add('suspense');
        await new Promise((r) => setTimeout(r, Math.max(0, S().suspense) * 1000));
        const ok = Core.reveal(game);
        busy = false;
        Sound.play(ok ? (game.status === 'win' ? 'fanfare' : 'correct') : 'wrong');
        recordIfDone();
        save(); rerender();
    }
    function act(a) {
        const game = g();
        if (a === 'final') finalAnswer();
        else if (a === 'unlock') { Core.unlock(game); save(); rerender(); }
        else if (a === 'next') { if (Core.next(game)) { startQuestion(); Sound.play('show'); rerender(); } }
        else if (a === 'walk') walk();
        else if (a === 'again') { Store.data.live = null; save(); App.go('new', 'again=1'); }
        else if (a === 'cert') certNow();
        else if (a === 'full') toggleFull();
        else if (a === 'sound') { S().sound = !S().sound; Sound.set({ enabled: S().sound }); Store.commit('settings'); rerender(); }
        else if (a === 'quit') quit();
    }
    async function walk() {
        const game = g();
        const ok = await U.confirm('ขอหยุดรับคะแนน?', `${U.esc(game.player)} จะได้รับ <b>${fmt(Core.currentPrize(game))} ${U.esc(game.unit)}</b> และจบเกมทันที`, { confirmText: '<i class="fas fa-hand"></i> หยุดรับคะแนน', icon: 'question' });
        if (!ok) return;
        Core.walkAway(game);
        Sound.play('fanfare');
        recordIfDone(); save(); rerender();
    }
    async function quit() {
        const game = g();
        if (game.status === 'play') {
            const ok = await U.confirm('ออกจากเกมนี้?', 'เกมที่ยังเล่นไม่จบจะ<b>ไม่ถูกบันทึกผล</b>', { confirmText: 'ออกจากเกม', danger: true });
            if (!ok) return;
        }
        Store.data.live = null; save();
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        App.go('dashboard');
    }
    function certNow() {
        const r = Store.data.results.find((x) => x.id === g().id);
        if (!r) return;
        const c = Store.issueCert(r);
        U.toast(`ลงทะเบียนเกียรติบัตรเลขที่ <b>${c.no}/${c.year}</b> แล้ว`, { type: 'ok' });
        App.printCerts([c]);
    }
    function toggleFull() {
        const el = document.getElementById('mq-stage');
        if (!el) return;
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else if (el.requestFullscreen) el.requestFullscreen().catch(() => U.toast('เบราว์เซอร์นี้ไม่รองรับเต็มจอ — กด F11 แทนได้', { type: 'warn' }));
    }

    /* ---------- ตัวช่วย ---------- */
    async function lifeline(k) {
        const game = g();
        if (busy || !game || game.phase !== 'ask' || !game.lifelines[k]) return;
        if (k === 'fifty') { Core.useFifty(game); Sound.play('lifeline'); save(); rerender(); return; }
        if (k === 'swap') {
            const ok = await U.confirm('ขอเปลี่ยนคำถาม?', 'ระบบจะเปลี่ยนเป็นข้อสำรองระดับใกล้เคียงกัน (ใช้ได้ครั้งเดียว)', { confirmText: '<i class="fas fa-arrows-rotate"></i> เปลี่ยนคำถาม', icon: 'question' });
            if (!ok) return;
            Core.useSwap(game); startQuestion(); Sound.play('lifeline'); rerender();
            const q = document.getElementById('mq-q'); if (q) q.classList.add('flip');
            return;
        }
        if (k === 'ask') askClass();
    }
    async function askClass() {
        const game = g();
        const q = Core.question(game);
        paused = true;
        Sound.play('lifeline');
        const vis = [0, 1, 2, 3].filter((i) => !game.hidden.includes(i));
        const sim = S().askMode === 'sim';
        const r = await U.sheet({
            title: 'ถามเพื่อนในห้อง', icon: 'fa-people-group', sub: 'ให้เพื่อนยกมือเลือกคำตอบ แล้วครูกรอกจำนวน (หรือกดจำลองผลโหวต)', tone: ['#11083e', '#2d16a0', '#b8860b'],
            width: 620,
            body: `<div class="vote-grid">${vis.map((i) => `<div class="vote-row"><span class="lt">${L[i]}</span><span class="tx">${U.esc(q.choices[i])}</span>
                <button type="button" class="btn-x ghost sm" data-dec="${i}" aria-label="ลด"><i class="fas fa-minus"></i></button>
                <input type="number" inputmode="numeric" min="0" max="200" class="form-control" id="vote-${i}" value="0">
                <button type="button" class="btn-x primary sm" data-inc="${i}" aria-label="เพิ่ม"><i class="fas fa-plus"></i></button></div>`).join('')}</div>
                <div class="form-text mt-2"><i class="fas fa-circle-info"></i> เวลาหยุดนับระหว่างใช้ตัวช่วยนี้</div>`,
            confirmText: '<i class="fas fa-chart-column"></i> แสดงกราฟโหวต',
            denyText: '<i class="fas fa-shuffle"></i> จำลองผลโหวต',
            denyClass: sim ? 'cta' : 'ghost',
            didOpen: (el) => {
                el.querySelectorAll('[data-inc]').forEach((b) => { b.onclick = () => { const x = el.querySelector(`#vote-${b.dataset.inc}`); x.value = Number(x.value || 0) + 1; }; });
                el.querySelectorAll('[data-dec]').forEach((b) => { b.onclick = () => { const x = el.querySelector(`#vote-${b.dataset.dec}`); x.value = Math.max(0, Number(x.value || 0) - 1); }; });
            },
            preConfirm: () => {
                const counts = [0, 1, 2, 3].map((i) => (vis.includes(i) ? Math.max(0, Number(document.getElementById(`vote-${i}`).value) || 0) : 0));
                if (!counts.some(Boolean)) { Swal.showValidationMessage('กรอกจำนวนผู้โหวตอย่างน้อย 1 คน หรือกด "จำลองผลโหวต"'); return false; }
                return counts;
            },
        });
        paused = false;
        if (r.isConfirmed) Core.useAsk(game, Core.countsToPct(r.value));
        else if (r.isDenied) Core.useAsk(game, Core.simulateVotes(q, game.hidden, game.seed + game.idx * 13));
        else return;
        save(); rerender();
    }

    /* ---------- จับเวลา ---------- */
    function tick() {
        const game = g();
        const now = performance.now();
        const dt = (now - last) / 1000;
        last = now;
        if (!game || App.current !== 'play' || game.status !== 'play' || game.phase !== 'ask' || paused || busy || !game.timeTotal || Swal.isVisible()) return;
        const before = Math.ceil(game.timeLeft);
        game.timeLeft = Math.max(0, game.timeLeft - dt);
        const after = Math.ceil(game.timeLeft);
        const el = document.getElementById('mq-timer');
        if (el) { el.style.setProperty('--p', game.timeLeft / game.timeTotal); el.classList.toggle('warn', game.timeLeft <= 5); const b = el.querySelector('b'); if (b) b.textContent = after; }
        if (after !== before && after <= 5 && after > 0) Sound.play('tick');
        if (game.timeLeft <= 0) { Core.timeout(game); Sound.play('timeup'); recordIfDone(); save(); rerender(); }
        else if (after !== before && after % 5 === 0) Store.commit('live', { quiet: true });
    }

    function key(e) {
        const game = g();
        if (!game || Swal.isVisible()) return;
        const t = e.target;
        if (t && (/input|textarea|select/i.test(t.tagName) || t.isContentEditable)) return;
        const map = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3, 'ก': 0, 'ข': 1, 'ค': 2, 'ง': 3 };
        const k = e.key.toLowerCase();
        if (k in map && game.phase !== 'reveal') { pick(map[k]); e.preventDefault(); }
        else if (k === 'enter' && game.phase === 'locked') { finalAnswer(); e.preventDefault(); }
        else if ((k === 'n' || k === ' ') && game.phase === 'reveal' && game.status === 'play') { act('next'); e.preventDefault(); }
        else if (k === 'f') toggleFull();
    }

    /** เริ่มเกมใหม่ */
    function start(set, who) {
        const game = Core.newGame(set, S(), who);
        Store.data.live = game;
        startQuestion();
        Sound.play('show');
        App.go('play');
    }

    window.Views = window.Views || {};
    window.Views.play = {
        title: 'หน้าจอเกม', icon: 'fa-gamepad',
        render(view) { viewEl = view; document.body.classList.add('is-playing'); render(view); },
        leave() { document.body.classList.remove('is-playing'); },
        key,
    };
    window.Stage = { start, recordIfDone };
    last = performance.now();
    timer = setInterval(tick, 200);
    void timer;
})();
