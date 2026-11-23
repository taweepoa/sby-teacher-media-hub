/* พิมพ์การ์ดสำหรับเล่นแบบกระดาษ: A4 หน้าละ 12 ใบ + หน้าหลังการ์ด (เลือกลายได้) — ดูตัวอย่างบนจอก่อนพิมพ์ */
(function () {
    'use strict';
    const esc = U.esc;
    let root = null;
    let opt = { setId: '', back: true };
    const BACK_ICONS = { star: 'star', heart: 'heart', school: 'school', question: 'question' };

    function render(el, params) {
        root = el;
        const d = Store.data;
        if (params && params.set) opt.setId = params.set;
        if (!Store.set(opt.setId)) opt.setId = d.sets[0] ? d.sets[0].id : '';
        const s = Store.set(opt.setId);
        const st = d.settings;
        el.innerHTML = `
            ${U.hero({ icon: 'fa-print', title: 'พิมพ์การ์ดเล่นแบบกระดาษ', sub: 'การ์ด A4 หน้าละ 12 ใบ (ขนาดราว 6 × 6 ซม.) ตัดตามเส้นประ — ใช้เล่นจับคู่ความจำในกลุ่มเล็ก หรือใช้เป็นบัตรคำ', cls: 'hero--print', side: s ? `<span class="hero-stat"><i class="fas fa-clone"></i><b>${s.pairs.length * 2}</b> ใบ</span><span class="hero-stat"><i class="fas fa-file"></i><b>${Math.ceil((s.pairs.length * 2) / 12) * (opt.back ? 2 : 1)}</b> หน้า</span>` : '' })}
            ${s ? `<section class="panel panel--purple pr-opts"><div class="panel-body">
                <div class="row g-3 align-items-end">
                    <div class="col-lg-4"><label class="form-label">ชุดเนื้อหา</label><select class="form-select" id="pr-set" data-demo-allow>${d.sets.map((x) => `<option value="${esc(x.id)}" ${x.id === s.id ? 'selected' : ''}>${esc(x.name)} (${x.pairs.length} คู่)</option>`).join('')}</select></div>
                    <div class="col-lg-3"><label class="form-label">หน้าหลังการ์ด</label><div class="seg"><button type="button" data-back="1" class="${opt.back ? 'active' : ''}">พิมพ์ด้วย</button><button type="button" data-back="0" class="${opt.back ? '' : 'active'}">ไม่พิมพ์</button></div></div>
                    <div class="col-lg-3"><label class="form-label">ลายหลังการ์ด</label><div class="seg seg-wrap">${Object.keys(Store.BACKS).map((k) => `<button type="button" data-backicon="${k}" class="${st.cardBack === k ? 'active' : ''}" title="${esc(Store.BACKS[k])}"><i class="fas fa-${BACK_ICONS[k]}"></i></button>`).join('')}</div></div>
                    <div class="col-lg-2 text-lg-end"><button type="button" class="btn-x primary lg w-100" data-act="print"><i class="fas fa-print"></i> พิมพ์การ์ด</button></div>
                </div>
                <div class="note mt-3"><i class="fas fa-lightbulb"></i><div>วิธีเล่นแบบกระดาษ: คว่ำการ์ดทั้งหมด ให้นักเรียนผลัดกันเปิดทีละ 2 ใบ ถ้าเป็นคู่กันเก็บไว้และเปิดต่อ — การ์ด A กับ B ของคู่เดียวกันมีสีแถบเดียวกัน • ตั้งค่าเครื่องพิมพ์: A4, ขนาดจริง (100%), พิมพ์สองหน้าแบบกลับด้านตามขอบยาว</div></div>
            </div></section>
            <div class="print-preview" id="pr-preview">${Docs.cardsHTML(s, { back: opt.back, backIcon: BACK_ICONS[st.cardBack], backText: s.name, school: d.school.name })}</div>`
            : `<section class="panel"><div class="panel-body">${UI.empty('fa-print', 'ยังไม่มีชุดเนื้อหา', 'สร้างชุดเนื้อหาก่อน แล้วกลับมาพิมพ์การ์ด', '<a class="btn-x primary" href="#/library"><i class="fas fa-layer-group"></i> ไปที่ชุดเนื้อหา</a>')}</div></section>`}`;
        el.onclick = (e) => {
            const b = e.target.closest('[data-back],[data-backicon],[data-act]');
            if (!b) return;
            if (b.dataset.back) opt.back = b.dataset.back === '1';
            else if (b.dataset.backicon) { st.cardBack = b.dataset.backicon; Store.commit('settings', { quiet: true }); }
            else if (b.dataset.act === 'print') { printCards(s); return; }
            render(root, {});
        };
        const sel = el.querySelector('#pr-set');
        if (sel) sel.onchange = () => { opt.setId = sel.value; render(root, {}); };
    }

    function printCards(s) {
        const pr = document.getElementById('print-root');
        pr.innerHTML = Docs.cardsHTML(s, { back: opt.back, backIcon: BACK_ICONS[Store.data.settings.cardBack], backText: s.name, school: Store.data.school.name });
        document.body.classList.add('printing', 'printing-cards');
        const done = () => { document.body.classList.remove('printing', 'printing-cards'); window.removeEventListener('afterprint', done); };
        window.addEventListener('afterprint', done);
        setTimeout(() => { window.print(); setTimeout(() => { if (!window.matchMedia('print').matches) done(); }, 800); }, 60);
    }

    window.Views.print = { render, refresh(reason) { if (root && reason !== 'settings') render(root, {}); } };
})();
