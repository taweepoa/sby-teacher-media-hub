/* ออกแบบการ์ด: เลือกชุดคำ ขนาด 3×3/4×4/5×5 จำนวนใบ ช่อง FREE รายชื่อนักเรียน → สร้างการ์ดไม่ซ้ำกัน */
(function () {
    'use strict';

    let root = null;
    let params = {};
    let viewNo = 1;

    function render(el, p) {
        root = el;
        params = p || {};
        const d = Store.data;
        if (params.new) { createGame(params.set); return; }
        const g = params.id ? Store.game(params.id) : null;
        if (!g) { renderList(el); return; }
        renderDesigner(el, g);
    }

    function renderList(el) {
        const d = Store.data;
        el.innerHTML = `
            ${U.hero({ icon: 'fa-table-cells', title: 'ออกแบบการ์ด', sub: 'สร้างการ์ดบิงโกไม่ซ้ำกันตามจำนวนนักเรียน • 3×3 / 4×4 / 5×5 • ช่อง FREE • ใส่ชื่อนักเรียนบนการ์ด',
                side: '<a class="hero-btn" href="#/games?new=1"><i class="fas fa-plus"></i>สร้างการ์ดชุดใหม่</a>' })}
            ${d.games.length ? `<div class="game-grid">${d.games.map(gameTile).join('')}</div>` : App.noGame('fa-table-cells', d.sets.length ? 'เลือกชุดคำแล้วสร้างการ์ดไม่ซ้ำกันตามจำนวนนักเรียน' : 'ต้องมีชุดคำก่อน — ไปที่เมนู "ชุดคำ / คำถาม-คำตอบ"')}`;
    }

    function gameTile(g) {
        const s = Store.set(g.setId);
        const items = Store.itemMap(s);
        const c = g.cards[0];
        return `<div class="game-tile">
            <a class="gt-prev" href="#/games?id=${g.id}">${c ? Card.html(g, c, items, { mini: true }) : ''}</a>
            <div class="gt-body">
                <a href="#/games?id=${g.id}"><b>${U.esc(g.name || 'ไม่มีชื่อ')}</b></a>
                <small>${U.esc(s ? s.name : 'ไม่พบชุดคำ')}</small>
                <div class="mini-stats"><span class="kv">${g.size}×${g.size}</span><span class="kv"><b>${g.cards.length}</b> ใบ</span>${g.free ? '<span class="kv">FREE</span>' : ''}${g.winners.length ? `<span class="tag ok"><i class="fas fa-trophy"></i>${g.winners.length}</span>` : ''}</div>
                <div class="gt-acts">
                    <a class="btn-x ghost sm" href="#/games?id=${g.id}"><i class="fas fa-sliders"></i>ออกแบบ</a>
                    <a class="btn-x ghost sm" href="#/print?game=${g.id}"><i class="fas fa-print"></i>พิมพ์</a>
                    <a class="btn-x primary sm" href="#/caller?game=${g.id}"><i class="fas fa-bullhorn"></i>เรียก</a>
                </div>
            </div>
        </div>`;
    }

    function createGame(setId) {
        const d = Store.data;
        const s = (setId && Store.set(setId)) || d.sets.find((x) => x.items.length >= 8) || d.sets[0];
        if (!s) { U.alert('ยังไม่มีชุดคำ', 'กรุณาสร้างชุดคำหรือนำเข้าจาก Excel ก่อน', 'info').then(() => App.go('sets')); return; }
        const g = Store.newGame(s.id);
        const n = s.items.filter((i) => i.a.trim()).length;
        g.size = n >= 24 ? 5 : n >= 15 ? 4 : 3;
        g.free = true;
        g.name = `บิงโก ${s.name}`;
        g.subtitle = `${s.subject} • ${s.name}`;
        g.count = 30;
        regenerate(g, s);
        d.games.unshift(g);
        Store.setMeta({ lastGame: g.id });
        Store.commit();
        App.go('games', { id: g.id });
    }

    function regenerate(g, s) {
        const ids = s.items.filter((i) => i.a.trim()).map((i) => i.id);
        const r = Bingo.generate(ids, { size: g.size, free: g.free, count: g.count, seed: g.seed });
        g.cards = r.cards;
        g.calls = [];
        g.winners = [];
        g.updatedAt = new Date().toISOString();
        return r;
    }

    function renderDesigner(el, g) {
        const d = Store.data;
        const s = Store.set(g.setId);
        const items = Store.itemMap(s);
        const valid = s ? s.items.filter((i) => i.a.trim()).length : 0;
        const need = Bingo.cellsNeeded(g.size, g.free);
        const stale = Store.gameStale(g) || g.cards.length !== g.count;
        if (viewNo > g.cards.length) viewNo = 1;
        const cur = g.cards.find((c) => c.no === viewNo) || g.cards[0];
        el.innerHTML = `
            ${U.hero({ icon: 'fa-table-cells', title: g.name || 'ออกแบบการ์ด', sub: `${U.esc(s ? s.name : 'ไม่พบชุดคำ')} • ${g.cards.length} ใบ • รหัสชุด ${g.seed}`,
                side: `<a class="hero-btn" href="#/print?game=${g.id}"><i class="fas fa-print"></i>พิมพ์การ์ด</a><a class="hero-btn ghost" href="#/caller?game=${g.id}"><i class="fas fa-bullhorn"></i>เรียกบนจอ</a>` })}
            <div class="designer">
                <div class="panel panel--theme ds-form">
                    <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-sliders"></i></span><div><h3>ตั้งค่าการ์ด</h3><small>เปลี่ยนแล้วกด "สร้างการ์ดใหม่"</small></div>
                        <div class="panel-tools"><a class="btn-x ghost sm" href="#/games"><i class="fas fa-grip"></i>ทุกชุด</a></div></div>
                    <div class="panel-body">
                        <div class="form-grid">
                            <div class="fg-wide"><label class="form-label">ชื่อเกม</label><input class="form-control" data-f="name" value="${U.esc(g.name)}"></div>
                            <div class="fg-wide"><label class="form-label">ชุดคำ</label><select class="form-select" data-f="setId" data-regen="1">${d.sets.map((x) => `<option value="${x.id}"${x.id === g.setId ? ' selected' : ''}>${U.esc(x.name)} (${x.items.length} คำ)</option>`).join('')}</select></div>
                            <div class="fg-wide"><label class="form-label">ขนาดการ์ด</label>
                                <div class="seg full" id="ds-size">${Bingo.SIZES.map((n) => `<button type="button" data-size="${n}" class="${g.size === n ? 'active' : ''}">${n} × ${n}</button>`).join('')}</div></div>
                            <div><label class="form-label">จำนวนการ์ด (ใบ)</label><input class="form-control" type="number" inputmode="numeric" min="1" max="300" data-f="count" data-regen="1" value="${g.count}"></div>
                            <div class="d-flex align-items-end"><label class="check-line mb-2"><input type="checkbox" class="form-check-input" data-f="free" data-regen="1"${g.free ? ' checked' : ''}> ช่อง FREE ตรงกลาง</label></div>
                            <div class="fg-wide"><label class="form-label">หัวการ์ด</label><input class="form-control" data-f="title" value="${U.esc(g.title)}" placeholder="BINGO"></div>
                            <div class="fg-wide"><label class="form-label">บรรทัดรอง (วิชา/เรื่อง)</label><input class="form-control" data-f="subtitle" value="${U.esc(g.subtitle)}"></div>
                            <div><label class="form-label">ชั้น</label><input class="form-control" data-f="cls" value="${U.esc(g.cls)}" placeholder="เช่น ป.4/1"></div>
                            <div><label class="form-label">กติกาการชนะ</label><select class="form-select" data-f="pattern">${Bingo.PATTERNS.map((p) => `<option value="${p.id}"${p.id === g.pattern ? ' selected' : ''}>${p.label}</option>`).join('')}</select></div>
                            <div class="fg-wide"><label class="form-label">รายชื่อนักเรียน (บรรทัดละ 1 คน ตามลำดับหมายเลขการ์ด — ไม่บังคับ)</label>
                                <textarea class="form-control" rows="5" id="ds-students" placeholder="ด.ช.ตัวอย่าง ใจดี&#10;ด.ญ.ตัวอย่าง รักเรียน">${U.esc(g.students.join('\n'))}</textarea>
                                <div class="d-flex justify-content-between align-items-center mt-1 flex-wrap gap-2">
                                    <label class="check-line"><input type="checkbox" class="form-check-input" data-f="showNames"${g.showNames ? ' checked' : ''}> พิมพ์ชื่อบนการ์ด</label>
                                    <button type="button" class="btn-x ghost sm" data-act="count-names"><i class="fas fa-users"></i>ใช้จำนวนการ์ด = จำนวนรายชื่อ</button>
                                </div></div>
                        </div>
                        ${valid < need ? `<div class="note bad mt-3"><i class="fas fa-circle-exclamation"></i><div>การ์ด ${g.size}×${g.size}${g.free ? ' (มี FREE)' : ''} ต้องใช้ <b>${need} คำ</b> แต่ชุดคำนี้มี ${valid} คำ — เพิ่มคำหรือเลือกขนาดเล็กลง</div></div>`
                            : valid < Math.ceil(need * 1.3) ? `<div class="note warn mt-3"><i class="fas fa-triangle-exclamation"></i><div>ชุดคำมี ${valid} คำ ใกล้เคียงจำนวนช่อง (${need}) การ์ดจะคล้ายกันและอาจชนะพร้อมกันหลายใบ — แนะนำให้มีคำ ${Math.ceil(need * 1.5)} คำขึ้นไป</div></div>`
                            : `<div class="note ok mt-3"><i class="fas fa-circle-check"></i><div>ชุดคำมี ${valid} คำ ใช้ ${need} คำต่อใบ — การ์ดทุกใบไม่ซ้ำกัน</div></div>`}
                        ${stale && g.cards.length ? '<div class="note warn"><i class="fas fa-rotate"></i><div>การตั้งค่าเปลี่ยนไป — กด <b>สร้างการ์ดใหม่</b> เพื่อให้การ์ดตรงกับการตั้งค่า</div></div>' : ''}
                        <div class="d-flex gap-2 flex-wrap mt-2">
                            <button type="button" class="btn-x primary lg flex-grow-1" data-act="gen"${valid < need ? ' disabled' : ''}><i class="fas fa-wand-magic-sparkles"></i>สร้างการ์ดใหม่ (สุ่มใหม่)</button>
                            <button type="button" class="btn-x ghost" data-act="del" title="ลบเกมนี้"><i class="fas fa-trash-can"></i>ลบเกม</button>
                        </div>
                        <div class="hint mt-2">รหัสชุด (seed) ${g.seed}: ใช้รหัสเดิม = ได้การ์ดชุดเดิมทุกครั้ง แม้เปิดบนเครื่องอื่น</div>
                    </div>
                </div>
                <div class="ds-preview">
                    <div class="panel panel--orange">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-eye"></i></span><div><h3>ตัวอย่างการ์ด</h3><small>${g.cards.length ? `ใบที่ ${cur.no} จาก ${g.cards.length}` : 'ยังไม่ได้สร้างการ์ด'}</small></div>
                            <div class="panel-tools"><button type="button" class="icon-btn" data-nav="-1" aria-label="ใบก่อนหน้า"><i class="fas fa-chevron-left"></i></button><button type="button" class="icon-btn" data-nav="1" aria-label="ใบถัดไป"><i class="fas fa-chevron-right"></i></button></div></div>
                        <div class="panel-body">
                            <div class="card-stage">${cur ? Card.html(g, cur, items) : '<div class="empty-state"><h3>ยังไม่มีการ์ด</h3></div>'}</div>
                        </div>
                    </div>
                    <div class="panel">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#5E5CE6;--b:#BF5AF2"><i class="fas fa-grip"></i></span><div><h3>การ์ดทั้งหมด</h3><small>แตะเพื่อดูทีละใบ</small></div></div>
                        <div class="panel-body"><div class="thumb-grid">${g.cards.map((c) => `<button type="button" class="thumb${cur && c.no === cur.no ? ' active' : ''}" data-no="${c.no}"><b>${Card.pad(c.no)}</b><small>${U.esc(g.showNames ? g.students[c.no - 1] || '' : '')}</small></button>`).join('')}</div></div>
                    </div>
                </div>
            </div>`;
        bind(el, g, s);
    }

    function bind(el, g, s) {
        el.querySelectorAll('[data-f]').forEach((inp) => {
            inp.onchange = () => {
                const k = inp.dataset.f;
                if (inp.type === 'checkbox') g[k] = inp.checked;
                else if (k === 'count') g[k] = Math.max(1, Math.min(300, U.toInt(inp.value, 30)));
                else g[k] = k === 'setId' ? inp.value : U.norm(inp.value);
                if (k === 'setId') { const ns = Store.set(g.setId); if (ns) g.subtitle = `${ns.subject} • ${ns.name}`; }
                g.updatedAt = new Date().toISOString();
                Store.commit();
            };
        });
        el.querySelectorAll('[data-size]').forEach((b) => { b.onclick = () => { g.size = Number(b.dataset.size); Store.commit(); }; });
        const ta = el.querySelector('#ds-students');
        ta.addEventListener('paste', (e) => {
            const text = (e.clipboardData || window.clipboardData).getData('text');
            if (text.split(/\r?\n/).filter((l) => l.trim()).length > 3 && !VSDemo.allow('วางรายชื่อนักเรียนจำนวนมาก')) e.preventDefault();
        });
        ta.onchange = () => {
            g.students = ta.value.split(/\r?\n/).map((l) => U.norm(l)).filter(Boolean);
            if (g.students.length && !g.showNames) g.showNames = true;
            Store.commit();
        };
        el.querySelector('[data-act="count-names"]').onclick = () => {
            const n = ta.value.split(/\r?\n/).map((l) => U.norm(l)).filter(Boolean);
            if (!n.length) { U.toast('ยังไม่มีรายชื่อนักเรียน', { type: 'warn' }); return; }
            g.students = n; g.count = n.length; g.showNames = true;
            Store.commit();
        };
        el.querySelector('[data-act="gen"]').onclick = async () => {
            if (g.calls.length && !(await U.confirm('สร้างการ์ดใหม่?', `เกมนี้เรียกคำไปแล้ว ${g.calls.length} คำ — ประวัติการเรียกและผู้ชนะจะถูกล้าง และการ์ดที่พิมพ์ไปแล้วจะใช้ไม่ได้`, { confirmText: 'สร้างการ์ดใหม่', danger: true }))) return;
            g.seed = Bingo.newSeed();
            const r = regenerate(g, Store.set(g.setId));
            viewNo = 1;
            Store.commit();
            if (r.error) U.alert('สร้างการ์ดได้ไม่ครบ', U.esc(r.error), 'warning');
            else U.toast(`สร้างการ์ดแล้ว ${g.cards.length} ใบ ไม่ซ้ำกัน${r.warn ? `<br><small>${U.esc(r.warn)}</small>` : ''}`, { type: r.warn ? 'warn' : 'ok', ms: 4500 });
        };
        el.querySelector('[data-act="del"]').onclick = async () => {
            if (!(await U.confirm('ลบเกมนี้?', `<b>${U.esc(g.name)}</b> — การ์ด ${g.cards.length} ใบ ประวัติการเรียก และผู้ชนะจะถูกลบ (ชุดคำยังอยู่)`, { confirmText: 'ลบเกม', danger: true }))) return;
            Store.data.games = Store.data.games.filter((x) => x.id !== g.id);
            Store.commit();
            App.go('games');
        };
        el.querySelectorAll('[data-nav]').forEach((b) => {
            b.onclick = () => {
                if (!g.cards.length) return;
                const i = g.cards.findIndex((c) => c.no === viewNo);
                viewNo = g.cards[(i + Number(b.dataset.nav) + g.cards.length) % g.cards.length].no;
                renderDesigner(root, g);
            };
        });
        el.querySelectorAll('.thumb').forEach((t) => { t.onclick = () => { viewNo = Number(t.dataset.no); renderDesigner(root, g); root.querySelector('.card-stage').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }; });
    }

    window.Views = window.Views || {};
    window.Views.games = { render, refresh: () => render(root, params.new ? { id: Store.meta.lastGame } : params) };
})();
