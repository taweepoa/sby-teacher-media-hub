/* หน้าหลัก: สรุป + เกมที่เล่นค้าง + เลือกรูปแบบเกม + ชุดเนื้อหา + ผลล่าสุด */
(function () {
    'use strict';
    const esc = U.esc;
    let root = null;

    function render(el) {
        root = el;
        const d = Store.data;
        const g = d.live;
        el.innerHTML = `
            ${U.hero({ icon: 'fa-clone', title: 'เกมจับคู่ความจำและเกมทายใจ', sub: 'ใส่เนื้อหาเองได้ทุกวิชา เล่นเป็นทีมบนจอหน้าห้อง — เปิดไพ่ ลากเส้น ทายใจจับเวลา และกล่องสุ่มรางวัล', side: `<a class="hero-btn" href="#/play"><i class="fas fa-play"></i> เริ่มเกม</a><a class="hero-btn ghost" href="#/library"><i class="fas fa-layer-group"></i> ชุดเนื้อหา</a>` })}
            <div class="dash-grid">
                <a class="stat-card" href="#/library"><span class="ic-box lg" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-layer-group"></i></span><div><b>${UI.fmt(d.sets.length)}</b><span>ชุดเนื้อหา</span></div></a>
                <a class="stat-card" href="#/library"><span class="ic-box lg" style="--a:#0A84FF;--b:#00C7BE"><i class="fas fa-clone"></i></span><div><b>${UI.fmt(Store.pairCount())}</b><span>คู่การ์ดทั้งหมด</span></div></a>
                <a class="stat-card" href="#/results"><span class="ic-box lg" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-flag-checkered"></i></span><div><b>${UI.fmt(d.games.length)}</b><span>เกมที่เล่นจบแล้ว</span></div></a>
                <a class="stat-card" href="#/play"><span class="ic-box lg" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-gamepad"></i></span><div><b>${g ? 'กำลังเล่น' : 'พร้อมเล่น'}</b><span>${g ? esc(Engine.progress(g).label) : 'กดเพื่อตั้งค่าเกมใหม่'}</span></div></a>
            </div>
            ${g ? `<section class="panel panel--orange live-card"><div class="panel-body">
                <div class="live-row"><span class="ic-box lg" style="--a:#FF9F0A;--b:#FF375F"><i class="fas ${Engine.MODES[g.mode].icon}"></i></span>
                <div class="grow"><h3>${esc(g.title || g.setName)}</h3><div class="muted">${esc(Engine.MODES[g.mode].label)} • ${esc(g.setName)} • ${esc(Engine.progress(g).label)}</div><div class="mt-1">${g.teams.map(UI.teamChip).join(' ')}</div></div>
                <a class="btn-x primary lg" href="#/play"><i class="fas fa-play"></i> เล่นต่อ</a></div></div></section>` : ''}
            <div class="mode-grid">${Object.keys(Engine.MODES).map((k) => { const m = Engine.MODES[k]; return `
                <a class="mode-card" href="#/play?mode=${k}" style="--c:${m.color}">
                    <span class="mode-art">${UI.modeArt(k)}</span>
                    <span class="mode-txt"><b><i class="fas ${m.icon}"></i> ${esc(m.label)}</b><small>${esc(UI.MODE_DESC[k])}</small></span>
                </a>`; }).join('')}</div>
            <div class="two-col">
                <section class="panel panel--purple">
                    <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-bolt"></i></span><div><h3>เริ่มเล่นด่วน</h3><small>เลือกชุดเนื้อหาแล้วกดเล่นได้ทันที</small></div><div class="panel-tools"><a class="btn-x ghost sm" href="#/library">ดูทั้งหมด</a></div></div>
                    <div class="panel-body">${d.sets.length ? `<div class="quick-sets">${d.sets.slice(0, 8).map((s) => `
                        <a class="quick-set" href="#/play?set=${esc(s.id)}"><span class="qs-thumb">${UI.setThumb(s)}</span><span class="qs-body"><b>${esc(s.name || '(ไม่มีชื่อชุด)')}</b><small>${esc(s.subject || '-')} • ${esc(Store.KINDS[s.kind].label)} • ${s.pairs.length} คู่</small></span><i class="fas fa-circle-play qs-go"></i></a>`).join('')}</div>`
                        : UI.empty('fa-layer-group', 'ยังไม่มีชุดเนื้อหา', 'สร้างชุดใหม่ หรือโหลดข้อมูลตัวอย่างที่หน้า "สำรอง / เปิดไฟล์ข้อมูล"', '<a class="btn-x primary" href="#/library"><i class="fas fa-plus"></i> สร้างชุดเนื้อหา</a>')}</div>
                </section>
                <section class="panel panel--green">
                    <div class="panel-head"><span class="ic-box sm" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-ranking-star"></i></span><div><h3>ผลการแข่งขันล่าสุด</h3><small>กดเพื่อดูอันดับ พิมพ์ใบสรุปคะแนน หรือออกรายงาน</small></div></div>
                    <div class="panel-body">${d.games.length ? d.games.slice(0, 5).map((x) => { const w = Engine.ranking(x)[0]; return `
                        <a class="recent-game" href="#/result?id=${esc(x.id)}"><span class="rg-ic" style="--c:${esc(w.color)}"><i class="fas fa-trophy"></i></span><span class="grow"><b>${esc(x.title || x.setName)}</b><small>${esc(x.dateText || U.thDate(x.startedAt))} • ${esc(Engine.MODES[x.mode].short)} • ${x.teams.length} ทีม • ชนะ: ${esc(w.name)} (${UI.fmt(w.score)} คะแนน)</small></span><i class="fas fa-chevron-right muted"></i></a>`; }).join('')
                        : UI.empty('fa-trophy', 'ยังไม่มีผลการแข่งขัน', 'เล่นเกมจบแล้วผลจะถูกบันทึกที่นี่อัตโนมัติ')}</div>
                </section>
            </div>`;
    }
    window.Views.dashboard = { render, refresh() { if (root) render(root); } };
})();
