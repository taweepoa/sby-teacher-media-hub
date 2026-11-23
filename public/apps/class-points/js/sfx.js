/* เสียงประกอบ (สังเคราะห์ด้วย Web Audio — ไม่ใช้ไฟล์เสียง ใช้ออฟไลน์ได้) */
(function () {
    'use strict';
    let ctx = null;
    function ac() {
        if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }
    function tone(freq, start, dur, type, vol) {
        const a = ac(); if (!a) return;
        const o = a.createOscillator(), g = a.createGain();
        o.type = type || 'sine'; o.frequency.value = freq;
        const t = a.currentTime + start;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol || 0.22, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
    }
    const on = () => !window.Store || !Store.data || Store.data.settings.sound !== false;
    window.Sfx = {
        good() { if (!on()) return; [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.07, 0.28, 'triangle')); },
        bad() { if (!on()) return; tone(311, 0, 0.22, 'sawtooth', 0.08); tone(233, 0.16, 0.32, 'sawtooth', 0.08); },
        tick() { if (!on()) return; tone(880, 0, 0.05, 'square', 0.05); },
        fanfare() { if (!on()) return; [392, 523.25, 659.25, 783.99, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.11, i === 6 ? 0.6 : 0.2, 'triangle', 0.2)); },
        coin() { if (!on()) return; tone(987.77, 0, 0.08, 'square', 0.08); tone(1318.5, 0.08, 0.3, 'square', 0.08); },
    };
})();
