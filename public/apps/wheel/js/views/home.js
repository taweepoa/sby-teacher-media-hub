/* หน้าหลัก: ภาพรวม + เครื่องมือสุ่มทั้ง 6 แบบ + ประวัติล่าสุด + การเก็บข้อมูล */
(function () {
    'use strict';

    const TOOLS = [
        { route: 'wheel', icon: 'fa-dharmachakra', a: '#f43f5e', b: '#fb923c', t: 'วงล้อสุ่มชื่อ', s: 'สุ่มชื่อตอบคำถาม ไม่ซ้ำจนกว่าจะครบ มีเสียงและเอฟเฟกต์' },
        { route: 'groups', icon: 'fa-people-group', a: '#0A84FF', b: '#5E5CE6', t: 'สุ่มจับกลุ่ม', s: 'กำหนดจำนวนกลุ่ม/คนต่อกลุ่ม คละเพศ หัวหน้ากลุ่ม' },
        { route: 'order', icon: 'fa-list-ol', a: '#BF5AF2', b: '#FF375F', t: 'สุ่มลำดับนำเสนอ', s: 'รายคนหรือรายกลุ่ม เปิดทีละลำดับให้ลุ้น' },
        { route: 'number', icon: 'fa-dice', a: '#FF9F0A', b: '#FF375F', t: 'สุ่มตัวเลข', s: 'กำหนดช่วงและจำนวน ไม่ซ้ำ จับคู่กับเลขที่' },
        { route: 'prizes', icon: 'fa-gift', a: '#30D158', b: '#00C7BE', t: 'จับฉลากของรางวัล', s: 'จับทีละรางวัล หนึ่งคนหนึ่งรางวัล พร้อมรายงาน' },
        { route: 'seats', icon: 'fa-chair', a: '#00C7BE', b: '#0A84FF', t: 'สุ่มที่นั่ง', s: 'สลับชาย-หญิง แตะสลับเองได้ พิมพ์ผัง A4' },
    ];

    function render(el) {
        const d = Store.data;
        const s = d.school;
        const m = Store.meta;
        const classes = d.lists.filter((l) => l.kind === 'class');
        const people = classes.reduce((a, l) => a + l.items.length, 0);
        const present = classes.reduce((a, l) => a + l.items.filter((x) => x.active).length, 0);
        const today = new Date().toDateString();
        const todayN = d.history.filter((h) => new Date(h.at).toDateString() === today).length;
        const recent = d.history.slice(0, 7);
        const needBackup = Store.needsBackup();
        el.innerHTML = `
            ${U.hero({
                icon: 'fa-dharmachakra',
                title: s.name ? `วงล้อสุ่มรายชื่อนักเรียน — ${s.name}` : 'วงล้อสุ่มรายชื่อนักเรียน',
                sub: `${U.esc(Store.termText())} • สุ่มชื่อ จับกลุ่ม จับฉลาก ลำดับนำเสนอ ที่นั่ง — ยุติธรรมด้วยตัวสุ่มของระบบ ใช้ได้โดยไม่ต้องต่ออินเทอร์เน็ต`,
                side: `<span class="hero-stat"><i class="fas fa-user-graduate"></i>รายชื่อ <b>${people.toLocaleString()}</b> คน</span>
                       <a class="hero-btn" href="#/wheel"><i class="fas fa-play"></i>เปิดวงล้อ</a>`,
            })}
            ${needBackup ? `
            <div class="note warn"><i class="fas fa-triangle-exclamation"></i>
                <div><b>มีข้อมูลที่ยังไม่ได้สำรองเป็นไฟล์</b> — ข้อมูลเก็บอยู่ในเบราว์เซอร์ของเครื่องนี้เท่านั้น ถ้าล้างข้อมูลเบราว์เซอร์หรือเครื่องเสีย ข้อมูลจะหาย
                (สำรองล่าสุด: ${m.lastBackupAt ? U.esc(U.thDate(m.lastBackupAt, true)) : 'ยังไม่เคย'})
                <div class="mt-2"><button type="button" class="btn-x orange sm" id="hm-backup"><i class="fas fa-download"></i>บันทึกไฟล์ข้อมูลตอนนี้</button></div></div>
            </div>` : ''}
            <div class="dash-grid">
                <a class="stat-card" href="#/lists" style="--a:#0A84FF;--b:#5E5CE6"><span class="ic-box lg" style="--a:#0A84FF;--b:#5E5CE6"><i class="fas fa-users"></i></span><div><b>${classes.length}</b><span>ห้องเรียน${d.lists.some((l) => l.kind === 'custom') ? ` (+${d.lists.filter((l) => l.kind === 'custom').length} รายการ)` : ''}</span></div></a>
                <a class="stat-card" href="#/lists" style="--a:#30D158;--b:#00C7BE"><span class="ic-box lg" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-user-check"></i></span><div><b>${present.toLocaleString()}</b><span>มาเรียน (จาก ${people.toLocaleString()} คน)</span></div></a>
                <a class="stat-card" href="#/history" style="--a:#FF9F0A;--b:#FF375F"><span class="ic-box lg" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-calendar-day"></i></span><div><b>${todayN.toLocaleString()}</b><span>สุ่มวันนี้ (ครั้ง)</span></div></a>
                <a class="stat-card" href="#/history" style="--a:#BF5AF2;--b:#FF375F"><span class="ic-box lg" style="--a:#BF5AF2;--b:#FF375F"><i class="fas fa-clock-rotate-left"></i></span><div><b>${d.history.length.toLocaleString()}</b><span>ประวัติการสุ่มทั้งหมด</span></div></a>
            </div>
            <div class="tool-grid">${TOOLS.map((t) => `
                <a class="tool-card" href="#/${t.route}" style="--a:${t.a};--b:${t.b}">
                    <span class="ic-box lg" style="--a:${t.a};--b:${t.b}"><i class="fas ${t.icon}"></i></span>
                    <div><b>${U.esc(t.t)}</b><span>${U.esc(t.s)}</span></div>
                    <i class="fas fa-arrow-right tc-go"></i>
                </a>`).join('')}</div>
            <div class="row g-3">
                <div class="col-xl-8">
                    <div class="panel panel--theme">
                        <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-clock-rotate-left"></i></span><div><h3>สุ่มล่าสุด</h3><small>บันทึกอัตโนมัติทุกครั้ง พร้อมวันเวลา</small></div>
                            <div class="panel-tools"><a class="btn-x ghost sm" href="#/history"><i class="fas fa-list"></i>ดูทั้งหมด</a></div></div>
                        <div class="panel-body p-0 dt-wrap">
                            <table class="dt"><thead><tr><th>เวลา</th><th>ประเภท</th><th>ห้อง</th><th>ผลการสุ่ม</th></tr></thead>
                            <tbody>${recent.length ? recent.map((h) => `<tr><td class="hs-when"><b>${U.esc(U.thDate(h.at))}</b><small>${new Date(h.at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</small></td><td>${App.modeTag(h.mode)}</td><td>${U.esc(h.listName || '-')}</td><td class="hs-sum">${U.esc(Views.history.summary(h))}</td></tr>`).join('') : U.emptyRow(4, 'fa-dharmachakra', 'ยังไม่มีการสุ่ม — เปิด "วงล้อสุ่มชื่อ" แล้วกดหมุนได้เลย')}</tbody></table>
                        </div>
                    </div>
                </div>
                <div class="col-xl-4">
                    <div class="panel panel--green">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-users"></i></span><div><h3>ห้องเรียน / รายการ</h3><small>ความคืบหน้าวงล้อรอบปัจจุบัน</small></div></div>
                        <div class="panel-body">
                            ${d.lists.length ? `<div class="d-flex flex-column gap-2">${d.lists.map((l) => {
                                const pres = l.items.filter((x) => x.active).length;
                                const done = Store.removedOf(l.id).length;
                                const p = pres ? Math.round((done / pres) * 100) : 0;
                                return `<a href="#/wheel" data-list="${U.esc(l.id)}" class="list-row">
                                    <div class="d-flex justify-content-between gap-2"><b>${U.esc(l.name)}</b><span class="text-muted-2">${pres} ${l.kind === 'custom' ? 'รายการ' : 'คน'} • สุ่มแล้ว ${done}${l.kind === 'class' && Store.data.settings.noRepeat ? ` • รอบ ${Store.roundOf(l.id)}` : ''}</span></div>
                                    <div class="bar mt-1${p >= 100 ? ' is-full' : ''}"><span style="width:${p}%"></span></div></a>`;
                            }).join('')}</div>` : `<div class="empty-state sm"><span class="ic-box" style="--a:#30D158;--b:#00C7BE"><i class="fas fa-user-plus"></i></span><h3>ยังไม่มีรายชื่อ</h3><div><a href="#/lists">เพิ่มรายชื่อ</a> หรือ <a href="#" data-demo>ทดลองด้วยข้อมูลตัวอย่าง</a></div></div>`}
                        </div>
                    </div>
                    <div class="panel panel--teal">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#00C7BE;--b:#0A84FF"><i class="fas fa-shield-halved"></i></span><div><h3>การเก็บข้อมูล</h3><small>อ่านก่อนใช้งาน</small></div></div>
                        <div class="panel-body" style="font-size:.9rem;line-height:1.7">
                            <ul class="mb-3 ps-3">
                                <li>ข้อมูลเก็บใน<b>เบราว์เซอร์เครื่องนี้</b> (บันทึกอัตโนมัติ)</li>
                                <li>ถ้า<b>ล้างประวัติ/ข้อมูลเว็บไซต์</b> หรือเปลี่ยนเครื่อง ข้อมูลจะไม่ตามไปด้วย</li>
                                <li>กด <b>บันทึกไฟล์ข้อมูล (.json)</b> เป็นประจำ แล้วเก็บไฟล์ไว้ที่ปลอดภัย</li>
                            </ul>
                            <div class="d-flex gap-2 flex-wrap">
                                <button type="button" class="btn-x green sm" data-act="save"><i class="fas fa-download"></i>บันทึกไฟล์ข้อมูล</button>
                                <button type="button" class="btn-x ghost sm" data-act="open" data-demo-lock="เปิดไฟล์ข้อมูล (.json)"><i class="fas fa-folder-open"></i>เปิดไฟล์ข้อมูล</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        const b = el.querySelector('#hm-backup');
        if (b) b.onclick = App.backupNow;
        el.querySelector('[data-act="save"]').onclick = App.backupNow;
        el.querySelector('[data-act="open"]').onclick = App.openFile;
        el.querySelectorAll('[data-list]').forEach((a) => { a.addEventListener('click', () => { Store.data.currentListId = a.dataset.list; Store.commit('current'); }); });
        el.querySelectorAll('a[data-demo]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));
    }

    let root = null;
    window.Views = window.Views || {};
    window.Views.home = {
        render(el) { root = el; render(el); },
        refresh() { if (root) render(root); },
        leave() { root = null; },
    };
})();
