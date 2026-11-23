/* สำรอง / เปิดไฟล์ข้อมูล / กู้คืน / ล้างข้อมูล / ข้อมูลตัวอย่าง */
(function () {
    'use strict';
    const esc = U.esc;
    let root = null;

    function render(el) {
        root = el;
        const m = Store.meta;
        const d = Store.data;
        const kb = Math.round(JSON.stringify(d).length / 1024);
        el.innerHTML = `
            ${U.hero({ icon: 'fa-floppy-disk', title: 'สำรอง / เปิดไฟล์ข้อมูล', sub: 'ข้อมูลอยู่ในเบราว์เซอร์เครื่องนี้ — บันทึกเป็นไฟล์ .json (รวมรูปประกอบคำถามทั้งหมด) เพื่อสำรองหรือย้ายเครื่อง', cls: 'hero--backup' })}
            <div class="result-grid">
            <section class="panel panel--green">
                <div class="panel-head"><span class="ic-box sm" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-download"></i></span><div><h3>บันทึกไฟล์ข้อมูล (.json)</h3><small>สำรองล่าสุด: ${m.lastBackupAt ? esc(U.thDate(m.lastBackupAt, true)) : 'ยังไม่เคยสำรอง'}</small></div></div>
                <div class="panel-body">
                    <dl class="detail-grid"><dt>ชุดคำถาม</dt><dd>${d.sets.length} ชุด • ${Store.questionCount()} ข้อ</dd><dt>กระดาน</dt><dd>${d.boards.length} แบบ</dd><dt>ผลการแข่งขัน</dt><dd>${d.games.length} รายการ</dd><dt>ขนาดข้อมูล</dt><dd>${UI.fmt(kb)} KB (เก็บในเบราว์เซอร์ได้ราว 5,000 KB)</dd></dl>
                    ${Store.needsBackup() ? '<div class="note warn"><i class="fas fa-triangle-exclamation"></i><div>มีข้อมูลที่ยังไม่ได้สำรอง</div></div>' : ''}
                    <button type="button" class="btn-x green lg" data-act="save"><i class="fas fa-download"></i> บันทึกไฟล์ข้อมูล (.json)</button>
                </div>
            </section>
            <section class="panel panel--orange">
                <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-folder-open"></i></span><div><h3>เปิดไฟล์ / กู้คืน</h3><small>ข้อมูลปัจจุบันจะถูกแทนที่ (ระบบเก็บชุดเดิมไว้ 1 ชุด)</small></div></div>
                <div class="panel-body d-flex flex-wrap gap-2">
                    <button type="button" class="btn-x primary" data-act="open" data-demo-lock="เปิดไฟล์ข้อมูล (.json)"><i class="fas fa-folder-open"></i> เปิดไฟล์ข้อมูล (.json)</button>
                    <button type="button" class="btn-x ghost" data-act="restore" data-demo-lock="กู้คืนข้อมูลชุดก่อนหน้า" ${Store.hasPrevious() ? '' : 'disabled'}><i class="fas fa-clock-rotate-left"></i> กู้คืนข้อมูลชุดก่อนหน้า</button>
                    <button type="button" class="btn-x orange" data-act="demo"><i class="fas fa-flask"></i> โหลดข้อมูลตัวอย่าง</button>
                    <button type="button" class="btn-x ghost text-danger" data-act="clear" data-demo-lock="ล้างข้อมูลทั้งหมด"><i class="fas fa-eraser"></i> ล้างข้อมูลทั้งหมด</button>
                </div>
            </section></div>`;
        el.onclick = async (e) => {
            const b = e.target.closest('[data-act]');
            if (!b) return;
            const a = b.dataset.act;
            if (a === 'save') App.backupNow();
            else if (a === 'open') App.openFile();
            else if (a === 'restore') {
                if (!VSDemo.allow('กู้คืนข้อมูลชุดก่อนหน้า')) return;
                if (await U.confirm('กู้คืนข้อมูลชุดก่อนหน้า?', 'ข้อมูลปัจจุบันจะถูกสลับกับชุดก่อนหน้า (กดซ้ำเพื่อสลับกลับได้)', { icon: 'question' })) { Store.restorePrevious(); U.toast('กู้คืนแล้ว', { type: 'ok' }); }
            } else if (a === 'demo') {
                if (!Store.isEmpty() && !(await U.confirm('โหลดข้อมูลตัวอย่าง?', 'ข้อมูลปัจจุบันจะถูก<b>แทนที่</b>ด้วยข้อมูลตัวอย่าง (กู้คืนชุดเดิมได้ด้วยปุ่ม "กู้คืนข้อมูลชุดก่อนหน้า")', { danger: true, confirmText: 'โหลดข้อมูลตัวอย่าง' }))) return;
                App.loadDemo();
            } else if (a === 'clear') {
                if (!VSDemo.allow('ล้างข้อมูลทั้งหมด')) return;
                const ok = await U.confirm('ล้างข้อมูลทั้งหมด?', 'ชุดคำถาม รูป กระดาน และผลการแข่งขันทั้งหมดจะถูกลบ<br><b>แนะนำให้บันทึกไฟล์ข้อมูลก่อน</b>', { danger: true, confirmText: '<i class="fas fa-eraser"></i> ล้างข้อมูล' });
                if (!ok) return;
                Store.resetAll();
                U.toast('ล้างข้อมูลแล้ว', { type: 'ok' });
            }
        };
    }
    window.Views.backup = { render, refresh() { if (root) render(root); } };
})();
