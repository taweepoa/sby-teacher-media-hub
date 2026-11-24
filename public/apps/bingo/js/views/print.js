/* พิมพ์การ์ด: 1 / 2 / 4 ใบต่อหน้า A4 • เลือกช่วงหมายเลข • แผ่นรายการคำสำหรับครู */
(function () {
    'use strict';

    let root = null;
    let params = {};
    let type = 'cards';
    let from = 1, to = 0;

    function render(el, p) {
        root = el;
        params = p || {};
        const g = App.pickGame(params);
        if (!g) { el.innerHTML = U.hero({ icon: 'fa-print', title: 'พิมพ์การ์ด', sub: 'พิมพ์การ์ดบิงโก 1–4 ใบต่อหน้า A4' }) + App.noGame('fa-print', 'สร้างการ์ดที่เมนู "ออกแบบการ์ด" ก่อน แล้วกลับมาพิมพ์ที่นี่'); return; }
        const s = Store.set(g.setId);
        const items = Store.itemMap(s);
        const max = g.cards.length;
        if (!to || to > max || from > max) { from = 1; to = max; }
        const list = g.cards.filter((c) => c.no >= from && c.no <= to);
        const pages = type === 'cards' ? Card.pages(g, items, { cards: list }) : Card.callSheet(g, s);
        el.innerHTML = `
            ${U.hero({ icon: 'fa-print', title: 'พิมพ์การ์ด', sub: 'กระดาษ A4 แนวตั้ง • 1 ใบ/หน้า (ใหญ่ เหมาะติดกระดาน) • 2 ใบ/หน้า (มาตรฐาน) • 4 ใบ/หน้า (ประหยัดกระดาษ) • บันทึกเป็น PDF ได้' })}
            <div class="print-bar panel">
                <div class="panel-body">
                    <div class="pb-row">
                        <div class="pb-field"><label class="form-label">เกม</label>${App.gameSelect(g, 'print')}</div>
                        <div class="pb-field"><label class="form-label">สิ่งที่จะพิมพ์</label>
                            <div class="seg" id="pr-type"><button type="button" data-type="cards" class="${type === 'cards' ? 'active' : ''}"><i class="fas fa-table-cells"></i>การ์ดบิงโก</button><button type="button" data-type="sheet" class="${type === 'sheet' ? 'active' : ''}"><i class="fas fa-list-ol"></i>แผ่นรายการคำ (ครู)</button></div></div>
                        ${type === 'cards' ? `
                        <div class="pb-field"><label class="form-label">จำนวนต่อหน้า</label>
                            <div class="seg" id="pr-per">${[1, 2, 4].map((n) => `<button type="button" data-per="${n}" class="${g.perPage === n ? 'active' : ''}">${n} ใบ</button>`).join('')}</div></div>
                        <div class="pb-field pb-range"><label class="form-label">หมายเลขการ์ด</label>
                            <div class="d-flex align-items-center gap-2"><input class="form-control" type="number" inputmode="numeric" id="pr-from" min="1" max="${max}" value="${from}"><span>ถึง</span><input class="form-control" type="number" inputmode="numeric" id="pr-to" min="1" max="${max}" value="${to}"></div></div>` : ''}
                        <div class="pb-go">
                            <button type="button" class="btn-x primary lg" data-act="print"><i class="fas fa-print"></i>พิมพ์ ${pages.length} หน้า</button>
                        </div>
                    </div>
                    <div class="hint mt-2"><i class="fas fa-circle-info"></i> ในหน้าต่างพิมพ์ เลือก "ขนาดกระดาษ A4" และ "ระยะขอบ: ค่าเริ่มต้น/ไม่มี" • ติ๊ก "กราฟิกพื้นหลัง" เพื่อให้สีหัวการ์ดออกมาด้วย • ${type === 'cards' ? `พิมพ์การ์ดหมายเลข ${from}–${to} (${list.length} ใบ)` : `รายการคำ ${s ? s.items.length : 0} คำ`}</div>
                </div>
            </div>
            <div class="paper-stage" id="paper-stage"><div class="paper-zoom">${pages.join('')}</div></div>`;
        App.bindGameSelect(el);
        el.querySelectorAll('[data-type]').forEach((b) => { b.onclick = () => { type = b.dataset.type; render(root, { game: g.id }); }; });
        el.querySelectorAll('[data-per]').forEach((b) => { b.onclick = () => { g.perPage = Number(b.dataset.per); Store.commit(); }; });
        const f = el.querySelector('#pr-from'), t = el.querySelector('#pr-to');
        if (f) {
            const upd = () => { from = Math.max(1, Math.min(max, U.toInt(f.value, 1))); to = Math.max(from, Math.min(max, U.toInt(t.value, max))); render(root, { game: g.id }); };
            f.onchange = upd; t.onchange = upd;
        }
        el.querySelector('[data-act="print"]').onclick = () => Card.print(pages);
        fit();
    }

    /* ย่อหน้ากระดาษให้พอดีความกว้างจอ (มือถือ/แท็บเล็ต) */
    function fit() {
        const st = root && root.querySelector('#paper-stage');
        if (!st) return;
        const z = st.querySelector('.paper-zoom');
        const pageW = 794; // 210mm ที่ 96dpi
        const avail = st.clientWidth - 8;
        const per = Math.max(1, Math.floor((avail + 24) / (pageW + 24)));
        const scale = Math.min(1, avail / pageW);
        z.style.zoom = per > 1 ? 1 : scale;
    }
    window.addEventListener('resize', U.debounce(() => { if (App.current === 'print') fit(); }, 150));

    window.Views = window.Views || {};
    window.Views.print = { render, refresh: () => render(root, params) };
})();
