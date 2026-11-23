/* =====================================================================
   นำเข้า/ส่งออกคำถามด้วย Excel (SheetJS) + แม่แบบให้ดาวน์โหลด + วางข้อมูลจาก Excel
   คอลัมน์: ระดับ | คำถาม | ตัวเลือก ก | ตัวเลือก ข | ตัวเลือก ค | ตัวเลือก ง | เฉลย | คำอธิบายเฉลย
   ===================================================================== */
(function () {
    'use strict';

    const HEAD = ['ระดับ (ง่าย/ปานกลาง/ยาก)', 'คำถาม', 'ตัวเลือก ก', 'ตัวเลือก ข', 'ตัวเลือก ค', 'ตัวเลือก ง', 'เฉลย (ก/ข/ค/ง)', 'คำอธิบายเฉลย (ถ้ามี)'];
    const LV = { 'ง่าย': 1, 'ปานกลาง': 2, 'กลาง': 2, 'ยาก': 3, 1: 1, 2: 2, 3: 3, easy: 1, medium: 2, hard: 3 };
    const ANS = { 'ก': 0, 'ข': 1, 'ค': 2, 'ง': 3, a: 0, b: 1, c: 2, d: 3, 1: 0, 2: 1, 3: 2, 4: 3 };

    function rowsToQuestions(rows) {
        const out = [];
        const errors = [];
        rows.forEach((r, i) => {
            const cells = (r || []).map((c) => U.norm(c));
            if (!cells.some(Boolean)) return;
            if (i === 0 && /คำถาม/.test(cells[1] || '')) return; // แถวหัวตาราง
            const level = LV[String(cells[0]).toLowerCase()] || 0;
            const text = cells[1];
            const choices = cells.slice(2, 6);
            const ans = ANS[String(cells[6]).replace(/[.\s]/g, '').toLowerCase()];
            const line = i + 1;
            if (!text) { errors.push(`แถว ${line}: ไม่มีคำถาม`); return; }
            if (choices.filter(Boolean).length < 4) { errors.push(`แถว ${line}: ตัวเลือกไม่ครบ 4 ข้อ`); return; }
            if (ans === undefined) { errors.push(`แถว ${line}: เฉลยต้องเป็น ก ข ค หรือ ง`); return; }
            out.push(Store.normQuestion({ id: U.uid('q'), level: level || 1, text, choices, answer: ans, explain: cells[7] || '' }));
            if (!level) errors.push(`แถว ${line}: ไม่ระบุระดับ — ตั้งเป็น "ง่าย" ให้ก่อน`);
        });
        return { questions: out, errors };
    }
    async function readFile(file) {
        const buf = await U.readFileAsArrayBuffer(file);
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        return rowsToQuestions(XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }));
    }
    const parseText = (text) => rowsToQuestions(String(text || '').split(/\r?\n/).map((l) => l.split('\t')));

    function sheetOf(questions) {
        const lv = (v) => (Core.LEVELS.find((l) => l.v === v) || {}).label;
        const ws = XLSX.utils.aoa_to_sheet([HEAD, ...questions.map((q) => [lv(q.level), q.text, ...q.choices, Core.LETTERS[q.answer], q.explain])]);
        ws['!cols'] = [{ wch: 12 }, { wch: 60 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 10 }, { wch: 40 }];
        return ws;
    }
    function template() {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, sheetOf(Core.SAMPLE_SETS[0].questions.slice(0, 6)), 'คำถาม');
        const help = XLSX.utils.aoa_to_sheet([
            ['วิธีกรอก'], ['1. กรอก 1 แถว = 1 คำถาม ในชีต "คำถาม" (ลบตัวอย่างออกได้)'], ['2. ระดับ: ง่าย / ปานกลาง / ยาก — เกมจะเรียงจากง่ายไปยากให้เอง'],
            ['3. ตัวเลือกต้องครบ 4 ข้อ และเฉลยเป็น ก ข ค หรือ ง'], ['4. ควรมี 10–15 ข้อ (ตามจำนวนขั้นบันไดคะแนน) + ข้อสำรอง 1–3 ข้อสำหรับตัวช่วย "ขอเปลี่ยนคำถาม"'],
        ]);
        help['!cols'] = [{ wch: 90 }];
        XLSX.utils.book_append_sheet(wb, help, 'วิธีกรอก');
        XLSX.writeFile(wb, 'แม่แบบคำถามเกมเศรษฐี.xlsx');
    }
    function exportSet(set) {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, sheetOf(set.questions), 'คำถาม');
        XLSX.writeFile(wb, `${U.safeFileName(set.name || 'ชุดคำถาม')}.xlsx`);
    }

    window.QIO = { readFile, parseText, template, exportSet, rowsToQuestions };
})();
