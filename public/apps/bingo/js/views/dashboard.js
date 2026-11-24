/* หน้าหลัก: สถิติ ขั้นตอนการใช้งาน เกมล่าสุด ชุดคำ */
(function () {
    'use strict';

    let root = null;

    function render(el) {
        root = el;
        const d = Store.data;
        const items = d.sets.reduce((n, s) => n + s.items.length, 0);
        const cards = d.games.reduce((n, g) => n + g.cards.length, 0);
        const wins = d.games.reduce((n, g) => n + g.winners.length, 0);
        const s = d.school;
        el.innerHTML = `
            ${U.hero({
                icon: 'fa-table-cells',
                title: s.name ? `เกมบิงโกทบทวนบทเรียน — ${s.name}` : 'เกมบิงโกคำศัพท์และสร้างการ์ดอัตโนมัติ',
                sub: 'ชุดคำทุกวิชา • สร้างการ์ด 3×3 / 4×4 / 5×5 ไม่ซ้ำกันตามจำนวนนักเรียน • สุ่มเรียกบนจอพร้อมเสียง • ตรวจผู้ชนะด้วยหมายเลขการ์ด',
                side: `<a class="hero-btn" href="#/games?new=1"><i class="fas fa-wand-magic-sparkles"></i>สร้างการ์ดใหม่</a>
                       <a class="hero-btn ghost" href="#/caller"><i class="fas fa-bullhorn"></i>เริ่มเรียกบนจอ</a>`,
            })}
            <div class="dash-grid">
                <a class="stat-card" style="--a:var(--ac);--b:var(--ac-2)" href="#/sets"><span class="ic-box lg" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-layer-group"></i></span><div><b>${d.sets.length}</b><span>ชุดคำ • ${items.toLocaleString()} คำ</span></div></a>
                <a class="stat-card" style="--a:#0A84FF;--b:#00C7BE" href="#/games"><span class="ic-box lg" style="--a:#0A84FF;--b:#00C7BE"><i class="fas fa-table-cells"></i></span><div><b>${d.games.length}</b><span>ชุดการ์ด (เกม)</span></div></a>
                <a class="stat-card" style="--a:#FF9F0A;--b:#FF375F" href="#/print"><span class="ic-box lg" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-id-card"></i></span><div><b>${cards.toLocaleString()}</b><span>การ์ดที่สร้างแล้ว</span></div></a>
                <a class="stat-card" style="--a:#30D158;--b:#00A86B" href="#/verify"><span class="ic-box lg" style="--a:#30D158;--b:#00A86B"><i class="fas fa-trophy"></i></span><div><b>${wins}</b><span>ผู้ชนะที่บันทึกไว้</span></div></a>
            </div>
            <div class="dash-cols">
                <div>
                    <div class="panel panel--theme">
                        <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-route"></i></span><div><h3>ขั้นตอนการใช้งาน</h3><small>ทำตามลำดับ 1 → 5</small></div></div>
                        <div class="panel-body">
                            <div class="steps">
                                <a class="step${d.sets.length ? ' done' : ''}" href="#/sets"><b>1</b><div><strong>ชุดคำ</strong>พิมพ์คำ/คำถาม-คำตอบ หรือนำเข้าจาก Excel</div></a>
                                <a class="step${d.games.length ? ' done' : ''}" href="#/games"><b>2</b><div><strong>ออกแบบการ์ด</strong>เลือกขนาด จำนวนใบ ช่อง FREE รายชื่อนักเรียน</div></a>
                                <a class="step" href="#/print"><b>3</b><div><strong>พิมพ์การ์ด</strong>1–4 ใบต่อหน้า A4 พร้อมแผ่นรายการคำสำหรับครู</div></a>
                                <a class="step${d.games.some((g) => g.calls.length) ? ' done' : ''}" href="#/caller"><b>4</b><div><strong>เรียกบนจอ</strong>สุ่มคำพร้อมเสียงและแอนิเมชัน ขึ้นจอโปรเจกเตอร์</div></a>
                                <a class="step${wins ? ' done' : ''}" href="#/verify"><b>5</b><div><strong>ตรวจผู้ชนะ</strong>กรอกหมายเลขการ์ด ระบบตรวจให้ทันที</div></a>
                            </div>
                        </div>
                    </div>
                    <div class="panel panel--orange">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-gamepad"></i></span><div><h3>ชุดการ์ด (เกม)</h3><small>${d.games.length} รายการ</small></div>
                            <div class="panel-tools"><a class="btn-x primary sm" href="#/games?new=1"><i class="fas fa-plus"></i>สร้างการ์ดใหม่</a></div></div>
                        <div class="panel-body p-0">${gameList(d)}</div>
                    </div>
                </div>
                <div>
                    <div class="panel panel--purple">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#5E5CE6;--b:#BF5AF2"><i class="fas fa-layer-group"></i></span><div><h3>ชุดคำ</h3><small>${d.sets.length} ชุด</small></div>
                            <div class="panel-tools"><a class="btn-x ghost sm" href="#/sets?new=1"><i class="fas fa-plus"></i>ชุดคำใหม่</a></div></div>
                        <div class="panel-body p-0 dt-wrap">
                            <table class="dt"><thead><tr><th>ชุดคำ</th><th>วิชา</th><th class="num">คำ</th></tr></thead>
                            <tbody>${d.sets.length ? d.sets.map((x) => `<tr><td><a href="#/sets?id=${x.id}"><b>${U.esc(x.name || 'ไม่มีชื่อ')}</b></a></td><td><span class="tag info">${U.esc(x.subject)}</span> <small class="text-muted-2">${U.esc(x.level)}</small></td><td class="num">${x.items.length}</td></tr>`).join('') : U.emptyRow(3, 'fa-layer-group', 'ยังไม่มีชุดคำ — กด "ชุดคำใหม่" หรือนำเข้าจาก Excel')}</tbody></table>
                        </div>
                    </div>
                    <div class="panel panel--teal">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#00C7BE;--b:#0A84FF"><i class="fas fa-lightbulb"></i></span><div><h3>เคล็ดลับการเล่น</h3><small>ให้ทุกคนมีส่วนร่วม</small></div></div>
                        <div class="panel-body tips">
                            <p><i class="fas fa-circle-check"></i>ชุดคำควรมีมากกว่าจำนวนช่องบนการ์ดอย่างน้อย 1.5 เท่า การ์ดจะหลากหลายและไม่ชนะพร้อมกันหลายคน</p>
                            <p><i class="fas fa-circle-check"></i>แบบคำถาม-คำตอบ: ครูอ่านคำถาม นักเรียนต้องคิดหาคำตอบบนการ์ด ได้ทบทวนบทเรียนจริง</p>
                            <p><i class="fas fa-circle-check"></i>กดปุ่ม <b>เต็มจอ</b> ในโหมดเรียก แล้วต่อโปรเจกเตอร์/ทีวี ตัวอักษรจะขยายตามจอ</p>
                            <p><i class="fas fa-circle-check"></i>เมื่อมีคนตะโกน "บิงโก!" ให้กรอกหมายเลขการ์ดที่หน้า <b>ตรวจการ์ดผู้ชนะ</b></p>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    function gameList(d) {
        if (!d.games.length) {
            return `<div class="empty-state sm"><span class="ic-box" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-table-cells"></i></span><h3>ยังไม่มีชุดการ์ด</h3><div>เลือกชุดคำ แล้วสร้างการ์ดไม่ซ้ำกันตามจำนวนนักเรียน</div><a class="btn-x primary sm" href="#/games?new=1"><i class="fas fa-plus"></i>สร้างการ์ดใหม่</a></div>`;
        }
        return `<div class="dt-wrap"><table class="dt"><thead><tr><th>เกม</th><th class="num">ขนาด</th><th class="num">การ์ด</th><th>สถานะ</th><th class="act"></th></tr></thead><tbody>
            ${d.games.map((g) => {
                const s = Store.set(g.setId);
                const st = g.winners.length ? `<span class="tag ok"><i class="fas fa-trophy"></i>มีผู้ชนะ ${g.winners.length}</span>` : g.calls.length ? `<span class="tag warn">เรียกแล้ว ${g.calls.length} คำ</span>` : '<span class="tag info">พร้อมเล่น</span>';
                return `<tr><td><a href="#/games?id=${g.id}"><b>${U.esc(g.name || 'ไม่มีชื่อ')}</b></a><br><small class="text-muted-2">${U.esc(s ? s.name : 'ไม่พบชุดคำ')}</small></td>
                    <td class="num">${g.size}×${g.size}</td><td class="num">${g.cards.length}</td><td>${st}</td>
                    <td class="act"><span class="d-inline-flex gap-1"><a class="icon-btn" href="#/print?game=${g.id}" title="พิมพ์การ์ด"><i class="fas fa-print"></i></a><a class="icon-btn ok" href="#/caller?game=${g.id}" title="เรียกบนจอ"><i class="fas fa-bullhorn"></i></a></span></td></tr>`;
            }).join('')}</tbody></table></div>`;
    }

    window.Views = window.Views || {};
    window.Views.dashboard = { render, refresh: () => render(root) };
})();
