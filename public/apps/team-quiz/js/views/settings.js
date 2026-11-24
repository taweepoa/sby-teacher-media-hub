/* ตั้งค่า: ข้อมูลโรงเรียน (ใช้ในรายงาน) • ค่าเริ่มต้นของเกม • ปุ่มกดออดของทีม • เสียงประกอบ */
(function () {
    'use strict';
    const esc = U.esc;
    const SOUND_LABEL = { show: 'แสดงคำถาม', buzz: 'กดออด', correct: 'ตอบถูก', wrong: 'ตอบผิด', reveal: 'เฉลย', timeup: 'หมดเวลา', tick: 'นับถอยหลัง', score: 'ได้คะแนน', pick: 'เลือกช่อง', fanfare: 'ประกาศผล' };

    function render(el) {
        const d = Store.data;
        const s = d.school;
        const st = d.settings;
        const keyOpts = (v) => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ...'abcdefghijklmnopqrstuvwxyz'.split('')].map((k) => `<option value="${k}"${k === v ? ' selected' : ''}>${k.toUpperCase()}</option>`).join('');
        el.innerHTML = `
            ${U.hero({ icon: 'fa-gear', title: 'ตั้งค่าและข้อมูลโรงเรียน', sub: 'บันทึกอัตโนมัติเมื่อแก้ไข' })}
            <div class="row g-3">
                <div class="col-xl-6">
                    <div class="panel panel--theme mb-3">
                        <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-school"></i></span><div><h3>ข้อมูลโรงเรียน</h3><small>ใช้ในใบประกาศผล เกียรติบัตร และรายงาน .docx — เว้นว่างได้ (จะเป็นจุดไข่ปลา)</small></div></div>
                        <div class="panel-body">
                            <label class="form-label">ชื่อโรงเรียน</label><input class="form-control mb-2" data-s="name" value="${esc(s.name)}" placeholder="เช่น โรงเรียน...">
                            <label class="form-label">ส่วนราชการ (หัวบันทึกข้อความ)</label><input class="form-control mb-2" data-s="agency" value="${esc(s.agency)}" placeholder="เช่น โรงเรียน... อำเภอ... จังหวัด...">
                            <div class="row g-2"><div class="col-6"><label class="form-label">ภาคเรียน</label><select class="form-select" data-s="semester">${['1', '2', '3'].map((x) => `<option${x === s.semester ? ' selected' : ''}>${x}</option>`).join('')}</select></div>
                            <div class="col-6"><label class="form-label">ปีการศึกษา</label><input class="form-control" data-s="academicYear" value="${esc(s.academicYear)}" inputmode="numeric"></div></div>
                            <label class="form-label mt-2">เรียน (ผู้บริหาร)</label><input class="form-control mb-2" data-s="director" value="${esc(s.director)}" placeholder="เช่น ผู้อำนวยการโรงเรียน...">
                            <div class="row g-2"><div class="col-sm-6"><label class="form-label">ผู้รายงาน (ครูผู้รับผิดชอบ)</label><input class="form-control" data-s="reporterName" value="${esc(s.reporterName)}" placeholder="ชื่อ-นามสกุล"></div>
                            <div class="col-sm-6"><label class="form-label">ตำแหน่ง</label><input class="form-control" data-s="reporterPosition" value="${esc(s.reporterPosition)}" placeholder="เช่น ครู"></div></div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-6">
                    <div class="panel panel--orange mb-3">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-sliders"></i></span><div><h3>ค่าเริ่มต้นของเกม</h3><small>ใช้ตอนเริ่มการแข่งขันใหม่ (เปลี่ยนได้ทุกครั้ง)</small></div></div>
                        <div class="panel-body">
                            <div class="row g-2">
                                <div class="col-6 col-md-3"><label class="form-label">เวลาต่อข้อ (วินาที)</label><input class="form-control" data-g="time" type="number" min="0" max="600" inputmode="numeric" value="${st.time}"></div>
                                <div class="col-6 col-md-3"><label class="form-label">คะแนนต่อข้อ</label><input class="form-control" data-g="points" type="number" min="1" inputmode="numeric" value="${st.points}"></div>
                                <div class="col-6 col-md-3"><label class="form-label">ตอบผิดหัก</label><input class="form-control" data-g="penalty" type="number" min="0" inputmode="numeric" value="${st.penalty}"></div>
                                <div class="col-6 col-md-3"><label class="form-label">ตัวเลือก</label><select class="form-select" data-g="letters"><option value="th"${st.letters === 'th' ? ' selected' : ''}>ก ข ค ง</option><option value="en"${st.letters === 'en' ? ' selected' : ''}>A B C D</option></select></div>
                            </div>
                            <label class="check-line mt-3"><input type="checkbox" class="form-check-input" data-g="touchBuzz"${st.touchBuzz ? ' checked' : ''}><span>แตะชื่อทีมบนจอแสดงผลเพื่อกดออด (จอสัมผัส/กระดานอัจฉริยะ)</span></label>
                            <label class="form-label mt-3">ปุ่มกดออดเริ่มต้นของทีม 1–8</label>
                            <div class="key-grid">${st.keys.map((k, i) => `<label><span>ทีม ${i + 1}</span><select class="form-select form-select-sm" data-key="${i}">${keyOpts(k)}</select></label>`).join('')}</div>
                            <div class="form-text">ใช้ได้ทั้งแป้นตัวเลขแถวบน แป้นตัวเลขด้านขวา (Numpad) และตัวอักษร — ไม่ต้องสลับภาษาแป้นพิมพ์ • ชุดปุ่มกดออด USB ที่ส่งค่าเป็นแป้นพิมพ์ก็ใช้ได้</div>
                        </div>
                    </div>
                    <div class="panel panel--purple mb-3">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#5E5CE6;--b:#BF5AF2"><i class="fas fa-volume-high"></i></span><div><h3>เสียงประกอบ</h3><small>สังเคราะห์ในเครื่อง (Web Audio) ไม่ใช้ไฟล์เสียง ไม่มีลิขสิทธิ์</small></div></div>
                        <div class="panel-body">
                            <label class="check-line mb-2"><input type="checkbox" class="form-check-input" data-g="sound"${st.sound ? ' checked' : ''}><span>เปิดเสียงประกอบ</span></label>
                            <label class="form-label">ความดัง <b id="st-vol">${Math.round(st.volume * 100)}%</b></label>
                            <input type="range" class="form-range" min="0" max="1" step="0.05" data-g="volume" value="${st.volume}">
                            <label class="form-label mt-2">ทดลองฟัง</label>
                            <div class="d-flex flex-wrap gap-2">${Object.keys(SOUND_LABEL).map((k) => `<button type="button" class="btn-x ghost sm" data-play="${k}"><i class="fas fa-play"></i>${SOUND_LABEL[k]}</button>`).join('')}</div>
                            <div class="form-text">เสียงออกจากหน้าต่างหน้าจอครู (ลำโพงเดียวกับโปรเจกเตอร์/HDMI) ปรับเปิด-ปิดระหว่างเกมได้ที่เมนู ⋯ ในหน้าจอควบคุม</div>
                        </div>
                    </div>
                </div>
            </div>`;
        el.querySelectorAll('[data-s]').forEach((i) => {
            i.onchange = i.oninput = U.debounce(() => { d.school[i.dataset.s] = U.norm(i.value); Store.commit('settings'); }, 300);
        });
        el.querySelectorAll('[data-g]').forEach((i) => {
            i.onchange = i.oninput = () => {
                const k = i.dataset.g;
                let v = i.type === 'checkbox' ? i.checked : i.value;
                if (['time', 'points', 'penalty', 'volume'].includes(k)) v = Number(v);
                d.settings[k] = v;
                if (k === 'volume') el.querySelector('#st-vol').textContent = `${Math.round(v * 100)}%`;
                if (k === 'volume' || k === 'sound') Sound.set({ volume: d.settings.volume, enabled: d.settings.sound });
                saveSettings();
            };
        });
        el.querySelectorAll('[data-key]').forEach((i) => {
            i.onchange = () => {
                const keys = d.settings.keys.slice();
                const at = keys.indexOf(i.value);
                if (at >= 0 && at !== +i.dataset.key) keys[at] = keys[+i.dataset.key]; // สลับกับทีมที่ใช้ปุ่มนี้อยู่
                keys[+i.dataset.key] = i.value;
                d.settings.keys = keys;
                saveSettings();
                render(el);
            };
        });
        el.querySelectorAll('[data-play]').forEach((b) => { b.onclick = () => { Sound.set({ volume: d.settings.volume, enabled: true }); Sound.play(b.dataset.play); setTimeout(() => Sound.set({ enabled: Link.state ? Link.state.opts.sound !== false : d.settings.sound }), 2500); }; });
    }
    const saveSettings = U.debounce(() => Store.commit('settings', { normalize: true }), 300);

    window.Views.settings = { render, refresh(reason) { if (reason !== 'settings') render(document.getElementById('view')); } };
})();
