/* ผลการแข่งขัน: รายการ + รายละเอียด (อันดับ ผลรายข้อ/รายรอบ) + พิมพ์ใบสรุปคะแนน + รายงาน .docx */
(function () {
    'use strict';
    const esc = U.esc;
    let root = null;
    let curId = null;

    function renderList(el) {
        const d = Store.data;
        el.innerHTML = `
            ${U.hero({ icon: 'fa-ranking-star', title: 'ผลการแข่งขัน / รายงาน', sub: 'ผลทุกเกมบันทึกอัตโนมัติ — เลือกรายการเพื่อพิมพ์ใบสรุปคะแนน หรือดาวน์โหลดรายงานราชการ (.docx)', side: `<span class="hero-stat"><i class="fas fa-flag-checkered"></i><b>${d.games.length}</b> รายการ</span>` })}
            ${d.live ? `<div class="note warn"><i class="fas fa-circle-play"></i><div>มีเกมที่กำลังเล่นค้างอยู่: <b>${esc(d.live.title || d.live.setName)}</b> — <a href="#/play">กลับไปเล่นต่อ</a> (ผลจะมาอยู่ที่นี่เมื่อจบเกม)</div></div>` : ''}
            <section class="panel panel--green"><div class="panel-body p-0 dt-wrap">
                <table class="dt"><thead><tr><th>วันที่</th><th>การแข่งขัน</th><th>ชุดเนื้อหา</th><th>รูปแบบ</th><th class="text-center">ทีม</th><th>ผู้ชนะ</th><th></th></tr></thead>
                <tbody>${d.games.length ? d.games.map((g) => { const w = Engine.ranking(g)[0]; return `<tr>
                    <td class="nowrap">${esc(g.dateText || U.thDate(g.startedAt))}</td>
                    <td><a href="#/result?id=${esc(g.id)}"><b>${esc(g.title || '(ไม่มีชื่อ)')}</b></a></td>
                    <td>${esc(g.setName)}</td><td>${UI.modeChip(g.mode)}</td><td class="text-center">${g.teams.length}</td>
                    <td>${UI.teamChip(w)} <small class="muted">${UI.fmt(w.score)}</small></td>
                    <td class="nowrap text-end"><a class="btn-x ghost sm" href="#/result?id=${esc(g.id)}"><i class="fas fa-eye"></i> ดูผล</a></td></tr>`; }).join('') : U.emptyRow(7, 'fa-trophy', 'ยังไม่มีผลการแข่งขัน — เล่นเกมจบแล้วผลจะมาอยู่ที่นี่')}</tbody></table>
            </div></section>`;
    }

    function renderDetail(el, g) {
        const c = Docs.context(g, Store.data.school);
        const rk = c.ranking;
        el.innerHTML = `
            <div class="toolbar"><a class="btn-x ghost sm" href="#/results"><i class="fas fa-arrow-left"></i> ผลทั้งหมด</a><span class="ms-auto"></span>
                <a class="btn-x ghost" href="#/board?id=${esc(g.id)}"><i class="fas fa-chart-simple"></i> กระดานคะแนน</a>
                <button type="button" class="btn-x primary" data-act="print"><i class="fas fa-print"></i> พิมพ์ใบสรุปคะแนน</button>
                <button type="button" class="btn-x green" data-act="docx-sum"><i class="fas fa-file-word"></i> สรุปผล (.docx)</button>
                <button type="button" class="btn-x orange" data-act="docx-memo"><i class="fas fa-file-signature"></i> บันทึกข้อความรายงาน (.docx)</button>
                <button type="button" class="icon-btn del" data-act="delete" title="ลบผลการแข่งขันนี้"><i class="fas fa-trash"></i></button></div>
            ${U.hero({ icon: 'fa-trophy', title: g.title || g.setName, sub: `${esc(Engine.MODES[g.mode].label)} • ${esc(g.setName)} • ${esc(g.dateText || U.thDate(g.startedAt))} • ${g.teams.length} ทีม`, side: rk[0] ? `<span class="hero-stat"><i class="fas fa-crown"></i>ชนะเลิศ <b>${esc(rk[0].name)}</b></span>` : '' })}
            <div class="result-grid">
                <section class="panel panel--orange">
                    <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-ranking-star"></i></span><div><h3>กระดานคะแนน</h3><small>คะแนนเท่ากัน = อันดับร่วม</small></div></div>
                    <div class="panel-body"><div class="score-board">${rk.map((t) => { const max = Math.max(1, rk[0].score); return `
                        <div class="sb-row r${t.rank}" style="--c:${esc(t.color)}">${UI.rankBadge(t.rank)}<span class="sb-ic"><i class="fas ${esc(t.icon)}"></i></span>
                            <div class="sb-main"><div class="sb-line"><b>${esc(t.name)}</b>${t.award ? `<span class="tag ok"><i class="fas fa-medal"></i>${esc(t.award)}</span>` : ''}<span class="sb-pts">${UI.fmt(t.score)}</span></div>
                            <div class="sb-bar"><span style="width:${Math.max(2, (Math.max(0, t.score) / max) * 100)}%"></span></div><small class="muted">ทำถูก ${t.ok} ${esc(c.unit === 'รอบ' ? 'คู่' : c.unit)}</small></div></div>`; }).join('')}</div></div>
                </section>
                <section class="panel panel--purple">
                    <div class="panel-head"><span class="ic-box sm" style="--a:#5E5CE6;--b:#BF5AF2"><i class="fas fa-file-pen"></i></span><div><h3>ข้อมูลสำหรับรายงาน</h3><small>บันทึกอัตโนมัติ • เว้นว่าง = จุดไข่ปลาในเอกสาร</small></div></div>
                    <div class="panel-body">
                        <label class="form-label">ชื่อการแข่งขัน</label><input class="form-control" id="rs-title" data-g="title" value="${esc(g.title)}">${UI.chips('#rs-title', UI.PRESET.titles(Store.set(g.setId) || { name: g.setName, subject: g.subject }).slice(0, 3))}
                        <div class="row g-2 mt-1"><div class="col-sm-6"><label class="form-label">วันที่</label><input class="form-control" data-g="dateText" value="${esc(g.dateText)}"></div>
                        <div class="col-sm-6"><label class="form-label">สถานที่</label><input class="form-control" id="rs-place" data-g="place" value="${esc(g.place)}">${UI.chips('#rs-place', UI.PRESET.places.slice(0, 3))}</div></div>
                        <label class="form-label mt-2">คณะกรรมการตัดสิน</label>
                        ${Docs.JUDGE_POS.map((p, i) => `<div class="judge-row"><span>${esc(p)}</span><input class="form-control form-control-sm" data-judge="${i}" value="${esc(g.judges[i] || '')}" placeholder="ชื่อ-สกุล"></div>`).join('')}
                    </div>
                </section>
            </div>
            <section class="panel panel--teal">
                <div class="panel-head"><span class="ic-box sm" style="--a:#0A84FF;--b:#00C7BE"><i class="fas fa-list-check"></i></span><div><h3>ผลราย${esc(c.unit)}</h3><small>${esc(Docs.ruleText(c))}</small></div></div>
                <div class="panel-body p-0 dt-wrap"><table class="dt"><thead><tr><th class="text-center">ลำดับ</th><th>รายการ</th><th>ทีม</th><th class="text-center">ผล</th><th class="text-center">คะแนน</th></tr></thead>
                <tbody>${Docs.detRows(c).map((r, i) => { const t = g.teams.find((x) => x.id === g.log[i].team); const l = g.log[i]; return `<tr>
                    <td class="text-center">${r[0]}</td><td>${g.mode === 'match' ? esc(r[1]) : `<span class="row-face">${UI.face({ a: l.a || '', b: l.b || '', img: '' }, 'a')}</span> <i class="fas fa-link muted"></i> <b>${esc(l.b)}</b>`}</td>
                    <td>${t ? UI.teamChip(t) : '-'}</td><td class="text-center"><span class="tag ${/^ถูก/.test(r[3]) ? 'ok' : r[3] === '-' ? 'info' : 'warn'}">${esc(r[3])}</span></td><td class="text-center"><b>${esc(r[4])}</b></td></tr>`; }).join('') || U.emptyRow(5, 'fa-list', 'ยังไม่มีรายการที่เล่น')}</tbody></table></div>
                ${g.adjusts.length ? `<div class="panel-body"><b>การปรับคะแนน:</b> ${g.adjusts.map((a) => `${esc((g.teams.find((t) => t.id === a.team) || {}).name || '')} ${a.delta > 0 ? '+' : ''}${a.delta} (${esc(a.reason || '-')})`).join(' • ')}</div>` : ''}
            </section>`;
        UI.bindChips(el);
        el.oninput = (e) => {
            const t = e.target;
            if (t.dataset.g) g[t.dataset.g] = t.value;
            else if (t.dataset.judge) { g.judges = [0, 1, 2].map((i) => g.judges[i] || ''); g.judges[Number(t.dataset.judge)] = t.value; } else return;
            Store.commit('game-info');
        };
        el.onclick = (e) => {
            const b = e.target.closest('[data-act]');
            if (!b) return;
            if (b.dataset.act === 'print') printSheet(g);
            else if (b.dataset.act === 'docx-sum') docxSummary(g);
            else if (b.dataset.act === 'docx-memo') docxMemo(g);
            else if (b.dataset.act === 'delete') del(g);
        };
    }

    function render(el, params) {
        root = el;
        curId = params && params.id;
        const g = curId ? Store.data.games.find((x) => x.id === curId) : null;
        if (curId && !g) { el.innerHTML = UI.empty('fa-circle-question', 'ไม่พบผลการแข่งขันนี้', '', '<a class="btn-x primary" href="#/results">ผลทั้งหมด</a>'); return; }
        if (g) renderDetail(el, g); else renderList(el);
    }

    const fileBase = (g, kind) => U.safeFileName(`${kind}_${g.title || g.setName}`);

    function printSheet(g) {
        const pr = document.getElementById('print-root');
        pr.innerHTML = Docs.scoreSheetHTML(Docs.context(g, Store.data.school));
        document.body.classList.add('printing');
        const done = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
        window.addEventListener('afterprint', done);
        setTimeout(() => { window.print(); setTimeout(() => { if (!window.matchMedia('print').matches) done(); }, 800); }, 60);
    }
    async function docxSummary(g) {
        try {
            const c = Docs.context(g, Store.data.school);
            await ThaiDoc.download(Docs.summarySections(ThaiDoc, c), `${fileBase(g, 'สรุปผลการแข่งขันเกมจับคู่')}.docx`, { title: 'สรุปผลการแข่งขันเกมจับคู่ความจำ' });
            U.toast('ดาวน์โหลดสรุปผลการแข่งขัน (.docx) แล้ว', { type: 'ok' });
        } catch (e) { console.error(e); U.alert('สร้างไฟล์ไม่สำเร็จ', esc(e.message), 'error'); }
    }
    async function docxMemo(g) {
        const c = Docs.context(g, Store.data.school);
        const f = Docs.memoDefaults(c);
        const r = await UI.sheet({
            title: 'บันทึกข้อความรายงานผลการจัดกิจกรรม', icon: 'fa-file-signature', width: 720, sub: 'ค่าเริ่มต้นมาจากหน้าตั้งค่า — เว้นว่างได้ เอกสารจะเว้นจุดไข่ปลาให้เขียนเอง',
            confirmText: '<i class="fas fa-file-word"></i> ดาวน์โหลด .docx',
            body: `<div class="row g-2">
                <div class="col-md-8"><label class="form-label">ส่วนราชการ</label><input class="form-control" id="mm-agency" value="${esc(f.agency)}"></div>
                <div class="col-md-4"><label class="form-label">ที่</label><input class="form-control" id="mm-docNo" value="" placeholder="เว้นว่างได้"></div>
                <div class="col-md-6"><label class="form-label">วันที่</label><input class="form-control" id="mm-date" value="${esc(f.date)}"></div>
                <div class="col-md-6"><label class="form-label">เรียน</label><input class="form-control" id="mm-to" value="${esc(f.to)}">${UI.chips('#mm-to', ['ผู้อำนวยการโรงเรียน', 'รองผู้อำนวยการฝ่ายวิชาการ'])}</div>
                <div class="col-12"><label class="form-label">วัตถุประสงค์</label><input class="form-control" id="mm-purpose" value="${esc(f.purpose)}">${UI.chips('#mm-purpose', UI.PRESET.purposes)}</div>
                <div class="col-md-6"><label class="form-label">ผู้รายงาน</label><input class="form-control" id="mm-reporterName" value="${esc(f.reporterName)}"></div>
                <div class="col-md-6"><label class="form-label">ตำแหน่ง</label><input class="form-control" id="mm-reporterPosition" value="${esc(f.reporterPosition)}">${UI.chips('#mm-reporterPosition', UI.PRESET.positions.slice(0, 3))}</div>
                <div class="col-12"><label class="form-label">ลงท้าย</label><div class="seg" id="mm-ending"><button type="button" class="active" data-v="ทราบ">เพื่อโปรดทราบ</button><button type="button" data-v="พิจารณา">เพื่อโปรดพิจารณา</button></div></div></div>`,
            didOpen: (pop) => { UI.bindChips(pop); pop.querySelector('#mm-ending').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; pop.querySelectorAll('#mm-ending button').forEach((x) => x.classList.toggle('active', x === b)); }; },
            preConfirm: () => {
                const v = (id) => U.norm(document.getElementById(`mm-${id}`).value);
                return { agency: v('agency'), docNo: v('docNo'), date: v('date'), to: v('to'), purpose: v('purpose'), reporterName: v('reporterName'), reporterPosition: v('reporterPosition'), ending: document.querySelector('#mm-ending .active').dataset.v };
            },
        });
        if (!r.isConfirmed) return;
        try {
            await ThaiDoc.download(Docs.memoSections(ThaiDoc, c, r.value), `${fileBase(g, 'บันทึกข้อความรายงานผล')}.docx`, { title: 'บันทึกข้อความรายงานผลการจัดกิจกรรม' });
            U.toast('ดาวน์โหลดบันทึกข้อความ (.docx) แล้ว', { type: 'ok' });
        } catch (e) { console.error(e); U.alert('สร้างไฟล์ไม่สำเร็จ', esc(e.message), 'error'); }
    }
    async function del(g) {
        const ok = await U.confirm('ลบผลการแข่งขันนี้?', `<b>${esc(g.title || g.setName)}</b> จะถูกลบถาวร (ชุดเนื้อหาไม่ถูกลบ)`, { danger: true, confirmText: '<i class="fas fa-trash"></i> ลบผล' });
        if (!ok) return;
        Store.data.games = Store.data.games.filter((x) => x.id !== g.id);
        Store.commit('games');
        App.go('results');
    }

    const view = { render, refresh(reason) { if (reason === 'game-info' || !root) return; render(root, { id: curId }); } };
    window.Views.results = view;
    window.Views.result = view;
})();
