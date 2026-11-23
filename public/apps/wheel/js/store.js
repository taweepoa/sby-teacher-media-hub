/* =====================================================================
   ที่เก็บข้อมูล: localStorage + สำรอง/เปิดไฟล์ .json (แบบเดียวกับระบบจัดตารางสอน)
   โครงข้อมูลดูที่ newData()
   ===================================================================== */
(function () {
    'use strict';

    const KEY = 'vs_random_picker.data.v1';
    const KEY_PREV = 'vs_random_picker.data.v1.previous';
    const KEY_META = 'vs_random_picker.meta.v1';
    const SCHEMA_VERSION = 1;
    const APP_ID = 'vs-random-picker';
    const MAX_HISTORY = 3000;

    const PREFIXES = ['ด.ช.', 'ด.ญ.', 'นาย', 'นางสาว', 'นาง'];
    const MODES = {
        wheel: { label: 'วงล้อสุ่มชื่อ', icon: 'fa-dharmachakra', color: '#f43f5e' },
        group: { label: 'สุ่มจับกลุ่ม', icon: 'fa-people-group', color: '#0A84FF' },
        order: { label: 'ลำดับนำเสนอ', icon: 'fa-list-ol', color: '#BF5AF2' },
        number: { label: 'สุ่มตัวเลข', icon: 'fa-dice', color: '#FF9F0A' },
        prize: { label: 'จับฉลากของรางวัล', icon: 'fa-gift', color: '#30D158' },
        seat: { label: 'สุ่มที่นั่ง', icon: 'fa-chair', color: '#00C7BE' },
    };
    const LABELS = {
        'no-first': 'เลขที่ + ชื่อ',
        first: 'ชื่อ',
        nick: 'ชื่อเล่น',
        full: 'ชื่อ-สกุล',
        no: 'เลขที่อย่างเดียว',
    };
    const PALETTES = {
        coral: ['#f43f5e', '#fb923c', '#facc15', '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6'],
        candy: ['#ff6b8b', '#ffb347', '#ffe066', '#7ee081', '#6fd3f7', '#8fa6ff', '#c49bff', '#ff9ad5'],
        bold: ['#e11d48', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#c026d3'],
        sunset: ['#be123c', '#f43f5e', '#fb7185', '#f97316', '#fb923c', '#fbbf24', '#ec4899', '#a21caf'],
    };
    const PALETTE_NAMES = { coral: 'ปะการังสดใส', candy: 'พาสเทล', bold: 'สีเข้มชัด (โปรเจกเตอร์)', sunset: 'โทนอบอุ่น' };

    function newData() {
        const now = new Date().toISOString();
        const y = new Date().getFullYear() + 543;
        return {
            app: APP_ID,
            schemaVersion: SCHEMA_VERSION,
            createdAt: now,
            updatedAt: now,
            school: { name: '', agency: '', teacherName: '', teacherPosition: '', subject: '', academicYear: String(y), semester: '1' },
            lists: [],
            currentListId: '',
            wheel: { removed: {}, round: {} },
            prizes: [],
            prizeSession: null,
            numberSession: { min: 1, max: 35, count: 1, unique: true, drawn: [] },
            history: [],
            settings: {
                noRepeat: true,
                useWeight: false,
                duration: 7,
                sound: true,
                volume: 0.8,
                confetti: true,
                label: 'no-first',
                palette: 'coral',
            },
        };
    }

    function newList(kind) {
        return { id: U.uid('l'), kind: kind === 'custom' ? 'custom' : 'class', name: '', note: '', items: [] };
    }
    function newItem(kind) {
        return { id: U.uid('s'), no: '', code: '', prefix: '', firstName: '', lastName: '', nick: '', gender: '', weight: 1, active: true, kind };
    }

    const str = (v) => (v == null ? '' : String(v));
    const clamp = (v, lo, hi, def) => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def;
    };

    /* แปลงชื่อห้องเรียนให้เป็นรูปแบบเดียวกัน เช่น "ม 2/1" "ม.๒/๑" "ม2/1" → "ม.2/1" */
    function normClass(v) {
        let s = U.norm(String(v ?? '').replace(/[๐-๙]/g, (d) => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d))));
        s = s.replace(/\s*\/\s*/g, '/');
        s = s.replace(/^(ม|ป|อ|ปวช|ปวส)\s*\.?\s*(\d)/, '$1.$2');
        return s;
    }

    function normItem(s, ids) {
        const x = {
            id: s.id && !ids.has(s.id) ? String(s.id) : U.uid('s'),
            no: s.no === '' || s.no == null ? '' : U.toInt(s.no, ''),
            code: str(s.code).trim(),
            prefix: U.norm(s.prefix),
            firstName: U.norm(s.firstName),
            lastName: U.norm(s.lastName),
            nick: U.norm(s.nick),
            gender: s.gender === 'm' || s.gender === 'f' ? s.gender : '',
            weight: Math.round(clamp(s.weight, 1, 10, 1)),
            active: s.active !== false,
        };
        if (!x.gender) x.gender = Engine.genderOf(x.prefix);
        ids.add(x.id);
        return x;
    }

    function normalize(raw) {
        const base = newData();
        const d = Object.assign(newData(), raw || {});
        d.app = APP_ID;
        d.school = Object.assign(base.school, d.school || {});
        Object.keys(d.school).forEach((k) => { d.school[k] = U.norm(d.school[k]); });
        d.settings = Object.assign(base.settings, d.settings || {});
        const st = d.settings;
        st.noRepeat = st.noRepeat !== false;
        st.useWeight = !!st.useWeight;
        st.duration = Math.round(clamp(st.duration, 3, 15, 7));
        st.sound = st.sound !== false;
        st.volume = clamp(st.volume, 0, 1, 0.8);
        st.confetti = st.confetti !== false;
        if (!LABELS[st.label]) st.label = 'no-first';
        if (!PALETTES[st.palette]) st.palette = 'coral';

        if (!Array.isArray(d.lists)) d.lists = [];
        const listIds = new Set();
        const itemIds = new Set();
        d.lists = d.lists.filter((l) => l && typeof l === 'object').map((l) => {
            const x = {
                id: l.id && !listIds.has(l.id) ? String(l.id) : U.uid('l'),
                kind: l.kind === 'custom' ? 'custom' : 'class',
                name: l.kind === 'custom' ? U.norm(l.name) : normClass(l.name),
                note: U.norm(l.note),
                items: (Array.isArray(l.items) ? l.items : []).filter((s) => s && typeof s === 'object').map((s) => normItem(s, itemIds)),
            };
            if (!x.name) x.name = x.kind === 'custom' ? 'รายการไม่มีชื่อ' : 'ห้องไม่มีชื่อ';
            listIds.add(x.id);
            return x;
        });
        if (!listIds.has(d.currentListId)) d.currentListId = d.lists[0] ? d.lists[0].id : '';

        // สถานะวงล้อ: คนที่ถูกนำออกแล้วในรอบนี้ (ต่อรายการ)
        const w = d.wheel && typeof d.wheel === 'object' ? d.wheel : {};
        const removed = {};
        const round = {};
        d.lists.forEach((l) => {
            const valid = new Set(l.items.map((s) => s.id));
            const arr = w.removed && Array.isArray(w.removed[l.id]) ? w.removed[l.id] : [];
            removed[l.id] = [...new Set(arr)].filter((id) => valid.has(id));
            round[l.id] = Math.max(1, U.toInt(w.round && w.round[l.id], 1));
        });
        d.wheel = { removed, round };

        d.prizes = (Array.isArray(d.prizes) ? d.prizes : []).filter((p) => p && typeof p === 'object').map((p) => ({
            id: p.id ? String(p.id) : U.uid('p'),
            name: U.norm(p.name) || 'ของรางวัล',
            qty: Math.round(clamp(p.qty, 1, 999, 1)),
        }));
        const ps = d.prizeSession;
        d.prizeSession = ps && typeof ps === 'object' && listIds.has(ps.listId) ? {
            id: ps.id ? String(ps.id) : U.uid('h'),
            listId: ps.listId,
            startedAt: ps.startedAt || new Date().toISOString(),
            prizes: Array.isArray(ps.prizes) ? ps.prizes.map((p) => ({ id: String(p.id || ''), name: U.norm(p.name), qty: Math.round(clamp(p.qty, 1, 999, 1)) })) : [],
            draws: Array.isArray(ps.draws) ? ps.draws.filter((x) => x && x.person) : [],
            skipped: Array.isArray(ps.skipped) ? ps.skipped.map(String) : [],
        } : null;

        const ns = Object.assign(base.numberSession, d.numberSession || {});
        d.numberSession = {
            min: Math.round(clamp(ns.min, -1e9, 1e9, 1)),
            max: Math.round(clamp(ns.max, -1e9, 1e9, 35)),
            count: Math.round(clamp(ns.count, 1, 500, 1)),
            unique: ns.unique !== false,
            drawn: (Array.isArray(ns.drawn) ? ns.drawn : []).map(Number).filter(Number.isFinite).slice(-5000),
        };

        d.history = (Array.isArray(d.history) ? d.history : [])
            .filter((h) => h && typeof h === 'object' && MODES[h.mode] && h.data && typeof h.data === 'object')
            .map((h) => ({
                id: h.id ? String(h.id) : U.uid('h'),
                at: h.at || new Date().toISOString(),
                mode: h.mode,
                listId: str(h.listId),
                listName: U.norm(h.listName),
                title: U.norm(h.title),
                data: h.data,
            }))
            .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
            .slice(0, MAX_HISTORY);
        d.schemaVersion = SCHEMA_VERSION;
        return d;
    }

    /* ---------- สถานะ ---------- */
    const listeners = new Set();
    let data = null;
    let meta = { lastBackupAt: null, lastBackupName: '', lastChangeAt: null, lastSavedAt: null, dismissedWelcome: false };
    let storageOk = true;

    function loadMeta() {
        try { meta = Object.assign(meta, JSON.parse(localStorage.getItem(KEY_META) || '{}')); } catch (e) { /* ใช้ค่าเริ่มต้น */ }
    }
    function saveMeta() {
        try { localStorage.setItem(KEY_META, JSON.stringify(meta)); } catch (e) { /* ไม่เป็นไร */ }
    }

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

    /* เรียกหลังแก้ไขข้อมูลทุกครั้ง */
    function commit(reason, opts) {
        if (opts && opts.normalize) data = normalize(data);
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

    function hasPrevious() {
        try { return !!localStorage.getItem(KEY_PREV); } catch (e) { return false; }
    }
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
        const parts = ['วงล้อสุ่มรายชื่อ', sc.name || 'ข้อมูล', U.stamp()];
        return `${U.safeFileName(parts.join('_'))}.json`;
    }

    async function exportFile() {
        const payload = Object.assign({}, data, { exportedAt: new Date().toISOString() });
        const text = JSON.stringify(payload, null, 1);
        const name = backupFileName();
        let savedName = name;
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: name,
                    types: [{ description: 'ไฟล์ข้อมูลวงล้อสุ่มรายชื่อ (.json)', accept: { 'application/json': ['.json'] } }],
                });
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

    /* ตรวจไฟล์ก่อนเปิด: คืน {ok, data, error, summary} */
    function parseBackup(text) {
        let obj;
        try { obj = JSON.parse(String(text).replace(/^﻿/, '')); } catch (e) {
            return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์ JSON ที่ถูกต้อง' };
        }
        if (!obj || typeof obj !== 'object') return { ok: false, error: 'รูปแบบไฟล์ไม่ถูกต้อง' };
        if (obj.app !== APP_ID && !(Array.isArray(obj.lists) && obj.settings)) {
            return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์ข้อมูลของระบบวงล้อสุ่มรายชื่อนักเรียน' };
        }
        if ((obj.schemaVersion || 1) > SCHEMA_VERSION) {
            return { ok: false, error: 'ไฟล์นี้สร้างจากระบบรุ่นใหม่กว่า กรุณาใช้โปรแกรมรุ่นล่าสุด' };
        }
        const d = normalize(U.clone(obj));
        return {
            ok: true,
            data: d,
            summary: {
                school: d.school.name,
                lists: d.lists.length,
                classes: d.lists.filter((l) => l.kind === 'class').length,
                people: d.lists.reduce((a, l) => a + l.items.length, 0),
                history: d.history.length,
                savedAt: obj.exportedAt || obj.updatedAt,
            },
        };
    }

    function needsBackup() {
        if (!meta.lastChangeAt) return false;
        if (!meta.lastBackupAt) return true;
        return new Date(meta.lastChangeAt) > new Date(meta.lastBackupAt);
    }

    function isEmpty() { return !data.lists.length && !data.history.length; }
    function resetAll() { replaceAll(newData(), 'reset'); }

    /* ---------- ตัวช่วยอ่านข้อมูล ---------- */
    function list(id) { return data.lists.find((l) => l.id === id) || null; }
    function currentList() {
        return list(data.currentListId) || data.lists[0] || null;
    }
    function setCurrent(id) {
        if (data.currentListId === id || !list(id)) return;
        data.currentListId = id;
        commit('current');
    }
    function item(listId, id) {
        const l = list(listId);
        return l ? l.items.find((s) => s.id === id) || null : null;
    }
    function listLabel(l) {
        if (!l) return '-';
        return l.kind === 'custom' ? l.name : `ห้อง ${l.name}`;
    }
    function present(l) { return l ? l.items.filter((s) => s.active) : []; }
    function sortedItems(l) {
        return l.items.slice().sort((a, b) => {
            const na = a.no === '' ? Infinity : a.no;
            const nb = b.no === '' ? Infinity : b.no;
            return na - nb || U.cmp(a.firstName, b.firstName);
        });
    }
    function genderCount(arr) {
        return { m: arr.filter((s) => s.gender === 'm').length, f: arr.filter((s) => s.gender === 'f').length, x: arr.filter((s) => s.gender !== 'm' && s.gender !== 'f').length };
    }
    function termText() {
        const s = data.school;
        return `ภาคเรียนที่ ${s.semester || '-'}/${s.academicYear || '-'}`;
    }

    /* ---------- วงล้อ: นำออก / คืน ---------- */
    function removedOf(listId) {
        if (!data.wheel.removed[listId]) data.wheel.removed[listId] = [];
        return data.wheel.removed[listId];
    }
    function roundOf(listId) { return data.wheel.round[listId] || 1; }
    /** คนที่อยู่บนวงล้อตอนนี้ = มาเรียน และยังไม่ถูกนำออก */
    function pool(l) {
        if (!l) return [];
        const rem = new Set(removedOf(l.id));
        return sortedItems(l).filter((s) => s.active && !rem.has(s.id));
    }
    function removeFromWheel(listId, id) {
        const r = removedOf(listId);
        if (!r.includes(id)) r.push(id);
        commit('wheel');
    }
    function returnToWheel(listId, id) {
        data.wheel.removed[listId] = removedOf(listId).filter((x) => x !== id);
        commit('wheel');
    }
    function newRound(listId) {
        data.wheel.removed[listId] = [];
        data.wheel.round[listId] = roundOf(listId) + 1;
        commit('wheel');
    }
    function returnAll(listId) {
        data.wheel.removed[listId] = [];
        commit('wheel');
    }

    /* ---------- ประวัติ ---------- */
    function addHistory(mode, l, title, payload) {
        const h = {
            id: U.uid('h'),
            at: new Date().toISOString(),
            mode,
            listId: l ? l.id : '',
            listName: l ? l.name : '',
            title: title || '',
            data: payload || {},
        };
        data.history.unshift(h);
        if (data.history.length > MAX_HISTORY) data.history.length = MAX_HISTORY;
        commit('history');
        return h;
    }
    function updateHistory(id, patch) {
        const h = data.history.find((x) => x.id === id);
        if (!h) return null;
        Object.assign(h, patch);
        commit('history');
        return h;
    }
    function historyItem(id) { return data.history.find((x) => x.id === id) || null; }
    function lastHistory(mode) { return data.history.find((x) => x.mode === mode) || null; }

    /* เปิดโปรแกรมไว้หลายหน้าต่าง: ใช้ข้อมูลล่าสุดเสมอ (กันข้อมูลทับกัน) */
    window.addEventListener('storage', (e) => {
        if (e.key === KEY_META) { loadMeta(); emit('backup'); return; }
        if (e.key !== KEY || e.newValue == null) return;
        try {
            data = normalize(JSON.parse(e.newValue));
            loadMeta();
            emit('replace');
            U.toast('ข้อมูลถูกแก้ไขจากอีกหน้าต่างหนึ่ง — แสดงข้อมูลล่าสุดแล้ว', { type: 'warn', ms: 5000 });
        } catch (err) { /* ข้ามถ้าอ่านไม่ได้ */ }
    });

    window.Store = {
        KEY, PREFIXES, MODES, LABELS, PALETTES, PALETTE_NAMES, SCHEMA_VERSION, MAX_HISTORY,
        load, commit, replaceAll, resetAll, newData, newList, newItem, normalize, normClass,
        exportFile, parseBackup, backupFileName, needsBackup, isEmpty, hasPrevious, restorePrevious,
        list, currentList, setCurrent, item, listLabel, present, sortedItems, genderCount, termText,
        removedOf, roundOf, pool, removeFromWheel, returnToWheel, newRound, returnAll,
        addHistory, updateHistory, historyItem, lastHistory,
        get data() { return data; },
        get meta() { return meta; },
        get storageOk() { return storageOk; },
        setMeta(patch) { Object.assign(meta, patch); saveMeta(); },
        on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        flush: persist,
    };
})();
