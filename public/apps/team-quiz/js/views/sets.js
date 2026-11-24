/* คลังคำถาม: รายการชุดคำถาม + สร้าง/ทำสำเนา/ลบ + เพิ่มชุดตัวอย่าง */
(function () {
    'use strict';
    const esc = U.esc;
    let filter = '';

    function card(s) {
        const mc = s.questions.filter((q) => q.type === 'mc').length;
        const cats = new Set(s.questions.map((q) => q.category).filter(Boolean)).size;
        const img = s.questions.filter((q) => q.image).length;
        return `<div class="set-card" style="--c:${esc(s.color)}">
            <a class="sc-main" href="#/set?id=${encodeURIComponent(s.id)}">
                ${UI.setIcon(s, 'lg')}
                <div class="min-w-0"><b>${esc(s.name || 'ชุดคำถามไม่มีชื่อ')}</b><small>${esc([s.subject, s.level].filter(Boolean).join(' • ') || 'ยังไม่ระบุวิชา')}</small></div>
            </a>
            ${s.desc ? `<p class="sc-desc">${esc(s.desc)}</p>` : ''}
            <div class="mini-stats">
                <span class="kv"><b>${s.questions.length}</b> ข้อ</span>
                <span class="kv">เลือกตอบ <b>${mc}</b></span>
                ${s.questions.length - mc ? `<span class="kv">เขียนตอบ <b>${s.questions.length - mc}</b></span>` : ''}
                ${img ? `<span class="kv"><i class="fas fa-image"></i><b>${img}</b></span>` : ''}
                ${cats >= 2 ? `<span class="kv"><i class="fas fa-table-cells"></i>Jeopardy <b>${cats}</b> หมวด</span>` : ''}
            </div>
            <div class="sc-acts">
                <a class="btn-x primary sm" href="#/setup?set=${encodeURIComponent(s.id)}"><i class="fas fa-play"></i>เล่น</a>
                <a class="btn-x ghost sm" href="#/set?id=${encodeURIComponent(s.id)}"><i class="fas fa-pen"></i>แก้ไข</a>
                <button type="button" class="icon-btn" data-copy="${esc(s.id)}" title="ทำสำเนา"><i class="fas fa-copy"></i></button>
                <button type="button" class="icon-btn" data-xlsx="${esc(s.id)}" title="ส่งออก Excel"><i class="fas fa-file-excel"></i></button>
                <button type="button" class="icon-btn del" data-del="${esc(s.id)}" title="ลบชุดคำถาม"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }

    function render(el) {
        const d = Store.data;
        const f = U.normKey(filter);
        const list = d.sets.filter((s) => !f || U.normKey(`${s.name}${s.subject}${s.level}${s.desc}`).includes(f));
        el.innerHTML = `
            ${U.hero({ icon: 'fa-layer-group', title: 'คลังคำถาม', sub: `ชุดคำถาม ${d.sets.length} ชุด • คำถามทั้งหมด ${UI.fmt(Store.questionCount())} ข้อ — แก้ไขได้ทุกข้อ ใส่รูปได้ นำเข้าจาก Excel ได้`, side: '<a class="hero-btn ghost" href="#/import"><i class="fas fa-file-excel"></i>นำเข้าจาก Excel</a><button type="button" class="btn-x cta" id="st-new"><i class="fas fa-plus"></i>สร้างชุดคำถามใหม่</button>' })}
            <div class="page-tools">
                <div class="search-box"><i class="fas fa-magnifying-glass"></i><input class="form-control" id="st-q" placeholder="ค้นหาชุดคำถาม / วิชา / ระดับชั้น" value="${esc(filter)}" aria-label="ค้นหาชุดคำถาม"></div>
                <button type="button" class="btn-x ghost" id="st-demo"><i class="fas fa-flask"></i>เพิ่มชุดคำถามตัวอย่าง 7 วิชา</button>
            </div>
            ${list.length ? `<div class="set-grid">${list.map(card).join('')}</div>`
                : `<div class="panel"><div class="panel-body">${d.sets.length ? UI.empty('fa-magnifying-glass', 'ไม่พบชุดคำถามที่ค้นหา', 'ลองพิมพ์คำอื่น') : UI.empty('fa-layer-group', 'ยังไม่มีชุดคำถาม', 'สร้างชุดใหม่แล้วพิมพ์คำถามเอง นำเข้าจาก Excel หรือเพิ่มชุดตัวอย่าง (วิทย์ คณิต ไทย สังคม อังกฤษ คอมพิวเตอร์ และ Jeopardy)', '<button type="button" class="btn-x primary" id="st-demo2"><i class="fas fa-flask"></i>เพิ่มชุดคำถามตัวอย่าง</button>')}</div></div>`}`;
        el.querySelector('#st-new').onclick = () => newSet();
        el.querySelector('#st-demo').onclick = addDemo;
        const d2 = el.querySelector('#st-demo2');
        if (d2) d2.onclick = addDemo;
        const q = el.querySelector('#st-q');
        q.oninput = U.debounce(() => { filter = q.value; render(el); const n = el.querySelector('#st-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250);
        el.querySelectorAll('[data-copy]').forEach((b) => { b.onclick = () => copySet(b.dataset.copy); });
        el.querySelectorAll('[data-xlsx]').forEach((b) => { b.onclick = () => { QIO.exportSet(Store.set(b.dataset.xlsx)); U.toast('ส่งออกไฟล์ Excel แล้ว', { type: 'ok' }); }; });
        el.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => removeSet(b.dataset.del); });
    }

    /* ฟอร์มข้อมูลชุดคำถาม (ใช้ทั้งสร้างใหม่และแก้ไข) */
    async function setForm(s, title) {
        const r = await UI.sheet({
            title, icon: 'fa-layer-group', width: 640,
            body: `<label class="form-label">ชื่อชุดคำถาม <span class="text-danger">*</span></label><input class="form-control mb-2" id="sf-name" value="${esc(s.name)}" maxlength="80" placeholder="เช่น ตอบปัญหาวิทยาศาสตร์ ม.ต้น">
                <div class="row g-2"><div class="col-sm-7"><label class="form-label">วิชา</label><select class="form-select" id="sf-subject">${UI.subjectOptions(s.subject)}</select></div>
                <div class="col-sm-5"><label class="form-label">ระดับชั้น</label><input class="form-control" id="sf-level" value="${esc(s.level)}" placeholder="เช่น ม.1–ม.3"></div></div>
                <label class="form-label mt-2">คำอธิบายสั้น ๆ</label><input class="form-control" id="sf-desc" value="${esc(s.desc)}" maxlength="140">`,
            preConfirm: () => {
                const name = U.norm(document.getElementById('sf-name').value);
                if (!name) { Swal.showValidationMessage('กรุณาใส่ชื่อชุดคำถาม'); return false; }
                return { name, subject: document.getElementById('sf-subject').value, level: U.norm(document.getElementById('sf-level').value), desc: U.norm(document.getElementById('sf-desc').value) };
            },
        });
        if (!r.isConfirmed) return null;
        const sub = Store.subjectOf(r.value.subject);
        return Object.assign(r.value, sub ? { color: sub.color, icon: sub.icon } : {});
    }

    async function newSet() {
        const s = Store.newSet();
        const v = await setForm(s, 'สร้างชุดคำถามใหม่');
        if (!v) return;
        Object.assign(s, v);
        Store.data.sets.unshift(s);
        Store.commit('sets', { normalize: true });
        U.toast('สร้างชุดคำถามแล้ว — เพิ่มคำถามได้เลย', { type: 'ok' });
        App.go('set', { id: s.id });
    }

    function copySet(id) {
        const s = Store.set(id);
        const c = Engine.clone(s);
        c.id = U.uid('set');
        c.name = `${s.name} (สำเนา)`;
        c.questions.forEach((q) => { q.id = U.uid('q'); });
        Store.data.sets.splice(Store.data.sets.indexOf(s) + 1, 0, c);
        Store.commit('sets', { normalize: true });
        U.toast('ทำสำเนาชุดคำถามแล้ว', { type: 'ok' });
    }

    async function removeSet(id) {
        const s = Store.set(id);
        const ok = await U.confirm('ลบชุดคำถามนี้?', `<b>${esc(s.name)}</b> (${s.questions.length} ข้อ)<br>ผลการแข่งขันที่เคยใช้ชุดนี้ยังอยู่ครบ`, { confirmText: 'ลบ', danger: true });
        if (!ok) return;
        Store.data.sets = Store.data.sets.filter((x) => x.id !== id);
        const used = Store.imageIds();
        s.questions.forEach((q) => { if (q.image && !used.has(q.image)) Img.del(q.image); });
        Store.commit('sets');
        U.toast('ลบชุดคำถามแล้ว', { type: 'ok' });
    }

    async function addDemo() {
        await Img.init();
        const demo = Demo.build();
        const imgs = DemoImages.all();
        const have = new Set(Store.data.sets.map((s) => s.id));
        const add = demo.sets.filter((s) => !have.has(s.id));
        if (!add.length) { U.toast('มีชุดคำถามตัวอย่างครบแล้ว', { type: 'warn' }); return; }
        Object.keys(imgs).forEach((k) => Img.put(k, imgs[k]));
        Store.data.sets.push(...add);
        Store.commit('sets', { normalize: true });
        U.toast(`เพิ่มชุดคำถามตัวอย่าง ${add.length} ชุดแล้ว`, { type: 'ok' });
    }

    window.Views.sets = { render, refresh() { render(document.getElementById('view')); }, setForm };
})();
