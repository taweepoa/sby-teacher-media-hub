/* =====================================================================
   เอกสารเกมบันไดงูตอบคำถาม
   .docx (ผ่าน ThaiDoc เท่านั้น — ตามระเบียบงานสารบรรณ):
     1) สรุปผลการแข่งขัน (ตารางอันดับ + ประวัติคำถาม + ลงนามคณะกรรมการ)
     2) บันทึกข้อความรายงานผลการจัดกิจกรรม + สรุปผลแนบท้าย
     3) ชุดคำถามพร้อมเฉลย (ใช้เป็นใบเฉลยของครู / เก็บเป็นหลักฐาน)
   หน้าพิมพ์จากเบราว์เซอร์: ใบสรุปผล + การ์ดคำถาม + ใบเฉลย (กระดานอยู่ใน boardart.js) — โหมดทดลองใช้มีลายน้ำ
   ข้อความหลักมาจาก "แม่แบบ" (tpl) ที่แก้ได้ในหน้าตั้งค่า · ค่าที่ไม่มีในข้อมูลเว้นจุดไข่ปลาเสมอ ห้ามเดา
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
    const demoOn = () => { try { return typeof window !== 'undefined' && !!(window.VSDemo && window.VSDemo.active); } catch (e) { return false; } };
    const WM = () => (demoOn() ? `<div class="demo-wm" aria-hidden="true">${esc(window.VSDemo.watermark || 'ฉบับทดลองใช้')}</div>` : '');
    const fill = (t, vars) => String(t || '').replace(/\{([^}]+)\}/g, (m, k) => (vars[k] == null ? m : String(vars[k]))).replace(/\s{2,}/g, ' ').trim();

    /* แม่แบบเริ่มต้น (ซ้ำกับ Store.TPL_DEFAULT เพื่อให้ Node ใช้ได้) */
    const TPL = {
        purpose: 'เพื่อทบทวนบทเรียนและส่งเสริมการเรียนรู้อย่างสนุกสนานผ่านการทำงานเป็นทีม',
        memoSubject: 'รายงานผลการจัดกิจกรรม{กิจกรรม}',
        memoOpen: 'ตามที่{โรงเรียน}ได้จัดกิจกรรม{กิจกรรม}{เมื่อ} {วัตถุประสงค์} นั้น',
        memoBody: 'บัดนี้ การดำเนินกิจกรรมดังกล่าวเสร็จสิ้นแล้ว มีทีมเข้าร่วมการแข่งขันทั้งสิ้น {จำนวนทีม} ทีม ใช้ชุดคำถาม{ชุดคำถาม} บนกระดานบันไดงู {จำนวนช่อง} ช่อง ตอบคำถามทั้งสิ้น {จำนวนคำถาม} ข้อ ตอบถูก {ตอบถูก} ข้อ คิดเป็นร้อยละ {ร้อยละ} {ผลรางวัล} รายละเอียดตามสรุปผลการแข่งขันที่แนบมาพร้อมนี้',
        memoClose: 'จึงเรียนมาเพื่อโปรดทราบ',
        summaryTitle: 'สรุปผลการแข่งขันเกมบันไดงูตอบคำถาม',
        rulesNote: 'กติกา: ทอยลูกเต๋าเดินตามแต้ม ตกช่องคำถามต้องตอบภายใน {เวลา} วินาที ตอบถูกเดินต่อ {ถูก} ช่อง ตอบผิดถอย {ผิด} ช่อง ขึ้นบันไดเมื่อถึงเชิงบันได ลงตามตัวงูเมื่อถึงหัวงู ทีมแรกที่ถึงช่อง {จำนวนช่อง} เป็นผู้ชนะ',
        judgePos1: 'ประธานกรรมการ', judgePos2: 'กรรมการ', judgePos3: 'กรรมการและเลขานุการ',
        cardFooter: 'เกมบันไดงูตอบคำถาม',
    };
    const tplOf = (t) => Object.assign({}, TPL, t || {});

    function context(g, school, tpl) {
        const ql = Engine.questionLog(g).filter((l) => !l.skipped);
        const ok = ql.filter((l) => l.ok).length;
        return {
            g, school: school || {}, tpl: tplOf(tpl),
            title: g.title || '', setName: g.setName || '', subject: g.subject || '', boardName: g.boardName || '',
            dateText: g.dateText || '', place: g.place || '',
            judges: [0, 1, 2].map((i) => (g.judges || [])[i] || ''),
            ranking: Engine.ranking(g), teams: g.teams.length, n: g.board.n,
            asked: ql.length, ok, pct: ql.length ? Math.round((ok * 1000) / ql.length) / 10 : 0,
            rounds: g.round,
        };
    }
    function headLines(c) {
        const l3 = [c.dateText && `วันที่ ${c.dateText}`, c.place && `ณ ${c.place}`].filter(Boolean).join(' ');
        return [c.title || DOTS(60), c.school.name || '', l3].filter(Boolean);
    }
    function ruleText(c) {
        const o = c.g.opts;
        return fill(c.tpl.rulesNote, { เวลา: o.time || 'ไม่จำกัด', ถูก: o.rightStep, ผิด: o.wrongStep, จำนวนช่อง: c.n, โบนัส: o.bonusStep });
    }
    const teamName = (g, id) => { const t = g.teams.find((x) => x.id === id); return t ? t.name : '-'; };

    const SUM_COLS = [
        { label: 'อันดับ', width: 1.4, align: 'center' },
        { label: 'ชื่อทีม', width: 4.2 },
        { label: 'ช่องที่ถึง', width: 2.0, align: 'center' },
        { label: 'ตอบถูก', width: 1.8, align: 'center' },
        { label: 'ตอบผิด', width: 1.8, align: 'center' },
        { label: 'ผลการแข่งขัน', width: 4.8, align: 'center' },
    ];
    const sumRows = (c) => c.ranking.map((t) => [String(t.rank), t.name, t.finishAt ? `${t.pos} (เข้าเส้นชัย)` : String(t.pos), String(t.right), String(t.wrong), t.award || '-']);
    const HIS_COLS = [
        { label: 'ข้อที่', width: 1.2, align: 'center' },
        { label: 'คำถาม', width: 6.6 },
        { label: 'ทีม', width: 2.8 },
        { label: 'คำตอบที่ตอบ', width: 2.8 },
        { label: 'ผล', width: 2.6, align: 'center' },
    ];
    function givenText(g, l) {
        if (l.skipped) return '-';
        const q = g.questions.find((x) => x.id === l.qid);
        if (l.given == null || l.given === '') return 'ไม่ได้ตอบ';
        if (q && q.type === 'mc') { const i = Number(l.given); return `${Engine.CHOICE_LABELS[i] || ''}. ${(q.choices || [])[i] || ''}`; }
        if (q && q.type === 'tf') return String(l.given) === 'true' ? 'ถูก' : 'ผิด';
        return String(l.given);
    }
    function resultText(g, l) {
        if (l.skipped) return 'ข้าม';
        return l.ok ? `ถูก (+${g.opts.rightStep})` : (l.given == null ? `หมดเวลา (-${g.opts.wrongStep})` : `ผิด (-${g.opts.wrongStep})`);
    }
    const hisRows = (c) => Engine.questionLog(c.g).map((l, i) => [String(i + 1), l.q, teamName(c.g, l.team), givenText(c.g, l), resultText(c.g, l)]);
    const signers = (c) => c.judges.map((n, i) => ({ name: n, position: c.tpl[`judgePos${i + 1}`] }));

    function summarySections(T, c) {
        const rows = hisRows(c);
        const out = [T.reportTable({ title: c.tpl.summaryTitle, subtitle: headLines(c), columns: SUM_COLS, rows: sumRows(c), note: `${ruleText(c)}  (ชุดคำถาม: ${c.setName || '-'} • ${c.boardName || `กระดาน ${c.n} ช่อง`} • เล่น ${c.rounds} รอบ ตอบคำถาม ${c.asked} ข้อ ถูก ${c.ok} ข้อ)`, signers: signers(c) })];
        if (rows.length) out.push(T.reportTable({ title: 'ประวัติคำถามระหว่างการแข่งขัน', subtitle: [c.title || DOTS(60)], columns: HIS_COLS, rows, repeatHeader: true }));
        return out;
    }

    function memoDefaults(c, today) {
        const s = c.school;
        return { agency: s.agency || s.name || '', docNo: '', date: memoDate(today || new Date()), to: s.director || '', reporterName: s.reporterName || '', reporterPosition: s.reporterPosition || '', purpose: c.tpl.purpose };
    }
    function awardText(c) {
        const parts = [];
        [1, 2, 3].forEach((r) => {
            const ts = c.ranking.filter((t) => t.rank === r && t.award);
            if (ts.length) parts.push(`รางวัล${Engine.AWARDS[r - 1]} ได้แก่ ${thaiList(ts.map((t) => t.name))}`);
        });
        return parts.length ? `ผลการแข่งขันปรากฏว่า ${parts.join(' ')}` : '';
    }
    function memoText(c, form) {
        const f = Object.assign(memoDefaults(c), form || {});
        const vars = {
            โรงเรียน: c.school.name || `โรงเรียน${DOTS(30)}`,
            กิจกรรม: c.title || `เกมบันไดงูตอบคำถาม${DOTS(20)}`,
            เมื่อ: [c.dateText && ` เมื่อวันที่ ${c.dateText}`, c.place && ` ณ ${c.place}`].filter(Boolean).join(''),
            วัตถุประสงค์: f.purpose || '',
            จำนวนทีม: c.teams, ชุดคำถาม: c.setName ? ` "${c.setName}"` : '', จำนวนช่อง: c.n,
            จำนวนคำถาม: c.asked, ตอบถูก: c.ok, ร้อยละ: c.pct.toFixed(1),
            ผลรางวัล: c.g.status === 'done' ? awardText(c) : '',
        };
        return {
            agency: f.agency, docNo: f.docNo, date: f.date,
            subject: fill(c.tpl.memoSubject, vars),
            to: f.to,
            paragraphs: [fill(c.tpl.memoOpen, vars), fill(c.tpl.memoBody, vars), fill(c.tpl.memoClose, vars)].filter(Boolean),
            signer: { name: f.reporterName, position: f.reporterPosition },
        };
    }
    function memoSections(T, c, form) {
        T.resetMemoFields();
        return [T.memo(memoText(c, form)), summarySections(T, c)[0]];
    }

    /* ชุดคำถามพร้อมเฉลย */
    const SET_COLS = [
        { label: 'ข้อ', width: 1.1, align: 'center' },
        { label: 'ประเภท', width: 1.9, align: 'center' },
        { label: 'คำถาม / ตัวเลือก', width: 8.6 },
        { label: 'เฉลย', width: 4.4 },
    ];
    function qLines(q) {
        const lines = [q.q + (q.img ? ' (มีรูปประกอบ)' : '')];
        if (q.type === 'mc') q.choices.forEach((ch, i) => { if (ch) lines.push(`${Engine.CHOICE_LABELS[i]}. ${ch}`); });
        return lines;
    }
    function setSections(T, set, school) {
        const rows = set.questions.map((q, i) => [String(i + 1), Engine.QTYPES[q.type].short, qLines(q), [Engine.answerText(q)].concat(q.explain ? [`(${q.explain})`] : [])]);
        return [T.reportTable({ title: `ชุดคำถามพร้อมเฉลย: ${set.name || DOTS(30)}`, subtitle: [[set.subject, set.level].filter(Boolean).join(' • ') || DOTS(40), (school && school.name) || ''].filter(Boolean), columns: SET_COLS, rows, repeatHeader: true, pageNumbers: true })];
    }

    /* ---------- ใบสรุปผล (พิมพ์จากเบราว์เซอร์) ---------- */
    function scoreSheetHTML(c) {
        const medal = (r) => ['fa-trophy', 'fa-medal', 'fa-medal'][r - 1] || 'fa-star';
        const sg = signers(c);
        return `<section class="ps-page">${WM()}
            <div class="ps-head"><div class="ps-school">${esc(c.school.name || '')}</div>
                <h1>${esc(c.tpl.summaryTitle)}</h1>
                <div class="ps-title">${esc(c.title || DOTS(60))}</div>
                <div class="ps-sub">${esc([c.dateText && `วันที่ ${c.dateText}`, c.place && `ณ ${c.place}`].filter(Boolean).join(' ') || DOTS(50))}</div></div>
            <table class="ps-rank"><thead><tr>${SUM_COLS.map((k) => `<th>${esc(k.label)}</th>`).join('')}</tr></thead>
            <tbody>${c.ranking.map((t) => `<tr class="r${t.rank}"><td><span class="ps-badge" style="--c:${esc(t.color)}">${t.rank <= 3 ? `<i class="fas ${medal(t.rank)}"></i>` : t.rank}</span></td><td><b>${esc(t.name)}</b></td><td>${t.pos}${t.finishAt ? ' <i class="fas fa-flag-checkered"></i>' : ''}</td><td>${t.right}</td><td>${t.wrong}</td><td>${esc(t.award || '-')}</td></tr>`).join('')}</tbody></table>
            <h2>ประวัติคำถาม (${c.asked} ข้อ ตอบถูก ${c.ok} ข้อ ร้อยละ ${c.pct.toFixed(1)})</h2>
            <table class="ps-det"><thead><tr>${HIS_COLS.map((k) => `<th>${esc(k.label)}</th>`).join('')}</tr></thead>
            <tbody>${hisRows(c).map((r) => `<tr>${r.map((v, i) => `<td class="${HIS_COLS[i].align === 'center' ? 'c' : ''}">${esc(v)}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="5" class="c">ไม่มีคำถามในเกมนี้</td></tr>'}</tbody></table>
            <p class="ps-rule">${esc(ruleText(c))}</p>
            <div class="ps-signs">${sg.map((s) => `<div><p>ลงชื่อ${DOTS(34)}</p><p>(${esc(s.name || DOTS(34))})</p><p>${esc(s.position)}</p></div>`).join('')}</div>
        </section>`;
    }

    /* ---------- การ์ดคำถามเล่นแบบกระดาษ: A4 หน้าละ 8 ใบ (2 × 4) เฉลยกลับหัวด้านล่าง พับ/ตัดได้ ---------- */
    function cardHTML(set, q, i, tpl) {
        const t = Engine.QTYPES[q.type];
        const choices = q.type === 'mc' ? `<ol class="qc-ch">${q.choices.map((ch, k) => (ch ? `<li><b>${Engine.CHOICE_LABELS[k]}.</b> ${esc(ch)}</li>` : '')).join('')}</ol>` : q.type === 'tf' ? '<div class="qc-tf"><span>ถูก</span><span>ผิด</span></div>' : '<div class="qc-fill">ตอบ: ..............................</div>';
        return `<div class="qcard" style="--c:${esc(set.color)}">
            <div class="qc-top"><span class="qc-no">${i + 1}</span><span class="qc-type"><i class="fas ${t.icon}"></i> ${esc(t.short)}</span><span class="qc-set">${esc(set.name)}</span></div>
            <div class="qc-body">${q.img ? `<img src="${esc(q.img)}" alt="">` : ''}<div class="qc-q">${esc(q.q)}</div>${choices}</div>
            <div class="qc-ans"><span>เฉลย: ${esc(Engine.answerText(q))}</span></div>
            <div class="qc-foot">${esc(tplOf(tpl).cardFooter)}</div>
        </div>`;
    }
    function cardsHTML(set, tpl) {
        const per = 8;
        const pages = [];
        for (let i = 0; i < set.questions.length; i += per) {
            pages.push(`<section class="pc-page">${WM()}<div class="pc-grid">${set.questions.slice(i, i + per).map((q, k) => cardHTML(set, q, i + k, tpl)).join('')}</div></section>`);
        }
        return pages.join('');
    }
    function answerKeyHTML(set, school) {
        return `<section class="ps-page">${WM()}
            <div class="ps-head"><div class="ps-school">${esc((school && school.name) || '')}</div><h1>ใบเฉลยชุดคำถาม</h1><div class="ps-title">${esc(set.name)}</div><div class="ps-sub">${esc([set.subject, set.level].filter(Boolean).join(' • '))} • ${set.questions.length} ข้อ</div></div>
            <table class="ps-det"><thead><tr><th>ข้อ</th><th>ประเภท</th><th>คำถาม</th><th>เฉลย</th></tr></thead>
            <tbody>${set.questions.map((q, i) => `<tr><td class="c">${i + 1}</td><td class="c">${esc(Engine.QTYPES[q.type].short)}</td><td>${esc(q.q)}</td><td><b>${esc(Engine.answerText(q))}</b></td></tr>`).join('')}</tbody></table>
        </section>`;
    }

    return { TPL, context, summarySections, memoDefaults, memoText, memoSections, setSections, scoreSheetHTML, cardsHTML, answerKeyHTML, givenText, resultText, fill, ruleText };
});
