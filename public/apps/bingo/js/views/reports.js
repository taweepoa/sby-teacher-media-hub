/* รายงาน Word (.docx) แบบราชการ — สร้างด้วย ThaiDoc (TH SarabunPSK 16 pt, A4, ครุฑ, ช่องลงนาม) */
(function () {
    'use strict';

    let root = null;
    let params = {};

    function render(el, p) {
        root = el;
        params = p || {};
        const d = Store.data;
        const g = App.pickGame(params);
        const setId = params.set || (g && g.setId) || (d.sets[0] || {}).id;
        el.innerHTML = `
            ${U.hero({ icon: 'fa-file-word', title: 'รายงาน Word (.docx)', sub: 'เอกสารราชการตามระเบียบงานสารบรรณ • TH SarabunPSK 16 pt • A4 • แก้ไขต่อใน Microsoft Word ได้ • ข้อมูลที่ไม่มีในระบบจะเว้นจุดไข่ปลาให้กรอกเอง' })}
            ${!d.school.name ? '<div class="note warn"><i class="fas fa-school"></i><div>ยังไม่ได้กรอกข้อมูลโรงเรียนและผู้ลงนาม — รายงานจะเว้นจุดไข่ปลาไว้ <a href="#/settings">กรอกข้อมูลโรงเรียน</a></div></div>' : ''}
            <div class="report-grid">
                ${Docs.REPORTS.map((r) => `
                <div class="panel report-card">
                    <div class="panel-body">
                        <div class="rc-head"><span class="ic-box" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas ${r.icon}"></i></span><div><h3>${r.label}</h3><p>${r.desc}</p></div></div>
                        ${r.need === 'game'
                            ? (d.games.length ? `<label class="form-label">เกม</label><select class="form-select" data-pick="${r.id}">${d.games.map((x) => `<option value="${x.id}"${g && x.id === g.id ? ' selected' : ''}>${U.esc(x.name)} (${x.cards.length} ใบ • เรียก ${x.calls.length} คำ)</option>`).join('')}</select>` : '<div class="hint">ยังไม่มีเกม</div>')
                            : (d.sets.length ? `<label class="form-label">ชุดคำ</label><select class="form-select" data-pick="${r.id}">${d.sets.map((x) => `<option value="${x.id}"${x.id === setId ? ' selected' : ''}>${U.esc(x.name)} (${x.items.length} คำ)</option>`).join('')}</select>` : '<div class="hint">ยังไม่มีชุดคำ</div>')}
                        <button type="button" class="btn-x primary w-100 mt-3" data-doc="${r.id}"${(r.need === 'game' ? d.games.length : d.sets.length) ? '' : ' disabled'}><i class="fas fa-file-word"></i>ดาวน์โหลด .docx</button>
                    </div>
                </div>`).join('')}
            </div>
            <div class="note mt-3"><i class="fas fa-circle-info"></i><div>เปิดไฟล์ด้วย Microsoft Word ที่มีฟอนต์ <b>TH SarabunPSK</b> • การ์ดบิงโกและแผ่นรายการคำ พิมพ์ได้ที่เมนู <a href="#/print">พิมพ์การ์ด</a> (บันทึกเป็น PDF ได้)</div></div>`;
        el.querySelectorAll('[data-doc]').forEach((b) => {
            b.onclick = async () => {
                const id = b.dataset.doc;
                const r = Docs.REPORTS.find((x) => x.id === id);
                const sel = el.querySelector(`[data-pick="${id}"]`).value;
                const game = r.need === 'game' ? Store.game(sel) : null;
                const set = r.need === 'game' ? Store.set(game.setId) : Store.set(sel);
                b.disabled = true;
                try {
                    const out = Docs.build(id, Store.data, game, set, new Date());
                    await ThaiDoc.download(out.sections, `${U.safeFileName(out.name)}.docx`, { title: out.title });
                    U.toast('สร้างไฟล์ Word แล้ว', { type: 'ok' });
                } catch (e) {
                    console.error(e);
                    U.alert('สร้างไฟล์ไม่สำเร็จ', U.esc(e.message), 'error');
                } finally { b.disabled = false; }
            };
        });
    }

    window.Views = window.Views || {};
    window.Views.reports = { render, refresh: () => render(root, params) };
})();
