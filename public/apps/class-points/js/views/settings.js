/* ข้อมูลโรงเรียน / ผู้ลงนาม / เสียง */
(function () {
    'use strict';
    const F = [
        ['name', 'ชื่อโรงเรียน', 'เช่น โรงเรียนบ้านหนองบัวทอง'], ['agency', 'ส่วนราชการ (บันทึกข้อความ)', 'เว้นว่าง = ใช้ชื่อโรงเรียน'],
        ['academicYear', 'ปีการศึกษา', 'เช่น 2569'], ['semester', 'ภาคเรียนที่', '1 หรือ 2'],
        ['teacherName', 'ชื่อครูผู้รายงาน/ลงนาม', 'เช่น นางสาวสุดารัตน์ ใจงาม'], ['teacherPosition', 'ตำแหน่ง', 'เช่น ครู วิทยฐานะครูชำนาญการ'],
        ['director', 'เรียน (ผู้บังคับบัญชา)', 'เช่น ผู้อำนวยการโรงเรียน...'],
    ];
    function render(el) {
        const s = Store.data.school;
        el.innerHTML = `
            ${U.hero({ icon: 'fa-school', title: 'ข้อมูลโรงเรียน', sub: 'ใช้ในรายงาน .docx และเกียรติบัตร — ช่องที่เว้นว่างจะแสดงเป็นจุดไข่ปลาให้เขียนเอง' })}
            <div class="row g-3"><div class="col-xl-8"><div class="panel panel--theme"><div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-school"></i></span><div><h3>ข้อมูลทั่วไป</h3><small>บันทึกอัตโนมัติเมื่อพิมพ์</small></div></div>
                <div class="panel-body"><div class="row g-3">${F.map(([k, l, ph]) => `<div class="col-md-6"><label class="form-label">${l}</label><input class="form-control" data-f="${k}" value="${U.esc(s[k])}" placeholder="${U.esc(ph)}" ${k === 'academicYear' || k === 'semester' ? 'inputmode="numeric"' : ''}></div>`).join('')}</div></div></div></div>
            <div class="col-xl-4"><div class="panel panel--orange"><div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-volume-high"></i></span><div><h3>เสียงประกอบ</h3><small>เสียงตอนให้แต้ม สุ่มนักเรียน แลกรางวัล</small></div></div>
                <div class="panel-body"><label class="d-flex gap-2 align-items-center"><input type="checkbox" class="form-check-input m-0" id="set-sound" ${Store.data.settings.sound ? 'checked' : ''}>เปิดเสียง</label>
                <div class="d-flex gap-2 mt-3 flex-wrap"><button type="button" class="btn-x soft sm" id="t-good"><i class="fas fa-play"></i>ทดลองเสียงได้แต้ม</button><button type="button" class="btn-x soft sm" id="t-bad"><i class="fas fa-play"></i>ทดลองเสียงหักแต้ม</button></div></div></div></div></div>`;
        const save = U.debounce(() => Store.commit('settings'), 400);
        el.querySelectorAll('[data-f]').forEach((i) => i.addEventListener('input', () => { s[i.dataset.f] = U.norm(i.value); save(); }));
        el.querySelector('#set-sound').onchange = (e) => { Store.data.settings.sound = e.target.checked; Store.commit('settings'); };
        el.querySelector('#t-good').onclick = () => Sfx.good();
        el.querySelector('#t-bad').onclick = () => Sfx.bad();
    }
    window.Views.settings = { render, refresh() {} };
})();
