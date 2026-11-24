/* ข้อมูลโรงเรียนและผู้ลงนาม (ใช้ในรายงาน .docx) */
(function () {
    'use strict';

    let root = null;
    const F = [
        ['name', 'ชื่อโรงเรียน', 'เช่น โรงเรียนบ้านหนองบัว', 'fg-wide'],
        ['agency', 'สังกัด', 'เช่น สำนักงานเขตพื้นที่การศึกษาประถมศึกษา...', 'fg-wide'],
        ['semester', 'ภาคเรียนที่', '1', '', 'numeric'],
        ['academicYear', 'ปีการศึกษา', '2569', '', 'numeric'],
        ['teacherName', 'ชื่อครูผู้สอน (ผู้รายงาน)', 'เช่น นางสาวใจดี รักเรียน', ''],
        ['teacherPosition', 'ตำแหน่งครูผู้สอน', 'เช่น ครู วิทยฐานะครูชำนาญการ', ''],
        ['headName', 'ชื่อหัวหน้ากลุ่มสาระ', '', ''],
        ['headPosition', 'ตำแหน่งหัวหน้ากลุ่มสาระ', 'เช่น หัวหน้ากลุ่มสาระการเรียนรู้ภาษาต่างประเทศ', ''],
        ['director', 'ชื่อผู้อำนวยการ', '', ''],
        ['directorPosition', 'ตำแหน่งผู้อำนวยการ', 'เช่น ผู้อำนวยการโรงเรียน...', ''],
    ];

    function render(el) {
        root = el;
        const s = Store.data.school;
        el.innerHTML = `
            ${U.hero({ icon: 'fa-school', title: 'ข้อมูลโรงเรียน', sub: 'ใช้ในหัวบันทึกข้อความและช่องลงนามของรายงาน .docx • บันทึกอัตโนมัติ' })}
            <div class="panel panel--theme settings-panel">
                <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-school"></i></span><div><h3>โรงเรียนและผู้ลงนาม</h3><small>ช่องที่เว้นว่าง รายงานจะเว้นจุดไข่ปลาให้กรอกเอง</small></div></div>
                <div class="panel-body"><div class="form-grid">
                    ${F.map(([k, label, ph, cls, im]) => `<div class="${cls}"><label class="form-label" for="st-${k}">${label}</label><input class="form-control" id="st-${k}" data-k="${k}" value="${U.esc(s[k])}" placeholder="${U.esc(ph)}"${im ? ` inputmode="${im}"` : ''}></div>`).join('')}
                </div></div>
            </div>`;
        el.querySelectorAll('[data-k]').forEach((inp) => {
            inp.onchange = () => { Store.data.school[inp.dataset.k] = U.norm(inp.value); Store.commit('quiet'); U.toast('บันทึกแล้ว', { type: 'ok', ms: 1500 }); };
        });
    }

    window.Views = window.Views || {};
    window.Views.settings = { render, refresh: () => render(root) };
})();
