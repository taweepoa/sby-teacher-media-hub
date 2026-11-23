/* =====================================================================
   ตัวควบคุมหลัก: เมนู, เปลี่ยนหน้า (#/หน้า), สถานะการสำรองข้อมูล, หน้าต่างต้อนรับ
   ===================================================================== */
(function () {
    'use strict';

    const MENU = [
        { route: 'dashboard', label: 'หน้าหลัก', icon: 'fa-house' },
        { group: 'ในห้องเรียน' },
        { route: 'board', label: 'จอหน้าห้อง (ให้แต้ม)', icon: 'fa-chalkboard-user' },
        { route: 'leaders', label: 'กระดานผู้นำ', icon: 'fa-ranking-star' },
        { route: 'student', label: 'แต้มรายคน / กราฟ', icon: 'fa-chart-line' },
        { route: 'rewards', label: 'รางวัลแลกแต้ม', icon: 'fa-gift', count: (d) => d.rewards.length },
        { group: 'ข้อมูลพื้นฐาน' },
        { route: 'classes', label: 'ห้องเรียน / นักเรียน', icon: 'fa-user-graduate', count: (d) => d.students.length },
        { route: 'skills', label: 'ทักษะ / พฤติกรรม', icon: 'fa-list-check', count: (d) => d.skills.length },
        { route: 'settings', label: 'ข้อมูลโรงเรียน', icon: 'fa-school' },
        { group: 'รายงาน / เกียรติบัตร' },
        { route: 'reports', label: 'รายงานราชการ (.docx)', icon: 'fa-file-word' },
        { route: 'certificate', label: 'เกียรติบัตรดาวเด่น', icon: 'fa-award' },
        { group: 'สำรองข้อมูล' },
        { route: 'backup', label: 'สำรอง / เปิดไฟล์ข้อมูล', icon: 'fa-floppy-disk' },
    ];

    const App = { current: null, params: {} };

    App.go = (route, params) => {
        const q = params ? `?${new URLSearchParams(params).toString()}` : '';
        const target = `#/${route}${q}`;
        if (location.hash === target) App.render();
        else location.hash = target;
    };

    function parseHash() {
        const h = location.hash.replace(/^#\/?/, '');
        const [route, qs] = h.split('?');
        const params = {};
        if (qs) new URLSearchParams(qs).forEach((v, k) => { params[k] = v; });
        return { route: route || 'dashboard', params };
    }

    function renderMenu() {
        const d = Store.data;
        const route = App.current;
        document.getElementById('sb-menu').innerHTML = MENU.map((m) => {
            if (m.group) return `<div class="sb-group">${U.esc(m.group)}</div>`;
            const badge = m.count ? `<span class="sb-badge">${m.count(d)}</span>` : '';
            return `<a class="sb-link${route === m.route ? ' active' : ''}" href="#/${m.route}"><i class="fas ${m.icon}"></i><span>${U.esc(m.label)}</span>${badge}</a>`;
        }).join('');
    }

    function renderBackupBox() {
        const m = Store.meta;
        const warn = Store.needsBackup();
        const box = document.getElementById('sb-backup');
        box.className = `sb-backup${warn ? ' is-warn' : ''}`;
        box.innerHTML = `
            <b><i class="fas ${warn ? 'fa-triangle-exclamation' : 'fa-shield-halved'}"></i>${warn ? 'มีข้อมูลที่ยังไม่ได้สำรอง' : 'สำรองข้อมูลแล้ว'}</b>
            <div>สำรองล่าสุด: ${m.lastBackupAt ? U.esc(U.thDate(m.lastBackupAt, true)) : 'ยังไม่เคยสำรอง'}</div>
            <div class="sb-backup-actions">
                <button type="button" data-act="save"><i class="fas fa-download"></i> บันทึกไฟล์</button>
                <button type="button" class="ghost" data-act="open" data-demo-lock="เปิดไฟล์ข้อมูล (.json)"><i class="fas fa-folder-open"></i> เปิดไฟล์</button>
            </div>`;
        box.querySelector('[data-act="save"]').onclick = () => App.backupNow();
        box.querySelector('[data-act="open"]').onclick = () => App.openFile();
        const btn = document.getElementById('tb-backup-btn');
        btn.classList.toggle('orange', warn);
        btn.classList.toggle('green', !warn);
    }

    function renderTop() {
        const item = MENU.find((m) => m.route === App.current) || MENU[0];
        document.getElementById('tb-title').innerHTML = `<i class="fas ${item.icon}"></i><span>${U.esc(item.label)}</span>`;
        document.getElementById('tb-term').innerHTML = `<i class="fas fa-calendar-check"></i>${U.esc(Store.termText())}`;
        const s = Store.data.school;
        document.getElementById('sb-school').textContent = s.name || 'พฤติกรรมห้องเรียน • ออฟไลน์';
        const saved = document.getElementById('tb-saved');
        if (!Store.storageOk) saved.innerHTML = '<i class="fas fa-circle-xmark" style="color:#e11d48"></i><span>บันทึกลงเบราว์เซอร์ไม่ได้</span>';
        else if (Store.meta.lastSavedAt) saved.innerHTML = `<i class="fas fa-circle-check"></i><span>บันทึกในเครื่องแล้ว ${new Date(Store.meta.lastSavedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>`;
        else saved.innerHTML = '';
        document.title = `${item.label} • กระดานแต้มพฤติกรรมห้องเรียน`;
    }

    App.refreshChrome = () => { renderMenu(); renderBackupBox(); renderTop(); };

    App.render = () => {
        const { route, params } = parseHash();
        const view = window.Views[route] ? route : 'dashboard';
        const changed = App.current !== view;
        if (App.current && window.Views[App.current] && window.Views[App.current].leave) window.Views[App.current].leave();
        App.current = view;
        App.params = params;
        const el = document.getElementById('view');
        el.innerHTML = '';
        window.Views[view].render(el, params);
        if (changed) window.scrollTo(0, 0);
        App.refreshChrome();
    };

    /* ข้อมูลเปลี่ยน → อัปเดตหน้าปัจจุบัน */
    function onStoreChange(reason) {
        const v = window.Views[App.current];
        if (reason === 'replace' || reason === 'reset') {
            App.render();
            return;
        }
        if (reason !== 'backup' && v && v.refresh) {
            const y = window.scrollY;
            v.refresh(reason);
            window.scrollTo(0, y);
        }
        App.refreshChrome();
    }

    App.backupNow = async () => {
        const name = await Store.exportFile();
        if (name) U.toast(`บันทึกไฟล์ข้อมูลแล้ว: <b>${U.esc(name)}</b><br><small>เก็บไฟล์นี้ไว้ในแฟลชไดรฟ์/Google Drive เพื่อความปลอดภัย</small>`, { type: 'ok', ms: 5000 });
    };

    App.openFile = async () => {
        if (!VSDemo.allow('เปิดไฟล์ข้อมูล (.json)')) return; // โหมดทดลองใช้: ใช้ได้กับข้อมูลตัวอย่างเท่านั้น
        const file = await U.pickFile('.json,application/json');
        if (!file) return;
        let text = '';
        try { text = await U.readFileAsText(file); } catch (e) { U.alert('เปิดไฟล์ไม่สำเร็จ', U.esc(e.message), 'error'); return; }
        const res = Store.parseBackup(text);
        if (!res.ok) { U.alert('เปิดไฟล์ไม่ได้', U.esc(res.error), 'error'); return; }
        const s = res.summary;
        const ok = await U.confirm('เปิดไฟล์ข้อมูลนี้?', `
            <div style="text-align:left">
                <div class="note warn"><i class="fas fa-triangle-exclamation"></i><div>ข้อมูลที่อยู่ในโปรแกรมตอนนี้จะถูก<b>แทนที่</b>ด้วยข้อมูลในไฟล์<br><small>(ระบบเก็บข้อมูลเดิมไว้ 1 ชุด กู้คืนได้ที่หน้า "สำรอง / เปิดไฟล์ข้อมูล")</small></div></div>
                <dl class="detail-grid">
                    <dt>ไฟล์</dt><dd>${U.esc(file.name)}</dd>
                    <dt>โรงเรียน</dt><dd>${U.esc(s.school || '-')}</dd>
                    <dt>ภาคเรียน</dt><dd>${U.esc(s.term)}</dd>
                    <dt>ห้องเรียน</dt><dd>${s.classes} ห้อง • นักเรียน ${s.students.toLocaleString()} คน</dd>
                    <dt>บันทึกแต้ม</dt><dd>${s.events.toLocaleString()} ครั้ง</dd>
                    <dt>บันทึกเมื่อ</dt><dd>${U.esc(U.thDate(s.savedAt, true))}</dd>
                </dl>
            </div>`, { confirmText: '<i class="fas fa-folder-open"></i> เปิดไฟล์นี้', icon: 'question' });
        if (!ok) return;
        Store.replaceAll(res.data, 'replace');
        Store.setMeta({ lastBackupAt: new Date().toISOString(), lastBackupName: file.name, lastChangeAt: new Date().toISOString() });
        App.refreshChrome();
        U.toast(`เปิดไฟล์ <b>${U.esc(file.name)}</b> แล้ว`, { type: 'ok' });
    };

    App.loadDemo = () => {
        Store.replaceAll(window.Demo.build(), 'replace');
        U.toast('โหลดข้อมูลตัวอย่างแล้ว — ลองเปิดเมนู "จอหน้าห้อง" แล้วแตะนักเรียนเพื่อให้แต้ม', { type: 'ok', ms: 4500 });
    };

    /* หน้าต่างต้อนรับครั้งแรก */
    async function welcome() {
        if (!Store.isEmpty() || Store.meta.dismissedWelcome) return;
        const r = await Swal.fire({
            html: `
                <div class="sheet-head" style="--s1:var(--hero-1);--s2:var(--hero-2);--s3:var(--hero-3)">
                    <span class="sh-ic"><i class="fas fa-star"></i></span>
                    <div><h3>ยินดีต้อนรับสู่กระดานแต้มพฤติกรรมห้องเรียน</h3><p>ใช้งานได้โดยไม่ต้องต่ออินเทอร์เน็ต</p></div>
                </div>
                <div class="sheet-body">
                    <div class="note warn"><i class="fas fa-database"></i><div>ข้อมูลจะถูกเก็บไว้ใน<b>เบราว์เซอร์ของเครื่องนี้</b> หากล้างประวัติ/ข้อมูลเบราว์เซอร์ ข้อมูลจะหาย<br>กรุณากด <b>"บันทึกไฟล์ข้อมูล (.json)"</b> เพื่อสำรองเป็นไฟล์อยู่เสมอ</div></div>
                    <div class="steps">
                        <div class="step"><b>1</b><div><strong>ห้องเรียน / นักเรียน</strong>เพิ่มห้อง วางรายชื่อจาก Excel เลือกอวตารน่ารัก</div></div>
                        <div class="step"><b>2</b><div><strong>จอหน้าห้อง</strong>แตะนักเรียน กลุ่ม หรือทั้งห้อง เพื่อให้แต้ม มีเสียงและแอนิเมชัน</div></div>
                        <div class="step"><b>3</b><div><strong>รางวัล / รายงาน</strong>แลกรางวัล กระดานผู้นำ รายงาน .docx และเกียรติบัตรดาวเด่น</div></div>
                    </div></div>
                </div>`,
            width: 760,
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-play"></i> เริ่มใหม่ (ข้อมูลว่าง)',
            denyButtonText: '<i class="fas fa-flask"></i> ทดลองด้วยข้อมูลตัวอย่าง',
            cancelButtonText: '<i class="fas fa-folder-open"></i> เปิดไฟล์ข้อมูลเดิม',
            buttonsStyling: false,
            customClass: { popup: 'sheet', confirmButton: 'btn-x primary lg', denyButton: 'btn-x orange lg', cancelButton: 'btn-x ghost lg' },
            allowOutsideClick: false,
            // โหมดทดลองใช้ (vipsys): เริ่มใหม่/เปิดไฟล์เดิม ใช้ไม่ได้ — กดแล้วขึ้นคำอธิบายในหน้าต่างนี้
            didOpen: () => {
                VSDemo.lock(Swal.getConfirmButton(), 'เริ่มใหม่ (ข้อมูลว่าง)');
                VSDemo.lock(Swal.getCancelButton(), 'เปิดไฟล์ข้อมูลเดิม');
            },
        });
        Store.setMeta({ dismissedWelcome: true });
        if (r.isDenied || VSDemo.active) App.loadDemo(); // โหมดทดลอง: ปิดหน้าต่างด้วย Esc ก็ได้ข้อมูลตัวอย่าง
        else if (r.dismiss === Swal.DismissReason.cancel) App.openFile();
        else App.go('classes');
    }

    function init() {
        Store.load();
        VSDemo.onReset(() => App.loadDemo()); // แถบโหมดทดลอง → ปุ่ม "เริ่มข้อมูลตัวอย่างใหม่"
        Store.on(onStoreChange);
        window.addEventListener('hashchange', App.render);
        document.getElementById('tb-backup-btn').onclick = () => App.backupNow();
        // ปุ่ม "เพิ่มห้องเรียน" ในหน้าว่างทุกหน้า (UI.noClass)
        document.addEventListener('click', (e) => { if (e.target.closest('[data-add-class]')) { e.preventDefault(); Views.classes.addClass(); } });
        window.addEventListener('beforeunload', () => Store.flush());
        App.render();
        welcome();
        setInterval(() => { renderTop(); renderBackupBox(); }, 60000);
    }

    window.App = App;
    window.Views = window.Views || {};
    document.addEventListener('DOMContentLoaded', init);
})();
