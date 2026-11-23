/* =====================================================================
   วงล้อ (canvas) — ลื่นไหล 60fps
   - วาดช่อง/ชื่อทั้งหมดลง canvas สำรองครั้งเดียว แต่ละเฟรมแค่ "หมุนภาพ" (drawImage) จึงเร็วแม้มี 100+ ชื่อ
   - ผลการสุ่มมาจาก Engine.planSpin (RNG crypto) ก่อนเริ่มหมุน → เข็มหยุดตรงคนที่สุ่มได้เสมอ
   - เข็มอยู่ด้านขวา (มุม 0) ชื่อของคนที่ถูกเลือกจึงอ่านได้ในแนวนอน
   - ไฟรอบวงล้อกะพริบตอนหมุน • เข็มสะบัดทุกครั้งที่ผ่านช่อง (พร้อมเสียงติ๊ก) • ช่องที่ได้เด่นขึ้นตอนจบ
   ===================================================================== */
(function () {
    'use strict';

    const TAU = Math.PI * 2;
    const FONT = "'Sarabun', 'Noto Sans Thai', 'Leelawadee UI', 'Tahoma', sans-serif";

    function lum(hex) {
        const h = hex.replace('#', '');
        const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    function shade(hex, k) {
        const h = hex.replace('#', '');
        const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
        const out = c.map((v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k));
        return `rgb(${out.join(',')})`;
    }
    function makeCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w));
        c.height = Math.max(1, Math.round(h || w));
        return c;
    }

    class Wheel {
        constructor(host, opts) {
            this.host = host;
            this.opts = Object.assign({ onTick: null }, opts || {});
            this.canvas = makeCanvas(10);
            this.canvas.className = 'wheel-canvas';
            this.canvas.setAttribute('role', 'img');
            this.canvas.setAttribute('aria-label', 'วงล้อสุ่มรายชื่อ');
            host.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            this.items = [];
            this.segs = [];
            this.colors = [];
            this.labelFn = (it) => String(it.firstName || '');
            this.palette = ['#f43f5e', '#fb923c', '#facc15', '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6'];
            this.theta = 0;
            this.anim = null;
            this.spinning = false;
            this.winIndex = -1;
            this.winT0 = 0;
            this.flap = 0;
            this.raf = 0;
            this.lastTs = 0;
            this.lastIdx = -1;
            this.bulbPhase = 0;
            this.stats = null;
            this.size = 0;
            this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.resize()) : null;
            if (this.ro) this.ro.observe(host); else window.addEventListener('resize', this._onResize = () => this.resize());
            this.resize();
            // ฟอนต์ไทยโหลดเสร็จแล้วค่อยวาดชื่อใหม่ (กันชื่อออกมาเป็นฟอนต์สำรอง)
            if (document.fonts && document.fonts.load) {
                Promise.all([document.fonts.load(`700 24px Sarabun`), document.fonts.load(`800 24px Sarabun`)])
                    .then(() => { if (this.size) { this.renderWheel(); this.draw(); } })
                    .catch(() => {});
            }
        }

        /* ---------- ข้อมูล ---------- */
        setItems(items, o) {
            const opt = o || {};
            this.items = items.slice();
            if (opt.labelFn) this.labelFn = opt.labelFn;
            if (opt.palette && opt.palette.length) this.palette = opt.palette;
            this.useWeight = !!opt.useWeight;
            this.segs = Engine.segments(this.items, this.useWeight);
            this.winIndex = -1;
            this.colors = this.segs.map((_, i) => this.palette[i % this.palette.length]);
            const n = this.colors.length;
            // ช่องแรกกับช่องสุดท้ายอยู่ติดกัน — ห้ามสีซ้ำ
            if (n > 2 && this.colors[n - 1] === this.colors[0]) this.colors[n - 1] = this.palette[(n + 1) % this.palette.length];
            this.lastIdx = this.currentIndex();
            if (this.size) { this.renderWheel(); this.draw(); }
        }

        currentIndex() {
            if (!this.segs.length) return -1;
            return Engine.indexAt(this.segs, Engine.pointerLocal(this.theta, 0));
        }
        currentItem() {
            const i = this.currentIndex();
            return i >= 0 ? this.segs[i].item : null;
        }

        /* ---------- ขนาด ---------- */
        resize() {
            const w = Math.floor(this.host.clientWidth);
            const h = Math.floor(this.host.clientHeight) || w;
            const size = Math.max(0, Math.min(w, h));
            if (size < 40) return;
            const dpr = Math.min(3, window.devicePixelRatio || 1);
            if (size === this.size && dpr === this.dpr) return;
            this.size = size;
            this.dpr = dpr;
            const S = Math.round(size * dpr);
            this.S = S;
            this.canvas.width = S;
            this.canvas.height = S;
            this.canvas.style.width = `${size}px`;
            this.canvas.style.height = `${size}px`;
            this.cx = S / 2;
            this.cy = S / 2;
            this.Rout = S * 0.465;           // ขอบนอกของกรอบ
            this.rim = S * 0.043;            // ความหนากรอบ
            this.R = this.Rout - this.rim;   // รัศมีวงชื่อ
            this.renderStatic();
            this.renderWheel();
            this.draw();
        }

        /* ---------- วาดชิ้นส่วนที่ไม่เปลี่ยนทุกเฟรม ---------- */
        renderStatic() {
            const S = this.S;
            const { cx, cy, Rout, rim } = this;
            // พื้นหลัง: เงา + กรอบ
            const bg = makeCanvas(S);
            const g = bg.getContext('2d');
            g.save();
            g.shadowColor = 'rgba(76, 5, 25, 0.38)';
            g.shadowBlur = S * 0.04;
            g.shadowOffsetY = S * 0.014;
            g.beginPath();
            g.arc(cx, cy, Rout, 0, TAU);
            g.fillStyle = '#9f1239';
            g.fill();
            g.restore();
            const rg = g.createLinearGradient(0, cy - Rout, 0, cy + Rout);
            rg.addColorStop(0, '#fb7185');
            rg.addColorStop(0.5, '#e11d48');
            rg.addColorStop(1, '#9f1239');
            g.beginPath();
            g.arc(cx, cy, Rout, 0, TAU);
            g.fillStyle = rg;
            g.fill();
            g.lineWidth = Math.max(1, S * 0.004);
            g.strokeStyle = 'rgba(255,255,255,0.55)';
            g.beginPath();
            g.arc(cx, cy, Rout - g.lineWidth / 2, 0, TAU);
            g.stroke();
            g.beginPath();
            g.arc(cx, cy, Rout - rim + g.lineWidth / 2, 0, TAU);
            g.strokeStyle = 'rgba(255,255,255,0.85)';
            g.stroke();
            this.bg = bg;

            // หลอดไฟรอบกรอบ (สองสถานะ)
            const b = Math.max(4, Math.round(rim * 0.62));
            const mkBulb = (on) => {
                const c = makeCanvas(b * 2);
                const x = c.getContext('2d');
                const gr = x.createRadialGradient(b * 0.8, b * 0.75, b * 0.05, b, b, b);
                if (on) {
                    gr.addColorStop(0, '#ffffff');
                    gr.addColorStop(0.35, '#fef9c3');
                    gr.addColorStop(0.62, 'rgba(253, 224, 71, 0.95)');
                    gr.addColorStop(1, 'rgba(253, 224, 71, 0)');
                } else {
                    gr.addColorStop(0, 'rgba(255,255,255,0.75)');
                    gr.addColorStop(0.4, 'rgba(254, 205, 211, 0.75)');
                    gr.addColorStop(0.62, 'rgba(190, 18, 60, 0.6)');
                    gr.addColorStop(1, 'rgba(190, 18, 60, 0)');
                }
                x.fillStyle = gr;
                x.beginPath();
                x.arc(b, b, b, 0, TAU);
                x.fill();
                return c;
            };
            this.bulbOn = mkBulb(true);
            this.bulbOff = mkBulb(false);
            this.bulbR = b;
            this.bulbCount = this.size < 320 ? 16 : this.size < 520 ? 20 : 24;

            // เข็ม (ชี้ไปทางซ้าย จุดหมุนอยู่ที่โคนเข็ม)
            const L = S * 0.115;
            const H = S * 0.072;
            const pad = Math.ceil(S * 0.02);
            const pc = makeCanvas(L + pad * 2, H + pad * 2);
            const p = pc.getContext('2d');
            p.translate(pad, pad);
            p.shadowColor = 'rgba(15, 23, 42, 0.35)';
            p.shadowBlur = S * 0.012;
            p.shadowOffsetY = S * 0.005;
            p.beginPath();
            p.moveTo(0, H / 2);
            p.quadraticCurveTo(L * 0.55, H * 0.02, L * 0.86, H * 0.06);
            p.arc(L * 0.86, H / 2, H * 0.44, -Math.PI / 2, Math.PI / 2);
            p.quadraticCurveTo(L * 0.55, H * 0.98, 0, H / 2);
            p.closePath();
            const pg = p.createLinearGradient(0, 0, 0, H);
            pg.addColorStop(0, '#ffffff');
            pg.addColorStop(1, '#e2e8f0');
            p.fillStyle = pg;
            p.fill();
            p.shadowColor = 'transparent';
            p.lineWidth = Math.max(1.5, S * 0.005);
            p.strokeStyle = '#be123c';
            p.stroke();
            p.beginPath();
            p.arc(L * 0.86, H / 2, H * 0.17, 0, TAU);
            p.fillStyle = '#f43f5e';
            p.fill();
            this.pointer = { img: pc, L, H, pad };
        }

        /** วาดช่องและชื่อทั้งหมดลง canvas สำรอง (เรียกเมื่อรายชื่อ/ขนาดเปลี่ยนเท่านั้น) */
        renderWheel() {
            if (!this.S) return;
            const R = this.R;
            const D = Math.ceil(R * 2);
            const wc = makeCanvas(D);
            const g = wc.getContext('2d');
            const c = D / 2;
            const segs = this.segs;
            if (!segs.length) {
                g.beginPath();
                g.arc(c, c, R, 0, TAU);
                g.fillStyle = '#f1f5f9';
                g.fill();
                g.setLineDash([R * 0.04, R * 0.04]);
                g.strokeStyle = '#cbd5e1';
                g.lineWidth = Math.max(1, R * 0.008);
                for (let i = 0; i < 12; i += 1) {
                    g.beginPath();
                    g.moveTo(c, c);
                    g.lineTo(c + Math.cos((i * TAU) / 12) * R, c + Math.sin((i * TAU) / 12) * R);
                    g.stroke();
                }
                this.wheelImg = wc;
                return;
            }
            const many = segs.length > 150;
            segs.forEach((s, i) => {
                g.beginPath();
                g.moveTo(c, c);
                g.arc(c, c, R, s.start, s.end);
                g.closePath();
                const col = this.colors[i];
                const gr = g.createRadialGradient(c, c, R * 0.15, c, c, R);
                gr.addColorStop(0, shade(col, 0.28));
                gr.addColorStop(0.7, col);
                gr.addColorStop(1, shade(col, -0.12));
                g.fillStyle = gr;
                g.fill();
            });
            // เส้นแบ่งช่อง
            if (!many && segs.length > 1) {
                g.strokeStyle = 'rgba(255,255,255,0.9)';
                g.lineWidth = Math.max(1, R * (segs.length > 60 ? 0.004 : 0.007));
                segs.forEach((s) => {
                    g.beginPath();
                    g.moveTo(c, c);
                    g.lineTo(c + Math.cos(s.start) * R, c + Math.sin(s.start) * R);
                    g.stroke();
                });
            }
            // ชื่อ
            const minF = Math.max(9, 9.5 * this.dpr);
            const rOut = R * 0.93;
            const rIn = R * 0.25;
            const avail = rOut - rIn;
            g.textAlign = 'right';
            g.textBaseline = 'middle';
            segs.forEach((s, i) => {
                const ang = s.end - s.start;
                const mid = (s.start + s.end) / 2;
                let text = String(this.labelFn(s.item) || '');
                if (!text) return;
                let f = Math.min(R * 0.088, ang * R * 0.62 * 0.62);
                if (segs.length === 1) f = R * 0.1;
                if (f < minF * 0.8) return; // ช่องแคบเกินกว่าจะอ่านได้
                f = Math.max(f, minF);
                g.font = `700 ${f}px ${FONT}`;
                let w = g.measureText(text).width;
                if (w > avail) {
                    const f2 = (f * avail) / w;
                    if (f2 >= minF) { f = f2; g.font = `700 ${f}px ${FONT}`; w = g.measureText(text).width; } else {
                        f = minF;
                        g.font = `700 ${f}px ${FONT}`;
                        const chars = Array.from(text);
                        let lo = 1, hi = chars.length;
                        while (lo < hi) {
                            const m = (lo + hi + 1) >> 1;
                            if (g.measureText(`${chars.slice(0, m).join('')}…`).width <= avail) lo = m; else hi = m - 1;
                        }
                        text = `${chars.slice(0, lo).join('')}…`;
                    }
                }
                const dark = lum(this.colors[i]) > 0.62;
                g.save();
                g.translate(c, c);
                g.rotate(mid);
                g.fillStyle = dark ? '#4c0519' : '#ffffff';
                if (!dark) {
                    g.shadowColor = 'rgba(15, 23, 42, 0.45)';
                    g.shadowBlur = f * 0.18;
                    g.shadowOffsetY = f * 0.05;
                }
                g.fillText(text, rOut, f * 0.04);
                g.restore();
            });
            // แสงเงาให้ดูนูน
            const sh = g.createRadialGradient(c, c, R * 0.55, c, c, R);
            sh.addColorStop(0, 'rgba(0,0,0,0)');
            sh.addColorStop(1, 'rgba(76, 5, 25, 0.16)');
            g.beginPath();
            g.arc(c, c, R, 0, TAU);
            g.fillStyle = sh;
            g.fill();
            const hi = g.createLinearGradient(0, 0, 0, D);
            hi.addColorStop(0, 'rgba(255,255,255,0.10)');
            hi.addColorStop(0.5, 'rgba(255,255,255,0)');
            g.fillStyle = hi;
            g.fill();
            this.wheelImg = wc;
        }

        /* ---------- วาดหนึ่งเฟรม ---------- */
        draw(ts) {
            if (!this.S || !this.wheelImg) return;
            const t0 = performance.now();
            const c = this.ctx;
            const { S, cx, cy, R } = this;
            c.clearRect(0, 0, S, S);
            c.drawImage(this.bg, 0, 0);
            const half = this.wheelImg.width / 2;
            c.save();
            c.translate(cx, cy);
            c.rotate(this.theta);
            c.drawImage(this.wheelImg, -half, -half);
            if (this.winIndex >= 0 && this.segs[this.winIndex]) {
                // ช่องที่ได้: ช่องอื่นมืดลง แล้ววาดช่องที่ได้ทับให้สว่าง + ขอบเรืองแสง
                const k = Math.min(1, ((ts || performance.now()) - this.winT0) / 320);
                const s = this.segs[this.winIndex];
                c.beginPath();
                c.arc(0, 0, R, 0, TAU);
                c.fillStyle = `rgba(30, 10, 20, ${0.5 * k})`;
                c.fill();
                c.save();
                c.beginPath();
                c.moveTo(0, 0);
                c.arc(0, 0, R, s.start, s.end);
                c.closePath();
                c.clip();
                c.drawImage(this.wheelImg, -half, -half);
                c.restore();
                if (this.segs.length > 1) {
                    c.beginPath();
                    c.moveTo(0, 0);
                    c.arc(0, 0, R, s.start, s.end);
                    c.closePath();
                    c.lineJoin = 'round';
                    c.lineWidth = Math.max(2, S * 0.007);
                    c.strokeStyle = `rgba(255, 255, 255, ${k})`;
                    c.stroke();
                }
            }
            c.restore();

            // หลอดไฟ
            const n = this.bulbCount;
            const rr = this.Rout - this.rim / 2;
            const b = this.bulbR;
            const winning = this.winIndex >= 0 && (ts || performance.now()) - this.winT0 < 1800;
            for (let i = 0; i < n; i += 1) {
                const a = (i * TAU) / n + TAU / (n * 2);
                let on;
                if (this.spinning) on = (i + this.bulbPhase) % 2 === 0;
                else if (winning) on = this.bulbPhase % 2 === 0;
                else on = true;
                c.drawImage(on ? this.bulbOn : this.bulbOff, cx + Math.cos(a) * rr - b, cy + Math.sin(a) * rr - b);
            }

            // เข็ม (โคนอยู่นอกกรอบด้านขวา ปลายชี้เข้าวงล้อ) — สะบัดลงตามทิศการหมุน
            const p = this.pointer;
            const baseX = cx + this.Rout + S * 0.02;
            c.save();
            c.translate(baseX, cy);
            c.rotate(this.flap * 0.32);
            c.drawImage(p.img, -p.L - p.pad, -p.H / 2 - p.pad);
            c.restore();

            if (this.stats) this.stats.drawMs += performance.now() - t0;
        }

        /* ---------- ภาพเคลื่อนไหว ---------- */
        loop() {
            if (this.raf) return;
            const step = (ts) => {
                this.raf = 0;
                const more = this.update(ts);
                this.draw(ts);
                if (this.pendingDone) {
                    const fn = this.pendingDone;
                    this.pendingDone = null;
                    fn();
                }
                if (more) this.raf = requestAnimationFrame(step);
                else this.lastTs = 0;
            };
            this.raf = requestAnimationFrame(step);
        }

        update(ts) {
            const dt = this.lastTs ? Math.min(0.1, (ts - this.lastTs) / 1000) : 1 / 60;
            if (this.stats && this.lastTs && this.spinning) {
                const ms = ts - this.lastTs;
                this.stats.frames += 1;
                this.stats.sum += ms;
                this.stats.max = Math.max(this.stats.max, ms);
                if (ms > 25) this.stats.slow += 1;
            }
            this.lastTs = ts;
            const a = this.anim;
            if (a) {
                const p = Math.min(1, (ts - a.t0) / a.dur);
                const prev = this.theta;
                this.theta = a.from + (a.to - a.from) * Engine.spinEase(p);
                const idx = this.currentIndex();
                if (idx !== this.lastIdx) {
                    this.lastIdx = idx;
                    this.flap = 1;
                    const speed = (this.theta - prev) / Math.max(dt, 1 / 240); // เรเดียน/วินาที
                    if (this.opts.onTick) this.opts.onTick(Math.min(1, 0.45 + speed / 30));
                }
                this.bulbPhase = Math.floor((ts - a.t0) / 110);
                if (p >= 1) {
                    this.theta = Engine.norm(a.to);
                    this.anim = null;
                    this.spinning = false;
                    this.winIndex = a.index;
                    this.winT0 = ts;
                    this.pendingDone = () => a.onDone && a.onDone(a.index, this.segs[a.index] && this.segs[a.index].item);
                }
            } else if (this.winIndex >= 0) {
                this.bulbPhase = Math.floor((ts - this.winT0) / 170);
            }
            this.flap *= Math.exp(-dt * 13);
            if (this.flap < 0.004) this.flap = 0;
            const glowing = this.winIndex >= 0 && ts - this.winT0 < 1900;
            return this.spinning || this.flap > 0 || glowing;
        }

        /**
         * หมุนวงล้อ: { duration (วินาที), onDone(index, item) } → คืนแผน { index, target } หรือ null
         * winner (ไม่บังคับ) = ตำแหน่งผู้ชนะที่สุ่มไว้แล้ว — ปกติให้ Engine.planSpin สุ่มเองตามน้ำหนัก
         */
        spin(o) {
            if (this.spinning || !this.segs.length) return null;
            const opt = Object.assign({ duration: 7 }, o || {});
            const dur = Math.max(1.5, Number(opt.duration) || 7);
            const turns = opt.turns || Math.max(4, Math.round(dur * 0.9 + 1));
            const plan = Engine.planSpin(this.segs, this.theta, { pointer: 0, turns, winner: opt.winner });
            this.anim = { from: this.theta, to: plan.target, t0: performance.now(), dur: dur * 1000, index: plan.index, onDone: opt.onDone };
            this.spinning = true;
            this.winIndex = -1;
            this.lastIdx = this.currentIndex();
            this.stats = { frames: 0, sum: 0, max: 0, slow: 0, drawMs: 0 };
            this.loop();
            return plan;
        }

        clearHighlight() {
            if (this.winIndex < 0) return;
            this.winIndex = -1;
            this.draw();
        }

        /** สรุปความลื่นของการหมุนครั้งล่าสุด (ใช้ในการทดสอบ) */
        perf() {
            const s = this.stats;
            if (!s || !s.frames) return null;
            return { frames: s.frames, avgMs: s.sum / s.frames, fps: 1000 / (s.sum / s.frames), maxMs: s.max, slowFrames: s.slow, drawMsAvg: s.drawMs / (s.frames + 1) };
        }

        destroy() {
            if (this.raf) cancelAnimationFrame(this.raf);
            this.raf = 0;
            this.anim = null;
            this.spinning = false;
            if (this.ro) this.ro.disconnect();
            if (this._onResize) window.removeEventListener('resize', this._onResize);
            this.canvas.remove();
        }
    }

    window.Wheel = Wheel;
})();
