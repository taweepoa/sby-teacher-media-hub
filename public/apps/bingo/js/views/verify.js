/* ตรวจการ์ดผู้ชนะด้วยหมายเลขการ์ด: เทียบกับคำที่เรียกแล้ว ตามกติกาการชนะ • บันทึกผู้ชนะ */
(function () {
    'use strict';

    let root = null;
    let params = {};
    let reveal = false;

    function render(el, p) {
        root = el;
        params = p || {};
        const g = App.pickGame(params);
        if (!g) { el.innerHTML = U.hero({ icon: 'fa-trophy', title: 'ตรวจการ์ดผู้ชนะ', sub: 'กรอกหมายเลขการ์ด ระบบตรวจกับคำที่เรียกแล้ว' }) + App.noGame('fa-trophy', 'สร้างการ์ดและเริ่มเรียกคำก่อน'); return; }
        const s = Store.set(g.setId);
        const items = Store.itemMap(s);
        const called = new Set(g.calls.map((c) => c.id));
        const no = U.toInt(params.no, 0);
        const card = no ? g.cards.find((c) => c.no === no) : null;
        const pat = Bingo.PATTERNS.find((x) => x.id === g.pattern);
        const res = card ? Bingo.check(card, called, g.pattern, g.size) : null;
        const lastId = g.calls.length ? g.calls[g.calls.length - 1].id : '';
        const already = card && g.winners.some((w) => w.no === card.no);
        const all = Bingo.winners(g.cards, called, g.pattern, g.size);
        el.innerHTML = `
            ${U.hero({ icon: 'fa-trophy', title: 'ตรวจการ์ดผู้ชนะ', sub: `กติกา: ${pat.label} (${pat.desc}) • เรียกแล้ว ${g.calls.length} คำ` })}
            <div class="verify">
                <div>
                    <div class="panel panel--theme">
                        <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-magnifying-glass"></i></span><div><h3>กรอกหมายเลขการ์ด</h3><small>ดูหมายเลขที่มุมขวาบนของการ์ด</small></div></div>
                        <div class="panel-body">
                            <div class="mb-3">${App.gameSelect(g, 'verify')}</div>
                            <form id="vf-form" class="vf-form">
                                <input class="form-control vf-input" type="number" inputmode="numeric" min="1" max="${g.cards.length}" id="vf-no" value="${no || ''}" placeholder="หมายเลขการ์ด 1–${g.cards.length}" aria-label="หมายเลขการ์ด" autocomplete="off">
                                <button type="submit" class="btn-x primary lg"><i class="fas fa-check-double"></i>ตรวจ</button>
                            </form>
                            <div class="vf-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map((k) => `<button type="button" data-k="${k}" aria-label="${k === 'C' ? 'ล้าง' : k === '⌫' ? 'ลบตัวเลขท้าย' : k}">${k === '⌫' ? '<i class="fas fa-delete-left"></i>' : k}</button>`).join('')}</div>
                        </div>
                    </div>
                    <div class="panel panel--green">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#30D158;--b:#00A86B"><i class="fas fa-medal"></i></span><div><h3>ผู้ชนะที่บันทึกไว้</h3><small>${g.winners.length} คน</small></div></div>
                        <div class="panel-body p-0">
                            <div class="dt-wrap"><table class="dt"><thead><tr><th class="num">ที่</th><th>การ์ด</th><th>รายละเอียด</th><th class="act"></th></tr></thead>
                            <tbody>${g.winners.length ? g.winners.map((w, i) => `<tr><td class="num">${i + 1}</td><td><a href="#/verify?game=${g.id}&no=${w.no}"><b>${Card.pad(w.no)}</b></a> ${U.esc(g.students[w.no - 1] || '')}</td><td><small>${U.esc(w.detail || '')} • เรียก ${w.calls || '-'} คำ • ${U.esc(U.thDate(w.at, true))}</small></td><td class="act"><button type="button" class="icon-btn del" data-del="${i}" title="ลบผู้ชนะ" aria-label="ลบผู้ชนะ"><i class="fas fa-trash-can"></i></button></td></tr>`).join('') : U.emptyRow(4, 'fa-medal', 'ยังไม่มีผู้ชนะ')}</tbody></table></div>
                        </div>
                    </div>
                    <div class="panel">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-user-secret"></i></span><div><h3>การ์ดที่ครบตามกติกาแล้ว</h3><small>สำหรับครู — ${all.length} ใบ</small></div>
                            <div class="panel-tools"><button type="button" class="btn-x ghost sm" data-act="reveal"><i class="fas fa-eye${reveal ? '-slash' : ''}"></i>${reveal ? 'ซ่อน' : 'แสดง'}</button></div></div>
                        <div class="panel-body">${reveal ? (all.length ? `<div class="mini-stats">${all.map((n) => `<a class="kv" href="#/verify?game=${g.id}&no=${n}">${Card.pad(n)}</a>`).join('')}</div>` : '<div class="hint">ยังไม่มีการ์ดที่ครบตามกติกา</div>') : '<div class="hint">กด "แสดง" เพื่อดูหมายเลขการ์ดที่ควรชนะแล้ว (ใช้ตรวจว่ามีใครลืมร้องบิงโก)</div>'}</div>
                    </div>
                </div>
                <div>
                    ${card ? `
                    <div class="vf-result ${res.win ? 'is-win' : 'is-no'}">
                        <span class="vf-ic"><i class="fas ${res.win ? 'fa-trophy' : 'fa-circle-xmark'}"></i></span>
                        <div><h2>${res.win ? 'บิงโก! ถูกต้อง' : 'ยังไม่บิงโก'}</h2>
                        <p>การ์ดหมายเลข <b>${Card.pad(card.no)}</b>${g.students[card.no - 1] ? ` • ${U.esc(g.students[card.no - 1])}` : ''} — ${res.win ? U.esc(res.detail) : `ยังขาดอีก ${res.missing} ช่อง ตามกติกา "${U.esc(pat.label)}"`}</p></div>
                        ${res.win ? (already ? '<span class="tag ok"><i class="fas fa-check"></i>บันทึกแล้ว</span>' : '<button type="button" class="btn-x green lg" data-act="save-win"><i class="fas fa-medal"></i>บันทึกเป็นผู้ชนะ</button>') : ''}
                    </div>
                    <div class="panel"><div class="panel-body"><div class="card-stage">${Card.html(g, card, items, { marked: res.marked, hits: res.hits, calledLast: lastId })}</div>
                        <div class="vf-legend"><span><i class="lg-mark"></i>คำที่เรียกแล้ว</span><span><i class="lg-hit"></i>แถวที่ทำให้ชนะ</span><span><i class="lg-last"></i>คำล่าสุด</span></div></div></div>`
                    : `<div class="panel"><div class="panel-body"><div class="empty-state"><span class="ic-box lg" style="--a:#30D158;--b:#00A86B"><i class="fas fa-trophy"></i></span><h3>${no ? `ไม่พบการ์ดหมายเลข ${no}` : 'รอตรวจการ์ด'}</h3><div>เกมนี้มีการ์ดหมายเลข 1–${g.cards.length} • ระบบจะแสดงการ์ดพร้อมคำที่เรียกแล้ว</div></div></div></div>`}
                </div>
            </div>`;
        App.bindGameSelect(el);
        const inp = el.querySelector('#vf-no');
        el.querySelector('#vf-form').onsubmit = (e) => { e.preventDefault(); App.go('verify', { game: g.id, no: U.toInt(inp.value, 0) }); };
        el.querySelectorAll('[data-k]').forEach((b) => {
            b.onclick = () => {
                const k = b.dataset.k;
                if (k === 'C') inp.value = '';
                else if (k === '⌫') inp.value = inp.value.slice(0, -1);
                else inp.value = `${inp.value}${k}`.replace(/^0+/, '').slice(0, 3);
            };
        });
        el.querySelector('[data-act="reveal"]').onclick = () => { reveal = !reveal; render(root, params); };
        const sw = el.querySelector('[data-act="save-win"]');
        if (sw) sw.onclick = () => {
            g.winners.push({ no: card.no, at: new Date().toISOString(), pattern: g.pattern, detail: res.detail, calls: g.calls.length });
            Store.commit();
            Sound.win();
            U.toast(`บันทึกผู้ชนะ การ์ดหมายเลข ${Card.pad(card.no)} แล้ว`, { type: 'ok' });
        };
        el.querySelectorAll('[data-del]').forEach((b) => {
            b.onclick = async () => {
                const w = g.winners[Number(b.dataset.del)];
                if (!(await U.confirm('ลบผู้ชนะรายการนี้?', `การ์ดหมายเลข ${Card.pad(w.no)}`, { confirmText: 'ลบ', danger: true }))) return;
                g.winners.splice(Number(b.dataset.del), 1);
                Store.commit();
            };
        });
        if (card) { if (res.win && !params.quiet) Sound.win(); else if (!res.win) Sound.buzz(); }
        if (!no && window.matchMedia('(min-width: 992px)').matches) inp.focus();
    }

    window.Views = window.Views || {};
    window.Views.verify = { render, refresh: () => render(root, Object.assign({}, params, { quiet: 1 })) };
})();
