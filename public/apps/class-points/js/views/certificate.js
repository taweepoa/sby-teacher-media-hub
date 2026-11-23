/* เกียรติบัตร "ดาวเด่นประจำสัปดาห์" — A4 แนวนอน พิมพ์/บันทึก PDF จากเบราว์เซอร์ */
(function () {
    'use strict';
    const st = { week: 0, n: 3, pick: null, director: true, style: 'gold' };
    let root = null;
    const STYLES = { gold: 'ทองมะม่วง', sky: 'ฟ้าใส', rose: 'ชมพูพาสเทล' };

    function weekRef(off) { const d = new Date(); d.setDate(d.getDate() - off * 7); return d; }

    function certHTML(x, i, c, r) {
        const sc = Store.data.school;
        const last = new Date(r.to); last.setDate(last.getDate() - 1);
        const ord = ['ที่ 1', 'ที่ 2', 'ที่ 3', 'ที่ 4', 'ที่ 5'][x.rank - 1] || `ที่ ${x.rank}`;
        const signer = (name, pos) => `<div class="cert-sign"><span class="line"></span><p>(${U.esc(name || '.................................................')})</p><p>${U.esc(pos)}</p></div>`;
        return `<section class="cert-page ${st.style}">
            <div class="cert-frame">
                <div class="cert-stars">${Array.from({ length: 5 }, () => '<i class="fas fa-star"></i>').join('')}</div>
                <p class="cert-school">${U.esc(sc.name || '..................................................')}</p>
                <h1>เกียรติบัตร</h1>
                <p>ขอมอบเกียรติบัตรฉบับนี้ไว้เพื่อแสดงว่า</p>
                <div class="cert-name">${U.esc(Core.fullName(x.s))}</div>
                <p class="cert-why">นักเรียนชั้น ${U.esc(c.name)} เป็น <b>"ดาวเด่นประจำสัปดาห์" อันดับ${ord}</b></p>
                <p>ด้วยพฤติกรรมดี ${x.posCount.toLocaleString()} ครั้ง ได้รับแต้มสุทธิ ${x.net.toLocaleString()} แต้ม</p>
                <p class="cert-date">ระหว่างวันที่ ${U.esc(Docs.dateText(r.from))} ถึงวันที่ ${U.esc(Docs.dateText(last))}</p>
                <p class="cert-bless">ขอให้มีความตั้งใจ มีน้ำใจ และเป็นแบบอย่างที่ดีแก่เพื่อนตลอดไป</p>
                <div class="cert-signs">${signer(sc.teacherName, sc.teacherPosition || 'ครูประจำชั้น')}${st.director ? signer('', sc.director || 'ผู้อำนวยการโรงเรียน') : ''}</div>
                <div class="cert-ava">${UI.ava(x.s, 120)}</div>
                <div class="cert-medal"><i class="fas fa-award"></i><b>${x.rank}</b></div>
            </div></section>`;
    }

    function chosen(c, r) {
        const lb = Core.leaderboard(Store.data, c.id, r).filter((x) => x.net > 0);
        const ids = st.pick || lb.slice(0, st.n).map((x) => x.s.id);
        return { lb, list: lb.filter((x) => ids.includes(x.s.id)) };
    }

    function render(el) {
        root = el;
        const c = Store.current();
        if (!c) { el.innerHTML = UI.noClass(); return; }
        const r = Core.weekRange(weekRef(st.week));
        const { lb, list } = chosen(c, r);
        const ids = new Set(list.map((x) => x.s.id));
        el.innerHTML = `
            ${U.hero({ icon: 'fa-award', title: 'เกียรติบัตรดาวเด่นประจำสัปดาห์', sub: 'ระบบเลือกนักเรียนที่มีแต้มสุทธิสูงสุดของสัปดาห์ให้อัตโนมัติ เปลี่ยนคนได้ พิมพ์ A4 แนวนอน หรือบันทึกเป็น PDF', side: `<button type="button" class="hero-btn" id="ct-print"><i class="fas fa-print"></i>พิมพ์เกียรติบัตร (${list.length})</button>` })}
            <div class="board-bar">${UI.classSeg()}
                <div class="seg" id="ct-week">${[0, 1, 2, 3].map((w) => `<button type="button" data-week="${w}" class="${st.week === w ? 'active' : ''}">${w === 0 ? 'สัปดาห์นี้' : w === 1 ? 'สัปดาห์ที่แล้ว' : `${w} สัปดาห์ก่อน`}</button>`).join('')}</div></div>
            <div class="print-layout">
                <div class="panel panel--theme"><div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-ranking-star"></i></span><div><h3>เลือกดาวเด่น</h3><small>${U.esc(Docs.rangeText('week', r))}</small></div></div>
                    <div class="panel-body d-flex flex-column gap-3">
                        <div><label class="form-label">จำนวนอันดับ (อัตโนมัติ)</label><div class="seg" id="ct-n">${[1, 3, 5].map((n) => `<button type="button" data-n="${n}" class="${!st.pick && st.n === n ? 'active' : ''}">${n} คน</button>`).join('')}</div></div>
                        <div class="pick-lb">${lb.length ? lb.slice(0, 12).map((x) => `<label class="pick-row"><input type="checkbox" class="form-check-input" data-pick="${x.s.id}" ${ids.has(x.s.id) ? 'checked' : ''}><span class="rk r${x.rank}">${x.rank}</span>${UI.ava(x.s, 30)}<b>${U.esc(Core.fullName(x.s))}</b>${UI.pts(x.net)}</label>`).join('') : '<div class="empty-state sm"><i class="fas fa-star"></i><p>สัปดาห์นี้ยังไม่มีนักเรียนที่ได้แต้มสุทธิมากกว่า 0</p></div>'}</div>
                        <div><label class="form-label">ลวดลาย</label><select class="form-select" id="ct-style">${U.options(Object.entries(STYLES).map(([value, text]) => ({ value, text })), st.style)}</select></div>
                        <label class="d-flex gap-2 align-items-center"><input type="checkbox" class="form-check-input m-0" id="ct-dir" ${st.director ? 'checked' : ''}>มีช่องลงนามผู้อำนวยการ</label>
                    </div></div>
                <div class="panel panel--slate"><div class="panel-head"><span class="ic-box sm" style="--a:#475569;--b:#94a3b8"><i class="fas fa-eye"></i></span><div><h3>ตัวอย่างเกียรติบัตร</h3><small>${list.length} ใบ • A4 แนวนอน</small></div></div>
                    <div class="panel-body"><div class="preview-box" id="ct-preview">${list.length ? `<div class="preview-fit"><div class="pv-inner">${UI.demoMark(list.map((x, i) => certHTML(x, i, c, r)).join(''))}</div></div>` : '<div class="empty-state"><i class="fas fa-award"></i><p>ยังไม่มีนักเรียนที่เลือก</p></div>'}</div></div></div>
            </div>`;
        UI.bindClassSeg(el, () => { st.pick = null; App.render(); });
        el.querySelectorAll('[data-week]').forEach((b) => { b.onclick = () => { st.week = +b.dataset.week; st.pick = null; render(el); }; });
        el.querySelectorAll('[data-n]').forEach((b) => { b.onclick = () => { st.n = +b.dataset.n; st.pick = null; render(el); }; });
        el.querySelectorAll('[data-pick]').forEach((b) => { b.onchange = () => { st.pick = [...el.querySelectorAll('[data-pick]:checked')].map((x) => x.dataset.pick); render(el); }; });
        el.querySelector('#ct-style').onchange = (e) => { st.style = e.target.value; render(el); };
        el.querySelector('#ct-dir').onchange = (e) => { st.director = e.target.checked; render(el); };
        el.querySelector('#ct-print').onclick = () => {
            if (!list.length) { U.toast('ยังไม่มีนักเรียนที่เลือก', { type: 'warn' }); return; }
            UI.print(UI.demoMark(list.map((x, i) => certHTML(x, i, c, r)).join('')));
        };
        UI.fit(el.querySelector('#ct-preview'));
    }
    window.Views.certificate = { render, refresh() { if (root) render(root); }, html: () => { const c = Store.current(); const r = Core.weekRange(weekRef(st.week)); return chosen(c, r).list.map((x, i) => certHTML(x, i, c, r)).join(''); } };
})();
