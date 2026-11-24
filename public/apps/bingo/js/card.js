/* =====================================================================
   วาดการ์ดบิงโก (ใช้ทั้งบนจอ ตัวอย่างก่อนพิมพ์ และหน้าพิมพ์ A4)
   - Card.html(game, card, items, opts) → HTML การ์ด 1 ใบ
   - Card.pages(game, items, opts) → หน้า A4 (1/2/4 ใบต่อหน้า)
   - Card.print(html) → ใส่ลง #print-root แล้วสั่งพิมพ์
   ===================================================================== */
(function () {
    'use strict';

    const LETTERS = { 5: ['B', 'I', 'N', 'G', 'O'], 4: ['B', 'I', 'N', 'GO'], 3: ['BIN', 'G', 'O'] };
    const pad = (n) => String(n).padStart(3, '0');

    /* ขนาดตัวอักษรตามความยาวคำ (ไม่ให้ล้นช่อง) */
    function lenClass(t) {
        const n = String(t || '').length;
        if (n <= 4) return 'l1';
        if (n <= 6) return 'l2';
        if (n <= 10) return 'l3';
        if (n <= 18) return 'l4';
        return 'l5';
    }

    function student(game, card) {
        if (!game.showNames) return '';
        return game.students[card.no - 1] || '';
    }

    function html(game, card, items, opts) {
        const o = opts || {};
        const size = game.size;
        const marked = o.marked || [];
        const hits = new Set(o.hits || []);
        const letters = LETTERS[size];
        const cells = card.cells.map((id, i) => {
            const cls = [];
            if (marked[i]) cls.push('is-marked');
            if (hits.has(i)) cls.push('is-hit');
            if (o.calledLast && id === o.calledLast) cls.push('is-last');
            if (id === Bingo.FREE) {
                return `<div class="bc-cell is-free ${cls.join(' ')}"><span><i class="fas fa-star"></i><b>FREE</b></span></div>`;
            }
            const it = items.get(id);
            const text = it ? it.a : '?';
            return `<div class="bc-cell ${lenClass(text)} ${cls.join(' ')}"><span>${U.esc(text)}</span></div>`;
        }).join('');
        const name = student(game, card);
        const wm = window.VSDemo && VSDemo.active && o.print !== false ? `<div class="bc-wm">${U.esc(VSDemo.watermark)}</div>` : '';
        return `
            <div class="bcard s${size}${o.mini ? ' mini' : ''}" data-no="${card.no}">
                <div class="bc-top">
                    <div class="bc-title">${U.esc(game.title || 'BINGO')}</div>
                    <div class="bc-no"><small>การ์ดหมายเลข</small><b>${pad(card.no)}</b></div>
                </div>
                ${game.subtitle ? `<div class="bc-sub">${U.esc(game.subtitle)}</div>` : ''}
                <div class="bc-name"><span>ชื่อ</span><b>${U.esc(name)}</b><span>ชั้น</span><b class="cls">${U.esc(game.cls || '')}</b></div>
                <div class="bc-head" style="--n:${size}">${letters.map((l) => `<span>${l}</span>`).join('')}</div>
                <div class="bc-grid" style="--n:${size}">${cells}</div>
                <div class="bc-foot"><span>${U.esc(Bingo.PATTERNS.find((p) => p.id === game.pattern)?.label || '')}</span><span>รหัสชุด ${game.seed}</span></div>
                ${wm}
            </div>`;
    }

    /* แบ่งการ์ดเป็นหน้า A4 */
    function pages(game, items, opts) {
        const o = opts || {};
        const per = game.perPage || 2;
        const list = o.cards || game.cards;
        const out = [];
        for (let i = 0; i < list.length; i += per) {
            const chunk = list.slice(i, i + per);
            out.push(`<div class="bp-page pp${per} s${game.size}">${chunk.map((c) => `<div class="bp-slot">${html(game, c, items, { print: true })}</div>`).join('')}</div>`);
        }
        return out;
    }

    /* แผ่นรายการคำสำหรับครู (เฉลย/ใช้เรียกแบบไม่ใช้จอ) */
    function callSheet(game, set) {
        const rows = set.items.map((it, i) => `<tr><td class="c">${i + 1}</td><td>${U.esc(it.q || it.a)}</td><td><b>${U.esc(it.a)}</b></td><td class="c">☐</td></tr>`);
        const per = 26;
        const out = [];
        for (let i = 0; i < rows.length; i += per) {
            out.push(`<div class="bp-page sheet">
                <h2>รายการคำสำหรับครูผู้เรียก — ${U.esc(game.name || set.name)}</h2>
                <p>${U.esc(set.subject)} ${U.esc(set.level)} • ${U.esc(set.name)} • ${set.items.length} คำ • หน้า ${Math.floor(i / per) + 1}</p>
                <table><thead><tr><th style="width:9%">ที่</th><th>สิ่งที่ครูเรียก (คำถาม)</th><th style="width:30%">คำบนการ์ด (คำตอบ)</th><th style="width:10%">เรียกแล้ว</th></tr></thead>
                <tbody>${rows.slice(i, i + per).join('')}</tbody></table>
                ${window.VSDemo && VSDemo.active ? `<div class="bc-wm">${U.esc(VSDemo.watermark)}</div>` : ''}
            </div>`);
        }
        return out;
    }

    function print(pagesHtml) {
        const root = document.getElementById('print-root');
        root.innerHTML = pagesHtml.join('');
        // รอให้ฟอนต์และเลย์เอาต์พร้อมก่อนสั่งพิมพ์
        setTimeout(() => window.print(), 120);
    }

    window.Card = { html, pages, callSheet, print, pad, lenClass };
})();
