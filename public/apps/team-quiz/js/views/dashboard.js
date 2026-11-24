/* หน้าหลัก: ภาพรวม + เริ่มเกมเร็ว + ผลการแข่งขันล่าสุด */
(function () {
    'use strict';
    const esc = U.esc;

    function render(el) {
        const d = Store.data;
        const s = Link.state && Link.state.status === 'playing' ? Link.state : null;
        const qn = Store.questionCount();
        const done = d.matches.filter((m) => m.status === 'done');
        const recent = d.matches.slice(0, 5);
        const side = s
            ? `<a class="btn-x cta" href="#/control"><i class="fas fa-gamepad"></i>กลับไปหน้าจอควบคุมเกม</a>`
            : `<a class="btn-x cta" href="#/setup"><i class="fas fa-flag-checkered"></i>เริ่มการแข่งขันใหม่</a>`;
        el.innerHTML = `
            ${U.hero({ icon: 'fa-trophy', title: `เกมตอบคำถามแข่งขันแบบทีม${d.school.name ? ` — ${d.school.name}` : ''}`, sub: 'กระดานคะแนนเต็มจอบนโปรเจกเตอร์ ครูควบคุมเกมจากหน้าจอนี้ ใช้งานได้โดยไม่ต้องต่ออินเทอร์เน็ต', side: `<button type="button" class="hero-btn ghost" id="db-board"><i class="fas fa-display"></i>เปิดจอแสดงผล</button>${side}` })}
            ${s ? liveCard(s) : ''}
            <div class="dash-grid">
                <a class="stat-card" style="--a:#dc2626;--b:#f97316" href="#/sets"><span class="ic-box lg" style="--a:#dc2626;--b:#f97316"><i class="fas fa-layer-group"></i></span><div><b>${d.sets.length}</b><span>ชุดคำถาม</span></div></a>
                <a class="stat-card" style="--a:#0A84FF;--b:#5E5CE6" href="#/sets"><span class="ic-box lg" style="--a:#0A84FF;--b:#5E5CE6"><i class="fas fa-circle-question"></i></span><div><b>${UI.fmt(qn)}</b><span>คำถามทั้งหมด</span></div></a>
                <a class="stat-card" style="--a:#30D158;--b:#00C7BE" href="#/teams"><span class="ic-box lg" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-users"></i></span><div><b>${d.teams.length}</b><span>ทีมที่บันทึกไว้</span></div></a>
                <a class="stat-card" style="--a:#FF9F0A;--b:#FF375F" href="#/results"><span class="ic-box lg" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-ranking-star"></i></span><div><b>${done.length}</b><span>การแข่งขันที่จบแล้ว</span></div></a>
            </div>
            <div class="row g-3">
                <div class="col-xl-7">
                    <div class="panel panel--theme h-100">
                        <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-bolt"></i></span><div><h3>เริ่มเกมเร็วจากชุดคำถาม</h3><small>กดเล่นแล้วเลือกทีมและรูปแบบเกมในขั้นถัดไป</small></div>
                            <div class="panel-tools"><a class="btn-x ghost sm" href="#/sets"><i class="fas fa-layer-group"></i>คลังคำถาม</a></div></div>
                        <div class="panel-body">
                            ${d.sets.length ? `<div class="quick-sets">${d.sets.slice(0, 8).map((st) => `
                                <a class="quick-set" href="#/setup?set=${encodeURIComponent(st.id)}">
                                    ${UI.setIcon(st)}<div><b>${esc(st.name || 'ชุดคำถามไม่มีชื่อ')}</b><small>${esc([st.subject, st.level].filter(Boolean).join(' • '))} • ${st.questions.length} ข้อ</small></div>
                                    <span class="go"><i class="fas fa-play"></i></span></a>`).join('')}</div>`
                                : UI.empty('fa-layer-group', 'ยังไม่มีชุดคำถาม', 'สร้างชุดคำถามเอง นำเข้าจาก Excel หรือเพิ่มชุดตัวอย่าง 7 วิชา', '<a class="btn-x primary" href="#/sets"><i class="fas fa-plus"></i>ไปที่คลังคำถาม</a>')}
                        </div>
                    </div>
                </div>
                <div class="col-xl-5">
                    <div class="panel panel--orange h-100">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-ranking-star"></i></span><div><h3>ผลการแข่งขันล่าสุด</h3><small>กดเพื่อดูอันดับ พิมพ์ใบประกาศผล และรายงาน</small></div></div>
                        <div class="panel-body p-0">
                            ${recent.length ? `<div class="recent-list">${recent.map((m) => {
                                const w = Engine.ranking(m)[0];
                                return `<a class="recent" href="#/result?id=${encodeURIComponent(m.id)}">
                                    <div class="min-w-0"><b>${esc(m.title)}</b><small>${esc(m.dateText || U.thDate(m.startedAt))} • ${Engine.MODES[m.mode].label} • ${m.teams.length} ทีม</small></div>
                                    ${m.status === 'done' && w ? UI.teamBadge(w) : UI.statusTag(m)}</a>`;
                            }).join('')}</div>` : UI.empty('fa-flag-checkered', 'ยังไม่มีผลการแข่งขัน', 'เมื่อแข่งขันเสร็จ ผลจะถูกบันทึกไว้ที่นี่อัตโนมัติ')}
                        </div>
                    </div>
                </div>
            </div>
            <div class="panel panel--slate mt-3">
                <div class="panel-head"><span class="ic-box sm" style="--a:#64748b;--b:#334155"><i class="fas fa-circle-info"></i></span><div><h3>วิธีใช้กับโปรเจกเตอร์</h3><small>ใช้ได้ทั้งแบบ 2 จอ (ครูเห็นเฉลย นักเรียนไม่เห็น) และแบบจอเดียว</small></div></div>
                <div class="panel-body">
                    <div class="steps how-steps">
                        <div class="step"><b>1</b><div><strong>ต่อโปรเจกเตอร์แบบ "ขยายจอ" (Extend)</strong>Windows กด <kbd>⊞ Win</kbd>+<kbd>P</kbd> เลือก "ขยาย" • Mac ตั้งค่าจอแสดงผล ไม่เลือก "จอเหมือนกัน"</div></div>
                        <div class="step"><b>2</b><div><strong>กด "เปิดจอแสดงผล"</strong>ลากหน้าต่างใหม่ไปจอโปรเจกเตอร์ แล้วกด "แสดงเต็มจอ"</div></div>
                        <div class="step"><b>3</b><div><strong>คุมเกมที่หน้าจอควบคุม</strong>เฉลย ให้คะแนน ข้าม ย้อนกลับ — จอแสดงผลเปลี่ยนตามทันที (ใช้รีโมตพรีเซนต์ได้)</div></div>
                    </div>
                </div>
            </div>`;
        el.querySelector('#db-board').onclick = App.openBoard;
    }

    function liveCard(s) {
        const p = Engine.progress(s);
        const rk = Engine.ranking(s);
        return `<a class="live-card" href="#/control">
            <span class="live-dot"><i class="fas fa-circle"></i> LIVE</span>
            <div class="min-w-0"><b>${esc(s.title)}</b><small>${Engine.MODES[s.mode].label} • ข้อ ${Math.min(s.idx + 1, p.total)}/${p.total} • ${s.teams.length} ทีม</small></div>
            <div class="live-teams">${rk.slice(0, 4).map((t) => `<span style="--c:${esc(t.color)}"><i class="fas ${esc(t.icon)}"></i>${UI.fmt(t.score)}</span>`).join('')}</div>
            <span class="btn-x primary sm"><i class="fas fa-gamepad"></i>ควบคุมเกม</span>
        </a>`;
    }

    window.Views.dashboard = { render, refresh() { render(document.getElementById('view')); }, live() { render(document.getElementById('view')); } };
})();
