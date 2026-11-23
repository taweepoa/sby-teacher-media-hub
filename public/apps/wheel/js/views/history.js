/* =====================================================================
   ประวัติการสุ่ม: ทุกครั้งที่สุ่มบันทึกพร้อมวันเวลา • กรองตามประเภท/ห้อง/ช่วงเวลา/คำค้น
   ดูรายละเอียด • ลบ • ส่งออก Excel (ประวัติ + สรุปรายคนว่าถูกสุ่มกี่ครั้ง + รายละเอียดกลุ่ม)
   ===================================================================== */
(function () {
    'use strict';

    let root = null;
    const f = { mode: '', list: '', range: 'all', q: '' };
    let limit = 100;

    const pname = (p) => (p ? (p.name || p.first || '') : '');
    const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

    /** สรุปผลการสุ่มสั้น ๆ (ใช้ในตาราง/หน้าหลัก) */
    function summary(h) {
        const d = h.data || {};
        switch (h.mode) {
            case 'wheel': return `${d.person && d.person.no !== '' && d.person.no != null ? `เลขที่ ${d.person.no} ` : ''}${pname(d.person)}`;
            case 'group': return `${(d.groups || []).length} กลุ่ม • ${d.total || 0} คน${d.opts && d.opts.mixGender ? ' • คละเพศ' : ''}${d.opts && d.opts.leaders ? ' • มีหัวหน้ากลุ่ม' : ''}`;
            case 'order': return `${(d.items || []).length} ลำดับ • ลำดับแรก: ${d.items && d.items[0] ? d.items[0].label : '-'}`;
            case 'number': return clip(`${(d.numbers || []).map((n, i) => (d.names && d.names[i] ? `${n} (${d.names[i]})` : n)).join(', ')}`, 90);
            case 'prize': return `${(d.draws || []).length} รางวัล${d.done ? ' • ครบแล้ว' : ' • ยังจับไม่ครบ'}${d.draws && d.draws[0] ? ` • ${d.draws[0].prize}: ${pname(d.draws[0].person)}` : ''}`;
            case 'seat': return `${d.rows} × ${d.cols} ที่นั่ง • ${(d.grid || []).flat().filter(Boolean).length} คน${d.alternate ? ' • สลับชาย-หญิง' : ''}`;
            default: return '';
        }
    }

    /** รายละเอียดเต็ม (HTML) */
    function detail(h) {
        const d = h.data || {};
        const esc = U.esc;
        switch (h.mode) {
            case 'wheel': return `<dl class="detail-grid"><dt>ผู้ถูกสุ่ม</dt><dd>${esc(pname(d.person))}</dd><dt>เลขที่</dt><dd>${esc(d.person && d.person.no)}</dd><dt>บนวงล้อขณะสุ่ม</dt><dd>${d.pool || '-'} คน${d.round ? ` • รอบที่ ${d.round}` : ''}</dd><dt>วิธีสุ่ม</dt><dd>${d.weighted ? 'ถ่วงน้ำหนัก' : 'ทุกคนโอกาสเท่ากัน'}</dd></dl>`;
            case 'group': return `<div class="hist-groups">${(d.groups || []).map((g) => `<div><b>กลุ่มที่ ${g.no}</b><ol>${g.members.map((m) => `<li>${esc(m.no)}. ${esc(pname(m))}${m.id === g.leaderId ? ' <span class="tag warn">หัวหน้า</span>' : ''}</li>`).join('')}</ol></div>`).join('')}</div>`;
            case 'order': return `<ol class="hist-order">${(d.items || []).map((it, i) => `<li><b>${esc(it.label)}</b>${it.sub ? ` <small>${esc(it.sub)}</small>` : ''}${d.done && d.done[i] ? ' <span class="tag ok">นำเสนอแล้ว</span>' : ''}</li>`).join('')}</ol>`;
            case 'number': return `<div class="nd-list light">${(d.numbers || []).map((n, i) => `<span>${n}${d.names && d.names[i] ? ` <small>${esc(d.names[i])}</small>` : ''}</span>`).join('')}</div><div class="field-help mt-2">ช่วง ${d.min}–${d.max}${d.unique ? ' • ไม่ซ้ำ' : ''}</div>`;
            case 'prize': return `<table class="dt"><thead><tr><th class="num">ที่</th><th>รางวัล</th><th>ผู้ได้รับ</th></tr></thead><tbody>${(d.draws || []).map((x, i) => `<tr><td class="num">${i + 1}</td><td>${esc(x.prize)}</td><td><b>${esc(pname(x.person))}</b> <small class="text-muted-2">${x.person.no !== '' ? `เลขที่ ${esc(x.person.no)}` : ''}</small></td></tr>`).join('') || U.emptyRow(3, 'fa-gift', 'ยังไม่ได้จับ')}</tbody></table>`;
            case 'seat': return `<div class="mini-seats" style="--cols:${d.cols}">${(d.grid || []).flat().map((p) => `<span class="${p ? `g-${p.gender || 'x'}` : 'is-empty'}">${p ? esc(p.first) : ''}</span>`).join('')}</div><div class="field-help mt-1">แถวบน = หน้าห้อง (ใกล้กระดาน)</div>`;
            default: return '';
        }
    }

    function filtered() {
        const now = Date.now();
        const day = 86400000;
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const from = { all: 0, today: start.getTime(), d7: now - 7 * day, d30: now - 30 * day }[f.range] || 0;
        const q = f.q.trim().toLowerCase();
        return Store.data.history.filter((h) => (!f.mode || h.mode === f.mode)
            && (!f.list || h.listId === f.list)
            && new Date(h.at).getTime() >= from
            && (!q || `${h.title} ${h.listName} ${summary(h)} ${JSON.stringify(h.data)}`.toLowerCase().includes(q)));
    }

    function render(el) {
        root = el;
        limit = 100;
        el.innerHTML = `
            ${U.hero({
                cls: 'hero--history',
                icon: 'fa-clock-rotate-left',
                title: 'ประวัติการสุ่ม',
                sub: 'บันทึกทุกครั้งที่สุ่มพร้อมวันเวลา ใช้เป็นหลักฐานความโปร่งใส ส่งออก Excel พร้อมสรุปว่าแต่ละคนถูกสุ่มกี่ครั้ง',
                side: `<button type="button" class="hero-btn" id="hs-xlsx"><i class="fas fa-file-excel"></i>ส่งออก Excel</button>
                       <button type="button" class="hero-btn ghost" id="hs-clear" data-demo-lock="ล้างประวัติการสุ่มทั้งหมด"><i class="fas fa-trash"></i>ล้างประวัติ</button>`,
            })}
            <div class="dash-grid hist-stats" id="hs-stats"></div>
            <div class="panel panel--theme">
                <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-filter"></i></span><div><h3>รายการ</h3><small id="hs-count"></small></div>
                    <div class="panel-tools hist-filters">
                        <select class="form-select form-select-sm" id="hs-mode" aria-label="ประเภท">${U.options([{ value: '', text: 'ทุกประเภท' }].concat(Object.keys(Store.MODES).map((k) => ({ value: k, text: Store.MODES[k].label }))), f.mode)}</select>
                        <select class="form-select form-select-sm" id="hs-list" aria-label="ห้อง">${U.options([{ value: '', text: 'ทุกห้อง/รายการ' }].concat(Store.data.lists.map((l) => ({ value: l.id, text: l.name }))), f.list)}</select>
                        <select class="form-select form-select-sm" id="hs-range" aria-label="ช่วงเวลา">${U.options([{ value: 'all', text: 'ทั้งหมด' }, { value: 'today', text: 'วันนี้' }, { value: 'd7', text: '7 วันล่าสุด' }, { value: 'd30', text: '30 วันล่าสุด' }], f.range)}</select>
                        <div class="search-box"><i class="fas fa-magnifying-glass"></i><input type="search" class="form-control form-control-sm" id="hs-q" placeholder="ค้นหาชื่อ/กิจกรรม" value="${U.esc(f.q)}"></div>
                    </div></div>
                <div class="panel-body p-0 dt-wrap" id="hs-table"></div>
            </div>`;
        el.querySelector('#hs-xlsx').onclick = exportExcel;
        el.querySelector('#hs-clear').onclick = clearAll;
        el.querySelector('#hs-mode').onchange = (e) => { f.mode = e.target.value; limit = 100; update(); };
        el.querySelector('#hs-list').onchange = (e) => { f.list = e.target.value; limit = 100; update(); };
        el.querySelector('#hs-range').onchange = (e) => { f.range = e.target.value; limit = 100; update(); };
        el.querySelector('#hs-q').oninput = U.debounce((e) => { f.q = e.target.value; limit = 100; update(); }, 250);
        update();
    }

    function update() {
        if (!root) return;
        const all = Store.data.history;
        const rows = filtered();
        const by = (m) => all.filter((h) => h.mode === m).length;
        const today = new Date().toDateString();
        root.querySelector('#hs-stats').innerHTML = `
            <div class="stat-card" style="--a:#f43f5e;--b:#fb923c"><span class="ic-box lg" style="--a:#f43f5e;--b:#fb923c"><i class="fas fa-clock-rotate-left"></i></span><div><b>${all.length.toLocaleString()}</b><span>บันทึกทั้งหมด</span></div></div>
            <div class="stat-card" style="--a:#FF9F0A;--b:#FF375F"><span class="ic-box lg" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-calendar-day"></i></span><div><b>${all.filter((h) => new Date(h.at).toDateString() === today).length.toLocaleString()}</b><span>สุ่มวันนี้</span></div></div>
            <div class="stat-card" style="--a:#0A84FF;--b:#5E5CE6"><span class="ic-box lg" style="--a:#0A84FF;--b:#5E5CE6"><i class="fas fa-dharmachakra"></i></span><div><b>${by('wheel').toLocaleString()}</b><span>สุ่มชื่อด้วยวงล้อ</span></div></div>
            <div class="stat-card" style="--a:#30D158;--b:#00C7BE"><span class="ic-box lg" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-people-group"></i></span><div><b>${(by('group') + by('order') + by('prize') + by('seat') + by('number')).toLocaleString()}</b><span>จับกลุ่ม/ลำดับ/ฉลาก/ที่นั่ง/ตัวเลข</span></div></div>`;
        root.querySelector('#hs-count').textContent = `แสดง ${Math.min(limit, rows.length).toLocaleString()} จาก ${rows.length.toLocaleString()} รายการ${all.length >= Store.MAX_HISTORY ? ` (เก็บล่าสุด ${Store.MAX_HISTORY.toLocaleString()} รายการ)` : ''}`;
        const REPORT = { group: 1, order: 1, prize: 1 };
        root.querySelector('#hs-table').innerHTML = `
            <table class="dt hist-table"><thead><tr><th>วันที่ - เวลา</th><th>ประเภท</th><th>ห้อง/รายการ</th><th>ผลการสุ่ม</th><th class="act"></th></tr></thead>
            <tbody>${rows.length ? rows.slice(0, limit).map((h) => `<tr data-id="${U.esc(h.id)}">
                <td class="hs-when"><b>${U.esc(U.thDate(h.at))}</b><small>${new Date(h.at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</small></td>
                <td>${App.modeTag(h.mode)}${h.title && !['สุ่มชื่อ', 'สุ่มตัวเลข'].includes(h.title) ? `<div class="hs-title">${U.esc(h.title)}</div>` : ''}</td>
                <td>${U.esc(h.listName || '-')}</td>
                <td class="hs-sum">${U.esc(summary(h))}</td>
                <td class="act"><button type="button" class="icon-btn" data-view title="ดูรายละเอียด" aria-label="ดูรายละเอียด"><i class="fas fa-eye"></i></button>
                    ${REPORT[h.mode] ? `<a class="icon-btn" href="#/reports?id=${encodeURIComponent(h.id)}" title="รายงาน .docx" aria-label="รายงาน .docx"><i class="fas fa-file-word"></i></a>` : ''}
                    <button type="button" class="icon-btn del" data-del title="ลบ" aria-label="ลบ"><i class="fas fa-trash"></i></button></td>
            </tr>`).join('') : U.emptyRow(5, 'fa-clock-rotate-left', all.length ? 'ไม่พบรายการตามเงื่อนไข' : 'ยังไม่มีประวัติการสุ่ม — เริ่มหมุนวงล้อได้ที่เมนู "วงล้อสุ่มชื่อ"')}
            ${rows.length > limit ? `<tr><td colspan="5" class="dt-empty"><button type="button" class="btn-x ghost sm" id="hs-more"><i class="fas fa-angles-down"></i>แสดงเพิ่มอีก ${Math.min(100, rows.length - limit)} รายการ</button></td></tr>` : ''}</tbody></table>`;
        root.querySelectorAll('#hs-table tr[data-id]').forEach((tr) => {
            const h = Store.historyItem(tr.dataset.id);
            tr.querySelector('[data-view]').onclick = () => view(h);
            tr.querySelector('[data-del]').onclick = async () => {
                if (!(await U.confirm('ลบรายการนี้?', `${U.esc(Store.MODES[h.mode].label)} • ${U.esc(App.when(h.at))}<br><small>${U.esc(summary(h))}</small>`, { confirmText: 'ลบ', danger: true }))) return;
                Store.data.history = Store.data.history.filter((x) => x.id !== h.id);
                if (Store.data.prizeSession && Store.data.prizeSession.id === h.id) Store.data.prizeSession = null;
                Store.commit('history');
            };
        });
        const more = root.querySelector('#hs-more');
        if (more) more.onclick = () => { limit += 100; update(); };
    }

    function view(h) {
        const m = Store.MODES[h.mode];
        const REPORT = { group: 1, order: 1, prize: 1 };
        U.sheet({
            title: `${m.label}${h.title && h.title !== m.label ? ` — ${h.title}` : ''}`,
            sub: `${U.esc(h.listName ? `${h.listName} • ` : '')}${U.esc(App.when(h.at))}`,
            icon: m.icon,
            tone: ['var(--hero-2)', 'var(--ac)', 'var(--ac-2)'],
            width: 720,
            showCancel: true,
            cancelText: 'ปิด',
            showConfirm: !!REPORT[h.mode],
            confirmText: '<i class="fas fa-file-word"></i> รายงาน .docx / พิมพ์',
            body: detail(h),
        }).then((r) => { if (r.isConfirmed) App.go('reports', { id: h.id }); });
    }

    async function clearAll() {
        if (!App.demoAllow('ล้างประวัติการสุ่มทั้งหมด')) return;
        const n = Store.data.history.length;
        if (!n) { U.toast('ยังไม่มีประวัติ'); return; }
        if (!(await U.confirm('ล้างประวัติทั้งหมด?', `ประวัติการสุ่ม <b>${n.toLocaleString()} รายการ</b> จะถูกลบ<br><small>แนะนำให้ "ส่งออก Excel" หรือ "บันทึกไฟล์ข้อมูล" ไว้ก่อน</small>`, { confirmText: 'ล้างทั้งหมด', danger: true }))) return;
        Store.data.history = [];
        Store.data.prizeSession = null;
        Store.commit('history');
        U.toast('ล้างประวัติแล้ว', { type: 'ok' });
    }

    function exportExcel() {
        const rows = filtered();
        if (!rows.length) { U.toast('ไม่มีรายการให้ส่งออก', { type: 'warn' }); return; }
        const time = (iso) => new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        const sheets = [{
            name: 'ประวัติการสุ่ม',
            rows: [['ลำดับ', 'วันที่', 'เวลา', 'ประเภท', 'ห้อง/รายการ', 'หัวข้อ', 'ผลการสุ่ม']].concat(rows.map((h, i) => [i + 1, U.thDate(h.at), time(h.at), Store.MODES[h.mode].label, h.listName, h.title, summary(h).replace(/…$/, '')])),
            widths: [7, 14, 8, 18, 16, 28, 70],
        }];
        // สรุปรายคน: ถูกสุ่มด้วยวงล้อกี่ครั้ง (ช่วยให้ครูกระจายการถามได้ทั่วถึง)
        const wheel = rows.filter((h) => h.mode === 'wheel' && h.data.person);
        if (wheel.length) {
            const cnt = new Map();
            wheel.forEach((h) => {
                const p = h.data.person;
                const k = `${h.listName}|${p.id}`;
                const x = cnt.get(k) || { list: h.listName, no: p.no, name: pname(p), n: 0, last: h.at };
                x.n += 1;
                if (h.at > x.last) x.last = h.at;
                cnt.set(k, x);
            });
            const arr = [...cnt.values()].sort((a, b) => U.cmp(a.list, b.list) || (a.no === '' ? 999 : a.no) - (b.no === '' ? 999 : b.no));
            sheets.push({ name: 'สรุปรายคน (วงล้อ)', rows: [['ห้อง/รายการ', 'เลขที่', 'ชื่อ - สกุล', 'จำนวนครั้งที่ถูกสุ่ม', 'ครั้งล่าสุด']].concat(arr.map((x) => [x.list, x.no, x.name, x.n, App.when(x.last)])), widths: [16, 7, 30, 18, 22] });
            sheets.push({ name: 'สุ่มชื่อ (วงล้อ)', rows: [['วันที่', 'เวลา', 'ห้อง/รายการ', 'เลขที่', 'ชื่อ - สกุล', 'บนวงล้อ (คน)', 'รอบที่']].concat(wheel.map((h) => [U.thDate(h.at), time(h.at), h.listName, h.data.person.no, pname(h.data.person), h.data.pool, h.data.round])), widths: [14, 8, 16, 7, 30, 12, 8] });
        }
        const groups = rows.filter((h) => h.mode === 'group');
        if (groups.length) {
            const gr = [['วันที่', 'ห้อง', 'กิจกรรม', 'กลุ่มที่', 'เลขที่', 'ชื่อ - สกุล', 'หน้าที่']];
            groups.forEach((h) => h.data.groups.forEach((g) => g.members.forEach((m) => gr.push([App.when(h.at), h.listName, h.data.activity || h.title, g.no, m.no, pname(m), m.id === g.leaderId ? 'หัวหน้ากลุ่ม' : '']))));
            sheets.push({ name: 'จับกลุ่ม', rows: gr, widths: [20, 10, 28, 8, 7, 30, 14] });
        }
        const prizes = rows.filter((h) => h.mode === 'prize');
        if (prizes.length) {
            const pr = [['วันที่', 'ห้อง', 'หัวข้อ', 'ลำดับ', 'รางวัล', 'เลขที่', 'ผู้ได้รับ']];
            prizes.forEach((h) => (h.data.draws || []).forEach((x, i) => pr.push([App.when(h.at), h.listName, h.title, i + 1, x.prize, x.person.no, pname(x.person)])));
            sheets.push({ name: 'จับฉลาก', rows: pr, widths: [20, 10, 24, 7, 28, 7, 30] });
        }
        const name = IO.writeBook(`ประวัติการสุ่ม_${U.stamp()}`, sheets);
        U.toast(`ส่งออก <b>${U.esc(name)}</b> แล้ว (${sheets.length} แผ่นงาน)`, { type: 'ok', ms: 4000 });
        return sheets;
    }

    function refresh() { update(); }
    function leave() { root = null; }

    window.Views = window.Views || {};
    window.Views.history = { render, refresh, leave, summary, detail, exportExcel };
})();
