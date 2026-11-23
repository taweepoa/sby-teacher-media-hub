/* ตั้งค่า: ข้อมูลโรงเรียน/ผู้ลงนาม (ใช้ทุกเอกสาร) + เสียง + แม่แบบข้อความในเอกสาร (แก้ได้ทุกช่อง) */
(function () {
    'use strict';
    const esc = U.esc;
    let root = null;

    const TPL_FIELDS = [
        ['summaryTitle', 'หัวเรื่องใบสรุปผลการแข่งขัน', 1, ''],
        ['rulesNote', 'ข้อความกติกา (ท้ายใบสรุปผล)', 2, '{เวลา} {ถูก} {ผิด} {จำนวนช่อง}'],
        ['purpose', 'วัตถุประสงค์ของกิจกรรม (ค่าเริ่มต้น)', 1, ''],
        ['memoSubject', 'บันทึกข้อความ: เรื่อง', 1, '{กิจกรรม}'],
        ['memoOpen', 'บันทึกข้อความ: ย่อหน้าที่ 1 (ตามที่...)', 2, '{โรงเรียน} {กิจกรรม} {เมื่อ} {วัตถุประสงค์}'],
        ['memoBody', 'บันทึกข้อความ: ย่อหน้าที่ 2 (บัดนี้...)', 3, '{จำนวนทีม} {ชุดคำถาม} {จำนวนช่อง} {จำนวนคำถาม} {ตอบถูก} {ร้อยละ} {ผลรางวัล}'],
        ['memoClose', 'บันทึกข้อความ: ย่อหน้าปิด', 1, ''],
        ['judgePos1', 'ตำแหน่งกรรมการคนที่ 1', 1, ''],
        ['judgePos2', 'ตำแหน่งกรรมการคนที่ 2', 1, ''],
        ['judgePos3', 'ตำแหน่งกรรมการคนที่ 3', 1, ''],
        ['cardFooter', 'ข้อความท้ายการ์ดคำถาม (พิมพ์)', 1, ''],
    ];

    function render(el) {
        root = el;
        const s = Store.data.school;
        const st = Store.data.settings;
        const tpl = Store.data.tpl;
        el.innerHTML = `
            ${U.hero({ icon: 'fa-gear', title: 'ตั้งค่าและข้อมูลโรงเรียน', sub: 'ตั้งครั้งเดียวใช้ทุกเอกสาร — ใบสรุปผล การ์ดพิมพ์ และรายงานราชการ (.docx) • บันทึกอัตโนมัติ' })}
            <div class="result-grid">
            <section class="panel panel--green">
                <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-school"></i></span><div><h3>ข้อมูลโรงเรียนและผู้ลงนาม</h3><small>เว้นว่างได้ — เอกสารจะเว้นจุดไข่ปลาให้เขียนเอง</small></div></div>
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
                <div class="panel-head"><span class="ic-box sm" style="--a:#0A84FF;--b:#00C7BE"><i class="fas fa-volume-high"></i></span><div><h3>เสียงและกติกาเริ่มต้น</h3><small>เสียงสังเคราะห์ในเครื่อง ไม่ต้องต่ออินเทอร์เน็ต</small></div></div>
                <div class="panel-body">
                    <label class="form-check form-switch mb-3"><input class="form-check-input" type="checkbox" id="st-sound" ${st.sound ? 'checked' : ''}> <span class="form-check-label">เปิดเสียงประกอบ</span></label>
                    <label class="form-label">ความดัง</label><input type="range" class="form-range" id="st-vol" min="0" max="1" step="0.1" value="${st.volume}">
                    <div class="chips mt-2">${[['dice', 'ทอยเต๋า'], ['ladder', 'ขึ้นบันได'], ['snake', 'โดนงู'], ['correct', 'ตอบถูก'], ['wrong', 'ตอบผิด'], ['tick', 'นับถอยหลัง'], ['fanfare', 'ประกาศผู้ชนะ']].map(([n, l]) => `<button type="button" class="chip" data-test="${n}"><i class="fas fa-play"></i> ${l}</button>`).join('')}</div>
                    <div class="row g-2 mt-3">
                        <div class="col-6"><label class="form-label">ช่องโบนัส เดินหน้า (ช่อง)</label><input type="number" class="form-control" min="1" max="10" inputmode="numeric" data-o="bonusStep" value="${st.opts.bonusStep}"></div>
                        <div class="col-6"><label class="form-label">เวลาตอบเริ่มต้น (วินาที)</label><input type="number" class="form-control" min="0" max="300" inputmode="numeric" data-o="time" value="${st.opts.time}"></div>
                    </div>
                    <div class="note mt-3"><i class="fas fa-circle-info"></i><div>เวลาตอบ ถูกเดินต่อ/ผิดถอย เลือกได้ทุกครั้งที่เริ่มเกม ระบบจำค่าล่าสุดไว้ให้</div></div>
                </div>
            </section></div>
            <section class="panel panel--orange">
                <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-file-pen"></i></span><div class="grow"><h3>แม่แบบข้อความในเอกสาร</h3><small>แก้ถ้อยคำได้ทุกช่อง • คำในวงเล็บปีกกา เช่น {กิจกรรม} ระบบเติมให้อัตโนมัติ</small></div>
                    <button type="button" class="btn-x ghost sm" data-reset-all><i class="fas fa-rotate-left"></i> คืนค่าเริ่มต้นทั้งหมด</button></div>
                <div class="panel-body"><div class="row g-3">${TPL_FIELDS.map(([k, label, rows, vars]) => `
                    <div class="${rows > 1 ? 'col-12' : 'col-md-6'}">
                        <label class="form-label d-flex align-items-center gap-2">${esc(label)}${tpl[k] !== Store.TPL_DEFAULT[k] ? `<button type="button" class="btn-x ghost sm ms-auto" data-reset="${k}"><i class="fas fa-rotate-left"></i> ค่าเริ่มต้น</button>` : ''}</label>
                        ${rows > 1 ? `<textarea class="form-control" rows="${rows}" data-t="${k}">${esc(tpl[k])}</textarea>` : `<input class="form-control" data-t="${k}" value="${esc(tpl[k])}">`}
                        ${vars ? `<small class="muted">ใช้ได้: ${esc(vars)}</small>` : ''}
                    </div>`).join('')}</div>
                    <div class="note warn mt-3"><i class="fas fa-scale-balanced"></i><div>รูปแบบบันทึกข้อความเป็นไปตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ — ถ้อยคำเป็นตัวอย่างที่โรงเรียนทั่วไปใช้ กรุณาให้ฝ่ายวิชาการ/งานสารบรรณของโรงเรียนตรวจเทียบแบบฟอร์มที่ใช้อยู่จริง แล้วแก้ในช่องด้านบนได้ทันที</div></div>
                </div>
            </section>`;
        UI.bindChips(el);
    }

    function bind(el) {
        el.oninput = el.onchange = (e) => {
            const t = e.target;
            const st = Store.data.settings;
            if (t.dataset.s) { Store.data.school[t.dataset.s] = t.value; Store.commit('school'); }
            else if (t.dataset.t) { Store.data.tpl[t.dataset.t] = t.value; Store.commit('tpl'); }
            else if (t.dataset.o) { st.opts[t.dataset.o] = Number(t.value); st.opts = Engine.normOpts(st.opts); Store.commit('settings'); }
            else if (t.id === 'st-sound') { st.sound = t.checked; Sound.set({ enabled: st.sound }); Store.commit('settings'); }
            else if (t.id === 'st-vol') { st.volume = Number(t.value); Sound.set({ volume: st.volume }); Store.commit('settings'); }
        };
        el.onclick = async (e) => {
            const b = e.target.closest('[data-test], [data-reset], [data-reset-all]');
            if (!b) return;
            const st = Store.data.settings;
            if (b.dataset.test) { Sound.set({ enabled: true }); Sound.play(b.dataset.test); Sound.set({ enabled: st.sound }); return; }
            if (b.dataset.reset) { Store.data.tpl[b.dataset.reset] = Store.TPL_DEFAULT[b.dataset.reset]; Store.commit('tpl'); render(el); return; }
            if (await U.confirm('คืนค่าแม่แบบข้อความทั้งหมด?', 'ถ้อยคำที่แก้ไว้จะกลับเป็นค่าเริ่มต้นของโปรแกรม', { icon: 'question', confirmText: 'คืนค่าเริ่มต้น' })) {
                Store.data.tpl = Object.assign({}, Store.TPL_DEFAULT);
                Store.commit('tpl');
                render(el);
            }
        };
    }
    window.Views.settings = { render(el) { render(el); bind(el); }, refresh(reason) { if (reason === 'replace' && root) render(root); } };
})();
