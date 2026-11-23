/* =====================================================================
   รายงานราชการ (.docx ผ่าน ThaiDoc เท่านั้น) + ตัวอย่าง HTML บนจอ (official-print.css)
   1) สรุปพฤติกรรมรายห้อง  2) สรุปพฤติกรรมรายคน  3) บันทึกข้อความรายงานผลการเสริมแรงพฤติกรรม (+ตารางแนบ)
   ใช้ได้ทั้งเบราว์เซอร์และ Node (dev/build-docs.js) · ค่าที่ไม่มีในข้อมูลเว้นจุดไข่ปลา ห้ามเดา
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
    else root.Docs = factory(root.Core);
})(typeof self !== 'undefined' ? self : this, function (Core) {
    'use strict';

    const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const DOTS = (n) => '.'.repeat(n);
    const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const dateText = (d) => `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
    const fmt = (n) => Number(n || 0).toLocaleString('en-US');
    const thaiList = (a) => (a.length <= 1 ? (a[0] || '') : `${a.slice(0, -1).join(' ')} และ ${a[a.length - 1]}`);
    const PERIOD = { week: 'ประจำสัปดาห์', month: 'ประจำเดือน', all: 'ตลอดภาคเรียน' };

    /* ช่วงเวลา → ข้อความ (ถึงวันสุดท้ายของช่วง) */
    function rangeText(kind, range, data) {
        if (kind === 'all') {
            const ts = data.events.map((e) => new Date(e.t).getTime());
            if (!ts.length) return '';
            return `ระหว่างวันที่ ${dateText(new Date(Math.min(...ts)))} ถึงวันที่ ${dateText(new Date(Math.max(...ts)))}`;
        }
        const last = new Date(range.to); last.setDate(last.getDate() - 1);
        if (kind === 'week') return `ระหว่างวันที่ ${dateText(range.from)} ถึงวันที่ ${dateText(last)}`;
        return `เดือน${TH_MONTHS[range.from.getMonth()]} พ.ศ. ${range.from.getFullYear() + 543}`;
    }

    /* ---------- รวบรวมข้อมูล ---------- */
    function classContext(data, classId, kind, ref) {
        const c = data.classes.find((x) => x.id === classId);
        if (!c) return null;
        const range = Core.periodRange(kind, ref);
        const rows = Core.classStudents(data, classId).map((s) => Object.assign({ s }, Core.stats(data, s.id, range), { balance: Core.balance(data, s.id) }));
        const ids = new Set(rows.map((r) => r.s.id));
        const skills = Core.skillBreakdown(data, (e) => ids.has(e.sid), range);
        const tot = rows.reduce((a, r) => ({ pos: a.pos + r.pos, neg: a.neg + r.neg, posCount: a.posCount + r.posCount, negCount: a.negCount + r.negCount, spent: a.spent + r.spent }), { pos: 0, neg: 0, posCount: 0, negCount: 0, spent: 0 });
        const top = rows.slice().sort((a, b) => b.net - a.net).filter((r) => r.net > 0).slice(0, 3);
        return { school: data.school, cls: c, kind, range, period: rangeText(kind, range, data), rows, skills, tot, top };
    }

    function studentContext(data, sid, kind, ref) {
        const s = data.students.find((x) => x.id === sid);
        if (!s) return null;
        const c = data.classes.find((x) => x.id === s.classId);
        const range = Core.periodRange(kind, ref);
        const st = Core.stats(data, sid, range);
        const skills = Core.skillBreakdown(data, (e) => e.sid === sid, range);
        const log = data.events.filter((e) => e.sid === sid && Core.inRange(e.t, range)).sort((a, b) => (a.t < b.t ? 1 : -1)).slice(0, 15)
            .map((e) => ({ t: new Date(e.t), pts: e.pts, skill: data.skills.find((k) => k.id === e.skillId) }));
        const rank = (Core.leaderboard(data, s.classId, range).find((x) => x.s.id === sid) || {}).rank || '-';
        return { school: data.school, s, cls: c, kind, range, period: rangeText(kind, range, data), st, skills, log, balance: Core.balance(data, sid), rank, size: Core.classStudents(data, s.classId).length };
    }

    function headLines(ctx, extra) {
        const sc = ctx.school;
        return [[`ชั้น ${ctx.cls ? ctx.cls.name : DOTS(10)}`, sc.name].filter(Boolean).join('  '), [`ภาคเรียนที่ ${sc.semester || DOTS(4)}/${sc.academicYear || DOTS(6)}`, ctx.period].filter(Boolean).join('  ')].concat(extra || []);
    }
    const signName = (sc) => ({ name: sc.teacherName || '', position: sc.teacherPosition || 'ครูประจำชั้น' });

    /* ---------- 1) สรุปรายห้อง ---------- */
    const CLASS_COLS = [
        { label: 'เลขที่', width: 1.2, align: 'center' }, { label: 'ชื่อ - สกุล', width: 5.0 },
        { label: 'พฤติกรรมดี (ครั้ง)', width: 1.8, align: 'center' }, { label: 'ควรปรับปรุง (ครั้ง)', width: 1.8, align: 'center' },
        { label: 'แต้มสุทธิ', width: 1.6, align: 'center' }, { label: 'แลกรางวัล (แต้ม)', width: 1.7, align: 'center' }, { label: 'หมายเหตุ', width: 2.9 },
    ];
    function classRows(ctx) {
        const rows = ctx.rows.map((r) => [String(r.s.no || ''), Core.fullName(r.s), fmt(r.posCount), fmt(r.negCount), fmt(r.net), fmt(r.spent), '']);
        rows.push(['', [{ t: 'รวม', bold: true, align: 'right' }], [{ t: fmt(ctx.tot.posCount), bold: true, align: 'center' }], [{ t: fmt(ctx.tot.negCount), bold: true, align: 'center' }], [{ t: fmt(ctx.tot.pos - ctx.tot.neg), bold: true, align: 'center' }], [{ t: fmt(ctx.tot.spent), bold: true, align: 'center' }], '']);
        return rows;
    }
    const SKILL_COLS = [{ label: 'ที่', width: 1.2, align: 'center' }, { label: 'พฤติกรรม', width: 7.4 }, { label: 'ประเภท', width: 2.6, align: 'center' }, { label: 'จำนวน (ครั้ง)', width: 2.4, align: 'center' }, { label: 'แต้ม', width: 2.4, align: 'center' }];
    const skillRows = (list) => (list.length ? list.map((x, i) => [String(i + 1), x.skill ? x.skill.name : 'ทักษะที่ถูกลบ', x.pts >= 0 ? 'พฤติกรรมดี' : 'ควรปรับปรุง', fmt(x.count), (x.pts > 0 ? '+' : '') + fmt(x.pts)]) : [['', 'ยังไม่มีการบันทึกในช่วงเวลานี้', '', '', '']]);

    const alignFix = (T, rows) => rows.map((row) => row.map((v) => (Array.isArray(v) ? v.map((x) => (typeof x === 'object' ? Object.assign({}, x, { align: x.align ? T.D.AlignmentType[x.align.toUpperCase()] : undefined }) : x)) : v)));

    function classSections(T, ctx) {
        const sec = T.reportTable({ title: `สรุปพฤติกรรมนักเรียน${PERIOD[ctx.kind]}`, subtitle: headLines(ctx), columns: CLASS_COLS, rows: alignFix(T, classRows(ctx)), repeatHeader: true });
        const sec2 = T.reportTable({ title: 'สรุปพฤติกรรมที่บันทึกแยกตามรายการ', subtitle: [], columns: SKILL_COLS, rows: skillRows(ctx.skills), signers: [signName(ctx.school)] });
        sec.children.push(...T.EMPTY(1, 12), ...sec2.children);
        return [sec];
    }

    /* ---------- 2) รายคน ---------- */
    const LOG_COLS = [{ label: 'วันที่', width: 3.4, align: 'center' }, { label: 'เวลา', width: 1.8, align: 'center' }, { label: 'พฤติกรรม', width: 8.0 }, { label: 'แต้ม', width: 2.8, align: 'center' }];
    const time = (d) => `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')} น.`;
    function studentInfo(ctx) {
        return [
            `ชื่อ - สกุล ${Core.fullName(ctx.s)}   เลขที่ ${ctx.s.no || '-'}`,
            `พฤติกรรมดี ${fmt(ctx.st.posCount)} ครั้ง (+${fmt(ctx.st.pos)} แต้ม)   ควรปรับปรุง ${fmt(ctx.st.negCount)} ครั้ง (−${fmt(ctx.st.neg)} แต้ม)`,
            `แต้มสุทธิ ${fmt(ctx.st.net)} แต้ม   อันดับที่ ${ctx.rank} จาก ${ctx.size} คน   แต้มคงเหลือสะสม ${fmt(ctx.balance)} แต้ม`,
        ];
    }
    function studentSections(T, ctx) {
        const sec = T.reportTable({ title: `รายงานพฤติกรรมนักเรียนรายบุคคล${PERIOD[ctx.kind]}`, subtitle: headLines(ctx), columns: SKILL_COLS, rows: skillRows(ctx.skills) });
        // ข้อมูลนักเรียนไว้ก่อนตาราง (ชิดซ้าย)
        const info = studentInfo(ctx).map((t) => T.P({ text: t }));
        sec.children.splice(3, 0, ...info);
        const logRows = ctx.log.length ? ctx.log.map((x) => [dateText(x.t), time(x.t), x.skill ? x.skill.name : 'ทักษะที่ถูกลบ', (x.pts > 0 ? '+' : '') + x.pts]) : [['', '', 'ยังไม่มีการบันทึกในช่วงเวลานี้', '']];
        const sec2 = T.reportTable({ title: 'บันทึกพฤติกรรมล่าสุด', subtitle: [], columns: LOG_COLS, rows: logRows, signers: [signName(ctx.school)] });
        sec.children.push(...T.EMPTY(1, 12), ...sec2.children);
        return [sec];
    }

    /* ---------- 3) บันทึกข้อความ ---------- */
    function memoText(ctx, form) {
        const sc = ctx.school;
        const f = Object.assign({ agency: sc.agency || sc.name || '', docNo: '', date: dateText(new Date()), to: sc.director || '', ending: 'ทราบ' }, form || {});
        const total = ctx.tot.posCount + ctx.tot.negCount;
        const pct = total ? Math.round((ctx.tot.posCount * 1000) / total) / 10 : 0;
        const p1 = `ตามที่ข้าพเจ้าได้ดำเนินการเสริมแรงพฤติกรรมเชิงบวกของนักเรียนชั้น ${ctx.cls.name} ด้วยระบบแต้มสะสมพฤติกรรม เพื่อส่งเสริมให้นักเรียนมีวินัย มีน้ำใจ และตั้งใจเรียน นั้น`;
        let p2 = `บัดนี้ ได้สรุปผลการดำเนินงาน${PERIOD[ctx.kind]}${ctx.period ? ` ${ctx.period}` : ''} นักเรียนจำนวน ${fmt(ctx.rows.length)} คน มีการบันทึกพฤติกรรมทั้งสิ้น ${fmt(total)} ครั้ง เป็นพฤติกรรมดี ${fmt(ctx.tot.posCount)} ครั้ง (ร้อยละ ${pct}) และพฤติกรรมที่ควรปรับปรุง ${fmt(ctx.tot.negCount)} ครั้ง`;
        if (ctx.skills.length) p2 += ` พฤติกรรมที่พบมากที่สุดคือ ${ctx.skills[0].skill ? ctx.skills[0].skill.name : '-'}`;
        if (ctx.top.length) p2 += ` นักเรียนที่มีแต้มสุทธิสูงสุด ได้แก่ ${thaiList(ctx.top.map((r) => Core.fullName(r.s)))}`;
        p2 += ' รายละเอียดตามสรุปพฤติกรรมนักเรียนที่แนบมาพร้อมนี้';
        return { agency: f.agency, docNo: f.docNo, date: f.date, subject: `รายงานผลการเสริมแรงพฤติกรรมเชิงบวก ชั้น ${ctx.cls.name}`, to: f.to, paragraphs: [p1, p2, `จึงเรียนมาเพื่อโปรด${f.ending === 'พิจารณา' ? 'พิจารณา' : 'ทราบ'}`], signer: signName(sc) };
    }
    function memoSections(T, ctx, form) {
        T.resetMemoFields();
        return [T.memo(memoText(ctx, form)), ...classSections(T, ctx)];
    }

    /* ---------- HTML บนจอ ---------- */
    const dotsOr = (v, n) => (v && String(v).trim() ? esc(v) : DOTS(n));
    const cellHTML = (v) => (Array.isArray(v) ? v.map((x) => (typeof x === 'object' ? `<b style="display:block;text-align:${x.align || 'left'}">${esc(x.t)}</b>` : esc(x))).join('<br>') : esc(v));
    const tableHTML = (cols, rows) => `<table class="gov-table"><thead><tr>${cols.map((c) => `<th style="width:${c.width}cm">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v, i) => `<td class="${cols[i].align === 'center' ? 'c' : ''}">${cellHTML(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const signHTML = (sc) => { const s = signName(sc); return `<div class="gov-signs" style="margin-top:8mm"><div><p>ลงชื่อ${DOTS(39)}</p><p>(${dotsOr(s.name, 39)})</p><p>${esc(s.position)}</p></div></div>`; };

    function classHTML(ctx) {
        return `<section class="gov-page">
            <h2 class="gov-title">สรุปพฤติกรรมนักเรียน${PERIOD[ctx.kind]}</h2>${headLines(ctx).map((l) => `<p class="gov-subtitle">${esc(l)}</p>`).join('')}
            ${tableHTML(CLASS_COLS, classRows(ctx))}
            <h2 class="gov-title" style="margin-top:6mm">สรุปพฤติกรรมที่บันทึกแยกตามรายการ</h2>
            ${tableHTML(SKILL_COLS, skillRows(ctx.skills))}${signHTML(ctx.school)}</section>`;
    }
    function studentHTML(ctx) {
        const logRows = ctx.log.length ? ctx.log.map((x) => [dateText(x.t), time(x.t), x.skill ? x.skill.name : '-', (x.pts > 0 ? '+' : '') + x.pts]) : [['', '', 'ยังไม่มีการบันทึกในช่วงเวลานี้', '']];
        return `<section class="gov-page">
            <h2 class="gov-title">รายงานพฤติกรรมนักเรียนรายบุคคล${PERIOD[ctx.kind]}</h2>${headLines(ctx).map((l) => `<p class="gov-subtitle">${esc(l)}</p>`).join('')}
            <div style="margin-top:3mm">${studentInfo(ctx).map((l) => `<p>${esc(l)}</p>`).join('')}</div>
            ${tableHTML(SKILL_COLS, skillRows(ctx.skills))}
            <h2 class="gov-title" style="margin-top:6mm">บันทึกพฤติกรรมล่าสุด</h2>${tableHTML(LOG_COLS, logRows)}${signHTML(ctx.school)}</section>`;
    }
    function memoHTML(ctx, form, garudaSrc) {
        const m = memoText(ctx, form);
        return `<section class="gov-page">
            <div class="gov-memo-head"><img src="${garudaSrc}" alt="ตราครุฑ"><h1>บันทึกข้อความ</h1><span></span></div>
            <p class="gov-field"><b>ส่วนราชการ</b>&nbsp; ${dotsOr(m.agency, 60)}</p>
            <p class="gov-field"><b>ที่</b>&nbsp; ${dotsOr(m.docNo, 20)}<span class="gov-tab"></span><b>วันที่</b>&nbsp; ${dotsOr(m.date, 30)}</p>
            <p class="gov-field"><b>เรื่อง</b>&nbsp; ${esc(m.subject)}</p>
            <p class="gov-to"><b>เรียน</b>&nbsp; ${dotsOr(m.to, 40)}</p>
            ${m.paragraphs.map((p) => `<p class="gov-body">${esc(p)}</p>`).join('')}
            <div class="gov-sign"><p>ลงชื่อ${DOTS(48)}</p><p>(${dotsOr(m.signer.name, 48)})</p><p>ตำแหน่ง ${dotsOr(m.signer.position, 48)}</p></div>
        </section>${classHTML(ctx)}`;
    }

    return { classContext, studentContext, classSections, studentSections, memoSections, memoText, classHTML, studentHTML, memoHTML, dateText, rangeText, PERIOD };
});
