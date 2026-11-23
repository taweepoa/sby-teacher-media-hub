/* =====================================================================
   เอกสาร/รายงาน
   .docx (ผ่าน ThaiDoc เท่านั้น — ตามระเบียบงานสารบรรณ):
     1) สรุปผลการจัดกิจกรรม (ตารางผลการเล่นทุกครั้ง + ลงนาม)
     2) บันทึกข้อความรายงานผลการจัดกิจกรรม + สรุปผลแนบท้าย
     3) ชุดคำถามพร้อมเฉลย (พิมพ์เป็นชุด เก็บเป็นหลักฐาน/แจกครูท่านอื่น)
   หน้าพิมพ์จากเบราว์เซอร์: เกียรติบัตรผู้ชนะ (A4 แนวนอน มีเลขที่จากทะเบียนคุม)
   ใช้ได้ทั้งเบราว์เซอร์และ Node (dev/build-docs.js) — ค่าที่ไม่มีในข้อมูลเว้นจุดไข่ปลาเสมอ ห้ามเดา
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
    else root.Docs = factory(root.Core);
})(typeof self !== 'undefined' ? self : this, function (Core) {
    'use strict';

    const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const DOTS = (n) => '.'.repeat(n);
    const fmt = Core.fmt;
    const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const TH_MONTHS_S = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    /* วันที่ตามเวลาไทยเสมอ (ไม่ขึ้นกับเขตเวลาของเครื่องที่รัน Node) */
    const thai = (iso) => { const d = new Date(new Date(iso).getTime() + 7 * 3600e3); return { d: d.getUTCDate(), m: d.getUTCMonth(), y: d.getUTCFullYear() + 543 }; };
    const longDate = (iso) => { const t = thai(iso); return `${t.d} ${TH_MONTHS[t.m]} ${t.y}`; };
    const shortDate = (iso) => { const t = thai(iso); return `${t.d} ${TH_MONTHS_S[t.m]} ${t.y}`; };
    const thaiList = (arr) => (arr.length <= 1 ? (arr[0] || '') : `${arr.slice(0, -1).join(' ')} และ${arr[arr.length - 1]}`);
    /* โหมดทดลองใช้ (vs-demo.js): ลายน้ำ "ฉบับทดลองใช้" ในเกียรติบัตรที่พิมพ์จากเบราว์เซอร์ (.docx ใส่หัวกระดาษโดย ThaiDoc เอง) */
    const demoOn = () => { try { return typeof window !== 'undefined' && !!(window.VSDemo && window.VSDemo.active); } catch (e) { return false; } };
    const WM = () => (demoOn() ? `<div class="demo-wm" aria-hidden="true">${esc(window.VSDemo.watermark || 'ฉบับทดลองใช้')}</div>` : '');

    /* ---------- รวบรวมข้อมูล ---------- */
    function context(data, filter) {
        const f = filter || {};
        const list = data.results.filter((r) => (!f.setId || r.setId === f.setId)
            && (!f.from || r.date.slice(0, 10) >= f.from) && (!f.to || r.date.slice(0, 10) <= f.to))
            .slice().sort((a, b) => a.date.localeCompare(b.date));
        const best = list.length ? Math.max(...list.map((r) => r.won)) : 0;
        const winners = list.filter((r) => r.won === best && best > 0);
        const sets = [...new Set(list.map((r) => r.setName))];
        const s = data.school || {};
        const unit = (data.settings && data.settings.unit) || 'คะแนน';
        const range = list.length ? (shortDate(list[0].date) === shortDate(list[list.length - 1].date) ? longDate(list[0].date) : `${longDate(list[0].date)} ถึงวันที่ ${longDate(list[list.length - 1].date)}`) : '';
        const vars = {
            'กิจกรรม': data.texts.activity, 'วัตถุประสงค์': data.texts.objective, 'โรงเรียน': s.name, 'ชั้นเรียน': s.className,
            'ภาคเรียน': s.semester, 'ปีการศึกษา': s.academicYear, 'ช่วงวันที่': range, 'จำนวนครั้ง': list.length ? fmt(list.length) : '',
            'ชุดคำถาม': thaiList(sets), 'หน่วย': unit,
            'ผู้ชนะ': winners.length ? thaiList([...new Set(winners.map((r) => r.player))]) + ` (${fmt(best)} ${unit})` : '',
        };
        return { data, school: s, texts: data.texts, list, unit, vars, wins: list.filter((r) => r.status === 'win').length };
    }

    const REP_COLS = [
        { label: 'ที่', width: 0.9, align: 'center' },
        { label: 'วันที่', width: 2.3, align: 'center' },
        { label: 'ผู้เข้าเล่น', width: 4.3 },
        { label: 'ชั้น', width: 1.4, align: 'center' },
        { label: 'ชุดคำถาม', width: 3.2 },
        { label: 'ตอบถูก', width: 1.4, align: 'center' },
        { label: 'คะแนนที่ได้', width: 2, align: 'right' },
        { label: 'ผล', width: 2.3, align: 'center' },
    ];
    function repRows(ctx) {
        return ctx.list.map((r, i) => [
            String(i + 1), shortDate(r.date),
            r.mode === 'team' && r.members && r.members.length ? [r.player, ...r.members.map((m) => `- ${m}`)] : r.player,
            r.className || '-', r.setName, `${r.correct}/${r.total}`, fmt(r.won), Core.STATUS[r.status] ? Core.STATUS[r.status].label : '',
        ]);
    }
    function reportNote(ctx) {
        if (!ctx.list.length) return 'ยังไม่มีผลการเล่นในช่วงที่เลือก';
        const avg = ctx.list.reduce((a, r) => a + r.correct, 0) / ctx.list.length;
        return `รวม ${fmt(ctx.list.length)} ครั้ง ตอบครบทุกข้อ ${fmt(ctx.wins)} ครั้ง ตอบถูกเฉลี่ย ${avg.toFixed(1)} ข้อต่อครั้ง (หน่วยคะแนนในเกม: ${ctx.unit} — เป็นคะแนนสมมติในเกม ไม่ใช่เงินรางวัล)`;
    }
    function headLines(ctx) {
        const s = ctx.school;
        return [
            [s.className, s.semester && `ภาคเรียนที่ ${s.semester}`, s.academicYear && `ปีการศึกษา ${s.academicYear}`].filter(Boolean).join(' ') || DOTS(50),
            s.name || DOTS(50),
        ];
    }
    function teacherSigner(ctx) { return { name: ctx.school.teacher, position: ctx.school.teacherPosition || 'ผู้จัดกิจกรรม' }; }

    /* ---------- 1) สรุปผลการจัดกิจกรรม ---------- */
    function reportSection(T, ctx) {
        return T.reportTable({
            title: ctx.texts.reportTitle || 'สรุปผลการจัดกิจกรรม',
            subtitle: headLines(ctx),
            columns: REP_COLS,
            rows: repRows(ctx).length ? repRows(ctx) : [['-', '-', 'ยังไม่มีผลการเล่น', '-', '-', '-', '-', '-']],
            note: reportNote(ctx),
            signers: [teacherSigner(ctx)],
            repeatHeader: true,
            pageNumbers: true,
        });
    }

    /* ---------- 2) บันทึกข้อความ ---------- */
    function memoDefaults(ctx, today) {
        const s = ctx.school;
        return { agency: s.agency || s.name || '', docNo: '', date: longDate((today || new Date()).toISOString()), to: s.director ? `ผู้อำนวยการ${s.name || 'โรงเรียน'}` : (s.name ? `ผู้อำนวยการ${s.name}` : '') };
    }
    function memoText(ctx, form) {
        const f = Object.assign(memoDefaults(ctx), form || {});
        const t = ctx.texts;
        return {
            agency: f.agency, docNo: f.docNo, date: f.date, to: f.to,
            subject: Core.fill(t.memoSubject, ctx.vars),
            paragraphs: [Core.fill(t.memoP1, ctx.vars), Core.fill(t.memoP2, ctx.vars), Core.fill(t.memoEnd, ctx.vars)].filter(Boolean),
            signer: teacherSigner(ctx),
        };
    }
    function memoSections(T, ctx, form) {
        T.resetMemoFields();
        return [T.memo(memoText(ctx, form)), reportSection(T, ctx)];
    }

    /* ---------- 3) ชุดคำถามพร้อมเฉลย ---------- */
    function setSection(T, set, school, withAnswer) {
        const sorted = set.questions.map((q, i) => ({ q, i })).sort((a, b) => (a.q.level - b.q.level) || (a.i - b.i)).map((x) => x.q);
        const lv = (v) => (Core.LEVELS.find((l) => l.v === v) || {}).label || '';
        const cols = withAnswer !== false
            ? [{ label: 'ข้อ', width: 1.1, align: 'center' }, { label: 'ระดับ', width: 1.9, align: 'center' }, { label: 'คำถามและตัวเลือก', width: 10.5 }, { label: 'เฉลย', width: 2.5, align: 'center' }]
            : [{ label: 'ข้อ', width: 1.1, align: 'center' }, { label: 'ระดับ', width: 1.9, align: 'center' }, { label: 'คำถามและตัวเลือก', width: 13 }];
        const rows = sorted.map((q, i) => {
            const body = [{ t: q.text, bold: true }, ...q.choices.map((c, k) => `${Core.LETTERS[k]}. ${c}`)];
            if (withAnswer !== false && q.explain) body.push({ t: `คำอธิบาย: ${q.explain}`, size: 28 });
            const row = [String(i + 1), lv(q.level), body];
            if (withAnswer !== false) row.push(`${Core.LETTERS[q.answer]}. ${q.choices[q.answer]}`);
            return row;
        });
        return T.reportTable({
            title: `ชุดคำถาม "${set.name}"`,
            subtitle: [[set.subject && `วิชา${set.subject}`, set.grade && `ระดับชั้น ${set.grade}`, `จำนวน ${set.questions.length} ข้อ`].filter(Boolean).join(' '), (school && school.name) || ''].filter(Boolean),
            columns: cols,
            rows,
            repeatHeader: true,
            pageNumbers: true,
            note: 'เรียงจากง่ายไปยาก ข้อท้ายที่เกินจำนวนขั้นของบันไดคะแนนใช้เป็นข้อสำรองสำหรับตัวช่วย "ขอเปลี่ยนคำถาม"',
        });
    }

    /* ---------- เกียรติบัตร (HTML พิมพ์ A4 แนวนอน) ---------- */
    function certVars(cert, data) {
        const r = data.results.find((x) => x.id === cert.resultId) || {};
        return Object.assign({}, context(data).vars, {
            'วิชา': r.subject || '', 'คะแนน': r.won != null ? fmt(r.won) : '', 'หน่วย': r.unit || data.settings.unit,
            'ชุดคำถาม': r.setName || '', 'โรงเรียน': data.school.name || '',
        });
    }
    function certHTML(certs, data) {
        const t = data.texts;
        const s = data.school;
        return certs.map((c) => {
            const v = certVars(c, data);
            return `<section class="pr-page pr-cert">${WM()}
                <div class="pr-cert-frame">
                    <div class="pr-cert-no">เลขที่ ${esc(c.no)}/${esc(c.year)}</div>
                    <div class="pr-cert-school">${esc(s.name || DOTS(50))}</div>
                    <div class="pr-cert-h">${esc(t.certTitle)}</div>
                    <div class="pr-cert-give">${esc(Core.fill(t.certGive, v))}</div>
                    <div class="pr-cert-name">${esc(c.name)}</div>
                    ${c.members && c.members.length ? `<div class="pr-cert-mem">${esc(c.members.join('  •  '))}</div>` : ''}
                    <div class="pr-cert-reason">${esc(c.reason || Core.fill(t.certReason, v))}</div>
                    <div class="pr-cert-wish">${esc(Core.fill(t.certWish, v))}</div>
                    <div class="pr-cert-date">ให้ไว้ ณ วันที่ ${esc(longDate(c.date))}</div>
                    <div class="pr-cert-sign"><p>ลงชื่อ${DOTS(40)}</p><p>(${esc(s.director || DOTS(40))})</p><p>${esc(Core.fill(t.certSigner, v))}</p></div>
                </div>
            </section>`;
        }).join('');
    }

    return { context, reportSection, memoDefaults, memoText, memoSections, setSection, certHTML, longDate, shortDate, reportNote, repRows, REP_COLS };
});
