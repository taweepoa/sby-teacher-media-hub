/* =====================================================================
   นำเข้าคำถามจาก Excel/CSV/วางจาก Excel + ไฟล์แม่แบบ (SheetJS ใน assets/vendor/xlsx)
   คอลัมน์: ประเภท | คำถาม | ตัวเลือก ก | ตัวเลือก ข | ตัวเลือก ค | ตัวเลือก ง | เฉลย | คำอธิบาย
   ยืดหยุ่น: วาง 2 คอลัมน์ (คำถาม | คำตอบ) = เติมคำ, คำตอบ ถูก/ผิด = ถูกผิด, มีตัวเลือก = ปรนัย
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Excel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const HEAD = ['ประเภท', 'คำถาม', 'ตัวเลือก ก', 'ตัวเลือก ข', 'ตัวเลือก ค', 'ตัวเลือก ง', 'เฉลย', 'คำอธิบาย'];
    const s = (v) => (v == null ? '' : String(v)).trim();
    const TRUE_W = ['ถูก', 'จริง', 'true', 't', 'ใช่', '✓', 'o', 'yes', 'y'];
    const FALSE_W = ['ผิด', 'เท็จ', 'false', 'f', 'ไม่ใช่', '✗', 'x', 'no', 'n'];
    const isTF = (v) => TRUE_W.includes(s(v).toLowerCase()) || FALSE_W.includes(s(v).toLowerCase());

    function typeOf(v) {
        const t = s(v).toLowerCase().replace(/\s/g, '');
        if (/^(ปรนัย|เลือกตอบ|mc|choice|multiple)/.test(t)) return 'mc';
        if (/^(ถูก\/?ผิด|ถูกผิด|tf|true\/?false|จริง\/?เท็จ)/.test(t)) return 'tf';
        if (/^(เติมคำ|fill|เขียนตอบ|อัตนัย|short)/.test(t)) return 'fill';
        return '';
    }
    /* เฉลยปรนัย: ก/ข/ค/ง, 1–4, A–D หรือพิมพ์ข้อความตรงกับตัวเลือก */
    function mcAnswer(v, choices) {
        const a = s(v);
        const map = { ก: 0, ข: 1, ค: 2, ง: 3, a: 0, b: 1, c: 2, d: 3, 1: 0, 2: 1, 3: 2, 4: 3 };
        const k = a.toLowerCase().replace(/[.)\s]/g, '');
        if (k in map) return map[k];
        const i = choices.findIndex((c) => c && c === a);
        return i >= 0 ? i : -1;
    }

    /* แปลงแถว (array of arrays) → คำถาม + รายการแถวที่ผิด */
    function parseRows(rows) {
        const out = [];
        const errors = [];
        (rows || []).forEach((r, idx) => {
            const cells = (r || []).map(s);
            if (!cells.some(Boolean)) return;
            if (idx === 0 && /ประเภท|คำถาม|question|type/i.test(cells.slice(0, 2).join(' '))) return;
            let type = typeOf(cells[0]);
            const rest = type || !cells[0] ? cells.slice(1) : cells;
            const q = rest[0] || '';
            if (!q) { errors.push({ row: idx + 1, msg: 'ไม่มีคำถาม' }); return; }
            let choices; let ans; let explain;
            if (rest.length <= 3 && type !== 'mc') {
                // แบบย่อ: คำถาม | คำตอบ | (คำอธิบาย)
                ans = rest[1] || '';
                explain = rest[2] || '';
                choices = [];
                if (!type) type = isTF(ans) ? 'tf' : 'fill';
            } else {
                choices = rest.slice(1, 5);
                ans = rest[5] || '';
                explain = rest[6] || '';
                if (!type) type = choices.filter(Boolean).length >= 2 ? 'mc' : isTF(ans) ? 'tf' : 'fill';
            }
            const item = { type, q, choices: [], answer: '', explain, img: '' };
            if (type === 'mc') {
                item.choices = choices.slice(0, 4);
                while (item.choices.length < 4) item.choices.push('');
                const a = mcAnswer(ans, item.choices);
                if (a < 0 || !item.choices[a]) { errors.push({ row: idx + 1, msg: `เฉลย "${ans}" ไม่ตรงกับตัวเลือก (ใช้ ก ข ค ง)` }); return; }
                if (item.choices.filter(Boolean).length < 2) { errors.push({ row: idx + 1, msg: 'ปรนัยต้องมีตัวเลือกอย่างน้อย 2 ข้อ' }); return; }
                item.answer = a;
            } else if (type === 'tf') {
                if (!isTF(ans)) { errors.push({ row: idx + 1, msg: `เฉลยถูก/ผิด "${ans}" ไม่ถูกต้อง (พิมพ์ ถูก หรือ ผิด)` }); return; }
                item.answer = TRUE_W.includes(s(ans).toLowerCase());
            } else {
                if (!ans) { errors.push({ row: idx + 1, msg: 'ไม่มีเฉลย' }); return; }
                item.answer = ans;
            }
            out.push(item);
        });
        return { questions: out, errors };
    }
    /* ข้อความที่วางจาก Excel (คั่นด้วยแท็บ) หรือพิมพ์คั่นด้วย | */
    function parseText(text) {
        const rows = String(text || '').replace(/\r/g, '').split('\n').map((line) => (line.includes('\t') ? line.split('\t') : line.split('|')));
        return parseRows(rows);
    }
    function parseWorkbook(XLSX, buf) {
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        return parseRows(XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }));
    }
    /* แถวตัวอย่างในไฟล์แม่แบบ */
    const SAMPLE = [
        ['ปรนัย', '8 × 7 = ?', '54', '56', '58', '64', 'ข', ''],
        ['ปรนัย', 'สำนวน "น้ำขึ้นให้รีบตัก" หมายถึงอะไร', 'ทำงานหนัก', 'มีโอกาสควรรีบทำ', 'ใช้จ่ายประหยัด', 'ตกใจง่าย', 'ข', ''],
        ['ถูกผิด', 'พยัญชนะไทยมีทั้งหมด 44 ตัว', '', '', '', '', 'ถูก', ''],
        ['ถูกผิด', 'ค้างคาวเป็นนก', '', '', '', '', 'ผิด', 'ค้างคาวเป็นสัตว์เลี้ยงลูกด้วยน้ำนม'],
        ['เติมคำ', '1 ชั่วโมง มี ____ นาที', '', '', '', '', '60/หกสิบ', 'ใส่คำตอบได้หลายแบบ คั่นด้วย /'],
    ];
    function rowsOf(questions, CHOICE) {
        return questions.map((q) => [q.type === 'mc' ? 'ปรนัย' : q.type === 'tf' ? 'ถูกผิด' : 'เติมคำ', q.q, ...(q.type === 'mc' ? q.choices : ['', '', '', '']), q.type === 'mc' ? CHOICE[q.answer] : q.type === 'tf' ? (q.answer ? 'ถูก' : 'ผิด') : q.answer, q.explain || '']);
    }
    function makeBook(XLSX, rows) {
        const ws = XLSX.utils.aoa_to_sheet([HEAD].concat(rows));
        ws['!cols'] = [{ wch: 9 }, { wch: 46 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 30 }];
        HEAD.forEach((h, i) => {
            const ref = XLSX.utils.encode_cell({ r: 0, c: i });
            if (ws[ref]) ws[ref].s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '44A016' } }, alignment: { horizontal: 'center' } };
        });
        const help = XLSX.utils.aoa_to_sheet([
            ['วิธีกรอกคำถาม (เกมบันไดงูตอบคำถาม)'], [''],
            ['ประเภท', 'พิมพ์ ปรนัย / ถูกผิด / เติมคำ (เว้นว่างได้ ระบบเดาให้จากตัวเลือกและเฉลย)'],
            ['ปรนัย', 'ใส่ตัวเลือก ก–ง อย่างน้อย 2 ข้อ เฉลยพิมพ์ ก ข ค หรือ ง'],
            ['ถูกผิด', 'เว้นช่องตัวเลือก เฉลยพิมพ์ ถูก หรือ ผิด'],
            ['เติมคำ', 'เว้นช่องตัวเลือก เฉลยมีได้หลายแบบ คั่นด้วย / เช่น 60/หกสิบ'],
            ['รูปประกอบ', 'เพิ่มรูปภายหลังในหน้าแก้ไขชุดคำถาม (กดที่ช่องรูปของแต่ละข้อ)'],
        ]);
        help['!cols'] = [{ wch: 14 }, { wch: 80 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'คำถาม');
        XLSX.utils.book_append_sheet(wb, help, 'วิธีกรอก');
        return wb;
    }

    return { HEAD, SAMPLE, parseRows, parseText, parseWorkbook, rowsOf, makeBook, typeOf, mcAnswer };
});
