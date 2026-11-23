/* =====================================================================
   สุ่มที่นั่ง: กำหนดแถว × แถวตอน → สุ่มที่นั่ง (สลับชาย-หญิงได้) ที่ว่างอยู่หลังห้อง
   แตะ 2 ที่นั่งเพื่อสลับ • พิมพ์ผังที่นั่ง A4 แนวนอน • Excel • เต็มจอ
   ===================================================================== */
(function () {
    'use strict';

    let root = null;
    let opts = { rows: 5, cols: 7, alternate: true, title: '' };
    let picked = null;
    let timers = [];
    let animating = false;

    const L = () => Store.currentList();
    const current = (l) => Store.data.history.find((x) => x.mode === 'seat' && x.listId === (l && l.id)) || null;
    const MAXR = 12;
    const MAXC = 12;

    function render(el) {
        root = el;
        picked = null;
        const d = Store.data;
        el.innerHTML = `
            ${U.hero({ cls: 'hero--seat', icon: 'fa-chair', title: 'สุ่มที่นั่ง', sub: 'สุ่มที่นั่งในห้องเรียนแบบยุติธรรม สลับชาย-หญิงได้ ปรับเองด้วยการแตะสลับ แล้วพิมพ์ผังที่นั่งติดหน้าห้อง' })}
            ${d.lists.length ? `
            <div class="panel panel--theme">
                <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-sliders"></i></span><div><h3>ตั้งค่าห้อง</h3><small id="st-preview"></small></div></div>
                <div class="panel-body"><div class="gp-form" id="st-form"></div></div>
            </div>
            <section class="stage-area seat-stage" id="st-stage">
                <div class="stage-top">
                    <div class="stage-title"><span class="stage-ic"><i class="fas fa-chair"></i></span><div><b id="st-title">ผังที่นั่ง</b><small id="st-sub"></small></div></div>
                    <div class="stage-tools" id="st-tools"></div>
                </div>
                <div id="st-room"></div>
            </section>` : App.noListState('fa-chair')}`;
        if (!d.lists.length) return;
        const h = current(L());
        if (h) { opts.rows = h.data.rows; opts.cols = h.data.cols; }
        renderForm();
        renderResult(false);
    }

    function renderForm() {
        const l = L();
        const n = Store.present(l).length;
        const box = root.querySelector('#st-form');
        const step = (id, label, v, max) => `<div class="gp-field gp-num"><label class="form-label" for="${id}">${label}</label>
            <div class="num-step"><button type="button" data-for="${id}" data-d="-1" aria-label="ลด"><i class="fas fa-minus"></i></button><input class="form-control" id="${id}" type="number" min="1" max="${max}" inputmode="numeric" value="${v}"><button type="button" data-for="${id}" data-d="1" aria-label="เพิ่ม"><i class="fas fa-plus"></i></button></div></div>`;
        box.innerHTML = `
            <div class="gp-field gp-list"><label class="form-label" for="st-list">ห้องเรียน</label>${App.listSelect(l.id, 'id="st-list"')}</div>
            ${step('st-rows', 'จำนวนแถว (หน้า→หลัง)', opts.rows, MAXR)}
            ${step('st-cols', 'ที่นั่งต่อแถว', opts.cols, MAXC)}
            <div class="gp-field gp-act"><label class="form-label" for="st-t">ชื่อผัง</label><input class="form-control" id="st-t" maxlength="100" placeholder="เช่น ผังที่นั่งประจำเดือนพฤศจิกายน" value="${U.esc(opts.title)}"></div>
            <div class="gp-switches"><label class="opt-switch"><input type="checkbox" id="st-alt"${opts.alternate ? ' checked' : ''}${l.kind === 'custom' ? ' disabled' : ''}><div><b>สลับชาย-หญิง</b><small>ไม่ให้เพศเดียวกันนั่งติดกันเท่าที่ทำได้</small></div></label></div>
            <div class="gp-go"><button type="button" class="btn-x cta lg" id="st-go"${n ? '' : ' disabled'}><i class="fas fa-shuffle"></i>สุ่มที่นั่ง</button></div>`;
        const sync = () => {
            opts.rows = Math.max(1, Math.min(MAXR, U.toInt(box.querySelector('#st-rows').value, 5)));
            opts.cols = Math.max(1, Math.min(MAXC, U.toInt(box.querySelector('#st-cols').value, 7)));
            const cap = opts.rows * opts.cols;
            root.querySelector('#st-preview').innerHTML = `${n} คน (มาเรียน) • ${opts.rows} × ${opts.cols} = <b>${cap} ที่นั่ง</b>${cap < n ? ` <span class="tag bad">ที่นั่งไม่พอ ขาด ${n - cap} ที่</span>` : cap > n ? ` • ว่าง ${cap - n} ที่ (อยู่แถวหลัง)` : ' • พอดี'}`;
        };
        box.querySelector('#st-list').onchange = (e) => { picked = null; Store.setCurrent(e.target.value); };
        box.querySelectorAll('[data-d]').forEach((b) => {
            b.onclick = () => { const i = box.querySelector(`#${b.dataset.for}`); i.value = Math.max(1, Math.min(+i.max, U.toInt(i.value, 1) + +b.dataset.d)); sync(); };
        });
        box.querySelector('#st-rows').oninput = sync;
        box.querySelector('#st-cols').oninput = sync;
        box.querySelector('#st-t').oninput = (e) => { opts.title = e.target.value; };
        box.querySelector('#st-alt').onchange = (e) => { opts.alternate = e.target.checked; };
        box.querySelector('#st-go').onclick = draw;
        sync();
    }

    async function draw() {
        if (animating) return;
        const l = L();
        const people = Store.present(l);
        const cap = opts.rows * opts.cols;
        if (cap < people.length && !(await U.confirm('ที่นั่งไม่พอ', `มี ${people.length} คน แต่มี ${cap} ที่นั่ง — จะมี ${people.length - cap} คนที่ไม่ได้ที่นั่ง<br>เพิ่มแถวหรือที่นั่งต่อแถวก่อนดีไหม?`, { confirmText: 'สุ่มต่อไป', cancelText: 'กลับไปแก้', icon: 'warning' }))) return;
        Sound.unlock();
        const res = Engine.assignSeats(people, opts.rows, opts.cols, { alternate: opts.alternate && l.kind !== 'custom' });
        const placed = new Set(res.grid.flat().filter(Boolean).map((p) => p.id));
        Store.addHistory('seat', l, U.norm(opts.title) || 'ผังที่นั่ง', {
            rows: opts.rows,
            cols: opts.cols,
            alternate: opts.alternate && l.kind !== 'custom',
            grid: res.grid.map((r) => r.map((p) => (p ? Engine.snap(p) : null))),
            overflow: people.filter((p) => !placed.has(p.id)).map(Engine.snap),
        });
        picked = null;
        renderResult(true);
    }

    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function renderResult(animate) {
        clearTimers();
        const l = L();
        const h = current(l);
        const room = root.querySelector('#st-room');
        const tools = root.querySelector('#st-tools');
        root.querySelector('#st-title').textContent = h ? h.title || 'ผังที่นั่ง' : 'ผังที่นั่ง';
        const cnt = h ? h.data.grid.flat().filter(Boolean).length : 0;
        root.querySelector('#st-sub').innerHTML = h ? `${U.esc(`ห้อง ${l.name}`)} • ${h.data.rows} × ${h.data.cols} • ${cnt} คน${h.data.alternate ? ' • สลับชาย-หญิง' : ''} • ${U.esc(App.when(h.at))}` : 'ยังไม่ได้สุ่มที่นั่งสำหรับห้องนี้';
        tools.innerHTML = `${h ? `<button type="button" class="btn-x on-white sm" id="st-again"><i class="fas fa-shuffle"></i>สุ่มใหม่</button>
            <button type="button" class="btn-x on-dark sm" id="st-print" title="พิมพ์ผัง (A4)" aria-label="พิมพ์ผัง (A4)"><i class="fas fa-print"></i><span>พิมพ์ผัง (A4)</span></button>
            <button type="button" class="btn-x on-dark sm" id="st-xlsx" title="ส่งออก Excel" aria-label="ส่งออก Excel"><i class="fas fa-file-excel"></i><span>Excel</span></button>` : ''}${App.stageButton('on-dark')}`;
        App.bindStage(root, root.querySelector('#st-stage'));
        if (Stage.isOn()) tools.querySelector('[data-stage-toggle]').innerHTML = '<i class="fas fa-compress"></i><span>ออกจากเต็มจอ</span>';
        if (!h) {
            room.innerHTML = '<div class="stage-empty"><i class="fas fa-chair"></i><b>กำหนดแถว × ที่นั่งต่อแถว แล้วกด "สุ่มที่นั่ง"</b><span>ที่นั่งว่างจะอยู่ด้านหลังห้อง</span></div>';
            return;
        }
        tools.querySelector('#st-again').onclick = draw;
        tools.querySelector('#st-print').onclick = () => printChart(h, l);
        tools.querySelector('#st-xlsx').onclick = () => exportExcel(h, l);
        const { rows, cols, grid } = h.data;
        room.innerHTML = `
            <div class="room-board"><i class="fas fa-chalkboard"></i>กระดาน / หน้าห้อง</div>
            <div class="room-scroll"><div class="seat-grid" style="--cols:${cols}">${grid.map((r, ri) => r.map((p, ci) => `
                <div class="seat${p ? ` g-${p.gender || 'x'}` : ' is-empty'}${animate && p ? ' is-hidden' : ''}${picked && picked.r === ri && picked.c === ci ? ' is-picked' : ''}" data-r="${ri}" data-c="${ci}" role="button" tabindex="0" aria-label="แถว ${ri + 1} ที่ ${ci + 1}${p ? ` ${U.esc(p.name || p.first)}` : ' ว่าง'}">
                    ${p ? `<span class="s-no">${U.esc(p.no)}</span><b>${U.esc(p.first)}</b><small>${U.esc(p.nick || '')}</small>` : '<span class="s-empty">ว่าง</span>'}
                </div>`).join('')).join('')}</div></div>
            ${h.data.overflow && h.data.overflow.length ? `<div class="seat-over"><i class="fas fa-triangle-exclamation"></i>ไม่ได้ที่นั่ง ${h.data.overflow.length} คน: ${h.data.overflow.map((p) => U.esc(p.first)).join(', ')}</div>` : ''}
            <div class="seat-legend"><span><i class="g-dot m"></i>ชาย</span><span><i class="g-dot f"></i>หญิง</span><span><i class="fas fa-hand-pointer"></i>แตะ 2 ที่นั่งเพื่อสลับ</span></div>`;
        room.querySelectorAll('.seat').forEach((el) => {
            const act = () => tapSeat(h, +el.dataset.r, +el.dataset.c);
            el.onclick = act;
            el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } };
        });
        if (animate) {
            animating = true;
            const seats = RNG.shuffle([...room.querySelectorAll('.seat.is-hidden')]);
            const gap = Math.max(18, Math.min(60, 1800 / Math.max(1, seats.length)));
            seats.forEach((el, i) => timers.push(setTimeout(() => { el.classList.remove('is-hidden'); el.classList.add('is-in'); if (i % 2 === 0) Sound.pop(i % 12); }, 80 + i * gap)));
            timers.push(setTimeout(() => {
                animating = false;
                FX.confetti({ count: 100, y: 0.3 });
                U.toast('สุ่มที่นั่งเสร็จแล้ว — บันทึกในประวัติแล้ว • แตะ 2 ที่นั่งเพื่อสลับ', { type: 'ok', ms: 3800 });
            }, 80 + seats.length * gap + 300));
        }
    }

    function tapSeat(h, r, c) {
        if (animating) return;
        const g = h.data.grid;
        if (!picked) { if (!g[r][c]) return; picked = { r, c }; mark(); return; }
        if (picked.r === r && picked.c === c) { picked = null; mark(); return; }
        const a = g[picked.r][picked.c];
        g[picked.r][picked.c] = g[r][c];
        g[r][c] = a;
        picked = null;
        Store.updateHistory(h.id, { data: h.data });
        U.toast('สลับที่นั่งแล้ว', { type: 'ok', ms: 1600 });
    }
    function mark() {
        root.querySelectorAll('.seat').forEach((el) => el.classList.toggle('is-picked', !!picked && +el.dataset.r === picked.r && +el.dataset.c === picked.c));
        if (picked) U.toast('เลือกแล้ว — แตะอีกที่นั่ง (ว่างก็ได้) เพื่อสลับ/ย้าย', { ms: 2000, icon: 'fa-hand-pointer' });
    }

    /* พิมพ์ผังที่นั่ง A4 แนวนอน (มุมมองครูหน้าห้อง: กระดานอยู่ด้านบน) */
    function chartHTML(h, l) {
        const { rows, cols, grid } = h.data;
        const s = Store.data.school;
        const fs = cols > 9 ? 12 : cols > 7 ? 13 : 14;
        return `<section class="gov-page landscape seat-print">
            <h2 class="gov-title">${U.esc(h.title || 'ผังที่นั่ง')} ห้อง ${U.esc(l.name)}</h2>
            <p class="gov-subtitle">${U.esc([s.name, Store.termText()].filter(Boolean).join('  '))}</p>
            <div class="sp-board">กระดาน / หน้าห้อง</div>
            <table class="sp-grid" style="font-size:${fs}pt">${grid.map((r, ri) => `<tr>${r.map((p) => `<td>${p ? `<span>${U.esc(p.no)}</span><b>${U.esc(p.first)}</b><i>${U.esc((p.name || '').split(' ').slice(1).join(' '))}</i>` : ''}</td>`).join('')}<th>แถว ${ri + 1}</th></tr>`).join('')}</table>
            <p class="sp-foot">จำนวน ${grid.flat().filter(Boolean).length} คน • สุ่มเมื่อ ${U.esc(App.when(h.at))}${h.data.alternate ? ' • สลับชาย-หญิง' : ''}</p>
            <div class="gov-signs" style="margin-top:6mm"><div></div><div><p>ลงชื่อ........................................ครูประจำชั้น/ครูผู้สอน</p><p>(${U.esc(s.teacherName || '........................................')})</p></div></div>
        </section>`;
    }
    function printChart(h, l) {
        document.getElementById('print-root').innerHTML = chartHTML(h, l);
        setTimeout(() => window.print(), 150);
    }

    function exportExcel(h, l) {
        const rows = [[`${h.title || 'ผังที่นั่ง'} ห้อง ${l.name}`], ['กระดาน / หน้าห้อง'], []];
        h.data.grid.forEach((r, ri) => rows.push([`แถว ${ri + 1}`].concat(r.map((p) => (p ? `${p.no}. ${p.name || p.first}` : '(ว่าง)')))));
        rows.push([]);
        rows.push(['แถว', 'ที่นั่ง', 'เลขที่', 'ชื่อ - สกุล']);
        h.data.grid.forEach((r, ri) => r.forEach((p, ci) => { if (p) rows.push([ri + 1, ci + 1, p.no, p.name || p.first]); }));
        const name = IO.writeBook(`ผังที่นั่ง_${l.name}_${U.stamp()}`, [{ name: 'ผังที่นั่ง', rows, widths: [8].concat(Array(h.data.cols).fill(24)) }]);
        U.toast(`ส่งออก <b>${U.esc(name)}</b> แล้ว`, { type: 'ok' });
    }

    function refresh(reason) {
        if (!root) return;
        if (!root.querySelector('#st-form')) { render(root); return; }
        if (reason === 'history') { renderResult(false); return; }
        renderForm();
        renderResult(false);
    }
    function leave() { clearTimers(); animating = false; root = null; }

    window.Views = window.Views || {};
    window.Views.seats = { render, refresh, leave, chartHTML };
})();
