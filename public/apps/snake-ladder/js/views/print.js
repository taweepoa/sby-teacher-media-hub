/* พิมพ์เล่นแบบกระดาษ: กระดาน A4 แนวนอน • การ์ดคำถาม A4 หน้าละ 8 ใบ (เฉลยด้านล่าง พับ/ตัดได้) • ใบเฉลย */
(function () {
    'use strict';
    const esc = U.esc;
    let root = null;
    let st = { tab: 'board', board: '', set: '' };

    function boardPage(b) {
        const s = Engine.boardStats(b);
        const o = Store.data.settings.opts;
        const wm = window.VSDemo && VSDemo.active ? `<div class="demo-wm" aria-hidden="true">${esc(VSDemo.watermark || 'ฉบับทดลองใช้')}</div>` : '';
        return `<section class="pb-page">${wm}
            <div class="pb-head"><b>${esc(b.name)}</b><span>${esc(Store.data.school.name || '')}</span></div>
            <div class="pb-main">${BoardArt.html(b, {})}
                <div class="pb-legend">
                    <h4>วิธีเล่น</h4>
                    <ol><li>ทอยลูกเต๋า เดินตามแต้ม</li><li>ตกช่อง <i class="fas fa-circle-question"></i> หยิบการ์ดคำถาม ถูกเดินต่อ ${o.rightStep} ช่อง ผิดถอย ${o.wrongStep} ช่อง</li><li>ถึงเชิงบันไดปีนขึ้น ถึงหัวงูไถลลง</li><li>ใครถึงช่อง ${b.n} ก่อนชนะ</li></ol>
                    <div class="lg-row"><span class="lg-cell c-q"><i class="fas fa-circle-question"></i></span>คำถาม (${s.q})</div>
                    <div class="lg-row"><span class="lg-cell c-bonus"><i class="fas fa-star"></i></span>โบนัส +${o.bonusStep} (${s.bonus})</div>
                    <div class="lg-row"><span class="lg-cell c-skip"><i class="fas fa-hourglass-half"></i></span>หยุดพัก 1 ตา (${s.skip})</div>
                    <div class="lg-row"><span class="lg-cell c-again"><i class="fas fa-dice"></i></span>ทอยอีกครั้ง (${s.again})</div>
                    <div class="lg-row"><span class="lg-cell lad"><i class="fas fa-stairs"></i></span>บันได (${s.ladders})</div>
                    <div class="lg-row"><span class="lg-cell snk"><i class="fas fa-worm"></i></span>งู (${s.snakes})</div>
                </div>
            </div>
        </section>`;
    }

    function pagesHTML() {
        const d = Store.data;
        if (st.tab === 'board') { const b = Store.board(st.board); return b ? boardPage(b) : ''; }
        const s = Store.set(st.set);
        if (!s) return '';
        return st.tab === 'cards' ? Docs.cardsHTML(s, d.tpl) : Docs.answerKeyHTML(s, d.school);
    }

    function render(el, params) {
        root = el;
        const d = Store.data;
        const p = params || {};
        if (p.tab) st.tab = p.tab;
        if (p.board) st.board = p.board;
        if (p.set) st.set = p.set;
        if (!Store.board(st.board)) st.board = (Store.board(d.settings.boardId) || d.boards[0] || {}).id || '';
        if (!Store.set(st.set)) st.set = (d.sets[0] || {}).id || '';
        const isBoard = st.tab === 'board';
        const html = pagesHTML();
        el.innerHTML = `
            ${U.hero({ icon: 'fa-print', title: 'พิมพ์เล่นแบบกระดาษ', sub: 'กระดาน A4 แนวนอน • การ์ดคำถาม A4 หน้าละ 8 ใบ (เฉลยกลับหัวด้านล่าง พับซ่อนได้) • ใบเฉลยสำหรับครู' })}
            <section class="panel panel--green pr-opts">
                <div class="panel-body d-flex flex-wrap gap-3 align-items-end">
                    <div><label class="form-label">พิมพ์อะไร</label><div class="seg">${[['board', 'fa-stairs', 'กระดาน'], ['cards', 'fa-id-card', 'การ์ดคำถาม'], ['key', 'fa-key', 'ใบเฉลย']].map(([k, i, l]) => `<button type="button" class="${st.tab === k ? 'active' : ''}" data-tab="${k}"><i class="fas ${i}"></i> ${l}</button>`).join('')}</div></div>
                    ${isBoard ? `<div class="grow"><label class="form-label">กระดาน</label><select class="form-select" id="pr-board">${U.options(d.boards.map((b) => ({ value: b.id, text: `${b.name} (${b.n} ช่อง)` })), st.board)}</select></div>`
                        : `<div class="grow"><label class="form-label">ชุดคำถาม</label><select class="form-select" id="pr-set">${U.options(d.sets.map((s) => ({ value: s.id, text: `${s.name} (${s.questions.length} ข้อ)` })), st.set)}</select></div>`}
                    <button type="button" class="btn-x primary lg" data-act="print" ${html ? '' : 'disabled'}><i class="fas fa-print"></i> พิมพ์ / บันทึก PDF</button>
                    ${!isBoard ? '<button type="button" class="btn-x ghost lg" data-act="docx"><i class="fas fa-file-word"></i> ชุดคำถามพร้อมเฉลย (.docx)</button>' : ''}
                </div>
            </section>
            <div class="pr-preview ${isBoard ? 'land' : ''}">${html || UI.empty(isBoard ? 'fa-stairs' : 'fa-layer-group', isBoard ? 'ยังไม่มีกระดาน' : 'ยังไม่มีชุดคำถาม', isBoard ? 'สร้างกระดานที่เมนู "ออกแบบกระดาน" ก่อน' : 'สร้างชุดคำถามก่อน')}</div>`;
        el.onclick = async (e) => {
            const b = e.target.closest('[data-tab], [data-act]');
            if (!b) return;
            if (b.dataset.tab) { st.tab = b.dataset.tab; render(el); return; }
            if (b.dataset.act === 'print') {
                document.body.classList.toggle('print-land', isBoard);
                Print.html(pagesHTML());
                setTimeout(() => document.body.classList.remove('print-land'), 1500);
            } else if (b.dataset.act === 'docx') {
                const s = Store.set(st.set);
                try { await ThaiDoc.download(Docs.setSections(ThaiDoc, s, d.school), `${U.safeFileName(`ชุดคำถามพร้อมเฉลย_${s.name}`)}.docx`, { title: 'ชุดคำถามพร้อมเฉลย' }); U.toast('ดาวน์โหลดแล้ว', { type: 'ok' }); } catch (err) { U.alert('สร้างไฟล์ไม่สำเร็จ', esc(err.message), 'error'); }
            }
        };
        el.onchange = (e) => {
            if (e.target.id === 'pr-board') st.board = e.target.value;
            if (e.target.id === 'pr-set') st.set = e.target.value;
            render(el);
        };
    }
    window.Views.print = { render, refresh() { if (root) render(root); } };
})();
