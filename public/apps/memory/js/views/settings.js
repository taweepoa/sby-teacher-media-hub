/* ตั้งค่า: ข้อมูลโรงเรียน (ใช้ในรายงาน) + เสียง */
(function () {
    'use strict';
    const esc = U.esc;
    let root = null;

    function render(el) {
        root = el;
        const s = Store.data.school;
        const st = Store.data.settings;
        el.innerHTML = `
            ${U.hero({ icon: 'fa-gear', title: 'ตั้งค่าและข้อมูลโรงเรียน', sub: 'ข้อมูลนี้ใช้ในใบสรุปคะแนน การ์ดพิมพ์ และรายงานราชการ (.docx) — บันทึกอัตโนมัติ' })}
            <div class="result-grid">
            <section class="panel panel--orange">
                <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-school"></i></span><div><h3>ข้อมูลโรงเรียน</h3><small>เว้นว่างได้ — เอกสารจะเว้นจุดไข่ปลาให้เขียนเอง</small></div></div>
                <div class="panel-body"><div class="row g-3">
                    <div class="col-md-8"><label class="form-label">ชื่อโรงเรียน</label><input class="form-control" data-s="name" value="${esc(s.name)}" placeholder="เช่น โรงเรียนบ้าน..."></div>
                    <div class="col-md-4"><label class="form-label">ปีการศึกษา</label><input class="form-control" data-s="academicYear" inputmode="numeric" value="${esc(s.academicYear)}"></div>
                    <div class="col-12"><label class="form-label">ส่วนราชการ (บันทึกข้อความ)</label><input class="form-control" id="st-agency" data-s="agency" value="${esc(s.agency)}">${s.name ? UI.chips('#st-agency', [s.name, `กลุ่มบริหารวิชาการ ${s.name}`]) : ''}</div>
                    <div class="col-12"><label class="form-label">เรียน (ผู้รับรายงาน)</label><input class="form-control" id="st-director" data-s="director" value="${esc(s.director)}">${UI.chips('#st-director', ['ผู้อำนวยการโรงเรียน', s.name ? `ผู้อำนวยการ${s.name}` : 'รองผู้อำนวยการฝ่ายวิชาการ'])}</div>
                    <div class="col-md-6"><label class="form-label">ผู้รายงาน</label><input class="form-control" data-s="reporterName" value="${esc(s.reporterName)}" placeholder="ชื่อ-สกุล"></div>
                    <div class="col-md-6"><label class="form-label">ตำแหน่ง</label><input class="form-control" id="st-pos" data-s="reporterPosition" value="${esc(s.reporterPosition)}">${UI.chips('#st-pos', UI.PRESET.positions)}</div>
                </div></div>
            </section>
            <section class="panel panel--teal">
                <div class="panel-head"><span class="ic-box sm" style="--a:#0A84FF;--b:#00C7BE"><i class="fas fa-volume-high"></i></span><div><h3>เสียงประกอบเกม</h3><small>สังเคราะห์เสียงในเครื่อง ไม่ต้องต่ออินเทอร์เน็ต</small></div></div>
                <div class="panel-body">
                    <label class="form-check form-switch mb-3"><input class="form-check-input" type="checkbox" id="st-sound" ${st.sound ? 'checked' : ''}> <span class="form-check-label">เปิดเสียงประกอบ</span></label>
                    <label class="form-label">ความดัง</label><input type="range" class="form-range" id="st-vol" min="0" max="1" step="0.1" value="${st.volume}">
                    <div class="chips mt-2">${['flip', 'correct', 'wrong', 'reveal', 'tick', 'timeup', 'fanfare'].map((n) => `<button type="button" class="chip" data-test="${n}"><i class="fas fa-play"></i> ${{ flip: 'เปิดไพ่', correct: 'จับคู่ถูก', wrong: 'ไม่ใช่คู่', reveal: 'เปิดกล่อง', tick: 'นับถอยหลัง', timeup: 'หมดเวลา', fanfare: 'ประกาศผล' }[n]}</button>`).join('')}</div>
                    <div class="note mt-3"><i class="fas fa-circle-info"></i><div>ค่ากติกาเกม (ระดับความยาก คะแนน เวลา) เลือกได้ทุกครั้งที่เริ่มเกม ระบบจำค่าล่าสุดไว้ให้</div></div>
                </div>
            </section></div>`;
        UI.bindChips(el);
        el.oninput = el.onchange = (e) => {
            const t = e.target;
            if (t.dataset.s) { Store.data.school[t.dataset.s] = t.value; Store.commit('school'); } else if (t.id === 'st-sound') { st.sound = t.checked; Sound.set({ enabled: st.sound }); Store.commit('settings'); } else if (t.id === 'st-vol') { st.volume = Number(t.value); Sound.set({ volume: st.volume }); Store.commit('settings'); }
        };
        el.onclick = (e) => { const b = e.target.closest('[data-test]'); if (b) { Sound.set({ enabled: true }); Sound.play(b.dataset.test); Sound.set({ enabled: st.sound }); } };
    }
    window.Views.settings = { render, refresh(reason) { if (reason === 'replace' && root) render(root); } };
})();
