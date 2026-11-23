/* =====================================================================
   แก้ไขชุดคำถาม (set?id=): ข้อมูลชุด + คำถามทีละข้อ (ปรนัย/ถูกผิด/เติมคำ + รูป)
   บันทึกอัตโนมัติทุกครั้งที่พิมพ์ • วางจาก Excel / นำเข้าไฟล์ Excel เพิ่มต่อท้ายชุด
   ===================================================================== */
(function () {
    'use strict';
    const esc = U.esc;
    let root = null;
    let set = null;
    const COLORS = ['#44a016', '#2563eb', '#db2777', '#0891b2', '#7c3aed', '#b45309', '#16a34a', '#e11d48', '#ea580c', '#ca8a04'];

    function qCard(q, i) {
        const body = q.type === 'mc'
            ? `<div class="q-choices">${q.choices.map((c, k) => `<label class="q-choice${q.answer === k ? ' right' : ''}"><input type="radio" name="ans-${esc(q.id)}" data-f="answer" value="${k}" ${q.answer === k ? 'checked' : ''} title="เลือกเป็นคำตอบที่ถูก"><b>${Engine.CHOICE_LABELS[k]}</b><input class="form-control form-control-sm" data-f="choice" data-k="${k}" value="${esc(c)}" placeholder="ตัวเลือก ${Engine.CHOICE_LABELS[k]}"></label>`).join('')}</div><small class="muted"><i class="fas fa-circle-dot"></i> กดวงกลมหน้าตัวเลือกที่เป็นคำตอบถูก</small>`
            : q.type === 'tf'
                ? `<div class="seg q-tf"><button type="button" class="${q.answer ? 'active' : ''}" data-tf="1"><i class="fas fa-check"></i> ถูก</button><button type="button" class="${q.answer ? '' : 'active'}" data-tf="0"><i class="fas fa-xmark"></i> ผิด</button></div>`
                : `<input class="form-control" data-f="fill" value="${esc(q.answer)}" placeholder="คำตอบ (หลายแบบคั่นด้วย / เช่น 60/หกสิบ)"><small class="muted">ระบบตรวจให้อัตโนมัติ (ไม่สนช่องว่าง/ตัวพิมพ์เล็กใหญ่) ครูเปลี่ยนผลได้ตอนเล่น</small>`;
        return `<div class="q-card" data-q="${esc(q.id)}">
            <div class="q-head"><span class="q-no">${i + 1}</span>
                <div class="seg q-type">${Object.entries(Engine.QTYPES).map(([k, v]) => `<button type="button" class="${q.type === k ? 'active' : ''}" data-type="${k}"><i class="fas ${v.icon}"></i><span>${v.short}</span></button>`).join('')}</div>
                <div class="grow"></div>
                <button type="button" class="icon-btn" data-move="-1" title="เลื่อนขึ้น" ${i === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                <button type="button" class="icon-btn" data-move="1" title="เลื่อนลง" ${i === set.questions.length - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                <button type="button" class="icon-btn" data-copy title="ทำสำเนาข้อนี้"><i class="fas fa-copy"></i></button>
                <button type="button" class="icon-btn del" data-del title="ลบข้อนี้"><i class="fas fa-trash-can"></i></button>
            </div>
            <div class="q-main">
                <button type="button" class="q-img${q.img ? ' has' : ''}" data-img title="${q.img ? 'เปลี่ยนรูป' : 'เพิ่มรูปประกอบ'}">${q.img ? `<img src="${esc(q.img)}" alt="">` : '<i class="fas fa-image"></i><span>เพิ่มรูป</span>'}</button>
                <div class="q-fields">
                    <textarea class="form-control q-text" data-f="q" rows="2" placeholder="พิมพ์คำถาม">${esc(q.q)}</textarea>
                    ${q.q ? '' : `<div class="chips">${UI.PRESET.stems.map((s) => `<button type="button" class="chip" data-stem="${esc(s)}">${esc(s)}</button>`).join('')}</div>`}
                    ${body}
                    <input class="form-control form-control-sm mt-2" data-f="explain" value="${esc(q.explain)}" placeholder="คำอธิบายเฉลย (ไม่บังคับ — แสดงหลังตอบ)">
                    ${q.img ? '<button type="button" class="btn-x ghost sm mt-2" data-img-rm data-demo-allow><i class="fas fa-image"></i> เอารูปออก</button>' : ''}
                </div>
            </div>
        </div>`;
    }

    function render(el) {
        const s = set;
        el.innerHTML = `
            <div class="toolbar"><a class="btn-x ghost sm" href="#/library"><i class="fas fa-arrow-left"></i> ชุดคำถามทั้งหมด</a><div class="grow"></div>
                <a class="btn-x ghost sm" href="#/print?tab=cards&set=${esc(s.id)}"><i class="fas fa-print"></i> พิมพ์การ์ด</a>
                <a class="btn-x green sm" href="#/play?new=1&set=${esc(s.id)}"><i class="fas fa-play"></i> เล่นชุดนี้</a></div>
            <section class="panel panel--green">
                <div class="panel-head"><span class="ic-box sm" style="--a:${esc(s.color)};--b:color-mix(in srgb, ${esc(s.color)} 55%, #fff)"><i class="fas ${esc(s.icon)}"></i></span><div><h3>ข้อมูลชุดคำถาม</h3><small>บันทึกอัตโนมัติ</small></div></div>
                <div class="panel-body"><div class="row g-3">
                    <div class="col-lg-5"><label class="form-label">ชื่อชุด</label><input class="form-control" data-s="name" value="${esc(s.name)}"></div>
                    <div class="col-lg-3 col-sm-6"><label class="form-label">วิชา</label><select class="form-select" data-s="subject">${UI.subjectOptions(s.subject)}</select></div>
                    <div class="col-lg-2 col-sm-6"><label class="form-label">ระดับชั้น</label><select class="form-select" data-s="level">${U.options(Store.LEVELS, s.level, { placeholder: '— เลือก —' })}</select></div>
                    <div class="col-lg-2"><label class="form-label">สีการ์ด</label><div class="color-row">${COLORS.map((c) => `<button type="button" class="color-dot${s.color === c ? ' on' : ''}" style="--c:${c}" data-color="${c}" aria-label="สี ${c}"></button>`).join('')}</div></div>
                    <div class="col-12"><label class="form-label">คำอธิบายชุด</label><input class="form-control" data-s="desc" value="${esc(s.desc)}" placeholder="เช่น ทบทวนหน่วยที่ 2 เรื่อง ..."></div>
                </div></div>
            </section>
            <section class="panel panel--orange">
                <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-paste"></i></span><div><h3>เพิ่มหลายข้อพร้อมกัน</h3><small>วางจาก Excel (ประเภท | คำถาม | ก | ข | ค | ง | เฉลย | คำอธิบาย) หรือแบบย่อ คำถาม | คำตอบ</small></div></div>
                <div class="panel-body">
                    <textarea class="form-control mb-2" id="ed-paste" rows="3" placeholder="ตัวอย่าง (คั่นด้วยแท็บจาก Excel หรือเครื่องหมาย |)&#10;ปรนัย | 8 × 7 = ? | 54 | 56 | 58 | 64 | ข&#10;ถูกผิด | โลกหมุนรอบดวงอาทิตย์ | | | | | ถูก&#10;เมืองหลวงของไทยคือ | กรุงเทพมหานคร/กรุงเทพฯ"></textarea>
                    <div class="d-flex gap-2 flex-wrap">
                        <button type="button" class="btn-x orange" data-act="paste" data-demo-lock="วางคำถามจำนวนมาก"><i class="fas fa-paste"></i> เพิ่มจากที่วาง</button>
                        <button type="button" class="btn-x green" data-act="excel" data-demo-lock="นำเข้าคำถามจาก Excel"><i class="fas fa-file-excel"></i> นำเข้าไฟล์ Excel</button>
                        <button type="button" class="btn-x ghost" data-act="export-xlsx"><i class="fas fa-file-export"></i> ส่งออกชุดนี้เป็น Excel</button>
                        <button type="button" class="btn-x ghost" data-act="docx"><i class="fas fa-file-word"></i> ชุดคำถามพร้อมเฉลย (.docx)</button>
                    </div>
                </div>
            </section>
            <div class="q-head-row"><h3><i class="fas fa-list-ol"></i> คำถาม ${s.questions.length} ข้อ</h3></div>
            <div class="q-list">${s.questions.map(qCard).join('') || UI.empty('fa-circle-question', 'ยังไม่มีคำถาม', 'กดปุ่มด้านล่างเพื่อเพิ่มคำถามทีละข้อ หรือวางจาก Excel')}</div>
            <div class="add-bar">
                <span>เพิ่มคำถาม:</span>
                ${Object.entries(Engine.QTYPES).map(([k, v]) => `<button type="button" class="btn-x ${k === 'mc' ? 'primary' : k === 'tf' ? 'green' : 'orange'}" data-add="${k}"><i class="fas ${v.icon}"></i> ${v.label}</button>`).join('')}
            </div>`;
    }

    const qOf = (el) => { const c = el.closest('[data-q]'); return c ? set.questions.find((q) => q.id === c.dataset.q) : null; };
    function touch(reason) { set.updatedAt = new Date().toISOString(); Store.commit(reason || 'set-edit'); }
    function rerender(focusQ) {
        const y = window.scrollY;
        render(root);
        window.scrollTo(0, y);
        if (focusQ) { const t = root.querySelector(`[data-q="${focusQ}"] .q-text`); if (t) { t.scrollIntoView({ block: 'center' }); t.focus(); } }
    }

    async function addMany(list, errors) {
        set.questions.push(...Store.normQuestions(list));
        touch();
        rerender();
        U.toast(`เพิ่ม ${list.length} ข้อแล้ว${errors.length ? ` (ข้าม ${errors.length} แถวที่ไม่ถูกต้อง: ${errors.slice(0, 3).map((x) => `แถว ${x.row} ${esc(x.msg)}`).join(', ')})` : ''}`, { type: errors.length ? 'warn' : 'ok', ms: 6000 });
    }

    async function onClick(e) {
        const t = e.target;
        const b = t.closest('button');
        if (!b) return;
        const q = qOf(b);
        if (b.dataset.color) { set.color = b.dataset.color; touch(); rerender(); return; }
        if (b.dataset.add) { const nq = Store.newQuestion(b.dataset.add); set.questions.push(nq); touch(); rerender(nq.id); return; }
        if (q && b.dataset.type) {
            const type = b.dataset.type;
            if (type === q.type) return;
            q.type = type;
            if (type === 'mc') { q.choices = q.choices && q.choices.length === 4 ? q.choices : ['', '', '', '']; q.answer = 0; } else if (type === 'tf') { q.answer = true; } else { q.answer = typeof q.answer === 'string' ? q.answer : ''; }
            touch(); rerender(); return;
        }
        if (q && b.dataset.tf) { q.answer = b.dataset.tf === '1'; touch(); rerender(); return; }
        if (q && b.dataset.stem) { q.q = b.dataset.stem; touch(); rerender(q.id); return; }
        if (q && b.dataset.move) {
            const i = set.questions.indexOf(q);
            const j = i + Number(b.dataset.move);
            if (j < 0 || j >= set.questions.length) return;
            [set.questions[i], set.questions[j]] = [set.questions[j], set.questions[i]];
            touch(); rerender(); return;
        }
        if (q && b.hasAttribute('data-copy')) { const c = Store.normQuestions([q])[0]; set.questions.splice(set.questions.indexOf(q) + 1, 0, c); touch(); rerender(); return; }
        if (q && b.hasAttribute('data-del')) {
            if (!(await U.confirm('ลบคำถามข้อนี้?', esc(q.q || '(ยังไม่มีข้อความ)'), { danger: true, confirmText: '<i class="fas fa-trash-can"></i> ลบคำถาม' }))) return;
            set.questions = set.questions.filter((x) => x !== q);
            touch(); rerender(); return;
        }
        if (q && b.hasAttribute('data-img-rm')) { q.img = ''; touch(); rerender(); return; }
        if (q && b.hasAttribute('data-img')) {
            const file = await U.pickFile('image/*');
            if (!file) return;
            try { q.img = (await Store.thumbFromFile(file)).src; touch(); rerender(); } catch (err) { U.alert('ใส่รูปไม่ได้', esc(err.message), 'error'); }
            return;
        }
        const a = b.dataset.act;
        if (a === 'paste') {
            if (!VSDemo.allow('วางคำถามจำนวนมาก')) return;
            const txt = root.querySelector('#ed-paste').value;
            const res = Excel.parseText(txt);
            if (!res.questions.length) { U.alert('ไม่พบคำถามที่ใช้ได้', res.errors.length ? res.errors.slice(0, 5).map((x) => `แถว ${x.row}: ${esc(x.msg)}`).join('<br>') : 'วางข้อมูลจาก Excel หรือพิมพ์คั่นด้วย | ก่อน', 'warning'); return; }
            addMany(res.questions, res.errors);
        } else if (a === 'excel') {
            if (!VSDemo.allow('นำเข้าคำถามจาก Excel')) return;
            const file = await U.pickFile('.xlsx,.xls,.csv');
            if (!file) return;
            try { const res = Excel.parseWorkbook(XLSX, await U.readFileAsArrayBuffer(file)); if (!res.questions.length) { U.alert('ไม่พบคำถามในไฟล์', 'ตรวจรูปแบบตามไฟล์แม่แบบ', 'warning'); return; } addMany(res.questions, res.errors); } catch (err) { U.alert('อ่านไฟล์ไม่สำเร็จ', esc(err.message), 'error'); }
        } else if (a === 'export-xlsx') {
            XLSX.writeFile(Excel.makeBook(XLSX, Excel.rowsOf(set.questions, Engine.CHOICE_LABELS)), `${U.safeFileName(`คำถาม_${set.name}`)}.xlsx`);
        } else if (a === 'docx') {
            try {
                await ThaiDoc.download(Docs.setSections(ThaiDoc, set, Store.data.school), `${U.safeFileName(`ชุดคำถามพร้อมเฉลย_${set.name}`)}.docx`, { title: 'ชุดคำถามพร้อมเฉลย' });
                U.toast('ดาวน์โหลดชุดคำถามพร้อมเฉลย (.docx) แล้ว', { type: 'ok' });
            } catch (err) { console.error(err); U.alert('สร้างไฟล์ไม่สำเร็จ', esc(err.message), 'error'); }
        }
    }

    function onInput(e) {
        const t = e.target;
        if (t.dataset.s) {
            set[t.dataset.s] = t.value;
            if (t.dataset.s === 'subject') { const sub = Store.subjectOf(t.value); if (sub) { set.icon = sub.icon; } }
            touch();
            return;
        }
        const q = qOf(t);
        if (!q || !t.dataset.f) return;
        const f = t.dataset.f;
        if (f === 'q') q.q = t.value;
        else if (f === 'explain') q.explain = t.value;
        else if (f === 'choice') q.choices[Number(t.dataset.k)] = t.value;
        else if (f === 'fill') q.answer = t.value;
        else if (f === 'answer') { q.answer = Number(t.value); t.closest('.q-choices').querySelectorAll('.q-choice').forEach((l, k) => l.classList.toggle('right', k === q.answer)); }
        touch();
    }

    window.Views.set = {
        render(el, params) {
            root = el;
            set = Store.set(params && params.id);
            if (!set) { el.innerHTML = UI.empty('fa-circle-question', 'ไม่พบชุดคำถามนี้', '', '<a class="btn-x primary" href="#/library">ชุดคำถามทั้งหมด</a>'); return; }
            render(el);
            el.onclick = onClick;
            el.oninput = onInput;
            el.onchange = (e) => { if (e.target.dataset.s === 'subject') rerender(); };
        },
        refresh(reason) { if (reason === 'replace' && root) App.render(); },
    };
})();
