/* ตารางคาบเรียนวันนี้: คาบปัจจุบัน + นับถอยหลังหมดคาบ • ตั้งเวลาคาบ • วิชาที่สอนแต่ละวัน • ระฆัง */
(function () {
    'use strict';

    const C = window.TimerCore;
    let root = null;
    let viewDay = null;      // วันที่เลือกดู (null = วันนี้)
    let editDay = null;      // วันที่กำลังกรอกวิชา
    let sig = '';

    const fmtLeft = (ms) => C.fmt(ms, { ceil: true });

    function nowCard(t) {
        const sc = Store.data.schedule;
        const now = Clock.now();
        if (!sc.periods.length) {
            return `<div class="empty-state"><span class="ic-box lg" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-calendar-day"></i></span>
                <h3>ยังไม่ได้ตั้งเวลาคาบเรียน</h3><div>ใช้เวลาคาบมาตรฐาน (8 คาบ คาบละ 50 นาที) แล้วปรับแก้ หรือกำหนดเองทั้งหมด</div>
                <div class="d-flex gap-2 justify-content-center flex-wrap"><button type="button" class="btn-x primary" data-act="std"><i class="fas fa-wand-magic-sparkles"></i>ใช้เวลาคาบมาตรฐาน</button>
                <button type="button" class="btn-x ghost" data-act="edit"><i class="fas fa-pen"></i>กำหนดเอง</button></div></div>`;
        }
        if (!t.school) {
            return `<div class="now-card is-off"><div class="nc-main"><span class="nc-ic"><i class="fas fa-mug-hot"></i></span>
                <div><small>วัน${U.esc(t.dayName)}</small><b>วันนี้ไม่มีคาบเรียน</b><span>ตั้งวันเรียนได้ที่แผง "ระฆังและวันเรียน"</span></div></div></div>`;
        }
        if (t.current) {
            const x = t.current;
            const left = x.end - now;
            const p = (now - x.start) / (x.end - x.start);
            return `<div class="now-card kind-${x.p.kind}">
                <div class="nc-main">
                    <span class="nc-ic"><i class="fas ${x.p.kind === 'break' ? 'fa-utensils' : x.p.kind === 'other' ? 'fa-people-group' : 'fa-book-open'}"></i></span>
                    <div><small>ตอนนี้ • ${x.p.start}–${x.p.end} น.</small><b>${U.esc(x.p.name || Store.KINDS[x.p.kind])}</b><span>${U.esc(x.subject || (x.p.kind === 'class' ? 'ว่าง (ไม่มีสอน)' : Store.KINDS[x.p.kind]))}</span></div>
                    <div class="nc-count"><b data-live="left">${fmtLeft(left)}</b><small>ก่อนหมดคาบ</small></div>
                </div>
                <div class="bar nc-bar"><span data-live="bar" style="width:${(p * 100).toFixed(1)}%"></span></div>
                <div class="nc-foot">
                    <span>${t.next ? `<i class="fas fa-forward"></i>ถัดไป ${U.esc(Sched.title(t.next))} ${t.next.p.start} น.` : '<i class="fas fa-flag-checkered"></i>คาบสุดท้ายของวัน'}</span>
                    <span class="nc-btns">
                        <button type="button" class="btn-x primary sm" data-act="count"><i class="fas fa-hourglass-half"></i>นับถอยหลังถึงหมดคาบ (เต็มจอ)</button>
                        <button type="button" class="btn-x ghost sm" data-act="clock"><i class="fas fa-expand"></i>นาฬิกา + คาบ เต็มจอ</button>
                    </span>
                </div>
            </div>`;
        }
        if (t.next) {
            return `<div class="now-card is-wait">
                <div class="nc-main"><span class="nc-ic"><i class="fas fa-hourglass-start"></i></span>
                    <div><small>${t.list.some((x) => x.status === 'past') ? 'ระหว่างคาบ' : 'ก่อนเริ่มเรียน'}</small><b>ถัดไป ${U.esc(t.next.p.name || Store.KINDS[t.next.p.kind])}</b><span>${U.esc(t.next.subject || '')} ${t.next.p.start}–${t.next.p.end} น.</span></div>
                    <div class="nc-count"><b data-live="tonext">${fmtLeft(t.next.start - now)}</b><small>ก่อนเริ่มคาบ</small></div>
                </div>
                <div class="nc-foot"><span></span><span class="nc-btns"><button type="button" class="btn-x ghost sm" data-act="clock"><i class="fas fa-expand"></i>นาฬิกา + คาบ เต็มจอ</button></span></div>
            </div>`;
        }
        return `<div class="now-card is-off"><div class="nc-main"><span class="nc-ic"><i class="fas fa-house"></i></span>
            <div><small>วัน${U.esc(t.dayName)}</small><b>หมดคาบเรียนของวันนี้แล้ว</b><span>คาบสุดท้ายจบเวลา ${U.esc(t.list[t.list.length - 1].p.end)} น.</span></div></div></div>`;
    }

    function dayTable(t, isToday) {
        const sc = Store.data.schedule;
        if (!sc.periods.length) return '';
        const tags = { past: '<span class="tag">ผ่านแล้ว</span>', now: '<span class="tag ok"><i class="fas fa-circle-play"></i>กำลังเรียน</span>', next: '<span class="tag info">ถัดไป</span>', later: '' };
        return `<table class="dt sched-table">
            <thead><tr><th>เวลา</th><th>คาบ</th><th>วิชา / ห้อง</th><th class="tb-hide-sm">${isToday ? 'สถานะ' : ''}</th></tr></thead>
            <tbody>${t.list.map((x) => `<tr class="st-${isToday ? x.status : 'later'} kind-${x.p.kind}">
                <td class="nowrap"><b>${x.p.start}</b>–${x.p.end}</td>
                <td><b>${U.esc(x.p.name || Store.KINDS[x.p.kind])}</b>${x.p.kind !== 'class' ? `<div class="text-muted-2 small">${Store.KINDS[x.p.kind]}</div>` : ''}</td>
                <td>${x.subject ? U.esc(x.subject) : '<span class="text-muted-2">—</span>'}${isToday && x.status !== 'later' ? `<div class="d-sm-none mt-1">${tags[x.status]}</div>` : ''}</td>
                <td class="tb-hide-sm">${isToday ? tags[x.status] : ''}</td></tr>`).join('')}</tbody>
        </table>`;
    }

    function subjectsPanel() {
        const sc = Store.data.schedule;
        const d = editDay;
        const subj = sc.subjects[d] || {};
        const classes = sc.periods.filter((p) => p.kind !== 'break');
        return `
            <div class="panel panel--orange">
                <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-chalkboard-user"></i></span><div><h3>วิชาที่สอนแต่ละวัน</h3><small>พิมพ์แล้วบันทึกอัตโนมัติ • เว้นว่าง = ไม่มีสอน</small></div></div>
                <div class="panel-body">
                    ${sc.periods.length ? `
                    <div class="seg full mb-3 day-seg">${[1, 2, 3, 4, 5, 6, 0].map((w) => `<button type="button" data-eday="${w}" class="${d === w ? 'active' : ''}${sc.days.includes(w) ? '' : ' is-off'}">${Store.DAYS_SHORT[w]}</button>`).join('')}</div>
                    <form id="sj-form" class="sj-form" autocomplete="off">${classes.map((p) => `
                        <label class="sj-row"><span><b>${U.esc(p.name || Store.KINDS[p.kind])}</b><small>${p.start}–${p.end}</small></span>
                        <input class="form-control form-control-sm" data-pid="${U.esc(p.id)}" value="${U.esc(subj[p.id] || '')}" maxlength="80" placeholder="เช่น วิทยาการคำนวณ ม.1/1"></label>`).join('')}
                    </form>
                    <button type="button" class="btn-x ghost sm mt-2" data-act="copyday"><i class="fas fa-copy"></i>คัดลอกวิชาของวัน${Store.DAYS[d]}ไปวันอื่น…</button>` : '<div class="text-muted-2">ตั้งเวลาคาบก่อน แล้วจึงกรอกวิชา</div>'}
                </div>
            </div>`;
    }

    function bellPanel() {
        const sc = Store.data.schedule;
        return `
            <div class="panel panel--teal">
                <div class="panel-head"><span class="ic-box sm" style="--a:#00C7BE;--b:#0A84FF"><i class="fas fa-bell"></i></span><div><h3>ระฆังและวันเรียน</h3><small>ระฆังดังเมื่อเริ่ม/หมดคาบ ขณะเปิดโปรแกรมนี้ไว้</small></div></div>
                <div class="panel-body">
                    <label class="check-line mb-2"><input type="checkbox" class="form-check-input" data-bell="bell"${sc.bell ? ' checked' : ''}><span><b>เปิดเสียงระฆังตามตารางคาบ</b><br><small class="text-muted-2">ใช้เสียงและความดังจากหน้าตั้งค่า (ต้องเปิดเสียงเตือนไว้)</small></span></label>
                    <div class="row g-2 mt-1">
                        <div class="col-sm-6"><label class="form-label">เสียงระฆัง</label>
                            <div class="d-flex gap-2"><select class="form-select" data-bell="bellSound">${Sound.LIST.filter((x) => x.id !== 'tick').map((x) => `<option value="${x.id}"${sc.bellSound === x.id ? ' selected' : ''}>${U.esc(x.name)}</option>`).join('')}</select>
                            <button type="button" class="icon-btn" data-act="testbell" title="ทดลองฟัง" aria-label="ทดลองฟัง"><i class="fas fa-play"></i></button></div></div>
                        <div class="col-sm-6"><label class="form-label">เตือนก่อนหมดคาบ</label>
                            <select class="form-select" data-bell="bellWarnMin">${[0, 1, 2, 3, 5, 10].map((m) => `<option value="${m}"${sc.bellWarnMin === m ? ' selected' : ''}>${m ? `${m} นาที` : 'ไม่เตือน'}</option>`).join('')}</select></div>
                    </div>
                    <div class="form-label mt-3 mb-1">วันที่มีเรียน</div>
                    <div class="day-checks">${[1, 2, 3, 4, 5, 6, 0].map((w) => `<label class="day-check"><input type="checkbox" data-day="${w}"${sc.days.includes(w) ? ' checked' : ''}><span>${Store.DAYS_SHORT[w]}</span></label>`).join('')}</div>
                </div>
            </div>`;
    }

    function render(el) {
        root = el;
        const now = Clock.now();
        const today = new Date(now).getDay();
        if (editDay == null) editDay = Store.data.schedule.days.includes(today) ? today : (Store.data.schedule.days[0] ?? 1);
        const showDay = viewDay == null ? today : viewDay;
        const t = Sched.day(now);
        const tv = showDay === today ? t : Sched.day(now, showDay);
        const sc = Store.data.schedule;
        sig = stateSig();
        el.innerHTML = `<div class="page-sched">
            ${U.hero({
                cls: 'hero--sched',
                icon: 'fa-calendar-day',
                title: 'ตารางคาบเรียนวันนี้',
                sub: `วัน${Store.DAYS[today]}ที่ ${U.esc(U.thDateFull(new Date(now)))} • นับถอยหลังหมดคาบ และตีระฆังให้อัตโนมัติขณะเปิดโปรแกรม`,
                side: `<span class="hero-stat"><i class="fas fa-clock"></i><b data-live="clock">${new Date(now).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</b> น.</span>
                       <button type="button" class="hero-btn" data-act="edit"><i class="fas fa-pen"></i>ตั้งเวลาคาบ</button>`,
            })}
            <div class="row g-3">
                <div class="col-xl-7">
                    <div class="panel panel--green">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-bell"></i></span><div><h3>ตอนนี้</h3><small>วัน${U.esc(t.dayName)}${sc.periods.length && t.school ? ` • ${t.list.length} ช่วงเวลา ${U.esc(t.list[0].p.start)}–${U.esc(t.list[t.list.length - 1].p.end)} น.` : ''}</small></div></div>
                        <div class="panel-body" id="sd-now">${nowCard(t)}</div>
                    </div>
                    ${sc.periods.length ? `
                    <div class="panel panel--theme">
                        <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-table-list"></i></span><div><h3>ตารางวัน${U.esc(Store.DAYS[showDay])}</h3><small>${showDay === today ? 'วันนี้' : 'ดูตัวอย่างวันอื่น'}${sc.days.includes(showDay) ? '' : ' • ไม่ใช่วันเรียน'}</small></div>
                            <div class="panel-tools"><div class="seg day-seg">${[1, 2, 3, 4, 5, 6, 0].map((w) => `<button type="button" data-vday="${w}" class="${showDay === w ? 'active' : ''}${sc.days.includes(w) ? '' : ' is-off'}">${Store.DAYS_SHORT[w]}</button>`).join('')}</div></div></div>
                        <div class="panel-body p-0 dt-wrap">${dayTable(tv, showDay === today)}</div>
                    </div>` : ''}
                </div>
                <div class="col-xl-5">
                    ${subjectsPanel()}
                    ${bellPanel()}
                </div>
            </div></div>`;
        bind(el.firstElementChild);
    }

    function stateSig() {
        const t = Sched.day(Clock.now());
        return `${t.weekday}|${t.list.map((x) => x.status).join('')}|${t.current ? t.current.p.id : ''}`;
    }

    const saveSubj = U.debounce(() => Store.commit('subjects'), 400);

    function bind(page) {
        page.addEventListener('click', async (e) => {
            const v = e.target.closest('[data-vday]');
            if (v) { viewDay = +v.dataset.vday === new Date(Clock.now()).getDay() ? null : +v.dataset.vday; render(root); return; }
            const ed = e.target.closest('[data-eday]');
            if (ed) { editDay = +ed.dataset.eday; render(root); return; }
            const b = e.target.closest('[data-act]');
            if (!b) return;
            const a = b.dataset.act;
            if (a === 'edit') editPeriods();
            else if (a === 'std') {
                Store.data.schedule.periods = Demo.standardPeriods();
                Store.commit('schedule', { normalize: true });
                U.toast('ใช้เวลาคาบมาตรฐานแล้ว — แก้ไขได้ที่ปุ่ม "ตั้งเวลาคาบ"', { type: 'ok' });
            } else if (a === 'count') {
                const t = Sched.day(Clock.now());
                if (!t.current) return;
                Timer.setCountdown(t.current.end - Clock.now(), { start: true, label: `${t.current.p.name}${t.current.subject ? ` • ${t.current.subject}` : ''} — หมดคาบ ${t.current.p.end} น.`, keepLast: true });
                App.go('timer');
                Stage.open('timer');
            } else if (a === 'clock') {
                Timer.setView('clock');
                App.go('timer');
                Stage.open('timer');
            } else if (a === 'testbell') Sound.preview(Store.data.schedule.bellSound, Store.settings.sound.volume / 100);
            else if (a === 'copyday') copyDay();
        });
        page.addEventListener('input', (e) => {
            const i = e.target.closest('[data-pid]');
            if (!i) return;
            const sc = Store.data.schedule;
            sc.subjects[editDay] = sc.subjects[editDay] || {};
            const v = U.norm(i.value);
            if (v) sc.subjects[editDay][i.dataset.pid] = v; else delete sc.subjects[editDay][i.dataset.pid];
            saveSubj();
        });
        page.addEventListener('change', (e) => {
            const sc = Store.data.schedule;
            const bl = e.target.closest('[data-bell]');
            if (bl) {
                const k = bl.dataset.bell;
                sc[k] = bl.type === 'checkbox' ? bl.checked : (k === 'bellWarnMin' ? +bl.value : bl.value);
                Store.commit('schedule');
                Timer.replan();
                return;
            }
            const dy = e.target.closest('[data-day]');
            if (dy) {
                const w = +dy.dataset.day;
                sc.days = dy.checked ? [...new Set([...sc.days, w])].sort() : sc.days.filter((x) => x !== w);
                Store.commit('schedule');
                Timer.replan();
            }
        });
        page.querySelector('#sj-form')?.addEventListener('submit', (e) => e.preventDefault());
    }

    async function copyDay() {
        const sc = Store.data.schedule;
        const from = editDay;
        const r = await U.sheet({
            title: `คัดลอกวิชาของวัน${Store.DAYS[from]}`,
            sub: 'วิชาของวันปลายทางจะถูกแทนที่',
            icon: 'fa-copy',
            tone: ['var(--hero-2)', 'var(--ac)', 'var(--ac-2)'],
            confirmText: '<i class="fas fa-copy"></i> คัดลอก',
            body: `<div class="day-checks justify-content-center">${[1, 2, 3, 4, 5, 6, 0].filter((w) => w !== from).map((w) => `<label class="day-check"><input type="checkbox" name="to" value="${w}"><span>${Store.DAYS_SHORT[w]}</span></label>`).join('')}</div>`,
            preConfirm: () => {
                const to = [...Swal.getPopup().querySelectorAll('input[name="to"]:checked')].map((x) => +x.value);
                if (!to.length) { Swal.showValidationMessage('เลือกวันปลายทางอย่างน้อย 1 วัน'); return false; }
                return to;
            },
        });
        if (!r.isConfirmed) return;
        r.value.forEach((w) => { sc.subjects[w] = Object.assign({}, sc.subjects[from] || {}); });
        Store.commit('schedule');
        U.toast(`คัดลอกไป ${r.value.map((w) => Store.DAYS_SHORT[w]).join(' ')} แล้ว`, { type: 'ok' });
    }

    /* ---------- หน้าต่างตั้งเวลาคาบ ---------- */
    function editPeriods() {
        let rows = Store.data.schedule.periods.map((p) => Object.assign({}, p));
        const rowHtml = (p, i) => `
            <div class="pe-row" data-row="${i}">
                <input class="form-control pe-name" data-f="name" value="${U.esc(p.name)}" maxlength="40" placeholder="ชื่อ เช่น คาบ ${i + 1}" aria-label="ชื่อคาบ">
                <div class="pe-time"><input class="form-control" type="time" data-f="start" value="${U.esc(p.start)}" aria-label="เริ่ม"><span>–</span><input class="form-control" type="time" data-f="end" value="${U.esc(p.end)}" aria-label="สิ้นสุด"></div>
                <select class="form-select pe-kind" data-f="kind" aria-label="ประเภท">${Object.entries(Store.KINDS).map(([k, v]) => `<option value="${k}"${p.kind === k ? ' selected' : ''}>${v}</option>`).join('')}</select>
                <button type="button" class="icon-btn del" data-rm title="ลบ" aria-label="ลบ"><i class="fas fa-xmark"></i></button>
            </div>`;
        const read = (el) => el.querySelectorAll('.pe-row').forEach((r, i) => {
            ['name', 'start', 'end', 'kind'].forEach((f) => { rows[i][f] = r.querySelector(`[data-f="${f}"]`).value; });
        });
        const paint = (el) => { el.querySelector('#pe-rows').innerHTML = rows.length ? rows.map(rowHtml).join('') : '<div class="text-muted-2 p-3 text-center">ยังไม่มีคาบ — กด "เพิ่มคาบ"</div>'; };
        return U.sheet({
            title: 'ตั้งเวลาคาบเรียน',
            sub: 'ใช้เหมือนกันทุกวัน • ระบบเรียงตามเวลาเริ่มให้อัตโนมัติ',
            icon: 'fa-clock',
            tone: ['var(--hero-2)', 'var(--ac)', 'var(--ac-2)'],
            width: 720,
            body: `<div class="pe-head"><span>ชื่อคาบ</span><span>เวลา</span><span>ประเภท</span></div>
                <div id="pe-rows" class="pe-rows"></div>
                <div class="d-flex gap-2 flex-wrap mt-2">
                    <button type="button" class="btn-x ghost sm" id="pe-add"><i class="fas fa-plus"></i>เพิ่มคาบ</button>
                    <button type="button" class="btn-x ghost sm" id="pe-std"><i class="fas fa-wand-magic-sparkles"></i>ใช้เวลาคาบมาตรฐาน</button>
                </div>`,
            didOpen: (el) => {
                paint(el);
                el.querySelector('#pe-add').onclick = () => {
                    read(el);
                    const last = rows[rows.length - 1];
                    const st = last ? U.toMin(last.end) : 8 * 60 + 30;
                    const n = rows.filter((x) => x.kind === 'class').length + 1;
                    rows.push({ id: U.uid('p'), name: `คาบ ${n}`, start: U.fromMin(Math.min(st, 23 * 60)), end: U.fromMin(Math.min(st + 50, 23 * 60 + 59)), kind: 'class' });
                    paint(el);
                };
                el.querySelector('#pe-std').onclick = () => { rows = Demo.standardPeriods(); paint(el); };
                el.querySelector('#pe-rows').addEventListener('click', (e) => {
                    const r = e.target.closest('.pe-row');
                    if (r && e.target.closest('[data-rm]')) { read(el); rows.splice(+r.dataset.row, 1); paint(el); }
                });
            },
            preConfirm: () => {
                const el = Swal.getPopup();
                read(el);
                for (let i = 0; i < rows.length; i += 1) {
                    const p = rows[i];
                    const s = U.toMin(p.start);
                    const e = U.toMin(p.end);
                    if (s == null || e == null) { Swal.showValidationMessage(`แถวที่ ${i + 1}: กรอกเวลาเริ่มและสิ้นสุดให้ครบ`); return false; }
                    if (e <= s) { Swal.showValidationMessage(`แถวที่ ${i + 1} (${p.name || 'ไม่มีชื่อ'}): เวลาสิ้นสุดต้องหลังเวลาเริ่ม`); return false; }
                }
                const sorted = rows.slice().sort((a, b) => U.toMin(a.start) - U.toMin(b.start));
                for (let i = 1; i < sorted.length; i += 1) {
                    if (U.toMin(sorted[i].start) < U.toMin(sorted[i - 1].end)) { Swal.showValidationMessage(`"${sorted[i - 1].name}" กับ "${sorted[i].name}" เวลาซ้อนกัน`); return false; }
                }
                return sorted;
            },
        }).then((r) => {
            if (!r.isConfirmed) return;
            Store.data.schedule.periods = r.value.map((p) => ({ id: p.id || U.uid('p'), name: U.norm(p.name), start: p.start, end: p.end, kind: p.kind }));
            Store.commit('schedule', { normalize: true });
            Timer.replan();
            U.toast('บันทึกเวลาคาบแล้ว', { type: 'ok' });
        });
    }

    function frame(now) {
        if (!root || !root.isConnected) return;
        const s = stateSig();
        if (s !== sig) {
            const a = document.activeElement;
            if (!(a && root.contains(a) && a.matches('input, select'))) render(root);
            return;
        }
        const t = Sched.day(now);
        const set = (k, v) => { const n = root.querySelector(`[data-live="${k}"]`); if (n && n.textContent !== v) n.textContent = v; };
        set('clock', new Date(now).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
        if (t.current) {
            set('left', fmtLeft(t.current.end - now));
            const bar = root.querySelector('[data-live="bar"]');
            if (bar) bar.style.width = `${(((now - t.current.start) / (t.current.end - t.current.start)) * 100).toFixed(2)}%`;
        } else if (t.next) set('tonext', fmtLeft(t.next.start - now));
    }

    window.Views = window.Views || {};
    window.Views.schedule = {
        render,
        frame,
        refresh(reason) {
            if (!root || !root.isConnected) return;
            if (reason === 'subjects') return;          // กำลังพิมพ์อยู่ ไม่ต้องวาดใหม่
            render(root);
        },
        leave() { viewDay = null; root = null; },
    };
})();
