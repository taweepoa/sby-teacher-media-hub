/* =====================================================================
   ส่วนประกอบหน้าจอที่ใช้ซ้ำหลายหน้า (ป้ายทีม ป้ายรูปแบบเกม การ์ดคำถาม ตัวเลือกสี/ไอคอน)
   ===================================================================== */
(function () {
    'use strict';

    const esc = U.esc;
    const UI = {};

    UI.fmt = (n) => Number(n || 0).toLocaleString('th-TH');
    UI.letters = () => Engine.LETTERS[(Store.data && Store.data.settings.letters) || 'th'] || Engine.LETTERS.th;

    /* หน้าต่างฟอร์มสีตามธีมระบบ (U.sheet ของ kit ใส่สีม่วงไว้ตายตัว) */
    UI.sheet = (opts) => U.sheet(Object.assign({ tone: ['var(--hero-2)', 'var(--ac)', 'var(--ac-2)'] }, opts));

    UI.teamIcon = (t, cls) => `<span class="team-ic ${cls || ''}" style="--c:${esc(t.color)}"><i class="fas ${esc(t.icon)}"></i></span>`;
    UI.teamBadge = (t) => `<span class="team-badge" style="--c:${esc(t.color)}"><i class="fas ${esc(t.icon)}"></i>${esc(t.name)}</span>`;
    UI.modeTag = (mode) => {
        const m = Engine.MODES[mode] || Engine.MODES.mc;
        return `<span class="mode-tag m-${esc(mode)}"><i class="fas ${m.icon}"></i>${esc(m.label)}</span>`;
    };
    UI.setIcon = (s, size) => `<span class="ic-box ${size || ''}" style="--a:${esc(s.color)};--b:color-mix(in srgb, ${esc(s.color)} 55%, #f97316)"><i class="fas ${esc(s.icon)}"></i></span>`;
    UI.statusTag = (m) => (m.status === 'playing'
        ? '<span class="tag warn"><i class="fas fa-circle-play"></i>กำลังแข่ง</span>'
        : '<span class="tag ok"><i class="fas fa-flag-checkered"></i>จบแล้ว</span>');
    UI.empty = (icon, title, text, actions) => `<div class="empty-state"><i class="fas ${icon}"></i><h3>${esc(title)}</h3><p>${text || ''}</p>${actions || ''}</div>`;

    /* เนื้อหาคำถาม (ใช้ในคลังคำถาม หน้าจอควบคุม ตัวอย่างนำเข้า) */
    UI.qBody = (q, opts) => {
        const o = opts || {};
        const L = o.letters || UI.letters();
        const src = q.image ? Img.src(q.image) : '';
        let html = `<div class="q-text">${esc(q.text) || '<span class="text-muted">(ยังไม่มีข้อความคำถาม)</span>'}</div>`;
        if (src && !o.noImage) html += `<img class="q-thumb" src="${esc(src)}" alt="รูปประกอบคำถาม" loading="lazy">`;
        else if (q.image && !o.noImage) html += '<div class="q-thumb missing"><i class="fas fa-image"></i> ไม่พบรูป</div>';
        if (Engine.isChoice(q)) {
            html += `<ol class="q-choices">${q.choices.map((c, i) => `<li class="${i === q.answer && !o.hideAnswer ? 'ok' : ''}"><b>${esc(L[i])}</b><span>${esc(c) || '<span class="text-muted">-</span>'}</span>${i === q.answer && !o.hideAnswer ? '<i class="fas fa-circle-check"></i>' : ''}</li>`).join('')}</ol>`;
        } else if (!o.hideAnswer) {
            html += `<div class="q-answer"><i class="fas fa-key"></i>เฉลย: <b>${esc(q.answer) || '-'}</b></div>`;
        }
        if (q.explain && o.explain !== false && !o.hideAnswer) html += `<div class="q-explain"><i class="fas fa-lightbulb"></i>${esc(q.explain)}</div>`;
        return html;
    };
    UI.qMeta = (q, defPoints) => {
        const parts = [];
        parts.push(`<span class="type-tag ${q.type === 'mc' ? 't-mc' : 't-text'}"><i class="fas ${q.type === 'mc' ? 'fa-list-ol' : 'fa-pen'}"></i>${q.type === 'mc' ? `เลือกตอบ ${q.choices.length} ตัวเลือก` : 'เขียนตอบ'}</span>`);
        parts.push(`<span class="mini-pill"><i class="fas fa-star"></i>${q.points ? `${UI.fmt(q.points)} คะแนน` : `${UI.fmt(defPoints || 10)} คะแนน (ค่าเริ่มต้น)`}</span>`);
        if (q.time) parts.push(`<span class="mini-pill"><i class="fas fa-stopwatch"></i>${q.time} วินาที</span>`);
        if (q.category) parts.push(`<span class="mini-pill"><i class="fas fa-tag"></i>${esc(q.category)}</span>`);
        if (q.image) parts.push('<span class="mini-pill"><i class="fas fa-image"></i>มีรูป</span>');
        return parts.join('');
    };

    /* ตัวเลือกสีทีม / ไอคอนทีม (radio ในกล่องเลื่อนแนวนอน) */
    UI.colorPicker = (name, value) => `<div class="swatches">${Engine.TEAM_COLORS.map((c) => `<label class="sw" title="${c}"><input type="radio" name="${esc(name)}" value="${c}"${c === value ? ' checked' : ''}><span style="--c:${c}"></span></label>`).join('')}</div>`;
    UI.iconPicker = (name, value, color) => `<div class="icon-pick" style="--c:${esc(color || '#dc2626')}">${Engine.TEAM_ICONS.map((ic) => `<label title="${ic}"><input type="radio" name="${esc(name)}" value="${ic}"${ic === value ? ' checked' : ''}><span><i class="fas ${ic}"></i></span></label>`).join('')}</div>`;

    UI.subjectOptions = (value) => {
        const list = Store.SUBJECTS.map((s) => s.name);
        if (value && !list.includes(value)) list.push(value);
        return U.options(list, value, { placeholder: '— เลือกวิชา —' });
    };

    /* คำอธิบายรูปแบบเกม (การ์ดเลือก) */
    UI.modeCards = (name, value) => Object.keys(Engine.MODES).map((k) => {
        const m = Engine.MODES[k];
        return `<label class="mode-card m-${k}"><input type="radio" name="${esc(name)}" value="${k}"${k === value ? ' checked' : ''}>
            <div><span class="mc-ic"><i class="fas ${m.icon}"></i></span><b>${esc(m.label)}</b><small>${esc(m.desc)}</small></div></label>`;
    }).join('');

    UI.awardTag = (t) => (t.award ? `<span class="award a${t.rank}"><i class="fas ${t.rank === 1 ? 'fa-trophy' : 'fa-medal'}"></i>${esc(t.award)}</span>` : '');
    UI.rankBadge = (r) => `<span class="rank-badge r${r}">${r}</span>`;

    window.UI = UI;
    window.Views = window.Views || {};
})();
