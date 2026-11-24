/* นำเข้าคำถามจาก Excel/CSV หรือวางจาก Excel → ตรวจทานทีละแถว → เพิ่มเข้าชุดคำถาม */
(function () {
    'use strict';
    const esc = U.esc;
    let state = { tab: 'file', items: null, source: '', sheets: null, sheet: 0, target: '', newName: '', replace: false, paste: '' };

    function render(el, params) {
        const d = Store.data;
        if (params && params.set && Store.set(params.set)) state.target = params.set;
        if (state.target && state.target !== '__new' && !Store.set(state.target)) state.target = '';
        if (!state.target) state.target = d.sets[0] ? d.sets[0].id : '__new';
        el.innerHTML = `
            ${U.hero({ icon: 'fa-file-excel', title: 'นำเข้าคำถามจาก Excel', sub: 'รองรับไฟล์ .xlsx / .xls / .csv หรือคัดลอกตารางจาก Excel / Google Sheets มาวาง — ตรวจทานก่อนนำเข้าทุกครั้ง', side: '<button type="button" class="btn-x cta" id="im-tpl"><i class="fas fa-download"></i>ดาวน์โหลดไฟล์แม่แบบ</button>' })}
            <div class="row g-3">
                <div class="col-lg-5">
                    <div class="panel panel--green h-100">
                        <div class="panel-head"><span class="msec-n">1</span><div><h3>เลือกข้อมูล</h3><small>คอลัมน์: หมวด • คำถาม • ตัวเลือก ก–ง • เฉลย • คะแนน • เวลา • คำอธิบาย</small></div></div>
                        <div class="panel-body">
                            <div class="seg full mb-3" id="im-tab"><button type="button" data-tab="file" class="${state.tab === 'file' ? 'active' : ''}"><i class="fas fa-file-arrow-up"></i>อัปโหลดไฟล์</button><button type="button" data-tab="paste" class="${state.tab === 'paste' ? 'active' : ''}"><i class="fas fa-paste"></i>วางจาก Excel</button></div>
                            <div id="im-file"${state.tab === 'file' ? '' : ' hidden'}>
                                <div class="dropzone" id="im-drop" tabindex="0" data-demo-lock="นำเข้าคำถามจากไฟล์ Excel/CSV"><i class="fas fa-file-excel"></i><b>คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</b><small>.xlsx .xls .csv (ภาษาไทย UTF-8 หรือ Windows-874)</small></div>
                                ${state.sheets && state.sheets.length > 1 ? `<label class="form-label mt-2">แผ่นงาน</label><select class="form-select" id="im-sheet">${state.sheets.map((s, i) => `<option value="${i}"${i === state.sheet ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>` : ''}
                            </div>
                            <div id="im-paste-box"${state.tab === 'paste' ? '' : ' hidden'}>
                                <textarea class="form-control" id="im-paste" rows="8" placeholder="คัดลอกแถวจาก Excel (รวมแถวหัวตาราง) แล้ววางที่นี่">${esc(state.paste)}</textarea>
                                <button type="button" class="btn-x primary mt-2" id="im-paste-go" data-demo-lock="วางคำถามจาก Excel"><i class="fas fa-magnifying-glass"></i>ตรวจข้อมูลที่วาง</button>
                            </div>
                            ${VSDemo.active ? '<div class="note warn mt-3 mb-0"><i class="fas fa-lock"></i><div><b>โหมดทดลองใช้:</b> การนำเข้าคำถามจากไฟล์/การวางจาก Excel ใช้ได้เมื่อซื้อระบบแล้ว — ดาวน์โหลดไฟล์แม่แบบดูรูปแบบได้ และลองเพิ่มคำถามทีละข้อได้ที่หน้า "คลังคำถาม"</div></div>' : ''}
                            <div class="note mt-3 mb-0"><i class="fas fa-lightbulb"></i><div>คำถาม<b>เลือกตอบ</b>: กรอกตัวเลือก 2–4 ช่อง แล้วใส่เฉลยเป็น <b>ก ข ค ง</b> (หรือ A–D, 1–4)<br>คำถาม<b>เขียนตอบ</b>: เว้นช่องตัวเลือกว่าง แล้วพิมพ์คำตอบในช่องเฉลย<br>รูปภาพ: เพิ่มภายหลังที่หน้าแก้ไขคำถาม</div></div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-7">
                    <div class="panel panel--theme h-100">
                        <div class="panel-head"><span class="msec-n">2</span><div><h3>ตรวจทานและนำเข้า</h3><small>${state.items ? esc(state.source) : 'ยังไม่ได้เลือกข้อมูล'}</small></div></div>
                        <div class="panel-body" id="im-review">${review()}</div>
                    </div>
                </div>
            </div>`;
        bind(el);
    }

    function review() {
        const items = state.items;
        if (!items) return UI.empty('fa-table', 'ยังไม่มีข้อมูล', 'เลือกไฟล์หรือวางข้อมูลจาก Excel ทางซ้าย');
        if (!items.length) return UI.empty('fa-circle-exclamation', 'ไม่พบคำถามในข้อมูลนี้', 'ตรวจสอบว่ามีหัวคอลัมน์ "คำถาม" หรือใช้ไฟล์แม่แบบ');
        const ok = items.filter((i) => !i.errors.length);
        const bad = items.length - ok.length;
        const L = UI.letters();
        const sets = Store.data.sets;
        return `
            <div class="mini-stats mb-2"><span class="kv">พบ <b>${items.length}</b> ข้อ</span><span class="kv">พร้อมนำเข้า <b>${ok.length}</b></span>${bad ? `<span class="kv bad">มีปัญหา <b>${bad}</b> (ข้าม)</span>` : ''}</div>
            <div class="dt-wrap im-table"><table class="dt">
                <thead><tr><th>แถว</th><th>ชนิด</th><th>คำถาม</th><th>เฉลย</th><th>สถานะ</th></tr></thead>
                <tbody>${items.map((it) => {
                    const q = it.q;
                    const ans = q.type === 'mc' ? (q.answer >= 0 ? `${L[q.answer]}. ${q.choices[q.answer]}` : '-') : q.answer;
                    return `<tr class="${it.errors.length ? 'row-bad' : ''}"><td>${it.row}</td><td><span class="type-tag ${q.type === 'mc' ? 't-mc' : 't-text'}">${q.type === 'mc' ? `เลือกตอบ ${q.choices.length}` : 'เขียนตอบ'}</span></td>
                        <td><div class="q-mini">${esc(q.text) || '-'}</div>${q.category ? `<span class="mini-pill"><i class="fas fa-tag"></i>${esc(q.category)}</span>` : ''}${q.points ? `<span class="mini-pill">${UI.fmt(q.points)} คะแนน</span>` : ''}</td>
                        <td>${esc(ans) || '-'}</td>
                        <td>${it.errors.length ? `<span class="tag bad"><i class="fas fa-xmark"></i>${esc(it.errors.join(', '))}</span>` : it.warns.length ? `<span class="tag warn"><i class="fas fa-triangle-exclamation"></i>${esc(it.warns.join(', '))}</span>` : '<span class="tag ok"><i class="fas fa-check"></i>พร้อม</span>'}</td></tr>`;
                }).join('')}</tbody></table></div>
            <div class="im-target mt-3">
                <label class="form-label">นำเข้าไปที่ชุดคำถาม</label>
                <div class="row g-2">
                    <div class="col-sm-6"><select class="form-select" id="im-target">${sets.map((s) => `<option value="${esc(s.id)}"${s.id === state.target ? ' selected' : ''}>${esc(s.name || 'ไม่มีชื่อ')} (${s.questions.length} ข้อ)</option>`).join('')}<option value="__new"${state.target === '__new' ? ' selected' : ''}>+ สร้างชุดคำถามใหม่</option></select></div>
                    <div class="col-sm-6"><input class="form-control" id="im-newname" placeholder="ชื่อชุดคำถามใหม่" value="${esc(state.newName)}"${state.target === '__new' ? '' : ' hidden'}></div>
                </div>
                ${state.target !== '__new' ? `<label class="check-line mt-2"><input type="checkbox" class="form-check-input" id="im-replace"${state.replace ? ' checked' : ''}><span>แทนที่คำถามเดิมทั้งหมดในชุดนี้ (ไม่เลือก = เพิ่มต่อท้าย)</span></label>` : ''}
                <button type="button" class="btn-x cta lg mt-3 w-100" id="im-go" data-demo-lock="นำเข้าคำถาม"${ok.length ? '' : ' disabled'}><i class="fas fa-file-import"></i>นำเข้า ${ok.length} ข้อ</button>
            </div>`;
    }

    async function loadFile(el, file) {
        if (!VSDemo.allow('นำเข้าคำถามจากไฟล์ Excel/CSV')) return;
        try {
            const sheets = await QIO.readFile(file);
            if (!sheets.length) { U.alert('ไฟล์ว่าง', 'ไม่พบข้อมูลในไฟล์นี้', 'warning'); return; }
            // เลือกแผ่นงานที่มีหัวคอลัมน์ "คำถาม" ก่อน
            let idx = sheets.findIndex((s) => s.rows.slice(0, 10).some((r) => r.some((c) => /คำถาม|question/i.test(String(c)))));
            if (idx < 0) idx = 0;
            state = Object.assign(state, { sheets, sheet: idx, items: QIO.parseRows(sheets[idx].rows), source: `${file.name}${sheets.length > 1 ? ` • แผ่นงาน ${sheets[idx].name}` : ''}` });
            if (state.target === '__new' && !state.newName) state.newName = file.name.replace(/\.[^.]+$/, '');
            render(el, {});
        } catch (e) {
            console.error(e);
            U.alert('เปิดไฟล์ไม่สำเร็จ', `ไฟล์อาจเสียหายหรือไม่ใช่ไฟล์ Excel/CSV<br><small>${esc(e.message)}</small>`, 'error');
        }
    }

    function bind(el) {
        el.querySelector('#im-tpl').onclick = () => { QIO.downloadTemplate(); U.toast('ดาวน์โหลดไฟล์แม่แบบแล้ว', { type: 'ok' }); };
        el.querySelector('#im-tab').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; state.tab = b.dataset.tab; render(el, {}); };
        const drop = el.querySelector('#im-drop');
        drop.onclick = async () => { const f = await U.pickFile('.xlsx,.xls,.csv'); if (f) loadFile(el, f); };
        drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drop.click(); } };
        drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('is-over'); };
        drop.ondragleave = () => drop.classList.remove('is-over');
        drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('is-over'); if (!VSDemo.allow('นำเข้าคำถามจากไฟล์ Excel/CSV')) return; const f = e.dataTransfer.files[0]; if (f) loadFile(el, f); };
        const sh = el.querySelector('#im-sheet');
        if (sh) sh.onchange = () => { state.sheet = +sh.value; state.items = QIO.parseRows(state.sheets[state.sheet].rows); state.source = `${state.source.split(' • ')[0]} • แผ่นงาน ${state.sheets[state.sheet].name}`; render(el, {}); };
        el.querySelector('#im-paste-go').onclick = () => {
            if (!VSDemo.allow('วางคำถามจาก Excel')) return;
            state.paste = el.querySelector('#im-paste').value;
            state.items = QIO.parseRows(QIO.parseTSV(state.paste));
            state.source = 'ข้อมูลที่วางจาก Excel';
            render(el, {});
        };
        const tgt = el.querySelector('#im-target');
        if (tgt) tgt.onchange = () => { state.target = tgt.value; render(el, {}); };
        const nn = el.querySelector('#im-newname');
        if (nn) nn.oninput = () => { state.newName = nn.value; };
        const rp = el.querySelector('#im-replace');
        if (rp) rp.onchange = () => { state.replace = rp.checked; };
        const go = el.querySelector('#im-go');
        if (go) go.onclick = () => doImport();
    }

    async function doImport() {
        if (!VSDemo.allow('นำเข้าคำถาม')) return;
        const ok = state.items.filter((i) => !i.errors.length).map((i) => Object.assign({ id: U.uid('q') }, i.q));
        let set;
        if (state.target === '__new') {
            const name = U.norm(state.newName) || 'ชุดคำถามนำเข้า';
            set = Object.assign(Store.newSet(), { name });
            Store.data.sets.unshift(set);
        } else {
            set = Store.set(state.target);
            if (state.replace && set.questions.length) {
                const yes = await U.confirm('แทนที่คำถามเดิม?', `คำถามเดิม ${set.questions.length} ข้อในชุด <b>${esc(set.name)}</b> จะถูกลบ แล้วใส่ ${ok.length} ข้อใหม่แทน`, { confirmText: 'แทนที่', danger: true });
                if (!yes) return;
                set.questions = [];
            }
        }
        set.questions.push(...ok);
        set.updatedAt = new Date().toISOString();
        Store.commit('sets', { normalize: true });
        const id = set.id;
        state = { tab: state.tab, items: null, source: '', sheets: null, sheet: 0, target: id, newName: '', replace: false, paste: '' };
        U.toast(`นำเข้า ${ok.length} ข้อ เข้าชุด "${U.esc(set.name)}" แล้ว`, { type: 'ok', ms: 4000 });
        App.go('set', { id });
    }

    window.Views.import = { render, refresh() { render(document.getElementById('view'), {}); } };
})();
