/* หน้าหลัก: นาฬิกาจับเวลา (ถอยหลัง / จับเวลา / นาฬิกาปัจจุบัน) */
(function () {
    'use strict';

    const C = window.TimerCore;
    let root = null;
    let disp = null;
    let ctrlKey = '';
    let sideKey = '';

    const MODES = [
        { v: 'countdown', label: 'ถอยหลัง', icon: 'fa-hourglass-half' },
        { v: 'stopwatch', label: 'จับเวลา', icon: 'fa-stopwatch' },
        { v: 'clock', label: 'นาฬิกา', icon: 'fa-clock' },
    ];

    function render(el) {
        root = el;
        if (disp) disp.destroy();
        el.innerHTML = `
            <div class="tm-head">
                <div class="seg tm-modes" role="tablist">${MODES.map((m) => `<button type="button" data-view="${m.v}" role="tab"><i class="fas ${m.icon}"></i>${m.label}<span class="tm-mini" data-mini="${m.v}"></span></button>`).join('')}</div>
                <div class="tm-head-r">
                    <button type="button" class="btn-x ghost sm tb-hide-sm" id="tm-keys"><i class="fas fa-keyboard"></i>คีย์ลัด</button>
                    <button type="button" class="btn-x primary" id="tm-full"><i class="fas fa-expand"></i>เต็มจอ <kbd class="kbd-hint">F</kbd></button>
                </div>
            </div>
            <div class="tm-grid">
                <div class="tm-left">
                    <div class="tm-display" id="tm-display"></div>
                    <div class="tm-controls" id="tm-controls"></div>
                </div>
                <div class="tm-side" id="tm-side"></div>
            </div>`;
        disp = Display(el.querySelector('#tm-display'), { onSeg: (i) => Timer.goTo(i) });
        el.querySelector('.tm-modes').addEventListener('click', (e) => {
            const b = e.target.closest('[data-view]');
            if (b) Timer.setView(b.dataset.view);
        });
        el.querySelector('#tm-full').onclick = () => Stage.open('timer');
        el.querySelector('#tm-keys').onclick = App.showKeys;
        el.querySelector('#tm-controls').addEventListener('click', onCtrl);
        el.querySelector('#tm-side').addEventListener('click', onSide);
        el.querySelector('#tm-side').addEventListener('submit', onSubmit);
        el.querySelector('#tm-side').addEventListener('input', onInput);
        ctrlKey = '';
        sideKey = '';
        refresh();
    }

    /* ---------- ปุ่มควบคุมใต้จอ ---------- */
    function controlsHtml() {
        const v = Timer.view;
        const B = (act, icon, label, cls, dis, kbd) => `<button type="button" class="btn-x ${cls}" data-act="${act}"${dis ? ' disabled' : ''}><i class="fas ${icon}"></i><span>${label}</span>${kbd ? `<kbd class="kbd-hint">${kbd}</kbd>` : ''}</button>`;
        if (v === 'countdown') {
            const s = Timer.snap('countdown');
            const seq = s.count > 1;
            let main;
            if (s.finished) main = B('toggle', 'fa-rotate-left', 'เริ่มใหม่', 'primary lg tm-main', false, 'Space');
            else if (s.running) main = B('toggle', 'fa-pause', 'หยุดชั่วคราว', 'orange lg tm-main', false, 'Space');
            else main = B('toggle', 'fa-play', s.started ? 'เดินต่อ' : 'เริ่ม', 'green lg tm-main', s.segMs <= 0, 'Space');
            return `
                ${seq ? B('prev', 'fa-backward-step', 'ช่วงก่อน', 'ghost', s.index === 0) : ''}
                ${B('minus', 'fa-minus', '1 นาที', 'ghost', s.finished)}
                ${main}
                ${B('plus', 'fa-plus', '1 นาที', 'ghost', false)}
                ${seq ? B('next', 'fa-forward-step', 'ช่วงถัดไป', s.waiting ? 'primary pulse' : 'ghost', s.index >= s.count - 1, 'N') : ''}
                ${B('reset', 'fa-arrow-rotate-left', 'รีเซ็ต', 'ghost', !s.started && !s.finished, 'R')}`;
        }
        if (v === 'stopwatch') {
            const s = Timer.snap('stopwatch');
            return `
                ${B('lap', 'fa-flag', 'บันทึกรอบ', 'ghost', !s.running, 'L')}
                ${s.running ? B('toggle', 'fa-pause', 'หยุดชั่วคราว', 'orange lg tm-main', false, 'Space') : B('toggle', 'fa-play', s.started ? 'เดินต่อ' : 'เริ่มจับเวลา', 'green lg tm-main', false, 'Space')}
                ${B('reset', 'fa-arrow-rotate-left', 'รีเซ็ต', 'ghost', !s.started, 'R')}`;
        }
        return `<div class="tm-clock-hint"><i class="fas fa-circle-info"></i>แสดงเวลาปัจจุบันและคาบเรียน • กด <b>เต็มจอ</b> เพื่อฉายขึ้นจอหน้าห้อง</div>`;
    }

    function onCtrl(e) {
        const b = e.target.closest('[data-act]');
        if (!b || b.disabled) return;
        const a = b.dataset.act;
        if (a === 'toggle') Timer.toggle();
        else if (a === 'reset') App.reset();
        else if (a === 'plus') Timer.adjust(60000);
        else if (a === 'minus') Timer.adjust(-60000);
        else if (a === 'next') Timer.next();
        else if (a === 'prev') Timer.prev();
        else if (a === 'lap') Timer.lap();
    }

    /* ---------- แผงด้านข้าง ---------- */
    function quickPanel() {
        const q = Store.settings.quick;
        const lastMin = Math.floor(Timer.lastMs / 60000);
        const lastSec = Math.round((Timer.lastMs % 60000) / 1000);
        return `
            <div class="panel panel--theme">
                <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-bolt"></i></span><div><h3>ตั้งเวลาถอยหลัง</h3><small>กดปุ่มเวลาด่วนแล้วเริ่มนับทันที (คีย์ลัด 1–5)</small></div></div>
                <div class="panel-body">
                    <div class="quick-grid">${q.map((m, i) => `<button type="button" class="quick-btn" data-quick="${i}"><b>${m % 1 ? m.toFixed(1) : m}</b><small>นาที</small><kbd>${i + 1}</kbd></button>`).join('')}</div>
                    <form class="custom-time" id="tm-custom" autocomplete="off">
                        <label class="form-label mb-1">หรือกำหนดเวลาเอง</label>
                        <div class="ct-row">
                            <div class="ct-field"><input class="form-control" name="min" type="number" inputmode="numeric" min="0" max="999" value="${lastMin}" aria-label="นาที"><span>นาที</span></div>
                            <div class="ct-field"><input class="form-control" name="sec" type="number" inputmode="numeric" min="0" max="59" value="${lastSec}" aria-label="วินาที"><span>วินาที</span></div>
                        </div>
                        <div class="ct-actions">
                            <button type="submit" class="btn-x ghost" name="set" value="set"><i class="fas fa-check"></i>ตั้งเวลา</button>
                            <button type="submit" class="btn-x primary" name="go" value="go"><i class="fas fa-play"></i>ตั้งแล้วเริ่ม</button>
                        </div>
                        <div class="ct-label"><input class="form-control form-control-sm" name="label" maxlength="60" placeholder="ชื่อกิจกรรมบนจอ (ไม่บังคับ) เช่น สอบย่อยบทที่ 3"></div>
                    </form>
                </div>
            </div>`;
    }

    function seqPanel() {
        const cd = Timer.cd;
        if (cd.segments.length > 1) {
            const s = Timer.snap('countdown');
            return `
                <div class="panel panel--orange">
                    <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-layer-group"></i></span><div><h3>${U.esc(cd.title || 'ชุดหลายช่วงเวลา')}</h3><small>${cd.segments.length} ช่วง • รวม ${U.esc(C.fmtWords(s.totalMs))} • ${cd.auto ? 'ไปช่วงถัดไปอัตโนมัติ' : 'รอครูกด "ถัดไป"'}</small></div></div>
                    <div class="panel-body p-0">
                        <ol class="seg-list" id="tm-seglist">${cd.segments.map((g, i) => `<li data-goto="${i}" style="--sc:${g.color || 'var(--ac)'}"><span class="sl-dot">${i + 1}</span><span class="sl-name">${U.esc(g.label || `ช่วงที่ ${i + 1}`)}</span><span class="sl-time">${C.fmt(g.ms)}</span><span class="sl-st"></span></li>`).join('')}</ol>
                        <div class="p-3 pt-2 d-flex gap-2 flex-wrap">
                            <button type="button" class="btn-x ghost sm" data-act="unseq"><i class="fas fa-xmark"></i>เลิกใช้ชุดนี้</button>
                            <a class="btn-x ghost sm" href="#/sequences"><i class="fas fa-pen"></i>แก้ไข/เลือกชุดอื่น</a>
                        </div>
                    </div>
                </div>`;
        }
        const list = Store.data.sequences;
        return `
            <div class="panel panel--orange">
                <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-layer-group"></i></span><div><h3>ชุดหลายช่วงเวลา</h3><small>เช่น อ่าน 5 นาที → อภิปราย 10 นาที → สรุป 3 นาที</small></div>
                    <div class="panel-tools"><a class="btn-x ghost sm" href="#/sequences"><i class="fas fa-gear"></i>จัดการ</a></div></div>
                <div class="panel-body ${list.length ? 'p-0' : ''}">
                    ${list.length ? `<div class="seq-mini">${list.slice(0, 6).map((q) => `
                        <button type="button" class="seq-mini-row" data-useseq="${U.esc(q.id)}">
                            <span class="smr-bar">${q.segments.map((g) => `<i style="background:${g.color};flex-grow:${g.sec}"></i>`).join('')}</span>
                            <b>${U.esc(q.name || 'ชุดไม่มีชื่อ')}</b>
                            <small>${q.segments.length} ช่วง • ${U.esc(C.fmtWords(Store.seqTotal(q) * 1000))}</small>
                            <span class="smr-go"><i class="fas fa-play"></i>ใช้</span>
                        </button>`).join('')}</div>` : `
                        <div class="empty-state sm"><span class="ic-box" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-layer-group"></i></span><h3>ยังไม่มีชุดหลายช่วงเวลา</h3><div>สร้างชุดเวลาที่ใช้บ่อยไว้ใช้ซ้ำได้ทุกคาบ</div><a class="btn-x primary sm" href="#/sequences?new=1"><i class="fas fa-plus"></i>สร้างชุดแรก</a></div>`}
                </div>
            </div>`;
    }

    function lapsPanel() {
        const s = Timer.snap('stopwatch');
        const laps = s.laps;
        const rows = laps.map((t, i) => ({ n: i + 1, lap: t - (i ? laps[i - 1] : 0), total: t }));
        const best = rows.length > 1 ? Math.min(...rows.map((x) => x.lap)) : null;
        const worst = rows.length > 1 ? Math.max(...rows.map((x) => x.lap)) : null;
        return `
            <div class="panel panel--theme">
                <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-flag"></i></span><div><h3>บันทึกรอบ</h3><small>เช่น จับเวลานำเสนองานทีละกลุ่ม • กด L หรือปุ่ม "บันทึกรอบ"</small></div></div>
                <div class="panel-body p-0 dt-wrap">
                    <table class="dt">
                        <thead><tr><th>รอบ</th><th class="num">เวลารอบ</th><th class="num">เวลารวม</th></tr></thead>
                        <tbody>${rows.length ? rows.slice().reverse().map((x) => `<tr><td><b>รอบที่ ${x.n}</b>${x.lap === best ? ' <span class="tag ok">เร็วสุด</span>' : x.lap === worst ? ' <span class="tag warn">นานสุด</span>' : ''}</td><td class="num">${C.fmt(x.lap, { tenths: true })}</td><td class="num text-muted-2">${C.fmt(x.total, { tenths: true })}</td></tr>`).join('') : U.emptyRow(3, 'fa-flag', 'ยังไม่มีรอบ — กดเริ่มจับเวลา แล้วกด "บันทึกรอบ"')}</tbody>
                    </table>
                </div>
            </div>`;
    }

    function clockPanel() {
        const t = Sched.day(Clock.now());
        const sc = Store.data.schedule;
        let body;
        if (!sc.periods.length) {
            body = '<div class="empty-state sm"><span class="ic-box" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-calendar-day"></i></span><h3>ยังไม่ได้ตั้งตารางคาบ</h3><div>ตั้งเวลาคาบเรียนเพื่อดูการนับถอยหลังหมดคาบ</div><a class="btn-x primary sm" href="#/schedule"><i class="fas fa-plus"></i>ตั้งตารางคาบ</a></div>';
        } else if (!t.school) {
            body = `<div class="note"><i class="fas fa-mug-hot"></i><div>วัน${U.esc(t.dayName)} ไม่ใช่วันเรียนตามที่ตั้งไว้</div></div><a class="btn-x ghost sm" href="#/schedule"><i class="fas fa-calendar-day"></i>ดูตารางคาบ</a>`;
        } else {
            body = `<ul class="clock-periods">${t.list.map((x) => `<li class="st-${x.status}"><span>${x.p.start}–${x.p.end}</span><b>${U.esc(x.p.name || Store.KINDS[x.p.kind])}</b><small>${U.esc(x.subject)}</small></li>`).join('')}</ul>
                <div class="p-3 pt-0"><a class="btn-x ghost sm" href="#/schedule"><i class="fas fa-calendar-day"></i>เปิดตารางคาบเรียนวันนี้</a></div>`;
        }
        return `
            <div class="panel panel--green">
                <div class="panel-head"><span class="ic-box sm" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-calendar-day"></i></span><div><h3>คาบเรียนวันนี้</h3><small>วัน${U.esc(t.dayName)}</small></div></div>
                <div class="panel-body ${sc.periods.length && t.school ? 'p-0' : ''}">${body}</div>
            </div>`;
    }

    function tunePanel() {
        const ds = Store.settings.display;
        const so = Store.settings.sound;
        return `
            <div class="panel panel--slate">
                <div class="panel-head"><span class="ic-box sm" style="--a:#475569;--b:#94a3b8"><i class="fas fa-palette"></i></span><div><h3>ปรับด่วน</h3><small>ตั้งค่าทั้งหมดอยู่ที่เมนู "ตั้งค่าการแสดงผลและเสียง"</small></div></div>
                <div class="panel-body">
                    <div class="form-label mb-1">พื้นหลังจอ</div>
                    <div class="bg-swatches">${Store.BGS.map((b) => `<button type="button" class="bg-sw bg-${b.id}${ds.bg === b.id ? ' on' : ''}" data-bg="${b.id}" title="${U.esc(b.name)}" aria-label="${U.esc(b.name)}"><span>12</span></button>`).join('')}</div>
                    <div class="form-label mt-3 mb-1">ความคืบหน้า</div>
                    <div class="seg full">${Object.entries({ bar: 'แถบ', ring: 'วงแหวน', none: 'ไม่แสดง' }).map(([k, t]) => `<button type="button" data-prog="${k}" class="${ds.progress === k ? 'active' : ''}">${t}</button>`).join('')}</div>
                    <div class="tune-sound mt-3">
                        <button type="button" class="btn-x ${so.on ? 'soft' : 'ghost'} sm" data-act="sound"><i class="fas ${so.on ? 'fa-volume-high' : 'fa-volume-xmark'}"></i>${so.on ? 'เสียงเปิด' : 'เสียงปิด'}</button>
                        <input type="range" class="form-range" min="0" max="100" step="5" value="${so.volume}" data-vol aria-label="ความดัง"${so.on ? '' : ' disabled'}>
                        <span class="text-muted-2 small" data-volv>${so.volume}%</span>
                    </div>
                </div>
            </div>`;
    }

    function sideHtml() {
        const v = Timer.view;
        if (v === 'countdown') return quickPanel() + seqPanel() + tunePanel();
        if (v === 'stopwatch') return lapsPanel() + tunePanel();
        return clockPanel() + tunePanel();
    }

    function sideSig() {
        const v = Timer.view;
        const s = Store.settings;
        let k = `${v}|${s.display.bg}|${s.display.progress}|${s.sound.on}|${s.quick.join(',')}|${Store.data.sequences.length}|${Store.data.updatedAt}`;
        if (v === 'countdown') k += `|${Timer.cd.rev}|${Timer.cd.segments.length}|${Timer.cd.title}`;
        if (v === 'stopwatch') k += `|${Timer.sw.laps.length}|${Timer.sw.rev}`;
        if (v === 'clock') { const t = Sched.day(Clock.now()); k += `|${t.list.map((x) => x.status).join('')}`; }
        return k;
    }

    function onSide(e) {
        const q = e.target.closest('[data-quick]');
        if (q) { App.quick(+q.dataset.quick); return; }
        const seq = e.target.closest('[data-useseq]');
        if (seq) {
            const x = Store.sequence(seq.dataset.useseq);
            if (x) { Timer.loadSequence(x); U.toast(`ใช้ชุด "${U.esc(x.name || 'ชุดไม่มีชื่อ')}" แล้ว — กด <b>เริ่ม</b> หรือ Space`, { type: 'ok' }); }
            return;
        }
        const go = e.target.closest('[data-goto]');
        if (go) { Timer.goTo(+go.dataset.goto); return; }
        const bg = e.target.closest('[data-bg]');
        if (bg) { Store.settings.display.bg = bg.dataset.bg; Store.commit('settings'); return; }
        const pr = e.target.closest('[data-prog]');
        if (pr) { Store.settings.display.progress = pr.dataset.prog; Store.commit('settings'); return; }
        const a = e.target.closest('[data-act]');
        if (!a) return;
        if (a.dataset.act === 'unseq') Timer.clearSequence();
        if (a.dataset.act === 'sound') {
            Store.settings.sound.on = !Store.settings.sound.on;
            Store.commit('settings');
            Timer.replan();
            if (!Store.settings.sound.on) Sound.stopAll();
        }
    }

    const saveVol = U.debounce(() => { Store.commit('settings'); Timer.replan(); }, 300);
    function onInput(e) {
        if (e.target.matches('[data-vol]')) {
            Store.settings.sound.volume = +e.target.value;
            const v = root.querySelector('[data-volv]');
            if (v) v.textContent = `${e.target.value}%`;
            saveVol();
        }
    }

    function onSubmit(e) {
        e.preventDefault();
        const f = e.target;
        const min = Math.max(0, U.toInt(f.elements.min.value, 0));
        const sec = Math.max(0, Math.min(59, U.toInt(f.elements.sec.value, 0)));
        const ms = (min * 60 + sec) * 1000;
        if (ms <= 0) { U.toast('กรุณากำหนดเวลามากกว่า 0', { type: 'warn' }); f.elements.min.focus(); return; }
        if (ms > C.MAX_MS) { U.toast('ตั้งได้สูงสุด 99 ชั่วโมง', { type: 'warn' }); return; }
        const go = e.submitter && e.submitter.value === 'go';
        Timer.setCountdown(ms, { start: go, label: U.norm(f.elements.label.value) });
        if (document.activeElement) document.activeElement.blur();
        U.toast(`ตั้งถอยหลัง ${U.esc(C.fmtWords(ms))}${go ? ' และเริ่มนับแล้ว' : ' แล้ว — กด เริ่ม หรือ Space'}`, { type: 'ok', ms: 2200 });
    }

    function refresh() {
        if (!root || !root.isConnected) return;
        root.querySelectorAll('.tm-modes [data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === Timer.view));
        const sig = sideSig();
        if (sig !== sideKey) {
            const side = root.querySelector('#tm-side');
            // อย่าวาดทับระหว่างผู้ใช้พิมพ์ในช่องกำหนดเวลา
            const active = document.activeElement;
            const typing = active && side.contains(active) && active.matches('input');
            if (!typing) { sideKey = sig; side.innerHTML = sideHtml(); }
        }
        frame(Clock.now());
    }

    function frame(now) {
        if (!root || !root.isConnected) return;
        disp.update(now);
        const ctrl = controlsHtml();
        if (ctrl !== ctrlKey) { ctrlKey = ctrl; root.querySelector('#tm-controls').innerHTML = ctrl; }
        // ป้ายเวลาเล็กบนแท็บโหมด (เห็นว่าอีกโหมดยังเดินอยู่)
        const cd = Timer.snap('countdown');
        const sw = Timer.snap('stopwatch');
        const mini = {
            countdown: Timer.view !== 'countdown' && (cd.running || cd.segDone) ? (cd.segDone ? 'หมด' : C.fmt(cd.remaining, { ceil: true })) : '',
            stopwatch: Timer.view !== 'stopwatch' && sw.running ? C.fmt(sw.elapsed) : '',
            clock: '',
        };
        root.querySelectorAll('[data-mini]').forEach((m) => { const t = mini[m.dataset.mini]; if (m.textContent !== t) m.textContent = t; });
        // สถานะช่วงในรายการชุดเวลา
        const list = root.querySelector('#tm-seglist');
        if (list && Timer.view === 'countdown') {
            list.querySelectorAll('li').forEach((li, i) => {
                const st = i < cd.index ? 'done' : i === cd.index ? (cd.segDone ? 'over' : 'cur') : '';
                if (li.dataset.st !== st) {
                    li.dataset.st = st;
                    li.className = st;
                    li.querySelector('.sl-st').innerHTML = st === 'done' ? '<i class="fas fa-check"></i>' : st === 'cur' ? '<i class="fas fa-play"></i>' : st === 'over' ? '<i class="fas fa-bell"></i>' : '';
                }
            });
        }
        if (Timer.view === 'clock') {
            const sig = sideSig();
            if (sig !== sideKey) refresh();
        }
    }

    function flash(html, ms) {
        if (!disp) return;
        disp.opts.flashMsg = { html, until: Clock.now() + (ms || 3000) };
    }

    Timer.on((type) => { if ((type === 'state' || type === 'segment') && App.current === 'timer') refresh(); });

    window.Views = window.Views || {};
    window.Views.timer = { render, refresh, frame, flash, leave() { if (disp) { disp.destroy(); disp = null; } root = null; } };
})();
