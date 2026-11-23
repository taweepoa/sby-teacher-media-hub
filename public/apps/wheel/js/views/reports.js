/* =====================================================================
   รายงาน (.docx ด้วย ThaiDoc) — เลือกผลการสุ่มจากประวัติ (จับกลุ่ม / ลำดับนำเสนอ / จับฉลาก)
   แก้หัวรายงานได้ (กิจกรรม รายวิชา โรงเรียน ผู้ลงนาม) • ดูตัวอย่างหน้ากระดาษ • ดาวน์โหลด .docx • พิมพ์/บันทึก PDF
   ช่องที่ไม่กรอกจะเป็นจุดไข่ปลาให้เขียนเอง (ระบบไม่เดาข้อมูล)
   ===================================================================== */
(function () {
    'use strict';

    const TYPES = { group: 'รายชื่อนักเรียนแบ่งกลุ่ม', order: 'ลำดับการนำเสนอผลงาน', prize: 'บัญชีผู้ได้รับรางวัลจากการจับฉลาก' };
    let root = null;
    let sel = null; // history id
    let form = null;

    const records = () => Store.data.history.filter((h) => TYPES[h.mode] && (h.mode !== 'prize' || (h.data.draws || []).length));

    function render(el, params) {
        root = el;
        const recs = records();
        if (params && params.id && recs.some((h) => h.id === params.id)) { if (sel !== params.id) form = null; sel = params.id; }
        if (!recs.some((h) => h.id === sel)) { sel = recs[0] ? recs[0].id : null; form = null; }
        el.innerHTML = `
            ${U.hero({ cls: 'hero--report', icon: 'fa-file-word', title: 'รายงาน (.docx)', sub: 'รายชื่อกลุ่มที่จับได้ • ลำดับการนำเสนอ • ผู้ได้รับรางวัล — รูปแบบราชการ (TH SarabunPSK 16 pt, A4, ขอบซ้าย 3 ซม.) พร้อมช่องลงนามครู ใช้แนบหลักฐานกิจกรรม' })}
            ${recs.length ? `
            <div class="report-layout">
                <div class="report-side">
                    <div class="panel panel--theme">
                        <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-list-check"></i></span><div><h3>1. เลือกผลการสุ่ม</h3><small>จากประวัติ (ใหม่สุดอยู่บน)</small></div></div>
                        <div class="panel-body"><select class="form-select" id="rp-rec" aria-label="ผลการสุ่ม">${recs.map((h) => `<option value="${U.esc(h.id)}"${h.id === sel ? ' selected' : ''}>${U.esc(`${TYPES[h.mode]} • ${h.listName} • ${U.thDate(h.at, true)}${h.title && !['จับกลุ่ม', 'ลำดับนำเสนอ', 'จับฉลากของรางวัล'].includes(h.title) ? ` • ${h.title}` : ''}`)}</option>`).join('')}</select></div>
                    </div>
                    <div class="panel panel--orange">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-pen"></i></span><div><h3>2. หัวรายงานและผู้ลงนาม</h3><small>เว้นว่าง = จุดไข่ปลาให้เขียนเอง</small></div></div>
                        <div class="panel-body" id="rp-form"></div>
                    </div>
                    <div class="panel panel--green">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-download"></i></span><div><h3>3. ดาวน์โหลด / พิมพ์</h3><small>เปิดไฟล์ .docx ด้วย Microsoft Word</small></div></div>
                        <div class="panel-body d-flex flex-column gap-2">
                            <button type="button" class="btn-x cta lg" id="rp-docx"><i class="fas fa-file-word"></i>ดาวน์โหลด .docx</button>
                            <button type="button" class="btn-x ghost" id="rp-print"><i class="fas fa-print"></i>พิมพ์ / บันทึกเป็น PDF</button>
                            <div class="field-help">ต้องมีฟอนต์ TH SarabunPSK ในเครื่อง (ฟอนต์ราชการ แจกฟรี) • ไฟล์ .docx แก้ไขต่อใน Word ได้</div>
                        </div>
                    </div>
                </div>
                <div class="panel panel--slate report-preview">
                    <div class="panel-head"><span class="ic-box sm" style="--a:#475569;--b:#94a3b8"><i class="fas fa-eye"></i></span><div><h3>ตัวอย่างหน้ากระดาษ</h3><small id="rp-pages">A4 แนวตั้ง</small></div></div>
                    <div class="panel-body gov-preview" id="rp-preview"></div>
                </div>
            </div>` : `
            <div class="panel panel--theme"><div class="panel-body"><div class="empty-state">
                <span class="ic-box lg" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-file-word"></i></span>
                <h3>ยังไม่มีผลการสุ่มที่ทำรายงานได้</h3>
                <div>รายงานสร้างจากผล "สุ่มจับกลุ่ม" "สุ่มลำดับนำเสนอ" หรือ "จับฉลากของรางวัล" — สุ่มก่อนแล้วกลับมาที่หน้านี้</div>
                <div class="d-flex gap-2 justify-content-center flex-wrap mt-1"><a class="btn-x primary" href="#/groups"><i class="fas fa-people-group"></i>ไปสุ่มจับกลุ่ม</a>${Store.data.lists.length ? '' : '<button type="button" class="btn-x orange" data-demo><i class="fas fa-flask"></i>ทดลองด้วยข้อมูลตัวอย่าง</button>'}</div>
            </div></div></div>`}`;
        if (!recs.length) return;
        el.querySelector('#rp-rec').onchange = (e) => { sel = e.target.value; form = null; renderForm(); renderPreview(); };
        el.querySelector('#rp-docx').onclick = download;
        el.querySelector('#rp-print').onclick = print;
        renderForm();
        renderPreview();
    }

    const H = () => Store.historyItem(sel);
    const listOf = (h) => Store.list(h.listId) || { kind: 'class', name: h.listName, items: [] };

    function renderForm() {
        const h = H();
        if (!form) form = Docs.formDefaults(Store.data, h);
        const custom = listOf(h).kind === 'custom';
        const box = root.querySelector('#rp-form');
        const fld = (k, label, ph, cls) => `<div class="${cls || 'col-12'}"><label class="form-label" for="rf-${k}">${label}</label><input class="form-control" id="rf-${k}" data-k="${k}" maxlength="120" value="${U.esc(form[k])}" placeholder="${U.esc(ph)}"></div>`;
        box.innerHTML = `<div class="row g-2">
            ${fld('activity', 'กิจกรรม / ชื่องาน', 'เช่น โครงงานคอมพิวเตอร์')}
            ${custom ? '' : fld('subject', 'รายวิชา', 'เช่น วิทยาการคำนวณ')}
            ${fld('school', 'โรงเรียน', 'โรงเรียน...')}
            ${fld('term', 'ภาคเรียน/ปีการศึกษา', 'ภาคเรียนที่ 1 ปีการศึกษา 2569')}
            ${fld('teacherName', h.mode === 'prize' ? 'ผู้ดำเนินการจับฉลาก (ชื่อ-สกุล)' : 'ครูผู้สอน (ชื่อ-สกุล)', 'นาย/นาง/นางสาว...', 'col-md-7')}
            ${h.mode === 'prize' ? '' : fld('teacherPosition', 'ตำแหน่ง', 'เช่น ครู', 'col-md-5')}
            </div>
            ${h.mode !== 'order' ? `<label class="opt-switch mt-2"><input type="checkbox" id="rf-sign"${form.signCol ? ' checked' : ''}><div><b>${h.mode === 'prize' ? 'ช่องลายมือชื่อผู้รับรางวัล' : 'ช่องลายมือชื่อนักเรียน'}</b><small>${h.mode === 'prize' ? 'ให้ผู้ได้รับลงชื่อรับของรางวัล' : 'ให้สมาชิกลงชื่อ ใช้เป็นหลักฐานการเข้าร่วมกิจกรรม'}</small></div></label>` : ''}
            <div class="field-help">แก้ข้อมูลโรงเรียน/ครูถาวรได้ที่เมนู <a href="#/settings">ตั้งค่า</a></div>`;
        box.querySelectorAll('[data-k]').forEach((i) => { i.oninput = U.debounce(() => { form[i.dataset.k] = U.norm(i.value); renderPreview(); }, 250); });
        const sg = box.querySelector('#rf-sign');
        if (sg) sg.onchange = () => { form.signCol = sg.checked; renderPreview(); };
    }

    function renderPreview() {
        const h = H();
        root.querySelector('#rp-preview').innerHTML = Docs.html(h, listOf(h), form);
        root.querySelector('#rp-pages').textContent = `A4 แนวตั้ง • ${TYPES[h.mode]} • ${h.listName}`;
    }

    async function download() {
        const h = H();
        const btn = root.querySelector('#rp-docx');
        btn.disabled = true;
        try {
            ThaiDoc.resetMemoFields();
            const name = await ThaiDoc.download(Docs.sections(ThaiDoc, h, listOf(h), form), Docs.fileName(h, listOf(h)), { title: TYPES[h.mode] });
            U.toast(`ดาวน์โหลด <b>${U.esc(name)}</b> แล้ว — เปิดด้วย Microsoft Word`, { type: 'ok', ms: 4500 });
        } catch (e) {
            console.error(e);
            U.alert('สร้างไฟล์ไม่สำเร็จ', U.esc(e.message), 'error');
        } finally { btn.disabled = false; }
    }

    function print() {
        const h = H();
        document.getElementById('print-root').innerHTML = Docs.html(h, listOf(h), form);
        setTimeout(() => window.print(), 150);
    }

    window.Views = window.Views || {};
    window.Views.reports = {
        render,
        refresh(reason) { if (root && reason !== 'settings' && reason !== 'current') render(root, {}); },
        leave() { root = null; },
        get form() { return form; },
    };
})();
