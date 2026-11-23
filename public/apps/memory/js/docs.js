/* =====================================================================
   เอกสารผลการแข่งขันเกมจับคู่ความจำ
   .docx (ผ่าน ThaiDoc เท่านั้น — ตามระเบียบงานสารบรรณ):
     1) สรุปผลการแข่งขัน (ตารางอันดับ + ผลรายข้อ/รายรอบ + ลงนามคณะกรรมการ)
     2) บันทึกข้อความรายงานผลการจัดกิจกรรม + สรุปผลแนบท้าย
   หน้าพิมพ์จากเบราว์เซอร์: ใบสรุปคะแนน (A4) + การ์ดสำหรับเล่นแบบกระดาษ — โหมดทดลองใช้มีลายน้ำ
   ใช้ได้ทั้งเบราว์เซอร์และ Node (dev/build-docs.js) — ค่าที่ไม่มีในข้อมูลเว้นจุดไข่ปลาเสมอ ห้ามเดา
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
    else root.Docs = factory(root.Engine);
})(typeof self !== 'undefined' ? self : this, function (Engine) {
    'use strict';

    const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const DOTS = (n) => '.'.repeat(n);
    const fmt = (n) => Number(n || 0).toLocaleString('en-US');
    const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const memoDate = (d) => `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
    const thaiList = (arr) => (arr.length <= 1 ? (arr[0] || '') : `${arr.slice(0, -1).join(' ')} และ${arr[arr.length - 1]}`);
    const JUDGE_POS = ['ประธานกรรมการ', 'กรรมการ', 'กรรมการและเลขานุการ'];
    const demoOn = () => { try { return typeof window !== 'undefined' && !!(window.VSDemo && window.VSDemo.active); } catch (e) { return false; } };
    const WM = () => (demoOn() ? `<div class="demo-wm" aria-hidden="true">${esc(window.VSDemo.watermark || 'ฉบับทดลองใช้')}</div>` : '');
    /* อีโมจิพิมพ์ใน Word ไม่สวย → ในเอกสารใช้ "ภาพ" + คำ */
    const isEmoji = (s) => /\p{Extended_Pictographic}/u.test(String(s || '')) && String(s).replace(/[\p{Extended_Pictographic}️‍\s]/gu, '') === '';
    const plain = (s) => (isEmoji(s) ? 'ภาพ' : String(s || ''));

    function context(g, school) {
        const unit = g.mode === 'memory' ? 'คู่' : g.mode === 'match' ? 'รอบ' : 'ข้อ';
        return {
            g, unit,
            school: school || {},
            title: g.title || '',
            setName: g.setName || '',
            subject: g.subject || '',
            mode: Engine.MODES[g.mode].label,
            level: Engine.LEVELS[g.opts.level].label,
            dateText: g.dateText || '',
            place: g.place || '',
            judges: [0, 1, 2].map((i) => (g.judges || [])[i] || ''),
            ranking: Engine.ranking(g),
            teams: g.teams.length,
            played: g.log.length,
            okCount: g.mode === 'match' ? g.log.reduce((a, l) => a + (l.correct || 0), 0) : g.log.filter((l) => l.ok).length,
        };
    }
    function headLines(c) {
        const l3 = [c.dateText && `วันที่ ${c.dateText}`, c.place && `ณ ${c.place}`].filter(Boolean).join(' ');
        return [c.title || DOTS(60), c.school.name || '', l3].filter(Boolean);
    }
    function ruleText(c) {
        const o = c.g.opts;
        const L = Engine.LEVELS[o.level];
        let s = `ชุดเนื้อหา: ${c.setName || '-'}${c.subject ? ` (${c.subject})` : ''}  รูปแบบเกม: ${c.mode}  ระดับ: ${c.level}  `;
        if (c.g.mode === 'memory') s += `จำนวน ${c.g.pairs.length} คู่ (${c.g.pairs.length * 2} ใบ) จับคู่ถูกได้คู่ละ ${fmt(o.points)} คะแนน`;
        else if (c.g.mode === 'match') s += `จำนวน ${c.g.rounds.length} รอบ รอบละ ${c.g.rounds[0] ? c.g.rounds[0].left.length : 0} คู่ เวลารอบละ ${Engine.timeOf(c.g)} วินาที ถูกคู่ละ ${fmt(o.points)} คะแนน ถูกครบทันเวลาได้โบนัส ${fmt(o.speedBonus)} คะแนน`;
        else if (c.g.mode === 'quiz') s += `จำนวน ${c.g.questions.length} ข้อ เวลาข้อละ ${Engine.timeOf(c.g)} วินาที ตอบถูกได้ ${fmt(o.points)} คะแนน ตอบภายในครึ่งเวลาได้โบนัส ${fmt(o.speedBonus)} คะแนน`;
        else s += `จำนวน ${c.g.questions.length} ข้อ ตอบถูกได้สิทธิ์เปิดกล่องรางวัล ${c.g.boxes.length} กล่อง (คะแนน คูณ 2 กล่องว่าง หรือหักคะแนน)`;
        return s;
    }
    const teamName = (g, id) => { const t = g.teams.find((x) => x.id === id); return t ? t.name : '-'; };

    const SUM_COLS = [
        { label: 'อันดับ', width: 1.4, align: 'center' },
        { label: 'ชื่อทีม', width: 4.4 },
        { label: 'ทำถูก', width: 2.2, align: 'center' },
        { label: 'คะแนนรวม', width: 2.2, align: 'center' },
        { label: 'ผลการแข่งขัน', width: 3.8, align: 'center' },
    ];
    const sumRows = (c) => c.ranking.map((t) => [String(t.rank), t.name, `${t.ok} ${c.unit === 'รอบ' ? 'คู่' : c.unit}`, fmt(t.score), t.award || '-']);
    const DET_COLS = [
        { label: 'ลำดับ', width: 1.3, align: 'center' },
        { label: 'รายการ', width: 6.2 },
        { label: 'ทีม', width: 3.4 },
        { label: 'ผล', width: 2.4, align: 'center' },
        { label: 'คะแนน', width: 1.7, align: 'center' },
    ];
    function detRows(c) {
        const g = c.g;
        return g.log.map((l, i) => {
            let item; let res;
            if (g.mode === 'match') { item = `รอบที่ ${l.round}`; res = l.skipped ? 'ข้าม' : `ถูก ${l.correct}/${l.total}${l.bonus ? ' +โบนัส' : ''}`; }
            else { item = `${plain(l.a)} – ${l.b}`; res = l.skipped ? 'ข้าม' : (l.ok ? 'ถูก' : (g.mode === 'memory' ? '-' : (l.chose == null ? 'หมดเวลา' : 'ผิด'))); if (l.box) res += ` (กล่อง ${l.box})`; }
            return [String(i + 1), item, teamName(g, l.team), res, fmt(l.points)];
        });
    }
    const signers = (c) => c.judges.map((n, i) => ({ name: n, position: JUDGE_POS[i] }));

    function summarySections(T, c) {
        return [
            T.reportTable({ title: 'สรุปผลการแข่งขันเกมจับคู่ความจำ', subtitle: headLines(c), columns: SUM_COLS, rows: sumRows(c), note: ruleText(c), signers: signers(c) }),
            T.reportTable({ title: `ผลการแข่งขันราย${c.unit}`, subtitle: [c.title || DOTS(60)], columns: DET_COLS, rows: detRows(c), repeatHeader: true }),
        ];
    }

    function memoDefaults(c, today) {
        const s = c.school;
        return { agency: s.agency || s.name || '', docNo: '', date: memoDate(today || new Date()), to: s.director || '', reporterName: s.reporterName || '', reporterPosition: s.reporterPosition || '', ending: 'ทราบ', purpose: 'เพื่อทบทวนบทเรียนและส่งเสริมความจำ การคิดวิเคราะห์ และการทำงานเป็นทีมอย่างสนุกสนาน' };
    }
    function awardText(c) {
        const parts = [];
        [1, 2, 3].forEach((r) => {
            const ts = c.ranking.filter((t) => t.rank === r && t.award);
            if (ts.length) parts.push(`รางวัล${Engine.AWARDS[r - 1]} ได้แก่ ${thaiList(ts.map((t) => `${t.name} (${fmt(t.score)} คะแนน)`))}`);
        });
        return parts.join(' ');
    }
    function memoText(c, form) {
        const f = Object.assign(memoDefaults(c), form || {});
        const act = c.title || `เกมจับคู่ความจำ${DOTS(30)}`;
        const when = [c.dateText && `เมื่อวันที่ ${c.dateText}`, c.place && `ณ ${c.place}`].filter(Boolean).join(' ');
        const p1 = `ตามที่${c.school.name || `โรงเรียน${DOTS(30)}`}ได้จัดกิจกรรม${act}${when ? ` ${when}` : ''}${f.purpose ? ` ${f.purpose}` : ''} นั้น`;
        let p2 = `บัดนี้ การดำเนินกิจกรรมดังกล่าวเสร็จสิ้นแล้ว มีทีมเข้าร่วมการแข่งขันทั้งสิ้น ${c.teams} ทีม ใช้ชุดเนื้อหา${c.setName ? ` "${c.setName}"` : ''} ในรูปแบบ${c.mode} จำนวน ${c.played} ${c.unit}`;
        const aw = awardText(c);
        if (c.g.status === 'done' && aw) p2 += ` ผลการแข่งขันปรากฏว่า ${aw}`;
        p2 += ' รายละเอียดตามสรุปผลการแข่งขันที่แนบมาพร้อมนี้';
        return {
            agency: f.agency, docNo: f.docNo, date: f.date,
            subject: `รายงานผลการจัดกิจกรรม${c.title || 'เกมจับคู่ความจำ'}`,
            to: f.to,
            paragraphs: [p1, p2, `จึงเรียนมาเพื่อโปรด${f.ending === 'พิจารณา' ? 'พิจารณา' : 'ทราบ'}`],
            signer: { name: f.reporterName, position: f.reporterPosition },
        };
    }
    function memoSections(T, c, form) {
        T.resetMemoFields();
        return [T.memo(memoText(c, form)), summarySections(T, c)[0]];
    }

    /* ---------- ใบสรุปคะแนน (พิมพ์จากเบราว์เซอร์) ---------- */
    function scoreSheetHTML(c) {
        const medal = (r) => ['fa-trophy', 'fa-medal', 'fa-medal'][r - 1] || 'fa-star';
        const sg = signers(c);
        return `<section class="ps-page">${WM()}
            <div class="ps-head"><div class="ps-school">${esc(c.school.name || '')}</div>
                <h1>ใบสรุปคะแนนเกมจับคู่ความจำ</h1>
                <div class="ps-title">${esc(c.title || DOTS(60))}</div>
                <div class="ps-sub">${esc([c.dateText && `วันที่ ${c.dateText}`, c.place && `ณ ${c.place}`].filter(Boolean).join(' ') || DOTS(50))}</div></div>
            <table class="ps-rank"><thead><tr><th>อันดับ</th><th>ทีม</th><th>ทำถูก</th><th>คะแนนรวม</th><th>ผล</th></tr></thead>
            <tbody>${c.ranking.map((t) => `<tr class="r${t.rank}"><td><span class="ps-badge" style="--c:${esc(t.color)}">${t.rank <= 3 ? `<i class="fas ${medal(t.rank)}"></i>` : t.rank}</span></td><td><b>${esc(t.name)}</b></td><td>${t.ok}</td><td class="ps-score">${fmt(t.score)}</td><td>${esc(t.award || '-')}</td></tr>`).join('')}</tbody></table>
            <h2>ผลราย${esc(c.unit)}</h2>
            <table class="ps-det"><thead><tr>${DET_COLS.map((k) => `<th>${esc(k.label)}</th>`).join('')}</tr></thead>
            <tbody>${detRows(c).map((r) => `<tr>${r.map((v, i) => `<td class="${DET_COLS[i].align === 'center' ? 'c' : ''}">${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>
            <p class="ps-rule">${esc(ruleText(c))}</p>
            <div class="ps-signs">${sg.map((s) => `<div><p>ลงชื่อ${DOTS(34)}</p><p>(${esc(s.name || DOTS(34))})</p><p>${esc(s.position)}</p></div>`).join('')}</div>
        </section>`;
    }

    /* ---------- การ์ดสำหรับเล่นแบบกระดาษ: A4 หน้าละ 12 ใบ (3 × 4) + หน้าหลังการ์ด ---------- */
    function cardFace(set, p, side) {
        const txt = side === 'a' ? p.a : p.b;
        const big = side === 'a' && (p.img || isEmoji(p.a));
        const inner = side === 'a' && p.img ? `<img src="${esc(p.img)}" alt="">${p.a && !isEmoji(p.a) ? `<span class="pc-cap">${esc(p.a)}</span>` : ''}`
            : `<span class="${big ? 'pc-emoji' : 'pc-text'}${!big && txt.length > 22 ? ' long' : ''}">${esc(txt)}</span>`;
        return `<div class="pc-card" style="--c:${esc(set.color)}"><span class="pc-tag">${side === 'a' ? 'A' : 'B'}</span>${inner}</div>`;
    }
    function cardsHTML(set, opts) {
        const o = Object.assign({ back: true, backText: set.name, school: '' }, opts || {});
        const faces = [];
        set.pairs.forEach((p) => { faces.push(cardFace(set, p, 'a')); faces.push(cardFace(set, p, 'b')); });
        const pages = [];
        for (let i = 0; i < faces.length; i += 12) {
            const chunk = faces.slice(i, i + 12);
            pages.push(`<section class="pc-page">${WM()}<div class="pc-head"><b>${esc(set.name)}</b><span>${esc([set.subject, set.level, `แผ่นที่ ${pages.length / (o.back ? 2 : 1) + 1}`].filter(Boolean).join(' • '))}</span></div><div class="pc-grid">${chunk.join('')}</div><div class="pc-foot">ตัดตามเส้นประ • การ์ด A = ${esc(Store_kindA(set))} • การ์ด B = ${esc(Store_kindB(set))}</div></section>`);
            if (o.back) {
                // หน้าหลัง: สลับซ้าย-ขวาแต่ละแถว ให้ตรงกันเมื่อพิมพ์สองหน้า (กลับด้านตามขอบยาว)
                const backs = chunk.map(() => `<div class="pc-card pc-back" style="--c:${esc(set.color)}"><span class="pc-back-mark"><i class="fas fa-${esc(o.backIcon || 'star')}"></i></span><span class="pc-back-txt">${esc(o.backText || '')}</span></div>`);
                pages.push(`<section class="pc-page">${WM()}<div class="pc-head"><b>หน้าหลังการ์ด</b><span>${esc(o.school || '')}</span></div><div class="pc-grid">${backs.join('')}</div><div class="pc-foot">พิมพ์สองหน้า (กลับด้านตามขอบยาว) หรือพิมพ์แยกแล้วติดกาวด้านหลัง</div></section>`);
            }
        }
        return pages.join('');
    }
    const KIND_AB = { word: ['คำ', 'ความหมาย'], image: ['ภาพ', 'คำ'], qa: ['โจทย์', 'คำตอบ'] };
    const Store_kindA = (s) => (KIND_AB[s.kind] || KIND_AB.word)[0];
    const Store_kindB = (s) => (KIND_AB[s.kind] || KIND_AB.word)[1];

    return { context, summarySections, memoSections, memoText, memoDefaults, memoDate, scoreSheetHTML, cardsHTML, ruleText, detRows, isEmoji, JUDGE_POS };
});
