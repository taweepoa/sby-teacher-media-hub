/* ผลการแข่งขัน: รายการ (#/results) + รายละเอียด (#/result?id=) — อันดับ ผลรายข้อ ใบประกาศผล เกียรติบัตร ส่งออก Excel */
(function () {
    'use strict';
    const esc = U.esc;

    const isLive = (m) => Link.state && Link.state.matchId === m.id && Link.state.status === 'playing';
    function statusOf(m) {
        if (isLive(m)) return '<span class="tag warn"><i class="fas fa-circle-play"></i>กำลังแข่ง</span>';
        if (m.status === 'done') return '<span class="tag ok"><i class="fas fa-flag-checkered"></i>จบแล้ว</span>';
        return '<span class="tag"><i class="fas fa-pause"></i>ยังไม่จบ</span>';
    }

    /* ---------- รายการ ---------- */
    function renderList(el) {
        const list = Store.data.matches;
        el.innerHTML = `
            ${U.hero({ icon: 'fa-ranking-star', title: 'ผลการแข่งขัน', sub: 'ทุกการแข่งขันถูกบันทึกอัตโนมัติ — ดูอันดับ พิมพ์ใบประกาศผล/เกียรติบัตร ส่งออก Excel และทำรายงาน .docx', side: '<a class="btn-x cta" href="#/setup"><i class="fas fa-flag-checkered"></i>เริ่มการแข่งขันใหม่</a>' })}
            <div class="panel panel--orange">
                <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-list"></i></span><div><h3>การแข่งขันทั้งหมด <span class="num-pill">${list.length}</span></h3><small>เรียงจากล่าสุด</small></div></div>
                <div class="panel-body p-0 dt-wrap">
                    <table class="dt">
                        <thead><tr><th>วันที่</th><th>การแข่งขัน</th><th>รูปแบบ</th><th class="text-center">ทีม</th><th>ผู้ชนะ / คะแนนนำ</th><th>สถานะ</th><th class="act"></th></tr></thead>
                        <tbody>${list.length ? list.map((m) => {
                            const w = Engine.ranking(m)[0];
                            return `<tr>
                                <td class="nowrap">${esc(m.dateText || U.thDate(m.startedAt))}</td>
                                <td><a class="fw-bold" href="#/result?id=${encodeURIComponent(m.id)}">${esc(m.title)}</a><div class="small text-muted-2">${esc(m.setName || '')}</div></td>
                                <td>${UI.modeTag(m.mode)}</td>
                                <td class="text-center">${m.teams.length}</td>
                                <td>${w ? `${UI.teamBadge(w)} <b class="ms-1">${UI.fmt(w.score)}</b>` : '-'}</td>
                                <td>${statusOf(m)}</td>
                                <td class="act nowrap"><a class="icon-btn" href="#/result?id=${encodeURIComponent(m.id)}" title="ดูผล"><i class="fas fa-eye"></i></a>
                                    <button type="button" class="icon-btn del" data-del="${esc(m.id)}" title="ลบ"${isLive(m) ? ' disabled' : ''}><i class="fas fa-trash"></i></button></td>
                            </tr>`;
                        }).join('') : U.emptyRow(7, 'fa-flag-checkered', ' ยังไม่มีผลการแข่งขัน — เริ่มการแข่งขันแล้วผลจะถูกบันทึกที่นี่')}</tbody>
                    </table>
                </div>
            </div>`;
        el.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => remove(b.dataset.del); });
    }

    async function remove(id) {
        const m = Store.match(id);
        if (!m) return;
        const ok = await U.confirm('ลบผลการแข่งขันนี้?', `<b>${esc(m.title)}</b><br>ลบแล้วกู้คืนไม่ได้ (ยกเว้นเปิดไฟล์สำรอง .json)`, { confirmText: 'ลบ', danger: true });
        if (!ok) return;
        Store.data.matches = Store.data.matches.filter((x) => x.id !== id);
        Store.commit('match');
        U.toast('ลบผลการแข่งขันแล้ว', { type: 'ok' });
        if (App.current === 'result') App.go('results'); else App.render();
    }

    /* ---------- รายละเอียด ---------- */
    function renderDetail(el, id) {
        const m = Store.match(id);
        if (!m) { App.go('results'); return; }
        const rk = Engine.ranking(m);
        const p = Engine.progress(m);
        const L = Engine.LETTERS[(m.opts && m.opts.letters) || 'th'];
        const live = isLive(m);
        const top = rk.filter((t) => t.rank <= 3);
        el.innerHTML = `
            ${U.hero({
                icon: 'fa-trophy', title: m.title,
                sub: `${esc([m.subtitle, m.dateText && `วันที่ ${m.dateText}`, m.place && `ณ ${m.place}`].filter(Boolean).join(' • '))}<br>${Engine.MODES[m.mode].label} • ${esc(m.setName || '-')} • ${m.teams.length} ทีม • ${m.mode === 'jeopardy' ? `เล่น ${p.done}/${p.total} ช่อง` : `เล่น ${p.done}/${p.total} ข้อ`}`,
                side: `${statusOf(m)}${live ? '<a class="btn-x cta" href="#/control"><i class="fas fa-gamepad"></i>กลับไปควบคุมเกม</a>' : ''}`,
            })}
            <div class="result-tools">
                <button type="button" class="btn-x primary" data-act="poster"><i class="fas fa-print"></i>ใบประกาศผลการแข่งขัน</button>
                <button type="button" class="btn-x soft" data-act="cert"><i class="fas fa-award"></i>เกียรติบัตรทีม</button>
                <button type="button" class="btn-x green" data-act="excel"><i class="fas fa-file-excel"></i>ส่งออก Excel</button>
                <a class="btn-x ghost" href="#/reports?match=${encodeURIComponent(m.id)}"><i class="fas fa-file-word"></i>รายงาน .docx</a>
                <button type="button" class="btn-x ghost" data-act="edit"><i class="fas fa-pen"></i>แก้ไขข้อมูล/กรรมการ</button>
                <button type="button" class="btn-x ghost text-danger ms-md-auto" data-act="del"${live ? ' disabled' : ''}><i class="fas fa-trash"></i>ลบ</button>
            </div>
            ${m.status !== 'done' && !live ? '<div class="note warn"><i class="fas fa-circle-info"></i><div>การแข่งขันนี้<b>ยังไม่ได้ประกาศผล</b> (หยุดกลางคัน) — อันดับด้านล่างคิดจากคะแนน ณ ตอนที่หยุด</div></div>' : ''}
            <div class="podium-row">${top.map((t) => `
                <div class="pod r${t.rank}" style="--c:${esc(t.color)}">
                    ${UI.teamIcon(t, 'xl')}
                    <div class="min-w-0"><span class="award a${t.rank}"><i class="fas ${t.rank === 1 ? 'fa-trophy' : 'fa-medal'}"></i>${esc(t.award)}</span><b>${esc(t.name)}</b><small>${esc(t.members.join(', ') || '-')}</small></div>
                    <div class="pod-sc"><b>${UI.fmt(t.score)}</b><small>คะแนน</small></div>
                </div>`).join('')}</div>
            <div class="panel panel--theme">
                <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-ranking-star"></i></span><div><h3>อันดับและคะแนน</h3><small>คะแนนเท่ากันได้อันดับเดียวกัน</small></div></div>
                <div class="panel-body p-0 dt-wrap"><table class="dt">
                    <thead><tr><th class="text-center">อันดับ</th><th>ทีม</th><th>สมาชิก</th><th class="text-center">ตอบถูก</th><th class="text-center">ตอบผิด</th><th class="text-center">ปรับคะแนน</th><th class="text-center">คะแนนรวม</th><th>รางวัล</th></tr></thead>
                    <tbody>${rk.map((t) => `<tr><td class="text-center">${UI.rankBadge(t.rank)}</td><td>${UI.teamBadge(t)}</td><td class="small">${esc(t.members.join(', ') || '-')}</td><td class="text-center">${t.correct}</td><td class="text-center">${t.wrong}</td><td class="text-center">${t.adjust ? `${t.adjust > 0 ? '+' : ''}${UI.fmt(t.adjust)}` : '-'}</td><td class="text-center fw-800 fs-5">${UI.fmt(t.score)}</td><td>${UI.awardTag(t) || '-'}</td></tr>`).join('')}</tbody>
                </table></div>
            </div>
            <div class="panel mt-3">
                <div class="panel-head"><span class="ic-box sm" style="--a:#0A84FF;--b:#5E5CE6"><i class="fas fa-table-list"></i></span><div><h3>ผลรายข้อ</h3><small>✓ ถูก • ✗ ผิด • ตัวเลข = คะแนนที่ได้ในข้อนั้น</small></div></div>
                <div class="panel-body p-0 dt-wrap"><table class="dt per-q">
                    <thead><tr><th class="text-center">ข้อ</th><th>คำถาม / เฉลย</th><th class="text-center">คะแนน</th>${m.teams.map((t) => `<th class="text-center"><span class="team-dot" style="--c:${esc(t.color)}"></span>${esc(t.name)}</th>`).join('')}</tr></thead>
                    <tbody>${m.deck.map((q, i) => {
                        const r = m.results[q.id];
                        const st = r ? r.status : 'open';
                        return `<tr class="${st}"><td class="text-center">${i + 1}${q.category ? `<div class="small text-muted-2">${esc(q.category)}</div>` : ''}</td>
                            <td><div class="q-mini">${esc(q.text)}</div><div class="small text-success fw-bold"><i class="fas fa-key"></i> ${esc(Engine.answerText(q, L))}</div>${st !== 'done' ? `<span class="tag">${st === 'skipped' ? 'ข้าม' : 'ยังไม่เล่น'}</span>` : ''}</td>
                            <td class="text-center">${UI.fmt(Engine.qPoints(m, q))}</td>
                            ${m.teams.map((t) => {
                                const a = r && r.answers[t.id];
                                if (!a || a.final == null) return '<td class="text-center text-muted-2">-</td>';
                                return `<td class="text-center"><span class="res ${a.final ? 'ok' : 'bad'}"><i class="fas fa-${a.final ? 'check' : 'xmark'}"></i>${a.awarded ? ` ${a.awarded > 0 ? '+' : ''}${UI.fmt(a.awarded)}` : ''}</span></td>`;
                            }).join('')}</tr>`;
                    }).join('')}</tbody>
                </table></div>
            </div>
            ${m.adjusts.length ? `<div class="panel mt-3"><div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-plus-minus"></i></span><div><h3>การปรับคะแนนด้วยมือ</h3></div></div>
                <div class="panel-body p-0 dt-wrap"><table class="dt"><thead><tr><th>ทีม</th><th class="text-center">คะแนน</th><th>หมายเหตุ</th></tr></thead><tbody>${m.adjusts.map((a) => { const t = m.teams.find((x) => x.id === a.team); return `<tr><td>${t ? UI.teamBadge(t) : '-'}</td><td class="text-center fw-bold">${a.delta > 0 ? '+' : ''}${UI.fmt(a.delta)}</td><td>${esc(a.note || '-')}</td></tr>`; }).join('')}</tbody></table></div></div>` : ''}`;
        el.querySelector('.result-tools').addEventListener('click', (e) => {
            const b = e.target.closest('[data-act]');
            if (!b || b.disabled) return;
            const act = b.dataset.act;
            if (act === 'poster') printDoc(m, 'poster');
            else if (act === 'cert') certDialog(m);
            else if (act === 'excel') { QIO.exportMatch(m, Store.data.school); U.toast('ส่งออกไฟล์ Excel แล้ว', { type: 'ok' }); }
            else if (act === 'edit') editMatch(m);
            else if (act === 'del') remove(m.id);
        });
    }

    /* พิมพ์ / บันทึกเป็น PDF ผ่านเบราว์เซอร์ */
    function printDoc(m, kind, teamIds) {
        const ctx = Docs.context(m, Store.data.school);
        const html = kind === 'poster' ? Docs.posterHTML(ctx) : Docs.certHTML(ctx, teamIds);
        const root = document.getElementById('print-root');
        root.innerHTML = html;
        document.body.classList.add(kind === 'poster' ? 'print-portrait' : 'print-landscape');
        setTimeout(() => {
            window.print();
            setTimeout(() => { document.body.classList.remove('print-portrait', 'print-landscape'); }, 500);
        }, 250);
    }

    async function certDialog(m) {
        const rk = Engine.ranking(m);
        const r = await UI.sheet({
            title: 'พิมพ์เกียรติบัตรทีม', icon: 'fa-award', width: 620, sub: 'A4 แนวนอน 1 ทีมต่อหน้า — เลือกทีมที่ต้องการ (ค่าเริ่มต้น = ทีมที่ได้รางวัล)',
            body: `<div class="pick-teams">${rk.map((t) => `<label class="pick-team"><input type="checkbox" class="form-check-input" value="${esc(t.id)}"${t.rank <= 3 ? ' checked' : ''}>${UI.teamIcon(t)}<div class="min-w-0"><b>${esc(t.name)}</b><small>อันดับ ${t.rank}${t.award ? ` • ${esc(t.award)}` : ' • เกียรติบัตรผู้เข้าร่วม'}</small></div></label>`).join('')}</div>
                <div class="note mt-2 mb-0"><i class="fas fa-circle-info"></i><div>ในหน้าต่างพิมพ์ เลือก "บันทึกเป็น PDF" ได้ • ตั้งค่า "กราฟิกพื้นหลัง" ให้เปิดเพื่อให้กรอบสีพิมพ์ออกมา</div></div>`,
            confirmText: '<i class="fas fa-print"></i> พิมพ์',
            preConfirm: () => {
                const ids = U.$$('.pick-team input:checked').map((i) => i.value);
                if (!ids.length) { Swal.showValidationMessage('เลือกอย่างน้อย 1 ทีม'); return false; }
                return ids;
            },
        });
        if (r.isConfirmed) printDoc(m, 'cert', r.value);
    }

    async function editMatch(m) {
        const r = await UI.sheet({
            title: 'แก้ไขข้อมูลการแข่งขัน', icon: 'fa-pen', width: 640, sub: 'ใช้ในใบประกาศผล เกียรติบัตร และรายงาน',
            body: `<label class="form-label">ชื่อการแข่งขัน</label><input class="form-control mb-2" id="em-title" value="${esc(m.title)}">
                <label class="form-label">ชื่อกิจกรรม / คำบรรยาย</label><input class="form-control mb-2" id="em-sub" value="${esc(m.subtitle)}">
                <div class="row g-2"><div class="col-sm-6"><label class="form-label">วันที่</label><input class="form-control" id="em-date" value="${esc(m.dateText)}"></div>
                <div class="col-sm-6"><label class="form-label">สถานที่</label><input class="form-control" id="em-place" value="${esc(m.place)}"></div></div>
                <label class="form-label mt-2">คณะกรรมการตัดสิน</label>
                ${Docs.JUDGE_POS.map((pos, i) => `<div class="input-group input-group-sm mb-1"><span class="input-group-text" style="min-width:150px">${pos}</span><input class="form-control" data-j="${i}" value="${esc(m.judges[i] || '')}"></div>`).join('')}`,
            preConfirm: () => ({
                title: U.norm(document.getElementById('em-title').value),
                subtitle: U.norm(document.getElementById('em-sub').value),
                dateText: U.norm(document.getElementById('em-date').value),
                place: U.norm(document.getElementById('em-place').value),
                judges: U.$$('[data-j]').map((i) => U.norm(i.value)),
            }),
        });
        if (!r.isConfirmed) return;
        if (!r.value.title) { U.toast('ชื่อการแข่งขันว่างไม่ได้', { type: 'warn' }); return; }
        Object.assign(m, r.value);
        Store.commit('match');
        U.toast('บันทึกแล้ว', { type: 'ok' });
        App.render();
    }

    window.Views.results = { render: renderList, refresh() { renderList(document.getElementById('view')); } };
    window.Views.result = {
        render: (el, params) => renderDetail(el, params.id),
        // ผลของเกมที่กำลังเล่นอัปเดตเมื่อบันทึกลงข้อมูลหลัก (Store เปลี่ยน → refresh)
        refresh() { const y = window.scrollY; renderDetail(document.getElementById('view'), App.params.id); window.scrollTo(0, y); },
        printDoc,
    };
})();
