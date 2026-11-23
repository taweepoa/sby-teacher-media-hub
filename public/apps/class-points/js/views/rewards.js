/* รางวัลแลกแต้ม */
(function () {
    'use strict';
    const ICONS = ['fa-gift', 'fa-star', 'fa-trophy', 'fa-crown', 'fa-chair', 'fa-music', 'fa-ice-cream', 'fa-book', 'fa-pencil', 'fa-note-sticky', 'fa-gamepad', 'fa-user-tie', 'fa-file-circle-check', 'fa-medal', 'fa-heart', 'fa-cookie'];

    function render(el) {
        const d = Store.data;
        const c = Store.current();
        const hist = d.redeems.filter((x) => { const s = Store.student(x.sid); return s && c && s.classId === c.id; }).sort((a, b) => (a.t < b.t ? 1 : -1)).slice(0, 30);
        el.innerHTML = `
            ${U.hero({ icon: 'fa-gift', title: 'รางวัลแลกแต้ม', sub: 'นักเรียนนำแต้มคงเหลือมาแลกรางวัล แต้มที่แลกจะถูกหักจากแต้มคงเหลือ (แต้มในกระดานผู้นำไม่ลด)', side: `<button type="button" class="hero-btn" id="rw-add"><i class="fas fa-plus"></i>เพิ่มรางวัล</button>` })}
            <div class="board-bar">${UI.classSeg()}</div>
            ${d.rewards.length ? `<div class="rw-grid">${d.rewards.map((w) => `
                <div class="rw-card"><span class="rw-ic"><i class="fas ${w.icon}"></i></span><b>${U.esc(w.name)}</b><span class="rw-cost"><i class="fas fa-coins"></i>${w.cost.toLocaleString()} แต้ม</span>
                    <div class="rw-act"><button type="button" class="btn-x primary sm" data-redeem="${w.id}" ${c ? '' : 'disabled'}><i class="fas fa-hand-holding-heart"></i>แลกรางวัล</button>
                    <button type="button" class="icon-btn edit" data-edit="${w.id}" title="แก้ไข"><i class="fas fa-pen"></i></button><button type="button" class="icon-btn del" data-del="${w.id}" title="ลบรางวัล"><i class="fas fa-trash"></i></button></div></div>`).join('')}</div>`
            : '<div class="empty-state"><i class="fas fa-gift"></i><h4>ยังไม่มีรางวัล</h4><p>กด "เพิ่มรางวัล" เช่น เลือกที่นั่งเอง ผู้ช่วยครู 1 วัน</p></div>'}
            <div class="panel panel--orange"><div class="panel-head"><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-receipt"></i></span><div><h3>ประวัติการแลกรางวัล${c ? ` — ${U.esc(c.name)}` : ''}</h3><small>30 รายการล่าสุด</small></div></div>
                <div class="panel-body p-0 dt-wrap"><table class="dt"><thead><tr><th>วันเวลา</th><th>นักเรียน</th><th>รางวัล</th><th class="num">แต้ม</th><th class="act"></th></tr></thead><tbody>
                ${hist.length ? hist.map((x) => { const s = Store.student(x.sid); return `<tr><td>${U.esc(U.thDate(x.t, true))}</td><td><div class="person-cell">${UI.ava(s, 30)}<b>${U.esc(Core.fullName(s))}</b></div></td><td>${U.esc((Store.reward(x.rewardId) || {}).name || x.name || '-')}</td><td class="num"><span class="pts down">−${x.cost}</span></td><td class="act"><button type="button" class="icon-btn del" data-del-rd="${x.id}" title="ลบรายการ"><i class="fas fa-trash"></i></button></td></tr>`; }).join('') : U.emptyRow(5, 'fa-receipt', 'ยังไม่มีการแลกรางวัลในห้องนี้')}
                </tbody></table></div></div>`;
        UI.bindClassSeg(el);
        el.querySelector('#rw-add').onclick = () => edit(null);
        el.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => edit(Store.reward(b.dataset.edit)); });
        el.querySelectorAll('[data-del]').forEach((b) => { b.onclick = async () => {
            const w = Store.reward(b.dataset.del);
            if (!(await U.confirm(`ลบรางวัล "${U.esc(w.name)}"?`, 'ประวัติการแลกเดิมยังอยู่', { danger: true, confirmText: 'ลบรางวัล' }))) return;
            Store.data.redeems.forEach((x) => { if (x.rewardId === w.id) x.name = w.name; });
            Store.data.rewards = Store.data.rewards.filter((x) => x.id !== w.id); Store.commit('rewards');
        }; });
        el.querySelectorAll('[data-del-rd]').forEach((b) => { b.onclick = async () => { if (!(await U.confirm('ลบรายการแลกรางวัลนี้?', 'แต้มที่ใช้แลกจะคืนให้นักเรียน', { danger: true, confirmText: 'ลบรายการ' }))) return; Store.data.redeems = Store.data.redeems.filter((x) => x.id !== b.dataset.delRd); Store.commit('redeem'); }; });
        el.querySelectorAll('[data-redeem]').forEach((b) => { b.onclick = () => redeem(Store.reward(b.dataset.redeem), c); });
    }

    async function edit(w) {
        const x = w || { name: '', icon: 'fa-gift', cost: 10 };
        const r = await UI.sheet({
            title: w ? 'แก้ไขรางวัล' : 'เพิ่มรางวัล',
            html: `<div class="sheet-body text-start"><label class="form-label">ชื่อรางวัล</label><input id="rw-name" class="form-control" value="${U.esc(x.name)}" maxlength="60" placeholder="เช่น เลือกที่นั่งเองได้ 1 วัน">
                <label class="form-label mt-2">ใช้แต้ม</label><input id="rw-cost" type="number" inputmode="numeric" min="1" max="9999" class="form-control" value="${x.cost}">
                <label class="form-label mt-2">ไอคอน</label><div class="icon-pick">${ICONS.map((i) => `<button type="button" data-ic="${i}" class="${i === x.icon ? 'active' : ''}"><i class="fas ${i}"></i></button>`).join('')}</div></div>`,
            didOpen: (el) => el.querySelectorAll('[data-ic]').forEach((b) => { b.onclick = () => el.querySelectorAll('[data-ic]').forEach((y) => y.classList.toggle('active', y === b)); }),
            preConfirm: () => {
                const name = U.norm(document.getElementById('rw-name').value);
                if (!name) { Swal.showValidationMessage('กรุณากรอกชื่อรางวัล'); return false; }
                return { name, cost: Math.max(1, U.toInt(document.getElementById('rw-cost').value, 1)), icon: (document.querySelector('.icon-pick .active') || {}).dataset?.ic || 'fa-gift' };
            },
        });
        if (!r.isConfirmed) return;
        if (w) Object.assign(w, r.value); else Store.data.rewards.push(Object.assign({ id: U.uid('w') }, r.value));
        Store.commit('rewards');
        U.toast('บันทึกรางวัลแล้ว', { type: 'ok' });
    }

    async function redeem(w, c) {
        const bal = Core.balances(Store.data);
        const list = Core.classStudents(Store.data, c.id);
        let sid = null;
        await UI.sheet({
            width: 760, showConfirm: false, cancelText: 'ปิด',
            html: `<div class="sheet-head" style="--s1:var(--hero-1);--s2:var(--hero-2);--s3:var(--hero-3)"><span class="sh-ic"><i class="fas ${w.icon}"></i></span><div><h3>แลก "${U.esc(w.name)}"</h3><p>ใช้ ${w.cost} แต้ม • เลือกนักเรียน (สีจาง = แต้มไม่พอ)</p></div></div>
                <div class="sheet-body"><div class="pick-ava">${list.map((s) => `<button type="button" data-sid="${s.id}" ${bal.get(s.id) < w.cost ? 'disabled' : ''}>${UI.ava(s, 48)}<b>${U.esc(Core.showName(s))}</b><small>${bal.get(s.id).toLocaleString()} แต้ม</small></button>`).join('')}</div></div>`,
            didOpen: (el) => el.querySelectorAll('[data-sid]').forEach((b) => { b.onclick = () => { sid = b.dataset.sid; Swal.close(); }; }),
        });
        if (!sid) return;
        const s = Store.student(sid);
        if (!(await U.confirm(`ยืนยันการแลกรางวัล?`, `<b>${U.esc(Core.fullName(s))}</b> แลก "${U.esc(w.name)}"<br>ใช้ ${w.cost} แต้ม (คงเหลือ ${bal.get(sid) - w.cost} แต้ม)`, { icon: 'question', confirmText: '<i class="fas fa-check"></i> แลกรางวัล' }))) return;
        Store.data.redeems.push({ id: U.uid('x'), t: new Date().toISOString(), sid, rewardId: w.id, cost: w.cost, name: w.name });
        Store.commit('redeem');
        Sfx.fanfare();
        U.toast(`${U.esc(Core.showName(s))} แลก "${U.esc(w.name)}" แล้ว`, { type: 'ok' });
    }

    window.Views.rewards = { render, refresh() { App.render(); }, ICONS };
})();
