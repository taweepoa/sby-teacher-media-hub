/* สำรอง / เปิดไฟล์ข้อมูล (.json) • กู้คืนข้อมูลก่อนหน้า • ข้อมูลตัวอย่าง • ล้างข้อมูล */
(function () {
    'use strict';

    let root = null;

    function render(el) {
        root = el;
        const d = Store.data;
        const m = Store.meta;
        const warn = Store.needsBackup();
        const items = d.sets.reduce((n, s) => n + s.items.length, 0);
        el.innerHTML = `
            ${U.hero({ icon: 'fa-floppy-disk', title: 'สำรอง / เปิดไฟล์ข้อมูล', sub: 'ข้อมูลทั้งหมดเก็บในเบราว์เซอร์เครื่องนี้ • บันทึกเป็นไฟล์ .json เพื่อสำรอง ย้ายเครื่อง หรือแบ่งปันชุดคำให้เพื่อนครู' })}
            <div class="backup-grid">
                <div class="panel panel--green">
                    <div class="panel-head"><span class="ic-box sm" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-download"></i></span><div><h3>บันทึกไฟล์ข้อมูล (.json)</h3><small>${warn ? 'มีการแก้ไขที่ยังไม่ได้สำรอง' : 'สำรองล่าสุดแล้ว'}</small></div></div>
                    <div class="panel-body">
                        <dl class="detail-grid mb-3">
                            <dt>สำรองล่าสุด</dt><dd>${m.lastBackupAt ? `${U.esc(U.thDate(m.lastBackupAt, true))}<br><small class="text-muted-2">${U.esc(m.lastBackupName || '')}</small>` : '<span class="tag warn">ยังไม่เคยสำรอง</span>'}</dd>
                            <dt>แก้ไขล่าสุด</dt><dd>${m.lastChangeAt ? U.esc(U.thDate(m.lastChangeAt, true)) : '-'}</dd>
                            <dt>ข้อมูล</dt><dd>ชุดคำ ${d.sets.length} ชุด (${items.toLocaleString()} คำ) • เกม ${d.games.length}</dd>
                        </dl>
                        <button type="button" class="btn-x ${warn ? 'orange' : 'green'} lg w-100" data-act="save"><i class="fas fa-download"></i>บันทึกไฟล์ข้อมูลตอนนี้</button>
                    </div>
                </div>
                <div class="panel panel--theme">
                    <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-folder-open"></i></span><div><h3>เปิดไฟล์ข้อมูล</h3><small>แทนที่ข้อมูลในเครื่องนี้ด้วยข้อมูลในไฟล์</small></div></div>
                    <div class="panel-body">
                        <div class="note warn"><i class="fas fa-triangle-exclamation"></i><div>ข้อมูลปัจจุบันจะถูก<b>แทนที่</b> — ระบบเก็บข้อมูลก่อนหน้าไว้ 1 ชุด กู้คืนได้ด้านล่าง</div></div>
                        <button type="button" class="btn-x primary lg w-100" data-act="open" data-demo-lock="เปิดไฟล์ข้อมูล (.json)"><i class="fas fa-folder-open"></i>เลือกไฟล์ .json</button>
                    </div>
                </div>
                <div class="panel panel--orange">
                    <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-clock-rotate-left"></i></span><div><h3>กู้คืนข้อมูลก่อนหน้า</h3><small>ย้อนกลับก่อนการเปิดไฟล์/ใช้ข้อมูลตัวอย่าง/ล้างข้อมูลครั้งล่าสุด</small></div></div>
                    <div class="panel-body"><button type="button" class="btn-x ghost w-100" data-act="restore" data-demo-lock="กู้คืนข้อมูลชุดก่อนหน้า"${Store.hasPrevious() ? '' : ' disabled'}><i class="fas fa-clock-rotate-left"></i>${Store.hasPrevious() ? 'กู้คืนข้อมูลชุดก่อนหน้า' : 'ยังไม่มีข้อมูลชุดก่อนหน้า'}</button></div>
                </div>
                <div class="panel panel--pink">
                    <div class="panel-head"><span class="ic-box sm" style="--a:#FF375F;--b:#BF5AF2"><i class="fas fa-flask"></i></span><div><h3>ข้อมูลตัวอย่าง / เริ่มใหม่</h3><small>ทดลองระบบ หรือเริ่มภาคเรียนใหม่</small></div></div>
                    <div class="panel-body d-flex gap-2 flex-wrap">
                        <button type="button" class="btn-x orange" data-act="demo"><i class="fas fa-flask"></i>ใช้ข้อมูลตัวอย่าง</button>
                        <button type="button" class="btn-x danger" data-act="reset" data-demo-lock="ล้างข้อมูลทั้งหมด"><i class="fas fa-trash-can"></i>ล้างข้อมูลทั้งหมด</button>
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
            if (!(await U.confirm('ใช้ข้อมูลตัวอย่าง?', `ข้อมูลปัจจุบันจะถูกแทนที่ด้วยข้อมูลตัวอย่าง (ชุดคำ 5 วิชา เกม 3 รายการ ชื่อสมมติ)${Store.isEmpty() ? '' : '<br><b>แนะนำให้บันทึกไฟล์ข้อมูลก่อน</b> (กู้คืนได้ที่ "กู้คืนข้อมูลก่อนหน้า")'}`, { confirmText: 'ใช้ข้อมูลตัวอย่าง', danger: !Store.isEmpty() }))) return;
            App.loadDemo();
        };
        el.querySelector('[data-act="reset"]').onclick = async () => {
            if (!VSDemo.allow('ล้างข้อมูลทั้งหมด')) return;
            const r = await Swal.fire({
                title: 'ล้างข้อมูลทั้งหมด?', icon: 'warning',
                html: 'ชุดคำ การ์ด ประวัติการเรียก และผู้ชนะทั้งหมดจะถูกลบ<br>พิมพ์คำว่า <b>ล้างข้อมูล</b> เพื่อยืนยัน',
                input: 'text', inputPlaceholder: 'ล้างข้อมูล', showCancelButton: true, confirmButtonText: 'ล้างข้อมูลทั้งหมด', cancelButtonText: 'ยกเลิก',
                buttonsStyling: false, reverseButtons: true, customClass: { popup: 'swal-x', confirmButton: 'btn-x orange lg', cancelButton: 'btn-x ghost lg' },
                inputValidator: (v) => (U.norm(v) !== 'ล้างข้อมูล' ? 'กรุณาพิมพ์คำว่า "ล้างข้อมูล"' : null),
            });
            if (!r.isConfirmed) return;
            Store.resetAll();
            U.toast('ล้างข้อมูลแล้ว (กู้คืนได้ที่ "กู้คืนข้อมูลก่อนหน้า")', { type: 'ok', ms: 5000 });
        };
    }

    window.Views = window.Views || {};
    window.Views.backup = { render, refresh: () => render(root) };
})();
