/* ห้องเรียน / นักเรียน — เพิ่มห้อง, รายชื่อ, อวตาร, วางรายชื่อจาก Excel, นำเข้า .xlsx/.csv */
(function () {
    'use strict';

    function render(el) {
        const d = Store.data;
        const c = Store.current();
        const list = c ? Core.classStudents(d, c.id) : [];
        const bal = Core.balances(d);
        el.innerHTML = `
            ${U.hero({ icon: 'fa-user-graduate', title: 'ห้องเรียน / นักเรียน', sub: 'เพิ่มห้องเรียน วางรายชื่อจาก Excel หรือนำเข้าไฟล์ .xlsx/.csv แล้วแตะอวตารเพื่อเปลี่ยนตัวการ์ตูน', side: `<button type="button" class="hero-btn" id="cl-add"><i class="fas fa-plus"></i>เพิ่มห้องเรียน</button>` })}
            ${!c ? UI.noClass('กด "เพิ่มห้องเรียน" เช่น ป.5/1 แล้ววางรายชื่อนักเรียน') : `
            <div class="board-bar">${UI.classSeg()}
                <div class="board-tools"><button type="button" class="btn-x ghost sm" id="cl-rename"><i class="fas fa-pen"></i>แก้ชื่อห้อง</button><button type="button" class="btn-x ghost sm" id="cl-del" data-act="delete"><i class="fas fa-trash"></i>ลบห้องนี้</button></div></div>
            <div class="panel panel--theme"><div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-users"></i></span><div><h3>นักเรียนห้อง ${U.esc(c.name)}</h3><small>${list.length} คน</small></div>
                <div class="panel-tools"><button type="button" class="btn-x primary sm" id="st-add"><i class="fas fa-user-plus"></i>เพิ่มนักเรียน</button><button type="button" class="btn-x green sm" id="st-paste" data-demo-lock="วางรายชื่อจาก Excel"><i class="fas fa-paste"></i>วางรายชื่อจาก Excel</button><button type="button" class="btn-x soft sm" id="st-import" data-demo-lock="นำเข้าไฟล์ Excel/CSV"><i class="fas fa-file-excel"></i>นำเข้าไฟล์</button><button type="button" class="btn-x ghost sm" id="st-tpl"><i class="fas fa-download"></i>ไฟล์แม่แบบ</button></div></div>
                <div class="panel-body p-0 dt-wrap"><table class="dt"><thead><tr><th class="num">เลขที่</th><th>อวตาร</th><th>ชื่อ - สกุล</th><th>ชื่อเล่น</th><th class="num">แต้มคงเหลือ</th><th class="act"></th></tr></thead><tbody>
                ${list.length ? list.map((s) => `<tr><td class="num">${U.esc(s.no)}</td><td><button type="button" class="ava-btn" data-ava="${s.id}" title="เปลี่ยนอวตาร">${UI.ava(s, 40)}</button></td><td><b>${U.esc(Core.fullName(s))}</b></td><td>${U.esc(s.nick || '-')}</td><td class="num">${(bal.get(s.id) || 0).toLocaleString()}</td>
                    <td class="act"><button type="button" class="icon-btn edit" data-edit="${s.id}" title="แก้ไข"><i class="fas fa-pen"></i></button><button type="button" class="icon-btn del" data-del="${s.id}" title="ลบนักเรียน"><i class="fas fa-trash"></i></button></td></tr>`).join('') : U.emptyRow(6, 'fa-user-plus', 'ยังไม่มีนักเรียน — กด "วางรายชื่อจาก Excel" หรือ "เพิ่มนักเรียน"')}
                </tbody></table></div></div>`}`;
        el.querySelector('#cl-add').onclick = () => addClass(null);
        if (!c) return;
        UI.bindClassSeg(el);
        el.querySelector('#cl-rename').onclick = () => addClass(c);
        el.querySelector('#cl-del').onclick = async () => {
            if (!(await U.confirm(`ลบห้อง ${U.esc(c.name)}?`, `นักเรียน ${list.length} คน และแต้มทั้งหมดของห้องนี้จะถูกลบ <b>กู้คืนไม่ได้</b> (ยกเว้นมีไฟล์สำรอง)`, { danger: true, confirmText: 'ลบห้องนี้' }))) return;
            const ids = new Set(list.map((s) => s.id));
            d.classes = d.classes.filter((x) => x.id !== c.id);
            d.students = d.students.filter((s) => !ids.has(s.id));
            d.events = d.events.filter((e) => !ids.has(e.sid));
            d.redeems = d.redeems.filter((x) => !ids.has(x.sid));
            Store.commit('classes', { normalize: true });
        };
        el.querySelector('#st-add').onclick = () => editStudent(null, c);
        el.querySelector('#st-paste').onclick = () => pasteNames(c);
        el.querySelector('#st-import').onclick = () => importFile(c);
        el.querySelector('#st-tpl').onclick = () => template();
        el.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => editStudent(Store.student(b.dataset.edit), c); });
        el.querySelectorAll('[data-ava]').forEach((b) => { b.onclick = () => pickAvatar(Store.student(b.dataset.ava)); });
        el.querySelectorAll('[data-del]').forEach((b) => { b.onclick = async () => {
            const s = Store.student(b.dataset.del);
            if (!(await U.confirm(`ลบ ${U.esc(Core.fullName(s))}?`, 'แต้มและประวัติของนักเรียนคนนี้จะถูกลบด้วย', { danger: true, confirmText: 'ลบนักเรียน' }))) return;
            d.students = d.students.filter((x) => x.id !== s.id); d.events = d.events.filter((e) => e.sid !== s.id); d.redeems = d.redeems.filter((x) => x.sid !== s.id);
            Store.commit('students', { normalize: true });
        }; });
    }

    async function addClass(c) {
        const r = await UI.sheet({
            title: c ? 'แก้ชื่อห้องเรียน' : 'เพิ่มห้องเรียน',
            html: `<div class="sheet-body text-start"><label class="form-label">ชื่อห้องเรียน</label><input id="cl-name" class="form-control" maxlength="30" value="${U.esc(c ? c.name : '')}" placeholder="เช่น ป.5/1 หรือ ม.2/3"></div>`,
            preConfirm: () => { const v = U.norm(document.getElementById('cl-name').value); if (!v) { Swal.showValidationMessage('กรุณากรอกชื่อห้อง'); return false; } return v; },
        });
        if (!r.isConfirmed) return;
        if (c) c.name = r.value;
        else { const n = { id: U.uid('c'), name: r.value, groups: [] }; Store.data.classes.push(n); Store.data.settings.classId = n.id; }
        Store.commit('classes');
        U.toast(c ? 'แก้ชื่อห้องแล้ว' : `เพิ่มห้อง ${U.esc(r.value)} แล้ว — วางรายชื่อนักเรียนได้เลย`, { type: 'ok' });
        if (!c && App.current !== 'classes') App.go('classes');
    }

    async function editStudent(s, c) {
        const list = Core.classStudents(Store.data, c.id);
        const x = s || { no: (Math.max(0, ...list.map((y) => Number(y.no) || 0)) + 1), prefix: 'ด.ช.', firstName: '', lastName: '', nick: '', avatar: Math.floor(Math.random() * Avatar.COUNT) };
        const r = await UI.sheet({
            title: s ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มนักเรียน',
            html: `<div class="sheet-body text-start"><div class="row g-2">
                <div class="col-4 col-md-2"><label class="form-label">เลขที่</label><input id="f-no" type="number" inputmode="numeric" class="form-control" value="${U.esc(x.no)}"></div>
                <div class="col-8 col-md-3"><label class="form-label">คำนำหน้า</label><select id="f-prefix" class="form-select">${U.options(Store.PREFIXES, x.prefix)}</select></div>
                <div class="col-md-7"><label class="form-label">ชื่อเล่น (แสดงบนจอหน้าห้อง)</label><input id="f-nick" class="form-control" value="${U.esc(x.nick)}" maxlength="20"></div>
                <div class="col-md-6"><label class="form-label">ชื่อ</label><input id="f-first" class="form-control" value="${U.esc(x.firstName)}"></div>
                <div class="col-md-6"><label class="form-label">นามสกุล</label><input id="f-last" class="form-control" value="${U.esc(x.lastName)}"></div></div></div>`,
            preConfirm: () => {
                const v = (id) => U.norm(document.getElementById(id).value);
                if (!v('f-first')) { Swal.showValidationMessage('กรุณากรอกชื่อ'); return false; }
                return { no: U.toInt(v('f-no'), ''), prefix: v('f-prefix'), firstName: v('f-first'), lastName: v('f-last'), nick: v('f-nick') };
            },
        });
        if (!r.isConfirmed) return;
        if (s) Object.assign(s, r.value);
        else Store.data.students.push(Object.assign({ id: U.uid('s'), classId: c.id, avatar: x.avatar }, r.value));
        Store.commit('students');
    }

    async function pickAvatar(s) {
        let pick = null;
        await UI.sheet({
            title: `เลือกอวตารของ ${Core.showName(s)}`, width: 640, showConfirm: false, cancelText: 'ปิด',
            html: `<div class="ava-pick">${Array.from({ length: Avatar.COUNT }, (_, i) => `<button type="button" data-i="${i}" class="${i === s.avatar ? 'active' : ''}">${Avatar.svg(i, 64)}</button>`).join('')}</div>`,
            didOpen: (el) => el.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => { pick = +b.dataset.i; Swal.close(); }; }),
        });
        if (pick == null) return;
        s.avatar = pick; Store.commit('students'); Sfx.coin();
    }

    /* แยกรายชื่อ: รองรับคอลัมน์ (เลขที่ คำนำหน้า ชื่อ สกุล ชื่อเล่น) หรือบรรทัดเดียว "ด.ช.สมชาย ใจดี" */
    function parseRows(rows) {
        const out = [];
        const pre = Store.PREFIXES.slice().sort((a, b) => b.length - a.length);
        rows.forEach((cols) => {
            cols = cols.map((v) => U.norm(v));
            if (!cols.some(Boolean)) return;
            if (/เลขที่|ชื่อ/.test(cols.join(' ')) && !/^\d+$/.test(cols[0])) return; // หัวตาราง
            let no = '', prefix = '', first = '', last = '', nick = '';
            if (/^\d+$/.test(cols[0])) no = +cols.shift();
            if (cols.length >= 3 && pre.includes(cols[0])) { [prefix, first, last, nick] = cols; }
            else if (cols.length >= 2 && !pre.some((p) => cols[0].startsWith(p))) { [first, last, nick] = cols; }
            else {
                let name = cols[0];
                const p = pre.find((x) => name.startsWith(x));
                if (p) { prefix = p; name = name.slice(p.length).trim(); }
                const parts = name.split(' ');
                first = parts.shift() || ''; last = parts.join(' '); nick = cols[1] || '';
            }
            if (first) out.push({ no, prefix: prefix || '', firstName: first, lastName: last || '', nick: nick || '' });
        });
        return out;
    }

    async function confirmImport(c, rows) {
        if (!rows.length) { U.alert('ไม่พบรายชื่อ', 'ตรวจสอบว่ามีคอลัมน์ ชื่อ และ นามสกุล', 'warning'); return; }
        const existing = Core.classStudents(Store.data, c.id);
        let next = Math.max(0, ...existing.map((s) => Number(s.no) || 0));
        const ok = await U.confirm(`นำเข้า ${rows.length} คน เข้าห้อง ${U.esc(c.name)}?`, `<div class="imp-prev">${rows.slice(0, 8).map((r) => `<div>${U.esc(r.no || '')} ${U.esc(`${r.prefix}${r.firstName} ${r.lastName}`)} ${r.nick ? `(${U.esc(r.nick)})` : ''}</div>`).join('')}${rows.length > 8 ? `<div>… และอีก ${rows.length - 8} คน</div>` : ''}</div>`, { icon: 'question', confirmText: '<i class="fas fa-file-import"></i> นำเข้า' });
        if (!ok) return;
        rows.forEach((r, i) => Store.data.students.push(Object.assign({ id: U.uid('s'), classId: c.id, avatar: (existing.length + i) * 7 % Avatar.COUNT }, r, { no: r.no || ++next })));
        Store.commit('students', { normalize: true });
        U.toast(`นำเข้าแล้ว ${rows.length} คน`, { type: 'ok' });
    }

    async function pasteNames(c) {
        if (!VSDemo.allow('วางรายชื่อจาก Excel')) return;
        const r = await UI.sheet({
            title: 'วางรายชื่อจาก Excel', width: 720, confirmText: '<i class="fas fa-check"></i> ตรวจรายชื่อ',
            html: `<div class="sheet-body text-start"><div class="note info"><i class="fas fa-circle-info"></i><div>คัดลอกคอลัมน์จาก Excel แล้ววางที่นี่ — รูปแบบ: <b>เลขที่ | คำนำหน้า | ชื่อ | นามสกุล | ชื่อเล่น</b> (บางคอลัมน์ไม่มีก็ได้) หรือพิมพ์บรรทัดละ 1 คน เช่น "ด.ญ.ใบเตย สุขใจ"</div></div>
                <textarea id="pt-text" class="form-control" rows="10" placeholder="1&#9;ด.ช.&#9;ภูมิพัฒน์&#9;บุญมา&#9;ภูมิ"></textarea></div>`,
            preConfirm: () => document.getElementById('pt-text').value,
        });
        if (!r.isConfirmed) return;
        confirmImport(c, parseRows(r.value.split(/\r?\n/).map((l) => l.split('\t'))));
    }

    async function importFile(c) {
        if (!VSDemo.allow('นำเข้าไฟล์ Excel/CSV')) return;
        const f = await U.pickFile('.xlsx,.xls,.csv');
        if (!f) return;
        try {
            const wb = XLSX.read(await U.readFileAsArrayBuffer(f), { type: 'array' });
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
            confirmImport(c, parseRows(rows.map((r) => r.map(String))));
        } catch (e) { U.alert('อ่านไฟล์ไม่สำเร็จ', U.esc(e.message), 'error'); }
    }

    function template() {
        const ws = XLSX.utils.aoa_to_sheet([['เลขที่', 'คำนำหน้า', 'ชื่อ', 'นามสกุล', 'ชื่อเล่น'], [1, 'ด.ช.', 'ภูมิพัฒน์', 'บุญมา', 'ภูมิ'], [2, 'ด.ญ.', 'ใบเตย', 'สุขใจ', 'เตย']]);
        ws['!cols'] = [{ wch: 8 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'รายชื่อนักเรียน');
        XLSX.writeFile(wb, 'แม่แบบรายชื่อนักเรียน.xlsx');
    }

    window.Views.classes = { render, refresh() { App.render(); }, parseRows, addClass: () => addClass(null) };
})();
