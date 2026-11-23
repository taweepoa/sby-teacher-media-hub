/* =====================================================================
   แกนคำนวณแต้ม (UMD — ใช้ทั้งเบราว์เซอร์และ Node: dev/build-docs.js)
   โครงข้อมูล:
     classes   [{id, name, groups:[{id,name,members:[sid]}]}]
     students  [{id, classId, no, prefix, firstName, lastName, nick, avatar}]
     skills    [{id, name, icon, points, kind:'pos'|'neg'}]   points เป็นบวกเสมอ (ลบ = หักแต้ม)
     rewards   [{id, name, icon, cost}]
     events    [{id, t, sid, skillId, pts, note}]             pts มีเครื่องหมาย (+/−)
     redeems   [{id, t, sid, rewardId, cost}]
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Core = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const AVATAR_COUNT = 24;
    const COLORS = ['#F59E0B', '#F97316', '#EF4444', '#EC4899', '#A855F7', '#6366F1', '#0EA5E9', '#14B8A6', '#22C55E', '#84CC16', '#EAB308', '#F43F5E'];

    /* ชุดทักษะสำเร็จรูป */
    const PRESETS = {
        basic: {
            name: 'ชุดมาตรฐาน (ทุกระดับชั้น)',
            pos: [['ช่วยเหลือเพื่อน', 'fa-handshake-angle', 1], ['ตั้งใจเรียน', 'fa-book-open-reader', 1], ['ส่งงานตรงเวลา', 'fa-clipboard-check', 1], ['ตอบคำถาม', 'fa-hand', 1], ['มีน้ำใจ', 'fa-heart', 1], ['ทำงานเป็นทีม', 'fa-people-group', 2], ['มีความคิดสร้างสรรค์', 'fa-lightbulb', 2], ['รักษาความสะอาด', 'fa-broom', 1]],
            neg: [['คุยเสียงดัง', 'fa-volume-high', 1], ['ไม่ส่งงาน', 'fa-file-circle-xmark', 1], ['มาสาย', 'fa-clock', 1], ['ไม่ตั้งใจเรียน', 'fa-face-meh', 1]],
        },
        primary: {
            name: 'ชุดประถมศึกษา',
            pos: [['นั่งเรียบร้อย', 'fa-chair', 1], ['ยกมือก่อนพูด', 'fa-hand', 1], ['แบ่งปันของ', 'fa-gift', 1], ['เก็บของเข้าที่', 'fa-box-archive', 1], ['พูดจาไพเราะ', 'fa-comment-dots', 1], ['อ่านหนังสือเก่ง', 'fa-book', 2], ['ช่วยครู', 'fa-hands-holding', 1], ['ล้างมือก่อนทานข้าว', 'fa-hands-bubbles', 1]],
            neg: [['ลุกเดินเล่น', 'fa-person-walking', 1], ['แกล้งเพื่อน', 'fa-hand-fist', 1], ['ไม่ทำการบ้าน', 'fa-file-circle-xmark', 1]],
        },
        computer: {
            name: 'ชุดห้องคอมพิวเตอร์',
            pos: [['ปิดเครื่องถูกวิธี', 'fa-power-off', 1], ['ช่วยเพื่อนแก้ปัญหา', 'fa-screwdriver-wrench', 2], ['เขียนโปรแกรมสำเร็จ', 'fa-code', 2], ['จัดเก้าอี้เรียบร้อย', 'fa-chair', 1], ['ส่งงานออนไลน์ตรงเวลา', 'fa-cloud-arrow-up', 1], ['ใช้อินเทอร์เน็ตปลอดภัย', 'fa-shield-halved', 1]],
            neg: [['เล่นเกมในคาบ', 'fa-gamepad', 2], ['นำอาหารเข้าห้อง', 'fa-burger', 1], ['ไม่ส่งงาน', 'fa-file-circle-xmark', 1]],
        },
    };

    const REWARD_PRESET = [['ดาวเกียรติยศ', 'fa-star', 5], ['เลือกที่นั่งเองได้ 1 วัน', 'fa-chair', 10], ['ผู้ช่วยครู 1 วัน', 'fa-user-tie', 15], ['ยกเว้นการบ้าน 1 ครั้ง', 'fa-file-circle-check', 20], ['เลือกเพลงในคาบ', 'fa-music', 8], ['สติกเกอร์พิเศษ', 'fa-note-sticky', 3]];

    const fullName = (s) => (s ? `${s.prefix || ''}${s.firstName || ''}${s.lastName ? ` ${s.lastName}` : ''}`.trim() : '');
    const showName = (s) => (s ? (s.nick || s.firstName || '') : '');

    /* ---------- ช่วงเวลา ---------- */
    function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
    function weekRange(ref) {
        const d = startOfDay(ref || new Date());
        const dow = (d.getDay() + 6) % 7; // จันทร์ = 0
        const from = new Date(d); from.setDate(d.getDate() - dow);
        const to = new Date(from); to.setDate(from.getDate() + 7);
        return { from, to };
    }
    function monthRange(ref) {
        const d = ref ? new Date(ref) : new Date();
        return { from: new Date(d.getFullYear(), d.getMonth(), 1), to: new Date(d.getFullYear(), d.getMonth() + 1, 1) };
    }
    function periodRange(kind, ref) {
        if (kind === 'week') return weekRange(ref);
        if (kind === 'month') return monthRange(ref);
        return { from: new Date(2000, 0, 1), to: new Date(2999, 0, 1) };
    }
    const inRange = (iso, r) => { const t = new Date(iso); return t >= r.from && t < r.to; };

    /* ---------- สรุปแต้ม ---------- */
    function stats(data, sid, range) {
        const r = range || periodRange('all');
        let pos = 0, neg = 0, posCount = 0, negCount = 0, spent = 0;
        data.events.forEach((e) => {
            if (e.sid !== sid || !inRange(e.t, r)) return;
            if (e.pts >= 0) { pos += e.pts; posCount += 1; } else { neg += -e.pts; negCount += 1; }
        });
        data.redeems.forEach((x) => { if (x.sid === sid && inRange(x.t, r)) spent += x.cost; });
        return { pos, neg, net: pos - neg, posCount, negCount, spent };
    }
    /* แต้มคงเหลือ (ทั้งหมด − ที่แลกไป) */
    function balance(data, sid) {
        let b = 0;
        data.events.forEach((e) => { if (e.sid === sid) b += e.pts; });
        data.redeems.forEach((x) => { if (x.sid === sid) b -= x.cost; });
        return b;
    }
    function balances(data) {
        const m = new Map(data.students.map((s) => [s.id, 0]));
        data.events.forEach((e) => { if (m.has(e.sid)) m.set(e.sid, m.get(e.sid) + e.pts); });
        data.redeems.forEach((x) => { if (m.has(x.sid)) m.set(x.sid, m.get(x.sid) - x.cost); });
        return m;
    }
    const byNo = (a, b) => (Number(a.no) || 999) - (Number(b.no) || 999) || String(a.firstName).localeCompare(String(b.firstName), 'th');
    function classStudents(data, classId) { return data.students.filter((s) => s.classId === classId).sort(byNo); }

    /* กระดานผู้นำ: เรียงตามแต้มสุทธิในช่วงเวลา */
    function leaderboard(data, classId, range) {
        const list = classStudents(data, classId).map((s) => Object.assign({ s }, stats(data, s.id, range)));
        list.sort((a, b) => b.net - a.net || b.pos - a.pos || byNo(a.s, b.s));
        let rank = 0, last = null;
        list.forEach((x, i) => { if (x.net !== last) { rank = i + 1; last = x.net; } x.rank = rank; });
        return list;
    }

    /* แต้มแยกตามทักษะ */
    function skillBreakdown(data, filter, range) {
        const r = range || periodRange('all');
        const m = new Map();
        data.events.forEach((e) => {
            if (!filter(e) || !inRange(e.t, r)) return;
            const k = e.skillId || '_';
            const x = m.get(k) || { skillId: k, count: 0, pts: 0 };
            x.count += 1; x.pts += e.pts; m.set(k, x);
        });
        return [...m.values()].map((x) => Object.assign(x, { skill: data.skills.find((k) => k.id === x.skillId) || null }))
            .sort((a, b) => b.count - a.count);
    }

    /* แต้มสะสมรายวัน (สำหรับกราฟรายคน) */
    function dailySeries(data, sid, days, ref) {
        const end = startOfDay(ref || new Date());
        const labels = [], pos = [], neg = [], cum = [];
        const from = new Date(end); from.setDate(end.getDate() - days + 1);
        let running = 0;
        data.events.forEach((e) => { if (e.sid === sid && new Date(e.t) < from) running += e.pts; });
        data.redeems.forEach((x) => { if (x.sid === sid && new Date(x.t) < from) running -= x.cost; });
        for (let i = 0; i < days; i += 1) {
            const d0 = new Date(from); d0.setDate(from.getDate() + i);
            const d1 = new Date(d0); d1.setDate(d0.getDate() + 1);
            let p = 0, n = 0, sp = 0;
            data.events.forEach((e) => { if (e.sid === sid) { const t = new Date(e.t); if (t >= d0 && t < d1) { if (e.pts >= 0) p += e.pts; else n += -e.pts; } } });
            data.redeems.forEach((x) => { if (x.sid === sid) { const t = new Date(x.t); if (t >= d0 && t < d1) sp += x.cost; } });
            running += p - n - sp;
            labels.push(d0); pos.push(p); neg.push(n); cum.push(running);
        }
        return { labels, pos, neg, cum };
    }

    /* ดาวเด่นประจำสัปดาห์: แต้มบวกสูงสุดในสัปดาห์ (ต้องมีแต้มสุทธิ > 0) */
    function starsOfWeek(data, classId, ref, n) {
        const r = weekRange(ref);
        return leaderboard(data, classId, r).filter((x) => x.net > 0).slice(0, n || 3).map((x) => Object.assign(x, { range: r }));
    }

    /* สุ่มจับกลุ่ม: กระจายให้จำนวนเท่า ๆ กัน */
    function makeGroups(ids, count, rnd) {
        const r = rnd || Math.random;
        const a = ids.slice();
        for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        const groups = Array.from({ length: Math.max(1, count) }, () => []);
        a.forEach((id, i) => groups[i % groups.length].push(id));
        return groups;
    }

    return { AVATAR_COUNT, COLORS, PRESETS, REWARD_PRESET, fullName, showName, startOfDay, weekRange, monthRange, periodRange, inRange, stats, balance, balances, classStudents, leaderboard, skillBreakdown, dailySeries, starsOfWeek, makeGroups, byNo };
});
