/* =====================================================================
   เสียงทั้งหมดสร้างด้วย Web Audio API (สังเคราะห์สด ไม่ใช้ไฟล์เสียง ไม่มีปัญหาลิขสิทธิ์)
   - Sound.play(name, { at, volume, repeat }) ตั้งเวลาเล่นล่วงหน้าบนนาฬิกาของระบบเสียง (ctx.currentTime)
     เสียงจึงดังตรงเวลาแม้แท็บอยู่เบื้องหลังและ JavaScript ถูกหน่วง
   - เบราว์เซอร์อนุญาตให้เปิดเสียงได้หลังผู้ใช้แตะ/คลิกหน้าเว็บ 1 ครั้ง → Sound.unlock()
   ===================================================================== */
(function () {
    'use strict';

    const LIST = [
        { id: 'bell', name: 'ระฆังโรงเรียน', dur: 2.6 },
        { id: 'chime', name: 'กริ่งสามโน้ต (นุ่มนวล)', dur: 1.5 },
        { id: 'gong', name: 'ฆ้อง', dur: 3.2 },
        { id: 'marimba', name: 'ระนาดไม้ (ไล่โน้ต)', dur: 1.3 },
        { id: 'digital', name: 'บี๊บดิจิทัล', dur: 1.2 },
        { id: 'alarm', name: 'นาฬิกาปลุก (ดังชัด)', dur: 2.4 },
        { id: 'whistle', name: 'นกหวีด', dur: 1.6 },
        { id: 'ding', name: 'ติ๊ง (สั้น)', dur: 0.9 },
        { id: 'double', name: 'ติ๊ง-ติ๊ง', dur: 1.0 },
        { id: 'tick', name: 'ติ๊ก (นับวินาที)', dur: 0.15 },
        { id: 'shh', name: 'ชู่ว… (ขอความเงียบ)', dur: 1.4 },
    ];
    const BY_ID = Object.fromEntries(LIST.map((x) => [x.id, x]));

    let ctx = null;
    let master = null;
    const log = [];          // บันทึกการเล่น (ใช้ตรวจในสคริปต์ทดสอบ)
    const active = new Set(); // เสียงที่ตั้งเวลาไว้/กำลังดัง (ใช้หยุดเสียงเมื่อกดรีเซ็ต)
    let noiseBuf = null;

    function context() {
        if (ctx) return ctx;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try {
            ctx = new AC({ latencyHint: 'interactive' });
            master = ctx.createGain();
            master.gain.value = 1;
            // compressor กันเสียงแตกเวลาหลายเสียงซ้อนกัน
            const comp = ctx.createDynamicsCompressor();
            comp.threshold.value = -10;
            comp.ratio.value = 4;
            master.connect(comp);
            comp.connect(ctx.destination);
        } catch (e) {
            console.warn('เปิดระบบเสียงไม่ได้', e);
            ctx = null;
        }
        return ctx;
    }

    /* เรียกจากการแตะ/คลิกของผู้ใช้ */
    function unlock() {
        const c = context();
        if (c && c.state !== 'running') c.resume().catch(() => { /* รอการแตะครั้งถัดไป */ });
        return c;
    }
    const ready = () => !!(ctx && ctx.state === 'running');

    function noise() {
        if (noiseBuf) return noiseBuf;
        const len = Math.floor(ctx.sampleRate * 1.6);
        noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        let seed = 12345;
        for (let i = 0; i < len; i += 1) { seed = (seed * 16807) % 2147483647; d[i] = (seed / 2147483647) * 2 - 1; }
        return noiseBuf;
    }

    /* ตัวช่วยสร้างเสียง: oscillator + envelope */
    function tone(out, nodes, t, o) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = o.type || 'sine';
        osc.frequency.setValueAtTime(o.f, t);
        if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide || o.d));
        if (o.vib) {
            const lfo = ctx.createOscillator();
            const lg = ctx.createGain();
            lfo.frequency.value = o.vib;
            lg.gain.value = o.vibDepth || 30;
            lfo.connect(lg); lg.connect(osc.frequency);
            lfo.start(t); lfo.stop(t + o.d + 0.05);
            nodes.push(lfo);
        }
        const a = o.a ?? 0.005;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(o.v, t + a);
        if (o.hold) g.gain.setValueAtTime(o.v, t + a + o.hold);
        g.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
        osc.connect(g); g.connect(out);
        osc.start(t); osc.stop(t + o.d + 0.05);
        nodes.push(osc);
    }

    /* ระฆังทองเหลือง: ฮาร์มอนิกแบบไม่ลงตัว (inharmonic) + หางเสียงยาว */
    function bell(out, nodes, t, base) {
        const f = base || 660;
        [[1, 0.5, 2.4], [2.0, 0.25, 1.8], [2.76, 0.2, 1.2], [5.4, 0.1, 0.7], [8.9, 0.05, 0.4]].forEach(([r, v, d]) => tone(out, nodes, t, { f: f * r, v, d, a: 0.002 }));
    }

    const SYNTH = {
        bell(out, nodes, t) { bell(out, nodes, t, 784); bell(out, nodes, t + 0.55, 784); bell(out, nodes, t + 1.1, 659); },
        chime(out, nodes, t) { [523.25, 659.25, 783.99].forEach((f, i) => { tone(out, nodes, t + i * 0.26, { f, v: 0.4, d: 1.1 }); tone(out, nodes, t + i * 0.26, { f: f * 2, v: 0.08, d: 0.6 }); }); },
        gong(out, nodes, t) {
            [[110, 0.55, 3.1], [165.4, 0.3, 2.6], [221.7, 0.22, 2.2], [302, 0.12, 1.6], [452, 0.06, 1.1]].forEach(([f, v, d]) => tone(out, nodes, t, { f, v, d, a: 0.01, vib: 3.5, vibDepth: 1.5 }));
        },
        marimba(out, nodes, t) { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { tone(out, nodes, t + i * 0.16, { f, v: 0.45, d: 0.45, a: 0.002 }); tone(out, nodes, t + i * 0.16, { f: f * 4, v: 0.06, d: 0.08, a: 0.001 }); }); },
        digital(out, nodes, t) { for (let i = 0; i < 3; i += 1) tone(out, nodes, t + i * 0.32, { f: 1760, v: 0.22, d: 0.16, a: 0.002, hold: 0.12, type: 'square' }); },
        alarm(out, nodes, t) { for (let i = 0; i < 8; i += 1) tone(out, nodes, t + i * 0.3, { f: i % 2 ? 988 : 1319, v: 0.28, d: 0.24, a: 0.003, hold: 0.18, type: 'square' }); },
        whistle(out, nodes, t) {
            tone(out, nodes, t, { f: 2900, v: 0.22, d: 0.42, a: 0.02, hold: 0.3, vib: 32, vibDepth: 90 });
            tone(out, nodes, t + 0.55, { f: 2900, v: 0.24, d: 0.95, a: 0.02, hold: 0.8, vib: 32, vibDepth: 90 });
        },
        ding(out, nodes, t) { bell(out, nodes, t, 1046.5); },
        double(out, nodes, t) { tone(out, nodes, t, { f: 1318.5, v: 0.4, d: 0.45 }); tone(out, nodes, t + 0.22, { f: 1760, v: 0.4, d: 0.7 }); },
        tick(out, nodes, t) { tone(out, nodes, t, { f: 1200, v: 0.35, d: 0.07, a: 0.001 }); },
        shh(out, nodes, t) {
            const src = ctx.createBufferSource();
            src.buffer = noise();
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.9;
            const hp = ctx.createBiquadFilter();
            hp.type = 'highpass'; hp.frequency.value = 1800;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.9, t + 0.18);
            g.gain.setValueAtTime(0.9, t + 0.9);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 1.35);
            src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(out);
            src.start(t); src.stop(t + 1.4);
            nodes.push(src);
        },
    };

    /* เล่นเสียง (ทันที หรือ ณ เวลา at ของ ctx) คืน handle { cancel(), at, end } */
    function play(name, opts) {
        const o = Object.assign({ volume: 0.8, repeat: 1, at: null, tag: '' }, opts || {});
        const def = BY_ID[name];
        const c = context();
        if (!def || !c || o.volume <= 0) return null;
        const t0 = Math.max(c.currentTime + 0.01, o.at == null ? c.currentTime + 0.02 : o.at);
        const out = c.createGain();
        out.gain.value = Math.min(1, Math.max(0, o.volume)) ** 1.6;   // สเกลความดังให้ตรงกับหูคน
        out.connect(master);
        const nodes = [];
        const rep = Math.max(1, Math.min(5, o.repeat | 0));
        for (let i = 0; i < rep; i += 1) SYNTH[name](out, nodes, t0 + i * (def.dur + 0.25));
        const end = t0 + rep * (def.dur + 0.25);
        const entry = { name, tag: o.tag, at: t0, end, scheduledAt: c.currentTime, cancelled: false };
        log.push(entry);
        if (log.length > 300) log.shift();
        let done = false;
        const handle = {
            at: t0,
            end,
            tag: o.tag,
            cancel() {
                if (done) return;
                entry.cancelled = true;
                nodes.forEach((n) => { try { n.stop(); } catch (e) { /* ยังไม่เริ่ม */ } });
                cleanup();
            },
        };
        const cleanup = () => { if (done) return; done = true; active.delete(handle); try { out.disconnect(); } catch (e) { /* ตัดแล้ว */ } };
        // ตรวจทิ้งเป็นระยะ (setTimeout อาจถูกหน่วงตอนอยู่เบื้องหลัง แต่ไม่กระทบเวลาเล่นเสียง)
        const sweep = () => { if (done) return; if (c.currentTime > end + 0.5) cleanup(); else setTimeout(sweep, Math.min(60000, Math.max(500, (end - c.currentTime) * 1000 + 600))); };
        setTimeout(sweep, Math.min(60000, Math.max(500, (end - c.currentTime) * 1000 + 600)));
        active.add(handle);
        return handle;
    }

    /* หยุดเสียงที่ดังอยู่/ตั้งเวลาไว้ (เลือกเฉพาะบางชนิดได้ด้วย tags) */
    function stopAll(tags) {
        [...active].forEach((h) => { if (!tags || tags.some((t) => String(h.tag || '').startsWith(t))) h.cancel(); });
    }

    /* ทดลองฟังเสียง (จากปุ่มในหน้าตั้งค่า) */
    function preview(name, volume, repeat) {
        unlock();
        return play(name, { volume, repeat: repeat || 1, tag: 'preview' });
    }

    window.Sound = {
        LIST, BY_ID, play, preview, unlock, ready, log, stopAll, active,
        get ctx() { return ctx; },
        context,
        name: (id) => (BY_ID[id] ? BY_ID[id].name : 'ไม่มีเสียง'),
    };
})();
