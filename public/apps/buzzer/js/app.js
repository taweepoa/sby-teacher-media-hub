/* =====================================================================
   ระบบกดปุ่มตอบเร็ว (Buzzer) — หน้าจอหลัก: router, หน้าต่างต้อนรับ, ทีม, คลังคำถาม,
   ผลการแข่งขัน, รายงาน .docx, ตั้งค่า (หน้าแข่งขันอยู่ใน js/game.js)
   ===================================================================== */
(function () {
    'use strict';
    const $ = (s, r) => (r || document).querySelector(s);
    const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
    const esc = U.esc;
    const D = () => Store.data;

    const ROUTES = {
        home: { title: 'หน้าหลัก', icon: 'fa-house' },
        play: { title: 'เริ่มแข่งขัน', icon: 'fa-bolt' },
        teams: { title: 'ทีมและปุ่มกด', icon: 'fa-people-group' },
        questions: { title: 'คลังคำถาม', icon: 'fa-circle-question' },
        results: { title: 'ผลการแข่งขัน', icon: 'fa-trophy' },
        reports: { title: 'รายงาน (แบบราชการ)', icon: 'fa-file-word' },
        settings: { title: 'ตั้งค่าและแม่แบบ', icon: 'fa-sliders' },
    };

    const App = {
        route: 'home',
        params: {},
        go(r, q) { location.hash = `#/${r}${q ? `?${q}` : ''}`; },
        parse() {
            const h = location.hash.replace(/^#\/?/, '');
            const [r, qs] = h.split('?');
            this.route = ROUTES[r] ? r : 'home';
            this.params = Object.fromEntries(new URLSearchParams(qs || ''));
        },
        render() {
            App.parse();
            const r = ROUTES[App.route];
            $$('.sb-link[data-r]').forEach((a) => a.classList.toggle('active', a.dataset.r === App.route));
            $('#tb-title').innerHTML = `<i class="fas ${r.icon}"></i><span>${r.title}</span>`;
            document.body.classList.toggle('on-play', App.route === 'play');
            const view = $('#view');
            if (App.route !== 'play' && window.Game) Game.leave();
            Views[App.route](view);
            document.body.classList.remove('sb-open');
            renderSide();
        },
        refresh() { if (App.route !== 'play') Views[App.route]($('#view')); renderSide(); },
        loadDemo() {
            Store.replace(Demo.build());
            Store.setMeta({ dismissedWelcome: true, dirty: true });
            if (window.Game) Game.reset();
            App.go('home'); App.render();
            U.toast('โหลดข้อมูลตัวอย่างแล้ว — ลองกด "เริ่มแข่งขัน" แล้วกดปุ่ม A / L / Q / P แทนทีม', { type: 'ok', ms: 4500 });
        },
        backupNow() { Store.exportJson(); U.toast('บันทึกไฟล์ข้อมูล (.json) แล้ว', { type: 'ok' }); },
        openFile() {
            if (!VSDemo.allow('เปิดไฟล์ข้อมูล (.json)')) return;
            const inp = document.createElement('input');
            inp.type = 'file'; inp.accept = '.json,application/json';
            inp.onchange = () => {
                const f = inp.files[0]; if (!f) return;
                const rd = new FileReader();
                rd.onload = async () => {
                    try {
                        const d = Store.parseJson(rd.result);
                        const ok = await U.confirm('เปิดไฟล์ข้อมูลนี้?', `ทีม ${d.teams.length} ทีม · คำถาม ${d.questions.length} ข้อ · ผลการแข่ง ${d.matches.length} รายการ<br>ข้อมูลปัจจุบันในเครื่องจะถูกแทนที่`, { confirmText: 'เปิดไฟล์' });
                        if (!ok) return;
                        Store.replace(d); Store.setMeta({ dirty: false, dismissedWelcome: true });
                        if (window.Game) Game.reset();
                        App.render(); U.toast('เปิดไฟล์ข้อมูลแล้ว', { type: 'ok' });
                    } catch (e) { U.alert('เปิดไฟล์ไม่ได้', esc(e.message), 'error'); }
                };
                rd.readAsText(f);
            };
            inp.click();
        },
        async resetAll() {
            if (!VSDemo.allow('ล้างข้อมูลทั้งหมด')) return;
            const ok = await U.confirm('ล้างข้อมูลทั้งหมด?', 'ทีม คลังคำถาม ผลการแข่งขัน และการตั้งค่าจะถูกลบออกจากเครื่องนี้<br><b>แนะนำให้บันทึกไฟล์ข้อมูล (.json) ก่อน</b>', { confirmText: 'ล้างข้อมูล', danger: true });
            if (!ok) return;
            Store.reset(); if (window.Game) Game.reset();
            App.go('settings'); App.render(); U.toast('ล้างข้อมูลแล้ว', { type: 'ok' });
        },
        teamById(id, m) { return ((m && m.teams) || D().teams).find((t) => t.id === id); },
    };

    /* ---------- แถบด้านข้าง/บน ---------- */
    function renderSide() {
        const d = D();
        $('#sb-school').textContent = d.school.name || 'แข่งตอบคำถามหน้าชั้นเรียน';
        $('#bd-teams').textContent = d.teams.length;
        $('#bd-q').textContent = d.questions.length;
        $('#bd-m').textContent = d.matches.filter((m) => m.status === 'done').length;
        const m = Store.meta;
        const box = $('#sb-backup');
        if (m.backupAt && !m.dirty) box.innerHTML = `<b><i class="fas fa-shield-halved"></i>สำรองข้อมูลแล้ว</b><div>ล่าสุด: ${esc(U.thDate(m.backupAt, true))}</div>`;
        else box.innerHTML = `<b style="color:#fde68a"><i class="fas fa-triangle-exclamation"></i>ยังไม่ได้สำรองข้อมูล</b><div>กด "บันทึกไฟล์ข้อมูล" เก็บไว้</div>`;
        $('#tb-saved span').textContent = m.dirty ? 'บันทึกในเครื่องแล้ว' : 'สำรองแล้ว';
    }

    const opt = (list, cur) => list.map((x) => `<option value="${esc(x)}"${x === cur ? ' selected' : ''}>${esc(x)}</option>`).join('');
    const dl = (id, list) => `<datalist id="${id}">${list.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>`;
    const empty = (icon, title, text, btn) => `<div class="empty-state"><span class="ic-box lg"><i class="fas ${icon}"></i></span><h3>${title}</h3><p>${text}</p>${btn || ''}</div>`;

    /* ================================================================ */
    const Views = {};

    /* ---------- หน้าหลัก ---------- */
    Views.home = (el) => {
        const d = D();
        const done = d.matches.filter((m) => m.status === 'done').sort((a, b) => String(b.date).localeCompare(String(a.date)));
        const last = done[0];
        const live = d.matches.find((m) => m.status === 'live');
        const podium = last ? Core.ranking(last).slice(0, 3) : [];
        el.innerHTML = `
        <section class="hero">
            <div class="hero-main"><span class="hero-icon"><i class="fas fa-bolt"></i></span>
                <div><h2 class="hero-title">กดปุ่มตอบเร็ว — ${esc(d.school.name || 'แข่งตอบคำถามหน้าชั้นเรียน')}</h2>
                <p class="hero-sub">ใช้คีย์บอร์ดหรือจอสัมผัสแทนเครื่องกดปุ่ม ใครกดก่อนล็อกทันที จับเวลาเป็นมิลลิวินาที</p></div></div>
            <div class="hero-side">
                <span class="hero-stat"><i class="fas fa-people-group"></i>ทีม <b>${d.teams.length}</b></span>
                <a class="btn-x cta lg" href="#/play"><i class="fas fa-play"></i>${live ? 'แข่งต่อ' : 'เริ่มแข่งขัน'}</a>
            </div>
        </section>
        <div class="dash-grid">
            <a class="stat-card" style="--a:#FF375F;--b:#FF9F0A" href="#/teams"><span class="ic-box lg" style="--a:#FF375F;--b:#FF9F0A"><i class="fas fa-people-group"></i></span><div><b>${d.teams.length}</b><span>ทีม (2–8 ทีม)</span></div></a>
            <a class="stat-card" style="--a:#0A84FF;--b:#5E5CE6" href="#/questions"><span class="ic-box lg" style="--a:#0A84FF;--b:#5E5CE6"><i class="fas fa-circle-question"></i></span><div><b>${d.questions.length}</b><span>คำถามในคลัง</span></div></a>
            <a class="stat-card" style="--a:#30D158;--b:#00C7BE" href="#/results"><span class="ic-box lg" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-trophy"></i></span><div><b>${done.length}</b><span>การแข่งที่จบแล้ว</span></div></a>
            <a class="stat-card" style="--a:#BF5AF2;--b:#FF375F" href="#/reports"><span class="ic-box lg" style="--a:#BF5AF2;--b:#FF375F"><i class="fas fa-file-word"></i></span><div><b>4</b><span>แบบเอกสารราชการ</span></div></a>
        </div>
        <div class="home-grid">
            <div class="panel panel--pink">
                <div class="panel-head"><span class="ic-box sm"><i class="fas fa-ranking-star"></i></span><div><h3>ผลการแข่งล่าสุด</h3><small>${last ? `${esc(last.name)} · ${esc(Core.thDate(last.date))}` : 'ยังไม่มีการแข่ง'}</small></div>
                ${last ? `<div class="panel-tools"><a class="btn-x ghost sm" href="#/results?id=${last.id}"><i class="fas fa-eye"></i>ดูผล</a></div>` : ''}</div>
                <div class="panel-body">${last ? `<div class="podium">${[1, 0, 2].map((i) => podium[i] ? `<div class="pd pd-${i + 1}" style="--tc:${esc(podium[i].color)}"><span class="pd-name">${esc(podium[i].name)}</span><span class="pd-score">${podium[i].score}</span><div class="pd-bar"><b>${podium[i].rank}</b></div></div>` : '').join('')}</div>`
                    : empty('fa-trophy', 'ยังไม่มีผลการแข่งขัน', 'ตั้งทีมและเพิ่มคำถาม แล้วกด "เริ่มแข่งขัน"', '<a class="btn-x primary" href="#/play"><i class="fas fa-play"></i>เริ่มแข่งขัน</a>')}</div>
            </div>
            <div class="panel panel--purple">
                <div class="panel-head"><span class="ic-box sm"><i class="fas fa-keyboard"></i></span><div><h3>ปุ่มลัดสำหรับครู (หน้าแข่งขัน)</h3><small>กดบนคีย์บอร์ดได้เลย ไม่ต้องใช้เมาส์</small></div></div>
                <div class="panel-body"><div class="keys-help">
                    <div><kbd>Space</kbd>เปิดรับการกด</div><div><kbd>Enter</kbd>ตอบถูก (ให้คะแนน)</div><div><kbd>X</kbd>ตอบผิด ส่งสิทธิ์ทีมถัดไป</div>
                    <div><kbd>R</kbd>เปิดเฉลย</div><div><kbd>N</kbd>ข้อถัดไป</div><div><kbd>B</kbd>กระดานคะแนน</div><div><kbd>F</kbd>เต็มจอ</div><div><kbd>Esc</kbd>ปิดหน้าต่าง</div>
                </div>
                <div class="team-chips mt-3">${d.teams.map((t) => `<span class="team-chip" style="--tc:${esc(t.color)}"><kbd>${esc(Core.keyLabel(t.key))}</kbd>${esc(t.name)}</span>`).join('') || '<span class="text-muted-2">ยังไม่มีทีม</span>'}</div></div>
            </div>
        </div>`;
    };

    /* ---------- ทีมและปุ่ม ---------- */
    const RESERVED = ['Space', 'Enter', 'NumpadEnter', 'KeyX', 'KeyR', 'KeyN', 'KeyB', 'KeyF', 'Escape', 'Backspace', 'Tab'];
    Views.teams = (el) => {
        const d = D();
        el.innerHTML = `
        <section class="hero"><div class="hero-main"><span class="hero-icon"><i class="fas fa-people-group"></i></span>
            <div><h2 class="hero-title">ทีมและปุ่มกด</h2><p class="hero-sub">ตั้ง 2–8 ทีม เลือกสีและปุ่มคีย์บอร์ดของแต่ละทีม (บนจอสัมผัสใช้ปุ่มใหญ่บนหน้าแข่งขันได้เลย)</p></div></div>
            <div class="hero-side"><button class="btn-x cta" id="tm-add"${d.teams.length >= 8 ? ' disabled' : ''}><i class="fas fa-plus"></i>เพิ่มทีม</button></div></section>
        <div class="note"><i class="fas fa-circle-info"></i><div>กดปุ่ม <b>"ตั้งปุ่ม"</b> แล้วกดแป้นที่ต้องการบนคีย์บอร์ด · ห้ามใช้ปุ่มลัดของครู (Space, Enter, X, R, N, B, F) · แนะนำให้แยกปุ่มไว้คนละมุมคีย์บอร์ด เช่น A, L, Q, P หรือใช้คีย์บอร์ด USB หลายชุดต่อเครื่องเดียวกัน</div></div>
        <div class="team-grid">${d.teams.map((t, i) => `
            <div class="team-card" style="--tc:${esc(t.color)}" data-id="${t.id}">
                <div class="tc-top"><span class="tc-no">${i + 1}</span>
                    <input class="form-control tc-name" list="dl-team" value="${esc(t.name)}" data-f="name" aria-label="ชื่อทีม">
                    <button class="icon-btn del" title="ลบทีม" data-del="${t.id}"><i class="fas fa-trash"></i></button></div>
                <div class="tc-colors">${Core.TEAM_COLORS.map((c) => `<button class="sw${c === t.color ? ' on' : ''}" style="background:${c}" data-color="${c}" aria-label="สี"></button>`).join('')}<input type="color" value="${esc(t.color)}" data-f="color" title="เลือกสีเอง"></div>
                <div class="tc-key"><span class="key-cap" data-test="${t.id}">${esc(Core.keyLabel(t.key))}</span>
                    <button class="btn-x ghost sm" data-setkey="${t.id}"><i class="fas fa-keyboard"></i>ตั้งปุ่ม</button></div>
                <label class="form-label mt-2 mb-1">สมาชิกในทีม (ใช้ในประกาศผล)</label>
                <textarea class="form-control" rows="2" data-f="members" placeholder="เช่น ด.ช.ก ข, ด.ญ.ค ง">${esc(t.members)}</textarea>
            </div>`).join('')}
            ${d.teams.length < 2 ? `<div class="panel">${empty('fa-people-group', 'ต้องมีอย่างน้อย 2 ทีม', 'กด "เพิ่มทีม" หรือสร้างพร้อมกันหลายทีม', `<div class="d-flex gap-2 justify-content-center flex-wrap">${[2, 4, 6, 8].map((n) => `<button class="btn-x primary" data-quick="${n}"><i class="fas fa-wand-magic-sparkles"></i>สร้าง ${n} ทีม</button>`).join('')}</div>`)}</div>` : ''}
        </div>
        ${dl('dl-team', Core.PRESETS.teamName)}
        <div class="panel panel--orange mt-3"><div class="panel-head"><span class="ic-box sm"><i class="fas fa-vial"></i></span><div><h3>ทดสอบปุ่ม</h3><small>กดปุ่มของแต่ละทีม ป้ายจะกะพริบ — ใช้ตรวจว่าคีย์บอร์ดทุกชุดใช้ได้</small></div>
            <div class="panel-tools"><button class="btn-x ghost sm" id="tm-sound"><i class="fas fa-volume-high"></i>ทดสอบเสียง</button></div></div>
            <div class="panel-body"><div class="test-row">${d.teams.map((t) => `<div class="test-pad" style="--tc:${esc(t.color)}" data-pad="${t.id}"><b>${esc(Core.keyLabel(t.key))}</b><span>${esc(t.name)}</span></div>`).join('')}</div></div></div>`;

        const team = (id) => d.teams.find((t) => t.id === id);
        $('#tm-add').onclick = () => { addTeams(1); };
        $$('[data-quick]', el).forEach((b) => { b.onclick = () => addTeams(+b.dataset.quick - d.teams.length); });
        $$('.team-card', el).forEach((card) => {
            const t = team(card.dataset.id);
            $$('[data-f]', card).forEach((inp) => {
                inp.onchange = () => { t[inp.dataset.f] = inp.value.trim() || (inp.dataset.f === 'name' ? 'ทีม' : ''); Store.save(); if (inp.dataset.f === 'color') App.refresh(); };
            });
            $$('[data-color]', card).forEach((b) => { b.onclick = () => { t.color = b.dataset.color; Store.save(); App.refresh(); }; });
        });
        $$('[data-del]', el).forEach((b) => {
            b.onclick = async () => {
                const t = team(b.dataset.del);
                if (!(await U.confirm(`ลบ ${esc(t.name)}?`, 'ผลการแข่งที่บันทึกไว้แล้วยังอยู่ครบ', { confirmText: 'ลบทีม', danger: true }))) return;
                d.teams = d.teams.filter((x) => x !== t); Store.save(); App.refresh();
            };
        });
        $$('[data-setkey]', el).forEach((b) => { b.onclick = () => captureKey(team(b.dataset.setkey)); });
        $('#tm-sound').onclick = () => Sound.test();
    };
    function addTeams(n) {
        const d = D();
        for (let i = 0; i < n && d.teams.length < 8; i++) {
            const used = new Set(d.teams.map((t) => t.key));
            const usedC = new Set(d.teams.map((t) => t.color));
            const usedN = new Set(d.teams.map((t) => t.name));
            d.teams.push({
                id: U.uid('t'), name: Core.PRESETS.teamName.find((x) => !usedN.has(x)) || `ทีม ${d.teams.length + 1}`,
                color: Core.TEAM_COLORS.find((c) => !usedC.has(c)) || U.PALETTE[d.teams.length % U.PALETTE.length],
                key: Core.TEAM_KEYS.find((k) => !used.has(k)) || '', members: '',
            });
        }
        Store.save(); App.refresh();
    }
    function captureKey(t) {
        Swal.fire({
            html: `<div class="cap-box" style="--tc:${esc(t.color)}"><i class="fas fa-keyboard"></i><h3>กดแป้นสำหรับ ${esc(t.name)}</h3><p>กดแป้นใดก็ได้บนคีย์บอร์ด (ยกเว้นปุ่มลัดของครู)</p><div class="cap-msg" id="cap-msg"></div></div>`,
            showConfirmButton: false, showCancelButton: true, cancelButtonText: 'ยกเลิก', buttonsStyling: false, customClass: { popup: 'swal-x', cancelButton: 'btn-x ghost lg' },
            didOpen: () => {
                const h = (e) => {
                    if (e.code === 'Escape') return;
                    e.preventDefault();
                    if (RESERVED.includes(e.code)) { $('#cap-msg').textContent = `ปุ่ม ${e.code} เป็นปุ่มลัดของครู เลือกปุ่มอื่น`; return; }
                    const other = D().teams.find((x) => x.key === e.code && x !== t);
                    if (other) { $('#cap-msg').textContent = `ปุ่มนี้ใช้กับ ${other.name} แล้ว`; return; }
                    t.key = e.code; Store.save(); Swal.close(); App.refresh(); U.toast(`ตั้งปุ่ม ${Core.keyLabel(e.code)} ให้ ${t.name} แล้ว`, { type: 'ok' });
                };
                window.addEventListener('keydown', h, true);
                Swal.getPopup()._h = h;
            },
            willClose: () => window.removeEventListener('keydown', Swal.getPopup()._h, true),
        });
    }
    // ทดสอบปุ่มในหน้าทีม
    window.addEventListener('keydown', (e) => {
        if (App.route !== 'teams' || Swal.isVisible() || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName)) return;
        const t = D().teams.find((x) => x.key === e.code);
        if (!t) return;
        Sound.buzz();
        $$(`[data-pad="${t.id}"], [data-test="${t.id}"]`).forEach((p) => { p.classList.remove('hit'); void p.offsetWidth; p.classList.add('hit'); });
    });

    /* ---------- คลังคำถาม ---------- */
    Views.questions = (el) => {
        const d = D();
        const cats = [...new Set(d.questions.map((q) => q.cat).filter(Boolean))];
        const f = App.params.cat || '';
        const s = (App.params.s || '').toLowerCase();
        const list = d.questions.filter((q) => (!f || q.cat === f) && (!s || `${q.text} ${q.answer}`.toLowerCase().includes(s)));
        const pts = d.settings.points;
        el.innerHTML = `
        <section class="hero hero--subjects"><div class="hero-main"><span class="hero-icon"><i class="fas fa-circle-question"></i></span>
            <div><h2 class="hero-title">คลังคำถาม</h2><p class="hero-sub">คำถามพร้อมเฉลย ใส่ภาพประกอบได้ นำเข้าจาก Excel ได้ครั้งละหลายข้อ</p></div></div>
            <div class="hero-side"><button class="btn-x cta" id="q-add"><i class="fas fa-plus"></i>เพิ่มคำถาม</button>
            <button class="btn-x ghost" id="q-imp" data-demo-lock="นำเข้าคำถามจาก Excel"><i class="fas fa-file-excel"></i>นำเข้า Excel</button>
            <button class="btn-x ghost" id="q-tpl"><i class="fas fa-download"></i>แม่แบบ Excel</button></div></section>
        <div class="panel panel--teal">
            <div class="panel-head"><span class="ic-box sm"><i class="fas fa-list-ol"></i></span><div><h3>คำถามทั้งหมด ${d.questions.length} ข้อ</h3><small>คะแนนว่าง = ใช้ค่าเริ่มต้น ${pts} คะแนน</small></div>
                <div class="panel-tools q-tools"><select class="form-select form-control-sm" id="q-cat"><option value="">ทุกหมวด</option>${opt(cats, f)}</select>
                <input class="form-control form-control-sm" id="q-s" placeholder="ค้นหา" value="${esc(App.params.s || '')}"></div></div>
            <div class="panel-body p-0 dt-wrap">${list.length ? `<table class="dt"><thead><tr><th>ที่</th><th>หมวด</th><th>คำถาม</th><th>เฉลย</th><th>คะแนน</th><th class="act"></th></tr></thead><tbody>
                ${list.map((q, i) => `<tr><td>${i + 1}</td><td><span class="tag info">${esc(q.cat || '-')}</span></td>
                <td class="q-cell">${q.img ? '<i class="fas fa-image text-primary me-1" title="มีภาพ"></i>' : ''}${esc(q.text)}</td><td>${esc(q.answer)}</td><td>${q.points || `<span class="text-muted-2">${pts}</span>`}</td>
                <td class="act"><button class="icon-btn" data-ed="${q.id}" title="แก้ไข"><i class="fas fa-pen"></i></button><button class="icon-btn del" data-del="${q.id}" title="ลบ"><i class="fas fa-trash"></i></button></td></tr>`).join('')}
                </tbody></table>` : empty('fa-circle-question', d.questions.length ? 'ไม่พบคำถามที่ค้นหา' : 'ยังไม่มีคำถาม', 'เพิ่มคำถามทีละข้อ หรือนำเข้าจาก Excel — หรือแข่งแบบ "ถามปากเปล่า" ก็ได้ไม่ต้องมีคลังคำถาม')}</div>
        </div>`;
        const upd = () => App.go('questions', new URLSearchParams({ cat: $('#q-cat').value, s: $('#q-s').value }).toString());
        $('#q-cat').onchange = upd;
        $('#q-s').onchange = upd;
        $('#q-add').onclick = () => editQuestion(null);
        $('#q-imp').onclick = importExcel;
        $('#q-tpl').onclick = templateExcel;
        $$('[data-ed]', el).forEach((b) => { b.onclick = () => editQuestion(d.questions.find((q) => q.id === b.dataset.ed)); });
        $$('[data-del]', el).forEach((b) => {
            b.onclick = async () => {
                if (!(await U.confirm('ลบคำถามนี้?', '', { confirmText: 'ลบ', danger: true }))) return;
                d.questions = d.questions.filter((q) => q.id !== b.dataset.del); Store.save(); App.refresh();
            };
        });
    };
    function editQuestion(q) {
        const d = D();
        const isNew = !q;
        const x = q ? Object.assign({}, q) : { id: U.uid('q'), cat: App.params.cat || '', text: '', answer: '', points: '', img: '' };
        U.sheet({
            title: isNew ? 'เพิ่มคำถาม' : 'แก้ไขคำถาม', icon: 'fa-circle-question', width: 720, tone: ['#3e0816', '#a01639', '#ff006e'],
            body: `<div class="field-row"><div><label class="form-label">หมวด</label><input class="form-control" id="e-cat" list="dl-cat" value="${esc(x.cat)}">${dl('dl-cat', [...new Set([...Core.PRESETS.category, ...d.questions.map((y) => y.cat).filter(Boolean)])])}</div>
                <div><label class="form-label">คะแนนข้อนี้ (ว่าง = ${d.settings.points})</label><input class="form-control" id="e-pts" type="number" min="1" inputmode="numeric" value="${esc(x.points)}"></div></div>
                <label class="form-label mt-2">คำถาม</label><textarea class="form-control" id="e-text" rows="3">${esc(x.text)}</textarea>
                <label class="form-label mt-2">เฉลย</label><input class="form-control" id="e-ans" value="${esc(x.answer)}">
                <label class="form-label mt-2">ภาพประกอบ (ไม่บังคับ)</label>
                <div class="img-pick"><div id="e-prev">${x.img ? `<img src="${esc(x.img)}" alt="">` : '<span class="text-muted-2">ยังไม่มีภาพ</span>'}</div>
                <div class="d-flex gap-2 flex-wrap"><label class="btn-x ghost sm mb-0"><i class="fas fa-image"></i>เลือกภาพ<input type="file" accept="image/*" id="e-img" hidden></label><button type="button" class="btn-x ghost sm" id="e-noimg"${x.img ? '' : ' hidden'}><i class="fas fa-xmark"></i>เอาภาพออก</button></div></div>`,
            didOpen: () => {
                $('#e-img').onchange = async (e) => {
                    const f = e.target.files[0]; if (!f) return;
                    x.img = await shrinkImage(f);
                    $('#e-prev').innerHTML = `<img src="${x.img}" alt="">`; $('#e-noimg').hidden = false;
                };
                $('#e-noimg').onclick = () => { x.img = ''; $('#e-prev').innerHTML = '<span class="text-muted-2">ยังไม่มีภาพ</span>'; $('#e-noimg').hidden = true; };
            },
            preConfirm: () => {
                const text = $('#e-text').value.trim();
                if (!text && !x.img) { Swal.showValidationMessage('กรุณาพิมพ์คำถาม หรือใส่ภาพ'); return false; }
                return { cat: $('#e-cat').value.trim(), text, answer: $('#e-ans').value.trim(), points: $('#e-pts').value ? Math.max(1, +$('#e-pts').value) : '' };
            },
        }).then((r) => {
            if (!r.isConfirmed) return;
            Object.assign(x, r.value);
            if (isNew) d.questions.push(x); else Object.assign(q, x);
            Store.save(); App.refresh(); U.toast('บันทึกคำถามแล้ว', { type: 'ok' });
        });
    }
    /** ย่อรูปให้กว้างไม่เกิน 960px (ประหยัดพื้นที่ localStorage) */
    function shrinkImage(file) {
        return new Promise((res) => {
            const rd = new FileReader();
            rd.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const k = Math.min(1, 960 / Math.max(img.width, img.height));
                    const c = document.createElement('canvas');
                    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
                    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
                    res(c.toDataURL('image/jpeg', 0.82));
                };
                img.onerror = () => res(rd.result);
                img.src = rd.result;
            };
            rd.readAsDataURL(file);
        });
    }
    const XL_HEAD = ['หมวด', 'คำถาม', 'เฉลย', 'คะแนน'];
    function templateExcel() {
        const ws = XLSX.utils.aoa_to_sheet([XL_HEAD, ['วิทยาศาสตร์', 'ดาวเคราะห์ดวงใดอยู่ใกล้ดวงอาทิตย์มากที่สุด', 'ดาวพุธ', 10], ['คณิตศาสตร์', '12 × 12 มีค่าเท่าใด', '144', ''], ['ภาษาไทย', 'ผู้แต่งเรื่องพระอภัยมณีคือใคร', 'สุนทรภู่', 20]]);
        ws['!cols'] = [{ wch: 16 }, { wch: 60 }, { wch: 28 }, { wch: 8 }];
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'คำถาม');
        XLSX.writeFile(wb, 'แม่แบบนำเข้าคำถาม.xlsx');
    }
    function importExcel() {
        if (!VSDemo.allow('นำเข้าคำถามจาก Excel')) return;
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = '.xlsx,.xls,.csv';
        inp.onchange = () => {
            const f = inp.files[0]; if (!f) return;
            const rd = new FileReader();
            rd.onload = async () => {
                try {
                    const wb = XLSX.read(new Uint8Array(rd.result), { type: 'array' });
                    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
                    let h = rows.findIndex((r) => r.some((c) => String(c).trim() === 'คำถาม'));
                    const head = h >= 0 ? rows[h].map((c) => String(c).trim()) : XL_HEAD;
                    const ix = (k, def) => { const i = head.indexOf(k); return i >= 0 ? i : def; };
                    const [ic, iq, ia, ip] = [ix('หมวด', 0), ix('คำถาม', 1), ix('เฉลย', 2), ix('คะแนน', 3)];
                    const qs = rows.slice(h + 1).map((r) => ({ id: U.uid('q'), cat: U.norm(r[ic]), text: U.norm(r[iq]), answer: U.norm(r[ia]), points: Number(r[ip]) > 0 ? Number(r[ip]) : '', img: '' })).filter((q) => q.text);
                    const exist = new Set(D().questions.map((q) => U.normKey(q.text)));
                    const fresh = qs.filter((q) => !exist.has(U.normKey(q.text)));
                    if (!qs.length) { U.alert('ไม่พบคำถามในไฟล์', 'ต้องมีหัวคอลัมน์ หมวด | คำถาม | เฉลย | คะแนน (ดาวน์โหลดแม่แบบ Excel ได้)', 'warning'); return; }
                    const ok = await U.confirm(`นำเข้า ${fresh.length} ข้อ?`, `พบในไฟล์ ${qs.length} ข้อ${qs.length - fresh.length ? ` · ซ้ำกับคลังเดิม ${qs.length - fresh.length} ข้อ (ข้าม)` : ''}<br><small>ตัวอย่าง: ${esc((fresh[0] || qs[0]).text)}</small>`, { confirmText: 'นำเข้า', icon: 'question' });
                    if (!ok) return;
                    D().questions.push(...fresh); Store.save(); App.refresh(); U.toast(`นำเข้า ${fresh.length} ข้อแล้ว`, { type: 'ok' });
                } catch (e) { U.alert('อ่านไฟล์ไม่ได้', esc(e.message), 'error'); }
            };
            rd.readAsArrayBuffer(f);
        };
        inp.click();
    }

    /* ---------- ผลการแข่งขัน ---------- */
    Views.results = (el) => {
        const d = D();
        const done = d.matches.filter((m) => m.status === 'done').sort((a, b) => (b.regNo || 0) - (a.regNo || 0));
        const m = done.find((x) => x.id === App.params.id);
        if (m) return resultDetail(el, m);
        el.innerHTML = `
        <section class="hero hero--classes"><div class="hero-main"><span class="hero-icon"><i class="fas fa-trophy"></i></span>
            <div><h2 class="hero-title">ผลการแข่งขัน</h2><p class="hero-sub">ทะเบียนการแข่งขัน เลขที่เรียงอัตโนมัติ ดูผลรายข้อ ประกาศผู้ชนะ และพิมพ์สรุปคะแนน</p></div></div></section>
        <div class="panel panel--green"><div class="panel-head"><span class="ic-box sm"><i class="fas fa-book"></i></span><div><h3>ทะเบียนการแข่งขัน</h3><small>${done.length} รายการ</small></div></div>
        <div class="panel-body p-0 dt-wrap">${done.length ? `<table class="dt"><thead><tr><th>เลขที่</th><th>วันที่</th><th>รายการแข่งขัน</th><th>ระดับชั้น</th><th>ทีม</th><th>ข้อ</th><th>ชนะเลิศ</th><th class="act"></th></tr></thead><tbody>
            ${done.map((x) => { const w = Core.ranking(x)[0] || {}; return `<tr><td>${x.regNo}</td><td>${esc(Core.thDate(x.date))}</td><td><a href="#/results?id=${x.id}"><b>${esc(x.name)}</b></a></td><td>${esc(x.level)}</td><td>${x.teams.length}</td><td>${x.log.length}</td>
            <td><span class="tag ok" style="background:${esc(w.color)}22;color:${esc(w.color)}"><i class="fas fa-crown"></i>${esc(w.name || '-')} (${w.score || 0})</span></td>
            <td class="act"><a class="icon-btn" href="#/results?id=${x.id}" title="ดูผล"><i class="fas fa-eye"></i></a><button class="icon-btn del" data-del="${x.id}" title="ลบ"><i class="fas fa-trash"></i></button></td></tr>`; }).join('')}
        </tbody></table>` : empty('fa-trophy', 'ยังไม่มีผลการแข่งขัน', 'เมื่อกด "จบการแข่งขัน" ผลจะถูกบันทึกที่นี่อัตโนมัติ', '<a class="btn-x primary" href="#/play"><i class="fas fa-play"></i>เริ่มแข่งขัน</a>')}</div></div>`;
        $$('[data-del]', el).forEach((b) => {
            b.onclick = async () => {
                if (!(await U.confirm('ลบผลการแข่งขันนี้?', 'ลบแล้วกู้คืนไม่ได้ (ยกเว้นจากไฟล์ .json ที่สำรองไว้)', { confirmText: 'ลบ', danger: true }))) return;
                d.matches = d.matches.filter((x) => x.id !== b.dataset.del); Store.save(); App.refresh();
            };
        });
    };
    function resultDetail(el, m) {
        const rk = Core.ranking(m);
        const prizes = D().prizes;
        const nm = (id) => (App.teamById(id, m) || {}).name || '-';
        const max = Math.max(1, ...rk.map((t) => t.score));
        el.innerHTML = `
        <section class="hero hero--classes"><div class="hero-main"><span class="hero-icon"><i class="fas fa-trophy"></i></span>
            <div><h2 class="hero-title">${esc(m.name)}</h2><p class="hero-sub">เลขที่ ${m.regNo} · ${esc(Core.thDate(m.date))} · ${esc(m.level || '')} · ${esc(m.place || '')}</p></div></div>
            <div class="hero-side"><button class="btn-x cta" id="r-win"><i class="fas fa-crown"></i>ประกาศผู้ชนะ</button>
            <button class="btn-x ghost" id="r-print"><i class="fas fa-print"></i>พิมพ์สรุปคะแนน</button>
            <a class="btn-x ghost" href="#/reports?id=${m.id}"><i class="fas fa-file-word"></i>รายงาน .docx</a></div></section>
        <div class="home-grid">
            <div class="panel panel--pink"><div class="panel-head"><span class="ic-box sm"><i class="fas fa-ranking-star"></i></span><div><h3>อันดับ</h3><small>คะแนนเท่ากันดูจำนวนข้อที่ตอบถูก</small></div>
                <div class="panel-tools"><a class="btn-x ghost sm" href="#/results"><i class="fas fa-arrow-left"></i>ทะเบียน</a></div></div>
                <div class="panel-body">${rk.map((t) => `<div class="rk-row" style="--tc:${esc(t.color)}"><span class="rk-no">${t.rank}</span><div class="rk-main"><b>${esc(t.name)}</b><small>${esc(t.members || '')}</small>
                    <div class="rk-bar"><i style="width:${Math.max(3, (t.score / max) * 100)}%"></i></div></div><div class="rk-score"><b>${t.score}</b><small>ถูก ${t.correct} · ผิด ${t.wrong}</small>${prizes[t.rank - 1] ? `<span class="tag ok">${esc(prizes[t.rank - 1].label)}</span>` : ''}</div></div>`).join('')}</div></div>
            <div class="panel panel--purple"><div class="panel-head"><span class="ic-box sm"><i class="fas fa-list-check"></i></span><div><h3>รายละเอียดรายข้อ</h3><small>ลำดับการกดและเวลาหลังเปิดรับ (วินาที)</small></div></div>
                <div class="panel-body p-0 dt-wrap"><table class="dt"><thead><tr><th>ข้อ</th><th>คำถาม</th><th>ลำดับการกด</th><th>ผล</th></tr></thead><tbody>
                ${m.log.map((q) => `<tr><td>${q.no}</td><td class="q-cell">${esc(q.text)}<br><small class="text-muted-2">เฉลย: ${esc(q.answer || '-')}</small></td>
                <td>${q.presses.map((p, i) => `<div class="nowrap">${i + 1}. ${esc(nm(p.team))} <small>${(p.ms / 1000).toFixed(3)}</small></div>`).join('') || '-'}</td>
                <td>${q.events.map((e) => `<div class="nowrap"><span class="tag ${e.result === 'ok' ? 'ok' : e.result === 'bad' ? 'bad' : 'info'}">${e.result === 'ok' ? 'ถูก' : e.result === 'bad' ? 'ผิด' : 'ปรับ'} ${e.delta > 0 ? '+' : ''}${e.delta}</span> ${esc(nm(e.team))}</div>`).join('') || '<span class="text-muted-2">ไม่มีผู้ตอบ</span>'}</td></tr>`).join('') || '<tr><td colspan="4">ไม่มีข้อมูล</td></tr>'}
                </tbody></table></div></div>
        </div>`;
        $('#r-win').onclick = () => Game.showWinner(m);
        $('#r-print').onclick = () => printSummary(m);
    }
    /** พิมพ์สรุปคะแนน (A4 แบบราชการ) */
    function printSummary(m) {
        const d = D(), s = d.school;
        const rows = Docs.scoreRows(m, d.prizes);
        const judges = (m.judges || []).filter(Boolean);
        $('#print-root').innerHTML = `<section class="gov-page">
            <h2 class="gov-title">สรุปผลคะแนนการแข่งขันตอบปัญหา${esc(m.name)}</h2>
            <p style="text-align:center">${esc(s.name || '')}${m.level ? `  ระดับชั้น ${esc(m.level)}` : ''}</p>
            <p style="text-align:center;margin-bottom:8pt">วันที่ ${esc(Core.thDate(m.date))}${m.place ? `  ณ ${esc(m.place)}` : ''}</p>
            <table class="gov-table"><thead><tr><th>อันดับ</th><th>ทีม</th><th>สมาชิก</th><th>ถูก</th><th>ผิด</th><th>คะแนน</th><th>ผลการแข่งขัน</th></tr></thead>
            <tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td style="text-align:${[0, 3, 4, 5, 6].includes(i) ? 'center' : 'left'}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
            <div class="print-signs">${(judges.length ? judges : ['', '']).map((j) => `<div><p>ลงชื่อ.......................................</p><p>(${esc(j || '.......................................')})</p><p>กรรมการตัดสิน</p></div>`).join('')}</div>
        </section>`;
        setTimeout(() => window.print(), 150);
    }

    /* ---------- รายงาน .docx ---------- */
    Views.reports = (el) => {
        const d = D();
        const done = d.matches.filter((m) => m.status === 'done').sort((a, b) => (b.regNo || 0) - (a.regNo || 0));
        const m = done.find((x) => x.id === App.params.id) || done[0];
        const kind = App.params.k || 'memo';
        el.innerHTML = `
        <section class="hero hero--print"><div class="hero-main"><span class="hero-icon"><i class="fas fa-file-word"></i></span>
            <div><h2 class="hero-title">รายงาน (แบบราชการ)</h2><p class="hero-sub">บันทึกข้อความ · ประกาศผล · สรุปคะแนน · หลักฐานการจ่ายเงินรางวัล — ไฟล์ Word (.docx) TH SarabunPSK 16 ตามระเบียบงานสารบรรณ</p></div></div></section>
        ${done.length ? `<div class="rep-grid">
            <div class="panel panel--orange"><div class="panel-head"><span class="ic-box sm"><i class="fas fa-sliders"></i></span><div><h3>เลือกเอกสาร</h3><small>ข้อความแก้ได้ที่ "ตั้งค่าและแม่แบบ"</small></div></div>
            <div class="panel-body">
                <label class="form-label">การแข่งขัน</label>
                <select class="form-select" id="rp-m">${done.map((x) => `<option value="${x.id}"${x === m ? ' selected' : ''}>เลขที่ ${x.regNo} · ${esc(x.name)} (${esc(Core.thDate(x.date))})</option>`).join('')}</select>
                <label class="form-label mt-3">ลงวันที่เอกสาร</label><input type="date" class="form-control" id="rp-date" value="${esc(App.params.dt || Core.iso(new Date()))}">
                <div class="kind-list mt-3">${Object.entries(Docs.KINDS).map(([k, v]) => `<label class="kind${k === kind ? ' on' : ''}"><input type="radio" name="rp-k" value="${k}"${k === kind ? ' checked' : ''}><i class="fas ${v.icon}"></i><span>${esc(v.label)}</span></label>`).join('')}</div>
                <div class="d-grid gap-2 mt-3"><button class="btn-x primary lg" id="rp-one"><i class="fas fa-file-word"></i>ดาวน์โหลดเอกสารนี้ (.docx)</button>
                <button class="btn-x green" id="rp-all"><i class="fas fa-layer-group"></i>ดาวน์โหลดทั้งชุด 4 เอกสาร (.docx)</button>
                <a class="btn-x ghost" href="#/settings?tab=tpl"><i class="fas fa-pen-to-square"></i>แก้ข้อความแม่แบบ</a></div>
            </div></div>
            <div class="panel"><div class="panel-head"><span class="ic-box sm"><i class="fas fa-eye"></i></span><div><h3>ตัวอย่างบนจอ</h3><small>${esc(Docs.KINDS[kind].label)}</small></div></div>
            <div class="panel-body preview-stage"><div class="preview-zoom" id="rp-prev">${previewHtml(kind, m, Core.parseISO(App.params.dt || Core.iso(new Date())))}</div></div></div>
        </div>` : `<div class="panel">${empty('fa-file-word', 'ยังไม่มีผลการแข่งขัน', 'จบการแข่งขันอย่างน้อย 1 รายการก่อน จึงจะออกรายงานได้', '<a class="btn-x primary" href="#/play"><i class="fas fa-play"></i>เริ่มแข่งขัน</a>')}</div>`}`;
        if (!done.length) return;
        const upd = () => App.go('reports', new URLSearchParams({ id: $('#rp-m').value, k: $('input[name=rp-k]:checked').value, dt: $('#rp-date').value }).toString());
        $('#rp-m').onchange = upd; $('#rp-date').onchange = upd;
        $$('input[name=rp-k]').forEach((r) => { r.onchange = upd; });
        const today = () => Core.parseISO($('#rp-date').value) || new Date();
        $('#rp-one').onclick = () => {
            if (window.ThaiDoc.resetMemoFields) ThaiDoc.resetMemoFields();
            ThaiDoc.download(Docs.KINDS[kind].build(ThaiDoc, d, m, today()), `${Docs.KINDS[kind].label} - ${m.name}.docx`, { title: Docs.KINDS[kind].label })
                .then(() => U.toast('ดาวน์โหลดเอกสารแล้ว', { type: 'ok' }));
        };
        $('#rp-all').onclick = () => {
            if (window.ThaiDoc.resetMemoFields) ThaiDoc.resetMemoFields();
            ThaiDoc.download(Docs.allSections(ThaiDoc, d, m, today()), `ชุดเอกสารการแข่งขัน - ${m.name}.docx`, { title: 'ชุดเอกสารการแข่งขัน' })
                .then(() => U.toast('ดาวน์โหลดชุดเอกสารแล้ว', { type: 'ok' }));
        };
    };
    function previewHtml(kind, m, today) {
        const d = D(), s = d.school;
        const dots = (v, n) => esc(v || '.'.repeat(n));
        const G = '<img src="/assets/vendor/garuda.png" alt="">';
        if (kind === 'memo') {
            const t = Docs.memoText(d, m, today);
            return `<section class="gov-page"><div class="gov-memo-head">${G}<h1>บันทึกข้อความ</h1><span></span></div>
                <p class="gov-field"><b>ส่วนราชการ</b> ${dots(t.agency, 60)}</p><p class="gov-field"><b>ที่</b> ${dots(t.docNo, 20)}<span class="gov-tab"></span><b>วันที่</b> ${dots(t.date, 30)}</p>
                <p class="gov-field"><b>เรื่อง</b> ${esc(t.subject)}</p><p class="gov-to"><b>เรียน</b> ${esc(t.to)}</p>
                ${t.paragraphs.map((p) => `<p class="gov-body">${esc(p)}</p>`).join('')}
                <div class="gov-sign"><p>ลงชื่อ................................................</p><p>(${dots(t.signer.name, 40)})</p><p>ตำแหน่ง ${dots(t.signer.position, 40)}</p></div></section>`;
        }
        const v = Docs.vars(d, m);
        const rk = Core.ranking(m);
        if (kind === 'ann') {
            return `<section class="gov-page"><div style="text-align:center"><img src="/assets/vendor/garuda.png" alt="" style="height:3cm"></div>
                <p style="text-align:center"><b>ประกาศ${dots(s.name, 40)}</b></p><p style="text-align:center"><b>เรื่อง ${esc(Core.fill(d.templates.annTitle, v))}</b></p><p style="text-align:center">-------------------------------------------</p>
                <p class="gov-body">${esc(Core.fill(d.templates.annP1, v))}</p>
                ${d.prizes.map((p, i) => `<p style="padding-left:2.5cm">${i + 1}. ${esc(p.label)} ได้แก่ ${esc(rk.filter((t) => t.rank === i + 1).map((t) => `${t.name} (${t.score} คะแนน)`).join(', ') || '..........')}</p>`).join('')}
                <p class="gov-body">${esc(Core.fill(d.templates.annP2, v))}</p><p style="padding-left:4.5cm;margin-top:10pt">ประกาศ ณ วันที่ ${esc(today ? Core.thDate(Core.iso(today), true) : '')}</p>
                <div class="gov-sign" style="margin-top:30pt"><p>(${dots(s.director, 40)})</p><p>${esc(s.directorPos || `ผู้อำนวยการ${s.name}`)}</p></div></section>`;
        }
        if (kind === 'score') {
            return `<section class="gov-page"><h2 class="gov-title">สรุปผลคะแนนการแข่งขันตอบปัญหา${esc(m.name)}</h2><p style="text-align:center">${esc(s.name || '')} วันที่ ${esc(v['วันที่'])}</p>
                <table class="gov-table"><thead><tr><th>อันดับ</th><th>ทีม</th><th>สมาชิก</th><th>ถูก</th><th>ผิด</th><th>คะแนน</th><th>ผล</th></tr></thead><tbody>
                ${Docs.scoreRows(m, d.prizes).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
                <p style="margin-top:8pt;font-size:14pt">หน้าถัดไป: รายละเอียดการตอบรายข้อ ${m.log.length} ข้อ (A4 แนวนอน)</p></section>`;
        }
        const total = Docs.payTotal(d, m);
        let n = 0;
        return `<section class="gov-page"><h2 class="gov-title">${esc(Core.fill(d.templates.payTitle, v))}</h2><p style="text-align:center">${esc(s.name || '')} วันที่ ${esc(v['วันที่'])}</p>
            <table class="gov-table"><thead><tr><th>ที่</th><th>ทีมผู้รับรางวัล</th><th>รางวัล</th><th>จำนวนเงิน (บาท)</th><th>ลายมือชื่อผู้รับเงิน</th></tr></thead><tbody>
            ${d.prizes.map((p, i) => rk.filter((t) => t.rank === i + 1).map((t) => `<tr><td>${++n}</td><td>${esc(t.name)}</td><td>${esc(p.label)}${p.item ? ` และ${esc(p.item)}` : ''}</td><td style="text-align:right">${Core.money(p.amount)}</td><td></td></tr>`).join('')).join('')}
            <tr><td></td><td><b>รวมเงินทั้งสิ้น</b></td><td>(${esc(Core.bahtText(total))})</td><td style="text-align:right"><b>${Core.money(total)}</b></td><td></td></tr></tbody></table>
            <p style="font-size:14pt;margin-top:8pt">${esc(Core.fill(d.templates.payNote, v))}</p></section>`;
    }

    /* ---------- ตั้งค่าและแม่แบบ ---------- */
    const TPL_FIELDS = [
        ['memoSubject', 'บันทึกข้อความ: เรื่อง', 1], ['memoTo', 'บันทึกข้อความ: เรียน', 1], ['memoP1', 'บันทึกข้อความ: ย่อหน้า 1 (ความเป็นมา)', 3], ['memoP2', 'บันทึกข้อความ: ย่อหน้า 2 (ผลการแข่งขัน)', 3], ['memoP3', 'บันทึกข้อความ: ย่อหน้าปิด', 2],
        ['annTitle', 'ประกาศ: เรื่อง', 1], ['annP1', 'ประกาศ: ย่อหน้านำ', 3], ['annP2', 'ประกาศ: ย่อหน้าปิด', 2],
        ['payTitle', 'หลักฐานการจ่ายเงิน: หัวเรื่อง', 1], ['payNote', 'หลักฐานการจ่ายเงิน: อ้างอิงระเบียบ/แหล่งเงิน', 2],
    ];
    const VARS = ['{ชื่อการแข่ง}', '{ระดับชั้น}', '{วันที่}', '{สถานที่}', '{ผู้จัด}', '{โรงเรียน}', '{จำนวนทีม}', '{จำนวนข้อ}', '{ผลการแข่ง}', '{ปีการศึกษา}'];
    Views.settings = (el) => {
        const d = D(), s = d.school, st = d.settings;
        const tab = App.params.tab || 'school';
        const T = (k, label, icon) => `<button class="${tab === k ? 'active' : ''}" data-tab="${k}"><i class="fas ${icon}"></i>${label}</button>`;
        el.innerHTML = `
        <section class="hero hero--settings"><div class="hero-main"><span class="hero-icon"><i class="fas fa-sliders"></i></span>
            <div><h2 class="hero-title">ตั้งค่าและแม่แบบ</h2><p class="hero-sub">ข้อมูลโรงเรียน/ผู้ลงนามตั้งครั้งเดียวใช้ทุกเอกสาร · กติกาคะแนน · รางวัล · ข้อความแม่แบบทุกช่องแก้ได้</p></div></div></section>
        <div class="seg mb-3 set-tabs">${T('school', 'โรงเรียน/ผู้ลงนาม', 'fa-school')}${T('rule', 'กติกาและเสียง', 'fa-gavel')}${T('prize', 'รางวัล', 'fa-medal')}${T('tpl', 'ข้อความแม่แบบ', 'fa-pen-to-square')}${T('data', 'ข้อมูล/สำรอง', 'fa-database')}</div>
        <div class="panel"><div class="panel-body" id="set-body"></div></div>`;
        $$('[data-tab]', el).forEach((b) => { b.onclick = () => App.go('settings', `tab=${b.dataset.tab}`); });
        const body = $('#set-body');
        const inp = (k, label, obj, type, extra) => `<div><label class="form-label">${label}</label><input class="form-control" data-k="${k}" type="${type || 'text'}" value="${esc(obj[k])}" ${extra || ''}></div>`;
        if (tab === 'school') {
            body.innerHTML = `<div class="msec"><i class="fas fa-school"></i>ข้อมูลโรงเรียน</div><div class="field-row">
                ${inp('name', 'ชื่อโรงเรียน', s)}${inp('agency', 'ส่วนราชการ (บันทึกข้อความ)', s)}${inp('docPrefix', 'เลขที่หนังสือ (ส่วนหน้า เช่น ศธ ๐๔๒๓๔.๑๒/)', s)}${inp('academicYear', 'ปีการศึกษา', s, 'text', 'inputmode="numeric"')}</div>
                <div class="msec mt-3"><i class="fas fa-signature"></i>ผู้ลงนาม</div><div class="field-row">
                ${inp('reporter', 'ผู้รายงาน/ผู้จ่ายเงิน (ชื่อ-สกุล)', s)}${inp('reporterPos', 'ตำแหน่งผู้รายงาน', s, 'text', 'list="dl-pos"')}${inp('director', 'ผู้อำนวยการ (ชื่อ-สกุล)', s)}${inp('directorPos', 'ตำแหน่งผู้อำนวยการ', s, 'text', 'list="dl-dpos"')}</div>
                ${dl('dl-pos', ['ครู', 'ครู ชำนาญการ', 'ครู ชำนาญการพิเศษ', 'ครู เชี่ยวชาญ', 'ครูผู้ช่วย', 'หัวหน้ากลุ่มสาระการเรียนรู้'])}${dl('dl-dpos', [`ผู้อำนวยการ${s.name || 'โรงเรียน'}`, `รองผู้อำนวยการ ปฏิบัติราชการแทน ผู้อำนวยการ${s.name || 'โรงเรียน'}`])}`;
            $$('[data-k]', body).forEach((i) => { i.onchange = () => { s[i.dataset.k] = i.value.trim(); Store.save(); renderSide(); }; });
        } else if (tab === 'rule') {
            body.innerHTML = `<div class="msec"><i class="fas fa-gavel"></i>กติกาคะแนน</div><div class="field-row">
                ${inp('points', 'คะแนนเมื่อตอบถูก (ค่าเริ่มต้น)', st, 'number', 'min="1" inputmode="numeric"')}${inp('penalty', 'หักคะแนนเมื่อตอบผิด (0 = ไม่หัก)', st, 'number', 'min="0" inputmode="numeric"')}
                ${inp('answerSec', 'เวลาตอบหลังกดปุ่ม (วินาที, 0 = ไม่จับเวลา)', st, 'number', 'min="0" inputmode="numeric"')}${inp('armDelay', 'นับถอยหลังก่อนเปิดรับการกด (วินาที)', st, 'number', 'min="0" max="5" inputmode="numeric"')}</div>
                <div class="check-grid mt-3"><label><input type="checkbox" class="form-check-input" data-c="allowPass"${st.allowPass ? ' checked' : ''}> ตอบผิดแล้วส่งสิทธิ์ให้ทีมที่กดถัดไป / เปิดรับกดใหม่ให้ทีมที่เหลือ</label>
                <label><input type="checkbox" class="form-check-input" data-c="sound"${st.sound ? ' checked' : ''}> เปิดเสียงประกอบ</label></div>
                <div class="mt-3" style="max-width:360px"><label class="form-label">ความดังเสียง</label><input type="range" class="form-range" min="0" max="1" step="0.1" value="${st.volume}" id="st-vol"></div>
                <button class="btn-x ghost sm mt-2" id="st-test"><i class="fas fa-volume-high"></i>ทดสอบเสียง</button>`;
            $$('[data-k]', body).forEach((i) => { i.onchange = () => { st[i.dataset.k] = Math.max(0, Number(i.value) || 0); if (i.dataset.k === 'points') st.points = Math.max(1, st.points); Store.save(); }; });
            $$('[data-c]', body).forEach((i) => { i.onchange = () => { st[i.dataset.c] = i.checked; Store.save(); }; });
            $('#st-vol').oninput = (e) => { st.volume = +e.target.value; Store.save(); };
            $('#st-test').onclick = () => { Sound.unlock(); Sound.correct(); };
        } else if (tab === 'prize') {
            body.innerHTML = `<div class="msec"><i class="fas fa-medal"></i>รางวัลตามอันดับ</div>
                <div class="note"><i class="fas fa-circle-info"></i><div>ใช้ในประกาศผลและหลักฐานการจ่ายเงินรางวัล (จำนวนเงินตัวอักษรคำนวณให้อัตโนมัติ) · ใส่ 0 ถ้าไม่มีเงินรางวัล</div></div>
                <div class="dt-wrap"><table class="dt"><thead><tr><th>อันดับ</th><th>ชื่อรางวัล</th><th>เงินรางวัล (บาท)</th><th>ของรางวัลอื่น</th><th class="act"></th></tr></thead><tbody>
                ${d.prizes.map((p, i) => `<tr><td>${i + 1}</td><td><input class="form-control form-control-sm" data-p="${i}" data-f="label" value="${esc(p.label)}"></td><td><input class="form-control form-control-sm" type="number" min="0" inputmode="decimal" data-p="${i}" data-f="amount" value="${p.amount}"><small class="text-muted-2">${esc(Core.bahtText(p.amount))}</small></td>
                <td><input class="form-control form-control-sm" data-p="${i}" data-f="item" list="dl-item" value="${esc(p.item)}"></td><td class="act"><button class="icon-btn del" data-pd="${i}" title="ลบรางวัล"><i class="fas fa-trash"></i></button></td></tr>`).join('')}</tbody></table></div>
                ${dl('dl-item', ['เกียรติบัตร', 'เกียรติบัตรและถ้วยรางวัล', 'เกียรติบัตรและเหรียญรางวัล', 'ของรางวัล'])}
                <button class="btn-x primary sm mt-2" id="pz-add"><i class="fas fa-plus"></i>เพิ่มอันดับรางวัล</button>`;
            $$('[data-p]', body).forEach((i) => { i.onchange = () => { const p = d.prizes[+i.dataset.p]; p[i.dataset.f] = i.dataset.f === 'amount' ? Math.max(0, Number(i.value) || 0) : i.value.trim(); Store.save(); App.refresh(); }; });
            $$('[data-pd]', body).forEach((b) => { b.onclick = async () => { if (!(await U.confirm('ลบรางวัลอันดับนี้?', '', { confirmText: 'ลบ', danger: true }))) return; d.prizes.splice(+b.dataset.pd, 1); Store.save(); App.refresh(); }; });
            $('#pz-add').onclick = () => { d.prizes.push({ label: `รางวัลชมเชย`, amount: 0, item: 'เกียรติบัตร' }); Store.save(); App.refresh(); };
        } else if (tab === 'tpl') {
            body.innerHTML = `<div class="msec"><i class="fas fa-pen-to-square"></i>ข้อความแม่แบบในเอกสาร</div>
                <div class="note warn"><i class="fas fa-triangle-exclamation"></i><div>ข้อความอ้างอิงระเบียบเป็นค่าเริ่มต้นทั่วไป <b>ควรให้เจ้าหน้าที่การเงิน/พัสดุของโรงเรียนตรวจเทียบแบบฉบับปัจจุบันก่อนใช้จริง</b></div></div>
                <div class="var-chips">แทรกค่าอัตโนมัติ (คลิกเพื่อแทรกในช่องที่เลือก): ${VARS.map((x) => `<button class="vchip" data-v="${x}">${x}</button>`).join('')}</div>
                ${TPL_FIELDS.map(([k, label, rows]) => `<div class="mt-3"><label class="form-label d-flex justify-content-between"><span>${label}</span><button class="btn-x ghost sm" data-def="${k}"><i class="fas fa-rotate-left"></i>ค่าเริ่มต้น</button></label>
                    ${rows > 1 ? `<textarea class="form-control" rows="${rows}" data-t="${k}">${esc(d.templates[k])}</textarea>` : `<input class="form-control" data-t="${k}" value="${esc(d.templates[k])}">`}</div>`).join('')}`;
            let last = null;
            $$('[data-t]', body).forEach((i) => { i.onfocus = () => { last = i; }; i.onchange = () => { d.templates[i.dataset.t] = i.value; Store.save(); }; });
            $$('[data-v]', body).forEach((b) => { b.onclick = () => { if (!last) { U.toast('คลิกช่องข้อความที่ต้องการก่อน'); return; } const p = last.selectionStart || last.value.length; last.value = last.value.slice(0, p) + b.dataset.v + last.value.slice(p); last.dispatchEvent(new Event('change')); last.focus(); }; });
            $$('[data-def]', body).forEach((b) => { b.onclick = () => { d.templates[b.dataset.def] = Core.DEFAULT_TEMPLATES[b.dataset.def]; Store.save(); App.refresh(); }; });
        } else {
            body.innerHTML = `<div class="msec"><i class="fas fa-database"></i>ข้อมูลและการสำรอง</div>
                <div class="note warn"><i class="fas fa-database"></i><div>ข้อมูลเก็บใน<b>เบราว์เซอร์ของเครื่องนี้</b> ถ้าล้างประวัติเบราว์เซอร์ข้อมูลจะหาย — กรุณาบันทึกไฟล์ข้อมูล (.json) เก็บไว้เสมอ และใช้ไฟล์นี้ย้ายข้อมูลไปเครื่องอื่น</div></div>
                <div class="d-flex flex-wrap gap-2">
                <button class="btn-x green" id="dt-save"><i class="fas fa-download"></i>บันทึกไฟล์ข้อมูล (.json)</button>
                <button class="btn-x ghost" id="dt-open" data-demo-lock="เปิดไฟล์ข้อมูล (.json)"><i class="fas fa-folder-open"></i>เปิดไฟล์ข้อมูล</button>
                <button class="btn-x primary" id="dt-demo"><i class="fas fa-flask"></i>โหลดข้อมูลตัวอย่าง</button>
                <button class="btn-x orange" id="dt-reset" data-demo-lock="ล้างข้อมูลทั้งหมด"><i class="fas fa-eraser"></i>ล้างข้อมูลทั้งหมด</button></div>`;
            $('#dt-save').onclick = App.backupNow;
            $('#dt-open').onclick = App.openFile;
            $('#dt-demo').onclick = async () => { if (VSDemo.active || Store.isEmpty() || await U.confirm('โหลดข้อมูลตัวอย่าง?', 'ข้อมูลปัจจุบันจะถูกแทนที่ (แนะนำให้บันทึกไฟล์ข้อมูลก่อน)', { confirmText: 'โหลดข้อมูลตัวอย่าง' })) App.loadDemo(); };
            $('#dt-reset').onclick = App.resetAll;
        }
    };

    Views.play = (el) => Game.view(el);

    /* ---------- หน้าต่างต้อนรับ ---------- */
    async function welcome() {
        if (!Store.isEmpty() || Store.meta.dismissedWelcome) return;
        const r = await Swal.fire({
            html: `<div class="sheet-head" style="--s1:var(--hero-1);--s2:var(--hero-2);--s3:var(--hero-3)"><span class="sh-ic"><i class="fas fa-bolt"></i></span>
                <div><h3>ยินดีต้อนรับสู่ระบบกดปุ่มตอบเร็ว</h3><p>แข่งตอบคำถามแบบรายการทีวี ใช้คีย์บอร์ด/จอสัมผัสแทนเครื่องกดปุ่ม</p></div></div>
                <div class="sheet-body"><div class="note warn"><i class="fas fa-database"></i><div>ข้อมูลเก็บใน<b>เบราว์เซอร์ของเครื่องนี้</b> กรุณากด <b>"บันทึกไฟล์ข้อมูล (.json)"</b> เพื่อสำรองอยู่เสมอ</div></div>
                <div class="steps"><div class="step"><b>1</b><div><strong>ตั้งทีม</strong>2–8 ทีม เลือกสีและปุ่มคีย์บอร์ด</div></div>
                <div class="step"><b>2</b><div><strong>คำถาม</strong>เพิ่มเอง นำเข้า Excel หรือถามปากเปล่า</div></div>
                <div class="step"><b>3</b><div><strong>แข่งเลย</strong>ใครกดก่อนล็อกทันที กรรมการกดถูก/ผิด</div></div></div></div>`,
            width: 760, showDenyButton: true, showCancelButton: true,
            confirmButtonText: '<i class="fas fa-play"></i> เริ่มใหม่ (ข้อมูลว่าง)', denyButtonText: '<i class="fas fa-flask"></i> ทดลองด้วยข้อมูลตัวอย่าง', cancelButtonText: '<i class="fas fa-folder-open"></i> เปิดไฟล์ข้อมูลเดิม',
            buttonsStyling: false, customClass: { popup: 'sheet', confirmButton: 'btn-x primary lg', denyButton: 'btn-x orange lg', cancelButton: 'btn-x ghost lg' }, allowOutsideClick: false,
            didOpen: () => { VSDemo.lock(Swal.getConfirmButton(), 'เริ่มใหม่ (ข้อมูลว่าง)'); VSDemo.lock(Swal.getCancelButton(), 'เปิดไฟล์ข้อมูลเดิม'); },
        });
        Store.setMeta({ dismissedWelcome: true });
        if (r.isDenied || VSDemo.active) App.loadDemo();
        else if (r.dismiss === Swal.DismissReason.cancel) App.openFile();
        else if (r.isConfirmed && Store.isEmpty()) { addTeams(4); App.go('teams'); }
    }

    function init() {
        Store.load();
        VSDemo.onReset(() => App.loadDemo());
        Store.on(renderSide);
        window.addEventListener('hashchange', App.render);
        $('#tb-backup-btn').onclick = App.backupNow;
        $('#sb-save').onclick = App.backupNow;
        $('#sb-open').onclick = App.openFile;
        window.addEventListener('beforeunload', () => Store.flush());
        App.render();
        welcome();
    }
    window.App = App;
    document.addEventListener('DOMContentLoaded', init);
})();
