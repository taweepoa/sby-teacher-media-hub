/* =====================================================================
   วาดกระดานบันไดงู: ช่องเป็น HTML grid + บันได/งูเป็น SVG ทับด้านบน + หมากของทีม
   ใช้ทั้งหน้าเล่นเกม หน้าออกแบบกระดาน ภาพย่อ และหน้าพิมพ์ (A4 แนวนอน)
   พิกัด SVG: ช่องละ 100 หน่วย → viewBox = คอลัมน์×100, แถว×100 (กระดานเป็นสี่เหลี่ยมช่องจัตุรัสจึงไม่บิดเบี้ยว)
   ===================================================================== */
(function () {
    'use strict';

    const esc = U.esc;
    const CELL_BG = ['#fff3b0', '#c9f2c7', '#bfe3ff', '#ffd6e7', '#ffe0b8', '#e2d9ff'];
    const SNAKE_COLORS = [['#16a34a', '#86efac'], ['#dc2626', '#fca5a5'], ['#7c3aed', '#c4b5fd'], ['#ea580c', '#fdba74'], ['#0891b2', '#67e8f9'], ['#db2777', '#f9a8d4'], ['#65a30d', '#d9f99d'], ['#2563eb', '#93c5fd']];
    const SPECIAL = {
        q: { icon: 'fa-circle-question', cls: 'c-q' },
        bonus: { icon: 'fa-star', cls: 'c-bonus' },
        skip: { icon: 'fa-hourglass-half', cls: 'c-skip' },
        again: { icon: 'fa-dice', cls: 'c-again' },
    };

    const center = (b, c) => { const p = Engine.cellPos(c, b.cols, b.n); return { x: p.col * 100 + 50, y: p.row * 100 + 50 }; };

    function ladderSVG(b, pair, i) {
        const a = center(b, pair[0]);
        const z = center(b, pair[1]);
        const dx = z.x - a.x;
        const dy = z.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = (-dy / len) * 17;
        const ny = (dx / len) * 17;
        const rungs = [];
        const n = Math.max(2, Math.round(len / 34));
        for (let k = 1; k < n; k += 1) {
            const t = k / n;
            const cx = a.x + dx * t;
            const cy = a.y + dy * t;
            rungs.push(`<line x1="${cx + nx}" y1="${cy + ny}" x2="${cx - nx}" y2="${cy - ny}"/>`);
        }
        const rail = (s) => `<line x1="${a.x + nx * s}" y1="${a.y + ny * s}" x2="${z.x + nx * s}" y2="${z.y + ny * s}"/>`;
        return `<g class="sl-ladder" data-ladder="${i}">
            <g stroke="rgba(0,0,0,.18)" stroke-width="12" stroke-linecap="round" transform="translate(4 5)">${rail(1)}${rail(-1)}</g>
            <g stroke="#f5c26b" stroke-width="7" stroke-linecap="round">${rungs.join('')}</g>
            <g stroke="#a16207" stroke-width="10" stroke-linecap="round">${rail(1)}${rail(-1)}</g>
            <g stroke="#fde68a" stroke-width="3" stroke-linecap="round" opacity=".8">${rail(1)}${rail(-1)}</g>
        </g>`;
    }

    /* งู: เส้นโค้งคลื่นจากหัว (ช่องบน) ไปหาง (ช่องล่าง) */
    function snakeSVG(b, pair, i) {
        const a = center(b, pair[0]);
        const z = center(b, pair[1]);
        const dx = z.x - a.x;
        const dy = z.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const px = -uy;
        const py = ux;
        const waves = Math.max(2, Math.round(len / 110));
        const amp = Math.min(34, 14 + len / 20);
        const pts = [];
        const N = waves * 8;
        for (let k = 0; k <= N; k += 1) {
            const t = k / N;
            const off = Math.sin(t * waves * Math.PI) * amp * Math.min(1, t * 6) * (1 - t * 0.35);
            pts.push([a.x + dx * t + px * off, a.y + dy * t + py * off]);
        }
        let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
        for (let k = 1; k < pts.length - 1; k += 1) {
            const mx = (pts[k][0] + pts[k + 1][0]) / 2;
            const my = (pts[k][1] + pts[k + 1][1]) / 2;
            d += ` Q${pts[k][0].toFixed(1)} ${pts[k][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
        }
        const [c1, c2] = SNAKE_COLORS[i % SNAKE_COLORS.length];
        const ang = (Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]) * 180) / Math.PI + 180;
        return `<g class="sl-snake" data-snake="${i}">
            <path d="${d}" stroke="rgba(0,0,0,.18)" stroke-width="26" fill="none" stroke-linecap="round" transform="translate(4 6)"/>
            <path d="${d}" stroke="${c1}" stroke-width="24" fill="none" stroke-linecap="round"/>
            <path d="${d}" stroke="${c2}" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="2 16"/>
            <circle cx="${z.x.toFixed(1)}" cy="${z.y.toFixed(1)}" r="6" fill="${c1}"/>
            <g transform="translate(${a.x.toFixed(1)} ${a.y.toFixed(1)}) rotate(${ang.toFixed(1)})">
                <path d="M22 0 L40 -5 M40 -5 L46 -10 M40 -5 L46 0" stroke="#e11d48" stroke-width="3.5" fill="none" stroke-linecap="round"/>
                <ellipse cx="0" cy="0" rx="26" ry="20" fill="${c1}" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
                <circle cx="8" cy="-9" r="6.5" fill="#fff"/><circle cx="8" cy="9" r="6.5" fill="#fff"/>
                <circle cx="10" cy="-9" r="3.2" fill="#0f172a"/><circle cx="10" cy="9" r="3.2" fill="#0f172a"/>
            </g>
        </g>`;
    }

    /* ตำแหน่งหมาก (เป็น % ของกระดาน) — หลายทีมช่องเดียวกันจัดเรียงไม่ทับ */
    const OFFS = [[0, 0], [-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2], [0, 0.26]];
    function tokenXY(b, cell, k, count) {
        const p = Engine.cellPos(Math.max(1, Math.min(b.n, cell)), b.cols, b.n);
        const rows = b.n / b.cols;
        const o = count <= 1 ? [0, 0] : OFFS[(k % 5) + 1];
        return { left: ((p.col + 0.5 + o[0]) / b.cols) * 100, top: ((p.row + 0.5 + o[1]) / rows) * 100 };
    }
    function placeTokens(boardEl, b, teams) {
        const groups = {};
        teams.forEach((t) => { const c = Math.max(1, t.pos); (groups[c] = groups[c] || []).push(t.id); });
        teams.forEach((t) => {
            const el = boardEl.querySelector(`[data-token="${t.id}"]`);
            if (!el) return;
            const c = Math.max(1, t.pos);
            const g = groups[c];
            const xy = tokenXY(b, c, g.indexOf(t.id), g.length);
            el.style.left = `${xy.left}%`;
            el.style.top = `${xy.top}%`;
        });
    }

    /* opts: { teams, tokens:true, numbers:true, edit:false, mini:false, highlight:[cells], cls } */
    function html(b, opts) {
        const o = opts || {};
        const rows = b.n / b.cols;
        const cells = [];
        for (let r = 0; r < rows; r += 1) {
            for (let c = 0; c < b.cols; c += 1) {
                const rFromBottom = rows - 1 - r;
                const cell = rFromBottom * b.cols + (rFromBottom % 2 === 0 ? c : b.cols - 1 - c) + 1;
                const info = Engine.cellInfo(b, cell);
                const sp = SPECIAL[info.kind];
                let cls = 'sl-cell';
                let inner = '';
                if (cell === 1) { cls += ' c-start'; inner = '<span class="c-lbl"><i class="fas fa-play"></i>เริ่ม</span>'; }
                else if (cell === b.n) { cls += ' c-goal'; inner = '<span class="c-lbl"><i class="fas fa-flag-checkered"></i>เส้นชัย</span>'; }
                else if (sp) { cls += ` ${sp.cls}`; inner = `<i class="fas ${sp.icon} c-ic"></i>`; }
                if (info.kind === 'ladder') cls += ' c-lfoot';
                if (info.kind === 'snake') cls += ' c-shead';
                if (o.highlight && o.highlight.includes(cell)) cls += ' hl';
                const bg = CELL_BG[(r + c) % CELL_BG.length];
                cells.push(`<div class="${cls}" style="--bg:${bg}" data-cell="${cell}">${o.numbers === false ? '' : `<span class="c-no">${cell}</span>`}${inner}</div>`);
            }
        }
        const W = b.cols * 100;
        const H = rows * 100;
        const art = b.ladders.map((p, i) => ladderSVG(b, p, i)).join('') + b.snakes.map((p, i) => snakeSVG(b, p, i)).join('');
        const tokens = o.teams && o.tokens !== false ? o.teams.map((t) => `<div class="sl-token${t.finishAt ? ' won' : ''}" data-token="${esc(t.id)}" style="--c:${esc(t.color)}" title="${esc(t.name)}"><i class="fas ${esc(t.icon)}"></i></div>`).join('') : '';
        return `<div class="sl-board${o.mini ? ' mini' : ''}${o.edit ? ' edit' : ''} ${o.cls || ''}" style="--cols:${b.cols};--rows:${rows}">
            <div class="sl-grid">${cells.join('')}</div>
            <svg class="sl-art" viewBox="0 0 ${W} ${H}" aria-hidden="true">${art}</svg>
            ${tokens}
        </div>`;
    }

    function mount(host, b, opts) {
        host.innerHTML = html(b, opts);
        const el = host.querySelector('.sl-board');
        if (opts && opts.teams) placeTokens(el, b, opts.teams);
        return el;
    }

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    /* เดินหมากทีละช่องตามเส้นทาง (ทำแอนิเมชัน) */
    async function walkToken(boardEl, b, team, path, stepMs, onStep) {
        const el = boardEl.querySelector(`[data-token="${team.id}"]`);
        if (!el) return;
        el.classList.add('moving');
        for (const c of path) {
            const xy = tokenXY(b, c, 0, 1);
            el.style.left = `${xy.left}%`;
            el.style.top = `${xy.top}%`;
            if (onStep) onStep(c);
            await wait(stepMs || 260);
        }
        el.classList.remove('moving');
    }
    /* ไถลขึ้นบันได/ลงงู แบบเส้นตรง */
    async function slideToken(boardEl, b, team, to, kind) {
        const el = boardEl.querySelector(`[data-token="${team.id}"]`);
        if (!el) return;
        el.classList.add(kind === 'snake' ? 'sliding-down' : 'sliding-up');
        const xy = tokenXY(b, to, 0, 1);
        el.style.left = `${xy.left}%`;
        el.style.top = `${xy.top}%`;
        await wait(900);
        el.classList.remove('sliding-down', 'sliding-up');
    }

    window.BoardArt = { html, mount, placeTokens, walkToken, slideToken, tokenXY, center, CELL_BG, SPECIAL };
})();
