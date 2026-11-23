/* =====================================================================
   ข้อมูลหลัก: localStorage + บันทึก/เปิดไฟล์ .json (แบบระบบจัดตารางสอน)
   เก็บ: ข้อมูลโรงเรียน ตั้งค่าเกม แม่แบบข้อความ ชุดคำถาม ผู้เล่น/ทีม ประวัติผล ทะเบียนเกียรติบัตร เกมที่เล่นค้าง
   ===================================================================== */
(function () {
    'use strict';

    const KEY = 'vs_millionaire_quiz.data.v1';
    const KEY_PREV = 'vs_millionaire_quiz.data.v1.previous';
    const KEY_META = 'vs_millionaire_quiz.meta.v1';
    const SCHEMA_VERSION = 1;

    function newData() {
        return {
            app: Core.APP_ID, schemaVersion: SCHEMA_VERSION, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            school: Core.defaultSchool(), settings: Core.defaultSettings(), texts: Core.defaultTexts(),
            sets: [], players: [], teams: [], results: [], certs: [], certSeq: {}, live: null,
        };
    }
    function newSet() { return { id: U.uid('set'), name: '', subject: '', grade: '', color: '#2d16a0', icon: 'fa-circle-question', questions: [] }; }
    function newQuestion(level) { return { id: U.uid('q'), level: level || 1, text: '', choices: ['', '', '', ''], answer: 0, explain: '' }; }

    const str = (v) => (v == null ? '' : String(v));
    const num = (v, lo, hi, def) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def; };

    function normQuestion(q) {
        const x = Object.assign(newQuestion(), q || {});
        x.id = str(x.id) || U.uid('q');
        x.level = [1, 2, 3].includes(Number(x.level)) ? Number(x.level) : 1;
        x.text = str(x.text).trim();
        x.choices = (Array.isArray(x.choices) ? x.choices : []).slice(0, 4).map((c) => U.norm(c));
        while (x.choices.length < 4) x.choices.push('');
        x.answer = Math.round(num(x.answer, 0, 3, 0));
        x.explain = str(x.explain).trim();
        return x;
    }
    function normalize(raw) {
        const d = Object.assign(newData(), raw || {});
        d.app = Core.APP_ID;
        d.school = Object.assign(Core.defaultSchool(), d.school || {});
        d.texts = Object.assign(Core.defaultTexts(), d.texts || {});
        const st = Object.assign(Core.defaultSettings(), d.settings || {});
        st.ladder = (Array.isArray(st.ladder) ? st.ladder : []).map((v) => Math.round(num(v, 0, 1e12, 0))).filter((v) => v > 0).slice(0, 15);
        if (st.ladder.length < 5) st.ladder = Core.defaultSettings().ladder;
        st.safe = (Array.isArray(st.safe) ? st.safe : []).map(Number).filter((s) => s >= 1 && s < st.ladder.length);
        st.time = [0, 1, 2].map((i) => Math.round(num((st.time || [])[i], 0, 600, Core.defaultSettings().time[i])));
        st.suspense = num(st.suspense, 0, 10, 2);
        st.volume = num(st.volume, 0, 1, 0.8);
        st.sound = st.sound !== false;
        st.lifelines = Object.assign({ fifty: true, ask: true, swap: true }, st.lifelines || {});
        st.askMode = st.askMode === 'sim' ? 'sim' : 'count';
        st.classSize = Math.round(num(st.classSize, 1, 200, 30));
        st.unit = U.norm(st.unit) || 'คะแนน';
        d.settings = st;
        ['sets', 'players', 'teams', 'results', 'certs'].forEach((k) => { if (!Array.isArray(d[k])) d[k] = []; });
        d.sets = d.sets.filter((s) => s && typeof s === 'object').map((s) => {
            const x = Object.assign(newSet(), s);
            x.id = str(x.id) || U.uid('set');
            ['name', 'subject', 'grade'].forEach((f) => { x[f] = U.norm(x[f]); });
            x.questions = (Array.isArray(x.questions) ? x.questions : []).map(normQuestion);
            return x;
        });
        d.players = d.players.filter(Boolean).map((p) => Object.assign({ id: U.uid('p'), name: '', className: '' }, p, { type: 'single' }));
        d.teams = d.teams.filter(Boolean).map((t) => Object.assign({ id: U.uid('t'), name: '', className: '', members: [] }, t, { type: 'team' }));
        if (!d.certSeq || typeof d.certSeq !== 'object') d.certSeq = {};
        d.schemaVersion = SCHEMA_VERSION;
        return d;
    }

    /* ---------- สถานะ ---------- */
    const listeners = new Set();
    let data = null;
    let meta = { lastBackupAt: null, lastBackupName: '', lastChangeAt: null, dismissedWelcome: false };

    function loadMeta() { try { meta = Object.assign(meta, JSON.parse(localStorage.getItem(KEY_META) || '{}')); } catch (e) { /* ค่าเริ่มต้น */ } }
    function saveMeta() { try { localStorage.setItem(KEY_META, JSON.stringify(meta)); } catch (e) { /* ไม่เป็นไร */ } }
    function load() {
        loadMeta();
        try { const raw = localStorage.getItem(KEY); data = raw ? normalize(JSON.parse(raw)) : newData(); } catch (e) { console.warn('โหลดข้อมูลไม่สำเร็จ', e); data = newData(); }
        return data;
    }
    function persist() {
        try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {
            U.toast('บันทึกลงเบราว์เซอร์ไม่สำเร็จ — กรุณากด "บันทึกไฟล์ข้อมูล" เพื่อสำรองทันที', { type: 'bad', ms: 8000 });
        }
    }
    const persistSoon = U.debounce(persist, 250);
    function emit(reason) { listeners.forEach((fn) => { try { fn(reason); } catch (e) { console.error(e); } }); }
    function commit(reason, opts) {
        data.updatedAt = new Date().toISOString();
        if (!(opts && opts.quiet)) { meta.lastChangeAt = data.updatedAt; saveMeta(); }
        if (opts && opts.immediate) persist(); else persistSoon();
        emit(reason || 'change');
    }
    function replaceAll(raw, reason) {
        try { if (data) localStorage.setItem(KEY_PREV, JSON.stringify(data)); } catch (e) { /* อาจเต็ม */ }
        data = normalize(raw);
        commit(reason || 'replace', { immediate: true });
    }
    const hasPrevious = () => { try { return !!localStorage.getItem(KEY_PREV); } catch (e) { return false; } };
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
    const backupFileName = () => `${U.safeFileName(['เกมเศรษฐี', data.school.name || 'ข้อมูล', U.stamp()].join('_'))}.json`;
    async function exportFile() {
        const text = JSON.stringify(Object.assign({}, data, { exportedAt: new Date().toISOString() }));
        const name = backupFileName();
        let savedName = name;
        const blob = new Blob([text], { type: 'application/json' });
        if (window.showSaveFilePicker && !(window.VSDemo && VSDemo.active)) {
            try {
                const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'ไฟล์ข้อมูลเกมเศรษฐี (.json)', accept: { 'application/json': ['.json'] } }] });
                const w = await h.createWritable(); await w.write(blob); await w.close(); savedName = h.name || name;
            } catch (e) {
                if (e && e.name === 'AbortError') return null;
                U.downloadBlob(blob, name);
            }
        } else U.downloadBlob(blob, name);
        meta.lastBackupAt = new Date().toISOString(); meta.lastBackupName = savedName; saveMeta();
        emit('backup');
        return savedName;
    }
    function parseBackup(text) {
        let obj;
        try { obj = JSON.parse(String(text).replace(/^﻿/, '')); } catch (e) { return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์ JSON ที่ถูกต้อง' }; }
        if (!obj || typeof obj !== 'object' || (obj.app !== Core.APP_ID && !Array.isArray(obj.sets))) return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์ข้อมูลของเกมเศรษฐีตอบคำถาม' };
        if ((obj.schemaVersion || 1) > SCHEMA_VERSION) return { ok: false, error: 'ไฟล์นี้สร้างจากโปรแกรมรุ่นใหม่กว่า กรุณาใช้โปรแกรมรุ่นล่าสุด' };
        const d = normalize(obj);
        return { ok: true, data: d, summary: { school: d.school.name, sets: d.sets.length, questions: d.sets.reduce((a, s) => a + s.questions.length, 0), people: d.players.length + d.teams.length, results: d.results.length, savedAt: obj.exportedAt || obj.updatedAt } };
    }
    function needsBackup() {
        if (!meta.lastChangeAt) return false;
        if (!meta.lastBackupAt) return true;
        return new Date(meta.lastChangeAt) > new Date(meta.lastBackupAt);
    }
    const isEmpty = () => !data.sets.length && !data.players.length && !data.teams.length && !data.results.length;

    /* ---------- ทะเบียนเกียรติบัตร: เลขที่อัตโนมัติ รันต่อเนื่องแยกตามปีการศึกษา ---------- */
    function issueCert(result) {
        const year = data.school.academicYear || String(new Date().getFullYear() + 543);
        const exist = data.certs.find((c) => c.resultId === result.id);
        if (exist) return exist;
        const no = (Number(data.certSeq[year]) || 0) + 1;
        data.certSeq[year] = no;
        const c = { id: U.uid('c'), no, year, resultId: result.id, name: result.player, members: result.members || [], date: result.date, reason: '' };
        data.certs.unshift(c);
        commit('cert');
        return c;
    }

    window.addEventListener('storage', (e) => {
        if (e.key !== KEY || e.newValue == null) return;
        try { data = normalize(JSON.parse(e.newValue)); emit('replace'); } catch (err) { /* ข้าม */ }
    });

    window.Store = {
        KEY, newData, newSet, newQuestion, normalize, normQuestion, load, commit, replaceAll, hasPrevious, restorePrevious,
        exportFile, parseBackup, needsBackup, isEmpty, issueCert,
        set: (id) => data.sets.find((s) => s.id === id) || null,
        get data() { return data; },
        get meta() { return meta; },
        setMeta(p) { Object.assign(meta, p); saveMeta(); },
        on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        flush: persist,
    };
})();
