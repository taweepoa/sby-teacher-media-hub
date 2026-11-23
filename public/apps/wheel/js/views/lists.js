/* =====================================================================
   รายชื่อนักเรียน: หลายห้องเรียน + รายการกำหนดเอง (เช่น หัวข้อ คำถาม)
   วางรายชื่อ/วางจาก Excel • นำเข้า .xlsx/.csv (หลายห้องในไฟล์เดียว) • ส่งออก Excel
   ขาดเรียน (ไม่อยู่บนวงล้อ) • น้ำหนัก 1–10 (ใช้เมื่อเปิด "ถ่วงน้ำหนัก")
   ===================================================================== */
(function () {
    'use strict';

    let root = null;
    let q = '';

    const L = () => Store.currentList();
    const isCustom = (l) => l && l.kind === 'custom';

    function render(el) {
        root = el;
        el.innerHTML = `
            ${U.hero({
                icon: 'fa-user-graduate',
                title: 'รายชื่อนักเรียน',
                sub: 'หลายห้องเรียน • วางรายชื่อจาก Excel • นำเข้าไฟล์ .xlsx • ทำเครื่องหมายขาดเรียน • ถ่วงน้ำหนัก',
                side: `<button type="button" class="hero-btn ghost" id="ls-template"><i class="fas fa-file-arrow-down"></i>ไฟล์แม่แบบ Excel</button>
                       <button type="button" class="hero-btn" id="ls-import" data-demo-lock="นำเข้ารายชื่อจาก Excel"><i class="fas fa-file-excel"></i>นำเข้าไฟล์ Excel</button>`,
            })}
            <div class="list-tabs" id="ls-tabs"></div>
            <div id="ls-body"></div>`;
        el.querySelector('#ls-template').onclick = () => { const n = IO.template(); U.toast(`ดาวน์โหลด <b>${U.esc(n)}</b> แล้ว — กรอกรายชื่อแล้วกด "นำเข้าไฟล์ Excel"`, { type: 'ok', ms: 4500 }); };
        el.querySelector('#ls-import').onclick = importExcel;
        update();
    }

    function update() {
        if (!root) return;
        const d = Store.data;
        const cur = L();
        root.querySelector('#ls-tabs').innerHTML = `
            ${d.lists.map((l) => `<button type="button" class="ltab${cur && l.id === cur.id ? ' active' : ''}" data-list="${U.esc(l.id)}"><i class="fas ${isCustom(l) ? 'fa-list-ul' : 'fa-users'}"></i><span>${U.esc(l.name)}</span><em>${l.items.length}</em></button>`).join('')}
            <button type="button" class="ltab add" data-add="class"><i class="fas fa-plus"></i><span>เพิ่มห้องเรียน</span></button>
            <button type="button" class="ltab add" data-add="custom"><i class="fas fa-list-ul"></i><span>รายการกำหนดเอง</span></button>`;
        root.querySelectorAll('[data-list]').forEach((b) => { b.onclick = () => { q = ''; Store.setCurrent(b.dataset.list); }; });
        root.querySelectorAll('[data-add]').forEach((b) => { b.onclick = () => editList(null, b.dataset.add); });
        const body = root.querySelector('#ls-body');
        if (!cur) {
            body.innerHTML = `
                <div class="panel panel--theme"><div class="panel-body"><div class="empty-state">
                    <span class="ic-box lg" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-user-plus"></i></span>
                    <h3>ยังไม่มีรายชื่อ</h3>
                    <div>เริ่มได้ 3 วิธี: วางรายชื่อ (หนึ่งคนต่อบรรทัด หรือคัดลอกทั้งตารางจาก Excel) • นำเข้าไฟล์ .xlsx (หลายห้องในไฟล์เดียวได้) • หรือทดลองด้วยข้อมูลตัวอย่าง</div>
                    <div class="d-flex gap-2 justify-content-center flex-wrap mt-2">
                        <button type="button" class="btn-x primary" id="ls-first-paste" data-demo-lock="วางรายชื่อจำนวนมาก"><i class="fas fa-paste"></i>วางรายชื่อ</button>
                        <button type="button" class="btn-x green" id="ls-first-xlsx" data-demo-lock="นำเข้ารายชื่อจาก Excel"><i class="fas fa-file-excel"></i>นำเข้าไฟล์ Excel</button>
                        <button type="button" class="btn-x orange" data-demo><i class="fas fa-flask"></i>ทดลองด้วยข้อมูลตัวอย่าง</button>
                    </div>
                </div></div></div>`;
            body.querySelector('#ls-first-paste').onclick = () => pasteNames(null);
            body.querySelector('#ls-first-xlsx').onclick = importExcel;
            return;
        }
        const custom = isCustom(cur);
        const gc = Store.genderCount(cur.items);
        const present = cur.items.filter((s) => s.active).length;
        const weighted = cur.items.filter((s) => s.weight > 1).length;
        const items = Store.sortedItems(cur).filter((s) => !q || `${s.no} ${s.code} ${s.prefix}${s.firstName} ${s.lastName} ${s.nick}`.toLowerCase().includes(q.toLowerCase()));
        body.innerHTML = `
            <div class="panel panel--theme">
                <div class="panel-head">
                    <span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas ${custom ? 'fa-list-ul' : 'fa-users'}"></i></span>
                    <div><h3>${custom ? '' : 'ห้อง '}${U.esc(cur.name)}</h3><small>${custom ? 'รายการกำหนดเอง' : 'ห้องเรียน'}${cur.note ? ` • ${U.esc(cur.note)}` : ''}</small></div>
                    <div class="panel-tools">
                        <button type="button" class="btn-x ghost sm" id="ls-edit"><i class="fas fa-pen"></i>แก้ไขชื่อ</button>
                        <button type="button" class="btn-x ghost sm" id="ls-export"${cur.items.length ? '' : ' disabled'}><i class="fas fa-file-export"></i>ส่งออก Excel</button>
                        <button type="button" class="btn-x danger sm" id="ls-del"><i class="fas fa-trash"></i>ลบ${custom ? 'รายการ' : 'ห้อง'}</button>
                    </div>
                </div>
                <div class="panel-body pb-2">
                    <div class="mini-stats mb-3">
                        <span class="tag info"><i class="fas fa-users"></i>ทั้งหมด ${cur.items.length} ${custom ? 'รายการ' : 'คน'}</span>
                        ${custom ? '' : `<span class="tag" style="--c:#0A84FF"><i class="fas fa-mars"></i>ชาย ${gc.m}</span><span class="tag" style="--c:#FF375F"><i class="fas fa-venus"></i>หญิง ${gc.f}</span>${gc.x ? `<span class="tag"><i class="fas fa-circle-question"></i>ไม่ระบุเพศ ${gc.x}</span>` : ''}`}
                        <span class="tag ok"><i class="fas fa-user-check"></i>${custom ? 'เปิดใช้' : 'มาเรียน'} ${present}</span>
                        ${cur.items.length - present ? `<span class="tag warn"><i class="fas fa-user-slash"></i>${custom ? 'ปิดไว้' : 'ขาดเรียน'} ${cur.items.length - present}</span>` : ''}
                        ${weighted ? `<span class="tag violet"><i class="fas fa-scale-balanced"></i>น้ำหนักมากกว่า 1: ${weighted}</span>` : ''}
                    </div>
                    <div class="page-tools mb-2">
                        <div class="search-box grow"><i class="fas fa-magnifying-glass"></i><input type="search" class="form-control" id="ls-q" placeholder="ค้นหาชื่อ เลขที่ ชื่อเล่น" value="${U.esc(q)}"></div>
                        <button type="button" class="btn-x primary sm" id="ls-add"><i class="fas fa-plus"></i>เพิ่ม${custom ? 'รายการ' : 'รายชื่อ'}</button>
                        <button type="button" class="btn-x ghost sm" id="ls-paste" data-demo-lock="วางรายชื่อจำนวนมาก"><i class="fas fa-paste"></i>วางรายชื่อ</button>
                        <button type="button" class="btn-x ghost sm" id="ls-allin"${present === cur.items.length ? ' disabled' : ''}><i class="fas fa-user-check"></i>${custom ? 'เปิดใช้ทั้งหมด' : 'ทุกคนมาเรียน'}</button>
                        <button type="button" class="btn-x ghost sm" id="ls-w1"${weighted ? '' : ' disabled'}><i class="fas fa-scale-balanced"></i>น้ำหนักทุกคน = 1</button>
                    </div>
                </div>
                <div class="panel-body p-0 dt-wrap">
                    <table class="dt dt-list${custom ? ' is-custom' : ''}">
                        <thead><tr>
                            <th class="num">${custom ? 'ลำดับ' : 'เลขที่'}</th>
                            ${custom ? '<th>รายการ</th>' : '<th>เลขประจำตัว</th><th>ชื่อ - สกุล</th><th>ชื่อเล่น</th><th class="num">เพศ</th>'}
                            <th class="num" title="ใช้เมื่อเปิด ถ่วงน้ำหนัก">น้ำหนัก</th>
                            <th class="num">${custom ? 'เปิดใช้' : 'มาเรียน'}</th>
                            <th class="act"></th>
                        </tr></thead>
                        <tbody>${items.length ? items.map((s) => row(s, custom)).join('') : U.emptyRow(custom ? 5 : 8, 'fa-user-plus', q ? 'ไม่พบรายชื่อที่ค้นหา' : 'ยังไม่มีรายชื่อ — กด "เพิ่มรายชื่อ" หรือ "วางรายชื่อ"')}</tbody>
                    </table>
                </div>
            </div>
            <div class="note"><i class="fas fa-lightbulb"></i><div><b>น้ำหนัก</b> ใช้เมื่อเปิด "ถ่วงน้ำหนัก" ที่หน้าวงล้อ — น้ำหนัก 2 มีโอกาสถูกสุ่มเป็น 2 เท่าของคนที่น้ำหนัก 1 (เช่น ให้โอกาสคนที่ยังไม่เคยตอบมากขึ้น) และช่องบนวงล้อจะกว้างตามโอกาสจริง •
                <b>ขาดเรียน</b> = ไม่อยู่บนวงล้อ และไม่ถูกจัดกลุ่ม/จับฉลาก/จัดที่นั่ง</div></div>`;
        bind(cur);
    }

    function row(s, custom) {
        const g = { m: ['m', 'fa-mars', 'ชาย'], f: ['f', 'fa-venus', 'หญิง'] }[s.gender] || ['x', 'fa-minus', 'ไม่ระบุ'];
        return `<tr data-id="${U.esc(s.id)}" class="${s.active ? '' : 'row-off'}">
            <td class="num"><b>${U.esc(s.no)}</b></td>
            ${custom ? `<td><b>${U.esc(s.firstName)}</b></td>` : `<td class="muted">${U.esc(s.code)}</td><td><b>${U.esc(Engine.fullName(s))}</b></td><td>${U.esc(s.nick)}</td><td class="num"><span class="g-ic ${g[0]}" title="${g[2]}"><i class="fas ${g[1]}"></i></span></td>`}
            <td class="num"><span class="wstep"><button type="button" data-w="-1" aria-label="ลดน้ำหนัก"${s.weight <= 1 ? ' disabled' : ''}><i class="fas fa-minus"></i></button><b class="${s.weight > 1 ? 'is-up' : ''}">${s.weight}</b><button type="button" data-w="1" aria-label="เพิ่มน้ำหนัก"${s.weight >= 10 ? ' disabled' : ''}><i class="fas fa-plus"></i></button></span></td>
            <td class="num"><label class="opt-switch bare" title="${s.active ? 'มา' : 'ขาด'}"><input type="checkbox" data-act="active"${s.active ? ' checked' : ''} aria-label="${custom ? 'เปิดใช้' : 'มาเรียน'}"></label></td>
            <td class="act"><button type="button" class="icon-btn edit" data-act="edit" title="แก้ไข" aria-label="แก้ไข"><i class="fas fa-pen"></i></button> <button type="button" class="icon-btn del" data-act="del" title="ลบ" aria-label="ลบ"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    }

    function bind(cur) {
        const b = root.querySelector('#ls-body');
        const qi = b.querySelector('#ls-q');
        qi.oninput = U.debounce(() => { q = qi.value; update(); const n = root.querySelector('#ls-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250);
        b.querySelector('#ls-edit').onclick = () => editList(cur);
        b.querySelector('#ls-del').onclick = () => delList(cur);
        b.querySelector('#ls-export').onclick = () => exportList(cur);
        b.querySelector('#ls-add').onclick = () => editItem(cur, null);
        b.querySelector('#ls-paste').onclick = () => pasteNames(cur);
        b.querySelector('#ls-allin').onclick = () => { cur.items.forEach((s) => { s.active = true; }); Store.commit('lists'); U.toast(isCustom(cur) ? 'เปิดใช้ทุกรายการแล้ว' : 'ทำเครื่องหมายมาเรียนครบทุกคนแล้ว', { type: 'ok' }); };
        b.querySelector('#ls-w1').onclick = () => { cur.items.forEach((s) => { s.weight = 1; }); Store.commit('lists'); U.toast('ตั้งน้ำหนักทุกคนเป็น 1 แล้ว', { type: 'ok' }); };
        b.querySelectorAll('tr[data-id]').forEach((tr) => {
            const s = cur.items.find((x) => x.id === tr.dataset.id);
            if (!s) return;
            tr.querySelectorAll('[data-w]').forEach((btn) => {
                btn.onclick = () => { s.weight = Math.max(1, Math.min(10, s.weight + +btn.dataset.w)); Store.commit('lists'); };
            });
            tr.querySelector('[data-act="active"]').onchange = (e) => { s.active = e.target.checked; Store.commit('lists'); };
            tr.querySelector('[data-act="edit"]').onclick = () => editItem(cur, s);
            tr.querySelector('[data-act="del"]').onclick = async () => {
                if (!(await U.confirm(`ลบ "${Engine.fullName(s) || s.firstName}"?`, 'ลบออกจากรายชื่อนี้ (ประวัติการสุ่มที่ผ่านมายังอยู่ครบ)', { confirmText: 'ลบ', danger: true }))) return;
                cur.items = cur.items.filter((x) => x.id !== s.id);
                Store.commit('lists', { normalize: true });
            };
        });
    }

    /* ---------- ห้อง / รายการ ---------- */
    async function editList(l, kind) {
        const isNew = !l;
        const k = l ? l.kind : kind;
        const custom = k === 'custom';
        const r = await U.sheet({
            title: isNew ? (custom ? 'เพิ่มรายการกำหนดเอง' : 'เพิ่มห้องเรียน') : 'แก้ไขชื่อ',
            sub: custom ? 'เช่น หัวข้อโครงงาน คำถามท้ายบท ชื่อกลุ่ม — ใช้หมุนวงล้อ/จัดลำดับได้เหมือนรายชื่อ' : 'เช่น ม.2/1 — ในห้องหนึ่งใส่รายชื่อได้ไม่จำกัด',
            icon: custom ? 'fa-list-ul' : 'fa-users',
            tone: ['var(--hero-2)', 'var(--ac)', 'var(--ac-2)'],
            body: `
                <div><label class="form-label" for="ls-name">${custom ? 'ชื่อรายการ' : 'ชื่อห้อง (ชั้น/ห้อง)'}</label>
                    <input class="form-control" id="ls-name" maxlength="80" value="${U.esc(l ? l.name : '')}" placeholder="${custom ? 'หัวข้อโครงงานคอมพิวเตอร์' : 'ม.2/1'}"></div>
                <div><label class="form-label" for="ls-note">หมายเหตุ (ไม่บังคับ)</label>
                    <input class="form-control" id="ls-note" maxlength="120" value="${U.esc(l ? l.note : '')}" placeholder="${custom ? '' : 'เช่น ครูประจำชั้น / วิชาที่สอน'}"></div>`,
            preConfirm: () => {
                const name = U.norm(document.getElementById('ls-name').value);
                if (!name) { Swal.showValidationMessage('กรุณาใส่ชื่อ'); return false; }
                const nn = custom ? name : Store.normClass(name);
                if (Store.data.lists.some((x) => x !== l && x.name === nn && x.kind === k)) { Swal.showValidationMessage(`มี "${nn}" อยู่แล้ว`); return false; }
                return { name: nn, note: U.norm(document.getElementById('ls-note').value) };
            },
        });
        if (!r.isConfirmed) return;
        if (isNew) {
            const n = Object.assign(Store.newList(k), r.value);
            Store.data.lists.push(n);
            Store.data.currentListId = n.id;
            Store.commit('lists', { normalize: true });
            // โหมดทดลองใช้: การวางรายชื่อจำนวนมากถูกล็อก → ให้เพิ่มทีละคนแทน
            if (App.demoActive()) U.toast('เพิ่มแล้ว — กด "เพิ่มรายชื่อ" เพื่อใส่ทีละคน (การวาง/นำเข้ารายชื่อจำนวนมากใช้ได้ในฉบับเต็ม)', { ms: 5000 });
            else pasteNames(Store.list(n.id), true);
        } else {
            Object.assign(l, r.value);
            Store.commit('lists', { normalize: true });
        }
    }

    async function delList(l) {
        const ok = await U.confirm(`ลบ${isCustom(l) ? 'รายการ' : 'ห้อง'} "${l.name}"?`, `รายชื่อ <b>${l.items.length}</b> ${isCustom(l) ? 'รายการ' : 'คน'} จะถูกลบ<br><small>ประวัติการสุ่มที่ผ่านมายังอยู่ครบ • แนะนำให้ "บันทึกไฟล์ข้อมูล" ไว้ก่อน</small>`, { confirmText: 'ลบ', danger: true });
        if (!ok) return;
        Store.data.lists = Store.data.lists.filter((x) => x.id !== l.id);
        delete Store.data.wheel.removed[l.id];
        Store.commit('lists', { normalize: true });
        U.toast(`ลบ "${U.esc(l.name)}" แล้ว`, { type: 'ok' });
    }

    /* ---------- คน ---------- */
    async function editItem(l, s) {
        const custom = isCustom(l);
        const x = s || Object.assign(Store.newItem(), { no: nextNo(l) });
        const r = await U.sheet({
            title: s ? 'แก้ไข' : (custom ? 'เพิ่มรายการ' : 'เพิ่มรายชื่อ'),
            sub: custom ? U.esc(l.name) : `ห้อง ${U.esc(l.name)}`,
            icon: custom ? 'fa-pen' : 'fa-user-pen',
            tone: ['var(--hero-2)', 'var(--ac)', 'var(--ac-2)'],
            body: custom ? `
                <div class="row">
                    <div class="col-3"><label class="form-label" for="it-no">ลำดับ</label><input class="form-control" id="it-no" inputmode="numeric" value="${U.esc(x.no)}"></div>
                    <div class="col-9"><label class="form-label" for="it-first">ข้อความ</label><input class="form-control" id="it-first" maxlength="120" value="${U.esc(x.firstName)}"></div>
                    <div class="col-6"><label class="form-label" for="it-w">น้ำหนัก (1–10)</label><input class="form-control" id="it-w" type="number" min="1" max="10" inputmode="numeric" value="${x.weight}"></div>
                </div>` : `
                <div class="row">
                    <div class="col-4 col-sm-3"><label class="form-label" for="it-no">เลขที่</label><input class="form-control" id="it-no" inputmode="numeric" value="${U.esc(x.no)}"></div>
                    <div class="col-8 col-sm-4"><label class="form-label" for="it-code">เลขประจำตัว</label><input class="form-control" id="it-code" inputmode="numeric" value="${U.esc(x.code)}"></div>
                    <div class="col-12 col-sm-5"><label class="form-label" for="it-prefix">คำนำหน้า</label><select class="form-select" id="it-prefix">${U.options([''].concat(Store.PREFIXES).map((p) => ({ value: p, text: p || '— ไม่ระบุ —' })), x.prefix)}</select></div>
                    <div class="col-sm-6"><label class="form-label" for="it-first">ชื่อ</label><input class="form-control" id="it-first" maxlength="60" value="${U.esc(x.firstName)}"></div>
                    <div class="col-sm-6"><label class="form-label" for="it-last">นามสกุล</label><input class="form-control" id="it-last" maxlength="60" value="${U.esc(x.lastName)}"></div>
                    <div class="col-6 col-sm-4"><label class="form-label" for="it-nick">ชื่อเล่น</label><input class="form-control" id="it-nick" maxlength="30" value="${U.esc(x.nick)}"></div>
                    <div class="col-6 col-sm-4"><label class="form-label" for="it-g">เพศ</label><select class="form-select" id="it-g">${U.options([{ value: '', text: 'ตามคำนำหน้า' }, { value: 'm', text: 'ชาย' }, { value: 'f', text: 'หญิง' }], s ? x.gender : '')}</select></div>
                    <div class="col-12 col-sm-4"><label class="form-label" for="it-w">น้ำหนัก (1–10)</label><input class="form-control" id="it-w" type="number" min="1" max="10" inputmode="numeric" value="${x.weight}"></div>
                </div>`,
            preConfirm: () => {
                const v = (id) => { const e = document.getElementById(id); return e ? U.norm(e.value) : ''; };
                const first = v('it-first');
                if (!first) { Swal.showValidationMessage(custom ? 'กรุณาใส่ข้อความ' : 'กรุณาใส่ชื่อ'); return false; }
                const prefix = v('it-prefix');
                return {
                    no: v('it-no') === '' ? '' : U.toInt(v('it-no'), ''),
                    code: v('it-code'),
                    prefix,
                    firstName: first,
                    lastName: v('it-last'),
                    nick: v('it-nick'),
                    gender: v('it-g') || Engine.genderOf(prefix),
                    weight: Math.max(1, Math.min(10, U.toInt(v('it-w'), 1) || 1)),
                };
            },
        });
        if (!r.isConfirmed) return;
        if (s) Object.assign(s, r.value);
        else l.items.push(Object.assign(x, r.value));
        Store.commit('lists', { normalize: true });
        if (!s) U.toast(`เพิ่ม "${U.esc(r.value.firstName)}" แล้ว`, { type: 'ok' });
    }

    function nextNo(l) {
        const nums = l.items.map((s) => s.no).filter((n) => n !== '');
        return nums.length ? Math.max(...nums) + 1 : l.items.length + 1;
    }

    /** เพิ่มคนลงรายการ: mode 'append' | 'replace' — คนที่ไม่มีเลขที่ได้เลขต่อท้ายอัตโนมัติ */
    function addPeople(l, people, mode) {
        if (mode === 'replace') { l.items = []; delete Store.data.wheel.removed[l.id]; }
        let n = nextNo(l);
        people.forEach((p) => {
            const no = p.no !== '' && p.no != null ? p.no : n;
            l.items.push(Object.assign(Store.newItem(), {
                no, code: p.code, prefix: p.prefix, firstName: p.firstName, lastName: p.lastName, nick: p.nick, gender: p.gender, weight: p.weight || 1,
            }));
            n = Math.max(n, no + 1);
        });
    }

    /* วางรายชื่อ (หนึ่งคนต่อบรรทัด หรือคัดลอกทั้งตารางจาก Excel) */
    async function pasteNames(l, fresh) {
        if (!App.demoAllow('วางรายชื่อจำนวนมาก')) return;
        const custom = isCustom(l);
        let parsed = null;
        const r = await U.sheet({
            title: custom ? 'วางรายการ' : 'วางรายชื่อ',
            sub: l ? `${custom ? '' : 'ห้อง '}${U.esc(l.name)}` : 'สร้างห้องเรียนใหม่จากรายชื่อที่วาง',
            icon: 'fa-paste',
            tone: ['var(--hero-2)', 'var(--ac)', 'var(--ac-2)'],
            width: 720,
            confirmText: '<i class="fas fa-check"></i> เพิ่มรายชื่อ',
            body: `
                ${l ? '' : `<div><label class="form-label" for="pn-name">ชื่อห้อง (ชั้น/ห้อง)</label><input class="form-control" id="pn-name" placeholder="ม.2/1" maxlength="40"></div>`}
                <div><label class="form-label" for="pn-text">${custom ? 'หนึ่งรายการต่อบรรทัด' : 'หนึ่งคนต่อบรรทัด — หรือคัดลอกทั้งตารางจาก Excel มาวาง (มีหัวคอลัมน์ก็ได้)'}</label>
                    <textarea class="form-control" id="pn-text" rows="9" placeholder="${custom ? 'เกมตอบคำถามด้วย Scratch\nหุ่นยนต์เดินตามเส้น\n...' : 'ด.ช.ภูมิพัฒน์ ศรีสุข\nด.ญ.ณัฐธิดา ทองดี\n...\n\nหรือ  1⇥ด.ช.⇥ภูมิพัฒน์⇥ศรีสุข'}"></textarea>
                    <div class="field-help" id="pn-info">ระบบแยกคำนำหน้า ชื่อ นามสกุล ให้อัตโนมัติ • "เด็กชาย/เด็กหญิง" แปลงเป็น ด.ช./ด.ญ. • เลขไทยใช้ได้</div></div>
                ${l && l.items.length ? `<div class="d-flex gap-3 flex-wrap"><label class="check-line"><input type="radio" name="pn-mode" value="append" checked> เพิ่มต่อจากรายชื่อเดิม (${l.items.length})</label><label class="check-line"><input type="radio" name="pn-mode" value="replace"> แทนที่รายชื่อเดิมทั้งหมด</label></div>` : ''}`,
            didOpen: (el) => {
                const ta = el.querySelector('#pn-text');
                const info = el.querySelector('#pn-info');
                ta.addEventListener('input', U.debounce(() => {
                    parsed = ta.value.trim() ? IO.parseText(ta.value, { custom }) : null;
                    if (!parsed) { info.textContent = 'ยังไม่ได้วางรายชื่อ'; return; }
                    const g = Store.genderCount(parsed.people);
                    info.innerHTML = `<b>พบ ${parsed.people.length} ${custom ? 'รายการ' : 'คน'}</b>${custom ? '' : ` (ชาย ${g.m} • หญิง ${g.f}${g.x ? ` • ไม่ระบุเพศ ${g.x}` : ''})`}${parsed.header ? ' • พบหัวคอลัมน์' : ''}${parsed.bad.length ? ` • <span style="color:#be123c">ข้าม ${parsed.bad.length} แถวที่ไม่มีชื่อ</span>` : ''}${parsed.classes.length > 1 ? ` • พบหลายห้อง (${parsed.classes.map(U.esc).join(', ')}) — แนะนำให้ใช้ "นำเข้าไฟล์ Excel"` : ''}`;
                }, 200));
            },
            preConfirm: () => {
                const ta = document.getElementById('pn-text');
                parsed = ta.value.trim() ? IO.parseText(ta.value, { custom }) : null;
                if (!parsed || !parsed.people.length) { Swal.showValidationMessage('ยังไม่มีรายชื่อที่อ่านได้'); return false; }
                let name = '';
                if (!l) {
                    name = Store.normClass(document.getElementById('pn-name').value) || parsed.classes[0] || '';
                    if (!name) { Swal.showValidationMessage('กรุณาใส่ชื่อห้อง'); return false; }
                }
                const m = document.querySelector('input[name="pn-mode"]:checked');
                return { name, mode: m ? m.value : 'append' };
            },
        });
        if (!r.isConfirmed) {
            if (fresh) U.toast('สร้างแล้ว — เพิ่มรายชื่อได้ภายหลังด้วยปุ่ม "วางรายชื่อ" หรือ "เพิ่มรายชื่อ"', { ms: 4000 });
            return;
        }
        let target = l;
        if (!target) {
            target = Store.data.lists.find((x) => x.kind === 'class' && x.name === r.value.name);
            if (!target) { target = Object.assign(Store.newList('class'), { name: r.value.name }); Store.data.lists.push(target); }
        }
        if (r.value.mode === 'replace' && !(await U.confirm('แทนที่รายชื่อเดิม?', `รายชื่อเดิม ${target.items.length} คนจะถูกลบและแทนด้วย ${parsed.people.length} คน`, { confirmText: 'แทนที่', danger: true }))) return;
        addPeople(target, parsed.people, r.value.mode);
        Store.data.currentListId = target.id;
        Store.commit('lists', { normalize: true });
        U.toast(`เพิ่ม ${parsed.people.length} ${custom ? 'รายการ' : 'คน'} ลง "${U.esc(target.name)}" แล้ว`, { type: 'ok' });
    }

    /* นำเข้าไฟล์ Excel/CSV (มีคอลัมน์ชั้น/ห้อง = แยกหลายห้องให้อัตโนมัติ) */
    async function importExcel() {
        if (!App.demoAllow('นำเข้ารายชื่อจาก Excel')) return;
        const file = await U.pickFile('.xlsx,.xls,.csv,.txt');
        if (!file) return;
        let sheets;
        try { sheets = await IO.readFile(file); } catch (e) {
            console.error(e);
            U.alert('อ่านไฟล์ไม่สำเร็จ', `ไฟล์ ${U.esc(file.name)} อาจเสียหายหรือไม่ใช่ไฟล์ Excel/CSV`, 'error');
            return;
        }
        // รวมทุกแผ่นงานที่มีรายชื่อ (แผ่น "คำอธิบาย" ของไฟล์แม่แบบจะไม่มีชื่อที่อ่านได้)
        const people = [];
        let bad = 0;
        sheets.forEach((sh) => {
            if (/คำอธิบาย/.test(sh.name)) return;
            const p = IO.parseRows(sh.rows);
            p.people.forEach((x) => { if (!x.cls && sheets.length > 1 && /^[มปอ]\.?\s*\d/.test(sh.name)) x.cls = Store.normClass(sh.name); });
            people.push(...p.people);
            bad += p.bad.length;
        });
        if (!people.length) { U.alert('ไม่พบรายชื่อในไฟล์', 'ตรวจสอบว่ามีคอลัมน์ชื่อ (หรือชื่อ-สกุล) — ดาวน์โหลด "ไฟล์แม่แบบ Excel" เพื่อดูตัวอย่าง', 'warning'); return; }
        const cur = L();
        const groups = new Map();
        people.forEach((p) => {
            const key = p.cls || '';
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(p);
        });
        const noCls = groups.get('') || [];
        const r = await U.sheet({
            title: 'นำเข้ารายชื่อจาก Excel',
            sub: `${U.esc(file.name)} • พบ ${people.length} คน${bad ? ` • ข้าม ${bad} แถวที่ไม่มีชื่อ` : ''}`,
            icon: 'fa-file-excel',
            tone: ['var(--hero-2)', 'var(--ac)', 'var(--ac-2)'],
            width: 720,
            confirmText: '<i class="fas fa-file-import"></i> นำเข้า',
            body: `
                <div class="dt-wrap" style="max-height:260px;border:1px solid var(--line);border-radius:12px">
                    <table class="dt"><thead><tr><th>ห้อง</th><th class="num">จำนวน</th><th>ตัวอย่าง</th><th>ผลลัพธ์</th></tr></thead><tbody>
                    ${[...groups.entries()].map(([k, arr]) => {
                        const exist = k ? Store.data.lists.find((x) => x.kind === 'class' && x.name === k) : cur;
                        return `<tr><td><b>${U.esc(k || (cur ? cur.name : 'ห้องใหม่'))}</b>${k ? '' : '<div class="text-muted-2" style="font-size:.74rem">(ไม่มีคอลัมน์ชั้น/ห้อง)</div>'}</td><td class="num">${arr.length}</td>
                            <td class="muted">${arr.slice(0, 3).map((p) => U.esc(`${p.prefix}${p.firstName} ${p.lastName}`.trim())).join(', ')}${arr.length > 3 ? ' …' : ''}</td>
                            <td>${exist ? `<span class="tag info">มีอยู่แล้ว (${exist.items.length} คน)</span>` : '<span class="tag ok">สร้างห้องใหม่</span>'}</td></tr>`;
                    }).join('')}</tbody></table></div>
                ${noCls.length && !cur ? `<div><label class="form-label" for="ix-name">ชื่อห้องสำหรับรายชื่อที่ไม่ระบุชั้น/ห้อง</label><input class="form-control" id="ix-name" placeholder="ม.2/1"></div>` : ''}
                <div class="d-flex gap-3 flex-wrap"><label class="check-line"><input type="radio" name="ix-mode" value="append" checked> เพิ่มต่อจากรายชื่อเดิม</label><label class="check-line"><input type="radio" name="ix-mode" value="replace"> แทนที่รายชื่อเดิมของห้องที่มีอยู่แล้ว</label></div>`,
            preConfirm: () => {
                const nm = document.getElementById('ix-name');
                const name = nm ? Store.normClass(nm.value) : '';
                if (nm && !name) { Swal.showValidationMessage('กรุณาใส่ชื่อห้อง'); return false; }
                return { name, mode: document.querySelector('input[name="ix-mode"]:checked').value };
            },
        });
        if (!r.isConfirmed) return;
        let first = null;
        let total = 0;
        groups.forEach((arr, k) => {
            let target;
            if (k) target = Store.data.lists.find((x) => x.kind === 'class' && x.name === k);
            else target = cur || Store.data.lists.find((x) => x.kind === 'class' && x.name === r.value.name);
            if (!target) {
                target = Object.assign(Store.newList('class'), { name: k || r.value.name });
                Store.data.lists.push(target);
            }
            addPeople(target, arr, r.value.mode);
            total += arr.length;
            if (!first) first = target;
        });
        if (first) Store.data.currentListId = first.id;
        Store.commit('lists', { normalize: true });
        U.toast(`นำเข้า ${total} คน (${groups.size} ห้อง) แล้ว`, { type: 'ok', ms: 4000 });
    }

    function exportList(l) {
        const custom = isCustom(l);
        const rows = custom
            ? [['ลำดับ', 'รายการ', 'น้ำหนัก', 'เปิดใช้']].concat(Store.sortedItems(l).map((s) => [s.no, s.firstName, s.weight, s.active ? 'ใช่' : 'ไม่']))
            : [['เลขที่', 'เลขประจำตัว', 'คำนำหน้า', 'ชื่อ', 'สกุล', 'ชื่อเล่น', 'เพศ', 'ชั้น/ห้อง', 'น้ำหนัก', 'มาเรียน']].concat(Store.sortedItems(l).map((s) => [s.no, s.code, s.prefix, s.firstName, s.lastName, s.nick, s.gender === 'm' ? 'ชาย' : s.gender === 'f' ? 'หญิง' : '', l.name, s.weight, s.active ? 'มา' : 'ขาด']));
        const name = IO.writeBook(`รายชื่อ_${l.name}_${U.stamp()}`, [{ name: l.name, rows, widths: custom ? [7, 50, 8, 8] : [7, 12, 9, 16, 18, 10, 6, 9, 8, 8] }]);
        U.toast(`ส่งออก <b>${U.esc(name)}</b> แล้ว`, { type: 'ok' });
    }

    function refresh() { update(); }
    function leave() { root = null; }

    window.Views = window.Views || {};
    window.Views.lists = { render, refresh, leave, addPeople };
})();
