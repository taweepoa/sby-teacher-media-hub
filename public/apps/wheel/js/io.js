/* =====================================================================
   นำเข้า/ส่งออก Excel (SheetJS ในโฟลเดอร์ assets) + แปลงข้อความที่วางจาก Excel/พิมพ์เอง เป็นรายชื่อ
   รองรับ: มี/ไม่มีหัวคอลัมน์ • ชื่อเต็มช่องเดียว "ด.ช.ภูมิ ศรีสุข" • คอลัมน์ชั้น/ห้อง (นำเข้าหลายห้องในไฟล์เดียว)
           เลขไทย • "เด็กชาย/เด็กหญิง" → ด.ช./ด.ญ. • .csv ภาษาไทยแบบ Windows (TIS-620/874)
   ===================================================================== */
(function () {
    'use strict';

    const PREFIX_RE = /^(เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|ดช\.|ดญ\.|นางสาว|น\.ส\.|นาย|นาง|Mr\.|Mrs\.|Miss|Ms\.)\s*/;
    const PREFIX_MAP = { 'เด็กชาย': 'ด.ช.', 'เด็กหญิง': 'ด.ญ.', 'ดช.': 'ด.ช.', 'ดญ.': 'ด.ญ.', 'น.ส.': 'นางสาว' };
    const FIELDS = [
        { f: 'no', h: 'เลขที่', alias: ['เลขที่', 'ที่', 'no', 'ลำดับ', 'ลำดับที่'] },
        { f: 'code', h: 'เลขประจำตัว', alias: ['เลขประจำตัว', 'เลขประจำตัวนักเรียน', 'รหัสนักเรียน', 'รหัส', 'studentid', 'id', 'code'] },
        { f: 'prefix', h: 'คำนำหน้า', alias: ['คำนำหน้า', 'คำนำหน้าชื่อ', 'prefix', 'title'] },
        { f: 'firstName', h: 'ชื่อ', alias: ['ชื่อ', 'ชื่อจริง', 'firstname', 'name', 'รายการ', 'หัวข้อ'] },
        { f: 'lastName', h: 'สกุล', alias: ['สกุล', 'นามสกุล', 'lastname', 'surname'] },
        { f: 'fullName', h: 'ชื่อ-สกุล', alias: ['ชื่อสกุล', 'ชื่อนามสกุล', 'ชื่อและนามสกุล', 'ชื่อ-สกุล', 'fullname', 'ชื่อนักเรียน'] },
        { f: 'nick', h: 'ชื่อเล่น', alias: ['ชื่อเล่น', 'nickname', 'nick'] },
        { f: 'gender', h: 'เพศ', alias: ['เพศ', 'gender', 'sex'] },
        { f: 'cls', h: 'ชั้น/ห้อง', alias: ['ชั้นห้อง', 'ชั้น/ห้อง', 'ห้องเรียน', 'class', 'ชั้นเรียน', 'ชั้น', 'ห้อง'] },
        { f: 'weight', h: 'น้ำหนัก', alias: ['น้ำหนัก', 'weight', 'โอกาส'] },
    ];
    const thDigits = (s) => String(s ?? '').replace(/[๐-๙]/g, (d) => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d)));
    const keyOf = (s) => String(s || '').toLowerCase().replace(/[\s._\-/()]/g, '');

    function matchField(h) {
        const k = keyOf(h);
        if (!k) return '';
        const hit = FIELDS.find((x) => x.alias.some((a) => keyOf(a) === k));
        return hit ? hit.f : '';
    }

    /* เดาความหมายคอลัมน์จากข้อมูล (กรณีไม่มีหัวคอลัมน์) */
    function guessMap(rows, width) {
        const sample = rows.filter((r) => r.some(Boolean)).slice(0, 40);
        const map = Array(width).fill('');
        const used = new Set();
        const all = (i, re) => sample.filter((r) => r[i]).length > 0 && sample.filter((r) => r[i]).every((r) => re.test(r[i]));
        const take = (i, f) => { if (!used.has(f) && !map[i]) { map[i] = f; used.add(f); } };
        for (let i = 0; i < width; i += 1) {
            if (all(i, /^(ด\.ช\.|ด\.ญ\.|เด็กชาย|เด็กหญิง|นาย|นางสาว|นาง|น\.ส\.)$/)) take(i, 'prefix');
            else if (all(i, /^[มปอ]\.?\s*[\d๐-๙]+\s*\/\s*[\d๐-๙]+$/)) take(i, 'cls');
            else if (all(i, /^(ชาย|หญิง|ช|ญ|m|f|male|female)$/i)) take(i, 'gender');
            else if (all(i, /^[\d๐-๙]{4,}$/)) take(i, 'code');
            else if (all(i, /^[\d๐-๙]{1,3}$/)) take(i, 'no');
        }
        for (let i = 0; i < width; i += 1) {
            if (map[i]) continue;
            const hasPrefix = sample.some((r) => PREFIX_RE.test(r[i]) && /\s/.test(String(r[i]).replace(PREFIX_RE, '')));
            if (hasPrefix && !used.has('fullName') && !used.has('firstName')) take(i, 'fullName');
            else if (!used.has('firstName') && !used.has('fullName')) {
                const spaced = sample.filter((r) => r[i]).every((r) => /\S\s+\S/.test(r[i]));
                take(i, spaced && !used.has('prefix') ? 'fullName' : 'firstName');
            } else if (used.has('firstName') && !used.has('lastName')) take(i, 'lastName');
            else if (!used.has('nick')) take(i, 'nick');
        }
        return map;
    }

    /**
     * แปลงตาราง (array ของแถว) เป็นรายชื่อ
     * opts.custom = true → รายการกำหนดเอง (ไม่แยกคำนำหน้า/นามสกุล ใช้ทั้งบรรทัดเป็นชื่อรายการ)
     * คืน { people: [...], bad: [{row, reason}], header: bool, classes: [ชั้น/ห้องที่พบ] }
     */
    function parseRows(rows, opts) {
        const o = opts || {};
        const clean = rows.map((r) => (Array.isArray(r) ? r : [r]).map((c) => U.norm(c)));
        while (clean.length && !clean[clean.length - 1].some(Boolean)) clean.pop();
        const width = Math.max(0, ...clean.map((r) => r.length));
        clean.forEach((r) => { while (r.length < width) r.push(''); });
        let header = -1;
        let best = 0;
        clean.slice(0, 10).forEach((r, i) => {
            const n = r.filter((c) => matchField(c)).length;
            if (n >= 2 && n > best) { best = n; header = i; }
        });
        let map;
        if (header >= 0) {
            const used = new Set();
            map = clean[header].map((c) => { const f = matchField(c); if (!f || used.has(f)) return ''; used.add(f); return f; });
        } else if (o.custom) {
            map = Array(width).fill('');
            map[0] = 'firstName';
        } else map = guessMap(clean, width);
        const idx = (f) => map.indexOf(f);
        const get = (r, f) => (idx(f) >= 0 ? U.norm(r[idx(f)]) : '');
        const people = [];
        const bad = [];
        clean.slice(header + 1).forEach((r, i) => {
            if (!r.some(Boolean)) return;
            const row = header + 2 + i;
            if (o.custom) {
                const label = header >= 0 ? get(r, 'firstName') || get(r, 'fullName') : r.filter(Boolean).join(' ');
                if (!label) { bad.push({ row, reason: 'ไม่มีข้อความ' }); return; }
                const no = header >= 0 ? thDigits(get(r, 'no')) : '';
                people.push({ no: no ? U.toInt(no, '') : '', code: '', prefix: '', firstName: label, lastName: '', nick: '', gender: '', weight: U.toInt(get(r, 'weight'), 1) || 1, cls: '' });
                return;
            }
            let prefix = get(r, 'prefix');
            let first = get(r, 'firstName');
            let last = get(r, 'lastName');
            const full = get(r, 'fullName');
            if (full && !first) {
                let s = full;
                const m = PREFIX_RE.exec(s);
                if (m) { prefix = prefix || m[1]; s = s.slice(m[0].length); }
                const parts = s.split(/\s+/);
                first = parts.shift() || '';
                last = last || parts.join(' ');
            }
            if (!prefix) { const m = PREFIX_RE.exec(first); if (m) { prefix = m[1]; first = first.slice(m[0].length); } }
            prefix = PREFIX_MAP[prefix] || prefix;
            if (!first) { bad.push({ row, reason: 'ไม่มีชื่อ' }); return; }
            const g = get(r, 'gender').toLowerCase();
            let gender = /^(ชาย|ช|m|male|ผู้ชาย)$/.test(g) ? 'm' : /^(หญิง|ญ|f|female|ผู้หญิง)$/.test(g) ? 'f' : '';
            if (!gender) gender = Engine.genderOf(prefix);
            const noRaw = thDigits(get(r, 'no'));
            people.push({
                no: noRaw ? U.toInt(noRaw, '') : '',
                code: thDigits(get(r, 'code')),
                prefix,
                firstName: first,
                lastName: last,
                nick: get(r, 'nick'),
                gender,
                weight: Math.max(1, Math.min(10, U.toInt(thDigits(get(r, 'weight')), 1) || 1)),
                cls: Store.normClass(get(r, 'cls')),
                row,
            });
        });
        const classes = [...new Set(people.map((p) => p.cls).filter(Boolean))];
        return { people, bad, header: header >= 0, classes, map };
    }

    /** ข้อความที่วาง: แยกบรรทัด และแยกคอลัมน์ด้วย Tab (คัดลอกจาก Excel) */
    function parseText(text, opts) {
        const rows = String(text || '').replace(/\r/g, '').split('\n').map((l) => (l.includes('\t') ? l.split('\t') : [l]));
        return parseRows(rows, opts);
    }

    async function readFile(file) {
        const buf = await U.readFileAsArrayBuffer(file);
        let wb;
        if (/\.(csv|txt)$/i.test(file.name)) {
            let text;
            try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { text = new TextDecoder('windows-874').decode(buf); }
            wb = XLSX.read(text.replace(/^﻿/, ''), { type: 'string', raw: true });
        } else {
            wb = XLSX.read(buf, { type: 'array' });
        }
        return wb.SheetNames.map((name) => ({ name, rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '', blankrows: true }) }));
    }

    /* ---------- ส่งออก ---------- */
    function sheetOf(aoa, widths) {
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        if (widths) ws['!cols'] = widths.map((w) => ({ wch: w }));
        return ws;
    }
    /** สร้างสมุดงานจาก [{name, rows, widths}] แล้วดาวน์โหลด — คืนชื่อไฟล์ */
    function writeBook(filename, sheets) {
        const wb = XLSX.utils.book_new();
        // โหมดทดลองใช้ (vs-demo.js): แถวแรกของทุกแผ่นงานเป็นลายน้ำ "ฉบับทดลองใช้" และชื่อไฟล์ลงท้ายด้วยคำเดียวกัน
        const demo = window.VSDemo && VSDemo.active;
        const mark = demo ? [[`${VSDemo.watermark} — สร้างจากระบบทดลอง System ห้องสื่อครูคอม (ไม่ใช่เอกสารจริง)`], []] : [];
        sheets.forEach((s) => {
            const ws = sheetOf(mark.concat(s.rows), s.widths);
            if (demo) ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(3, (s.widths || []).length - 1) } }];
            XLSX.utils.book_append_sheet(wb, ws, String(s.name).replace(/[\\/?*[\]:]/g, '-').slice(0, 31));
        });
        const name = `${U.safeFileName(demo ? `${filename}_${VSDemo.watermark}` : filename)}.xlsx`;
        XLSX.writeFile(wb, name);
        return name;
    }
    function template() {
        return writeBook('แม่แบบรายชื่อนักเรียน', [
            {
                name: 'รายชื่อนักเรียน',
                rows: [
                    ['เลขที่', 'เลขประจำตัว', 'คำนำหน้า', 'ชื่อ', 'สกุล', 'ชื่อเล่น', 'ชั้น/ห้อง', 'น้ำหนัก'],
                    [1, '26201', 'ด.ช.', 'ตัวอย่าง', 'นามสกุลสมมติ', 'ต้น', 'ม.2/1', 1],
                    [2, '26202', 'ด.ญ.', 'ตัวอย่าง', 'นามสกุลสมมติ', 'ฝน', 'ม.2/1', 1],
                    [1, '26241', 'ด.ช.', 'ตัวอย่าง', 'ห้องที่สอง', '', 'ม.2/2', 1],
                ],
                widths: [7, 12, 10, 16, 18, 10, 10, 8],
            },
            {
                name: 'คำอธิบาย',
                rows: [
                    ['คอลัมน์', 'คำอธิบาย'],
                    ['เลขที่', 'เลขที่ในห้อง (ใส่หรือไม่ใส่ก็ได้)'],
                    ['เลขประจำตัว', 'เลขประจำตัวนักเรียน (ไม่บังคับ)'],
                    ['คำนำหน้า', 'ด.ช. / ด.ญ. / นาย / นางสาว — ระบบใช้แยกเพศตอน "จับกลุ่มคละเพศ" และ "สลับชาย-หญิง"'],
                    ['ชื่อ, สกุล', 'จำเป็นต้องมีชื่อ • จะใส่ชื่อ-สกุลรวมช่องเดียว เช่น "ด.ช.ภูมิ ศรีสุข" ก็ได้'],
                    ['ชื่อเล่น', 'ไม่บังคับ — เลือกแสดงชื่อเล่นบนวงล้อได้ในหน้าตั้งค่า'],
                    ['ชั้น/ห้อง', 'ถ้าใส่ ระบบจะแยกเป็นหลายห้องให้อัตโนมัติ (นำเข้าหลายห้องในไฟล์เดียว)'],
                    ['น้ำหนัก', '1–10 (ค่าเริ่มต้น 1) ใช้เมื่อเปิด "ถ่วงน้ำหนัก" — น้ำหนัก 2 มีโอกาสถูกสุ่มเป็น 2 เท่า'],
                ],
                widths: [14, 80],
            },
        ]);
    }

    window.IO = { FIELDS, PREFIX_RE, parseRows, parseText, readFile, writeBook, template, sheetOf };
})();
