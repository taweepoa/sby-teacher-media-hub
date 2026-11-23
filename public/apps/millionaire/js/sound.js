/* =====================================================================
   เสียงประกอบเกม — สังเคราะห์ด้วย Web Audio ทั้งหมด (ไม่มีไฟล์เสียง ไม่ติดลิขสิทธิ์ ใช้ออฟไลน์ได้)
   เบราว์เซอร์จะให้เล่นเสียงได้หลังผู้ใช้คลิก/กดแป้นในหน้านั้นอย่างน้อย 1 ครั้ง (unlock อัตโนมัติ)
   ===================================================================== */
(function () {
    'use strict';

    let ctx = null;
    let master = null;
    let volume = 0.8;
    let enabled = true;

    function ac() {
        if (!ctx) {
            const C = window.AudioContext || window.webkitAudioContext;
            if (!C) return null;
            ctx = new C();
            master = ctx.createGain();
            master.gain.value = volume;
            const comp = ctx.createDynamicsCompressor();
            master.connect(comp);
            comp.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        return ctx;
    }

    /* โน้ตหนึ่งตัว: ความถี่ (หรือ [เริ่ม, จบ]), เวลาเริ่ม, ความยาว, ชนิดคลื่น, ความดัง */
    function tone(freq, start, dur, type, gain, opts) {
        const c = ctx;
        const o = c.createOscillator();
        const g = c.createGain();
        const t0 = c.currentTime + start;
        o.type = type || 'sine';
        const f = Array.isArray(freq) ? freq : [freq, freq];
        o.frequency.setValueAtTime(f[0], t0);
        if (f[1] !== f[0]) o.frequency.exponentialRampToValueAtTime(f[1], t0 + dur);
        const peak = gain == null ? 0.3 : gain;
        const atk = (opts && opts.attack) || 0.008;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        let out = g;
        if (opts && opts.lowpass) {
            const lp = c.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = opts.lowpass;
            g.connect(lp);
            out = lp;
        }
        o.connect(g);
        out.connect(master);
        o.start(t0);
        o.stop(t0 + dur + 0.05);
    }

    function noise(start, dur, gain, from, to) {
        const c = ctx;
        const len = Math.floor(c.sampleRate * dur);
        const buf = c.createBuffer(1, len, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1;
        const src = c.createBufferSource();
        src.buffer = buf;
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 1.4;
        const t0 = c.currentTime + start;
        bp.frequency.setValueAtTime(from, t0);
        bp.frequency.exponentialRampToValueAtTime(to, t0 + dur);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(bp);
        bp.connect(g);
        g.connect(master);
        src.start(t0);
        src.stop(t0 + dur + 0.05);
    }

    const N = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz

    const SOUNDS = {
        show() { noise(0, 0.35, 0.18, 400, 3200); tone(N(76), 0.12, 0.25, 'triangle', 0.18); tone(N(83), 0.22, 0.35, 'triangle', 0.18); },
        pick() { tone([N(72), N(84)], 0, 0.12, 'square', 0.12, { lowpass: 2400 }); tone(N(88), 0.12, 0.35, 'triangle', 0.2); },
        next() { noise(0, 0.28, 0.12, 2400, 500); },
        reveal() { [79, 83, 86, 91].forEach((n, i) => tone(N(n), i * 0.07, 0.4, 'triangle', 0.16)); },
        correct() { [72, 76, 79, 84].forEach((n, i) => tone(N(n), i * 0.09, 0.32, 'triangle', 0.26)); tone(N(88), 0.36, 0.5, 'sine', 0.2); },
        wrong() { tone([150, 110], 0, 0.55, 'sawtooth', 0.22, { lowpass: 900 }); tone([155, 112], 0, 0.55, 'square', 0.12, { lowpass: 700 }); },
        buzz() { tone(N(88), 0, 0.5, 'sine', 0.35); tone(N(95), 0, 0.35, 'sine', 0.15); tone(N(81), 0.16, 0.6, 'sine', 0.32); tone(N(88), 0.16, 0.4, 'sine', 0.12); },
        timeup() { [57, 61, 64].forEach((n) => tone(N(n), 0, 1.0, 'square', 0.1, { lowpass: 1600, attack: 0.02 })); tone(N(45), 0, 1.0, 'sawtooth', 0.12, { lowpass: 600, attack: 0.02 }); },
        tick() { tone(1300, 0, 0.05, 'square', 0.12, { lowpass: 4000 }); },
        score() { tone(N(83), 0, 0.09, 'square', 0.12, { lowpass: 5000 }); tone(N(88), 0.08, 0.3, 'square', 0.12, { lowpass: 5000 }); },
        minus() { tone(N(67), 0, 0.14, 'triangle', 0.18); tone(N(60), 0.13, 0.3, 'triangle', 0.18); },
        undo() { tone([N(79), N(67)], 0, 0.18, 'triangle', 0.14); },
        /* เกมเศรษฐี: ล็อกคำตอบ (เสียงตึงลุ้น) / ใช้ตัวช่วย / ขึ้นคำถามใหม่ */
        lock() { [45, 52, 57].forEach((n) => tone(N(n), 0, 1.4, 'sawtooth', 0.09, { lowpass: 900, attack: 0.25 })); tone(N(81), 0.05, 0.5, 'sine', 0.12); },
        lifeline() { [76, 81, 88].forEach((n, i) => tone(N(n), i * 0.06, 0.3, 'triangle', 0.18)); noise(0, 0.4, 0.08, 800, 5000); },
        fanfare() {
            const seq = [[67, 0, 0.16], [72, 0.16, 0.16], [76, 0.32, 0.16], [79, 0.48, 0.42], [76, 0.92, 0.16], [79, 1.08, 0.9]];
            seq.forEach(([n, t, d]) => { tone(N(n), t, d + 0.05, 'sawtooth', 0.14, { lowpass: 2600, attack: 0.015 }); tone(N(n - 12), t, d + 0.05, 'triangle', 0.12); });
            [60, 64, 67, 72].forEach((n) => tone(N(n), 1.08, 1.3, 'triangle', 0.1, { attack: 0.03 }));
        },
    };

    function play(name) {
        if (!enabled || !SOUNDS[name]) return;
        if (!ac()) return;
        try { SOUNDS[name](); } catch (e) { /* อุปกรณ์เสียงไม่พร้อม */ }
    }

    /* ปลดล็อกเสียงเมื่อผู้ใช้แตะหน้าจอ/กดแป้นครั้งแรก */
    function unlockOnce() { ac(); }
    ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, unlockOnce, { passive: true, capture: true }));

    window.Sound = {
        NAMES: Object.keys(SOUNDS),
        play,
        /* เล่นเสียงตาม fx ของเกม (เลือกเสียงเด่นที่สุดเสียงเดียว ไม่ให้ซ้อนกันจนฟังไม่ออก) */
        playFx(list) {
            const order = ['fanfare', 'correct', 'wrong', 'timeup', 'lock', 'lifeline', 'reveal', 'show', 'tick'];
            const pick = order.find((n) => list.includes(n));
            if (pick) play(pick);
        },
        set(o) {
            if (o.volume != null) { volume = Math.max(0, Math.min(1, Number(o.volume))); if (master) master.gain.value = volume; }
            if (o.enabled != null) enabled = !!o.enabled;
        },
        get ready() { return !!ctx && ctx.state === 'running'; },
        get enabled() { return enabled; },
    };
})();
