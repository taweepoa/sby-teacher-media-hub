/* ทักษะ / พฤติกรรม (บวก/ลบ) + ชุดสำเร็จรูป */
(function () {
    'use strict';
    const ICONS = ['fa-handshake-angle', 'fa-book-open-reader', 'fa-clipboard-check', 'fa-hand', 'fa-heart', 'fa-people-group', 'fa-lightbulb', 'fa-broom', 'fa-star', 'fa-thumbs-up', 'fa-face-smile', 'fa-chair', 'fa-gift', 'fa-comment-dots', 'fa-book', 'fa-code', 'fa-power-off', 'fa-shield-halved', 'fa-medal', 'fa-volume-high', 'fa-clock', 'fa-file-circle-xmark', 'fa-face-meh', 'fa-gamepad', 'fa-mobile-screen', 'fa-person-walking', 'fa-hand-fist', 'fa-burger'];

    function render(el) {
        const d = Store.data;
        const block = (kind) => {
            const list = d.skills.filter((k) => k.kind === kind);
            return `<div class="panel ${kind === 'pos' ? 'panel--green' : 'panel--pink'}"><div class="panel-head"><span class="ic-box sm" style="--a:${kind === 'pos' ? '#30D158' : '#FF375F'};--b:${kind === 'pos' ? '#00C7BE' : '#FF9F0A'}"><i class="fas ${kind === 'pos' ? 'fa-thumbs-up' : 'fa-hand'}"></i></span><div><h3>${kind === 'pos' ? 'พฤติกรรมดี (ให้แต้ม)' : 'ควรปรับปรุง (หักแต้ม)'}</h3><small>${list.length} รายการ</small></div>
                <div class="panel-tools"><button type="button" class="btn-x primary sm" data-add="${kind}"><i class="fas fa-plus"></i>เพิ่ม</button></div></div>
                <div class="panel-body">${list.length ? `<div class="skill-list">${list.map((k) => `<div class="skill-row ${kind}"><span class="sk-ic"><i class="fas ${k.icon}"></i></span><b>${U.esc(k.name)}</b><span class="sk-pt">${kind === 'neg' ? '−' : '+'}${k.points}</span><button type="button" class="icon-btn edit" data-edit="${k.id}" title="แก้ไข"><i class="fas fa-pen"></i></button><button type="button" class="icon-btn del" data-del="${k.id}" title="ลบทักษะ"><i class="fas fa-trash"></i></button></div>`).join('')}</div>` : '<div class="empty-state sm"><i class="fas fa-list-check"></i><p>ยังไม่มีรายการ</p></div>'}</div></div>`;
        };
        el.innerHTML = `
            ${U.hero({ icon: 'fa-list-check', title: 'ทักษะ / พฤติกรรม', sub: 'กำหนดพฤติกรรมที่ให้แต้มและหักแต้ม ใช้ชุดสำเร็จรูปหรือเพิ่มเองได้ (1–10 แต้ม)', side: `<button type="button" class="hero-btn" id="sk-preset"><i class="fas fa-wand-magic-sparkles"></i>ใช้ชุดสำเร็จรูป</button>` })}
            <div class="row g-3"><div class="col-xl-6">${block('pos')}</div><div class="col-xl-6">${block('neg')}</div></div>`;
        el.querySelector('#sk-preset').onclick = () => preset();
        el.querySelectorAll('[data-add]').forEach((b) => { b.onclick = () => edit(null, b.dataset.add); });
        el.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => { const k = Store.skill(b.dataset.edit); edit(k, k.kind); }; });
        el.querySelectorAll('[data-del]').forEach((b) => { b.onclick = async () => {
            const k = Store.skill(b.dataset.del);
            if (!(await U.confirm(`ลบ "${U.esc(k.name)}"?`, 'แต้มที่เคยให้ไว้ยังอยู่ (แสดงเป็น "ทักษะที่ถูกลบ")', { danger: true, confirmText: 'ลบทักษะ' }))) return;
            Store.data.skills = Store.data.skills.filter((x) => x.id !== k.id); Store.commit('skills');
        }; });
    }

    async function edit(k, kind) {
        const x = k || { name: '', icon: kind === 'pos' ? 'fa-star' : 'fa-clock', points: 1 };
        const r = await UI.sheet({
            title: k ? 'แก้ไขพฤติกรรม' : (kind === 'pos' ? 'เพิ่มพฤติกรรมดี' : 'เพิ่มพฤติกรรมที่ควรปรับปรุง'),
            html: `<div class="sheet-body text-start"><label class="form-label">ชื่อพฤติกรรม</label><input id="sk-name" class="form-control" maxlength="40" value="${U.esc(x.name)}" placeholder="เช่น ช่วยเหลือเพื่อน">
                <label class="form-label mt-2">${kind === 'pos' ? 'ให้' : 'หัก'} (แต้ม)</label><input id="sk-pt" type="number" inputmode="numeric" min="1" max="10" class="form-control" value="${x.points}">
                <label class="form-label mt-2">ไอคอน</label><div class="icon-pick">${ICONS.map((i) => `<button type="button" data-ic="${i}" class="${i === x.icon ? 'active' : ''}"><i class="fas ${i}"></i></button>`).join('')}</div></div>`,
            didOpen: (el) => el.querySelectorAll('[data-ic]').forEach((b) => { b.onclick = () => el.querySelectorAll('[data-ic]').forEach((y) => y.classList.toggle('active', y === b)); }),
            preConfirm: () => {
                const name = U.norm(document.getElementById('sk-name').value);
                if (!name) { Swal.showValidationMessage('กรุณากรอกชื่อพฤติกรรม'); return false; }
                return { name, points: Math.max(1, Math.min(10, U.toInt(document.getElementById('sk-pt').value, 1))), icon: (document.querySelector('.icon-pick .active') || { dataset: {} }).dataset.ic || 'fa-star' };
            },
        });
        if (!r.isConfirmed) return;
        if (k) Object.assign(k, r.value); else Store.data.skills.push(Object.assign({ id: U.uid('k'), kind }, r.value));
        Store.commit('skills');
    }

    async function preset() {
        const r = await UI.sheet({
            title: 'ชุดทักษะสำเร็จรูป', confirmText: '<i class="fas fa-plus"></i> เพิ่มเข้ารายการ',
            html: `<div class="sheet-body text-start">${Object.entries(Core.PRESETS).map(([k, p], i) => `<label class="preset-opt"><input type="radio" name="ps" value="${k}" ${i === 0 ? 'checked' : ''}><div><b>${U.esc(p.name)}</b><small>${p.pos.map((x) => x[0]).concat(p.neg.map((x) => x[0])).join(' • ')}</small></div></label>`).join('')}
                <div class="note info mt-2"><i class="fas fa-circle-info"></i><div>รายการที่ชื่อซ้ำกับที่มีอยู่แล้วจะข้ามไป แต้มเดิมไม่หาย</div></div></div>`,
            preConfirm: () => document.querySelector('input[name="ps"]:checked').value,
        });
        if (!r.isConfirmed) return;
        const names = new Set(Store.data.skills.map((k) => k.name));
        const p = Core.PRESETS[r.value];
        let n = 0;
        [['pos', p.pos], ['neg', p.neg]].forEach(([kind, list]) => list.forEach(([name, icon, points]) => { if (!names.has(name)) { Store.data.skills.push({ id: U.uid('k'), name, icon, points, kind }); n += 1; } }));
        Store.commit('skills');
        U.toast(`เพิ่มแล้ว ${n} รายการ`, { type: 'ok' });
    }

    window.Views.skills = { render, refresh() { App.render(); } };
})();
