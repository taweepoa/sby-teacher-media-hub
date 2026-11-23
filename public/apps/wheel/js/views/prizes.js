/* =====================================================================
   จับฉลากของรางวัล: รายการรางวัล (ชื่อ × จำนวน) → จับทีละรางวัลตามลำดับ (ชื่อหมุนแบบสล็อต)
   หนึ่งคนได้หนึ่งรางวัล • ผู้ได้รับไม่อยู่ → "จับใหม่" • จับที่เหลือทั้งหมดในครั้งเดียว
   แต่ละรอบบันทึกเป็นประวัติ 1 รายการ (อัปเดตทุกครั้งที่จับ) • Excel • รายงาน .docx
   ===================================================================== */
(function () {
    'use strict';

    let root = null;
    let rolling = false;
    let timers = [];
    let keyHandler = null;

    const D = () => Store.data;
    const session = () => D().prizeSession;
    const L = () => {
        const s = session();
        return (s && Store.list(s.listId)) || Store.currentList();
    };
    function units(prizes) {
        const out = [];
        prizes.forEach((p) => { for (let i = 0; i < p.qty; i += 1) out.push({ id: p.id, name: p.name, k: i + 1, of: p.qty }); });
        return out;
    }

    function render(el) {
        root = el;
        if (keyHandler) document.removeEventListener('keydown', keyHandler);
        el.innerHTML = `
            ${U.hero({ cls: 'hero--prize', icon: 'fa-gift', title: 'จับฉลากของรางวัล', sub: 'จับรางวัลทีละชิ้นแบบลุ้น ๆ หนึ่งคนได้หนึ่งรางวัล ผู้ได้รับไม่อยู่จับใหม่ได้ บันทึกผลพร้อมรายงานลงนามรับรอง' })}
            ${D().lists.length ? `
            <div class="prize-layout">
                <div class="prize-side">
                    <div class="panel panel--green">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-gift"></i></span><div><h3>รายการของรางวัล</h3><small id="pz-total"></small></div>
                            <div class="panel-tools"><button type="button" class="btn-x primary sm" id="pz-add"><i class="fas fa-plus"></i>เพิ่ม</button></div></div>
                        <div class="panel-body p-0" id="pz-list"></div>
                    </div>
                    <div class="panel panel--theme">
                        <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-users"></i></span><div><h3>ผู้มีสิทธิ์จับฉลาก</h3><small id="pz-who"></small></div></div>
                        <div class="panel-body" id="pz-form"></div>
                    </div>
                </div>
                <section class="stage-area prize-stage" id="pz-stage">
                    <div class="stage-top">
                        <div class="stage-title"><span class="stage-ic"><i class="fas fa-gift"></i></span><div><b id="pz-title">จับฉลากของรางวัล</b><small id="pz-sub"></small></div></div>
                        <div class="stage-tools" id="pz-tools"></div>
                    </div>
                    <div class="prize-now" id="pz-now"></div>
                    <div class="prize-results" id="pz-results"></div>
                </section>
            </div>` : App.noListState('fa-gift')}`;
        if (!D().lists.length) return;
        keyHandler = (e) => {
            if (App.current !== 'prizes' || e.repeat || App.winOpen()) return;
            if (e.target && e.target.closest('input, textarea, select, button, a, .swal2-container')) return;
            if (e.key === ' ' || e.key === 'Enter') { const b = root && root.querySelector('#pz-draw'); if (b && !b.disabled) { e.preventDefault(); b.click(); } }
            else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); Stage.toggle(root.querySelector('#pz-stage')); }
        };
        document.addEventListener('keydown', keyHandler);
        el.querySelector('#pz-add').onclick = () => editPrize(null);
        update();
    }

    function update() {
        if (!root || !root.querySelector('#pz-list')) return;
        renderPrizes();
        renderForm();
        renderStage();
    }

    /* ---------- รายการรางวัล ---------- */
    function renderPrizes() {
        const ps = D().prizes;
        const n = ps.reduce((a, p) => a + p.qty, 0);
        root.querySelector('#pz-total').textContent = ps.length ? `${ps.length} รายการ • รวม ${n} รางวัล (จับตามลำดับจากบนลงล่าง)` : 'ยังไม่มีรางวัล';
        root.querySelector('#pz-list').innerHTML = ps.length ? `<ul class="prize-list">${ps.map((p, i) => `
            <li><span class="pl-no">${i + 1}</span><span class="pl-name"><b>${U.esc(p.name)}</b><small>${p.qty} รางวัล</small></span>
                <span class="pl-act">
                    <button type="button" class="icon-btn" data-up="${i}" title="เลื่อนขึ้น" aria-label="เลื่อนขึ้น"${i ? '' : ' disabled'}><i class="fas fa-arrow-up"></i></button>
                    <button type="button" class="icon-btn edit" data-edit="${i}" title="แก้ไข" aria-label="แก้ไข"><i class="fas fa-pen"></i></button>
                    <button type="button" class="icon-btn del" data-del="${i}" title="ลบ" aria-label="ลบ"><i class="fas fa-trash"></i></button>
                </span></li>`).join('')}</ul>` : '<div class="empty-state sm"><span class="ic-box" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-gift"></i></span><h3>ยังไม่มีของรางวัล</h3><div>กด "เพิ่ม" แล้วใส่ชื่อรางวัลและจำนวน</div></div>';
        root.querySelectorAll('[data-up]').forEach((b) => { b.onclick = () => { const i = +b.dataset.up; [ps[i - 1], ps[i]] = [ps[i], ps[i - 1]]; Store.commit('prizes'); }; });
        root.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => editPrize(ps[+b.dataset.edit]); });
        root.querySelectorAll('[data-del]').forEach((b) => {
            b.onclick = async () => {
                const p = ps[+b.dataset.del];
                if (!(await U.confirm(`ลบ "${p.name}"?`, 'ลบออกจากรายการของรางวัล (ผลการจับที่บันทึกแล้วยังอยู่)', { confirmText: 'ลบ', danger: true }))) return;
                D().prizes = ps.filter((x) => x !== p);
                Store.commit('prizes');
            };
        });
    }

    async function editPrize(p) {
        const r = await U.sheet({
            title: p ? 'แก้ไขของรางวัล' : 'เพิ่มของรางวัล',
            icon: 'fa-gift',
            tone: ['var(--hero-2)', 'var(--ac)', 'var(--ac-2)'],
            body: `<div class="row g-2"><div class="col-8"><label class="form-label" for="pz-n">ชื่อรางวัล</label><input class="form-control" id="pz-n" maxlength="80" value="${U.esc(p ? p.name : '')}" placeholder="เช่น สมุดโน้ต"></div>
                <div class="col-4"><label class="form-label" for="pz-q">จำนวน</label><input class="form-control" id="pz-q" type="number" min="1" max="999" inputmode="numeric" value="${p ? p.qty : 1}"></div></div>
                <div class="sheet-hint">รางวัลใหญ่ที่ต้องการลุ้นท้ายสุด ให้วางไว้ล่างสุดของรายการ</div>`,
            preConfirm: () => {
                const name = U.norm(document.getElementById('pz-n').value);
                if (!name) { Swal.showValidationMessage('กรุณาใส่ชื่อรางวัล'); return false; }
                return { name, qty: Math.max(1, Math.min(999, U.toInt(document.getElementById('pz-q').value, 1))) };
            },
        });
        if (!r.isConfirmed) return;
        if (p) Object.assign(p, r.value);
        else D().prizes.push(Object.assign({ id: U.uid('p') }, r.value));
        Store.commit('prizes');
    }

    /* ---------- ผู้มีสิทธิ์ ---------- */
    function eligible(l, s) {
        const won = new Set(s ? s.draws.map((x) => x.person.id) : []);
        const skip = new Set(s ? s.skipped || [] : []);
        return Store.present(l).filter((x) => !won.has(x.id) && !skip.has(x.id));
    }

    function renderForm() {
        const s = session();
        const l = L();
        const el = eligible(l, s);
        root.querySelector('#pz-who').textContent = `${Store.present(l).length} ${l.kind === 'custom' ? 'รายการ' : 'คน (ไม่รวมขาดเรียน)'} • ยังไม่ได้รางวัล ${el.length}`;
        root.querySelector('#pz-form').innerHTML = `
            <label class="form-label" for="pz-listsel">ห้องเรียน / รายการ</label>
            ${App.listSelect(l.id, `id="pz-listsel"${s && s.draws.length ? ' disabled' : ''}`)}
            <div class="field-help">${s && s.draws.length ? 'กำลังจับฉลากอยู่ — กด "เริ่มรอบใหม่" ก่อนเปลี่ยนห้อง' : 'หนึ่งคนได้หนึ่งรางวัล • คนที่ขาดเรียนไม่มีสิทธิ์'}</div>`;
        const sel = root.querySelector('#pz-listsel');
        sel.onchange = () => {
            Store.setCurrent(sel.value);
            if (s && !s.draws.length) { D().prizeSession = null; Store.commit('prizes'); }
        };
    }

    /* ---------- เวที ---------- */
    function renderStage() {
        const s = session();
        const l = L();
        const plan = units(s ? s.prizes : D().prizes);
        const done = s ? s.draws.length : 0;
        const next = plan[done];
        const left = eligible(l, s);
        root.querySelector('#pz-title').textContent = s ? (Store.historyItem(s.id) || {}).title || 'จับฉลากของรางวัล' : 'จับฉลากของรางวัล';
        root.querySelector('#pz-sub').textContent = `${l.kind === 'custom' ? l.name : `ห้อง ${l.name}`} • จับแล้ว ${done}/${plan.length} รางวัล${s ? ` • เริ่ม ${App.when(s.startedAt)}` : ''}`;
        const tools = root.querySelector('#pz-tools');
        tools.innerHTML = `
            ${s ? `<button type="button" class="btn-x on-dark sm" id="pz-xlsx" title="ส่งออก Excel" aria-label="ส่งออก Excel"${done ? '' : ' disabled'}><i class="fas fa-file-excel"></i><span>Excel</span></button>
            <a class="btn-x on-dark sm${done ? '' : ' disabled'}" href="#/reports?id=${encodeURIComponent(s.id)}" title="รายงาน .docx" aria-label="รายงาน .docx"${done ? '' : ' aria-disabled="true" tabindex="-1"'}><i class="fas fa-file-word"></i><span>รายงาน .docx</span></a>
            <button type="button" class="btn-x on-dark sm" id="pz-new" title="เริ่มรอบใหม่" aria-label="เริ่มรอบใหม่"><i class="fas fa-rotate"></i><span>เริ่มรอบใหม่</span></button>` : ''}
            ${App.stageButton('on-dark')}`;
        App.bindStage(root, root.querySelector('#pz-stage'));
        if (Stage.isOn()) tools.querySelector('[data-stage-toggle]').innerHTML = '<i class="fas fa-compress"></i><span>ออกจากเต็มจอ</span>';
        if (s) {
            tools.querySelector('#pz-xlsx').onclick = () => exportExcel(s, l);
            tools.querySelector('#pz-new').onclick = newSession;
        }
        const now = root.querySelector('#pz-now');
        if (!plan.length) {
            now.innerHTML = '<div class="stage-empty"><i class="fas fa-gift"></i><b>เพิ่มของรางวัลทางซ้ายก่อน</b><span>ใส่ชื่อรางวัลและจำนวน แล้วกลับมากด "จับฉลาก"</span></div>';
        } else if (!next) {
            now.innerHTML = `<div class="stage-empty is-done"><i class="fas fa-trophy"></i><b>จับฉลากครบทุกรางวัลแล้ว</b><span>ดาวน์โหลดรายงาน .docx เพื่อให้ผู้รับลงลายมือชื่อ หรือกด "เริ่มรอบใหม่"</span></div>`;
        } else {
            now.innerHTML = `
                <div class="pn-prize"><span class="pn-k">รางวัลที่ ${done + 1} จาก ${plan.length}</span><b>${U.esc(next.name)}</b>${next.of > 1 ? `<small>ชิ้นที่ ${next.k}/${next.of}</small>` : ''}</div>
                <div class="roller" id="pz-roller"><span>${left.length ? '?' : 'ไม่มีผู้มีสิทธิ์เหลือ'}</span></div>
                <div class="pn-actions">
                    <button type="button" class="btn-x on-white lg" id="pz-draw"${left.length ? '' : ' disabled'}><i class="fas fa-hand-sparkles"></i>จับฉลาก</button>
                    ${plan.length - done > 1 ? `<button type="button" class="btn-x on-dark" id="pz-all"${left.length ? '' : ' disabled'}><i class="fas fa-forward-fast"></i>จับที่เหลือทั้งหมด (${plan.length - done})</button>` : ''}
                </div>`;
            now.querySelector('#pz-draw').onclick = drawOne;
            const all = now.querySelector('#pz-all');
            if (all) all.onclick = drawAll;
        }
        const res = root.querySelector('#pz-results');
        res.innerHTML = s && s.draws.length ? `
            <div class="pr-head"><i class="fas fa-list-check"></i>ผลการจับฉลาก</div>
            <ol class="pr-list">${s.draws.map((x, i) => `<li><span class="pr-no">${i + 1}</span><span class="pr-prize">${U.esc(x.prize)}</span><span class="pr-who"><b>${U.esc(l.kind === 'custom' ? x.person.first : x.person.name || x.person.first)}</b>${x.person.no !== '' && l.kind !== 'custom' ? `<small>เลขที่ ${U.esc(x.person.no)}</small>` : ''}</span></li>`).join('')}</ol>` : '';
    }

    function ensureSession(l) {
        let s = session();
        if (s) return s;
        const h = Store.addHistory('prize', l, 'จับฉลากของรางวัล', { draws: [], done: false });
        s = { id: h.id, listId: l.id, startedAt: h.at, prizes: D().prizes.map((p) => ({ id: p.id, name: p.name, qty: p.qty })), draws: [], skipped: [] };
        D().prizeSession = s;
        return s;
    }

    function saveSession(s) {
        const total = units(s.prizes).length;
        D().prizeSession = s;
        Store.updateHistory(s.id, { data: { draws: s.draws.map((x) => ({ prize: x.prize, person: x.person })), done: s.draws.length >= total } });
    }

    function drawOne() {
        if (rolling) return;
        const l = L();
        const s = ensureSession(l);
        const plan = units(s.prizes);
        const unit = plan[s.draws.length];
        const pool = eligible(l, s);
        if (!unit || !pool.length) return;
        Sound.unlock();
        const winner = RNG.pick(pool); // ผลจริง: สุ่มด้วย crypto ก่อนเริ่มภาพเคลื่อนไหว
        rolling = true;
        const btns = root.querySelectorAll('#pz-draw, #pz-all');
        btns.forEach((b) => { b.disabled = true; });
        const roller = root.querySelector('#pz-roller');
        roller.classList.add('is-rolling');
        const names = pool.map((x) => (l.kind === 'custom' ? x.firstName : `${x.firstName} ${x.lastName}`.trim()));
        let k = 0;
        const steps = 26;
        const tick = () => {
            if (!root) { rolling = false; return; }
            if (k < steps) {
                roller.innerHTML = `<span>${U.esc(names[RNG.randInt(names.length)])}</span>`;
                Sound.roll();
                k += 1;
                timers.push(setTimeout(tick, 45 + k * k * 0.5));
                return;
            }
            roller.classList.remove('is-rolling');
            const person = Engine.snap(winner);
            s.draws.push({ prizeId: unit.id, prize: unit.name, person });
            rolling = false;
            saveSession(s);
            const last = s.draws.length >= plan.length;
            App.showWin({
                kicker: `ได้รับรางวัล: ${unit.name}`,
                icon: 'fa-gift',
                badge: l.kind === 'custom' ? '' : winner.no,
                title: l.kind === 'custom' ? winner.firstName : `${winner.firstName}${winner.lastName ? ` ${winner.lastName}` : ''}`,
                sub: l.kind === 'custom' ? U.esc(l.name) : `${winner.no !== '' ? `เลขที่ <b>${U.esc(winner.no)}</b> • ` : ''}${U.esc(`ห้อง ${l.name}`)}`,
                note: `รางวัลที่ ${s.draws.length} จาก ${plan.length}${last ? ' — ครบทุกรางวัลแล้ว' : ''}`,
                color: '#30D158',
                actions: [
                    { label: 'ไม่อยู่ / สละสิทธิ์ — จับใหม่', icon: 'fa-user-slash', cls: 'ghost', onClick: () => voidLast(s, winner) },
                    last ? { label: 'เสร็จสิ้น', icon: 'fa-check', cls: 'primary' } : { label: 'จับรางวัลถัดไป', icon: 'fa-forward', cls: 'primary', onClick: () => setTimeout(drawOne, 250) },
                ],
            });
        };
        tick();
    }

    function voidLast(s, winner) {
        s.draws = s.draws.filter((x) => x.person.id !== winner.id);
        s.skipped = (s.skipped || []).concat(winner.id);
        saveSession(s);
        U.toast(`${U.esc(winner.firstName)} สละสิทธิ์ — จับรางวัลนี้ใหม่`, { icon: 'fa-user-slash' });
        setTimeout(drawOne, 400);
    }

    async function drawAll() {
        if (rolling) return;
        const l = L();
        const s0 = session();
        const done = s0 ? s0.draws.length : 0;
        const plan = units(s0 ? s0.prizes : D().prizes);
        const left = plan.length - done;
        const pool = eligible(l, s0);
        if (!(await U.confirm('จับที่เหลือทั้งหมด?', `สุ่มผู้ได้รับ ${left} รางวัลที่เหลือพร้อมกันในครั้งเดียว${pool.length < left ? `<br><small>ผู้มีสิทธิ์เหลือ ${pool.length} คน — จะจับได้ ${pool.length} รางวัล</small>` : ''}`, { confirmText: 'จับทั้งหมด', icon: 'question' }))) return;
        const s = ensureSession(l);
        const winners = RNG.sample(eligible(l, s), left);
        winners.forEach((w, i) => { const u = plan[done + i]; s.draws.push({ prizeId: u.id, prize: u.name, person: Engine.snap(w) }); });
        saveSession(s);
        Sound.win();
        FX.celebrate();
        U.toast(`จับฉลากเพิ่ม ${winners.length} รางวัลแล้ว`, { type: 'ok' });
    }

    async function newSession() {
        const s = session();
        if (s && s.draws.length && !(await U.confirm('เริ่มรอบใหม่?', 'ผลรอบนี้บันทึกในประวัติแล้ว — รอบใหม่จะใช้รายการของรางวัลปัจจุบัน และทุกคนกลับมามีสิทธิ์', { confirmText: 'เริ่มรอบใหม่', icon: 'question' }))) return;
        if (s && !s.draws.length) D().history = D().history.filter((h) => h.id !== s.id);
        D().prizeSession = null;
        Store.commit('prizes');
    }

    function exportExcel(s, l) {
        const rows = [['ลำดับ', 'รางวัล', 'เลขที่', 'ชื่อ - สกุล', 'ห้อง', 'ลายมือชื่อผู้รับ']];
        s.draws.forEach((x, i) => rows.push([i + 1, x.prize, x.person.no, x.person.name || x.person.first, l.name, '']));
        const name = IO.writeBook(`จับฉลาก_${l.name}_${U.stamp()}`, [{ name: 'ผลการจับฉลาก', rows, widths: [7, 30, 7, 30, 10, 20] }]);
        U.toast(`ส่งออก <b>${U.esc(name)}</b> แล้ว`, { type: 'ok' });
    }

    function refresh() { if (!root) return; if (!root.querySelector('#pz-list')) { render(root); return; } if (!rolling) update(); }
    function leave() {
        timers.forEach(clearTimeout);
        timers = [];
        rolling = false;
        if (keyHandler) document.removeEventListener('keydown', keyHandler);
        keyHandler = null;
        root = null;
    }

    window.Views = window.Views || {};
    window.Views.prizes = { render, refresh, leave };
})();
