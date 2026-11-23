/* ชุดหลายช่วงเวลา: สร้าง/แก้ไข/ทำสำเนา/ลบ และเริ่มใช้งาน */
(function () {
    'use strict';

    const C = window.TimerCore;
    let root = null;

    const segText = (sec) => C.fmt(sec * 1000);

    function card(q) {
        const total = Store.seqTotal(q);
        const using = Timer.cd.seqId === q.id && Timer.cd.segments.length > 1;
        return `
            <div class="seq-card${using ? ' is-using' : ''}">
                <div class="sc-head">
                    <div class="sc-title"><b>${U.esc(q.name || 'ชุดไม่มีชื่อ')}</b>
                        <small>${q.segments.length} ช่วง • รวม ${U.esc(C.fmtWords(total * 1000))} • ${q.auto ? '<span class="tag ok"><i class="fas fa-forward"></i>ไปช่วงถัดไปอัตโนมัติ</span>' : '<span class="tag info"><i class="fas fa-hand-pointer"></i>รอครูกด "ถัดไป"</span>'}${using ? ' <span class="tag warn"><i class="fas fa-play"></i>กำลังใช้</span>' : ''}</small>
                    </div>
                    <div class="sc-acts">
                        <button type="button" class="icon-btn edit" data-edit="${U.esc(q.id)}" title="แก้ไข" aria-label="แก้ไข"><i class="fas fa-pen"></i></button>
                        <button type="button" class="icon-btn" data-dup="${U.esc(q.id)}" title="ทำสำเนา" aria-label="ทำสำเนา"><i class="fas fa-copy"></i></button>
                        <button type="button" class="icon-btn del" data-del="${U.esc(q.id)}" title="ลบ" aria-label="ลบ"><i class="fas fa-trash-can"></i></button>
                    </div>
                </div>
                <div class="sc-bar">${q.segments.map((x) => `<span style="--sc:${x.color};flex-grow:${x.sec}" title="${U.esc(x.label)} ${segText(x.sec)}"></span>`).join('')}</div>
                <ol class="sc-segs">${q.segments.map((x, i) => `<li style="--sc:${x.color}"><i>${i + 1}</i><span>${U.esc(x.label || `ช่วงที่ ${i + 1}`)}</span><b>${segText(x.sec)}</b></li>`).join('')}</ol>
                <div class="sc-foot">
                    <button type="button" class="btn-x primary sm" data-use="${U.esc(q.id)}"><i class="fas fa-play"></i>ใช้ชุดนี้</button>
                    <button type="button" class="btn-x ghost sm" data-full="${U.esc(q.id)}"><i class="fas fa-expand"></i>เริ่มเลย + เต็มจอ</button>
                </div>
            </div>`;
    }

    function render(el, params) {
        root = el;
        const list = Store.data.sequences;
        const total = list.reduce((a, q) => a + q.segments.length, 0);
        el.innerHTML = `<div class="page-seq">
            ${U.hero({
                cls: 'hero--seq',
                icon: 'fa-layer-group',
                title: 'ชุดหลายช่วงเวลา',
                sub: 'ตั้งเวลาหลายช่วงต่อกัน เช่น อ่าน 5 นาที → อภิปราย 10 นาที → สรุป 3 นาที บันทึกไว้ใช้ซ้ำได้ทุกคาบ • มีเสียงบอกเมื่อเปลี่ยนช่วง',
                side: `<span class="hero-stat"><i class="fas fa-layer-group"></i><b>${list.length}</b> ชุด • ${total} ช่วง</span>
                       <button type="button" class="hero-btn" id="sq-new"><i class="fas fa-plus"></i>สร้างชุดใหม่</button>`,
            })}
            <div class="row g-3">
                <div class="col-xl-8">
                    ${list.length ? `<div class="seq-grid">${list.map(card).join('')}</div>` : `
                    <div class="panel panel--orange"><div class="panel-body">
                        <div class="empty-state"><span class="ic-box lg" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-layer-group"></i></span>
                            <h3>ยังไม่มีชุดหลายช่วงเวลา</h3><div>กด "สร้างชุดใหม่" หรือเลือกจากแม่แบบสำเร็จรูปด้านข้าง</div>
                            <button type="button" class="btn-x primary" data-new><i class="fas fa-plus"></i>สร้างชุดใหม่</button></div>
                    </div></div>`}
                </div>
                <div class="col-xl-4">
                    <div class="panel panel--theme">
                        <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-wand-magic-sparkles"></i></span><div><h3>แม่แบบสำเร็จรูป</h3><small>กดเพื่อเพิ่มเป็นชุดของคุณ แล้วแก้ไขต่อได้</small></div></div>
                        <div class="panel-body p-0">
                            <div class="tpl-list">${Demo.TEMPLATES.map((t) => `
                                <button type="button" class="tpl-row" data-tpl="${t.key}">
                                    <span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas ${t.icon}"></i></span>
                                    <span class="tpl-t"><b>${U.esc(t.name)}</b><small>${U.esc(t.segments.map((x) => x.label).slice(0, 4).join(' → '))}${t.segments.length > 4 ? ' …' : ''} • ${U.esc(C.fmtWords(t.segments.reduce((a, x) => a + x.sec, 0) * 1000))}</small></span>
                                    <i class="fas fa-plus tpl-add"></i>
                                </button>`).join('')}</div>
                        </div>
                    </div>
                    <div class="panel panel--teal">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#00C7BE;--b:#0A84FF"><i class="fas fa-lightbulb"></i></span><div><h3>เคล็ดลับ</h3></div></div>
                        <div class="panel-body small-help">
                            <ul class="ps-3 mb-0">
                                <li><b>ไปช่วงถัดไปอัตโนมัติ</b> — เหมาะกับกิจกรรมที่เวลาตายตัว ระบบเล่นเสียงเปลี่ยนช่วงให้</li>
                                <li><b>รอครูกด "ถัดไป"</b> — เหมาะกับนำเสนองานทีละกลุ่ม หมดเวลาแล้วจะนับเวลาเกินจนกว่าครูกด <kbd>N</kbd> หรือ <kbd>→</kbd></li>
                                <li>ระหว่างใช้ กด <kbd>+</kbd>/<kbd>−</kbd> เพิ่ม/ลดเวลาช่วงปัจจุบันครั้งละ 1 นาที (ไม่กระทบชุดที่บันทึกไว้)</li>
                                <li>ช่วงสั้น ๆ เช่น "ย้ายฐาน 45 วินาที" ใส่ 0 นาที 45 วินาทีได้</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div></div>`;
        el.querySelectorAll('#sq-new, [data-new]').forEach((b) => { b.onclick = () => edit(null); });
        el.firstElementChild.addEventListener('click', onClick);
        if (params && params.new) setTimeout(() => edit(null), 50);
        if (params && params.edit) setTimeout(() => edit(params.edit), 50);
    }

    async function onClick(e) {
        const b = e.target.closest('[data-edit],[data-dup],[data-del],[data-use],[data-full],[data-tpl]');
        if (!b) return;
        const d = Store.data;
        if (b.dataset.edit) { edit(b.dataset.edit); return; }
        if (b.dataset.tpl) {
            const t = Demo.TEMPLATES.find((x) => x.key === b.dataset.tpl);
            const q = Demo.fromTemplate(t);
            d.sequences.push(q);
            Store.commit('seq', { normalize: true });
            U.toast(`เพิ่มชุด "${U.esc(q.name)}" แล้ว`, { type: 'ok' });
            return;
        }
        if (b.dataset.dup) {
            const src = Store.sequence(b.dataset.dup);
            if (!src) return;
            const copy = U.clone(src);
            copy.id = U.uid('q');
            copy.name = `${src.name || 'ชุดไม่มีชื่อ'} (สำเนา)`;
            copy.segments.forEach((x) => { x.id = U.uid('g'); });
            d.sequences.splice(d.sequences.indexOf(src) + 1, 0, copy);
            Store.commit('seq', { normalize: true });
            U.toast('ทำสำเนาแล้ว', { type: 'ok' });
            return;
        }
        if (b.dataset.del) {
            const q = Store.sequence(b.dataset.del);
            if (!q) return;
            if (!(await U.confirm('ลบชุดนี้?', `ชุด "<b>${U.esc(q.name || 'ชุดไม่มีชื่อ')}</b>" (${q.segments.length} ช่วง) จะถูกลบ`, { confirmText: '<i class="fas fa-trash-can"></i> ลบ', danger: true }))) return;
            d.sequences = d.sequences.filter((x) => x.id !== q.id);
            Store.commit('seq');
            U.toast('ลบชุดแล้ว', { type: 'ok' });
            return;
        }
        if (b.dataset.use || b.dataset.full) {
            const q = Store.sequence(b.dataset.use || b.dataset.full);
            if (!q) return;
            if (Timer.running('countdown') && !(await U.confirm('เปลี่ยนเป็นชุดนี้?', 'นาฬิกาถอยหลังกำลังเดินอยู่ จะเริ่มชุดใหม่แทน', { confirmText: 'เปลี่ยน', icon: 'question' }))) return;
            Timer.loadSequence(q, { start: !!b.dataset.full });
            App.go('timer');
            if (b.dataset.full) Stage.open('timer');
            else U.toast(`ใช้ชุด "${U.esc(q.name || 'ชุดไม่มีชื่อ')}" แล้ว — กด <b>เริ่ม</b> หรือ Space`, { type: 'ok' });
        }
    }

    /* ---------- หน้าต่างแก้ไขชุด ---------- */
    function rowHtml(x, i) {
        const m = Math.floor(x.sec / 60);
        const s = x.sec % 60;
        return `
            <div class="se-row" data-row="${i}">
                <button type="button" class="se-color" data-color style="--sc:${x.color}" title="เปลี่ยนสี (แตะเพื่อสลับสี)" aria-label="เปลี่ยนสี"><span>${i + 1}</span></button>
                <input class="form-control se-label" data-f="label" value="${U.esc(x.label)}" maxlength="60" placeholder="ชื่อช่วง เช่น อ่านเนื้อเรื่อง" aria-label="ชื่อช่วงที่ ${i + 1}">
                <div class="se-time">
                    <input class="form-control" data-f="min" type="number" inputmode="numeric" min="0" max="999" value="${m}" aria-label="นาที"><span>น.</span>
                    <input class="form-control" data-f="sec" type="number" inputmode="numeric" min="0" max="59" value="${s}" aria-label="วินาที"><span>วิ.</span>
                </div>
                <div class="se-acts">
                    <button type="button" class="icon-btn" data-up title="เลื่อนขึ้น" aria-label="เลื่อนขึ้น"${i === 0 ? ' disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                    <button type="button" class="icon-btn del" data-rm title="ลบช่วงนี้" aria-label="ลบช่วงนี้"><i class="fas fa-xmark"></i></button>
                </div>
            </div>`;
    }

    function edit(id) {
        const src = id ? Store.sequence(id) : null;
        const q = src ? U.clone(src) : Store.newSequence();
        let rows = q.segments.map((x) => Object.assign({}, x));

        const readRows = (el) => {
            el.querySelectorAll('.se-row').forEach((r, i) => {
                const x = rows[i];
                if (!x) return;
                x.label = r.querySelector('[data-f="label"]').value;
                const m = Math.max(0, U.toInt(r.querySelector('[data-f="min"]').value, 0));
                const s = Math.max(0, Math.min(59, U.toInt(r.querySelector('[data-f="sec"]').value, 0)));
                x.sec = m * 60 + s;
            });
        };
        const paint = (el) => {
            el.querySelector('#se-rows').innerHTML = rows.map(rowHtml).join('');
            total(el);
        };
        const total = (el) => {
            const t = rows.reduce((a, x) => a + x.sec, 0);
            el.querySelector('#se-total').innerHTML = `<i class="fas fa-clock"></i>รวม <b>${U.esc(C.fmtWords(t * 1000))}</b> • ${rows.length} ช่วง`;
            el.querySelector('#se-add').disabled = rows.length >= Store.MAX_SEGMENTS;
        };

        return U.sheet({
            title: src ? 'แก้ไขชุดหลายช่วงเวลา' : 'สร้างชุดหลายช่วงเวลา',
            sub: 'เรียงช่วงตามลำดับที่ใช้จริง • สีของช่วงใช้แสดงบนจอเวลา',
            icon: 'fa-layer-group',
            tone: ['var(--hero-2)', 'var(--ac)', 'var(--ac-2)'],
            width: 760,
            body: `
                <div class="row g-3 text-start">
                    <div class="col-md-7"><label class="form-label" for="se-name">ชื่อชุด</label>
                        <input class="form-control" id="se-name" maxlength="80" value="${U.esc(q.name)}" placeholder="เช่น กิจกรรมกลุ่มคาบวิทยาการคำนวณ"></div>
                    <div class="col-md-5"><label class="form-label">เมื่อหมดแต่ละช่วง</label>
                        <div class="seg full" id="se-auto">
                            <button type="button" data-auto="1" class="${q.auto ? 'active' : ''}"><i class="fas fa-forward"></i>ไปต่ออัตโนมัติ</button>
                            <button type="button" data-auto="0" class="${q.auto ? '' : 'active'}"><i class="fas fa-hand-pointer"></i>รอครูกด</button>
                        </div></div>
                    <div class="col-12">
                        <div class="se-head"><span>ช่วงเวลา</span><span id="se-total"></span></div>
                        <div id="se-rows" class="se-rows"></div>
                        <button type="button" class="btn-x ghost sm mt-2" id="se-add"><i class="fas fa-plus"></i>เพิ่มช่วง</button>
                    </div>
                </div>`,
            didOpen: (el) => {
                paint(el);
                el.querySelector('#se-add').onclick = () => {
                    readRows(el);
                    const last = rows[rows.length - 1];
                    rows.push({ id: U.uid('g'), label: '', sec: last ? last.sec : 300, color: Store.SEG_COLORS[rows.length % Store.SEG_COLORS.length] });
                    paint(el);
                    const inputs = el.querySelectorAll('.se-label');
                    inputs[inputs.length - 1].focus();
                };
                el.querySelector('#se-auto').onclick = (e) => {
                    const b = e.target.closest('[data-auto]');
                    if (!b) return;
                    q.auto = b.dataset.auto === '1';
                    el.querySelectorAll('#se-auto [data-auto]').forEach((x) => x.classList.toggle('active', x === b));
                };
                el.querySelector('#se-rows').addEventListener('click', (e) => {
                    const r = e.target.closest('.se-row');
                    if (!r) return;
                    const i = +r.dataset.row;
                    if (e.target.closest('[data-color]')) {
                        readRows(el);
                        const k = Store.SEG_COLORS.indexOf(rows[i].color);
                        rows[i].color = Store.SEG_COLORS[(k + 1) % Store.SEG_COLORS.length];
                        paint(el);
                    } else if (e.target.closest('[data-up]') && i > 0) {
                        readRows(el);
                        [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]];
                        paint(el);
                    } else if (e.target.closest('[data-rm]')) {
                        readRows(el);
                        if (rows.length <= 1) { U.toast('ต้องมีอย่างน้อย 1 ช่วง', { type: 'warn' }); return; }
                        rows.splice(i, 1);
                        paint(el);
                    }
                });
                el.querySelector('#se-rows').addEventListener('input', () => { readRows(el); total(el); });
            },
            preConfirm: () => {
                const el = Swal.getPopup();
                readRows(el);
                const name = U.norm(el.querySelector('#se-name').value);
                if (!name) { Swal.showValidationMessage('กรุณาตั้งชื่อชุด'); return false; }
                const bad = rows.findIndex((x) => x.sec <= 0);
                if (bad >= 0) { Swal.showValidationMessage(`ช่วงที่ ${bad + 1} ยังไม่ได้กำหนดเวลา`); return false; }
                return { name, rows };
            },
        }).then((r) => {
            if (!r.isConfirmed) return;
            q.name = r.value.name;
            q.segments = r.value.rows.map((x, i) => ({ id: x.id || U.uid('g'), label: U.norm(x.label) || `ช่วงที่ ${i + 1}`, sec: x.sec, color: x.color }));
            const d = Store.data;
            const at = d.sequences.findIndex((x) => x.id === q.id);
            if (at >= 0) d.sequences[at] = q; else d.sequences.push(q);
            Store.commit('seq', { normalize: true });
            // ถ้ากำลังใช้ชุดนี้อยู่และยังไม่เริ่ม → อัปเดตชุดในนาฬิกาด้วย
            if (Timer.cd.seqId === q.id && !Timer.snap('countdown').started) Timer.loadSequence(Store.sequence(q.id));
            U.toast(src ? 'บันทึกการแก้ไขแล้ว' : `สร้างชุด "${U.esc(q.name)}" แล้ว`, { type: 'ok' });
        });
    }

    window.Views = window.Views || {};
    window.Views.sequences = { render, refresh: () => { if (root && root.isConnected) render(root, {}); } };
})();
