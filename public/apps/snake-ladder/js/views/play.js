/* =====================================================================
   เล่นเกม: ตั้งค่าเกม (ชุดคำถาม กระดาน ทีม กติกา) → กระดานบันไดงู ทอยเต๋า เดินหมาก ตอบคำถาม → ประกาศผู้ชนะ
   หน้าจอเกมทั้งหมดอยู่ใน .game (กดเต็มจอแล้วหน้าต่างคำถาม/ผู้ชนะยังอยู่ในจอ)
   แป้นลัด: Space/Enter ทอยเต๋า/ไปต่อ • 1–4 เลือกคำตอบ • F เต็มจอ • M เปิด/ปิดเสียง
   ===================================================================== */
(function () {
    'use strict';
    const esc = U.esc;
    let root = null;
    let setup = null; // ค่าที่เลือกในหน้าตั้งค่าเกม
    let busy = false; // ระหว่างแอนิเมชัน ห้ามกดซ้ำ
    let timer = null;
    let qState = null; // สถานะหน้าต่างคำถาม { q, t0, left, answered, ok, given }
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const live = () => Store.data.live;
    const teamOf = (g, id) => g.teams.find((t) => t.id === id);

    /* ======================= หน้าตั้งค่าเกม ======================= */
    function initSetup(params) {
        const d = Store.data;
        const st = d.settings;
        const set = Store.set(params.set) || Store.set(st.setId) || d.sets[0] || null;
        const board = Store.board(params.board) || Store.board(st.boardId) || d.boards[0] || null;
        const preset = st.teamPreset;
        setup = {
            setId: set ? set.id : '', boardId: board ? board.id : 'auto', autoSize: 50,
            count: st.teamCount, preset, names: Engine.TEAM_PRESETS[preset].names.slice(),
            opts: Object.assign({}, st.opts),
            title: UI.PRESET.titles(set)[0], dateText: UI.todayText(), place: 'ห้องเรียน',
            judges: [d.school.reporterName || '', '', ''],
        };
    }

    function renderSetup(el) {
        const d = Store.data;
        const S = setup;
        const set = Store.set(S.setId);
        if (!d.sets.length) {
            el.innerHTML = `${U.hero({ icon: 'fa-dice', title: 'เล่นเกมบันไดงู', sub: 'ยังไม่มีชุดคำถาม' })}${UI.empty('fa-layer-group', 'ยังไม่มีชุดคำถาม', 'สร้างชุดคำถามก่อน หรือโหลดข้อมูลตัวอย่าง 6 วิชาที่หน้า "สำรอง / เปิดไฟล์ข้อมูล"', '<a class="btn-x primary" href="#/library"><i class="fas fa-plus"></i> ไปที่ชุดคำถาม</a>')}`;
            return;
        }
        const segBtns = (name, list, cur) => list.map((v) => `<button type="button" class="${String(cur) === String(v[0]) ? 'active' : ''}" data-${name}="${v[0]}">${v[1]}</button>`).join('');
        el.innerHTML = `
            ${U.hero({ icon: 'fa-dice', title: 'เริ่มเกมบันไดงูตอบคำถาม', sub: 'เลือกชุดคำถาม กระดาน และทีม — ค่าที่เลือกระบบจำไว้ใช้ครั้งหน้า' })}
            <div class="setup-grid">
                <section class="panel panel--green">
                    <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-layer-group"></i></span><div><h3>1. ชุดคำถาม</h3><small>คำถามจะสุ่มลำดับใหม่ทุกเกม</small></div></div>
                    <div class="panel-body"><div class="pick-sets">${d.sets.map((s) => `
                        <label class="pick-set${s.id === S.setId ? ' on' : ''}" data-pick-set="${esc(s.id)}">${UI.setIcon(s, 'sm')}
                            <span class="ps-txt"><b>${esc(s.name || '(ไม่มีชื่อ)')}</b><small>${esc(s.subject || '-')} • ${s.questions.length} ข้อ</small></span><i class="fas fa-circle-check ps-ok"></i></label>`).join('')}</div>
                    </div>
                </section>
                <section class="panel panel--orange">
                    <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-stairs"></i></span><div><h3>2. กระดาน</h3><small>30–100 ช่อง • ออกแบบเองได้ที่เมนู "ออกแบบกระดาน"</small></div></div>
                    <div class="panel-body">
                        <div class="pick-boards">${d.boards.map((b) => `
                            <button type="button" class="pick-board${b.id === S.boardId ? ' on' : ''}" data-pick-board="${esc(b.id)}">${BoardArt.html(b, { mini: true, numbers: false })}<span><b>${esc(b.name)}</b><small>${b.n} ช่อง • บันได ${b.ladders.length} • งู ${b.snakes.length} • คำถาม ${Engine.boardStats(b).q}</small></span></button>`).join('')}
                            <button type="button" class="pick-board auto${S.boardId === 'auto' ? ' on' : ''}" data-pick-board="auto"><span class="pb-auto"><i class="fas fa-shuffle"></i></span><span><b>สุ่มกระดานใหม่</b><small>ระบบวางบันได งู และช่องคำถามให้อัตโนมัติ</small></span></button>
                        </div>
                        <div class="auto-size" ${S.boardId === 'auto' ? '' : 'hidden'}><label class="form-label mt-2">จำนวนช่อง</label><div class="seg seg-wrap">${segBtns('size', Engine.SIZES.map((z) => [z.n, z.n]), S.autoSize)}</div></div>
                    </div>
                </section>
                <section class="panel panel--pink">
                    <div class="panel-head"><span class="ic-box sm" style="--a:#FF375F;--b:#BF5AF2"><i class="fas fa-people-group"></i></span><div><h3>3. ทีม</h3><small>2–6 ทีม • ชื่อทีมสำเร็จรูป แก้ได้</small></div></div>
                    <div class="panel-body">
                        <label class="form-label">จำนวนทีม</label><div class="seg mb-2">${segBtns('count', [2, 3, 4, 5, 6].map((n) => [n, `${n} ทีม`]), S.count)}</div>
                        <label class="form-label">ชื่อทีมสำเร็จรูป</label><div class="seg seg-wrap mb-3">${segBtns('preset', Object.entries(Engine.TEAM_PRESETS).map(([k, v]) => [k, v.label]), S.preset)}</div>
                        <div class="team-inputs">${Array.from({ length: S.count }, (x, i) => `<div class="team-input"><span style="--c:${Engine.TEAM_COLORS[i]}"><i class="fas ${Engine.TEAM_ICONS[i]}"></i></span><input class="form-control" data-team-name="${i}" value="${esc(S.names[i] || '')}" maxlength="30"></div>`).join('')}</div>
                    </div>
                </section>
                <section class="panel panel--teal">
                    <div class="panel-head"><span class="ic-box sm" style="--a:#0A84FF;--b:#00C7BE"><i class="fas fa-sliders"></i></span><div><h3>4. กติกา</h3><small>ตกช่องคำถาม: ถูกเดินต่อ / ผิดถอย</small></div></div>
                    <div class="panel-body">
                        <label class="form-label">เวลาตอบต่อข้อ</label><div class="seg seg-wrap mb-2">${segBtns('time', [[15, '15 วิ'], [20, '20 วิ'], [30, '30 วิ'], [45, '45 วิ'], [60, '60 วิ'], [0, 'ไม่จับเวลา']], S.opts.time)}</div>
                        <div class="row g-2">
                            <div class="col-sm-6"><label class="form-label">ตอบถูก เดินต่อ</label><div class="seg">${segBtns('right', [1, 2, 3, 4].map((n) => [n, `${n} ช่อง`]), S.opts.rightStep)}</div></div>
                            <div class="col-sm-6"><label class="form-label">ตอบผิด ถอยหลัง</label><div class="seg">${segBtns('wrong', [0, 1, 2, 3].map((n) => [n, n ? `${n} ช่อง` : 'ไม่ถอย']), S.opts.wrongStep)}</div></div>
                        </div>
                        <label class="form-check form-switch mt-3"><input class="form-check-input" type="checkbox" id="pl-exact" ${S.opts.exact ? 'checked' : ''}> <span class="form-check-label">ต้องทอยได้พอดีเส้นชัย (เกินแล้วเด้งกลับ)</span></label>
                    </div>
                </section>
            </div>
            <section class="panel panel--slate mt-3">
                <div class="panel-head"><span class="ic-box sm" style="--a:#64748b;--b:#94a3b8"><i class="fas fa-file-pen"></i></span><div><h3>ข้อมูลกิจกรรม (ใช้ในใบสรุปผลและรายงาน .docx)</h3><small>เว้นว่างได้ — เอกสารจะเว้นจุดไข่ปลาให้เขียนเอง</small></div></div>
                <div class="panel-body"><div class="row g-3">
                    <div class="col-lg-6"><label class="form-label">ชื่อกิจกรรม</label><input class="form-control" id="pl-title" value="${esc(S.title)}">${UI.chips('#pl-title', UI.PRESET.titles(set))}</div>
                    <div class="col-lg-3 col-sm-6"><label class="form-label">วันที่</label><input class="form-control" id="pl-date" value="${esc(S.dateText)}">${UI.chips('#pl-date', [UI.todayText()])}</div>
                    <div class="col-lg-3 col-sm-6"><label class="form-label">สถานที่</label><input class="form-control" id="pl-place" value="${esc(S.place)}">${UI.chips('#pl-place', UI.PRESET.places.slice(0, 3))}</div>
                    ${[0, 1, 2].map((i) => `<div class="col-md-4"><label class="form-label">${esc(Store.data.tpl[`judgePos${i + 1}`])}</label><input class="form-control" data-judge="${i}" value="${esc(S.judges[i] || '')}" placeholder="ชื่อ-สกุล"></div>`).join('')}
                </div></div>
            </section>
            <div class="start-bar">
                <div><b>${esc(set ? set.name : '')}</b> • ${S.count} ทีม • ${S.boardId === 'auto' ? `สุ่มกระดาน ${S.autoSize} ช่อง` : esc((Store.board(S.boardId) || {}).name || '')}</div>
                <div class="d-flex gap-2 flex-wrap">${live() ? '<a class="btn-x ghost" href="#/play"><i class="fas fa-rotate-left"></i> กลับไปเกมที่ค้าง</a>' : ''}<button type="button" class="btn-x cta lg" data-act="start"><i class="fas fa-play"></i> เริ่มเกม</button></div>
            </div>`;
        UI.bindChips(el);
    }

    function bindSetup(el) {
        el.onclick = (e) => {
            const b = e.target.closest('button, label[data-pick-set]');
            if (!b) return;
            const S = setup;
            if (b.dataset.pickSet) { e.preventDefault(); S.setId = b.dataset.pickSet; S.title = UI.PRESET.titles(Store.set(S.setId))[0]; }
            else if (b.dataset.pickBoard) S.boardId = b.dataset.pickBoard;
            else if (b.dataset.size) S.autoSize = Number(b.dataset.size);
            else if (b.dataset.count) { S.count = Number(b.dataset.count); }
            else if (b.dataset.preset) { S.preset = b.dataset.preset; S.names = Engine.TEAM_PRESETS[S.preset].names.slice(); }
            else if (b.dataset.time) S.opts.time = Number(b.dataset.time);
            else if (b.dataset.right) S.opts.rightStep = Number(b.dataset.right);
            else if (b.dataset.wrong) S.opts.wrongStep = Number(b.dataset.wrong);
            else if (b.dataset.act === 'start') { start(); return; }
            else return;
            const y = window.scrollY;
            renderSetup(el);
            window.scrollTo(0, y);
        };
        el.oninput = (e) => {
            const t = e.target;
            const S = setup;
            if (t.dataset.teamName) S.names[Number(t.dataset.teamName)] = t.value;
            else if (t.dataset.judge) S.judges[Number(t.dataset.judge)] = t.value;
            else if (t.id === 'pl-title') S.title = t.value;
            else if (t.id === 'pl-date') S.dateText = t.value;
            else if (t.id === 'pl-place') S.place = t.value;
            else if (t.id === 'pl-exact') S.opts.exact = t.checked;
        };
        el.onchange = el.oninput;
    }

    async function start() {
        const S = setup;
        const set = Store.set(S.setId);
        if (!set) { U.toast('กรุณาเลือกชุดคำถาม', { type: 'warn' }); return; }
        if (!set.questions.length && !(await U.confirm('ชุดนี้ยังไม่มีคำถาม', 'เล่นต่อโดยไม่มีคำถามหรือไม่? (ช่องคำถามจะเป็นช่องธรรมดา)', { icon: 'question' }))) return;
        if (live() && !(await U.confirm('มีเกมที่เล่นค้างอยู่', 'ถ้าเริ่มเกมใหม่ เกมที่ค้างจะถูกบันทึกเป็นผลการแข่งขัน (ยังไม่จบ) แล้วเริ่มใหม่', { icon: 'question', confirmText: 'เริ่มเกมใหม่' }))) return;
        if (live()) { Engine.finish(live()); Store.finishLive(); }
        let board = Store.board(S.boardId);
        let boardName = board ? board.name : '';
        if (!board) { board = Engine.autoBoard(S.autoSize, { seed: Date.now() }); boardName = `กระดานสุ่ม ${board.n} ช่อง`; }
        const teams = Array.from({ length: S.count }, (x, i) => ({ name: U.norm(S.names[i]) || Engine.TEAM_PRESETS[S.preset].names[i] }));
        const g = Engine.newGame(board, set, teams, S.opts, { title: U.norm(S.title), dateText: U.norm(S.dateText), place: U.norm(S.place), judges: S.judges.map(U.norm), boardName });
        Object.assign(Store.data.settings, { setId: set.id, boardId: Store.board(S.boardId) ? S.boardId : Store.data.settings.boardId, teamPreset: S.preset, teamCount: S.count, opts: Engine.normOpts(S.opts) });
        Store.commit('settings');
        Store.saveLive(g, { immediate: true });
        Sound.play('show');
        App.go('play');
    }

    /* ======================= หน้าจอเกม ======================= */
    function msgFor(ev, g, t) {
        const N = g.board.n;
        switch (ev.kind) {
            case 'ladder': return { icon: 'fa-stairs', cls: 'ok', text: `${t.name} ขึ้นบันได! ช่อง ${ev.from} → ${ev.to}` };
            case 'snake': return { icon: 'fa-worm', cls: 'bad', text: `โดนงูกัด! ${t.name} ไถลลง ช่อง ${ev.from} → ${ev.to}` };
            case 'bonus': return { icon: 'fa-star', cls: 'ok', text: `ช่องโบนัส! ${t.name} เดินหน้าเพิ่ม ${g.opts.bonusStep} ช่อง` };
            case 'skip': return { icon: 'fa-hourglass-half', cls: 'warn', text: `ช่องหยุดพัก — ${t.name} ข้ามตาครั้งหน้า 1 ตา` };
            case 'again': return { icon: 'fa-dice', cls: 'info', text: `ช่องทอยอีกครั้ง — ${t.name} ทอยเต๋าได้อีก 1 ครั้ง` };
            case 'win': return { icon: 'fa-trophy', cls: 'ok', text: `${t.name} ถึงเส้นชัยช่อง ${N}!` };
            case 'q-none': return { icon: 'fa-circle-info', cls: 'info', text: 'ช่องคำถาม แต่ชุดนี้ไม่มีคำถาม — เดินต่อ' };
            default: return null;
        }
    }

    function sideHTML(g) {
        const t = Engine.cur(g);
        const rank = Engine.ranking(g);
        const ql = Engine.questionLog(g).slice(-6).reverse();
        return `
            <div class="turn-card" style="--c:${esc(t.color)}">
                <span class="tc-ic"><i class="fas ${esc(t.icon)}"></i></span>
                <div><small>รอบที่ ${g.round} • ตาของ</small><b>${esc(t.name)}</b>${t.skip ? '<span class="tag warn">หยุดพัก</span>' : ''}</div>
            </div>
            <div class="dice-zone">
                ${UI.dice(g.lastDice || 1)}
                <button type="button" class="btn-x cta lg roll-btn" data-act="roll" ${g.phase !== 'roll' ? 'disabled' : ''}><i class="fas fa-dice"></i> ทอยลูกเต๋า <kbd>Space</kbd></button>
            </div>
            <div class="g-msg" id="g-msg"></div>
            <div class="team-list">${rank.map((r) => { const x = teamOf(g, r.id); return `
                <div class="tl-row${x.id === t.id ? ' cur' : ''}" style="--c:${esc(x.color)}">
                    <span class="tl-ic"><i class="fas ${esc(x.icon)}"></i></span>
                    <span class="tl-name"><b>${esc(x.name)}</b><small><i class="fas fa-check text-success"></i> ${x.right} <i class="fas fa-xmark text-danger ms-1"></i> ${x.wrong}${x.skip ? ' • <i class="fas fa-hourglass-half"></i> หยุดพัก' : ''}</small></span>
                    <span class="tl-pos"><b>${x.pos || 'เริ่ม'}</b><small>/${g.board.n}</small></span>
                    <span class="tl-bar"><i style="width:${Math.round((x.pos / g.board.n) * 100)}%"></i></span>
                </div>`; }).join('')}</div>
            <div class="g-hist"><h4><i class="fas fa-clock-rotate-left"></i> ประวัติคำถามล่าสุด</h4>${ql.length ? ql.map((l) => { const x = teamOf(g, l.team); return `<div class="gh-row"><span class="gh-ok ${l.skipped ? 'skip' : l.ok ? 'ok' : 'bad'}"><i class="fas ${l.skipped ? 'fa-forward' : l.ok ? 'fa-check' : 'fa-xmark'}"></i></span><span class="gh-q">${esc(l.q)}</span>${UI.teamChip(x)}</div>`; }).join('') : '<div class="muted small">ยังไม่มีคำถาม — ตกช่อง <i class="fas fa-circle-question"></i> แล้วต้องตอบ</div>'}</div>`;
    }

    function renderGame(el) {
        const g = live();
        const st = Store.data.settings;
        el.innerHTML = `
            <div class="game" id="game">
                <div class="g-top">
                    <div class="g-title"><i class="fas fa-stairs"></i><b>${esc(g.title || 'เกมบันไดงูตอบคำถาม')}</b><small>${esc(g.setName)} • ${esc(g.boardName || `${g.board.n} ช่อง`)}</small></div>
                    <div class="g-tools">
                        <button type="button" class="icon-btn" data-act="sound" title="เปิด/ปิดเสียง (M)"><i class="fas ${st.sound ? 'fa-volume-high' : 'fa-volume-xmark'}"></i></button>
                        <button type="button" class="icon-btn" data-act="legend" title="ความหมายของช่อง"><i class="fas fa-circle-info"></i></button>
                        <button type="button" class="icon-btn" data-act="fs" title="เต็มจอ (F)"><i class="fas fa-expand"></i></button>
                        <button type="button" class="btn-x ghost sm" data-act="end" data-demo-allow><i class="fas fa-flag-checkered"></i><span class="tb-hide-sm"> จบเกม</span></button>
                    </div>
                </div>
                <div class="g-main">
                    <div class="g-board" id="g-board"></div>
                    <aside class="g-side" id="g-side">${sideHTML(g)}</aside>
                </div>
                <div class="g-overlay" id="g-over" hidden></div>
            </div>`;
        BoardArt.mount(el.querySelector('#g-board'), g.board, { teams: g.teams });
        if (g.phase === 'question') openQuestion(true);
    }
    const boardEl = () => root && root.querySelector('#g-board .sl-board');
    function refreshSide() {
        const g = live();
        const side = root && root.querySelector('#g-side');
        if (!g || !side) return;
        const msg = side.querySelector('#g-msg');
        const keep = msg ? msg.innerHTML : '';
        side.innerHTML = sideHTML(g);
        side.querySelector('#g-msg').innerHTML = keep;
    }
    function showMsg(m) {
        const box = root && root.querySelector('#g-msg');
        if (!box || !m) return;
        box.innerHTML = `<div class="gm ${m.cls}"><i class="fas ${m.icon}"></i><span>${esc(m.text)}</span></div>`;
    }

    async function rollDice() {
        const g = live();
        if (!g || busy || g.phase !== 'roll') return;
        busy = true;
        const t = Engine.cur(g);
        const btn = root.querySelector('[data-act=roll]');
        if (btn) btn.disabled = true;
        const v = 1 + Math.floor(Math.random() * 6);
        const dice = root.querySelector('.dice');
        Sound.play('dice');
        dice.className = 'dice rolling';
        await wait(850);
        dice.className = `dice show-${v}`;
        await wait(250);
        const res = Engine.roll(g, v);
        Store.saveLive(g);
        showMsg({ icon: 'fa-dice', cls: 'info', text: `${t.name} ทอยได้ ${v} แต้ม` });
        await animateEvents(g, t, res.events);
        busy = false;
        afterMove(g, res.result);
    }

    /* เล่นแอนิเมชันตามเหตุการณ์จาก engine */
    async function animateEvents(g, t, events) {
        const bEl = boardEl();
        for (const ev of events) {
            if (ev.path && ev.path.length) {
                await BoardArt.walkToken(bEl, g.board, t, ev.path, ev.path.length > 8 ? 160 : 240, () => Sound.play('step'));
            }
            if (ev.kind === 'ladder' || ev.kind === 'snake') {
                showMsg(msgFor(ev, g, t));
                Sound.play(ev.kind);
                await BoardArt.slideToken(bEl, g.board, t, ev.to, ev.kind);
            } else if (ev.kind === 'right') { /* ข้อความแสดงในหน้าต่างคำถามแล้ว */ }
            else if (ev.kind !== 'move' && ev.kind !== 'wrong' && ev.kind !== 'question') {
                const m = msgFor(ev, g, t);
                if (m) { showMsg(m); Sound.play(ev.kind === 'skip' ? 'minus' : ev.kind === 'win' ? 'fanfare' : 'hint'); await wait(500); }
            }
        }
        BoardArt.placeTokens(bEl, g.board, g.teams);
    }

    function afterMove(g, result) {
        refreshSide();
        if (result === 'question') { setTimeout(() => openQuestion(), 350); return; }
        if (g.status === 'done') { showWinner(); return; }
        if (result === 'again') showMsg(msgFor({ kind: 'again' }, g, Engine.cur(g)));
    }

    /* ---------- หน้าต่างคำถาม ---------- */
    function openQuestion(resume) {
        const g = live();
        const q = Engine.pendingQuestion(g);
        if (!q) return;
        const t = Engine.cur(g);
        const over = root.querySelector('#g-over');
        qState = { q, t0: Date.now(), left: g.opts.time, answered: false, ok: false, given: null };
        const choices = q.type === 'mc'
            ? `<div class="qo-choices">${q.choices.map((c, i) => (c ? `<button type="button" class="qo-ch ch${i}" data-choice="${i}"><b>${Engine.CHOICE_LABELS[i]}</b><span>${esc(c)}</span></button>` : '')).join('')}</div>`
            : q.type === 'tf'
                ? '<div class="qo-choices tf"><button type="button" class="qo-ch ch1" data-choice="true"><b><i class="fas fa-check"></i></b><span>ถูก</span></button><button type="button" class="qo-ch ch0" data-choice="false"><b><i class="fas fa-xmark"></i></b><span>ผิด</span></button></div>'
                : `<div class="qo-fill"><input class="form-control form-control-lg" id="qo-input" placeholder="พิมพ์คำตอบของทีม แล้วกด ส่งคำตอบ" autocomplete="off"><button type="button" class="btn-x primary lg" data-act="fill-send"><i class="fas fa-paper-plane"></i> ส่งคำตอบ</button></div>
                   <div class="qo-judge"><span>หรือครูตัดสินเอง:</span><button type="button" class="btn-x green" data-judge="1"><i class="fas fa-check"></i> ตอบถูก</button><button type="button" class="btn-x orange" data-judge="0"><i class="fas fa-xmark"></i> ตอบผิด</button></div>`;
        over.innerHTML = `
            <div class="qo-card" style="--c:${esc(t.color)}">
                <div class="qo-head">${UI.teamChip(t)}<span class="qo-cell"><i class="fas fa-circle-question"></i> ช่อง ${g.pending.cell}</span>${UI.qTypeTag(q.type)}
                    ${g.opts.time ? `<span class="qo-timer" id="qo-timer"><i class="fas fa-stopwatch"></i><b>${g.opts.time}</b></span>` : ''}</div>
                ${g.opts.time ? '<div class="qo-bar"><i id="qo-bar"></i></div>' : ''}
                <div class="qo-body">${q.img ? `<img class="qo-img" src="${esc(q.img)}" alt="">` : ''}<div class="qo-q">${esc(q.q)}</div></div>
                ${choices}
                <div class="qo-result" id="qo-result" hidden></div>
                <div class="qo-foot"><button type="button" class="btn-x ghost sm" data-act="q-skip"><i class="fas fa-forward"></i> ข้ามคำถาม</button><small class="muted">ถูกเดินต่อ ${g.opts.rightStep} ช่อง • ผิด/หมดเวลา ถอย ${g.opts.wrongStep} ช่อง</small></div>
            </div>`;
        over.hidden = false;
        over.className = 'g-overlay q-open';
        if (!resume) Sound.play('show');
        startTimer();
        const inp = over.querySelector('#qo-input');
        if (inp) { setTimeout(() => inp.focus(), 80); inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); sendFill(); } }; }
    }
    function stopTimer() { clearInterval(timer); timer = null; }
    function startTimer() {
        stopTimer();
        const g = live();
        if (!g.opts.time) return;
        const total = g.opts.time;
        const t0 = Date.now();
        timer = setInterval(() => {
            if (!qState || qState.answered) { stopTimer(); return; }
            const left = Math.max(0, total - (Date.now() - t0) / 1000);
            const el = root && root.querySelector('#qo-timer b');
            const bar = root && root.querySelector('#qo-bar');
            if (!el) { stopTimer(); return; }
            const sec = Math.ceil(left);
            if (String(sec) !== el.textContent) { el.textContent = sec; if (sec <= 5 && sec > 0) Sound.play('tick'); }
            bar.style.width = `${(left / total) * 100}%`;
            root.querySelector('#qo-timer').classList.toggle('low', left <= 5);
            if (left <= 0) { stopTimer(); judge(false, null, true); }
        }, 100);
    }
    function sendFill() {
        const inp = root.querySelector('#qo-input');
        if (!inp || qState.answered) return;
        const v = inp.value.trim();
        if (!v) { inp.focus(); return; }
        judge(Engine.check(qState.q, v), v);
    }
    /* ตัดสินผล: แสดงเฉลย แล้วรอกด "ไปต่อ" */
    function judge(ok, given, timeout) {
        if (!qState || qState.answered) return;
        stopTimer();
        const g = live();
        const q = qState.q;
        Object.assign(qState, { answered: true, ok: !!ok, given, secs: (Date.now() - qState.t0) / 1000 });
        const over = root.querySelector('#g-over');
        over.querySelectorAll('[data-choice]').forEach((b) => {
            b.disabled = true;
            const v = b.dataset.choice;
            const right = q.type === 'mc' ? Number(v) === q.answer : String(q.answer) === v;
            if (right) b.classList.add('right');
            else if (given != null && String(given) === v) b.classList.add('wrong');
            else b.classList.add('dim');
        });
        over.querySelectorAll('#qo-input, [data-act=fill-send]').forEach((x) => { x.disabled = true; });
        const res = over.querySelector('#qo-result');
        const steps = ok ? g.opts.rightStep : g.opts.wrongStep;
        res.innerHTML = `
            <div class="qr ${ok ? 'ok' : 'bad'}">
                <span class="qr-ic"><i class="fas ${ok ? 'fa-face-laugh-beam' : timeout ? 'fa-hourglass-end' : 'fa-face-frown-open'}"></i></span>
                <div><b>${ok ? 'ตอบถูก! เก่งมาก' : timeout ? 'หมดเวลา!' : 'ยังไม่ถูก'}</b><span>เฉลย: ${esc(Engine.answerText(q))}${q.explain ? ` — ${esc(q.explain)}` : ''}</span></div>
                <button type="button" class="btn-x ${ok ? 'green' : 'orange'} lg" data-act="q-go">${ok ? `<i class="fas fa-forward"></i> เดินต่อ ${steps} ช่อง` : steps ? `<i class="fas fa-backward"></i> ถอยหลัง ${steps} ช่อง` : '<i class="fas fa-arrow-right"></i> ไปต่อ'} <kbd>Enter</kbd></button>
            </div>
            ${q.type === 'fill' ? `<div class="qo-judge small"><span>ครูเปลี่ยนผลได้:</span><button type="button" class="btn-x ${ok ? 'ghost' : 'green'} sm" data-flip="1">นับว่าถูก</button><button type="button" class="btn-x ${ok ? 'orange' : 'ghost'} sm" data-flip="0">นับว่าผิด</button></div>` : ''}`;
        res.hidden = false;
        over.querySelector('.qo-judge:not(.small)')?.remove();
        Sound.play(ok ? 'correct' : timeout ? 'timeup' : 'wrong');
        if (ok) Fx.pop(null, null, root.querySelector('#game'));
        setTimeout(() => over.querySelector('[data-act=q-go]')?.focus(), 50);
    }
    async function continueAfterQuestion(skip) {
        const g = live();
        if (!g || busy) return;
        busy = true;
        const over = root.querySelector('#g-over');
        over.hidden = true;
        over.className = 'g-overlay';
        over.innerHTML = '';
        const t = Engine.cur(g);
        let res;
        if (skip) { Engine.skipQuestion(g); res = { events: [], result: 'none' }; showMsg({ icon: 'fa-forward', cls: 'info', text: `ข้ามคำถาม — ${t.name} อยู่ช่องเดิม` }); }
        else {
            res = Engine.answer(g, qState.ok, qState.given, qState.secs);
            showMsg(qState.ok ? { icon: 'fa-check', cls: 'ok', text: `${t.name} ตอบถูก เดินต่อ ${g.opts.rightStep} ช่อง` } : { icon: 'fa-xmark', cls: 'bad', text: `${t.name} ตอบผิด ถอย ${g.opts.wrongStep} ช่อง` });
        }
        qState = null;
        Store.saveLive(g);
        await animateEvents(g, t, res.events);
        busy = false;
        afterMove(g, res.result);
    }

    /* ---------- ผู้ชนะ ---------- */
    function showWinner() {
        const g = live();
        if (!g) return;
        stopTimer();
        const rank = Engine.ranking(g);
        const w = rank[0];
        const done = Store.finishLive();
        const over = root.querySelector('#g-over');
        const podium = [rank[1], rank[0], rank[2]].filter(Boolean);
        over.innerHTML = `
            <div class="win-card">
                <div class="win-rays"></div>
                <div class="win-trophy"><i class="fas fa-trophy"></i></div>
                <small>ผู้ชนะ</small>
                <h2 style="--c:${esc(w.color)}"><i class="fas ${esc(w.icon)}"></i> ${esc(w.name)}</h2>
                <p>${w.finishAt ? `ถึงเส้นชัยช่อง ${g.board.n} เป็นทีมแรก` : `อยู่ช่องที่ ${w.pos} ไกลที่สุด`} • ตอบถูก ${w.right} ข้อ</p>
                <div class="podium">${podium.map((t) => `<div class="pd r${t.rank}" style="--c:${esc(t.color)}"><span class="pd-ic"><i class="fas ${esc(t.icon)}"></i></span><b>${esc(t.name)}</b><small>ช่อง ${t.pos}</small><div class="pd-step">${t.rank}</div></div>`).join('')}</div>
                <div class="win-actions">
                    <a class="btn-x primary lg" href="#/result?id=${esc(done ? done.id : '')}"><i class="fas fa-list-check"></i> ผลและประวัติคำถาม</a>
                    <a class="btn-x orange lg" href="#/play?new=1"><i class="fas fa-rotate-right"></i> เล่นเกมใหม่</a>
                </div>
            </div>`;
        over.hidden = false;
        over.className = 'g-overlay win-open';
        Sound.play('fanfare');
        Fx.fireworks(7000, root.querySelector('#game'));
        root.querySelector('[data-act=roll]')?.setAttribute('disabled', '');
    }

    async function endGame() {
        const g = live();
        if (!g) return;
        if (!(await U.confirm('จบเกมตอนนี้?', 'ระบบจะจัดอันดับตามช่องที่แต่ละทีมไปถึง แล้วประกาศผู้ชนะ', { icon: 'question', confirmText: '<i class="fas fa-flag-checkered"></i> จบเกม' }))) return;
        stopTimer();
        g.pending = null;
        Engine.finish(g);
        showWinner();
    }

    function toggleFs() {
        const el = root.querySelector('#game');
        if (!el) return;
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else if (el.requestFullscreen) el.requestFullscreen().catch(() => { el.classList.toggle('fs'); });
        else el.classList.toggle('fs');
    }
    function onFsChange() { const el = root && root.querySelector('#game'); if (el) el.classList.toggle('fs', document.fullscreenElement === el); }

    function legend() {
        U.alert('ความหมายของช่องบนกระดาน', `<div class="legend">${[
            ['c-q', 'fa-circle-question', 'ช่องคำถาม — ต้องตอบคำถาม ถูกเดินต่อ ผิดถอย'],
            ['c-bonus', 'fa-star', `ช่องโบนัส — เดินหน้าเพิ่ม ${live() ? live().opts.bonusStep : 3} ช่อง`],
            ['c-skip', 'fa-hourglass-half', 'ช่องหยุดพัก — ข้ามตาครั้งถัดไป 1 ตา'],
            ['c-again', 'fa-dice', 'ช่องทอยอีกครั้ง — ทอยเต๋าได้อีก 1 ครั้ง'],
            ['lad', 'fa-stairs', 'เชิงบันได — ปีนขึ้นไปปลายบันได'],
            ['snk', 'fa-worm', 'หัวงู — ไถลลงไปที่หางงู'],
        ].map(([c, i, t]) => `<div class="lg-row"><span class="lg-cell ${c}"><i class="fas ${i}"></i></span><span>${t}</span></div>`).join('')}</div>`, 'info');
    }

    function bindGame(el) {
        el.onclick = (e) => {
            const b = e.target.closest('[data-act], [data-choice], [data-judge], [data-flip]');
            if (!b || b.disabled) return;
            if (b.dataset.choice != null) {
                if (!qState || qState.answered) return;
                const q = qState.q;
                judge(Engine.check(q, b.dataset.choice), b.dataset.choice);
                return;
            }
            if (b.dataset.judge != null) { const v = root.querySelector('#qo-input'); judge(b.dataset.judge === '1', v && v.value.trim() ? v.value.trim() : null); return; }
            if (b.dataset.flip != null) { const ok = b.dataset.flip === '1'; qState.answered = false; qState.ok = ok; const given = qState.given; qState.answered = false; root.querySelector('#qo-result').hidden = true; judge(ok, given); return; }
            const a = b.dataset.act;
            if (a === 'roll') rollDice();
            else if (a === 'fill-send') sendFill();
            else if (a === 'q-go') continueAfterQuestion(false);
            else if (a === 'q-skip') { stopTimer(); continueAfterQuestion(true); }
            else if (a === 'fs') toggleFs();
            else if (a === 'end') endGame();
            else if (a === 'legend') legend();
            else if (a === 'sound') {
                const st = Store.data.settings;
                st.sound = !st.sound;
                Sound.set({ enabled: st.sound });
                Store.commit('settings', { quiet: true });
                b.innerHTML = `<i class="fas ${st.sound ? 'fa-volume-high' : 'fa-volume-xmark'}"></i>`;
            }
        };
    }

    function key(e) {
        if (!root || !live()) return;
        const k = e.key;
        if (k === 'f' || k === 'F') { toggleFs(); return; }
        if (k === 'm' || k === 'M') { root.querySelector('[data-act=sound]')?.click(); return; }
        if (qState && !qState.answered) {
            const q = qState.q;
            if (q.type === 'mc' && /^[1-4]$/.test(k)) { const b = root.querySelector(`[data-choice="${Number(k) - 1}"]`); if (b) b.click(); }
            if (q.type === 'tf' && (k === '1' || k === '2')) root.querySelector(`[data-choice="${k === '1' ? 'true' : 'false'}"]`)?.click();
            return;
        }
        if (k === ' ' || k === 'Enter') {
            e.preventDefault();
            if (qState && qState.answered) continueAfterQuestion(false);
            else if (live().phase === 'roll') rollDice();
        }
    }

    function render(el, params) {
        root = el;
        busy = false;
        qState = null;
        stopTimer();
        const p = params || {};
        if (p.new || !live()) {
            if (!setup || p.new || p.set || p.board) initSetup(p);
            renderSetup(el);
            bindSetup(el);
        } else {
            renderGame(el);
            bindGame(el);
        }
    }

    document.addEventListener('fullscreenchange', onFsChange);
    window.Views.play = {
        render, key,
        leave() { stopTimer(); Fx.stop(); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); },
        refresh(reason) { if (reason === 'sets' || reason === 'boards') { if (!live() && root) { renderSetup(root); } } },
        /* ใช้ในสคริปต์ถ่ายภาพ/ทดสอบ */
        _rollWith: async (v) => { const g = live(); const orig = Math.random; Math.random = () => (v - 1) / 6 + 0.01; try { await rollDice(); } finally { Math.random = orig; } return g; },
        _state: () => ({ busy, qState }),
    };
})();
