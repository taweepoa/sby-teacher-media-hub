/* ทีมผู้เข้าแข่งขัน (บันทึกไว้ใช้ซ้ำ): ชื่อ สี ไอคอน สมาชิก */
(function () {
    'use strict';
    const esc = U.esc;

    function render(el) {
        const list = Store.data.teams;
        el.innerHTML = `
            ${U.hero({ icon: 'fa-users', title: 'ทีมผู้เข้าแข่งขัน', sub: 'บันทึกทีมประจำ (เช่น ทีมประจำห้อง/ประจำสี) ไว้เลือกใช้ตอนเริ่มการแข่งขัน — ชื่อสมาชิกใช้ในใบประกาศผล เกียรติบัตร และรายงาน', side: '<button type="button" class="btn-x cta" id="tm-new"><i class="fas fa-plus"></i>เพิ่มทีม</button>' })}
            ${list.length ? `<div class="team-grid">${list.map((t) => `
                <div class="team-card" style="--c:${esc(t.color)}">
                    <div class="tcd-top">${UI.teamIcon(t, 'lg')}<div class="min-w-0"><b>${esc(t.name)}</b><small>${esc(t.note || '')}${t.note && t.members.length ? ' • ' : ''}${t.members.length ? `${t.members.length} คน` : ''}</small></div>
                        <span class="ms-auto d-flex gap-1"><button type="button" class="icon-btn edit" data-edit="${esc(t.id)}" title="แก้ไข"><i class="fas fa-pen"></i></button><button type="button" class="icon-btn del" data-del="${esc(t.id)}" title="ลบ"><i class="fas fa-trash"></i></button></span></div>
                    ${t.members.length ? `<ul class="tcd-mem">${t.members.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : '<p class="text-muted-2 small mb-0">ยังไม่ได้ใส่ชื่อสมาชิก</p>'}
                </div>`).join('')}</div>`
                : `<div class="panel"><div class="panel-body">${UI.empty('fa-users', 'ยังไม่มีทีมที่บันทึกไว้', 'ไม่บันทึกก็ได้ — ตั้งชื่อทีมตอนเริ่มการแข่งขันได้เลย แต่ถ้าแข่งบ่อย บันทึกไว้จะสะดวกกว่า', '<button type="button" class="btn-x primary" id="tm-new2"><i class="fas fa-plus"></i>เพิ่มทีมแรก</button>')}</div></div>`}`;
        el.querySelector('#tm-new').onclick = () => edit(null);
        const n2 = el.querySelector('#tm-new2');
        if (n2) n2.onclick = () => edit(null);
        el.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => edit(b.dataset.edit); });
        el.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => remove(b.dataset.del); });
    }

    async function edit(id) {
        const orig = id ? Store.team(id) : null;
        const t = orig ? Engine.clone(orig) : Store.newTeam(Store.data.teams.length);
        const r = await UI.sheet({
            title: orig ? 'แก้ไขทีม' : 'เพิ่มทีม', icon: 'fa-users', width: 640,
            body: `<div class="row g-2"><div class="col-sm-7"><label class="form-label">ชื่อทีม <span class="text-danger">*</span></label><input class="form-control" id="tf-name" value="${esc(t.name)}" maxlength="40" placeholder="เช่น ทีมมังกรไฟ"></div>
                <div class="col-sm-5"><label class="form-label">หมายเหตุ</label><input class="form-control" id="tf-note" value="${esc(t.note)}" maxlength="40" placeholder="เช่น ม.2/1 หรือ คณะสีแดง"></div></div>
                <label class="form-label mt-2">สีทีม</label>${UI.colorPicker('tf-color', t.color)}
                <label class="form-label mt-2">ไอคอน</label>${UI.iconPicker('tf-icon', t.icon, t.color)}
                <label class="form-label mt-2">สมาชิก (บรรทัดละ 1 คน สูงสุด 12 คน)</label>
                <textarea class="form-control" id="tf-mem" rows="4" placeholder="ด.ช.สมชาย ใจดี&#10;ด.ญ.สมหญิง รักเรียน">${esc(t.members.join('\n'))}</textarea>`,
            didOpen: (pop) => pop.addEventListener('change', () => { const c = pop.querySelector('input[name="tf-color"]:checked'); if (c) pop.querySelector('.icon-pick').style.setProperty('--c', c.value); }),
            preConfirm: () => {
                const name = U.norm(document.getElementById('tf-name').value);
                if (!name) { Swal.showValidationMessage('กรุณาใส่ชื่อทีม'); return false; }
                if (Store.data.teams.some((x) => x.name === name && x.id !== t.id)) { Swal.showValidationMessage('มีทีมชื่อนี้แล้ว'); return false; }
                return {
                    name, note: U.norm(document.getElementById('tf-note').value),
                    color: (document.querySelector('input[name="tf-color"]:checked') || {}).value || t.color,
                    icon: (document.querySelector('input[name="tf-icon"]:checked') || {}).value || t.icon,
                    members: document.getElementById('tf-mem').value.split('\n').map(U.norm).filter(Boolean).slice(0, 12),
                };
            },
        });
        if (!r.isConfirmed) return;
        if (orig) Object.assign(orig, r.value);
        else Store.data.teams.push(Object.assign(t, r.value));
        Store.commit('teams', { normalize: true });
        U.toast(orig ? 'บันทึกทีมแล้ว' : 'เพิ่มทีมแล้ว', { type: 'ok' });
    }

    async function remove(id) {
        const t = Store.team(id);
        const ok = await U.confirm('ลบทีมนี้?', `<b>${esc(t.name)}</b><br>ผลการแข่งขันที่ผ่านมายังอยู่ครบ`, { confirmText: 'ลบ', danger: true });
        if (!ok) return;
        Store.data.teams = Store.data.teams.filter((x) => x.id !== id);
        Store.commit('teams');
        U.toast('ลบทีมแล้ว', { type: 'ok' });
    }

    window.Views.teams = { render, refresh() { render(document.getElementById('view')); } };
})();
