/* =====================================================================
   นาฬิกากลาง + ตัวตั้งเวลาเสียงเตือน (Alarms) + ตัวควบคุมนาฬิกา (Timer)
   - เวลาทุกค่าคำนวณจาก Clock.now() (เวลาจริง) → ถูกต้องแม้แท็บอยู่เบื้องหลัง
   - เสียงเตือนตั้งเวลาล่วงหน้าบนนาฬิกาของระบบเสียง (Web Audio) จึงดังตรงเวลาแม้ JavaScript ถูกหน่วง
     ถ้าเสียงไม่ได้ดัง (เช่น หน้าเว็บถูกพัก) ระบบจะตรวจพบในรอบถัดไปและเล่นทันที (ไม่เกิน 30 วินาทีหลังกำหนด)
   - สถานะนาฬิกาเก็บใน localStorage แยกจากข้อมูลหลัก → เผลอรีเฟรช/ปิดแล้วเปิดใหม่ นาฬิกายังเดินต่อถูกต้อง
   ===================================================================== */
(function () {
    'use strict';

    const C = window.TimerCore;
    const KEY_RUN = 'vs_classroom_timer.run.v1';

    /* offset ใช้เฉพาะสคริปต์ทดสอบ/ถ่ายภาพ (จำลองเวลาของตารางคาบ) ผู้ใช้ปรับไม่ได้ */
    const Clock = { offset: 0, now() { return Date.now() + this.offset; } };

    /* ---------------- เสียงเตือนตามเวลา ---------------- */
    const HORIZON = 20 * 60000;            // ตั้งเวลาเสียงล่วงหน้าไม่เกิน 20 นาที
    const LATE_LIMIT = 30000;              // ถ้าเลยเวลานานกว่านี้ ไม่เล่นเสียงย้อนหลัง
    const Alarms = (function () {
        const sources = {};
        const fired = new Set();
        let lastDrift = 0;
        const sig = (m) => `${m.sound}|${m.volume}|${m.repeat}`;

        function schedule(m, now) {
            if (!m.sound || !window.Sound || !Sound.ready()) return;
            m.handle = Sound.play(m.sound, { at: Sound.ctx.currentTime + (m.due - now) / 1000, volume: m.volume, repeat: m.repeat, tag: m.type });
        }

        function pump(now) {
            const checkDrift = now - lastDrift > 5000;
            if (checkDrift) lastDrift = now;
            Object.values(sources).forEach((list) => list.forEach((m) => {
                if (!m.sound || m.due - now > HORIZON) return;
                if (!m.handle) { schedule(m, now); return; }
                // นาฬิกาเสียงกับนาฬิกาเครื่องอาจคลาดกันเล็กน้อยเมื่อเวลานาน — ปรับให้ตรงทุก 5 วินาที
                if (checkDrift && m.due - now > 1500 && Sound.ready()) {
                    const want = Sound.ctx.currentTime + (m.due - now) / 1000;
                    if (Math.abs(want - m.handle.at) > 0.12) { m.handle.cancel(); m.handle = null; schedule(m, now); }
                }
            }));
        }

        /* เสียงที่ตั้งไว้ล่วงหน้า "ดังแล้วหรือกำลังจะดังภายใน 1 วินาที" หรือไม่
           (นาฬิกาเสียงอัปเดตเป็นช่วง ๆ และอาจช้ากว่านาฬิกาเครื่องเล็กน้อย จึงเผื่อไว้)
           ถ้าระบบเสียงถูกพัก/นาฬิกาเสียงหยุดเดิน เสียงจะยังไม่ดัง → ยกเลิกแล้วเล่นทันทีแทน */
        function played(m) {
            return !!(m.handle && Sound.ready() && m.handle.at - Sound.ctx.currentTime < 1.0);
        }

        function fire(m, now, silent) {
            fired.add(m.key);
            const late = now - m.due;
            const ok = played(m);
            if (!ok && m.handle) { m.handle.cancel(); m.handle = null; }
            if (!ok && !silent && m.sound && late < LATE_LIMIT) {
                Sound.unlock();
                m.handle = Sound.play(m.sound, { volume: m.volume, repeat: m.repeat, tag: `${m.type}` });
            }
            if (m.onFire) { try { m.onFire(m, late); } catch (e) { console.error(e); } }
        }

        function tick(now) {
            Object.keys(sources).forEach((src) => {
                const list = sources[src];
                const due = list.filter((m) => m.due <= now).sort((a, b) => a.due - b.due);
                if (!due.length) return;
                sources[src] = list.filter((m) => m.due > now);
                // หลายจุดถึงเวลาพร้อมกัน (หน้าเว็บถูกพัก) → เล่นเฉพาะเสียงล่าสุด ไม่ให้ดังซ้อนกัน
                due.forEach((m, i) => fire(m, now, i < due.length - 1));
            });
            pump(now);
        }

        function set(source, marks) {
            const now = Clock.now();
            const old = new Map((sources[source] || []).map((m) => [m.key, m]));
            const list = [];
            marks.forEach((m) => {
                if (fired.has(m.key) || m.due <= now) return;
                const o = old.get(m.key);
                if (o && Math.abs(o.due - m.due) < 40 && sig(o) === sig(m)) {
                    o.onFire = m.onFire;
                    list.push(o);
                    old.delete(m.key);
                    return;
                }
                list.push(Object.assign({}, m, { handle: null }));
            });
            old.forEach((o) => { if (o.handle) o.handle.cancel(); });
            sources[source] = list;
            pump(now);
        }

        function clear(source) { set(source, []); }
        const pending = (source) => (source ? sources[source] || [] : Object.values(sources).flat()).map((m) => ({ key: m.key, type: m.type, due: m.due, sound: m.sound, scheduled: !!m.handle, at: m.handle ? m.handle.at : null }));

        return { set, tick, clear, pending, fired };
    })();

    /* ---------------- ตัวควบคุมนาฬิกา ---------------- */
    const listeners = new Set();
    const Timer = {
        cd: C.countdown(5 * 60000),
        sw: C.stopwatch(),
        view: 'countdown',
        lastMs: 5 * 60000,
    };
    const emit = (type, payload) => listeners.forEach((fn) => { try { fn(type, payload); } catch (e) { console.error(e); } });

    function save() {
        try {
            localStorage.setItem(KEY_RUN, JSON.stringify({ cd: Timer.cd, sw: Timer.sw, view: Timer.view, lastMs: Timer.lastMs, savedAt: Date.now() }));
        } catch (e) { /* ไม่เป็นไร เป็นสถานะชั่วคราว */ }
    }

    function load() {
        let raw = null;
        try { raw = JSON.parse(localStorage.getItem(KEY_RUN) || 'null'); } catch (e) { raw = null; }
        if (raw) {
            Timer.cd = C.normalize(raw.cd, 'countdown');
            Timer.sw = C.normalize(raw.sw, 'stopwatch');
            Timer.view = ['countdown', 'stopwatch', 'clock'].includes(raw.view) ? raw.view : 'countdown';
            Timer.lastMs = Number(raw.lastMs) > 0 ? Number(raw.lastMs) : 5 * 60000;
        }
        C.settle(Timer.cd, Clock.now());
    }

    /* ระดับสี: normal → warn (เหลือง) → danger (แดง) → done (หมดเวลา) */
    function level(snap) {
        if (snap.kind !== 'countdown') return 'normal';
        if (snap.segDone) return 'done';
        const a = Store.settings.alert;
        const warnMs = a.warnSec * 1000;
        const dangerMs = a.dangerSec * 1000;
        const w = snap.segMs > warnMs + 2000 ? warnMs : snap.segMs * 0.25;
        const d = snap.segMs > dangerMs * 3 ? dangerMs : snap.segMs * 0.1;
        if (!snap.started) return 'normal';
        if (snap.remaining <= d) return 'danger';
        if (snap.remaining <= w) return 'warn';
        return 'normal';
    }

    /* ตั้งเวลาเสียงเตือนใหม่ทุกครั้งที่สถานะหรือการตั้งค่าเปลี่ยน */
    function replan() {
        const s = Store.settings;
        const snd = s.sound;
        const vol = snd.volume / 100;
        const now = Clock.now();
        const marks = C.marks(Timer.cd, now, { warnMs: snd.warn ? s.alert.warnSec * 1000 : 0, tickSec: snd.ticks }).map((m) => {
            let sound = null; let repeat = 1; let volume = vol;
            if (m.type === 'warn') sound = snd.warnSound;
            else if (m.type === 'tick') { sound = 'tick'; volume = vol * 0.75; }
            else if (m.type === 'segment') sound = snd.segment;
            else if (m.type === 'end') { sound = snd.end; repeat = snd.endRepeat; }
            if (!snd.on || !sound) sound = null;
            return Object.assign(m, { sound, repeat, volume, onFire: (mk, late) => emit('alarm', { type: mk.type, index: mk.index, n: mk.n, late }) });
        });
        Alarms.set('timer', marks);
        // ระฆังตามตารางคาบ (เฉพาะตอนเปิดโปรแกรมไว้)
        const bells = window.Sched ? Sched.bellMarks(now, snd.warnSound).map((m) => Object.assign(m, {
            sound: snd.on ? m.sound : null,
            volume: vol,
            onFire: (mk, late) => emit('bell', { type: mk.type, info: mk.info, due: mk.due, late }),
        })) : [];
        Alarms.set('bell', bells);
    }

    function changed(reason) {
        save();
        replan();
        emit('state', reason);
    }

    const now = () => Clock.now();
    const cur = () => (Timer.view === 'stopwatch' ? Timer.sw : Timer.cd);

    Object.assign(Timer, {
        Clock,
        Alarms,
        level,
        replan,
        load,
        on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        snap(which) { return C.snapshot(which === 'stopwatch' ? Timer.sw : Timer.cd, now()); },
        running(which) {
            if (which) return C.isRunning(which === 'stopwatch' ? Timer.sw : Timer.cd);
            return C.isRunning(Timer.cd) || C.isRunning(Timer.sw);
        },
        setView(v) {
            if (!['countdown', 'stopwatch', 'clock'].includes(v) || Timer.view === v) return;
            Timer.view = v;
            changed('view');
        },
        start(which) {
            if (window.Sound) Sound.unlock();
            const s = which === 'stopwatch' ? Timer.sw : which === 'countdown' ? Timer.cd : cur();
            C.start(s, now());
            changed('start');
        },
        pause(which) {
            const s = which === 'stopwatch' ? Timer.sw : which === 'countdown' ? Timer.cd : cur();
            C.pause(s, now());
            if (s === Timer.cd && window.Sound) Sound.stopAll(['end', 'segment', 'tick', 'warn']);
            changed('pause');
        },
        /* Space: เริ่ม/หยุด • ถ้าหมดเวลาแล้ว = รีเซ็ตกลับเวลาเดิม */
        toggle(which) {
            const w = which || (Timer.view === 'stopwatch' ? 'stopwatch' : 'countdown');
            const s = w === 'stopwatch' ? Timer.sw : Timer.cd;
            if (w === 'countdown' && C.snapshot(s, now()).finished) { Timer.reset('countdown'); return; }
            if (C.isRunning(s)) Timer.pause(w); else Timer.start(w);
        },
        reset(which) {
            const w = which || (Timer.view === 'stopwatch' ? 'stopwatch' : 'countdown');
            C.reset(w === 'stopwatch' ? Timer.sw : Timer.cd);
            if (w === 'countdown' && window.Sound) Sound.stopAll(['end', 'segment', 'tick', 'warn']);
            changed('reset');
        },
        /* ตั้งถอยหลังเวลาเดียว (ปุ่มเวลาด่วน / พิมพ์เอง) */
        setCountdown(ms, opts) {
            const o = opts || {};
            const wasRunning = C.isRunning(Timer.cd) && !o.stop;
            if (window.Sound) Sound.stopAll(['end', 'segment', 'tick', 'warn']);
            Timer.cd = C.countdown(ms, { label: o.label || '', title: o.title || '', rev: Timer.cd.rev });
            if (!o.keepLast) Timer.lastMs = Timer.cd.segments[0].ms;
            if (o.start || (wasRunning && o.start !== false)) C.start(Timer.cd, now());
            Timer.view = 'countdown';
            changed('set');
        },
        loadSequence(seq, opts) {
            const o = opts || {};
            if (window.Sound) Sound.stopAll(['end', 'segment', 'tick', 'warn']);
            Timer.cd = C.sequence(seq, { rev: Timer.cd.rev });
            if (o.start) { if (window.Sound) Sound.unlock(); C.start(Timer.cd, now()); }
            Timer.view = 'countdown';
            changed('sequence');
        },
        /* กลับเป็นถอยหลังเวลาเดียว (เลิกใช้ชุด) */
        clearSequence() { Timer.setCountdown(Timer.lastMs, { stop: true, start: false, keepLast: true }); },
        adjust(deltaMs) {
            C.adjust(Timer.cd, deltaMs, now());
            if (window.Sound) Sound.stopAll(['end', 'segment']);
            changed('adjust');
        },
        next() { C.next(Timer.cd, now()); if (window.Sound) Sound.stopAll(['end', 'segment', 'tick']); changed('next'); },
        prev() { C.prev(Timer.cd, now()); if (window.Sound) Sound.stopAll(['end', 'segment', 'tick']); changed('prev'); },
        goTo(i) { C.goTo(Timer.cd, i, now()); if (window.Sound) Sound.stopAll(['end', 'segment', 'tick']); changed('goto'); },
        lap() { C.lap(Timer.sw, now()); changed('lap'); },
        /* ใช้ในสคริปต์ทดสอบ/ถ่ายภาพ: เลื่อนเวลาที่ผ่านไปของช่วงปัจจุบัน */
        _elapse(ms, which) {
            const s = which === 'stopwatch' ? Timer.sw : Timer.cd;
            if (C.isRunning(s)) s.startedAt -= ms; else s.acc += ms;
            changed('debug');
        },
    });

    /* ---------------- รอบการทำงาน ---------------- */
    let lastFrame = 0;
    function frame() {
        lastFrame = performance.now();
        const t = now();
        const ended = C.settle(Timer.cd, t);
        if (ended.length) { save(); emit('segment', ended); }
        Alarms.tick(t);
        emit('frame', t);
    }
    // แสดงผลลื่นตอนเห็นหน้าจอ (requestAnimationFrame ~20 ครั้ง/วินาที)
    function raf() {
        if (document.visibilityState === 'visible' && performance.now() - lastFrame > 45) frame();
        requestAnimationFrame(raf);
    }
    // ตอนอยู่เบื้องหลัง requestAnimationFrame ไม่ทำงาน → ใช้ setInterval (เบราว์เซอร์อาจหน่วงเหลือ 1 ครั้ง/วินาที–นาที
    // แต่เวลาคำนวณจากนาฬิกาจริงและเสียงตั้งไว้ล่วงหน้าแล้ว จึงไม่คลาด)
    function startLoop() {
        setInterval(() => { if (performance.now() - lastFrame > 180) frame(); }, 250);
        requestAnimationFrame(raf);
        document.addEventListener('visibilitychange', () => { frame(); if (document.visibilityState === 'visible') replan(); });
        window.addEventListener('pageshow', () => { frame(); replan(); });
        // ตารางคาบเปลี่ยนวัน/ระฆังรอบใหม่: ตั้งใหม่ทุก 1 นาที
        setInterval(replan, 60000);
    }

    Timer.frame = frame;
    Timer.startLoop = startLoop;
    Timer.fmt = C.fmt;
    window.Clock = Clock;
    window.Alarms = Alarms;
    window.Timer = Timer;
})();
