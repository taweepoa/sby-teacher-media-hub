/* =====================================================================
   หน้าวงล้อสุ่มชื่อ
   - ผลการสุ่มมาจาก RNG (crypto) ผ่าน Engine.planSpin ก่อนเริ่มหมุน แล้ววงล้อหมุนไปหยุดตรงคนนั้น
   - "ไม่ซ้ำจนกว่าจะครบ": คนที่ถูกสุ่มถูกนำออกจากวงล้อ ครบทุกคนแล้วเริ่มรอบใหม่อัตโนมัติ
   - นำออก/คืนรายคน • ขาดเรียน • ถ่วงน้ำหนัก (ขนาดช่อง = โอกาสจริง) • ทดสอบความยุติธรรม 100,000 ครั้ง
   - คีย์ลัด: Space/Enter = หมุน • F = เต็มจอ • Esc = ออกจากเต็มจอ
   ===================================================================== */
(function () {
    'use strict';

    let root = null;
    let wheel = null;
    let spinning = false;
    let pendingRefresh = false;
    let sig = '';
    let poolTab = 'pool';
    let keyHandler = null;

    const L = () => Store.currentList();
    const st = () => Store.data.settings;
    const isCustom = (l) => l && l.kind === 'custom';
    const unit = (l) => (isCustom(l) ? 'รายการ' : 'คน');

    function personTitle(l, s) {
        return isCustom(l) ? s.firstName : `${s.firstName}${s.lastName ? ` ${s.lastName}` : ''}`;
    }

    function render(el) {
        root = el;
        const d = Store.data;
        if (!d.lists.length) {
            el.innerHTML = `${U.hero({ icon: 'fa-dharmachakra', title: 'วงล้อสุ่มชื่อ', sub: 'สุ่มชื่อนักเรียนตอบคำถามแบบยุติธรรม มีเสียงและเอฟเฟกต์ฉลอง ฉายโปรเจกเตอร์แบบเต็มจอได้' })}${App.noListState('fa-dharmachakra')}`;
            return;
        }
        const l = L();
        el.innerHTML = `
            <div class="wheel-layout">
                <section class="stage-area wheel-stage" id="wh-stage" aria-label="วงล้อสุ่มชื่อ">
                    <div class="stage-top">
                        <div class="stage-title">
                            <span class="stage-ic"><i class="fas fa-dharmachakra"></i></span>
                            <div><b id="wh-name"></b><small id="wh-sub"></small></div>
                        </div>
                        <div class="stage-tools">
                            <div class="stage-select">${App.listSelect(l.id, 'id="wh-list" aria-label="เลือกห้องเรียน/รายการ"')}</div>
                            <button type="button" class="btn-x ghost sm on-dark" id="wh-sound" title="เปิด/ปิดเสียง"></button>
                            ${App.stageButton('on-dark')}
                        </div>
                    </div>
                    <div class="stage-body">
                        <div class="wheel-wrap">
                            <div class="wheel-host" id="wh-host">
                                <button type="button" class="wheel-hub" id="wh-spin" aria-label="หมุนวงล้อ"><span>หมุน!</span></button>
                            </div>
                        </div>
                        <aside class="stage-side" id="wh-side" aria-label="ผู้ที่ถูกสุ่มล่าสุด"></aside>
                    </div>
                    <div class="stage-hint"><i class="fas fa-keyboard"></i>กด <kbd>Space</kbd> หรือ <kbd>Enter</kbd> เพื่อหมุน • <kbd>F</kbd> เต็มจอ • <kbd>Esc</kbd> ออก</div>
                </section>
                <div class="wheel-panels">
                    <div class="panel panel--theme">
                        <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-sliders"></i></span><div><h3>ตั้งค่าการสุ่ม</h3><small>มีผลทันที บันทึกอัตโนมัติ</small></div></div>
                        <div class="panel-body" id="wh-opts"></div>
                    </div>
                    <div class="panel panel--green">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-users"></i></span><div><h3>รายชื่อบนวงล้อ</h3><small>แตะ <i class="fas fa-xmark"></i> เพื่อนำออก • <i class="fas fa-rotate-left"></i> เพื่อคืน</small></div></div>
                        <div class="panel-body" id="wh-pool"></div>
                    </div>
                </div>
            </div>`;

        wheel = new Wheel(el.querySelector('#wh-host'), { onTick: (k) => Sound.tick(k) });
        sig = '';
        el.querySelector('#wh-spin').onclick = spin;
        el.querySelector('#wh-list').onchange = (e) => { Store.setCurrent(e.target.value); };
        el.querySelector('#wh-sound').onclick = () => document.getElementById('tb-sound').click();
        App.bindStage(el, el.querySelector('#wh-stage'));
        keyHandler = (e) => {
            if (App.current !== 'wheel' || e.repeat) return;
            const t = e.target;
            if (t && (t.closest('input, textarea, select, [contenteditable]') || t.closest('.swal2-container'))) return;
            if (App.winOpen() || document.querySelector('.swal2-container')) return;
            if (e.key === ' ' || e.key === 'Enter') {
                if (t && t.closest('button, a') && t.id !== 'wh-spin') return; // ให้ปุ่มที่โฟกัสอยู่ทำงานตามปกติ
                e.preventDefault();
                spin();
            } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                Stage.toggle(root.querySelector('#wh-stage'));
            }
        };
        document.addEventListener('keydown', keyHandler);
        update();
    }

    /* ---------- อัปเดตทุกส่วนตามข้อมูล ---------- */
    function update() {
        if (!root || !wheel) return;
        const l = L();
        const s = st();
        const pool = Store.pool(l);
        const present = Store.present(l);
        const removed = Store.removedOf(l.id).length;
        const absent = l.items.length - present.length;
        const round = Store.roundOf(l.id);

        root.querySelector('#wh-name').textContent = isCustom(l) ? l.name : `ห้อง ${l.name}`;
        root.querySelector('#wh-sub').innerHTML = `บนวงล้อ <b>${pool.length}</b>/${present.length} ${unit(l)}${removed ? ` • นำออกแล้ว ${removed}` : ''}${absent ? ` • ขาดเรียน ${absent}` : ''}${s.noRepeat ? ` • รอบที่ ${round}` : ''}${s.useWeight ? ' • ถ่วงน้ำหนัก' : ''}`;
        const sel = root.querySelector('#wh-list');
        const selHtml = App.listSelect(l.id, 'id="wh-list" aria-label="เลือกห้องเรียน/รายการ"');
        if (sel.outerHTML !== selHtml) {
            sel.outerHTML = selHtml;
            root.querySelector('#wh-list').onchange = (e) => { Store.setCurrent(e.target.value); };
        }
        root.querySelector('#wh-sound').innerHTML = `<i class="fas ${s.sound ? 'fa-volume-high' : 'fa-volume-xmark'}"></i><span class="d-none d-xxl-inline">${s.sound ? 'เสียงเปิด' : 'เสียงปิด'}</span>`;

        // วงล้อ: ตั้งรายชื่อใหม่เฉพาะเมื่อรายชื่อ/น้ำหนัก/รูปแบบเปลี่ยน (ไม่ล้างไฮไลต์โดยไม่จำเป็น)
        const nsig = [l.id, s.label, s.palette, s.useWeight, pool.map((x) => `${x.id}:${x.weight}:${Engine.label(x, s.label)}`).join(',')].join('|');
        if (nsig !== sig) {
            sig = nsig;
            wheel.setItems(pool, { useWeight: s.useWeight, labelFn: (x) => Engine.label(x, isCustom(l) ? 'first' : s.label), palette: Store.PALETTES[s.palette] });
        }
        const hub = root.querySelector('#wh-spin');
        hub.disabled = spinning || (!pool.length && !present.length);
        hub.innerHTML = `<span>${spinning ? '<i class="fas fa-circle-notch fa-spin"></i>' : (!pool.length && present.length ? 'รอบใหม่' : 'หมุน!')}</span>`;
        hub.classList.toggle('is-new', !pool.length && present.length > 0);

        renderSide(l);
        renderOpts(l);
        renderPool(l);
    }

    function renderSide(l) {
        const recent = Store.data.history.filter((h) => h.mode === 'wheel' && h.listId === l.id).slice(0, 6);
        const today = new Date().toDateString();
        const nToday = Store.data.history.filter((h) => h.mode === 'wheel' && h.listId === l.id && new Date(h.at).toDateString() === today).length;
        root.querySelector('#wh-side').innerHTML = `
            <div class="side-head"><i class="fas fa-trophy"></i>ถูกสุ่มล่าสุด<span>${nToday ? `วันนี้ ${nToday} ครั้ง` : ''}</span></div>
            ${recent.length ? `<ol class="side-list">${recent.map((h, i) => {
                const p = h.data.person || {};
                return `<li class="${i === 0 ? 'is-latest' : ''}"><span class="sl-no">${U.esc(p.no !== '' && p.no != null ? p.no : '•')}</span><span class="sl-name">${U.esc(isCustom(l) ? p.first : p.first || p.name)}</span><span class="sl-time">${new Date(h.at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span></li>`;
            }).join('')}</ol>` : '<div class="side-empty"><i class="fas fa-hand-pointer"></i>กดปุ่ม "หมุน!" กลางวงล้อ<br>เพื่อเริ่มสุ่ม</div>'}`;
    }

    function renderOpts(l) {
        const s = st();
        const box = root.querySelector('#wh-opts');
        const weighted = l.items.some((x) => x.weight > 1);
        box.innerHTML = `
            <label class="opt-switch"><input class="form-check-input" type="checkbox" id="wo-norepeat"${s.noRepeat ? ' checked' : ''}${spinning ? ' disabled' : ''}>
                <div><b>ไม่ซ้ำจนกว่าจะครบ</b><small>คนที่ถูกสุ่มจะถูกนำออกจากวงล้อ ครบทุกคนแล้วเริ่มรอบใหม่</small></div></label>
            <label class="opt-switch"><input class="form-check-input" type="checkbox" id="wo-weight"${s.useWeight ? ' checked' : ''}${spinning ? ' disabled' : ''}>
                <div><b>ถ่วงน้ำหนัก</b><small>${weighted ? 'ขนาดช่องบนวงล้อ = โอกาสจริงของแต่ละคน' : 'ทุกคนน้ำหนัก 1 อยู่ — ตั้งน้ำหนักได้ที่หน้า "รายชื่อนักเรียน"'}</small></div></label>
            <div class="row g-2 mt-1">
                <div class="col-7">
                    <label class="form-label" for="wo-dur">เวลาหมุน <b id="wo-dur-v">${s.duration}</b> วินาที</label>
                    <input type="range" class="form-range" id="wo-dur" min="3" max="15" step="1" value="${s.duration}"${spinning ? ' disabled' : ''}>
                </div>
                <div class="col-5">
                    <label class="form-label" for="wo-label">ชื่อบนวงล้อ</label>
                    <select class="form-select form-select-sm" id="wo-label"${isCustom(l) || spinning ? ' disabled' : ''}>${U.options(Object.keys(Store.LABELS).map((k) => ({ value: k, text: Store.LABELS[k] })), s.label)}</select>
                </div>
            </div>
            <div class="d-flex gap-2 flex-wrap mt-2">
                <button type="button" class="btn-x ghost sm" id="wo-fair"><i class="fas fa-scale-balanced"></i>ทดสอบความยุติธรรม</button>
                <button type="button" class="btn-x ghost sm" id="wo-round"${spinning ? ' disabled' : ''}><i class="fas fa-rotate"></i>เริ่มรอบใหม่ (คืนทุกคน)</button>
            </div>`;
        const set = (k, v) => { st()[k] = v; Store.commit('settings'); };
        box.querySelector('#wo-norepeat').onchange = (e) => set('noRepeat', e.target.checked);
        box.querySelector('#wo-weight').onchange = (e) => set('useWeight', e.target.checked);
        const dur = box.querySelector('#wo-dur');
        dur.oninput = () => { box.querySelector('#wo-dur-v').textContent = dur.value; };
        dur.onchange = () => set('duration', +dur.value);
        box.querySelector('#wo-label').onchange = (e) => set('label', e.target.value);
        box.querySelector('#wo-fair').onclick = fairness;
        box.querySelector('#wo-round').onclick = async () => {
            const n = Store.removedOf(l.id).length;
            if (n && !(await U.confirm('เริ่มรอบใหม่?', `คืน <b>${n} ${unit(l)}</b> ที่ถูกนำออกกลับเข้าวงล้อ แล้วเริ่มนับรอบใหม่<br><small>ประวัติการสุ่มยังอยู่ครบ</small>`, { confirmText: 'เริ่มรอบใหม่', icon: 'question' }))) return;
            Store.newRound(l.id);
            U.toast(`เริ่มรอบที่ ${Store.roundOf(l.id)} แล้ว — ทุกคนกลับเข้าวงล้อ`, { type: 'ok', icon: 'fa-rotate' });
        };
    }

    function renderPool(l) {
        const pool = Store.pool(l);
        const remIds = new Set(Store.removedOf(l.id));
        const removed = Store.sortedItems(l).filter((x) => remIds.has(x.id) && x.active);
        const absent = Store.sortedItems(l).filter((x) => !x.active);
        const s = st();
        const tabs = [
            ['pool', `บนวงล้อ`, pool.length],
            ['removed', 'นำออกแล้ว', removed.length],
            ['absent', isCustom(l) ? 'ปิดไว้' : 'ขาดเรียน', absent.length],
        ];
        if (!tabs.some((t) => t[0] === poolTab)) poolTab = 'pool';
        const chip = (x, act) => {
            const w = s.useWeight && x.weight > 1 ? `<em title="น้ำหนัก">×${x.weight}</em>` : '';
            const icon = { remove: 'fa-xmark', back: 'fa-rotate-left', present: 'fa-user-check' }[act];
            const tip = { remove: 'นำออกจากวงล้อ', back: 'คืนกลับวงล้อ', present: 'มาเรียนแล้ว (กลับเข้าวงล้อ)' }[act];
            return `<span class="pchip${act === 'back' ? ' is-out' : act === 'present' ? ' is-absent' : ''}"><span>${U.esc(Engine.label(x, isCustom(l) ? 'first' : 'no-first'))}</span>${w}<button type="button" data-act="${act}" data-id="${U.esc(x.id)}" title="${tip}" aria-label="${tip}"${spinning ? ' disabled' : ''}><i class="fas ${icon}"></i></button></span>`;
        };
        let body = '';
        if (poolTab === 'pool') body = pool.length ? pool.map((x) => chip(x, 'remove')).join('') : `<div class="pool-empty"><i class="fas fa-circle-check"></i>สุ่มครบทุกคนในรอบนี้แล้ว — กด "หมุน" เพื่อเริ่มรอบใหม่</div>`;
        if (poolTab === 'removed') body = removed.length ? removed.map((x) => chip(x, 'back')).join('') : '<div class="pool-empty"><i class="fas fa-inbox"></i>ยังไม่มีคนที่ถูกนำออก</div>';
        if (poolTab === 'absent') body = absent.length ? absent.map((x) => chip(x, 'present')).join('') : `<div class="pool-empty"><i class="fas fa-user-check"></i>${isCustom(l) ? 'ไม่มีรายการที่ปิดไว้' : 'มาเรียนครบทุกคน'} — ทำเครื่องหมายขาดเรียนได้ที่หน้า "รายชื่อนักเรียน"</div>`;
        const box = root.querySelector('#wh-pool');
        box.innerHTML = `
            <div class="seg full mb-2" role="tablist">${tabs.map((t) => `<button type="button" role="tab" data-tab="${t[0]}" class="${poolTab === t[0] ? 'active' : ''}">${t[1]} <span class="cnt-soft">${t[2]}</span></button>`).join('')}</div>
            <div class="pchips">${body}</div>
            ${poolTab === 'removed' && removed.length ? `<button type="button" class="btn-x ghost sm mt-2" id="wp-backall"${spinning ? ' disabled' : ''}><i class="fas fa-rotate-left"></i>คืนทั้งหมด ${removed.length} ${unit(l)}</button>` : ''}`;
        box.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { poolTab = b.dataset.tab; renderPool(l); }; });
        box.querySelectorAll('[data-act]').forEach((b) => {
            b.onclick = () => {
                const id = b.dataset.id;
                if (b.dataset.act === 'remove') Store.removeFromWheel(l.id, id);
                else if (b.dataset.act === 'back') Store.returnToWheel(l.id, id);
                else {
                    const it = l.items.find((x) => x.id === id);
                    if (it) { it.active = true; Store.commit('lists'); }
                }
            };
        });
        const ba = box.querySelector('#wp-backall');
        if (ba) ba.onclick = () => { Store.returnAll(l.id); U.toast('คืนทุกคนกลับวงล้อแล้ว', { type: 'ok' }); };
    }

    /* ---------- หมุน ---------- */
    function setSpinning(v) {
        spinning = v;
        root.querySelector('#wh-stage').classList.toggle('is-spinning', v);
        if (!v && pendingRefresh) { pendingRefresh = false; update(); return; }
        update();
    }

    function spin() {
        if (!root || !wheel || spinning || App.winOpen()) return;
        const l = L();
        const pool = Store.pool(l);
        if (!pool.length) {
            if (!Store.present(l).length) {
                U.alert('ไม่มีรายชื่อให้สุ่ม', l.items.length ? 'ทุกคนถูกทำเครื่องหมายว่าขาดเรียน — แก้ได้ที่แท็บ "ขาดเรียน" หรือหน้า "รายชื่อนักเรียน"' : 'ยังไม่มีรายชื่อในห้องนี้ — เพิ่มได้ที่หน้า "รายชื่อนักเรียน"', 'info');
                return;
            }
            Store.newRound(l.id);
            U.toast(`สุ่มครบทุกคนแล้ว — เริ่มรอบที่ ${Store.roundOf(l.id)} (ทุกคนกลับเข้าวงล้อ)`, { type: 'ok', icon: 'fa-rotate', ms: 3500 });
            setTimeout(spin, 650);
            return;
        }
        Sound.unlock();
        Sound.start();
        const s = st();
        const plan = wheel.spin({ duration: s.duration, onDone: (idx, item) => done(l, item, pool.length) });
        if (plan) setSpinning(true);
    }

    function done(l, item, poolSize) {
        setSpinning(false);
        if (!item || App.current !== 'wheel') return;
        const s = st();
        Store.addHistory('wheel', l, 'สุ่มชื่อ', { person: Engine.snap(item), pool: poolSize, round: Store.roundOf(l.id), weighted: s.useWeight });
        const remove = () => Store.removeFromWheel(l.id, item.id);
        const custom = isCustom(l);
        const subParts = custom ? [U.esc(l.name)] : [
            item.no !== '' ? `เลขที่ <b>${U.esc(item.no)}</b>` : '',
            U.esc(`ห้อง ${l.name}`),
            item.nick ? `ชื่อเล่น <b>${U.esc(item.nick)}</b>` : '',
        ].filter(Boolean);
        const last = poolSize === 1;
        App.showWin({
            kicker: custom ? 'ผลการสุ่ม' : 'ผู้ที่ถูกสุ่มคือ',
            icon: custom ? 'fa-star' : 'fa-crown',
            badge: custom ? '' : item.no,
            title: personTitle(l, item),
            sub: subParts.join(' • '),
            note: s.noRepeat ? (last ? 'คนสุดท้ายของรอบนี้ — หมุนครั้งต่อไปจะเริ่มรอบใหม่' : `นำออกจากวงล้อ (ไม่ซ้ำจนกว่าจะครบ) • เหลือ ${poolSize - 1} ${unit(l)}`) : '',
            color: wheel.colors[wheel.winIndex] || null,
            actions: s.noRepeat ? [
                { label: 'ให้อยู่ในวงล้อต่อ', icon: 'fa-rotate-left', cls: 'ghost' },
                { label: last ? 'เริ่มรอบใหม่' : 'สุ่มคนต่อไป', icon: 'fa-play', cls: 'primary', onClick: () => { remove(); setTimeout(spin, 380); } },
            ] : [
                { label: 'นำออกจากวงล้อ', icon: 'fa-user-minus', cls: 'ghost', onClick: remove },
                { label: 'หมุนอีกครั้ง', icon: 'fa-play', cls: 'primary', onClick: () => setTimeout(spin, 250) },
            ],
            onClose: s.noRepeat ? remove : null,
        });
    }

    /* ---------- ทดสอบความยุติธรรม (จำลอง 100,000 ครั้งด้วยตัวสุ่มเดียวกับวงล้อ) ---------- */
    function fairness() {
        const l = L();
        const pool = Store.pool(l);
        if (pool.length < 2) { U.alert('ทดสอบไม่ได้', 'ต้องมีรายชื่อบนวงล้ออย่างน้อย 2 คน', 'info'); return; }
        const s = st();
        const N = 100000;
        const segs = Engine.segments(pool, s.useWeight);
        const weights = segs.map((x) => x.weight);
        const total = weights.reduce((a, b) => a + b, 0);
        const obs = new Array(segs.length).fill(0);
        const t0 = performance.now();
        for (let i = 0; i < N; i += 1) obs[RNG.pickWeighted(weights)] += 1;
        const ms = performance.now() - t0;
        const exp = weights.map((w) => (N * w) / total);
        const r = RNG.chiSquare(obs, exp);
        const maxDev = Math.max(...obs.map((o, i) => Math.abs(o - exp[i]) / exp[i]));
        const maxBar = Math.max(...obs, ...exp);
        const pass = r.p > 0.001;
        U.sheet({
            title: 'ทดสอบความยุติธรรมของการสุ่ม',
            sub: `จำลองการหมุน ${N.toLocaleString()} ครั้ง ด้วยตัวสุ่มเดียวกับวงล้อ (crypto.getRandomValues) • ${segs.length} ${unit(l)} • ใช้เวลา ${ms.toFixed(0)} มิลลิวินาที`,
            icon: 'fa-scale-balanced',
            tone: ['var(--hero-2)', 'var(--ac)', 'var(--ac-2)'],
            width: 760,
            showCancel: false,
            confirmText: 'ปิด',
            body: `
                <div class="note ${pass ? 'ok' : 'warn'}"><i class="fas ${pass ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i><div>
                    <b>${pass ? 'ผ่าน — ทุกคนมีโอกาสตามที่ควรได้' : 'ผลครั้งนี้เบี่ยงมากกว่าปกติ ลองทดสอบใหม่อีกครั้ง'}</b><br>
                    ${s.useWeight ? 'โอกาสของแต่ละคนเป็นไปตามน้ำหนัก' : `โอกาสของแต่ละคน = 1/${segs.length} = ${(100 / segs.length).toFixed(2)}%`} •
                    ต่างจากค่าที่ควรได้มากสุด ${(maxDev * 100).toFixed(1)}% • ค่าไคสแควร์ ${r.chi2.toFixed(1)} (df ${r.df}, p = ${r.p.toFixed(3)})
                </div></div>
                <div class="fair-legend"><span><i class="lg-bar"></i>จำนวนครั้งที่ถูกสุ่มจริง</span><span><i class="lg-exp"></i>จำนวนที่ควรได้ตามทฤษฎี</span></div>
                <div class="fair-bars">${segs.map((x, i) => `
                    <div class="fb-row"><span class="fb-name">${U.esc(Engine.label(x.item, isCustom(l) ? 'first' : 'no-first'))}</span>
                        <span class="fb-track"><span class="fb-bar" style="width:${((obs[i] / maxBar) * 100).toFixed(2)}%"></span><span class="fb-exp" style="left:${((exp[i] / maxBar) * 100).toFixed(2)}%"></span></span>
                        <span class="fb-val">${obs[i].toLocaleString()}</span></div>`).join('')}
                </div>
                <div class="sheet-hint">ระบบสุ่มผู้ชนะด้วยตัวสุ่มของระบบปฏิบัติการก่อน แล้วจึงหมุนวงล้อไปหยุดที่คนนั้น — ความเร็ว แรงกด หรือจังหวะที่กดปุ่ม ไม่มีผลต่อผลลัพธ์</div>`,
        });
    }

    function refresh(reason) {
        if (!root) return;
        if (!Store.data.lists.length || !root.querySelector('#wh-stage')) { const el = root; leave(); render(el); return; }
        if (spinning) { pendingRefresh = true; return; }
        if (reason === 'history') { renderSide(L()); return; }
        update();
    }

    function leave() {
        if (keyHandler) document.removeEventListener('keydown', keyHandler);
        keyHandler = null;
        if (wheel) wheel.destroy();
        wheel = null;
        spinning = false;
        pendingRefresh = false;
        root = null;
    }

    window.Views = window.Views || {};
    window.Views.wheel = { render, refresh, leave, get wheel() { return wheel; }, spin };
})();
