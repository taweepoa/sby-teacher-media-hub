/* ชุดคำถาม: รายการ + สร้างชุดใหม่ + นำเข้าจาก Excel / ไฟล์ชุด .json + แบ่งปันชุด */
(function () {
    'use strict';
    const esc = U.esc;
    let root = null;
    let filter = '';

    function card(s) {
        const n = { mc: 0, tf: 0, fill: 0 };
        s.questions.forEach((q) => { n[q.type] += 1; });
        const img = s.questions.filter((q) => q.img).length;
        return `<div class="set-card" style="--c:${esc(s.color)}">
            <a class="set-cover" href="#/set?id=${esc(s.id)}">
                <span class="sc-ic">${UI.setIcon(s, 'lg')}</span>
                <span class="sc-q">${esc((s.questions[0] && s.questions[0].q) || 'ยังไม่มีคำถาม')}</span>
                <span class="set-count">${s.questions.length} ข้อ</span>
            </a>
            <div class="set-body">
                <div class="set-title"><div><b>${esc(s.name || '(ไม่มีชื่อ)')}</b><small>${esc([s.subject, s.level].filter(Boolean).join(' • ') || '-')}</small></div></div>
                <div class="qt-sum">${['mc', 'tf', 'fill'].filter((t) => n[t]).map((t) => `${UI.qTypeTag(t)}<b>${n[t]}</b>`).join(' ')}${img ? ` <span class="qtype"><i class="fas fa-image"></i>รูป</span><b>${img}</b>` : ''}</div>
                <div class="set-actions">
                    <a class="btn-x primary sm" href="#/set?id=${esc(s.id)}"><i class="fas fa-pen"></i> แก้ไข</a>
                    <a class="btn-x green sm${s.questions.length ? '' : ' disabled'}" href="#/play?new=1&set=${esc(s.id)}"><i class="fas fa-play"></i> เล่น</a>
                    <a class="btn-x ghost sm" href="#/print?tab=cards&set=${esc(s.id)}"><i class="fas fa-print"></i> การ์ด</a>
                    <button type="button" class="icon-btn" data-export="${esc(s.id)}" title="ส่งออกชุดนี้ (.json) เพื่อแบ่งปัน"><i class="fas fa-share-from-square"></i></button>
                    <button type="button" class="icon-btn" data-dup="${esc(s.id)}" title="ทำสำเนา"><i class="fas fa-copy"></i></button>
                    <button type="button" class="icon-btn del" data-del="${esc(s.id)}" title="ลบชุดคำถาม"><i class="fas fa-trash-can"></i></button>
                </div>
            </div>
        </div>`;
    }

    function render(el) {
        root = el;
        const d = Store.data;
        const subjects = [...new Set(d.sets.map((s) => s.subject).filter(Boolean))];
        const list = d.sets.filter((s) => !filter || s.subject === filter);
        el.innerHTML = `
            ${U.hero({ icon: 'fa-layer-group', title: 'ชุดคำถาม', sub: `ปรนัย / ถูก-ผิด / เติมคำ ใส่รูปได้ • ทั้งหมด ${d.sets.length} ชุด ${UI.fmt(Store.questionCount())} ข้อ`, side: '<button type="button" class="btn-x cta lg" data-act="new"><i class="fas fa-plus"></i> สร้างชุดใหม่</button>' })}
            <div class="toolbar">
                <div class="seg filter-seg"><button type="button" class="${filter ? '' : 'active'}" data-filter="">ทุกวิชา</button>${subjects.map((s) => `<button type="button" class="${filter === s ? 'active' : ''}" data-filter="${esc(s)}">${esc(s)}</button>`).join('')}</div>
                <div class="grow"></div>
                <button type="button" class="btn-x green" data-act="excel" data-demo-lock="นำเข้าคำถามจาก Excel"><i class="fas fa-file-excel"></i> นำเข้าจาก Excel</button>
                <button type="button" class="btn-x ghost" data-act="template"><i class="fas fa-file-arrow-down"></i> แม่แบบ Excel</button>
                <button type="button" class="btn-x ghost" data-act="import" data-demo-lock="นำเข้าชุดคำถาม (.json)"><i class="fas fa-file-import"></i> นำเข้าชุด (.json)</button>
            </div>
            ${list.length ? `<div class="set-grid">${list.map(card).join('')}</div>` : UI.empty('fa-layer-group', 'ยังไม่มีชุดคำถาม', 'สร้างชุดใหม่ นำเข้าจาก Excel หรือโหลดข้อมูลตัวอย่าง 6 วิชาที่หน้า "สำรอง / เปิดไฟล์ข้อมูล"', '<button type="button" class="btn-x primary" data-act="new"><i class="fas fa-plus"></i> สร้างชุดใหม่</button>')}`;
    }

    async function newSet(preset) {
        const s = Object.assign(Store.newSet(), preset || {});
        const r = await UI.sheet({
            title: 'สร้างชุดคำถามใหม่', icon: 'fa-layer-group', confirmText: '<i class="fas fa-check"></i> สร้างชุด',
            body: `<div class="row g-2">
                <div class="col-12"><label class="form-label">ชื่อชุดคำถาม</label><input class="form-control" id="ns-name" value="${esc(s.name)}" placeholder="เช่น ทบทวนบทที่ 3 ..."></div>
                <div class="col-md-6"><label class="form-label">วิชา</label><select class="form-select" id="ns-subject">${UI.subjectOptions(s.subject)}</select></div>
                <div class="col-md-6"><label class="form-label">ระดับชั้น</label><select class="form-select" id="ns-level">${U.options(Store.LEVELS, s.level, { placeholder: '— เลือก —' })}</select></div>
            </div>`,
            preConfirm: () => {
                const p = Swal.getPopup();
                const name = p.querySelector('#ns-name').value.trim();
                const subject = p.querySelector('#ns-subject').value;
                if (!name && !subject) { Swal.showValidationMessage('กรุณาใส่ชื่อชุดหรือเลือกวิชา'); return false; }
                return { name, subject, level: p.querySelector('#ns-level').value };
            },
        });
        if (!r.isConfirmed) return null;
        const sub = Store.subjectOf(r.value.subject);
        Object.assign(s, r.value, { name: r.value.name || `ชุดคำถาม${r.value.subject}` });
        if (sub) Object.assign(s, { color: sub.color, icon: sub.icon });
        Store.data.sets.push(s);
        Store.commit('sets');
        return s;
    }

    async function importExcel() {
        if (!VSDemo.allow('นำเข้าคำถามจาก Excel')) return;
        const file = await U.pickFile('.xlsx,.xls,.csv');
        if (!file) return;
        let res;
        try { res = Excel.parseWorkbook(XLSX, await U.readFileAsArrayBuffer(file)); } catch (e) { U.alert('อ่านไฟล์ไม่สำเร็จ', esc(e.message), 'error'); return; }
        if (!res.questions.length) { U.alert('ไม่พบคำถามในไฟล์', `ตรวจรูปแบบตามไฟล์แม่แบบ (ประเภท | คำถาม | ตัวเลือก ก–ง | เฉลย | คำอธิบาย)${res.errors.length ? `<br><small>${res.errors.slice(0, 5).map((x) => `แถว ${x.row}: ${esc(x.msg)}`).join('<br>')}</small>` : ''}`, 'warning'); return; }
        const s = await newSet({ name: file.name.replace(/\.[^.]+$/, '') });
        if (!s) return;
        s.questions = Store.normQuestions(res.questions);
        Store.commit('sets');
        U.alert('นำเข้าคำถามแล้ว', `เพิ่ม <b>${res.questions.length}</b> ข้อ ลงชุด "${esc(s.name)}"${res.errors.length ? `<div class="note warn mt-2 text-start"><i class="fas fa-triangle-exclamation"></i><div>ข้ามแถวที่ไม่ถูกต้อง ${res.errors.length} แถว<br><small>${res.errors.slice(0, 6).map((x) => `แถว ${x.row}: ${esc(x.msg)}`).join('<br>')}</small></div></div>` : ''}`, 'success');
        App.go('set', { id: s.id });
    }

    async function onClick(e) {
        const b = e.target.closest('[data-act], [data-filter], [data-export], [data-dup], [data-del]');
        if (!b) return;
        if (b.dataset.filter != null) { filter = b.dataset.filter; render(root); return; }
        if (b.dataset.export) {
            const s = Store.set(b.dataset.export);
            const name = await Store.saveText(Store.exportSetText([s.id]), `${U.safeFileName(`ชุดคำถาม_${s.name}`)}.json`, 'ไฟล์ชุดคำถาม (.json)');
            if (name) U.toast(`ส่งออกชุดคำถามแล้ว: <b>${esc(name)}</b> — ส่งให้ครูท่านอื่นนำเข้าได้`, { type: 'ok', ms: 5000 });
            return;
        }
        if (b.dataset.dup) {
            const src = Store.set(b.dataset.dup);
            const c = Store.parseSetFile(Store.exportSetText([src.id])).sets[0];
            c.name = `${src.name} (สำเนา)`;
            Store.addSets([c]);
            U.toast('ทำสำเนาชุดคำถามแล้ว', { type: 'ok' });
            return;
        }
        if (b.dataset.del) {
            const s = Store.set(b.dataset.del);
            if (!(await U.confirm('ลบชุดคำถามนี้?', `<b>${esc(s.name)}</b> (${s.questions.length} ข้อ)<br><small>ผลการแข่งขันที่เล่นไปแล้วยังอยู่ครบ</small>`, { danger: true, confirmText: '<i class="fas fa-trash-can"></i> ลบชุดคำถาม' }))) return;
            Store.data.sets = Store.data.sets.filter((x) => x.id !== s.id);
            Store.commit('sets');
            U.toast('ลบชุดคำถามแล้ว', { type: 'ok' });
            return;
        }
        const a = b.dataset.act;
        if (a === 'new') { const s = await newSet(); if (s) App.go('set', { id: s.id }); }
        else if (a === 'excel') importExcel();
        else if (a === 'template') { XLSX.writeFile(Excel.makeBook(XLSX, Excel.SAMPLE), 'แม่แบบคำถาม_เกมบันไดงู.xlsx'); U.toast('ดาวน์โหลดไฟล์แม่แบบแล้ว — กรอกคำถามแล้วกด "นำเข้าจาก Excel"', { type: 'ok', ms: 5000 }); }
        else if (a === 'import') {
            if (!VSDemo.allow('นำเข้าชุดคำถาม (.json)')) return;
            const file = await U.pickFile('.json,application/json');
            if (!file) return;
            const res = Store.parseSetFile(await U.readFileAsText(file));
            if (!res.ok) { U.alert('นำเข้าไม่ได้', esc(res.error), 'error'); return; }
            Store.addSets(res.sets);
            U.toast(`นำเข้า ${res.sets.length} ชุด (${res.sets.reduce((x, s) => x + s.questions.length, 0)} ข้อ) แล้ว`, { type: 'ok' });
        }
    }

    window.Views.library = {
        render(el) { render(el); el.onclick = onClick; },
        refresh() { if (root) render(root); },
        newSet, importExcel,
    };
})();
