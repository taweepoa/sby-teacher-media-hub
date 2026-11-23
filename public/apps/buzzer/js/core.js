/* =====================================================================
   ฟังก์ชันกลาง (ใช้ได้ทั้งเบราว์เซอร์และ Node): จำนวนเงินตัวอักษร วันที่ไทย ค่าเริ่มต้น
   ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Core = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const DIG = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const POS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
    function read6(s, hasHigher) {
        let out = '';
        const n = s.length;
        for (let i = 0; i < n; i++) {
            const d = +s[i];
            const p = n - i - 1;
            if (!d) continue;
            if (p === 1 && d === 1) out += 'สิบ';
            else if (p === 1 && d === 2) out += 'ยี่สิบ';
            else if (p === 0 && d === 1 && (n > 1 || hasHigher) && +s.slice(0, -1) !== 0) out += 'เอ็ด';
            else if (p === 0 && d === 1 && hasHigher) out += 'เอ็ด';
            else out += DIG[d] + POS[p];
        }
        return out;
    }
    function readInt(s) {
        s = String(s).replace(/^0+/, '') || '0';
        if (s.length <= 6) return read6(s, false);
        const hi = s.slice(0, s.length - 6);
        const lo = s.slice(-6);
        return `${readInt(hi)}ล้าน${read6(lo, true)}`;
    }
    /** จำนวนเงินตัวอักษร: 1500 → "หนึ่งพันห้าร้อยบาทถ้วน" */
    function bahtText(n) {
        const v = Math.round(Math.abs(Number(n) || 0) * 100 + 1e-7);
        const baht = Math.floor(v / 100);
        const satang = v % 100;
        if (!baht && !satang) return 'ศูนย์บาทถ้วน';
        let t = baht ? `${readInt(String(baht))}บาท` : '';
        t += satang ? `${read6(String(satang), false)}สตางค์` : 'ถ้วน';
        return (Number(n) < 0 ? 'ลบ' : '') + t;
    }
    const money = (n) => (Number(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    function parseISO(s) {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
        return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
    }
    /** "2026-11-14" → "14 พฤศจิกายน 2569" (era:true เติม พ.ศ.) */
    function thDate(iso, era) {
        const d = parseISO(iso);
        if (!d) return '';
        return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${era ? 'พ.ศ. ' : ''}${d.getFullYear() + 543}`;
    }
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    /** แม่แบบข้อความ — แก้ได้ทั้งหมดในหน้า "ตั้งค่าแม่แบบ" ({ชื่อการแข่ง} {วันที่} ฯลฯ ถูกแทนค่าอัตโนมัติ) */
    const DEFAULT_TEMPLATES = {
        memoSubject: 'รายงานผลการจัดการแข่งขันตอบปัญหา{ชื่อการแข่ง}',
        memoTo: 'ผู้อำนวยการ{โรงเรียน}',
        memoP1: 'ตามที่{ผู้จัด}ได้จัดการแข่งขันตอบปัญหา{ชื่อการแข่ง} ระดับชั้น {ระดับชั้น} เมื่อวันที่ {วันที่} ณ {สถานที่} เพื่อส่งเสริมให้นักเรียนได้ทบทวนความรู้ กล้าแสดงออก และฝึกการทำงานเป็นทีม นั้น',
        memoP2: 'บัดนี้ การแข่งขันได้เสร็จสิ้นเรียบร้อยแล้ว มีทีมเข้าร่วมการแข่งขันทั้งสิ้น {จำนวนทีม} ทีม ใช้คำถามทั้งหมด {จำนวนข้อ} ข้อ ผลการแข่งขันปรากฏว่า {ผลการแข่ง} รายละเอียดตามสรุปผลคะแนนที่แนบมาพร้อมนี้',
        memoP3: 'จึงเรียนมาเพื่อโปรดทราบ และพิจารณาลงนามในประกาศผลการแข่งขันที่แนบมาพร้อมนี้',
        annTitle: 'ผลการแข่งขันตอบปัญหา{ชื่อการแข่ง}',
        annP1: 'ตามที่{โรงเรียน}ได้จัดการแข่งขันตอบปัญหา{ชื่อการแข่ง} ระดับชั้น {ระดับชั้น} เมื่อวันที่ {วันที่} นั้น คณะกรรมการตัดสินได้พิจารณาผลการแข่งขันเรียบร้อยแล้ว จึงประกาศผลการแข่งขัน ดังนี้',
        annP2: 'ขอแสดงความยินดีกับนักเรียนทุกทีมที่ได้รับรางวัล และขอขอบคุณนักเรียนทุกคนที่เข้าร่วมการแข่งขัน',
        payTitle: 'หลักฐานการจ่ายเงินรางวัลการแข่งขันตอบปัญหา{ชื่อการแข่ง}',
        payNote: 'เบิกจ่ายจากงบประมาณโครงการ/กิจกรรมที่ได้รับอนุมัติ ตามระเบียบกระทรวงการคลังว่าด้วยการเบิกค่าใช้จ่ายในการบริหารงานของส่วนราชการ พ.ศ. 2553 และที่แก้ไขเพิ่มเติม',
    };
    const DEFAULT_PRIZES = [
        { label: 'รางวัลชนะเลิศ', amount: 500, item: 'เกียรติบัตร' },
        { label: 'รางวัลรองชนะเลิศอันดับ 1', amount: 300, item: 'เกียรติบัตร' },
        { label: 'รางวัลรองชนะเลิศอันดับ 2', amount: 200, item: 'เกียรติบัตร' },
    ];
    /** ข้อความสำเร็จรูปให้เลือก (ผู้ใช้พิมพ์เองได้ทุกช่อง) */
    const PRESETS = {
        matchName: ['วิชาวิทยาศาสตร์', 'วิชาคณิตศาสตร์', 'วันภาษาไทยแห่งชาติ', 'วันวิทยาศาสตร์แห่งชาติ', 'ความรู้รอบตัว', 'วันสุนทรภู่', 'ภาษาอังกฤษ (English Quiz)', 'สัปดาห์ห้องสมุด', 'วันเด็กแห่งชาติ', 'ทบทวนบทเรียนท้ายหน่วย'],
        level: ['ประถมศึกษาปีที่ 4–6', 'มัธยมศึกษาปีที่ 1', 'มัธยมศึกษาปีที่ 1–3', 'มัธยมศึกษาปีที่ 4–6', 'ทุกระดับชั้น'],
        place: ['หอประชุมโรงเรียน', 'ห้องโสตทัศนศึกษา', 'ห้องสมุดโรงเรียน', 'ห้องเรียน', 'ลานกิจกรรมโรงเรียน'],
        organizer: ['กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี', 'กลุ่มสาระการเรียนรู้คณิตศาสตร์', 'กลุ่มสาระการเรียนรู้ภาษาไทย', 'กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ', 'งานห้องสมุด', 'งานกิจกรรมพัฒนาผู้เรียน'],
        category: ['ความรู้รอบตัว', 'วิทยาศาสตร์', 'คณิตศาสตร์', 'ภาษาไทย', 'ภาษาอังกฤษ', 'สังคมศึกษา', 'คอมพิวเตอร์'],
        teamName: ['ทีมสายฟ้า', 'ทีมดาวเหนือ', 'ทีมพยัคฆ์', 'ทีมอินทรี', 'ทีมมังกร', 'ทีมกระทิง', 'ทีมโลมา', 'ทีมเหยี่ยว'],
    };
    const TEAM_COLORS = ['#FF375F', '#0A84FF', '#30D158', '#FF9F0A', '#BF5AF2', '#00C7BE', '#5E5CE6', '#a16207'];
    const TEAM_KEYS = ['KeyA', 'KeyL', 'KeyQ', 'KeyP', 'KeyZ', 'KeyM', 'Digit1', 'Digit0'];
    const keyLabel = (code) => String(code || '').replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ') || '-';

    /** แทนค่า {ชื่อ} ในแม่แบบ */
    const fill = (tpl, vars) => String(tpl || '').replace(/\{([^}]+)\}/g, (m, k) => (vars[k] != null && vars[k] !== '' ? vars[k] : '..........'));

    /** สรุปผลการแข่ง → อันดับ (คะแนนเท่ากันได้อันดับเดียวกัน) */
    function ranking(match) {
        const list = (match.teams || []).map((t) => ({ ...t, score: Number((match.scores || {})[t.id]) || 0, correct: 0, wrong: 0, firstPress: 0 }));
        const by = new Map(list.map((t) => [t.id, t]));
        (match.log || []).forEach((q) => {
            if (q.presses && q.presses[0] && by.get(q.presses[0].team)) by.get(q.presses[0].team).firstPress++;
            (q.events || []).forEach((e) => { const t = by.get(e.team); if (!t) return; if (e.result === 'ok') t.correct++; else if (e.result === 'bad') t.wrong++; });
        });
        list.sort((a, b) => b.score - a.score || b.correct - a.correct || a.wrong - b.wrong);
        list.forEach((t, i) => { t.rank = i && t.score === list[i - 1].score && t.correct === list[i - 1].correct && t.wrong === list[i - 1].wrong ? list[i - 1].rank : i + 1; });
        return list;
    }

    return { bahtText, money, thDate, parseISO, iso, TH_MONTHS, DEFAULT_TEMPLATES, DEFAULT_PRIZES, PRESETS, TEAM_COLORS, TEAM_KEYS, keyLabel, fill, ranking };
});
