/* กระดานผู้นำรายสัปดาห์ / เดือน / ทั้งหมด */
(function () {
    'use strict';
    let period = 'week';
    function render(el) {
        const c = Store.current();
        if (!c) { el.innerHTML = UI.noClass(); return; }
        const r = Core.periodRange(period);
        const lb = Core.leaderboard(Store.data, c.id, r);
        const top = lb.filter((x) => x.net > 0).slice(0, 3);
        const order = [top[1], top[0], top[2]];
        const groups = c.groups.map((g) => ({ g, net: g.members.reduce((a, sid) => a + Core.stats(Store.data, sid, r).net, 0) })).sort((a, b) => b.net - a.net);
        el.innerHTML = `
            <div class="board-bar">${UI.classSeg()}${UI.periodSeg(period)}<span class="board-total"><i class="fas fa-calendar"></i>${U.esc(Docs.rangeText(period, r, Store.data) || 'ยังไม่มีบันทึก')}</span></div>
            <div class="row g-3">
                <div class="col-xxl-8 col-xl-7">
                    <div class="panel panel--theme"><div class="panel-body">
                        ${top.length ? `<div class="podium">${order.map((x, i) => (x ? `<a class="pod p${x.rank <= 3 ? x.rank : 3}" href="#/student?sid=${x.s.id}"><span class="crown"><i class="fas ${i === 1 ? 'fa-crown' : 'fa-medal'}"></i></span>${UI.ava(x.s, i === 1 ? 112 : 88)}<b>${U.esc(Core.showName(x.s))}</b><small>${U.esc(Core.fullName(x.s))}</small><div class="pod-base"><span>${x.rank}</span><em>${x.net.toLocaleString()} แต้ม</em></div></a>` : '<div class="pod empty"></div>')).join('')}</div>` : '<div class="empty-state"><i class="fas fa-ranking-star"></i><h4>ยังไม่มีผู้นำในช่วงนี้</h4><p>ให้แต้มนักเรียนที่จอหน้าห้องก่อน แล้วกระดานผู้นำจะแสดงที่นี่</p></div>'}
                    </div></div>
                    <div class="panel"><div class="panel-body p-0 dt-wrap"><table class="dt">
                        <thead><tr><th class="num">อันดับ</th><th>นักเรียน</th><th class="num">ดี (ครั้ง)</th><th class="num">ควรปรับปรุง</th><th class="num">แต้มสุทธิ</th><th class="num">คงเหลือ</th><th class="act"></th></tr></thead>
                        <tbody>${lb.length ? lb.map((x) => `<tr><td class="num"><span class="rk r${x.rank}">${x.rank}</span></td><td><div class="person-cell">${UI.ava(x.s, 34)}<div><b>${U.esc(Core.showName(x.s))}</b><div class="text-muted-2" style="font-size:.8rem">เลขที่ ${U.esc(x.s.no)} ${U.esc(Core.fullName(x.s))}</div></div></div></td><td class="num">${x.posCount}</td><td class="num">${x.negCount}</td><td class="num">${UI.pts(x.net)}</td><td class="num"><b>${Core.balance(Store.data, x.s.id).toLocaleString()}</b></td><td class="act"><a class="icon-btn" href="#/student?sid=${x.s.id}" title="ดูกราฟ"><i class="fas fa-chart-line"></i></a></td></tr>`).join('') : U.emptyRow(7, 'fa-user-plus', 'ยังไม่มีนักเรียนในห้องนี้')}</tbody></table></div></div>
                </div>
                <div class="col-xxl-4 col-xl-5">
                    <div class="panel panel--green"><div class="panel-head"><span class="ic-box sm" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-people-group"></i></span><div><h3>อันดับกลุ่ม</h3><small>รวมแต้มสุทธิของสมาชิก</small></div></div>
                        <div class="panel-body">${groups.length ? groups.map((x, i) => `<div class="grp-row"><span class="rk r${i + 1}">${i + 1}</span><b>${U.esc(x.g.name)}</b><span class="bar"><span style="width:${groups[0].net > 0 ? Math.max(4, (x.net * 100) / groups[0].net) : 0}%"></span></span>${UI.pts(x.net)}</div>`).join('') : '<div class="empty-state sm"><i class="fas fa-people-group"></i><p>ยังไม่ได้จับกลุ่ม — จับกลุ่มได้ที่จอหน้าห้อง</p></div>'}</div></div>
                    <div class="panel panel--purple"><div class="panel-head"><span class="ic-box sm" style="--a:#BF5AF2;--b:#5E5CE6"><i class="fas fa-award"></i></span><div><h3>ดาวเด่นประจำสัปดาห์</h3><small>พิมพ์เกียรติบัตรให้ 3 อันดับแรก</small></div></div>
                        <div class="panel-body"><a class="btn-x primary w-100" href="#/certificate"><i class="fas fa-award"></i>ไปหน้าเกียรติบัตร</a></div></div>
                </div>
            </div>`;
        UI.bindClassSeg(el);
        el.querySelectorAll('[data-period]').forEach((b) => { b.onclick = () => { period = b.dataset.period; render(el); }; });
    }
    window.Views.leaders = { render, refresh() { App.render(); } };
})();
