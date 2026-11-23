/* =====================================================================
   ตัวควบคุมหลัก: เมนู, เปลี่ยนหน้า (#/หน้า), คีย์ลัด, ป้องกันจอดับ (Wake Lock),
   สถานะการสำรองข้อมูล, หน้าต่างต้อนรับ
   ===================================================================== */
(function () {
    'use strict';

    const MENU = [
        { group: 'เครื่องมือหน้าชั้นเรียน' },
        { route: 'timer', label: 'นาฬิกาจับเวลา', icon: 'fa-stopwatch', live: true },
        { route: 'sequences', label: 'ชุดหลายช่วงเวลา', icon: 'fa-layer-group', count: (d) => d.sequences.length },
        { route: 'schedule', label: 'ตารางคาบเรียนวันนี้', icon: 'fa-calendar-day' },
        { route: 'noise', label: 'ไฟจราจรเสียงดัง', icon: 'fa-traffic-light', noise: true },
        { group: 'ตั้งค่า / ข้อมูล' },
        { route: 'settings', label: 'ตั้งค่าการแสดงผลและเสียง', icon: 'fa-sliders' },
        { route: 'backup', label: 'สำรอง / เปิดไฟล์ข้อมูล', icon: 'fa-floppy-disk' },
    ];
    const APP_NAME = 'นาฬิกาจับเวลาหน้าชั้นเรียน';

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
        return { route: route || 'timer', params };
    }

    function renderMenu() {
        const d = Store.data;
        const route = App.current;
        document.getElementById('sb-menu').innerHTML = MENU.map((m) => {
            if (m.group) return `<div class="sb-group">${U.esc(m.group)}</div>`;
            let badge = m.count ? `<span class="sb-badge">${m.count(d)}</span>` : '';
            if (m.live) badge = '<span class="sb-badge sb-live" id="sb-live" hidden></span>';
            if (m.noise) badge = '<span class="sb-badge sb-mic" id="sb-mic" hidden><i class="fas fa-microphone"></i></span>';
            return `<a class="sb-link${route === m.route ? ' active' : ''}" href="#/${m.route}"><i class="fas ${m.icon}"></i><span>${U.esc(m.label)}</span>${badge}</a>`;
        }).join('');
        lastLive = null;
    }

    function renderBackupBox() {
        const m = Store.meta;
        const warn = Store.needsBackup();
        const box = document.getElementById('sb-backup');
        box.className = `sb-backup${warn ? ' is-warn' : ''}`;
        box.innerHTML = `
            <b><i class="fas ${warn ? 'fa-triangle-exclamation' : 'fa-shield-halved'}"></i>${warn ? 'มีการตั้งค่าที่ยังไม่ได้สำรอง' : 'สำรองข้อมูลแล้ว'}</b>
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

    let baseTitle = APP_NAME;
    function renderTop() {
        const item = MENU.find((m) => m.route === App.current) || MENU[1];
        document.getElementById('tb-title').innerHTML = `<i class="fas ${item.icon}"></i><span>${U.esc(item.label)}</span>`;
        const saved = document.getElementById('tb-saved');
        if (!Store.storageOk) saved.innerHTML = '<i class="fas fa-circle-xmark" style="color:#e11d48"></i><span>บันทึกลงเบราว์เซอร์ไม่ได้</span>';
        else if (Store.meta.lastSavedAt) saved.innerHTML = `<i class="fas fa-circle-check"></i><span>บันทึกในเครื่องแล้ว ${new Date(Store.meta.lastSavedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>`;
        else saved.innerHTML = '';
        baseTitle = `${item.label} • ${APP_NAME}`;
        lastTitle = '';
    }

    App.refreshChrome = () => { renderMenu(); renderBackupBox(); renderTop(); };

    App.render = () => {
        const { route, params } = parseHash();
        const view = window.Views[route] ? route : 'timer';
        const changed = App.current !== view;
        if (App.current && window.Views[App.current] && window.Views[App.current].leave) window.Views[App.current].leave();
        App.current = view;
        App.params = params;
        document.body.dataset.route = view;
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
            Timer.replan();
            App.render();
            return;
        }
        if (reason !== 'backup' && v && v.refresh) {
            const y = window.scrollY;
            v.refresh(reason);
            window.scrollTo(0, y);
        }
        if (reason !== 'settings') App.refreshChrome(); else renderBackupBox();
    }

    App.backupNow = async () => {
        const name = await Store.exportFile();
        if (name) U.toast(`บันทึกไฟล์ข้อมูลแล้ว: <b>${U.esc(name)}</b><br><small>เก็บไฟล์นี้ไว้ในแฟลชไดรฟ์/Google Drive เพื่อความปลอดภัย</small>`, { type: 'ok', ms: 5000 });
    };

    App.openFile = async () => {
        // โหมดทดลองใช้ (vipsys): นำข้อมูลจริงเข้าไม่ได้ — ใช้ได้กับข้อมูลตัวอย่างเท่านั้น
        if (window.VSDemo && !VSDemo.allow('เปิดไฟล์ข้อมูล (.json)')) return;
        const file = await U.pickFile('.json,application/json');
        if (!file) return;
        let text = '';
        try { text = await U.readFileAsText(file); } catch (e) { U.alert('เปิดไฟล์ไม่สำเร็จ', U.esc(e.message), 'error'); return; }
        const res = Store.parseBackup(text);
        if (!res.ok) { U.alert('เปิดไฟล์ไม่ได้', U.esc(res.error), 'error'); return; }
        const s = res.summary;
        const ok = await U.confirm('เปิดไฟล์ข้อมูลนี้?', `
            <div style="text-align:left">
                <div class="note warn"><i class="fas fa-triangle-exclamation"></i><div>การตั้งค่า ชุดหลายช่วงเวลา และตารางคาบในโปรแกรมตอนนี้จะถูก<b>แทนที่</b>ด้วยข้อมูลในไฟล์<br><small>(ระบบเก็บข้อมูลเดิมไว้ 1 ชุด กู้คืนได้ที่หน้า "สำรอง / เปิดไฟล์ข้อมูล")</small></div></div>
                <dl class="detail-grid">
                    <dt>ไฟล์</dt><dd>${U.esc(file.name)}</dd>
                    <dt>ชุดหลายช่วงเวลา</dt><dd>${s.sequences} ชุด</dd>
                    <dt>ตารางคาบ</dt><dd>${s.periods} คาบ • วิชาที่สอน ${s.subjects} รายการ</dd>
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
        U.toast('โหลดข้อมูลตัวอย่างแล้ว — ลองเมนู "ชุดหลายช่วงเวลา" และ "ตารางคาบเรียนวันนี้"', { type: 'ok', ms: 4500 });
    };

    /* รีเซ็ตจากปุ่มบนหน้าเว็บ: ถามก่อนถ้าเวลากำลังเดิน */
    App.reset = async (which) => {
        const w = which || (Timer.view === 'stopwatch' ? 'stopwatch' : 'countdown');
        const s = Timer.snap(w);
        if (s.running && !s.finished && Store.settings.behavior.confirmReset) {
            const ok = await U.confirm('รีเซ็ตเวลา?', w === 'stopwatch' ? 'เวลาที่จับไว้และรอบที่บันทึกจะถูกล้าง' : 'เวลากำลังเดินอยู่ ต้องการเริ่มนับใหม่ใช่หรือไม่', { confirmText: '<i class="fas fa-arrow-rotate-left"></i> รีเซ็ต', danger: true });
            if (!ok) return;
        }
        Timer.reset(w);
    };

    /* ---------------- ป้องกันจอดับ (Screen Wake Lock) ---------------- */
    const Wake = { supported: 'wakeLock' in navigator, sentinel: null, status: 'off', error: '', busy: false };
    Wake.update = async () => {
        const mode = Store.settings.behavior.wake;
        const want = mode === 'always' || (mode === 'running' && (Timer.running() || Stage.isOpen || Noise.active));
        if (!Wake.supported) { Wake.status = mode === 'off' ? 'off' : 'unsupported'; return; }
        if (Wake.busy) return;
        Wake.busy = true;
        try {
            if (want && !Wake.sentinel && document.visibilityState === 'visible') {
                try {
                    const s = await navigator.wakeLock.request('screen');
                    Wake.sentinel = s;
                    Wake.status = 'on';
                    Wake.error = '';
                    s.addEventListener('release', () => { if (Wake.sentinel === s) { Wake.sentinel = null; Wake.status = 'off'; } });
                } catch (e) {
                    Wake.status = 'error';
                    Wake.error = e && e.message ? e.message : String(e);
                }
            } else if (!want && Wake.sentinel) {
                const s = Wake.sentinel;
                Wake.sentinel = null;
                Wake.status = 'off';
                try { await s.release(); } catch (e) { /* ปล่อยแล้ว */ }
            } else if (!want) Wake.status = 'off';
        } finally { Wake.busy = false; }
    };
    Wake.text = () => ({
        on: '<span class="tag ok"><i class="fas fa-sun"></i>กำลังป้องกันจอดับ</span>',
        off: '<span class="tag"><i class="fas fa-moon"></i>ยังไม่ทำงาน (จะทำงานตามที่ตั้งไว้)</span>',
        unsupported: '<span class="tag warn"><i class="fas fa-triangle-exclamation"></i>เบราว์เซอร์/การเปิดแบบนี้ไม่รองรับ — ตั้งค่าเครื่องไม่ให้จอดับเอง</span>',
        error: `<span class="tag warn"><i class="fas fa-triangle-exclamation"></i>ขอป้องกันจอดับไม่สำเร็จ (เช่น แบตเตอรี่ต่ำ) — ตั้งค่าเครื่องไม่ให้จอดับเอง</span>`,
    }[Wake.status] || '');
    App.Wake = Wake;

    /* ---------------- คีย์ลัด ---------------- */
    function typing(t) {
        if (!t) return false;
        const tag = t.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
    }
    App.quick = (i) => {
        const mins = Store.settings.quick[i];
        if (!mins) return;
        Timer.setCountdown(mins * 60000, { start: true });
        U.toast(`ตั้งถอยหลัง ${U.esc(TimerCore.fmtWords(mins * 60000))} แล้ว เริ่มนับทันที`, { type: 'ok', ms: 1800 });
    };
    function onKey(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (typing(e.target)) return;
        if (window.Swal && Swal.isVisible()) return;
        const k = e.key;
        const timerScope = Stage.isOpen ? Stage.mode === 'timer' : App.current === 'timer';
        const view = Timer.view;
        const handled = () => { e.preventDefault(); const a = document.activeElement; if (a && a.tagName === 'BUTTON') a.blur(); };
        if (k === 'Escape' && Stage.isOpen) { handled(); Stage.close(); return; }
        if ((k === 'f' || k === 'F') && (timerScope || App.current === 'noise' || Stage.isOpen)) {
            handled();
            Stage.toggle(App.current === 'noise' && !Stage.isOpen ? 'noise' : (Stage.isOpen ? Stage.mode : 'timer'));
            return;
        }
        if (k === '?' ) { handled(); App.showKeys(); return; }
        if ((k === 'm' || k === 'M') && (timerScope || Stage.isOpen)) {
            handled();
            Store.settings.sound.on = !Store.settings.sound.on;
            Store.commit('settings');
            Timer.replan();
            if (!Store.settings.sound.on) Sound.stopAll();
            U.toast(Store.settings.sound.on ? 'เปิดเสียงเตือนแล้ว' : 'ปิดเสียงเตือนแล้ว', { ms: 1500 });
            if (Stage.isOpen) Stage.flashMsg(Store.settings.sound.on ? '<i class="fas fa-volume-high"></i> เปิดเสียงเตือนแล้ว' : '<i class="fas fa-volume-xmark"></i> ปิดเสียงเตือนแล้ว', 1500);
            return;
        }
        if (!timerScope) return;
        if (k === ' ' || k === 'Spacebar') { handled(); if (view !== 'clock') Timer.toggle(); return; }
        if (k === 'r' || k === 'R') { handled(); if (view === 'clock') return; if (Stage.isOpen) Stage.requestReset(); else App.reset(); return; }
        if ((k === 'l' || k === 'L') && view === 'stopwatch') { handled(); Timer.lap(); return; }
        if (view === 'countdown') {
            if (k === '+' || k === '=' || k === 'ArrowUp') { handled(); Timer.adjust(60000); return; }
            if (k === '-' || k === '_' || k === 'ArrowDown') { handled(); Timer.adjust(-60000); return; }
            if (Timer.cd.segments.length > 1) {
                if (k === 'n' || k === 'N' || k === 'ArrowRight') { handled(); Timer.next(); return; }
                if (k === 'p' || k === 'P' || k === 'ArrowLeft') { handled(); Timer.prev(); return; }
            }
        }
        if (/^[1-5]$/.test(k)) { handled(); App.quick(+k - 1); }
    }

    App.KEYS = [
        ['Space', 'เริ่ม / หยุดชั่วคราว (หมดเวลาแล้ว = เริ่มใหม่)'],
        ['R', 'รีเซ็ต (ถ้าเวลากำลังเดินจะถามยืนยันก่อน)'],
        ['F', 'เปิด/ปิดโหมดเต็มจอ'],
        ['Esc', 'ออกจากโหมดเต็มจอ'],
        ['1 – 5', 'ปุ่มเวลาด่วน (ค่าเริ่มต้น 1, 3, 5, 10, 15 นาที) แล้วเริ่มนับทันที'],
        ['↑ หรือ +', 'เพิ่มเวลา 1 นาที'],
        ['↓ หรือ −', 'ลดเวลา 1 นาที'],
        ['→ หรือ N', 'ชุดหลายช่วงเวลา: ไปช่วงถัดไป'],
        ['← หรือ P', 'ชุดหลายช่วงเวลา: กลับช่วงก่อนหน้า'],
        ['L', 'จับเวลา: บันทึกรอบ'],
        ['M', 'เปิด/ปิดเสียงเตือน'],
        ['?', 'แสดงคีย์ลัดทั้งหมด'],
    ];
    App.showKeys = () => U.sheet({
        title: 'คีย์ลัด (แป้นพิมพ์)',
        sub: 'ใช้ได้ในหน้านาฬิกาจับเวลาและโหมดเต็มจอ • รีโมตพรีเซนเตอร์ส่วนใหญ่ใช้ปุ่มลูกศรได้ด้วย',
        icon: 'fa-keyboard',
        tone: ['var(--hero-2)', 'var(--ac)', 'var(--ac-2)'],
        showCancel: false,
        confirmText: 'ปิด',
        body: `<table class="dt keys-table"><tbody>${App.KEYS.map(([k, t]) => `<tr><td><kbd>${U.esc(k)}</kbd></td><td>${U.esc(t)}</td></tr>`).join('')}</tbody></table>`,
    });

    /* ---------------- อัปเดตทุกเฟรม ---------------- */
    let lastLive = null;
    let lastTitle = '';
    let lastAudio = null;
    let lastMic = null;
    function onFrame(now) {
        const v = window.Views[App.current];
        if (v && v.frame) v.frame(now);
        if (Stage.isOpen) Stage.update(now);
        if (window.Noise && Noise.active) Noise.update();

        // เวลาที่เหลือบนเมนู + ชื่อแท็บ (เห็นได้แม้อยู่หน้าอื่น/แท็บอื่น)
        const s = Timer.snap('countdown');
        let live = '';
        let title = baseTitle;
        if (s.running || s.segDone) {
            const txt = s.segDone ? (s.finished ? 'หมดเวลา' : 'หมดช่วง') : TimerCore.fmt(s.remaining, { ceil: true });
            live = txt;
            title = `${txt} • ${s.label || Timer.cd.title || 'ถอยหลัง'} — ${APP_NAME}`;
        }
        if (live !== lastLive) {
            lastLive = live;
            const b = document.getElementById('sb-live');
            if (b) { b.hidden = !live; b.textContent = live; b.classList.toggle('is-done', s.segDone); }
        }
        if (title !== lastTitle) { lastTitle = title; document.title = title; }

        // ต้องแตะหน้าจอก่อน เบราว์เซอร์จึงยอมให้เล่นเสียง
        const needAudio = Store.settings.sound.on && !Sound.ready() && (Timer.running('countdown') || (Store.data.schedule.bell && Store.data.schedule.periods.length > 0));
        if (needAudio !== lastAudio) { lastAudio = needAudio; document.getElementById('tb-audio').hidden = !needAudio; }
        const mic = !!(window.Noise && Noise.active && !Noise.simulated);   // ป้ายไมค์เฉพาะตอนใช้ไมโครโฟนจริง
        if (mic !== lastMic) {
            lastMic = mic;
            document.getElementById('tb-mic').hidden = !mic;
        }
        if (mic) {
            const pill = document.getElementById('tb-mic');
            pill.dataset.s = Noise.state;
            const b = document.getElementById('sb-mic');
            if (b) b.hidden = false;
        } else {
            const b = document.getElementById('sb-mic');
            if (b && !b.hidden) b.hidden = true;
        }
    }

    function onTimer(type, payload) {
        if (type === 'frame') { onFrame(payload); return; }
        if (type === 'state') { Wake.update(); Stage.refreshCtrl(); }
        if (type === 'alarm' && payload.late < 30000) {
            if (payload.type === 'warn') {
                const s = Timer.snap('countdown');
                const msg = `<i class="fas fa-bell"></i> เหลือเวลาอีก ${U.esc(TimerCore.fmtWords(Store.settings.alert.warnSec * 1000))}`;
                if (Stage.isOpen) Stage.flashMsg(msg, 4000);
                if (App.current === 'timer' && window.Views.timer.flash) window.Views.timer.flash(msg, 4000);
                if (!s.running) return;
            }
            if (payload.type === 'segment') {
                const s = Timer.snap('countdown');
                const msg = `<i class="fas fa-forward"></i> เริ่มช่วงที่ ${s.index + 1}: ${U.esc(s.label || '')}`;
                if (Stage.isOpen) Stage.flashMsg(msg, 3500);
                else U.toast(msg, { type: 'ok', ms: 3500 });
            }
        }
        if (type === 'bell' && payload.late < 60000) {
            const x = payload.info;
            const name = U.esc(x.p.name || Store.KINDS[x.p.kind]);
            const d = new Date(payload.due);
            const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            const msg = payload.type === 'bellwarn'
                ? `<i class="fas fa-bell"></i> อีก ${Store.data.schedule.bellWarnMin} นาทีจะหมด${name}`
                : `<i class="fas fa-bell"></i> ระฆัง ${hhmm} น. • ${payload.due === x.end ? 'หมด' : 'เริ่ม'}${name}`;
            if (Stage.isOpen) Stage.flashMsg(msg, 5000);
            else U.toast(msg, { type: 'warn', ms: 5000 });
        }
        if (type === 'segment') Stage.refreshCtrl();
    }

    /* หน้าต่างต้อนรับครั้งแรก */
    async function welcome() {
        if (!Store.isEmpty() || Store.meta.dismissedWelcome) return;
        const r = await Swal.fire({
            html: `
                <div class="sheet-head" style="--s1:var(--hero-1);--s2:var(--hero-2);--s3:var(--hero-3)">
                    <span class="sh-ic"><i class="fas fa-stopwatch"></i></span>
                    <div><h3>ยินดีต้อนรับสู่นาฬิกาจับเวลาหน้าชั้นเรียน</h3><p>ใช้งานได้โดยไม่ต้องต่ออินเทอร์เน็ต • คอม แท็บเล็ต มือถือ</p></div>
                </div>
                <div class="sheet-body">
                    <div class="steps">
                        <div class="step"><b>1</b><div><strong>ตั้งเวลา</strong>กดปุ่มเวลาด่วน 1 / 3 / 5 / 10 / 15 นาที หรือพิมพ์เวลาเอง แล้วกด Space</div></div>
                        <div class="step"><b>2</b><div><strong>เต็มจอ</strong>กดปุ่ม F ฉายขึ้นโปรเจกเตอร์ ตัวเลขใหญ่อ่านได้จากหลังห้อง</div></div>
                        <div class="step"><b>3</b><div><strong>เครื่องมือเสริม</strong>ชุดหลายช่วงเวลา • ตารางคาบเรียน • ไฟจราจรเสียงดัง</div></div>
                    </div>
                    <div class="note mt-3"><i class="fas fa-database"></i><div>การตั้งค่าและชุดเวลาเก็บไว้ใน<b>เบราว์เซอร์ของเครื่องนี้</b> — กด <b>"บันทึกไฟล์ข้อมูล (.json)"</b> เพื่อสำรองหรือย้ายไปเครื่องอื่น</div></div>
                </div>`,
            width: 760,
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-play"></i> เริ่มใช้งาน (ค่าเริ่มต้น)',
            denyButtonText: '<i class="fas fa-flask"></i> ทดลองด้วยข้อมูลตัวอย่าง',
            cancelButtonText: '<i class="fas fa-folder-open"></i> เปิดไฟล์ข้อมูลเดิม',
            buttonsStyling: false,
            customClass: { popup: 'sheet', confirmButton: 'btn-x primary lg', denyButton: 'btn-x orange lg', cancelButton: 'btn-x ghost lg' },
            allowOutsideClick: false,
            allowEscapeKey: !demoMode(),
            didOpen: () => {
                // โหมดทดลองใช้: ล็อกทางที่ทำให้ใช้กับข้อมูลจริง (ปุ่มข้อมูลตัวอย่างใช้ได้ตามปกติ)
                if (!window.VSDemo) return;
                VSDemo.lock(Swal.getConfirmButton(), 'เริ่มใช้งาน (ข้อมูลว่าง)');
                VSDemo.lock(Swal.getCancelButton(), 'เปิดไฟล์ข้อมูลเดิม');
            },
        });
        Store.setMeta({ dismissedWelcome: true });
        Sound.unlock();
        if (r.isDenied || (demoMode() && Store.isEmpty())) App.loadDemo();
        else if (r.dismiss === Swal.DismissReason.cancel) App.openFile();
    }
    const demoMode = () => !!(window.VSDemo && VSDemo.active);

    function init() {
        Store.load();
        Timer.load();
        Store.on(onStoreChange);
        Timer.on(onTimer);
        window.addEventListener('hashchange', App.render);
        document.getElementById('tb-backup-btn').onclick = App.backupNow;
        document.getElementById('tb-keys').onclick = App.showKeys;
        document.getElementById('tb-audio').onclick = () => { Sound.unlock(); setTimeout(() => Timer.replan(), 150); };
        document.getElementById('tb-mic').onclick = () => App.go('noise');
        window.addEventListener('beforeunload', () => Store.flush());
        document.addEventListener('keydown', onKey);
        // ปลดล็อกเสียงเมื่อผู้ใช้แตะ/คลิก/กดแป้นครั้งแรก
        const unlock = () => { if (!Sound.ready()) { Sound.unlock(); setTimeout(() => Timer.replan(), 120); } };
        ['pointerdown', 'keydown', 'touchend'].forEach((ev) => document.addEventListener(ev, unlock, { capture: true, passive: true }));
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') Wake.update(); });
        Stage.onChange = () => { Wake.update(); const v = window.Views[App.current]; if (v && v.stageChanged) v.stageChanged(); };
        Noise.on((t) => { if (t === 'state' || t === 'error') { Wake.update(); const v = window.Views[App.current]; if (v && v.noiseChanged) v.noiseChanged(t); } });
        // โหมดทดลองใช้: ใช้กับข้อมูลตัวอย่างเสมอ + ปุ่ม "เริ่มข้อมูลตัวอย่างใหม่" บนแถบทดลอง
        if (demoMode()) {
            if (Store.isEmpty() && Store.meta.dismissedWelcome) Store.replaceAll(window.Demo.build(), 'replace');
            VSDemo.onReset(() => {
                Stage.close();
                Noise.stop();
                Timer.reset('stopwatch');
                Timer.setCountdown(5 * 60000, { stop: true, start: false });
                App.loadDemo();
                App.go('timer');
            });
        }
        App.render();
        Timer.replan();
        Timer.startLoop();
        Wake.update();
        welcome();
        setInterval(() => { renderTop(); renderBackupBox(); }, 60000);
    }

    window.App = App;
    window.Views = window.Views || {};
    document.addEventListener('DOMContentLoaded', init);
})();
