/* ผลการแข่งขัน: รายการ (results) + รายละเอียด/ประวัติคำถาม (result?id=) + ใบสรุปผล + รายงาน .docx */
(function () {
    'use strict';
    const esc = U.esc;
    let root = null;

    function renderList(el) {
        const d = Store.data;
        el.innerHTML = `
            ${U.hero({ icon: 'fa-ranking-star', title: 'ผลการแข่งขันและประวัติคำถาม', sub: `ทั้งหมด ${d.games.length} เกม • ดูว่าทีมไหนตอบข้อใด ถูกหรือผิด พิมพ์ใบสรุปผล และรายงาน .docx` })}
            ${d.live ? `<div class="note warn mb-3"><i class="fas fa-circle-play"></i><div>มีเกมที่กำลังเล่นค้างอยู่: <b>${esc(d.live.title || d.live.setName)}</b> <a href="#/play" class="ms-2">เล่นต่อ</a></div></div>` : ''}
            ${d.games.length ? `<div class="dt-wrap"><table class="dt"><thead><tr><th>กิจกรรม</th><th>วันที่</th><th>ชุดคำถาม</th><th>กระดาน</th><th>ผู้ชนะ</th><th class="text-center">คำถาม</th><th></th></tr></thead><tbody>
                ${d.games.map((g) => { const w = Engine.ranking(g)[0]; const ql = Engine.questionLog(g); return `<tr>
                    <td><a href="#/result?id=${esc(g.id)}"><b>${esc(g.title || '(ไม่มีชื่อ)')}</b></a><div class="small muted">${g.teams.length} ทีม • ${g.round} รอบ</div></td>
                    <td>${esc(g.dateText || U.thDate(g.startedAt))}</td><td>${esc(g.setName)}</td><td>${esc(g.boardName || `${g.board.n} ช่อง`)}</td>
                    <td>${UI.teamChip(w)}</td><td class="text-center">${ql.length} <small class="muted">(ถูก ${ql.filter((l) => l.ok).length})</small></td>
                    <td class="text-end text-nowrap"><a class="btn-x primary sm" href="#/result?id=${esc(g.id)}"><i class="fas fa-eye"></i> ดูผล</a> <button type="button" class="icon-btn del" data-del="${esc(g.id)}" title="ลบผลการแข่งขัน"><i class="fas fa-trash-can"></i></button></td>
                </tr>`; }).join('')}</tbody></table></div>` : UI.empty('fa-trophy', 'ยังไม่มีผลการแข่งขัน', 'เล่นเกมจนจบ (หรือกด "จบเกม") ผลและประวัติคำถามจะมาอยู่ที่นี่', '<a class="btn-x primary" href="#/play?new=1"><i class="fas fa-dice"></i> เริ่มเกม</a>')}`;
        el.onclick = async (e) => {
            const b = e.target.closest('[data-del]');
            if (!b) return;
            const g = Store.game(b.dataset.del);
            if (!(await U.confirm('ลบผลการแข่งขันนี้?', esc(g.title || g.setName), { danger: true, confirmText: '<i class="fas fa-trash-can"></i> ลบผล' }))) return;
            Store.data.games = Store.data.games.filter((x) => x.id !== g.id);
            Store.commit('games');
            U.toast('ลบผลการแข่งขันแล้ว', { type: 'ok' });
        };
    }

    const fileBase = (g, kind) => U.safeFileName(`${kind}_${g.title || g.setName}`);
    function printHTML(html) {
        const pr = document.getElementById('print-root');
        pr.innerHTML = html;
        document.body.classList.add('printing');
        const done = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
        window.addEventListener('afterprint', done);
        setTimeout(() => { window.print(); setTimeout(() => { if (!window.matchMedia('print').matches) done(); }, 800); }, 60);
    }
    async function docxSummary(g) {
        try {
            const c = Docs.context(g, Store.data.school, Store.data.tpl);
            await ThaiDoc.download(Docs.summarySections(ThaiDoc, c), `${fileBase(g, 'สรุปผลการแข่งขันบันไดงู')}.docx`, { title: c.tpl.summaryTitle });
            U.toast('ดาวน์โหลดสรุปผลการแข่งขัน (.docx) แล้ว', { type: 'ok' });
        } catch (e) { console.error(e); U.alert('สร้างไฟล์ไม่สำเร็จ', esc(e.message), 'error'); }
    }
    async function docxMemo(g) {
        const c = Docs.context(g, Store.data.school, Store.data.tpl);
        const f = Docs.memoDefaults(c);
        const r = await UI.sheet({
            title: 'บันทึกข้อความรายงานผลการจัดกิจกรรม', icon: 'fa-file-signature', width: 720, sub: 'ค่าเริ่มต้นมาจากหน้าตั้งค่า — เว้นว่างได้ เอกสารจะเว้นจุดไข่ปลาให้เขียนเอง',
            confirmText: '<i class="fas fa-file-word"></i> ดาวน์โหลด .docx',
            body: `<div class="row g-2 text-start">
                <div class="col-12"><label class="form-label">ส่วนราชการ</label><input class="form-control" id="mm-agency" value="${esc(f.agency)}"></div>
                <div class="col-sm-6"><label class="form-label">ที่ (เลขที่หนังสือ)</label><input class="form-control" id="mm-docNo" value="" placeholder="เว้นว่าง = จุดไข่ปลา"></div>
                <div class="col-sm-6"><label class="form-label">วันที่</label><input class="form-control" id="mm-date" value="${esc(f.date)}"></div>
                <div class="col-12"><label class="form-label">เรียน</label><input class="form-control" id="mm-to" value="${esc(f.to)}">${UI.chips('#mm-to', ['ผู้อำนวยการโรงเรียน', 'รองผู้อำนวยการฝ่ายวิชาการ'])}</div>
                <div class="col-12"><label class="form-label">วัตถุประสงค์ของกิจกรรม</label><input class="form-control" id="mm-purpose" value="${esc(f.purpose)}">${UI.chips('#mm-purpose', UI.PRESET.purposes)}</div>
                <div class="col-sm-6"><label class="form-label">ผู้รายงาน</label><input class="form-control" id="mm-reporterName" value="${esc(f.reporterName)}"></div>
                <div class="col-sm-6"><label class="form-label">ตำแหน่ง</label><input class="form-control" id="mm-reporterPosition" value="${esc(f.reporterPosition)}">${UI.chips('#mm-reporterPosition', UI.PRESET.positions.slice(0, 3))}</div>
            </div><p class="small muted mt-2 text-start">ข้อความในบันทึกแก้ได้ที่ "ตั้งค่า → แม่แบบข้อความในเอกสาร"</p>`,
            didOpen: (p) => UI.bindChips(p),
            preConfirm: () => { const p = Swal.getPopup(); const o = {}; ['agency', 'docNo', 'date', 'to', 'purpose', 'reporterName', 'reporterPosition'].forEach((k) => { o[k] = p.querySelector(`#mm-${k}`).value.trim(); }); return o; },
        });
        if (!r.isConfirmed) return;
        try {
            await ThaiDoc.download(Docs.memoSections(ThaiDoc, c, r.value), `${fileBase(g, 'บันทึกข้อความรายงานผลกิจกรรม')}.docx`, { title: 'บันทึกข้อความรายงานผลการจัดกิจกรรม' });
            U.toast('ดาวน์โหลดบันทึกข้อความ (.docx) แล้ว', { type: 'ok' });
        } catch (e) { console.error(e); U.alert('สร้างไฟล์ไม่สำเร็จ', esc(e.message), 'error'); }
    }

    function renderDetail(el, g) {
        const c = Docs.context(g, Store.data.school, Store.data.tpl);
        const rank = c.ranking;
        const w = rank[0];
        const ql = Engine.questionLog(g);
        el.innerHTML = `
            <div class="toolbar"><a class="btn-x ghost sm" href="#/results"><i class="fas fa-arrow-left"></i> ผลทั้งหมด</a><div class="grow"></div>
                <button type="button" class="btn-x ghost sm" data-act="print"><i class="fas fa-print"></i> พิมพ์ใบสรุปผล</button>
                <button type="button" class="btn-x primary sm" data-act="docx"><i class="fas fa-file-word"></i> สรุปผล (.docx)</button>
                <button type="button" class="btn-x orange sm" data-act="memo"><i class="fas fa-file-signature"></i> บันทึกข้อความ (.docx)</button></div>
            <section class="result-hero" style="--c:${esc(w.color)}">
                <div class="rh-trophy"><i class="fas fa-trophy"></i></div>
                <div class="rh-text"><small>${esc(g.title || 'เกมบันไดงูตอบคำถาม')} • ${esc(g.dateText || '')}${g.place ? ` • ${esc(g.place)}` : ''}</small>
                    <h2>${g.status === 'done' ? 'ผู้ชนะ' : 'ทีมนำ'}: <i class="fas ${esc(w.icon)}"></i> ${esc(w.name)}</h2>
                    <p>${esc(g.setName)} • ${esc(g.boardName || `${g.board.n} ช่อง`)} • ${g.teams.length} ทีม • ${g.round} รอบ • ตอบคำถาม ${c.asked} ข้อ ถูก ${c.ok} ข้อ (ร้อยละ ${c.pct.toFixed(1)})</p></div>
                ${UI.statusTag(g)}
            </section>
            <div class="result-grid">
                <section class="panel panel--orange">
                    <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-ranking-star"></i></span><div><h3>อันดับ</h3><small>ถึงเส้นชัยก่อน → ช่องไกลกว่า → ตอบถูกมากกว่า</small></div></div>
                    <div class="panel-body"><div class="dt-wrap"><table class="dt"><thead><tr><th>อันดับ</th><th>ทีม</th><th class="text-center">ช่อง</th><th class="text-center">ถูก</th><th class="text-center">ผิด</th><th>ผล</th></tr></thead><tbody>
                        ${rank.map((t) => `<tr><td>${UI.rankBadge(t.rank)}</td><td>${UI.teamChip(t)}</td><td class="text-center"><b>${t.pos}</b>${t.finishAt ? ' <i class="fas fa-flag-checkered text-success"></i>' : ''}</td><td class="text-center">${t.right}</td><td class="text-center">${t.wrong}</td><td>${t.award ? `<span class="tag ok">${esc(t.award)}</span>` : '-'}</td></tr>`).join('')}
                    </tbody></table></div></div>
                </section>
                <section class="panel panel--green">
                    <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-stairs"></i></span><div><h3>ตำแหน่งสุดท้ายบนกระดาน</h3></div></div>
                    <div class="panel-body"><div class="res-board" id="res-board"></div></div>
                </section>
            </div>
            <section class="panel panel--teal">
                <div class="panel-head"><span class="ic-box sm" style="--a:#0A84FF;--b:#00C7BE"><i class="fas fa-clock-rotate-left"></i></span><div><h3>ประวัติคำถาม ${ql.length} ข้อ</h3><small>เรียงตามลำดับที่ถูกถาม</small></div></div>
                <div class="panel-body">${ql.length ? `<div class="dt-wrap"><table class="dt"><thead><tr><th>#</th><th>รอบ</th><th>ทีม</th><th>คำถาม</th><th>คำตอบของทีม</th><th>เฉลย</th><th>ผล</th><th class="text-center">เวลา</th><th class="text-center">ช่อง</th></tr></thead><tbody>
                    ${ql.map((l, i) => { const q = g.questions.find((x) => x.id === l.qid); const t = g.teams.find((x) => x.id === l.team); return `<tr>
                        <td>${i + 1}</td><td>${l.round}</td><td>${UI.teamChip(t)}</td><td>${q ? UI.qTypeTag(q.type) : ''} ${esc(l.q)}</td>
                        <td>${esc(Docs.givenText(g, l))}</td><td>${q ? esc(Engine.answerText(q)) : '-'}</td>
                        <td>${l.skipped ? '<span class="tag info">ข้าม</span>' : l.ok ? '<span class="tag ok"><i class="fas fa-check"></i> ถูก</span>' : '<span class="tag bad"><i class="fas fa-xmark"></i> ผิด</span>'}</td>
                        <td class="text-center">${l.secs == null ? '-' : `${l.secs} วิ`}</td><td class="text-center text-nowrap">${l.from} → ${l.to}</td></tr>`; }).join('')}
                </tbody></table></div>` : UI.empty('fa-circle-question', 'เกมนี้ไม่มีคำถาม', 'ยังไม่มีทีมใดตกช่องคำถาม')}</div>
            </section>`;
        BoardArt.mount(el.querySelector('#res-board'), g.board, { teams: g.teams });
        el.onclick = (e) => {
            const b = e.target.closest('[data-act]');
            if (!b) return;
            const a = b.dataset.act;
            if (a === 'print') printHTML(Docs.scoreSheetHTML(c));
            else if (a === 'docx') docxSummary(g);
            else if (a === 'memo') docxMemo(g);
        };
    }

    window.Views.results = { render(el) { root = el; renderList(el); }, refresh() { if (root && App.current === 'results') renderList(root); } };
    window.Views.result = {
        render(el, params) {
            root = el;
            const g = Store.game(params && params.id);
            if (!g) { el.innerHTML = UI.empty('fa-circle-question', 'ไม่พบผลการแข่งขันนี้', '', '<a class="btn-x primary" href="#/results">ผลทั้งหมด</a>'); return; }
            renderDetail(el, g);
        },
        refresh() {},
    };
    window.Print = { html: printHTML };
})();
