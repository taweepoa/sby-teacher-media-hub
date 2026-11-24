/* =====================================================================
   เสียงประกอบ (สังเคราะห์ด้วย Web Audio — ไม่ต้องมีไฟล์เสียง ใช้ออฟไลน์ได้)
   และอ่านออกเสียงคำที่เรียกด้วย speechSynthesis ของเครื่อง (ถ้าเครื่องมีเสียงภาษานั้น)
   ===================================================================== */
(function () {
    'use strict';

    let ctx = null;
    function ac() {
        if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }
    function tone(freq, start, dur, type, vol) {
        const c = ac(); if (!c) return;
        const o = c.createOscillator(), g = c.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, c.currentTime + start);
        g.gain.setValueAtTime(0.0001, c.currentTime + start);
        g.gain.exponentialRampToValueAtTime(vol || 0.2, c.currentTime + start + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
        o.connect(g); g.connect(c.destination);
        o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.05);
    }
    const on = () => Store.meta.sound !== false;

    const Sound = {
        /* เสียงกลองรัวระหว่างสุ่ม */
        roll(ms) {
            if (!on()) return;
            const n = Math.floor((ms || 1200) / 70);
            for (let i = 0; i < n; i++) tone(180 + Math.random() * 120, i * 0.07, 0.06, 'triangle', 0.08);
        },
        /* เสียงเปิดคำ */
        ding() {
            if (!on()) return;
            tone(880, 0, 0.35, 'sine', 0.25); tone(1318.5, 0.08, 0.5, 'sine', 0.18);
        },
        /* เสียงฉลองผู้ชนะ */
        win() {
            if (!on()) return;
            [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.12, 0.28, 'square', 0.09));
        },
        /* เสียงไม่ผ่าน */
        buzz() { if (!on()) return; tone(160, 0, 0.35, 'sawtooth', 0.12); tone(120, 0.18, 0.35, 'sawtooth', 0.1); },
        /* อ่านออกเสียง: เลือกภาษาไทย/อังกฤษตามตัวอักษร */
        speak(text) {
            if (Store.meta.speech === false || !window.speechSynthesis || !text) return;
            try {
                speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(String(text).replace(/×/g, ' คูณ ').replace(/= \?/g, ' เท่ากับเท่าไร'));
                u.lang = /[฀-๿]/.test(text) ? 'th-TH' : 'en-US';
                u.rate = 0.9;
                const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.replace('_', '-').startsWith(u.lang.slice(0, 2)));
                if (v) u.voice = v;
                speechSynthesis.speak(u);
            } catch (e) { /* บางเครื่องไม่รองรับ */ }
        },
        stop() { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ข้าม */ } },
    };
    window.Sound = Sound;
})();
