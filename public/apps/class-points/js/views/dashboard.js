/* หน้าหลัก */
(function () {
    'use strict';
    function render(el) {
        const d = Store.data;
        const c = Store.current();
        const wk = Core.weekRange();
        const today = Core.startOfDay(new Date());
        const todayEv = d.events.filter((e) => new Date(e.t) >= today);
        const weekEv = d.events.filter((e) => Core.inRange(e.t, wk));
        const posPct = weekEv.length ? Math.round((weekEv.filter((e) => e.pts > 0).length * 100) / weekEv.length) : 0;
        const lb = c ? Core.leaderboard(d, c.id, wk).slice(0, 5) : [];
        const recent = d.events.slice().sort((a, b) => (a.t < b.t ? 1 : -1)).slice(0, 8);
        const needBackup = Store.needsBackup();
        el.innerHTML = `
            ${U.hero({
                icon: 'fa-star', title: d.school.name ? `กระดานแต้มพฤติกรรม — ${d.school.name}` : 'กระดานแต้มพฤติกรรมห้องเรียน',
                sub: `${U.esc(Store.termText())} • เสริมแรงพฤติกรรมเชิงบวกด้วยแต้มสะสมบนจอหน้าห้อง ใช้ได้โดยไม่ต้องต่ออินเทอร์เน็ต`,
                side: `<span class="hero-stat"><i class="fas fa-bolt"></i>วันนี้ให้แต้ม <b>${todayEv.length.toLocaleString()}</b> ครั้ง</span><a class="hero-btn" href="#/board"><i class="fas fa-chalkboard-user"></i>เปิดจอหน้าห้อง</a>`,
            })}
            ${needBackup ? `<div class="note warn"><i class="fas fa-triangle-exclamation"></i><div><b>มีข้อมูลที่ยังไม่ได้สำรองเป็นไฟล์</b> — ข้อมูลเก็บในเบราว์เซอร์ของเครื่องนี้เท่านั้น (สำรองล่าสุด: ${Store.meta.lastBackupAt ? U.esc(U.thDate(Store.meta.lastBackupAt, true)) : 'ยังไม่เคย'})
                <div class="mt-2"><button type="button" class="btn-x orange sm" id="dash-backup"><i class="fas fa-download"></i>บันทึกไฟล์ข้อมูลตอนนี้</button></div></div></div>` : ''}
            <div class="dash-grid">
                <a class="stat-card" href="#/classes" style="--a:#0A84FF;--b:#5E5CE6"><span class="ic-box lg" style="--a:#0A84FF;--b:#5E5CE6"><i class="fas fa-user-graduate"></i></span><div><b>${d.students.length.toLocaleString()}</b><span>นักเรียน (${d.classes.length} ห้อง)</span></div></a>
                <a class="stat-card" href="#/leaders" style="--a:#30D158;--b:#00C7BE"><span class="ic-box lg" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-thumbs-up"></i></span><div><b>${weekEv.length.toLocaleString()}</b><span>บันทึกสัปดาห์นี้ (ดี ${posPct}%)</span></div></a>
                <a class="stat-card" href="#/rewards" style="--a:#FF9F0A;--b:#FF375F"><span class="ic-box lg" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-gift"></i></span><div><b>${d.redeems.length.toLocaleString()}</b><span>ครั้งที่แลกรางวัล</span></div></a>
                <a class="stat-card" href="#/skills" style="--a:#BF5AF2;--b:#FF375F"><span class="ic-box lg" style="--a:#BF5AF2;--b:#FF375F"><i class="fas fa-list-check"></i></span><div><b>${d.skills.length}</b><span>ทักษะ / พฤติกรรม</span></div></a>
            </div>
            ${!c ? UI.noClass() : `
            <div class="row g-3">
                <div class="col-xl-7">
                    <div class="panel panel--theme"><div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-ranking-star"></i></span><div><h3>ผู้นำสัปดาห์นี้ — ${U.esc(c.name)}</h3><small>แต้มสุทธิตั้งแต่วันจันทร์</small></div><div class="panel-tools">${UI.classSeg('dash-cls')}</div></div>
                        <div class="panel-body">${lb.length && lb[0].net > 0 ? `<div class="mini-lb">${lb.map((x) => `<a class="mlb" href="#/student?sid=${x.s.id}"><span class="rk r${x.rank}">${x.rank}</span>${UI.ava(x.s, 44)}<b>${U.esc(Core.showName(x.s))}</b><span class="text-muted-2">${U.esc(Core.fullName(x.s))}</span>${UI.pts(x.net)}</a>`).join('')}</div>` : '<div class="empty-state sm"><i class="fas fa-star"></i><p>สัปดาห์นี้ยังไม่มีการให้แต้ม — เปิด "จอหน้าห้อง" แล้วแตะนักเรียนเพื่อให้แต้ม</p></div>'}</div></div>
                </div>
                <div class="col-xl-5">
                    <div class="panel panel--orange"><div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-clock-rotate-left"></i></span><div><h3>บันทึกล่าสุด</h3><small>ทุกห้องเรียน</small></div></div>
                        <div class="panel-body p-0">${recent.length ? `<ul class="feed">${recent.map((e) => { const s = Store.student(e.sid); const k = Store.skill(e.skillId); return `<li>${UI.ava(s, 34)}<div><b>${U.esc(Core.showName(s))}</b> <span class="text-muted-2">${U.esc((Store.cls(s.classId) || {}).name || '')}</span><small>${U.esc(k ? k.name : 'ทักษะที่ถูกลบ')} • ${U.esc(U.ago(e.t))}</small></div>${UI.pts(e.pts)}</li>`; }).join('')}</ul>` : '<div class="empty-state sm"><i class="fas fa-inbox"></i><p>ยังไม่มีบันทึก</p></div>'}</div></div>
                </div>
            </div>`}`;
        const b = el.querySelector('#dash-backup'); if (b) b.onclick = () => App.backupNow();
        UI.bindClassSeg(el);
    }
    window.Views.dashboard = { render, refresh() { App.render(); } };
})();
