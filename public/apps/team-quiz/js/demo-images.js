/* =====================================================================
   รูปประกอบคำถามตัวอย่าง (วาดเป็น SVG เอง ไม่ติดลิขสิทธิ์) — โหลดเข้า IndexedDB ตอนกด "ทดลองด้วยข้อมูลตัวอย่าง"
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.DemoImages = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const FONT = "font-family='Sarabun, Thonburi, Tahoma, sans-serif'";
    const wrap = (w, h, body) => `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' width='${w}' height='${h}'><rect width='${w}' height='${h}' fill='#ffffff'/>${body}</svg>`;

    /* วงจรอนุกรม: ถ่านไฟฉาย + หลอดไฟ 2 ดวงต่อเรียงกัน + สวิตช์ปิด */
    function circuit() {
        /* หลอดไฟอยู่บนเส้นทางเดียวกันของสายไฟ (ปลายสายต่อเข้า-ออกที่ขั้วหลอด) */
        const bulb = (cx) => `
            <g stroke-linecap='round'>
              <line x1='${cx - 50}' y1='80' x2='${cx - 70}' y2='66' stroke='#facc15' stroke-width='4'/>
              <line x1='${cx}' y1='58' x2='${cx}' y2='40' stroke='#facc15' stroke-width='4'/>
              <line x1='${cx + 50}' y1='80' x2='${cx + 70}' y2='66' stroke='#facc15' stroke-width='4'/>
            </g>
            <circle cx='${cx}' cy='134' r='36' fill='#fef08a' stroke='#334155' stroke-width='5'/>
            <path d='M${cx - 36} 134 h10 l6 -12 l8 24 l8 -24 l8 24 l8 -24 l6 12 h10' fill='none' stroke='#b45309' stroke-width='4' stroke-linejoin='round'/>`;
        return wrap(640, 400, `
            <path d='M214 134 H120 V196 M120 268 V330 H280 M360 330 H520 V134 H436 M364 134 H286' fill='none' stroke='#0f172a' stroke-width='6' stroke-linejoin='round'/>
            <rect x='60' y='196' width='120' height='72' rx='10' fill='#1e293b'/>
            <rect x='180' y='218' width='12' height='28' rx='3' fill='#64748b'/>
            <text x='120' y='242' ${FONT} font-size='30' font-weight='700' fill='#fff' text-anchor='middle'>+  −</text>
            ${bulb(250)}${bulb(400)}
            <circle cx='280' cy='330' r='8' fill='#0f172a'/><circle cx='360' cy='330' r='8' fill='#0f172a'/>
            <line x1='280' y1='330' x2='360' y2='330' stroke='#0f172a' stroke-width='6' stroke-linecap='round'/>
            <text x='320' y='380' ${FONT} font-size='24' fill='#475569' text-anchor='middle'>สวิตช์ (ปิดวงจร)</text>`);
    }

    /* สามเหลี่ยม ฐาน 10 ซม. สูง 6 ซม. (มาตราส่วน 48 px ต่อ 1 ซม.) */
    function triangle() {
        return wrap(640, 420, `
            <polygon points='80,340 560,340 380,52' fill='#dbeafe' stroke='#1d4ed8' stroke-width='5' stroke-linejoin='round'/>
            <line x1='380' y1='52' x2='380' y2='340' stroke='#dc2626' stroke-width='4' stroke-dasharray='12 9'/>
            <polyline points='380,318 402,318 402,340' fill='none' stroke='#dc2626' stroke-width='3'/>
            <text x='368' y='226' ${FONT} font-size='30' font-weight='700' fill='#dc2626' text-anchor='end'>6 ซม.</text>
            <line x1='80' y1='372' x2='560' y2='372' stroke='#334155' stroke-width='3'/>
            <line x1='80' y1='360' x2='80' y2='384' stroke='#334155' stroke-width='3'/><line x1='560' y1='360' x2='560' y2='384' stroke='#334155' stroke-width='3'/>
            <rect x='272' y='352' width='96' height='40' fill='#fff'/>
            <text x='320' y='382' ${FONT} font-size='30' font-weight='700' fill='#1e293b' text-anchor='middle'>10 ซม.</text>`);
    }

    /* วงกลมแบ่ง 8 ส่วนเท่ากัน แรเงา 3 ส่วน */
    function pie() {
        const cx = 320;
        const cy = 210;
        const r = 170;
        let body = '';
        for (let i = 0; i < 8; i += 1) {
            const a0 = (i * 45 - 90) * Math.PI / 180;
            const a1 = ((i + 1) * 45 - 90) * Math.PI / 180;
            const x0 = (cx + r * Math.cos(a0)).toFixed(1);
            const y0 = (cy + r * Math.sin(a0)).toFixed(1);
            const x1 = (cx + r * Math.cos(a1)).toFixed(1);
            const y1 = (cy + r * Math.sin(a1)).toFixed(1);
            body += `<path d='M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1} Z' fill='${i < 3 ? '#f97316' : '#ffffff'}' stroke='#334155' stroke-width='4'/>`;
        }
        return wrap(640, 420, body);
    }

    /* นาฬิกาเข็ม เวลา 9.15 น. (เข็มยาวชี้เลข 3 เข็มสั้นเลยเลข 9 ไปเล็กน้อย) */
    function clock() {
        const cx = 320;
        const cy = 210;
        let nums = '';
        let ticks = '';
        for (let i = 1; i <= 12; i += 1) {
            const a = (i * 30 - 90) * Math.PI / 180;
            nums += `<text x='${(cx + 140 * Math.cos(a)).toFixed(1)}' y='${(cy + 140 * Math.sin(a) + 12).toFixed(1)}' ${FONT} font-size='34' font-weight='700' fill='#0f172a' text-anchor='middle'>${i}</text>`;
        }
        for (let i = 0; i < 60; i += 1) {
            const a = (i * 6 - 90) * Math.PI / 180;
            const r0 = i % 5 === 0 ? 168 : 176;
            ticks += `<line x1='${(cx + r0 * Math.cos(a)).toFixed(1)}' y1='${(cy + r0 * Math.sin(a)).toFixed(1)}' x2='${(cx + 184 * Math.cos(a)).toFixed(1)}' y2='${(cy + 184 * Math.sin(a)).toFixed(1)}' stroke='#334155' stroke-width='${i % 5 === 0 ? 4 : 2}'/>`;
        }
        const hand = (deg, len, w, color) => {
            const a = (deg - 90) * Math.PI / 180;
            return `<line x1='${cx}' y1='${cy}' x2='${(cx + len * Math.cos(a)).toFixed(1)}' y2='${(cy + len * Math.sin(a)).toFixed(1)}' stroke='${color}' stroke-width='${w}' stroke-linecap='round'/>`;
        };
        return wrap(640, 420, `
            <circle cx='${cx}' cy='${cy}' r='196' fill='#f8fafc' stroke='#0f172a' stroke-width='8'/>
            ${ticks}${nums}
            ${hand(9 * 30 + 15 * 0.5, 92, 12, '#0f172a')}
            ${hand(15 * 6, 116, 7, '#2563eb')}
            <circle cx='${cx}' cy='${cy}' r='10' fill='#dc2626'/>`);
    }

    /* แผนภูมิแท่ง: วิชาที่นักเรียนชอบ (คณิต 12 วิทย์ 18 ไทย 9 อังกฤษ 15 คน) */
    function chart() {
        const data = [['คณิตศาสตร์', 12, '#2563eb'], ['วิทยาศาสตร์', 18, '#16a34a'], ['ภาษาไทย', 9, '#db2777'], ['ภาษาอังกฤษ', 15, '#7c3aed']];
        const x0 = 90;
        const y0 = 350;
        const unit = 14;
        let body = `<text x='340' y='36' ${FONT} font-size='26' font-weight='700' fill='#0f172a' text-anchor='middle'>วิชาที่นักเรียนชั้น ม.1/1 ชอบมากที่สุด</text>`;
        for (let v = 0; v <= 20; v += 5) {
            const y = y0 - v * unit;
            body += `<line x1='${x0}' y1='${y}' x2='620' y2='${y}' stroke='#e2e8f0' stroke-width='2'/><text x='${x0 - 12}' y='${y + 8}' ${FONT} font-size='22' fill='#475569' text-anchor='end'>${v}</text>`;
        }
        data.forEach(([name, v, c], i) => {
            const x = x0 + 30 + i * 128;
            body += `<rect x='${x}' y='${y0 - v * unit}' width='84' height='${v * unit}' rx='6' fill='${c}'/>`;
            body += `<text x='${x + 42}' y='${y0 - v * unit - 10}' ${FONT} font-size='24' font-weight='700' fill='#0f172a' text-anchor='middle'>${v}</text>`;
            body += `<text x='${x + 42}' y='${y0 + 32}' ${FONT} font-size='21' fill='#0f172a' text-anchor='middle'>${name}</text>`;
        });
        body += `<line x1='${x0}' y1='${y0}' x2='620' y2='${y0}' stroke='#0f172a' stroke-width='3'/><line x1='${x0}' y1='60' x2='${x0}' y2='${y0}' stroke='#0f172a' stroke-width='3'/>`;
        body += `<text x='26' y='210' ${FONT} font-size='20' fill='#475569' text-anchor='middle' transform='rotate(-90 26 210)'>จำนวนนักเรียน (คน)</text>`;
        return wrap(640, 400, body);
    }

    const toUri = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s{2,}/g, ' '))}`;

    function all() {
        return {
            img_demo_circuit: { src: toUri(circuit()), w: 640, h: 400 },
            img_demo_triangle: { src: toUri(triangle()), w: 640, h: 420 },
            img_demo_pie: { src: toUri(pie()), w: 640, h: 420 },
            img_demo_clock: { src: toUri(clock()), w: 640, h: 420 },
            img_demo_chart: { src: toUri(chart()), w: 640, h: 400 },
        };
    }

    return { all };
});
