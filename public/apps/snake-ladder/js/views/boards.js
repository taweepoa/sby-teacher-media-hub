/* =====================================================================
   ออกแบบกระดาน: รายการกระดาน (boards) + ตัวออกแบบ (board?id=)
   สุ่มอัตโนมัติตามจำนวนบันได/งู/ช่องคำถาม หรือแก้เองทีละช่อง (คลิกช่อง / คลิก 2 ช่องเพื่อวางบันได-งู)
   ===================================================================== */
(function () {
    'use strict';
    const esc = U.esc;
    let root = null;
    let tool = 'q';
    let pickFrom = 0; // ช่องต้นทางของบันได/งูที่กำลังวาง
    let gen = { ladders: null, snakes: null, q: 30, bonus: null, skip: null, again: null };

    const TOOLS = [
        ['q', 'fa-circle-question', 'ช่องคำถาม'], ['bonus', 'fa-star', 'โบนัส'], ['skip', 'fa-hourglass-half', 'หยุดพัก'], ['again', 'fa-dice', 'ทอยอีก'],
        ['normal', 'fa-eraser', 'ช่องธรรมดา'], ['ladder', 'fa-stairs', 'วางบันได'], ['snake', 'fa-worm', 'วางงู'], ['remove', 'fa-scissors', 'เอาบันได/งูออก'],
    ];

    /* ---------- รายการ ---------- */
    function renderList(el) {
        const d = Store.data;
        el.innerHTML = `
            ${U.hero({ icon: 'fa-stairs', title: 'ออกแบบกระดานบันไดงู', sub: '30–100 ช่อง • วางบันได งู ช่องคำถาม และช่องพิเศษอัตโนมัติหรือเอง • เก็บไว้ใช้ซ้ำได้หลายแบบ', side: '<button type="button" class="btn-x cta lg" data-act="new"><i class="fas fa-plus"></i> สร้างกระดานใหม่</button>' })}
            ${d.boards.length ? `<div class="board-grid">${d.boards.map((b) => { const s = Engine.boardStats(b); return `
                <div class="board-card">
                    <a class="bc-prev" href="#/board?id=${esc(b.id)}">${BoardArt.html(b, { mini: true })}</a>
                    <div class="bc-body"><b>${esc(b.name)}</b>
                        <div class="bc-stats"><span><i class="fas fa-table-cells"></i> ${b.n} ช่อง</span><span><i class="fas fa-stairs"></i> ${s.ladders}</span><span><i class="fas fa-worm"></i> ${s.snakes}</span><span><i class="fas fa-circle-question"></i> ${s.q}</span><span><i class="fas fa-star"></i> ${s.bonus + s.skip + s.again}</span></div>
                        <div class="set-actions">
                            <a class="btn-x primary sm" href="#/board?id=${esc(b.id)}"><i class="fas fa-pen"></i> แก้ไข</a>
                            <a class="btn-x green sm" href="#/play?new=1&board=${esc(b.id)}"><i class="fas fa-play"></i> เล่น</a>
                            <a class="btn-x ghost sm" href="#/print?tab=board&board=${esc(b.id)}"><i class="fas fa-print"></i> พิมพ์</a>
                            <button type="button" class="icon-btn" data-dup="${esc(b.id)}" title="ทำสำเนา"><i class="fas fa-copy"></i></button>
                            <button type="button" class="icon-btn del" data-del="${esc(b.id)}" title="ลบกระดาน"><i class="fas fa-trash-can"></i></button>
                        </div>
                    </div>
                </div>`; }).join('')}</div>` : UI.empty('fa-stairs', 'ยังไม่มีกระดาน', 'กด "สร้างกระดานใหม่" ระบบจะวางบันได งู และช่องคำถามให้อัตโนมัติ — หรือเล่นด้วยกระดานสุ่มได้เลยที่หน้าเริ่มเกม', '<button type="button" class="btn-x primary" data-act="new"><i class="fas fa-plus"></i> สร้างกระดานใหม่</button>')}`;
        el.onclick = async (e) => {
            const b = e.target.closest('[data-act], [data-dup], [data-del]');
            if (!b) return;
            if (b.dataset.act === 'new') newBoard();
            else if (b.dataset.dup) {
                const src = Store.board(b.dataset.dup);
                const c = Object.assign(U.clone(src), { id: U.uid('bd'), name: `${src.name} (สำเนา)`, createdAt: new Date().toISOString() });
                Store.data.boards.push(c);
                Store.commit('boards');
                U.toast('ทำสำเนากระดานแล้ว', { type: 'ok' });
            } else if (b.dataset.del) {
                const x = Store.board(b.dataset.del);
                if (!(await U.confirm('ลบกระดานนี้?', `<b>${esc(x.name)}</b><br><small>ผลการแข่งขันที่เล่นไปแล้วไม่หายไป</small>`, { danger: true, confirmText: '<i class="fas fa-trash-can"></i> ลบกระดาน' }))) return;
                Store.data.boards = Store.data.boards.filter((y) => y.id !== x.id);
                Store.commit('boards');
                U.toast('ลบกระดานแล้ว', { type: 'ok' });
            }
        };
    }

    async function newBoard() {
        const r = await UI.sheet({
            title: 'สร้างกระดานใหม่', icon: 'fa-stairs', sub: 'เลือกจำนวนช่อง ระบบจะวางบันได งู และช่องคำถามให้อัตโนมัติ (แก้ต่อได้)',
            confirmText: '<i class="fas fa-wand-magic-sparkles"></i> สร้างกระดาน',
            body: `<label class="form-label">จำนวนช่อง</label><div class="seg seg-wrap" id="nb-size">${Engine.SIZES.map((z) => `<button type="button" data-n="${z.n}" class="${z.n === 50 ? 'active' : ''}">${z.n}</button>`).join('')}</div>
                <label class="form-label mt-3">ชื่อกระดาน</label><input class="form-control" id="nb-name" value="กระดาน 50 ช่อง">`,
            didOpen: (pop) => {
                pop.querySelector('#nb-size').onclick = (e) => {
                    const b = e.target.closest('[data-n]');
                    if (!b) return;
                    pop.querySelectorAll('#nb-size button').forEach((x) => x.classList.toggle('active', x === b));
                    const nm = pop.querySelector('#nb-name');
                    if (/^กระดาน \d+ ช่อง$/.test(nm.value)) nm.value = `กระดาน ${b.dataset.n} ช่อง`;
                };
            },
            preConfirm: () => ({ n: Number(Swal.getPopup().querySelector('#nb-size .active').dataset.n), name: Swal.getPopup().querySelector('#nb-name').value }),
        });
        if (!r.isConfirmed) return;
        const b = Store.newBoard(r.value.n);
        b.name = U.norm(r.value.name) || b.name;
        Store.data.boards.push(b);
        Store.commit('boards');
        App.go('board', { id: b.id });
    }

    /* ---------- ตัวออกแบบ ---------- */
    function renderEditor(el, b) {
        const s = Engine.boardStats(b);
        const numOr = (v, def) => (v == null ? def : v);
        const k = b.n / 100;
        el.innerHTML = `
            <div class="toolbar"><a class="btn-x ghost sm" href="#/boards"><i class="fas fa-arrow-left"></i> กระดานทั้งหมด</a><div class="grow"></div>
                <a class="btn-x ghost sm" href="#/print?tab=board&board=${esc(b.id)}"><i class="fas fa-print"></i> พิมพ์กระดาน</a>
                <a class="btn-x green sm" href="#/play?new=1&board=${esc(b.id)}"><i class="fas fa-play"></i> เล่นด้วยกระดานนี้</a></div>
            <div class="designer">
                <section class="panel panel--green ds-board">
                    <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-stairs"></i></span><div class="grow"><input class="form-control fw-bold" id="bd-name" value="${esc(b.name)}" aria-label="ชื่อกระดาน"></div></div>
                    <div class="panel-body">
                        <div class="tool-bar">${TOOLS.map(([t, i, l]) => `<button type="button" class="tool${tool === t ? ' on' : ''} t-${t}" data-tool="${t}"><i class="fas ${i}"></i><span>${l}</span></button>`).join('')}</div>
                        <div class="tool-hint" id="tool-hint">${hint()}</div>
                        <div id="bd-canvas">${BoardArt.html(b, { edit: true, highlight: pickFrom ? [pickFrom] : [] })}</div>
                        <p class="muted small mt-2 d-lg-none"><i class="fas fa-desktop"></i> แก้ไขกระดานบนคอมพิวเตอร์หรือแท็บเล็ตจะสะดวกกว่า</p>
                    </div>
                </section>
                <aside class="ds-side">
                    <section class="panel panel--orange">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-wand-magic-sparkles"></i></span><div><h3>สุ่มวางอัตโนมัติ</h3><small>กำหนดจำนวน แล้วกด "สุ่มใหม่"</small></div></div>
                        <div class="panel-body">
                            <label class="form-label">จำนวนช่อง</label>
                            <select class="form-select mb-2" id="gen-n">${Engine.SIZES.map((z) => `<option value="${z.n}"${z.n === b.n ? ' selected' : ''}>${z.n} ช่อง (${z.cols} × ${z.n / z.cols})</option>`).join('')}</select>
                            <div class="gen-grid">
                                ${[['ladders', 'fa-stairs', 'บันได', numOr(gen.ladders, Math.max(3, Math.round(8 * k)))], ['snakes', 'fa-worm', 'งู', numOr(gen.snakes, Math.max(3, Math.round(8 * k)))], ['q', 'fa-circle-question', 'ช่องคำถาม %', gen.q], ['bonus', 'fa-star', 'โบนัส', numOr(gen.bonus, Math.max(1, Math.round(3 * k)))], ['skip', 'fa-hourglass-half', 'หยุดพัก', numOr(gen.skip, Math.max(1, Math.round(3 * k)))], ['again', 'fa-dice', 'ทอยอีก', numOr(gen.again, Math.max(1, Math.round(2 * k)))]]
                                    .map(([f, i, l, v]) => `<label><span><i class="fas ${i}"></i> ${l}</span><input type="number" class="form-control" inputmode="numeric" min="0" max="${f === 'q' ? 80 : 20}" data-gen="${f}" value="${v}"></label>`).join('')}
                            </div>
                            <button type="button" class="btn-x orange w-100 mt-2" data-act="gen"><i class="fas fa-shuffle"></i> สุ่มใหม่</button>
                        </div>
                    </section>
                    <section class="panel panel--teal">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#0A84FF;--b:#00C7BE"><i class="fas fa-list"></i></span><div><h3>สรุปกระดาน</h3><small>${b.n} ช่อง • คำถาม ${s.q} • โบนัส ${s.bonus} • หยุดพัก ${s.skip} • ทอยอีก ${s.again}</small></div></div>
                        <div class="panel-body">
                            <h4 class="mini-h"><i class="fas fa-stairs"></i> บันได ${s.ladders}</h4>
                            <div class="pair-list">${b.ladders.map((p, i) => `<span class="pair lad">${p[0]} <i class="fas fa-arrow-up"></i> ${p[1]}<button type="button" data-rm-l="${i}" data-demo-allow title="เอาออก" aria-label="เอาบันไดออก"><i class="fas fa-xmark"></i></button></span>`).join('') || '<span class="muted small">ไม่มี</span>'}</div>
                            <h4 class="mini-h mt-2"><i class="fas fa-worm"></i> งู ${s.snakes}</h4>
                            <div class="pair-list">${b.snakes.map((p, i) => `<span class="pair snk">${p[0]} <i class="fas fa-arrow-down"></i> ${p[1]}<button type="button" data-rm-s="${i}" data-demo-allow title="เอาออก" aria-label="เอางูออก"><i class="fas fa-xmark"></i></button></span>`).join('') || '<span class="muted small">ไม่มี</span>'}</div>
                        </div>
                    </section>
                </aside>
            </div>`;
    }
    function hint() {
        if (tool === 'ladder') return pickFrom ? `<i class="fas fa-hand-pointer"></i> เชิงบันไดอยู่ช่อง <b>${pickFrom}</b> — คลิกช่องปลายบันได (สูงกว่า)` : '<i class="fas fa-hand-pointer"></i> คลิกช่องเชิงบันได (ล่าง) แล้วคลิกช่องปลายบันได (บน)';
        if (tool === 'snake') return pickFrom ? `<i class="fas fa-hand-pointer"></i> หัวงูอยู่ช่อง <b>${pickFrom}</b> — คลิกช่องหางงู (ต่ำกว่า)` : '<i class="fas fa-hand-pointer"></i> คลิกช่องหัวงู (บน) แล้วคลิกช่องหางงู (ล่าง)';
        if (tool === 'remove') return '<i class="fas fa-hand-pointer"></i> คลิกช่องเชิงบันไดหรือหัวงูเพื่อเอาออก';
        return `<i class="fas fa-hand-pointer"></i> คลิกช่องบนกระดานเพื่อเปลี่ยนเป็น "${TOOLS.find((t) => t[0] === tool)[2]}"`;
    }

    function save(b, msg) {
        Object.assign(b, Engine.normBoard(b), { updatedAt: new Date().toISOString() });
        Store.commit('boards');
        if (msg) U.toast(msg, { type: 'warn' });
    }
    function clickCell(b, c) {
        if (c === 1 || c === b.n) { U.toast('ช่องเริ่มและเส้นชัยแก้ไม่ได้', { type: 'warn' }); return; }
        const occupied = (x) => b.ladders.some((p) => p.includes(x)) || b.snakes.some((p) => p.includes(x));
        if (tool === 'ladder' || tool === 'snake') {
            if (!pickFrom) {
                if (occupied(c)) { U.toast('ช่องนี้มีบันไดหรืองูอยู่แล้ว', { type: 'warn' }); return; }
                pickFrom = c;
                return;
            }
            const a = pickFrom;
            pickFrom = 0;
            if (c === a) return;
            if (tool === 'ladder' && c < a) { U.toast('ปลายบันไดต้องอยู่สูงกว่าเชิงบันได', { type: 'warn' }); return; }
            if (tool === 'snake' && c > a) { U.toast('หางงูต้องอยู่ต่ำกว่าหัวงู', { type: 'warn' }); return; }
            if (occupied(c)) { U.toast('ช่องปลายทางมีบันไดหรืองูอยู่แล้ว', { type: 'warn' }); return; }
            delete b.cells[a];
            delete b.cells[c];
            (tool === 'ladder' ? b.ladders : b.snakes).push([a, c]);
            Sound.play(tool);
            save(b);
            return;
        }
        if (tool === 'remove') {
            const nl = b.ladders.length + b.snakes.length;
            b.ladders = b.ladders.filter((p) => p[0] !== c && p[1] !== c);
            b.snakes = b.snakes.filter((p) => p[0] !== c && p[1] !== c);
            if (nl !== b.ladders.length + b.snakes.length) save(b);
            return;
        }
        if (occupied(c)) { U.toast('ช่องนี้เป็นบันไดหรืองู — ใช้เครื่องมือ "เอาบันได/งูออก" ก่อน', { type: 'warn' }); return; }
        if (tool === 'normal') delete b.cells[c]; else b.cells[c] = tool;
        save(b);
    }

    function bindEditor(el, b) {
        el.onclick = (e) => {
            const t = e.target.closest('[data-tool]');
            if (t) { tool = t.dataset.tool; pickFrom = 0; renderEditor(el, b); return; }
            const rl = e.target.closest('[data-rm-l]');
            if (rl) { b.ladders.splice(Number(rl.dataset.rmL), 1); save(b); return; }
            const rs = e.target.closest('[data-rm-s]');
            if (rs) { b.snakes.splice(Number(rs.dataset.rmS), 1); save(b); return; }
            const cell = e.target.closest('[data-cell]');
            if (cell) { clickCell(b, Number(cell.dataset.cell)); renderEditor(el, b); return; }
            const a = e.target.closest('[data-act=gen]');
            if (a) generate(el, b);
        };
        el.oninput = (e) => {
            const t = e.target;
            if (t.id === 'bd-name') { b.name = t.value; Store.commit('boards'); }
            else if (t.dataset.gen) gen[t.dataset.gen] = t.value === '' ? null : Number(t.value);
        };
    }
    async function generate(el, b) {
        const n = Number(el.querySelector('#gen-n').value);
        if ((b.ladders.length || b.snakes.length) && !(await U.confirm('สุ่มวางใหม่ทั้งกระดาน?', 'บันได งู และช่องพิเศษที่วางไว้จะถูกแทนที่', { icon: 'question', confirmText: '<i class="fas fa-shuffle"></i> สุ่มใหม่' }))) return;
        el.querySelectorAll('[data-gen]').forEach((i) => { gen[i.dataset.gen] = i.value === '' ? null : Number(i.value); });
        const nb = Engine.autoBoard(n, { seed: Date.now(), ladders: gen.ladders, snakes: gen.snakes, qRatio: Math.max(0, Math.min(80, gen.q == null ? 30 : gen.q)) / 100, bonus: gen.bonus, skip: gen.skip, again: gen.again });
        if (/^กระดาน \d+ ช่อง$/.test(b.name)) b.name = `กระดาน ${n} ช่อง`;
        Object.assign(b, nb);
        save(b);
        Sound.play('dice');
        renderEditor(el, b);
    }

    function renderBoards(el) { root = el; renderList(el); }
    function renderBoard(el, params) {
        root = el;
        const b = Store.board(params && params.id);
        if (!b) { el.innerHTML = UI.empty('fa-stairs', 'ไม่พบกระดานนี้', '', '<a class="btn-x primary" href="#/boards">กระดานทั้งหมด</a>'); return; }
        pickFrom = 0;
        renderEditor(el, b);
        bindEditor(el, b);
    }
    window.Views.boards = { render: renderBoards, refresh() { if (root) renderList(root); } };
    window.Views.board = { render: renderBoard, refresh(reason) { if (root && reason !== 'boards') { const b = Store.board(App.params.id); if (b) renderEditor(root, b); } else if (root && reason === 'boards') { const b = Store.board(App.params.id); if (b && !document.activeElement?.matches('#bd-name, [data-gen]')) renderEditor(root, b); } } };
})();
