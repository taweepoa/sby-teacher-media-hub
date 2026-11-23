/* =====================================================================
   เครื่องมือสุ่ม (ไม่ขึ้นกับหน้าจอ — ทดสอบใน Node ได้ที่ dev/test-engine.js)
   - เรขาคณิตวงล้อ: ช่องของแต่ละคน, หาว่าเข็มชี้ช่องไหน, วางแผนการหมุนให้หยุดตรงคนที่สุ่มได้
     (สุ่มผู้ชนะด้วย RNG ก่อน แล้วค่อยคำนวณมุมหยุด → ภาพบนจอตรงกับผลจริงเสมอ)
   - จับกลุ่ม (คละเพศ, เศษ, หัวหน้ากลุ่ม) • สุ่มที่นั่ง (สลับชาย-หญิง) • สุ่มตัวเลข • ชื่อที่แสดง
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./rng.js'));
    else root.Engine = factory(root.RNG);
})(typeof self !== 'undefined' ? self : this, function (RNG) {
    'use strict';

    const TAU = Math.PI * 2;
    const norm = (a) => ((a % TAU) + TAU) % TAU;

    /* ---------- ชื่อที่แสดง ---------- */
    const MALE = ['ด.ช.', 'เด็กชาย', 'นาย', 'Mr.'];
    const FEMALE = ['ด.ญ.', 'เด็กหญิง', 'นางสาว', 'น.ส.', 'นาง', 'Miss', 'Mrs.', 'Ms.'];
    function genderOf(prefix) {
        const p = String(prefix || '').trim();
        if (MALE.includes(p)) return 'm';
        if (FEMALE.includes(p)) return 'f';
        return '';
    }
    function fullName(s) {
        if (!s) return '';
        return `${s.prefix || ''}${s.firstName || ''}${s.lastName ? ` ${s.lastName}` : ''}`.trim();
    }
    /** ข้อความบนวงล้อ/ผลการสุ่ม ตามที่ตั้งค่า: first | nick | full | no-first | no */
    function label(s, mode) {
        if (!s) return '';
        const first = s.firstName || s.lastName || '';
        const no = s.no !== '' && s.no != null ? String(s.no) : '';
        switch (mode) {
            case 'nick': return s.nick || first;
            case 'full': return `${s.firstName || ''}${s.lastName ? ` ${s.lastName}` : ''}`.trim() || first;
            case 'no': return no || first;
            case 'no-first': return no ? `${no}. ${first}` : first;
            default: return first;
        }
    }
    /** สำเนาข้อมูลคน ณ เวลาที่สุ่ม (เก็บในประวัติ ลบรายชื่อภายหลังประวัติก็ยังอ่านได้) */
    function snap(s) {
        return {
            id: s.id,
            no: s.no ?? '',
            code: s.code || '',
            name: fullName(s),
            first: s.firstName || '',
            last: s.lastName || '',
            nick: s.nick || '',
            gender: s.gender || genderOf(s.prefix),
        };
    }

    /* ---------- วงล้อ ---------- */
    /**
     * ช่องบนวงล้อ: มุมเริ่ม 0 (ทิศขวา) วนตามเข็มนาฬิกา (แกน y ของ canvas ชี้ลง)
     * useWeight = true → ขนาดช่องเท่ากับโอกาสจริง (น้ำหนัก ÷ น้ำหนักรวม)
     */
    function segments(items, useWeight) {
        const ws = items.map((it) => (useWeight ? Math.max(0, Number(it.weight) || 0) : 1));
        const total = ws.reduce((a, b) => a + b, 0);
        const out = [];
        let acc = 0;
        items.forEach((it, i) => {
            if (!(ws[i] > 0)) return;
            const start = (acc / total) * TAU;
            acc += ws[i];
            const end = i === items.length - 1 || acc >= total ? TAU : (acc / total) * TAU;
            out.push({ item: it, index: out.length, weight: ws[i], start, end });
        });
        if (out.length) out[out.length - 1].end = TAU;
        return out;
    }

    /** หาช่องที่มีมุม a (0..2π) — ค้นหาแบบแบ่งครึ่ง */
    function indexAt(segs, a) {
        const x = norm(a);
        let lo = 0;
        let hi = segs.length - 1;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (x < segs[mid].end) hi = mid; else lo = mid + 1;
        }
        return lo;
    }

    /** มุมบนวงล้อ (ในพิกัดของวงล้อ) ที่อยู่ใต้เข็ม เมื่อวงล้อหมุนไป theta และเข็มอยู่ที่มุม pointer */
    function pointerLocal(theta, pointer) {
        return norm((pointer || 0) - theta);
    }

    /**
     * วางแผนการหมุน: สุ่มผู้ชนะก่อน (ยุติธรรมตามน้ำหนัก) แล้วคืนมุมหยุดที่เข็มตกในช่องของผู้ชนะ
     * ตำแหน่งในช่องสุ่มด้วย แต่เว้นขอบ 12% กันภาพดูเหมือนก้ำกึ่ง
     */
    function planSpin(segs, theta, opts) {
        const o = Object.assign({ pointer: 0, turns: 6, winner: null }, opts || {});
        const idx = o.winner != null ? o.winner : RNG.pickWeighted(segs.map((s) => s.weight));
        const seg = segs[idx];
        const width = seg.end - seg.start;
        const margin = Math.min(0.12, 0.45);
        const a = seg.start + width * (margin + RNG.random() * (1 - 2 * margin));
        // ต้องการให้ pointerLocal(target) = a  →  target ≡ pointer - a (mod 2π)
        const delta = norm(o.pointer - a - theta);
        const target = theta + Math.max(1, Math.round(o.turns)) * TAU + delta;
        return { index: idx, target, landAngle: a };
    }

    /* ---------- เส้นโค้งความเร็ว (cubic-bezier แบบ CSS) ---------- */
    function cubicBezier(x1, y1, x2, y2) {
        const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
        const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
        const sx = (t) => ((ax * t + bx) * t + cx) * t;
        const sy = (t) => ((ay * t + by) * t + cy) * t;
        const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
        return (x) => {
            if (x <= 0) return 0;
            if (x >= 1) return 1;
            let t = x;
            for (let i = 0; i < 8; i += 1) {
                const e = sx(t) - x;
                if (Math.abs(e) < 1e-7) break;
                const d = dx(t);
                if (Math.abs(d) < 1e-6) break;
                t -= e / d;
            }
            if (t < 0 || t > 1 || Math.abs(sx(t) - x) > 1e-5) {
                // สำรอง: แบ่งครึ่ง
                let lo = 0, hi = 1;
                t = x;
                for (let i = 0; i < 40; i += 1) {
                    const v = sx(t);
                    if (Math.abs(v - x) < 1e-7) break;
                    if (v < x) lo = t; else hi = t;
                    t = (lo + hi) / 2;
                }
            }
            return sy(t);
        };
    }
    /* ออกตัวนุ่ม ไม่กระชาก แล้วค่อย ๆ ช้าลงยาว ๆ ช่วงท้าย (ลุ้น) */
    const spinEase = cubicBezier(0.16, 0, 0.06, 1);

    /* ---------- จับกลุ่ม ---------- */
    /**
     * คำนวณจำนวนกลุ่ม
     * mode 'count' → value กลุ่ม  |  mode 'size' → กลุ่มละ value คน (leftover 'spread' = เศษกระจายเข้ากลุ่มเดิม, 'new' = เศษตั้งกลุ่มใหม่)
     */
    function groupCount(n, mode, value, leftover) {
        const v = Math.max(1, Math.floor(Number(value) || 1));
        if (!n) return 0;
        if (mode === 'size') {
            if (v >= n) return 1;
            return leftover === 'new' ? Math.ceil(n / v) : Math.max(1, Math.floor(n / v));
        }
        return Math.min(v, n);
    }

    /** ขนาดกลุ่ม เช่น 35 คน 8 กลุ่ม → "4–5 คน" */
    function sizeText(n, g) {
        if (!g) return '-';
        const lo = Math.floor(n / g);
        const hi = Math.ceil(n / g);
        return lo === hi ? `${lo} คน` : `${lo}–${hi} คน`;
    }

    /**
     * สุ่มจับกลุ่ม: people = [{id, gender, ...}]
     * opts: { mode, value, leftover, mixGender, leaders }
     * คืน [{ no, members: [person], leaderId }]
     * วิธี: สับแต่ละเพศแยกกัน แล้วแจกวนทีละกลุ่มต่อเนื่องกัน (ชายก่อน หญิงต่อจากตำแหน่งเดิม)
     *       → ขนาดกลุ่มต่างกันไม่เกิน 1 คน และจำนวนชาย/หญิงในแต่ละกลุ่มต่างกันไม่เกิน 1 คน
     */
    function makeGroups(people, opts) {
        const o = Object.assign({ mode: 'count', value: 4, leftover: 'spread', mixGender: true, leaders: false }, opts || {});
        const n = people.length;
        const g = groupCount(n, o.mode, o.value, o.leftover);
        if (!g) return [];
        let seq;
        if (o.mixGender) {
            const m = RNG.shuffle(people.filter((p) => p.gender === 'm'));
            const f = RNG.shuffle(people.filter((p) => p.gender === 'f'));
            const x = RNG.shuffle(people.filter((p) => p.gender !== 'm' && p.gender !== 'f'));
            // เพศที่มากกว่าแจกก่อน เพื่อให้เพศที่น้อยกว่ากระจายครบทุกกลุ่มต่อเนื่องกัน
            seq = m.length >= f.length ? m.concat(f, x) : f.concat(m, x);
        } else {
            seq = RNG.shuffle(people);
        }
        const groups = Array.from({ length: g }, (_, i) => ({ no: i + 1, members: [], leaderId: null }));
        seq.forEach((p, k) => groups[k % g].members.push(p));
        groups.forEach((gr) => {
            // สลับลำดับในกลุ่ม (ไม่ให้ชายอยู่หน้าเสมอ)
            gr.members = RNG.shuffle(gr.members);
            if (o.leaders && gr.members.length) {
                const li = RNG.randInt(gr.members.length);
                const leader = gr.members.splice(li, 1)[0];
                gr.members.unshift(leader);
                gr.leaderId = leader.id;
            }
        });
        return groups;
    }

    /* ---------- สุ่มที่นั่ง ---------- */
    /**
     * people → ตาราง rows × cols (แถวที่ 0 = แถวหน้าใกล้กระดาน)
     * alternate = สลับชาย-หญิงแบบกระดานหมากรุกเท่าที่ทำได้ • ที่นั่งว่างอยู่ด้านหลังห้อง
     */
    function assignSeats(people, rows, cols, opts) {
        const o = Object.assign({ alternate: false }, opts || {});
        const total = rows * cols;
        const used = Math.min(total, people.length);
        const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
        const order = [];
        for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) order.push([r, c]);
        const seats = order.slice(0, used);
        if (!o.alternate) {
            const s = RNG.shuffle(people).slice(0, used);
            seats.forEach(([r, c], i) => { grid[r][c] = s[i]; });
            return { grid, overflow: people.length - used };
        }
        const m = RNG.shuffle(people.filter((p) => p.gender === 'm'));
        const f = RNG.shuffle(people.filter((p) => p.gender === 'f'));
        const x = RNG.shuffle(people.filter((p) => p.gender !== 'm' && p.gender !== 'f'));
        // เพศที่มากกว่าได้ช่อง (r+c) คู่ ซึ่งมีจำนวนมากกว่าหรือเท่ากัน
        const [a, b] = m.length >= f.length ? [m, f] : [f, m];
        seats.forEach(([r, c]) => {
            const want = (r + c) % 2 === 0 ? a : b;
            const alt = want === a ? b : a;
            grid[r][c] = want.length ? want.pop() : (alt.length ? alt.pop() : x.pop());
        });
        // คนที่ไม่ระบุเพศ (ถ้ายังเหลือที่) — กรณีช่องเต็มด้วยชาย/หญิงก่อนแล้ว คนที่เหลือคือคนเกิน
        const left = a.concat(b, x);
        return { grid, overflow: left.length };
    }

    /* ---------- สุ่มตัวเลข ---------- */
    /**
     * สุ่ม count ตัวในช่วง [min, max]  unique = ไม่ซ้ำกันเอง และไม่ซ้ำกับ exclude
     * คืน { ok, numbers, error }
     */
    function drawNumbers(min, max, count, unique, exclude) {
        const lo = Math.ceil(Math.min(min, max));
        const hi = Math.floor(Math.max(min, max));
        const span = hi - lo + 1;
        const k = Math.max(1, Math.floor(count));
        if (!Number.isFinite(span) || span < 1) return { ok: false, error: 'ช่วงตัวเลขไม่ถูกต้อง' };
        if (span > 1e9) return { ok: false, error: 'ช่วงตัวเลขกว้างเกินไป (ไม่เกิน 1,000,000,000 ตัว)' };
        if (!unique) return { ok: true, numbers: Array.from({ length: k }, () => lo + RNG.randInt(span)) };
        const ex = new Set((exclude || []).filter((v) => v >= lo && v <= hi));
        const avail = span - ex.size;
        if (k > avail) return { ok: false, error: avail ? `เหลือตัวเลขที่ยังไม่ถูกสุ่มเพียง ${avail.toLocaleString()} ตัว` : 'สุ่มครบทุกตัวเลขในช่วงนี้แล้ว' };
        const got = [];
        if (avail <= 200000 && avail / span < 0.5) {
            // เหลือน้อย: สร้างรายการตัวที่เหลือแล้วเลือก (เร็วและไม่วนนาน)
            const rest = [];
            for (let v = lo; v <= hi; v += 1) if (!ex.has(v)) rest.push(v);
            return { ok: true, numbers: RNG.sample(rest, k) };
        }
        while (got.length < k) {
            const v = lo + RNG.randInt(span);
            if (ex.has(v)) continue;
            ex.add(v);
            got.push(v);
        }
        return { ok: true, numbers: got };
    }

    return {
        TAU, norm, genderOf, fullName, label, snap,
        segments, indexAt, pointerLocal, planSpin, cubicBezier, spinEase,
        groupCount, sizeText, makeGroups, assignSeats, drawNumbers,
    };
});
