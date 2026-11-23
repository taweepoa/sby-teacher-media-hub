/* =====================================================================
   เอฟเฟกต์ฉลอง: กระดาษสีโปรยทั่วจอ (canvas เดียว วาดด้วย requestAnimationFrame)
   ปิดได้ในหน้าตั้งค่า • ผู้ใช้ที่ตั้งค่าเครื่องให้ "ลดการเคลื่อนไหว" จะไม่มีกระดาษโปรย
   (ใช้ Math.random ได้ เพราะเป็นแค่ภาพประกอบ ไม่เกี่ยวกับผลการสุ่ม)
   ===================================================================== */
(function () {
    'use strict';

    const COLORS = ['#f43f5e', '#fb923c', '#facc15', '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6', '#ffffff'];
    let canvas = null;
    let cx = null;
    let parts = [];
    let raf = 0;
    let last = 0;

    function reduced() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    function enabled() {
        return !(window.Store && Store.data && Store.data.settings.confetti === false) && !reduced();
    }

    function setup() {
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.className = 'fx-canvas';
            canvas.setAttribute('aria-hidden', 'true');
            cx = canvas.getContext('2d');
        }
        if (!canvas.isConnected) document.body.appendChild(canvas);
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
        }
        cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function frame(ts) {
        const dt = Math.min(0.05, (ts - (last || ts)) / 1000);
        last = ts;
        const w = window.innerWidth;
        const h = window.innerHeight;
        cx.clearRect(0, 0, w, h);
        parts = parts.filter((p) => p.y < h + 40 && p.life > 0);
        parts.forEach((p) => {
            p.vy += 520 * dt;               // แรงโน้มถ่วง
            p.vx *= 1 - 0.9 * dt;           // แรงต้านอากาศ
            p.vy *= 1 - 0.55 * dt;
            p.x += (p.vx + Math.sin(p.t * 3 + p.seed) * 40) * dt;
            p.y += p.vy * dt;
            p.t += dt;
            p.rot += p.spin * dt;
            p.life -= dt;
            const flip = Math.abs(Math.cos(p.t * p.flip));
            cx.save();
            cx.globalAlpha = Math.min(1, p.life * 1.5);
            cx.translate(p.x, p.y);
            cx.rotate(p.rot);
            cx.fillStyle = p.c;
            if (p.shape === 0) cx.fillRect(-p.s / 2, (-p.s / 2) * flip, p.s, p.s * 0.6 * flip);
            else { cx.beginPath(); cx.arc(0, 0, p.s * 0.38, 0, Math.PI * 2); cx.fill(); }
            cx.restore();
        });
        if (parts.length) raf = requestAnimationFrame(frame);
        else { raf = 0; last = 0; cx.clearRect(0, 0, w, h); canvas.remove(); }
    }

    const FX = {
        /** โปรยกระดาษสี: origin = {x, y} เป็นสัดส่วนของจอ (ค่าเริ่มต้นกลางจอด้านบน) */
        confetti(opts) {
            if (!enabled()) return;
            const o = Object.assign({ count: 0, x: 0.5, y: 0.35, spread: 1 }, opts || {});
            setup();
            const w = window.innerWidth;
            const h = window.innerHeight;
            const n = o.count || Math.round(Math.min(220, Math.max(90, w / 7)));
            for (let i = 0; i < n; i += 1) {
                const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15 * o.spread;
                const sp = 380 + Math.random() * 620;
                parts.push({
                    x: w * o.x + (Math.random() - 0.5) * 60,
                    y: h * o.y,
                    vx: Math.cos(ang) * sp,
                    vy: Math.sin(ang) * sp,
                    s: 7 + Math.random() * 8,
                    c: COLORS[i % COLORS.length],
                    rot: Math.random() * 6,
                    spin: (Math.random() - 0.5) * 12,
                    flip: 2 + Math.random() * 6,
                    seed: Math.random() * 10,
                    shape: Math.random() < 0.75 ? 0 : 1,
                    t: 0,
                    life: 2.6 + Math.random() * 1.6,
                });
            }
            if (!raf) raf = requestAnimationFrame(frame);
        },
        /** โปรยจากสองข้างจอ (ใช้ตอนประกาศผลใหญ่) */
        celebrate() {
            this.confetti({ x: 0.5, y: 0.42 });
            setTimeout(() => { this.confetti({ x: 0.1, y: 0.7, count: 60, spread: 0.6 }); this.confetti({ x: 0.9, y: 0.7, count: 60, spread: 0.6 }); }, 260);
        },
        clear() { parts = []; },
    };

    window.FX = FX;
})();
