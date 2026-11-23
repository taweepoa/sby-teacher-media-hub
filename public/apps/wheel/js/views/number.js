/* =====================================================================
   สุ่มตัวเลข: ช่วงตัวเลข จำนวนที่ต้องการ ไม่ซ้ำกับที่ออกไปแล้ว • ตัวเลขหมุนแบบสล็อต
   จับคู่เลขที่กับรายชื่อในห้องได้ (เช่น สุ่มเลขที่ 1–35 แล้วแสดงชื่อ)
   ===================================================================== */
(function () {
    'use strict';

    let root = null;
    let rolling = false;
    let timers = [];
    let keyHandler = null;
    let matchList = true;

    const S = () => Store.data.numberSession;
    const L = () => Store.currentList();

    function render(el) {
        root = el;
        if (keyHandler) document.removeEventListener('keydown', keyHandler);
        el.innerHTML = `
            ${U.hero({ cls: 'hero--number', icon: 'fa-dice', title: 'สุ่มตัวเลข', sub: 'สุ่มเลขที่ เลขข้อสอบ เลขรางวัล ฯลฯ กำหนดช่วงและจำนวนได้ ไม่ซ้ำกับที่ออกไปแล้ว และแสดงชื่อนักเรียนตามเลขที่ได้' })}
            <div class="number-layout">
                <div class="panel panel--theme">
                    <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-sliders"></i></span><div><h3>ตั้งค่า</h3><small id="nm-info"></small></div></div>
                    <div class="panel-body" id="nm-form"></div>
                </div>
                <section class="stage-area number-stage" id="nm-stage">
                    <div class="stage-top">
                        <div class="stage-title"><span class="stage-ic"><i class="fas fa-dice"></i></span><div><b>สุ่มตัวเลข</b><small id="nm-sub"></small></div></div>
                        <div class="stage-tools">${App.stageButton('on-dark')}</div>
                    </div>
                    <div class="num-show" id="nm-show"></div>
                    <div class="num-go"><button type="button" class="btn-x on-white lg" id="nm-go"><i class="fas fa-dice"></i>สุ่มตัวเลข</button></div>
                    <div class="num-drawn" id="nm-drawn"></div>
                </section>
            </div>`;
        App.bindStage(el, el.querySelector('#nm-stage'));
        el.querySelector('#nm-go').onclick = draw;
        keyHandler = (e) => {
            if (App.current !== 'number' || e.repeat) return;
            if (e.target && e.target.closest('input, textarea, select, button, a, .swal2-container')) return;
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); draw(); }
            else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); Stage.toggle(root.querySelector('#nm-stage')); }
        };
        document.addEventListener('keydown', keyHandler);
        renderForm();
        renderShow(lastNumbers(), false);
        renderDrawn();
    }

    function lastNumbers() {
        const h = Store.data.history.find((x) => x.mode === 'number');
        return h ? h.data.numbers : [];
    }

    function nameOf(n) {
        const l = L();
        if (!matchList || !l || l.kind === 'custom') return '';
        const s = l.items.find((x) => x.no === n);
        return s ? `${s.firstName}${s.lastName ? ` ${s.lastName}` : ''}` : '';
    }

    function renderForm() {
        const s = S();
        const l = L();
        const box = root.querySelector('#nm-form');
        const classMax = l && l.kind === 'class' ? Math.max(0, ...l.items.map((x) => (x.no === '' ? 0 : x.no))) : 0;
        box.innerHTML = `
            <div class="row g-2">
                <div class="col-6"><label class="form-label" for="nm-min">ตั้งแต่</label><input class="form-control form-control-lg" id="nm-min" type="number" inputmode="numeric" value="${s.min}"></div>
                <div class="col-6"><label class="form-label" for="nm-max">ถึง</label><input class="form-control form-control-lg" id="nm-max" type="number" inputmode="numeric" value="${s.max}"></div>
                <div class="col-12"><label class="form-label" for="nm-count">จำนวนตัวเลขต่อครั้ง</label>
                    <div class="num-step"><button type="button" data-d="-1" aria-label="ลด"><i class="fas fa-minus"></i></button><input class="form-control" id="nm-count" type="number" min="1" max="50" inputmode="numeric" value="${s.count}"><button type="button" data-d="1" aria-label="เพิ่ม"><i class="fas fa-plus"></i></button></div></div>
            </div>
            <div class="preset-row">
                <span>ช่วงด่วน:</span>
                ${classMax ? `<button type="button" class="chip-btn" data-p="1-${classMax}">เลขที่ ${U.esc(l.name)} (1–${classMax})</button>` : ''}
                <button type="button" class="chip-btn" data-p="1-6">ลูกเต๋า 1–6</button>
                <button type="button" class="chip-btn" data-p="1-10">1–10</button>
                <button type="button" class="chip-btn" data-p="1-100">1–100</button>
            </div>
            <label class="opt-switch mt-2"><input type="checkbox" id="nm-unique"${s.unique ? ' checked' : ''}><div><b>ไม่ซ้ำกับตัวที่ออกแล้ว</b><small>ตัวเลขที่ออกไปแล้วจะไม่ออกซ้ำ จนกว่าจะกด "ล้างตัวเลขที่ออกแล้ว"</small></div></label>
            ${l && l.kind === 'class' ? `<label class="opt-switch"><input type="checkbox" id="nm-match"${matchList ? ' checked' : ''}><div><b>แสดงชื่อตามเลขที่</b><small>จับคู่ตัวเลขกับเลขที่ใน ${U.esc(`ห้อง ${l.name}`)} <a href="#/lists" class="ms-1">เปลี่ยนห้อง</a></small></div></label>` : ''}`;
        const save = () => {
            const mn = U.toInt(box.querySelector('#nm-min').value, 1);
            const mx = U.toInt(box.querySelector('#nm-max').value, mn);
            const prev = `${s.min}-${s.max}`;
            s.min = mn; s.max = mx;
            s.count = Math.max(1, Math.min(50, U.toInt(box.querySelector('#nm-count').value, 1)));
            if (prev !== `${s.min}-${s.max}`) s.drawn = [];
            Store.commit('number');
        };
        box.querySelector('#nm-min').onchange = save;
        box.querySelector('#nm-max').onchange = save;
        box.querySelector('#nm-count').onchange = save;
        box.querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => { const i = box.querySelector('#nm-count'); i.value = Math.max(1, Math.min(50, U.toInt(i.value, 1) + +b.dataset.d)); save(); }; });
        box.querySelectorAll('[data-p]').forEach((b) => {
            b.onclick = () => { const [a, c] = b.dataset.p.split('-').map(Number); s.min = a; s.max = c; s.drawn = []; Store.commit('number'); };
        });
        box.querySelector('#nm-unique').onchange = (e) => { s.unique = e.target.checked; Store.commit('number'); };
        const m = box.querySelector('#nm-match');
        if (m) m.onchange = (e) => { matchList = e.target.checked; renderShow(lastNumbers(), false); };
        const span = Math.abs(s.max - s.min) + 1;
        const left = s.unique ? span - new Set(s.drawn.filter((v) => v >= Math.min(s.min, s.max) && v <= Math.max(s.min, s.max))).size : span;
        root.querySelector('#nm-info').textContent = `${span.toLocaleString()} ตัวเลข${s.unique ? ` • เหลือ ${left.toLocaleString()} ตัว` : ''}`;
        root.querySelector('#nm-sub').textContent = `ช่วง ${Math.min(s.min, s.max).toLocaleString()}–${Math.max(s.min, s.max).toLocaleString()} • ครั้งละ ${s.count} ตัว${s.unique ? ' • ไม่ซ้ำ' : ''}`;
    }

    function renderShow(nums, rollingNow) {
        const box = root.querySelector('#nm-show');
        if (!nums.length) {
            box.innerHTML = '<div class="num-ball big is-empty"><span>?</span></div><div class="num-name">กดปุ่ม "สุ่มตัวเลข" หรือ Space</div>';
            return;
        }
        if (nums.length === 1) {
            const nm = rollingNow ? '' : nameOf(nums[0]);
            box.innerHTML = `<div class="num-ball big${rollingNow ? ' is-rolling' : ' is-final'}"><span>${nums[0].toLocaleString()}</span></div><div class="num-name">${nm ? U.esc(nm) : '&nbsp;'}</div>`;
            return;
        }
        box.innerHTML = `<div class="num-balls">${nums.map((n) => `<div class="num-ball${rollingNow ? ' is-rolling' : ' is-final'}"><span>${n.toLocaleString()}</span>${!rollingNow && nameOf(n) ? `<small>${U.esc(nameOf(n))}</small>` : ''}</div>`).join('')}</div>`;
    }

    function renderDrawn() {
        const s = S();
        const box = root.querySelector('#nm-drawn');
        box.innerHTML = s.drawn.length ? `
            <div class="nd-head"><span><i class="fas fa-clock-rotate-left"></i>ออกแล้ว ${s.drawn.length} ตัว (เรียงตามลำดับที่ออก)</span><button type="button" class="btn-x on-dark sm" id="nm-reset"><i class="fas fa-eraser"></i>ล้างตัวเลขที่ออกแล้ว</button></div>
            <div class="nd-list">${s.drawn.slice(-60).map((v) => `<span>${v.toLocaleString()}</span>`).join('')}${s.drawn.length > 60 ? '<em>…</em>' : ''}</div>` : '';
        const r = box.querySelector('#nm-reset');
        if (r) r.onclick = async () => {
            if (!(await U.confirm('ล้างตัวเลขที่ออกแล้ว?', 'ตัวเลขทุกตัวจะกลับมาสุ่มได้อีกครั้ง (ประวัติการสุ่มยังอยู่)', { confirmText: 'ล้าง', icon: 'question' }))) return;
            S().drawn = [];
            Store.commit('number');
        };
    }

    function draw() {
        if (rolling) return;
        const s = S();
        const res = Engine.drawNumbers(s.min, s.max, s.count, s.unique, s.drawn);
        if (!res.ok) {
            U.alert('สุ่มไม่ได้', `${U.esc(res.error)}${s.unique ? '<br><small>กด "ล้างตัวเลขที่ออกแล้ว" เพื่อเริ่มใหม่ หรือปิด "ไม่ซ้ำ"</small>' : ''}`, 'info');
            return;
        }
        Sound.unlock();
        rolling = true;
        const btn = root.querySelector('#nm-go');
        btn.disabled = true;
        const lo = Math.min(s.min, s.max);
        const hi = Math.max(s.min, s.max);
        const final = res.numbers;
        const steps = 22;
        let k = 0;
        const tick = () => {
            if (!root) return;
            if (k < steps) {
                renderShow(final.map(() => RNG.range(lo, hi)), true);
                Sound.roll();
                k += 1;
                timers.push(setTimeout(tick, 30 + k * k * 0.35)); // ค่อย ๆ ช้าลง (รวมราว 2 วินาที)
                return;
            }
            rolling = false;
            btn.disabled = false;
            s.drawn = s.drawn.concat(final).slice(-5000);
            const l = L();
            const names = final.map((n) => nameOf(n));
            Store.addHistory('number', matchList && l && l.kind === 'class' ? l : null, 'สุ่มตัวเลข', { min: lo, max: hi, count: final.length, unique: s.unique, numbers: final, names: names.some(Boolean) ? names : undefined });
            renderShow(final, false);
            renderForm();
            renderDrawn();
            Sound.win();
            FX.confetti({ count: final.length === 1 ? 140 : 90, y: 0.35 });
        };
        tick();
    }

    function refresh(reason) {
        if (!root || rolling) return;
        if (reason === 'history') return;
        renderForm();
        renderDrawn();
        if (reason === 'current' || reason === 'lists') renderShow(lastNumbers(), false);
    }
    function leave() {
        timers.forEach(clearTimeout);
        timers = [];
        rolling = false;
        if (keyHandler) document.removeEventListener('keydown', keyHandler);
        keyHandler = null;
        root = null;
    }

    window.Views = window.Views || {};
    window.Views.number = { render, refresh, leave };
})();
