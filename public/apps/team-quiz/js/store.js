/* =====================================================================
   ข้อมูลหลัก: localStorage (คลังคำถาม ทีม ผลการแข่งขัน ตั้งค่า) + IndexedDB (รูป ผ่าน Img)
   + บันทึก/เปิดไฟล์ .json (รวมรูปภาพในไฟล์) แบบเดียวกับระบบจัดตารางสอน
   สถานะเกมที่กำลังเล่นอยู่แยกไว้ใน Link (js/link.js)
   ===================================================================== */
(function () {
    'use strict';

    const KEY = 'vs_team_quiz.data.v1';
    const KEY_PREV = 'vs_team_quiz.data.v1.previous';
    const KEY_META = 'vs_team_quiz.meta.v1';
    const SCHEMA_VERSION = 1;
    const APP_ID = 'vs-team-quiz';
    const MAX_CHOICES = 4;

    const SUBJECTS = [
        { name: 'วิทยาศาสตร์', icon: 'fa-flask', color: '#16a34a' },
        { name: 'คณิตศาสตร์', icon: 'fa-square-root-variable', color: '#2563eb' },
        { name: 'ภาษาไทย', icon: 'fa-book-open', color: '#db2777' },
        { name: 'สังคมศึกษา', icon: 'fa-landmark', color: '#b45309' },
        { name: 'ภาษาอังกฤษ', icon: 'fa-language', color: '#7c3aed' },
        { name: 'วิทยาการคำนวณ', icon: 'fa-laptop-code', color: '#0891b2' },
        { name: 'สุขศึกษาและพลศึกษา', icon: 'fa-heart-pulse', color: '#e11d48' },
        { name: 'ศิลปะ', icon: 'fa-palette', color: '#ea580c' },
        { name: 'การงานอาชีพ', icon: 'fa-screwdriver-wrench', color: '#65a30d' },
        { name: 'ความรู้รอบตัว', icon: 'fa-lightbulb', color: '#dc2626' },
    ];

    function newSettings() {
        return { sound: true, volume: 0.8, time: 30, points: 10, penalty: 0, letters: 'th', keys: Engine.DEFAULT_KEYS.slice(), touchBuzz: false };
    }
    function newData() {
        const now = new Date().toISOString();
        const y = new Date().getFullYear() + 543;
        return {
            app: APP_ID,
            schemaVersion: SCHEMA_VERSION,
            createdAt: now,
            updatedAt: now,
            school: { name: '', agency: '', academicYear: String(y), semester: '1', director: '', reporterName: '', reporterPosition: '' },
            settings: newSettings(),
            sets: [],
            teams: [],
            matches: [],
        };
    }
    function newSet() {
        const now = new Date().toISOString();
        return { id: U.uid('set'), name: '', subject: '', level: '', color: '#dc2626', icon: 'fa-circle-question', desc: '', questions: [], createdAt: now, updatedAt: now };
    }
    function newQuestion(type) {
        const t = type === 'text' ? 'text' : 'mc';
        return { id: U.uid('q'), type: t, text: '', image: '', choices: t === 'mc' ? ['', '', '', ''] : [], answer: t === 'mc' ? 0 : '', points: 0, time: 0, category: '', explain: '' };
    }
    function newTeam(i) {
        const k = i || 0;
        return { id: U.uid('tm'), name: '', color: Engine.TEAM_COLORS[k % Engine.TEAM_COLORS.length], icon: Engine.TEAM_ICONS[k % Engine.TEAM_ICONS.length], members: [], note: '' };
    }

    const str = (v) => (v == null ? '' : String(v));
    const num = (v, lo, hi, def) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def; };
    const color = (v, def) => (/^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v) : def);
    const icon = (v, def) => (/^fa-[a-z0-9-]+$/.test(String(v || '')) ? String(v) : def);

    function normQuestion(q, ids) {
        const x = Object.assign(newQuestion(q && q.type), q || {});
        x.id = q && q.id && !ids.has(q.id) ? String(q.id) : U.uid('q');
        ids.add(x.id);
        x.type = x.type === 'text' ? 'text' : 'mc';
        x.text = str(x.text).replace(/\r\n/g, '\n').trim();
        x.image = str(x.image);
        x.category = U.norm(x.category);
        x.explain = str(x.explain).trim();
        x.points = num(x.points, 0, 100000, 0);
        x.time = Math.round(num(x.time, 0, 600, 0));
        if (x.type === 'mc') {
            x.choices = (Array.isArray(x.choices) ? x.choices : []).map((c) => U.norm(c)).slice(0, MAX_CHOICES);
            while (x.choices.length < 2) x.choices.push('');
            x.answer = Number.isInteger(Number(x.answer)) ? Math.max(0, Math.min(x.choices.length - 1, Number(x.answer))) : 0;
        } else {
            x.choices = [];
            x.answer = U.norm(x.answer);
        }
        return x;
    }

    function normalize(raw) {
        const d = Object.assign(newData(), raw || {});
        d.app = APP_ID;
        d.school = Object.assign(newData().school, d.school || {});
        Object.keys(d.school).forEach((k) => { d.school[k] = U.norm(d.school[k]); });
        const st = Object.assign(newSettings(), d.settings || {});
        st.sound = st.sound !== false;
        st.volume = num(st.volume, 0, 1, 0.8);
        st.time = Math.round(num(st.time, 0, 600, 30));
        st.points = num(st.points, 1, 100000, 10);
        st.penalty = num(st.penalty, 0, 100000, 0);
        st.letters = st.letters === 'en' ? 'en' : 'th';
        st.touchBuzz = !!st.touchBuzz;
        st.keys = Engine.DEFAULT_KEYS.map((k, i) => Engine.normKey((st.keys || [])[i]) || k);
        d.settings = st;
        ['sets', 'teams', 'matches'].forEach((k) => { if (!Array.isArray(d[k])) d[k] = []; });
        delete d.images;

        const setIds = new Set();
        const qIds = new Set();
        d.sets = d.sets.filter((s) => s && typeof s === 'object').map((s) => {
            const x = Object.assign(newSet(), s);
            x.id = s.id && !setIds.has(s.id) ? String(s.id) : U.uid('set');
            setIds.add(x.id);
            ['name', 'subject', 'level'].forEach((f) => { x[f] = U.norm(x[f]); });
            x.desc = str(x.desc).trim();
            x.color = color(x.color, '#dc2626');
            x.icon = icon(x.icon, 'fa-circle-question');
            x.questions = (Array.isArray(x.questions) ? x.questions : []).filter((q) => q && typeof q === 'object').map((q) => normQuestion(q, qIds));
            return x;
        });

        const tmIds = new Set();
        d.teams = d.teams.filter((t) => t && typeof t === 'object').map((t, i) => {
            const x = Object.assign(newTeam(i), t);
            x.id = t.id && !tmIds.has(t.id) ? String(t.id) : U.uid('tm');
            tmIds.add(x.id);
            x.name = U.norm(x.name);
            x.color = color(x.color, Engine.TEAM_COLORS[i % Engine.TEAM_COLORS.length]);
            x.icon = icon(x.icon, Engine.TEAM_ICONS[i % Engine.TEAM_ICONS.length]);
            x.members = (Array.isArray(x.members) ? x.members : String(x.members || '').split(/[\n,]/)).map(U.norm).filter(Boolean).slice(0, 12);
            x.note = U.norm(x.note);
            return x;
        });

        const mIds = new Set();
        d.matches = d.matches.filter((m) => m && typeof m === 'object' && Array.isArray(m.teams) && Array.isArray(m.deck)).map((m) => {
            const x = Object.assign({ title: '', subtitle: '', setName: '', dateText: '', place: '', judges: [], note: '', mode: 'mc', opts: {}, results: {}, adjusts: [], status: 'done' }, m);
            x.id = m.id && !mIds.has(m.id) ? String(m.id) : U.uid('m');
            mIds.add(x.id);
            ['title', 'subtitle', 'setName', 'dateText', 'place', 'note'].forEach((f) => { x[f] = U.norm(x[f]); });
            x.judges = (Array.isArray(x.judges) ? x.judges : []).map(U.norm).slice(0, 5);
            if (!Engine.MODES[x.mode]) x.mode = 'mc';
            if (!x.results || typeof x.results !== 'object') x.results = {};
            if (!Array.isArray(x.adjusts)) x.adjusts = [];
            x.teams = x.teams.map((t, i) => Object.assign({ id: `t${i + 1}`, name: `ทีม ${i + 1}`, color: Engine.TEAM_COLORS[i % 10], icon: 'fa-star', members: [], score: 0 }, t));
            Engine.recompute(x);
            return x;
        });
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
            U.toast('บันทึกลงเบราว์เซอร์ไม่สำเร็จ — กรุณากด "บันทึกไฟล์ข้อมูล" เพื่อสำรองทันที', { type: 'bad', ms: 8000 });
        }
    }
    const persistSoon = U.debounce(persist, 250);

    function emit(reason) { listeners.forEach((fn) => { try { fn(reason); } catch (e) { console.error(e); } }); }

    function commit(reason, opts) {
        if (opts && opts.normalize) data = normalize(data);
        data.updatedAt = new Date().toISOString();
        if (!(opts && opts.quiet)) meta.lastChangeAt = data.updatedAt;
        if (opts && opts.immediate) persist(); else persistSoon();
        emit(reason || 'change');
    }

    function imageIds(d) {
        const ids = new Set();
        (d || data).sets.forEach((s) => s.questions.forEach((q) => { if (q.image) ids.add(q.image); }));
        return ids;
    }

    /* แทนที่ข้อมูลทั้งหมด (เปิดไฟล์ / ข้อมูลตัวอย่าง / ล้างข้อมูล) — รูปในไฟล์ย้ายเข้า IndexedDB */
    function replaceAll(newRaw, reason) {
        try { localStorage.setItem(KEY_PREV, JSON.stringify(data)); } catch (e) { /* อาจเต็ม */ }
        const imgs = (newRaw && newRaw.images) || {};
        Object.keys(imgs).forEach((id) => Img.put(id, imgs[id]));
        const prevIds = imageIds();
        data = normalize(newRaw);
        const keep = new Set([...imageIds(), ...prevIds]);
        Img.gc(keep);
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
        const parts = ['เกมตอบคำถาม', data.school.name || 'ข้อมูล', U.stamp()];
        return `${U.safeFileName(parts.join('_'))}.json`;
    }
    function payload() {
        return Object.assign({}, data, { exportedAt: new Date().toISOString(), images: Img.exportMap([...imageIds()]) });
    }
    async function saveText(text, name, desc) {
        let savedName = name;
        if (window.showSaveFilePicker) {
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
    async function exportFile() {
        const savedName = await saveText(JSON.stringify(payload()), backupFileName(), 'ไฟล์ข้อมูลเกมตอบคำถาม (.json)');
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
        if (obj.app !== APP_ID && !(Array.isArray(obj.sets) && Array.isArray(obj.matches))) {
            return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์ข้อมูลของเกมตอบคำถามแข่งขันแบบทีม' };
        }
        if ((obj.schemaVersion || 1) > SCHEMA_VERSION) return { ok: false, error: 'ไฟล์นี้สร้างจากโปรแกรมรุ่นใหม่กว่า กรุณาใช้โปรแกรมรุ่นล่าสุด' };
        const images = obj.images || {};
        const d = normalize(U.clone(obj));
        d.images = images;
        return {
            ok: true,
            data: d,
            summary: {
                school: d.school.name,
                sets: d.sets.length,
                questions: d.sets.reduce((a, s) => a + s.questions.length, 0),
                teams: d.teams.length,
                matches: d.matches.length,
                images: Object.keys(images).length,
                savedAt: obj.exportedAt || obj.updatedAt,
            },
        };
    }

    function needsBackup() {
        if (!meta.lastChangeAt) return false;
        if (!meta.lastBackupAt) return true;
        return new Date(meta.lastChangeAt) > new Date(meta.lastBackupAt);
    }
    function isEmpty() { return !data.sets.length && !data.teams.length && !data.matches.length; }
    function resetAll() { replaceAll(newData(), 'reset'); }

    /* ---------- ตัวช่วยอ่านข้อมูล ---------- */
    const set = (id) => data.sets.find((s) => s.id === id) || null;
    const team = (id) => data.teams.find((t) => t.id === id) || null;
    const match = (id) => data.matches.find((m) => m.id === id) || null;
    const subjectOf = (name) => SUBJECTS.find((s) => s.name === name) || null;
    const questionCount = () => data.sets.reduce((a, s) => a + s.questions.length, 0);

    /* บันทึกผลการแข่งขันจากเกมที่กำลังเล่น (เรียกบ่อยได้) */
    function upsertMatch(rec) {
        const i = data.matches.findIndex((m) => m.id === rec.id);
        const old = i >= 0 ? data.matches[i] : null;
        const x = Object.assign({ place: '', judges: [], note: '' }, old ? { place: old.place, judges: old.judges, note: old.note } : {}, rec);
        if (i >= 0) data.matches[i] = x; else data.matches.unshift(x);
        commit('match', { quiet: !!old && old.status === x.status });
    }

    /* เปิดโปรแกรมไว้หลายหน้าต่าง: ใช้ข้อมูลล่าสุดเสมอ */
    window.addEventListener('storage', (e) => {
        if (e.key === KEY_META) { loadMeta(); emit('backup'); return; }
        if (e.key !== KEY || e.newValue == null) return;
        try {
            const before = data ? JSON.stringify(Object.assign({}, data, { matches: null, updatedAt: null })) : '';
            data = normalize(JSON.parse(e.newValue));
            loadMeta();
            const after = JSON.stringify(Object.assign({}, data, { matches: null, updatedAt: null }));
            emit(before === after ? 'match' : 'replace');
            if (before !== after) U.toast('ข้อมูลถูกแก้ไขจากอีกหน้าต่างหนึ่ง — แสดงข้อมูลล่าสุดแล้ว', { type: 'warn', ms: 4000 });
        } catch (err) { /* ข้าม */ }
    });

    window.Store = {
        KEY, SCHEMA_VERSION, SUBJECTS, MAX_CHOICES,
        load, commit, replaceAll, resetAll, newData, newSet, newQuestion, newTeam, normalize, normQuestion,
        exportFile, saveText, parseBackup, backupFileName, needsBackup, isEmpty, hasPrevious, restorePrevious,
        set, team, match, subjectOf, questionCount, upsertMatch, imageIds,
        get data() { return data; },
        get meta() { return meta; },
        get storageOk() { return storageOk; },
        setMeta(patch) { Object.assign(meta, patch); saveMeta(); },
        on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        flush: persist,
    };
})();
