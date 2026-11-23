/* =====================================================================
   หน้าต่าง ๆ ของโปรแกรม (ยกเว้นหน้าจอเกม → js/stage.js)
   ===================================================================== */
(function () {
    'use strict';

    const V = window.Views = window.Views || {};
    const App = window.App = window.App || {};
    const D = () => Store.data;
    const esc = U.esc;
    const fmt = Core.fmt;
    const L = Core.LETTERS;
    const lvTag = (v) => { const l = Core.LEVELS.find((x) => x.v === v) || Core.LEVELS[0]; return `<span class="tag ${l.cls}">${l.label}</span>`; };
    const stTag = (s) => { const x = Core.STATUS[s] || Core.STATUS.lose; return `<span class="tag ${x.cls}"><i class="fas ${x.icon}"></i>${x.label}</span>`; };
    const SUBJECTS = ['วิทยาศาสตร์', 'คณิตศาสตร์', 'ภาษาไทย', 'สังคมศึกษา', 'ภาษาอังกฤษ', 'วิทยาการคำนวณ', 'สุขศึกษาและพลศึกษา', 'ศิลปะ', 'การงานอาชีพ', 'ประวัติศาสตร์', 'ความรู้รอบตัว'];
    const GRADES = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
    const COLORS = ['#16a34a', '#2563eb', '#db2777', '#b45309', '#7c3aed', '#0891b2', '#dc2626', '#ea580c', '#2d16a0', '#0f766e'];
    const ICONS = ['fa-flask', 'fa-square-root-variable', 'fa-book-open', 'fa-earth-asia', 'fa-language', 'fa-laptop-code', 'fa-heart-pulse', 'fa-palette', 'fa-landmark', 'fa-lightbulb', 'fa-circle-question'];
    const empty = (icon, title, text, btn) => `<div class="empty-state"><span class="ic-box lg"><i class="fas ${icon}"></i></span><h3>${title}</h3><p>${text}</p>${btn || ''}</div>`;
    const setCheck = (s) => {
        const n = s.questions.length;
        const L2 = D().settings.ladder.length;
        if (n < 5) return { ok: false, text: `มี ${n} ข้อ — ต้องมีอย่างน้อย 5 ข้อ` };
        if (s.questions.some((q) => !q.text || q.choices.some((c) => !c))) return { ok: false, text: 'มีข้อที่กรอกคำถาม/ตัวเลือกไม่ครบ' };
        return { ok: true, text: `เล่น ${Math.min(n, L2)} ข้อ${n > L2 ? ` • สำรอง ${n - L2} ข้อ` : ''}` };
    };

    /* ======================= หน้าหลัก ======================= */
    V.dashboard = {
        title: 'หน้าหลัก', icon: 'fa-house',
        render(view) {
            const d = D();
            const qn = d.sets.reduce((a, s) => a + s.questions.length, 0);
            const wins = d.results.filter((r) => r.status === 'win').length;
            view.innerHTML = `
            ${U.hero({ icon: 'fa-crown', title: 'เกมเศรษฐีตอบคำถามหน้าชั้นเรียน', sub: `${esc(d.school.name || 'ตอบคำถามไต่บันไดคะแนน • ตัวช่วย 3 อย่าง • จุดปลอดภัย')}`,
                side: `<a class="btn-x cta lg" href="#/new"><i class="fas fa-play"></i>เริ่มเกมใหม่</a>` })}
            ${d.live && d.live.status === 'play' ? `<div class="note info resume"><i class="fas fa-gamepad"></i><div>มีเกมค้างอยู่: <b>${esc(d.live.player)}</b> • ${esc(d.live.setName)} ข้อที่ ${d.live.idx + 1}/${d.live.deck.length}</div><a class="btn-x primary sm" href="#/play"><i class="fas fa-play"></i>เล่นต่อ</a></div>` : ''}
            <div class="dash-grid">
                <a class="stat-card" style="--a:#2d16a0;--b:#5e43e4" href="#/sets"><span class="ic-box lg" style="--a:#2d16a0;--b:#5e43e4"><i class="fas fa-layer-group"></i></span><div><b>${d.sets.length}</b><span>ชุดคำถาม (${fmt(qn)} ข้อ)</span></div></a>
                <a class="stat-card" style="--a:#FF9F0A;--b:#FF375F" href="#/results"><span class="ic-box lg" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-gamepad"></i></span><div><b>${d.results.length}</b><span>เล่นไปแล้ว (ครั้ง)</span></div></a>
                <a class="stat-card" style="--a:#d4a017;--b:#FF9F0A" href="#/results"><span class="ic-box lg" style="--a:#d4a017;--b:#FF9F0A"><i class="fas fa-crown"></i></span><div><b>${wins}</b><span>ตอบครบชนะเลิศ</span></div></a>
                <a class="stat-card" style="--a:#30D158;--b:#00C7BE" href="#/certs"><span class="ic-box lg" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-award"></i></span><div><b>${d.certs.length}</b><span>เกียรติบัตรที่ออก</span></div></a>
            </div>
            <div class="panel panel--purple"><div class="panel-head"><span class="ic-box sm"><i class="fas fa-bolt"></i></span><div><h3>เลือกชุดคำถามแล้วเล่นทันที</h3><small>แตะการ์ดเพื่อเลือกผู้เล่นและเริ่มเกม</small></div>
                <div class="panel-tools"><a class="btn-x ghost sm" href="#/set?id=new"><i class="fas fa-plus"></i>สร้างชุดคำถาม</a></div></div>
                <div class="panel-body">${d.sets.length ? `<div class="set-cards">${d.sets.map(setCard).join('')}</div>` : empty('fa-layer-group', 'ยังไม่มีชุดคำถาม', 'สร้างชุดคำถามเอง หรือนำเข้าจาก Excel', '<a class="btn-x primary" href="#/set?id=new"><i class="fas fa-plus"></i>สร้างชุดคำถาม</a>')}</div></div>
            <div class="panel panel--orange"><div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-ranking-star"></i></span><div><h3>ผลการเล่นล่าสุด</h3><small>บันทึกอัตโนมัติเมื่อจบเกม</small></div>
                <div class="panel-tools"><a class="btn-x ghost sm" href="#/results">ดูทั้งหมด</a></div></div>
                <div class="panel-body p-0 dt-wrap">${resultsTable(d.results.slice(0, 6), true)}</div></div>`;
        },
    };
    function setCard(s) {
        const c = setCheck(s);
        return `<a class="set-card" style="--c:${esc(s.color)}" href="#/new?set=${esc(s.id)}">
            <span class="set-ic"><i class="fas ${esc(s.icon)}"></i></span>
            <div class="set-meta"><b>${esc(s.name || '(ยังไม่ตั้งชื่อ)')}</b><small>${esc([s.subject, s.grade].filter(Boolean).join(' • '))}</small>
            <span class="tag ${c.ok ? 'ok' : 'warn'}">${s.questions.length} ข้อ • ${esc(c.text)}</span></div>
            <span class="set-go"><i class="fas fa-play"></i></span></a>`;
    }
    function resultsTable(list, compact) {
        if (!list.length) return `<table class="dt"><tbody>${U.emptyRow(1, 'fa-gamepad', 'ยังไม่มีผลการเล่น — เริ่มเกมแรกได้ที่เมนู "เริ่มเกมใหม่"')}</tbody></table>`;
        return `<table class="dt"><thead><tr><th>วันที่</th><th>ผู้เล่น</th><th>ชุดคำถาม</th><th class="c">ตอบถูก</th><th class="r">คะแนนที่ได้</th><th>ผล</th>${compact ? '' : '<th>ตัวช่วยที่ใช้</th><th class="act"></th>'}</tr></thead><tbody>
            ${list.map((r) => `<tr><td class="nowrap">${esc(Docs.shortDate(r.date))}</td><td><b>${esc(r.player)}</b>${r.mode === 'team' ? ' <span class="tag info">ทีม</span>' : ''}<div class="text-muted-2 small">${esc(r.className || '')}</div></td>
                <td>${esc(r.setName)}</td><td class="c"><div class="mini-bar"><span style="width:${Math.round(r.correct * 100 / (r.total || 1))}%"></span></div>${r.correct}/${r.total}</td>
                <td class="r"><b>${fmt(r.won)}</b></td><td>${stTag(r.status)}</td>
                ${compact ? '' : `<td>${r.used.map((k) => `<span class="tag">${esc(Core.LIFELINES[k].short)}</span>`).join(' ') || '-'}</td>
                <td class="act"><button class="icon-btn" title="ดูรายละเอียด" data-view="${esc(r.id)}"><i class="fas fa-eye"></i></button>
                <button class="icon-btn" title="ออกเกียรติบัตร" data-cert="${esc(r.id)}"><i class="fas fa-award"></i></button>
                <button class="icon-btn del" title="ลบผลนี้" data-del="${esc(r.id)}"><i class="fas fa-trash"></i></button></td>`}</tr>`).join('')}
            </tbody></table>`;
    }

    /* ======================= เริ่มเกมใหม่ ======================= */
    V.new = {
        title: 'เริ่มเกมใหม่', icon: 'fa-play',
        render(view, params) {
            const d = D();
            let setId = params.get('set') || (d.sets.find((s) => setCheck(s).ok) || {}).id || '';
            let mode = 'single';
            const st = d.settings;
            const draw = () => {
                const set = Store.set(setId);
                const n = set ? Core.gameSize(st, set) : st.ladder.length;
                const lad = Core.ladderFor(st, n);
                const people = mode === 'team' ? d.teams : d.players;
                view.innerHTML = `
                ${U.hero({ icon: 'fa-play', title: 'เริ่มเกมใหม่', sub: 'เลือกชุดคำถาม → เลือกผู้เล่น → กดเริ่มเกม (ขึ้นจอโปรเจกเตอร์แล้วกดเต็มจอได้)' })}
                <div class="new-grid">
                <div class="panel panel--purple"><div class="panel-head"><span class="ic-box sm"><b>1</b></span><div><h3>เลือกชุดคำถาม</h3><small>เกมเรียงข้อจากง่ายไปยากให้อัตโนมัติ</small></div></div>
                    <div class="panel-body">${d.sets.length ? `<div class="pick-sets">${d.sets.map((s) => { const c = setCheck(s); return `<button type="button" class="pick-set${s.id === setId ? ' on' : ''}" data-set="${esc(s.id)}" style="--c:${esc(s.color)}" ${c.ok ? '' : 'disabled'}>
                        <span class="set-ic"><i class="fas ${esc(s.icon)}"></i></span><span><b>${esc(s.name)}</b><small>${esc([s.subject, s.grade].filter(Boolean).join(' • '))} • ${esc(c.text)}</small></span>${s.id === setId ? '<i class="fas fa-circle-check chk"></i>' : ''}</button>`; }).join('')}</div>`
                        : empty('fa-layer-group', 'ยังไม่มีชุดคำถาม', 'สร้างชุดคำถามก่อนเริ่มเกม', '<a class="btn-x primary" href="#/set?id=new"><i class="fas fa-plus"></i>สร้างชุดคำถาม</a>')}</div></div>
                <div class="panel panel--orange"><div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><b>2</b></span><div><h3>ผู้เล่น</h3><small>เลือกจากรายชื่อ หรือพิมพ์ชื่อใหม่ได้</small></div></div>
                    <div class="panel-body">
                        <div class="seg mb-3" role="tablist"><button type="button" class="${mode === 'single' ? 'active' : ''}" data-mode="single"><i class="fas fa-user-graduate"></i> รายบุคคล</button><button type="button" class="${mode === 'team' ? 'active' : ''}" data-mode="team"><i class="fas fa-users"></i> ทีม</button></div>
                        ${people.length ? `<div class="chip-list">${people.map((p) => `<button type="button" class="chip-x" data-person="${esc(p.id)}">${esc(p.name)}<small>${esc(p.className || '')}</small></button>`).join('')}
                            <button type="button" class="chip-x rnd" data-random><i class="fas fa-shuffle"></i> สุ่มรายชื่อ</button></div>` : `<div class="form-text mb-2">ยังไม่มีรายชื่อ${mode === 'team' ? 'ทีม' : 'นักเรียน'} — พิมพ์ชื่อด้านล่าง หรือเพิ่มที่เมนู "ผู้เล่น / ทีม"</div>`}
                        <div class="field-row mt-2">
                            <div><label class="form-label" for="ng-name">${mode === 'team' ? 'ชื่อทีม' : 'ชื่อผู้เล่น'}</label><input id="ng-name" class="form-control" placeholder="${mode === 'team' ? 'เช่น ทีมดาวทอง' : 'เช่น ด.ช.ภูมิพัฒน์ ใจแก้ว'}"></div>
                            <div><label class="form-label" for="ng-class">ชั้น</label><input id="ng-class" class="form-control" list="dl-class" placeholder="เช่น ป.6/1"></div>
                        </div>
                        ${mode === 'team' ? '<div class="mt-2"><label class="form-label" for="ng-mem">สมาชิกทีม (บรรทัดละ 1 คน)</label><textarea id="ng-mem" class="form-control" rows="3"></textarea></div>' : ''}
                        <datalist id="dl-class">${[...new Set([...d.players, ...d.teams].map((p) => p.className).filter(Boolean))].map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
                    </div></div>
                <div class="panel panel--teal"><div class="panel-head"><span class="ic-box sm" style="--a:#00C7BE;--b:#0A84FF"><b>3</b></span><div><h3>กติกาเกมนี้</h3><small>ปรับได้ที่ "ตั้งค่าเกมและแม่แบบ"</small></div></div>
                    <div class="panel-body">
                        <div class="rule-ladder">${lad.prizes.map((p, i) => `<span class="${lad.safe.includes(i + 1) ? 'safe' : ''}${i === lad.prizes.length - 1 ? ' top' : ''}">${fmt(p)}</span>`).join('')}</div>
                        <ul class="rule-list">
                            <li><i class="fas fa-list-ol"></i> ${n} ข้อ ไต่บันไดถึง <b>${fmt(lad.prizes[lad.prizes.length - 1])} ${esc(st.unit)}</b></li>
                            <li><i class="fas fa-shield-halved"></i> จุดปลอดภัย: ${lad.safe.length ? lad.safe.map((s) => `ข้อ ${s} (${fmt(lad.prizes[s - 1])})`).join(', ') : 'ไม่มี'}</li>
                            <li><i class="fas fa-stopwatch"></i> เวลา: ง่าย ${st.time[0] || 'ไม่จำกัด'} • ปานกลาง ${st.time[1] || 'ไม่จำกัด'} • ยาก ${st.time[2] || 'ไม่จำกัด'} วินาที</li>
                            <li><i class="fas fa-life-ring"></i> ตัวช่วย: ${Object.keys(Core.LIFELINES).filter((k) => st.lifelines[k]).map((k) => Core.LIFELINES[k].label).join(' • ') || 'ไม่มี'}${set && st.lifelines.swap && set.questions.length <= n ? ' <span class="tag warn">ชุดนี้ไม่มีข้อสำรอง จึงเปลี่ยนคำถามไม่ได้</span>' : ''}</li>
                        </ul>
                        <button type="button" class="btn-x cta lg w-100" id="ng-start" ${set && setCheck(set).ok ? '' : 'disabled'}><i class="fas fa-play"></i>เริ่มเกม</button>
                    </div></div>
                </div>`;
                view.querySelectorAll('[data-set]').forEach((b) => { b.onclick = () => { setId = b.dataset.set; draw(); }; });
                view.querySelectorAll('[data-mode]').forEach((b) => { b.onclick = () => { mode = b.dataset.mode; draw(); }; });
                const fillP = (p) => {
                    view.querySelector('#ng-name').value = p.name; view.querySelector('#ng-class').value = p.className || '';
                    const m = view.querySelector('#ng-mem'); if (m) m.value = (p.members || []).join('\n');
                    view.querySelectorAll('[data-person]').forEach((x) => x.classList.toggle('on', x.dataset.person === p.id));
                };
                view.querySelectorAll('[data-person]').forEach((b) => { b.onclick = () => fillP(people.find((p) => p.id === b.dataset.person)); });
                const rnd = view.querySelector('[data-random]');
                if (rnd) rnd.onclick = () => { const played = new Set(d.results.map((r) => r.player)); const pool = people.filter((p) => !played.has(p.name)); const list = pool.length ? pool : people; fillP(list[Math.floor(Math.random() * list.length)]); Sound.play('pick'); };
                view.querySelector('#ng-start').onclick = () => {
                    const name = U.norm(view.querySelector('#ng-name').value);
                    if (!name) { U.toast('กรุณาเลือกหรือพิมพ์ชื่อผู้เล่น', { type: 'warn' }); view.querySelector('#ng-name').focus(); return; }
                    const m = view.querySelector('#ng-mem');
                    Stage.start(Store.set(setId), { mode, name, className: U.norm(view.querySelector('#ng-class').value), members: m ? m.value.split(/\n/).map(U.norm).filter(Boolean) : [] });
                };
            };
            draw();
        },
    };

    /* ======================= ชุดคำถาม ======================= */
    V.sets = {
        title: 'ชุดคำถาม', icon: 'fa-layer-group',
        render(view) {
            const d = D();
            view.innerHTML = `${U.hero({ icon: 'fa-layer-group', title: 'ชุดคำถาม', sub: 'ชุดละ 10–15 ข้อ (ตามบันไดคะแนน) + ข้อสำรองสำหรับตัวช่วยเปลี่ยนคำถาม',
                side: `<button type="button" class="btn-x ghost" id="tpl-btn"><i class="fas fa-file-excel"></i>แม่แบบ Excel</button><button type="button" class="btn-x orange" id="imp-btn" data-demo-lock="นำเข้า Excel"><i class="fas fa-file-import"></i>นำเข้าจาก Excel</button><a class="btn-x cta" href="#/set?id=new"><i class="fas fa-plus"></i>สร้างชุดใหม่</a>` })}
            <div class="panel"><div class="panel-body p-0 dt-wrap">${d.sets.length ? `<table class="dt"><thead><tr><th>ชุดคำถาม</th><th>วิชา / ชั้น</th><th class="c">จำนวนข้อ</th><th>ง่าย/กลาง/ยาก</th><th>สถานะ</th><th class="act"></th></tr></thead><tbody>
                ${d.sets.map((s) => { const c = setCheck(s); const cnt = [1, 2, 3].map((v) => s.questions.filter((q) => q.level === v).length); return `<tr>
                    <td><span class="set-dot" style="--c:${esc(s.color)}"><i class="fas ${esc(s.icon)}"></i></span><b>${esc(s.name)}</b></td><td>${esc([s.subject, s.grade].filter(Boolean).join(' • ') || '-')}</td>
                    <td class="c">${s.questions.length}</td><td>${cnt.join(' / ')}</td><td><span class="tag ${c.ok ? 'ok' : 'warn'}">${esc(c.text)}</span></td>
                    <td class="act nowrap"><a class="icon-btn" title="เล่นชุดนี้" href="#/new?set=${esc(s.id)}"><i class="fas fa-play"></i></a><a class="icon-btn" title="แก้ไขคำถาม" href="#/set?id=${esc(s.id)}"><i class="fas fa-pen"></i></a>
                    <button class="icon-btn" title="คัดลอกชุด" data-copy="${esc(s.id)}"><i class="fas fa-copy"></i></button><button class="icon-btn" title="ส่งออก Excel" data-xlsx="${esc(s.id)}"><i class="fas fa-file-excel"></i></button>
                    <button class="icon-btn del" title="ลบชุดคำถาม" data-del="${esc(s.id)}"><i class="fas fa-trash"></i></button></td></tr>`; }).join('')}</tbody></table>`
                : empty('fa-layer-group', 'ยังไม่มีชุดคำถาม', 'กด "สร้างชุดใหม่" หรือ "นำเข้าจาก Excel"')}</div></div>`;
            view.querySelector('#tpl-btn').onclick = QIO.template;
            view.querySelector('#imp-btn').onclick = () => importInto(null);
            view.querySelectorAll('[data-xlsx]').forEach((b) => { b.onclick = () => QIO.exportSet(Store.set(b.dataset.xlsx)); });
            view.querySelectorAll('[data-copy]').forEach((b) => { b.onclick = () => { const s = U.clone(Store.set(b.dataset.copy)); s.id = U.uid('set'); s.name += ' (สำเนา)'; s.questions.forEach((q) => { q.id = U.uid('q'); }); d.sets.push(s); Store.commit('sets'); U.toast('คัดลอกชุดคำถามแล้ว', { type: 'ok' }); this.render(view); }; });
            view.querySelectorAll('[data-del]').forEach((b) => { b.onclick = async () => { const s = Store.set(b.dataset.del); if (!(await U.confirm('ลบชุดคำถามนี้?', `<b>${esc(s.name)}</b> (${s.questions.length} ข้อ) — ประวัติผลการเล่นยังอยู่`, { confirmText: 'ลบ', danger: true }))) return; d.sets = d.sets.filter((x) => x !== s); Store.commit('sets'); this.render(view); }; });
        },
    };

    /** นำเข้าจาก Excel: ไปยังชุดเดิม (เพิ่มต่อท้าย) หรือสร้างชุดใหม่ */
    async function importInto(setId) {
        if (!VSDemo.allow('นำเข้า Excel')) return;
        const file = await U.pickFile('.xlsx,.xls,.csv');
        if (!file) return;
        let res;
        try { res = await QIO.readFile(file); } catch (e) { U.alert('อ่านไฟล์ไม่สำเร็จ', esc(e.message), 'error'); return; }
        await finishImport(res, setId, file.name.replace(/\.[^.]+$/, ''));
    }
    async function finishImport(res, setId, name) {
        if (!res.questions.length) { U.alert('ไม่พบคำถามที่นำเข้าได้', res.errors.slice(0, 8).map(esc).join('<br>') || 'ตรวจรูปแบบคอลัมน์ตามแม่แบบ', 'warning'); return; }
        const ok = await U.confirm(`นำเข้า ${res.questions.length} ข้อ?`, `${res.errors.length ? `<div class="note warn" style="text-align:left"><i class="fas fa-triangle-exclamation"></i><div>${res.errors.slice(0, 6).map(esc).join('<br>')}${res.errors.length > 6 ? '<br>…' : ''}</div></div>` : ''}${setId ? 'เพิ่มต่อท้ายชุดคำถามนี้' : 'สร้างเป็นชุดคำถามใหม่'}`, { confirmText: '<i class="fas fa-file-import"></i> นำเข้า', icon: 'question' });
        if (!ok) return;
        let set = setId ? Store.set(setId) : null;
        if (!set) { set = Object.assign(Store.newSet(), { name: name || 'ชุดคำถามนำเข้า' }); D().sets.push(set); }
        set.questions.push(...res.questions);
        Store.commit('sets');
        U.toast(`นำเข้า ${res.questions.length} ข้อแล้ว`, { type: 'ok' });
        App.go('set', `id=${set.id}`); App.render();
    }

    /* ======================= แก้ไขชุดคำถาม ======================= */
    V.set = {
        title: 'แก้ไขชุดคำถาม', icon: 'fa-pen-to-square',
        render(view, params) {
            const d = D();
            let set = Store.set(params.get('id'));
            if (!set) { set = Store.newSet(); set.name = 'ชุดคำถามใหม่'; d.sets.push(set); Store.commit('sets'); history.replaceState(null, '', `#/set?id=${set.id}`); }
            const draw = () => {
                const c = setCheck(set);
                const sorted = set.questions.map((q, i) => ({ q, i })).sort((a, b) => (a.q.level - b.q.level) || (a.i - b.i));
                const n = Math.min(set.questions.length, d.settings.ladder.length);
                view.innerHTML = `
                <div class="panel panel--purple"><div class="panel-head"><span class="ic-box sm" style="--a:${esc(set.color)};--b:${esc(set.color)}"><i class="fas ${esc(set.icon)}"></i></span><div><h3>ข้อมูลชุดคำถาม</h3><small>${esc(c.text)}</small></div>
                    <div class="panel-tools"><a class="btn-x ghost sm" href="#/sets"><i class="fas fa-arrow-left"></i>ชุดทั้งหมด</a><a class="btn-x cta sm" href="#/new?set=${esc(set.id)}"><i class="fas fa-play"></i>เล่นชุดนี้</a></div></div>
                    <div class="panel-body"><div class="field-row">
                        <div><label class="form-label" for="s-name">ชื่อชุด</label><input id="s-name" class="form-control" value="${esc(set.name)}"></div>
                        <div><label class="form-label" for="s-sub">วิชา</label><input id="s-sub" class="form-control" list="dl-sub" value="${esc(set.subject)}"><datalist id="dl-sub">${SUBJECTS.map((x) => `<option value="${x}">`).join('')}</datalist></div>
                        <div><label class="form-label" for="s-grade">ระดับชั้น</label><input id="s-grade" class="form-control" list="dl-grade" value="${esc(set.grade)}"><datalist id="dl-grade">${GRADES.map((x) => `<option value="${x}">`).join('')}</datalist></div>
                    </div>
                    <div class="mt-2"><label class="form-label">สีและไอคอน</label><div class="swatches">${COLORS.map((x) => `<button type="button" class="sw${x === set.color ? ' on' : ''}" style="--c:${x}" data-color="${x}" aria-label="สี ${x}"></button>`).join('')}
                        <span class="sep"></span>${ICONS.map((x) => `<button type="button" class="ic-pick${x === set.icon ? ' on' : ''}" data-icon="${x}" aria-label="ไอคอน"><i class="fas ${x}"></i></button>`).join('')}</div></div></div></div>
                <div class="panel panel--orange"><div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-list-ol"></i></span><div><h3>คำถาม ${set.questions.length} ข้อ</h3><small>เรียงตามระดับ ง่าย→ยาก (ลำดับที่เล่นจริง) • ข้อที่เกิน ${n} ข้อแรกเป็นข้อสำรอง</small></div>
                    <div class="panel-tools"><button type="button" class="btn-x ghost sm" id="q-docx"><i class="fas fa-file-word"></i>พิมพ์ชุดคำถาม</button><button type="button" class="btn-x orange sm" id="q-imp" data-demo-lock="นำเข้า Excel"><i class="fas fa-file-import"></i>นำเข้า Excel</button><button type="button" class="btn-x primary sm" id="q-add"><i class="fas fa-plus"></i>เพิ่มคำถาม</button></div></div>
                    <div class="panel-body p-0 dt-wrap"><table class="dt q-table"><thead><tr><th class="c">ลำดับเล่น</th><th>ระดับ</th><th>คำถาม</th><th>เฉลย</th><th class="act"></th></tr></thead><tbody>
                    ${sorted.length ? sorted.map(({ q }, k) => `<tr class="${k >= n ? 'spare' : ''}"><td class="c">${k < n ? k + 1 : '<span class="tag info">สำรอง</span>'}</td><td>${lvTag(q.level)}</td>
                        <td><b>${esc(q.text) || '<span class="text-danger">(ยังไม่มีคำถาม)</span>'}</b><div class="q-ch">${q.choices.map((ch, i) => `<span class="${i === q.answer ? 'ans' : ''}">${L[i]}. ${esc(ch) || '…'}</span>`).join('')}</div></td>
                        <td class="nowrap"><span class="tag ok">${L[q.answer]}</span></td>
                        <td class="act nowrap"><button class="icon-btn" title="แก้ไข" data-edit="${esc(q.id)}"><i class="fas fa-pen"></i></button><button class="icon-btn" title="ทำสำเนา" data-dup="${esc(q.id)}"><i class="fas fa-copy"></i></button><button class="icon-btn del" title="ลบคำถาม" data-del="${esc(q.id)}"><i class="fas fa-trash"></i></button></td></tr>`).join('')
                        : U.emptyRow(5, 'fa-circle-question', 'ยังไม่มีคำถาม — กด "เพิ่มคำถาม" หรือ "นำเข้า Excel"')}</tbody></table></div></div>`;
                const bindIn = (id, key) => { view.querySelector(id).onchange = (e) => { set[key] = U.norm(e.target.value); Store.commit('sets'); }; };
                bindIn('#s-name', 'name'); bindIn('#s-sub', 'subject'); bindIn('#s-grade', 'grade');
                view.querySelectorAll('[data-color]').forEach((b) => { b.onclick = () => { set.color = b.dataset.color; Store.commit('sets'); draw(); }; });
                view.querySelectorAll('[data-icon]').forEach((b) => { b.onclick = () => { set.icon = b.dataset.icon; Store.commit('sets'); draw(); }; });
                view.querySelector('#q-add').onclick = () => editQ(null);
                view.querySelector('#q-imp').onclick = () => importInto(set.id);
                view.querySelector('#q-docx').onclick = () => App.docSet(set);
                view.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => editQ(set.questions.find((q) => q.id === b.dataset.edit)); });
                view.querySelectorAll('[data-dup]').forEach((b) => { b.onclick = () => { const i = set.questions.findIndex((q) => q.id === b.dataset.dup); const x = Object.assign(U.clone(set.questions[i]), { id: U.uid('q') }); set.questions.splice(i + 1, 0, x); Store.commit('sets'); draw(); }; });
                view.querySelectorAll('[data-del]').forEach((b) => { b.onclick = async () => { const q = set.questions.find((x) => x.id === b.dataset.del); if (!(await U.confirm('ลบคำถามนี้?', esc(q.text), { confirmText: 'ลบ', danger: true }))) return; set.questions = set.questions.filter((x) => x !== q); Store.commit('sets'); draw(); }; });
            };
            const editQ = async (q) => {
                const x = q ? U.clone(q) : Store.newQuestion(set.questions.length >= 10 ? 3 : set.questions.length >= 5 ? 2 : 1);
                const r = await U.sheet({
                    title: q ? 'แก้ไขคำถาม' : 'เพิ่มคำถาม', icon: 'fa-circle-question', tone: ['#11083e', '#2d16a0', '#b8860b'], width: 720,
                    body: `<label class="form-label">ระดับความยาก</label><div class="seg mb-2" id="e-lv">${Core.LEVELS.map((l) => `<button type="button" data-lv="${l.v}" class="${x.level === l.v ? 'active' : ''}">${l.label}</button>`).join('')}</div>
                        <label class="form-label" for="e-text">คำถาม</label><textarea id="e-text" class="form-control" rows="2">${esc(x.text)}</textarea>
                        <label class="form-label mt-2">ตัวเลือก (แตะวงกลมเพื่อกำหนดคำตอบที่ถูก)</label>
                        ${x.choices.map((c, i) => `<div class="ch-row"><label class="ch-ok"><input type="radio" name="e-ans" value="${i}" ${x.answer === i ? 'checked' : ''}><span>${L[i]}</span></label><input class="form-control" id="e-c${i}" value="${esc(c)}" placeholder="ตัวเลือก ${L[i]}"></div>`).join('')}
                        <label class="form-label mt-2" for="e-exp">คำอธิบายเฉลย (แสดงหลังเฉลย — ไม่บังคับ)</label><input id="e-exp" class="form-control" value="${esc(x.explain)}">`,
                    didOpen: (el) => { el.querySelectorAll('[data-lv]').forEach((b) => { b.onclick = () => { el.querySelectorAll('[data-lv]').forEach((y) => y.classList.toggle('active', y === b)); }; }); },
                    preConfirm: () => {
                        const text = document.getElementById('e-text').value.trim();
                        const choices = [0, 1, 2, 3].map((i) => U.norm(document.getElementById(`e-c${i}`).value));
                        if (!text) { Swal.showValidationMessage('กรุณากรอกคำถาม'); return false; }
                        if (choices.some((c) => !c)) { Swal.showValidationMessage('กรุณากรอกตัวเลือกให้ครบ 4 ข้อ'); return false; }
                        if (new Set(choices).size < 4) { Swal.showValidationMessage('ตัวเลือกซ้ำกัน'); return false; }
                        return { text, choices, answer: Number(document.querySelector('input[name=e-ans]:checked').value), explain: document.getElementById('e-exp').value.trim(), level: Number(document.querySelector('#e-lv .active').dataset.lv) };
                    },
                });
                if (!r.isConfirmed) return;
                if (q) Object.assign(q, r.value); else set.questions.push(Object.assign(x, r.value));
                Store.commit('sets');
                U.toast('บันทึกคำถามแล้ว', { type: 'ok' });
                draw();
            };
            draw();
        },
    };

    /* ======================= ผู้เล่น / ทีม ======================= */
    V.people = {
        title: 'ผู้เล่น / ทีม', icon: 'fa-users',
        render(view) {
            const d = D();
            const table = (list, team) => `<table class="dt"><thead><tr><th>${team ? 'ชื่อทีม' : 'ชื่อ-สกุล'}</th><th>ชั้น</th>${team ? '<th>สมาชิก</th>' : ''}<th class="c">เล่นแล้ว</th><th class="r">คะแนนสูงสุด</th><th class="act"></th></tr></thead><tbody>
                ${list.length ? list.map((p) => { const rs = d.results.filter((r) => r.player === p.name); return `<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.className || '-')}</td>${team ? `<td>${esc((p.members || []).join(', ') || '-')}</td>` : ''}
                    <td class="c">${rs.length}</td><td class="r">${rs.length ? fmt(Math.max(...rs.map((r) => r.won))) : '-'}</td>
                    <td class="act nowrap"><button class="icon-btn" title="แก้ไข" data-edit="${esc(p.id)}"><i class="fas fa-pen"></i></button><button class="icon-btn del" title="ลบรายชื่อ" data-del="${esc(p.id)}"><i class="fas fa-trash"></i></button></td></tr>`; }).join('')
                : U.emptyRow(team ? 6 : 5, team ? 'fa-users' : 'fa-user-graduate', team ? 'ยังไม่มีทีม' : 'ยังไม่มีรายชื่อนักเรียน')}</tbody></table>`;
            view.innerHTML = `${U.hero({ icon: 'fa-users', title: 'ผู้เล่น / ทีม', sub: 'เก็บรายชื่อไว้เลือกตอนเริ่มเกม (ไม่บังคับ — พิมพ์ชื่อตอนเริ่มเกมก็ได้)' })}
                <div class="panel panel--purple"><div class="panel-head"><span class="ic-box sm"><i class="fas fa-user-graduate"></i></span><div><h3>นักเรียน (เล่นรายบุคคล) ${d.players.length} คน</h3></div>
                    <div class="panel-tools"><button type="button" class="btn-x orange sm" id="p-paste" data-demo-lock="วางรายชื่อจำนวนมาก"><i class="fas fa-paste"></i>วางรายชื่อ</button><button type="button" class="btn-x primary sm" id="p-add"><i class="fas fa-plus"></i>เพิ่มนักเรียน</button></div></div>
                    <div class="panel-body p-0 dt-wrap">${table(d.players, false)}</div></div>
                <div class="panel panel--green"><div class="panel-head"><span class="ic-box sm" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-users"></i></span><div><h3>ทีม ${d.teams.length} ทีม</h3></div>
                    <div class="panel-tools"><button type="button" class="btn-x primary sm" id="t-add"><i class="fas fa-plus"></i>เพิ่มทีม</button></div></div>
                    <div class="panel-body p-0 dt-wrap">${table(d.teams, true)}</div></div>`;
            const edit = async (p, team) => {
                const x = p || { id: U.uid(team ? 't' : 'p'), name: '', className: '', members: [] };
                const r = await U.sheet({
                    title: p ? 'แก้ไข' : (team ? 'เพิ่มทีม' : 'เพิ่มนักเรียน'), icon: team ? 'fa-users' : 'fa-user-graduate',
                    body: `<label class="form-label" for="pp-name">${team ? 'ชื่อทีม' : 'ชื่อ-สกุล'}</label><input id="pp-name" class="form-control" value="${esc(x.name)}">
                        <label class="form-label mt-2" for="pp-class">ชั้น</label><input id="pp-class" class="form-control" list="dl-pc" value="${esc(x.className)}"><datalist id="dl-pc">${GRADES.map((g) => `<option value="${g}/1">`).join('')}</datalist>
                        ${team ? `<label class="form-label mt-2" for="pp-mem">สมาชิก (บรรทัดละ 1 คน)</label><textarea id="pp-mem" class="form-control" rows="4">${esc((x.members || []).join('\n'))}</textarea>` : ''}`,
                    preConfirm: () => { const name = U.norm(document.getElementById('pp-name').value); if (!name) { Swal.showValidationMessage('กรุณากรอกชื่อ'); return false; } return { name, className: U.norm(document.getElementById('pp-class').value), members: team ? document.getElementById('pp-mem').value.split('\n').map(U.norm).filter(Boolean) : [] }; },
                });
                if (!r.isConfirmed) return;
                Object.assign(x, r.value);
                if (!p) (team ? d.teams : d.players).push(Object.assign(x, { type: team ? 'team' : 'single' }));
                Store.commit('people'); this.render(view);
            };
            view.querySelector('#p-add').onclick = () => edit(null, false);
            view.querySelector('#t-add').onclick = () => edit(null, true);
            view.querySelector('#p-paste').onclick = async () => {
                if (!VSDemo.allow('วางรายชื่อจำนวนมาก')) return;
                const r = await U.sheet({ title: 'วางรายชื่อนักเรียน', icon: 'fa-paste', body: '<div class="form-text mb-2">คัดลอกจาก Excel: คอลัมน์ที่ 1 = ชื่อ-สกุล, คอลัมน์ที่ 2 = ชั้น (ถ้ามี) บรรทัดละ 1 คน</div><textarea id="pp-paste" class="form-control" rows="8"></textarea>', confirmText: '<i class="fas fa-plus"></i> เพิ่มรายชื่อ' });
                if (!r.isConfirmed) return;
                const rows = document.getElementById('pp-paste').value.split('\n').map((l) => l.split('\t').map(U.norm)).filter((c) => c[0]);
                rows.forEach((c) => d.players.push({ id: U.uid('p'), type: 'single', name: c[0], className: c[1] || '', members: [] }));
                Store.commit('people'); U.toast(`เพิ่ม ${rows.length} คนแล้ว`, { type: 'ok' }); this.render(view);
            };
            view.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => { const p = d.players.find((x) => x.id === b.dataset.edit); edit(p || d.teams.find((x) => x.id === b.dataset.edit), !p); }; });
            view.querySelectorAll('[data-del]').forEach((b) => { b.onclick = async () => { const id = b.dataset.del; const p = [...d.players, ...d.teams].find((x) => x.id === id); if (!(await U.confirm('ลบรายชื่อนี้?', esc(p.name), { confirmText: 'ลบ', danger: true }))) return; d.players = d.players.filter((x) => x.id !== id); d.teams = d.teams.filter((x) => x.id !== id); Store.commit('people'); this.render(view); }; });
        },
    };

    /* ======================= ประวัติผล ======================= */
    V.results = {
        title: 'ประวัติผลการเล่น', icon: 'fa-ranking-star',
        render(view, params) {
            const d = D();
            const f = params.get('set') || '';
            const list = d.results.filter((r) => !f || r.setId === f);
            const best = list.slice().sort((a, b) => b.won - a.won || b.correct - a.correct).slice(0, 3);
            view.innerHTML = `${U.hero({ icon: 'fa-ranking-star', title: 'ประวัติผลการเล่น', sub: `ทั้งหมด ${list.length} ครั้ง • บันทึกอัตโนมัติเมื่อจบเกม`, side: '<a class="btn-x cta" href="#/reports"><i class="fas fa-file-word"></i>ออกรายงาน (.docx)</a>' })}
                ${best.length ? `<div class="podium">${best.map((r, i) => `<div class="pd pd${i + 1}"><span class="pd-ic"><i class="fas ${i ? 'fa-medal' : 'fa-crown'}"></i></span><b>${esc(r.player)}</b><small>${esc(r.setName)}</small><span class="pd-score">${fmt(r.won)}</span></div>`).join('')}</div>` : ''}
                <div class="panel"><div class="panel-head"><span class="ic-box sm"><i class="fas fa-filter"></i></span><div><h3>ผลการเล่น</h3></div>
                    <div class="panel-tools"><select class="form-select form-select-sm" id="r-set"><option value="">ทุกชุดคำถาม</option>${U.options(d.sets.map((s) => ({ value: s.id, text: s.name })), f)}</select></div></div>
                <div class="panel-body p-0 dt-wrap">${resultsTable(list, false)}</div></div>`;
            view.querySelector('#r-set').onchange = (e) => App.go('results', e.target.value ? `set=${e.target.value}` : '');
            view.querySelectorAll('[data-view]').forEach((b) => { b.onclick = () => showResult(d.results.find((r) => r.id === b.dataset.view)); });
            view.querySelectorAll('[data-cert]').forEach((b) => { b.onclick = () => { const r = d.results.find((x) => x.id === b.dataset.cert); const c = Store.issueCert(r); U.toast(`เกียรติบัตรเลขที่ <b>${c.no}/${c.year}</b>`, { type: 'ok' }); App.printCerts([c]); }; });
            view.querySelectorAll('[data-del]').forEach((b) => { b.onclick = async () => { const r = d.results.find((x) => x.id === b.dataset.del); if (!(await U.confirm('ลบผลการเล่นนี้?', `${esc(r.player)} • ${esc(r.setName)}`, { confirmText: 'ลบ', danger: true }))) return; d.results = d.results.filter((x) => x !== r); Store.commit('results'); this.render(view, params); }; });
        },
    };
    function showResult(r) {
        U.sheet({
            title: r.player, icon: 'fa-gamepad', sub: `${esc(r.setName)} • ${esc(Docs.longDate(r.date))}`, showCancel: false, confirmText: 'ปิด', width: 760,
            body: `<div class="mb-2">${stTag(r.status)} ตอบถูก <b>${r.correct}/${r.total}</b> ข้อ • ได้ <b>${fmt(r.won)} ${esc(r.unit)}</b>${r.members && r.members.length ? `<div class="text-muted-2">สมาชิก: ${esc(r.members.join(', '))}</div>` : ''}</div>
                <div class="dt-wrap"><table class="dt"><thead><tr><th class="c">ข้อ</th><th>คำถาม</th><th class="c">ตอบ</th><th class="c">เฉลย</th><th>ผล</th></tr></thead><tbody>
                ${r.log.map((l) => `<tr><td class="c">${l.n}</td><td>${esc(l.text)}</td><td class="c">${l.pick == null ? '-' : L[l.pick]}</td><td class="c">${L[l.answer]}</td><td>${l.swapped ? '<span class="tag info">เปลี่ยนคำถาม</span>' : l.timeout ? '<span class="tag warn">หมดเวลา</span>' : l.ok ? '<span class="tag ok">ถูก</span>' : '<span class="tag bad">ผิด</span>'}</td></tr>`).join('')}</tbody></table></div>`,
        });
    }

    /* ======================= ทะเบียนเกียรติบัตร ======================= */
    V.certs = {
        title: 'ทะเบียนเกียรติบัตร', icon: 'fa-award',
        render(view) {
            const d = D();
            view.innerHTML = `${U.hero({ icon: 'fa-award', title: 'ทะเบียนคุมเกียรติบัตร', sub: 'เลขที่รันอัตโนมัติแยกตามปีการศึกษา • พิมพ์ทีละใบหรือพิมพ์เป็นชุดได้',
                side: '<button type="button" class="btn-x orange" id="c-winners"><i class="fas fa-crown"></i>ออกให้ผู้ชนะทุกคน</button><button type="button" class="btn-x cta" id="c-print"><i class="fas fa-print"></i>พิมพ์ที่เลือกเป็นชุด</button>' })}
                <div class="panel"><div class="panel-body p-0 dt-wrap"><table class="dt"><thead><tr><th class="c"><input type="checkbox" class="form-check-input" id="c-all" aria-label="เลือกทั้งหมด"></th><th>เลขที่</th><th>ชื่อ</th><th>วันที่</th><th>ผลงาน</th><th class="act"></th></tr></thead><tbody>
                ${d.certs.length ? d.certs.map((c) => { const r = d.results.find((x) => x.id === c.resultId); return `<tr><td class="c"><input type="checkbox" class="form-check-input" data-pick="${esc(c.id)}" aria-label="เลือก"></td><td><b>${c.no}/${esc(c.year)}</b></td><td>${esc(c.name)}</td><td>${esc(Docs.shortDate(c.date))}</td>
                    <td>${r ? `${esc(r.setName)} • ${fmt(r.won)} ${esc(r.unit)}` : '-'}</td><td class="act nowrap"><button class="icon-btn" title="แก้ข้อความ" data-edit="${esc(c.id)}"><i class="fas fa-pen"></i></button><button class="icon-btn" title="พิมพ์" data-print="${esc(c.id)}"><i class="fas fa-print"></i></button></td></tr>`; }).join('')
                : U.emptyRow(6, 'fa-award', 'ยังไม่มีเกียรติบัตร — กดปุ่มรูปเหรียญในหน้าประวัติผล หรือ "ออกให้ผู้ชนะทุกคน"')}</tbody></table></div></div>
                <div class="note info"><i class="fas fa-circle-info"></i><div>ตั้งกระดาษเป็น <b>A4 แนวนอน</b> ตอนพิมพ์ • แก้ถ้อยคำในเกียรติบัตรได้ที่ "ตั้งค่าเกมและแม่แบบ" • เลขที่ไม่ลบ/ไม่ใช้ซ้ำ เพื่อให้ตรวจสอบย้อนหลังได้</div></div>`;
            const all = view.querySelector('#c-all');
            all.onchange = () => view.querySelectorAll('[data-pick]').forEach((x) => { x.checked = all.checked; });
            view.querySelector('#c-print').onclick = () => { const ids = [...view.querySelectorAll('[data-pick]:checked')].map((x) => x.dataset.pick); App.printCerts(d.certs.filter((c) => ids.includes(c.id)).reverse()); };
            view.querySelector('#c-winners').onclick = () => { const w = d.results.filter((r) => r.status === 'win' && !d.certs.some((c) => c.resultId === r.id)).reverse(); w.forEach((r) => Store.issueCert(r)); U.toast(w.length ? `ออกเกียรติบัตรใหม่ ${w.length} ใบ` : 'ผู้ชนะทุกคนมีเกียรติบัตรแล้ว', { type: w.length ? 'ok' : 'info' }); this.render(view); };
            view.querySelectorAll('[data-print]').forEach((b) => { b.onclick = () => App.printCerts([d.certs.find((c) => c.id === b.dataset.print)]); });
            view.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = async () => {
                const c = d.certs.find((x) => x.id === b.dataset.edit);
                const r = await U.sheet({ title: `เกียรติบัตรเลขที่ ${c.no}/${c.year}`, icon: 'fa-award', body: `<label class="form-label" for="ce-name">ชื่อผู้ได้รับ</label><input id="ce-name" class="form-control" value="${esc(c.name)}">
                    <label class="form-label mt-2" for="ce-r">ข้อความผลงาน (เว้นว่าง = ใช้แม่แบบ)</label><input id="ce-r" class="form-control" value="${esc(c.reason)}" placeholder="${esc(Core.fill(d.texts.certReason, {}))}">`,
                    preConfirm: () => ({ name: U.norm(document.getElementById('ce-name').value) || c.name, reason: U.norm(document.getElementById('ce-r').value) }) });
                if (!r.isConfirmed) return;
                Object.assign(c, r.value); Store.commit('certs'); this.render(view);
            }; });
        },
    };

    /* ======================= รายงาน ======================= */
    App.docSet = async (set) => {
        const r = await U.sheet({ title: 'พิมพ์ชุดคำถาม (.docx)', icon: 'fa-file-word', body: `<b>${esc(set.name)}</b><div class="form-text">เลือกแบบเอกสาร</div>`, confirmText: '<i class="fas fa-key"></i> ฉบับครู (มีเฉลย)', denyText: '<i class="fas fa-file"></i> ฉบับไม่มีเฉลย', denyClass: 'ghost' });
        if (!r.isConfirmed && !r.isDenied) return;
        await ThaiDoc.download([Docs.setSection(ThaiDoc, set, D().school, r.isConfirmed)], `ชุดคำถาม_${U.safeFileName(set.name)}${r.isConfirmed ? '_เฉลย' : ''}.docx`, { title: set.name });
        U.toast('ดาวน์โหลดเอกสารแล้ว', { type: 'ok' });
    };
    V.reports = {
        title: 'รายงาน (.docx)', icon: 'fa-file-word',
        render(view) {
            const d = D();
            const dates = d.results.map((r) => r.date.slice(0, 10)).sort();
            view.innerHTML = `${U.hero({ icon: 'fa-file-word', title: 'รายงานแบบราชการ (.docx)', sub: 'TH SarabunPSK 16 • A4 • ตามระเบียบงานสารบรรณ — ข้อความแก้ได้ที่ "ตั้งค่าเกมและแม่แบบ"' })}
                <div class="panel panel--slate"><div class="panel-head"><span class="ic-box sm"><i class="fas fa-filter"></i></span><div><h3>ช่วงข้อมูลที่ใช้ทำรายงาน</h3><small>เลือกช่วงวันที่ / ชุดคำถาม</small></div></div>
                    <div class="panel-body"><div class="field-row">
                        <div><label class="form-label" for="rp-from">ตั้งแต่วันที่</label><input type="date" id="rp-from" class="form-control" value="${esc(dates[0] || '')}"></div>
                        <div><label class="form-label" for="rp-to">ถึงวันที่</label><input type="date" id="rp-to" class="form-control" value="${esc(dates[dates.length - 1] || '')}"></div>
                        <div><label class="form-label" for="rp-set">ชุดคำถาม</label><select id="rp-set" class="form-select"><option value="">ทุกชุด</option>${U.options(d.sets.map((s) => ({ value: s.id, text: s.name })), '')}</select></div>
                    </div><div class="form-text mt-2" id="rp-count"></div></div></div>
                <div class="doc-cards">
                    <div class="doc-card"><span class="ic-box lg" style="--a:#2d16a0;--b:#5e43e4"><i class="fas fa-table-list"></i></span><b>สรุปผลการจัดกิจกรรม</b><small>ตารางผลการเล่นทุกครั้ง + ลงนามผู้จัดกิจกรรม</small><button type="button" class="btn-x primary" id="d-rep"><i class="fas fa-download"></i>ดาวน์โหลด .docx</button></div>
                    <div class="doc-card"><span class="ic-box lg" style="--a:#d4a017;--b:#FF9F0A"><i class="fas fa-envelope-open-text"></i></span><b>บันทึกข้อความรายงานผล</b><small>เสนอผู้อำนวยการ + แนบสรุปผล (ตั้งเลขที่/วันที่ได้)</small><button type="button" class="btn-x orange" id="d-memo"><i class="fas fa-download"></i>ดาวน์โหลด .docx</button></div>
                    <div class="doc-card"><span class="ic-box lg" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-list-check"></i></span><b>ชุดคำถามพร้อมเฉลย</b><small>พิมพ์เป็นชุด เก็บเป็นหลักฐาน/แบ่งปันครู</small><select class="form-select mb-2" id="d-set">${U.options(d.sets.map((s) => ({ value: s.id, text: s.name })), '')}</select><button type="button" class="btn-x green" id="d-qs" ${d.sets.length ? '' : 'disabled'}><i class="fas fa-download"></i>ดาวน์โหลด .docx</button></div>
                </div>`;
            const ctx = () => Docs.context(d, { from: view.querySelector('#rp-from').value, to: view.querySelector('#rp-to').value, setId: view.querySelector('#rp-set').value });
            const upd = () => { view.querySelector('#rp-count').innerHTML = `<i class="fas fa-circle-info"></i> ${esc(Docs.reportNote(ctx()))}`; };
            ['#rp-from', '#rp-to', '#rp-set'].forEach((s) => { view.querySelector(s).onchange = upd; });
            upd();
            view.querySelector('#d-rep').onclick = async () => { await ThaiDoc.download([Docs.reportSection(ThaiDoc, ctx())], 'สรุปผลการจัดกิจกรรมเกมเศรษฐี.docx', { title: 'สรุปผลการจัดกิจกรรม' }); U.toast('ดาวน์โหลดรายงานแล้ว', { type: 'ok' }); };
            view.querySelector('#d-qs').onclick = () => App.docSet(Store.set(view.querySelector('#d-set').value));
            view.querySelector('#d-memo').onclick = async () => {
                const c = ctx();
                const f = Docs.memoDefaults(c, new Date());
                const r = await U.sheet({ title: 'บันทึกข้อความ', icon: 'fa-envelope-open-text', body: `
                    <label class="form-label" for="m-ag">ส่วนราชการ</label><input id="m-ag" class="form-control" value="${esc(f.agency)}">
                    <div class="field-row mt-2"><div><label class="form-label" for="m-no">ที่</label><input id="m-no" class="form-control" placeholder="เว้นว่าง = จุดไข่ปลา"></div><div><label class="form-label" for="m-date">วันที่</label><input id="m-date" class="form-control" value="${esc(f.date)}"></div></div>
                    <label class="form-label mt-2" for="m-to">เรียน</label><input id="m-to" class="form-control" value="${esc(f.to)}">
                    <div class="form-text mt-2">ย่อหน้าเนื้อหามาจากแม่แบบใน "ตั้งค่าเกมและแม่แบบ"</div>`, confirmText: '<i class="fas fa-download"></i> ดาวน์โหลด .docx',
                    preConfirm: () => ({ agency: document.getElementById('m-ag').value.trim(), docNo: document.getElementById('m-no').value.trim(), date: document.getElementById('m-date').value.trim(), to: document.getElementById('m-to').value.trim() }) });
                if (!r.isConfirmed) return;
                await ThaiDoc.download(Docs.memoSections(ThaiDoc, c, r.value), 'บันทึกข้อความรายงานผลกิจกรรมเกมเศรษฐี.docx', { title: 'บันทึกข้อความ' });
                U.toast('ดาวน์โหลดบันทึกข้อความแล้ว', { type: 'ok' });
            };
        },
    };

    /* ======================= ตั้งค่า ======================= */
    V.settings = {
        title: 'ตั้งค่าเกมและแม่แบบ', icon: 'fa-sliders',
        render(view) {
            const d = D();
            const st = d.settings;
            const s = d.school;
            const t = d.texts;
            const TX = [
                ['activity', 'ชื่อกิจกรรม', 1], ['objective', 'วัตถุประสงค์', 2], ['reportTitle', 'หัวรายงานสรุปผล', 1],
                ['memoSubject', 'บันทึกข้อความ: เรื่อง', 1], ['memoP1', 'บันทึกข้อความ: ย่อหน้า 1', 3], ['memoP2', 'บันทึกข้อความ: ย่อหน้า 2', 4], ['memoEnd', 'บันทึกข้อความ: ลงท้าย', 1],
                ['certTitle', 'เกียรติบัตร: หัวเรื่อง', 1], ['certGive', 'เกียรติบัตร: ข้อความมอบ', 1], ['certReason', 'เกียรติบัตร: ผลงาน', 2], ['certWish', 'เกียรติบัตร: คำอวยพร', 1], ['certSigner', 'เกียรติบัตร: ตำแหน่งผู้ลงนาม', 1],
            ];
            view.innerHTML = `${U.hero({ icon: 'fa-sliders', title: 'ตั้งค่าเกมและแม่แบบ', sub: 'ตั้งครั้งเดียวใช้ทุกเกมและทุกเอกสาร — บันทึกอัตโนมัติเมื่อแก้ไข' })}
                <div class="panel panel--purple"><div class="panel-head"><span class="ic-box sm"><i class="fas fa-school"></i></span><div><h3>ข้อมูลโรงเรียนและผู้ลงนาม</h3></div></div>
                    <div class="panel-body"><div class="field-row">
                        ${[['name', 'ชื่อโรงเรียน'], ['agency', 'ส่วนราชการ (บันทึกข้อความ)'], ['director', 'ชื่อผู้อำนวยการ'], ['teacher', 'ชื่อครูผู้จัดกิจกรรม'], ['teacherPosition', 'ตำแหน่งครู'], ['className', 'ชั้นเรียน'], ['semester', 'ภาคเรียน'], ['academicYear', 'ปีการศึกษา']]
                            .map(([k, l]) => `<div><label class="form-label" for="sc-${k}">${l}</label><input class="form-control" id="sc-${k}" data-school="${k}" value="${esc(s[k])}" ${k === 'semester' || k === 'academicYear' ? 'inputmode="numeric"' : ''}></div>`).join('')}
                    </div></div></div>
                <div class="panel panel--orange"><div class="panel-head"><span class="ic-box sm" style="--a:#d4a017;--b:#FF9F0A"><i class="fas fa-stairs"></i></span><div><h3>บันไดคะแนน ${st.ladder.length} ขั้น</h3><small>ติ๊กเพื่อกำหนดจุดปลอดภัย • ชุดคำถามที่มีข้อน้อยกว่าจะใช้ขั้นบนสุดเท่าจำนวนข้อ</small></div>
                    <div class="panel-tools"><select class="form-select form-select-sm" id="lad-n" aria-label="จำนวนขั้น">${[10, 11, 12, 13, 14, 15].map((n) => `<option value="${n}" ${n === st.ladder.length ? 'selected' : ''}>${n} ขั้น</option>`).join('')}</select><button type="button" class="btn-x ghost sm" id="lad-reset"><i class="fas fa-rotate-left"></i>ค่าเริ่มต้น</button></div></div>
                    <div class="panel-body"><div class="ladder-edit">${st.ladder.map((v, i) => `<div class="le${st.safe.includes(i + 1) ? ' safe' : ''}"><span>ขั้น ${i + 1}</span><input class="form-control" inputmode="numeric" data-lad="${i}" value="${fmt(v)}">
                        ${i < st.ladder.length - 1 ? `<label><input type="checkbox" class="form-check-input" data-safe="${i + 1}" ${st.safe.includes(i + 1) ? 'checked' : ''}> ปลอดภัย</label>` : '<label><i class="fas fa-crown"></i> สูงสุด</label>'}</div>`).join('')}</div>
                        <div class="field-row mt-3"><div><label class="form-label" for="g-unit">หน่วยคะแนน</label><input class="form-control" id="g-unit" list="dl-unit" value="${esc(st.unit)}"><datalist id="dl-unit"><option value="คะแนน"><option value="ดาว"><option value="เหรียญ"></datalist></div>
                        ${['ง่าย', 'ปานกลาง', 'ยาก'].map((l, i) => `<div><label class="form-label" for="g-t${i}">เวลาข้อ${l} (วินาที, 0 = ไม่จับเวลา)</label><input class="form-control" type="number" min="0" max="600" id="g-t${i}" data-time="${i}" value="${st.time[i]}"></div>`).join('')}
                        <div><label class="form-label" for="g-sus">ลุ้นก่อนเฉลย (วินาที)</label><input class="form-control" type="number" min="0" max="10" step="0.5" id="g-sus" value="${st.suspense}"></div></div></div></div>
                <div class="panel panel--teal"><div class="panel-head"><span class="ic-box sm" style="--a:#00C7BE;--b:#0A84FF"><i class="fas fa-life-ring"></i></span><div><h3>ตัวช่วยและเสียง</h3></div></div>
                    <div class="panel-body"><div class="life-grid">${Object.keys(Core.LIFELINES).map((k) => `<label class="form-check"><input type="checkbox" class="form-check-input" data-life="${k}" ${st.lifelines[k] ? 'checked' : ''}> <i class="fas ${Core.LIFELINES[k].icon}"></i> ${Core.LIFELINES[k].label}</label>`).join('')}
                        <label class="form-check"><input type="checkbox" class="form-check-input" id="g-sound" ${st.sound ? 'checked' : ''}> <i class="fas fa-volume-high"></i> เปิดเสียงประกอบ</label></div>
                        <div class="field-row mt-2"><div><label class="form-label" for="g-ask">ตัวช่วยถามเพื่อน: ปุ่มที่เน้น</label><select class="form-select" id="g-ask"><option value="count" ${st.askMode === 'count' ? 'selected' : ''}>ครูนับมือแล้วกรอกจำนวน</option><option value="sim" ${st.askMode === 'sim' ? 'selected' : ''}>จำลองผลโหวต</option></select></div>
                        <div><label class="form-label" for="g-vol">ความดังเสียง</label><input type="range" class="form-range" min="0" max="1" step="0.1" id="g-vol" value="${st.volume}"></div>
                        <div class="d-flex align-items-end"><button type="button" class="btn-x ghost" id="g-test"><i class="fas fa-music"></i>ทดลองฟังเสียง</button></div></div></div></div>
                <div class="panel panel--pink"><div class="panel-head"><span class="ic-box sm" style="--a:#FF375F;--b:#BF5AF2"><i class="fas fa-pen-nib"></i></span><div><h3>แม่แบบข้อความในเอกสาร</h3><small>ใช้ช่องแทนค่าได้: {กิจกรรม} {วัตถุประสงค์} {โรงเรียน} {ชั้นเรียน} {ภาคเรียน} {ปีการศึกษา} {ช่วงวันที่} {จำนวนครั้ง} {ชุดคำถาม} {ผู้ชนะ} {วิชา} {คะแนน} {หน่วย}</small></div>
                    <div class="panel-tools"><button type="button" class="btn-x ghost sm" id="tx-reset"><i class="fas fa-rotate-left"></i>คืนค่าข้อความเริ่มต้น</button></div></div>
                    <div class="panel-body tx-grid">${TX.map(([k, l, rows]) => `<div><label class="form-label" for="tx-${k}">${l}</label>${rows > 1 ? `<textarea class="form-control" id="tx-${k}" data-text="${k}" rows="${rows}">${esc(t[k])}</textarea>` : `<input class="form-control" id="tx-${k}" data-text="${k}" value="${esc(t[k])}">`}</div>`).join('')}</div></div>
                <div class="note warn"><i class="fas fa-scale-balanced"></i><div>ถ้อยคำในบันทึกข้อความ/เกียรติบัตรเป็นแบบที่โรงเรียนใช้ทั่วไป <b>ควรให้งานสารบรรณ/ฝ่ายบริหารตรวจเทียบแบบฟอร์มฉบับปัจจุบันของโรงเรียน</b> แล้วแก้ไขในช่องด้านบนได้ทุกข้อความ</div></div>`;
            const save = U.debounce(() => { Store.commit('settings'); U.toast('บันทึกการตั้งค่าแล้ว', { type: 'ok', ms: 1200 }); }, 400);
            view.querySelectorAll('[data-school]').forEach((el) => { el.oninput = () => { s[el.dataset.school] = U.norm(el.value); save(); }; });
            view.querySelectorAll('[data-text]').forEach((el) => { el.oninput = () => { t[el.dataset.text] = el.value.trim(); save(); }; });
            view.querySelectorAll('[data-lad]').forEach((el) => { el.onchange = () => { const v = Math.round(Number(String(el.value).replace(/,/g, ''))); if (v > 0) st.ladder[Number(el.dataset.lad)] = v; el.value = fmt(st.ladder[Number(el.dataset.lad)]); save(); }; });
            view.querySelectorAll('[data-safe]').forEach((el) => { el.onchange = () => { const n = Number(el.dataset.safe); st.safe = el.checked ? [...new Set([...st.safe, n])].sort((a, b) => a - b) : st.safe.filter((x) => x !== n); el.closest('.le').classList.toggle('safe', el.checked); save(); }; });
            view.querySelector('#lad-n').onchange = (e) => {
                const n = Number(e.target.value); const def = Core.defaultSettings().ladder;
                st.ladder = st.ladder.length >= n ? st.ladder.slice(st.ladder.length - n) : [...def.slice(0, n - st.ladder.length), ...st.ladder].slice(-n);
                st.safe = n >= 15 ? [5, 10] : n >= 12 ? [Math.round(n / 3), Math.round(n * 2 / 3)] : [Math.round(n / 2)];
                Store.commit('settings'); this.render(view);
            };
            view.querySelector('#lad-reset').onclick = () => { const def = Core.defaultSettings(); st.ladder = def.ladder; st.safe = def.safe; Store.commit('settings'); this.render(view); };
            view.querySelectorAll('[data-time]').forEach((el) => { el.onchange = () => { st.time[Number(el.dataset.time)] = Math.max(0, Math.min(600, Math.round(Number(el.value) || 0))); save(); }; });
            view.querySelector('#g-unit').onchange = (e) => { st.unit = U.norm(e.target.value) || 'คะแนน'; save(); };
            view.querySelector('#g-sus').onchange = (e) => { st.suspense = Math.max(0, Math.min(10, Number(e.target.value) || 0)); save(); };
            view.querySelectorAll('[data-life]').forEach((el) => { el.onchange = () => { st.lifelines[el.dataset.life] = el.checked; save(); }; });
            view.querySelector('#g-sound').onchange = (e) => { st.sound = e.target.checked; Sound.set({ enabled: st.sound }); save(); };
            view.querySelector('#g-ask').onchange = (e) => { st.askMode = e.target.value; save(); };
            view.querySelector('#g-vol').oninput = (e) => { st.volume = Number(e.target.value); Sound.set({ volume: st.volume }); save(); };
            view.querySelector('#g-test').onclick = () => { ['show', 'lock', 'correct', 'wrong', 'fanfare'].forEach((n, i) => setTimeout(() => Sound.play(n), i * 1300)); };
            view.querySelector('#tx-reset').onclick = async () => { if (!(await U.confirm('คืนค่าข้อความเริ่มต้น?', 'ข้อความแม่แบบทั้งหมดที่แก้ไว้จะกลับเป็นค่าเริ่มต้น', { confirmText: 'คืนค่า', danger: true }))) return; d.texts = Core.defaultTexts(); Store.commit('settings'); this.render(view); };
        },
    };

    /* ======================= สำรองข้อมูล ======================= */
    V.backup = {
        title: 'สำรอง / เปิดไฟล์ข้อมูล', icon: 'fa-shield-halved',
        render(view) {
            const m = Store.meta;
            view.innerHTML = `${U.hero({ icon: 'fa-shield-halved', title: 'สำรอง / เปิดไฟล์ข้อมูล', cls: 'hero--backup', sub: 'ข้อมูลทั้งหมดอยู่ในเบราว์เซอร์เครื่องนี้ — บันทึกเป็นไฟล์ .json ไว้เสมอ' })}
                <div class="doc-cards">
                    <div class="doc-card"><span class="ic-box lg" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-download"></i></span><b>บันทึกไฟล์ข้อมูล (.json)</b><small>${m.lastBackupAt ? `ล่าสุด ${esc(U.thDate(m.lastBackupAt, true))} • ${esc(m.lastBackupName)}` : 'ยังไม่เคยบันทึก'}</small><button type="button" class="btn-x green" id="b-save"><i class="fas fa-download"></i>บันทึกไฟล์</button></div>
                    <div class="doc-card"><span class="ic-box lg" style="--a:#0A84FF;--b:#5E5CE6"><i class="fas fa-folder-open"></i></span><b>เปิดไฟล์ข้อมูล</b><small>ย้ายเครื่อง / กู้ข้อมูลจากไฟล์ที่บันทึกไว้</small><button type="button" class="btn-x primary" id="b-open" data-demo-lock="เปิดไฟล์ข้อมูล (.json)"><i class="fas fa-folder-open"></i>เปิดไฟล์</button></div>
                    <div class="doc-card"><span class="ic-box lg" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-clock-rotate-left"></i></span><b>กู้คืนข้อมูลชุดก่อนหน้า</b><small>ก่อนเปิดไฟล์/โหลดตัวอย่าง/ล้างข้อมูลครั้งล่าสุด</small><button type="button" class="btn-x orange" id="b-prev" data-demo-lock="กู้คืนข้อมูล" ${Store.hasPrevious() ? '' : 'disabled'}><i class="fas fa-clock-rotate-left"></i>กู้คืน</button></div>
                    <div class="doc-card"><span class="ic-box lg" style="--a:#FF375F;--b:#BF5AF2"><i class="fas fa-eraser"></i></span><b>ล้างข้อมูลทั้งหมด</b><small>เริ่มใช้จริง (ลบข้อมูลตัวอย่าง) — ควรบันทึกไฟล์ก่อน</small><button type="button" class="btn-x danger" id="b-clear" data-demo-lock="ล้างข้อมูลทั้งหมด"><i class="fas fa-eraser"></i>ล้างข้อมูล</button></div>
                    <div class="doc-card"><span class="ic-box lg" style="--a:#5E5CE6;--b:#BF5AF2"><i class="fas fa-flask"></i></span><b>โหลดข้อมูลตัวอย่าง</b><small>ชุดคำถาม 5 วิชา ผู้เล่นสมมติ และประวัติผล</small><button type="button" class="btn-x ghost" id="b-demo"><i class="fas fa-flask"></i>โหลดตัวอย่าง</button></div>
                </div>`;
            view.querySelector('#b-save').onclick = async () => { await App.backupNow(); this.render(view); };
            view.querySelector('#b-open').onclick = App.openFile;
            view.querySelector('#b-prev').onclick = async () => { if (!VSDemo.allow('กู้คืนข้อมูล')) return; if (!(await U.confirm('กู้คืนข้อมูลชุดก่อนหน้า?', 'ข้อมูลปัจจุบันจะสลับกับชุดก่อนหน้า', { confirmText: 'กู้คืน' }))) return; Store.restorePrevious(); U.toast('กู้คืนแล้ว', { type: 'ok' }); };
            view.querySelector('#b-clear').onclick = async () => {
                if (!VSDemo.allow('ล้างข้อมูลทั้งหมด')) return;
                const r = await Swal.fire({ title: 'ล้างข้อมูลทั้งหมด?', html: 'ชุดคำถาม ผู้เล่น ประวัติผล และทะเบียนเกียรติบัตรจะถูกลบ<br>พิมพ์คำว่า <b>ล้างข้อมูล</b> เพื่อยืนยัน', icon: 'warning', input: 'text', showCancelButton: true, confirmButtonText: 'ล้างข้อมูล', cancelButtonText: 'ยกเลิก', buttonsStyling: false, customClass: { confirmButton: 'btn-x danger lg', cancelButton: 'btn-x ghost lg' }, preConfirm: (v) => (v.trim() === 'ล้างข้อมูล' ? true : (Swal.showValidationMessage('พิมพ์ "ล้างข้อมูล" ให้ถูกต้อง'), false)) });
                if (!r.isConfirmed) return;
                const keep = { school: D().school, settings: D().settings, texts: D().texts };
                Store.replaceAll(Object.assign(Store.newData(), keep), 'replace');
                U.toast('ล้างข้อมูลแล้ว (เก็บข้อมูลโรงเรียนและการตั้งค่าไว้) — กู้คืนได้ด้วยปุ่ม "กู้คืน"', { type: 'ok', ms: 5000 });
            };
            view.querySelector('#b-demo').onclick = async () => { if (!Store.isEmpty() && !(await U.confirm('โหลดข้อมูลตัวอย่าง?', 'ข้อมูลปัจจุบันจะถูกแทนที่ (กู้คืนได้ด้วยปุ่ม "กู้คืน")', { confirmText: 'โหลดตัวอย่าง' }))) return; App.loadDemo(); };
        },
    };
})();
