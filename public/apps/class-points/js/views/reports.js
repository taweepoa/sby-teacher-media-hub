/* รายงานราชการ (.docx): สรุปรายห้อง · รายคน · บันทึกข้อความ */
(function () {
    'use strict';
    const st = { type: 'class', period: 'week', sid: '', form: null };
    let root = null;
    const GARUDA = '/assets/vendor/garuda.png';
    const MEMO_FIELDS = [
        { f: 'agency', label: 'ส่วนราชการ', ph: 'เว้นว่าง = จุดไข่ปลา', save: 'agency' },
        { f: 'docNo', label: 'ที่ (เลขที่หนังสือ)', ph: 'เว้นว่าง = จุดไข่ปลาให้เขียนเอง' },
        { f: 'date', label: 'วันที่', ph: 'เช่น 24 ตุลาคม 2569' },
        { f: 'to', label: 'เรียน', ph: 'เช่น ผู้อำนวยการโรงเรียน...', save: 'director' },
    ];

    function ctx() {
        const c = Store.current();
        if (st.type === 'student') return Docs.studentContext(Store.data, st.sid, st.period);
        return Docs.classContext(Store.data, c.id, st.period);
    }
    function html() {
        const x = ctx();
        if (!x) return '';
        return UI.demoMark(st.type === 'memo' ? Docs.memoHTML(x, st.form, GARUDA) : st.type === 'student' ? Docs.studentHTML(x) : Docs.classHTML(x));
    }

    function render(el, params) {
        root = el;
        const c = Store.current();
        if (!c) { el.innerHTML = UI.noClass(); return; }
        if (params && params.type) st.type = params.type;
        const list = Core.classStudents(Store.data, c.id);
        if (!list.find((s) => s.id === st.sid)) st.sid = list[0] ? list[0].id : '';
        if (!st.form) st.form = { agency: Store.data.school.agency || Store.data.school.name, docNo: '', date: Docs.dateText(new Date()), to: Store.data.school.director, ending: 'ทราบ' };
        const opt = (v, ic, a, b, t, s) => `<label class="print-opt"><input type="radio" name="rp-type" value="${v}"${st.type === v ? ' checked' : ''}><div><span class="ic-box" style="--a:${a};--b:${b}"><i class="fas ${ic}"></i></span><span><b>${t}</b><small>${s}</small></span></div></label>`;
        el.innerHTML = `
            ${U.hero({ icon: 'fa-file-word', title: 'รายงานราชการ (.docx)', sub: 'รูปแบบตามระเบียบงานสารบรรณ • TH SarabunPSK 16 pt • ไฟล์ Word แก้ไขต่อได้ • ข้อมูลที่ไม่มีจะเว้นจุดไข่ปลาให้เขียนเอง' })}
            <div class="board-bar">${UI.classSeg()}${UI.periodSeg(st.period)}</div>
            <div class="print-opts col3 mb-3">
                ${opt('class', 'fa-table-list', '#0A84FF', '#5E5CE6', 'สรุปพฤติกรรมรายห้อง', 'ตารางรายชื่อ แต้มดี/ควรปรับปรุง • แยกตามพฤติกรรม')}
                ${opt('student', 'fa-user', '#30D158', '#00C7BE', 'รายงานรายบุคคล', 'สรุปแต้ม อันดับ แยกตามพฤติกรรม • ประวัติล่าสุด')}
                ${opt('memo', 'fa-envelope-open-text', '#BF5AF2', '#FF375F', 'บันทึกข้อความ', 'รายงานผลการเสริมแรงพฤติกรรม + ตารางแนบ')}
            </div>
            <div class="print-layout">
                <div class="panel panel--theme"><div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-sliders"></i></span><div><h3>ตั้งค่ารายงาน</h3><small>ห้อง ${U.esc(c.name)}</small></div></div>
                    <div class="panel-body d-flex flex-column gap-3">
                        ${st.type === 'student' ? `<div><label class="form-label">นักเรียน</label><select class="form-select" id="rp-sid">${list.map((s) => `<option value="${s.id}"${s.id === st.sid ? ' selected' : ''}>${U.esc(s.no)}. ${U.esc(Core.fullName(s))}</option>`).join('')}</select></div>` : ''}
                        ${st.type === 'memo' ? `${MEMO_FIELDS.map((x) => `<div><label class="form-label">${x.label}</label><input class="form-control" data-mf="${x.f}" value="${U.esc(st.form[x.f])}" placeholder="${U.esc(x.ph)}"></div>`).join('')}
                            <div><label class="form-label">ลงท้าย</label><select class="form-select" data-mf="ending"><option value="ทราบ"${st.form.ending !== 'พิจารณา' ? ' selected' : ''}>จึงเรียนมาเพื่อโปรดทราบ</option><option value="พิจารณา"${st.form.ending === 'พิจารณา' ? ' selected' : ''}>จึงเรียนมาเพื่อโปรดพิจารณา</option></select></div>` : ''}
                        <div class="form-text">ผู้ลงนาม: ${U.esc(Store.data.school.teacherName || 'ยังไม่ระบุ (เว้นจุดไข่ปลา)')} — แก้ได้ที่เมนู <a href="#/settings">ข้อมูลโรงเรียน</a></div>
                        <div id="rp-warn"></div>
                    </div></div>
                <div class="panel panel--slate"><div class="panel-head"><span class="ic-box sm" style="--a:#475569;--b:#94a3b8"><i class="fas fa-eye"></i></span><div><h3>ตัวอย่างเอกสาร</h3><small>A4 แนวตั้ง</small></div>
                    <div class="panel-tools"><button type="button" class="btn-x ghost sm" id="rp-print"><i class="fas fa-print"></i>พิมพ์</button><button type="button" class="btn-x cta" id="rp-docx"><i class="fas fa-file-word"></i>ดาวน์โหลด .docx</button></div></div>
                    <div class="panel-body"><div class="preview-box" id="rp-preview"></div></div></div>
            </div>`;
        UI.bindClassSeg(el);
        el.querySelectorAll('[data-period]').forEach((b) => { b.onclick = () => { st.period = b.dataset.period; render(el); }; });
        el.querySelectorAll('input[name="rp-type"]').forEach((r) => { r.onchange = () => { st.type = r.value; render(el); }; });
        const sp = el.querySelector('#rp-sid'); if (sp) sp.onchange = (e) => { st.sid = e.target.value; preview(); };
        el.querySelectorAll('[data-mf]').forEach((inp) => inp.addEventListener('input', () => {
            st.form[inp.dataset.mf] = inp.value;
            const fd = MEMO_FIELDS.find((x) => x.f === inp.dataset.mf);
            if (fd && fd.save) { Store.data.school[fd.save] = U.norm(inp.value); saveSchool(); }
            previewSoon();
        }));
        el.querySelector('#rp-print').onclick = () => UI.print(html());
        el.querySelector('#rp-docx').onclick = () => download();
        preview();
    }
    const saveSchool = U.debounce(() => Store.commit('report-form'), 500);
    const previewSoon = U.debounce(() => preview(), 200);

    function preview() {
        const box = root && root.querySelector('#rp-preview');
        if (!box) return;
        const x = ctx();
        const warn = [];
        if (!x) warn.push('ยังไม่มีนักเรียนในห้องนี้');
        else {
            const empty = st.type === 'student' ? !(x.st.posCount + x.st.negCount) : !(x.tot.posCount + x.tot.negCount);
            if (empty) warn.push('ยังไม่มีการบันทึกแต้มในช่วงเวลานี้');
            if (!Store.data.school.teacherName) warn.push('ยังไม่ระบุชื่อผู้ลงนาม — เว้นจุดไข่ปลาไว้');
            if (st.type === 'memo') { const b = MEMO_FIELDS.filter((f) => !U.norm(st.form[f.f])).map((f) => f.label); if (b.length) warn.push(`เว้นจุดไข่ปลา: ${b.join(', ')}`); }
        }
        root.querySelector('#rp-warn').innerHTML = warn.length ? `<div class="note warn mb-0"><i class="fas fa-circle-info"></i><div>${warn.map(U.esc).join('<br>')}</div></div>` : '<div class="note ok mb-0"><i class="fas fa-circle-check"></i><div>ข้อมูลครบ พร้อมดาวน์โหลด</div></div>';
        box.innerHTML = `<div class="preview-fit"><div class="pv-inner">${html()}</div></div>`;
        const img = box.querySelector('img'); if (img && !img.complete) img.onload = () => UI.fit(box);
        UI.fit(box);
    }

    async function download() {
        const x = ctx();
        if (!x) { U.toast('ยังไม่มีนักเรียนในห้องนี้', { type: 'warn' }); return; }
        const c = Store.current();
        const per = Docs.PERIOD[st.period];
        try {
            if (st.type === 'memo') await ThaiDoc.download(Docs.memoSections(ThaiDoc, x, st.form), `บันทึกข้อความรายงานผลพฤติกรรม_${c.name}.docx`, { title: 'บันทึกข้อความ' });
            else if (st.type === 'student') await ThaiDoc.download(Docs.studentSections(ThaiDoc, x), `รายงานพฤติกรรม_${Core.fullName(x.s)}_${per}.docx`, { title: 'รายงานพฤติกรรมรายบุคคล' });
            else await ThaiDoc.download(Docs.classSections(ThaiDoc, x), `สรุปพฤติกรรม_${c.name}_${per}.docx`, { title: 'สรุปพฤติกรรมนักเรียน' });
            if (!VSDemo.active) U.toast('ดาวน์โหลดไฟล์ .docx แล้ว — เปิดด้วย Microsoft Word', { type: 'ok' });
        } catch (e) { console.error(e); U.alert('สร้างไฟล์ไม่สำเร็จ', U.esc(e.message), 'error'); }
    }

    window.Views.reports = { render, refresh() { preview(); } };
})();
