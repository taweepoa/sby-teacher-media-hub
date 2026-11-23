/* ส่วนประกอบหน้าจอที่ใช้ร่วมกันหลายหน้า */
(function () {
    'use strict';
    const UI = {};

    /* หน้าต่างแบบ sheet ที่ส่ง html เองได้ (หัวสีตามธีม) — {title, icon, html, ...ตัวเลือกเดียวกับ U.sheet} */
    UI.sheet = (opts) => {
        const head = opts.title ? `<div class="sheet-head" style="--s1:var(--hero-1);--s2:var(--hero-2);--s3:var(--hero-3)"><span class="sh-ic"><i class="fas ${opts.icon || 'fa-pen'}"></i></span><div><h3>${U.esc(opts.title)}</h3></div></div>` : '';
        return Swal.fire({
            html: head + opts.html, width: opts.width || 640,
            showCancelButton: opts.showCancel !== false, showConfirmButton: opts.showConfirm !== false, showDenyButton: !!opts.denyText,
            confirmButtonText: opts.confirmText || '<i class="fas fa-save"></i> บันทึก', cancelButtonText: opts.cancelText || 'ยกเลิก', denyButtonText: opts.denyText || '',
            buttonsStyling: false, reverseButtons: true, focusConfirm: false,
            customClass: { popup: 'sheet', confirmButton: `btn-x ${opts.confirmClass || 'primary'} lg`, cancelButton: 'btn-x ghost lg', denyButton: `btn-x ${opts.denyClass || 'danger'} lg` },
            didOpen: (el) => {
                if (opts.didOpen) opts.didOpen(el);
                const first = el.querySelector('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea');
                if (first) setTimeout(() => first.focus(), 30);
            },
            preConfirm: opts.preConfirm, preDeny: opts.preDeny,
        });
    };

    UI.ava = (s, size) => Avatar.svg(s ? s.avatar : 0, size);

    /* ตัวเลือกห้องเรียน (แท็บ .seg) — เปลี่ยนห้องแล้วจำไว้ใน settings.classId */
    UI.classSeg = (id) => {
        const d = Store.data;
        if (!d.classes.length) return '';
        const cur = Store.current();
        return `<div class="seg cls-seg" id="${id || 'cls-seg'}">${d.classes.map((c) => `<button type="button" data-cls="${c.id}" class="${cur && cur.id === c.id ? 'active' : ''}"><i class="fas fa-users"></i>${U.esc(c.name)}</button>`).join('')}</div>`;
    };
    UI.bindClassSeg = (root, onChange) => {
        root.querySelectorAll('[data-cls]').forEach((b) => {
            b.onclick = () => { Store.data.settings.classId = b.dataset.cls; Store.commit('settings'); onChange ? onChange() : App.render(); };
        });
    };

    UI.noClass = (msg) => `<div class="empty-state"><i class="fas fa-users-slash"></i><h4>ยังไม่มีห้องเรียน</h4><p>${msg || 'เริ่มจากเพิ่มห้องเรียนและนำเข้ารายชื่อนักเรียนที่เมนู "ห้องเรียน / นักเรียน"'}</p><button type="button" class="btn-x primary" data-add-class><i class="fas fa-plus"></i>เพิ่มห้องเรียน</button></div>`;

    UI.pts = (n) => `<span class="pts ${n > 0 ? 'up' : n < 0 ? 'down' : ''}">${n > 0 ? '+' : ''}${Number(n).toLocaleString()}</span>`;

    /* แอนิเมชันแต้มลอยขึ้น + ดาวกระจาย บนการ์ดนักเรียน */
    UI.burst = (el, pts) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const b = document.createElement('div');
        b.className = `pt-burst ${pts >= 0 ? 'up' : 'down'}`;
        b.style.left = `${r.left + r.width / 2}px`; b.style.top = `${r.top + r.height * 0.35}px`;
        b.innerHTML = `<b>${pts > 0 ? '+' : ''}${pts}</b>${pts >= 0 ? Array.from({ length: 8 }, (_, i) => `<i class="fas fa-star" style="--a:${i * 45}deg"></i>`).join('') : ''}`;
        document.body.appendChild(b);
        el.classList.remove('bump', 'shake'); void el.offsetWidth; el.classList.add(pts >= 0 ? 'bump' : 'shake');
        setTimeout(() => b.remove(), 1300);
    };

    /* แผงเลือกทักษะ (ใช้ในหน้าต่างให้แต้ม) */
    UI.skillGrid = () => {
        const d = Store.data;
        const block = (kind) => {
            const list = d.skills.filter((k) => k.kind === kind);
            if (!list.length) return `<div class="text-muted-2 p-2">ยังไม่มีทักษะ — เพิ่มได้ที่เมนู "ทักษะ / พฤติกรรม"</div>`;
            return `<div class="skill-grid">${list.map((k) => `<button type="button" class="skill-btn ${kind}" data-skill="${k.id}"><span class="sk-ic"><i class="fas ${k.icon}"></i></span><span class="sk-name">${U.esc(k.name)}</span><span class="sk-pt">${kind === 'neg' ? '−' : '+'}${k.points}</span></button>`).join('')}</div>`;
        };
        return `<div class="seg mb-2" id="sk-tab"><button type="button" class="active" data-tab="pos"><i class="fas fa-thumbs-up"></i>พฤติกรรมดี</button><button type="button" data-tab="neg"><i class="fas fa-hand"></i>ควรปรับปรุง</button></div>
            <div data-pane="pos">${block('pos')}</div><div data-pane="neg" hidden>${block('neg')}</div>`;
    };
    UI.bindSkillTabs = (root) => {
        root.querySelectorAll('#sk-tab [data-tab]').forEach((b) => {
            b.onclick = () => {
                root.querySelectorAll('#sk-tab [data-tab]').forEach((x) => x.classList.toggle('active', x === b));
                root.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== b.dataset.tab; });
            };
        });
    };

    /* ให้แต้ม: เลือกทักษะแล้วบันทึก + เสียง + แอนิเมชัน + ปุ่มย้อนกลับ */
    UI.awardDialog = async (sids, title, anchors) => {
        if (!sids.length) return;
        const one = sids.length === 1 ? Store.student(sids[0]) : null;
        let chosen = null;
        await UI.sheet({
            title: '', width: 720, showConfirm: false, cancelText: 'ปิด',
            html: `<div class="sheet-head" style="--s1:var(--hero-1);--s2:var(--hero-2);--s3:var(--hero-3)">
                    <span class="sh-ic">${one ? UI.ava(one, 46) : '<i class="fas fa-users"></i>'}</span>
                    <div><h3>${U.esc(title)}</h3><p>${one ? `แต้มคงเหลือ ${Core.balance(Store.data, one.id).toLocaleString()} แต้ม` : `${sids.length} คน`} • แตะพฤติกรรมเพื่อให้แต้ม</p></div></div>
                <div class="sheet-body">${UI.skillGrid()}</div>`,
            didOpen: (el) => {
                UI.bindSkillTabs(el);
                el.querySelectorAll('[data-skill]').forEach((b) => { b.onclick = () => { chosen = b.dataset.skill; Swal.close(); }; });
            },
        });
        if (!chosen) return;
        UI.give(sids, chosen, anchors);
    };

    UI.give = (sids, skillId, anchors) => {
        const k = Store.skill(skillId);
        const list = Store.award(sids, skillId);
        const pts = k.kind === 'neg' ? -k.points : k.points;
        if (pts >= 0) Sfx.good(); else Sfx.bad();
        requestAnimationFrame(() => (anchors ? anchors() : []).forEach((el) => UI.burst(el, pts)));
        const who = sids.length === 1 ? Core.showName(Store.student(sids[0])) : `${sids.length} คน`;
        U.toast(`<b>${U.esc(who)}</b> ${pts >= 0 ? 'ได้' : 'ถูกหัก'} ${Math.abs(pts)} แต้ม — ${U.esc(k.name)}`, {
            type: pts >= 0 ? 'ok' : 'warn', ms: 5000,
            actionText: 'ย้อนกลับ', action: () => { Store.undo(list.map((e) => e.id)); U.toast('ยกเลิกการให้แต้มแล้ว', { type: 'info' }); },
        });
    };

    UI.periodSeg = (cur) => `<div class="seg" id="period-seg">${[['week', 'สัปดาห์นี้'], ['month', 'เดือนนี้'], ['all', 'ทั้งหมด']].map(([k, t]) => `<button type="button" data-period="${k}" class="${cur === k ? 'active' : ''}">${t}</button>`).join('')}</div>`;

    /* ---------- พิมพ์ / ตัวอย่างเอกสาร ---------- */
    UI.demoMark = (html) => {
        if (!window.VSDemo || !VSDemo.active) return html;
        const wm = `<div class="demo-wm" aria-hidden="true"><span>${U.esc(VSDemo.watermark)}</span></div>`;
        return String(html).replace(/<section class="(?:gov-page|cert-page)[^"]*"[^>]*>/g, (m) => m + wm);
    };
    /* ย่อหน้ากระดาษให้พอดีกรอบตัวอย่าง — box มี .preview-fit > .pv-inner */
    UI.fit = (box) => {
        const wrap = box && box.querySelector('.preview-fit');
        const inner = wrap && wrap.querySelector('.pv-inner');
        if (!inner) return;
        inner.style.transform = 'none'; inner.style.width = 'max-content';
        const w = inner.offsetWidth, h = inner.offsetHeight;
        const sc = Math.min(1, Math.max(200, box.clientWidth - 28) / w);
        inner.style.transform = `scale(${sc})`;
        wrap.style.width = `${Math.floor(w * sc)}px`; wrap.style.height = `${Math.ceil(h * sc)}px`;
    };
    UI.print = (html) => {
        const el = document.getElementById('print-root');
        el.innerHTML = html;
        const clear = () => { el.innerHTML = ''; window.removeEventListener('afterprint', clear); };
        window.addEventListener('afterprint', clear);
        setTimeout(() => window.print(), 80);
    };
    window.addEventListener('resize', U.debounce(() => document.querySelectorAll('.preview-box').forEach(UI.fit), 150));

    window.UI = UI;
    window.Views = window.Views || {};
})();
