/* ชุดคำ / คำถาม-คำตอบ: รายการชุด + ตัวแก้ไข (แก้ทีละคำ วางหลายบรรทัด ตรวจคำซ้ำ ส่งออก Excel) */
(function () {
    'use strict';

    let root = null;
    let params = {};
    let filter = '';

    function render(el, p) {
        root = el;
        params = p || {};
        if (params.new) { createSet(); return; }
        const d = Store.data;
        const cur = params.id ? Store.set(params.id) : d.sets[0] || null;
        el.innerHTML = `
            ${U.hero({ icon: 'fa-layer-group', title: 'ชุดคำ / คำถาม-คำตอบ', sub: 'ทุกวิชา: คำศัพท์ภาษาอังกฤษ โจทย์คณิต คำถามวิทย์ ราชาศัพท์ ฯลฯ • คำบนการ์ด = คำตอบ • สิ่งที่ครูเรียก = คำถาม/ความหมาย (เว้นว่างได้ ระบบจะเรียกคำบนการ์ดเลย)',
                side: `<button type="button" class="hero-btn" data-act="new"><i class="fas fa-plus"></i>ชุดคำใหม่</button><a class="hero-btn ghost" href="#/import"><i class="fas fa-file-excel"></i>นำเข้าจาก Excel</a>` })}
            <div class="sets-layout">
                <div class="set-list">${d.sets.length ? d.sets.map((s) => setTile(s, cur)).join('') : ''}</div>
                <div class="set-editor">${cur ? editor(cur) : empty()}</div>
            </div>`;
        el.querySelector('[data-act="new"]').onclick = createSet;
        el.querySelectorAll('.set-tile').forEach((t) => { t.onclick = () => App.go('sets', { id: t.dataset.id }); });
        if (cur) bindEditor(el, cur);
        const n2 = el.querySelector('[data-act="new2"]');
        if (n2) n2.onclick = createSet;
    }

    function setTile(s, cur) {
        return `<button type="button" class="set-tile${cur && cur.id === s.id ? ' active' : ''}" data-id="${s.id}">
            <span class="ic-box sm" style="--a:${U.hashColor(s.subject)};--b:var(--ac-2)"><i class="fas ${subjectIcon(s.subject)}"></i></span>
            <span class="st-body"><b>${U.esc(s.name || 'ชุดคำไม่มีชื่อ')}</b><small>${U.esc(s.subject)} • ${U.esc(s.level)} • ${s.items.length} คำ</small></span>
        </button>`;
    }
    function subjectIcon(sub) {
        return { 'ภาษาอังกฤษ': 'fa-language', 'คณิตศาสตร์': 'fa-calculator', 'วิทยาศาสตร์': 'fa-flask', 'ภาษาไทย': 'fa-book', 'สังคมศึกษา': 'fa-earth-asia', 'ภาษาจีน': 'fa-language', 'ประวัติศาสตร์': 'fa-landmark', 'วิทยาการคำนวณ': 'fa-laptop-code' }[sub] || 'fa-shapes';
    }
    function empty() {
        return `<div class="panel"><div class="panel-body"><div class="empty-state">
            <span class="ic-box lg" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-layer-group"></i></span>
            <h3>ยังไม่มีชุดคำ</h3><div>สร้างชุดคำใหม่ นำเข้าจาก Excel หรือโหลดข้อมูลตัวอย่าง 5 วิชาที่หน้า "สำรอง / เปิดไฟล์ข้อมูล"</div>
            <button type="button" class="btn-x primary" data-act="new2"><i class="fas fa-plus"></i>สร้างชุดคำใหม่</button>
        </div></div></div>`;
    }

    function editor(s) {
        const dup = Bingo.duplicates(s.items);
        const blank = s.items.filter((i) => !i.a.trim()).length;
        const q = U.normKey(filter);
        const list = s.items.map((it, i) => ({ it, i })).filter((x) => !q || U.normKey(x.it.q + x.it.a).includes(q));
        return `
            <div class="panel panel--theme">
                <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-pen-to-square"></i></span><div><h3>${U.esc(s.name || 'ชุดคำไม่มีชื่อ')}</h3><small>${s.items.length} คำ • การ์ด 5×5 ใช้ 24 คำ, 4×4 ใช้ 16 คำ, 3×3 ใช้ 8 คำ (มี FREE)</small></div>
                    <div class="panel-tools">
                        <a class="btn-x primary sm" href="#/games?new=1&set=${s.id}"><i class="fas fa-wand-magic-sparkles"></i>สร้างการ์ดจากชุดนี้</a>
                        <div class="dropdown">
                            <button class="btn-x ghost sm" type="button" data-bs-toggle="dropdown" aria-label="เมนูเพิ่มเติม"><i class="fas fa-ellipsis"></i></button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><button class="dropdown-item" type="button" data-act="xlsx"><i class="fas fa-file-excel me-2"></i>ส่งออกเป็น Excel</button></li>
                                <li><button class="dropdown-item" type="button" data-act="copy"><i class="fas fa-copy me-2"></i>ทำสำเนาชุดคำ</button></li>
                                <li><button class="dropdown-item text-danger" type="button" data-act="del-set"><i class="fas fa-trash-can me-2"></i>ลบชุดคำนี้</button></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="panel-body">
                    <div class="form-grid">
                        <div class="fg-wide"><label class="form-label">ชื่อชุดคำ</label><input class="form-control" data-f="name" value="${U.esc(s.name)}" placeholder="เช่น คำศัพท์หมวดสัตว์"></div>
                        <div><label class="form-label">วิชา</label><select class="form-select" data-f="subject">${U.options(Store.SUBJECTS.includes(s.subject) ? Store.SUBJECTS : [s.subject, ...Store.SUBJECTS], s.subject)}</select></div>
                        <div><label class="form-label">ระดับชั้น</label><select class="form-select" data-f="level">${U.options(Store.LEVELS, s.level)}</select></div>
                        <div class="fg-wide"><label class="form-label">วิธีเล่น / หมายเหตุ</label><input class="form-control" data-f="note" value="${U.esc(s.note)}" placeholder="เช่น ครูเรียกคำภาษาไทย นักเรียนหาคำภาษาอังกฤษ"></div>
                    </div>
                    ${dup.length ? `<div class="note bad mt-3"><i class="fas fa-circle-exclamation"></i><div>คำบนการ์ดซ้ำกัน: <b>${dup.map(U.esc).join(', ')}</b> — นักเรียนจะสับสน กรุณาแก้ให้ไม่ซ้ำ</div></div>` : ''}
                    ${blank ? `<div class="note warn mt-3"><i class="fas fa-triangle-exclamation"></i><div>มี ${blank} แถวที่ยังไม่มีคำบนการ์ด (จะไม่ถูกนำไปสร้างการ์ด)</div></div>` : ''}
                    <div class="items-tools">
                        <div class="search-box"><i class="fas fa-magnifying-glass"></i><input class="form-control" id="it-search" placeholder="ค้นหาคำ" value="${U.esc(filter)}"></div>
                        <button type="button" class="btn-x ghost sm" data-act="paste" data-demo-lock="วางคำจำนวนมาก"><i class="fas fa-paste"></i>วางหลายบรรทัด</button>
                        <button type="button" class="btn-x green sm" data-act="add"><i class="fas fa-plus"></i>เพิ่มคำ</button>
                    </div>
                    <div class="items-head"><span>ที่</span><span>สิ่งที่ครูเรียก (คำถาม/ความหมาย)</span><span>คำบนการ์ด (คำตอบ)</span><span></span></div>
                    <div class="items" id="items">
                        ${list.length ? list.map(({ it, i }) => `
                        <div class="item-row${dup.includes(U.norm(it.a).toLowerCase()) ? ' is-dup' : ''}" data-id="${it.id}">
                            <span class="ir-no">${i + 1}</span>
                            <input class="form-control" data-k="q" value="${U.esc(it.q)}" placeholder="คำถาม (ไม่บังคับ)" aria-label="สิ่งที่ครูเรียก ข้อ ${i + 1}">
                            <input class="form-control ir-a" data-k="a" value="${U.esc(it.a)}" placeholder="คำบนการ์ด" aria-label="คำบนการ์ด ข้อ ${i + 1}">
                            <button type="button" class="icon-btn del" data-del="${it.id}" title="ลบคำนี้" aria-label="ลบคำนี้"><i class="fas fa-trash-can"></i></button>
                        </div>`).join('') : `<div class="empty-state sm"><span class="ic-box" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-font"></i></span><h3>${filter ? 'ไม่พบคำที่ค้นหา' : 'ยังไม่มีคำในชุดนี้'}</h3><div>กด "เพิ่มคำ" หรือ "วางหลายบรรทัด" จาก Excel/Word</div></div>`}
                    </div>
                    <div class="hint mt-2"><i class="fas fa-keyboard"></i> กด <kbd>Enter</kbd> ในช่องคำบนการ์ดเพื่อเพิ่มแถวใหม่ • ระบบบันทึกอัตโนมัติ</div>
                </div>
            </div>`;
    }

    function touch(s, quiet) { s.updatedAt = new Date().toISOString(); Store.commit(quiet ? 'quiet' : 'change'); }

    function bindEditor(el, s) {
        el.querySelectorAll('[data-f]').forEach((inp) => {
            inp.onchange = () => { s[inp.dataset.f] = U.norm(inp.value); touch(s); };
        });
        el.querySelectorAll('.item-row input').forEach((inp) => {
            inp.oninput = () => {
                const it = s.items.find((x) => x.id === inp.closest('.item-row').dataset.id);
                if (it) { it[inp.dataset.k] = inp.value; touch(s, true); }
            };
            inp.onchange = () => { const it = s.items.find((x) => x.id === inp.closest('.item-row').dataset.id); if (it) it[inp.dataset.k] = U.norm(inp.value); touch(s); };
            if (inp.dataset.k === 'a') inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(s, inp.closest('.item-row').dataset.id); } };
        });
        el.querySelectorAll('[data-del]').forEach((b) => {
            b.onclick = async () => {
                const it = s.items.find((x) => x.id === b.dataset.del);
                if (!it) return;
                if (!(await U.confirm('ลบคำนี้?', `<b>${U.esc(it.a || it.q || '(ว่าง)')}</b><br><small>การ์ดที่สร้างไว้แล้วซึ่งมีคำนี้จะต้องสร้างใหม่</small>`, { confirmText: 'ลบ', danger: true }))) return;
                s.items = s.items.filter((x) => x.id !== it.id);
                touch(s);
            };
        });
        const search = el.querySelector('#it-search');
        search.oninput = U.debounce(() => { filter = search.value; render(root, { id: s.id }); const n = root.querySelector('#it-search'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250);
        el.querySelector('[data-act="add"]').onclick = () => addItem(s);
        el.querySelector('[data-act="paste"]').onclick = () => pasteMany(s);
        el.querySelector('[data-act="xlsx"]').onclick = () => exportXlsx(s);
        el.querySelector('[data-act="copy"]').onclick = () => {
            const c = Object.assign(U.clone(s), { id: U.uid('set'), name: `${s.name} (สำเนา)` });
            c.items = c.items.map((it) => Object.assign(it, { id: U.uid('it') }));
            Store.data.sets.push(c);
            Store.commit();
            App.go('sets', { id: c.id });
        };
        el.querySelector('[data-act="del-set"]').onclick = async () => {
            const used = Store.data.games.filter((g) => g.setId === s.id);
            if (!(await U.confirm('ลบชุดคำนี้?', `<b>${U.esc(s.name)}</b> (${s.items.length} คำ)${used.length ? `<br><span class="text-danger">มีชุดการ์ด ${used.length} เกมใช้ชุดคำนี้อยู่ — เกมเหล่านั้นจะถูกลบด้วย</span>` : ''}`, { confirmText: 'ลบชุดคำ', danger: true }))) return;
            Store.data.sets = Store.data.sets.filter((x) => x.id !== s.id);
            Store.data.games = Store.data.games.filter((g) => g.setId !== s.id);
            Store.commit();
            U.toast('ลบชุดคำแล้ว', { type: 'ok' });
            App.go('sets');
        };
    }

    function addItem(s, afterId) {
        const it = Store.newItem();
        const i = afterId ? s.items.findIndex((x) => x.id === afterId) : -1;
        if (i >= 0) s.items.splice(i + 1, 0, it); else s.items.push(it);
        filter = '';
        touch(s);
        const row = root.querySelector(`.item-row[data-id="${it.id}"] input`);
        if (row) { row.focus(); row.scrollIntoView({ block: 'center' }); }
    }

    async function createSet() {
        const r = await U.sheet({
            title: 'ชุดคำใหม่', icon: 'fa-layer-group', tone: ['#9d174d', '#db2777', '#fb923c'],
            body: `<div class="form-grid">
                <div class="fg-wide"><label class="form-label">ชื่อชุดคำ</label><input class="form-control" id="ns-name" placeholder="เช่น คำศัพท์หมวดผลไม้ (Fruits)"></div>
                <div><label class="form-label">วิชา</label><select class="form-select" id="ns-sub">${U.options(Store.SUBJECTS, 'ภาษาอังกฤษ')}</select></div>
                <div><label class="form-label">ระดับชั้น</label><select class="form-select" id="ns-lv">${U.options(Store.LEVELS, 'ป.4')}</select></div>
            </div>`,
            confirmText: '<i class="fas fa-plus"></i> สร้างชุดคำ',
            preConfirm: () => {
                const name = U.norm(document.getElementById('ns-name').value);
                if (!name) { Swal.showValidationMessage('กรุณาตั้งชื่อชุดคำ'); return false; }
                return { name, subject: document.getElementById('ns-sub').value, level: document.getElementById('ns-lv').value };
            },
        });
        if (!r.isConfirmed) { if (params.new) App.go('sets'); return; }
        const s = Object.assign(Store.newSet(), r.value);
        s.items = [Store.newItem()];
        Store.data.sets.push(s);
        Store.commit();
        App.go('sets', { id: s.id });
    }

    /* วางหลายบรรทัด: "คำถาม<Tab>คำตอบ" หรือ "คำถาม = คำตอบ" หรือคำเดียว */
    async function pasteMany(s) {
        if (!VSDemo.allow('วางคำจำนวนมาก')) return;
        const r = await U.sheet({
            title: 'วางคำหลายบรรทัด', icon: 'fa-paste', tone: ['#9d174d', '#db2777', '#fb923c'], width: 720,
            body: `<div class="note"><i class="fas fa-circle-info"></i><div>บรรทัดละ 1 คำ • คัดลอก 2 คอลัมน์จาก Excel มาวางได้เลย (คำถาม | คำตอบ) • หรือพิมพ์ <code>คำถาม = คำตอบ</code> • บรรทัดที่มีคำเดียว = คำบนการ์ด</div></div>
                <textarea class="form-control" id="pm-text" rows="10" placeholder="แมว\tcat&#10;สุนัข = dog&#10;apple"></textarea>`,
            confirmText: '<i class="fas fa-plus"></i> เพิ่มคำ',
            preConfirm: () => {
                const rows = parseLines(document.getElementById('pm-text').value);
                if (!rows.length) { Swal.showValidationMessage('ยังไม่มีคำที่จะเพิ่ม'); return false; }
                return rows;
            },
        });
        if (!r.isConfirmed) return;
        s.items = s.items.filter((x) => x.a.trim() || x.q.trim());
        r.value.forEach((p) => s.items.push(Store.newItem(p[0], p[1])));
        touch(s);
        U.toast(`เพิ่มแล้ว ${r.value.length} คำ`, { type: 'ok' });
    }
    function parseLines(text) {
        return String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
            let p = l.split('\t');
            if (p.length < 2 && l.includes('=')) p = l.split('=');
            if (p.length < 2) return ['', U.norm(p[0])];
            return [U.norm(p[0]), U.norm(p.slice(1).join(' '))];
        }).filter((p) => p[1]);
    }

    function exportXlsx(s) {
        const rows = [['สิ่งที่ครูเรียก (คำถาม/ความหมาย)', 'คำบนการ์ด (คำตอบ)'], ...s.items.map((it) => [it.q, it.a])];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 50 }, { wch: 28 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'ชุดคำ');
        XLSX.writeFile(wb, `${U.safeFileName(`ชุดคำบิงโก_${s.name}`)}.xlsx`);
    }

    window.SetsView = { parseLines };
    window.Views = window.Views || {};
    window.Views.sets = { render, refresh: () => render(root, { id: params.id || (Store.data.sets[0] || {}).id }) };
})();
