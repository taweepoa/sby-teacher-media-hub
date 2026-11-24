/* =====================================================================
   ที่เก็บข้อมูล: localStorage + สำรอง/เปิดไฟล์ .json (แบบเดียวกับระบบจัดตารางสอน)
   ===================================================================== */
(function () {
    'use strict';

    const KEY = 'vs_class_points.data.v1';
    const KEY_PREV = 'vs_class_points.data.v1.previous';
    const KEY_META = 'vs_class_points.meta.v1';
    const SCHEMA_VERSION = 1;
    const APP_ID = 'vs-class-points';
    const PREFIXES = ['ด.ช.', 'ด.ญ.', 'นาย', 'นางสาว', 'นาง'];

    function newData() {
        const now = new Date().toISOString();
        const y = new Date().getFullYear() + 543;
        return {
            app: APP_ID, schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now,
            school: { name: '', agency: '', academicYear: String(y), semester: '1', director: '', teacherName: '', teacherPosition: '' },
            classes: [], students: [],
            skills: Demo.skillsFrom('basic'), rewards: Demo.rewardsFrom(),
            events: [], redeems: [],
            settings: { classId: '', sound: true },
        };
    }

    const str = (v) => (v == null ? '' : String(v));

    function normItem(s, sids) {
        const x = {
            id: s.id && !sids.has(s.id) ? String(s.id) : U.uid('s'),
            classId: s.classId,
            no: s.no === '' || s.no == null ? '' : U.toInt(s.no, ''),
            code: str(s.code).trim(),
            prefix: U.norm(s.prefix),
            firstName: U.norm(s.firstName),
            lastName: U.norm(s.lastName),
            nick: U.norm(s.nick),
            avatar: U.toInt(s.avatar, 0),
        };
        sids.add(x.id);
        return x;
    }

    function normalize(raw) {
        const base = newData();
        const d = Object.assign(base, raw || {});
        d.app = APP_ID;
        d.school = Object.assign(newData().school, d.school || {});
        Object.keys(d.school).forEach((k) => { d.school[k] = str(d.school[k]); });
        d.settings = Object.assign({ classId: '', sound: true }, d.settings || {});
        ['classes', 'students', 'skills', 'rewards', 'events', 'redeems'].forEach((k) => { if (!Array.isArray(d[k])) d[k] = []; });

        d.classes = d.classes.filter((c) => c && c.id).map((c) => ({ id: String(c.id), name: U.norm(c.name) || 'ห้องไม่มีชื่อ', groups: Array.isArray(c.groups) ? c.groups.filter((g) => g && g.id).map((g) => ({ id: String(g.id), name: U.norm(g.name), members: Array.isArray(g.members) ? g.members.map(String) : [] })) : [] }));
        const classIds = new Set(d.classes.map((c) => c.id));
        const sids = new Set();
        d.students = d.students.filter((s) => s && classIds.has(s.classId)).map((s) => normItem(s, sids));
        // กลุ่ม: สมาชิกต้องเป็นนักเรียนห้องนั้น และอยู่ได้กลุ่มเดียว
        d.classes.forEach((c) => {
            const seen = new Set();
            c.groups.forEach((g) => { g.members = g.members.filter((id) => sids.has(id) && d.students.find((s) => s.id === id).classId === c.id && !seen.has(id) && seen.add(id)); });
        });
        d.skills = d.skills.filter((k) => k && k.id).map((k) => ({ id: String(k.id), name: U.norm(k.name) || 'ทักษะ', icon: /^fa-[a-z0-9-]+$/.test(k.icon) ? k.icon : 'fa-star', points: Math.max(1, Math.min(10, U.toInt(k.points, 1))), kind: k.kind === 'neg' ? 'neg' : 'pos' }));
        d.rewards = d.rewards.filter((w) => w && w.id).map((w) => ({ id: String(w.id), name: U.norm(w.name) || 'รางวัล', icon: /^fa-[a-z0-9-]+$/.test(w.icon) ? w.icon : 'fa-gift', cost: Math.max(1, U.toInt(w.cost, 1)) }));
        d.events = d.events.filter((e) => e && sids.has(e.sid) && !Number.isNaN(new Date(e.t).getTime())).map((e) => ({ id: str(e.id) || U.uid('e'), t: e.t, sid: e.sid, skillId: str(e.skillId), pts: U.toInt(e.pts, 0), note: U.norm(e.note) }));
        d.redeems = d.redeems.filter((x) => x && sids.has(x.sid)).map((x) => ({ id: str(x.id) || U.uid('x'), t: x.t, sid: x.sid, rewardId: str(x.rewardId), cost: Math.max(0, U.toInt(x.cost, 0)), name: U.norm(x.name) }));
        if (!classIds.has(d.settings.classId)) d.settings.classId = d.classes[0] ? d.classes[0].id : '';
        d.settings.sound = d.settings.sound !== false;
        d.schemaVersion = SCHEMA_VERSION;
        return d;
    }

    const listeners = new Set();
    let data = null;
    let meta = { lastBackupAt: null, lastBackupName: '', lastChangeAt: null, lastSavedAt: null, dismissedWelcome: false };
    let storageOk = true;

    function loadMeta() { try { meta = Object.assign(meta, JSON.parse(localStorage.getItem(KEY_META) || '{}')); } catch (e) { /* ค่าเริ่มต้น */ } }
    function saveMeta() { try { localStorage.setItem(KEY_META, JSON.stringify(meta)); } catch (e) { /* ไม่เป็นไร */ } }
    function load() {
        loadMeta();
        try { const raw = localStorage.getItem(KEY); data = raw ? normalize(JSON.parse(raw)) : newData(); } catch (e) { console.warn('โหลดข้อมูลไม่สำเร็จ', e); storageOk = false; data = newData(); }
        return data;
    }
    function persist() {
        try { localStorage.setItem(KEY, JSON.stringify(data)); meta.lastSavedAt = new Date().toISOString(); saveMeta(); storageOk = true; } catch (e) {
            storageOk = false;
            U.toast('บันทึกลงเบราว์เซอร์ไม่สำเร็จ — กรุณากด "บันทึกไฟล์ข้อมูล" เพื่อสำรองทันที', { type: 'bad', ms: 8000 });
        }
    }
    const persistSoon = U.debounce(persist, 250);
    function emit(reason) { listeners.forEach((fn) => { try { fn(reason); } catch (e) { console.error(e); } }); }
    function commit(reason, opts) {
        if (opts && opts.normalize) data = normalize(data);
        data.updatedAt = new Date().toISOString();
        meta.lastChangeAt = data.updatedAt;
        if (opts && opts.immediate) persist(); else persistSoon();
        emit(reason || 'change');
    }
    function replaceAll(raw, reason) {
        try { localStorage.setItem(KEY_PREV, JSON.stringify(data)); } catch (e) { /* อาจเต็ม */ }
        data = normalize(raw);
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

    function backupFileName() {
        const sc = data.school;
        return `${U.safeFileName(['แต้มพฤติกรรม', sc.name || 'โรงเรียน', `${sc.semester || ''}-${sc.academicYear || ''}`, U.stamp()].join('_'))}.json`;
    }
    async function exportFile() {
        const text = JSON.stringify(Object.assign({}, data, { exportedAt: new Date().toISOString() }), null, 1);
        const name = backupFileName();
        let savedName = name;
        if (window.showSaveFilePicker && !VSDemo.active) {
            try {
                const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'ไฟล์ข้อมูลแต้มพฤติกรรม (.json)', accept: { 'application/json': ['.json'] } }] });
                const w = await h.createWritable(); await w.write(new Blob([text], { type: 'application/json' })); await w.close();
                savedName = h.name || name;
            } catch (e) {
                if (e && e.name === 'AbortError') return null;
                U.downloadBlob(new Blob([text], { type: 'application/json' }), name);
            }
        } else U.downloadBlob(new Blob([text], { type: 'application/json' }), name);
        meta.lastBackupAt = new Date().toISOString(); meta.lastBackupName = savedName; saveMeta(); emit('backup');
        return savedName;
    }
    function parseBackup(text) {
        let obj;
        try { obj = JSON.parse(String(text).replace(/^﻿/, '')); } catch (e) { return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์ JSON ที่ถูกต้อง' }; }
        if (!obj || typeof obj !== 'object') return { ok: false, error: 'รูปแบบไฟล์ไม่ถูกต้อง' };
        if (obj.app !== APP_ID) return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์ข้อมูลของระบบกระดานแต้มพฤติกรรม' };
        if ((obj.schemaVersion || 1) > SCHEMA_VERSION) return { ok: false, error: 'ไฟล์นี้สร้างจากระบบรุ่นใหม่กว่า กรุณาใช้โปรแกรมรุ่นล่าสุด' };
        const d = normalize(U.clone(obj));
        return { ok: true, data: d, summary: { school: d.school.name, term: `${d.school.semester}/${d.school.academicYear}`, classes: d.classes.length, students: d.students.length, events: d.events.length, savedAt: obj.exportedAt || obj.updatedAt } };
    }
    function needsBackup() {
        if (!meta.lastChangeAt) return false;
        if (!meta.lastBackupAt) return true;
        return new Date(meta.lastChangeAt) > new Date(meta.lastBackupAt);
    }
    const isEmpty = () => !data.classes.length && !data.students.length;

    /* ---------- ตัวช่วยอ่านข้อมูล ---------- */
    const cls = (id) => data.classes.find((c) => c.id === id) || null;
    const student = (id) => data.students.find((s) => s.id === id) || null;
    const skill = (id) => data.skills.find((k) => k.id === id) || null;
    const reward = (id) => data.rewards.find((w) => w.id === id) || null;
    const current = () => cls(data.settings.classId) || data.classes[0] || null;
    const termText = () => `ภาคเรียนที่ ${data.school.semester || '-'}/${data.school.academicYear || '-'}`;

    /* ให้แต้ม: คืนรายการ event ที่เพิ่ม */
    function award(sids, skillId) {
        const k = skill(skillId);
        if (!k) return [];
        const t = new Date().toISOString();
        const list = sids.map((sid) => ({ id: U.uid('e'), t, sid, skillId: k.id, pts: k.kind === 'neg' ? -k.points : k.points, note: '' }));
        data.events.push(...list);
        commit('award');
        return list;
    }
    function undo(ids) {
        const set = new Set(ids);
        data.events = data.events.filter((e) => !set.has(e.id));
        commit('award');
    }

    window.addEventListener('storage', (e) => {
        if (e.key === KEY_META) { loadMeta(); emit('backup'); return; }
        if (e.key !== KEY || e.newValue == null) return;
        try { data = normalize(JSON.parse(e.newValue)); loadMeta(); emit('replace'); U.toast('ข้อมูลถูกแก้ไขจากอีกหน้าต่างหนึ่ง — แสดงข้อมูลล่าสุดแล้ว', { type: 'warn', ms: 5000 }); } catch (err) { /* ข้าม */ }
    });

    window.Store = {
        KEY, PREFIXES, SCHEMA_VERSION,
        load, commit, replaceAll, newData, normalize, exportFile, parseBackup, backupFileName, needsBackup, isEmpty, hasPrevious, restorePrevious,
        cls, student, skill, reward, current, termText, award, undo,
        resetAll() { replaceAll(newData(), 'reset'); },
        get data() { return data; }, get meta() { return meta; }, get storageOk() { return storageOk; },
        setMeta(p) { Object.assign(meta, p); saveMeta(); },
        on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        flush: persist,
    };
})();
