/* =====================================================================
   สุ่มลำดับนำเสนอ: สับลำดับรายชื่อ หรือ "กลุ่ม" จากการจับกลุ่มล่าสุด (Fisher–Yates ทุกลำดับมีโอกาสเท่ากัน)
   เปิดทีละลำดับให้ลุ้น หรือแสดงทั้งหมด • ติ๊ก "นำเสนอแล้ว" • เต็มจอ • Excel • รายงาน .docx
   ===================================================================== */
(function () {
    'use strict';

    let root = null;
    let opts = { source: 'list', reveal: 'step', activity: '' };
    let timers = [];
    let keyHandler = null;

    const L = () => Store.currentList();
    const current = (l) => Store.data.history.find((x) => x.mode === 'order' && x.listId === (l && l.id)) || null;
    const lastGroups = (l) => Store.data.history.find((x) => x.mode === 'group' && x.listId === (l && l.id)) || null;

    function render(el) {
        root = el;
        if (keyHandler) document.removeEventListener('keydown', keyHandler);
        keyHandler = null;
        const d = Store.data;
        el.innerHTML = `
            ${U.hero({ cls: 'hero--order', icon: 'fa-list-ol', title: 'สุ่มลำดับนำเสนอ', sub: 'สุ่มลำดับการนำเสนองาน/ตอบคำถาม ของนักเรียนรายคนหรือรายกลุ่ม เปิดทีละลำดับให้ลุ้น และติ๊กเมื่อนำเสนอแล้ว' })}
            ${d.lists.length ? `
            <div class="panel panel--theme">
                <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-sliders"></i></span><div><h3>ตั้งค่า</h3><small id="od-preview"></small></div></div>
                <div class="panel-body"><div class="gp-form" id="od-form"></div></div>
            </div>
            <section class="stage-area order-stage" id="od-stage">
                <div class="stage-top">
                    <div class="stage-title"><span class="stage-ic"><i class="fas fa-list-ol"></i></span><div><b id="od-title">ลำดับการนำเสนอ</b><small id="od-sub"></small></div></div>
                    <div class="stage-tools" id="od-tools"></div>
                </div>
                <div id="od-body"></div>
            </section>` : App.noListState('fa-list-ol')}`;
        if (!d.lists.length) return;
        keyHandler = (e) => {
            if (App.current !== 'order' || e.repeat) return;
            if (e.target && e.target.closest('input, textarea, select, button, a, .swal2-container')) return;
            if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
                const b = root && root.querySelector('#od-next');
                if (b && !b.disabled) { e.preventDefault(); b.click(); }
            } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); Stage.toggle(root.querySelector('#od-stage')); }
        };
        document.addEventListener('keydown', keyHandler);
        renderForm();
        renderResult(false);
    }

    function sourceItems(l) {
        if (opts.source === 'group') {
            const g = lastGroups(l);
            if (!g) return [];
            return g.data.groups.map((gr) => {
                const lead = gr.members.find((m) => m.id === gr.leaderId);
                return { label: `กลุ่มที่ ${gr.no}`, sub: `${gr.members.length} คน${lead ? ` • หัวหน้า ${lead.first}` : ''}`, members: gr.members.map((m) => m.name || m.first) };
            });
        }
        return Store.present(l).map((s) => (l.kind === 'custom'
            ? { label: s.firstName, sub: '', id: s.id }
            : { label: `${s.firstName}${s.lastName ? ` ${s.lastName}` : ''}`, sub: [s.no !== '' ? `เลขที่ ${s.no}` : '', s.nick ? `(${s.nick})` : ''].filter(Boolean).join(' '), id: s.id, no: s.no }));
    }

    function renderForm() {
        const l = L();
        const g = lastGroups(l);
        if (opts.source === 'group' && !g) opts.source = 'list';
        const box = root.querySelector('#od-form');
        box.innerHTML = `
            <div class="gp-field gp-list"><label class="form-label" for="od-list">ห้องเรียน / รายการ</label>${App.listSelect(l.id, 'id="od-list"')}</div>
            <div class="gp-field"><label class="form-label">สุ่มลำดับของ</label>
                <div class="seg full"><button type="button" data-src="list" class="${opts.source === 'list' ? 'active' : ''}">${l.kind === 'custom' ? 'รายการ' : 'นักเรียนรายคน'}</button><button type="button" data-src="group" class="${opts.source === 'group' ? 'active' : ''}"${g ? '' : ' disabled title="ยังไม่ได้จับกลุ่มสำหรับห้องนี้"'}>กลุ่ม (ล่าสุด)</button></div></div>
            <div class="gp-field"><label class="form-label">การแสดงผล</label>
                <div class="seg full"><button type="button" data-rv="step" class="${opts.reveal === 'step' ? 'active' : ''}">เปิดทีละลำดับ</button><button type="button" data-rv="all" class="${opts.reveal === 'all' ? 'active' : ''}">แสดงทั้งหมด</button></div></div>
            <div class="gp-field gp-act"><label class="form-label" for="od-act">ชื่องาน/กิจกรรม</label><input class="form-control" id="od-act" maxlength="100" placeholder="เช่น นำเสนอโครงงาน" value="${U.esc(opts.activity)}"></div>
            <div class="gp-go"><button type="button" class="btn-x cta lg" id="od-go"><i class="fas fa-shuffle"></i>สุ่มลำดับ</button></div>`;
        const items = sourceItems(l);
        root.querySelector('#od-preview').innerHTML = items.length
            ? `${items.length} ${opts.source === 'group' ? `กลุ่ม (จากการจับกลุ่มเมื่อ ${U.esc(App.when(g.at))})` : (l.kind === 'custom' ? 'รายการ' : 'คน (ไม่รวมขาดเรียน)')}`
            : 'ยังไม่มีรายชื่อ';
        box.querySelector('#od-list').onchange = (e) => Store.setCurrent(e.target.value);
        box.querySelectorAll('[data-src]').forEach((b) => { b.onclick = () => { opts.source = b.dataset.src; renderForm(); }; });
        box.querySelectorAll('[data-rv]').forEach((b) => { b.onclick = () => { opts.reveal = b.dataset.rv; renderForm(); }; });
        box.querySelector('#od-act').oninput = (e) => { opts.activity = e.target.value; };
        box.querySelector('#od-go').onclick = draw;
    }

    function draw() {
        const l = L();
        const items = sourceItems(l);
        if (items.length < 2) { U.alert('รายชื่อไม่พอ', 'ต้องมีอย่างน้อย 2 รายการ', 'info'); return; }
        Sound.unlock();
        const order = RNG.shuffle(items);
        const activity = U.norm(opts.activity);
        Store.addHistory('order', l, activity || 'ลำดับนำเสนอ', {
            source: opts.source,
            items: order,
            done: order.map(() => false),
            revealed: opts.reveal === 'all' ? order.length : 0,
            activity,
        });
        renderResult(true);
    }

    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function renderResult(animate) {
        clearTimers();
        const l = L();
        const h = current(l);
        const body = root.querySelector('#od-body');
        const tools = root.querySelector('#od-tools');
        root.querySelector('#od-title').textContent = h ? (h.data.activity || 'ลำดับการนำเสนอ') : 'ลำดับการนำเสนอ';
        if (!h) {
            root.querySelector('#od-sub').textContent = 'ยังไม่ได้สุ่มลำดับสำหรับห้องนี้';
            tools.innerHTML = App.stageButton('on-dark');
            App.bindStage(root, root.querySelector('#od-stage'));
            body.innerHTML = '<div class="stage-empty"><i class="fas fa-list-ol"></i><b>กด "สุ่มลำดับ" ด้านบน</b><span>ใช้กับนักเรียนรายคน หรือกลุ่มที่จับไว้ล่าสุด</span></div>';
            return;
        }
        const d = h.data;
        const n = d.items.length;
        const rev = Math.min(n, d.revealed == null ? n : d.revealed);
        const doneN = d.done.filter(Boolean).length;
        root.querySelector('#od-sub').innerHTML = `${U.esc(l.kind === 'custom' ? l.name : `ห้อง ${l.name}`)} • ${n} ${d.source === 'group' ? 'กลุ่ม' : 'ลำดับ'} • นำเสนอแล้ว ${doneN}/${n} • ${U.esc(App.when(h.at))}`;
        tools.innerHTML = `
            ${rev < n ? `<button type="button" class="btn-x on-white sm" id="od-next"><i class="fas fa-eye"></i>เปิดลำดับที่ ${rev + 1}</button><button type="button" class="btn-x on-dark sm" id="od-all" title="แสดงทั้งหมด" aria-label="แสดงทั้งหมด"><i class="fas fa-list"></i><span>แสดงทั้งหมด</span></button>` : ''}
            <button type="button" class="btn-x on-dark sm" id="od-xlsx" title="ส่งออก Excel" aria-label="ส่งออก Excel"><i class="fas fa-file-excel"></i><span>Excel</span></button>
            <a class="btn-x on-dark sm" href="#/reports?id=${encodeURIComponent(h.id)}" title="รายงาน .docx" aria-label="รายงาน .docx"><i class="fas fa-file-word"></i><span>รายงาน .docx</span></a>
            ${App.stageButton('on-dark')}`;
        App.bindStage(root, root.querySelector('#od-stage'));
        if (Stage.isOn()) tools.querySelector('[data-stage-toggle]').innerHTML = '<i class="fas fa-compress"></i><span>ออกจากเต็มจอ</span>';
        const nx = tools.querySelector('#od-next');
        if (nx) nx.onclick = () => revealNext(h);
        const all = tools.querySelector('#od-all');
        if (all) all.onclick = () => { d.revealed = n; Store.updateHistory(h.id, { data: d }); Sound.pop(6); };
        tools.querySelector('#od-xlsx').onclick = () => exportExcel(h, l);
        body.innerHTML = `<ol class="order-list${n > 10 ? ' two-col' : ''}" style="--rows:${Math.ceil(n / 2)}">${d.items.map((it, i) => {
            const shown = i < rev;
            return `<li class="${shown ? '' : 'is-hidden'}${d.done[i] ? ' is-done' : ''}${shown && i === rev - 1 && animate === true ? ' is-new' : ''}" data-i="${i}">
                <span class="ol-no">${i + 1}</span>
                <span class="ol-main"><b>${shown ? U.esc(it.label) : '?'}</b>${shown && it.sub ? `<small>${U.esc(it.sub)}</small>` : ''}</span>
                ${shown ? `<button type="button" class="ol-done" data-done="${i}" aria-pressed="${d.done[i] ? 'true' : 'false'}" title="${d.done[i] ? 'ยกเลิก' : 'นำเสนอแล้ว'}"><i class="fas ${d.done[i] ? 'fa-circle-check' : 'fa-circle'}"></i><span>${d.done[i] ? 'นำเสนอแล้ว' : 'ยังไม่นำเสนอ'}</span></button>` : ''}
            </li>`;
        }).join('')}</ol>`;
        body.querySelectorAll('[data-done]').forEach((b) => {
            b.onclick = () => { const i = +b.dataset.done; d.done[i] = !d.done[i]; Store.updateHistory(h.id, { data: d }); };
        });
        if (animate === true) {
            // เอฟเฟกต์สับลำดับสั้น ๆ ก่อนแสดงผล
            const lis = [...body.querySelectorAll('li')];
            const names = d.items.map((x) => x.label);
            lis.forEach((li) => li.classList.add('is-shuffling'));
            let k = 0;
            const tick = () => {
                lis.forEach((li, i) => { if (!li.classList.contains('is-hidden')) li.querySelector('b').textContent = names[(i + k * 7) % names.length]; });
                Sound.roll();
                k += 1;
                if (k < 14) timers.push(setTimeout(tick, 55));
                else {
                    lis.forEach((li, i) => { li.classList.remove('is-shuffling'); if (!li.classList.contains('is-hidden')) li.querySelector('b').textContent = names[i]; });
                    if (rev === n) { Sound.win(); FX.confetti({ count: 110, y: 0.3 }); }
                    else U.toast('สุ่มลำดับแล้ว — กด "เปิดลำดับที่ 1" (หรือ Space) เพื่อเปิดทีละลำดับ', { type: 'ok', ms: 3800 });
                }
            };
            tick();
        }
    }

    function revealNext(h) {
        const d = h.data;
        const n = d.items.length;
        d.revealed = Math.min(n, (d.revealed || 0) + 1);
        Sound.pop(d.revealed);
        Store.updateHistory(h.id, { data: d });
        const li = root && root.querySelector(`li[data-i="${d.revealed - 1}"]`);
        if (li) {
            li.classList.add('is-new');
            const r = li.getBoundingClientRect();
            if (r.bottom > window.innerHeight || r.top < 0) li.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        if (d.revealed === n) { Sound.win(); FX.confetti({ count: 100, y: 0.3 }); }
    }

    function exportExcel(h, l) {
        const rows = [['ลำดับที่', 'ชื่อ / กลุ่ม', 'รายละเอียด', 'สมาชิก', 'นำเสนอแล้ว']];
        h.data.items.forEach((it, i) => rows.push([i + 1, it.label, it.sub || '', (it.members || []).join(', '), h.data.done[i] ? 'ใช่' : '']));
        const name = IO.writeBook(`ลำดับนำเสนอ_${l.name}_${U.stamp()}`, [{ name: 'ลำดับนำเสนอ', rows, widths: [8, 30, 26, 60, 10] }]);
        U.toast(`ส่งออก <b>${U.esc(name)}</b> แล้ว`, { type: 'ok' });
    }

    function refresh(reason) {
        if (!root) return;
        if (!root.querySelector('#od-form')) { render(root); return; }
        if (reason === 'history') { renderResult('none'); return; }
        renderForm();
        renderResult('none');
    }
    function leave() {
        clearTimers();
        if (keyHandler) document.removeEventListener('keydown', keyHandler);
        keyHandler = null;
        root = null;
    }

    window.Views = window.Views || {};
    window.Views.order = { render, refresh, leave };
})();
