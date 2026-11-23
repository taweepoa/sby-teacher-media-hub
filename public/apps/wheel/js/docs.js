/* =====================================================================
   รายงานราชการ (.docx ผ่าน ThaiDoc เท่านั้น) + ตัวอย่าง HTML บนจอ/พิมพ์ (official-print.css)
   1) รายชื่อนักเรียนแบ่งกลุ่ม (ตาราง + ช่องลายมือชื่อนักเรียน (เลือกได้) + ลงนามครู) — หลักฐานกิจกรรม
   2) ลำดับการนำเสนอ (ตาราง + ลงนามครู)
   3) บัญชีผู้ได้รับรางวัลจากการจับฉลาก (ลายมือชื่อผู้รับ + ลงนามผู้ดำเนินการและกรรมการ)
   ใช้ได้ทั้งในเบราว์เซอร์และ Node (dev/build-docs.js สร้างไฟล์ตัวอย่างแล้วตรวจด้วย audit.js)
   ค่าที่ไม่มีในข้อมูล (ชื่อกิจกรรม รายวิชา ชื่อโรงเรียน ผู้ลงนาม) เว้นจุดไข่ปลาเสมอ — ห้ามเดา
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Docs = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const DOTS = (n) => '.'.repeat(n);
    const dots = (v, n) => (v && String(v).trim() ? String(v).trim() : DOTS(n));
    const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    /** "19 ตุลาคม พ.ศ. 2569" */
    const thaiDate = (iso) => { const d = new Date(iso); return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} พ.ศ. ${d.getFullYear() + 543}`; };
    /** "10.15 น." (เวลาแบบหนังสือราชการใช้จุด) */
    const thaiTime = (iso) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')} น.`; };
    const pname = (p) => (p ? p.name || p.first || '' : '');

    /** "ม.2/1" → "ชั้นมัธยมศึกษาปีที่ 2/1" (ชื่อรายการกำหนดเองคงเดิม) */
    function classText(list) {
        if (!list) return '';
        if (list.kind === 'custom') return list.name;
        const m = /^(ม|ป|อ)\.(\d+(?:\/\d+)?)$/.exec(list.name);
        if (!m) return `ชั้น ${list.name}`;
        return `ชั้น${{ ม: 'มัธยมศึกษาปีที่', ป: 'ประถมศึกษาปีที่', อ: 'อนุบาลปีที่' }[m[1]]} ${m[2]}`;
    }

    /* ---------- ค่าเริ่มต้นของแบบฟอร์ม (หน้า "รายงาน") ---------- */
    function formDefaults(data, h) {
        const s = data.school || {};
        return {
            activity: (h.data && h.data.activity) || (h.title && !['จับกลุ่ม', 'ลำดับนำเสนอ', 'จับฉลากของรางวัล'].includes(h.title) ? h.title : ''),
            subject: s.subject || '',
            school: s.name || '',
            term: s.semester && s.academicYear ? `ภาคเรียนที่ ${s.semester} ปีการศึกษา ${s.academicYear}` : '',
            teacherName: s.teacherName || '',
            teacherPosition: s.teacherPosition || '',
            signCol: h.mode !== 'order',
        };
    }

    function fileName(h, list) {
        const base = { group: 'รายชื่อนักเรียนแบ่งกลุ่ม', order: 'ลำดับการนำเสนอ', prize: 'บัญชีผู้ได้รับรางวัลจากการจับฉลาก' }[h.mode] || 'รายงาน';
        return `${base}_${(list ? list.name : h.listName || '').replace(/[\\/:*?"<>|]+/g, '-')}.docx`;
    }

    /* ---------- เนื้อหาร่วม: หัวรายงาน + ข้อความสรุป ---------- */
    function heading(h, list, f) {
        const titles = {
            group: 'รายชื่อนักเรียนแบ่งกลุ่มปฏิบัติกิจกรรม',
            order: 'ลำดับการนำเสนอผลงาน',
            prize: 'บัญชีรายชื่อผู้ได้รับรางวัลจากการจับฉลาก',
        };
        const custom = list && list.kind === 'custom';
        const lines = [
            `กิจกรรม ${dots(f.activity, 50)}${custom ? '' : `   รายวิชา ${dots(f.subject, 30)}`}`,
            `${classText(list) || dots('', 20)}   ${dots(f.term, 40)}`,
            dots(f.school, 60),
        ];
        return { title: titles[h.mode], lines };
    }

    function groupStats(h) {
        const ms = h.data.groups.flatMap((g) => g.members);
        return { total: ms.length, m: ms.filter((x) => x.gender === 'm').length, f: ms.filter((x) => x.gender === 'f').length };
    }

    function summaryText(h, list) {
        const at = `เมื่อวันที่ ${thaiDate(h.at)} เวลา ${thaiTime(h.at)}`;
        const custom = list && list.kind === 'custom';
        if (h.mode === 'group') {
            const s = groupStats(h);
            const o = h.data.opts || {};
            const sex = !custom && (s.m || s.f) ? ` (ชาย ${s.m} คน หญิง ${s.f} คน)` : '';
            return `จัดกลุ่มด้วยวิธีสุ่มด้วยคอมพิวเตอร์${o.mixGender ? 'แบบคละเพศ' : ''} จำนวน ${h.data.groups.length} กลุ่ม ${custom ? 'รวม' : 'นักเรียนทั้งสิ้น'} ${s.total} ${custom ? 'รายการ' : 'คน'}${sex}${o.leaders ? ' และสุ่มเลือกหัวหน้ากลุ่ม กลุ่มละ 1 คน' : ''} ${at}`;
        }
        if (h.mode === 'order') {
            return `กำหนดลำดับการนำเสนอด้วยวิธีสุ่มด้วยคอมพิวเตอร์ จำนวน ${h.data.items.length} ${h.data.source === 'group' ? 'กลุ่ม' : 'ลำดับ'} ${at}`;
        }
        const n = (h.data.draws || []).length;
        return `ดำเนินการจับฉลากด้วยวิธีสุ่มด้วยคอมพิวเตอร์ โดยผู้มีสิทธิ์หนึ่งคนได้รับรางวัลไม่เกินหนึ่งรางวัล รวมทั้งสิ้น ${n} รางวัล ${at}`;
    }

    /* ---------- ตาราง: กำหนดคอลัมน์ + แถว (ใช้ทั้ง .docx และ HTML) ---------- */
    function tableSpec(h, list, f) {
        const custom = list && list.kind === 'custom';
        if (h.mode === 'group') {
            const cols = f.signCol
                ? [{ label: 'กลุ่มที่', width: 1.5, align: 'center' }, { label: 'ที่', width: 1.0, align: 'center' }, { label: 'เลขที่', width: 1.3, align: 'center' }, { label: custom ? 'รายการ' : 'ชื่อ - สกุล', width: 5.6 }, { label: 'หน้าที่', width: 2.4, align: 'center' }, { label: 'ลายมือชื่อ', width: 4.2, align: 'center' }]
                : [{ label: 'กลุ่มที่', width: 1.6, align: 'center' }, { label: 'ที่', width: 1.1, align: 'center' }, { label: 'เลขที่', width: 1.4, align: 'center' }, { label: custom ? 'รายการ' : 'ชื่อ - สกุล', width: 6.6 }, { label: 'หน้าที่', width: 2.6, align: 'center' }, { label: 'หมายเหตุ', width: 2.7, align: 'center' }];
            const groups = h.data.groups.map((g) => ({
                label: String(g.no),
                rows: g.members.map((m, i) => [String(i + 1), String(m.no ?? ''), custom ? m.first : pname(m), h.data.opts && h.data.opts.leaders ? (m.id === g.leaderId ? 'หัวหน้ากลุ่ม' : 'สมาชิก') : '', '']),
            }));
            return { cols, groups, mergeFirst: true };
        }
        if (h.mode === 'order') {
            const byGroup = h.data.source === 'group';
            const cols = [{ label: 'ลำดับที่', width: 1.6, align: 'center' }, { label: byGroup ? 'กลุ่ม' : (custom ? 'รายการ' : 'ชื่อ - สกุล'), width: byGroup ? 2.2 : 6.2 }, { label: byGroup ? 'สมาชิก' : 'เลขที่', width: byGroup ? 7.6 : 1.6, align: byGroup ? 'left' : 'center' }, { label: 'วันที่นำเสนอ', width: 2.4, align: 'center' }, { label: 'หมายเหตุ', width: byGroup ? 2.2 : 4.2, align: 'center' }];
            const rows = h.data.items.map((it, i) => [String(i + 1), it.label, byGroup ? (it.members || []) : String(it.no ?? (/เลขที่ (\d+)/.exec(it.sub || '') || [])[1] ?? ''), '', '']);
            return { cols, groups: [{ rows }], mergeFirst: false };
        }
        const cols = f.signCol
            ? [{ label: 'ที่', width: 1.0, align: 'center' }, { label: 'รางวัล', width: 4.4 }, { label: custom ? 'รายการ' : 'ชื่อ - สกุล', width: 5.2 }, { label: 'เลขที่', width: 1.3, align: 'center' }, { label: 'ลายมือชื่อผู้รับรางวัล', width: 4.1, align: 'center' }]
            : [{ label: 'ที่', width: 1.0, align: 'center' }, { label: 'รางวัล', width: 5.2 }, { label: custom ? 'รายการ' : 'ชื่อ - สกุล', width: 6.0 }, { label: 'เลขที่', width: 1.4, align: 'center' }, { label: 'หมายเหตุ', width: 2.4, align: 'center' }];
        const rows = (h.data.draws || []).map((x, i) => [String(i + 1), x.prize, custom ? x.person.first : pname(x.person), String(x.person.no ?? ''), '']);
        return { cols, groups: [{ rows }], mergeFirst: false };
    }

    function signers(h, f) {
        const teacher = { name: f.teacherName, position: f.teacherPosition, role: h.mode === 'prize' ? 'ผู้ดำเนินการจับฉลาก' : 'ครูผู้สอน' };
        if (h.mode !== 'prize') return [teacher];
        return [teacher, { name: '', position: '', role: 'กรรมการ' }, { name: '', position: '', role: 'กรรมการ' }];
    }

    /* ---------- .docx ---------- */
    function sections(T, h, list, f) {
        const D = T.D;
        const { AlignmentType: AL, VerticalAlign: VA, Table, TableRow, TableCell, TableLayoutType, HeightRule, WidthType, VerticalMergeType: VM } = D;
        const W = T.contentWidth(T.MARGIN_STD);
        const spec = tableSpec(h, list, f);
        const sum = spec.cols.reduce((a, c) => a + c.width, 0);
        const widths = spec.cols.map((c) => Math.floor((T.cm(c.width) * W) / T.cm(sum)));
        widths[widths.length - 1] += W - widths.reduce((a, b) => a + b, 0);
        const ALIGN = { center: AL.CENTER, left: AL.LEFT };
        const tight = { top: 0, bottom: 0, left: 70, right: 70 };
        const rowH = { value: T.cm(0.56), rule: HeightRule.ATLEAST }; // 14 pt TH SarabunPSK สูง 0.54 ซม.
        const size = T.pt(14);
        // เซลล์: สร้างด้วย P() ของ ThaiDoc (ตัดคำไทย + แยกภาษา) เพื่อใส่ keepNext ให้แถวในกลุ่มเดียวกันไม่แยกหน้า
        const cell = (v, i, o) => {
            const lines = Array.isArray(v) ? (v.length ? v : ['']) : [v];
            return new TableCell({
                width: { size: widths[i], type: WidthType.DXA },
                margins: tight,
                verticalAlign: VA.CENTER,
                verticalMerge: o.merge,
                shading: o.fill ? { type: D.ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
                children: lines.map((t, k) => T.P({ text: o.merge === VM.CONTINUE ? '' : t, size, bold: !!o.bold, align: o.align || ALIGN[spec.cols[i].align] || AL.LEFT, keepNext: !!o.keepNext || k < lines.length - 1 })),
            });
        };
        const head = new TableRow({
            tableHeader: true,
            cantSplit: true,
            children: spec.cols.map((c, i) => cell(c.label, i, { bold: true, fill: 'D9D9D9', align: AL.CENTER, keepNext: true })),
        });
        const body = [];
        spec.groups.forEach((g) => {
            g.rows.forEach((r, ri) => {
                const lastInGroup = ri === g.rows.length - 1;
                const keep = spec.mergeFirst && !lastInGroup;
                const cells = [];
                if (spec.mergeFirst) cells.push(cell(g.label, 0, { merge: ri === 0 ? VM.RESTART : VM.CONTINUE, keepNext: keep, bold: true, align: AL.CENTER }));
                r.forEach((v, ci) => cells.push(cell(v, ci + (spec.mergeFirst ? 1 : 0), { keepNext: keep })));
                body.push(new TableRow({ cantSplit: true, height: rowH, children: cells }));
            });
        });
        if (!body.length) body.push(new TableRow({ children: spec.cols.map((c, i) => cell(i === 1 ? 'ไม่มีข้อมูล' : '', i, {})) }));
        const table = new Table({ layout: TableLayoutType.FIXED, columnWidths: widths, borders: T.ALL_BORDERS, rows: [head, ...body] });

        const hd = heading(h, list, f);
        const sg = signers(h, f);
        let signPart;
        if (sg.length === 1) {
            const s = sg[0];
            signPart = T.signBlock({ name: s.name, position: s.position, suffix: s.role });
        } else {
            // ผู้ดำเนินการ + กรรมการ 2 คน (ตารางไร้เส้น 3 ช่อง)
            const cw = Math.floor(W / sg.length);
            signPart = [new Table({
                layout: TableLayoutType.FIXED,
                columnWidths: sg.map((_, i) => (i === sg.length - 1 ? W - cw * (sg.length - 1) : cw)),
                borders: T.NO_BORDERS,
                rows: [new TableRow({
                    cantSplit: true,
                    children: sg.map((s, i) => new TableCell({
                        width: { size: i === sg.length - 1 ? W - cw * (sg.length - 1) : cw, type: WidthType.DXA },
                        borders: T.NO_BORDERS,
                        children: [
                            T.P({ text: `ลงชื่อ${DOTS(32)}`, align: AL.CENTER, keepNext: true }),
                            T.P({ text: `(${s.name || DOTS(32)})`, align: AL.CENTER, keepNext: true }),
                            T.P({ text: s.role, align: AL.CENTER }),
                        ],
                    })),
                })],
            })];
        }
        return [{
            properties: { page: { size: T.A4, margin: T.MARGIN_STD } },
            children: [
                T.P({ text: hd.title, bold: true, size: T.pt(18), align: AL.CENTER }),
                ...hd.lines.map((l) => T.P({ text: l, align: AL.CENTER })),
                ...T.EMPTY(1, 8),
                table,
                ...T.EMPTY(1, 8),
                T.BODY(summaryText(h, list), { keepNext: true }),
                T.P({ text: '', size: T.pt(12), keepNext: true }),
                ...signPart,
            ],
        }];
    }

    /* ---------- ตัวอย่าง HTML บนจอ / พิมพ์ (ขนาดและฟอนต์เดียวกับ .docx) ---------- */
    function html(h, list, f) {
        const spec = tableSpec(h, list, f);
        const hd = heading(h, list, f);
        const sg = signers(h, f);
        const al = (c) => (c.align === 'center' ? 'c' : '');
        const cellHtml = (v) => (Array.isArray(v) ? v.map(esc).join('<br>') : esc(v));
        // กลุ่มละ 1 tbody (ไม่แยกกลุ่มข้ามหน้าเวลาพิมพ์ — เหมือน keepNext ในไฟล์ .docx)
        const rows = spec.groups.map((g) => `<tbody class="${spec.mergeFirst ? 'grp' : ''}">${g.rows.map((r, ri) => `<tr>${spec.mergeFirst && ri === 0 ? `<td class="c" rowspan="${g.rows.length}"><b>${esc(g.label)}</b></td>` : ''}${r.map((v, ci) => `<td class="${al(spec.cols[ci + (spec.mergeFirst ? 1 : 0)])}">${cellHtml(v)}</td>`).join('')}</tr>`).join('')}</tbody>`).join('');
        const signHtml = sg.length === 1
            ? `<div class="gov-sign"><p>ลงชื่อ${DOTS(40)}${esc(sg[0].role)}</p><p>(${esc(dots(sg[0].name, 40))})</p><p>ตำแหน่ง ${esc(dots(sg[0].position, 40))}</p></div>`
            : `<div class="gov-signs">${sg.map((s) => `<div><p>ลงชื่อ${DOTS(32)}</p><p>(${esc(dots(s.name, 32))})</p><p>${esc(s.role)}</p></div>`).join('')}</div>`;
        return `<section class="gov-page doc-${h.mode}">
            <h2 class="gov-title">${esc(hd.title)}</h2>
            ${hd.lines.map((l) => `<p class="gov-subtitle">${esc(l)}</p>`).join('')}
            <table class="gov-table"><thead><tr>${spec.cols.map((c) => `<th style="width:${c.width}cm">${esc(c.label)}</th>`).join('')}</tr></thead>${spec.groups.some((g) => g.rows.length) ? rows : `<tbody><tr><td colspan="${spec.cols.length}" class="c">ไม่มีข้อมูล</td></tr></tbody>`}</table>
            <p class="gov-body" style="margin-top:4mm">${esc(summaryText(h, list))}</p>
            ${signHtml}
        </section>`;
    }

    return { formDefaults, fileName, sections, html, summaryText, tableSpec, classText, thaiDate, thaiTime };
});
