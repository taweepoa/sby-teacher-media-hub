/* หน้าหลัก: ภาพรวม + เริ่มเกมด่วน + ผลการแข่งขันล่าสุด */
(function () {
    'use strict';
    const esc = U.esc;

    function render(el) {
        const d = Store.data;
        const g = d.live;
        const b = Store.board(d.settings.boardId) || d.boards[0];
        const lastGames = d.games.slice(0, 5);
        const qTotal = Store.questionCount();
        el.innerHTML = `
            <section class="dash-hero">
                <div class="dh-text">
                    <small>${esc(d.school.name || 'เกมทบทวนบทเรียนหน้าชั้นเรียน')}</small>
                    <h2>เกมบันไดงูตอบคำถาม</h2>
                    <p>ทอยเต๋า เดินหมาก ตกช่องคำถามต้องตอบ — ถูกเดินต่อ ผิดถอย ขึ้นบันได หนีงู แข่งกันเป็นทีมบนจอหน้าห้อง</p>
                    <div class="d-flex gap-2 flex-wrap">
                        ${g ? '<a class="btn-x cta lg" href="#/play"><i class="fas fa-circle-play"></i> เล่นเกมที่ค้างต่อ</a>' : ''}
                        <a class="btn-x ${g ? 'ghost' : 'cta'} lg" href="#/play?new=1"><i class="fas fa-dice"></i> เริ่มเกมใหม่</a>
                        <a class="btn-x ghost lg" href="#/library"><i class="fas fa-layer-group"></i> ชุดคำถาม</a>
                    </div>
                </div>
                <div class="dh-board">${b ? BoardArt.html(b, { mini: true }) : ''}</div>
            </section>
            <div class="stat-grid dash-stats">
                <div class="stat-card"><span class="ic-box" style="--a:#0A84FF;--b:#5E5CE6"><i class="fas fa-layer-group"></i></span><div><b>${UI.fmt(d.sets.length)}</b><small>ชุดคำถาม</small></div></div>
                <div class="stat-card"><span class="ic-box" style="--a:#BF5AF2;--b:#FF375F"><i class="fas fa-circle-question"></i></span><div><b>${UI.fmt(qTotal)}</b><small>คำถามทั้งหมด</small></div></div>
                <div class="stat-card"><span class="ic-box" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-stairs"></i></span><div><b>${UI.fmt(d.boards.length)}</b><small>กระดานที่ออกแบบไว้</small></div></div>
                <div class="stat-card"><span class="ic-box" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-trophy"></i></span><div><b>${UI.fmt(d.games.length)}</b><small>เกมที่เล่นแล้ว</small></div></div>
            </div>
            <div class="two-col">
                <section class="panel panel--green">
                    <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-bolt"></i></span><div><h3>เริ่มเกมด่วนจากชุดคำถาม</h3><small>กดแล้วไปหน้าตั้งค่าเกม เลือกกระดานและทีมต่อ</small></div></div>
                    <div class="panel-body">${d.sets.length ? `<div class="quick-sets">${d.sets.map((s) => `<a class="quick-set" href="#/play?new=1&set=${esc(s.id)}">${UI.setIcon(s)}<span class="qs-body"><b>${esc(s.name || '(ไม่มีชื่อ)')}</b><small>${esc(s.subject || '-')} • ${s.questions.length} ข้อ</small></span><i class="fas fa-circle-play qs-go"></i></a>`).join('')}</div>` : UI.empty('fa-layer-group', 'ยังไม่มีชุดคำถาม', 'สร้างชุดคำถามหรือโหลดข้อมูลตัวอย่าง', '<a class="btn-x primary" href="#/library">ไปที่ชุดคำถาม</a>')}</div>
                </section>
                <section class="panel panel--orange">
                    <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-ranking-star"></i></span><div><h3>ผลการแข่งขันล่าสุด</h3><small>ดูประวัติคำถาม พิมพ์ใบสรุปผล และรายงาน .docx</small></div></div>
                    <div class="panel-body">${lastGames.length ? lastGames.map((x) => { const w = Engine.ranking(x)[0]; return `<a class="recent-game" href="#/result?id=${esc(x.id)}"><span class="rg-ic" style="--c:${esc(w.color)}"><i class="fas fa-trophy"></i></span><span class="flex-grow-1 min-w-0"><b>${esc(x.title || x.setName)}</b><small>${esc(x.dateText || '')} • ชนะ: ${esc(w.name)} • ${Engine.questionLog(x).length} คำถาม</small></span><i class="fas fa-chevron-right muted"></i></a>`; }).join('') : UI.empty('fa-trophy', 'ยังไม่มีผลการแข่งขัน', 'เล่นเกมจบแล้วผลจะมาแสดงที่นี่')}</div>
                </section>
            </div>
            <section class="panel panel--slate">
                <div class="panel-head"><span class="ic-box sm" style="--a:#64748b;--b:#94a3b8"><i class="fas fa-lightbulb"></i></span><div><h3>เล่นอย่างไร</h3></div></div>
                <div class="panel-body how-grid">
                    <div><span class="how-ic" style="--c:#2563eb"><i class="fas fa-dice"></i></span><b>ทอยลูกเต๋า</b><small>กดปุ่มหรือ Space ทีมเดินตามแต้ม</small></div>
                    <div><span class="how-ic" style="--c:#9333ea"><i class="fas fa-circle-question"></i></span><b>ตกช่องคำถาม</b><small>ตอบภายในเวลา ถูกเดินต่อ ผิดถอย</small></div>
                    <div><span class="how-ic" style="--c:#a16207"><i class="fas fa-stairs"></i></span><b>บันได / งู</b><small>ถึงเชิงบันไดปีนขึ้น ถึงหัวงูไถลลง</small></div>
                    <div><span class="how-ic" style="--c:#f59e0b"><i class="fas fa-star"></i></span><b>ช่องพิเศษ</b><small>โบนัสเดินหน้า หยุดพักข้ามตา ทอยอีกครั้ง</small></div>
                    <div><span class="how-ic" style="--c:#16a34a"><i class="fas fa-trophy"></i></span><b>เส้นชัย</b><small>ทีมแรกที่ถึงช่องสุดท้ายชนะ พร้อมพลุ</small></div>
                </div>
            </section>`;
    }
    window.Views.dashboard = { render, refresh() { const el = document.getElementById('view'); if (el) render(el); } };
})();
