/* =====================================================================
   ตัวควบคุมหลัก: เมนู, เปลี่ยนหน้า (#/หน้า), สถานะการสำรองข้อมูล, หน้าต่างต้อนรับ,
   เชื่อมเกมที่กำลังเล่น (Link) กับข้อมูลหลัก (Store) และเปิดหน้าต่างจอแสดงผล
   ===================================================================== */
(function () {
    'use strict';

    const MENU = [
        { route: 'dashboard', label: 'หน้าหลัก', icon: 'fa-house' },
        { group: 'การแข่งขัน' },
        { route: 'setup', label: 'เริ่มการแข่งขันใหม่', icon: 'fa-flag-checkered' },
        { route: 'control', label: 'ควบคุมเกม', title: 'หน้าจอควบคุมเกม', icon: 'fa-gamepad', live: true },
        { route: 'results', label: 'ผลการแข่งขัน', icon: 'fa-ranking-star', count: (d) => d.matches.length },
        { group: 'คำถามและทีม' },
        { route: 'sets', label: 'คลังคำถาม', icon: 'fa-layer-group', count: () => Store.questionCount() },
        { route: 'teams', label: 'ทีมผู้เข้าแข่งขัน', icon: 'fa-users', count: (d) => d.teams.length },
        { route: 'import', label: 'นำเข้าคำถาม (Excel)', icon: 'fa-file-excel' },
        { group: 'รายงาน / ตั้งค่า' },
        { route: 'reports', label: 'รายงานราชการ (.docx)', icon: 'fa-file-word' },
        { route: 'settings', label: 'ตั้งค่าและข้อมูลโรงเรียน', icon: 'fa-gear' },
        { route: 'backup', label: 'สำรอง / เปิดไฟล์ข้อมูล', icon: 'fa-floppy-disk' },
    ];
    /* หน้าย่อยที่ไม่มีในเมนู → ไฮไลต์เมนูแม่ */
    const PARENT = { set: 'sets', result: 'results' };
    const TITLES = { set: { label: 'แก้ไขชุดคำถาม', icon: 'fa-pen-to-square' }, result: { label: 'ผลการแข่งขัน', icon: 'fa-ranking-star' } };

    const App = { current: null, params: {}, board: null };

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

    const liveGame = () => { const s = Link.state; return s && s.status === 'playing' ? s : null; };

    function renderMenu() {
        const d = Store.data;
        const active = PARENT[App.current] || App.current;
        document.getElementById('sb-menu').innerHTML = MENU.map((m) => {
            if (m.group) return `<div class="sb-group">${U.esc(m.group)}</div>`;
            let badge = m.count ? `<span class="sb-badge">${Number(m.count(d)).toLocaleString()}</span>` : '';
            if (m.live && liveGame()) badge = '<span class="sb-badge live-badge"><i class="fas fa-circle"></i> LIVE</span>';
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
        document.getElementById('tb-title').innerHTML = `<i class="fas ${item.icon}"></i><span>${U.esc(item.title || item.label)}</span>`;
        const s = liveGame();
        const live = document.getElementById('tb-live');
        if (s && App.current !== 'control') {
            const p = Engine.progress(s);
            live.innerHTML = `<a href="#/control" class="live-link"><i class="fas fa-circle"></i>กำลังแข่ง: ${U.esc(s.title)} • ข้อ ${Math.min(s.idx + 1, p.total)}/${p.total}</a>`;
            live.hidden = false;
        } else live.hidden = true;
        document.getElementById('sb-school').textContent = Store.data.school.name || 'แข่งขันในห้องเรียน • ออฟไลน์';
        const saved = document.getElementById('tb-saved');
        if (!Store.storageOk) saved.innerHTML = '<i class="fas fa-circle-xmark" style="color:#e11d48"></i><span>บันทึกลงเบราว์เซอร์ไม่ได้</span>';
        else if (Store.meta.lastSavedAt) saved.innerHTML = `<i class="fas fa-circle-check"></i><span>บันทึกในเครื่องแล้ว ${new Date(Store.meta.lastSavedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>`;
        else saved.innerHTML = '';
        document.title = `${item.title || item.label} • เกมตอบคำถามแข่งขันแบบทีม`;
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
        Link.ping();
    };

    function onStoreChange(reason) {
        const v = window.Views[App.current];
        if (reason === 'replace' || reason === 'reset') { App.render(); return; }
        if (reason !== 'backup' && v && v.refresh) {
            const y = window.scrollY;
            v.refresh(reason);
            window.scrollTo(0, y);
        }
        App.refreshChrome();
    }

    /* เกมเปลี่ยน → อัปเดตหน้าจอควบคุม + เก็บผลลงข้อมูลหลัก (เฉพาะหน้าต่างหัวหน้า) */
    const saveMatchSoon = U.debounce(() => {
        const s = Link.state;
        if (!s || !Link.isLeader()) return;
        Store.upsertMatch(Engine.toRecord(s));
    }, 700);
    function onLive(s, prev, info) {
        const v = window.Views[App.current];
        if (v && v.live) v.live(s, prev, info);
        if (s && (!prev || prev.matchId !== s.matchId || prev.status !== s.status || prev.idx !== s.idx || prev.phase !== s.phase || JSON.stringify(prev.adjusts) !== JSON.stringify(s.adjusts) || prev.teams.map((t) => t.score).join() !== s.teams.map((t) => t.score).join())) saveMatchSoon();
        if (!prev || !s || prev.status !== s.status || prev.matchId !== s.matchId || prev.idx !== s.idx) App.refreshChrome();
        if (s) Sound.set({ enabled: s.opts.sound !== false, volume: s.opts.volume == null ? 0.8 : s.opts.volume });
    }

    /* เปิดหน้าต่างจอแสดงผล (ชื่อหน้าต่างเดิมเสมอ กดซ้ำ = กลับไปหน้าต่างเดิม) */
    /* โหมดทดลองใช้: ส่งต่อไปหน้าต่างจอแสดงผลด้วย (ทดสอบด้วย ?vsdemo=1 / vipsys ใส่ VS_DEMO ให้ทั้ง 2 หน้าอยู่แล้ว) */
    App.boardUrl = (q) => { const p = new URLSearchParams(q || ''); if (VSDemo.active) p.set('vsdemo', '1'); const qs = p.toString(); return `board.html${qs ? `?${qs}` : ''}`; };
    App.openBoard = () => {
        const w = window.open(App.boardUrl(), 'vs-team-quiz-board', 'popup=yes,width=1280,height=760');
        if (!w) {
            U.alert('เบราว์เซอร์บล็อกหน้าต่างใหม่', 'กรุณากด "อนุญาตป๊อปอัป" ที่แถบที่อยู่ด้านบน แล้วกดปุ่มอีกครั้ง<br><small>หรือเปิดไฟล์ <b>board.html</b> ในโฟลเดอร์โปรแกรมด้วยเบราว์เซอร์เดียวกันก็ได้</small>', 'warning');
            return null;
        }
        App.board = w;
        try { w.focus(); } catch (e) { /* ข้าม */ }
        U.toast('เปิดจอแสดงผลแล้ว — ลากหน้าต่างไปที่จอโปรเจกเตอร์ แล้วกด "แสดงเต็มจอ"', { type: 'ok', ms: 5000 });
        return w;
    };

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
                    <dt>คลังคำถาม</dt><dd>${s.sets} ชุด • ${s.questions.toLocaleString()} ข้อ • รูป ${s.images} รูป</dd>
                    <dt>ทีม</dt><dd>${s.teams} ทีม</dd>
                    <dt>ผลการแข่งขัน</dt><dd>${s.matches} รายการ</dd>
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
        await Img.init();
        const imgs = DemoImages.all();
        const d = Demo.build();
        d.images = imgs;
        Store.replaceAll(d, 'replace');
        Link.start(Demo.liveDemo(Store.data));
        U.toast('โหลดข้อมูลตัวอย่างแล้ว — ลองกด "เปิดจอแสดงผล" แล้วเล่นเกมตัวอย่างที่หน้าจอควบคุมเกม', { type: 'ok', ms: 5000 });
        App.go('dashboard');
    };

    async function welcome() {
        if (!Store.isEmpty() || Store.meta.dismissedWelcome) return;
        const r = await Swal.fire({
            html: `
                <div class="sheet-head">
                    <span class="sh-ic"><i class="fas fa-trophy"></i></span>
                    <div><h3>ยินดีต้อนรับสู่เกมตอบคำถามแข่งขันแบบทีม</h3><p>ใช้งานได้โดยไม่ต้องต่ออินเทอร์เน็ต</p></div>
                </div>
                <div class="sheet-body">
                    <div class="note warn"><i class="fas fa-database"></i><div>ข้อมูลจะถูกเก็บไว้ใน<b>เบราว์เซอร์ของเครื่องนี้</b> หากล้างประวัติ/ข้อมูลเบราว์เซอร์ ข้อมูลจะหาย<br>กรุณากด <b>"บันทึกไฟล์ข้อมูล (.json)"</b> เพื่อสำรองเป็นไฟล์อยู่เสมอ</div></div>
                    <div class="steps">
                        <div class="step"><b>1</b><div><strong>คลังคำถาม</strong>พิมพ์เอง ใส่รูป หรือนำเข้าจาก Excel (มีชุดตัวอย่าง 7 วิชา)</div></div>
                        <div class="step"><b>2</b><div><strong>เริ่มการแข่งขัน</strong>เลือกชุดคำถาม รูปแบบเกม และทีม 2–8 ทีม</div></div>
                        <div class="step"><b>3</b><div><strong>เปิดจอแสดงผล</strong>ขึ้นโปรเจกเตอร์ ครูคุมเกมจากหน้าจอนี้ แล้วพิมพ์ใบประกาศผล/รายงาน</div></div>
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
            // โหมดทดลองใช้: ใช้ได้เฉพาะข้อมูลตัวอย่าง
            didOpen: () => {
                VSDemo.lock(Swal.getConfirmButton(), 'เริ่มใหม่ (ข้อมูลว่าง)');
                VSDemo.lock(Swal.getCancelButton(), 'เปิดไฟล์ข้อมูลเดิม');
            },
        });
        // โหมดทดลองใช้: กันทุกทางที่ไม่ใช่ข้อมูลตัวอย่าง (ถ้าหน้าต่างถูกปิดไปด้วยวิธีอื่น เปิดให้เลือกใหม่)
        if (VSDemo.active && !r.isDenied) { setTimeout(() => { if (Store.isEmpty()) welcome(); }, 300); return; }
        Store.setMeta({ dismissedWelcome: true });
        if (r.isDenied) App.loadDemo();
        else if (r.dismiss === Swal.DismissReason.cancel) App.openFile();
        else App.go('sets');
    }

    /* คีย์ลัดเกม (รีโมตพรีเซนต์/แป้นพิมพ์) ใช้ได้ทุกหน้าเมื่อมีเกมกำลังเล่น — ไม่รบกวนช่องพิมพ์ */
    function onKey(e) {
        if (Swal.isVisible()) return;
        const t = e.target;
        if (t && (/input|textarea|select/i.test(t.tagName) || t.isContentEditable)) return;
        const s = liveGame();
        if (!s || App.current !== 'control') return;
        if (window.Views.control && window.Views.control.key) window.Views.control.key(e, s);
    }

    function init() {
        // ปุ่ม "เริ่มข้อมูลตัวอย่างใหม่" บนแถบโหมดทดลองใช้
        VSDemo.onReset(() => App.loadDemo());
        Store.load();
        Store.on(onStoreChange);
        Link.init({ role: 'control', prio: () => (document.visibilityState === 'visible' ? (App.current === 'control' ? 3 : 2) : 1) });
        Link.on(onLive);
        Link.onFx((fx) => Sound.playFx(fx));
        Img.init().then(() => { const v = window.Views[App.current]; if (v && v.refresh) v.refresh('images'); });
        if (Link.state) Sound.set({ enabled: Link.state.opts.sound !== false, volume: Link.state.opts.volume == null ? 0.8 : Link.state.opts.volume });
        window.addEventListener('hashchange', App.render);
        document.getElementById('tb-backup-btn').onclick = App.backupNow;
        document.getElementById('tb-board-btn').onclick = App.openBoard;
        document.addEventListener('keydown', onKey);
        window.addEventListener('beforeunload', () => Store.flush());
        App.render();
        // เกมที่เล่นค้างไว้ (เช่นจอแสดงผลเล่นเองตอนหน้าจอนี้ปิด) → บันทึกผลล่าสุด
        if (Link.state && Link.isLeader()) Store.upsertMatch(Engine.toRecord(Link.state));
        welcome();
        setInterval(() => { renderTop(); renderBackupBox(); }, 60000);
    }

    window.App = App;
    window.Views = window.Views || {};
    document.addEventListener('DOMContentLoaded', init);
})();
