/* =====================================================================
   ตัวสุ่มที่ยุติธรรม (ใช้ได้ทั้งเบราว์เซอร์และ Node)
   - ใช้ crypto.getRandomValues (ตัวสุ่มของระบบปฏิบัติการ) ไม่ใช้ Math.random
   - randInt ใช้ "rejection sampling" ตัดส่วนเกินทิ้ง จึงไม่มีความลำเอียงจากการหารเอาเศษ (modulo bias)
   - สุ่มแบบถ่วงน้ำหนัก: น้ำหนักเป็นจำนวนเต็ม → สุ่มจำนวนเต็มในช่วงผลรวมน้ำหนักตรง ๆ (แม่นยำ 100%)
   - สับลำดับด้วย Fisher–Yates (ทุกลำดับมีโอกาสเท่ากัน)
   - มีสถิติไคสแควร์ไว้ตรวจความยุติธรรม (ใช้ทั้งในหน้าจอ "ทดสอบความยุติธรรม" และ dev/test-engine.js)
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.RNG = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const G = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this);
    const CRYPTO = G && G.crypto && typeof G.crypto.getRandomValues === 'function' ? G.crypto : null;
    const TWO32 = 4294967296;

    /* ขอค่าสุ่มทีละชุดใหญ่ (เร็วกว่าขอทีละตัวหลายเท่า) */
    const BUF = new Uint32Array(2048);
    let pos = BUF.length;
    function fill() {
        if (CRYPTO) {
            CRYPTO.getRandomValues(BUF);
        } else {
            // กรณีเบราว์เซอร์เก่ามากที่ไม่มี crypto (แทบไม่มีแล้ว) — ใช้สำรองเท่านั้น
            for (let i = 0; i < BUF.length; i += 1) BUF[i] = Math.floor(Math.random() * TWO32) >>> 0;
        }
        pos = 0;
    }
    function u32() {
        if (pos >= BUF.length) fill();
        return BUF[pos++];
    }

    /** จำนวนเต็มสุ่ม 0 ≤ x < n (n ≤ 2^32) แบบไม่ลำเอียง */
    function randInt(n) {
        n = Math.floor(n);
        if (!(n > 0)) throw new Error('randInt: n ต้องมากกว่า 0');
        if (n === 1) return 0;
        if (n > TWO32) {
            // ช่วงใหญ่มาก: ใช้ทศนิยม 53 บิต (ความลำเอียง < 1 ใน 2^20 สำหรับ n ≤ 2^33 — ไม่ได้ใช้ในงานจริงของระบบ)
            return Math.floor(random() * n);
        }
        const limit = TWO32 - (TWO32 % n); // ค่าที่ ≥ limit จะทำให้บางผลลัพธ์มีโอกาสมากกว่า จึงทิ้งแล้วสุ่มใหม่
        let x;
        do { x = u32(); } while (x >= limit);
        return x % n;
    }

    /** ทศนิยมสุ่ม 0 ≤ x < 1 ความละเอียด 53 บิต */
    function random() {
        const a = u32() >>> 5;
        const b = u32() >>> 6;
        return (a * 67108864 + b) / 9007199254740992;
    }

    /** จำนวนเต็มสุ่มในช่วง [min, max] รวมปลายทั้งสองข้าง */
    function range(min, max) {
        return min + randInt(max - min + 1);
    }

    /** เลือกตำแหน่งตามน้ำหนัก (weights ≥ 0) — คืน -1 ถ้าน้ำหนักรวมเป็น 0 */
    function pickWeighted(weights) {
        let total = 0;
        let allInt = true;
        for (let i = 0; i < weights.length; i += 1) {
            const w = weights[i] > 0 ? weights[i] : 0;
            total += w;
            if (w !== Math.floor(w)) allInt = false;
        }
        if (!(total > 0)) return -1;
        const r = allInt && total <= TWO32 ? randInt(total) : random() * total;
        let acc = 0;
        for (let i = 0; i < weights.length; i += 1) {
            const w = weights[i] > 0 ? weights[i] : 0;
            acc += w;
            if (r < acc) return i;
        }
        // กันเศษทศนิยม: คืนตัวสุดท้ายที่มีน้ำหนัก
        for (let i = weights.length - 1; i >= 0; i -= 1) if (weights[i] > 0) return i;
        return -1;
    }

    /** สุ่ม 1 รายการจากอาร์เรย์ */
    function pick(arr) {
        return arr.length ? arr[randInt(arr.length)] : undefined;
    }

    /** สับลำดับแบบ Fisher–Yates (คืนอาร์เรย์ใหม่ ไม่แก้ของเดิม) */
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i -= 1) {
            const j = randInt(i + 1);
            const t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    /** สุ่มเลือก k รายการไม่ซ้ำ (Fisher–Yates บางส่วน) */
    function sample(arr, k) {
        const a = arr.slice();
        const n = Math.min(k, a.length);
        for (let i = 0; i < n; i += 1) {
            const j = i + randInt(a.length - i);
            const t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a.slice(0, n);
    }

    /* ---------- สถิติ: ตรวจความยุติธรรม ---------- */
    /** ฟังก์ชันการแจกแจงสะสมของการแจกแจงปกติมาตรฐาน (ความคลาดเคลื่อน < 1.5e-7) */
    function normCdf(z) {
        const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
        const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
        return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
    }

    /** ค่า p ของไคสแควร์ (ประมาณด้วย Wilson–Hilferty — แม่นพอสำหรับ df ≥ 3) */
    function chiSquareP(chi2, df) {
        if (df <= 0) return 1;
        const k = df;
        const z = (Math.pow(chi2 / k, 1 / 3) - (1 - 2 / (9 * k))) / Math.sqrt(2 / (9 * k));
        return 1 - normCdf(z);
    }

    /** ทดสอบไคสแควร์: observed = จำนวนครั้งที่ได้จริง, expected = จำนวนที่ควรได้ */
    function chiSquare(observed, expected) {
        let chi2 = 0;
        let df = -1;
        for (let i = 0; i < observed.length; i += 1) {
            if (!(expected[i] > 0)) continue;
            const d = observed[i] - expected[i];
            chi2 += (d * d) / expected[i];
            df += 1;
        }
        return { chi2, df, p: chiSquareP(chi2, df) };
    }

    return {
        secure: !!CRYPTO,
        u32, randInt, random, range, pick, pickWeighted, shuffle, sample,
        normCdf, chiSquareP, chiSquare,
    };
});
