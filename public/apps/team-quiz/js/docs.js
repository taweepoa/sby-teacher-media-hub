/* =====================================================================
   เอกสารผลการแข่งขัน
   .docx (ผ่าน ThaiDoc เท่านั้น — ตามระเบียบงานสารบรรณ):
     1) สรุปผลการแข่งขัน (ตารางอันดับ + ลงนามคณะกรรมการตัดสิน)
     2) บันทึกข้อความรายงานผลการจัดกิจกรรม + สรุปผลการแข่งขันแนบท้าย
   หน้าพิมพ์จากเบราว์เซอร์: ตัวอย่างเอกสารราชการ (official-print.css) + ใบประกาศผลการแข่งขัน + เกียรติบัตรทีม
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
    /** วันที่ในบันทึกข้อความ: "19 ตุลาคม 2569" */
    const memoDate = (d) => `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
    const thaiList = (arr) => (arr.length <= 1 ? (arr[0] || '') : `${arr.slice(0, -1).join(' ')} และ${arr[arr.length - 1]}`);
    const JUDGE_POS = ['ประธานกรรมการ', 'กรรมการ', 'กรรมการและเลขานุการ'];
    /* โหมดทดลองใช้ (vs-demo.js): ลายน้ำ "ฉบับทดลองใช้" ทุกหน้าที่พิมพ์จากเบราว์เซอร์ (.docx ใส่หัวกระดาษโดย ThaiDoc เอง) */
    const demoOn = () => { try { return typeof window !== 'undefined' && !!(window.VSDemo && window.VSDemo.active); } catch (e) { return false; } };
    const WM = () => (demoOn() ? `<div class="demo-wm" aria-hidden="true">${esc(window.VSDemo.watermark || 'ฉบับทดลองใช้')}</div>` : '');

    /* ---------- รวบรวมข้อมูลการแข่งขัน ---------- */
    function context(m, school) {
        const rk = Engine.ranking(m);
        const p = Engine.progress(m);
        const pts = [...new Set(m.deck.map((q) => Engine.qPoints(m, q)))].sort((a, b) => a - b);
        const members = m.teams.reduce((a, t) => a + (t.members || []).length, 0);
        return {
            m,
            school: school || {},
            title: m.title || '',
            subtitle: m.subtitle || '',
            dateText: m.dateText || '',
            place: m.place || '',
            judges: [0, 1, 2].map((i) => (m.judges || [])[i] || ''),
            mode: Engine.MODES[m.mode] ? Engine.MODES[m.mode].label : '',
            setName: m.setName || '',
            ranking: rk,
            teams: m.teams.length,
            members,
            total: p.total,
            played: p.done,
            pointsText: pts.length === 1 ? `ข้อละ ${fmt(pts[0])} คะแนน` : `ตามข้อ ${fmt(pts[0])}–${fmt(pts[pts.length - 1])} คะแนน`,
            penalty: Number(m.opts && m.opts.penalty) || 0,
        };
    }

    function headLines(ctx) {
        const l2 = [ctx.title, ctx.subtitle].filter(Boolean).join(' ');
        const l3 = ctx.school.name || '';
        const l4 = [ctx.dateText && `วันที่ ${ctx.dateText}`, ctx.place && `ณ ${ctx.place}`].filter(Boolean).join(' ');
        return [l2 || DOTS(60), l3, l4].filter(Boolean);
    }
    function ruleText(ctx) {
        let s = `รูปแบบการแข่งขัน: ${ctx.mode}  ชุดคำถาม: ${ctx.setName || '-'}  จำนวน ${ctx.total} ข้อ (ใช้แข่งขันจริง ${ctx.played} ข้อ)  คะแนน${ctx.pointsText}`;
        if (ctx.penalty) s += `  ตอบผิดหัก ${fmt(ctx.penalty)} คะแนน`;
        return s;
    }

    const SUM_COLS = [
        { label: 'อันดับ', width: 1.3, align: 'center' },
        { label: 'ชื่อทีม', width: 3.2 },
        { label: 'รายชื่อสมาชิก', width: 5.4 },
        { label: 'ตอบถูก (ข้อ)', width: 1.7, align: 'center' },
        { label: 'คะแนนรวม', width: 1.7, align: 'center' },
        { label: 'ผลการแข่งขัน', width: 3.2, align: 'center' },
    ];
    function sumRows(ctx) {
        return ctx.ranking.map((t) => [String(t.rank), t.name, t.members && t.members.length ? t.members : ['-'], String(t.correct), fmt(t.score), t.award || '-']);
    }
    function signers(ctx) { return ctx.judges.map((n, i) => ({ name: n, position: JUDGE_POS[i] })); }

    /* ---------- 1) สรุปผลการแข่งขัน (.docx) ---------- */
    function summarySection(T, ctx) {
        return T.reportTable({
            title: 'สรุปผลการแข่งขัน',
            subtitle: headLines(ctx),
            columns: SUM_COLS,
            rows: sumRows(ctx),
            note: ruleText(ctx),
            signers: signers(ctx),
        });
    }

    /* ---------- 2) บันทึกข้อความรายงานผลการจัดกิจกรรม ---------- */
    function memoDefaults(ctx, today) {
        const s = ctx.school;
        return {
            agency: s.agency || s.name || '',
            docNo: '',
            date: memoDate(today || new Date()),
            to: s.director || '',
            reporterName: s.reporterName || '',
            reporterPosition: s.reporterPosition || '',
            ending: 'ทราบ',
        };
    }
    function awardText(ctx) {
        const parts = [];
        [1, 2, 3].forEach((r) => {
            const ts = ctx.ranking.filter((t) => t.rank === r);
            if (!ts.length) return;
            parts.push(`รางวัล${Engine.AWARDS[r - 1]} ได้แก่ ${thaiList(ts.map((t) => `${t.name} (${fmt(t.score)} คะแนน)`))}`);
        });
        return parts.join(' ');
    }
    function memoText(ctx, form) {
        const f = Object.assign(memoDefaults(ctx), form || {});
        const act = ctx.title || `การแข่งขันตอบคำถาม${DOTS(30)}`;
        const when = [ctx.dateText && `เมื่อวันที่ ${ctx.dateText}`, ctx.place && `ณ ${ctx.place}`].filter(Boolean).join(' ');
        const p1 = `ตามที่${ctx.school.name || `โรงเรียน${DOTS(30)}`}ได้จัดกิจกรรม${act}${ctx.subtitle ? ` ${ctx.subtitle}` : ''}${when ? ` ${when}` : ''} นั้น`;
        let p2 = `บัดนี้ การดำเนินกิจกรรมดังกล่าวเสร็จสิ้นแล้ว มีทีมเข้าร่วมการแข่งขันทั้งสิ้น ${ctx.teams} ทีม`;
        if (ctx.members) p2 += ` นักเรียนรวม ${ctx.members} คน`;
        p2 += ` แข่งขันในรูปแบบ${ctx.mode} โดยใช้คำถาม${ctx.setName ? `ชุด${ctx.setName}` : ''} จำนวน ${ctx.played} ข้อ`;
        if (ctx.m.status === 'done') p2 += ` ผลการแข่งขันปรากฏว่า ${awardText(ctx)}`;
        else p2 += ' (การแข่งขันยังไม่สิ้นสุด คะแนน ณ ปัจจุบันตามสรุปที่แนบ)';
        p2 += ' รายละเอียดตามสรุปผลการแข่งขันที่แนบมาพร้อมนี้';
        return {
            agency: f.agency,
            docNo: f.docNo,
            date: f.date,
            subject: `รายงานผลการจัดกิจกรรม${ctx.title || 'การแข่งขันตอบคำถาม'}`,
            to: f.to,
            paragraphs: [p1, p2, `จึงเรียนมาเพื่อโปรด${f.ending === 'พิจารณา' ? 'พิจารณา' : 'ทราบ'}`],
            signer: { name: f.reporterName, position: f.reporterPosition },
        };
    }
    function memoSections(T, ctx, form) {
        const m = memoText(ctx, form);
        T.resetMemoFields();
        return [T.memo(m), summarySection(T, ctx)];
    }

    /* ---------- ตัวอย่าง HTML (official-print.css) ---------- */
    function summaryHTML(ctx) {
        const rows = sumRows(ctx);
        const sg = signers(ctx);
        return `<section class="gov-page">${WM()}
            <h2 class="gov-title">สรุปผลการแข่งขัน</h2>
            ${headLines(ctx).map((l) => `<p class="gov-subtitle">${esc(l)}</p>`).join('')}
            <table class="gov-table"><thead><tr>${SUM_COLS.map((c) => `<th style="width:${c.width}cm">${esc(c.label)}</th>`).join('')}</tr></thead>
                <tbody>${rows.map((r) => `<tr>${r.map((v, i) => `<td class="${SUM_COLS[i].align === 'center' ? 'c' : ''}">${Array.isArray(v) ? v.map(esc).join('<br>') : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>
            <p style="font-size:14pt;margin-top:3mm">${esc(ruleText(ctx))}</p>
            <div class="gov-signs">${sg.map((s) => `<div><p>ลงชื่อ${DOTS(39)}</p><p>(${esc(s.name || DOTS(39))})</p><p>${esc(s.position)}</p></div>`).join('')}</div>
        </section>`;
    }
    function memoHTML(ctx, form, garudaSrc) {
        const m = memoText(ctx, form);
        const dots = (v, n) => (v && String(v).trim() ? esc(v) : DOTS(n));
        return `<section class="gov-page">${WM()}
                <div class="gov-memo-head"><img src="${esc(garudaSrc)}" alt="ตราครุฑ"><h1>บันทึกข้อความ</h1><span></span></div>
                <p class="gov-field"><b>ส่วนราชการ</b>&nbsp; ${dots(m.agency, 60)}</p>
                <p class="gov-field"><b>ที่</b>&nbsp; ${dots(m.docNo, 20)}<span class="gov-tab"></span><b>วันที่</b>&nbsp; ${dots(m.date, 30)}</p>
                <p class="gov-field"><b>เรื่อง</b>&nbsp; ${esc(m.subject)}</p>
                <p class="gov-to"><b>เรียน</b>&nbsp; ${dots(m.to, 40)}</p>
                ${m.paragraphs.map((p) => `<p class="gov-body">${esc(p)}</p>`).join('')}
                <div class="gov-sign"><p>ลงชื่อ${DOTS(48)}</p><p>(${dots(m.signer.name, 48)})</p><p>ตำแหน่ง ${dots(m.signer.position, 48)}</p></div>
            </section>${summaryHTML(ctx)}`;
    }

    /* ---------- ใบประกาศผลการแข่งขัน (โปสเตอร์ A4 ติดบอร์ด) ---------- */
    function posterHTML(ctx) {
        const top = ctx.ranking.filter((t) => t.rank <= 3);
        const rest = ctx.ranking.filter((t) => t.rank > 3);
        const medal = (r) => ['fa-trophy', 'fa-medal', 'fa-medal'][r - 1] || 'fa-award';
        return `<section class="pr-page pr-poster">${WM()}
            <div class="pr-frame">
                <div class="pr-school">${esc(ctx.school.name || '')}</div>
                <h1 class="pr-h1">ประกาศผลการแข่งขัน</h1>
                <div class="pr-title">${esc(ctx.title)}</div>
                ${ctx.subtitle ? `<div class="pr-sub">${esc(ctx.subtitle)}</div>` : ''}
                <div class="pr-sub">${esc([ctx.dateText && `วันที่ ${ctx.dateText}`, ctx.place && `ณ ${ctx.place}`].filter(Boolean).join(' '))}</div>
                <div class="pr-awards">${top.map((t) => `
                    <div class="pr-aw r${t.rank}" style="--c:${esc(t.color)}">
                        <span class="pr-medal"><i class="fas ${medal(t.rank)}"></i></span>
                        <div class="pr-aw-main"><small>${esc(t.award)}</small><b>${esc(t.name)}</b><span>${esc((t.members || []).join(', '))}</span></div>
                        <div class="pr-aw-score"><b>${fmt(t.score)}</b><small>คะแนน</small></div>
                    </div>`).join('')}</div>
                ${rest.length ? `<table class="pr-table"><thead><tr><th>อันดับ</th><th>ทีม</th><th>สมาชิก</th><th>คะแนน</th></tr></thead><tbody>${rest.map((t) => `<tr><td>${t.rank}</td><td>${esc(t.name)}</td><td>${esc((t.members || []).join(', ') || '-')}</td><td>${fmt(t.score)}</td></tr>`).join('')}</tbody></table>` : ''}
                <div class="pr-congrats">ขอแสดงความยินดีกับทุกทีม</div>
                <div class="pr-signs">${signers(ctx).map((s) => `<div><p>ลงชื่อ${DOTS(34)}</p><p>(${esc(s.name || DOTS(34))})</p><p>${esc(s.position)}</p></div>`).join('')}</div>
            </div>
        </section>`;
    }

    /* ---------- เกียรติบัตรรายทีม (A4 แนวนอน) ---------- */
    function certHTML(ctx, teamIds) {
        const list = ctx.ranking.filter((t) => (teamIds ? teamIds.includes(t.id) : t.rank <= 3));
        return list.map((t) => `<section class="pr-page pr-cert" style="--c:${esc(t.color)}">${WM()}
            <div class="pr-cert-frame">
                <div class="pr-school">${esc(ctx.school.name || DOTS(50))}</div>
                <div class="pr-cert-h">เกียรติบัตร</div>
                <div class="pr-cert-give">ขอมอบเกียรติบัตรฉบับนี้ไว้เพื่อแสดงว่า</div>
                <div class="pr-cert-name">${esc(t.name)}</div>
                ${(t.members || []).length ? `<div class="pr-cert-mem">${esc(t.members.join('  •  '))}</div>` : ''}
                <div class="pr-cert-award">${t.award ? `ได้รับรางวัล${esc(t.award)}` : 'ได้เข้าร่วมการแข่งขัน'}</div>
                <div class="pr-cert-what">${esc(ctx.title)}${ctx.subtitle ? `<br>${esc(ctx.subtitle)}` : ''}</div>
                <div class="pr-cert-date">ให้ไว้ ณ วันที่ ${esc(ctx.dateText || DOTS(30))}</div>
                <div class="pr-cert-sign"><p>ลงชื่อ${DOTS(40)}</p><p>(${DOTS(40)})</p><p>ผู้อำนวยการ${esc(ctx.school.name || DOTS(30))}</p></div>
            </div>
        </section>`).join('');
    }

    return { context, summarySection, memoSections, memoText, memoDefaults, summaryHTML, memoHTML, posterHTML, certHTML, memoDate, ruleText, JUDGE_POS };
});
