/* =====================================================================
   ที่เก็บข้อมูล: localStorage + สำรอง/เปิดไฟล์ .json (แบบระบบจัดตารางสอน)
   ข้อมูล: school (ข้อมูลโรงเรียน) • sets (ชุดคำ) • games (ชุดการ์ด/เกม + การเรียก + ผู้ชนะ)
   ===================================================================== */
(function () {
    'use strict';

    const KEY = 'vs_bingo_maker.data.v1';
    const KEY_PREV = 'vs_bingo_maker.data.v1.previous';
    const KEY_META = 'vs_bingo_maker.meta.v1';
    const SCHEMA_VERSION = 1;
    const APP_ID = 'vs-bingo-maker';
    const SUBJECTS = ['ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์', 'สังคมศึกษา', 'ภาษาอังกฤษ', 'ภาษาจีน', 'ประวัติศาสตร์', 'สุขศึกษาและพลศึกษา', 'ศิลปะ', 'การงานอาชีพ', 'วิทยาการคำนวณ', 'อื่น ๆ'];
    const LEVELS = ['อนุบาล', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];

    function newData() {
        const now = new Date().toISOString();
        return {
            app: APP_ID, schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now,
            school: { name: '', agency: '', academicYear: String(new Date().getFullYear() + 543), semester: '1', teacherName: '', teacherPosition: '', headName: '', headPosition: '', director: '', directorPosition: '' },
            sets: [], games: [],
        };
    }
    function newSet() {
        const now = new Date().toISOString();
        return { id: U.uid('set'), name: '', subject: 'ภาษาอังกฤษ', level: 'ป.4', note: '', items: [], createdAt: now, updatedAt: now };
    }
    function newItem(q, a) { return { id: U.uid('it'), q: q || '', a: a || '' }; }
    function newGame(setId) {
        const now = new Date().toISOString();
        return {
            id: U.uid('game'), name: '', setId: setId || '', size: 5, free: true, count: 30, seed: Bingo.newSeed(), perPage: 2,
            pattern: 'line', title: 'BINGO', subtitle: '', cls: '', dateText: '', students: [], showNames: false, showQ: false,
            cards: [], calls: [], winners: [], createdAt: now, updatedAt: now,
        };
    }

    const str = (v) => (v == null ? '' : String(v));
    function normalize(raw) {
        const d = Object.assign(newData(), raw || {});
        d.app = APP_ID;
        d.school = Object.assign(newData().school, d.school || {});
        d.sets = (Array.isArray(d.sets) ? d.sets : []).map((s) => {
            const x = Object.assign(newSet(), s || {});
            x.items = (Array.isArray(x.items) ? x.items : []).map((it) => ({ id: str(it.id) || U.uid('it'), q: str(it.q), a: str(it.a) }));
            return x;
        });
        d.games = (Array.isArray(d.games) ? d.games : []).map((g) => {
            const x = Object.assign(newGame(), g || {});
            x.size = [3, 4, 5].includes(Number(x.size)) ? Number(x.size) : 5;
            x.perPage = [1, 2, 4].includes(Number(x.perPage)) ? Number(x.perPage) : 2;
            x.cards = Array.isArray(x.cards) ? x.cards : [];
            x.calls = Array.isArray(x.calls) ? x.calls : [];
            x.winners = Array.isArray(x.winners) ? x.winners : [];
            x.students = Array.isArray(x.students) ? x.students.map(str) : [];
            return x;
        });
        delete d.exportedAt;
        return d;
    }

    const listeners = new Set();
    let data = null;
    let meta = { lastBackupAt: null, lastBackupName: '', lastChangeAt: null, lastSavedAt: null, dismissedWelcome: false, sound: true, speech: true };
    let storageOk = true;

    function loadMeta() { try { Object.assign(meta, JSON.parse(localStorage.getItem(KEY_META) || '{}')); } catch (e) { /* ใช้ค่าเริ่มต้น */ } }
    function saveMeta() { try { localStorage.setItem(KEY_META, JSON.stringify(meta)); } catch (e) { /* ข้าม */ } }
    function load() {
        loadMeta();
        try {
            const raw = localStorage.getItem(KEY);
            data = normalize(raw ? JSON.parse(raw) : null);
        } catch (e) {
            console.error(e);
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
            U.toast('บันทึกลงเบราว์เซอร์ไม่สำเร็จ — กรุณากด "บันทึกไฟล์ข้อมูล" เพื่อสำรองทันที', { type: 'bad', ms: 8000 });
        }
    }
    const persistSoon = U.debounce(persist, 250);
    function emit(reason) { listeners.forEach((fn) => { try { fn(reason); } catch (e) { console.error(e); } }); }

    /* เรียกหลังแก้ไขข้อมูลทุกครั้ง */
    function commit(reason, opts) {
        data.updatedAt = new Date().toISOString();
        meta.lastChangeAt = data.updatedAt;
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

    /* ---------- สำรองเป็นไฟล์ ---------- */
    function backupFileName() {
        const sc = data.school;
        return `${U.safeFileName(['บิงโก', sc.name || 'ข้อมูล', U.stamp()].join('_'))}.json`;
    }
    async function exportFile() {
        const text = JSON.stringify(Object.assign({}, data, { exportedAt: new Date().toISOString() }), null, 1);
        const name = backupFileName();
        let savedName = name;
        if (window.showSaveFilePicker && !(window.VSDemo && VSDemo.active)) {
            try {
                const handle = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'ไฟล์ข้อมูลเกมบิงโก (.json)', accept: { 'application/json': ['.json'] } }] });
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
        if (obj.app !== APP_ID && !(Array.isArray(obj.sets) && Array.isArray(obj.games))) return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์ข้อมูลของโปรแกรมเกมบิงโก' };
        if ((obj.schemaVersion || 1) > SCHEMA_VERSION) return { ok: false, error: 'ไฟล์นี้สร้างจากโปรแกรมรุ่นใหม่กว่า กรุณาใช้โปรแกรมรุ่นล่าสุด' };
        const d = normalize(U.clone(obj));
        return {
            ok: true, data: d,
            summary: { school: d.school.name, sets: d.sets.length, items: d.sets.reduce((n, s) => n + s.items.length, 0), games: d.games.length, cards: d.games.reduce((n, g) => n + g.cards.length, 0), savedAt: obj.exportedAt || obj.updatedAt },
        };
    }
    function needsBackup() {
        if (!meta.lastChangeAt) return false;
        if (!meta.lastBackupAt) return true;
        return new Date(meta.lastChangeAt) > new Date(meta.lastBackupAt);
    }
    function isEmpty() { return !data.sets.length && !data.games.length; }
    function resetAll() { replaceAll(newData(), 'reset'); }

    /* ---------- ตัวช่วยอ่านข้อมูล ---------- */
    const set = (id) => data.sets.find((s) => s.id === id) || null;
    const game = (id) => data.games.find((g) => g.id === id) || null;
    function itemMap(s) { return new Map((s ? s.items : []).map((i) => [i.id, i])); }
    function termText() { const s = data.school; return `ภาคเรียนที่ ${s.semester || '-'}/${s.academicYear || '-'}`; }
    /* การ์ดของเกมยังตรงกับชุดคำปัจจุบันหรือไม่ (ถ้าลบคำที่อยู่บนการ์ดไปแล้วต้องสร้างใหม่) */
    function gameStale(g) {
        const s = set(g.setId);
        if (!s || !g.cards.length) return true;
        const m = itemMap(s);
        return g.cards.some((c) => c.cells.some((id) => id !== Bingo.FREE && !m.has(id)));
    }
    function setMeta(o) { Object.assign(meta, o); saveMeta(); }
    function flush() { persist(); }

    window.addEventListener('storage', (e) => {
        if (e.key === KEY && e.newValue) {
            try { data = normalize(JSON.parse(e.newValue)); emit('replace'); } catch (err) { /* ข้าม */ }
        }
    });

    window.Store = {
        SUBJECTS, LEVELS, APP_ID, load, commit, replaceAll, hasPrevious, restorePrevious, exportFile, parseBackup, needsBackup, isEmpty, resetAll,
        newSet, newItem, newGame, set, game, itemMap, termText, gameStale, setMeta, flush, normalize,
        on: (fn) => listeners.add(fn),
        get data() { return data; }, get meta() { return meta; }, get storageOk() { return storageOk; },
    };
})();
