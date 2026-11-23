/* =====================================================================
   ตัวควบคุมหลัก: เมนู, เปลี่ยนหน้า (#/หน้า?พารามิเตอร์), สถานะสำรองข้อมูล, หน้าต่างต้อนรับ, พิมพ์
   ===================================================================== */
(function () {
    'use strict';

    const MENU = [
        { route: 'dashboard', label: 'หน้าหลัก', icon: 'fa-house' },
        { group: 'เล่นเกม' },
        { route: 'new', label: 'เริ่มเกมใหม่', icon: 'fa-play' },
        { route: 'play', label: 'หน้าจอเกม', icon: 'fa-gamepad', live: true },
        { route: 'results', label: 'ประวัติผลการเล่น', icon: 'fa-ranking-star', count: (d) => d.results.length },
        { route: 'certs', label: 'ทะเบียนเกียรติบัตร', icon: 'fa-award', count: (d) => d.certs.length },
        { group: 'คำถามและผู้เล่น' },
        { route: 'sets', label: 'ชุดคำถาม', icon: 'fa-layer-group', count: (d) => d.sets.length },
        { route: 'people', label: 'ผู้เล่น / ทีม', icon: 'fa-users', count: (d) => d.players.length + d.teams.length },
        { group: 'เอกสารและตั้งค่า' },
        { route: 'reports', label: 'รายงาน (.docx)', icon: 'fa-file-word' },
        { route: 'settings', label: 'ตั้งค่าเกมและแม่แบบ', icon: 'fa-sliders' },
        { route: 'backup', label: 'สำรอง / เปิดไฟล์ข้อมูล', icon: 'fa-shield-halved' },
    ];

    const App = Object.assign(window.App || {}, { current: 'dashboard', params: new URLSearchParams() });

    function parseHash() {
        const h = (location.hash || '#/dashboard').replace(/^#\/?/, '');
        const [route, qs] = h.split('?');
        return { route: route || 'dashboard', params: new URLSearchParams(qs || '') };
    }
    App.go = (route, qs) => { location.hash = `#/${route}${qs ? `?${qs}` : ''}`; };

    function renderMenu() {
        const d = Store.data;
        document.getElementById('sb-menu').innerHTML = MENU.map((m) => {
            if (m.group) return `<div class="sb-group">${m.group}</div>`;
            if (m.live && !d.live) return '';
            const c = m.count ? m.count(d) : null;
            return `<a class="sb-link${App.current === m.route ? ' active' : ''}" href="#/${m.route}"><i class="fas ${m.icon}"></i><span>${m.label}</span>${m.live ? '<span class="sb-badge live">กำลังเล่น</span>' : c ? `<span class="sb-badge">${c}</span>` : ''}</a>`;
        }).join('');
        const s = d.school;
        document.getElementById('sb-school').textContent = s.name || 'เกมตอบคำถามหน้าชั้นเรียน • ออฟไลน์';
    }
    function renderBackupBox() {
        const m = Store.meta;
        const need = Store.needsBackup();
        document.getElementById('sb-backup').innerHTML = `<b><i class="fas ${need ? 'fa-triangle-exclamation' : 'fa-shield-halved'}"></i>${need ? 'ยังไม่ได้สำรองข้อมูลล่าสุด' : 'สำรองข้อมูลแล้ว'}</b>
            <div>${m.lastBackupAt ? `ล่าสุด: ${U.esc(U.ago(m.lastBackupAt))}` : 'ยังไม่เคยบันทึกไฟล์ข้อมูล'}</div>
            <div class="sb-backup-actions"><button type="button" class="btn-x green sm" data-backup><i class="fas fa-download"></i>บันทึกไฟล์</button>
            <button type="button" class="btn-x ghost sm" data-open data-demo-lock="เปิดไฟล์ข้อมูล (.json)"><i class="fas fa-folder-open"></i>เปิดไฟล์</button></div>`;
        document.getElementById('sb-backup').classList.toggle('warn', need);
        document.querySelector('[data-backup]').onclick = App.backupNow;
        document.querySelector('[data-open]').onclick = App.openFile;
        document.getElementById('tb-saved').innerHTML = need ? '<i class="fas fa-circle-exclamation"></i><span>ยังไม่สำรองเป็นไฟล์</span>' : '<i class="fas fa-circle-check"></i><span>บันทึกแล้ว</span>';
        document.getElementById('tb-saved').classList.toggle('warn', need);
    }
    App.refreshChrome = () => { renderMenu(); renderBackupBox(); };

    App.render = () => {
        const { route, params } = parseHash();
        const prev = window.Views[App.current];
        if (prev && prev.leave && App.current !== route) prev.leave();
        App.current = window.Views[route] ? route : 'dashboard';
        App.params = params;
        const v = window.Views[App.current];
        // สร้าง #view ใหม่ทุกครั้ง (กัน event listener สะสมข้ามหน้า)
        const old = document.getElementById('view');
        const view = old.cloneNode(false);
        old.replaceWith(view);
        document.getElementById('tb-title').innerHTML = `<i class="fas ${v.icon}"></i><span>${U.esc(v.title)}</span>`;
        document.body.classList.remove('sb-open');
        v.render(view, params);
        window.scrollTo(0, 0);
        App.refreshChrome();
    };

    App.backupNow = async () => {
        const name = await Store.exportFile();
        if (name) U.toast(`บันทึกไฟล์ข้อมูลแล้ว: <b>${U.esc(name)}</b><br><small>เก็บไว้ในแฟลชไดรฟ์/Google Drive เพื่อความปลอดภัย</small>`, { type: 'ok', ms: 5000 });
        App.refreshChrome();
    };
    App.openFile = async () => {
        if (!VSDemo.allow('เปิดไฟล์ข้อมูล (.json)')) return;
        const file = await U.pickFile('.json,application/json');
        if (!file) return;
        let text = '';
        try { text = await U.readFileAsText(file); } catch (e) { U.alert('เปิดไฟล์ไม่สำเร็จ', U.esc(e.message), 'error'); return; }
        const res = Store.parseBackup(text);
        if (!res.ok) { U.alert('เปิดไฟล์ไม่ได้', U.esc(res.error), 'error'); return; }
        const s = res.summary;
        const ok = await U.confirm('เปิดไฟล์ข้อมูลนี้?', `<div style="text-align:left"><div class="note warn"><i class="fas fa-triangle-exclamation"></i><div>ข้อมูลในโปรแกรมตอนนี้จะถูก<b>แทนที่</b> (ระบบเก็บชุดเดิมไว้ 1 ชุด กู้คืนได้ที่หน้าสำรองข้อมูล)</div></div>
            <dl class="detail-grid"><dt>ไฟล์</dt><dd>${U.esc(file.name)}</dd><dt>โรงเรียน</dt><dd>${U.esc(s.school || '-')}</dd><dt>ชุดคำถาม</dt><dd>${s.sets} ชุด • ${s.questions} ข้อ</dd>
            <dt>ผู้เล่น/ทีม</dt><dd>${s.people}</dd><dt>ผลการเล่น</dt><dd>${s.results} ครั้ง</dd><dt>บันทึกเมื่อ</dt><dd>${U.esc(U.thDate(s.savedAt, true))}</dd></dl></div>`, { confirmText: '<i class="fas fa-folder-open"></i> เปิดไฟล์นี้', icon: 'question' });
        if (!ok) return;
        Store.replaceAll(res.data, 'replace');
        Store.setMeta({ lastBackupAt: new Date().toISOString(), lastBackupName: file.name, lastChangeAt: new Date().toISOString() });
        U.toast(`เปิดไฟล์ <b>${U.esc(file.name)}</b> แล้ว`, { type: 'ok' });
        App.go('dashboard'); App.render();
    };
    App.loadDemo = () => {
        Store.replaceAll(Core.buildDemo(), 'replace');
        Store.setMeta({ dismissedWelcome: true });
        U.toast('โหลดข้อมูลตัวอย่างแล้ว — ลองกด "เริ่มเกมใหม่" เลือกชุดคำถามแล้วเล่นได้ทันที', { type: 'ok', ms: 5000 });
        if (App.current === 'dashboard') App.render(); else App.go('dashboard');
    };

    /* ---------- พิมพ์ (เกียรติบัตร) ---------- */
    App.print = (html, landscape) => {
        const root = document.getElementById('print-root');
        root.innerHTML = html;
        document.body.classList.toggle('print-landscape', !!landscape);
        setTimeout(() => window.print(), 80);
    };
    App.printCerts = (certs) => {
        if (!certs.length) { U.toast('ยังไม่มีเกียรติบัตรให้พิมพ์', { type: 'warn' }); return; }
        App.print(Docs.certHTML(certs, Store.data), true);
    };

    async function welcome() {
        if (!Store.isEmpty() || Store.meta.dismissedWelcome) return;
        const r = await Swal.fire({
            html: `<div class="sheet-head"><span class="sh-ic"><i class="fas fa-crown"></i></span><div><h3>ยินดีต้อนรับสู่เกมเศรษฐีตอบคำถาม</h3><p>เกมโชว์หน้าชั้นเรียน ใช้งานได้โดยไม่ต้องต่ออินเทอร์เน็ต</p></div></div>
                <div class="sheet-body">
                    <div class="note warn"><i class="fas fa-database"></i><div>ข้อมูลเก็บไว้ใน<b>เบราว์เซอร์ของเครื่องนี้</b> หากล้างประวัติเบราว์เซอร์ข้อมูลจะหาย — กด <b>"บันทึกไฟล์ข้อมูล (.json)"</b> เพื่อสำรองเสมอ</div></div>
                    <div class="steps">
                        <div class="step"><b>1</b><div><strong>ชุดคำถาม</strong>4 ตัวเลือก เรียงง่ายไปยาก 10–15 ข้อ พิมพ์เองหรือนำเข้า Excel</div></div>
                        <div class="step"><b>2</b><div><strong>เริ่มเกม</strong>เลือกผู้เล่นรายบุคคลหรือทีม ขึ้นจอโปรเจกเตอร์เต็มจอ</div></div>
                        <div class="step"><b>3</b><div><strong>ตัวช่วย + บันไดคะแนน</strong>50:50 ถามเพื่อนในห้อง เปลี่ยนคำถาม แล้วออกเกียรติบัตรผู้ชนะ</div></div>
                    </div>
                </div>`,
            width: 760, showDenyButton: true, showCancelButton: true,
            confirmButtonText: '<i class="fas fa-play"></i> เริ่มใหม่ (ข้อมูลว่าง)',
            denyButtonText: '<i class="fas fa-flask"></i> ทดลองด้วยข้อมูลตัวอย่าง',
            cancelButtonText: '<i class="fas fa-folder-open"></i> เปิดไฟล์ข้อมูลเดิม',
            buttonsStyling: false,
            customClass: { popup: 'sheet', confirmButton: 'btn-x primary lg', denyButton: 'btn-x orange lg', cancelButton: 'btn-x ghost lg' },
            allowOutsideClick: false, allowEscapeKey: !VSDemo.active,
            // โหมดทดลองใช้: ใช้ได้เฉพาะข้อมูลตัวอย่าง
            didOpen: () => { VSDemo.lock(Swal.getConfirmButton(), 'เริ่มใหม่ (ข้อมูลว่าง)'); VSDemo.lock(Swal.getCancelButton(), 'เปิดไฟล์ข้อมูลเดิม'); },
        });
        if (VSDemo.active && !r.isDenied) { setTimeout(() => { if (Store.isEmpty()) welcome(); }, 300); return; }
        Store.setMeta({ dismissedWelcome: true });
        if (r.isDenied) App.loadDemo();
        else if (r.dismiss === Swal.DismissReason.cancel) App.openFile();
        else App.go('settings');
    }

    function init() {
        VSDemo.onReset(() => App.loadDemo());
        Store.load();
        Sound.set({ enabled: Store.data.settings.sound, volume: Store.data.settings.volume });
        Store.on((reason) => { if (reason === 'replace') App.render(); else App.refreshChrome(); });
        window.addEventListener('hashchange', App.render);
        document.getElementById('tb-backup-btn').onclick = App.backupNow;
        document.addEventListener('keydown', (e) => { const v = window.Views[App.current]; if (v && v.key) v.key(e); });
        window.addEventListener('beforeunload', () => Store.flush());
        window.addEventListener('afterprint', () => { document.getElementById('print-root').innerHTML = ''; });
        App.render();
        welcome();
        setInterval(renderBackupBox, 60000);
    }

    window.App = App;
    window.Views = window.Views || {};
    document.addEventListener('DOMContentLoaded', init);
})();
