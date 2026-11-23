/* =====================================================================
   ข้อมูลหลัก: localStorage (ชุดเนื้อหา ผลการแข่งขัน เกมที่เล่นค้าง ตั้งค่า)
   ภาพย่อ (ด้านยาว ≤ 320 px) เก็บเป็น data URL อยู่ในคู่การ์ดเลย — ไฟล์ .json จึงพกภาพไปด้วย
   + บันทึก/เปิดไฟล์ข้อมูล .json + นำเข้า/ส่งออก "ชุดเนื้อหา" เป็น .json แยกชุด
   ===================================================================== */
(function () {
    'use strict';

    const KEY = 'vs_memory_game.data.v1';
    const KEY_PREV = 'vs_memory_game.data.v1.previous';
    const KEY_META = 'vs_memory_game.meta.v1';
    const SCHEMA_VERSION = 1;
    const APP_ID = 'vs-memory-game';
    const SET_FILE_ID = 'vs-memory-game-set';
    const THUMB = 320;

    const SUBJECTS = [
        { name: 'ภาษาไทย', icon: 'fa-book-open', color: '#db2777' },
        { name: 'คณิตศาสตร์', icon: 'fa-calculator', color: '#2563eb' },
        { name: 'วิทยาศาสตร์', icon: 'fa-flask', color: '#0891b2' },
        { name: 'สังคมศึกษา', icon: 'fa-earth-asia', color: '#b45309' },
        { name: 'ภาษาอังกฤษ', icon: 'fa-language', color: '#7c3aed' },
        { name: 'วิทยาการคำนวณ', icon: 'fa-laptop-code', color: '#16a34a' },
        { name: 'สุขศึกษาและพลศึกษา', icon: 'fa-heart-pulse', color: '#e11d48' },
        { name: 'ศิลปะ', icon: 'fa-palette', color: '#ea580c' },
        { name: 'การงานอาชีพ', icon: 'fa-screwdriver-wrench', color: '#65a30d' },
        { name: 'ความรู้รอบตัว', icon: 'fa-lightbulb', color: '#ca8a04' },
    ];
    const LEVELS = ['อนุบาล', 'ป.1–ป.3', 'ป.4–ป.6', 'ม.1–ม.3', 'ม.4–ม.6', 'ทุกระดับชั้น'];
    const KINDS = {
        word: { label: 'คำ – ความหมาย', a: 'คำ', b: 'ความหมาย', icon: 'fa-font' },
        image: { label: 'ภาพ – คำ', a: 'ภาพ (อีโมจิหรือรูป)', b: 'คำ', icon: 'fa-image' },
        qa: { label: 'โจทย์ – คำตอบ', a: 'โจทย์', b: 'คำตอบ', icon: 'fa-circle-question' },
    };
    const BACKS = { star: 'ดาว', heart: 'หัวใจ', school: 'โรงเรียน', question: 'เครื่องหมายคำถาม' };

    function newSettings() { return Object.assign(Engine.defaultOpts(), { teamPreset: 'color', teamCount: 4, volume: 0.8, cardBack: 'star' }); }
    function newData() {
        const now = new Date().toISOString();
        return {
            app: APP_ID, schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now,
            school: { name: '', agency: '', academicYear: String(new Date().getFullYear() + 543), semester: '1', director: '', reporterName: '', reporterPosition: '' },
            settings: newSettings(), sets: [], games: [], live: null,
        };
    }
    function newSet() {
        const now = new Date().toISOString();
        return { id: U.uid('set'), name: '', subject: '', level: '', kind: 'word', color: '#7216a0', icon: 'fa-clone', desc: '', pairs: [], createdAt: now, updatedAt: now };
    }
    function newPair() { return { id: U.uid('p'), a: '', b: '', img: '', note: '' }; }

    const str = (v) => (v == null ? '' : String(v));
    const color = (v, def) => (/^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v) : def);
    const icon = (v, def) => (/^fa-[a-z0-9-]+$/.test(String(v || '')) ? String(v) : def);
    const imgOk = (v) => (/^data:image\/(png|jpeg|webp|gif|svg\+xml)[;,]/.test(String(v || '')) ? String(v) : '');

    function normPair(p, ids) {
        const x = Object.assign(newPair(), p || {});
        x.id = p && p.id && !ids.has(p.id) ? String(p.id) : U.uid('p');
        ids.add(x.id);
        x.a = U.norm(x.a);
        x.b = U.norm(x.b);
        x.img = imgOk(x.img);
        x.note = str(x.note).trim();
        return x;
    }
    function normSet(s, setIds, pairIds) {
        const x = Object.assign(newSet(), s);
        x.id = s.id && !setIds.has(s.id) ? String(s.id) : U.uid('set');
        setIds.add(x.id);
        ['name', 'subject', 'level'].forEach((f) => { x[f] = U.norm(x[f]); });
        x.kind = KINDS[x.kind] ? x.kind : 'word';
        x.desc = str(x.desc).trim();
        x.color = color(x.color, '#7216a0');
        x.icon = icon(x.icon, 'fa-clone');
        x.pairs = (Array.isArray(x.pairs) ? x.pairs : []).filter((q) => q && typeof q === 'object').map((q) => normPair(q, pairIds));
        return x;
    }
    function normGame(g) {
        if (!g || typeof g !== 'object' || !Array.isArray(g.teams) || !Array.isArray(g.pairs) || !Engine.MODES[g.mode]) return null;
        const x = Object.assign({ title: '', setName: '', subject: '', dateText: '', place: '', judges: [], log: [], adjusts: [], status: 'done', step: 0, turn: 0 }, g);
        x.opts = Engine.normOpts(x.opts);
        x.judges = (Array.isArray(x.judges) ? x.judges : []).map(U.norm).slice(0, 3);
        ['title', 'setName', 'dateText', 'place'].forEach((f) => { x[f] = U.norm(x[f]); });
        if (!Array.isArray(x.log)) x.log = [];
        if (!Array.isArray(x.adjusts)) x.adjusts = [];
        x.teams = x.teams.slice(0, 6).map((t, i) => Object.assign({ id: `t${i + 1}`, name: `ทีม ${i + 1}`, color: Engine.TEAM_COLORS[i], icon: Engine.TEAM_ICONS[i], score: 0 }, t));
        if (x.mode === 'memory' && !Array.isArray(x.cards)) return null;
        if (x.mode === 'match' && !Array.isArray(x.rounds)) return null;
        if ((x.mode === 'quiz' || x.mode === 'box') && !Array.isArray(x.questions)) return null;
        if (x.mode === 'memory') x.open = []; // ไพ่ที่เปิดค้างตอนปิดเบราว์เซอร์ → คว่ำกลับ
        return x;
    }

    function normalize(raw) {
        const d = Object.assign(newData(), raw || {});
        d.app = APP_ID;
        d.school = Object.assign(newData().school, d.school || {});
        Object.keys(d.school).forEach((k) => { d.school[k] = U.norm(d.school[k]); });
        const st = Object.assign(newSettings(), d.settings || {}, Engine.normOpts(d.settings));
        st.teamPreset = Engine.TEAM_PRESETS[st.teamPreset] ? st.teamPreset : 'color';
        st.teamCount = Math.max(2, Math.min(6, Number(st.teamCount) || 4));
        st.volume = Math.max(0, Math.min(1, Number(st.volume) || 0));
        st.cardBack = BACKS[st.cardBack] ? st.cardBack : 'star';
        d.settings = st;
        const setIds = new Set();
        const pairIds = new Set();
        d.sets = (Array.isArray(d.sets) ? d.sets : []).filter((s) => s && typeof s === 'object').map((s) => normSet(s, setIds, pairIds));
        d.games = (Array.isArray(d.games) ? d.games : []).map(normGame).filter(Boolean);
        d.live = d.live ? normGame(d.live) : null;
        if (d.live && d.live.status !== 'playing') d.live = null;
        d.schemaVersion = SCHEMA_VERSION;
        return d;
    }

    /* ---------- สถานะ ---------- */
    const listeners = new Set();
    let data = null;
    let meta = { lastBackupAt: null, lastBackupName: '', lastChangeAt: null, lastSavedAt: null, dismissedWelcome: false };
    let storageOk = true;

    function loadMeta() { try { meta = Object.assign(meta, JSON.parse(localStorage.getItem(KEY_META) || '{}')); } catch (e) { /* ค่าเริ่มต้น */ } }
    function saveMeta() { try { localStorage.setItem(KEY_META, JSON.stringify(meta)); } catch (e) { /* ไม่เป็นไร */ } }

    function load() {
        loadMeta();
        try {
            const raw = localStorage.getItem(KEY);
            data = raw ? normalize(JSON.parse(raw)) : newData();
        } catch (e) {
            console.warn('โหลดข้อมูลไม่สำเร็จ', e);
            storageOk = false;
            data = newData();
        }
        return data;
    }
    function persist() {
        try {
            localStorage.setItem(KEY, JSON.stringify(data));
            meta.lastSavedAt = new Date().toISOString();
            saveMeta();
            storageOk = true;
        } catch (e) {
            storageOk = false;
            console.error('บันทึกลงเบราว์เซอร์ไม่สำเร็จ', e);
            U.toast('บันทึกลงเบราว์เซอร์ไม่สำเร็จ (พื้นที่อาจเต็มเพราะรูปภาพ) — กรุณากด "บันทึกไฟล์ข้อมูล" เพื่อสำรองทันที', { type: 'bad', ms: 8000 });
        }
    }
    const persistSoon = U.debounce(persist, 250);
    function emit(reason) { listeners.forEach((fn) => { try { fn(reason); } catch (e) { console.error(e); } }); }

    /* opts.quiet = ไม่นับเป็นการเปลี่ยนแปลงที่ต้องสำรอง (เช่น เปิดไพ่ระหว่างเล่น) */
    function commit(reason, opts) {
        data.updatedAt = new Date().toISOString();
        if (!(opts && opts.quiet)) meta.lastChangeAt = data.updatedAt;
        if (opts && opts.immediate) persist(); else persistSoon();
        emit(reason || 'change');
    }

    function replaceAll(newRaw, reason) {
        try { localStorage.setItem(KEY_PREV, JSON.stringify(data)); } catch (e) { /* อาจเต็ม */ }
        data = normalize(newRaw);
        commit(reason || 'replace', { immediate: true });
    }
    function hasPrevious() { try { return !!localStorage.getItem(KEY_PREV); } catch (e) { return false; } }
    function restorePrevious() {
        const raw = localStorage.getItem(KEY_PREV);
        if (!raw) return false;
        const cur = data;
        data = normalize(JSON.parse(raw));
        try { localStorage.setItem(KEY_PREV, JSON.stringify(cur)); } catch (e) { /* ไม่เป็นไร */ }
        commit('replace', { immediate: true });
        return true;
    }

    /* ---------- ไฟล์ ---------- */
    async function saveText(text, name, desc) {
        let savedName = name;
        if (window.showSaveFilePicker && !(window.VSDemo && VSDemo.active)) {
            try {
                const handle = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: desc, accept: { 'application/json': ['.json'] } }] });
                const w = await handle.createWritable();
                await w.write(new Blob([text], { type: 'application/json' }));
                await w.close();
                savedName = handle.name || name;
            } catch (e) {
                if (e && e.name === 'AbortError') return null;
                U.downloadBlob(new Blob([text], { type: 'application/json' }), name);
            }
        } else {
            U.downloadBlob(new Blob([text], { type: 'application/json' }), name);
        }
        return savedName;
    }
    function backupFileName() { return `${U.safeFileName(['เกมจับคู่ความจำ', data.school.name || 'ข้อมูล', U.stamp()].join('_'))}.json`; }
    async function exportFile() {
        const savedName = await saveText(JSON.stringify(Object.assign({}, data, { exportedAt: new Date().toISOString() })), backupFileName(), 'ไฟล์ข้อมูลเกมจับคู่ความจำ (.json)');
        if (!savedName) return null;
        meta.lastBackupAt = new Date().toISOString();
        meta.lastBackupName = savedName;
        saveMeta();
        emit('backup');
        return savedName;
    }
    function parseBackup(text) {
        let obj;
        try { obj = JSON.parse(String(text).replace(/^﻿/, '')); } catch (e) { return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์ JSON ที่ถูกต้อง' }; }
        if (!obj || typeof obj !== 'object') return { ok: false, error: 'รูปแบบไฟล์ไม่ถูกต้อง' };
        if (obj.app === SET_FILE_ID) return { ok: false, error: 'ไฟล์นี้เป็น "ไฟล์ชุดเนื้อหา" — กรุณานำเข้าที่หน้า "ชุดเนื้อหา" → ปุ่ม "นำเข้าชุด (.json)"' };
        if (obj.app !== APP_ID) return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์ข้อมูลของเกมจับคู่ความจำ' };
        if ((obj.schemaVersion || 1) > SCHEMA_VERSION) return { ok: false, error: 'ไฟล์นี้สร้างจากโปรแกรมรุ่นใหม่กว่า กรุณาใช้โปรแกรมรุ่นล่าสุด' };
        const d = normalize(U.clone(obj));
        return { ok: true, data: d, summary: { school: d.school.name, sets: d.sets.length, pairs: d.sets.reduce((a, s) => a + s.pairs.length, 0), games: d.games.length, savedAt: obj.exportedAt || obj.updatedAt } };
    }

    /* ชุดเนื้อหาแยกไฟล์ (แบ่งปันให้ครูคนอื่น) */
    function exportSetText(setIds) {
        const sets = data.sets.filter((s) => setIds.includes(s.id));
        return JSON.stringify({ app: SET_FILE_ID, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), sets });
    }
    function parseSetFile(text) {
        let obj;
        try { obj = JSON.parse(String(text).replace(/^﻿/, '')); } catch (e) { return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์ JSON ที่ถูกต้อง' }; }
        if (!obj || (obj.app !== SET_FILE_ID && obj.app !== APP_ID) || !Array.isArray(obj.sets)) return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์ชุดเนื้อหาของเกมจับคู่ความจำ' };
        // สร้างรหัสใหม่ทั้งหมด กันชนกับชุดเดิม
        const setIds = new Set(data.sets.map((s) => s.id));
        const pairIds = new Set();
        data.sets.forEach((s) => s.pairs.forEach((q) => pairIds.add(q.id)));
        const sets = obj.sets.filter((s) => s && typeof s === 'object').map((s) => {
            const c = U.clone(s);
            delete c.id;
            (c.pairs || []).forEach((q) => { delete q.id; });
            return normSet(c, setIds, pairIds);
        });
        return { ok: true, sets };
    }
    function addSets(sets) {
        sets.forEach((s) => data.sets.push(s));
        commit('sets');
    }

    /* ย่อรูปให้ด้านยาวไม่เกิน 320 px แล้วเก็บเป็น data URL (ภาพย่อเก็บในข้อมูล) */
    function thumbFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!file || !/^image\//.test(file.type)) { reject(new Error('ไฟล์นี้ไม่ใช่รูปภาพ')); return; }
            if (file.size > 15 * 1024 * 1024) { reject(new Error('รูปใหญ่เกิน 15 MB')); return; }
            const r = new FileReader();
            r.onerror = () => reject(r.error);
            r.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const k = Math.min(1, THUMB / Math.max(img.naturalWidth || THUMB, img.naturalHeight || THUMB));
                    const w = Math.max(1, Math.round((img.naturalWidth || THUMB) * k));
                    const h = Math.max(1, Math.round((img.naturalHeight || THUMB) * k));
                    const cv = document.createElement('canvas');
                    cv.width = w;
                    cv.height = h;
                    const g = cv.getContext('2d');
                    g.fillStyle = '#fff';
                    g.fillRect(0, 0, w, h);
                    g.drawImage(img, 0, 0, w, h);
                    resolve({ src: cv.toDataURL('image/jpeg', 0.85), w, h });
                };
                img.onerror = () => reject(new Error('เปิดรูปนี้ไม่ได้'));
                img.src = String(r.result);
            };
            r.readAsDataURL(file);
        });
    }

    function needsBackup() {
        if (!meta.lastChangeAt) return false;
        if (!meta.lastBackupAt) return true;
        return new Date(meta.lastChangeAt) > new Date(meta.lastBackupAt);
    }
    function isEmpty() { return !data.sets.length && !data.games.length; }
    function resetAll() { replaceAll(newData(), 'reset'); }

    const set = (id) => data.sets.find((s) => s.id === id) || null;
    const subjectOf = (name) => SUBJECTS.find((s) => s.name === name) || null;
    const pairCount = () => data.sets.reduce((a, s) => a + s.pairs.length, 0);

    /* เกมที่กำลังเล่น: เก็บใน data.live (ปิดเบราว์เซอร์แล้วเล่นต่อได้) จบแล้วย้ายไป games */
    function saveLive(g, opts) {
        data.live = g;
        commit('live', Object.assign({ quiet: true }, opts || {}));
    }
    function finishLive() {
        const g = data.live;
        if (!g) return null;
        g.status = 'done';
        g.finishedAt = g.finishedAt || new Date().toISOString();
        data.games = data.games.filter((x) => x.id !== g.id);
        if (g.log.length) data.games.unshift(g);
        data.live = null;
        commit('games', { immediate: true });
        return g;
    }
    function dropLive() { data.live = null; commit('games', { immediate: true }); }

    window.Store = {
        KEY, SCHEMA_VERSION, SUBJECTS, LEVELS, KINDS, BACKS,
        load, commit, replaceAll, resetAll, newData, newSet, newPair, normalize,
        exportFile, saveText, parseBackup, backupFileName, needsBackup, isEmpty, hasPrevious, restorePrevious,
        exportSetText, parseSetFile, addSets, thumbFromFile,
        set, subjectOf, pairCount, saveLive, finishLive, dropLive,
        get data() { return data; },
        get meta() { return meta; },
        get storageOk() { return storageOk; },
        setMeta(patch) { Object.assign(meta, patch); saveMeta(); },
        on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        flush: persist,
    };
})();
