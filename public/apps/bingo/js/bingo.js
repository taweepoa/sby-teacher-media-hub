/* =====================================================================
   เครื่องยนต์บิงโก: สุ่มแบบกำหนดเมล็ด (seed), สร้างการ์ดไม่ซ้ำกัน, ตรวจผู้ชนะ
   ใช้ได้ทั้งเบราว์เซอร์ (window.Bingo) และ Node (dev/test-engine.js)
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Bingo = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const FREE = 'FREE';
    const SIZES = [3, 4, 5];

    /* รูปแบบการชนะ */
    const PATTERNS = [
        { id: 'line', label: 'เรียงครบ 1 แถว', desc: 'แนวนอน แนวตั้ง หรือแนวทแยง 1 แถว', icon: 'fa-grip-lines' },
        { id: 'two', label: 'เรียงครบ 2 แถว', desc: 'แถวใดก็ได้ 2 แถว (นอน/ตั้ง/ทแยง)', icon: 'fa-bars' },
        { id: 'corners', label: '4 มุม', desc: 'ช่องมุมทั้ง 4 ของการ์ด', icon: 'fa-expand' },
        { id: 'x', label: 'รูปตัว X', desc: 'แนวทแยงทั้ง 2 เส้น', icon: 'fa-xmark' },
        { id: 'full', label: 'เต็มใบ (Blackout)', desc: 'ทุกช่องบนการ์ด', icon: 'fa-square' },
    ];

    /* ---------- สุ่มแบบกำหนดเมล็ด (mulberry32) — seed เดิมได้การ์ดชุดเดิมทุกครั้ง ---------- */
    function rng(seed) {
        let a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function shuffle(arr, rand) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    function newSeed() { return Math.floor(Math.random() * 2147483646) + 1; }

    /* ช่อง FREE อยู่กลางการ์ด (มีเฉพาะ 3×3 และ 5×5 — 4×4 ไม่มีช่องกลาง จึงใช้ช่อง [1][1]) */
    function freeIndex(size) {
        if (size % 2 === 1) return Math.floor((size * size) / 2);
        return size + 1;
    }
    function cellsNeeded(size, free) { return size * size - (free ? 1 : 0); }

    /**
     * สร้างการ์ด count ใบ จากรายการ itemIds
     * - การ์ดทุกใบไม่ซ้ำกัน (ลำดับช่องไม่ซ้ำ) และพยายามให้ชุดคำในการ์ดไม่ซ้ำกันด้วย
     * คืน { cards:[{no, cells:[id|'FREE']}], warn }
     */
    function generate(itemIds, o) {
        const size = o.size, free = !!o.free, count = o.count;
        const need = cellsNeeded(size, free);
        const ids = [...new Set(itemIds)];
        if (ids.length < need) return { cards: [], error: `ต้องมีคำอย่างน้อย ${need} คำ (ตอนนี้มี ${ids.length} คำ)` };
        const rand = rng(o.seed || 1);
        const fi = freeIndex(size);
        const seenGrid = new Set();
        const seenSet = new Set();
        const cards = [];
        let sameSet = 0;
        const start = o.startNo || 1;
        for (let n = 0; n < count; n++) {
            let cells = null;
            for (let tries = 0; tries < 400; tries++) {
                const pick = shuffle(ids, rand).slice(0, need);
                const grid = pick.slice();
                if (free) grid.splice(fi, 0, FREE);
                const gk = grid.join('|');
                if (seenGrid.has(gk)) continue;
                const sk = pick.slice().sort().join('|');
                // ช่วงแรกบังคับให้ชุดคำไม่ซ้ำ ถ้าคำมีน้อยจนทำไม่ได้ ยอมให้ชุดคำซ้ำแต่ตำแหน่งต่างกัน
                if (seenSet.has(sk) && tries < 300) continue;
                if (seenSet.has(sk)) sameSet++;
                seenGrid.add(gk);
                seenSet.add(sk);
                cells = grid;
                break;
            }
            if (!cells) return { cards, error: 'สร้างการ์ดไม่ซ้ำกันได้ไม่ครบ กรุณาเพิ่มจำนวนคำในชุด หรือลดจำนวนการ์ด' };
            cards.push({ no: start + n, cells });
        }
        return { cards, warn: sameSet ? `มีการ์ด ${sameSet} ใบที่ใช้คำชุดเดียวกับใบอื่น (ตำแหน่งต่างกัน) — เพิ่มคำในชุดเพื่อให้การ์ดหลากหลายขึ้น` : '' };
    }

    /* เส้นทั้งหมดบนการ์ด (index ของช่อง) */
    function lines(size) {
        const L = [];
        for (let r = 0; r < size; r++) L.push({ kind: 'row', n: r + 1, idx: [...Array(size)].map((_, c) => r * size + c) });
        for (let c = 0; c < size; c++) L.push({ kind: 'col', n: c + 1, idx: [...Array(size)].map((_, r) => r * size + c) });
        L.push({ kind: 'diag', n: 1, idx: [...Array(size)].map((_, i) => i * size + i) });
        L.push({ kind: 'diag', n: 2, idx: [...Array(size)].map((_, i) => i * size + (size - 1 - i)) });
        return L;
    }
    function lineLabel(l) {
        if (l.kind === 'row') return `แถวนอนที่ ${l.n}`;
        if (l.kind === 'col') return `แถวตั้งที่ ${l.n}`;
        return l.n === 1 ? 'แนวทแยง (ซ้ายบน–ขวาล่าง)' : 'แนวทแยง (ขวาบน–ซ้ายล่าง)';
    }

    /**
     * ตรวจการ์ด: card.cells + ชุดรหัสคำที่เรียกแล้ว (Set) + รูปแบบ
     * คืน { win, marked:[bool], hits:[index ที่ทำให้ชนะ], detail, missing }
     */
    function check(card, calledSet, pattern, size) {
        const marked = card.cells.map((id) => id === FREE || calledSet.has(id));
        const done = (idx) => idx.every((i) => marked[i]);
        const total = size * size;
        const corners = [0, size - 1, total - size, total - 1];
        const L = lines(size);
        const full = L.filter((l) => done(l.idx));
        let win = false, hits = [], detail = '';
        if (pattern === 'line') {
            if (full.length) { win = true; hits = full[0].idx; detail = full.map(lineLabel).join(', '); }
        } else if (pattern === 'two') {
            if (full.length >= 2) { win = true; hits = [...new Set(full.flatMap((l) => l.idx))]; detail = full.map(lineLabel).join(', '); }
        } else if (pattern === 'corners') {
            if (done(corners)) { win = true; hits = corners; detail = 'ครบ 4 มุม'; }
        } else if (pattern === 'x') {
            const d = L.filter((l) => l.kind === 'diag');
            if (d.every((l) => done(l.idx))) { win = true; hits = [...new Set(d.flatMap((l) => l.idx))]; detail = 'ครบรูปตัว X'; }
        } else if (pattern === 'full') {
            if (marked.every(Boolean)) { win = true; hits = marked.map((_, i) => i); detail = 'ครบทุกช่อง'; }
        }
        // ยังขาดอีกกี่ช่อง (ใกล้ชนะที่สุด) — ใช้แสดงผลเมื่อยังไม่ชนะ
        let missing = 0;
        if (!win) {
            const left = (idx) => idx.filter((i) => !marked[i]).length;
            if (pattern === 'line') missing = Math.min(...L.map((l) => left(l.idx)));
            else if (pattern === 'two') { const s = L.map((l) => left(l.idx)).sort((a, b) => a - b); missing = s[0] + s[1]; }
            else if (pattern === 'corners') missing = left(corners);
            else if (pattern === 'x') missing = left([...new Set(L.filter((l) => l.kind === 'diag').flatMap((l) => l.idx))]);
            else missing = marked.filter((m) => !m).length;
        }
        return { win, marked, hits, detail, missing, lines: full.length };
    }

    /* หาการ์ดที่ชนะทั้งหมดในเกม (สำหรับแสดง "การ์ดที่ควรชนะแล้ว") */
    function winners(cards, calledSet, pattern, size) {
        return cards.filter((c) => check(c, calledSet, pattern, size).win).map((c) => c.no);
    }

    /* ตรวจคำซ้ำในชุด (คำบนการ์ดต้องไม่ซ้ำกัน ไม่เช่นนั้นผู้เล่นจะสับสน) */
    function duplicates(items) {
        const seen = new Map(), dup = new Set();
        items.forEach((it) => {
            const k = String(it.a || '').replace(/\s+/g, ' ').trim().toLowerCase();
            if (!k) return;
            if (seen.has(k)) { dup.add(k); } else seen.set(k, it.id);
        });
        return [...dup];
    }

    return { FREE, SIZES, PATTERNS, rng, shuffle, newSeed, freeIndex, cellsNeeded, generate, lines, lineLabel, check, winners, duplicates };
});
