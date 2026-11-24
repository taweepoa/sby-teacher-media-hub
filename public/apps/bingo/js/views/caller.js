/* โหมดเรียกบนจอ: สุ่มคำ/คำถามพร้อมเสียงและแอนิเมชัน • ประวัติที่เรียกแล้ว • กระดานคำทั้งหมด • เต็มจอสำหรับโปรเจกเตอร์ */
(function () {
    'use strict';

    let root = null;
    let params = {};
    let g = null, s = null, items = null;
    let rolling = false;
    let showAns = false;
    let keyHandler = null;

    function render(el, p) {
        root = el;
        params = p || {};
        g = App.pickGame(params);
        if (!g) { el.innerHTML = U.hero({ icon: 'fa-bullhorn', title: 'โหมดเรียกบนจอ', sub: 'สุ่มคำพร้อมเสียงและแอนิเมชัน' }) + App.noGame('fa-bullhorn', 'สร้างการ์ดก่อน แล้วกลับมาเริ่มเกมที่นี่'); return; }
        s = Store.set(g.setId);
        items = Store.itemMap(s);
        const isQA = s && s.items.some((i) => i.q && i.q !== i.a);
        const pat = Bingo.PATTERNS.find((x) => x.id === g.pattern);
        el.innerHTML = `
            <div class="caller" id="caller">
                <div class="cl-bar">
                    <div class="cl-pick">${App.gameSelect(g, 'caller')}</div>
                    <span class="kv"><i class="fas ${pat.icon}"></i>${pat.label}</span>
                    <div class="cl-tools">
                        ${isQA ? `<button type="button" class="btn-x ghost sm${showAns ? ' on' : ''}" data-act="ans" title="แสดงคำตอบใต้คำถาม"><i class="fas fa-eye${showAns ? '' : '-slash'}"></i><span>คำตอบ</span></button>` : ''}
                        <button type="button" class="btn-x ghost sm${Store.meta.sound !== false ? ' on' : ''}" data-act="sound" title="เสียงประกอบ"><i class="fas fa-volume-${Store.meta.sound !== false ? 'high' : 'xmark'}"></i><span>เสียง</span></button>
                        <button type="button" class="btn-x ghost sm${Store.meta.speech !== false ? ' on' : ''}" data-act="speech" title="อ่านออกเสียงคำที่เรียก"><i class="fas fa-comment-dots"></i><span>อ่านออกเสียง</span></button>
                        <button type="button" class="btn-x ghost sm" data-act="full" title="เต็มจอ (F)"><i class="fas fa-expand"></i><span>เต็มจอ</span></button>
                    </div>
                </div>
                <div class="cl-main">
                    <section class="cl-stage">
                        <div class="cl-count"><span>ครั้งที่</span><b id="cl-no">0</b><span>/ ${s ? s.items.length : 0}</span></div>
                        <div class="cl-ball" id="cl-ball"><div class="cl-text" id="cl-text"></div><div class="cl-ans" id="cl-ans"></div></div>
                        <div class="cl-actions">
                            <button type="button" class="btn-x cta lg cl-draw" id="cl-draw"><i class="fas fa-shuffle"></i>สุ่มคำถัดไป <kbd>Space</kbd></button>
                            <button type="button" class="btn-x ghost" data-act="undo" title="ยกเลิกคำล่าสุด"><i class="fas fa-rotate-left"></i>ย้อนคำล่าสุด</button>
                            <button type="button" class="btn-x ghost" data-act="again" title="อ่านออกเสียงอีกครั้ง"><i class="fas fa-volume-high"></i>อ่านอีกครั้ง</button>
                        </div>
                        <form class="cl-check" id="cl-check">
                            <i class="fas fa-trophy"></i><span>มีคนบิงโก? ตรวจการ์ดหมายเลข</span>
                            <input class="form-control" type="number" inputmode="numeric" min="1" id="cl-cardno" placeholder="เช่น 7" aria-label="หมายเลขการ์ด">
                            <button type="submit" class="btn-x green"><i class="fas fa-magnifying-glass"></i>ตรวจ</button>
                        </form>
                    </section>
                    <aside class="cl-side">
                        <div class="panel panel--theme">
                            <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-clock-rotate-left"></i></span><div><h3>เรียกแล้ว</h3><small id="cl-hcount"></small></div>
                                <div class="panel-tools"><button type="button" class="btn-x ghost sm" data-act="reset" title="เริ่มรอบใหม่"><i class="fas fa-arrows-rotate"></i>เริ่มรอบใหม่</button></div></div>
                            <div class="panel-body"><ol class="cl-history" id="cl-history"></ol></div>
                        </div>
                        <div class="panel panel--purple">
                            <div class="panel-head"><span class="ic-box sm" style="--a:#5E5CE6;--b:#BF5AF2"><i class="fas fa-border-all"></i></span><div><h3>กระดานคำทั้งหมด</h3><small>สีเข้ม = เรียกแล้ว</small></div></div>
                            <div class="panel-body"><div class="cl-board" id="cl-board"></div></div>
                        </div>
                        <div id="cl-winhint"></div>
                    </aside>
                </div>
            </div>`;
        App.bindGameSelect(el);
        bind(el);
        update(false);
    }

    function callText(it) { return it ? (it.q || it.a) : ''; }

    function update(animate) {
        const last = g.calls[g.calls.length - 1];
        const it = last ? items.get(last.id) : null;
        root.querySelector('#cl-no').textContent = g.calls.length;
        const t = root.querySelector('#cl-text');
        const a = root.querySelector('#cl-ans');
        if (it) {
            t.textContent = callText(it);
            t.className = `cl-text ${Card.lenClass(callText(it))}`;
            a.textContent = it.q && it.q !== it.a ? it.a : '';
            a.hidden = !showAns || !a.textContent;
        } else {
            t.textContent = s && s.items.length ? 'พร้อมแล้ว!' : 'ชุดคำว่าง';
            t.className = 'cl-text l3 is-idle';
            a.textContent = ''; a.hidden = true;
        }
        const ball = root.querySelector('#cl-ball');
        if (animate) { ball.classList.remove('pop'); void ball.offsetWidth; ball.classList.add('pop'); }
        const called = new Set(g.calls.map((c) => c.id));
        const left = s ? s.items.filter((x) => x.a.trim() && !called.has(x.id)).length : 0;
        root.querySelector('#cl-draw').disabled = !left || rolling;
        root.querySelector('#cl-hcount').textContent = `${g.calls.length} คำ • เหลือ ${left} คำ`;
        root.querySelector('#cl-history').innerHTML = g.calls.length ? g.calls.slice().reverse().map((c, i) => {
            const x = items.get(c.id);
            return `<li class="${i === 0 ? 'is-last' : ''}"><b>${g.calls.length - i}</b><span>${U.esc(callText(x))}${showAns && x && x.q && x.q !== x.a ? `<small>${U.esc(x.a)}</small>` : ''}</span></li>`;
        }).join('') : '<li class="empty"><i class="fas fa-hand-pointer"></i>กด "สุ่มคำถัดไป" เพื่อเริ่มเกม</li>';
        root.querySelector('#cl-board').innerHTML = s ? s.items.filter((x) => x.a.trim()).map((x) => `<span class="${called.has(x.id) ? 'on' : ''}${last && last.id === x.id ? ' last' : ''}">${U.esc(x.a)}</span>`).join('') : '';
        const w = Bingo.winners(g.cards, called, g.pattern, g.size);
        root.querySelector('#cl-winhint').innerHTML = w.length
            ? `<div class="note ok"><i class="fas fa-trophy"></i><div>มีการ์ดที่ครบตามกติกาแล้ว <b>${w.length} ใบ</b> — รอให้นักเรียนร้อง "บิงโก!" แล้วตรวจหมายเลขการ์ด</div></div>`
            : g.calls.length ? '<div class="note"><i class="fas fa-circle-info"></i><div>ยังไม่มีการ์ดที่ครบตามกติกา</div></div>' : '';
    }

    function draw() {
        if (rolling || !s) return;
        const called = new Set(g.calls.map((c) => c.id));
        const pool = s.items.filter((x) => x.a.trim() && !called.has(x.id));
        if (!pool.length) { U.toast('เรียกครบทุกคำแล้ว', { type: 'warn' }); return; }
        const pick = pool[Math.floor(Math.random() * pool.length)];
        rolling = true;
        const ball = root.querySelector('#cl-ball');
        const t = root.querySelector('#cl-text');
        const a = root.querySelector('#cl-ans');
        a.hidden = true;
        ball.classList.add('rolling');
        root.querySelector('#cl-draw').disabled = true;
        const ms = 1300;
        Sound.roll(ms);
        const timer = setInterval(() => {
            const r = pool[Math.floor(Math.random() * pool.length)];
            t.textContent = callText(r);
            t.className = `cl-text ${Card.lenClass(callText(r))}`;
        }, 75);
        setTimeout(() => {
            clearInterval(timer);
            ball.classList.remove('rolling');
            g.calls.push({ id: pick.id, at: new Date().toISOString() });
            g.updatedAt = new Date().toISOString();
            Store.commit('quiet');
            rolling = false;
            if (!root || !root.isConnected) return;
            update(true);
            Sound.ding();
            setTimeout(() => Sound.speak(callText(pick)), 250);
        }, ms);
    }

    function bind(el) {
        el.querySelector('#cl-draw').onclick = draw;
        el.querySelector('[data-act="undo"]').onclick = async () => {
            if (!g.calls.length) return;
            const last = items.get(g.calls[g.calls.length - 1].id);
            if (!(await U.confirm('ย้อนคำล่าสุด?', `นำ <b>${U.esc(callText(last))}</b> กลับเข้ากองคำที่ยังไม่เรียก`, { confirmText: 'ย้อนคำล่าสุด', icon: 'question' }))) return;
            g.calls.pop();
            Store.commit('quiet');
            update(false);
        };
        el.querySelector('[data-act="again"]').onclick = () => { const l = g.calls[g.calls.length - 1]; if (l) Sound.speak(callText(items.get(l.id))); };
        el.querySelector('[data-act="reset"]').onclick = async () => {
            if (!g.calls.length && !g.winners.length) return;
            if (!(await U.confirm('เริ่มรอบใหม่?', `ประวัติการเรียก ${g.calls.length} คำ และผู้ชนะ ${g.winners.length} คนของเกมนี้จะถูกล้าง (การ์ดยังใช้ใบเดิมได้)`, { confirmText: 'เริ่มรอบใหม่', danger: true }))) return;
            g.calls = []; g.winners = [];
            Store.commit('quiet');
            update(false);
            U.toast('เริ่มรอบใหม่แล้ว — การ์ดชุดเดิมเล่นต่อได้เลย', { type: 'ok' });
        };
        const ans = el.querySelector('[data-act="ans"]');
        if (ans) ans.onclick = () => { showAns = !showAns; render(root, { game: g.id }); };
        el.querySelector('[data-act="sound"]').onclick = () => { Store.setMeta({ sound: Store.meta.sound === false }); render(root, { game: g.id }); };
        el.querySelector('[data-act="speech"]').onclick = () => { Store.setMeta({ speech: Store.meta.speech === false }); if (Store.meta.speech === false) Sound.stop(); render(root, { game: g.id }); };
        el.querySelector('[data-act="full"]').onclick = toggleFull;
        el.querySelector('#cl-check').onsubmit = (e) => {
            e.preventDefault();
            const n = U.toInt(el.querySelector('#cl-cardno').value, 0);
            if (!n) return;
            if (document.fullscreenElement) document.exitFullscreen();
            App.go('verify', { game: g.id, no: n });
        };
        if (keyHandler) document.removeEventListener('keydown', keyHandler);
        keyHandler = (e) => {
            if (App.current !== 'caller' || Swal.isVisible()) return;
            if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
            if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); draw(); }
            if (e.key === 'f' || e.key === 'F') toggleFull();
        };
        document.addEventListener('keydown', keyHandler);
    }

    function toggleFull() {
        const c = root.querySelector('#caller');
        if (document.fullscreenElement) document.exitFullscreen();
        else if (c.requestFullscreen) c.requestFullscreen().catch(() => U.toast('เบราว์เซอร์นี้ไม่รองรับโหมดเต็มจอ', { type: 'warn' }));
    }

    function leave() {
        if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
        Sound.stop();
        rolling = false;
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }

    window.Views = window.Views || {};
    window.Views.caller = { render, leave, refresh: () => { if (!rolling) render(root, { game: g ? g.id : '' }); } };
})();
