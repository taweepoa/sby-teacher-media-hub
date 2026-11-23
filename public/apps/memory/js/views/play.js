/* =====================================================================
   เล่นเกม: ตั้งค่าเกม (ชุดเนื้อหา รูปแบบ ทีม ระดับความยาก) → หน้าจอเกม 4 โหมด → ประกาศผล
   - เกมที่เล่นอยู่บันทึกใน Store.data.live (ปิดเบราว์เซอร์แล้วกลับมาเล่นต่อได้)
   - โหมดนำเสนอเต็มจอ: ซ่อนเมนู + Fullscreen API (กด F)
   ===================================================================== */
(function () {
    'use strict';
    const esc = U.esc;
    let root = null;
    let setup = null;      // ค่าที่เลือกในหน้าตั้งค่า
    let timer = null;      // { left, total, id }
    let phase = '';        // สถานะย่อยของหน้าจอ: '' | 'reveal' | 'box' | 'result'
    let lastRes = null;
    let links = {};        // โหมดลากเส้น: leftId → rightId
    let pickLeft = null;
    let busy = false;
    let lastSig = '';

    const live = () => Store.data.live;
    const save = (opts) => Store.saveLive(live(), opts);

    /* ======================= ตั้งค่าเกม ======================= */
    function renderSetup(el, params) {
        const d = Store.data;
        const st = d.settings;
        if (!setup || params.set || params.mode) {
            setup = {
                setId: params.set || (setup && setup.setId) || (d.sets[0] && d.sets[0].id) || '',
                mode: params.mode || (setup && setup.mode) || 'memory',
                level: st.level, preset: st.teamPreset, count: st.teamCount, points: st.points, rounds: st.rounds, speedBonus: st.speedBonus, time: st.time,
                names: Engine.TEAM_PRESETS[st.teamPreset].names.slice(), title: '',
            };
        }
        const s = Store.set(setup.setId);
        if (!d.sets.length) {
            el.innerHTML = `${U.hero({ icon: 'fa-gamepad', title: 'เริ่มเกม', sub: 'ต้องมีชุดเนื้อหาอย่างน้อย 1 ชุดก่อนเริ่มเล่น' })}<section class="panel"><div class="panel-body">${UI.empty('fa-layer-group', 'ยังไม่มีชุดเนื้อหา', 'สร้างชุดเนื้อหา หรือโหลดข้อมูลตัวอย่างที่หน้า "สำรอง / เปิดไฟล์ข้อมูล"', '<a class="btn-x primary" href="#/library"><i class="fas fa-plus"></i> ไปที่ชุดเนื้อหา</a>')}</div></section>`;
            return;
        }
        const L = Engine.LEVELS[setup.level];
        const n = s ? Engine.validPairs(s).length : 0;
        const need = setup.mode === 'match' ? L.matchPairs * 1 : setup.mode === 'memory' ? 3 : 3;
        el.innerHTML = `
            ${U.hero({ icon: 'fa-gamepad', title: 'ตั้งค่าเกมใหม่', sub: 'เลือกชุดเนื้อหา รูปแบบเกม ทีม และระดับความยาก — ระบบสุ่มลำดับการ์ด/คำถามใหม่ทุกครั้ง', side: d.live ? '<a class="hero-btn" href="#/play"><i class="fas fa-circle-play"></i> กลับไปเกมที่เล่นค้าง</a>' : '' })}
            <div class="setup-grid">
                <section class="panel panel--purple">
                    <div class="panel-head"><span class="step-no">1</span><div><h3>ชุดเนื้อหา</h3><small>${d.sets.length} ชุด • กดเลือก 1 ชุด</small></div></div>
                    <div class="panel-body"><div class="pick-sets">${d.sets.map((x) => `<label class="pick-set${x.id === setup.setId ? ' on' : ''}" data-set="${esc(x.id)}"><span class="ps-thumb">${UI.setThumb(x)}</span><span class="ps-txt"><b>${esc(x.name)}</b><small>${esc(x.subject || '-')} • ${x.pairs.length} คู่</small></span><i class="fas fa-circle-check ps-ok"></i></label>`).join('')}</div></div>
                </section>
                <section class="panel panel--pink">
                    <div class="panel-head"><span class="step-no">2</span><div><h3>รูปแบบเกม</h3><small>${esc(UI.MODE_DESC[setup.mode])}</small></div></div>
                    <div class="panel-body"><div class="pick-modes">${Object.keys(Engine.MODES).map((k) => `<button type="button" class="pick-mode${setup.mode === k ? ' on' : ''}" data-mode="${k}" style="--c:${Engine.MODES[k].color}"><i class="fas ${Engine.MODES[k].icon}"></i><b>${esc(Engine.MODES[k].label)}</b></button>`).join('')}</div></div>
                </section>
                <section class="panel panel--orange">
                    <div class="panel-head"><span class="step-no">3</span><div><h3>ทีม</h3><small>2–6 ทีม • ชื่อทีมแก้ไขได้</small></div></div>
                    <div class="panel-body">
                        <div class="d-flex flex-wrap gap-2 mb-2"><div class="seg">${[2, 3, 4, 5, 6].map((c) => `<button type="button" data-count="${c}" class="${setup.count === c ? 'active' : ''}">${c} ทีม</button>`).join('')}</div>
                        <div class="seg seg-wrap">${Object.keys(Engine.TEAM_PRESETS).map((p) => `<button type="button" data-preset="${p}" class="${setup.preset === p ? 'active' : ''}">${esc(Engine.TEAM_PRESETS[p].label)}</button>`).join('')}</div></div>
                        <div class="team-inputs">${setup.names.slice(0, setup.count).map((nm, i) => `<label class="team-input" style="--c:${Engine.TEAM_COLORS[i]}"><span><i class="fas ${Engine.TEAM_ICONS[i]}"></i></span><input class="form-control" data-team="${i}" value="${esc(nm)}"></label>`).join('')}</div>
                    </div>
                </section>
                <section class="panel panel--green">
                    <div class="panel-head"><span class="step-no">4</span><div><h3>ระดับความยากและกติกา</h3><small>${esc(levelText(setup.mode, L))}</small></div></div>
                    <div class="panel-body">
                        <div class="seg mb-3">${Object.keys(Engine.LEVELS).map((k) => `<button type="button" data-level="${k}" class="${setup.level === k ? 'active' : ''}">${esc(Engine.LEVELS[k].label)}</button>`).join('')}</div>
                        <div class="row g-2">
                            ${setup.mode === 'memory' ? '' : `<div class="col-6"><label class="form-label">${setup.mode === 'match' ? 'จำนวนรอบ (สูงสุด)' : 'จำนวนข้อ'}</label><div class="seg seg-wrap">${(setup.mode === 'match' ? [2, 3, 4, 6] : [5, 10, 15, 20]).map((r) => `<button type="button" data-rounds="${r}" class="${setup.rounds === r ? 'active' : ''}">${r}</button>`).join('')}</div></div>`}
                            <div class="col-6"><label class="form-label">คะแนนต่อ${setup.mode === 'memory' || setup.mode === 'match' ? 'คู่' : 'ข้อ'}</label><div class="seg">${[5, 10, 20].map((r) => `<button type="button" data-points="${r}" class="${setup.points === r ? 'active' : ''}">${r}</button>`).join('')}</div></div>
                            ${setup.mode === 'memory' ? '' : `<div class="col-12"><label class="form-label">เวลา (วินาที)</label><div class="seg seg-wrap"><button type="button" data-time="0" class="${!setup.time ? 'active' : ''}">ตามระดับ (${setup.mode === 'match' ? L.matchTime : L.quizTime})</button>${[10, 20, 30, 60, 90].map((r) => `<button type="button" data-time="${r}" class="${setup.time === r ? 'active' : ''}">${r}</button>`).join('')}</div></div>`}
                        </div>
                        <label class="form-label mt-3">ชื่อการแข่งขัน (ไว้ใช้ในรายงาน — เว้นว่างได้)</label>
                        <input class="form-control" id="pl-title" value="${esc(setup.title)}">${UI.chips('#pl-title', UI.PRESET.titles(s).slice(0, 4))}
                    </div>
                </section>
            </div>
            <div class="start-bar">
                <div>${s ? `<b>${esc(s.name)}</b> • ${esc(Engine.MODES[setup.mode].label)} • ${setup.count} ทีม • ${esc(L.label)}` : 'ยังไม่ได้เลือกชุดเนื้อหา'}
                    ${s && n < need ? `<div class="text-danger small fw-bold"><i class="fas fa-triangle-exclamation"></i> ชุดนี้มีคู่ที่ครบ ${n} คู่ ต้องมีอย่างน้อย ${need} คู่</div>` : ''}</div>
                <button type="button" class="btn-x cta lg" data-act="start" ${s && n >= need ? '' : 'disabled'}><i class="fas fa-play"></i> เริ่มเกม</button>
            </div>`;
        UI.bindChips(el);
        el.oninput = (e) => {
            if (e.target.dataset.team != null) setup.names[Number(e.target.dataset.team)] = e.target.value;
            if (e.target.id === 'pl-title') setup.title = e.target.value;
        };
        el.onclick = (e) => {
            const t = e.target.closest('[data-set],[data-mode],[data-count],[data-preset],[data-level],[data-rounds],[data-points],[data-time],[data-act]');
            if (!t) return;
            const ds = t.dataset;
            if (ds.set) setup.setId = ds.set;
            else if (ds.mode) setup.mode = ds.mode;
            else if (ds.count) setup.count = Number(ds.count);
            else if (ds.preset) { setup.preset = ds.preset; setup.names = Engine.TEAM_PRESETS[ds.preset].names.slice(); }
            else if (ds.level) setup.level = ds.level;
            else if (ds.rounds) setup.rounds = Number(ds.rounds);
            else if (ds.points) setup.points = Number(ds.points);
            else if (ds.time) setup.time = Number(ds.time);
            else if (ds.act === 'start') { start(); return; }
            const y = window.scrollY;
            renderSetup(el, {});
            window.scrollTo(0, y);
        };
    }
    function levelText(mode, L) {
        if (mode === 'memory') return `${L.memoryPairs} คู่ (${L.memoryPairs * 2} ใบ)`;
        if (mode === 'match') return `รอบละ ${L.matchPairs} คู่ • ${L.matchTime} วินาที`;
        if (mode === 'quiz') return `${L.choices} ตัวเลือก • ${L.quizTime} วินาที`;
        return `${L.boxes} กล่อง • ${L.choices} ตัวเลือก • ${L.quizTime} วินาที`;
    }

    function start() {
        const s = Store.set(setup.setId);
        const st = Store.data.settings;
        Object.assign(st, { level: setup.level, teamPreset: setup.preset, teamCount: setup.count, points: setup.points, rounds: setup.rounds, time: setup.time });
        const teams = setup.names.slice(0, setup.count).map((name, i) => ({ name: U.norm(name) || Engine.TEAM_PRESETS[setup.preset].names[i] }));
        const g = Engine.newGame(s, setup.mode, teams, { level: setup.level, points: setup.points, rounds: setup.rounds, speedBonus: st.speedBonus, time: setup.time }, { title: U.norm(setup.title), dateText: UI.todayText() });
        phase = ''; lastRes = null; links = {}; pickLeft = null;
        if (live()) { if (live().log.length) Store.finishLive(); else Store.dropLive(); } // เกมค้างเดิม → บันทึกผลก่อน
        Store.saveLive(g, { immediate: true });
        if (location.hash !== '#/play') history.replaceState(null, '', '#/play');
        Sound.play('show');
        render(root, {});
    }

    /* ======================= หน้าจอเกม ======================= */
    function render(el, params) {
        root = el;
        stopTimer();
        const p = params || {};
        if (!live() || p.new || p.set || p.mode) { if (live() && (p.set || p.mode || p.new)) renderSetupGuard(el, p); else renderSetup(el, p); return; }
        renderGame(el);
    }
    /* มีเกมค้างอยู่แต่กดเริ่มเกมใหม่ → ถามก่อน */
    function renderSetupGuard(el, p) {
        renderSetup(el, p);
        const n = el.querySelector('.hero-sub');
        if (n) n.innerHTML += ' <span class="tag warn"><i class="fas fa-circle-play"></i>มีเกมเล่นค้างอยู่ — เริ่มเกมใหม่จะบันทึกผลเกมเดิมก่อน</span>';
    }

    function renderGame(el) {
        const g = live();
        const m = Engine.MODES[g.mode];
        el.onclick = null; // ล้างตัวจัดการของหน้าตั้งค่า (เผื่อเริ่มเกมจากหน้าเดิม)
        el.oninput = null;
        el.innerHTML = `
            <div class="game mode-${g.mode}" id="game">
                <div class="game-top">
                    <span class="gt-mode" style="--c:${m.color}"><i class="fas ${m.icon}"></i></span>
                    <div class="gt-title"><b>${esc(g.title || g.setName)}</b><small>${esc(g.setName)} • ${esc(m.label)} • ${esc(Engine.LEVELS[g.opts.level].label)}</small></div>
                    <span class="gt-prog" id="gt-prog"></span>
                    <span class="gt-timer" id="gt-timer" hidden></span>
                    <div class="gt-tools">
                        <button type="button" class="g-btn" data-act="sound" title="เปิด/ปิดเสียง"><i class="fas ${Sound.enabled ? 'fa-volume-high' : 'fa-volume-xmark'}"></i></button>
                        <button type="button" class="g-btn" data-act="fs" title="เต็มจอ (F)"><i class="fas fa-expand"></i></button>
                        ${g.mode === 'memory' ? '' : '<button type="button" class="g-btn" data-act="skip" title="ข้ามข้อ/รอบนี้"><i class="fas fa-forward"></i></button>'}
                        <button type="button" class="g-btn" data-act="adjust" title="ปรับคะแนน"><i class="fas fa-plus-minus"></i></button>
                        <button type="button" class="g-btn end" data-act="end" title="จบเกม"><i class="fas fa-flag-checkered"></i><span class="tb-hide-sm"> จบเกม</span></button>
                    </div>
                </div>
                <div class="team-strip" id="team-strip"></div>
                <div class="stage" id="stage"></div>
            </div>`;
        el.querySelector('#game').addEventListener('click', onGameClick);
        bindMatchPointer(el.querySelector('#stage'));
        if (document.body.classList.contains('game-fs')) el.querySelector('#game').classList.add('fs');
        lastSig = '';
        update();
    }

    function teamStrip(g) {
        const cur = Engine.team(g);
        const max = Math.max(1, ...g.teams.map((t) => t.score));
        return g.teams.map((t, i) => `<div class="ts-team${t.id === cur.id && g.status === 'playing' ? ' on' : ''}" style="--c:${esc(t.color)}">
            <span class="ts-ic"><i class="fas ${esc(t.icon)}"></i></span><span class="ts-name">${esc(t.name)}<small>แป้น ${i + 1}</small></span><b class="ts-score">${UI.fmt(t.score)}</b>
            <span class="ts-bar"><span style="width:${Math.max(3, (Math.max(0, t.score) / max) * 100)}%"></span></span>
            ${t.id === cur.id ? '<span class="ts-turn"><i class="fas fa-caret-down"></i> ถึงตา</span>' : ''}</div>`).join('');
    }

    function update() {
        const g = live();
        if (!g || !root || !root.querySelector('#stage')) return;
        root.querySelector('#team-strip').innerHTML = teamStrip(g);
        root.querySelector('#gt-prog').textContent = Engine.progress(g).label;
        const stage = root.querySelector('#stage');
        if (Engine.isOver(g) && !phase && !busy) { finish(); return; }
        if (g.mode === 'memory') drawMemory(stage, g);
        else if (g.mode === 'match') drawMatch(stage, g);
        else drawQuiz(stage, g);
    }

    /* ---------- เปิดไพ่ ---------- */
    function drawMemory(stage, g) {
        const sig = `mem:${g.id}:${g.cards.length}`;
        const n = g.cards.length;
        const cols = n <= 12 ? 4 : n <= 16 ? 4 : n <= 20 ? 5 : 6;
        if (lastSig !== sig) {
            lastSig = sig;
            const back = Store.data.settings.cardBack;
            const ic = { star: 'fa-star', heart: 'fa-heart', school: 'fa-school', question: 'fa-question' }[back] || 'fa-star';
            stage.innerHTML = `<div class="mem-grid" style="--cols:${cols};--rows:${Math.ceil(n / cols)}">${g.cards.map((c, i) => {
                const p = Engine.pairOf(g, c.k);
                return `<button type="button" class="mcard" data-card="${i}" aria-label="การ์ดใบที่ ${i + 1}"><span class="mc-in"><span class="mc-back"><i class="fas ${ic}"></i><b>${i + 1}</b></span><span class="mc-front side-${c.side}">${UI.face(p, c.side)}</span></span></button>`;
            }).join('')}</div><div class="stage-hint" id="mem-hint"></div>`;
        }
        stage.querySelectorAll('.mcard').forEach((b, i) => {
            const c = g.cards[i];
            const t = c.by ? g.teams.find((x) => x.id === c.by) : null;
            b.classList.toggle('open', g.open.includes(i) || !!c.by);
            b.classList.toggle('done', !!c.by);
            b.style.setProperty('--tc', t ? t.color : 'transparent');
        });
        const t = Engine.team(g);
        stage.querySelector('#mem-hint').innerHTML = `<span class="team-chip" style="--c:${esc(t.color)}"><i class="fas ${esc(t.icon)}"></i>${esc(t.name)}</span> เปิดการ์ด 2 ใบ — ถ้าเป็นคู่กันได้ ${g.opts.points} คะแนนและเปิดต่อ`;
    }
    function flipCard(i) {
        const g = live();
        if (busy || !g) return;
        const r = Engine.flip(g, i);
        if (r.type === 'ignore') return;
        Sound.play('flip');
        if (r.type === 'match') {
            busy = true;
            update();
            setTimeout(() => { Sound.play('correct'); Fx.pop && Fx.pop(); }, 450);
            setTimeout(() => { busy = false; save(); update(); }, r.over ? 1400 : 500);
            return;
        }
        update();
        if (r.type === 'miss') {
            busy = true;
            setTimeout(() => Sound.play('wrong'), 450);
            setTimeout(() => { Engine.closeMiss(g); busy = false; save(); update(); }, 1500);
        } else save();
    }

    /* ---------- ลากเส้นจับคู่ ---------- */
    function drawMatch(stage, g) {
        const r = g.rounds[g.step];
        const res = phase === 'result' ? lastRes : null;
        const rr = res ? g.rounds[res.step] : r;
        if (!rr) return;
        const t = res ? g.teams.find((x) => x.id === res.team) : Engine.team(g);
        stage.innerHTML = `
            <div class="match-head"><span class="team-chip big" style="--c:${esc(t.color)}"><i class="fas ${esc(t.icon)}"></i>${esc(t.name)}</span>
                <span>${res ? `ถูก <b>${res.correct}/${res.total}</b> คู่ ได้ <b>${res.points}</b> คะแนน${res.bonus ? ' (รวมโบนัส)' : ''}` : 'แตะการ์ดซ้าย แล้วแตะการ์ดขวาที่เป็นคู่กัน (หรือลากเส้น) — แตะซ้ำเพื่อยกเลิกเส้น'}</span></div>
            <div class="match-board" id="match-board">
                <svg class="match-lines" id="match-lines"></svg>
                <div class="match-col left">${rr.left.map((id) => `<button type="button" class="mitem${pickLeft === id ? ' pick' : ''}${(res ? res.links : links)[id] ? ' linked' : ''}" data-left="${esc(id)}">${UI.face(Engine.pairOf(g, id), 'a')}<span class="dot"></span></button>`).join('')}</div>
                <div class="match-col right">${rr.right.map((id) => `<button type="button" class="mitem${Object.values(res ? res.links : links).includes(id) ? ' linked' : ''}" data-right="${esc(id)}"><span class="dot"></span>${UI.face(Engine.pairOf(g, id), 'b')}</button>`).join('')}</div>
            </div>
            <div class="stage-actions">${res ? `<button type="button" class="btn-x cta lg" data-act="next"><i class="fas fa-arrow-right"></i> ${Engine.isOver(g) ? 'ดูผลการแข่งขัน' : 'รอบถัดไป'} <kbd>N</kbd></button>`
                : `<button type="button" class="btn-x ghost lg" data-act="clear-lines" data-demo-allow><i class="fas fa-eraser"></i> ล้างเส้น</button><button type="button" class="btn-x cta lg" data-act="submit"><i class="fas fa-check"></i> ส่งคำตอบ (${Object.keys(links).length}/${rr.left.length}) <kbd>Enter</kbd></button>`}</div>`;
        requestAnimationFrame(() => drawLines(g, rr, res));
        if (!res && !timer) startTimer(Engine.timeOf(g), () => submitMatch(true));
    }
    function drawLines(g, rr, res) {
        const board = root && root.querySelector('#match-board');
        if (!board) return;
        const svg = board.querySelector('#match-lines');
        const br = board.getBoundingClientRect();
        svg.setAttribute('viewBox', `0 0 ${br.width} ${br.height}`);
        const L = res ? res.links : links;
        const t = res ? g.teams.find((x) => x.id === res.team) : Engine.team(g);
        svg.innerHTML = Object.keys(L).map((l) => {
            const a = board.querySelector(`[data-left="${CSS.escape(l)}"] .dot`);
            const b = board.querySelector(`[data-right="${CSS.escape(L[l])}"] .dot`);
            if (!a || !b) return '';
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            const x1 = ra.left + ra.width / 2 - br.left; const y1 = ra.top + ra.height / 2 - br.top;
            const x2 = rb.left + rb.width / 2 - br.left; const y2 = rb.top + rb.height / 2 - br.top;
            const col = res ? (l === L[l] ? '#16a34a' : '#dc2626') : t.color;
            return `<path d="M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}" stroke="${col}" stroke-width="6" fill="none" stroke-linecap="round"${res && l !== L[l] ? ' stroke-dasharray="10 9"' : ''}/>`;
        }).join('') + (drag ? `<path d="M${drag.x1} ${drag.y1} L${drag.x2} ${drag.y2}" stroke="${t.color}" stroke-width="5" stroke-dasharray="8 8" fill="none" stroke-linecap="round"/>` : '');
    }
    function setLink(l, r) {
        Object.keys(links).forEach((k) => { if (links[k] === r) delete links[k]; });
        links[l] = r;
        pickLeft = null;
        Sound.play('pick');
        update();
    }
    function submitMatch(timeUp) {
        const g = live();
        if (!g || phase === 'result') return;
        const left = timer ? timer.left : 0;
        stopTimer();
        const step = g.step;
        const r = Engine.submitMatch(g, links, timeUp ? 0 : left);
        lastRes = Object.assign({ step, links: Object.assign({}, links) }, r);
        phase = 'result';
        links = {}; pickLeft = null;
        Sound.play(timeUp && r.correct < r.total ? 'timeup' : r.correct === r.total ? 'correct' : r.correct ? 'score' : 'wrong');
        if (r.correct === r.total) Fx.pop && Fx.pop();
        save();
        update();
    }
    /* ลากเส้นด้วยเมาส์/นิ้ว (pointer events) — แตะซ้าย-ขวาก็ได้ */
    let drag = null;
    function bindMatchPointer(stage) {
        stage.addEventListener('pointerdown', (e) => {
            const g = live();
            const it = e.target.closest('[data-left]');
            if (!g || g.mode !== 'match' || phase === 'result' || !it) return;
            const br = stage.querySelector('#match-board').getBoundingClientRect();
            const d = it.querySelector('.dot').getBoundingClientRect();
            drag = { l: it.dataset.left, x1: d.left + d.width / 2 - br.left, y1: d.top + d.height / 2 - br.top, x2: e.clientX - br.left, y2: e.clientY - br.top, moved: false };
        });
        stage.addEventListener('pointermove', (e) => {
            if (!drag) return;
            const br = stage.querySelector('#match-board').getBoundingClientRect();
            drag.x2 = e.clientX - br.left; drag.y2 = e.clientY - br.top;
            if (Math.abs(drag.x2 - drag.x1) > 12) drag.moved = true;
            const g = live();
            drawLines(g, g.rounds[g.step], null);
        });
        const end = (e) => {
            if (!drag) return;
            const d = drag;
            drag = null;
            if (!d.moved) return; // แตะเฉย ๆ → ให้ click จัดการ
            const el = document.elementFromPoint(e.clientX, e.clientY);
            const r = el && el.closest('[data-right]');
            if (r) setLink(d.l, r.dataset.right); else update();
            suppressClick = true;
            setTimeout(() => { suppressClick = false; }, 0);
        };
        stage.addEventListener('pointerup', end);
        stage.addEventListener('pointercancel', () => { drag = null; update(); });
    }
    let suppressClick = false;

    /* ---------- ทายใจ / กล่องรางวัล ---------- */
    function drawQuiz(stage, g) {
        const q = Engine.question(g) || (lastRes && lastRes.q);
        if (phase === 'box') { drawBoxes(stage, g); return; }
        const res = phase === 'reveal' ? lastRes : null;
        const qq = res ? res.q : q;
        if (!qq) return;
        const t = res ? g.teams.find((x) => x.id === res.team) : Engine.team(g);
        const COLORS = ['#ef4444', '#2563eb', '#16a34a', '#f59e0b'];
        const shapes = ['fa-circle', 'fa-square', 'fa-play', 'fa-star'];
        stage.innerHTML = `
            <div class="quiz">
                <div class="quiz-q"><span class="team-chip big" style="--c:${esc(t.color)}"><i class="fas ${esc(t.icon)}"></i>${esc(t.name)}</span>
                    <div class="quiz-prompt">${UI.face(qq.pair, 'a')}</div>
                    <small class="muted">${esc(promptText(g))}</small></div>
                <div class="quiz-choices n${qq.choices.length}">${qq.choices.map((c, i) => {
                    let cls = '';
                    if (res) cls = c === qq.pair.b ? ' right' : c === res.chose ? ' wrong' : ' dim';
                    return `<button type="button" class="qc${cls}" data-choice="${i}" style="--c:${COLORS[i]}"><i class="fas ${shapes[i]}"></i><span>${esc(c)}</span><kbd>${i + 1}</kbd></button>`;
                }).join('')}</div>
                ${res ? `<div class="quiz-result ${res.ok ? 'ok' : 'bad'}"><i class="fas ${res.ok ? 'fa-circle-check' : res.chose == null ? 'fa-hourglass-end' : 'fa-circle-xmark'}"></i> ${res.ok ? `ถูกต้อง! ${g.mode === 'quiz' ? `+${res.points} คะแนน` : ''}` : res.chose == null ? 'หมดเวลา' : 'ยังไม่ถูก'} — คำตอบคือ <b>${esc(qq.pair.b)}</b>
                    <button type="button" class="btn-x cta lg" data-act="next">${res.box ? '<i class="fas fa-gift"></i> เลือกกล่องรางวัล' : `<i class="fas fa-arrow-right"></i> ${Engine.isOver(g) ? 'ดูผลการแข่งขัน' : 'ข้อถัดไป'}`} <kbd>N</kbd></button></div>` : ''}
            </div>`;
        if (!res && !timer) startTimer(Engine.timeOf(g), () => choose(null));
    }
    function promptText(g) {
        if (g.kind === 'image') return 'ภาพนี้คืออะไร?';
        if (g.kind === 'qa') return 'คำตอบของโจทย์นี้คืออะไร?';
        return 'ข้อใดเป็นคู่ / ความหมายที่ถูกต้อง?';
    }
    function choose(idx) {
        const g = live();
        if (!g || phase) return;
        const q = Engine.question(g);
        const left = timer ? timer.left : 0;
        stopTimer();
        const r = Engine.answer(g, idx == null ? null : q.choices[idx], left);
        lastRes = Object.assign({ q }, r, { chose: idx == null ? null : q.choices[idx] });
        phase = 'reveal';
        Sound.play(r.ok ? 'correct' : idx == null ? 'timeup' : 'wrong');
        if (r.ok) Fx.pop && Fx.pop();
        save();
        update();
    }
    function drawBoxes(stage, g) {
        const t = g.teams.find((x) => x.id === (lastRes && lastRes.team)) || Engine.team(g);
        const opened = lastRes && lastRes.opened;
        stage.innerHTML = `
            <div class="box-head"><span class="team-chip big" style="--c:${esc(t.color)}"><i class="fas ${esc(t.icon)}"></i>${esc(t.name)}</span>
                <span>${opened ? `ได้ <b>${esc(Engine.boxLabel(opened.box))}</b>${opened.box.t === 'add' ? ' คะแนน' : opened.points ? ` (${opened.points > 0 ? '+' : ''}${opened.points} คะแนน)` : ''}` : 'เลือกกล่องรางวัล 1 กล่อง!'}</span></div>
            <div class="box-grid n${g.boxes.length}">${g.boxes.map((b, i) => {
                const by = b.by ? g.teams.find((x) => x.id === b.by) : null;
                return `<button type="button" class="pbox${b.by ? ' open' : ''}${opened && opened.idx === i ? ' just' : ''} t-${b.t}" data-box="${i}" ${b.by ? 'disabled' : ''} style="--tc:${by ? esc(by.color) : 'transparent'}">
                    ${b.by ? `<span class="pb-val">${esc(Engine.boxLabel(b))}</span>` : `<i class="fas fa-gift"></i><b>${i + 1}</b>`}</button>`;
            }).join('')}</div>
            ${opened ? `<div class="stage-actions"><button type="button" class="btn-x cta lg" data-act="next"><i class="fas fa-arrow-right"></i> ${Engine.isOver(g) ? 'ดูผลการแข่งขัน' : 'ข้อถัดไป'} <kbd>N</kbd></button></div>` : ''}`;
    }
    function pickBox(i) {
        const g = live();
        if (!g || phase !== 'box' || (lastRes && lastRes.opened)) return;
        const r = Engine.openBox(g, i);
        if (!r) return;
        lastRes = Object.assign({}, lastRes, { opened: Object.assign({ idx: i }, r) });
        Sound.play(r.points > 0 ? 'reveal' : r.points < 0 ? 'minus' : 'wrong');
        if (r.points > 0) Fx.pop && Fx.pop();
        save();
        update();
    }
    function next() {
        const g = live();
        if (!g) return;
        if (phase === 'reveal' && lastRes && lastRes.box) { phase = 'box'; Sound.play('show'); update(); return; }
        phase = ''; lastRes = null;
        Sound.play('next');
        update();
    }

    /* ---------- เวลา ---------- */
    function startTimer(sec, onEnd) {
        stopTimer();
        if (!sec) return;
        timer = { left: sec, total: sec };
        const show = () => {
            const el = root && root.querySelector('#gt-timer');
            if (!el) return;
            el.hidden = false;
            el.classList.toggle('low', timer.left <= 5);
            el.innerHTML = `<i class="fas fa-stopwatch"></i> ${timer.left}`;
            el.style.setProperty('--p', `${(timer.left / timer.total) * 100}%`);
        };
        show();
        timer.id = setInterval(() => {
            if (!timer) return;
            timer.left -= 1;
            if (timer.left <= 5 && timer.left > 0) Sound.play('tick');
            show();
            if (timer.left <= 0) { stopTimer(); onEnd(); }
        }, 1000);
    }
    function stopTimer() {
        if (timer && timer.id) clearInterval(timer.id);
        timer = null;
        const el = root && root.querySelector('#gt-timer');
        if (el) el.hidden = true;
    }

    /* ---------- จบเกม ---------- */
    function finish() {
        stopTimer();
        const g = Store.finishLive();
        phase = ''; lastRes = null;
        if (!g) { render(root, {}); return; }
        const rk = Engine.ranking(g);
        const stage = root.querySelector('#stage');
        root.querySelector('#team-strip').innerHTML = '';
        root.querySelector('#gt-prog').textContent = 'จบเกม';
        root.querySelectorAll('[data-act="skip"],[data-act="adjust"],[data-act="end"]').forEach((b) => b.remove());
        const podium = [rk[1], rk[0], rk[2]].filter(Boolean);
        stage.innerHTML = `
            <div class="finale">
                <h2><i class="fas fa-trophy"></i> ประกาศผล${rk[0] && rk.filter((t) => t.rank === 1).length > 1 ? ' — คะแนนเท่ากัน ชนะเลิศร่วม' : ''}</h2>
                <div class="podium">${podium.map((t) => `<div class="pd r${t.rank}" style="--c:${esc(t.color)}"><span class="pd-ic"><i class="fas ${esc(t.icon)}"></i></span><b>${esc(t.name)}</b><span class="pd-score">${UI.fmt(t.score)} คะแนน</span><span class="pd-step">${t.rank}</span></div>`).join('')}</div>
                ${rk.length > 3 ? `<div class="finale-rest">${rk.slice(3).map((t) => `${UI.rankBadge(t.rank)} ${UI.teamChip(t)} <b>${UI.fmt(t.score)}</b>`).join(' &nbsp; ')}</div>` : ''}
                <div class="stage-actions"><a class="btn-x primary lg" href="#/result?id=${esc(g.id)}" data-fin><i class="fas fa-file-lines"></i> ผลการแข่งขัน / รายงาน</a><a class="btn-x ghost lg" href="#/board?id=${esc(g.id)}" data-fin><i class="fas fa-chart-simple"></i> กระดานคะแนน</a><a class="btn-x cta lg" href="#/play?new=1&set=${esc(g.setId)}&mode=${esc(g.mode)}" data-fin><i class="fas fa-rotate-right"></i> เล่นอีกครั้ง</a></div>
            </div>`;
        stage.querySelectorAll('[data-fin]').forEach((a) => a.addEventListener('click', () => { Fx.stop(); exitFs(); }));
        Sound.play('fanfare');
        Fx.fireworks(6000);
    }

    async function endGame() {
        const g = live();
        const ok = await U.confirm('จบเกมตอนนี้?', `ผลคะแนนปัจจุบันจะถูกบันทึกเป็นผลการแข่งขัน${g.log.length ? '' : '<br><small>(ยังไม่มีการเล่น — เกมนี้จะไม่ถูกบันทึก)</small>'}`, { icon: 'question', confirmText: '<i class="fas fa-flag-checkered"></i> จบเกมและประกาศผล' });
        if (!ok) return;
        if (!g.log.length) { stopTimer(); Store.dropLive(); exitFs(); render(root, {}); return; }
        finish();
    }
    async function adjustScore() {
        const g = live();
        const r = await UI.sheet({
            title: 'ปรับคะแนน', icon: 'fa-plus-minus', sub: 'ใช้เมื่อให้คะแนนพิเศษ/หักคะแนน (บันทึกในรายงาน)', confirmText: '<i class="fas fa-check"></i> ปรับคะแนน',
            body: `<label class="form-label">ทีม</label><div class="seg seg-wrap" id="aj-team">${g.teams.map((t, i) => `<button type="button" data-v="${t.id}" class="${i === g.turn ? 'active' : ''}">${esc(t.name)}</button>`).join('')}</div>
                <label class="form-label mt-2">คะแนน</label><div class="seg seg-wrap" id="aj-delta">${[-10, -5, 5, 10, 20].map((v) => `<button type="button" data-v="${v}" class="${v === 5 ? 'active' : ''}">${v > 0 ? '+' : ''}${v}</button>`).join('')}</div>
                <label class="form-label mt-2">เหตุผล</label><input class="form-control" id="aj-reason" value="คะแนนพิเศษ">${UI.chips('#aj-reason', ['คะแนนพิเศษ', 'มารยาทดี', 'ช่วยเหลือเพื่อน', 'ส่งเสียงดังรบกวน', 'ตอบนอกตา'])}`,
            didOpen: (pop) => { UI.bindChips(pop); ['#aj-team', '#aj-delta'].forEach((s) => { pop.querySelector(s).onclick = (e) => { const b = e.target.closest('button'); if (b) pop.querySelectorAll(`${s} button`).forEach((x) => x.classList.toggle('active', x === b)); }; }); },
            preConfirm: () => ({ team: document.querySelector('#aj-team .active').dataset.v, delta: Number(document.querySelector('#aj-delta .active').dataset.v), reason: U.norm(document.getElementById('aj-reason').value) }),
        });
        if (!r.isConfirmed) return;
        Engine.adjust(g, r.value.team, r.value.delta, r.value.reason);
        Sound.play(r.value.delta > 0 ? 'score' : 'minus');
        save();
        update();
    }

    /* ---------- เต็มจอ ---------- */
    function enterFs() {
        document.body.classList.add('game-fs');
        const de = document.documentElement;
        if (de.requestFullscreen && !document.fullscreenElement) de.requestFullscreen().catch(() => {});
        const gm = root.querySelector('#game');
        if (gm) gm.classList.add('fs');
        setTimeout(update, 120);
    }
    function exitFs() {
        document.body.classList.remove('game-fs');
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
        const gm = root && root.querySelector('#game');
        if (gm) gm.classList.remove('fs');
        if (live() && gm) setTimeout(update, 120);
    }
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('game-fs')) exitFs(); });
    window.addEventListener('resize', U.debounce(() => { const g = live(); if (g && g.mode === 'match' && root && root.querySelector('#match-board')) update(); }, 150));

    function onGameClick(e) {
        if (suppressClick) { suppressClick = false; return; }
        const card = e.target.closest('[data-card]');
        if (card) { flipCard(Number(card.dataset.card)); return; }
        const l = e.target.closest('[data-left]');
        if (l && phase !== 'result') { const id = l.dataset.left; if (links[id]) { delete links[id]; pickLeft = null; } else pickLeft = pickLeft === id ? null : id; Sound.play('flip'); update(); return; }
        const r = e.target.closest('[data-right]');
        if (r && phase !== 'result') { if (pickLeft) setLink(pickLeft, r.dataset.right); else U.toast('แตะการ์ดฝั่งซ้ายก่อน แล้วค่อยแตะฝั่งขวา', { type: 'info', ms: 1800 }); return; }
        const c = e.target.closest('[data-choice]');
        if (c) { choose(Number(c.dataset.choice)); return; }
        const bx = e.target.closest('[data-box]');
        if (bx) { pickBox(Number(bx.dataset.box)); return; }
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const a = b.dataset.act;
        if (a === 'fs') { if (document.body.classList.contains('game-fs')) exitFs(); else enterFs(); }
        else if (a === 'sound') { const st = Store.data.settings; st.sound = !Sound.enabled; Sound.set({ enabled: st.sound }); Store.commit('settings', { quiet: true }); b.innerHTML = `<i class="fas ${Sound.enabled ? 'fa-volume-high' : 'fa-volume-xmark'}"></i>`; }
        else if (a === 'skip') {
            if (phase === 'reveal' || phase === 'result' || (phase === 'box' && lastRes && lastRes.opened)) { b.closest('#game').querySelector('[data-act="next"]').click(); return; }
            if (phase === 'box') { Engine.skip(live()); phase = ''; lastRes = null; save(); update(); return; }
            stopTimer(); Engine.skip(live()); links = {}; pickLeft = null; Sound.play('next'); save(); update(); }
        else if (a === 'adjust') adjustScore();
        else if (a === 'end') endGame();
        else if (a === 'submit') submitMatch(false);
        else if (a === 'clear-lines') { links = {}; pickLeft = null; update(); }
        else if (a === 'next') { if (live() && live().mode === 'match') { phase = ''; lastRes = null; Sound.play('next'); update(); } else next(); }
    }

    function key(e) {
        const g = live();
        if (!g || App.current !== 'play' || !root.querySelector('#game')) return;
        if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); // กัน Space/Enter กดปุ่มที่โฟกัสซ้ำ
        const k = e.key.toLowerCase();
        if (k === 'f') { e.preventDefault(); if (document.body.classList.contains('game-fs')) exitFs(); else enterFs(); return; }
        if (k === 'n' || (k === 'enter' && phase)) { const b = root.querySelector('[data-act="next"]'); if (b) { e.preventDefault(); b.click(); } return; }
        if (k === 'enter' && g.mode === 'match' && !phase) { e.preventDefault(); submitMatch(false); return; }
        if ((g.mode === 'quiz' || g.mode === 'box') && !phase && /^[1-4]$/.test(k)) { const i = Number(k) - 1; if (Engine.question(g) && i < Engine.question(g).choices.length) choose(i); }
    }

    function leave() { stopTimer(); Fx.stop(); exitFs(); phase = ''; lastRes = null; links = {}; pickLeft = null; busy = false; }

    window.Views.play = {
        render(el, params) {
            const p = params || {};
            // เริ่มเกมใหม่ทั้งที่มีเกมค้าง: บันทึกผลเกมเดิมก่อน (ถ้ามีการเล่นแล้ว)
            if (p.new && live()) { if (live().log.length) Store.finishLive(); else Store.dropLive(); }
            render(el, p.new ? Object.assign({}, p, { new: '' }) : p);
        },
        refresh(reason) { if (reason === 'replace' || reason === 'reset') { setup = null; render(root, {}); } else if (!live() && reason === 'sets') renderSetup(root, {}); },
        key, leave,
        _test: { start: () => start(), get setup() { return setup; }, get phase() { return phase; } },
    };
})();
