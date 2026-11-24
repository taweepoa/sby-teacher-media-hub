/* แต้มรายคน + กราฟ (Chart.js) + ประวัติ */
(function () {
    'use strict';
    let charts = [];
    const destroy = () => { charts.forEach((c) => c.destroy()); charts = []; };
    function render(el, params) {
        destroy();
        const c = Store.current();
        if (!c) { el.innerHTML = UI.noClass(); return; }
        let s = params && params.sid ? Store.student(params.sid) : null;
        if (s && s.classId !== c.id) { Store.data.settings.classId = s.classId; Store.commit('settings'); }
        const cc = Store.current();
        const list = Core.classStudents(Store.data, cc.id);
        if (!s) s = list[0];
        if (!s) { el.innerHTML = `${UI.classSeg()}<div class="empty-state"><i class="fas fa-user-plus"></i><h4>ห้องนี้ยังไม่มีนักเรียน</h4></div>`; UI.bindClassSeg(el); return; }
        const all = Core.stats(Store.data, s.id);
        const wk = Core.stats(Store.data, s.id, Core.weekRange());
        const mo = Core.stats(Store.data, s.id, Core.monthRange());
        const bd = Core.skillBreakdown(Store.data, (e) => e.sid === s.id);
        const hist = Store.data.events.filter((e) => e.sid === s.id).map((e) => ({ t: e.t, e })).concat(Store.data.redeems.filter((x) => x.sid === s.id).map((x) => ({ t: x.t, x }))).sort((a, b) => (a.t < b.t ? 1 : -1)).slice(0, 40);
        el.innerHTML = `
            <div class="board-bar">${UI.classSeg()}<select class="form-select stu-pick" id="stu-pick" aria-label="เลือกนักเรียน">${list.map((x) => `<option value="${x.id}"${x.id === s.id ? ' selected' : ''}>${U.esc(x.no)}. ${U.esc(Core.fullName(x))}${x.nick ? ` (${U.esc(x.nick)})` : ''}</option>`).join('')}</select></div>
            <section class="hero stu-hero"><div class="hero-main"><span class="hero-ava">${UI.ava(s, 84)}</span><div><h2 class="hero-title">${U.esc(Core.showName(s))} — ${U.esc(Core.fullName(s))}</h2><p class="hero-sub">ชั้น ${U.esc(cc.name)} เลขที่ ${U.esc(s.no)}${s.code ? ` • รหัสนักเรียน ${U.esc(s.code)}` : ''} • ${U.esc(Store.termText())}</p></div></div>
                <div class="hero-side"><span class="hero-stat"><i class="fas fa-coins"></i>แต้มคงเหลือ <b>${Core.balance(Store.data, s.id).toLocaleString()}</b></span><button type="button" class="hero-btn" id="stu-give"><i class="fas fa-star"></i>ให้แต้ม</button></div></section>
            <div class="dash-grid">
                <div class="stat-card" style="--a:#30D158;--b:#00C7BE"><span class="ic-box lg" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-thumbs-up"></i></span><div><b>+${all.pos.toLocaleString()}</b><span>แต้มพฤติกรรมดี (${all.posCount} ครั้ง)</span></div></div>
                <div class="stat-card" style="--a:#FF375F;--b:#FF9F0A"><span class="ic-box lg" style="--a:#FF375F;--b:#FF9F0A"><i class="fas fa-hand"></i></span><div><b>−${all.neg.toLocaleString()}</b><span>ควรปรับปรุง (${all.negCount} ครั้ง)</span></div></div>
                <div class="stat-card" style="--a:#0A84FF;--b:#5E5CE6"><span class="ic-box lg" style="--a:#0A84FF;--b:#5E5CE6"><i class="fas fa-calendar-week"></i></span><div><b>${wk.net > 0 ? '+' : ''}${wk.net}</b><span>สัปดาห์นี้ • เดือนนี้ ${mo.net > 0 ? '+' : ''}${mo.net}</span></div></div>
                <div class="stat-card" style="--a:#FF9F0A;--b:#FFD60A"><span class="ic-box lg" style="--a:#FF9F0A;--b:#FFD60A"><i class="fas fa-gift"></i></span><div><b>${all.spent.toLocaleString()}</b><span>แต้มที่แลกรางวัลไป</span></div></div>
            </div>
            <div class="row g-3">
                <div class="col-xl-7"><div class="panel panel--theme"><div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-chart-line"></i></span><div><h3>แต้มย้อนหลัง 30 วัน</h3><small>แท่ง = แต้มที่ได้/ถูกหักรายวัน • เส้น = แต้มคงเหลือสะสม</small></div></div><div class="panel-body"><div class="chart-box"><canvas id="ch-daily"></canvas></div></div></div></div>
                <div class="col-xl-5"><div class="panel panel--purple"><div class="panel-head"><span class="ic-box sm" style="--a:#BF5AF2;--b:#5E5CE6"><i class="fas fa-chart-pie"></i></span><div><h3>แยกตามพฤติกรรม</h3><small>ทั้งภาคเรียน</small></div></div><div class="panel-body">${bd.length ? '<div class="chart-box"><canvas id="ch-skill"></canvas></div>' : '<div class="empty-state sm"><i class="fas fa-chart-pie"></i><p>ยังไม่มีบันทึก</p></div>'}</div></div></div>
            </div>
            <div class="panel"><div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-clock-rotate-left"></i></span><div><h3>ประวัติล่าสุด</h3><small>40 รายการล่าสุด • ลบรายการที่ให้ผิดได้</small></div></div>
                <div class="panel-body p-0 dt-wrap"><table class="dt"><thead><tr><th>วันเวลา</th><th>รายการ</th><th class="num">แต้ม</th><th class="act"></th></tr></thead><tbody>
                ${hist.length ? hist.map((h) => (h.e ? `<tr><td>${U.esc(U.thDate(h.t, true))}</td><td><i class="fas ${(Store.skill(h.e.skillId) || {}).icon || 'fa-star'} me-1" style="color:var(--ac)"></i>${U.esc((Store.skill(h.e.skillId) || {}).name || 'ทักษะที่ถูกลบ')}</td><td class="num">${UI.pts(h.e.pts)}</td><td class="act"><button type="button" class="icon-btn del" data-del-ev="${h.e.id}" title="ลบรายการ"><i class="fas fa-trash"></i></button></td></tr>`
                    : `<tr><td>${U.esc(U.thDate(h.t, true))}</td><td><i class="fas fa-gift me-1" style="color:#FF9F0A"></i>แลกรางวัล: ${U.esc((Store.reward(h.x.rewardId) || {}).name || h.x.name || 'รางวัล')}</td><td class="num"><span class="pts down">−${h.x.cost}</span></td><td class="act"><button type="button" class="icon-btn del" data-del-rd="${h.x.id}" title="ลบรายการ"><i class="fas fa-trash"></i></button></td></tr>`)).join('') : U.emptyRow(4, 'fa-inbox', 'ยังไม่มีประวัติ')}
                </tbody></table></div></div>`;
        UI.bindClassSeg(el, () => App.go('student'));
        el.querySelector('#stu-pick').onchange = (e) => App.go('student', { sid: e.target.value });
        el.querySelector('#stu-give').onclick = () => UI.awardDialog([s.id], `${Core.showName(s)} — ${Core.fullName(s)}`, () => [el.querySelector('.hero-ava')]);
        el.querySelectorAll('[data-del-ev]').forEach((b) => { b.onclick = async () => { if (!(await U.confirm('ลบรายการนี้?', 'แต้มของรายการนี้จะถูกนำออก', { danger: true, confirmText: 'ลบรายการ' }))) return; Store.undo([b.dataset.delEv]); }; });
        el.querySelectorAll('[data-del-rd]').forEach((b) => { b.onclick = async () => { if (!(await U.confirm('ลบรายการแลกรางวัลนี้?', 'แต้มที่ใช้แลกจะคืนให้นักเรียน', { danger: true, confirmText: 'ลบรายการ' }))) return; Store.data.redeems = Store.data.redeems.filter((x) => x.id !== b.dataset.delRd); Store.commit('redeem'); }; });
        drawCharts(el, s, bd);
    }
    function drawCharts(el, s, bd) {
        if (!window.Chart) return;
        Chart.defaults.font.family = 'Sarabun, sans-serif';
        const ser = Core.dailySeries(Store.data, s.id, 30);
        const css = getComputedStyle(document.body);
        const ac = css.getPropertyValue('--ac').trim() || '#d97706';
        charts.push(new Chart(el.querySelector('#ch-daily'), {
            data: {
                labels: ser.labels.map((d) => `${d.getDate()}/${d.getMonth() + 1}`),
                datasets: [
                    { type: 'bar', label: 'ได้แต้ม', data: ser.pos, backgroundColor: '#34d399', borderRadius: 4, stack: 's' },
                    { type: 'bar', label: 'ถูกหัก', data: ser.neg.map((n) => -n), backgroundColor: '#fb7185', borderRadius: 4, stack: 's' },
                    { type: 'line', label: 'คงเหลือสะสม', data: ser.cum, borderColor: ac, backgroundColor: ac, yAxisID: 'y2', tension: 0.3, pointRadius: 0, borderWidth: 3 },
                ],
            },
            options: { responsive: true, maintainAspectRatio: false, animation: { duration: 400 }, interaction: { mode: 'index', intersect: false }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { precision: 0 }, title: { display: true, text: 'แต้ม/วัน' } }, y2: { position: 'right', grid: { display: false }, title: { display: true, text: 'คงเหลือ' } } }, plugins: { legend: { position: 'bottom' } } },
        }));
        const cv = el.querySelector('#ch-skill');
        if (cv) {
            const top = bd.slice(0, 8);
            charts.push(new Chart(cv, {
                type: 'bar',
                data: { labels: top.map((x) => (x.skill ? x.skill.name : 'ถูกลบ')), datasets: [{ label: 'จำนวนครั้ง', data: top.map((x) => x.count), backgroundColor: top.map((x) => (x.pts >= 0 ? '#fbbf24' : '#fb7185')), borderRadius: 6 }] },
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: { duration: 400 }, plugins: { legend: { display: false } }, scales: { x: { ticks: { precision: 0 } } } },
            }));
        }
    }
    window.Views.student = { render, refresh() { App.render(); }, leave: destroy };
})();
