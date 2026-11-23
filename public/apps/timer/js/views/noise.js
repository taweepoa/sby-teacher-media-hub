/* ไฟจราจรเสียงดัง: วัดระดับเสียงห้องด้วยไมโครโฟน (เมื่อผู้ใช้อนุญาตเท่านั้น) */
(function () {
    'use strict';

    let root = null;
    let light = null;

    function render(el) {
        root = el;
        const cfg = Store.settings.noise;
        const N = Noise;
        const secure = N.supported();
        el.innerHTML = `<div class="page-noise">
            ${U.hero({
                cls: 'hero--noise',
                icon: 'fa-traffic-light',
                title: 'ไฟจราจรเสียงดัง',
                sub: 'วัดระดับเสียงในห้องเรียนด้วยไมโครโฟน แสดงไฟเขียว–เหลือง–แดง ให้นักเรียนเห็นเองว่าเสียงดังเกินไปหรือยัง • ไม่บันทึกเสียง ไม่ส่งข้อมูลไปที่ใด',
                side: `<button type="button" class="hero-btn" data-act="full"><i class="fas fa-expand"></i>แสดงเต็มจอ</button>`,
            })}
            <div class="row g-3">
                <div class="col-xl-8">
                    <div class="panel panel--theme">
                        <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-microphone-lines"></i></span>
                            <div><h3>ระดับเสียงในห้อง</h3><small id="nz-status"></small></div>
                            <div class="panel-tools" id="nz-tools"></div></div>
                        <div class="panel-body">
                            <div id="nz-msg"></div>
                            <div class="nz-stage" id="nz-stage"></div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-4">
                    <div class="panel panel--orange">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-sliders"></i></span><div><h3>ปรับระดับ</h3><small>ลองให้ห้องเงียบ แล้วปรับให้ไฟเป็นสีเขียว</small></div></div>
                        <div class="panel-body">
                            <form id="nz-form" autocomplete="off">
                                <label class="form-label d-flex justify-content-between" for="nz-sens"><span>ความไวไมโครโฟน</span><b data-v="sens">${cfg.sens}</b></label>
                                <input type="range" class="form-range" id="nz-sens" name="sens" min="0" max="100" value="${cfg.sens}">
                                <div class="form-text mb-3">ไมค์อยู่ไกลนักเรียน/ห้องใหญ่ → เพิ่มความไว • ไมค์อยู่ใกล้ → ลดความไว</div>
                                <label class="form-label d-flex justify-content-between" for="nz-yellow"><span><i class="fas fa-circle" style="color:#f59e0b"></i> ไฟเหลืองเมื่อดังเกิน</span><b data-v="yellow">${cfg.yellow}</b></label>
                                <input type="range" class="form-range" id="nz-yellow" name="yellow" min="5" max="95" value="${cfg.yellow}">
                                <label class="form-label d-flex justify-content-between mt-2" for="nz-red"><span><i class="fas fa-circle" style="color:#ef4444"></i> ไฟแดงเมื่อดังเกิน</span><b data-v="red">${cfg.red}</b></label>
                                <input type="range" class="form-range" id="nz-red" name="red" min="10" max="100" value="${cfg.red}">
                                <hr>
                                <label class="check-line mb-2"><input type="checkbox" class="form-check-input" name="alarm"${cfg.alarm ? ' checked' : ''}><span><b>เล่นเสียงเตือนเมื่อไฟแดง</b></span></label>
                                <div class="row g-2">
                                    <div class="col-7"><select class="form-select form-select-sm" name="alarmSound" aria-label="เสียงเตือน">${Sound.LIST.filter((x) => x.id !== 'tick').map((x) => `<option value="${x.id}"${cfg.alarmSound === x.id ? ' selected' : ''}>${U.esc(x.name)}</option>`).join('')}</select></div>
                                    <div class="col-5"><select class="form-select form-select-sm" name="cooldown" aria-label="เว้นระยะเสียงเตือน">${[5, 8, 15, 30, 60].map((s) => `<option value="${s}"${cfg.cooldown === s ? ' selected' : ''}>ห่างกัน ${s} วิ.</option>`).join('')}</select></div>
                                </div>
                                <button type="button" class="btn-x ghost sm mt-2" data-act="test"><i class="fas fa-play"></i>ทดลองฟังเสียงเตือน</button>
                            </form>
                        </div>
                    </div>
                    <div class="panel panel--teal">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#00C7BE;--b:#0A84FF"><i class="fas fa-shield-halved"></i></span><div><h3>ความเป็นส่วนตัว</h3></div></div>
                        <div class="panel-body small-help">
                            <ul class="ps-3 mb-0">
                                <li>ระบบขอใช้ไมโครโฟน<b>เฉพาะเมื่อกด "เริ่มฟังเสียง"</b> และหยุดทันทีเมื่อกด "หยุด"</li>
                                <li>วัดเฉพาะ<b>ระดับความดัง</b>ในเครื่อง ไม่บันทึกเสียง ไม่ส่งข้อมูลออกนอกเครื่อง</li>
                                <li>ขณะไมค์ทำงานจะมีป้าย <span class="mic-chip"><i class="fas fa-microphone"></i>ไมค์</span> ที่แถบด้านบนเสมอ</li>
                                <li>${secure ? 'ไฟเสียงยังทำงานต่อเมื่อเปิดหน้าอื่น (เช่น นาฬิกาจับเวลา) และแสดงไฟเล็กบนจอเวลาได้' : 'ไมโครโฟนใช้ได้เมื่อเปิดจาก <b>ไฟล์ index.html ในเครื่อง</b> หรือเว็บ <b>https</b> เท่านั้น (ข้อกำหนดของเบราว์เซอร์)'}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div></div>`;
        light = NoiseLight(el.querySelector('#nz-stage'));
        const page = el.firstElementChild;
        page.addEventListener('click', onClick);
        const form = page.querySelector('#nz-form');
        form.addEventListener('input', onForm);
        form.addEventListener('change', onForm);
        form.addEventListener('submit', (e) => e.preventDefault());
        paint();
    }

    function paint() {
        if (!root || !root.isConnected) return;
        const N = Noise;
        const tools = root.querySelector('#nz-tools');
        let html;
        if (N.active) {
            html = `<button type="button" class="btn-x ghost sm" data-act="resetstats"><i class="fas fa-rotate"></i>เริ่มนับใหม่</button>
                <button type="button" class="btn-x danger sm" data-act="stop"><i class="fas fa-stop"></i>หยุดฟังเสียง</button>`;
        } else {
            html = `<button type="button" class="btn-x primary" data-act="start"${N.starting ? ' disabled' : ''}><i class="fas fa-microphone"></i>${N.starting ? 'กำลังขอใช้ไมโครโฟน…' : 'เริ่มฟังเสียง'}</button>
                <button type="button" class="btn-x ghost sm" data-act="sim"><i class="fas fa-wave-square"></i>ทดลองแบบจำลอง (ไม่ใช้ไมค์)</button>`;
        }
        tools.innerHTML = html;
        root.querySelector('#nz-status').innerHTML = N.active
            ? (N.simulated ? '<span class="tag warn"><i class="fas fa-wave-square"></i>โหมดจำลอง — ไม่ได้ใช้ไมโครโฟนจริง</span>' : '<span class="tag ok"><i class="fas fa-microphone"></i>กำลังฟังเสียงจากไมโครโฟน</span>')
            : 'กด "เริ่มฟังเสียง" แล้วเลือก "อนุญาต" เมื่อเบราว์เซอร์ถาม';
        const msg = root.querySelector('#nz-msg');
        if (N.error) msg.innerHTML = `<div class="note bad"><i class="fas fa-microphone-slash"></i><div>${U.esc(N.error)}<div class="mt-1"><small>ยังทดลองใช้ได้ด้วยปุ่ม <b>"ทดลองแบบจำลอง"</b></small></div></div></div>`;
        else if (!N.active && !N.supported()) msg.innerHTML = `<div class="note warn"><i class="fas fa-circle-info"></i><div>${U.esc(N.errorText(null))}<div class="mt-1"><small>ตอนนี้ทดลองดูการทำงานได้ด้วยปุ่ม <b>"ทดลองแบบจำลอง"</b></small></div></div></div>`;
        else msg.innerHTML = '';
        light.update();
    }

    async function onClick(e) {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const a = b.dataset.act;
        if (a === 'start') { await Noise.start(); paint(); }
        else if (a === 'sim') { Noise.startSim(); paint(); }
        else if (a === 'stop') { Noise.stop(); paint(); }
        else if (a === 'resetstats') { Noise.resetStats(); light.update(); }
        else if (a === 'full') Stage.open('noise');
        else if (a === 'test') { const c = Store.settings.noise; Sound.preview(c.alarmSound, Store.settings.sound.volume / 100); }
    }

    const save = U.debounce(() => Store.commit('settings'), 400);
    function onForm(e) {
        const f = e.currentTarget;
        const cfg = Store.settings.noise;
        const n = e.target.name;
        if (!n) return;
        if (n === 'alarm') cfg.alarm = e.target.checked;
        else if (n === 'alarmSound') cfg.alarmSound = e.target.value;
        else cfg[n] = +e.target.value;
        // ไฟแดงต้องสูงกว่าไฟเหลืองเสมอ
        if (n === 'yellow' && cfg.red <= cfg.yellow) { cfg.red = Math.min(100, cfg.yellow + 5); f.elements.red.value = cfg.red; }
        if (n === 'red' && cfg.yellow >= cfg.red) { cfg.yellow = Math.max(5, cfg.red - 5); f.elements.yellow.value = cfg.yellow; }
        ['sens', 'yellow', 'red'].forEach((k) => { const v = root.querySelector(`[data-v="${k}"]`); if (v) v.textContent = cfg[k]; });
        save();
    }

    window.Views = window.Views || {};
    window.Views.noise = {
        render,
        frame() { if (root && root.isConnected && light) light.update(); },
        refresh(reason) { if (reason !== 'settings' && root && root.isConnected) render(root); },
        noiseChanged() { paint(); },
        leave() { root = null; light = null; },
    };
})();
