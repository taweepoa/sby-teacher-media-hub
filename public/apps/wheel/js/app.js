/* =====================================================================
   ตัวควบคุมหลัก: เมนู, เปลี่ยนหน้า (#/หน้า), สถานะการสำรองข้อมูล, หน้าต่างต้อนรับ
   + ส่วนประกอบที่ทุกหน้าใช้ร่วมกัน (เลือกห้อง, การ์ดประกาศผล, ปุ่มเต็มจอ)
   ===================================================================== */
(function () {
    'use strict';

    const MENU = [
        { route: 'home', label: 'หน้าหลัก', icon: 'fa-house' },
        { group: 'เครื่องมือสุ่ม' },
        { route: 'wheel', label: 'วงล้อสุ่มชื่อ', icon: 'fa-dharmachakra' },
        { route: 'groups', label: 'สุ่มจับกลุ่ม', icon: 'fa-people-group' },
        { route: 'order', label: 'สุ่มลำดับนำเสนอ', icon: 'fa-list-ol' },
        { route: 'number', label: 'สุ่มตัวเลข', icon: 'fa-dice' },
        { route: 'prizes', label: 'จับฉลากของรางวัล', icon: 'fa-gift' },
        { route: 'seats', label: 'สุ่มที่นั่ง', icon: 'fa-chair' },
        { group: 'ข้อมูลและรายงาน' },
        { route: 'lists', label: 'รายชื่อนักเรียน', icon: 'fa-user-graduate', count: (d) => d.lists.length },
        { route: 'history', label: 'ประวัติการสุ่ม', icon: 'fa-clock-rotate-left', count: (d) => d.history.length },
        { route: 'reports', label: 'รายงาน (.docx)', icon: 'fa-file-word' },
        { group: 'ตั้งค่า / สำรองข้อมูล' },
        { route: 'settings', label: 'ตั้งค่า', icon: 'fa-sliders' },
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
        return { route: route || 'home', params };
    }

    function renderMenu() {
        const d = Store.data;
        const route = App.current;
        document.getElementById('sb-menu').innerHTML = MENU.map((m) => {
            if (m.group) return `<div class="sb-group">${U.esc(m.group)}</div>`;
            const badge = m.count ? `<span class="sb-badge">${m.count(d).toLocaleString()}</span>` : '';
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
        const s = Store.data.school;
        document.getElementById('sb-school').textContent = s.name || 'สุ่มชื่อ จับกลุ่ม จับฉลาก • ออฟไลน์';
        const saved = document.getElementById('tb-saved');
        if (!Store.storageOk) saved.innerHTML = '<i class="fas fa-circle-xmark" style="color:#e11d48"></i><span>บันทึกลงเบราว์เซอร์ไม่ได้</span>';
        else if (Store.meta.lastSavedAt) saved.innerHTML = `<i class="fas fa-circle-check"></i><span>บันทึกในเครื่องแล้ว ${new Date(Store.meta.lastSavedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>`;
        else saved.innerHTML = '';
        const snd = document.getElementById('tb-sound');
        const on = Store.data.settings.sound;
        snd.innerHTML = `<i class="fas ${on ? 'fa-volume-high' : 'fa-volume-xmark'}"></i>`;
        snd.classList.toggle('is-off', !on);
        snd.title = on ? 'ปิดเสียง' : 'เปิดเสียง';
        document.title = `${item.label} • วงล้อสุ่มรายชื่อนักเรียน`;
    }

    App.refreshChrome = () => { renderMenu(); renderBackupBox(); renderTop(); };

    App.render = () => {
        const { route, params } = parseHash();
        const view = window.Views[route] ? route : 'home';
        const changed = App.current !== view;
        if (App.current && window.Views[App.current] && window.Views[App.current].leave) window.Views[App.current].leave();
        if (window.Stage) Stage.exit();
        App.closeWin(true);
        App.current = view;
        App.params = params;
        const el = document.getElementById('view');
        el.innerHTML = '';
        el.dataset.view = view;
        window.Views[view].render(el, params);
        if (changed) window.scrollTo(0, 0);
        App.refreshChrome();
    };

    /* ข้อมูลเปลี่ยน → อัปเดตหน้าปัจจุบัน */
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

    App.backupNow = async () => {
        const name = await Store.exportFile();
        if (name) U.toast(`บันทึกไฟล์ข้อมูลแล้ว: <b>${U.esc(name)}</b><br><small>เก็บไฟล์นี้ไว้ในแฟลชไดรฟ์/Google Drive เพื่อความปลอดภัย</small>`, { type: 'ok', ms: 5000 });
    };

    /** โหมดทดลองใช้ (vs-demo.js): false = ถูกล็อก (แสดงคำอธิบายให้แล้ว) — ฉบับที่ซื้อคืน true เสมอ */
    App.demoAllow = (label) => !window.VSDemo || VSDemo.allow(label);
    App.demoActive = () => !!(window.VSDemo && VSDemo.active);

    App.openFile = async () => {
        if (!App.demoAllow('เปิดไฟล์ข้อมูล (.json)')) return;
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
                    <dt>รายชื่อ</dt><dd>${s.classes} ห้องเรียน • ${s.lists - s.classes} รายการกำหนดเอง • ${s.people.toLocaleString()} รายชื่อ</dd>
                    <dt>ประวัติการสุ่ม</dt><dd>${s.history.toLocaleString()} ครั้ง</dd>
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
        App.go('wheel');
        U.toast('โหลดข้อมูลตัวอย่างแล้ว (ม.2/1 35 คน) — กดปุ่ม "หมุน" กลางวงล้อได้เลย', { type: 'ok', ms: 4500 });
    };

    /* ---------- ส่วนประกอบที่ใช้ร่วมกัน ---------- */
    /** ช่องเลือกห้อง/รายการ (optgroup ห้องเรียน + รายการกำหนดเอง) */
    App.listSelect = (id, attrs) => {
        const d = Store.data;
        const opt = (l) => `<option value="${U.esc(l.id)}"${l.id === id ? ' selected' : ''}>${U.esc(l.name)} (${l.items.filter((s) => s.active).length}${l.items.some((s) => !s.active) ? `/${l.items.length}` : ''} ${l.kind === 'custom' ? 'รายการ' : 'คน'})</option>`;
        const cls = d.lists.filter((l) => l.kind === 'class');
        const cus = d.lists.filter((l) => l.kind === 'custom');
        return `<select class="form-select" ${attrs || ''}>
            ${cls.length ? `<optgroup label="ห้องเรียน">${cls.map(opt).join('')}</optgroup>` : ''}
            ${cus.length ? `<optgroup label="รายการกำหนดเอง">${cus.map(opt).join('')}</optgroup>` : ''}
        </select>`;
    };

    /** หน้าว่างเมื่อยังไม่มีรายชื่อ */
    App.noListState = (icon, title) => `
        <div class="panel panel--theme"><div class="panel-body"><div class="empty-state">
            <span class="ic-box lg" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas ${icon || 'fa-user-graduate'}"></i></span>
            <h3>${U.esc(title || 'ยังไม่มีรายชื่อนักเรียน')}</h3>
            <div>เพิ่มห้องเรียนและรายชื่อที่เมนู "รายชื่อนักเรียน" (วางจาก Excel หรือนำเข้าไฟล์ .xlsx) หรือทดลองด้วยข้อมูลตัวอย่าง</div>
            <div class="d-flex gap-2 justify-content-center flex-wrap mt-1">
                <a class="btn-x primary" href="#/lists"><i class="fas fa-user-plus"></i>เพิ่มรายชื่อ</a>
                <button type="button" class="btn-x orange" data-demo><i class="fas fa-flask"></i>ทดลองด้วยข้อมูลตัวอย่าง</button>
            </div>
        </div></div></div>`;
    document.addEventListener('click', async (e) => {
        if (!e.target.closest('[data-demo]')) return;
        if (!Store.isEmpty() && !(await U.confirm('โหลดข้อมูลตัวอย่าง?', 'ข้อมูลปัจจุบันจะถูกแทนที่ด้วยข้อมูลตัวอย่าง<br><small>(ระบบเก็บข้อมูลเดิมไว้ 1 ชุด กู้คืนได้ที่หน้า "สำรอง / เปิดไฟล์ข้อมูล")</small>', { confirmText: 'โหลดข้อมูลตัวอย่าง', danger: true }))) return;
        App.loadDemo();
    });

    /** ปุ่มเต็มจอ (ใช้ในทุกหน้าสุ่ม) */
    App.stageButton = (extraCls) => `<button type="button" class="btn-x ghost sm stage-btn ${extraCls || ''}" data-stage-toggle title="โหมดเต็มจอสำหรับฉายโปรเจกเตอร์ (กด F)"><i class="fas fa-expand"></i><span>เต็มจอ</span></button>`;
    App.bindStage = (root, area) => {
        root.querySelectorAll('[data-stage-toggle]').forEach((b) => { b.onclick = () => Stage.toggle(area); });
    };
    window.addEventListener('stagechange', (e) => {
        document.querySelectorAll('[data-stage-toggle]').forEach((b) => {
            b.innerHTML = e.detail.on ? '<i class="fas fa-compress"></i><span>ออกจากเต็มจอ</span>' : '<i class="fas fa-expand"></i><span>เต็มจอ</span>';
        });
    });

    /**
     * การ์ดประกาศผลกลางจอ: { kicker, title, sub, badge, icon, color, note, actions: [{label, icon, cls, onClick, primary}], onClose, celebrate }
     * แสดงซ้อนบนโหมดเต็มจอได้ • Enter = ปุ่มหลัก • Esc = ปิด
     */
    let winEl = null;
    let winOpts = null;
    App.showWin = (o) => {
        App.closeWin(true);
        winOpts = o;
        winEl = document.createElement('div');
        winEl.className = 'win-overlay';
        winEl.setAttribute('role', 'dialog');
        winEl.setAttribute('aria-modal', 'true');
        winEl.setAttribute('aria-label', o.kicker || 'ผลการสุ่ม');
        const acts = (o.actions || []).map((a, i) => `<button type="button" class="btn-x ${a.cls || 'ghost'} lg" data-i="${i}">${a.icon ? `<i class="fas ${a.icon}"></i>` : ''}${U.esc(a.label)}</button>`).join('');
        winEl.innerHTML = `
            <div class="win-card" style="--wc:${o.color || 'var(--ac)'}">
                <div class="win-rays" aria-hidden="true"></div>
                <div class="win-kicker"><i class="fas ${o.icon || 'fa-star'}"></i>${U.esc(o.kicker || 'ผลการสุ่ม')}</div>
                ${o.badge != null && o.badge !== '' ? `<div class="win-badge">${U.esc(o.badge)}</div>` : ''}
                <div class="win-title">${U.esc(o.title)}</div>
                ${o.sub ? `<div class="win-sub">${o.sub}</div>` : ''}
                ${o.note ? `<div class="win-note">${o.note}</div>` : ''}
                <div class="win-actions">${acts}</div>
                <button type="button" class="win-close" aria-label="ปิด"><i class="fas fa-xmark"></i></button>
            </div>`;
        document.body.appendChild(winEl);
        // ปรับขนาดตัวอักษรชื่อให้พอดีการ์ด
        const t = winEl.querySelector('.win-title');
        const fit = () => {
            t.style.fontSize = '';
            let size = parseFloat(getComputedStyle(t).fontSize);
            let guard = 0;
            while (t.scrollWidth > t.clientWidth + 1 && size > 22 && guard < 40) { size *= 0.93; t.style.fontSize = `${size}px`; guard += 1; }
            // ข้อความยาวมาก (เช่น หัวข้อโครงงาน) ให้ขึ้นบรรทัดใหม่แทนการย่อจนอ่านไม่ออก
            if (t.scrollWidth > t.clientWidth + 1) t.style.whiteSpace = 'normal';
        };
        winEl.querySelectorAll('[data-i]').forEach((b) => {
            b.onclick = () => {
                const a = o.actions[+b.dataset.i];
                if (a.keepOpen) { a.onClick && a.onClick(b); return; }
                App.closeWin(true);
                if (a.onClick) a.onClick();
            };
        });
        winEl.querySelector('.win-close').onclick = () => App.closeWin();
        winEl.addEventListener('click', (e) => { if (e.target === winEl) App.closeWin(); });
        requestAnimationFrame(() => { winEl.classList.add('show'); fit(); const p = winEl.querySelector('.btn-x.primary, .btn-x.cta'); if (p) p.focus({ preventScroll: true }); });
        if (o.celebrate !== false) { Sound.win(); FX.celebrate(); }
    };
    App.closeWin = (silent) => {
        if (!winEl) return;
        const el = winEl;
        const o = winOpts;
        winEl = null;
        winOpts = null;
        el.classList.remove('show');
        setTimeout(() => el.remove(), 220);
        if (!silent && o && o.onClose) o.onClose();
    };
    App.winOpen = () => !!winEl;
    document.addEventListener('keydown', (e) => {
        if (!winEl) return;
        if (e.key === 'Escape') { e.preventDefault(); App.closeWin(); }
    });

    /** ป้ายประเภทการสุ่ม */
    App.modeTag = (mode) => {
        const m = Store.MODES[mode];
        return m ? `<span class="mode-tag" style="--c:${m.color}"><i class="fas ${m.icon}"></i>${U.esc(m.label)}</span>` : '';
    };

    /** เวลาแบบไทย "19 ต.ค. 2569 10:15 น." */
    App.when = (iso) => U.thDate(iso, true);

    /* หน้าต่างต้อนรับครั้งแรก */
    async function welcome() {
        if (!Store.isEmpty() || Store.meta.dismissedWelcome) return;
        const r = await Swal.fire({
            html: `
                <div class="sheet-head">
                    <span class="sh-ic"><i class="fas fa-dharmachakra"></i></span>
                    <div><h3>ยินดีต้อนรับสู่วงล้อสุ่มรายชื่อนักเรียน</h3><p>สุ่มชื่อตอบคำถาม จับกลุ่ม จับฉลาก — ยุติธรรม สนุก ใช้ได้โดยไม่ต้องต่ออินเทอร์เน็ต</p></div>
                </div>
                <div class="sheet-body">
                    <div class="note warn"><i class="fas fa-database"></i><div>ข้อมูลจะถูกเก็บไว้ใน<b>เบราว์เซอร์ของเครื่องนี้</b> หากล้างประวัติ/ข้อมูลเบราว์เซอร์ ข้อมูลจะหาย<br>กรุณากด <b>"บันทึกไฟล์ข้อมูล (.json)"</b> เพื่อสำรองเป็นไฟล์อยู่เสมอ</div></div>
                    <div class="steps">
                        <div class="step"><b>1</b><div><strong>ใส่รายชื่อ</strong>วางจาก Excel หรือนำเข้าไฟล์ .xlsx ได้หลายห้อง</div></div>
                        <div class="step"><b>2</b><div><strong>หมุนวงล้อ</strong>สุ่มไม่ซ้ำจนกว่าจะครบ มีเสียงและเอฟเฟกต์ฉลอง</div></div>
                        <div class="step"><b>3</b><div><strong>จับกลุ่ม/จับฉลาก</strong>คละเพศ ลำดับนำเสนอ ที่นั่ง พร้อมรายงาน .docx</div></div>
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
            // โหมดทดลองใช้: ใช้ได้เฉพาะ "ทดลองด้วยข้อมูลตัวอย่าง"
            didOpen: () => {
                if (!window.VSDemo) return;
                VSDemo.lock(Swal.getConfirmButton(), 'เริ่มใหม่ (ข้อมูลว่าง)');
                VSDemo.lock(Swal.getCancelButton(), 'เปิดไฟล์ข้อมูลเดิม');
            },
        });
        Store.setMeta({ dismissedWelcome: true });
        if (r.isDenied) App.loadDemo();
        else if (r.dismiss === Swal.DismissReason.cancel) App.openFile();
        else App.go('lists');
    }

    /* โหมดทดลองใช้: ปุ่ม "เริ่มข้อมูลตัวอย่างใหม่" บนแถบทดลอง → โหลดข้อมูลตัวอย่างชุดเดิม */
    function demoReset() {
        if (window.Stage) Stage.exit();
        App.closeWin(true);
        Store.replaceAll(window.Demo.build(), 'replace');
        Store.setMeta({ dismissedWelcome: true });
        App.go('wheel');
        U.toast('โหลดข้อมูลตัวอย่างใหม่แล้ว (ม.2/1 35 คน)', { type: 'ok' });
    }

    function init() {
        if (window.VSDemo) VSDemo.onReset(demoReset);
        Store.load();
        Store.on(onStoreChange);
        window.addEventListener('hashchange', App.render);
        document.getElementById('tb-backup-btn').onclick = App.backupNow;
        document.getElementById('tb-sound').onclick = () => {
            Store.data.settings.sound = !Store.data.settings.sound;
            Store.commit('settings');
            if (Store.data.settings.sound) { Sound.unlock(); Sound.pop(4); }
            U.toast(Store.data.settings.sound ? 'เปิดเสียงแล้ว' : 'ปิดเสียงแล้ว', { icon: Store.data.settings.sound ? 'fa-volume-high' : 'fa-volume-xmark', ms: 1600 });
        };
        // ปลดล็อกเสียงตั้งแต่แตะครั้งแรก
        document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });
        window.addEventListener('beforeunload', () => Store.flush());
        App.render();
        welcome();
        setInterval(() => { renderTop(); renderBackupBox(); }, 60000);
    }

    window.App = App;
    window.Views = window.Views || {};
    document.addEventListener('DOMContentLoaded', init);
})();
