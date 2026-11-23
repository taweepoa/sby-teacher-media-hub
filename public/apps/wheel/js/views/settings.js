/* ตั้งค่า: ข้อมูลโรงเรียน/ครู (ใช้ในรายงาน) • เสียง • วงล้อ • เอฟเฟกต์ • อธิบายความยุติธรรม */
(function () {
    'use strict';

    let root = null;

    function render(el) {
        root = el;
        const d = Store.data;
        const s = d.school;
        const st = d.settings;
        const y = new Date().getFullYear() + 543;
        el.innerHTML = `
            ${U.hero({ cls: 'hero--settings', icon: 'fa-sliders', title: 'ตั้งค่า', sub: 'ข้อมูลโรงเรียนและครูผู้สอน (ใช้ในรายงาน .docx) • เสียง • วงล้อ • เอฟเฟกต์ฉลอง' })}
            <div class="row g-3">
                <div class="col-xl-6">
                    <div class="panel panel--theme">
                        <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-school"></i></span><div><h3>ข้อมูลโรงเรียนและครูผู้สอน</h3><small>ใช้ในหัวรายงานและช่องลงนาม — เว้นว่างได้ รายงานจะเว้นจุดไข่ปลาให้เขียนเอง</small></div></div>
                        <div class="panel-body">
                            <div class="row g-3">
                                <div class="col-12"><label class="form-label" for="sc-name">ชื่อโรงเรียน</label><input class="form-control" id="sc-name" data-k="name" maxlength="120" value="${U.esc(s.name)}" placeholder="โรงเรียน..."></div>
                                <div class="col-md-6"><label class="form-label" for="sc-teacher">ชื่อครูผู้สอน (พร้อมคำนำหน้า)</label><input class="form-control" id="sc-teacher" data-k="teacherName" maxlength="80" value="${U.esc(s.teacherName)}" placeholder="นาย/นาง/นางสาว..."></div>
                                <div class="col-md-6"><label class="form-label" for="sc-pos">ตำแหน่ง</label><input class="form-control" id="sc-pos" data-k="teacherPosition" maxlength="80" value="${U.esc(s.teacherPosition)}" placeholder="เช่น ครู / ครูชำนาญการ"></div>
                                <div class="col-md-6"><label class="form-label" for="sc-subj">รายวิชา/กิจกรรมหลัก</label><input class="form-control" id="sc-subj" data-k="subject" maxlength="80" value="${U.esc(s.subject)}" placeholder="เช่น วิทยาการคำนวณ"></div>
                                <div class="col-6 col-md-3"><label class="form-label" for="sc-sem">ภาคเรียน</label><select class="form-select" id="sc-sem" data-k="semester">${U.options(['1', '2', '3'], s.semester)}</select></div>
                                <div class="col-6 col-md-3"><label class="form-label" for="sc-year">ปีการศึกษา</label><select class="form-select" id="sc-year" data-k="academicYear">${U.options([y - 2, y - 1, y, y + 1].map(String), s.academicYear)}</select></div>
                            </div>
                        </div>
                    </div>
                    <div class="panel panel--slate">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#475569;--b:#94a3b8"><i class="fas fa-scale-balanced"></i></span><div><h3>การสุ่มยุติธรรมอย่างไร</h3><small>อธิบายให้นักเรียนฟังได้</small></div></div>
                        <div class="panel-body fair-explain">
                            <ol>
                                <li>ระบบใช้<b>ตัวสุ่มของระบบปฏิบัติการ</b> (<code>crypto.getRandomValues</code>) ซึ่งเป็นมาตรฐานเดียวกับที่ใช้สร้างรหัสผ่าน — ไม่ใช่ตัวสุ่มทั่วไปของเว็บ</li>
                                <li><b>สุ่มผู้ชนะก่อน</b> แล้ววงล้อจึงหมุนไปหยุดที่คนนั้น — ความแรง จังหวะการกด หรือการหยุดกลางทาง ไม่มีผลต่อผล</li>
                                <li>ตัดความลำเอียงจากการหารเอาเศษ (rejection sampling) ทุกคนจึงมีโอกาสเท่ากันพอดี</li>
                                <li>ถ้าเปิด "ถ่วงน้ำหนัก" ขนาดช่องบนวงล้อจะกว้างตามโอกาสจริง มองเห็นได้ชัดเจน</li>
                                <li>ทุกครั้งที่สุ่มบันทึกในประวัติพร้อมวันเวลา ตรวจย้อนหลังได้ และกด "ทดสอบความยุติธรรม" ที่หน้าวงล้อเพื่อจำลอง 100,000 ครั้ง</li>
                            </ol>
                        </div>
                    </div>
                </div>
                <div class="col-xl-6">
                    <div class="panel panel--orange">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-volume-high"></i></span><div><h3>เสียงและเอฟเฟกต์</h3><small>เสียงสร้างขึ้นในเครื่อง ไม่ใช้ไฟล์เสียง ไม่ต้องต่ออินเทอร์เน็ต</small></div></div>
                        <div class="panel-body">
                            <label class="opt-switch"><input type="checkbox" id="se-sound"${st.sound ? ' checked' : ''}><div><b>เปิดเสียง</b><small>เสียงติ๊กตอนหมุน เสียงแตรประกาศผล (ปุ่มลำโพงมุมขวาบนเปิด/ปิดได้ทุกหน้า)</small></div></label>
                            <div class="d-flex align-items-center gap-3 mb-3">
                                <label class="form-label mb-0" for="se-vol" style="min-width:90px">ความดัง <b id="se-vol-v">${Math.round(st.volume * 100)}%</b></label>
                                <input type="range" class="form-range" id="se-vol" min="0" max="100" step="5" value="${Math.round(st.volume * 100)}">
                                <button type="button" class="btn-x ghost sm" id="se-test"><i class="fas fa-play"></i>ทดสอบเสียง</button>
                            </div>
                            <label class="opt-switch"><input type="checkbox" id="se-confetti"${st.confetti ? ' checked' : ''}><div><b>กระดาษสีโปรยตอนประกาศผล</b><small>เครื่องที่ตั้งค่า "ลดการเคลื่อนไหว" จะไม่แสดงอัตโนมัติ</small></div></label>
                        </div>
                    </div>
                    <div class="panel panel--pink">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#FF375F;--b:#BF5AF2"><i class="fas fa-dharmachakra"></i></span><div><h3>วงล้อ</h3><small>ปรับได้ที่หน้าวงล้อด้วย</small></div></div>
                        <div class="panel-body">
                            <div class="row g-3">
                                <div class="col-md-6"><label class="form-label" for="se-label">ชื่อที่แสดงบนวงล้อ</label><select class="form-select" id="se-label">${U.options(Object.keys(Store.LABELS).map((k) => ({ value: k, text: Store.LABELS[k] })), st.label)}</select></div>
                                <div class="col-md-6"><label class="form-label" for="se-dur">เวลาหมุน <b id="se-dur-v">${st.duration}</b> วินาที</label><input type="range" class="form-range" id="se-dur" min="3" max="15" value="${st.duration}"></div>
                                <div class="col-12"><label class="form-label">ชุดสีวงล้อ</label>
                                    <div class="palette-pick">${Object.keys(Store.PALETTES).map((k) => `<label class="pal-opt"><input type="radio" name="se-pal" value="${k}"${st.palette === k ? ' checked' : ''}><div><span class="pal-swatch">${Store.PALETTES[k].map((c) => `<i style="background:${c}"></i>`).join('')}</span><b>${U.esc(Store.PALETTE_NAMES[k])}</b></div></label>`).join('')}</div></div>
                            </div>
                            <label class="opt-switch mt-3"><input type="checkbox" id="se-norep"${st.noRepeat ? ' checked' : ''}><div><b>ไม่ซ้ำจนกว่าจะครบ (ค่าเริ่มต้น)</b><small>คนที่ถูกสุ่มจะถูกนำออกจากวงล้อ ครบแล้วเริ่มรอบใหม่</small></div></label>
                        </div>
                    </div>
                </div>
            </div>`;
        el.querySelectorAll('[data-k]').forEach((inp) => {
            const save = () => { Store.data.school[inp.dataset.k] = U.norm(inp.value); Store.commit('school'); };
            inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', U.debounce(save, 300));
        });
        const set = (k, v) => { Store.data.settings[k] = v; Store.commit('settings'); };
        el.querySelector('#se-sound').onchange = (e) => { set('sound', e.target.checked); if (e.target.checked) { Sound.unlock(); Sound.pop(4); } };
        const vol = el.querySelector('#se-vol');
        vol.oninput = () => { el.querySelector('#se-vol-v').textContent = `${vol.value}%`; };
        vol.onchange = () => { set('volume', +vol.value / 100); Sound.unlock(); Sound.tick(1); };
        el.querySelector('#se-test').onclick = () => {
            if (!Store.data.settings.sound) { U.toast('เสียงปิดอยู่ — เปิด "เปิดเสียง" ก่อน', { type: 'warn' }); return; }
            Sound.unlock();
            Sound.test();
        };
        el.querySelector('#se-confetti').onchange = (e) => { set('confetti', e.target.checked); if (e.target.checked) FX.confetti({ count: 80 }); };
        el.querySelector('#se-label').onchange = (e) => set('label', e.target.value);
        const dur = el.querySelector('#se-dur');
        dur.oninput = () => { el.querySelector('#se-dur-v').textContent = dur.value; };
        dur.onchange = () => set('duration', +dur.value);
        el.querySelectorAll('input[name="se-pal"]').forEach((r) => { r.onchange = () => set('palette', r.value); });
        el.querySelector('#se-norep').onchange = (e) => set('noRepeat', e.target.checked);
    }

    window.Views = window.Views || {};
    window.Views.settings = { render, refresh() {}, leave() { root = null; } };
})();
