/* =====================================================================
   เสียงประกอบ — สังเคราะห์ด้วย Web Audio (ไม่ใช้ไฟล์เสียง ใช้ออฟไลน์ได้)
   ===================================================================== */
(function () {
    'use strict';
    let ctx = null;
    const on = () => { const s = (window.Store && Store.data.settings) || {}; return s.sound !== false; };
    const vol = () => { const v = Number(((window.Store && Store.data.settings) || {}).volume); return isNaN(v) ? 0.7 : Math.max(0, Math.min(1, v)); };
    function ac() {
        if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }
    /** โน้ต 1 ตัว: ความถี่ เวลาเริ่ม(วินาที) ความยาว ชนิดคลื่น ความดัง */
    function tone(f, at, dur, type, gain) {
        const a = ac(); if (!a) return;
        const t0 = a.currentTime + (at || 0);
        const o = a.createOscillator(), g = a.createGain();
        o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, (gain || 0.3) * vol()), t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(a.destination);
        o.start(t0); o.stop(t0 + dur + 0.02);
    }
    const Sound = {
        unlock() { ac(); },
        buzz() { if (!on()) return; tone(880, 0, 0.12, 'square', 0.25); tone(1320, 0.1, 0.25, 'square', 0.22); },
        open() { if (!on()) return; tone(660, 0, 0.1, 'triangle', 0.3); tone(990, 0.09, 0.18, 'triangle', 0.3); },
        correct() { if (!on()) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.28, 'triangle', 0.32)); },
        wrong() { if (!on()) return; tone(196, 0, 0.35, 'sawtooth', 0.22); tone(147, 0.2, 0.45, 'sawtooth', 0.22); },
        tick() { if (!on()) return; tone(1200, 0, 0.05, 'sine', 0.18); },
        timeup() { if (!on()) return; tone(440, 0, 0.2, 'square', 0.25); tone(440, 0.25, 0.2, 'square', 0.25); tone(330, 0.5, 0.5, 'square', 0.25); },
        fanfare() {
            if (!on()) return;
            const n = [[523, 0, 0.18], [523, 0.18, 0.18], [523, 0.36, 0.18], [659, 0.54, 0.5], [587, 1.04, 0.18], [659, 1.22, 0.18], [784, 1.4, 0.9]];
            n.forEach(([f, t, d]) => { tone(f, t, d, 'triangle', 0.32); tone(f / 2, t, d, 'sine', 0.18); });
        },
        test() { this.unlock(); this.buzz(); },
    };
    window.Sound = Sound;
})();
