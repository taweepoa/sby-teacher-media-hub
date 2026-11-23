/* =====================================================================
   จอแสดงเวลา (Display) + โหมดเต็มจอ (Stage) + ไฟจราจรเสียง (NoiseLight)
   Display ใช้ทั้งในหน้าเว็บปกติและในโหมดเต็มจอ — ตัวเลขปรับขนาดให้เต็มพื้นที่อัตโนมัติ
   ===================================================================== */
(function () {
    'use strict';

    const C = window.TimerCore;
    const RING_LEN = 2 * Math.PI * 46;

    /* ---------- วัดความกว้างตัวอักษร (หน่วย em) ด้วย canvas ---------- */
    const mctx = document.createElement('canvas').getContext('2d');
    const wcache = new Map();
    function emWidth(str) {
        const key = String(str).replace(/\d/g, '0');
        if (wcache.has(key)) return wcache.get(key);
        mctx.font = '800 100px Sarabun, sans-serif';
        const w = mctx.measureText(key).width / 100;
        wcache.set(key, w);
        return w;
    }

    const p2 = (n) => String(n).padStart(2, '0');
    const hm = (ts) => { const d = new Date(ts); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
    const TH_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const thDayDate = (ts) => { const d = new Date(ts); return `วัน${TH_DAYS[d.getDay()]}ที่ ${d.getDate()} ${TH_MONTHS[d.getMonth()]} พ.ศ. ${d.getFullYear() + 543}`; };

    const TEMPLATE = `
        <div class="td-top">
            <div class="td-label"><i class="fas fa-hourglass-half"></i><span class="td-label-t"></span><em class="td-step"></em></div>
            <div class="td-right">
                <span class="td-noise" hidden title="ไฟจราจรเสียง"><i></i><i></i><i></i></span>
                <span class="td-meta"></span>
            </div>
        </div>
        <div class="td-main">
            <svg class="td-ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="trk" cx="50" cy="50" r="46"/><circle class="prg" cx="50" cy="50" r="46" stroke-dasharray="${RING_LEN.toFixed(2)}" stroke-dashoffset="0"/></svg>
            <div class="td-digits" role="timer" aria-live="off"><span class="td-num">00:00</span><span class="td-frac"></span></div>
        </div>
        <div class="td-sub"></div>
        <div class="td-segs"></div>
        <div class="td-bar"><span></span></div>`;

    /* ---------------- จอแสดงเวลา ---------------- */
    function Display(el, opts) {
        const o = Object.assign({ stage: false }, opts || {});
        el.classList.add('tdisp');
        if (o.stage) el.classList.add('is-stage');
        el.innerHTML = TEMPLATE + (o.stage ? '<div class="td-ctrl"></div>' : '');
        const q = (s) => el.querySelector(s);
        const r = {
            labelIc: q('.td-label i'), label: q('.td-label-t'), step: q('.td-step'), meta: q('.td-meta'), noise: q('.td-noise'),
            main: q('.td-main'), ring: q('.td-ring .prg'), digits: q('.td-digits'), num: q('.td-num'), frac: q('.td-frac'),
            sub: q('.td-sub'), segs: q('.td-segs'), bar: q('.td-bar > span'), ctrl: q('.td-ctrl'),
        };
        const last = {};
        let segsKey = '';
        const set = (k, node, val, html) => { if (last[k] === val) return; last[k] = val; if (html) node.innerHTML = val; else node.textContent = val; };
        /* ตัวเลขเวลา: แยกเป็นกลุ่ม ๆ (นาที : วินาที) เพื่อจัดเรียงซ้อนบน-ล่างบนจอแนวตั้งได้ */
        const setNum = (val, units) => {
            const u = units || ['นาที', 'วินาที'];
            if (last.num === val && last.units === u[0]) return;
            last.num = val;
            last.units = u[0];
            const groups = val.split(':');
            r.num.innerHTML = groups.map((g, i) => `<span class="g"${groups.length === 2 ? ` data-u="${u[i]}"` : ''}>${U.esc(g)}</span>`).join('<span class="c">:</span>');
        };
        const setIc = (c) => { if (last.ic !== c) { last.ic = c; r.labelIc.className = c; } };
        const cls = (name, on) => { if (last[`c:${name}`] === on) return; last[`c:${name}`] = on; el.classList.toggle(name, on); };

        function fit(force) {
            const box = r.main.getBoundingClientRect();
            if (!box.width || !box.height) return;
            const text = r.num.textContent;
            const frac = r.frac.textContent;
            const ring = el.classList.contains('prog-ring');
            const scale = (Store.settings.display.scale || 100) / 100;
            const key = `${text.replace(/\d/g, '0')}|${frac.replace(/\d/g, '0')}|${ring}|${scale}|${Math.round(box.width)}x${Math.round(box.height)}`;
            if (!force && key === last.fitKey) return;
            last.fitKey = key;
            const wEm = emWidth(text) + (frac ? emWidth(frac) * 0.42 + 0.04 : 0);
            const W = box.width * 0.95;
            const H = box.height * 0.96;
            let fs = Math.min(W / wEm, H / 0.78);
            let stacked = false;
            // วงแหวน: ตัวเลขต้องอยู่ในวงกลม (สี่เหลี่ยมแนบในวงกลม: กว้าง² + สูง² ≤ เส้นผ่านศูนย์กลาง²)
            if (ring) { const D = Math.min(box.width, box.height) * 0.86; fs = D / Math.sqrt(wEm * wEm + 0.78 * 0.78); }
            else if (/^\d\d:\d\d$/.test(text) && !frac) {
                // จอแนวตั้ง (มือถือ/แท็บเล็ตตั้งหน้าห้อง): แสดง นาที บน / วินาที ล่าง ถ้าได้ตัวเลขใหญ่กว่า
                const fs2 = Math.min(W / (emWidth('00') + 0.36), H / 1.62);   // เผื่อที่ป้าย นาที/วินาที ด้านขวา
                if (fs2 > fs * 1.15) { fs = fs2; stacked = true; }
            }
            el.classList.toggle('is-stacked', stacked);
            fs = Math.max(14, fs * scale);
            r.digits.style.fontSize = `${fs.toFixed(1)}px`;
        }
        const ro = new ResizeObserver(() => fit(true));
        ro.observe(r.main);

        function renderSegs(cd, snap) {
            const key = `${cd.rev}|${cd.segments.map((g) => `${g.ms}${g.label}${g.color}`).join(',')}`;
            if (key !== segsKey) {
                segsKey = key;
                r.segs.innerHTML = cd.segments.map((g, i) => `<button type="button" class="td-seg" data-i="${i}" style="--sc:${g.color || 'var(--st-ac)'};flex-grow:${Math.max(1, g.ms / 1000)}" title="${U.esc(g.label || `ช่วงที่ ${i + 1}`)} • ${C.fmt(g.ms)}"><i></i><b>${U.esc(g.label || `ช่วงที่ ${i + 1}`)}</b><small>${C.fmt(g.ms)}</small></button>`).join('');
            }
            r.segs.querySelectorAll('.td-seg').forEach((b, i) => {
                const st = i < snap.index ? 'done' : i === snap.index ? 'cur' : '';
                if (b.dataset.st !== st) { b.dataset.st = st; b.className = `td-seg ${st}`; }
                const fill = i < snap.index ? 1 : i === snap.index ? snap.segProgress : 0;
                const w = `${(fill * 100).toFixed(1)}%`;
                const bar = b.firstElementChild;
                if (bar.style.width !== w) bar.style.width = w;
            });
        }

        function update(now) {
            const S = Store.settings;
            const ds = S.display;
            const view = o.view || Timer.view;
            cls(`bg-${ds.bg}`, true);
            Store.BGS.forEach((b) => { if (b.id !== ds.bg) cls(`bg-${b.id}`, false); });
            ['bar', 'ring', 'none'].forEach((p) => cls(`prog-${p}`, ds.progress === p));
            ['countdown', 'stopwatch', 'clock'].forEach((v) => cls(`view-${v}`, view === v));
            cls('no-label', !ds.showLabel);

            // ไฟเสียงมุมจอ
            const showNoise = !!(window.Noise && Noise.active && ds.showNoise);
            if (r.noise.hidden === showNoise) r.noise.hidden = !showNoise;
            if (showNoise) { r.noise.dataset.s = Noise.state; }

            let levelName = 'normal';
            let ringFrac = 0;
            let barFrac = 0;
            let accent = '';
            let segsOn = false;

            if (view === 'countdown') {
                const cd = Timer.cd;
                const s = C.snapshot(cd, now);
                levelName = Timer.level(s);
                const over = s.segDone && S.behavior.overtime;
                setNum(over ? `+${C.fmt(s.overtime)}` : C.fmt(s.remaining, { ceil: true }));
                set('frac', r.frac, '');
                const title = s.count > 1 ? (s.label || `ช่วงที่ ${s.index + 1}`) : (s.label || cd.title || 'ถอยหลัง');
                set('label', r.label, title);
                set('step', r.step, s.count > 1 ? `${cd.title ? `${cd.title} • ` : ''}ช่วงที่ ${s.index + 1}/${s.count}` : '');
                setIc(s.count > 1 ? 'fas fa-layer-group' : 'fas fa-hourglass-half');
                let sub = '';
                if (s.finished) sub = '<i class="fas fa-bell"></i> หมดเวลา!';
                else if (s.waiting) sub = `<i class="fas fa-flag-checkered"></i> หมดช่วงนี้แล้ว — กด <b>ถัดไป</b> เพื่อเริ่ม "${U.esc(s.next.label || `ช่วงที่ ${s.index + 2}`)}"`;
                else if (!s.running && s.started) sub = '<i class="fas fa-pause"></i> หยุดชั่วคราว';
                else if (!s.running) sub = s.count > 1 ? `<i class="fas fa-circle-play"></i> พร้อมเริ่ม • รวม ${U.esc(C.fmtWords(s.totalMs))}` : '<i class="fas fa-circle-play"></i> พร้อมเริ่ม';
                else if (s.next) sub = `ถัดไป: ${U.esc(s.next.label || `ช่วงที่ ${s.index + 2}`)} ${C.fmt(s.next.ms)}`;
                if (o.flashMsg && o.flashMsg.until > now) sub = o.flashMsg.html;
                set('sub', r.sub, sub, true);
                const endTxt = ds.showEndTime && s.running && !s.segDone ? `<i class="fas fa-flag-checkered"></i>จบเวลา ${hm(s.endsAt)} น.` : '';
                set('meta', r.meta, endTxt, true);
                ringFrac = s.segMs > 0 ? s.remaining / s.segMs : 0;
                barFrac = ringFrac;
                accent = s.color || '';
                segsOn = s.count > 1;
                if (segsOn) renderSegs(cd, s);
                cls('is-running', s.running);
                cls('is-paused', !s.running && s.started && !s.segDone);
                cls('done-fresh', s.segDone && s.overtime < 12000 && ds.flash);
            } else if (view === 'stopwatch') {
                const s = C.snapshot(Timer.sw, now);
                const full = C.fmt(s.elapsed, { tenths: true });
                setNum(full.slice(0, -2));
                set('frac', r.frac, full.slice(-2));
                set('label', r.label, 'จับเวลา');
                set('step', r.step, s.laps.length ? `บันทึกแล้ว ${s.laps.length} รอบ` : '');
                setIc('fas fa-stopwatch');
                let sub = s.running ? '' : (s.started ? '<i class="fas fa-pause"></i> หยุดชั่วคราว' : '<i class="fas fa-circle-play"></i> พร้อมเริ่ม');
                if (s.laps.length) sub = `รอบที่ ${s.laps.length + 1}: ${C.fmt(s.lap, { tenths: true })}${s.running ? '' : ' • หยุดชั่วคราว'}`;
                set('sub', r.sub, sub, true);
                set('meta', r.meta, '', true);
                ringFrac = (s.elapsed % 60000) / 60000;
                barFrac = ringFrac;
                cls('is-running', s.running);
                cls('is-paused', !s.running && s.started);
                cls('done-fresh', false);
            } else {
                const d = new Date(now);
                setNum(ds.clockSeconds ? `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}` : `${p2(d.getHours())}:${p2(d.getMinutes())}`, ['นาฬิกา', 'นาที']);
                set('frac', r.frac, '');
                set('label', r.label, thDayDate(now));
                setIc('fas fa-clock');
                const t = window.Sched ? Sched.day(now) : null;
                let sub = '';
                let step = '';
                barFrac = d.getSeconds() / 60;
                if (t && t.school && t.current) {
                    const left = t.current.end - now;
                    sub = `<i class="fas fa-book-open"></i> ${U.esc(Sched.title(t.current))} • หมดคาบใน <b>${U.esc(C.fmt(left, { ceil: true }))}</b>`;
                    step = `${t.current.p.start}–${t.current.p.end} น.`;
                    barFrac = 1 - (now - t.current.start) / (t.current.end - t.current.start);
                } else if (t && t.school && t.next) {
                    sub = `<i class="fas fa-forward"></i> ถัดไป ${U.esc(Sched.title(t.next))} เวลา ${t.next.p.start} น. (อีก ${U.esc(C.fmtWords(Math.ceil((t.next.start - now) / 60000) * 60000))})`;
                }
                set('sub', r.sub, sub, true);
                set('step', r.step, step);
                set('meta', r.meta, '', true);
                ringFrac = barFrac;
                cls('is-running', true);
                cls('is-paused', false);
                cls('done-fresh', false);
            }
            ['normal', 'warn', 'danger', 'done'].forEach((l) => cls(`lv-${l}`, levelName === l));
            cls('has-segs', segsOn);
            if (last.accent !== accent) { last.accent = accent; el.style.setProperty('--seg', accent || 'var(--st-ac)'); }
            const off = (RING_LEN * (1 - Math.max(0, Math.min(1, ringFrac)))).toFixed(1);
            if (last.ring !== off) { last.ring = off; r.ring.setAttribute('stroke-dashoffset', off); }
            const bw = `${(Math.max(0, Math.min(1, barFrac)) * 100).toFixed(2)}%`;
            if (last.bar !== bw) { last.bar = bw; r.bar.style.width = bw; }
            fit(false);
            document.documentElement.dataset.level = levelName;
        }

        r.segs.addEventListener('click', (e) => {
            const b = e.target.closest('.td-seg');
            if (!b || !o.onSeg) return;
            o.onSeg(+b.dataset.i);
        });

        return { el, refs: r, update, fit, destroy() { ro.disconnect(); }, opts: o };
    }

    /* ---------------- ไฟจราจรเสียงขนาดใหญ่ ---------------- */
    function NoiseLight(el, opts) {
        const o = opts || {};
        el.classList.add('nlight');
        el.innerHTML = `
            <div class="nl-lamps"><i class="nl-red"></i><i class="nl-yellow"></i><i class="nl-green"></i></div>
            <div class="nl-side">
                <div class="nl-state"></div>
                <div class="nl-meter"><span class="nl-fill"></span><span class="nl-peak"></span><i class="nl-mk y"></i><i class="nl-mk r"></i></div>
                <div class="nl-stats"></div>
            </div>`;
        const q = (s) => el.querySelector(s);
        const r = { state: q('.nl-state'), fill: q('.nl-fill'), peak: q('.nl-peak'), y: q('.nl-mk.y'), rd: q('.nl-mk.r'), stats: q('.nl-stats') };
        const last = {};
        function update() {
            const N = window.Noise;
            const cfg = Store.settings.noise;
            const st = N.active ? N.state : 'off';
            if (last.st !== st) { last.st = st; el.dataset.s = st; }
            const txt = N.active ? N.stateText(N.state) : (N.starting ? 'กำลังขอใช้ไมโครโฟน…' : 'ยังไม่ได้เริ่มฟังเสียง');
            if (last.txt !== txt) { last.txt = txt; r.state.textContent = txt; }
            r.fill.style.width = `${N.active ? N.level.toFixed(1) : 0}%`;
            r.peak.style.left = `${N.active ? N.peak.toFixed(1) : 0}%`;
            r.y.style.left = `${cfg.yellow}%`;
            r.rd.style.left = `${cfg.red}%`;
            const s = N.stats;
            const quiet = N.active && s.quietSince ? Date.now() - s.quietSince : 0;
            const st2 = N.active ? `<span><i class="fas fa-face-smile"></i>เงียบต่อเนื่อง <b>${C.fmt(quiet)}</b></span><span><i class="fas fa-volume-high"></i>ดังเกิน <b>${s.redCount}</b> ครั้ง</span>${o.big ? '' : `<span><i class="fas fa-trophy"></i>เงียบนานสุด <b>${C.fmt(s.bestQuiet)}</b></span>`}` : '';
            if (last.st2 !== st2) { last.st2 = st2; r.stats.innerHTML = st2; }
        }
        return { el, update };
    }

    /* ---------------- เต็มจอ ---------------- */
    const FS = {
        supported: !!(document.fullscreenEnabled || document.webkitFullscreenEnabled),
        el: () => document.fullscreenElement || document.webkitFullscreenElement || null,
        enter(node) {
            const f = node.requestFullscreen || node.webkitRequestFullscreen;
            if (!f) return Promise.resolve(false);
            try { return Promise.resolve(f.call(node, { navigationUI: 'hide' })).then(() => true).catch(() => false); } catch (e) { return Promise.resolve(false); }
        },
        exit() {
            const f = document.exitFullscreen || document.webkitExitFullscreen;
            if (f && FS.el()) { try { return Promise.resolve(f.call(document)).catch(() => {}); } catch (e) { /* ไม่เป็นไร */ } }
            return Promise.resolve();
        },
    };

    const Stage = { isOpen: false, mode: 'timer', display: null, light: null, viaFS: false, resetArmUntil: 0, flash: null };
    let ov = null;
    let idleTimer = null;

    function ctrlButtons() {
        const view = Timer.view;
        const cd = view === 'countdown' ? C.snapshot(Timer.cd, Clock.now()) : null;
        const sw = view === 'stopwatch' ? C.snapshot(Timer.sw, Clock.now()) : null;
        const run = cd ? cd.running : sw ? sw.running : false;
        const B = (act, icon, label, cls, extra) => `<button type="button" class="st-btn ${cls || ''}" data-act="${act}" title="${label}" aria-label="${label}"${extra || ''}><i class="fas ${icon}"></i><span>${label}</span></button>`;
        const arm = Stage.resetArmUntil > Clock.now();
        let html = '';
        if (Stage.mode === 'noise') {
            html += Noise.active ? B('noise-reset', 'fa-rotate', 'เริ่มนับสถิติใหม่') : '';
        } else if (cd) {
            if (cd.count > 1) html += B('prev', 'fa-backward-step', 'ช่วงก่อนหน้า', '', cd.index === 0 ? ' disabled' : '');
            html += B('minus', 'fa-minus', 'ลด 1 นาที');
            html += cd.finished ? B('toggle', 'fa-rotate-left', 'เริ่มใหม่', 'main') : B('toggle', run ? 'fa-pause' : 'fa-play', run ? 'หยุด' : 'เริ่ม', 'main');
            html += B('plus', 'fa-plus', 'เพิ่ม 1 นาที');
            if (cd.count > 1) html += B('next', 'fa-forward-step', 'ช่วงถัดไป', cd.waiting ? 'pulse' : '', cd.index >= cd.count - 1 ? ' disabled' : '');
            html += B('reset', 'fa-arrow-rotate-left', arm ? 'กดอีกครั้งเพื่อรีเซ็ต' : 'รีเซ็ต', arm ? 'armed' : '');
        } else if (sw) {
            html += B('lap', 'fa-flag', 'บันทึกรอบ', '', sw.running ? '' : ' disabled');
            html += B('toggle', run ? 'fa-pause' : 'fa-play', run ? 'หยุด' : 'เริ่ม', 'main');
            html += B('reset', 'fa-arrow-rotate-left', arm ? 'กดอีกครั้งเพื่อรีเซ็ต' : 'รีเซ็ต', arm ? 'armed' : '');
        }
        const snd = Store.settings.sound.on;
        html += B('sound', snd ? 'fa-volume-high' : 'fa-volume-xmark', snd ? 'ปิดเสียง' : 'เปิดเสียง', snd ? '' : 'off');
        html += B('close', 'fa-compress', 'ออกจากเต็มจอ', 'ghost');
        return html;
    }

    function renderCtrl() {
        if (!Stage.isOpen) return;
        const host = Stage.mode === 'noise' ? ov.querySelector('.st-noise-ctrl') : Stage.display.refs.ctrl;
        const html = ctrlButtons();
        if (host._html !== html) { host._html = html; host.innerHTML = html; }
    }

    /* รีเซ็ตขณะเวลาเดินบนจอใหญ่: กด 2 ครั้ง (ไม่ต้องมีหน้าต่างยืนยันบังจอ) */
    Stage.requestReset = () => {
        const which = Timer.view === 'stopwatch' ? 'stopwatch' : 'countdown';
        const s = Timer.snap(which);
        const busy = s.running && !(s.finished);
        if (busy && Store.settings.behavior.confirmReset && Stage.resetArmUntil < Clock.now()) {
            Stage.resetArmUntil = Clock.now() + 2500;
            Stage.flashMsg('<i class="fas fa-triangle-exclamation"></i> กดรีเซ็ต (หรือปุ่ม R) อีกครั้งเพื่อยืนยัน', 2500);
            renderCtrl();
            setTimeout(renderCtrl, 2600);
            return false;
        }
        Stage.resetArmUntil = 0;
        Timer.reset(which);
        return true;
    };

    Stage.flashMsg = (html, ms) => {
        if (!Stage.display) return;
        Stage.display.opts.flashMsg = { html, until: Clock.now() + (ms || 2500) };
    };

    function act(a) {
        switch (a) {
            case 'toggle': Timer.toggle(); break;
            case 'reset': Stage.requestReset(); break;
            case 'plus': Timer.adjust(60000); break;
            case 'minus': Timer.adjust(-60000); break;
            case 'next': Timer.next(); break;
            case 'prev': Timer.prev(); break;
            case 'lap': Timer.lap(); break;
            case 'sound': Store.settings.sound.on = !Store.settings.sound.on; Store.commit('settings'); Timer.replan(); if (!Store.settings.sound.on) Sound.stopAll(); break;
            case 'noise-reset': Noise.resetStats(); break;
            case 'close': Stage.close(); break;
            default: break;
        }
        renderCtrl();
    }

    function poke() {
        if (!ov) return;
        ov.classList.remove('idle');
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => { idleTimer = null; if (Stage.isOpen && busy()) ov.classList.add('idle'); }, 3200);
    }
    /* ซ่อนปุ่มอัตโนมัติเฉพาะตอนที่เวลากำลังเดิน/กำลังฟังเสียง — หยุดอยู่ให้เห็นปุ่มเสมอ */
    const busy = () => (Stage.mode === 'noise' ? Noise.active : (Timer.view === 'clock' || Timer.running(Timer.view === 'stopwatch' ? 'stopwatch' : 'countdown')));

    function build() {
        if (ov) return;
        ov = document.createElement('div');
        ov.id = 'stage-overlay';
        ov.className = 'stage-ov';
        ov.hidden = true;
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-label', 'จอแสดงเวลาแบบเต็มจอ');
        ov.innerHTML = `
            <div class="st-timer"></div>
            <div class="st-noise">
                <div class="st-noise-head"><i class="fas fa-traffic-light"></i><span>ไฟจราจรเสียง</span><em class="st-noise-sim" hidden>โหมดจำลอง</em></div>
                <div class="st-noise-body"></div>
                <div class="td-ctrl st-noise-ctrl"></div>
            </div>`;
        document.body.appendChild(ov);
        Stage.display = Display(ov.querySelector('.st-timer'), { stage: true, onSeg: (i) => Timer.goTo(i) });
        Stage.light = NoiseLight(ov.querySelector('.st-noise-body'), { big: true });
        ov.addEventListener('click', (e) => {
            const b = e.target.closest('[data-act]');
            if (b && !b.disabled) { e.stopPropagation(); act(b.dataset.act); }
            poke();
        });
        ['mousemove', 'touchstart', 'keydown'].forEach((ev) => ov.addEventListener(ev, poke, { passive: true }));
        const onFs = () => { if (!FS.el() && Stage.isOpen && Stage.viaFS) Stage.close(true); };
        document.addEventListener('fullscreenchange', onFs);
        document.addEventListener('webkitfullscreenchange', onFs);
    }

    Stage.open = async (mode) => {
        build();
        if (window.Sound) Sound.unlock();
        Stage.mode = mode === 'noise' ? 'noise' : 'timer';
        ov.dataset.mode = Stage.mode;
        // ตอนเปิดให้ตัวเลขขึ้นขนาดเต็มทันที (ไม่ต้องค่อย ๆ ขยาย)
        ov.classList.add('opening');
        clearTimeout(Stage.openT);
        Stage.openT = setTimeout(() => ov.classList.remove('opening'), 900);
        ov.hidden = false;
        Stage.isOpen = true;
        document.documentElement.classList.add('stage-on');
        // โหมดทดลองใช้ (vs-demo.js): ย่อแถบทดลองระหว่างฉายจอ ไม่ให้บังนาฬิกา
        if (window.VSDemo && VSDemo.active) document.documentElement.classList.add('vsd-min');
        ov.querySelector('.st-noise-sim').hidden = !Noise.simulated;
        Stage.update(Clock.now());
        renderCtrl();
        poke();
        Stage.viaFS = false;
        if (FS.supported && !FS.el()) Stage.viaFS = await FS.enter(ov);
        else if (FS.el()) Stage.viaFS = true;
        requestAnimationFrame(() => Stage.display && Stage.display.fit(true));
        if (Stage.onChange) Stage.onChange();
    };

    Stage.close = (fromFs) => {
        if (!Stage.isOpen) return;
        Stage.isOpen = false;
        ov.hidden = true;
        ov.classList.remove('idle');
        document.documentElement.classList.remove('stage-on');
        if (window.VSDemo && VSDemo.active) document.documentElement.classList.remove('vsd-min');
        if (!fromFs) FS.exit();
        Stage.viaFS = false;
        if (Stage.onChange) Stage.onChange();
    };
    Stage.toggle = (mode) => (Stage.isOpen ? Stage.close() : Stage.open(mode));

    Stage.update = (now) => {
        if (!Stage.isOpen) return;
        if (ov.classList.contains('idle') && !busy()) poke();
        else if (!ov.classList.contains('idle') && busy() && !idleTimer) poke();
        if (Stage.mode === 'noise') {
            Stage.light.update();
            ov.dataset.s = Noise.active ? Noise.state : 'off';
            ov.querySelector('.st-noise').className = `st-noise bg-${Store.settings.display.bg}`;
        } else {
            Stage.display.update(now);
        }
        renderCtrl();
    };
    Stage.refreshCtrl = renderCtrl;

    window.Display = Display;
    window.NoiseLight = NoiseLight;
    window.Stage = Stage;
    window.FS = FS;
    window.emWidth = emWidth;
})();
