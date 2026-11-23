/* =====================================================================
   เสียงประกอบ — สร้างสดด้วย Web Audio API ทั้งหมด (ไม่มีไฟล์เสียง ไม่มีลิขสิทธิ์ ไม่ต้องต่ออินเทอร์เน็ต)
   tick = เสียงติ๊กตอนเข็มผ่านช่อง • start = เสียงวูบตอนเริ่มหมุน • win = เสียงแตรประกาศผล
   pop = เสียงเปิดการ์ด (จับกลุ่ม/ลำดับ/ที่นั่ง) • roll = เสียงตัวเลขกำลังหมุน
   เบราว์เซอร์อนุญาตให้เล่นเสียงหลังผู้ใช้แตะ/คลิกครั้งแรกเท่านั้น → เรียก Sound.unlock() ในปุ่มกด
   ===================================================================== */
(function () {
    'use strict';

    let ctx = null;
    let master = null;
    let noise = null;
    let lastTick = 0;

    function settings() {
        const s = window.Store && Store.data ? Store.data.settings : { sound: true, volume: 0.8 };
        return { on: s.sound !== false, vol: Math.max(0, Math.min(1, Number(s.volume) || 0)) };
    }

    function ensure() {
        const st = settings();
        if (!st.on || st.vol <= 0) return null;
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            try { ctx = new AC(); } catch (e) { return null; }
            master = ctx.createGain();
            const comp = ctx.createDynamicsCompressor(); // กันเสียงแตกเวลาหลายเสียงซ้อนกัน
            master.connect(comp);
            comp.connect(ctx.destination);
            // สัญญาณรบกวนขาว 1 วินาที ใช้ทำเสียงติ๊ก/ฉาบ
            noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
            const d = noise.getChannelData(0);
            for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
        }
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        master.gain.setValueAtTime(st.vol * 0.9, ctx.currentTime);
        return ctx;
    }

    function tone(type, freq, t0, dur, gain, opts) {
        const o = opts || {};
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
        if (o.vibrato) {
            const lfo = ctx.createOscillator();
            const lg = ctx.createGain();
            lfo.frequency.value = 5.5;
            lg.gain.value = freq * 0.012;
            lfo.connect(lg);
            lg.connect(osc.frequency);
            lfo.start(t0);
            lfo.stop(t0 + dur + 0.05);
        }
        const atk = o.attack || 0.006;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(gain, t0 + atk);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g);
        g.connect(o.dest || master);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
    }

    function noiseBurst(t0, dur, gain, freq, q) {
        const src = ctx.createBufferSource();
        src.buffer = noise;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = freq;
        bp.Q.value = q || 1;
        const g = ctx.createGain();
        g.gain.setValueAtTime(gain, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(bp);
        bp.connect(g);
        g.connect(master);
        src.start(t0, Math.random() * 0.5, dur + 0.02);
    }

    const Sound = {
        /** เรียกในเหตุการณ์คลิก/แตะ เพื่อปลดล็อกเสียงของเบราว์เซอร์ */
        unlock() { ensure(); },

        /** เสียงติ๊ก (จำกัดไม่เกิน ~30 ครั้ง/วินาที ไม่ให้เสียงรัว) */
        tick(strength) {
            const now = performance.now();
            if (now - lastTick < 32) return;
            lastTick = now;
            if (!ensure()) return;
            const t = ctx.currentTime;
            const k = Math.max(0.35, Math.min(1, strength == null ? 1 : strength));
            noiseBurst(t, 0.03, 0.55 * k, 2600, 1.4);
            tone('triangle', 1750, t, 0.035, 0.22 * k);
        },

        /** เสียงวูบตอนเริ่มหมุน */
        start() {
            if (!ensure()) return;
            const t = ctx.currentTime;
            const src = ctx.createBufferSource();
            src.buffer = noise;
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.Q.value = 2.2;
            bp.frequency.setValueAtTime(380, t);
            bp.frequency.exponentialRampToValueAtTime(2400, t + 0.45);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.35, t + 0.12);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
            src.connect(bp);
            bp.connect(g);
            g.connect(master);
            src.start(t, 0, 0.55);
        },

        /** แตรประกาศผล: โด-มี-ซอล-โด แล้วค้างเสียงพร้อมประกายเสียงสูง */
        win() {
            if (!ensure()) return;
            const t = ctx.currentTime + 0.02;
            const notes = [523.25, 659.25, 783.99, 1046.5];
            notes.forEach((f, i) => {
                const at = t + i * 0.11;
                const last = i === notes.length - 1;
                tone('triangle', f, at, last ? 0.9 : 0.18, last ? 0.32 : 0.26, { vibrato: last });
                tone('sine', f * 2, at, last ? 0.7 : 0.14, 0.07);
            });
            // คอร์ดรองรับ
            [523.25, 659.25, 783.99].forEach((f) => tone('sine', f / 2, t + 0.33, 0.9, 0.09, { attack: 0.03 }));
            // ประกาย
            for (let i = 0; i < 7; i += 1) tone('sine', 2093 * (1 + (i % 3) * 0.25), t + 0.4 + i * 0.06, 0.12, 0.05);
            noiseBurst(t + 0.33, 0.45, 0.18, 7000, 0.7);
        },

        /** เสียงเปิดการ์ด (ไล่ระดับเสียงตามลำดับ i) */
        pop(i) {
            if (!ensure()) return;
            const t = ctx.currentTime;
            const base = 480 * Math.pow(2, ((i || 0) % 12) / 12);
            tone('sine', base, t, 0.12, 0.28, { to: base * 2 });
            noiseBurst(t, 0.04, 0.12, 3500, 1);
        },

        /** เสียงตัวเลข/ชื่อกำลังหมุน (เบา ๆ) */
        roll() {
            const now = performance.now();
            if (now - lastTick < 45) return;
            lastTick = now;
            if (!ensure()) return;
            const t = ctx.currentTime;
            tone('square', 900 + Math.random() * 500, t, 0.03, 0.06);
        },

        /** เสียงสั้น ๆ สำหรับทดสอบในหน้าตั้งค่า */
        test() { this.start(); setTimeout(() => this.tick(1), 380); setTimeout(() => this.tick(1), 470); setTimeout(() => this.win(), 650); },
    };

    window.Sound = Sound;
})();
