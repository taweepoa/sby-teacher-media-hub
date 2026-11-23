/* กระดานคะแนนทีม: แสดงคะแนนตัวใหญ่ขึ้นจอ (เกมที่เล่นอยู่ หรือผลเกมที่เลือก) + ปรับคะแนนด้วยมือ */
(function () {
    'use strict';
    const esc = U.esc;
    let root = null;
    let curId = null;

    function pick(id) {
        const d = Store.data;
        if (id) return (d.live && d.live.id === id) ? d.live : d.games.find((g) => g.id === id) || null;
        return d.live || d.games[0] || null;
    }

    function render(el, params) {
        root = el;
        curId = params && params.id;
        const g = pick(curId);
        if (!g) { el.innerHTML = `${U.hero({ icon: 'fa-chart-simple', title: 'กระดานคะแนนทีม', sub: 'แสดงคะแนนทุกทีมตัวใหญ่ขึ้นจอหน้าห้อง' })}<section class="panel"><div class="panel-body">${UI.empty('fa-chart-simple', 'ยังไม่มีเกม', 'เริ่มเกมแล้วกระดานคะแนนจะแสดงที่นี่', '<a class="btn-x primary" href="#/play"><i class="fas fa-play"></i> เริ่มเกม</a>')}</div></section>`; return; }
        const isLive = Store.data.live && Store.data.live.id === g.id;
        const rk = Engine.ranking(g);
        const max = Math.max(1, ...rk.map((t) => t.score));
        const cur = isLive ? Engine.team(g) : null;
        const others = [Store.data.live].concat(Store.data.games).filter(Boolean).slice(0, 8);
        el.innerHTML = `
            <div class="board" id="board">
                <div class="board-top">
                    <span class="gt-mode" style="--c:${Engine.MODES[g.mode].color}"><i class="fas ${Engine.MODES[g.mode].icon}"></i></span>
                    <div class="gt-title"><b>${esc(g.title || g.setName)}</b><small>${esc(Engine.MODES[g.mode].label)} • ${esc(g.setName)} • ${isLive ? `<span class="tag warn"><i class="fas fa-circle-play"></i>กำลังเล่น — ${esc(Engine.progress(g).label)}</span>` : `<span class="tag ok"><i class="fas fa-flag-checkered"></i>จบแล้ว</span>`}</small></div>
                    <div class="gt-tools">
                        ${others.length > 1 ? `<select class="form-select form-select-sm board-sel" id="bd-sel" data-demo-allow>${others.map((x) => `<option value="${esc(x.id)}" ${x.id === g.id ? 'selected' : ''}>${esc((x === Store.data.live ? '● ' : '') + (x.title || x.setName))}</option>`).join('')}</select>` : ''}
                        ${isLive ? '<a class="g-btn" href="#/play" title="กลับไปหน้าเกม"><i class="fas fa-gamepad"></i></a>' : `<a class="g-btn" href="#/result?id=${esc(g.id)}" title="ผลการแข่งขัน / รายงาน"><i class="fas fa-file-lines"></i></a>`}
                        <button type="button" class="g-btn" data-act="fs" title="เต็มจอ"><i class="fas fa-expand"></i></button>
                    </div>
                </div>
                <div class="board-bars n${g.teams.length}">${g.teams.map((t) => { const r = rk.find((x) => x.id === t.id); return `
                    <div class="bb-team r${r.rank}${cur && cur.id === t.id ? ' on' : ''}" style="--c:${esc(t.color)};--h:${Math.max(6, (Math.max(0, t.score) / max) * 100)}%">
                        <div class="bb-rank">${r.rank === 1 && t.score > 0 ? '<i class="fas fa-crown"></i>' : `อันดับ ${r.rank}`}</div>
                        <div class="bb-col"><div class="bb-fill"><b class="bb-score">${UI.fmt(t.score)}</b></div></div>
                        <div class="bb-name"><span class="bb-ic"><i class="fas ${esc(t.icon)}"></i></span>${esc(t.name)}</div>
                        <div class="bb-sub">ทำถูก ${r.ok} ${g.mode === 'memory' ? 'คู่' : g.mode === 'match' ? 'คู่' : 'ข้อ'}${cur && cur.id === t.id ? ' • <b>ถึงตา</b>' : ''}</div>
                        ${isLive ? `<div class="bb-adj"><button type="button" class="g-btn sm" data-adj="-5" data-team="${t.id}" data-demo-allow title="หัก 5 คะแนน">−5</button><button type="button" class="g-btn sm" data-adj="5" data-team="${t.id}" title="เพิ่ม 5 คะแนน">+5</button><button type="button" class="g-btn sm" data-adj="10" data-team="${t.id}" title="เพิ่ม 10 คะแนน">+10</button></div>` : ''}
                    </div>`; }).join('')}</div>
            </div>`;
        el.onclick = (e) => {
            const a = e.target.closest('[data-adj]');
            if (a) {
                const lg = Store.data.live;
                if (!lg) return;
                const delta = Number(a.dataset.adj);
                Engine.adjust(lg, a.dataset.team, delta, 'ปรับคะแนนจากกระดานคะแนน');
                Sound.play(delta > 0 ? 'score' : 'minus');
                Store.saveLive(lg);
                render(root, { id: lg.id });
                return;
            }
            const b = e.target.closest('[data-act="fs"]');
            if (b) toggleFs();
        };
        const sel = el.querySelector('#bd-sel');
        if (sel) sel.onchange = () => App.go('board', { id: sel.value });
        if (document.body.classList.contains('game-fs')) el.querySelector('#board').classList.add('fs');
    }
    function toggleFs() {
        const on = !document.body.classList.contains('game-fs');
        document.body.classList.toggle('game-fs', on);
        const bd = root.querySelector('#board');
        if (bd) bd.classList.toggle('fs', on);
        if (on && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && App.current === 'board' && document.body.classList.contains('game-fs')) toggleFs();
    });

    window.Views.board = {
        render,
        refresh() { if (root) render(root, { id: curId }); },
        leave() { if (document.body.classList.contains('game-fs')) { document.body.classList.remove('game-fs'); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } },
        key(e) { if (e.key.toLowerCase() === 'f') { e.preventDefault(); toggleFs(); } },
    };
})();
