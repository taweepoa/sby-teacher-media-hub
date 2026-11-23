/* =====================================================================
   เอกสารราชการ (.docx ผ่าน ThaiDoc เท่านั้น) — ใช้ได้ทั้งเบราว์เซอร์และ Node (dev/build-docs.js)
   1) บันทึกข้อความรายงานผลการจัดการแข่งขัน
   2) ประกาศโรงเรียน เรื่อง ผลการแข่งขัน
   3) สรุปผลคะแนนการแข่งขัน (รายทีม + รายข้อ)
   4) หลักฐานการจ่ายเงินรางวัล (จำนวนเงินตัวอักษร)
   ค่าที่ไม่มีในข้อมูล (เลขที่หนังสือ ชื่อผู้ลงนาม ฯลฯ) เว้นจุดไข่ปลาเสมอ — ห้ามเดา
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
    else root.Docs = factory(root.Core);
})(typeof self !== 'undefined' ? self : this, function (Core) {
    'use strict';
    const DOTS = (n) => '.'.repeat(n);
    const thaiList = (a) => (a.length <= 1 ? (a[0] || '') : `${a.slice(0, -1).join(' ')} และ${a[a.length - 1]}`);

    /** ตัวแปรที่ใช้แทนค่าในแม่แบบข้อความ */
    function vars(data, match) {
        const s = data.school || {};
        const rk = Core.ranking(match);
        const prizes = data.prizes || [];
        const res = rk.filter((t) => t.rank <= Math.max(1, prizes.length)).map((t) => `${(prizes[t.rank - 1] || {}).label || `อันดับที่ ${t.rank}`} ได้แก่ ${t.name} (${t.score} คะแนน)`);
        return {
            'ชื่อการแข่ง': match.name || '', 'ระดับชั้น': match.level || '', 'วันที่': Core.thDate(match.date), 'สถานที่': match.place || '',
            'ผู้จัด': match.organizer || '', 'โรงเรียน': s.name || '', 'จำนวนทีม': String((match.teams || []).length), 'จำนวนข้อ': String((match.log || []).length),
            'ผลการแข่ง': thaiList(res), 'ปีการศึกษา': s.academicYear || '',
        };
    }
    const tpl = (data, key) => (data.templates && data.templates[key] != null ? data.templates[key] : Core.DEFAULT_TEMPLATES[key]);

    /** ข้อความบันทึกข้อความ (ใช้ทั้งดูตัวอย่างบนจอและ .docx) */
    function memoText(data, match, today) {
        const v = vars(data, match);
        const s = data.school || {};
        return {
            agency: s.agency || s.name || '',
            docNo: s.docPrefix ? `${s.docPrefix}${DOTS(10)}` : '',
            date: today ? Core.thDate(Core.iso(today)) : '',
            subject: Core.fill(tpl(data, 'memoSubject'), v),
            to: Core.fill(tpl(data, 'memoTo'), v),
            paragraphs: ['memoP1', 'memoP2', 'memoP3'].map((k) => Core.fill(tpl(data, k), v)).filter((x) => x.trim()),
            signer: { name: s.reporter || '', position: s.reporterPos || '' },
        };
    }

    function scoreRows(match, prizes) {
        return Core.ranking(match).map((t) => [String(t.rank), t.name, t.members || '', String(t.correct), String(t.wrong), String(t.score), (prizes[t.rank - 1] || {}).label || '']);
    }
    const SCORE_COLS = [
        { label: 'อันดับ', width: 1.4, align: 'center' }, { label: 'ทีม', width: 2.8 }, { label: 'สมาชิก', width: 5.2 },
        { label: 'ตอบถูก', width: 1.4, align: 'center' }, { label: 'ตอบผิด', width: 1.4, align: 'center' }, { label: 'คะแนน', width: 1.5, align: 'center' }, { label: 'ผลการแข่งขัน', width: 3.3, align: 'center' },
    ];

    function memoSections(T, data, match, today) {
        if (T.resetMemoFields) T.resetMemoFields();
        const m = memoText(data, match, today);
        return [T.memo(m)];
    }

    /** ประกาศโรงเรียน (ครุฑ 3 ซม. กึ่งกลาง) */
    function annSections(T, data, match, today) {
        const D = T.D, C = D.AlignmentType.CENTER;
        const s = data.school || {};
        const v = vars(data, match);
        const prizes = data.prizes || [];
        const rk = Core.ranking(match);
        const kids = [
            T.P({ align: C, children: [new D.ImageRun({ type: 'png', data: T.garuda(), transformation: { width: 105, height: 113 } })] }),
            T.P({ text: `ประกาศ${s.name || DOTS(40)}`, bold: true, align: C }),
            T.P({ text: `เรื่อง  ${Core.fill(tpl(data, 'annTitle'), v)}`, bold: true, align: C }),
            T.P({ text: '-------------------------------------------', align: C, after: 120 }),
            T.BODY(Core.fill(tpl(data, 'annP1'), v)),
        ];
        prizes.forEach((p, i) => {
            const win = rk.filter((t) => t.rank === i + 1);
            kids.push(T.P({ text: `${i + 1}. ${p.label}  ได้แก่  ${win.length ? win.map((t) => `${t.name} (${t.score} คะแนน)`).join(', ') : DOTS(40)}`, indent: { left: T.cm(2.5) } }));
            win.forEach((t) => { if (t.members) kids.push(T.P({ text: `สมาชิก ${t.members}`, indent: { left: T.cm(3.1) }, size: T.pt(15) })); });
        });
        const p2 = Core.fill(tpl(data, 'annP2'), v);
        if (p2.trim()) kids.push(T.BODY(p2));
        kids.push(...T.EMPTY(1, 10));
        kids.push(T.P({ text: `ประกาศ ณ วันที่  ${today ? Core.thDate(Core.iso(today), true) : DOTS(40)}`, indent: { left: T.cm(4.5) } }));
        kids.push(...T.EMPTY(2, 16));
        kids.push(...T.signBlock({ prefix: '', name: s.director || '', position: false }).slice(1));
        kids.push(T.P({ text: s.directorPos || `ผู้อำนวยการ${s.name || DOTS(30)}`, align: C, indent: { left: T.cm(6.5) } }));
        return [{ properties: { page: { size: T.A4, margin: T.MARGIN_STD } }, children: kids }];
    }

    /** สรุปผลคะแนน: ตารางรายทีม + ตารางรายข้อ (แนวนอน) */
    function scoreSections(T, data, match) {
        const s = data.school || {};
        const v = vars(data, match);
        const byId = new Map((match.teams || []).map((t) => [t.id, t]));
        const nm = (id) => (byId.get(id) || {}).name || '-';
        const sub = [`${s.name || ''}${match.level ? `  ระดับชั้น ${match.level}` : ''}`.trim(), `วันที่ ${v['วันที่'] || DOTS(30)}${match.place ? `  ณ ${match.place}` : ''}`].filter(Boolean);
        const judges = (match.judges || []).filter(Boolean);
        const signers = (judges.length ? judges : ['', '']).slice(0, 3).map((n) => ({ name: n, position: 'กรรมการตัดสิน' }));
        const sec1 = T.reportTable({ title: `สรุปผลคะแนนการแข่งขันตอบปัญหา${match.name || ''}`, subtitle: sub, columns: SCORE_COLS, rows: scoreRows(match, data.prizes || []), signers, pageNumbers: true, repeatHeader: true });
        const rows = (match.log || []).map((q) => [
            String(q.no), q.text + (q.answer ? ` (เฉลย: ${q.answer})` : ''),
            (q.presses || []).map((p, i) => `${i + 1}. ${nm(p.team)} ${(p.ms / 1000).toFixed(3)} วิ`),
            (q.events || []).map((e) => `${nm(e.team)} ${e.result === 'ok' ? 'ถูก' : e.result === 'bad' ? 'ผิด' : 'ผ่าน'} (${e.delta > 0 ? '+' : ''}${e.delta})`),
        ]);
        const sec2 = T.reportTable({
            title: 'รายละเอียดการตอบรายข้อ', subtitle: [`การแข่งขันตอบปัญหา${match.name || ''}`], landscape: true, pageNumbers: true, repeatHeader: true,
            columns: [{ label: 'ข้อ', width: 1.2, align: 'center' }, { label: 'คำถาม', width: 10 }, { label: 'ลำดับการกด (เวลาหลังเปิดรับ)', width: 7 }, { label: 'ผลการตอบ (คะแนน)', width: 6.5 }],
            rows: rows.length ? rows : [['', 'ยังไม่มีข้อมูลการตอบ', '', '']],
        });
        return [sec1, sec2];
    }

    /** หลักฐานการจ่ายเงินรางวัล — รวมเงิน + จำนวนเงินตัวอักษร */
    function payTotal(data, match) {
        const rk = Core.ranking(match);
        return (data.prizes || []).reduce((a, p, i) => a + (Number(p.amount) || 0) * rk.filter((t) => t.rank === i + 1).length, 0);
    }
    function paySections(T, data, match) {
        const s = data.school || {};
        const v = vars(data, match);
        const rk = Core.ranking(match);
        const rows = [];
        (data.prizes || []).forEach((p, i) => rk.filter((t) => t.rank === i + 1).forEach((t) => rows.push([String(rows.length + 1), t.name, p.label + (p.item ? ` และ${p.item}` : ''), Number(p.amount) ? Core.money(p.amount) : '-', ''])));
        const total = payTotal(data, match);
        rows.push(['', [{ t: 'รวมเงินทั้งสิ้น', bold: true }], [{ t: `(${Core.bahtText(total)})` }], [{ t: Core.money(total), bold: true }], '']);
        return [T.reportTable({
            title: Core.fill(tpl(data, 'payTitle'), v), subtitle: [`${s.name || DOTS(40)}  วันที่ ${v['วันที่'] || DOTS(30)}`],
            columns: [{ label: 'ที่', width: 1.1, align: 'center' }, { label: 'ทีมผู้รับรางวัล', width: 3.2 }, { label: 'รางวัล', width: 5 }, { label: 'จำนวนเงิน (บาท)', width: 2.8, align: 'right' }, { label: 'ลายมือชื่อผู้รับเงิน', width: 4 }],
            rows, note: Core.fill(tpl(data, 'payNote'), v),
            signers: [{ name: s.reporter || '', position: 'ผู้จ่ายเงิน' }, { name: s.director || '', position: s.directorPos || 'ผู้อำนวยการโรงเรียน' }],
        })];
    }

    const KINDS = {
        memo: { label: 'บันทึกข้อความรายงานผลการจัดการแข่งขัน', icon: 'fa-file-signature', build: memoSections },
        ann: { label: 'ประกาศผลการแข่งขัน', icon: 'fa-bullhorn', build: annSections },
        score: { label: 'สรุปผลคะแนน (รายทีม + รายข้อ)', icon: 'fa-table-list', build: scoreSections },
        pay: { label: 'หลักฐานการจ่ายเงินรางวัล', icon: 'fa-money-bill-wave', build: paySections },
    };
    function allSections(T, data, match, today, kinds) {
        return (kinds || Object.keys(KINDS)).reduce((a, k) => a.concat(KINDS[k].build(T, data, match, today)), []);
    }
    return { vars, memoText, memoSections, annSections, scoreSections, paySections, payTotal, scoreRows, KINDS, allSections };
});
