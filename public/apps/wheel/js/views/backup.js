/* สำรอง / เปิดไฟล์ข้อมูล (.json) • กู้คืนข้อมูลชุดก่อนหน้า • ล้างข้อมูลทั้งหมด */
(function () {
    'use strict';

    let root = null;

    function sizeText() {
        try {
            const n = (localStorage.getItem(Store.KEY) || '').length * 2;
            return n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
        } catch (e) { return '-'; }
    }

    function render(el) {
        root = el;
        const m = Store.meta;
        const d = Store.data;
        const warn = Store.needsBackup();
        el.innerHTML = `
            ${U.hero({ cls: 'hero--backup', icon: 'fa-floppy-disk', title: 'สำรอง / เปิดไฟล์ข้อมูล', sub: 'บันทึกข้อมูลทั้งหมดเป็นไฟล์ .json เพื่อสำรอง ย้ายเครื่อง หรือใช้ร่วมกันหลายเครื่อง' })}
            <div class="note ${warn ? 'warn' : 'ok'}"><i class="fas ${warn ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i><div>
                ${warn ? '<b>มีข้อมูลที่ยังไม่ได้สำรอง</b> — กด "บันทึกไฟล์ข้อมูล" แล้วเก็บไฟล์ไว้ในแฟลชไดรฟ์หรือ Google Drive' : '<b>ข้อมูลสำรองเป็นปัจจุบันแล้ว</b>'}
                <br><small>สำรองล่าสุด: ${m.lastBackupAt ? `${U.esc(U.thDate(m.lastBackupAt, true))}${m.lastBackupName ? ` (${U.esc(m.lastBackupName)})` : ''}` : 'ยังไม่เคยสำรอง'} • ข้อมูลในเบราว์เซอร์ ${sizeText()}</small></div></div>
            <div class="row g-3">
                <div class="col-lg-6">
                    <div class="panel panel--green h-100">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-download"></i></span><div><h3>บันทึกไฟล์ข้อมูล (.json)</h3><small>รายชื่อทุกห้อง ของรางวัล ประวัติการสุ่ม และการตั้งค่า</small></div></div>
                        <div class="panel-body">
                            <dl class="detail-grid mb-3">
                                <dt>ห้องเรียน</dt><dd>${d.lists.filter((l) => l.kind === 'class').length} ห้อง • ${d.lists.reduce((a, l) => a + (l.kind === 'class' ? l.items.length : 0), 0).toLocaleString()} คน</dd>
                                <dt>รายการกำหนดเอง</dt><dd>${d.lists.filter((l) => l.kind === 'custom').length} รายการ</dd>
                                <dt>ประวัติการสุ่ม</dt><dd>${d.history.length.toLocaleString()} ครั้ง</dd>
                            </dl>
                            <button type="button" class="btn-x cta lg" id="bk-save"><i class="fas fa-download"></i>บันทึกไฟล์ข้อมูล</button>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="panel panel--theme h-100">
                        <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-folder-open"></i></span><div><h3>เปิดไฟล์ข้อมูล</h3><small>แทนที่ข้อมูลปัจจุบันด้วยข้อมูลจากไฟล์ .json</small></div></div>
                        <div class="panel-body">
                            <p class="text-muted-2" style="font-size:.9rem">ใช้ตอนย้ายเครื่อง หรือเปิดข้อมูลภาคเรียนก่อน — ระบบจะแสดงสรุปข้อมูลในไฟล์ให้ตรวจก่อนยืนยัน และเก็บข้อมูลเดิมไว้ 1 ชุด</p>
                            <div class="d-flex gap-2 flex-wrap">
                                <button type="button" class="btn-x primary" id="bk-open" data-demo-lock="เปิดไฟล์ข้อมูล (.json)"><i class="fas fa-folder-open"></i>เลือกไฟล์ .json</button>
                                <button type="button" class="btn-x ghost" id="bk-prev" data-demo-lock="กู้คืนข้อมูลชุดก่อนหน้า"${Store.hasPrevious() ? '' : ' disabled'}><i class="fas fa-clock-rotate-left"></i>กู้คืนข้อมูลชุดก่อนหน้า</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="panel panel--pink">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#FF375F;--b:#BF5AF2"><i class="fas fa-triangle-exclamation"></i></span><div><h3>เริ่มใหม่ / ข้อมูลตัวอย่าง</h3><small>ระบบเก็บข้อมูลเดิมไว้ 1 ชุดเสมอ กู้คืนได้ด้วยปุ่มด้านบน</small></div></div>
                        <div class="panel-body d-flex gap-2 flex-wrap">
                            <button type="button" class="btn-x orange" data-demo><i class="fas fa-flask"></i>โหลดข้อมูลตัวอย่าง</button>
                            <button type="button" class="btn-x danger" id="bk-reset" data-demo-lock="ล้างข้อมูลทั้งหมด"><i class="fas fa-trash"></i>ล้างข้อมูลทั้งหมด</button>
                        </div>
                    </div>
                </div>
            </div>`;
        el.querySelector('#bk-save').onclick = App.backupNow;
        el.querySelector('#bk-open').onclick = App.openFile;
        el.querySelector('#bk-prev').onclick = async () => {
            if (!App.demoAllow('กู้คืนข้อมูลชุดก่อนหน้า')) return;
            if (!(await U.confirm('กู้คืนข้อมูลชุดก่อนหน้า?', 'สลับข้อมูลปัจจุบันกับข้อมูลชุดก่อนหน้า (ก่อนเปิดไฟล์/โหลดตัวอย่าง/ล้างข้อมูลครั้งล่าสุด)', { confirmText: 'กู้คืน', icon: 'question' }))) return;
            if (Store.restorePrevious()) U.toast('กู้คืนข้อมูลชุดก่อนหน้าแล้ว', { type: 'ok' });
        };
        el.querySelector('#bk-reset').onclick = async () => {
            if (!App.demoAllow('ล้างข้อมูลทั้งหมด')) return;
            if (!(await U.confirm('ล้างข้อมูลทั้งหมด?', 'รายชื่อ ของรางวัล ประวัติการสุ่ม และการตั้งค่าจะถูกลบ<br><small>แนะนำให้ "บันทึกไฟล์ข้อมูล" ก่อน</small>', { confirmText: 'ล้างข้อมูล', danger: true }))) return;
            Store.resetAll();
            U.toast('ล้างข้อมูลแล้ว (กู้คืนได้ด้วยปุ่ม "กู้คืนข้อมูลชุดก่อนหน้า")', { type: 'ok', ms: 4500 });
        };
    }

    window.Views = window.Views || {};
    window.Views.backup = { render, refresh() { if (root) render(root); }, leave() { root = null; } };
})();
