/* =====================================================================
   นำเข้า/ส่งออก Excel (SheetJS): คำถาม (แม่แบบ, อ่านไฟล์/วางจาก Excel, ส่งออกชุดคำถาม) และผลการแข่งขัน
   ===================================================================== */
(function () {
    'use strict';

    const HEAD = ['ลำดับ', 'หมวด (สำหรับ Jeopardy)', 'คำถาม', 'ตัวเลือก ก', 'ตัวเลือก ข', 'ตัวเลือก ค', 'ตัวเลือก ง', 'เฉลย', 'คะแนน', 'เวลา (วินาที)', 'คำอธิบายเฉลย'];
    const COLS = [{ wch: 7 }, { wch: 16 }, { wch: 56 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 8 }, { wch: 12 }, { wch: 40 }];
    const LETTER_SETS = [['ก', 'ข', 'ค', 'ง'], ['a', 'b', 'c', 'd'], ['1', '2', '3', '4']];

    const clean = (v) => String(v == null ? '' : v).replace(/​/g, '').replace(/\r\n/g, '\n').trim();

    /* หาว่าคอลัมน์ไหนคืออะไร จากหัวตาราง (ไทย/อังกฤษ) */
    function mapHeader(row) {
        const m = {};
        row.forEach((h, i) => {
            const s = clean(h).toLowerCase().replace(/\s+/g, '');
            if (!s) return;
            if (m.text == null && /^(คำถาม|โจทย์|question)/.test(s)) m.text = i;
            else if (m.cat == null && /(หมวด|category|หัวข้อ)/.test(s)) m.cat = i;
            else if (/(ตัวเลือก|choice|option)/.test(s) || /^(ก|ข|ค|ง|a|b|c|d)\.?$/.test(s)) {
                const k = /(ก|a|1)\)?$/.test(s) ? 0 : /(ข|b|2)\)?$/.test(s) ? 1 : /(ค|c|3)\)?$/.test(s) ? 2 : /(ง|d|4)\)?$/.test(s) ? 3 : null;
                if (k != null) { m.ch = m.ch || []; m.ch[k] = i; }
            } else if (m.ans == null && /(เฉลย|คำตอบ|answer|key)/.test(s) && !/อธิบาย|explain/.test(s)) m.ans = i;
            else if (m.pts == null && /(คะแนน|point|score)/.test(s)) m.pts = i;
            else if (m.time == null && /(เวลา|วินาที|time|sec)/.test(s)) m.time = i;
            else if (m.exp == null && /(อธิบาย|explain|หมายเหตุ|note)/.test(s)) m.exp = i;
        });
        return m;
    }
    const DEFAULT_MAP = { cat: 1, text: 2, ch: [3, 4, 5, 6], ans: 7, pts: 8, time: 9, exp: 10 };

    /* แปลงแถวของตาราง → คำถาม พร้อมข้อผิดพลาดรายแถว */
    function parseRows(rows) {
        let start = 0;
        let map = null;
        for (let i = 0; i < Math.min(rows.length, 10); i += 1) {
            const m = mapHeader(rows[i] || []);
            if (m.text != null) { map = m; start = i + 1; break; }
        }
        if (!map) map = DEFAULT_MAP;
        const out = [];
        for (let r = start; r < rows.length; r += 1) {
            const row = rows[r] || [];
            const get = (i) => (i == null ? '' : clean(row[i]));
            const text = get(map.text);
            const choices = (map.ch || []).map((i) => get(i)).filter((c, i, a) => c !== '' || a.slice(i + 1).some((x) => x !== ''));
            const rawAns = get(map.ans);
            if (!text && !choices.some(Boolean) && !rawAns) continue; // แถวว่าง
            const item = { row: r + 1, errors: [], warns: [] };
            const filled = choices.filter(Boolean);
            const q = { type: filled.length >= 2 ? 'mc' : 'text', text, image: '', category: get(map.cat), explain: get(map.exp), points: 0, time: 0, choices: [], answer: '' };
            if (!text) item.errors.push('ไม่มีข้อความคำถาม');
            const pts = get(map.pts);
            if (pts) { const n = Number(pts.replace(/,/g, '')); if (Number.isFinite(n) && n > 0) q.points = n; else item.warns.push(`คะแนน "${pts}" ไม่ใช่ตัวเลข ใช้ค่าเริ่มต้น`); }
            const tm = get(map.time);
            if (tm) { const n = Number(tm); if (Number.isFinite(n) && n >= 0 && n <= 600) q.time = Math.round(n); else item.warns.push(`เวลา "${tm}" ไม่ถูกต้อง ใช้ค่าเริ่มต้น`); }
            if (q.type === 'mc') {
                if (choices.length > 4) item.warns.push('มีตัวเลือกเกิน 4 ข้อ ใช้ 4 ข้อแรก');
                q.choices = choices.slice(0, 4);
                if (q.choices.some((c) => !c)) item.errors.push('มีช่องตัวเลือกว่างอยู่ระหว่างตัวเลือก');
                const a = rawAns.toLowerCase().replace(/[.)\s]/g, '').replace(/^ข้อ/, '');
                let idx = -1;
                LETTER_SETS.forEach((L) => { if (idx < 0 && L.indexOf(a) >= 0) idx = L.indexOf(a); });
                if (idx < 0 && rawAns) idx = q.choices.findIndex((c) => c.toLowerCase() === rawAns.toLowerCase());
                if (!rawAns) item.errors.push('ไม่มีเฉลย (ใส่ ก/ข/ค/ง)');
                else if (idx < 0 || idx >= q.choices.length) item.errors.push(`เฉลย "${rawAns}" ไม่ตรงกับตัวเลือก`);
                q.answer = idx;
            } else {
                if (filled.length === 1) item.warns.push('มีตัวเลือกเพียง 1 ข้อ จึงนำเข้าเป็นคำถามแบบเขียนตอบ');
                q.answer = rawAns;
                if (!rawAns) item.errors.push('ไม่มีเฉลย');
            }
            item.q = q;
            out.push(item);
        }
        return out;
    }

    async function readFile(file) {
        const buf = await U.readFileAsArrayBuffer(file);
        const isCsv = /\.csv$/i.test(file.name);
        let wb;
        if (isCsv) {
            // CSV ภาษาไทย: ลอง UTF-8 ก่อน ถ้าอ่านไม่ออกใช้ Windows-874
            let text = new TextDecoder('utf-8').decode(buf);
            if (/�/.test(text)) { try { text = new TextDecoder('windows-874').decode(buf); } catch (e) { /* ใช้ UTF-8 */ } }
            wb = XLSX.read(text.replace(/^﻿/, ''), { type: 'string' });
        } else {
            wb = XLSX.read(buf, { type: 'array' });
        }
        const sheets = wb.SheetNames.map((name) => ({ name, rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: false }) }));
        return sheets.filter((s) => s.rows.some((r) => r.some((c) => clean(c))));
    }

    function parseTSV(text) {
        const rows = [];
        let row = [];
        let cell = '';
        let q = false;
        const s = String(text || '').replace(/\r\n?/g, '\n');
        for (let i = 0; i < s.length; i += 1) {
            const c = s[i];
            if (q) {
                if (c === '"' && s[i + 1] === '"') { cell += '"'; i += 1; } else if (c === '"') q = false; else cell += c;
            } else if (c === '"' && cell === '') q = true;
            else if (c === '\t') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c;
        }
        if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
        return rows;
    }

    function letterOf(i) { return ['ก', 'ข', 'ค', 'ง'][i] || ''; }
    function questionRows(questions) {
        return questions.map((q, i) => [
            i + 1, q.category || '', q.text,
            ...[0, 1, 2, 3].map((k) => (q.type === 'mc' ? q.choices[k] || '' : '')),
            q.type === 'mc' ? letterOf(q.answer) : q.answer,
            q.points || '', q.time || '', q.explain || '',
        ]);
    }

    function downloadTemplate() {
        const wb = XLSX.utils.book_new();
        const sample = [
            HEAD,
            [1, '', 'ดาวเคราะห์ดวงใดอยู่ใกล้ดวงอาทิตย์มากที่สุด', 'ดาวศุกร์', 'ดาวพุธ', 'ดาวอังคาร', 'โลก', 'ข', 10, 20, ''],
            [2, '', 'น้ำบริสุทธิ์ที่ความดัน 1 บรรยากาศ เดือดที่อุณหภูมิกี่องศาเซลเซียส', '', '', '', '', '100 องศาเซลเซียส', 10, 30, 'คำถามเขียนตอบ: เว้นช่องตัวเลือกว่าง แล้วพิมพ์คำตอบในช่องเฉลย'],
            [3, 'คณิตคิดเร็ว', '15 × 4 เท่ากับเท่าใด', '', '', '', '', '60', 100, '', 'ใส่หมวดเมื่อต้องการเล่นแบบ Jeopardy'],
            [4, '', 'ข้อใดเป็นการเปลี่ยนแปลงทางเคมี', 'น้ำแข็งละลาย', 'การเผากระดาษ', '', '', 'ข', '', '', 'มี 2–4 ตัวเลือกก็ได้'],
        ];
        const ws = XLSX.utils.aoa_to_sheet(sample);
        ws['!cols'] = COLS;
        XLSX.utils.book_append_sheet(wb, ws, 'คำถาม');
        const help = XLSX.utils.aoa_to_sheet([
            ['คำแนะนำการกรอกแม่แบบคำถาม'],
            ['1. หนึ่งแถว = หนึ่งคำถาม (แถวแรกเป็นหัวตาราง ห้ามลบ)'],
            ['2. คำถามแบบเลือกตอบ: กรอกตัวเลือก 2–4 ช่อง แล้วใส่เฉลยเป็น ก ข ค หรือ ง'],
            ['3. คำถามแบบเขียนตอบ: เว้นช่องตัวเลือกทั้งหมดให้ว่าง แล้วพิมพ์คำตอบที่ถูกในช่องเฉลย'],
            ['4. คะแนน/เวลา เว้นว่างได้ (ใช้ค่าที่ตั้งตอนเริ่มการแข่งขัน)'],
            ['5. หมวด ใช้กับเกมแบบ Jeopardy (กระดานหมวด × คะแนน) — คะแนนในหมวดเดียวกันควรเป็น 100, 200, 300, 400, 500'],
            ['6. รูปภาพประกอบ ให้เพิ่มภายหลังในหน้าคลังคำถาม (กดแก้ไขคำถาม → เพิ่มรูป)'],
        ]);
        help['!cols'] = [{ wch: 100 }];
        XLSX.utils.book_append_sheet(wb, help, 'คำแนะนำ');
        XLSX.writeFile(wb, 'แม่แบบนำเข้าคำถาม.xlsx');
    }

    function exportSet(set) {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([HEAD, ...questionRows(set.questions)]);
        ws['!cols'] = COLS;
        XLSX.utils.book_append_sheet(wb, ws, 'คำถาม');
        XLSX.writeFile(wb, `${U.safeFileName(`ชุดคำถาม_${set.name || 'ไม่มีชื่อ'}`)}.xlsx`);
    }

    /* ผลการแข่งขัน: สรุปอันดับ + ผลรายข้อของทุกทีม + การปรับคะแนน */
    function exportMatch(m, school) {
        const rk = Engine.ranking(m);
        const wb = XLSX.utils.book_new();
        const demo = window.VSDemo && VSDemo.active ? [[`${VSDemo.watermark} — สร้างจากระบบทดลอง System ห้องสื่อครูคอม (ใช้ทดลองเท่านั้น)`]] : [];
        const title = [...demo, [m.title], [[m.subtitle, school && school.name].filter(Boolean).join(' • ')], [[m.dateText && `วันที่ ${m.dateText}`, m.place && `สถานที่ ${m.place}`, `รูปแบบ ${Engine.MODES[m.mode].label}`, `ชุดคำถาม ${m.setName || '-'}`].filter(Boolean).join('   ')], []];
        const sum = XLSX.utils.aoa_to_sheet([...title,
            ['อันดับ', 'ทีม', 'สมาชิก', 'ตอบถูก (ข้อ)', 'ตอบผิด (ข้อ)', 'ปรับคะแนน', 'คะแนนรวม', 'รางวัล'],
            ...rk.map((t) => [t.rank, t.name, t.members.join(', '), t.correct, t.wrong, t.adjust || 0, t.score, t.award || ''])]);
        sum['!cols'] = [{ wch: 8 }, { wch: 22 }, { wch: 60 }, { wch: 12 }, { wch: 12 }, { wch: 11 }, { wch: 11 }, { wch: 22 }];
        XLSX.utils.book_append_sheet(wb, sum, 'สรุปผล');
        const L = Engine.LETTERS[(m.opts && m.opts.letters) || 'th'];
        const detail = m.deck.map((q, i) => {
            const r = m.results[q.id];
            const st = r ? r.status : 'open';
            return [i + 1, q.category || '', q.text, Engine.answerText(q, L), Engine.qPoints(m, q), st === 'done' ? 'เล่นแล้ว' : st === 'skipped' ? 'ข้าม' : 'ยังไม่เล่น',
                ...m.teams.map((t) => {
                    const a = r && r.answers[t.id];
                    if (!a || a.final == null) return '';
                    return `${a.final ? 'ถูก' : 'ผิด'}${a.awarded ? ` (${a.awarded > 0 ? '+' : ''}${a.awarded})` : ''}`;
                })];
        });
        const det = XLSX.utils.aoa_to_sheet([...title, ['ข้อ', 'หมวด', 'คำถาม', 'เฉลย', 'คะแนนข้อ', 'สถานะ', ...m.teams.map((t) => t.name)], ...detail]);
        det['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 56 }, { wch: 24 }, { wch: 9 }, { wch: 10 }, ...m.teams.map(() => ({ wch: 16 }))];
        XLSX.utils.book_append_sheet(wb, det, 'ผลรายข้อ');
        if (m.adjusts.length) {
            const adj = XLSX.utils.aoa_to_sheet([...title, ['ลำดับ', 'ทีม', 'ปรับคะแนน', 'หมายเหตุ'], ...m.adjusts.map((a, i) => [i + 1, (m.teams.find((t) => t.id === a.team) || {}).name || '', a.delta, a.note || ''])]);
            adj['!cols'] = [{ wch: 8 }, { wch: 22 }, { wch: 12 }, { wch: 40 }];
            XLSX.utils.book_append_sheet(wb, adj, 'ปรับคะแนน');
        }
        if (demo.length) wb.Props = { Title: `ผลการแข่งขัน (${VSDemo.watermark})`, Comments: VSDemo.watermark };
        XLSX.writeFile(wb, `${U.safeFileName(`${demo.length ? `${VSDemo.watermark}_` : ''}ผลการแข่งขัน_${m.title}`)}.xlsx`);
    }

    window.QIO = { HEAD, parseRows, readFile, parseTSV, downloadTemplate, exportSet, exportMatch, questionRows };
})();
