/* =====================================================================
   พลุ/กระดาษสี ฉลองผู้ชนะ (canvas เต็มจอ)
   ===================================================================== */
(function () {
    'use strict';
    let cv = null, raf = 0, parts = [], until = 0;
    const COLORS = ['#FF375F', '#FF9F0A', '#FFD60A', '#30D158', '#0A84FF', '#BF5AF2', '#ffffff'];
    function ensure() {
        if (cv) return cv;
        cv = document.createElement('canvas');
        cv.className = 'fx-canvas';
        document.body.appendChild(cv);
        return cv;
    }
    function burst(x, y, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 6;
            parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, life: 60 + Math.random() * 50, c: COLORS[(Math.random() * COLORS.length) | 0], s: 2 + Math.random() * 3, sq: Math.random() < 0.4 });
        }
    }
    function frame() {
        const W = cv.width = window.innerWidth, H = cv.height = window.innerHeight;
        const g = cv.getContext('2d');
        g.clearRect(0, 0, W, H);
        if (performance.now() < until && Math.random() < 0.08) burst(W * (0.15 + Math.random() * 0.7), H * (0.15 + Math.random() * 0.35), 70);
        if (performance.now() < until && Math.random() < 0.5) parts.push({ x: Math.random() * W, y: -10, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 2, life: 200, c: COLORS[(Math.random() * COLORS.length) | 0], s: 4 + Math.random() * 4, sq: true });
        parts = parts.filter((p) => p.life > 0 && p.y < H + 20);
        parts.forEach((p) => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.vx *= 0.99; p.life--;
            g.globalAlpha = Math.min(1, p.life / 40);
            g.fillStyle = p.c;
            if (p.sq) g.fillRect(p.x, p.y, p.s * 1.6, p.s);
            else { g.beginPath(); g.arc(p.x, p.y, p.s, 0, Math.PI * 2); g.fill(); }
        });
        g.globalAlpha = 1;
        if (parts.length || performance.now() < until) raf = requestAnimationFrame(frame);
        else { cv.remove(); cv = null; raf = 0; }
    }
    window.FX = {
        celebrate(ms) {
            ensure();
            until = performance.now() + (ms || 6000);
            burst(window.innerWidth / 2, window.innerHeight / 3, 120);
            if (!raf) raf = requestAnimationFrame(frame);
        },
        stop() { until = 0; parts = []; },
    };
})();
