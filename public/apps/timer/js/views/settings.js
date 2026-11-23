/* ตั้งค่า: การแสดงผล • สีเตือน • เสียง • ปุ่มเวลาด่วน • การทำงาน • คีย์ลัด (บันทึกอัตโนมัติ) */
(function () {
    'use strict';

    let root = null;

    const sndOpts = (sel, none) => (none ? `<option value=""${sel === '' ? ' selected' : ''}>ไม่มีเสียง</option>` : '') + Sound.LIST.filter((x) => x.id !== 'tick').map((x) => `<option value="${x.id}"${sel === x.id ? ' selected' : ''}>${U.esc(x.name)}</option>`).join('');
    const opts = (list, sel) => list.map(([v, t]) => `<option value="${v}"${String(sel) === String(v) ? ' selected' : ''}>${t}</option>`).join('');
    const chk = (name, on, title, hint) => `<label class="check-line"><input type="checkbox" class="form-check-input" name="${name}"${on ? ' checked' : ''}><span><b>${title}</b>${hint ? `<br><small class="text-muted-2">${hint}</small>` : ''}</span></label>`;

    function previews(ds) {
        const P = (lv, num, sub) => `<div class="pv-box tdisp bg-${ds.bg} lv-${lv} prog-${ds.progress}"><div class="pv-num">${num}</div><div class="pv-bar"><span style="width:${{ normal: 72, warn: 18, danger: 4, done: 0 }[lv]}%"></span></div><small>${sub}</small></div>`;
        return `<div class="pv-row">${P('normal', '05:00', 'ปกติ')}${P('warn', '00:45', 'ใกล้หมด')}${P('danger', '00:08', 'วินาทีสุดท้าย')}${P('done', '+00:03', 'หมดเวลา')}</div>`;
    }

    function render(el) {
        root = el;
        const s = Store.settings;
        const ds = s.display;
        const so = s.sound;
        el.innerHTML = `<div class="page-settings">
            ${U.hero({ cls: 'hero--settings', icon: 'fa-sliders', title: 'ตั้งค่าการแสดงผลและเสียง', sub: 'ปรับจอเวลาให้อ่านง่ายจากหลังห้อง เลือกเสียงเตือน และปุ่มเวลาด่วน • บันทึกอัตโนมัติทุกครั้งที่เปลี่ยน' })}
            <form id="st-form" autocomplete="off">
            <div class="row g-3">
                <div class="col-xl-7">
                    <div class="panel panel--theme">
                        <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-display"></i></span><div><h3>จอแสดงเวลา</h3><small>มีผลทั้งในหน้าเว็บและโหมดเต็มจอ</small></div></div>
                        <div class="panel-body">
                            <div class="form-label">พื้นหลัง</div>
                            <div class="bg-cards">${Store.BGS.map((b) => `<label class="bg-card"><input type="radio" name="bg" value="${b.id}"${ds.bg === b.id ? ' checked' : ''}><span class="bg-sw bg-${b.id}"><span>05:00</span></span><small>${U.esc(b.name)}</small></label>`).join('')}</div>
                            <div class="form-label mt-3">ตัวอย่างสีเมื่อใกล้หมดเวลา</div>
                            <div id="st-preview">${previews(ds)}</div>
                            <div class="row g-3 mt-1">
                                <div class="col-md-6"><label class="form-label" for="st-progress">แสดงความคืบหน้า</label>
                                    <select class="form-select" id="st-progress" name="progress">${opts(Object.entries(Store.PROGRESS), ds.progress)}</select></div>
                                <div class="col-md-6"><label class="form-label d-flex justify-content-between" for="st-scale"><span>ขนาดตัวเลข</span><b data-v="scale">${ds.scale}%</b></label>
                                    <input type="range" class="form-range" id="st-scale" name="scale" min="50" max="100" step="5" value="${ds.scale}">
                                    <div class="form-text">100% = ใหญ่เต็มพื้นที่จอ</div></div>
                            </div>
                            <div class="check-grid2 mt-2">
                                ${chk('showLabel', ds.showLabel, 'แสดงชื่อกิจกรรม/ช่วงเวลา', 'บรรทัดบนของจอ')}
                                ${chk('showEndTime', ds.showEndTime, 'แสดงเวลาที่จะหมด', 'เช่น "จบเวลา 10:35 น."')}
                                ${chk('flash', ds.flash, 'กะพริบเมื่อหมดเวลา', 'กะพริบสีแดง 12 วินาทีแรก')}
                                ${chk('clockSeconds', ds.clockSeconds, 'นาฬิกาแสดงวินาที', 'โหมดนาฬิกาปัจจุบัน')}
                                ${chk('showNoise', ds.showNoise, 'แสดงไฟเสียงเล็กบนจอเวลา', 'เมื่อเปิดไฟจราจรเสียงอยู่')}
                            </div>
                        </div>
                    </div>
                    <div class="panel panel--orange">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-bolt"></i></span><div><h3>ปุ่มเวลาด่วน</h3><small>หน่วยเป็นนาที (ใส่ 0.5 = 30 วินาทีได้) • คีย์ลัด 1–5</small></div></div>
                        <div class="panel-body">
                            <div class="quick-edit">${s.quick.map((m, i) => `<label><span>ปุ่ม ${i + 1}</span><input class="form-control" type="number" inputmode="decimal" name="q${i}" min="0.5" max="180" step="0.5" value="${m}"></label>`).join('')}</div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-5">
                    <div class="panel panel--pink">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#FF375F;--b:#BF5AF2"><i class="fas fa-volume-high"></i></span><div><h3>เสียงเตือน</h3><small>สร้างด้วยเบราว์เซอร์ (Web Audio) ไม่ใช้ไฟล์เสียงที่มีลิขสิทธิ์</small></div></div>
                        <div class="panel-body">
                            ${chk('on', so.on, 'เปิดเสียงเตือน', 'ปิดได้เร็วด้วยปุ่ม M')}
                            <label class="form-label d-flex justify-content-between mt-3" for="st-volume"><span>ความดัง</span><b data-v="volume">${so.volume}%</b></label>
                            <input type="range" class="form-range" id="st-volume" name="volume" min="0" max="100" step="5" value="${so.volume}">
                            <div class="snd-grid mt-2">
                                <label class="form-label" for="st-end">เมื่อหมดเวลา</label>
                                <div class="snd-row"><select class="form-select" id="st-end" name="end">${sndOpts(so.end, true)}</select>
                                    <select class="form-select snd-rep" name="endRepeat" aria-label="จำนวนครั้ง">${opts([[1, '1 ครั้ง'], [2, '2 ครั้ง'], [3, '3 ครั้ง']], so.endRepeat)}</select>
                                    <button type="button" class="icon-btn" data-test="end" title="ทดลองฟัง" aria-label="ทดลองฟัง"><i class="fas fa-play"></i></button></div>
                                <label class="form-label mt-2" for="st-warn">เตือนก่อนหมดเวลา</label>
                                <div class="snd-row"><select class="form-select" id="st-warn" name="warnSound">${sndOpts(so.warnSound, false)}</select>
                                    <label class="snd-on"><input type="checkbox" class="form-check-input" name="warn"${so.warn ? ' checked' : ''}> เปิด</label>
                                    <button type="button" class="icon-btn" data-test="warnSound" title="ทดลองฟัง" aria-label="ทดลองฟัง"><i class="fas fa-play"></i></button></div>
                                <label class="form-label mt-2" for="st-seg">เปลี่ยนช่วง (ชุดหลายช่วงเวลา)</label>
                                <div class="snd-row"><select class="form-select" id="st-seg" name="segment">${sndOpts(so.segment, true)}</select>
                                    <button type="button" class="icon-btn" data-test="segment" title="ทดลองฟัง" aria-label="ทดลองฟัง"><i class="fas fa-play"></i></button></div>
                                <label class="form-label mt-2" for="st-ticks">เสียงติ๊กนับวินาทีสุดท้าย</label>
                                <div class="snd-row"><select class="form-select" id="st-ticks" name="ticks">${opts([[0, 'ไม่มี'], [3, '3 วินาทีสุดท้าย'], [5, '5 วินาทีสุดท้าย'], [10, '10 วินาทีสุดท้าย']], so.ticks)}</select>
                                    <button type="button" class="icon-btn" data-test="tick" title="ทดลองฟัง" aria-label="ทดลองฟัง"><i class="fas fa-play"></i></button></div>
                            </div>
                        </div>
                    </div>
                    <div class="panel panel--purple">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#5E5CE6;--b:#BF5AF2"><i class="fas fa-bell"></i></span><div><h3>เตือนเมื่อใกล้หมดเวลา</h3><small>ใช้ทั้งการเปลี่ยนสีและเสียงเตือน</small></div></div>
                        <div class="panel-body">
                            <div class="row g-2">
                                <div class="col-6"><label class="form-label" for="st-warnsec"><i class="fas fa-circle" style="color:#f59e0b"></i> สีเหลือง + เสียงเตือน</label>
                                    <select class="form-select" id="st-warnsec" name="warnSec">${opts([[30, 'เหลือ 30 วินาที'], [60, 'เหลือ 1 นาที'], [120, 'เหลือ 2 นาที'], [180, 'เหลือ 3 นาที'], [300, 'เหลือ 5 นาที']], s.alert.warnSec)}</select></div>
                                <div class="col-6"><label class="form-label" for="st-dangersec"><i class="fas fa-circle" style="color:#ef4444"></i> สีแดง</label>
                                    <select class="form-select" id="st-dangersec" name="dangerSec">${opts([[5, 'เหลือ 5 วินาที'], [10, 'เหลือ 10 วินาที'], [15, 'เหลือ 15 วินาที'], [30, 'เหลือ 30 วินาที']], s.alert.dangerSec)}</select></div>
                            </div>
                            <div class="form-text mt-2">ช่วงเวลาที่สั้นกว่าค่านี้ ระบบใช้สัดส่วนแทน (เหลือง 25% สุดท้าย แดง 10% สุดท้าย)</div>
                        </div>
                    </div>
                    <div class="panel panel--slate">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#475569;--b:#94a3b8"><i class="fas fa-gear"></i></span><div><h3>การทำงาน</h3></div></div>
                        <div class="panel-body">
                            <div class="d-grid gap-2">
                                ${chk('overtime', s.behavior.overtime, 'นับเวลาเกินต่อหลังหมดเวลา', 'แสดงเป็น +00:15 สีแดง (ปิด = ค้างที่ 00:00)')}
                                ${chk('confirmReset', s.behavior.confirmReset, 'ถามก่อนรีเซ็ตขณะเวลากำลังเดิน', 'กันกดพลาดระหว่างสอบ/กิจกรรม')}
                            </div>
                            <label class="form-label mt-3" for="st-wake">ป้องกันจอดับ (Wake Lock)</label>
                            <select class="form-select" id="st-wake" name="wake">${opts(Object.entries(Store.WAKE), s.behavior.wake)}</select>
                            <div class="mt-2" id="st-wake-status">${App.Wake.text()}</div>
                        </div>
                    </div>
                    <div class="panel panel--teal">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#00C7BE;--b:#0A84FF"><i class="fas fa-keyboard"></i></span><div><h3>คีย์ลัด</h3><small>ใช้ได้ในหน้านาฬิกาจับเวลาและโหมดเต็มจอ</small></div></div>
                        <div class="panel-body p-0 dt-wrap"><table class="dt keys-table"><tbody>${App.KEYS.map(([k, t]) => `<tr><td><kbd>${U.esc(k)}</kbd></td><td>${U.esc(t)}</td></tr>`).join('')}</tbody></table></div>
                    </div>
                    <button type="button" class="btn-x ghost w-100" data-act="defaults"><i class="fas fa-rotate-left"></i>คืนค่าการตั้งค่าเริ่มต้น</button>
                </div>
            </div>
            </form></div>`;
        const form = el.querySelector('#st-form');
        form.addEventListener('input', onChange);
        form.addEventListener('change', onChange);
        form.addEventListener('submit', (e) => e.preventDefault());
        form.addEventListener('click', onClick);
    }

    const save = U.debounce(() => { Store.commit('settings'); Timer.replan(); }, 350);

    function onChange(e) {
        const t = e.target;
        const n = t.name;
        if (!n) return;
        const s = Store.settings;
        const val = t.type === 'checkbox' ? t.checked : t.value;
        if (['bg', 'progress'].includes(n)) s.display[n] = val;
        else if (n === 'scale') s.display.scale = +val;
        else if (['showLabel', 'showEndTime', 'flash', 'clockSeconds', 'showNoise'].includes(n)) s.display[n] = val;
        else if (['on', 'warn'].includes(n)) s.sound[n] = val;
        else if (['end', 'warnSound', 'segment'].includes(n)) s.sound[n] = val;
        else if (['volume', 'endRepeat', 'ticks'].includes(n)) s.sound[n] = +val;
        else if (['warnSec', 'dangerSec'].includes(n)) s.alert[n] = +val;
        else if (['overtime', 'confirmReset'].includes(n)) s.behavior[n] = val;
        else if (n === 'wake') { s.behavior.wake = val; setTimeout(async () => { await App.Wake.update(); const w = root && root.querySelector('#st-wake-status'); if (w) w.innerHTML = App.Wake.text(); }, 50); }
        else if (/^q\d$/.test(n)) {
            const v = Math.round(U.toNum(val, 0) * 2) / 2;
            if (v >= 0.5 && v <= 180) s.quick[+n.slice(1)] = v; else if (e.type === 'change') t.value = s.quick[+n.slice(1)];
        }
        ['scale', 'volume'].forEach((k) => { const b = root.querySelector(`[data-v="${k}"]`); if (b) b.textContent = `${k === 'scale' ? s.display.scale : s.sound.volume}%`; });
        if (['bg', 'progress'].includes(n)) root.querySelector('#st-preview').innerHTML = previews(s.display);
        if (n === 'on' && !val) Sound.stopAll();
        save();
    }

    async function onClick(e) {
        const tb = e.target.closest('[data-test]');
        if (tb) {
            const so = Store.settings.sound;
            const k = tb.dataset.test;
            const id = k === 'tick' ? 'tick' : so[k];
            if (!id) { U.toast('เลือก "ไม่มีเสียง" ไว้', { type: 'warn' }); return; }
            Sound.preview(id, so.volume / 100, k === 'end' ? so.endRepeat : 1);
            return;
        }
        const a = e.target.closest('[data-act="defaults"]');
        if (a) {
            if (!(await U.confirm('คืนค่าการตั้งค่าเริ่มต้น?', 'การแสดงผล เสียง ปุ่มเวลาด่วน และไฟจราจรเสียง จะกลับเป็นค่าเริ่มต้น (ชุดหลายช่วงเวลาและตารางคาบไม่เปลี่ยน)', { confirmText: 'คืนค่าเริ่มต้น' }))) return;
            Store.data.settings = Store.defaultSettings();
            Store.commit('settings', { normalize: true });
            Timer.replan();
            render(root);
            U.toast('คืนค่าเริ่มต้นแล้ว', { type: 'ok' });
        }
    }

    window.Views = window.Views || {};
    window.Views.settings = {
        render,
        refresh(reason) { if (reason !== 'settings' && root && root.isConnected) render(root); },
        leave() { root = null; },
    };
})();
