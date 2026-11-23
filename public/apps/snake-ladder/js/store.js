/* =====================================================================
   ข้อมูลหลัก: localStorage (ชุดคำถาม กระดาน ผลการแข่งขัน เกมที่เล่นค้าง ตั้งค่า แม่แบบข้อความ)
   รูปประกอบคำถามย่อ (ด้านยาว ≤ 480 px) เก็บเป็น data URL ในข้อมูล — ไฟล์ .json จึงพกรูปไปด้วย
   + บันทึก/เปิดไฟล์ข้อมูล .json + ส่งออก/นำเข้า "ชุดคำถาม" เป็น .json แยกชุด
   ===================================================================== */
(function () {
    'use strict';

    const KEY = 'vs_snake_ladder_quiz.data.v1';
    const KEY_PREV = 'vs_snake_ladder_quiz.data.v1.previous';
    const KEY_META = 'vs_snake_ladder_quiz.meta.v1';
    const SCHEMA_VERSION = 1;
    const APP_ID = 'vs-snake-ladder-quiz';
    const SET_FILE_ID = 'vs-snake-ladder-quiz-set';
    const THUMB = 480;

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

    /* แม่แบบข้อความในเอกสาร — แก้ได้ทุกช่องที่หน้า "ตั้งค่า" */
    const TPL_DEFAULT = {
        purpose: 'เพื่อทบทวนบทเรียนและส่งเสริมการเรียนรู้อย่างสนุกสนานผ่านการทำงานเป็นทีม',
        memoSubject: 'รายงานผลการจัดกิจกรรม{กิจกรรม}',
        memoOpen: 'ตามที่{โรงเรียน}ได้จัดกิจกรรม{กิจกรรม}{เมื่อ} {วัตถุประสงค์} นั้น',
        memoBody: 'บัดนี้ การดำเนินกิจกรรมดังกล่าวเสร็จสิ้นแล้ว มีทีมเข้าร่วมการแข่งขันทั้งสิ้น {จำนวนทีม} ทีม ใช้ชุดคำถาม{ชุดคำถาม} บนกระดานบันไดงู {จำนวนช่อง} ช่อง ตอบคำถามทั้งสิ้น {จำนวนคำถาม} ข้อ ตอบถูก {ตอบถูก} ข้อ คิดเป็นร้อยละ {ร้อยละ} {ผลรางวัล} รายละเอียดตามสรุปผลการแข่งขันที่แนบมาพร้อมนี้',
        memoClose: 'จึงเรียนมาเพื่อโปรดทราบ',
        summaryTitle: 'สรุปผลการแข่งขันเกมบันไดงูตอบคำถาม',
        rulesNote: 'กติกา: ทอยลูกเต๋าเดินตามแต้ม ตกช่องคำถามต้องตอบภายใน {เวลา} วินาที ตอบถูกเดินต่อ {ถูก} ช่อง ตอบผิดถอย {ผิด} ช่อง ขึ้นบันไดเมื่อถึงเชิงบันได ลงตามตัวงูเมื่อถึงหัวงู ทีมแรกที่ถึงช่อง {จำนวนช่อง} เป็นผู้ชนะ',
        judgePos1: 'ประธานกรรมการ',
        judgePos2: 'กรรมการ',
        judgePos3: 'กรรมการและเลขานุการ',
        cardFooter: 'เกมบันไดงูตอบคำถาม',
    };

    function newSettings() { return { sound: true, volume: 0.8, teamPreset: 'animal', teamCount: 4, boardId: '', setId: '', opts: Engine.defaultOpts() }; }
    function newData() {
        const now = new Date().toISOString();
        return {
            app: APP_ID, schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now,
            school: { name: '', agency: '', academicYear: String(new Date().getFullYear() + 543), semester: '1', director: '', reporterName: '', reporterPosition: '' },
            settings: newSettings(), tpl: Object.assign({}, TPL_DEFAULT), sets: [], boards: [], games: [], live: null,
        };
    }
    function newSet() {
        const now = new Date().toISOString();
        return { id: U.uid('set'), name: '', subject: '', level: '', color: '#44a016', icon: 'fa-circle-question', desc: '', questions: [], createdAt: now, updatedAt: now };
    }
    function newQuestion(type) { return { id: U.uid('q'), type: type || 'mc', q: '', choices: type === 'mc' || !type ? ['', '', '', ''] : [], answer: type === 'tf' ? true : type === 'fill' ? '' : 0, explain: '', img: '' }; }
    function newBoard(n) {
        const now = new Date().toISOString();
        return Object.assign({ id: U.uid('bd'), name: `กระดาน ${n || 50} ช่อง`, createdAt: now, updatedAt: now }, Engine.autoBoard(n || 50, { seed: Date.now() }));
    }

    const str = (v) => (v == null ? '' : String(v));
    const color = (v, def) => (/^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v) : def);
    const icon = (v, def) => (/^fa-[a-z0-9-]+$/.test(String(v || '')) ? String(v) : def);
    const imgOk = (v) => (/^data:image\/(png|jpeg|webp|gif|svg\+xml)[;,]/.test(String(v || '')) ? String(v) : '');

    function normQuestion(q, ids) {
        const x = Object.assign(newQuestion(q && q.type), q || {});
        x.id = q && q.id && !ids.has(q.id) ? String(q.id) : U.uid('q');
        ids.add(x.id);
        x.type = Engine.QTYPES[x.type] ? x.type : 'mc';
        x.q = str(x.q).trim();
        x.explain = str(x.explain).trim();
        x.img = imgOk(x.img);
        if (x.type === 'mc') {
            const c = (Array.isArray(x.choices) ? x.choices : []).map((v) => str(v).trim()).slice(0, 4);
            while (c.length < 4) c.push('');
            x.choices = c;
            const a = Math.round(Number(x.answer));
            x.answer = a >= 0 && a < 4 ? a : 0;
        } else if (x.type === 'tf') {
            x.choices = [];
            x.answer = x.answer === true || x.answer === 'true' || x.answer === 1 || x.answer === 'ถูก';
        } else {
            x.choices = [];
            x.answer = str(x.answer).trim();
        }
        return x;
    }
    function normSet(s, setIds, qIds) {
        const x = Object.assign(newSet(), s);
        x.id = s.id && !setIds.has(s.id) ? String(s.id) : U.uid('set');
        setIds.add(x.id);
        ['name', 'subject', 'level'].forEach((f) => { x[f] = U.norm(x[f]); });
        x.desc = str(x.desc).trim();
        x.color = color(x.color, '#44a016');
        x.icon = icon(x.icon, 'fa-circle-question');
        x.questions = (Array.isArray(x.questions) ? x.questions : []).filter((q) => q && typeof q === 'object').map((q) => normQuestion(q, qIds));
        return x;
    }
    function normBoardRec(b, ids) {
        const x = Object.assign({ name: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, b || {}, Engine.normBoard(b));
        x.id = b && b.id && !ids.has(b.id) ? String(b.id) : U.uid('bd');
        ids.add(x.id);
        x.name = U.norm(x.name) || `กระดาน ${x.n} ช่อง`;
        return x;
    }
    function normGame(g) {
        if (!g || typeof g !== 'object' || !Array.isArray(g.teams) || !g.board || !Array.isArray(g.questions)) return null;
        const x = Object.assign({ title: '', setName: '', subject: '', boardName: '', dateText: '', place: '', judges: [], log: [], status: 'done', turn: 0, round: 1, qNext: 0, phase: 'roll', pending: null }, g);
        x.board = Engine.normBoard(x.board);
        x.opts = Engine.normOpts(x.opts);
        x.judges = (Array.isArray(x.judges) ? x.judges : []).map(U.norm).slice(0, 3);
        ['title', 'setName', 'dateText', 'place', 'boardName'].forEach((f) => { x[f] = U.norm(x[f]); });
        if (!Array.isArray(x.log)) x.log = [];
        x.teams = x.teams.slice(0, 6).map((t, i) => Object.assign({ id: `t${i + 1}`, name: `ทีม ${i + 1}`, color: Engine.TEAM_COLORS[i], icon: Engine.TEAM_ICONS[i], pos: 0, skip: 0, finishAt: 0, right: 0, wrong: 0 }, t));
        if (x.turn >= x.teams.length) x.turn = 0;
        return x;
    }

    function normalize(raw) {
        const d = Object.assign(newData(), raw || {});
        d.app = APP_ID;
        d.school = Object.assign(newData().school, d.school || {});
        Object.keys(d.school).forEach((k) => { d.school[k] = U.norm(d.school[k]); });
        const st = Object.assign(newSettings(), d.settings || {});
        st.opts = Engine.normOpts(st.opts);
        st.teamPreset = Engine.TEAM_PRESETS[st.teamPreset] ? st.teamPreset : 'animal';
        st.teamCount = Math.max(2, Math.min(6, Number(st.teamCount) || 4));
        st.volume = Math.max(0, Math.min(1, Number(st.volume)));
        if (!Number.isFinite(st.volume)) st.volume = 0.8;
        st.sound = st.sound !== false;
        d.settings = st;
        const tpl = Object.assign({}, TPL_DEFAULT, d.tpl || {});
        Object.keys(TPL_DEFAULT).forEach((k) => { tpl[k] = str(tpl[k]); });
        d.tpl = tpl;
        const setIds = new Set();
        const qIds = new Set();
        d.sets = (Array.isArray(d.sets) ? d.sets : []).filter((s) => s && typeof s === 'object').map((s) => normSet(s, setIds, qIds));
        const bIds = new Set();
        d.boards = (Array.isArray(d.boards) ? d.boards : []).filter((b) => b && typeof b === 'object').map((b) => normBoardRec(b, bIds));
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

    /* opts.quiet = ไม่นับเป็นการเปลี่ยนแปลงที่ต้องสำรอง (เช่น ทอยเต๋าระหว่างเล่น) */
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
    function backupFileName() { return `${U.safeFileName(['เกมบันไดงู', data.school.name || 'ข้อมูล', U.stamp()].join('_'))}.json`; }
    async function exportFile() {
        const savedName = await saveText(JSON.stringify(Object.assign({}, data, { exportedAt: new Date().toISOString() })), backupFileName(), 'ไฟล์ข้อมูลเกมบันไดงูตอบคำถาม (.json)');
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
        if (obj.app === SET_FILE_ID) return { ok: false, error: 'ไฟล์นี้เป็น "ไฟล์ชุดคำถาม" — กรุณานำเข้าที่หน้า "ชุดคำถาม" → ปุ่ม "นำเข้าชุด (.json)"' };
        if (obj.app !== APP_ID) return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์ข้อมูลของเกมบันไดงูตอบคำถาม' };
        if ((obj.schemaVersion || 1) > SCHEMA_VERSION) return { ok: false, error: 'ไฟล์นี้สร้างจากโปรแกรมรุ่นใหม่กว่า กรุณาใช้โปรแกรมรุ่นล่าสุด' };
        const d = normalize(U.clone(obj));
        return { ok: true, data: d, summary: { school: d.school.name, sets: d.sets.length, questions: d.sets.reduce((a, s) => a + s.questions.length, 0), boards: d.boards.length, games: d.games.length, savedAt: obj.exportedAt || obj.updatedAt } };
    }

    /* ชุดคำถามแยกไฟล์ (แบ่งปันให้ครูคนอื่น) */
    function exportSetText(setIds) {
        const sets = data.sets.filter((s) => setIds.includes(s.id));
        return JSON.stringify({ app: SET_FILE_ID, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), sets });
    }
    function parseSetFile(text) {
        let obj;
        try { obj = JSON.parse(String(text).replace(/^﻿/, '')); } catch (e) { return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์ JSON ที่ถูกต้อง' }; }
        if (!obj || (obj.app !== SET_FILE_ID && obj.app !== APP_ID) || !Array.isArray(obj.sets)) return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์ชุดคำถามของเกมบันไดงู' };
        // สร้างรหัสใหม่ทั้งหมด กันชนกับชุดเดิม
        const setIds = new Set(data.sets.map((s) => s.id));
        const qIds = new Set();
        data.sets.forEach((s) => s.questions.forEach((q) => qIds.add(q.id)));
        const sets = obj.sets.filter((s) => s && typeof s === 'object').map((s) => {
            const c = U.clone(s);
            delete c.id;
            (c.questions || []).forEach((q) => { delete q.id; });
            return normSet(c, setIds, qIds);
        });
        return { ok: true, sets };
    }
    function addSets(sets) {
        sets.forEach((s) => data.sets.push(s));
        commit('sets');
    }
    function normQuestions(list) {
        const ids = new Set();
        data.sets.forEach((s) => s.questions.forEach((q) => ids.add(q.id)));
        return list.map((q) => { const c = Object.assign({}, q); delete c.id; return normQuestion(c, ids); });
    }

    /* ย่อรูปให้ด้านยาวไม่เกิน 480 px แล้วเก็บเป็น data URL */
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
    function isEmpty() { return !data.sets.length && !data.games.length && !data.boards.length; }
    function resetAll() { replaceAll(newData(), 'reset'); }

    const set = (id) => data.sets.find((s) => s.id === id) || null;
    const board = (id) => data.boards.find((b) => b.id === id) || null;
    const game = (id) => data.games.find((g) => g.id === id) || (data.live && data.live.id === id ? data.live : null);
    const subjectOf = (name) => SUBJECTS.find((s) => s.name === name) || null;
    const questionCount = () => data.sets.reduce((a, s) => a + s.questions.length, 0);

    /* เกมที่กำลังเล่น: เก็บใน data.live (ปิดเบราว์เซอร์แล้วเล่นต่อได้) จบแล้วย้ายไป games */
    function saveLive(g, opts) {
        data.live = g;
        commit('live', Object.assign({ quiet: true }, opts || {}));
    }
    function finishLive() {
        const g = data.live;
        if (!g) return null;
        g.finishedAt = g.finishedAt || new Date().toISOString();
        data.games = data.games.filter((x) => x.id !== g.id);
        if (g.log.length) data.games.unshift(g);
        data.live = null;
        commit('games', { immediate: true });
        return g;
    }
    function dropLive() { data.live = null; commit('games', { immediate: true }); }

    /* เติมค่าในแม่แบบ {ชื่อ} */
    function fill(tplText, vars) { return String(tplText || '').replace(/\{([^}]+)\}/g, (m, k) => (vars[k] == null ? m : String(vars[k]))); }

    window.Store = {
        KEY, SCHEMA_VERSION, SUBJECTS, LEVELS, TPL_DEFAULT,
        load, commit, replaceAll, resetAll, newData, newSet, newQuestion, newBoard, normalize, normQuestions,
        exportFile, saveText, parseBackup, backupFileName, needsBackup, isEmpty, hasPrevious, restorePrevious,
        exportSetText, parseSetFile, addSets, thumbFromFile, fill,
        set, board, game, subjectOf, questionCount, saveLive, finishLive, dropLive,
        get data() { return data; },
        get meta() { return meta; },
        get storageOk() { return storageOk; },
        setMeta(patch) { Object.assign(meta, patch); saveMeta(); },
        on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        flush: persist,
    };
})();
