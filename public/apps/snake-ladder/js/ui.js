/* =====================================================================
   ส่วนประกอบหน้าจอที่ใช้ซ้ำ (ป้ายทีม ชิปข้อความสำเร็จรูป ไอคอนชุดคำถาม ลูกเต๋า)
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
    UI.qTypeTag = (type) => { const t = Engine.QTYPES[type]; return `<span class="qtype qt-${type}"><i class="fas ${t.icon}"></i>${esc(t.short)}</span>`; };
    UI.rankBadge = (r) => `<span class="rank-badge r${r}">${r}</span>`;
    UI.statusTag = (g) => (g.status === 'playing' ? '<span class="tag warn"><i class="fas fa-circle-play"></i>กำลังเล่น</span>' : '<span class="tag ok"><i class="fas fa-flag-checkered"></i>จบแล้ว</span>');
    UI.todayText = () => { const d = new Date(); return `${d.getDate()} ${['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][d.getMonth()]} ${d.getFullYear() + 543}`; };

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

    /* ลูกเต๋า 3 มิติ (6 หน้า จุดตามมาตรฐาน) */
    const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
    UI.dice = (v) => `<div class="dice-wrap"><div class="dice show-${v || 1}">${[1, 2, 3, 4, 5, 6].map((f) => `<div class="df df-${f}">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `<i${PIPS[f].includes(k) ? ' class="on"' : ''}></i>`).join('')}</div>`).join('')}</div></div>`;

    /* ข้อความสำเร็จรูป */
    UI.PRESET = {
        titles: (s) => [
            `เกมบันไดงูทบทวน${s && s.subject ? s.subject : 'บทเรียน'}`,
            `แข่งขันเกมบันไดงูตอบคำถาม "${s && s.name ? s.name : 'ชุดคำถาม'}"`,
            'กิจกรรมวันวิชาการ: เกมบันไดงูตอบคำถาม',
            'เกมทบทวนก่อนสอบปลายภาค',
            'การแข่งขันเกมบันไดงูระหว่างห้องเรียน',
        ],
        places: ['ห้องเรียน', 'ห้องประชุมโรงเรียน', 'หอประชุมโรงเรียน', 'ห้องปฏิบัติการคอมพิวเตอร์', 'ห้องสมุดโรงเรียน', 'ลานกิจกรรมโรงเรียน'],
        positions: ['ครู', 'ครูชำนาญการ', 'ครูชำนาญการพิเศษ', 'ครูผู้ช่วย', 'หัวหน้ากลุ่มสาระการเรียนรู้', 'หัวหน้างานกิจกรรมพัฒนาผู้เรียน'],
        stems: ['ข้อใดถูกต้อง', 'ข้อใดไม่ถูกต้อง', 'ข้อใดไม่ใช่', '... หมายถึงอะไร', '... คืออะไร', 'ข้อใดเป็น ...', 'จากภาพ ...', 'ผลลัพธ์ของ ... คือ'],
        purposes: ['เพื่อทบทวนบทเรียนและส่งเสริมการเรียนรู้อย่างสนุกสนานผ่านการทำงานเป็นทีม', 'เพื่อส่งเสริมทักษะการคิดวิเคราะห์และการทำงานร่วมกันของนักเรียน', 'เพื่อเป็นกิจกรรมเสริมความรู้ในงานวันวิชาการของโรงเรียน'],
    };

    window.UI = UI;
    window.Views = window.Views || {};
})();
