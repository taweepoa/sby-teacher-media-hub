/* แก้ไขชุดเนื้อหา: ข้อมูลชุด + ตารางคู่การ์ด (พิมพ์ในช่องได้ทันที) + ภาพย่อ + อีโมจิสำเร็จรูป + วางหลายคู่จาก Excel */
(function () {
    'use strict';
    const esc = U.esc;
    let root = null;
    let cur = null;
    let emojiTarget = null;

    const EMOJI = {
        'สัตว์': '🐶 🐱 🐭 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦆 🦉 🐴 🦋 🐌 🐞 🐢 🐍 🐙 🐟 🐬 🐳 🦈 🐘 🦒 🦓 🐪',
        'ผักผลไม้': '🍎 🍌 🍇 🍉 🍊 🍍 🥭 🍓 🍒 🍑 🥥 🥝 🍅 🥕 🌽 🥦 🥒 🌶️ 🧄 🧅 🍄 🥔',
        'อาหาร': '🍚 🍜 🍞 🥚 🍗 🥩 🐟 🥛 🧀 🍰 🍪 🍩 🍦 🧃',
        'ธรรมชาติ': '☀️ 🌙 ⭐ 🌍 🪐 ☁️ 🌧️ ⛈️ ⚡ 🌈 ❄️ 🌊 🌋 🌪️ ☄️ 🌳 🌸 🌻 🍁 🌵',
        'สิ่งของ': '📚 ✏️ 📏 ✂️ 🎒 ⏰ 💡 🔑 ☂️ 👕 👟 🎩 🪑 🛏️ 🧸 ⚽ 🏀 🎸 🎹 🥁',
        'เทคโนโลยี': '💻 🖥️ ⌨️ 🖱️ 🖨️ 📱 📷 🎧 💾 🔋 📡 🤖',
        'ยานพาหนะ': '🚗 🚌 🚑 🚒 🚓 🚲 🏍️ 🚂 ✈️ 🚀 🚢 ⛵',
        'ร่างกาย': '👀 👂 👃 👄 🦷 ✋ 🦶 🧠 🫀 🫁',
        'อาชีพ': '👨‍🏫 👩‍⚕️ 👨‍🍳 👩‍🌾 👮 👨‍🚒 👩‍🔬 👨‍✈️ 👷',
    };

    function render(el, params) {
        root = el;
        cur = Store.set(params && params.id);
        if (!cur) { el.innerHTML = UI.empty('fa-circle-question', 'ไม่พบชุดเนื้อหานี้', '', '<a class="btn-x primary" href="#/library">กลับไปหน้าชุดเนื้อหา</a>'); return; }
        const s = cur;
        const k = Store.KINDS[s.kind];
        el.innerHTML = `
            <div class="toolbar"><a class="btn-x ghost sm" href="#/library"><i class="fas fa-arrow-left"></i> ชุดเนื้อหาทั้งหมด</a><span class="ms-auto"></span>
                <a class="btn-x ghost" href="#/print?set=${esc(s.id)}"><i class="fas fa-print"></i> พิมพ์การ์ด</a>
                <a class="btn-x primary" href="#/play?set=${esc(s.id)}"><i class="fas fa-play"></i> เล่นชุดนี้</a></div>
            <div class="editor-grid">
            <section class="panel panel--purple">
                <div class="panel-head">${UI.setIcon(s, 'sm')}<div><h3>ข้อมูลชุดเนื้อหา</h3><small>บันทึกอัตโนมัติทุกครั้งที่พิมพ์</small></div></div>
                <div class="panel-body">
                    <label class="form-label">ชื่อชุด</label><input class="form-control" data-f="name" value="${esc(s.name)}">
                    <div class="row g-2 mt-1">
                        <div class="col-sm-6"><label class="form-label">วิชา</label><select class="form-select" data-f="subject">${UI.subjectOptions(s.subject)}</select></div>
                        <div class="col-sm-6"><label class="form-label">ระดับชั้น</label><input class="form-control" id="ed-level" data-f="level" value="${esc(s.level)}">${UI.chips('#ed-level', Store.LEVELS.slice(1, 5))}</div>
                    </div>
                    <label class="form-label mt-2 d-block">ชนิดคู่การ์ด</label>
                    <div class="seg seg-wrap" id="ed-kind">${Object.keys(Store.KINDS).map((x) => `<button type="button" data-kind="${x}" class="${s.kind === x ? 'active' : ''}"><i class="fas ${Store.KINDS[x].icon}"></i> ${esc(Store.KINDS[x].label)}</button>`).join('')}</div>
                    <label class="form-label mt-2 d-block">คำอธิบาย (ไม่บังคับ)</label><input class="form-control" data-f="desc" value="${esc(s.desc)}" placeholder="เช่น ใช้ทบทวนหลังเรียนหน่วยที่ 2">
                </div>
            </section>
            <section class="panel panel--teal">
                <div class="panel-head"><span class="ic-box sm" style="--a:#0A84FF;--b:#00C7BE"><i class="fas fa-paste"></i></span><div><h3>วางหลายคู่พร้อมกัน</h3><small>คัดลอก 2 คอลัมน์จาก Excel/Word มาวาง หรือพิมพ์บรรทัดละคู่ "${esc(k.a)} = ${esc(k.b)}"</small></div></div>
                <div class="panel-body">
                    <textarea class="form-control" id="ed-paste" rows="5" placeholder="${s.kind === 'qa' ? '5 + 3 = 8\n12 ÷ 4 = 3' : s.kind === 'image' ? '🍎 = apple\n🍌 = banana' : 'ขยัน = ตั้งใจทำงาน\nอดทน = ทนต่อความยากลำบาก'}"></textarea>
                    <div class="d-flex gap-2 mt-2 flex-wrap"><button type="button" class="btn-x primary sm" data-act="paste" data-demo-lock="วางหลายคู่จาก Excel"><i class="fas fa-plus"></i> เพิ่มทุกบรรทัด</button><span class="muted small align-self-center">คั่นด้วยแท็บ, = , | หรือ :</span></div>
                </div>
            </section></div>
            <section class="panel panel--orange">
                <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-clone"></i></span><div><h3>คู่การ์ด (${s.pairs.length} คู่)</h3><small>${esc(k.a)} ↔ ${esc(k.b)} • ควรมีอย่างน้อย 6 คู่ (เปิดไพ่ระดับยากใช้ 12 คู่)</small></div>
                    <div class="panel-tools"><button type="button" class="btn-x primary sm" data-act="add"><i class="fas fa-plus"></i> เพิ่มคู่</button></div></div>
                <div class="panel-body p-0 dt-wrap"><table class="dt pair-table"><thead><tr><th class="text-center" style="width:50px">#</th><th>${esc(k.a)}</th><th>${esc(k.b)}</th><th style="width:150px"></th></tr></thead>
                <tbody>${s.pairs.map((p, i) => row(p, i)).join('') || U.emptyRow(4, 'fa-clone', 'ยังไม่มีคู่การ์ด — กด "เพิ่มคู่" หรือวางหลายคู่จาก Excel')}</tbody></table></div>
            </section>
            ${s.kind === 'image' ? `<section class="panel panel--pink" id="ed-emoji"><div class="panel-head"><span class="ic-box sm" style="--a:#FF375F;--b:#BF5AF2"><i class="fas fa-icons"></i></span><div><h3>ภาพสำเร็จรูป (อีโมจิ)</h3><small>คลิกช่อง "ภาพ" ของคู่ที่ต้องการ แล้วคลิกภาพด้านล่าง — หรือกดปุ่มรูปภาพเพื่อใช้รูปของครูเอง</small></div></div>
                <div class="panel-body">${Object.keys(EMOJI).map((g) => `<div class="emo-group"><b>${esc(g)}</b><div class="emo-list">${EMOJI[g].split(' ').map((x) => `<button type="button" class="emo" data-emo="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>`).join('')}</div></section>` : ''}`;
        UI.bindChips(el);
        el.oninput = onInput;
        el.onchange = onInput;
        el.onclick = onClick;
        el.addEventListener('focusin', (e) => { if (e.target.dataset && e.target.dataset.side === 'a') emojiTarget = e.target.closest('tr').dataset.id; });
    }

    function row(p, i) {
        const imageKind = cur.kind === 'image';
        return `<tr data-id="${esc(p.id)}">
            <td class="text-center"><span class="pair-no">${i + 1}</span></td>
            <td><div class="pair-a">${imageKind || p.img ? `<span class="pair-prev">${UI.face(p, 'a')}</span>` : ''}<input class="form-control" data-side="a" value="${esc(p.a)}" placeholder="${imageKind ? 'อีโมจิหรือคำบรรยายภาพ' : ''}"></div></td>
            <td><input class="form-control" data-side="b" value="${esc(p.b)}"></td>
            <td class="nowrap text-end">
                <button type="button" class="icon-btn" data-act="img" title="ใส่รูปภาพ (ย่อขนาดอัตโนมัติ)"><i class="fas fa-image"></i></button>
                ${p.img ? '<button type="button" class="icon-btn" data-act="noimg" data-demo-allow title="เอารูปออก"><i class="fas fa-xmark"></i></button>' : ''}
                <button type="button" class="icon-btn" data-act="up" title="เลื่อนขึ้น"><i class="fas fa-arrow-up"></i></button>
                <button type="button" class="icon-btn del" data-act="del" title="ลบคู่นี้"><i class="fas fa-trash"></i></button>
            </td></tr>`;
    }

    function onInput(e) {
        const t = e.target;
        if (t.dataset.f) { cur[t.dataset.f] = t.value; if (t.dataset.f === 'subject') { const sub = Store.subjectOf(t.value); if (sub) { cur.color = sub.color; cur.icon = sub.icon; } } touch(); return; }
        if (t.dataset.side) {
            const p = cur.pairs.find((x) => x.id === t.closest('tr').dataset.id);
            if (!p) return;
            p[t.dataset.side] = t.value;
            if (t.dataset.side === 'a') { const pv = t.parentElement.querySelector('.pair-prev'); if (pv) pv.innerHTML = UI.face(Object.assign({}, p, { a: U.norm(p.a) }), 'a'); }
            touch();
        }
    }
    function touch() { cur.updatedAt = new Date().toISOString(); Store.commit('set-edit'); }

    async function onClick(e) {
        const kb = e.target.closest('[data-kind]');
        if (kb) { cur.kind = kb.dataset.kind; touch(); render(root, { id: cur.id }); return; }
        const em = e.target.closest('[data-emo]');
        if (em) {
            let p = cur.pairs.find((x) => x.id === emojiTarget) || cur.pairs.find((x) => !x.a);
            if (!p) { p = Store.newPair(); cur.pairs.push(p); }
            p.a = em.dataset.emo;
            emojiTarget = p.id;
            touch(); render(root, { id: cur.id });
            const inp = root.querySelector(`tr[data-id="${p.id}"] [data-side="b"]`);
            if (inp) inp.focus();
            return;
        }
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const tr = b.closest('tr');
        const p = tr ? cur.pairs.find((x) => x.id === tr.dataset.id) : null;
        const act = b.dataset.act;
        if (act === 'add') {
            const n = Store.newPair();
            cur.pairs.push(n);
            touch(); render(root, { id: cur.id });
            const inp = root.querySelector(`tr[data-id="${n.id}"] [data-side="a"]`);
            if (inp) inp.focus();
        } else if (act === 'paste') pasteMany();
        else if (act === 'up' && p) {
            const i = cur.pairs.indexOf(p);
            if (i > 0) { cur.pairs.splice(i, 1); cur.pairs.splice(i - 1, 0, p); touch(); render(root, { id: cur.id }); }
        } else if (act === 'del' && p) {
            const ok = await U.confirm('ลบคู่การ์ดนี้?', `<b>${esc(p.a || '-')}</b> ↔ <b>${esc(p.b || '-')}</b>`, { danger: true, confirmText: '<i class="fas fa-trash"></i> ลบคู่นี้' });
            if (!ok) return;
            cur.pairs = cur.pairs.filter((x) => x !== p);
            touch(); render(root, { id: cur.id });
        } else if (act === 'img' && p) {
            const file = await U.pickFile('image/*');
            if (!file) return;
            try {
                const r = await Store.thumbFromFile(file);
                p.img = r.src;
                if (!p.a) p.a = U.norm(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
                touch(); render(root, { id: cur.id });
                U.toast(`ใส่รูปแล้ว (ย่อเหลือ ${r.w}×${r.h} px)`, { type: 'ok' });
            } catch (err) { U.alert('ใส่รูปไม่ได้', esc(err.message), 'error'); }
        } else if (act === 'noimg' && p) { p.img = ''; touch(); render(root, { id: cur.id }); }
    }

    /* แยกบรรทัด → คู่ (แท็บจาก Excel ก่อน แล้วค่อย = | :) */
    function parseLines(text) {
        return String(text || '').split(/\r?\n/).map((line) => {
            const l = line.trim();
            if (!l) return null;
            let parts = l.split('\t');
            if (parts.length < 2) { const m = l.match(/^(.+?)\s*(?:=|\||:|→)\s*(.+)$/); parts = m ? [m[1], m[2]] : [l, '']; }
            return { a: U.norm(parts[0]), b: U.norm(parts.slice(1).join(' ')) };
        }).filter((x) => x && (x.a || x.b));
    }
    function pasteMany() {
        if (!VSDemo.allow('วางหลายคู่จาก Excel')) return;
        const ta = root.querySelector('#ed-paste');
        const list = parseLines(ta.value);
        if (!list.length) { U.toast('ยังไม่มีข้อความให้เพิ่ม — คัดลอก 2 คอลัมน์จาก Excel มาวางในช่อง', { type: 'warn' }); return; }
        list.forEach((x) => cur.pairs.push(Object.assign(Store.newPair(), x)));
        touch(); render(root, { id: cur.id });
        U.toast(`เพิ่ม ${list.length} คู่แล้ว${list.some((x) => !x.b) ? ' (บางบรรทัดไม่มีคู่ — กรอกเพิ่มในตาราง)' : ''}`, { type: 'ok' });
    }

    window.Views.set = { render, parseLines, refresh(reason) { if (reason !== 'set-edit' && root && cur) render(root, { id: cur.id }); } };
})();
