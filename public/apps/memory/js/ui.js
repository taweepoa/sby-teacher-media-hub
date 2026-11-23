/* =====================================================================
   ส่วนประกอบหน้าจอที่ใช้ซ้ำ (หน้าการ์ด ป้ายทีม ชิปข้อความสำเร็จรูป)
   ===================================================================== */
(function () {
    'use strict';

    const esc = U.esc;
    const UI = {};

    UI.fmt = (n) => Number(n || 0).toLocaleString('th-TH');
    /* หน้าต่างฟอร์มสีตามธีมระบบ (U.sheet ของ kit ใส่สีม่วงไว้ตายตัว) */
    UI.sheet = (opts) => U.sheet(Object.assign({ tone: ['var(--hero-1)', 'var(--ac)', 'var(--ac-2)'] }, opts));
    UI.empty = (icon, title, text, actions) => `<div class="empty-state"><span class="ic-box lg" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas ${icon}"></i></span><h3>${esc(title)}</h3><p>${text || ''}</p>${actions || ''}</div>`;
    UI.setIcon = (s, size) => `<span class="ic-box ${size || ''}" style="--a:${esc(s.color)};--b:color-mix(in srgb, ${esc(s.color)} 55%, #fff)"><i class="fas ${esc(s.icon)}"></i></span>`;
    UI.teamChip = (t) => `<span class="team-chip" style="--c:${esc(t.color)}"><i class="fas ${esc(t.icon)}"></i>${esc(t.name)}</span>`;
    /* ด้าน A ของการ์ด: รูปย่อ / อีโมจิตัวใหญ่ / ข้อความ */
    UI.face = (p, side) => {
        if (side === 'b') return `<span class="cf-text${p.b.length > 24 ? ' long' : ''}">${esc(p.b)}</span>`;
        if (p.img) return `<img class="cf-img" src="${esc(p.img)}" alt="${esc(p.a || 'ภาพ')}" draggable="false">${p.a && !Docs.isEmoji(p.a) ? `<span class="cf-cap">${esc(p.a)}</span>` : ''}`;
        if (Docs.isEmoji(p.a)) return `<span class="cf-emoji">${esc(p.a)}</span>`;
        return `<span class="cf-text${p.a.length > 24 ? ' long' : ''}">${esc(p.a)}</span>`;
    };

    /* ชิปข้อความสำเร็จรูป: กดแล้วใส่ค่าลงช่องเป้าหมาย (แก้ไขต่อได้เสมอ) */
    UI.chips = (target, list, mode) => `<div class="chips" data-chip-target="${esc(target)}" data-chip-mode="${mode || 'set'}">${list.map((v) => `<button type="button" class="chip" data-chip="${esc(v)}">${esc(v)}</button>`).join('')}</div>`;
    UI.bindChips = (root) => {
        root.querySelectorAll('[data-chip-target]').forEach((box) => {
            box.addEventListener('click', (e) => {
                const b = e.target.closest('[data-chip]');
                if (!b) return;
                const el = root.querySelector(box.dataset.chipTarget);
                if (!el) return;
                const v = b.dataset.chip;
                el.value = box.dataset.chipMode === 'append' && el.value.trim() ? `${el.value.trim()} ${v}` : v;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.focus();
            });
        });
    };

    UI.subjectOptions = (value) => {
        const list = Store.SUBJECTS.map((s) => s.name);
        if (value && !list.includes(value)) list.push(value);
        return U.options(list, value, { placeholder: '— เลือกวิชา —' });
    };
    UI.setThumb = (s) => {
        const first = s.pairs.find((q) => q.img || Docs.isEmoji(q.a));
        if (first && first.img) return `<img class="set-thumb-img" src="${esc(first.img)}" alt="">`;
        if (first) return `<span class="set-thumb-emo">${s.pairs.filter((q) => Docs.isEmoji(q.a)).slice(0, 3).map((q) => esc(q.a)).join('')}</span>`;
        return `<span class="set-thumb-ic" style="--c:${esc(s.color)}"><i class="fas ${esc(s.icon)}"></i></span>`;
    };
    UI.statusTag = (g) => (g.status === 'playing' ? '<span class="tag warn"><i class="fas fa-circle-play"></i>กำลังเล่น</span>' : '<span class="tag ok"><i class="fas fa-flag-checkered"></i>จบแล้ว</span>');
    UI.rankBadge = (r) => `<span class="rank-badge r${r}">${r}</span>`;
    UI.todayText = () => { const d = new Date(); return `${d.getDate()} ${['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][d.getMonth()]} ${d.getFullYear() + 543}`; };

    /* ข้อความสำเร็จรูป */
    UI.PRESET = {
        titles: (s) => [
            `เกมจับคู่ความจำทบทวนบทเรียน${s && s.subject ? s.subject : ''}`,
            `แข่งขันเกมจับคู่ "${s && s.name ? s.name : 'ชุดเนื้อหา'}"`,
            'กิจกรรมวันวิชาการ: เกมจับคู่ความจำและเกมทายใจ',
            'เกมทบทวนท้ายคาบเรียน',
            'การแข่งขันเกมจับคู่ระหว่างห้องเรียน',
        ],
        places: ['ห้องเรียน', 'ห้องประชุมโรงเรียน', 'หอประชุมโรงเรียน', 'ห้องปฏิบัติการคอมพิวเตอร์', 'ห้องสมุดโรงเรียน', 'ลานกิจกรรมโรงเรียน'],
        positions: ['ครู', 'ครูชำนาญการ', 'ครูชำนาญการพิเศษ', 'ครูผู้ช่วย', 'หัวหน้ากลุ่มสาระการเรียนรู้', 'หัวหน้างานกิจกรรมพัฒนาผู้เรียน'],
        purposes: ['เพื่อทบทวนบทเรียนและส่งเสริมการเรียนรู้อย่างสนุกสนานผ่านการทำงานเป็นทีม', 'เพื่อส่งเสริมทักษะการคิดวิเคราะห์ การสังเกต และการทำงานร่วมกันของนักเรียน', 'เพื่อเป็นกิจกรรมเสริมความรู้ในงานวันวิชาการของโรงเรียน'],
    };


    UI.MODE_DESC = {
        memory: 'คว่ำการ์ดทั้งหมด ทีมผลัดกันเปิดทีละ 2 ใบ จับคู่ถูกได้คะแนนและเปิดต่อ',
        match: 'ทีมละรอบ ลากเส้นจับคู่ซ้าย–ขวาให้ครบก่อนหมดเวลา ถูกครบได้โบนัส',
        quiz: 'ขึ้นคำถามพร้อมตัวเลือก จับเวลาถอยหลัง ตอบถูกไวได้คะแนนพิเศษ',
        box: 'ตอบถูกได้สิทธิ์เปิดกล่องลุ้นคะแนน คูณ 2 กล่องว่าง หรือหักคะแนน',
    };
    /* ภาพประกอบรูปแบบเกม (วาดด้วย CSS + ไอคอน ไม่ใช้รูปภายนอก) */
    UI.modeArt = (k) => {
        if (k === 'memory') return '<span class="ma-mem"><i></i><i class="up">A</i><i></i><i class="up">B</i><i></i><i></i></span>';
        if (k === 'match') return '<svg class="ma-match" viewBox="0 0 120 70" aria-hidden="true"><g fill="#fff"><rect x="4" y="6" width="34" height="14" rx="5"/><rect x="4" y="28" width="34" height="14" rx="5"/><rect x="4" y="50" width="34" height="14" rx="5"/><rect x="82" y="6" width="34" height="14" rx="5"/><rect x="82" y="28" width="34" height="14" rx="5"/><rect x="82" y="50" width="34" height="14" rx="5"/></g><g stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".9"><path d="M40 13 C60 13 62 57 80 57"/><path d="M40 35 C60 35 62 13 80 13"/><path d="M40 57 C60 57 62 35 80 35" stroke-dasharray="4 5"/></g></svg>';
        if (k === 'quiz') return '<span class="ma-quiz"><i class="fas fa-stopwatch"></i><b>10</b><span><i></i><i class="ok"></i><i></i><i></i></span></span>';
        return '<span class="ma-box"><i class="fas fa-gift"></i><i class="fas fa-gift"></i><i class="fas fa-star"></i><i class="fas fa-gift"></i></span>';
    };
    UI.modeChip = (m) => `<span class="tag info"><i class="fas ${Engine.MODES[m].icon}"></i>${esc(Engine.MODES[m].short)}</span>`;

    window.UI = UI;
    window.Views = window.Views || {};
})();
