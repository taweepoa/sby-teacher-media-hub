/* =====================================================================
   รายงานราชการ .docx (สร้างด้วย ThaiDoc ตาม skill thai-official-docx)
   1) บันทึกข้อความรายงานผลการจัดกิจกรรมเกมบิงโก + ตารางคำที่เรียก + ผู้ชนะ
   2) รายการคำ/คำถาม-คำตอบของชุดคำ (ใช้เป็นเฉลย)
   3) ทะเบียนแจกการ์ดบิงโก (หมายเลขการ์ด–ชื่อนักเรียน–ลงชื่อรับ)
   UMD: ใช้ทั้งเบราว์เซอร์ (window.Docs) และ Node (dev/build-docs.js)
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('../assets/js/thaidoc.browser.js'), require('./bingo.js'));
    else root.Docs = factory(root.ThaiDoc, root.Bingo);
})(typeof self !== 'undefined' ? self : this, function (T, Bingo) {
    'use strict';

    const dots = (v, n) => (v && String(v).trim() ? String(v).trim() : '.'.repeat(n || 30));
    const pad = (n) => String(n).padStart(3, '0');
    const SIZE_TXT = (g) => `${g.size} × ${g.size} ช่อง${g.free ? ' (มีช่อง FREE)' : ''}`;
    const patternLabel = (id) => (Bingo.PATTERNS.find((p) => p.id === id) || {}).label || id;
    function timeTxt(iso) {
        const d = new Date(iso);
        if (isNaN(d)) return '';
        return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')} น.`;
    }
    function itemMap(set) { return new Map((set ? set.items : []).map((i) => [i.id, i])); }
    function agencyLine(sc) {
        return sc.name ? `${sc.name}${sc.agency ? ` ${sc.agency}` : ''}` : '';
    }

    /* 1) บันทึกข้อความรายงานผลกิจกรรม */
    function activityReport(data, game, set, now) {
        const sc = data.school;
        const m = itemMap(set);
        const calledN = game.calls.length;
        const winners = game.winners;
        const winTxt = winners.length
            ? `มีผู้ชนะ ${winners.length} คน ได้แก่ ${winners.map((w) => `การ์ดหมายเลข ${pad(w.no)}${game.students[w.no - 1] ? ` (${game.students[w.no - 1]})` : ''}`).join(' ')}`
            : 'ยังไม่มีผู้ชนะ';
        const memo = T.memo({
            agency: agencyLine(sc),
            date: T.thaiDate(now || new Date()),
            subject: `รายงานผลการจัดกิจกรรมการเรียนรู้ด้วยเกมบิงโก ${game.name || ''}`.trim(),
            to: sc.director ? `ผู้อำนวยการ${sc.name || 'โรงเรียน'}` : '',
            paragraphs: [
                `ตามที่ข้าพเจ้า ${dots(sc.teacherName, 40)} ได้จัดกิจกรรมการเรียนรู้ด้วยเกมบิงโกเพื่อทบทวนบทเรียน รายวิชา${set ? set.subject : '..........'} ชั้น${dots(game.cls || (set && set.level), 10)} ภาคเรียนที่ ${dots(sc.semester, 3)} ปีการศึกษา ${dots(sc.academicYear, 6)} เรื่อง ${set ? set.name : '..............................'} นั้น`,
                `บัดนี้ การจัดกิจกรรมได้ดำเนินการเรียบร้อยแล้ว โดยใช้ชุดคำจำนวน ${set ? set.items.length : 0} คำ สร้างการ์ดบิงโกขนาด ${SIZE_TXT(game)} ที่ไม่ซ้ำกันจำนวน ${game.cards.length} ใบ กติกาการชนะแบบ${patternLabel(game.pattern)} ครูเรียกคำไปทั้งสิ้น ${calledN} คำ ${winTxt} รายละเอียดตามตารางที่แนบมาพร้อมนี้`,
                'จึงเรียนมาเพื่อโปรดทราบ',
            ],
            signer: { name: sc.teacherName, position: sc.teacherPosition },
        });
        const rows = game.calls.map((c, i) => {
            const it = m.get(c.id);
            return [String(i + 1), it ? (it.q || it.a) : '-', it ? it.a : '-', timeTxt(c.at)];
        });
        const table = T.reportTable({
            title: `ผลการเรียกคำในกิจกรรมเกมบิงโก ${game.name || ''}`.trim(),
            subtitle: [`${set ? `${set.subject} • ${set.name}` : ''}`, `${sc.name || ''}${sc.name ? ' ' : ''}ภาคเรียนที่ ${dots(sc.semester, 3)} ปีการศึกษา ${dots(sc.academicYear, 6)}`],
            columns: [{ label: 'ลำดับ', width: 1.5, align: 'center' }, { label: 'สิ่งที่ครูเรียก (คำถาม)', width: 7.5 }, { label: 'คำบนการ์ด (คำตอบ)', width: 4.5 }, { label: 'เวลา', width: 2.5, align: 'center' }],
            rows: rows.length ? rows : [['-', 'ยังไม่ได้เรียกคำ', '-', '-']],
            repeatHeader: true,
            pageNumbers: true,
            note: winners.length
                ? `ผู้ชนะ: ${winners.map((w, i) => `${i + 1}) การ์ดหมายเลข ${pad(w.no)}${game.students[w.no - 1] ? ` ${game.students[w.no - 1]}` : ''} — ${w.detail || patternLabel(w.pattern)} (เมื่อเรียกครบ ${w.calls || '-'} คำ)`).join('  ')}`
                : 'ผู้ชนะ: ยังไม่มีผู้ชนะ',
            signers: [{ name: sc.teacherName, position: sc.teacherPosition || 'ครูผู้สอน' }, { name: sc.headName, position: sc.headPosition || 'หัวหน้ากลุ่มสาระการเรียนรู้' }],
        });
        return [memo, table];
    }

    /* 2) รายการคำของชุดคำ */
    function wordList(data, set) {
        const sc = data.school;
        return [T.reportTable({
            title: `รายการคำสำหรับเกมบิงโก เรื่อง ${set.name}`,
            subtitle: [`รายวิชา${set.subject} ชั้น${set.level}${sc.name ? ` • ${sc.name}` : ''}`, `จำนวน ${set.items.length} คำ`],
            columns: [{ label: 'ที่', width: 1.3, align: 'center' }, { label: 'สิ่งที่ครูเรียก (คำถาม/ความหมาย)', width: 9 }, { label: 'คำบนการ์ด (คำตอบ)', width: 5.7 }],
            rows: set.items.map((it, i) => [String(i + 1), it.q || it.a, it.a]),
            repeatHeader: true,
            pageNumbers: true,
            signers: [{ name: sc.teacherName, position: sc.teacherPosition || 'ครูผู้สอน' }],
        })];
    }

    /* 3) ทะเบียนแจกการ์ด */
    function cardRegister(data, game, set) {
        const sc = data.school;
        return [T.reportTable({
            title: `ทะเบียนแจกการ์ดบิงโก ${game.name || ''}`.trim(),
            subtitle: [`${set ? `${set.subject} • ${set.name}` : ''} • การ์ด ${SIZE_TXT(game)} จำนวน ${game.cards.length} ใบ`, `รหัสชุดการ์ด ${game.seed}${game.cls ? ` • ชั้น ${game.cls}` : ''}`],
            columns: [{ label: 'ที่', width: 1.3, align: 'center' }, { label: 'หมายเลขการ์ด', width: 2.7, align: 'center' }, { label: 'ชื่อ - สกุล', width: 7.5 }, { label: 'ลงชื่อรับการ์ด', width: 4.5 }],
            rows: game.cards.map((c, i) => [String(i + 1), pad(c.no), game.students[c.no - 1] || '', '']),
            repeatHeader: true,
            pageNumbers: true,
            signers: [{ name: sc.teacherName, position: sc.teacherPosition || 'ครูผู้สอน' }],
        })];
    }

    const REPORTS = [
        { id: 'activity', label: 'บันทึกข้อความรายงานผลการจัดกิจกรรม', desc: 'บันทึกข้อความ (ครุฑ) + ตารางคำที่เรียกตามลำดับ + ผู้ชนะ + ช่องลงนาม', icon: 'fa-file-signature', need: 'game' },
        { id: 'words', label: 'รายการคำ / เฉลยของชุดคำ', desc: 'ตารางสิ่งที่ครูเรียกและคำตอบทุกคำในชุด', icon: 'fa-list-ol', need: 'set' },
        { id: 'register', label: 'ทะเบียนแจกการ์ดบิงโก', desc: 'หมายเลขการ์ด ชื่อนักเรียน และช่องลงชื่อรับ', icon: 'fa-id-card', need: 'game' },
    ];

    function build(id, data, game, set, now) {
        if (id === 'activity') return { sections: activityReport(data, game, set, now), name: `รายงานผลกิจกรรมบิงโก_${game.name || 'เกม'}`, title: 'รายงานผลการจัดกิจกรรมเกมบิงโก' };
        if (id === 'words') return { sections: wordList(data, set), name: `รายการคำบิงโก_${set.name}`, title: 'รายการคำสำหรับเกมบิงโก' };
        return { sections: cardRegister(data, game, set), name: `ทะเบียนแจกการ์ดบิงโก_${game.name || 'เกม'}`, title: 'ทะเบียนแจกการ์ดบิงโก' };
    }

    return { REPORTS, build, activityReport, wordList, cardRegister };
});
