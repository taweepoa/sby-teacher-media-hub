/* แก้ไขชุดคำถาม (#/set?id=): รายการคำถาม + ตัวแก้ไขคำถาม (ข้อความ รูป ตัวเลือก เฉลย คะแนน เวลา หมวด คำอธิบาย) */
(function () {
    'use strict';
    const esc = U.esc;
    let q = '';

    function render(el, params) {
        const s = Store.set(params.id);
        if (!s) { App.go('sets'); return; }
        const L = UI.letters();
        const def = Store.data.settings.points;
        const f = U.normKey(q);
        const items = s.questions.map((x, i) => ({ x, i })).filter(({ x }) => !f || U.normKey(`${x.text}${x.choices.join('')}${x.answer}${x.category}`).includes(f));
        const bad = s.questions.filter(invalid).length;
        el.innerHTML = `
            ${U.hero({ icon: s.icon, title: s.name || 'ชุดคำถามไม่มีชื่อ', sub: `${esc([s.subject, s.level].filter(Boolean).join(' • ') || 'ยังไม่ระบุวิชา')} • ${s.questions.length} ข้อ${s.desc ? `<br>${esc(s.desc)}` : ''}`,
                side: `<button type="button" class="hero-btn ghost" id="ed-info"><i class="fas fa-pen"></i>ข้อมูลชุด</button><a class="btn-x cta" href="#/setup?set=${encodeURIComponent(s.id)}"><i class="fas fa-play"></i>เล่นชุดนี้</a>` })}
            ${bad ? `<div class="note warn"><i class="fas fa-triangle-exclamation"></i><div>มีคำถาม <b>${bad} ข้อ</b> ที่ยังกรอกไม่ครบ (กรอบสีแดง) — ต้องแก้ก่อนเริ่มการแข่งขัน</div></div>` : ''}
            <div class="page-tools">
                <a class="btn-x ghost" href="#/sets"><i class="fas fa-arrow-left"></i><span class="tb-hide-sm">คลังคำถาม</span></a>
                <div class="search-box"><i class="fas fa-magnifying-glass"></i><input class="form-control" id="ed-q" placeholder="ค้นหาคำถาม / เฉลย / หมวด" value="${esc(q)}" aria-label="ค้นหาคำถาม"></div>
                <button type="button" class="btn-x primary" data-add="mc"><i class="fas fa-plus"></i>คำถามเลือกตอบ</button>
                <button type="button" class="btn-x soft" data-add="text"><i class="fas fa-plus"></i>คำถามเขียนตอบ</button>
                <div class="dropdown">
                    <button type="button" class="btn-x ghost" data-bs-toggle="dropdown" aria-label="เมนูเพิ่มเติม"><i class="fas fa-ellipsis"></i></button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="#/import?set=${encodeURIComponent(s.id)}"><i class="fas fa-file-import me-2"></i>นำเข้าคำถามจาก Excel เข้าชุดนี้</a></li>
                        <li><button class="dropdown-item" id="ed-xlsx"><i class="fas fa-file-excel me-2"></i>ส่งออกชุดนี้เป็น Excel</button></li>
                    </ul>
                </div>
            </div>
            ${items.length ? `<div class="q-list">${items.map(({ x, i }) => `
                <div class="q-card${invalid(x) ? ' is-bad' : ''}" data-id="${esc(x.id)}">
                    <div class="q-head">
                        <span class="q-no">${i + 1}</span>
                        ${UI.qMeta(x, def)}
                        <span class="q-acts">
                            <button type="button" class="icon-btn" data-move="${esc(x.id)}:-1" title="เลื่อนขึ้น"${i === 0 ? ' disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                            <button type="button" class="icon-btn" data-move="${esc(x.id)}:1" title="เลื่อนลง"${i === s.questions.length - 1 ? ' disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                            <button type="button" class="icon-btn" data-dup="${esc(x.id)}" title="ทำสำเนา"><i class="fas fa-copy"></i></button>
                            <button type="button" class="icon-btn edit" data-edit="${esc(x.id)}" title="แก้ไข"><i class="fas fa-pen"></i></button>
                            <button type="button" class="icon-btn del" data-del="${esc(x.id)}" title="ลบ"><i class="fas fa-trash"></i></button>
                        </span>
                    </div>
                    <div class="q-body-mini">${UI.qBody(x, { letters: L })}</div>
                </div>`).join('')}</div>`
                : `<div class="panel"><div class="panel-body">${s.questions.length ? UI.empty('fa-magnifying-glass', 'ไม่พบคำถามที่ค้นหา', '') : UI.empty('fa-circle-question', 'ชุดนี้ยังไม่มีคำถาม', 'กด "คำถามเลือกตอบ" หรือ "คำถามเขียนตอบ" เพื่อเพิ่ม หรือนำเข้าจาก Excel', `<a class="btn-x ghost" href="#/import?set=${encodeURIComponent(s.id)}"><i class="fas fa-file-excel"></i>นำเข้าจาก Excel</a>`)}</div></div>`}
            ${s.questions.length > 3 ? `<div class="text-center mt-3"><button type="button" class="btn-x primary" data-add="mc"><i class="fas fa-plus"></i>เพิ่มคำถามเลือกตอบ</button> <button type="button" class="btn-x soft" data-add="text"><i class="fas fa-plus"></i>เพิ่มคำถามเขียนตอบ</button></div>` : ''}`;
        bind(el, s);
    }

    function invalid(x) {
        if (!x.text) return true;
        if (x.type === 'mc') return x.choices.length < 2 || x.choices.some((c) => !c) || !Number.isInteger(x.answer) || x.answer >= x.choices.length;
        return !x.answer;
    }

    function bind(el, s) {
        el.querySelector('#ed-info').onclick = async () => {
            const v = await Views.sets.setForm(s, 'แก้ไขข้อมูลชุดคำถาม');
            if (!v) return;
            Object.assign(s, v, { updatedAt: new Date().toISOString() });
            Store.commit('sets', { normalize: true });
        };
        el.querySelector('#ed-xlsx').onclick = () => { QIO.exportSet(s); U.toast('ส่งออกไฟล์ Excel แล้ว', { type: 'ok' }); };
        const inp = el.querySelector('#ed-q');
        inp.oninput = U.debounce(() => { q = inp.value; render(el, { id: s.id }); const n = el.querySelector('#ed-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250);
        el.onclick = async (e) => {
            const b = e.target.closest('button');
            if (!b || b.disabled) return;
            const d = b.dataset;
            if (d.add) { await editQuestion(s, null, d.add); return; }
            if (d.edit) { await editQuestion(s, d.edit); return; }
            if (d.dup) {
                const i = s.questions.findIndex((x) => x.id === d.dup);
                const c = Object.assign(Engine.clone(s.questions[i]), { id: U.uid('q') });
                s.questions.splice(i + 1, 0, c);
                touch(s);
                return;
            }
            if (d.move) {
                const [id, dir] = d.move.split(':');
                const i = s.questions.findIndex((x) => x.id === id);
                const j = i + Number(dir);
                if (j < 0 || j >= s.questions.length) return;
                [s.questions[i], s.questions[j]] = [s.questions[j], s.questions[i]];
                touch(s);
                return;
            }
            if (d.del) {
                const x = s.questions.find((y) => y.id === d.del);
                const ok = await U.confirm('ลบคำถามนี้?', `<div class="text-start small">${esc(x.text).slice(0, 160)}</div>`, { confirmText: 'ลบ', danger: true });
                if (!ok) return;
                s.questions = s.questions.filter((y) => y.id !== d.del);
                if (x.image && !Store.imageIds().has(x.image)) Img.del(x.image);
                touch(s);
            }
        };
    }
    function touch(s) { s.updatedAt = new Date().toISOString(); Store.commit('sets', { normalize: true }); }

    /* ---------- ตัวแก้ไขคำถาม ---------- */
    async function editQuestion(s, id, type) {
        const orig = id ? s.questions.find((x) => x.id === id) : null;
        const x = orig ? Engine.clone(orig) : Store.newQuestion(type);
        const L = UI.letters();
        let image = x.image;
        let pendingImg = null;
        const choiceRows = (choices, ans) => choices.map((c, i) => `
            <div class="ch-row">
                <label class="ch-ok" title="เลือกเป็นคำตอบที่ถูก"><input type="radio" name="qe-ans" value="${i}"${i === ans ? ' checked' : ''}><span>${esc(L[i])}</span></label>
                <input class="form-control" data-ch="${i}" value="${esc(c)}" placeholder="ตัวเลือก ${esc(L[i])}" maxlength="200">
                <button type="button" class="icon-btn del" data-rmch="${i}" title="ลบตัวเลือกนี้"${choices.length <= 2 ? ' disabled' : ''}><i class="fas fa-xmark"></i></button>
            </div>`).join('');
        const imgBox = () => {
            const src = pendingImg ? pendingImg.src : (image ? Img.src(image) : '');
            return src ? `<div class="qe-img-prev"><img src="${esc(src)}" alt="รูปประกอบคำถาม"><button type="button" class="btn-x ghost sm" id="qe-img-rm"><i class="fas fa-trash"></i>ลบรูป</button></div>`
                : '<div class="dropzone qe-drop" id="qe-drop" tabindex="0"><i class="fas fa-image"></i><b>เพิ่มรูปประกอบ</b><small>คลิกเลือกไฟล์ ลากมาวาง หรือกด Ctrl+V วางรูป (ย่อขนาดให้อัตโนมัติ)</small></div>';
        };
        const cats = [...new Set(s.questions.map((y) => y.category).filter(Boolean))];
        const r = await UI.sheet({
            title: orig ? `แก้ไขคำถามข้อ ${s.questions.indexOf(orig) + 1}` : 'เพิ่มคำถามใหม่', icon: 'fa-circle-question', width: 780,
            sub: esc(s.name),
            body: `
                <div class="seg full mb-3" id="qe-type"><button type="button" data-t="mc" class="${x.type === 'mc' ? 'active' : ''}"><i class="fas fa-list-ol"></i>เลือกตอบ</button><button type="button" data-t="text" class="${x.type === 'text' ? 'active' : ''}"><i class="fas fa-pen"></i>เขียนตอบ / ตอบปากเปล่า</button></div>
                <label class="form-label">คำถาม <span class="text-danger">*</span></label>
                <textarea class="form-control mb-2" id="qe-text" rows="3" maxlength="600" placeholder="พิมพ์คำถาม">${esc(x.text)}</textarea>
                <div id="qe-imgbox" class="mb-3">${imgBox()}</div>
                <div id="qe-mc"${x.type === 'mc' ? '' : ' hidden'}>
                    <label class="form-label">ตัวเลือก (กดวงกลมหน้าตัวเลือกที่ถูก)</label>
                    <div id="qe-choices">${choiceRows(x.type === 'mc' ? x.choices : ['', '', '', ''], x.type === 'mc' ? x.answer : 0)}</div>
                    <button type="button" class="btn-x ghost sm mt-1" id="qe-addch"${(x.type === 'mc' ? x.choices.length : 4) >= 4 ? ' hidden' : ''}><i class="fas fa-plus"></i>เพิ่มตัวเลือก</button>
                </div>
                <div id="qe-tx"${x.type === 'text' ? '' : ' hidden'}>
                    <label class="form-label">เฉลย (คำตอบที่ถูก) <span class="text-danger">*</span></label>
                    <input class="form-control" id="qe-answer" value="${esc(x.type === 'text' ? x.answer : '')}" maxlength="200" placeholder="เช่น ดาวอังคาร">
                    <div class="form-text">ครูเป็นผู้ตัดสินถูก/ผิด — ใส่คำตอบที่ยอมรับได้หลายแบบคั่นด้วย / ได้ เช่น หมา / สุนัข</div>
                </div>
                <div class="row g-2 mt-2">
                    <div class="col-4 col-md-3"><label class="form-label">คะแนน</label><input class="form-control" id="qe-points" type="number" inputmode="numeric" min="0" value="${x.points || ''}" placeholder="${Store.data.settings.points}"></div>
                    <div class="col-4 col-md-3"><label class="form-label">เวลา (วินาที)</label><input class="form-control" id="qe-time" type="number" inputmode="numeric" min="0" max="600" value="${x.time || ''}" placeholder="ตามเกม"></div>
                    <div class="col-4 col-md-6"><label class="form-label">หมวด (Jeopardy)</label><input class="form-control" id="qe-cat" value="${esc(x.category)}" list="qe-cats" maxlength="40" placeholder="เว้นว่างได้"><datalist id="qe-cats">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></div>
                </div>
                <div class="form-text">เว้นคะแนน/เวลาว่าง = ใช้ค่าที่ตั้งตอนเริ่มการแข่งขัน</div>
                <label class="form-label mt-2">คำอธิบายเฉลย (แสดงบนจอหลังเฉลย)</label>
                <input class="form-control" id="qe-explain" value="${esc(x.explain)}" maxlength="300" placeholder="เว้นว่างได้">`,
            confirmText: '<i class="fas fa-save"></i> บันทึกคำถาม',
            didOpen: (pop) => {
                let t = x.type;
                const seg = pop.querySelector('#qe-type');
                seg.onclick = (e) => {
                    const b = e.target.closest('[data-t]');
                    if (!b) return;
                    t = b.dataset.t;
                    seg.querySelectorAll('button').forEach((y) => y.classList.toggle('active', y === b));
                    pop.querySelector('#qe-mc').hidden = t !== 'mc';
                    pop.querySelector('#qe-tx').hidden = t !== 'text';
                    pop.dataset.t = t;
                };
                pop.dataset.t = t;
                const readChoices = () => U.$$('[data-ch]', pop).map((i) => i.value);
                const ans = () => { const c = pop.querySelector('input[name="qe-ans"]:checked'); return c ? +c.value : 0; };
                const redrawChoices = (list, a) => {
                    pop.querySelector('#qe-choices').innerHTML = choiceRows(list, Math.min(a, list.length - 1));
                    pop.querySelector('#qe-addch').hidden = list.length >= 4;
                };
                pop.querySelector('#qe-addch').onclick = () => { const l = readChoices(); if (l.length < 4) { l.push(''); redrawChoices(l, ans()); pop.querySelector(`[data-ch="${l.length - 1}"]`).focus(); } };
                pop.querySelector('#qe-choices').onclick = (e) => {
                    const b = e.target.closest('[data-rmch]');
                    if (!b || b.disabled) return;
                    const l = readChoices();
                    const k = +b.dataset.rmch;
                    let a = ans();
                    l.splice(k, 1);
                    if (a === k) a = 0; else if (a > k) a -= 1;
                    redrawChoices(l, a);
                };
                const setImage = async (file) => {
                    try {
                        pendingImg = await Img.fromFile(file);
                        pop.querySelector('#qe-imgbox').innerHTML = imgBox();
                        bindImg();
                    } catch (err) { U.toast(U.esc(err.message), { type: 'bad' }); }
                };
                const bindImg = () => {
                    const rm = pop.querySelector('#qe-img-rm');
                    if (rm) rm.onclick = () => { pendingImg = null; image = ''; pop.querySelector('#qe-imgbox').innerHTML = imgBox(); bindImg(); };
                    const drop = pop.querySelector('#qe-drop');
                    if (!drop) return;
                    drop.onclick = async () => { const f = await U.pickFile('image/*'); if (f) setImage(f); };
                    drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drop.click(); } };
                    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('is-over'); };
                    drop.ondragleave = () => drop.classList.remove('is-over');
                    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('is-over'); const f = e.dataTransfer.files[0]; if (f) setImage(f); };
                };
                bindImg();
                pop.addEventListener('paste', (e) => {
                    const it = [...(e.clipboardData ? e.clipboardData.items : [])].find((i) => i.kind === 'file' && /^image\//.test(i.type));
                    if (it) { e.preventDefault(); setImage(it.getAsFile()); }
                });
            },
            preConfirm: () => {
                const pop = Swal.getPopup();
                const t = pop.dataset.t;
                const text = document.getElementById('qe-text').value.trim();
                if (!text) { Swal.showValidationMessage('กรุณาพิมพ์คำถาม'); return false; }
                const out = {
                    type: t, text,
                    points: Math.max(0, U.toNum(document.getElementById('qe-points').value, 0)),
                    time: Math.max(0, Math.min(600, U.toInt(document.getElementById('qe-time').value, 0))),
                    category: U.norm(document.getElementById('qe-cat').value),
                    explain: U.norm(document.getElementById('qe-explain').value),
                };
                if (t === 'mc') {
                    const ch = U.$$('[data-ch]', pop).map((i) => U.norm(i.value));
                    if (ch.length < 2 || ch.some((c) => !c)) { Swal.showValidationMessage('กรอกตัวเลือกให้ครบทุกช่อง (2–4 ตัวเลือก) หรือกดลบช่องที่ไม่ใช้'); return false; }
                    if (new Set(ch).size !== ch.length) { Swal.showValidationMessage('มีตัวเลือกซ้ำกัน'); return false; }
                    const a = pop.querySelector('input[name="qe-ans"]:checked');
                    out.choices = ch;
                    out.answer = a ? +a.value : 0;
                } else {
                    const a = U.norm(document.getElementById('qe-answer').value);
                    if (!a) { Swal.showValidationMessage('กรุณาใส่เฉลย'); return false; }
                    out.choices = [];
                    out.answer = a;
                }
                return out;
            },
        });
        if (!r.isConfirmed) return;
        if (pendingImg) {
            const nid = U.uid('img');
            Img.put(nid, pendingImg);
            image = nid;
        }
        const nx = Object.assign(x, r.value, { image });
        if (orig) Object.assign(orig, nx);
        else s.questions.push(nx);
        touch(s);
        U.toast(orig ? 'บันทึกคำถามแล้ว' : 'เพิ่มคำถามแล้ว', { type: 'ok', ms: 1800 });
    }

    window.Views.set = { render, refresh() { render(document.getElementById('view'), App.params); }, editQuestion };
})();
