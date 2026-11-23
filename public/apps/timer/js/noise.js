/* =====================================================================
   ไฟจราจรเสียงดัง: วัดระดับเสียงในห้องจากไมโครโฟน
   - ขอใช้ไมโครโฟน "เฉพาะเมื่อผู้ใช้กดปุ่มเริ่มฟังเสียง" เท่านั้น
   - วิเคราะห์ระดับความดังในเครื่องทันที ไม่บันทึกเสียง ไม่ส่งไปที่ใด
   - โหมดจำลอง (ไม่ใช้ไมโครโฟน) สำหรับทดลอง/สาธิต หรือเครื่องที่ไม่มีไมค์
   ===================================================================== */
(function () {
    'use strict';

    const listeners = new Set();
    const emit = (type) => listeners.forEach((fn) => { try { fn(type); } catch (e) { console.error(e); } });

    let stream = null;
    let source = null;
    let analyser = null;
    let buf = null;
    let last = 0;
    let sim = null;
    let pendingState = null;
    let pendingSince = 0;
    let lastAlarm = 0;

    const Noise = {
        active: false,
        simulated: false,
        starting: false,
        level: 0,        // 0–100 (ปรับให้นุ่มแล้ว)
        peak: 0,
        db: -100,
        state: 'green',
        error: '',
        stats: null,
        calls: 0,        // จำนวนครั้งที่ขอใช้ไมโครโฟน (ใช้ตรวจในสคริปต์ทดสอบ)
        simTarget: null,
    };

    function resetStats() {
        const t = Date.now();
        Noise.stats = { since: t, green: 0, yellow: 0, red: 0, redCount: 0, quietSince: t, bestQuiet: 0 };
        Noise.peak = 0;
    }
    resetStats();

    function supported() {
        return !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /* ข้อความแจ้งเหตุที่ใช้ไมโครโฟนไม่ได้ (ภาษาไทย) */
    function errorText(e) {
        const n = e && e.name;
        if (!window.isSecureContext) return 'เบราว์เซอร์อนุญาตให้ใช้ไมโครโฟนเฉพาะเมื่อเปิดจากไฟล์ index.html ในเครื่อง (ดับเบิลคลิก) หรือเว็บไซต์ https เท่านั้น';
        if (n === 'NotAllowedError' || n === 'SecurityError') return 'ยังไม่ได้รับอนุญาตให้ใช้ไมโครโฟน — กดไอคอนรูปไมค์/กุญแจที่ช่องที่อยู่เว็บ เลือก "อนุญาต" แล้วกดเริ่มฟังเสียงอีกครั้ง';
        if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'ไม่พบไมโครโฟนในเครื่องนี้ — เสียบไมค์/หูฟังที่มีไมค์ แล้วลองอีกครั้ง';
        if (n === 'NotReadableError' || n === 'AbortError') return 'ไมโครโฟนถูกโปรแกรมอื่นใช้งานอยู่ (เช่น Zoom/Meet) — ปิดโปรแกรมนั้นแล้วลองอีกครั้ง';
        if (!navigator.mediaDevices) return 'เบราว์เซอร์นี้ไม่รองรับการใช้ไมโครโฟน — แนะนำ Google Chrome หรือ Microsoft Edge';
        return `ใช้ไมโครโฟนไม่ได้ (${(e && e.message) || n || 'ไม่ทราบสาเหตุ'})`;
    }

    async function start() {
        if (Noise.active && !Noise.simulated) return true;
        stop(true);
        Noise.error = '';
        if (!supported()) { Noise.error = errorText(null); emit('error'); return false; }
        Noise.starting = true;
        emit('state');
        try {
            const ctx = Sound.unlock();
            if (!ctx) throw new Error('เบราว์เซอร์นี้ไม่รองรับระบบเสียง');
            Noise.calls += 1;
            stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
            if (ctx.state !== 'running') await ctx.resume();
            source = ctx.createMediaStreamSource(stream);
            analyser = ctx.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0;
            buf = new Float32Array(analyser.fftSize);
            source.connect(analyser);          // ไม่ต่อออกลำโพง (กันเสียงหอน)
            stream.getAudioTracks().forEach((t) => { t.onended = () => { if (Noise.active && !Noise.simulated) { Noise.error = 'ไมโครโฟนถูกตัดการเชื่อมต่อ'; stop(); emit('error'); } }; });
            Noise.active = true;
            Noise.simulated = false;
            Noise.starting = false;
            resetStats();
            last = performance.now();
            emit('state');
            return true;
        } catch (e) {
            Noise.starting = false;
            Noise.error = errorText(e);
            stop(true);
            emit('error');
            return false;
        }
    }

    /* โหมดจำลอง: ระดับเสียงสมมติของห้องเรียน (คุยเบา ๆ สลับเสียงดังเป็นช่วง ๆ) */
    function startSim() {
        stop(true);
        Sound.unlock();
        Noise.error = '';
        Noise.active = true;
        Noise.simulated = true;
        sim = { base: 30, burstUntil: 0, nextBurst: performance.now() + 5000, t: 0 };
        resetStats();
        last = performance.now();
        emit('state');
    }

    function stop(silent) {
        if (stream) stream.getTracks().forEach((t) => { t.onended = null; t.stop(); });
        if (source) { try { source.disconnect(); } catch (e) { /* ตัดแล้ว */ } }
        stream = null; source = null; analyser = null; buf = null; sim = null;
        const was = Noise.active;
        Noise.active = false;
        Noise.simulated = false;
        Noise.level = 0;
        Noise.state = 'green';
        pendingState = null;
        if (!silent || was) emit('state');
    }

    function rawLevel(t) {
        const sens = Store.settings.noise.sens;
        if (Noise.simulated) {
            const s = sim;
            s.base += (Math.random() - 0.5) * 3;
            s.base = Math.max(18, Math.min(48, s.base));
            if (t > s.nextBurst) { s.burstUntil = t + 1800 + Math.random() * 2500; s.nextBurst = t + 9000 + Math.random() * 9000; }
            const burst = t < s.burstUntil ? 38 + Math.random() * 12 : 0;
            // simTarget: ใช้เฉพาะสคริปต์ถ่ายภาพ/ทดสอบ (บังคับระดับเสียงจำลอง)
            const lv = Noise.simTarget != null ? Noise.simTarget + (Math.random() - 0.5) * 4 : s.base + burst + (Math.random() - 0.5) * 8 + (sens - 50) * 0.5;
            Noise.db = lv / 100 * 60 - 75;
            return lv;
        }
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i += 1) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        const db = 20 * Math.log10(rms + 1e-9);
        Noise.db = db;
        // -75 dBFS (เงียบมาก) → 0, -15 dBFS (ตะโกน) → 100 • ความไวเลื่อนได้ ±20 dB
        return ((db + 75 + (sens - 50) * 0.4) / 60) * 100;
    }

    const RANK = { green: 0, yellow: 1, red: 2 };

    function update() {
        if (!Noise.active) return;
        const t = performance.now();
        const dt = Math.min(2000, t - last);
        last = t;
        const lv = Math.max(0, Math.min(100, rawLevel(t)));
        // ขึ้นเร็ว ลงช้า (เหมือนเข็มมิเตอร์)
        const tau = lv > Noise.level ? 90 : 450;
        Noise.level += (lv - Noise.level) * (1 - Math.exp(-dt / tau));
        Noise.peak = Math.max(Noise.peak * Math.exp(-dt / 2500), Noise.level);

        const cfg = Store.settings.noise;
        const target = Noise.level >= cfg.red ? 'red' : Noise.level >= cfg.yellow ? 'yellow' : 'green';
        if (target === Noise.state) pendingState = null;
        else {
            if (pendingState !== target) { pendingState = target; pendingSince = t; }
            const hold = RANK[target] > RANK[Noise.state] ? 300 : 1500;     // ดังขึ้นเปลี่ยนเร็ว เงียบลงต้องค้างสักพัก
            if (t - pendingSince >= hold) {
                const prev = Noise.state;
                Noise.state = target;
                pendingState = null;
                if (target === 'red' && prev !== 'red') {
                    Noise.stats.redCount += 1;
                    if (cfg.alarm && cfg.alarmSound && Store.settings.sound.on && Date.now() - lastAlarm > cfg.cooldown * 1000) {
                        lastAlarm = Date.now();
                        Sound.play(cfg.alarmSound, { volume: Store.settings.sound.volume / 100, tag: 'noise' });
                    }
                }
                if (target !== 'green') Noise.stats.quietSince = null;
                else if (!Noise.stats.quietSince) Noise.stats.quietSince = Date.now();
                emit('light');
            }
        }
        Noise.stats[Noise.state] += dt;
        if (Noise.stats.quietSince) Noise.stats.bestQuiet = Math.max(Noise.stats.bestQuiet, Date.now() - Noise.stats.quietSince);
        emit('level');
    }

    Object.assign(Noise, {
        start, startSim, stop, update, resetStats, supported, errorText,
        on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        stateText: (s) => ({ green: 'เงียบดีมาก', yellow: 'เริ่มดังแล้วนะ', red: 'เสียงดังเกินไป!' }[s] || ''),
    });
    window.Noise = Noise;
})();
