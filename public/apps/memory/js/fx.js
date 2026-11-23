/* =====================================================================
   เอฟเฟกต์ฉลอง: พลุ + กระดาษสี บน canvas เต็มจอ (ไม่ใช้ไลบรารีภายนอก)
   ===================================================================== */
(function () {
    'use strict';

    let cv = null;
    let raf = 0;
    let parts = [];
    let until = 0;
    const COLORS = ['#facc15', '#fde047', '#f97316', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#ffffff'];
    const reduce = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function ensure(host) {
        if (!cv) {
            cv = document.createElement('canvas');
            cv.className = 'fx-canvas';
            cv.setAttribute('aria-hidden', 'true');
        }
        const parent = host || document.fullscreenElement || document.body;
        if (cv.parentNode !== parent) parent.appendChild(cv);
        cv.width = parent.clientWidth || window.innerWidth;
        cv.height = parent === document.body ? window.innerHeight : parent.clientHeight || window.innerHeight;
        return cv.getContext('2d');
    }
    function burst(x, y, n, speed) {
        const c = COLORS[Math.floor(Math.random() * COLORS.length)];
        for (let i = 0; i < n; i += 1) {
            const a = Math.random() * Math.PI * 2;
            const v = speed * (0.4 + Math.random() * 0.8);
            parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 60 + Math.random() * 40, c: Math.random() < 0.7 ? c : COLORS[i % COLORS.length], r: 2 + Math.random() * 2.5, kind: 'spark' });
        }
    }
    function confetti(w, n) {
        for (let i = 0; i < n; i += 1) parts.push({ x: Math.random() * w, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3, life: 260, c: COLORS[i % COLORS.length], r: 5 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, kind: 'paper' });
    }
    function loop() {
        const g = cv.getContext('2d');
        g.clearRect(0, 0, cv.width, cv.height);
        if (Date.now() < until && Math.random() < 0.08) burst(cv.width * (0.15 + Math.random() * 0.7), cv.height * (0.15 + Math.random() * 0.4), 70, 7);
        parts = parts.filter((p) => p.life > 0);
        parts.forEach((p) => {
            p.life -= 1;
            p.x += p.vx;
            p.y += p.vy;
            if (p.kind === 'spark') { p.vy += 0.08; p.vx *= 0.985; g.globalAlpha = Math.max(0, Math.min(1, p.life / 50)); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill(); } else {
                p.rot += p.vr; p.vx += (Math.random() - 0.5) * 0.2; g.globalAlpha = 1; g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); g.restore();
            }
        });
        g.globalAlpha = 1;
        if (parts.length || Date.now() < until) raf = requestAnimationFrame(loop);
        else stop();
    }
    function stop() { cancelAnimationFrame(raf); raf = 0; parts = []; if (cv && cv.parentNode) cv.parentNode.removeChild(cv); }

    /* พลุชุดใหญ่ (ประกาศผู้ชนะ) */
    function fireworks(ms, host) {
        if (reduce()) return;
        const g = ensure(host);
        if (!g) return;
        until = Date.now() + (ms || 5000);
        confetti(cv.width, 160);
        for (let i = 0; i < 4; i += 1) burst(cv.width * (0.2 + i * 0.2), cv.height * 0.3, 80, 8);
        if (!raf) raf = requestAnimationFrame(loop);
    }
    /* ฉลองสั้น ๆ (ทายถูก) */
    function pop(x, y, host) {
        if (reduce()) return;
        ensure(host);
        until = Math.max(until, Date.now());
        burst(x == null ? cv.width / 2 : x, y == null ? cv.height / 2 : y, 90, 8);
        confetti(cv.width, 40);
        if (!raf) raf = requestAnimationFrame(loop);
    }

    window.Fx = { fireworks, pop, stop };
})();
