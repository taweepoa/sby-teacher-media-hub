/* =====================================================================
   รูปภาพประกอบคำถาม — เก็บใน IndexedDB (localStorage จุได้ราว 5 MB ไม่พอสำหรับรูป)
   ใช้ร่วมกันทั้งหน้าจอครูและจอแสดงผล (ต้นทางเดียวกัน ทั้ง http และ file:// ใน Chrome/Edge)
   ไม่มี IndexedDB → เก็บใน localStorage แทน (จำนวนรูปได้น้อยลง)
   ===================================================================== */
(function () {
    'use strict';

    const DB = 'vs_team_quiz';
    const STORE = 'images';
    const KEY_FALLBACK = 'vs_team_quiz.images.v1';
    const MAX_SIDE = 1280;
    const cache = new Map();
    let db = null;
    let mode = 'memory';
    let ready = null;

    function openDb() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) { reject(new Error('no indexedDB')); return; }
            const req = indexedDB.open(DB, 1);
            req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
            req.onblocked = () => reject(new Error('blocked'));
        });
    }
    function tx(type) { return db.transaction(STORE, type).objectStore(STORE); }
    function loadFallback() {
        try { const o = JSON.parse(localStorage.getItem(KEY_FALLBACK) || '{}'); Object.keys(o).forEach((k) => cache.set(k, o[k])); } catch (e) { /* ไม่มี */ }
    }
    function saveFallback() {
        try { localStorage.setItem(KEY_FALLBACK, JSON.stringify(Object.fromEntries(cache))); } catch (e) {
            if (window.U) U.toast('พื้นที่เก็บรูปภาพในเบราว์เซอร์เต็ม — กรุณาบันทึกไฟล์ข้อมูล (.json) และลดจำนวน/ขนาดรูป', { type: 'bad', ms: 8000 });
        }
    }
    function readAll() {
        return new Promise((resolve) => {
            const req = tx('readonly').openCursor();
            req.onsuccess = () => { const c = req.result; if (c) { cache.set(c.key, c.value); c.continue(); } else resolve(); };
            req.onerror = () => resolve();
        });
    }

    function init() {
        if (ready) return ready;
        ready = (async () => {
            try {
                db = await openDb();
                mode = 'idb';
                await readAll();
            } catch (e) {
                mode = 'local';
                loadFallback();
            }
            return mode;
        })();
        return ready;
    }
    /* จอแสดงผล: โหลดรูปใหม่ที่หน้าต่างอื่นเพิ่งบันทึก */
    async function refresh(id) {
        if (!id || cache.has(id) || mode !== 'idb') return get(id);
        return new Promise((resolve) => {
            try {
                const req = tx('readonly').get(id);
                req.onsuccess = () => { if (req.result) cache.set(id, req.result); resolve(req.result || null); };
                req.onerror = () => resolve(null);
            } catch (e) { resolve(null); }
        });
    }
    function put(id, rec) {
        if (!id || !rec || !rec.src) return;
        cache.set(id, { src: rec.src, w: rec.w || 0, h: rec.h || 0 });
        if (mode === 'idb') { try { tx('readwrite').put(cache.get(id), id); } catch (e) { console.error(e); } } else if (mode === 'local') saveFallback();
    }
    function del(id) {
        cache.delete(id);
        if (mode === 'idb') { try { tx('readwrite').delete(id); } catch (e) { /* ข้าม */ } } else if (mode === 'local') saveFallback();
    }
    function get(id) { return id ? cache.get(id) || null : null; }
    function src(id) { const r = get(id); return r ? r.src : ''; }
    function exportMap(ids) {
        const out = {};
        ids.forEach((id) => { const r = cache.get(id); if (r) out[id] = r; });
        return out;
    }
    function bytes() { let n = 0; cache.forEach((r) => { n += (r.src || '').length; }); return n; }
    /* ลบรูปที่ไม่มีคำถามใช้แล้ว */
    function gc(keep) { [...cache.keys()].forEach((id) => { if (!keep.has(id)) del(id); }); }

    /* ย่อรูปให้ด้านยาวไม่เกิน 1280 px แล้วเก็บเป็น data URL (JPEG/PNG ตามความโปร่งใส) */
    function fromFile(file) {
        return new Promise((resolve, reject) => {
            if (!file || !/^image\//.test(file.type)) { reject(new Error('ไฟล์นี้ไม่ใช่รูปภาพ')); return; }
            if (file.size > 15 * 1024 * 1024) { reject(new Error('รูปใหญ่เกิน 15 MB')); return; }
            const r = new FileReader();
            r.onerror = () => reject(r.error);
            r.onload = () => {
                const raw = String(r.result);
                if (file.type === 'image/svg+xml') {
                    const im = new Image();
                    im.onload = () => resolve({ src: raw, w: im.naturalWidth || 800, h: im.naturalHeight || 600 });
                    im.onerror = () => reject(new Error('เปิดรูปนี้ไม่ได้'));
                    im.src = raw;
                    return;
                }
                const img = new Image();
                img.onload = () => {
                    const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
                    const w = Math.max(1, Math.round(img.naturalWidth * k));
                    const h = Math.max(1, Math.round(img.naturalHeight * k));
                    const cv = document.createElement('canvas');
                    cv.width = w;
                    cv.height = h;
                    const g = cv.getContext('2d');
                    g.drawImage(img, 0, 0, w, h);
                    const png = /png|gif|webp/.test(file.type) && hasAlpha(g, w, h);
                    const out = png ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.86);
                    resolve({ src: out.length < raw.length || k < 1 ? out : raw, w, h });
                };
                img.onerror = () => reject(new Error('เปิดรูปนี้ไม่ได้'));
                img.src = raw;
            };
            r.readAsDataURL(file);
        });
    }
    function hasAlpha(g, w, h) {
        try {
            const d = g.getImageData(0, 0, w, h).data;
            for (let i = 3; i < d.length; i += 4 * 7) if (d[i] < 250) return true;
        } catch (e) { /* ข้าม */ }
        return false;
    }

    window.Img = { init, refresh, put, del, get, src, exportMap, bytes, gc, fromFile, get mode() { return mode; }, get count() { return cache.size; } };
})();
