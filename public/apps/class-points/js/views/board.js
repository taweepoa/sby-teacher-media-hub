/* จอหน้าห้อง: แตะนักเรียน/กลุ่ม/ทั้งห้อง เพื่อให้แต้ม · สุ่มนักเรียน · จับกลุ่ม */
(function () {
    'use strict';
    const st = { mode: 'students', multi: false, sel: new Set() };
    let root = null;

    function cardsHTML(c) {
        const list = Core.classStudents(Store.data, c.id);
        if (!list.length) return `<div class="empty-state"><i class="fas fa-user-plus"></i><h4>ห้องนี้ยังไม่มีนักเรียน</h4><p>เพิ่มหรือวางรายชื่อจาก Excel ได้ที่เมนู "ห้องเรียน / นักเรียน"</p><a class="btn-x primary" href="#/classes"><i class="fas fa-user-plus"></i>เพิ่มนักเรียน</a></div>`;
        const bal = Core.balances(Store.data);
        const wk = Core.weekRange();
        return `<div class="stu-grid">
            <button type="button" class="stu-card whole" data-whole><span class="ava-wrap"><i class="fas fa-users"></i></span><b>ทั้งห้อง</b><small>${list.length} คน</small></button>
            ${list.map((s) => {
                const w = Core.stats(Store.data, s.id, wk).net;
                return `<button type="button" class="stu-card${st.sel.has(s.id) ? ' sel' : ''}" data-sid="${s.id}">
                    <span class="no">${U.esc(s.no)}</span>${st.sel.has(s.id) ? '<span class="tick"><i class="fas fa-check"></i></span>' : ''}
                    <span class="ava-wrap">${UI.ava(s, 72)}</span><b>${U.esc(Core.showName(s))}</b>
                    <span class="bal ${bal.get(s.id) < 0 ? 'neg' : ''}">${bal.get(s.id).toLocaleString()}</span>
                    <small>สัปดาห์นี้ ${w > 0 ? '+' : ''}${w}</small></button>`;
            }).join('')}</div>`;
    }

    function groupsHTML(c) {
        if (!c.groups.length) return `<div class="empty-state"><i class="fas fa-people-group"></i><h4>ยังไม่ได้จับกลุ่ม</h4><p>กดปุ่ม "จับกลุ่ม" เพื่อสุ่มแบ่งกลุ่มนักเรียนในห้องนี้</p><button type="button" class="btn-x primary" data-act="groups"><i class="fas fa-shuffle"></i>จับกลุ่ม</button></div>`;
        const wk = Core.weekRange();
        const scores = c.groups.map((g) => g.members.reduce((a, sid) => a + Core.stats(Store.data, sid, wk).net, 0));
        const best = Math.max(...scores);
        return `<div class="grp-grid">${c.groups.map((g, i) => `
            <div class="grp-card${scores[i] === best && best > 0 ? ' lead' : ''}" data-gid="${g.id}">
                <div class="grp-head"><span class="ic-box sm" style="--a:${Core.COLORS[i % 12]};--b:var(--ac-2)"><i class="fas fa-flag"></i></span><div><b>${U.esc(g.name || `กลุ่ม ${i + 1}`)}</b><small>${g.members.length} คน • สัปดาห์นี้ ${scores[i] > 0 ? '+' : ''}${scores[i]} แต้ม</small></div>${scores[i] === best && best > 0 ? '<span class="tag warn"><i class="fas fa-crown"></i>นำ</span>' : ''}</div>
                <div class="grp-mem">${g.members.map((sid) => { const s = Store.student(sid); return s ? `<span class="mini" data-sid="${sid}" title="${U.esc(Core.fullName(s))}">${UI.ava(s, 40)}<small>${U.esc(Core.showName(s))}</small></span>` : ''; }).join('')}</div>
                <button type="button" class="btn-x primary sm w-100" data-group-award="${g.id}"><i class="fas fa-star"></i>ให้แต้มทั้งกลุ่ม</button>
            </div>`).join('')}</div>`;
    }

    function render(el) {
        root = el;
        const c = Store.current();
        if (!c) { el.innerHTML = UI.noClass(); return; }
        const wk = Core.weekRange();
        const list = Core.classStudents(Store.data, c.id);
        const classWeek = list.reduce((a, s) => a + Core.stats(Store.data, s.id, wk).net, 0);
        el.innerHTML = `
            <div class="board-bar">
                ${UI.classSeg()}
                <span class="board-total"><i class="fas fa-star"></i>ห้อง ${U.esc(c.name)} สัปดาห์นี้ <b>${classWeek > 0 ? '+' : ''}${classWeek.toLocaleString()}</b> แต้ม</span>
                <div class="board-tools">
                    <div class="seg" id="bd-mode"><button type="button" data-mode="students" class="${st.mode === 'students' ? 'active' : ''}"><i class="fas fa-user"></i>รายคน</button><button type="button" data-mode="groups" class="${st.mode === 'groups' ? 'active' : ''}"><i class="fas fa-people-group"></i>กลุ่ม</button></div>
                    <button type="button" class="btn-x ${st.multi ? 'orange' : 'ghost'} sm" data-act="multi"><i class="fas fa-check-double"></i>${st.multi ? `เลือกแล้ว ${st.sel.size} คน` : 'เลือกหลายคน'}</button>
                    <button type="button" class="btn-x soft sm" data-act="random"><i class="fas fa-dice"></i>สุ่มนักเรียน</button>
                    <button type="button" class="btn-x soft sm" data-act="groups"><i class="fas fa-shuffle"></i>จับกลุ่ม</button>
                    <button type="button" class="btn-x ghost sm" data-act="sound" title="เปิด/ปิดเสียง"><i class="fas ${Store.data.settings.sound ? 'fa-volume-high' : 'fa-volume-xmark'}"></i></button>
                    <button type="button" class="btn-x ghost sm tb-hide-sm" data-act="full" title="เต็มจอ (เหมาะกับจอหน้าห้อง/โปรเจกเตอร์)"><i class="fas fa-expand"></i>เต็มจอ</button>
                </div>
            </div>
            ${st.multi ? `<div class="note info multi-bar"><i class="fas fa-hand-pointer"></i><div>แตะนักเรียนเพื่อเลือก แล้วกด <b>ให้แต้มคนที่เลือก</b></div>
                <button type="button" class="btn-x primary sm" data-act="give-sel" ${st.sel.size ? '' : 'disabled'}><i class="fas fa-star"></i>ให้แต้มคนที่เลือก (${st.sel.size})</button>
                <button type="button" class="btn-x ghost sm" data-act="sel-all">เลือกทั้งห้อง</button><button type="button" class="btn-x ghost sm" data-act="sel-none" data-demo-allow>ล้างที่เลือก</button></div>` : ''}
            <div id="bd-body">${st.mode === 'groups' ? groupsHTML(c) : cardsHTML(c)}</div>`;
        bind(el, c);
    }

    function bind(el, c) {
        UI.bindClassSeg(el, () => { st.sel.clear(); App.render(); });
        el.querySelectorAll('#bd-mode [data-mode]').forEach((b) => { b.onclick = () => { st.mode = b.dataset.mode; render(root); }; });
        const ids = () => Core.classStudents(Store.data, c.id).map((s) => s.id);
        const cardOf = (sid) => root.querySelector(`.stu-card[data-sid="${sid}"]`) || root.querySelector(`.mini[data-sid="${sid}"]`);
        el.querySelectorAll('.stu-card[data-sid]').forEach((b) => {
            b.onclick = () => {
                const sid = b.dataset.sid;
                if (st.multi) { if (st.sel.has(sid)) st.sel.delete(sid); else st.sel.add(sid); render(root); return; }
                const s = Store.student(sid);
                UI.awardDialog([sid], `${Core.showName(s)} — ${Core.fullName(s)}`, () => [cardOf(sid)]);
            };
        });
        const whole = el.querySelector('[data-whole]');
        if (whole) whole.onclick = () => UI.awardDialog(ids(), `ทั้งห้อง ${c.name}`, () => ids().map(cardOf).filter(Boolean).slice(0, 40));
        el.querySelectorAll('[data-group-award]').forEach((b) => {
            b.onclick = () => {
                const g = c.groups.find((x) => x.id === b.dataset.groupAward);
                UI.awardDialog(g.members.slice(), g.name || 'กลุ่ม', () => g.members.map(cardOf).filter(Boolean));
            };
        });
        el.querySelectorAll('.mini[data-sid]').forEach((m) => {
            m.onclick = () => { const s = Store.student(m.dataset.sid); UI.awardDialog([s.id], `${Core.showName(s)} — ${Core.fullName(s)}`, () => [cardOf(s.id)]); };
        });
        const act = (name, fn) => el.querySelectorAll(`[data-act="${name}"]`).forEach((b) => { b.onclick = fn; });
        act('multi', () => { st.multi = !st.multi; st.sel.clear(); st.mode = 'students'; render(root); });
        act('sel-all', () => { ids().forEach((id) => st.sel.add(id)); render(root); });
        act('sel-none', () => { st.sel.clear(); render(root); });
        act('give-sel', () => { const list = [...st.sel]; UI.awardDialog(list, `นักเรียนที่เลือก ${list.length} คน`, () => list.map(cardOf).filter(Boolean)); });
        act('sound', () => { Store.data.settings.sound = !Store.data.settings.sound; Store.commit('settings'); render(root); if (Store.data.settings.sound) Sfx.coin(); });
        act('full', () => { const d = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (d.requestFullscreen) d.requestFullscreen().catch(() => {}); });
        act('random', () => randomPick(c));
        act('groups', () => makeGroups(c));
    }

    /* สุ่มนักเรียน: วนรายชื่อแล้วหยุดที่ 1 คน */
    async function randomPick(c) {
        const list = Core.classStudents(Store.data, c.id);
        if (!list.length) { U.toast('ห้องนี้ยังไม่มีนักเรียน', { type: 'warn' }); return; }
        let picked = null;
        const r = await UI.sheet({
            width: 520, confirmText: '<i class="fas fa-star"></i> ให้แต้มคนนี้', cancelText: 'ปิด', denyText: '<i class="fas fa-dice"></i> สุ่มใหม่', denyClass: 'orange',
            html: `<div class="sheet-head" style="--s1:var(--hero-1);--s2:var(--hero-2);--s3:var(--hero-3)"><span class="sh-ic"><i class="fas fa-dice"></i></span><div><h3>สุ่มนักเรียน</h3><p>ห้อง ${U.esc(c.name)} • ${list.length} คน</p></div></div>
                <div class="sheet-body"><div class="rand-stage" id="rand-stage"><span class="ava-wrap"></span><b></b><small></small></div></div>`,
            didOpen: (el) => {
                Swal.getConfirmButton().disabled = true; Swal.getDenyButton().disabled = true;
                spin(el, list, (s) => { picked = s; Swal.getConfirmButton().disabled = false; Swal.getDenyButton().disabled = false; });
            },
            preDeny: () => { const el = Swal.getHtmlContainer(); Swal.getConfirmButton().disabled = true; Swal.getDenyButton().disabled = true; spin(el, list, (s) => { picked = s; Swal.getConfirmButton().disabled = false; Swal.getDenyButton().disabled = false; }); return false; },
        });
        if (r.isConfirmed && picked) UI.awardDialog([picked.id], `${Core.showName(picked)} — ${Core.fullName(picked)}`, () => [root.querySelector(`.stu-card[data-sid="${picked.id}"]`)]);
    }
    function spin(el, list, done) {
        const stage = el.querySelector('#rand-stage');
        stage.classList.remove('win');
        const target = list[Math.floor(Math.random() * list.length)];
        let i = 0, delay = 45;
        const show = (s) => { stage.querySelector('.ava-wrap').innerHTML = UI.ava(s, 120); stage.querySelector('b').textContent = Core.showName(s); stage.querySelector('small').textContent = `เลขที่ ${s.no} ${Core.fullName(s)}`; };
        const step = () => {
            i += 1;
            if (delay > 260) { show(target); stage.classList.add('win'); Sfx.fanfare(); done(target); return; }
            show(list[Math.floor(Math.random() * list.length)]); Sfx.tick();
            delay *= 1.12;
            setTimeout(step, delay);
        };
        step();
    }

    /* จับกลุ่มแบบสุ่ม */
    async function makeGroups(c) {
        const ids = Core.classStudents(Store.data, c.id).map((s) => s.id);
        if (ids.length < 2) { U.toast('ต้องมีนักเรียนอย่างน้อย 2 คน', { type: 'warn' }); return; }
        let groups = [];
        const names = ['กลุ่มดาวเรือง', 'กลุ่มทานตะวัน', 'กลุ่มกุหลาบ', 'กลุ่มมะลิ', 'กลุ่มชบา', 'กลุ่มพุดซ้อน', 'กลุ่มลีลาวดี', 'กลุ่มบัวหลวง', 'กลุ่มราชพฤกษ์', 'กลุ่มกล้วยไม้', 'กลุ่มเฟื่องฟ้า', 'กลุ่มอัญชัน'];
        const preview = (el) => {
            const n = Math.max(2, Math.min(12, U.toInt(el.querySelector('#gp-n').value, 5)));
            groups = Core.makeGroups(ids, n);
            el.querySelector('#gp-prev').innerHTML = groups.map((g, i) => `<div class="gp-item"><b>${names[i]}</b> (${g.length} คน)<div>${g.map((sid) => U.esc(Core.showName(Store.student(sid)))).join(', ')}</div></div>`).join('');
        };
        const r = await UI.sheet({
            width: 680, confirmText: '<i class="fas fa-save"></i> ใช้กลุ่มนี้',
            html: `<div class="sheet-head" style="--s1:var(--hero-1);--s2:var(--hero-2);--s3:var(--hero-3)"><span class="sh-ic"><i class="fas fa-shuffle"></i></span><div><h3>จับกลุ่มแบบสุ่ม</h3><p>ห้อง ${U.esc(c.name)} • ${ids.length} คน</p></div></div>
                <div class="sheet-body">
                    <div class="d-flex gap-2 align-items-end flex-wrap"><div><label class="form-label">จำนวนกลุ่ม</label><input id="gp-n" type="number" inputmode="numeric" min="2" max="12" class="form-control" value="${c.groups.length || 5}" style="width:120px"></div>
                    <button type="button" class="btn-x orange" id="gp-re"><i class="fas fa-dice"></i>สุ่มใหม่</button></div>
                    ${c.groups.length ? '<div class="note warn mt-2"><i class="fas fa-triangle-exclamation"></i><div>กลุ่มเดิมของห้องนี้จะถูกแทนที่ (แต้มของนักเรียนไม่หาย)</div></div>' : ''}
                    <div id="gp-prev" class="gp-prev"></div></div>`,
            didOpen: (el) => { preview(el); el.querySelector('#gp-re').onclick = () => { preview(el); Sfx.tick(); }; el.querySelector('#gp-n').oninput = () => preview(el); },
        });
        if (!r.isConfirmed) return;
        c.groups = groups.map((m, i) => ({ id: U.uid('g'), name: names[i], members: m }));
        Store.commit('groups');
        st.mode = 'groups';
        Sfx.coin();
        U.toast(`จับกลุ่มแล้ว ${groups.length} กลุ่ม`, { type: 'ok' });
        App.render();
    }

    window.Views.board = { render, refresh() { if (root) render(root); } };
})();
