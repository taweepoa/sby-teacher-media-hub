/* =====================================================================
   หน้าแข่งขัน: ตั้งค่าการแข่ง → เวที (เปิดรับการกด · ใครกดก่อนล็อก · ลำดับ/เวลา ms ·
   กรรมการกดถูก/ผิด · ส่งสิทธิ์ทีมถัดไป) · กระดานคะแนนเต็มจอ · ประกาศผู้ชนะ + พลุ
   สถานะ (phase): idle = รอเปิดรับ · count = นับถอยหลัง · open = กดได้ · locked = มีทีมได้สิทธิ์ตอบ · reveal = เฉลยแล้ว
   ===================================================================== */
(function () {
    'use strict';
    const $ = (s, r) => (r || document).querySelector(s);
    const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
    const esc = U.esc;
    const D = () => Store.data;

    let el = null;          // กล่องหน้าจอ
    let cur = null;         // ข้อปัจจุบัน
    let tAns = 0, tCount = 0, tTick = 0;
    let answerLeft = 0;
    let flash = '';         // ข้อความแจ้งชั่วคราว

    const live = () => D().matches.find((m) => m.status === 'live');
    const teamOf = (id) => (live() ? live().teams.find((t) => t.id === id) : null);
    const ptsOf = (q) => Number(q && q.points) || Number(D().settings.points) || 10;

    function newCur(m) {
        const L = m.live;
        const q = L.oral ? { id: '', text: '', answer: '', img: '', cat: 'ถามปากเปล่า', points: '' } : (D().questions.find((x) => x.id === L.queue[L.pos]) || { id: '', text: '(ไม่พบคำถามในคลัง)', answer: '' });
        return { q: Object.assign({}, q), presses: [], events: [], excluded: [], phase: 'idle', openAt: 0, ansIdx: -1, revealed: false };
    }

    const Game = {
        /* ---------------- หน้าจอ ---------------- */
        view(container) {
            el = container;
            const m = live();
            if (!m) return setupView();
            if (!cur) cur = newCur(m);
            stageView();
        },
        leave() { stopTimers(); closeOverlays(); document.body.classList.remove('stage-full'); },
        reset() { stopTimers(); cur = null; },

        /* ---------------- การกด ---------------- */
        arm() {
            const m = live(); if (!m || !cur) return;
            if (cur.phase === 'locked' || cur.phase === 'open' || cur.phase === 'count') return;
            if (cur.phase === 'reveal') return Game.next();
            const remain = m.teams.filter((t) => !cur.excluded.includes(t.id));
            if (!remain.length) { toastStage('ไม่มีทีมที่เหลือสิทธิ์ตอบ — กด R เปิดเฉลย หรือ N ข้อถัดไป'); return; }
            Sound.unlock();
            const delay = Math.max(0, Math.min(5, Number(D().settings.armDelay) || 0));
            if (delay) {
                cur.phase = 'count'; cur.count = delay; render();
                tCount = setInterval(() => {
                    cur.count--; Sound.tick();
                    if (cur.count <= 0) { clearInterval(tCount); openNow(); } else render();
                }, 1000);
            } else openNow();
        },
        /** ทีมกดปุ่ม — บันทึกเวลาทันที (performance.now) ก่อนวาดหน้าจอ */
        press(teamId, msOverride) {
            const now = performance.now();
            const m = live(); if (!m || !cur) return;
            const t = teamOf(teamId); if (!t) return;
            if (cur.phase === 'idle' || cur.phase === 'count') { pulse(teamId, 'early'); return; }
            if (cur.phase === 'reveal' || cur.excluded.includes(teamId) || cur.presses.some((p) => p.team === teamId && p.round === cur.round)) return;
            if (cur.phase !== 'open' && cur.phase !== 'locked') return;
            const ms = msOverride != null ? msOverride : Math.round(now - cur.openAt);
            cur.presses.push({ team: teamId, ms, round: cur.round });
            if (cur.phase === 'open') {
                cur.phase = 'locked';
                cur.ansIdx = cur.presses.length - 1;
                Sound.buzz();
                startAnswerTimer();
            }
            render();
            pulse(teamId, 'hit');
        },
        correct() {
            if (!cur || cur.phase !== 'locked') return;
            const p = cur.presses[cur.ansIdx];
            addEvent(p.team, 'ok', ptsOf(cur.q));
            cur.phase = 'reveal'; cur.revealed = true;
            stopTimers(); Sound.correct();
            flash = `${(teamOf(p.team) || {}).name} ตอบถูก +${ptsOf(cur.q)}`;
            render();
        },
        wrong() {
            if (!cur || cur.phase !== 'locked') return;
            const st = D().settings;
            const p = cur.presses[cur.ansIdx];
            addEvent(p.team, 'bad', -Math.max(0, Number(st.penalty) || 0));
            cur.excluded.push(p.team);
            stopTimers(); Sound.wrong();
            const m = live();
            flash = `${(teamOf(p.team) || {}).name} ตอบผิด${Number(st.penalty) ? ` −${st.penalty}` : ''}`;
            if (!st.allowPass) { cur.phase = 'reveal'; cur.revealed = true; render(); return; }
            // ส่งสิทธิ์ให้ทีมที่กดถัดไป (ในรอบเดียวกัน) ถ้ามี
            const nextIdx = cur.presses.findIndex((x, i) => i > cur.ansIdx && !cur.excluded.includes(x.team));
            if (nextIdx >= 0) { cur.ansIdx = nextIdx; cur.phase = 'locked'; startAnswerTimer(); flash += ` → สิทธิ์ตอบ: ${(teamOf(cur.presses[nextIdx].team) || {}).name}`; }
            else if (m.teams.some((t) => !cur.excluded.includes(t.id))) { cur.phase = 'idle'; cur.ansIdx = -1; flash += ' → กด Space เปิดรับการกดใหม่ให้ทีมที่เหลือ'; }
            else { cur.phase = 'reveal'; cur.revealed = true; }
            render();
        },
        reveal() { if (!cur) return; stopTimers(); cur.revealed = true; cur.phase = 'reveal'; render(); },
        next() {
            const m = live(); if (!m || !cur) return;
            if (cur.phase === 'locked') { toastStage('ยังมีทีมรอตอบ — กด Enter (ถูก) หรือ X (ผิด) ก่อน'); return; }
            commit(m);
            const L = m.live;
            if (!L.oral && L.pos >= L.queue.length - 1) { Store.save(); render(); Game.end(); return; }
            L.pos++;
            cur = newCur(m); flash = '';
            Store.save(); render();
        },
        adjust(teamId, delta) { const m = live(); if (!m || !cur) return; addEvent(teamId, 'adj', delta); render(); },
        async end() {
            const m = live(); if (!m) return;
            const ok = await U.confirm('จบการแข่งขัน?', 'ระบบจะบันทึกผลลงทะเบียนการแข่งขัน และประกาศผู้ชนะ', { confirmText: 'จบการแข่งขัน', icon: 'question' });
            if (!ok) return;
            commit(m);
            m.status = 'done'; m.finishedAt = new Date().toISOString(); delete m.live;
            stopTimers(); cur = null;
            Store.save(); Store.flush();
            App.go('results', `id=${m.id}`);
            setTimeout(() => Game.showWinner(m), 120); // หลังเปลี่ยนหน้า (เปลี่ยนหน้าจะปิดหน้าต่างซ้อนทั้งหมด)
        },

        /* ---------------- กระดานคะแนน / ผู้ชนะ ---------------- */
        toggleBoard() {
            const ov = $('.board-ov');
            if (ov) { ov.remove(); return; }
            const m = live() || D().matches.filter((x) => x.status === 'done').slice(-1)[0];
            if (!m) return;
            const rk = Core.ranking(m);
            const max = Math.max(1, ...rk.map((t) => t.score));
            const div = document.createElement('div');
            div.className = 'board-ov';
            div.innerHTML = `<div class="bo-head"><div><small>กระดานคะแนน</small><h2>${esc(m.name)}</h2></div><button class="bo-close" aria-label="ปิด"><i class="fas fa-xmark"></i></button></div>
                <div class="bo-list">${rk.map((t) => `<div class="bo-row" style="--tc:${esc(t.color)}"><span class="bo-rank">${t.rank}</span><span class="bo-name">${esc(t.name)}</span>
                <div class="bo-track"><i style="width:${Math.max(4, (Math.max(0, t.score) / max) * 100)}%"></i></div><b class="bo-score">${t.score}</b></div>`).join('')}</div>
                <p class="bo-foot">ข้อที่ตอบแล้ว ${(m.log || []).length} ข้อ · กด B หรือ Esc เพื่อปิด</p>`;
            document.body.appendChild(div);
            div.querySelector('.bo-close').onclick = () => div.remove();
        },
        showWinner(m) {
            closeOverlays();
            const rk = Core.ranking(m);
            const prizes = D().prizes;
            const top = rk.filter((t) => t.rank === 1);
            const div = document.createElement('div');
            div.className = 'win-ov';
            div.innerHTML = `<div class="wo-box"><i class="fas fa-crown wo-crown"></i><small>${esc(m.name)}</small>
                <h1>${top.map((t) => `<span style="color:${esc(t.color)}">${esc(t.name)}</span>`).join(' และ ')}</h1>
                <p class="wo-sub">${esc((prizes[0] || {}).label || 'ชนะเลิศ')} · ${top[0] ? top[0].score : 0} คะแนน</p>
                <div class="podium big">${[1, 0, 2].map((i) => rk[i] ? `<div class="pd pd-${i + 1}" style="--tc:${esc(rk[i].color)}"><span class="pd-name">${esc(rk[i].name)}</span><span class="pd-score">${rk[i].score}</span><div class="pd-bar"><b>${rk[i].rank}</b></div></div>` : '').join('')}</div>
                <button class="btn-x cta lg wo-close"><i class="fas fa-check"></i>ปิด</button></div>`;
            document.body.appendChild(div);
            div.querySelector('.wo-close').onclick = () => { div.remove(); FX.stop(); };
            Sound.unlock(); Sound.fanfare(); FX.celebrate(7000);
        },
        fullscreen() {
            document.body.classList.toggle('stage-full');
            const on = document.body.classList.contains('stage-full');
            try { if (on && !document.fullscreenElement) document.documentElement.requestFullscreen(); else if (!on && document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* บางเบราว์เซอร์ไม่รองรับ */ }
        },
        /** เริ่มการแข่งด้วยค่าเริ่มต้น (ใช้ในการถ่ายภาพ/ทดสอบ) */
        quickStart(opts) { return startMatch(Object.assign(defaults(), opts || {})); },
        get cur() { return cur; },
    };

    function openNow() {
        cur.phase = 'open';
        cur.round = (cur.round || 0) + 1;
        cur.openAt = performance.now();
        Sound.open(); render();
    }
    function addEvent(team, result, delta) {
        const m = live();
        cur.events.push({ team, result, delta });
        m.scores[team] = (Number(m.scores[team]) || 0) + delta;
        Store.save();
    }
    function commit(m) {
        if (!cur) return;
        const used = cur.presses.length || cur.events.length || !m.live.oral;
        if (!used) return;
        m.log.push({ no: m.log.length + 1, qid: cur.q.id, text: cur.q.text || `คำถามข้อที่ ${m.log.length + 1} (ถามปากเปล่า)`, answer: cur.q.answer || '', points: ptsOf(cur.q),
            presses: cur.presses.map((p) => ({ team: p.team, ms: p.ms })), events: cur.events.slice() });
        cur.presses = []; cur.events = [];
    }
    function stopTimers() { clearInterval(tAns); clearInterval(tCount); clearInterval(tTick); tAns = tCount = tTick = 0; }
    function startAnswerTimer() {
        clearInterval(tAns);
        const sec = Math.max(0, Number(D().settings.answerSec) || 0);
        answerLeft = sec;
        if (!sec) return;
        const t0 = performance.now();
        tAns = setInterval(() => {
            const left = Math.max(0, sec - (performance.now() - t0) / 1000);
            const whole = Math.ceil(left);
            if (whole !== Math.ceil(answerLeft) && whole <= 5 && whole > 0) Sound.tick();
            answerLeft = left;
            const bar = $('#stg-timer'); if (bar) { bar.style.setProperty('--p', `${(left / sec) * 100}%`); bar.querySelector('b').textContent = whole; bar.classList.toggle('low', left <= 5); }
            if (left <= 0) { clearInterval(tAns); Sound.timeup(); flash = 'หมดเวลา! กรรมการกด X (ผิด) หรือ Enter (ถูก)'; render(); }
        }, 100);
    }
    function pulse(teamId, cls) {
        $$(`.pad[data-team="${teamId}"]`).forEach((p) => { p.classList.remove(cls); void p.offsetWidth; p.classList.add(cls); });
    }
    function toastStage(msg) { flash = msg; render(); }
    function closeOverlays() { $$('.board-ov, .win-ov').forEach((x) => x.remove()); }

    /* ---------------- ตั้งค่าการแข่ง ---------------- */
    function defaults() {
        const d = D();
        return { name: Core.PRESETS.matchName[0], level: Core.PRESETS.level[2], place: Core.PRESETS.place[0], organizer: Core.PRESETS.organizer[0], date: Core.iso(new Date()),
            judges: ['', ''], teamIds: d.teams.map((t) => t.id), oral: !d.questions.length, cats: [], order: 'seq', count: 0 };
    }
    function startMatch(o) {
        const d = D();
        const teams = d.teams.filter((t) => o.teamIds.includes(t.id));
        if (teams.length < 2) { U.alert('ต้องมีอย่างน้อย 2 ทีม', 'ไปที่เมนู "ทีมและปุ่มกด" เพื่อเพิ่มทีม', 'warning'); return false; }
        let queue = [];
        if (!o.oral) {
            queue = d.questions.filter((q) => !o.cats.length || o.cats.includes(q.cat)).map((q) => q.id);
            if (o.order === 'rand') queue.sort(() => Math.random() - 0.5);
            if (o.count > 0) queue = queue.slice(0, o.count);
            if (!queue.length) { U.alert('ไม่มีคำถามในหมวดที่เลือก', 'เลือกหมวดอื่น เพิ่มคำถาม หรือใช้โหมด "ถามปากเปล่า"', 'warning'); return false; }
        }
        const m = {
            id: U.uid('m'), regNo: d.nextRegNo++, name: o.name, level: o.level, place: o.place, organizer: o.organizer, date: o.date,
            judges: o.judges.filter(Boolean), teams: teams.map((t) => ({ id: t.id, name: t.name, color: t.color, key: t.key, members: t.members })),
            scores: Object.fromEntries(teams.map((t) => [t.id, 0])), log: [], status: 'live', createdAt: new Date().toISOString(),
            live: { oral: !!o.oral, queue, pos: 0 },
        };
        d.matches.push(m);
        cur = newCur(m); flash = '';
        Store.save();
        if (el) stageView();
        return m;
    }
    function setupView() {
        const d = D();
        const o = defaults();
        const cats = [...new Set(d.questions.map((q) => q.cat).filter(Boolean))];
        const dl = (id, list) => `<datalist id="${id}">${list.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>`;
        el.innerHTML = `
        <section class="hero"><div class="hero-main"><span class="hero-icon"><i class="fas fa-bolt"></i></span>
            <div><h2 class="hero-title">เริ่มการแข่งขันใหม่</h2><p class="hero-sub">เลือกจากรายการสำเร็จรูป หรือพิมพ์เองได้ทุกช่อง · เลขที่ทะเบียนการแข่งขัน: ${d.nextRegNo}</p></div></div></section>
        <div class="setup-grid">
            <div class="panel panel--pink"><div class="panel-head"><span class="ic-box sm"><i class="fas fa-flag-checkered"></i></span><div><h3>รายละเอียดการแข่งขัน</h3><small>ใช้ในรายงานและประกาศผล</small></div></div>
            <div class="panel-body"><div class="field-row">
                <div><label class="form-label">การแข่งขันตอบปัญหา...</label><input class="form-control" id="s-name" list="dl-mn" value="${esc(o.name)}"></div>
                <div><label class="form-label">ระดับชั้น</label><input class="form-control" id="s-level" list="dl-lv" value="${esc(o.level)}"></div>
                <div><label class="form-label">สถานที่</label><input class="form-control" id="s-place" list="dl-pl" value="${esc(o.place)}"></div>
                <div><label class="form-label">วันที่แข่งขัน</label><input class="form-control" type="date" id="s-date" value="${o.date}"></div></div>
                <label class="form-label mt-2">ผู้จัด</label><input class="form-control" id="s-org" list="dl-og" value="${esc(o.organizer)}">
                <div class="field-row mt-2"><div><label class="form-label">กรรมการตัดสิน คนที่ 1</label><input class="form-control" id="s-j1" placeholder="ชื่อ-สกุล (ไม่บังคับ)"></div>
                <div><label class="form-label">กรรมการตัดสิน คนที่ 2</label><input class="form-control" id="s-j2" placeholder="ชื่อ-สกุล (ไม่บังคับ)"></div></div>
                ${dl('dl-mn', Core.PRESETS.matchName)}${dl('dl-lv', Core.PRESETS.level)}${dl('dl-pl', Core.PRESETS.place)}${dl('dl-og', Core.PRESETS.organizer)}
            </div></div>
            <div class="panel panel--purple"><div class="panel-head"><span class="ic-box sm"><i class="fas fa-circle-question"></i></span><div><h3>ทีมและคำถาม</h3><small>${d.teams.length} ทีม · คลัง ${d.questions.length} ข้อ</small></div></div>
            <div class="panel-body">
                <label class="form-label">ทีมที่ลงแข่ง</label>
                <div class="team-chips">${d.teams.map((t) => `<label class="team-chip pick" style="--tc:${esc(t.color)}"><input type="checkbox" value="${t.id}" checked class="s-team"><kbd>${esc(Core.keyLabel(t.key))}</kbd>${esc(t.name)}</label>`).join('') || '<a href="#/teams" class="btn-x primary sm">ตั้งทีมก่อน</a>'}</div>
                <label class="form-label mt-3">แหล่งคำถาม</label>
                <div class="seg full" id="s-mode"><button type="button" data-m="bank" class="${o.oral ? '' : 'active'}"><i class="fas fa-database"></i>คลังคำถาม</button><button type="button" data-m="oral" class="${o.oral ? 'active' : ''}"><i class="fas fa-microphone"></i>ถามปากเปล่า</button></div>
                <div id="s-bank" class="mt-2"${o.oral ? ' hidden' : ''}>
                    <div class="team-chips">${cats.map((c) => `<label class="team-chip pick"><input type="checkbox" class="s-cat" value="${esc(c)}">${esc(c)} <small>(${d.questions.filter((q) => q.cat === c).length})</small></label>`).join('')}</div>
                    <small class="text-muted-2">ไม่เลือกหมวด = ใช้ทุกหมวด</small>
                    <div class="field-row mt-2"><div><label class="form-label">ลำดับคำถาม</label><select class="form-select" id="s-order"><option value="seq">ตามลำดับในคลัง</option><option value="rand">สุ่มลำดับ</option></select></div>
                    <div><label class="form-label">จำนวนข้อ (0 = ทั้งหมด)</label><input class="form-control" type="number" min="0" id="s-count" value="0" inputmode="numeric"></div></div>
                </div>
                <p id="s-oral" class="note mt-2"${o.oral ? '' : ' hidden'}><i class="fas fa-microphone"></i><span>ครูอ่านคำถามเอง ระบบทำหน้าที่จับว่าใครกดก่อน ให้คะแนน และจับเวลา (พิมพ์คำถาม/เฉลยลงบันทึกได้ระหว่างแข่ง)</span></p>
                <button class="btn-x cta lg w-100 mt-3" id="s-go"><i class="fas fa-play"></i>เริ่มการแข่งขัน</button>
            </div></div>
        </div>`;
        let oral = o.oral;
        $$('#s-mode button').forEach((b) => { b.onclick = () => { oral = b.dataset.m === 'oral'; $$('#s-mode button').forEach((x) => x.classList.toggle('active', x === b)); $('#s-bank').hidden = oral; $('#s-oral').hidden = !oral; }; });
        $('#s-go').onclick = () => {
            Sound.unlock();
            const r = startMatch({ name: $('#s-name').value.trim() || 'ความรู้รอบตัว', level: $('#s-level').value.trim(), place: $('#s-place').value.trim(), organizer: $('#s-org').value.trim(), date: $('#s-date').value || Core.iso(new Date()),
                judges: [$('#s-j1').value.trim(), $('#s-j2').value.trim()], teamIds: $$('.s-team:checked').map((x) => x.value), oral, cats: $$('.s-cat:checked').map((x) => x.value), order: $('#s-order').value, count: Math.max(0, +$('#s-count').value || 0) });
            if (r) U.toast('เริ่มการแข่งขันแล้ว — กด Space เพื่อเปิดรับการกด', { type: 'ok' });
        };
    }

    /* ---------------- เวที ---------------- */
    function stageView() {
        el.innerHTML = '<div class="stage" id="stage"></div>';
        render();
    }
    function render() {
        const box = $('#stage');
        const m = live();
        if (!box || !m || !cur) return;
        const L = m.live;
        const total = L.oral ? '' : ` / ${L.queue.length}`;
        const first = cur.ansIdx >= 0 ? cur.presses[cur.ansIdx] : null;
        const ft = first ? teamOf(first.team) : null;
        const ph = cur.phase;
        const banner = {
            idle: `<i class="fas fa-hand"></i>รอเปิดรับการกด <kbd>Space</kbd>`,
            count: `<span class="cd">${cur.count}</span>เตรียมตัว...`,
            open: `<i class="fas fa-bolt"></i>กดได้เลย!`,
            locked: ft ? `<i class="fas fa-lock"></i>${esc(ft.name)} ได้สิทธิ์ตอบ <small>${(first.ms / 1000).toFixed(3)} วินาที</small>` : '',
            reveal: `<i class="fas fa-lightbulb"></i>เฉลยแล้ว — <kbd>N</kbd> ข้อถัดไป`,
        }[ph];
        const q = cur.q;
        const sec = Number(D().settings.answerSec) || 0;
        box.innerHTML = `
        <div class="stg-head">
            <div class="stg-title"><span class="ic-box sm"><i class="fas fa-bolt"></i></span><div><b>${esc(m.name)}</b><small>ข้อที่ ${L.pos + 1}${total} · ${esc(q.cat || '')}</small></div></div>
            <div class="stg-tools"><button class="btn-x ghost sm" data-a="board"><i class="fas fa-chart-simple"></i><span>กระดานคะแนน</span></button>
            <button class="btn-x ghost sm" data-a="full"><i class="fas fa-expand"></i><span>เต็มจอ</span></button>
            <button class="btn-x orange sm" data-a="end"><i class="fas fa-flag-checkered"></i><span>จบการแข่งขัน</span></button></div>
        </div>
        <div class="stg-main">
            <div class="stg-q ph-${ph}"${ft && ph === 'locked' ? ` style="--tc:${esc(ft.color)}"` : ''}>
                <div class="stg-banner">${banner}</div>
                ${flash ? `<div class="stg-flash">${esc(flash)}</div>` : ''}
                <div class="q-card">
                    ${L.oral ? `<div class="oral"><i class="fas fa-microphone-lines"></i><span>ครูอ่านคำถามข้อที่ ${L.pos + 1}</span>
                        <input class="form-control" id="oq-text" placeholder="พิมพ์คำถามเพื่อบันทึกผล (ไม่บังคับ)" value="${esc(q.text)}"><input class="form-control" id="oq-ans" placeholder="เฉลย (ไม่บังคับ)" value="${esc(q.answer)}"></div>`
                        : `${q.img ? `<img class="q-img" src="${esc(q.img)}" alt="ภาพประกอบคำถาม">` : ''}<div class="q-text">${esc(q.text)}</div>
                        <div class="q-ans${cur.revealed ? ' show' : ''}"><i class="fas fa-key"></i>${cur.revealed ? `เฉลย: <b>${esc(q.answer || '-')}</b>` : 'เฉลยถูกซ่อนไว้ (กด R เพื่อเปิด)'}</div>
                        <div class="q-pts">${ptsOf(q)} คะแนน</div>`}
                </div>
                ${ph === 'locked' && sec ? `<div class="stg-timer" id="stg-timer" style="--p:${(answerLeft / sec) * 100}%"><i></i><b>${Math.ceil(answerLeft)}</b></div>` : ''}
            </div>
            <aside class="stg-order"><h4><i class="fas fa-list-ol"></i>ลำดับการกด</h4>
                ${cur.presses.length ? `<ol>${cur.presses.map((p, i) => { const t = teamOf(p.team) || {}; const out = cur.excluded.includes(p.team); return `<li class="${i === cur.ansIdx && ph === 'locked' ? 'now' : ''}${out ? ' out' : ''}" style="--tc:${esc(t.color)}"><span class="o-no">${i + 1}</span><b>${esc(t.name)}</b><small>${(p.ms / 1000).toFixed(3)} วิ${i ? ` (+${((p.ms - cur.presses[0].ms) / 1000).toFixed(3)})` : ''}</small>${out ? '<i class="fas fa-xmark"></i>' : ''}</li>`; }).join('')}</ol>`
                    : '<p class="text-muted-2 small mb-0">ยังไม่มีทีมกด</p>'}
                ${cur.events.length ? `<h4 class="mt-3"><i class="fas fa-gavel"></i>ผลข้อนี้</h4>${cur.events.map((e) => `<div class="ev"><span class="tag ${e.result === 'ok' ? 'ok' : e.result === 'bad' ? 'bad' : 'info'}">${e.delta > 0 ? '+' : ''}${e.delta}</span>${esc((teamOf(e.team) || {}).name)}</div>`).join('')}` : ''}
            </aside>
        </div>
        <div class="stg-teams" style="--n:${m.teams.length}">${m.teams.map((t) => {
            const pi = cur.presses.findIndex((p) => p.team === t.id);
            const st = cur.excluded.includes(t.id) ? 'out' : (first && first.team === t.id && ph === 'locked') ? 'first' : pi >= 0 ? 'pressed' : '';
            return `<div class="pad ${st}" style="--tc:${esc(t.color)}" data-team="${t.id}" role="button" tabindex="0" aria-label="ปุ่มกดของ ${esc(t.name)}">
                <span class="pad-key">${esc(Core.keyLabel(t.key))}</span>${pi >= 0 ? `<span class="pad-ord">${pi + 1}</span>` : ''}
                <span class="pad-name">${esc(t.name)}</span><span class="pad-score">${Number(m.scores[t.id]) || 0}</span>
                <span class="pad-adj"><button data-adj="-1" data-t="${t.id}" aria-label="ลดคะแนน" data-demo-allow>−</button><button data-adj="1" data-t="${t.id}" aria-label="เพิ่มคะแนน">+</button></span></div>`;
        }).join('')}</div>
        <div class="stg-ctrl">
            <button class="btn-x primary lg" data-a="arm"${['idle', 'reveal'].includes(ph) ? '' : ' disabled'}><i class="fas fa-${ph === 'reveal' ? 'forward' : 'bolt'}"></i>${ph === 'reveal' ? 'ข้อถัดไป' : 'เปิดรับการกด'} <kbd>Space</kbd></button>
            <button class="btn-x green lg" data-a="ok"${ph === 'locked' ? '' : ' disabled'}><i class="fas fa-check"></i>ถูก <kbd>Enter</kbd></button>
            <button class="btn-x orange lg" data-a="bad"${ph === 'locked' ? '' : ' disabled'}><i class="fas fa-xmark"></i>ผิด <kbd>X</kbd></button>
            <button class="btn-x ghost lg" data-a="reveal"><i class="fas fa-key"></i>เฉลย <kbd>R</kbd></button>
            <button class="btn-x ghost lg" data-a="next"><i class="fas fa-forward-step"></i>ข้อถัดไป <kbd>N</kbd></button>
        </div>`;
        const act = { board: Game.toggleBoard, full: Game.fullscreen, end: Game.end, arm: Game.arm, ok: Game.correct, bad: Game.wrong, reveal: Game.reveal, next: Game.next };
        $$('[data-a]', box).forEach((b) => { b.onclick = () => act[b.dataset.a](); });
        $$('.pad', box).forEach((p) => {
            p.addEventListener('pointerdown', (e) => { if (e.target.closest('.pad-adj')) return; e.preventDefault(); Game.press(p.dataset.team); });
        });
        $$('[data-adj]', box).forEach((b) => { b.onclick = (e) => { e.stopPropagation(); Game.adjust(b.dataset.t, (+b.dataset.adj) * ptsOf(cur.q)); }; });
        const oq = $('#oq-text', box), oa = $('#oq-ans', box);
        if (oq) { oq.oninput = () => { cur.q.text = oq.value; }; oa.oninput = () => { cur.q.answer = oa.value; }; }
    }

    /* ---------------- คีย์บอร์ด ---------------- */
    window.addEventListener('keydown', (e) => {
        if (App.route !== 'play' || !live() || !cur) return;
        if (Swal.isVisible()) return;
        if (e.code === 'Escape') { closeOverlays(); FX.stop(); return; }
        if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName)) return;
        if (e.repeat) { e.preventDefault(); return; }
        const t = live().teams.find((x) => x.key && x.key === e.code);
        if (t) { e.preventDefault(); Game.press(t.id); return; }
        const map = { Space: Game.arm, Enter: Game.correct, NumpadEnter: Game.correct, KeyX: Game.wrong, KeyR: Game.reveal, KeyN: Game.next, KeyB: Game.toggleBoard, KeyF: Game.fullscreen };
        if (map[e.code]) { e.preventDefault(); map[e.code](); }
    });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) document.body.classList.remove('stage-full'); });

    window.Game = Game;
})();
