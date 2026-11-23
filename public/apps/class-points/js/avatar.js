/* =====================================================================
   อวตารน่ารัก (SVG วาดเอง ไม่ใช้รูปจากอินเทอร์เน็ต) — 24 แบบ = 6 ทรง × 4 หน้า
   Avatar.svg(index, size) → string <svg>
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Avatar = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const FILL = ['#FBBF24', '#FB923C', '#F87171', '#F472B6', '#C084FC', '#818CF8', '#38BDF8', '#2DD4BF', '#4ADE80', '#A3E635', '#FACC15', '#FB7185'];
    const COUNT = 24;

    function ears(type, c, d) {
        switch (type) {
        case 0: return ''; // ก้อนกลม
        case 1: return `<path d="M22 34 L28 10 L44 26 Z" fill="${c}"/><path d="M78 34 L72 10 L56 26 Z" fill="${c}"/><path d="M27 28 L30 17 L38 25 Z" fill="${d}"/><path d="M73 28 L70 17 L62 25 Z" fill="${d}"/>`; // แมว
        case 2: return `<ellipse cx="36" cy="16" rx="8" ry="18" fill="${c}"/><ellipse cx="64" cy="16" rx="8" ry="18" fill="${c}"/><ellipse cx="36" cy="17" rx="4" ry="12" fill="${d}"/><ellipse cx="64" cy="17" rx="4" ry="12" fill="${d}"/>`; // กระต่าย
        case 3: return `<circle cx="25" cy="26" r="11" fill="${c}"/><circle cx="75" cy="26" r="11" fill="${c}"/><circle cx="25" cy="26" r="5.5" fill="${d}"/><circle cx="75" cy="26" r="5.5" fill="${d}"/>`; // หมี
        case 4: return `<path d="M50 22 L50 8" stroke="${d}" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="7" r="5" fill="#fde047" stroke="${d}" stroke-width="2"/>`; // หุ่นยนต์/เสาอากาศ
        default: return `<path d="M30 30 Q24 12 34 8 Q34 20 40 26 Z" fill="#fff7ed" stroke="${d}" stroke-width="2"/><path d="M70 30 Q76 12 66 8 Q66 20 60 26 Z" fill="#fff7ed" stroke="${d}" stroke-width="2"/>`; // มอนสเตอร์มีเขา
        }
    }
    function face(type) {
        const eyes = [
            '<circle cx="39" cy="54" r="5" fill="#1f2937"/><circle cx="61" cy="54" r="5" fill="#1f2937"/><circle cx="40.6" cy="52.4" r="1.7" fill="#fff"/><circle cx="62.6" cy="52.4" r="1.7" fill="#fff"/>',
            '<path d="M33 55 Q39 48 45 55" stroke="#1f2937" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M55 55 Q61 48 67 55" stroke="#1f2937" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
            '<circle cx="50" cy="52" r="10" fill="#fff"/><circle cx="51" cy="53" r="5" fill="#1f2937"/><circle cx="52.5" cy="51" r="1.8" fill="#fff"/>',
            '<ellipse cx="39" cy="53" rx="4.5" ry="6" fill="#1f2937"/><ellipse cx="61" cy="53" rx="4.5" ry="6" fill="#1f2937"/><circle cx="40" cy="51" r="1.6" fill="#fff"/><circle cx="62" cy="51" r="1.6" fill="#fff"/>',
        ][type];
        const mouth = [
            '<path d="M42 66 Q50 74 58 66" stroke="#1f2937" stroke-width="3" fill="none" stroke-linecap="round"/>',
            '<path d="M41 65 Q50 77 59 65 Z" fill="#7f1d1d"/><path d="M45 69 Q50 73 55 69" fill="#fb7185"/>',
            '<path d="M44 68 Q50 72 56 68" stroke="#1f2937" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M47 69 L47 73 L50 73 L50 70" fill="#fff"/>',
            '<ellipse cx="50" cy="68" rx="5" ry="4" fill="#7f1d1d"/>',
        ][type];
        return `${eyes}<circle cx="31" cy="64" r="4.5" fill="#fb7185" opacity=".45"/><circle cx="69" cy="64" r="4.5" fill="#fb7185" opacity=".45"/>${mouth}`;
    }
    function svg(index, size) {
        const i = ((Number(index) || 0) % COUNT + COUNT) % COUNT;
        const shape = i % 6;
        const f = Math.floor(i / 6) % 4;
        const c = FILL[(i * 5) % FILL.length];
        const d = 'rgba(0,0,0,.18)';
        const body = shape === 4
            ? `<rect x="18" y="24" width="64" height="62" rx="18" fill="${c}"/>`
            : `<ellipse cx="50" cy="58" rx="33" ry="31" fill="${c}"/>`;
        return `<svg class="ava" viewBox="0 0 100 100" width="${size || 64}" height="${size || 64}" aria-hidden="true">${ears(shape, c, d)}${body}<ellipse cx="50" cy="80" rx="18" ry="6" fill="#fff" opacity=".22"/>${face(f)}</svg>`;
    }
    return { svg, COUNT };
});
