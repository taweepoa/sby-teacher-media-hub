/* =====================================================================
   ตัวควบคุมหลัก: เมนู, เปลี่ยนหน้า (#/หน้า), สถานะการสำรองข้อมูล, หน้าต่างต้อนรับ
   ===================================================================== */
(function () {
    'use strict';

    const MENU = [
        { route: 'dashboard', label: 'หน้าหลัก', icon: 'fa-house' },
        { group: 'เล่นเกม' },
        { route: 'play', label: 'เล่นเกมบันไดงู', icon: 'fa-dice', live: true },
        { route: 'results', label: 'ผลและประวัติคำถาม', icon: 'fa-ranking-star', count: (d) => d.games.length },
        { group: 'เตรียมเกม' },
        { route: 'library', label: 'ชุดคำถาม', icon: 'fa-layer-group', count: (d) => d.sets.length },
        { route: 'boards', label: 'ออกแบบกระดาน', icon: 'fa-stairs', count: (d) => d.boards.length },
        { route: 'print', label: 'พิมพ์กระดาน + การ์ดคำถาม', icon: 'fa-print' },
        { group: 'ตั้งค่า / ข้อมูล' },
        { route: 'settings', label: 'ตั้งค่าและข้อมูลโรงเรียน', icon: 'fa-gear' },
        { route: 'backup', label: 'สำรอง / เปิดไฟล์ข้อมูล', icon: 'fa-floppy-disk' },
    ];
    const PARENT = { set: 'library', result: 'results', board: 'boards' };
    const TITLES = { set: { label: 'แก้ไขชุดคำถาม', icon: 'fa-pen-to-square' }, result: { label: 'ผลการแข่งขัน', icon: 'fa-ranking-star' }, board: { label: 'ออกแบบกระดาน', icon: 'fa-stairs' } };

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
        const active = PARENT[App.current] || App.current;
        document.getElementById('sb-menu').innerHTML = MENU.map((m) => {
            if (m.group) return `<div class="sb-group">${U.esc(m.group)}</div>`;
            let badge = m.count ? `<span class="sb-badge">${Number(m.count(d)).toLocaleString()}</span>` : '';
            if (m.live && d.live) badge = '<span class="sb-badge live-badge"><i class="fas fa-circle"></i> เล่นอยู่</span>';
            return `<a class="sb-link${active === m.route ? ' active' : ''}" href="#/${m.route}"><i class="fas ${m.icon}"></i><span>${U.esc(m.label)}</span>${badge}</a>`;
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
        const item = MENU.find((m) => m.route === App.current) || TITLES[App.current] || MENU[0];
        document.getElementById('tb-title').innerHTML = `<i class="fas ${item.icon}"></i><span>${U.esc(item.label)}</span>`;
        const g = Store.data.live;
        const live = document.getElementById('tb-live');
        if (g && App.current !== 'play') {
            const p = Engine.progress(g);
            live.innerHTML = `<a href="#/play" class="live-link"><i class="fas fa-circle"></i>กำลังเล่น: ${U.esc(g.title || g.setName)} • ${U.esc(p.label)}</a>`;
            live.hidden = false;
        } else live.hidden = true;
        document.getElementById('sb-school').textContent = Store.data.school.name || 'เกมทบทวนบทเรียนหน้าชั้นเรียน';
        const saved = document.getElementById('tb-saved');
        if (!Store.storageOk) saved.innerHTML = '<i class="fas fa-circle-xmark" style="color:#e11d48"></i><span>บันทึกลงเบราว์เซอร์ไม่ได้</span>';
        else if (Store.meta.lastSavedAt) saved.innerHTML = `<i class="fas fa-circle-check"></i><span>บันทึกในเครื่องแล้ว ${new Date(Store.meta.lastSavedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>`;
        else saved.innerHTML = '';
        document.title = `${item.label} • เกมบันไดงูตอบคำถาม`;
    }
    App.refreshChrome = () => { renderMenu(); renderBackupBox(); renderTop(); };

    App.render = () => {
        const { route, params } = parseHash();
        const view = window.Views[route] ? route : 'dashboard';
        const changed = App.current !== view;
        if (App.current && window.Views[App.current] && window.Views[App.current].leave) window.Views[App.current].leave();
        App.current = view;
        App.params = params;
        // สร้างพื้นที่หน้าใหม่ทุกครั้ง (ล้าง event listener ของหน้าก่อน)
        const old = document.getElementById('view');
        const el = old.cloneNode(false);
        old.replaceWith(el);
        el.className = `app-content view-${view}`;
        window.Views[view].render(el, params);
        if (changed) window.scrollTo(0, 0);
        App.refreshChrome();
    };

    function onStoreChange(reason) {
        if (reason === 'replace' || reason === 'reset') { App.render(); return; }
        const v = window.Views[App.current];
        if (reason !== 'backup' && reason !== 'live' && v && v.refresh) {
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
                    <dt>ชุดคำถาม</dt><dd>${s.sets} ชุด • ${s.questions.toLocaleString()} ข้อ</dd>
                    <dt>กระดาน</dt><dd>${s.boards} แบบ</dd>
                    <dt>ผลการแข่งขัน</dt><dd>${s.games} รายการ</dd>
                    <dt>บันทึกเมื่อ</dt><dd>${U.esc(U.thDate(s.savedAt, true))}</dd>
                </dl>
            </div>`, { confirmText: '<i class="fas fa-folder-open"></i> เปิดไฟล์นี้', icon: 'question' });
        if (!ok) return;
        Store.replaceAll(res.data, 'replace');
        Store.setMeta({ lastBackupAt: new Date().toISOString(), lastBackupName: file.name, lastChangeAt: new Date().toISOString() });
        App.refreshChrome();
        U.toast(`เปิดไฟล์ <b>${U.esc(file.name)}</b> แล้ว`, { type: 'ok' });
    };

    App.loadDemo = async () => {
        const d = Demo.build();
        Store.replaceAll(d, 'replace');
        U.toast('โหลดข้อมูลตัวอย่างแล้ว — กด "เล่นเกมบันไดงู" เลือกชุดคำถาม กระดาน และทีม แล้วเริ่มเล่นได้เลย', { type: 'ok', ms: 5000 });
        App.go('dashboard');
    };

    async function welcome() {
        if (!Store.isEmpty() || Store.meta.dismissedWelcome) return;
        const r = await Swal.fire({
            html: `
                <div class="sheet-head" style="--s1:var(--hero-1);--s2:var(--ac);--s3:var(--ac-2)">
                    <span class="sh-ic"><i class="fas fa-stairs"></i></span>
                    <div><h3>ยินดีต้อนรับสู่เกมบันไดงูตอบคำถาม</h3><p>ใช้งานได้โดยไม่ต้องต่ออินเทอร์เน็ต</p></div>
                </div>
                <div class="sheet-body">
                    <div class="note warn"><i class="fas fa-database"></i><div>ข้อมูลจะถูกเก็บไว้ใน<b>เบราว์เซอร์ของเครื่องนี้</b> หากล้างประวัติ/ข้อมูลเบราว์เซอร์ ข้อมูลจะหาย<br>กรุณากด <b>"บันทึกไฟล์ข้อมูล (.json)"</b> เพื่อสำรองเป็นไฟล์อยู่เสมอ</div></div>
                    <div class="steps">
                        <div class="step"><b>1</b><div><strong>เตรียมคำถาม</strong>ปรนัย ถูก/ผิด เติมคำ ใส่รูปได้ นำเข้าจาก Excel หรือใช้ชุดตัวอย่าง 6 วิชา</div></div>
                        <div class="step"><b>2</b><div><strong>เล่นบนจอหน้าห้อง</strong>กระดาน 30–100 ช่อง 2–6 ทีม ทอยเต๋า ตกช่องคำถามต้องตอบ ถูกเดินต่อ ผิดถอย</div></div>
                        <div class="step"><b>3</b><div><strong>สรุปผล</strong>ประกาศผู้ชนะพร้อมพลุ ประวัติคำถาม พิมพ์กระดาน+การ์ดเล่นแบบกระดาษ รายงาน .docx</div></div>
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
            allowEscapeKey: !VSDemo.active,
            didOpen: () => {
                VSDemo.lock(Swal.getConfirmButton(), 'เริ่มใหม่ (ข้อมูลว่าง)');
                VSDemo.lock(Swal.getCancelButton(), 'เปิดไฟล์ข้อมูลเดิม');
            },
        });
        if (VSDemo.active && !r.isDenied) { setTimeout(() => { if (Store.isEmpty()) welcome(); }, 300); return; }
        Store.setMeta({ dismissedWelcome: true });
        if (r.isDenied) App.loadDemo();
        else if (r.dismiss === Swal.DismissReason.cancel) App.openFile();
        else App.go('library');
    }

    function onKey(e) {
        if (Swal.isVisible()) return;
        const t = e.target;
        if (t && (/input|textarea|select/i.test(t.tagName) || t.isContentEditable)) return;
        const v = window.Views[App.current];
        if (v && v.key) v.key(e);
    }

    function init() {
        VSDemo.onReset(() => App.loadDemo());
        Store.load();
        Store.on(onStoreChange);
        Sound.set({ enabled: Store.data.settings.sound !== false, volume: Store.data.settings.volume });
        window.addEventListener('hashchange', App.render);
        document.getElementById('tb-backup-btn').onclick = App.backupNow;
        document.addEventListener('keydown', onKey);
        window.addEventListener('beforeunload', () => Store.flush());
        App.render();
        welcome();
        setInterval(() => { renderTop(); renderBackupBox(); }, 60000);
    }

    window.App = App;
    window.Views = window.Views || {};
    document.addEventListener('DOMContentLoaded', init);
})();
