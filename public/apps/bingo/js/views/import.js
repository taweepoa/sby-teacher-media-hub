/* นำเข้าชุดคำจาก Excel (.xlsx/.xls/.csv) + ไฟล์แม่แบบ */
(function () {
    'use strict';

    let root = null;
    let pending = null; // { file, sheets:{name:rows}, sheet }

    function render(el) {
        root = el;
        el.innerHTML = `
            ${U.hero({ icon: 'fa-file-excel', title: 'นำเข้าชุดคำจาก Excel', sub: 'คอลัมน์ A = สิ่งที่ครูเรียก (คำถาม/ความหมาย) • คอลัมน์ B = คำบนการ์ด (คำตอบ) • ถ้ามีคอลัมน์เดียว จะถือเป็นคำบนการ์ด • 1 ชีต = 1 ชุดคำ' })}
            <div class="import-cols">
                <div>
                    <div class="panel panel--green">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-file-arrow-down"></i></span><div><h3>1. ดาวน์โหลดไฟล์แม่แบบ</h3><small>มีตัวอย่าง 3 ชีต: คำศัพท์ / โจทย์คณิต / คำถามวิทย์</small></div></div>
                        <div class="panel-body">
                            <button type="button" class="btn-x green w-100" data-act="tpl"><i class="fas fa-file-excel"></i>ดาวน์โหลดแม่แบบ (.xlsx)</button>
                            <div class="hint mt-2">กรอกได้ทั้ง Excel, Google Sheets (ดาวน์โหลดเป็น .xlsx) หรือ LibreOffice • แถวแรกเป็นหัวคอลัมน์</div>
                        </div>
                    </div>
                    <div class="panel panel--theme">
                        <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-upload"></i></span><div><h3>2. เลือกไฟล์</h3><small>.xlsx .xls .csv</small></div></div>
                        <div class="panel-body">
                            <label class="dropzone" id="dz" data-demo-lock="นำเข้าจาก Excel">
                                <i class="fas fa-cloud-arrow-up"></i>
                                <b>ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์</b>
                                <small>ไฟล์จะถูกอ่านในเครื่องนี้เท่านั้น ไม่ส่งขึ้นอินเทอร์เน็ต</small>
                                <input type="file" id="dz-file" accept=".xlsx,.xls,.csv" hidden data-demo-lock="นำเข้าจาก Excel">
                            </label>
                        </div>
                    </div>
                </div>
                <div id="imp-preview">${preview()}</div>
            </div>`;
        el.querySelector('[data-act="tpl"]').onclick = template;
        const dz = el.querySelector('#dz');
        const inp = el.querySelector('#dz-file');
        inp.onchange = () => { if (inp.files[0]) readFile(inp.files[0]); };
        dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('is-over'); };
        dz.ondragleave = () => dz.classList.remove('is-over');
        dz.ondrop = (e) => {
            e.preventDefault(); dz.classList.remove('is-over');
            if (!VSDemo.allow('นำเข้าจาก Excel')) return;
            if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
        };
        bindPreview();
    }

    function rowsToItems(rows) {
        const clean = rows.map((r) => (r || []).map((c) => U.norm(c))).filter((r) => r.some(Boolean));
        if (!clean.length) return [];
        // ข้ามแถวหัวตาราง
        const h = clean[0].join(' ');
        if (/คำถาม|คำตอบ|เรียก|การ์ด|question|answer|word/i.test(h)) clean.shift();
        const twoCols = clean.some((r) => r[1]);
        return clean.map((r) => (twoCols ? { q: r[0] || '', a: r[1] || '' } : { q: '', a: r[0] || '' })).filter((x) => x.a);
    }

    async function readFile(file) {
        if (!VSDemo.allow('นำเข้าจาก Excel')) return;
        try {
            const buf = await U.readFileAsArrayBuffer(file);
            const wb = XLSX.read(buf, { type: 'array' });
            const sheets = {};
            wb.SheetNames.forEach((n) => { sheets[n] = rowsToItems(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' })); });
            const first = wb.SheetNames.find((n) => sheets[n].length);
            if (!first) { U.alert('ไม่พบข้อมูล', 'ไฟล์นี้ไม่มีคำในคอลัมน์ A/B', 'warning'); return; }
            pending = { file: file.name, sheets, sheet: first, names: wb.SheetNames.filter((n) => sheets[n].length) };
            root.querySelector('#imp-preview').innerHTML = preview();
            bindPreview();
        } catch (e) {
            console.error(e);
            U.alert('อ่านไฟล์ไม่สำเร็จ', 'กรุณาตรวจว่าเป็นไฟล์ Excel (.xlsx) หรือ .csv', 'error');
        }
    }

    function preview() {
        if (!pending) {
            return `<div class="panel"><div class="panel-body"><div class="empty-state"><span class="ic-box lg" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-table-list"></i></span><h3>ตัวอย่างข้อมูลจะแสดงที่นี่</h3><div>เลือกไฟล์ Excel แล้วตรวจทานก่อนกดนำเข้า</div></div></div></div>`;
        }
        const items = pending.sheets[pending.sheet];
        const dup = Bingo.duplicates(items);
        const sets = Store.data.sets;
        return `<div class="panel panel--orange">
            <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-eye"></i></span><div><h3>3. ตรวจทานและนำเข้า</h3><small>${U.esc(pending.file)} • ${items.length} คำ</small></div></div>
            <div class="panel-body">
                ${pending.names.length > 1 ? `<div class="seg scroll-x mb-3">${pending.names.map((n) => `<button type="button" data-sheet="${U.esc(n)}" class="${n === pending.sheet ? 'active' : ''}">${U.esc(n)} <span class="cnt">${pending.sheets[n].length}</span></button>`).join('')}</div>` : ''}
                ${dup.length ? `<div class="note warn"><i class="fas fa-triangle-exclamation"></i><div>คำบนการ์ดซ้ำ: <b>${dup.map(U.esc).join(', ')}</b> (ระบบจะนำเข้าเพียงคำแรก)</div></div>` : ''}
                <div class="form-grid mb-3">
                    <div><label class="form-label">นำเข้าเป็น</label><select class="form-select" id="imp-target"><option value="">ชุดคำใหม่</option>${sets.map((s) => `<option value="${s.id}">เพิ่มต่อท้าย: ${U.esc(s.name)}</option>`).join('')}</select></div>
                    <div><label class="form-label">ชื่อชุดคำใหม่</label><input class="form-control" id="imp-name" value="${U.esc(pending.sheet)}"></div>
                    <div><label class="form-label">วิชา</label><select class="form-select" id="imp-sub">${U.options(Store.SUBJECTS, 'ภาษาอังกฤษ')}</select></div>
                    <div><label class="form-label">ระดับชั้น</label><select class="form-select" id="imp-lv">${U.options(Store.LEVELS, 'ป.4')}</select></div>
                </div>
                <div class="dt-wrap imp-table"><table class="dt"><thead><tr><th class="num">ที่</th><th>สิ่งที่ครูเรียก</th><th>คำบนการ์ด</th></tr></thead>
                    <tbody>${items.slice(0, 200).map((it, i) => `<tr><td class="num">${i + 1}</td><td>${U.esc(it.q || '—')}</td><td><b>${U.esc(it.a)}</b></td></tr>`).join('')}</tbody></table></div>
                <div class="d-flex gap-2 mt-3 flex-wrap justify-content-end">
                    <button type="button" class="btn-x ghost" data-act="cancel"><i class="fas fa-xmark"></i>ยกเลิก</button>
                    <button type="button" class="btn-x primary lg" data-act="do" data-demo-lock="นำเข้าจาก Excel"><i class="fas fa-file-import"></i>นำเข้า ${items.length} คำ</button>
                </div>
            </div></div>`;
    }

    function bindPreview() {
        if (!pending) return;
        const box = root.querySelector('#imp-preview');
        box.querySelectorAll('[data-sheet]').forEach((b) => { b.onclick = () => { pending.sheet = b.dataset.sheet; box.innerHTML = preview(); bindPreview(); }; });
        box.querySelector('[data-act="cancel"]').onclick = () => { pending = null; render(root); };
        box.querySelector('[data-act="do"]').onclick = doImport;
        const tg = box.querySelector('#imp-target');
        tg.onchange = () => { ['#imp-name', '#imp-sub', '#imp-lv'].forEach((s) => { box.querySelector(s).disabled = !!tg.value; }); };
    }

    function doImport() {
        if (!VSDemo.allow('นำเข้าจาก Excel')) return;
        const box = root.querySelector('#imp-preview');
        const target = box.querySelector('#imp-target').value;
        let s = target ? Store.set(target) : null;
        if (!s) {
            s = Object.assign(Store.newSet(), { name: U.norm(box.querySelector('#imp-name').value) || pending.sheet, subject: box.querySelector('#imp-sub').value, level: box.querySelector('#imp-lv').value });
            Store.data.sets.push(s);
        }
        const have = new Set(s.items.map((i) => U.norm(i.a).toLowerCase()));
        let n = 0;
        pending.sheets[pending.sheet].forEach((it) => {
            const k = U.norm(it.a).toLowerCase();
            if (have.has(k)) return;
            have.add(k);
            s.items.push(Store.newItem(it.q, it.a));
            n++;
        });
        s.updatedAt = new Date().toISOString();
        pending = null;
        Store.commit();
        U.toast(`นำเข้าแล้ว ${n} คำ ในชุด <b>${U.esc(s.name)}</b>`, { type: 'ok' });
        App.go('sets', { id: s.id });
    }

    function template() {
        const wb = XLSX.utils.book_new();
        const add = (name, rows, w) => { const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = w; XLSX.utils.book_append_sheet(wb, ws, name); };
        add('คำศัพท์ผลไม้', [['สิ่งที่ครูเรียก (คำถาม/ความหมาย)', 'คำบนการ์ด (คำตอบ)'], ['กล้วย', 'banana'], ['ส้ม', 'orange'], ['มะม่วง', 'mango'], ['แอปเปิล', 'apple'], ['องุ่น', 'grape'], ['สับปะรด', 'pineapple'], ['แตงโม', 'watermelon'], ['มะพร้าว', 'coconut']], [{ wch: 40 }, { wch: 26 }]);
        add('โจทย์คณิต', [['สิ่งที่ครูเรียก (คำถาม/ความหมาย)', 'คำบนการ์ด (คำตอบ)'], ['12 + 15 = ?', '27'], ['50 - 18 = ?', '32'], ['6 × 7 = ?', '42'], ['81 ÷ 9 = ?', '9'], ['ครึ่งหนึ่งของ 30', '15']], [{ wch: 40 }, { wch: 26 }]);
        add('คำถามวิทย์', [['สิ่งที่ครูเรียก (คำถาม/ความหมาย)', 'คำบนการ์ด (คำตอบ)'], ['อวัยวะที่สูบฉีดเลือด', 'หัวใจ'], ['ดาวเคราะห์ที่ใกล้ดวงอาทิตย์ที่สุด', 'ดาวพุธ'], ['แก๊สที่พืชใช้สังเคราะห์ด้วยแสง', 'คาร์บอนไดออกไซด์']], [{ wch: 40 }, { wch: 26 }]);
        XLSX.writeFile(wb, 'แม่แบบชุดคำบิงโก.xlsx');
    }

    window.ImportView = { rowsToItems };
    window.Views = window.Views || {};
    window.Views.import = { render, refresh: () => {} };
})();
