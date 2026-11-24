/* =====================================================================
   ตัวควบคุมหลัก: เมนู, เปลี่ยนหน้า (#/หน้า), สถานะการสำรองข้อมูล, หน้าต่างต้อนรับ
   ===================================================================== */
(function () {
    'use strict';

    const MENU = [
        { route: 'dashboard', label: 'หน้าหลัก', icon: 'fa-house' },
        { group: 'เตรียมเกม' },
        { route: 'sets', label: 'ชุดคำ / คำถาม-คำตอบ', icon: 'fa-layer-group', count: (d) => d.sets.length },
        { route: 'import', label: 'นำเข้าจาก Excel', icon: 'fa-file-excel' },
        { route: 'games', label: 'ออกแบบการ์ด', icon: 'fa-table-cells', count: (d) => d.games.length },
        { route: 'print', label: 'พิมพ์การ์ด', icon: 'fa-print' },
        { group: 'เล่นในห้องเรียน' },
        { route: 'caller', label: 'โหมดเรียกบนจอ', icon: 'fa-bullhorn' },
        { route: 'verify', label: 'ตรวจการ์ดผู้ชนะ', icon: 'fa-trophy' },
        { group: 'รายงาน / ตั้งค่า' },
        { route: 'reports', label: 'รายงาน Word (.docx)', icon: 'fa-file-word' },
        { route: 'settings', label: 'ข้อมูลโรงเรียน', icon: 'fa-school' },
        { route: 'backup', label: 'สำรอง / เปิดไฟล์ข้อมูล', icon: 'fa-floppy-disk' },
    ];

    const App = { current: null, params: {}, MENU };

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

    /* เกมที่กำลังใช้ (จำไว้ข้ามหน้า: ออกแบบ → พิมพ์ → เรียก → ตรวจ) */
    App.pickGame = (params) => {
        const d = Store.data;
        let g = params && params.game ? Store.game(params.game) : null;
        if (!g && Store.meta.lastGame) g = Store.game(Store.meta.lastGame);
        if (!g) g = d.games[0] || null;
        if (g && Store.meta.lastGame !== g.id) Store.setMeta({ lastGame: g.id });
        return g;
    };
    /* ตัวเลือกเกม (select) ใช้ร่วมกันหลายหน้า */
    App.gameSelect = (g, route) => `
        <select class="form-select game-pick" data-route="${route}" aria-label="เลือกเกม">
            ${Store.data.games.map((x) => `<option value="${x.id}"${g && x.id === g.id ? ' selected' : ''}>${U.esc(x.name || 'ไม่มีชื่อ')} (${x.size}×${x.size} • ${x.cards.length} ใบ)</option>`).join('')}
        </select>`;
    App.bindGameSelect = (el) => {
        el.querySelectorAll('.game-pick').forEach((s) => { s.onchange = () => App.go(s.dataset.route, { game: s.value }); });
    };
    App.noGame = (icon, text) => `
        <div class="panel"><div class="panel-body"><div class="empty-state">
            <span class="ic-box lg" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas ${icon}"></i></span>
            <h3>ยังไม่มีชุดการ์ด</h3><div>${text}</div>
            <a class="btn-x primary" href="#/games?new=1"><i class="fas fa-plus"></i>ออกแบบการ์ดชุดแรก</a>
        </div></div></div>`;

    function renderMenu() {
        const d = Store.data;
        document.getElementById('sb-menu').innerHTML = MENU.map((m) => {
            if (m.group) return `<div class="sb-group">${U.esc(m.group)}</div>`;
            const badge = m.count ? `<span class="sb-badge">${m.count(d).toLocaleString()}</span>` : '';
            return `<a class="sb-link${App.current === m.route ? ' active' : ''}" href="#/${m.route}"><i class="fas ${m.icon}"></i><span>${U.esc(m.label)}</span>${badge}</a>`;
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
        box.querySelector('[data-act="save"]').onclick = App.backupNow;
        box.querySelector('[data-act="open"]').onclick = App.openFile;
        const btn = document.getElementById('tb-backup-btn');
        btn.classList.toggle('orange', warn);
        btn.classList.toggle('green', !warn);
    }

    function renderTop() {
        const item = MENU.find((m) => m.route === App.current) || MENU[0];
        document.getElementById('tb-title').innerHTML = `<i class="fas ${item.icon}"></i><span>${U.esc(item.label)}</span>`;
        document.getElementById('tb-term').innerHTML = `<i class="fas fa-calendar-check"></i>${U.esc(Store.termText())}`;
        document.getElementById('sb-school').textContent = Store.data.school.name || 'สร้างการ์ดอัตโนมัติ • ออฟไลน์';
        const saved = document.getElementById('tb-saved');
        if (!Store.storageOk) saved.innerHTML = '<i class="fas fa-circle-xmark" style="color:#e11d48"></i><span>บันทึกลงเบราว์เซอร์ไม่ได้</span>';
        else if (Store.meta.lastSavedAt) saved.innerHTML = `<i class="fas fa-circle-check"></i><span>บันทึกในเครื่องแล้ว ${new Date(Store.meta.lastSavedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>`;
        else saved.innerHTML = '';
        document.title = `${item.label} • เกมบิงโกคำศัพท์และสร้างการ์ดอัตโนมัติ`;
    }

    App.refreshChrome = () => { renderMenu(); renderBackupBox(); renderTop(); };

    App.render = () => {
        const { route, params } = parseHash();
        const view = window.Views[route] ? route : 'dashboard';
        const changed = App.current !== view || JSON.stringify(App.params) !== JSON.stringify(params);
        if (App.current && window.Views[App.current] && window.Views[App.current].leave) window.Views[App.current].leave();
        App.current = view;
        App.params = params;
        const el = document.getElementById('view');
        el.innerHTML = '';
        document.body.dataset.view = view;
        window.Views[view].render(el, params);
        if (changed) window.scrollTo(0, 0);
        App.refreshChrome();
    };

    function onStoreChange(reason) {
        const v = window.Views[App.current];
        if (reason === 'replace' || reason === 'reset') { App.render(); return; }
        if (reason !== 'backup' && reason !== 'quiet' && v && v.refresh) {
            const y = window.scrollY;
            v.refresh(reason);
            window.scrollTo(0, y);
        }
        App.refreshChrome();
    }

    window.addEventListener('hashchange', () => App.render());

    App.backupNow = async () => {
        const name = await Store.exportFile();
        if (name) U.toast(`บันทึกไฟล์ข้อมูลแล้ว: <b>${U.esc(name)}</b><br><small>เก็บไฟล์นี้ไว้ในแฟลชไดรฟ์/Google Drive เพื่อความปลอดภัย</small>`, { type: 'ok', ms: 5000 });
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
        const ok = await U.confirm('เปิดไฟล์ข้อมูลนี้?', `
            <div style="text-align:left">
                <div class="note warn"><i class="fas fa-triangle-exclamation"></i><div>ข้อมูลที่อยู่ในโปรแกรมตอนนี้จะถูก<b>แทนที่</b>ด้วยข้อมูลในไฟล์<br><small>(ระบบเก็บข้อมูลเดิมไว้ 1 ชุด กู้คืนได้ที่หน้า "สำรอง / เปิดไฟล์ข้อมูล")</small></div></div>
                <dl class="detail-grid">
                    <dt>ไฟล์</dt><dd>${U.esc(file.name)}</dd>
                    <dt>โรงเรียน</dt><dd>${U.esc(s.school || '-')}</dd>
                    <dt>ชุดคำ</dt><dd>${s.sets} ชุด • ${s.items.toLocaleString()} คำ</dd>
                    <dt>ชุดการ์ด</dt><dd>${s.games} เกม • ${s.cards.toLocaleString()} ใบ</dd>
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
        Store.setMeta({ lastGame: '' });
        Store.replaceAll(window.Demo.build(), 'replace');
        U.toast('โหลดข้อมูลตัวอย่างแล้ว — ลองเปิดเมนู "โหมดเรียกบนจอ" หรือ "พิมพ์การ์ด"', { type: 'ok', ms: 4500 });
    };

    /* หน้าต่างต้อนรับครั้งแรก */
    async function welcome() {
        if (!Store.isEmpty() || Store.meta.dismissedWelcome) return;
        const r = await Swal.fire({
            html: `
                <div class="sheet-head">
                    <span class="sh-ic"><i class="fas fa-table-cells"></i></span>
                    <div><h3>ยินดีต้อนรับสู่เกมบิงโกคำศัพท์และสร้างการ์ดอัตโนมัติ</h3><p>ใช้งานได้โดยไม่ต้องต่ออินเทอร์เน็ต</p></div>
                </div>
                <div class="sheet-body">
                    <div class="note warn"><i class="fas fa-database"></i><div>ข้อมูลจะถูกเก็บไว้ใน<b>เบราว์เซอร์ของเครื่องนี้</b> หากล้างประวัติ/ข้อมูลเบราว์เซอร์ ข้อมูลจะหาย<br>กรุณากด <b>"บันทึกไฟล์ข้อมูล (.json)"</b> เพื่อสำรองเป็นไฟล์อยู่เสมอ</div></div>
                    <div class="steps">
                        <div class="step"><b>1</b><div><strong>ชุดคำ</strong>พิมพ์เอง ใช้ชุดตัวอย่าง หรือนำเข้าจาก Excel</div></div>
                        <div class="step"><b>2</b><div><strong>ออกแบบและพิมพ์การ์ด</strong>3×3 / 4×4 / 5×5 ไม่ซ้ำกันตามจำนวนนักเรียน</div></div>
                        <div class="step"><b>3</b><div><strong>เล่นบนจอ</strong>สุ่มเรียกพร้อมเสียง แล้วตรวจผู้ชนะด้วยหมายเลขการ์ด</div></div>
                    </div>
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
            allowEscapeKey: false,
            didOpen: () => {
                VSDemo.lock(Swal.getConfirmButton(), 'เริ่มใหม่ (ข้อมูลว่าง)');
                VSDemo.lock(Swal.getCancelButton(), 'เปิดไฟล์ข้อมูลเดิม');
            },
        });
        Store.setMeta({ dismissedWelcome: true });
        if (r.isDenied) App.loadDemo();
        else if (r.dismiss === Swal.DismissReason.cancel) App.openFile();
        else App.go('sets');
    }

    function init() {
        Store.load();
        Store.on(onStoreChange);
        document.getElementById('tb-backup-btn').onclick = App.backupNow;
        window.addEventListener('beforeunload', () => Store.flush());
        App.render();
        VSDemo.onReset(() => { App.loadDemo(); App.go('dashboard'); });
        welcome();
        setInterval(() => { renderTop(); renderBackupBox(); }, 60000);
    }

    window.App = App;
    window.Views = window.Views || {};
    document.addEventListener('DOMContentLoaded', init);
})();
