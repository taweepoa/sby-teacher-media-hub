/* =====================================================================
   แกนนาฬิกาจับเวลา (ไม่ขึ้นกับหน้าจอ) — เขียนแบบ UMD ใช้ได้ทั้งเบราว์เซอร์และ Node (dev/test-engine.js)

   หลักสำคัญ: เวลาทุกค่า "คำนวณจากนาฬิกาจริง" (เวลาที่เริ่ม + เวลาปัจจุบัน) ไม่ได้นับจำนวนรอบ setInterval
   จึงแม่นยำแม้แท็บอยู่เบื้องหลัง เครื่องช้า หรือหน้าเว็บถูกพักชั่วคราว

   state (เก็บเป็น JSON ได้ — รีเฟรชหน้าแล้วจับเวลาต่อได้):
   {
     kind: 'countdown' | 'stopwatch',
     title: ชื่อชุด/งาน, seqId: รหัสชุดหลายช่วงเวลา (ถ้ามี),
     segments: [{ label, ms, color }],   // ถอยหลัง: 1 ช่วง = ถอยหลังธรรมดา, หลายช่วง = ชุดหลายช่วงเวลา
     auto: true,                          // หมดช่วงแล้วไปช่วงถัดไปเอง (false = รอครูกด "ถัดไป")
     index: 0,                            // ช่วงปัจจุบัน
     acc: 0,                              // เวลาที่ใช้ไปแล้วในช่วงนี้ (ms) ก่อนการกดเริ่มครั้งล่าสุด
     startedAt: null,                     // เวลาจริง (epoch ms) ที่กดเริ่มครั้งล่าสุด — null = หยุดอยู่
     laps: [],                            // จับเวลา: เวลารวม ณ ตอนกดบันทึกรอบ (ms)
     rev: 0                               // เลขรุ่น เปลี่ยนทุกครั้งที่ตั้งค่าใหม่ (ใช้ตั้งชื่อเสียงเตือนไม่ให้ซ้ำ)
   }
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.TimerCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const MAX_MS = (99 * 3600 + 59 * 60 + 59) * 1000;
    const clampMs = (ms) => Math.max(0, Math.min(MAX_MS, Math.round(Number(ms) || 0)));

    function countdown(ms, opts) {
        const o = opts || {};
        return {
            kind: 'countdown',
            title: o.title || '',
            seqId: o.seqId || null,
            segments: [{ label: o.label || '', ms: clampMs(ms), color: o.color || '' }],
            auto: true,
            index: 0,
            acc: 0,
            startedAt: null,
            laps: [],
            rev: (o.rev || 0) + 1,
        };
    }

    function sequence(seq, opts) {
        const o = opts || {};
        const segs = (seq.segments || []).filter((s) => s && s.sec > 0).map((s) => ({ label: s.label || '', ms: clampMs(s.sec * 1000), color: s.color || '' }));
        if (!segs.length) segs.push({ label: '', ms: 60000, color: '' });
        return {
            kind: 'countdown',
            title: seq.name || '',
            seqId: seq.id || null,
            segments: segs,
            auto: seq.auto !== false,
            index: 0,
            acc: 0,
            startedAt: null,
            laps: [],
            rev: (o.rev || 0) + 1,
        };
    }

    function stopwatch(opts) {
        const o = opts || {};
        return { kind: 'stopwatch', title: '', seqId: null, segments: [], auto: true, index: 0, acc: 0, startedAt: null, laps: [], rev: (o.rev || 0) + 1 };
    }

    /* ตรวจ/ซ่อมค่าที่อ่านจาก localStorage */
    function normalize(raw, kind) {
        if (!raw || typeof raw !== 'object' || raw.kind !== kind) return kind === 'stopwatch' ? stopwatch() : countdown(5 * 60000);
        const s = Object.assign(kind === 'stopwatch' ? stopwatch() : countdown(0), raw);
        s.segments = (Array.isArray(s.segments) ? s.segments : []).filter((x) => x && typeof x === 'object')
            .map((x) => ({ label: String(x.label || ''), ms: clampMs(x.ms), color: String(x.color || '') }));
        if (kind === 'countdown' && !s.segments.length) s.segments = [{ label: '', ms: 5 * 60000, color: '' }];
        s.index = Math.max(0, Math.min(s.segments.length - 1, Math.floor(Number(s.index) || 0)));
        s.acc = Math.max(0, Number(s.acc) || 0);
        s.startedAt = Number.isFinite(s.startedAt) ? s.startedAt : null;
        s.laps = (Array.isArray(s.laps) ? s.laps : []).map(Number).filter(Number.isFinite);
        s.auto = s.auto !== false;
        s.rev = Number(s.rev) || 1;
        return s;
    }

    const isRunning = (s) => s.startedAt != null;
    const elapsedIn = (s, now) => s.acc + (isRunning(s) ? Math.max(0, now - s.startedAt) : 0);
    const isLast = (s) => s.index >= s.segments.length - 1;

    /* เลื่อนไปช่วงถัดไปอัตโนมัติ (กรณีแท็บถูกพักนานจนข้ามหลายช่วง จะเลื่อนครบทุกช่วงในครั้งเดียว)
       คืนรายการช่วงที่จบไป [{ index, at }] — at = เวลาจริงที่ช่วงนั้นจบพอดี */
    function settle(s, now) {
        const ended = [];
        if (s.kind !== 'countdown' || !s.auto) return ended;
        let guard = 0;
        while (!isLast(s) && guard < 1000) {
            guard += 1;
            const seg = s.segments[s.index];
            const el = elapsedIn(s, now);
            if (el < seg.ms) break;
            const over = el - seg.ms;
            ended.push({ index: s.index, at: now - over });
            s.index += 1;
            s.acc = over;
            if (isRunning(s)) { s.acc = 0; s.startedAt = now - over; }
        }
        return ended;
    }

    /* ภาพรวม ณ เวลา now (ไม่แก้ state) */
    function snapshot(s, now) {
        const running = isRunning(s);
        if (s.kind === 'stopwatch') {
            const total = elapsedIn(s, now);
            const lastLap = s.laps.length ? s.laps[s.laps.length - 1] : 0;
            return { kind: 'stopwatch', running, elapsed: total, lap: total - lastLap, laps: s.laps.slice(), started: running || total > 0 };
        }
        const seg = s.segments[s.index] || { ms: 0, label: '' };
        const el = elapsedIn(s, now);
        const remaining = seg.ms - el;
        const totalMs = s.segments.reduce((a, x) => a + x.ms, 0);
        const before = s.segments.slice(0, s.index).reduce((a, x) => a + x.ms, 0);
        const after = s.segments.slice(s.index + 1).reduce((a, x) => a + x.ms, 0);
        const segDone = remaining <= 0;
        const finished = segDone && isLast(s);
        return {
            kind: 'countdown',
            running,
            index: s.index,
            count: s.segments.length,
            label: seg.label,
            color: seg.color,
            segMs: seg.ms,
            remaining: Math.max(0, remaining),
            overtime: segDone ? -remaining : 0,
            segProgress: seg.ms > 0 ? Math.min(1, el / seg.ms) : 1,
            totalMs,
            totalRemaining: Math.max(0, remaining) + after,
            totalProgress: totalMs > 0 ? Math.min(1, (before + Math.min(el, seg.ms)) / totalMs) : 1,
            segDone,
            finished,
            waiting: segDone && !finished,                // รอครูกด "ถัดไป"
            started: running || el > 0 || s.index > 0,
            endsAt: running ? now + Math.max(0, remaining) + (s.auto ? after : 0) : null,
            next: !isLast(s) ? s.segments[s.index + 1] : null,
        };
    }

    function start(s, now) {
        if (isRunning(s)) return s;
        if (s.kind === 'countdown') {
            const snap = snapshot(s, now);
            if (snap.finished) return s;                   // จบแล้ว ต้องรีเซ็ตก่อน
            if (snap.segMs <= 0) return s;
        }
        s.startedAt = now;
        return s;
    }

    function pause(s, now) {
        if (!isRunning(s)) return s;
        s.acc = elapsedIn(s, now);
        s.startedAt = null;
        return s;
    }

    function reset(s) {
        s.index = 0;
        s.acc = 0;
        s.startedAt = null;
        s.laps = [];
        s.rev += 1;
        return s;
    }

    /* เพิ่ม/ลดเวลาของช่วงปัจจุบัน (เช่น +1 นาที ระหว่างทำกิจกรรม) */
    function adjust(s, deltaMs, now) {
        if (s.kind !== 'countdown') return s;
        const seg = s.segments[s.index];
        const el = elapsedIn(s, now);
        if (deltaMs > 0 && el > seg.ms) {
            // หมดเวลาแล้ว (กำลังนับเกิน): +1 นาที = ได้เวลาเพิ่มอีก 1 นาทีนับจากตอนนี้
            seg.ms = clampMs(el + deltaMs);
        } else {
            seg.ms = clampMs(Math.max(seg.ms + deltaMs, Math.min(el + 1000, seg.ms)));
        }
        s.rev += 1;
        return s;
    }

    /* ตั้งเวลาที่เหลือของช่วงปัจจุบันเป็นค่าที่กำหนด */
    function setRemaining(s, remainMs, now) {
        if (s.kind !== 'countdown') return s;
        const seg = s.segments[s.index];
        seg.ms = clampMs(elapsedIn(s, now) + remainMs);
        s.rev += 1;
        return s;
    }

    function goTo(s, index, now) {
        if (s.kind !== 'countdown') return s;
        const i = Math.max(0, Math.min(s.segments.length - 1, index));
        const wasRunning = isRunning(s);
        s.index = i;
        s.acc = 0;
        s.startedAt = wasRunning ? now : null;
        s.rev += 1;
        return s;
    }
    const next = (s, now) => goTo(s, s.index + 1, now);
    const prev = (s, now) => goTo(s, s.index - 1, now);

    function lap(s, now) {
        if (s.kind !== 'stopwatch') return s;
        const t = elapsedIn(s, now);
        if (t > 0 && (!s.laps.length || t > s.laps[s.laps.length - 1])) s.laps.push(t);
        return s;
    }

    /* จุดเตือนที่ต้องเกิด "ในอนาคต" สำหรับ state ปัจจุบัน — ใช้ตั้งเวลาเสียงล่วงหน้า
       opt: { warnMs, tickSec } → [{ key, due (epoch), type: 'warn'|'tick'|'segment'|'end', index, n }] */
    function marks(s, now, opt) {
        const o = Object.assign({ warnMs: 60000, tickSec: 0 }, opt || {});
        const out = [];
        if (s.kind !== 'countdown' || !isRunning(s)) return out;
        let t = now + (s.segments[s.index].ms - elapsedIn(s, now));   // เวลาจริงที่ช่วงปัจจุบันจบ
        for (let i = s.index; i < s.segments.length; i += 1) {
            const seg = s.segments[i];
            if (i > s.index) t += seg.ms;
            const last = i === s.segments.length - 1;
            const base = `${s.rev}:${i}:${seg.ms}`;
            if (o.warnMs > 0 && seg.ms > o.warnMs + 2000) out.push({ key: `${base}:warn`, due: t - o.warnMs, type: 'warn', index: i });
            for (let k = Math.min(o.tickSec, Math.floor(seg.ms / 1000) - 1); k >= 1; k -= 1) {
                out.push({ key: `${base}:tick${k}`, due: t - k * 1000, type: 'tick', index: i, n: k });
            }
            out.push({ key: `${base}:end`, due: t, type: last ? 'end' : 'segment', index: i });
            if (!s.auto) break;                              // แบบรอครูกด: รู้จุดจบแค่ช่วงปัจจุบัน
        }
        return out.filter((m) => m.due > now);
    }

    /* แสดงเวลา: ถอยหลังปัดขึ้น (เริ่ม 05:00 จบ 00:00 พอดี) • จับเวลาปัดลง */
    function fmt(ms, opt) {
        const o = opt || {};
        const totalSec = o.ceil ? Math.ceil(Math.max(0, ms) / 1000 - 1e-9) : Math.floor(Math.max(0, ms) / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const sec = totalSec % 60;
        const p = (n) => String(n).padStart(2, '0');
        let txt = h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
        if (o.tenths) txt += `.${Math.floor((Math.max(0, ms) % 1000) / 100)}`;
        return txt;
    }

    /* "5 นาที 30 วินาที" */
    function fmtWords(ms) {
        const totalSec = Math.round(ms / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        const parts = [];
        if (h) parts.push(`${h} ชั่วโมง`);
        if (m) parts.push(`${m} นาที`);
        if (s || !parts.length) parts.push(`${s} วินาที`);
        return parts.join(' ');
    }

    /* อ่านค่าที่ผู้ใช้พิมพ์: "5" = 5 นาที, "1:30" = 1 นาที 30 วินาที, "1:00:00" = 1 ชั่วโมง, "90s" = 90 วินาที */
    function parseInput(text) {
        const t = String(text || '').trim().replace(/[๐-๙]/g, (d) => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d))).replace(/\s+/g, '');
        if (!t) return null;
        let m = /^(\d+(?:\.\d+)?)(s|วิ|วินาที)$/i.exec(t);
        if (m) return clampMs(parseFloat(m[1]) * 1000) || null;
        m = /^(\d+(?:\.\d+)?)(m|น|นาที)?$/i.exec(t);
        if (m) return clampMs(parseFloat(m[1]) * 60000) || null;
        m = /^(\d{1,3})[:.](\d{1,2})$/.exec(t);
        if (m && +m[2] < 60) return clampMs((+m[1] * 60 + +m[2]) * 1000) || null;
        m = /^(\d{1,2})[:.](\d{1,2})[:.](\d{1,2})$/.exec(t);
        if (m && +m[2] < 60 && +m[3] < 60) return clampMs((+m[1] * 3600 + +m[2] * 60 + +m[3]) * 1000) || null;
        return null;
    }

    return {
        MAX_MS, countdown, sequence, stopwatch, normalize, settle, snapshot, start, pause, reset, adjust, setRemaining,
        goTo, next, prev, lap, marks, fmt, fmtWords, parseInput, isRunning, elapsedIn,
    };
});
