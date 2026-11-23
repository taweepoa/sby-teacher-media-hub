/* ชุดเนื้อหา: การ์ดชุด + สร้าง/ทำสำเนา/ลบ + นำเข้า/ส่งออกชุด .json */
(function () {
    'use strict';
    const esc = U.esc;
    let root = null;
    let filter = '';

    function render(el) {
        root = el;
        const d = Store.data;
        const subjects = [...new Set(d.sets.map((s) => s.subject).filter(Boolean))];
        if (filter && !subjects.includes(filter)) filter = '';
        const list = d.sets.filter((s) => !filter || s.subject === filter);
        el.innerHTML = `
            ${U.hero({ icon: 'fa-layer-group', title: 'เลือกชุดเนื้อหา', sub: 'ชุดเนื้อหา 1 ชุด = คู่การ์ดหลายคู่ (คำ–ความหมาย / ภาพ–คำ / โจทย์–คำตอบ) ใช้ได้กับทุกรูปแบบเกมและพิมพ์เป็นการ์ดกระดาษได้', side: `<span class="hero-stat"><i class="fas fa-layer-group"></i><b>${d.sets.length}</b> ชุด</span><span class="hero-stat"><i class="fas fa-clone"></i><b>${Store.pairCount()}</b> คู่</span>` })}
            <div class="toolbar">
                <button type="button" class="btn-x primary" data-act="new"><i class="fas fa-plus"></i> สร้างชุดเนื้อหาใหม่</button>
                <button type="button" class="btn-x ghost" data-act="import" data-demo-lock="นำเข้าชุดเนื้อหา (.json)"><i class="fas fa-file-import"></i> นำเข้าชุด (.json)</button>
                <button type="button" class="btn-x ghost" data-act="export-all" ${d.sets.length ? '' : 'disabled'}><i class="fas fa-file-export"></i> ส่งออกทุกชุด (.json)</button>
                ${subjects.length > 1 ? `<div class="seg ms-auto filter-seg"><button type="button" data-filter="" data-demo-allow class="${filter ? '' : 'active'}">ทุกวิชา</button>${subjects.map((s) => `<button type="button" data-demo-allow data-filter="${esc(s)}" class="${filter === s ? 'active' : ''}">${esc(s)}</button>`).join('')}</div>` : ''}
            </div>
            ${list.length ? `<div class="set-grid">${list.map(card).join('')}</div>` : `<section class="panel"><div class="panel-body">${UI.empty('fa-layer-group', 'ยังไม่มีชุดเนื้อหา', 'กด "สร้างชุดเนื้อหาใหม่" แล้วเพิ่มคู่การ์ด หรือนำเข้าไฟล์ชุด (.json) ที่ได้จากครูท่านอื่น', '<button type="button" class="btn-x primary" data-act="new"><i class="fas fa-plus"></i> สร้างชุดเนื้อหาใหม่</button>')}</div></section>`}
            <div class="note"><i class="fas fa-share-nodes"></i><div>แบ่งปันชุดเนื้อหาให้เพื่อนครู: กด <b>ส่งออก</b> ที่การ์ดชุด จะได้ไฟล์ .json ที่รวมภาพย่อไว้แล้ว เพื่อนครูนำเข้าได้ที่ปุ่ม <b>นำเข้าชุด (.json)</b></div></div>`;
        el.onclick = onClick;
    }

    function card(s) {
        const k = Store.KINDS[s.kind];
        const sample = s.pairs.slice(0, 3);
        return `<article class="set-card" style="--c:${esc(s.color)}">
            <a class="set-cover" href="#/set?id=${esc(s.id)}" title="แก้ไขชุดเนื้อหา">
                ${sample.length ? `<div class="set-pairs">${sample.map((p) => `<span class="sp-row"><span class="sp-a">${UI.face(p, 'a')}</span><i class="fas fa-link"></i><span class="sp-b">${esc(p.b)}</span></span>`).join('')}</div>` : `<div class="set-pairs empty">${UI.setIcon(s, 'lg')}</div>`}
                <span class="set-count"><i class="fas fa-clone"></i> ${s.pairs.length} คู่</span>
            </a>
            <div class="set-body">
                <div class="set-title">${UI.setIcon(s, 'sm')}<div><b>${esc(s.name || '(ไม่มีชื่อชุด)')}</b><small>${esc([s.subject, s.level].filter(Boolean).join(' • ') || 'ยังไม่ระบุวิชา')}</small></div></div>
                <div><span class="tag info"><i class="fas ${k.icon}"></i>${esc(k.label)}</span></div>
                ${s.desc ? `<p class="set-desc">${esc(s.desc)}</p>` : ''}
                <div class="set-actions">
                    <a class="btn-x primary sm" href="#/play?set=${esc(s.id)}" ${s.pairs.length >= 3 ? '' : 'aria-disabled="true" tabindex="-1"'}><i class="fas fa-play"></i> เล่น</a>
                    <a class="btn-x ghost sm" href="#/set?id=${esc(s.id)}"><i class="fas fa-pen"></i> แก้ไข</a>
                    <a class="icon-btn" href="#/print?set=${esc(s.id)}" title="พิมพ์การ์ดเล่นแบบกระดาษ"><i class="fas fa-print"></i></a>
                    <button type="button" class="icon-btn" data-act="export" data-id="${esc(s.id)}" title="ส่งออกชุดนี้เป็นไฟล์ .json"><i class="fas fa-file-export"></i></button>
                    <button type="button" class="icon-btn" data-act="copy" data-id="${esc(s.id)}" title="ทำสำเนา"><i class="fas fa-copy"></i></button>
                    <button type="button" class="icon-btn del" data-act="delete" data-id="${esc(s.id)}" title="ลบชุดเนื้อหา"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </article>`;
    }

    async function onClick(e) {
        const f = e.target.closest('[data-filter]');
        if (f) { filter = f.dataset.filter; render(root); return; }
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const id = b.dataset.id;
        const act = b.dataset.act;
        if (act === 'new') newSet();
        else if (act === 'import') importSets();
        else if (act === 'export-all') exportSets(Store.data.sets.map((s) => s.id), 'ชุดเนื้อหาเกมจับคู่_ทั้งหมด');
        else if (act === 'export') { const s = Store.set(id); exportSets([id], `ชุดเนื้อหาเกมจับคู่_${s.name || 'ไม่มีชื่อ'}`); } else if (act === 'copy') {
            const s = Store.set(id);
            const c = U.clone(s);
            c.id = U.uid('set');
            c.name = `${s.name} (สำเนา)`;
            c.pairs.forEach((q) => { q.id = U.uid('p'); });
            Store.data.sets.splice(Store.data.sets.indexOf(s) + 1, 0, c);
            Store.commit('sets');
            U.toast('ทำสำเนาชุดเนื้อหาแล้ว', { type: 'ok' });
        } else if (act === 'delete') {
            const s = Store.set(id);
            const ok = await U.confirm('ลบชุดเนื้อหานี้?', `ชุด <b>${esc(s.name || '(ไม่มีชื่อ)')}</b> (${s.pairs.length} คู่) จะถูกลบ<br><small>ผลการแข่งขันที่เคยเล่นด้วยชุดนี้ยังอยู่ครบ</small>`, { danger: true, confirmText: '<i class="fas fa-trash"></i> ลบชุดเนื้อหา' });
            if (!ok) return;
            Store.data.sets = Store.data.sets.filter((x) => x.id !== id);
            Store.commit('sets');
            U.toast('ลบชุดเนื้อหาแล้ว', { type: 'ok' });
        }
    }

    async function newSet() {
        const r = await UI.sheet({
            title: 'สร้างชุดเนื้อหาใหม่', icon: 'fa-plus', sub: 'เลือกชนิดคู่การ์ด วิชา และตั้งชื่อ แล้วเพิ่มคู่การ์ดในหน้าถัดไป',
            confirmText: '<i class="fas fa-arrow-right"></i> สร้างแล้วเพิ่มคู่การ์ด',
            body: `
                <div><label class="form-label">ชนิดคู่การ์ด</label><div class="seg seg-wrap" id="ns-kind">${Object.keys(Store.KINDS).map((k, i) => `<button type="button" data-v="${k}" class="${i ? '' : 'active'}"><i class="fas ${Store.KINDS[k].icon}"></i> ${esc(Store.KINDS[k].label)}</button>`).join('')}</div></div>
                <div><label class="form-label">วิชา</label><select class="form-select" id="ns-subject">${UI.subjectOptions('')}</select></div>
                <div><label class="form-label">ชื่อชุดเนื้อหา</label><input class="form-control" id="ns-name" placeholder="เช่น คำศัพท์หมวดผลไม้, สูตรคูณแม่ 2">
                    <div class="sheet-hint">กดเลือกชื่อสำเร็จรูป (แก้ไขต่อได้)</div>${UI.chips('#ns-name', ['คำศัพท์น่ารู้', 'คำศัพท์ภาษาอังกฤษจากภาพ', 'คำราชาศัพท์', 'คำพ้องความหมาย', 'สูตรคูณ', 'จังหวัดและของดี', 'ส่วนประกอบของพืช', 'บุคคลสำคัญและผลงาน'])}</div>
                <div><label class="form-label">ระดับชั้น</label><input class="form-control" id="ns-level" placeholder="เช่น ป.4–ป.6">${UI.chips('#ns-level', Store.LEVELS)}</div>`,
            didOpen: (pop) => {
                UI.bindChips(pop);
                pop.querySelector('#ns-kind').onclick = (e) => { const x = e.target.closest('button'); if (!x) return; pop.querySelectorAll('#ns-kind button').forEach((y) => y.classList.toggle('active', y === x)); };
            },
            preConfirm: () => {
                const name = U.norm(document.getElementById('ns-name').value);
                const subject = document.getElementById('ns-subject').value;
                if (!name) { Swal.showValidationMessage('กรุณาตั้งชื่อชุดเนื้อหา (กดเลือกชื่อสำเร็จรูปได้)'); return false; }
                return { name, subject, kind: document.querySelector('#ns-kind .active').dataset.v, level: U.norm(document.getElementById('ns-level').value) };
            },
        });
        if (!r.isConfirmed) return;
        const s = Object.assign(Store.newSet(), r.value);
        const sub = Store.subjectOf(s.subject);
        if (sub) { s.color = sub.color; s.icon = sub.icon; }
        Store.data.sets.unshift(s);
        Store.commit('sets');
        App.go('set', { id: s.id });
    }

    async function exportSets(ids, base) {
        if (!ids.length) return;
        const name = await Store.saveText(Store.exportSetText(ids), `${U.safeFileName(base)}.json`, 'ไฟล์ชุดเนื้อหาเกมจับคู่ (.json)');
        if (name) U.toast(`ส่งออกชุดเนื้อหาแล้ว: <b>${esc(name)}</b>`, { type: 'ok', ms: 4500 });
    }

    async function importSets() {
        if (!VSDemo.allow('นำเข้าชุดเนื้อหา (.json)')) return;
        const file = await U.pickFile('.json,application/json');
        if (!file) return;
        let text = '';
        try { text = await U.readFileAsText(file); } catch (e) { U.alert('เปิดไฟล์ไม่สำเร็จ', esc(e.message), 'error'); return; }
        const res = Store.parseSetFile(text);
        if (!res.ok) { U.alert('นำเข้าไม่ได้', esc(res.error), 'error'); return; }
        const ok = await U.confirm('นำเข้าชุดเนื้อหา?', `<div style="text-align:left">พบ <b>${res.sets.length}</b> ชุด รวม <b>${res.sets.reduce((a, s) => a + s.pairs.length, 0)}</b> คู่:<ul>${res.sets.map((s) => `<li>${esc(s.name)} (${s.pairs.length} คู่)</li>`).join('')}</ul><small>ชุดเนื้อหาจะถูก<b>เพิ่ม</b>ต่อท้าย ไม่ทับชุดเดิม</small></div>`, { icon: 'question', confirmText: '<i class="fas fa-file-import"></i> นำเข้า' });
        if (!ok) return;
        Store.addSets(res.sets);
        U.toast(`นำเข้า ${res.sets.length} ชุดแล้ว`, { type: 'ok' });
    }

    window.Views.library = { render, refresh() { if (root) render(root); } };
})();
