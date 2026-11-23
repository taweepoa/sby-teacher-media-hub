/* =====================================================================
   ตารางคาบเรียน: คำนวณคาบปัจจุบัน/ถัดไปของวันนี้ และเวลาที่ต้องตีระฆัง
   ===================================================================== */
(function () {
    'use strict';

    /* เวลาจริง (epoch ms) ของ "HH:MM" ในวันเดียวกับ ref */
    function at(ref, hhmm) {
        const d = new Date(ref);
        const m = U.toMin(hhmm);
        d.setHours(Math.floor(m / 60), m % 60, 0, 0);
        return d.getTime();
    }

    /* สรุปวันนี้ ณ เวลา now (หรือวันที่ dayOverride สำหรับดูตัวอย่างวันอื่น) */
    function day(now, dayOverride) {
        const sc = Store.data.schedule;
        const d = new Date(now);
        const wd = dayOverride == null ? d.getDay() : dayOverride;
        const school = sc.days.includes(wd);
        const subj = sc.subjects[wd] || {};
        const list = sc.periods.map((p) => {
            const s = at(now, p.start);
            const e = at(now, p.end);
            return { p, start: s, end: e, subject: subj[p.id] || '', status: 'later' };
        });
        let current = null;
        let next = null;
        if (dayOverride == null || dayOverride === d.getDay()) {
            list.forEach((x) => {
                if (now >= x.end) x.status = 'past';
                else if (now >= x.start) { x.status = 'now'; if (!current) current = x; }
            });
            next = list.find((x) => x.start > now) || null;
            if (next) next.status = 'next';
        }
        const first = list[0] || null;
        const last = list[list.length - 1] || null;
        return {
            weekday: wd,
            dayName: Store.DAYS[wd],
            school,
            list,
            current,
            next,
            dayStart: first ? first.start : null,
            dayEnd: last ? last.end : null,
            dayProgress: first && last && now > first.start ? Math.min(1, (now - first.start) / (last.end - first.start)) : 0,
        };
    }

    const title = (x) => (x ? `${x.p.name || Store.KINDS[x.p.kind]}${x.subject ? ` • ${x.subject}` : ''}` : '');

    /* จุดตีระฆังของวันนี้ (ใช้กับ Alarms) */
    function bellMarks(now, warnSound) {
        const sc = Store.data.schedule;
        const t = day(now);
        if (!sc.bell || !t.school) return [];
        const out = [];
        const seen = new Set();
        t.list.forEach((x) => {
            [x.start, x.end].forEach((ts) => {
                if (seen.has(ts)) return;
                seen.add(ts);
                out.push({ key: `bell:${ts}`, due: ts, type: 'bell', sound: sc.bellSound, repeat: 1, info: x });
            });
            if (sc.bellWarnMin > 0 && x.p.kind === 'class' && x.end - x.start > sc.bellWarnMin * 60000) {
                out.push({ key: `bellwarn:${x.end}:${sc.bellWarnMin}`, due: x.end - sc.bellWarnMin * 60000, type: 'bellwarn', sound: warnSound, repeat: 1, info: x });
            }
        });
        return out.filter((m) => m.due > now).sort((a, b) => a.due - b.due);
    }

    window.Sched = { day, at, title, bellMarks };
})();
