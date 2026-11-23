/* =====================================================================
   สุ่มจับกลุ่ม: กำหนด "จำนวนกลุ่ม" หรือ "คนต่อกลุ่ม" • คละเพศ • สุ่มหัวหน้ากลุ่ม
   ผลลัพธ์บันทึกในประวัติทันที • แตะชื่อ 2 คนต่างกลุ่มเพื่อสลับ • เต็มจอ • Excel • รายงาน .docx
   ===================================================================== */
(function () {
    'use strict';

    const HEADS = [['#f43f5e', '#fb923c'], ['#0A84FF', '#5E5CE6'], ['#30D158', '#00C7BE'], ['#BF5AF2', '#FF375F'], ['#FF9F0A', '#FF375F'], ['#00C7BE', '#0A84FF'],
        ['#5E5CE6', '#BF5AF2'], ['#e11d48', '#a21caf'], ['#16a34a', '#65a30d'], ['#0891b2', '#2563eb'], ['#ea580c', '#ca8a04'], ['#db2777', '#7c3aed']];
    let root = null;
    let opts = null;
    let picked = null; // {g, i} สำหรับสลับ
    let animating = false;
    let timers = [];

    const L = () => Store.currentList();
    function defaults() {
        return { mode: 'count', value: 6, leftover: 'spread', mixGender: true, leaders: true, activity: '' };
    }
    function current(l) {
        const h = Store.data.history.find((x) => x.mode === 'group' && x.listId === (l && l.id));
        return h || null;
    }

    function render(el, params) {
        root = el;
        picked = null;
        if (!opts) opts = defaults();
        const d = Store.data;
        if (params && params.id) {
            const h = Store.historyItem(params.id);
            if (h && h.mode === 'group' && Store.list(h.listId)) d.currentListId = h.listId;
        }
        el.innerHTML = `
            ${U.hero({ cls: 'hero--groups', icon: 'fa-people-group', title: 'สุ่มจับกลุ่ม', sub: 'แบ่งกลุ่มแบบสุ่มที่ยุติธรรม คละเพศให้เท่า ๆ กัน สุ่มหัวหน้ากลุ่ม แล้วพิมพ์รายชื่อกลุ่มเป็นรายงานราชการ (.docx)' })}
            ${d.lists.length ? `
            <div class="panel panel--theme">
                <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-sliders"></i></span><div><h3>ตั้งค่าการจับกลุ่ม</h3><small id="gp-preview"></small></div></div>
                <div class="panel-body"><div class="gp-form" id="gp-form"></div></div>
            </div>
            <section class="stage-area groups-stage" id="gp-stage">
                <div class="stage-top">
                    <div class="stage-title"><span class="stage-ic"><i class="fas fa-people-group"></i></span><div><b id="gp-title">ผลการจับกลุ่ม</b><small id="gp-sub"></small></div></div>
                    <div class="stage-tools" id="gp-tools"></div>
                </div>
                <div class="group-grid" id="gp-grid"></div>
            </section>` : App.noListState('fa-people-group')}`;
        if (!d.lists.length) return;
        App.bindStage(el, el.querySelector('#gp-stage'));
        renderForm();
        renderResult(false);
    }

    function renderForm() {
        const l = L();
        const box = root.querySelector('#gp-form');
        const people = Store.present(l);
        const custom = l.kind === 'custom';
        box.innerHTML = `
            <div class="gp-field gp-list"><label class="form-label" for="gp-list">ห้องเรียน / รายการ</label>${App.listSelect(l.id, 'id="gp-list"')}</div>
            <div class="gp-field"><label class="form-label">แบ่งโดย</label>
                <div class="seg full" id="gp-mode"><button type="button" data-m="count" class="${opts.mode === 'count' ? 'active' : ''}">จำนวนกลุ่ม</button><button type="button" data-m="size" class="${opts.mode === 'size' ? 'active' : ''}">คนต่อกลุ่ม</button></div></div>
            <div class="gp-field gp-num"><label class="form-label" for="gp-val">${opts.mode === 'count' ? 'จำนวนกลุ่ม' : 'กลุ่มละ (คน)'}</label>
                <div class="num-step"><button type="button" data-d="-1" aria-label="ลด"><i class="fas fa-minus"></i></button><input class="form-control" id="gp-val" type="number" min="1" max="${Math.max(1, people.length)}" inputmode="numeric" value="${opts.value}"><button type="button" data-d="1" aria-label="เพิ่ม"><i class="fas fa-plus"></i></button></div></div>
            ${opts.mode === 'size' ? `<div class="gp-field"><label class="form-label" for="gp-left">คนที่เหลือ (เศษ)</label><select class="form-select" id="gp-left">${U.options([{ value: 'spread', text: 'กระจายเข้ากลุ่มเดิม' }, { value: 'new', text: 'ตั้งเป็นกลุ่มใหม่' }], opts.leftover)}</select></div>` : ''}
            <div class="gp-field gp-act"><label class="form-label" for="gp-act">ชื่อกิจกรรม (ใช้ในรายงาน)</label><input class="form-control" id="gp-act" maxlength="100" placeholder="เช่น โครงงานคอมพิวเตอร์" value="${U.esc(opts.activity)}"></div>
            <div class="gp-switches">
                <label class="opt-switch"><input type="checkbox" id="gp-mix"${opts.mixGender ? ' checked' : ''}${custom ? ' disabled' : ''}><div><b>คละเพศ</b><small>ชาย/หญิงแต่ละกลุ่มใกล้เคียงกัน</small></div></label>
                <label class="opt-switch"><input type="checkbox" id="gp-lead"${opts.leaders ? ' checked' : ''}><div><b>สุ่มหัวหน้ากลุ่ม</b><small>กลุ่มละ 1 คน</small></div></label>
            </div>
            <div class="gp-go"><button type="button" class="btn-x cta lg" id="gp-go"${people.length < 2 ? ' disabled' : ''}><i class="fas fa-shuffle"></i>สุ่มจับกลุ่ม</button></div>`;
        const sync = () => {
            const n = Store.present(L()).length;
            const v = Math.max(1, U.toInt(box.querySelector('#gp-val').value, 1));
            opts.value = v;
            const g = Engine.groupCount(n, opts.mode, v, opts.leftover);
            const gc = Store.genderCount(Store.present(L()));
            root.querySelector('#gp-preview').innerHTML = n ? `${n} ${custom ? 'รายการ' : 'คน'}${custom ? '' : ` (ชาย ${gc.m} หญิง ${gc.f})`} → <b>${g} กลุ่ม</b> กลุ่มละ ${Engine.sizeText(n, g)}${L().items.length - n ? ` • ไม่รวมขาดเรียน ${L().items.length - n} คน` : ''}` : 'ยังไม่มีรายชื่อในห้องนี้';
        };
        box.querySelector('#gp-list').onchange = (e) => { picked = null; Store.setCurrent(e.target.value); };
        box.querySelectorAll('[data-m]').forEach((b) => { b.onclick = () => { opts.mode = b.dataset.m; opts.value = opts.mode === 'count' ? 6 : 4; renderForm(); }; });
        box.querySelectorAll('[data-d]').forEach((b) => {
            b.onclick = () => { const i = box.querySelector('#gp-val'); i.value = Math.max(1, Math.min(Math.max(1, people.length), U.toInt(i.value, 1) + +b.dataset.d)); sync(); };
        });
        box.querySelector('#gp-val').oninput = sync;
        const left = box.querySelector('#gp-left');
        if (left) left.onchange = () => { opts.leftover = left.value; sync(); };
        box.querySelector('#gp-act').oninput = (e) => { opts.activity = e.target.value; };
        box.querySelector('#gp-mix').onchange = (e) => { opts.mixGender = e.target.checked; };
        box.querySelector('#gp-lead').onchange = (e) => { opts.leaders = e.target.checked; };
        box.querySelector('#gp-go').onclick = draw;
        sync();
    }

    function draw() {
        if (animating) return;
        const l = L();
        const people = Store.present(l);
        if (people.length < 2) { U.alert('รายชื่อไม่พอ', 'ต้องมีอย่างน้อย 2 คนที่มาเรียน', 'info'); return; }
        Sound.unlock();
        const custom = l.kind === 'custom';
        const groups = Engine.makeGroups(people, { mode: opts.mode, value: opts.value, leftover: opts.leftover, mixGender: opts.mixGender && !custom, leaders: opts.leaders })
            .map((g) => ({ no: g.no, leaderId: g.leaderId, members: g.members.map(Engine.snap) }));
        const activity = U.norm(opts.activity);
        Store.addHistory('group', l, activity || 'จับกลุ่ม', {
            groups,
            opts: { mode: opts.mode, value: opts.value, leftover: opts.leftover, mixGender: opts.mixGender && !custom, leaders: opts.leaders },
            total: people.length,
            activity,
        });
        picked = null;
        renderResult(true);
    }

    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function renderResult(animate) {
        clearTimers();
        const l = L();
        const h = current(l);
        const grid = root.querySelector('#gp-grid');
        const tools = root.querySelector('#gp-tools');
        root.querySelector('#gp-title').textContent = h ? (h.data.activity || 'ผลการจับกลุ่ม') : 'ผลการจับกลุ่ม';
        root.querySelector('#gp-sub').innerHTML = h
            ? `${U.esc(l.kind === 'custom' ? l.name : `ห้อง ${l.name}`)} • ${h.data.groups.length} กลุ่ม • ${h.data.total} ${l.kind === 'custom' ? 'รายการ' : 'คน'}${h.data.opts.mixGender ? ' • คละเพศ' : ''} • ${U.esc(App.when(h.at))}`
            : 'ยังไม่ได้จับกลุ่มสำหรับห้องนี้';
        tools.innerHTML = h ? `
            <button type="button" class="btn-x on-white sm" id="gp-again"><i class="fas fa-shuffle"></i>สุ่มใหม่</button>
            <button type="button" class="btn-x on-dark sm" id="gp-xlsx" title="ส่งออก Excel" aria-label="ส่งออก Excel"><i class="fas fa-file-excel"></i><span>Excel</span></button>
            <a class="btn-x on-dark sm" href="#/reports?id=${encodeURIComponent(h.id)}" title="รายงาน .docx / พิมพ์" aria-label="รายงาน .docx / พิมพ์"><i class="fas fa-file-word"></i><span>รายงาน .docx / พิมพ์</span></a>
            ${App.stageButton('on-dark')}` : App.stageButton('on-dark');
        App.bindStage(root, root.querySelector('#gp-stage'));
        if (Stage.isOn()) tools.querySelector('[data-stage-toggle]').innerHTML = '<i class="fas fa-compress"></i><span>ออกจากเต็มจอ</span>';
        if (!h) {
            grid.innerHTML = `<div class="stage-empty"><i class="fas fa-people-group"></i><b>ตั้งค่าด้านบนแล้วกด "สุ่มจับกลุ่ม"</b><span>ผลการจับกลุ่มจะแสดงที่นี่ และบันทึกไว้ในประวัติ</span></div>`;
            return;
        }
        tools.querySelector('#gp-again').onclick = draw;
        tools.querySelector('#gp-xlsx').onclick = () => exportExcel(h, l);
        const groups = h.data.groups;
        grid.style.setProperty('--cols', String(Math.min(groups.length, groups.length > 8 ? 5 : 4)));
        grid.innerHTML = groups.map((g, gi) => {
            const [a, b] = HEADS[gi % HEADS.length];
            const m = g.members.filter((x) => x.gender === 'm').length;
            const f = g.members.filter((x) => x.gender === 'f').length;
            return `<article class="gcard${animate ? ' is-hidden' : ''}" data-g="${gi}" style="--g1:${a};--g2:${b}">
                <header><b>กลุ่มที่ ${g.no}</b><span>${g.members.length} คน${h.data.opts.mixGender ? ` • <i class="fas fa-mars"></i>${m} <i class="fas fa-venus"></i>${f}` : ''}</span></header>
                <ol>${g.members.map((x, i) => `<li data-i="${i}" class="${x.id === g.leaderId ? 'is-leader' : ''}${picked && picked.g === gi && picked.i === i ? ' is-picked' : ''}" tabindex="0" role="button" aria-label="${U.esc(x.name || x.first)} — แตะเพื่อสลับกลุ่ม">
                    <span class="gm-no">${U.esc(x.no)}</span><span class="gm-name">${U.esc(l.kind === 'custom' ? x.first : `${x.first}${x.last ? ` ${x.last}` : ''}` || x.name)}${x.nick ? ` <small>(${U.esc(x.nick)})</small>` : ''}</span>${x.id === g.leaderId ? '<span class="gm-lead" title="หัวหน้ากลุ่ม"><i class="fas fa-crown"></i></span>' : ''}</li>`).join('')}</ol>
            </article>`;
        }).join('');
        grid.querySelectorAll('li[data-i]').forEach((li) => {
            const act = () => swapTap(h, +li.closest('.gcard').dataset.g, +li.dataset.i);
            li.onclick = act;
            li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } };
        });
        if (animate) {
            animating = true;
            const cards = [...grid.querySelectorAll('.gcard')];
            cards.forEach((c, i) => {
                timers.push(setTimeout(() => {
                    c.classList.remove('is-hidden');
                    c.classList.add('is-in');
                    Sound.pop(i);
                }, 120 + i * 170));
            });
            timers.push(setTimeout(() => {
                animating = false;
                FX.confetti({ count: 120, y: 0.3 });
                U.toast(`จับกลุ่มเสร็จแล้ว ${groups.length} กลุ่ม — บันทึกในประวัติแล้ว • แตะชื่อ 2 คนต่างกลุ่มเพื่อสลับ`, { type: 'ok', ms: 4200 });
            }, 120 + cards.length * 170 + 250));
        }
    }

    /* แตะคนแรก แล้วแตะคนที่สอง (ต่างกลุ่ม) เพื่อสลับกลุ่ม */
    function swapTap(h, g, i) {
        if (animating) return;
        if (!picked) { picked = { g, i }; markPicked(); return; }
        if (picked.g === g && picked.i === i) { picked = null; markPicked(); return; }
        if (picked.g === g) { picked = { g, i }; markPicked(); return; }
        const groups = h.data.groups;
        const A = groups[picked.g].members[picked.i];
        const B = groups[g].members[i];
        groups[picked.g].members[picked.i] = B;
        groups[g].members[i] = A;
        // หัวหน้ากลุ่มย้ายไปด้วย → ให้คนที่เข้ามาแทนเป็นหัวหน้า
        [picked.g, g].forEach((k) => {
            const gr = groups[k];
            if (gr.leaderId && !gr.members.some((m) => m.id === gr.leaderId)) gr.leaderId = gr.members[k === g ? i : picked.i].id;
        });
        picked = null;
        Store.updateHistory(h.id, { data: h.data });
        U.toast(`สลับ ${U.esc(A.first)} ↔ ${U.esc(B.first)} แล้ว`, { type: 'ok', ms: 2200 });
    }
    function markPicked() {
        root.querySelectorAll('.gcard li').forEach((li) => {
            const g = +li.closest('.gcard').dataset.g;
            li.classList.toggle('is-picked', !!picked && picked.g === g && picked.i === +li.dataset.i);
        });
        if (picked) U.toast('เลือกแล้ว — แตะชื่อในกลุ่มอื่นเพื่อสลับกัน', { ms: 2000, icon: 'fa-hand-pointer' });
    }

    function exportExcel(h, l) {
        const rows = [['กลุ่มที่', 'ลำดับ', 'เลขที่', 'ชื่อ - สกุล', 'ชื่อเล่น', 'เพศ', 'หน้าที่']];
        h.data.groups.forEach((g) => g.members.forEach((m, i) => rows.push([g.no, i + 1, m.no, m.name || m.first, m.nick, m.gender === 'm' ? 'ชาย' : m.gender === 'f' ? 'หญิง' : '', m.id === g.leaderId ? 'หัวหน้ากลุ่ม' : ''])));
        const name = IO.writeBook(`จับกลุ่ม_${l.name}_${U.stamp()}`, [{ name: 'รายชื่อกลุ่ม', rows, widths: [8, 7, 7, 30, 10, 6, 14] }]);
        U.toast(`ส่งออก <b>${U.esc(name)}</b> แล้ว`, { type: 'ok' });
    }

    function refresh(reason) {
        if (!root) return;
        if (!root.querySelector('#gp-form')) { render(root); return; }
        if (reason === 'history') { renderResult(false); return; }
        renderForm();
        renderResult(false);
    }
    function leave() { clearTimers(); animating = false; root = null; }

    window.Views = window.Views || {};
    window.Views.groups = { render, refresh, leave };
})();
