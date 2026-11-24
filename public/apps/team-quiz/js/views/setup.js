/* เริ่มการแข่งขันใหม่: ข้อมูลการแข่งขัน → ชุดคำถาม → รูปแบบเกม/กติกา → ทีม 2–8 ทีม → เริ่ม */
(function () {
    'use strict';
    const esc = U.esc;
    const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const today = () => { const d = new Date(); return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`; };

    let draft = null;

    function genericTeam(i) {
        return { id: `t${i + 1}`, name: `ทีม ${i + 1}`, color: Engine.TEAM_COLORS[i % Engine.TEAM_COLORS.length], icon: Engine.TEAM_ICONS[i % Engine.TEAM_ICONS.length], members: [], key: Store.data.settings.keys[i] || '', from: '' };
    }
    function fromSaved(t, i) {
        return { id: `t${i + 1}`, name: t.name, color: t.color, icon: t.icon, members: t.members.slice(), key: Store.data.settings.keys[i] || '', from: t.id };
    }

    function newDraft(params) {
        const d = Store.data;
        const st = d.settings;
        const setId = params.set && Store.set(params.set) ? params.set : (d.sets[0] ? d.sets[0].id : '');
        const set = Store.set(setId);
        const saved = d.teams.slice(0, 4);
        return {
            title: set ? `การแข่งขันตอบคำถาม${set.subject ? ` ${set.subject}` : ''}` : 'การแข่งขันตอบคำถาม',
            subtitle: '',
            dateText: today(),
            place: '',
            judges: ['', '', ''],
            setId,
            count: 0,
            shuffle: false,
            mode: params.mode && Engine.MODES[params.mode] ? params.mode : (set && hasCategories(set) ? 'jeopardy' : 'mc'),
            time: st.time,
            points: st.points,
            penalty: st.penalty,
            letters: st.letters,
            sound: st.sound,
            touchBuzz: st.touchBuzz,
            saveTeams: false,
            teams: saved.length >= 2 ? saved.map(fromSaved) : [0, 1, 2, 3].map(genericTeam),
        };
    }
    const hasCategories = (set) => new Set(set.questions.map((q) => q.category).filter(Boolean)).size >= 2;

    function setInfo(set) {
        if (!set) return '';
        const mc = set.questions.filter((q) => q.type === 'mc').length;
        const tx = set.questions.length - mc;
        const g = Engine.jeopardyGrid(set.questions);
        const img = set.questions.filter((q) => q.image).length;
        return `<div class="set-info">
            ${UI.setIcon(set)}
            <div class="min-w-0"><b>${esc(set.name)}</b><small>${esc([set.subject, set.level].filter(Boolean).join(' • '))}</small>
                <div class="mini-stats mt-1">
                    <span class="kv">ทั้งหมด <b>${set.questions.length}</b> ข้อ</span>
                    <span class="kv">เลือกตอบ <b>${mc}</b></span>
                    <span class="kv">เขียนตอบ <b>${tx}</b></span>
                    ${img ? `<span class="kv">มีรูป <b>${img}</b></span>` : ''}
                    ${hasCategories(set) ? `<span class="kv">Jeopardy <b>${g.cats.length} หมวด × ${g.rows}</b></span>` : ''}
                </div></div></div>`;
    }

    function modeHint(dr, set) {
        if (!set) return '';
        const mc = set.questions.filter((q) => q.type === 'mc').length;
        if (dr.mode === 'jeopardy' && !hasCategories(set)) return '<div class="note warn mt-2"><i class="fas fa-triangle-exclamation"></i><div>ชุดคำถามนี้ยังไม่ได้แบ่ง<b>หมวด</b> กระดาน Jeopardy จะมีหมวดเดียว — ใส่หมวดให้คำถามได้ที่หน้าคลังคำถาม (เช่น 5 หมวด หมวดละ 100–500 คะแนน)</div></div>';
        if (dr.mode === 'mc' && mc < set.questions.length) return `<div class="note mt-2"><i class="fas fa-circle-info"></i><div>มีคำถามแบบเขียนตอบ ${set.questions.length - mc} ข้อ — ข้อเหล่านั้นครูกดถูก/ผิดให้แต่ละทีมแทนการเลือก ก–ง</div></div>`;
        if (dr.mode === 'buzz' || dr.mode === 'jeopardy') return '<div class="note mt-2"><i class="fas fa-keyboard"></i><div>แต่ละทีมกด<b>ปุ่มประจำทีม</b>บนแป้นพิมพ์ (ตั้งได้ในตารางทีมด้านล่าง) ใช้แป้นตัวเลขแยก/คีย์บอร์ด USB หลายชุด หรือชุดปุ่มกดออด USB ที่ส่งค่าเป็นแป้นพิมพ์ก็ได้ • ครูกดเลือกทีมที่ยกมือก่อนในหน้าจอควบคุมก็ได้</div></div>';
        return '';
    }

    function teamRows(dr) {
        const keys = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
        const keyOpts = (v) => `<option value="">— ไม่มี —</option>${['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ...keys.slice(0, 26)].map((k) => `<option value="${k}"${k === v ? ' selected' : ''}>${k.toUpperCase()}</option>`).join('')}`;
        return dr.teams.map((t, i) => `
            <div class="team-row" data-i="${i}">
                <button type="button" class="team-ic lg pick-look" style="--c:${esc(t.color)}" data-look="${i}" title="เปลี่ยนสี/ไอคอน"><i class="fas ${esc(t.icon)}"></i><span class="pen"><i class="fas fa-palette"></i></span></button>
                <div class="tr-fields">
                    <input class="form-control fw-bold" data-f="name" value="${esc(t.name)}" placeholder="ชื่อทีม" maxlength="40" aria-label="ชื่อทีม ${i + 1}">
                    <input class="form-control form-control-sm" data-f="members" value="${esc(t.members.join(', '))}" placeholder="สมาชิก (คั่นด้วยจุลภาค) — ใช้ในใบประกาศผล/รายงาน" aria-label="สมาชิกทีม ${i + 1}">
                </div>
                <label class="tr-key" title="ปุ่มกดออดของทีม"><span><i class="fas fa-bell"></i> ปุ่ม</span><select class="form-select form-select-sm" data-f="key" aria-label="ปุ่มกดออดทีม ${i + 1}">${keyOpts(t.key)}</select></label>
                <button type="button" class="icon-btn del" data-del="${i}" title="ลบทีมนี้"${dr.teams.length <= Engine.MIN_TEAMS ? ' disabled' : ''}><i class="fas fa-trash"></i></button>
            </div>`).join('');
    }

    function render(el, params) {
        const d = Store.data;
        if (!draft || params.set || params.mode) draft = newDraft(params);
        const dr = draft;
        if (!d.sets.length) {
            el.innerHTML = `${U.hero({ icon: 'fa-flag-checkered', title: 'เริ่มการแข่งขันใหม่', sub: 'เลือกชุดคำถาม รูปแบบเกม และทีมผู้เข้าแข่งขัน' })}
                <div class="panel"><div class="panel-body">${UI.empty('fa-layer-group', 'ยังไม่มีชุดคำถาม', 'ต้องมีชุดคำถามอย่างน้อย 1 ชุดก่อนเริ่มการแข่งขัน', '<a class="btn-x primary" href="#/sets"><i class="fas fa-layer-group"></i>ไปที่คลังคำถาม</a>')}</div></div>`;
            return;
        }
        const set = Store.set(dr.setId);
        const live = Link.state && Link.state.status === 'playing';
        el.innerHTML = `
            ${U.hero({ icon: 'fa-flag-checkered', title: 'เริ่มการแข่งขันใหม่', sub: 'เลือกชุดคำถาม รูปแบบเกม และทีมผู้เข้าแข่งขัน แล้วกด "เริ่มการแข่งขัน"' })}
            ${live ? `<div class="note warn"><i class="fas fa-circle-play"></i><div>มีการแข่งขัน <b>${esc(Link.state.title)}</b> กำลังเล่นอยู่ — ถ้าเริ่มใหม่ เกมเดิมจะหยุดและเก็บผลไว้ที่ "ผลการแข่งขัน" <a href="#/control">กลับไปเกมเดิม</a></div></div>` : ''}
            <div class="row g-3">
                <div class="col-xl-6">
                    <div class="panel panel--theme mb-3">
                        <div class="panel-head"><span class="msec-n">1</span><div><h3>ข้อมูลการแข่งขัน</h3><small>แสดงบนจอและใช้ในใบประกาศผล/รายงาน</small></div></div>
                        <div class="panel-body">
                            <label class="form-label">ชื่อการแข่งขัน <span class="text-danger">*</span></label>
                            <input class="form-control mb-2" id="su-title" value="${esc(dr.title)}" maxlength="120">
                            <label class="form-label">ชื่อกิจกรรม / คำบรรยาย</label>
                            <input class="form-control mb-2" id="su-subtitle" value="${esc(dr.subtitle)}" placeholder="เช่น กิจกรรมสัปดาห์วิทยาศาสตร์ ปีการศึกษา ${d.school.academicYear || ''}" maxlength="140">
                            <div class="row g-2">
                                <div class="col-sm-6"><label class="form-label">วันที่แข่งขัน</label><input class="form-control" id="su-date" value="${esc(dr.dateText)}" placeholder="เช่น 19 ตุลาคม 2569"></div>
                                <div class="col-sm-6"><label class="form-label">สถานที่</label><input class="form-control" id="su-place" value="${esc(dr.place)}" placeholder="เช่น หอประชุมโรงเรียน"></div>
                            </div>
                            <label class="form-label mt-2">คณะกรรมการตัดสิน (ใช้ในช่องลงนาม เว้นว่างได้)</label>
                            <div class="row g-2">${dr.judges.map((j, i) => `<div class="col-sm-4"><input class="form-control form-control-sm" data-judge="${i}" value="${esc(j)}" placeholder="${i === 0 ? 'ประธานกรรมการ' : `กรรมการ ${i + 1}`}"></div>`).join('')}</div>
                        </div>
                    </div>
                    <div class="panel panel--theme mb-3">
                        <div class="panel-head"><span class="msec-n">2</span><div><h3>ชุดคำถาม</h3><small>สร้าง/แก้ไขได้ที่ "คลังคำถาม"</small></div></div>
                        <div class="panel-body">
                            <select class="form-select mb-2" id="su-set">${d.sets.map((s) => `<option value="${esc(s.id)}"${s.id === dr.setId ? ' selected' : ''}>${esc(s.name || 'ไม่มีชื่อ')} (${s.questions.length} ข้อ)</option>`).join('')}</select>
                            <div id="su-setinfo">${setInfo(set)}</div>
                            <div class="row g-2 mt-1" id="su-count-row"${dr.mode === 'jeopardy' ? ' hidden' : ''}>
                                <div class="col-sm-6"><label class="form-label">จำนวนข้อที่ใช้</label>
                                    <select class="form-select" id="su-count"><option value="0">ทุกข้อ (${set ? set.questions.length : 0} ข้อ)</option>${[5, 10, 15, 20, 25, 30, 40, 50].filter((n) => set && n < set.questions.length).map((n) => `<option value="${n}"${n === dr.count ? ' selected' : ''}>${n} ข้อ</option>`).join('')}</select></div>
                                <div class="col-sm-6 d-flex align-items-end"><label class="check-line"><input type="checkbox" class="form-check-input" id="su-shuffle"${dr.shuffle ? ' checked' : ''}><span>สลับลำดับคำถาม (สุ่มข้อ)</span></label></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-6">
                    <div class="panel panel--theme mb-3">
                        <div class="panel-head"><span class="msec-n">3</span><div><h3>รูปแบบเกมและกติกา</h3><small>ค่าเริ่มต้นตั้งได้ที่หน้า "ตั้งค่า"</small></div></div>
                        <div class="panel-body">
                            <div class="mode-grid">${UI.modeCards('su-mode', dr.mode)}</div>
                            <div id="su-modehint">${modeHint(dr, set)}</div>
                            <div class="row g-2 mt-2">
                                <div class="col-6 col-md-3"><label class="form-label">เวลาต่อข้อ (วินาที)</label><input class="form-control" id="su-time" type="number" inputmode="numeric" min="0" max="600" value="${dr.time}"><div class="form-text">0 = ไม่จับเวลา</div></div>
                                <div class="col-6 col-md-3"><label class="form-label">คะแนนต่อข้อ</label><input class="form-control" id="su-points" type="number" inputmode="numeric" min="1" value="${dr.points}"><div class="form-text">ใช้เมื่อข้อนั้นไม่ได้กำหนด</div></div>
                                <div class="col-6 col-md-3"><label class="form-label">ตอบผิดหักคะแนน</label><input class="form-control" id="su-penalty" type="number" inputmode="numeric" min="0" value="${dr.penalty}"><div class="form-text">0 = ไม่หัก</div></div>
                                <div class="col-6 col-md-3"><label class="form-label">ตัวเลือก</label><select class="form-select" id="su-letters"><option value="th"${dr.letters === 'th' ? ' selected' : ''}>ก ข ค ง</option><option value="en"${dr.letters === 'en' ? ' selected' : ''}>A B C D</option></select></div>
                            </div>
                            <div class="d-flex flex-wrap gap-3 mt-2">
                                <label class="check-line"><input type="checkbox" class="form-check-input" id="su-sound"${dr.sound ? ' checked' : ''}><span>เสียงประกอบ</span></label>
                                <label class="check-line"><input type="checkbox" class="form-check-input" id="su-touch"${dr.touchBuzz ? ' checked' : ''}><span>แตะชื่อทีมบนจอแสดงผลเพื่อกดออด (จอสัมผัส/กระดานอัจฉริยะ)</span></label>
                            </div>
                        </div>
                    </div>
                    <div class="panel panel--theme mb-3">
                        <div class="panel-head"><span class="msec-n">4</span><div><h3>ทีมผู้เข้าแข่งขัน <span class="num-pill" id="su-tcount">${dr.teams.length}</span></h3><small>2–8 ทีม • กดไอคอนเพื่อเปลี่ยนสี</small></div>
                            <div class="panel-tools">
                                <button type="button" class="btn-x ghost sm" id="su-pick"${d.teams.length ? '' : ' disabled'}><i class="fas fa-users"></i>เลือกจากทีมที่บันทึกไว้</button>
                                <button type="button" class="btn-x soft sm" id="su-add"><i class="fas fa-plus"></i>เพิ่มทีม</button>
                            </div></div>
                        <div class="panel-body">
                            <div id="su-teams">${teamRows(dr)}</div>
                            <label class="check-line mt-2"><input type="checkbox" class="form-check-input" id="su-save"${dr.saveTeams ? ' checked' : ''}><span>บันทึกทีมเหล่านี้ไว้ใช้ครั้งต่อไป (หน้า "ทีมผู้เข้าแข่งขัน")</span></label>
                        </div>
                    </div>
                </div>
            </div>
            <div class="sticky-actions">
                <span class="me-auto hint d-none d-md-inline"><i class="fas fa-circle-info"></i> เริ่มแล้วกด "เปิดจอแสดงผล" เพื่อขึ้นโปรเจกเตอร์</span>
                <button type="button" class="btn-x cta lg" id="su-start"><i class="fas fa-play"></i>เริ่มการแข่งขัน</button>
            </div>`;
        bind(el);
    }

    function readForm(el) {
        const dr = draft;
        const v = (id) => el.querySelector(id).value;
        dr.title = U.norm(v('#su-title'));
        dr.subtitle = U.norm(v('#su-subtitle'));
        dr.dateText = U.norm(v('#su-date'));
        dr.place = U.norm(v('#su-place'));
        dr.judges = U.$$('[data-judge]', el).map((i) => U.norm(i.value));
        dr.setId = v('#su-set');
        dr.count = U.toInt(v('#su-count'), 0);
        dr.shuffle = el.querySelector('#su-shuffle').checked;
        const m = el.querySelector('input[name="su-mode"]:checked');
        dr.mode = m ? m.value : 'mc';
        dr.time = Math.max(0, Math.min(600, U.toInt(v('#su-time'), 30)));
        dr.points = Math.max(1, U.toNum(v('#su-points'), 10));
        dr.penalty = Math.max(0, U.toNum(v('#su-penalty'), 0));
        dr.letters = v('#su-letters');
        dr.sound = el.querySelector('#su-sound').checked;
        dr.touchBuzz = el.querySelector('#su-touch').checked;
        dr.saveTeams = el.querySelector('#su-save').checked;
        U.$$('.team-row', el).forEach((row) => {
            const t = dr.teams[+row.dataset.i];
            t.name = U.norm(row.querySelector('[data-f="name"]').value);
            t.members = row.querySelector('[data-f="members"]').value.split(/[,\n]/).map(U.norm).filter(Boolean).slice(0, 12);
            t.key = row.querySelector('[data-f="key"]').value;
        });
    }

    function redrawTeams(el) {
        el.querySelector('#su-teams').innerHTML = teamRows(draft);
        el.querySelector('#su-tcount').textContent = draft.teams.length;
        el.querySelector('#su-add').disabled = draft.teams.length >= Engine.MAX_TEAMS;
    }

    function bind(el) {
        const dr = draft;
        el.addEventListener('input', () => readForm(el));
        el.addEventListener('change', (e) => {
            readForm(el);
            if (e.target.id === 'su-set' || e.target.name === 'su-mode') {
                const set = Store.set(dr.setId);
                if (e.target.id === 'su-set' && set) {
                    el.querySelector('#su-setinfo').innerHTML = setInfo(set);
                    // ชื่อการแข่งขันที่ระบบตั้งให้ → เปลี่ยนตามวิชาของชุดคำถาม (ถ้าครูพิมพ์เองจะไม่เปลี่ยน)
                    if (/^การแข่งขันตอบคำถาม/.test(dr.title)) { dr.title = `การแข่งขันตอบคำถาม${set.subject ? ` ${set.subject}` : ''}`; el.querySelector('#su-title').value = dr.title; }
                    dr.count = 0;
                    el.querySelector('#su-count').innerHTML = `<option value="0">ทุกข้อ (${set.questions.length} ข้อ)</option>${[5, 10, 15, 20, 25, 30, 40, 50].filter((n) => n < set.questions.length).map((n) => `<option value="${n}">${n} ข้อ</option>`).join('')}`;
                    if (hasCategories(set) && dr.mode !== 'jeopardy') {
                        const card = el.querySelector('input[name="su-mode"][value="jeopardy"]');
                        if (card) { card.checked = true; dr.mode = 'jeopardy'; }
                    }
                }
                el.querySelector('#su-count-row').hidden = dr.mode === 'jeopardy';
                el.querySelector('#su-modehint').innerHTML = modeHint(dr, set);
                if (dr.mode === 'jeopardy' && dr.points < 100 && !el.dataset.ptsTouched) { dr.points = 100; el.querySelector('#su-points').value = 100; }
            }
            if (e.target.id === 'su-points') el.dataset.ptsTouched = '1';
        });
        el.querySelector('#su-add').onclick = () => {
            readForm(el);
            if (dr.teams.length >= Engine.MAX_TEAMS) return;
            const i = dr.teams.length;
            const used = new Set(dr.teams.map((t) => t.color));
            const t = genericTeam(i);
            t.color = Engine.TEAM_COLORS.find((c) => !used.has(c)) || t.color;
            const usedKeys = new Set(dr.teams.map((x) => x.key));
            if (usedKeys.has(t.key)) t.key = Engine.DEFAULT_KEYS.find((k) => !usedKeys.has(k)) || '';
            dr.teams.push(t);
            redrawTeams(el);
        };
        el.querySelector('#su-teams').addEventListener('click', async (e) => {
            const del = e.target.closest('[data-del]');
            const look = e.target.closest('[data-look]');
            if (del) {
                readForm(el);
                if (dr.teams.length <= Engine.MIN_TEAMS) return;
                dr.teams.splice(+del.dataset.del, 1);
                redrawTeams(el);
            } else if (look) {
                readForm(el);
                const t = dr.teams[+look.dataset.look];
                const r = await UI.sheet({
                    title: `สีและไอคอน: ${t.name || 'ทีม'}`, icon: 'fa-palette', width: 560,
                    body: `<label class="form-label">สีทีม</label>${UI.colorPicker('lk-color', t.color)}<label class="form-label mt-3">ไอคอน</label>${UI.iconPicker('lk-icon', t.icon, t.color)}`,
                    confirmText: '<i class="fas fa-check"></i> ใช้แบบนี้',
                    didOpen: (pop) => pop.addEventListener('change', () => { const c = pop.querySelector('input[name="lk-color"]:checked'); if (c) pop.querySelector('.icon-pick').style.setProperty('--c', c.value); }),
                    preConfirm: () => ({ color: (document.querySelector('input[name="lk-color"]:checked') || {}).value, icon: (document.querySelector('input[name="lk-icon"]:checked') || {}).value }),
                });
                if (r.isConfirmed) { Object.assign(t, { color: r.value.color || t.color, icon: r.value.icon || t.icon }); redrawTeams(el); }
            }
        });
        el.querySelector('#su-pick').onclick = async () => {
            readForm(el);
            const list = Store.data.teams;
            const chosen = new Set(dr.teams.map((t) => t.from).filter(Boolean));
            const r = await UI.sheet({
                title: 'เลือกทีมที่บันทึกไว้', icon: 'fa-users', width: 640, sub: 'เลือก 2–8 ทีม (แทนที่รายชื่อทีมปัจจุบัน)',
                body: `<div class="pick-teams">${list.map((t) => `<label class="pick-team"><input type="checkbox" class="form-check-input" value="${esc(t.id)}"${chosen.has(t.id) ? ' checked' : ''}>${UI.teamIcon(t)}<div class="min-w-0"><b>${esc(t.name)}</b><small>${esc(t.members.join(', ') || t.note || '-')}</small></div></label>`).join('')}</div>`,
                confirmText: '<i class="fas fa-check"></i> ใช้ทีมที่เลือก',
                preConfirm: () => {
                    const ids = U.$$('.pick-team input:checked').map((i) => i.value);
                    if (ids.length < 2 || ids.length > 8) { Swal.showValidationMessage('กรุณาเลือก 2–8 ทีม'); return false; }
                    return ids;
                },
            });
            if (!r.isConfirmed) return;
            dr.teams = r.value.map((id, i) => fromSaved(Store.team(id), i));
            redrawTeams(el);
        };
        el.querySelector('#su-start').onclick = () => start(el);
    }

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a;
    }

    async function start(el) {
        readForm(el);
        const dr = draft;
        const set = Store.set(dr.setId);
        const errs = [];
        if (!dr.title) errs.push('กรุณาใส่ชื่อการแข่งขัน');
        if (!set || !set.questions.length) errs.push('ชุดคำถามที่เลือกยังไม่มีคำถาม');
        if (dr.teams.length < 2 || dr.teams.length > 8) errs.push('ต้องมีทีม 2–8 ทีม');
        if (dr.teams.some((t) => !t.name)) errs.push('กรุณาใส่ชื่อทีมให้ครบทุกทีม');
        const names = dr.teams.map((t) => t.name);
        if (new Set(names).size !== names.length) errs.push('ชื่อทีมซ้ำกัน');
        if (set) {
            const bad = set.questions.filter((q) => !q.text || (q.type === 'mc' ? q.choices.filter(Boolean).length < 2 : !q.answer));
            if (bad.length) errs.push(`ชุดคำถามมี ${bad.length} ข้อที่ยังกรอกไม่ครบ (ไม่มีคำถาม/ตัวเลือก/เฉลย) — แก้ที่คลังคำถามก่อน`);
        }
        if (dr.mode === 'buzz' || dr.mode === 'jeopardy') {
            const keys = dr.teams.map((t) => t.key).filter(Boolean);
            if (new Set(keys).size !== keys.length) errs.push('ปุ่มกดออดของแต่ละทีมต้องไม่ซ้ำกัน');
        }
        if (errs.length) { U.alert('ยังเริ่มไม่ได้', `<ul class="text-start mb-0">${errs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`, 'warning'); return; }
        const cur = Link.state;
        if (cur && cur.status === 'playing') {
            const ok = await U.confirm('หยุดเกมที่กำลังเล่นอยู่?', `เกม <b>${esc(cur.title)}</b> จะหยุด และเก็บผลล่าสุดไว้ที่หน้า "ผลการแข่งขัน" (สถานะ: ยังไม่จบ)`, { confirmText: 'เริ่มเกมใหม่', danger: true });
            if (!ok) return;
            Store.upsertMatch(Engine.toRecord(cur));
        }
        let deck = set.questions.map((q) => Engine.clone(q));
        if (dr.mode !== 'jeopardy') {
            if (dr.shuffle) deck = shuffle(deck);
            if (dr.count > 0) deck = deck.slice(0, dr.count);
        }
        const id = U.uid('m');
        const live = Engine.newLive({
            id, title: dr.title, subtitle: dr.subtitle, setName: set.name, dateText: dr.dateText, mode: dr.mode,
            opts: { time: dr.time, points: dr.points, penalty: dr.penalty, letters: dr.letters, sound: dr.sound, volume: Store.data.settings.volume, touchBuzz: dr.touchBuzz },
            teams: dr.teams.map((t) => ({ id: t.id, name: t.name, color: t.color, icon: t.icon, members: t.members, key: t.key })),
            deck,
        });
        if (dr.saveTeams) {
            dr.teams.forEach((t) => {
                const ex = t.from && Store.team(t.from);
                if (ex) Object.assign(ex, { name: t.name, color: t.color, icon: t.icon, members: t.members.slice() });
                else if (!Store.data.teams.some((x) => x.name === t.name)) { const nt = Object.assign(Store.newTeam(), { name: t.name, color: t.color, icon: t.icon, members: t.members.slice() }); Store.data.teams.push(nt); t.from = nt.id; }
            });
        }
        Link.start(live);
        Store.upsertMatch(Engine.toRecord(live, { place: dr.place, judges: dr.judges.filter(Boolean) }));
        draft = null;
        U.toast('เริ่มการแข่งขันแล้ว — กด "เปิดจอแสดงผล" เพื่อแสดงบนโปรเจกเตอร์', { type: 'ok', ms: 4500 });
        App.go('control');
    }

    window.Views.setup = { render, refresh(reason) { if (reason === 'replace') { draft = null; App.render(); } } };
})();
