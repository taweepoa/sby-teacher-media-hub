/* สำรอง / เปิดไฟล์ข้อมูล (.json รวมรูป) • กู้คืนข้อมูลก่อนหน้า • ข้อมูลตัวอย่าง • ล้างข้อมูล */
(function () {
    'use strict';

    let root = null;
    const kb = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

    function render(el) {
        root = el;
        const d = Store.data;
        const m = Store.meta;
        const warn = Store.needsBackup();
        let dataBytes = 0;
        try { dataBytes = (localStorage.getItem(Store.KEY) || '').length * 2; } catch (e) { /* ข้าม */ }
        el.innerHTML = `
            ${U.hero({ icon: 'fa-floppy-disk', title: 'สำรอง / เปิดไฟล์ข้อมูล', sub: 'ข้อมูลทั้งหมดเก็บในเบราว์เซอร์เครื่องนี้ • บันทึกเป็นไฟล์ .json (รวมรูปภาพ) เพื่อสำรอง ย้ายเครื่อง หรือแบ่งปันชุดคำถามให้เพื่อนครู' })}
            <div class="row g-3">
                <div class="col-lg-6">
                    <div class="panel panel--green h-100">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-download"></i></span><div><h3>บันทึกไฟล์ข้อมูล (.json)</h3><small>${warn ? 'มีการแก้ไขที่ยังไม่ได้สำรอง' : 'สำรองล่าสุดแล้ว'}</small></div></div>
                        <div class="panel-body">
                            <dl class="detail-grid mb-3">
                                <dt>สำรองล่าสุด</dt><dd>${m.lastBackupAt ? `${U.esc(U.thDate(m.lastBackupAt, true))}<br><small class="text-muted-2">${U.esc(m.lastBackupName || '')}</small>` : '<span class="tag warn">ยังไม่เคยสำรอง</span>'}</dd>
                                <dt>แก้ไขล่าสุด</dt><dd>${m.lastChangeAt ? U.esc(U.thDate(m.lastChangeAt, true)) : '-'}</dd>
                                <dt>ข้อมูล</dt><dd>คำถาม ${d.sets.length} ชุด ${UI.fmt(Store.questionCount())} ข้อ • ทีม ${d.teams.length} • ผลการแข่งขัน ${d.matches.length}</dd>
                                <dt>พื้นที่ที่ใช้</dt><dd>ข้อมูล ${kb(dataBytes)} • รูปภาพ ${Img.count} รูป ${kb(Img.bytes())}${Img.mode === 'local' ? ' <span class="tag warn">เบราว์เซอร์นี้ไม่มี IndexedDB เก็บรูปได้จำกัด</span>' : ''}</dd>
                            </dl>
                            <button type="button" class="btn-x ${warn ? 'orange' : 'green'} lg w-100" data-act="save"><i class="fas fa-download"></i>บันทึกไฟล์ข้อมูลตอนนี้</button>
                            <div class="form-text mt-2">เก็บไฟล์ไว้ในแฟลชไดรฟ์ หรือ Google Drive • ชื่อไฟล์มีวันที่ให้อัตโนมัติ • เกมที่กำลังเล่นอยู่ไม่รวมในไฟล์ (ผลที่บันทึกแล้วรวมอยู่)</div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="panel panel--theme h-100">
                        <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-folder-open"></i></span><div><h3>เปิดไฟล์ข้อมูล</h3><small>แทนที่ข้อมูลในเครื่องนี้ด้วยข้อมูลในไฟล์</small></div></div>
                        <div class="panel-body">
                            <div class="note warn"><i class="fas fa-triangle-exclamation"></i><div>ข้อมูลปัจจุบันจะถูก<b>แทนที่</b> — ระบบเก็บข้อมูลก่อนหน้าไว้ 1 ชุด กู้คืนได้ด้านล่าง<br><small>ต้องการเพิ่มเฉพาะคำถามจากไฟล์ของเพื่อน? ให้เพื่อนส่งออกชุดคำถามเป็น Excel แล้วใช้เมนู "นำเข้าคำถาม (Excel)"</small></div></div>
                            <button type="button" class="btn-x primary lg w-100" data-act="open" data-demo-lock="เปิดไฟล์ข้อมูล (.json)"><i class="fas fa-folder-open"></i>เลือกไฟล์ .json</button>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="panel panel--orange">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-clock-rotate-left"></i></span><div><h3>กู้คืนข้อมูลก่อนหน้า</h3><small>ย้อนกลับก่อนการเปิดไฟล์/ใช้ข้อมูลตัวอย่าง/ล้างข้อมูลครั้งล่าสุด</small></div></div>
                        <div class="panel-body"><button type="button" class="btn-x ghost w-100" data-act="restore" data-demo-lock="กู้คืนข้อมูลชุดก่อนหน้า"${Store.hasPrevious() ? '' : ' disabled'}><i class="fas fa-clock-rotate-left"></i>${Store.hasPrevious() ? 'กู้คืนข้อมูลชุดก่อนหน้า' : 'ยังไม่มีข้อมูลชุดก่อนหน้า'}</button></div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="panel panel--pink">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#FF375F;--b:#BF5AF2"><i class="fas fa-flask"></i></span><div><h3>ข้อมูลตัวอย่าง / เริ่มใหม่</h3><small>ทดลองระบบ หรือเริ่มต้นใหม่ทั้งหมด</small></div></div>
                        <div class="panel-body d-flex gap-2 flex-wrap">
                            <button type="button" class="btn-x orange" data-act="demo"><i class="fas fa-flask"></i>ใช้ข้อมูลตัวอย่าง</button>
                            <button type="button" class="btn-x danger" data-act="reset" data-demo-lock="ล้างข้อมูลทั้งหมด"><i class="fas fa-trash-can"></i>ล้างข้อมูลทั้งหมด</button>
                        </div>
                    </div>
                </div>
            </div>`;
        el.querySelector('[data-act="save"]').onclick = App.backupNow;
        el.querySelector('[data-act="open"]').onclick = App.openFile;
        el.querySelector('[data-act="restore"]').onclick = async () => {
            if (!VSDemo.allow('กู้คืนข้อมูลชุดก่อนหน้า')) return;
            if (!(await U.confirm('กู้คืนข้อมูลชุดก่อนหน้า?', 'ข้อมูลปัจจุบันจะถูกสลับกับข้อมูลชุดก่อนหน้า (กดกู้คืนอีกครั้งเพื่อสลับกลับได้)', { confirmText: 'กู้คืน', icon: 'question' }))) return;
            if (Store.restorePrevious()) U.toast('กู้คืนข้อมูลชุดก่อนหน้าแล้ว', { type: 'ok' });
        };
        el.querySelector('[data-act="demo"]').onclick = async () => {
            if (!(await U.confirm('ใช้ข้อมูลตัวอย่าง?', `ข้อมูลปัจจุบันจะถูกแทนที่ด้วยข้อมูลตัวอย่าง (ชุดคำถาม 7 วิชา ทีม 6 ทีม ผลการแข่งขัน 2 รายการ และเกมทดลองเล่น 1 เกม — ชื่อสมมติ)${Store.isEmpty() ? '' : '<br><b>แนะนำให้บันทึกไฟล์ข้อมูลก่อน</b> (กู้คืนได้ที่ "กู้คืนข้อมูลก่อนหน้า")'}`, { confirmText: 'ใช้ข้อมูลตัวอย่าง', danger: !Store.isEmpty() }))) return;
            App.loadDemo();
        };
        el.querySelector('[data-act="reset"]').onclick = async () => {
            if (!VSDemo.allow('ล้างข้อมูลทั้งหมด')) return;
            const r = await Swal.fire({
                title: 'ล้างข้อมูลทั้งหมด?', icon: 'warning',
                html: 'ชุดคำถาม ทีม ผลการแข่งขัน และเกมที่กำลังเล่นจะถูกลบ<br>พิมพ์คำว่า <b>ล้างข้อมูล</b> เพื่อยืนยัน',
                input: 'text', inputPlaceholder: 'ล้างข้อมูล', showCancelButton: true, confirmButtonText: 'ล้างข้อมูลทั้งหมด', cancelButtonText: 'ยกเลิก',
                buttonsStyling: false, reverseButtons: true, customClass: { popup: 'swal-x', confirmButton: 'btn-x orange lg', cancelButton: 'btn-x ghost lg' },
                inputValidator: (v) => (U.norm(v) !== 'ล้างข้อมูล' ? 'กรุณาพิมพ์คำว่า "ล้างข้อมูล"' : null),
            });
            if (!r.isConfirmed) return;
            Link.clear();
            Store.resetAll();
            U.toast('ล้างข้อมูลแล้ว (กู้คืนได้ที่ "กู้คืนข้อมูลก่อนหน้า")', { type: 'ok', ms: 5000 });
        };
    }

    window.Views.backup = { render, refresh: () => render(root) };
})();
