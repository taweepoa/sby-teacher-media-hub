/* รายงานราชการ (.docx ผ่าน ThaiDoc): สรุปผลการแข่งขัน • บันทึกข้อความรายงานผลการจัดกิจกรรม + ตัวอย่างบนจอ/พิมพ์ */
(function () {
    'use strict';
    const esc = U.esc;
    const form = {};
    let type = 'summary';

    function render(el, params) {
        const d = Store.data;
        const list = d.matches;
        const mid = params.match && Store.match(params.match) ? params.match : ((list.find((x) => x.status === 'done') || list[0] || {}).id || '');
        if (params.type) type = params.type === 'memo' ? 'memo' : 'summary';
        if (!list.length) {
            el.innerHTML = `${U.hero({ icon: 'fa-file-word', title: 'รายงานราชการ (.docx)', sub: 'สรุปผลการแข่งขัน และบันทึกข้อความรายงานผลการจัดกิจกรรม ตามระเบียบงานสารบรรณ' })}
                <div class="panel"><div class="panel-body">${UI.empty('fa-file-word', 'ยังไม่มีผลการแข่งขัน', 'จัดการแข่งขันอย่างน้อย 1 ครั้ง แล้วกลับมาสร้างรายงานที่นี่', '<a class="btn-x primary" href="#/setup"><i class="fas fa-flag-checkered"></i>เริ่มการแข่งขัน</a>')}</div></div>`;
            return;
        }
        const m = Store.match(mid);
        const ctx = Docs.context(m, d.school);
        const f = form[mid] || (form[mid] = Docs.memoDefaults(ctx));
        el.innerHTML = `
            ${U.hero({ icon: 'fa-file-word', title: 'รายงานราชการ (.docx)', sub: 'ฟอนต์ TH SarabunPSK 16 pt • A4 • ขอบซ้าย 3 ซม. ขวา 2 ซม. • ตารางหัวเทา • ช่องลงนาม — เปิดแก้ไขต่อใน Microsoft Word ได้' })}
            <div class="row g-3">
                <div class="col-xl-4">
                    <div class="panel panel--theme">
                        <div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-sliders"></i></span><div><h3>เลือกรายงาน</h3></div></div>
                        <div class="panel-body">
                            <label class="form-label">การแข่งขัน</label>
                            <select class="form-select mb-3" id="rp-match">${list.map((x) => `<option value="${esc(x.id)}"${x.id === mid ? ' selected' : ''}>${esc(x.title)}${x.dateText ? ` (${esc(x.dateText)})` : ''}</option>`).join('')}</select>
                            <div class="print-opts rp-types mb-3">
                                <label class="print-opt"><input type="radio" name="rp-type" value="summary"${type === 'summary' ? ' checked' : ''}><div><span class="ic-box sm" style="--a:#0A84FF;--b:#5E5CE6"><i class="fas fa-table"></i></span><span><b>สรุปผลการแข่งขัน</b><small>ตารางอันดับ คะแนน รางวัล + ลงนามคณะกรรมการ</small></span></div></label>
                                <label class="print-opt"><input type="radio" name="rp-type" value="memo"${type === 'memo' ? ' checked' : ''}><div><span class="ic-box sm" style="--a:#FF9F0A;--b:#FF375F"><i class="fas fa-envelope-open-text"></i></span><span><b>บันทึกข้อความรายงานผลกิจกรรม</b><small>เสนอผู้บริหาร + แนบสรุปผลการแข่งขัน</small></span></div></label>
                            </div>
                            <div id="rp-memo"${type === 'memo' ? '' : ' hidden'}>
                                <label class="form-label">ส่วนราชการ</label><input class="form-control mb-2" data-f="agency" value="${esc(f.agency)}" placeholder="เว้นว่าง = จุดไข่ปลาให้เขียนเอง">
                                <div class="row g-2"><div class="col-5"><label class="form-label">ที่</label><input class="form-control" data-f="docNo" value="${esc(f.docNo)}" placeholder="เว้นว่างได้"></div>
                                <div class="col-7"><label class="form-label">วันที่</label><input class="form-control" data-f="date" value="${esc(f.date)}"></div></div>
                                <label class="form-label mt-2">เรียน</label><input class="form-control mb-2" data-f="to" value="${esc(f.to)}" placeholder="เช่น ผู้อำนวยการโรงเรียน...">
                                <div class="row g-2"><div class="col-sm-6"><label class="form-label">ผู้รายงาน</label><input class="form-control" data-f="reporterName" value="${esc(f.reporterName)}"></div>
                                <div class="col-sm-6"><label class="form-label">ตำแหน่ง</label><input class="form-control" data-f="reporterPosition" value="${esc(f.reporterPosition)}"></div></div>
                                <label class="form-label mt-2">ลงท้าย</label><select class="form-select" data-f="ending"><option value="ทราบ"${f.ending !== 'พิจารณา' ? ' selected' : ''}>จึงเรียนมาเพื่อโปรดทราบ</option><option value="พิจารณา"${f.ending === 'พิจารณา' ? ' selected' : ''}>จึงเรียนมาเพื่อโปรดพิจารณา</option></select>
                            </div>
                            <div class="note mt-3 mb-3"><i class="fas fa-user-pen"></i><div>ชื่อคณะกรรมการ: ${ctx.judges.filter(Boolean).length ? esc(ctx.judges.filter(Boolean).join(', ')) : '<b>ยังไม่ได้ใส่</b> (จะเป็นจุดไข่ปลา)'} — <a href="#/result?id=${encodeURIComponent(mid)}">แก้ไขที่หน้าผลการแข่งขัน</a><br>ข้อมูลโรงเรียน/ผู้บริหาร แก้ได้ที่ <a href="#/settings">ตั้งค่า</a></div></div>
                            <button type="button" class="btn-x cta lg w-100 mb-2" id="rp-docx"><i class="fas fa-file-word"></i>ดาวน์โหลด .docx</button>
                            <button type="button" class="btn-x ghost w-100" id="rp-print"><i class="fas fa-print"></i>พิมพ์ / บันทึกเป็น PDF</button>
                        </div>
                    </div>
                </div>
                <div class="col-xl-8">
                    <div class="panel"><div class="panel-head"><span class="ic-box sm" style="--a:#64748b;--b:#334155"><i class="fas fa-eye"></i></span><div><h3>ตัวอย่าง</h3><small>หน้าตาใกล้เคียงไฟล์ Word (ฟอนต์ TH SarabunPSK)</small></div></div>
                        <div class="panel-body gov-preview" id="rp-preview"></div></div>
                </div>
            </div>`;
        const preview = () => {
            const c = Docs.context(Store.match(mid), Store.data.school);
            el.querySelector('#rp-preview').innerHTML = type === 'memo' ? Docs.memoHTML(c, form[mid], '/assets/vendor/garuda.png') : Docs.summaryHTML(c);
        };
        preview();
        el.querySelector('#rp-match').onchange = (e) => App.go('reports', { match: e.target.value, type });
        el.querySelectorAll('input[name="rp-type"]').forEach((r) => { r.onchange = () => { type = r.value; el.querySelector('#rp-memo').hidden = type !== 'memo'; preview(); }; });
        el.querySelectorAll('[data-f]').forEach((i) => { i.oninput = i.onchange = () => { form[mid][i.dataset.f] = i.value; preview(); }; });
        el.querySelector('#rp-docx').onclick = () => download(mid);
        el.querySelector('#rp-print').onclick = () => {
            document.getElementById('print-root').innerHTML = el.querySelector('#rp-preview').innerHTML;
            setTimeout(() => window.print(), 200);
        };
    }

    async function download(mid) {
        const m = Store.match(mid);
        const ctx = Docs.context(m, Store.data.school);
        const T = ThaiDoc;
        try {
            const name = type === 'memo' ? `บันทึกข้อความรายงานผลกิจกรรม_${m.title}` : `สรุปผลการแข่งขัน_${m.title}`;
            const secs = type === 'memo' ? Docs.memoSections(T, ctx, form[mid]) : [Docs.summarySection(T, ctx)];
            await T.download(secs, `${U.safeFileName(name)}.docx`, { title: type === 'memo' ? 'บันทึกข้อความรายงานผลการจัดกิจกรรม' : 'สรุปผลการแข่งขัน' });
            U.toast('ดาวน์โหลดไฟล์ .docx แล้ว — เปิดด้วย Microsoft Word (ต้องมีฟอนต์ TH SarabunPSK)', { type: 'ok', ms: 4500 });
        } catch (e) {
            console.error(e);
            U.alert('สร้างไฟล์ไม่สำเร็จ', esc(e.message), 'error');
        }
    }

    window.Views.reports = { render, refresh() { render(document.getElementById('view'), App.params); } };
})();
