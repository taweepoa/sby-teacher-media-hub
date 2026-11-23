/* =====================================================================
   ที่เก็บข้อมูล: localStorage + สำรอง/เปิดไฟล์ .json (แบบเดียวกับระบบจัดตารางสอน)
   ข้อมูลที่สำรอง = การตั้งค่า + ชุดหลายช่วงเวลา + ตารางคาบเรียน (โครงดูที่ newData())
   สถานะนาฬิกาที่กำลังเดินเก็บแยกใน Timer (ไม่ถือเป็นการแก้ไขข้อมูล)
   ===================================================================== */
(function () {
    'use strict';

    const KEY = 'vs_classroom_timer.data.v1';
    const KEY_PREV = 'vs_classroom_timer.data.v1.previous';
    const KEY_META = 'vs_classroom_timer.meta.v1';
    const SCHEMA_VERSION = 1;
    const APP_ID = 'vs-classroom-timer';

    /* พื้นหลังจอแสดงเวลา */
    const BGS = [
        { id: 'night', name: 'กลางคืน (แนะนำสำหรับโปรเจกเตอร์)' },
        { id: 'board', name: 'กระดานเขียว' },
        { id: 'mint', name: 'มิ้นต์ไล่สี' },
        { id: 'ocean', name: 'น้ำเงินเข้ม' },
        { id: 'berry', name: 'ม่วงชมพู' },
        { id: 'paper', name: 'ขาวสว่าง (ห้องมืด/จอทีวี)' },
    ];
    const PROGRESS = { bar: 'แถบด้านล่าง (ตัวเลขใหญ่ที่สุด)', ring: 'วงแหวนรอบตัวเลข', none: 'ไม่แสดง' };
    const WAKE = { running: 'เฉพาะตอนจับเวลา/เต็มจอ/ฟังเสียง', always: 'ตลอดเวลาที่เปิดโปรแกรม (แท็บเล็ตวางหน้าห้อง)', off: 'ไม่ใช้' };
    const KINDS = { class: 'คาบเรียน', break: 'พัก', other: 'กิจกรรม/โฮมรูม' };
    const DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const SEG_COLORS = ['#14b8a6', '#0A84FF', '#5E5CE6', '#BF5AF2', '#FF375F', '#FF9F0A', '#30D158', '#64748b'];
    const MAX_SEGMENTS = 30;

    function defaultSettings() {
        return {
            display: { bg: 'night', progress: 'bar', scale: 100, showLabel: true, showEndTime: true, clockSeconds: true, flash: true, showNoise: true },
            alert: { warnSec: 60, dangerSec: 10 },
            sound: { on: true, volume: 80, end: 'bell', endRepeat: 2, warn: true, warnSound: 'double', segment: 'chime', ticks: 5 },
            behavior: { overtime: true, wake: 'running', confirmReset: true },
            quick: [1, 3, 5, 10, 15],
            noise: { sens: 50, yellow: 45, red: 70, alarm: true, alarmSound: 'shh', cooldown: 8 },
        };
    }

    function newData() {
        const now = new Date().toISOString();
        return {
            app: APP_ID,
            schemaVersion: SCHEMA_VERSION,
            createdAt: now,
            updatedAt: now,
            settings: defaultSettings(),
            sequences: [],
            schedule: { periods: [], subjects: {}, days: [1, 2, 3, 4, 5], bell: true, bellWarnMin: 5, bellSound: 'bell' },
        };
    }

    function newSequence() {
        return { id: U.uid('q'), name: '', auto: true, segments: [{ id: U.uid('g'), label: '', sec: 300, color: SEG_COLORS[0] }] };
    }

    const str = (v) => (v == null ? '' : String(v));
    const num = (v, lo, hi, def) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def; };
    const bool = (v, def) => (typeof v === 'boolean' ? v : def);
    const pick = (v, list, def) => (list.includes(v) ? v : def);
    const soundIds = () => (window.Sound ? window.Sound.LIST.map((x) => x.id) : []);
    const isTime = (t) => U.toMin(t) != null && U.toMin(t) < 24 * 60;

    function normSettings(raw) {
        const d = defaultSettings();
        const r = raw && typeof raw === 'object' ? raw : {};
        const ds = r.display || {}; const al = r.alert || {}; const so = r.sound || {}; const be = r.behavior || {}; const no = r.noise || {};
        const sIds = soundIds();
        const sd = (v, def) => (v === '' || sIds.includes(v) ? v : def);
        return {
            display: {
                bg: pick(ds.bg, BGS.map((b) => b.id), d.display.bg),
                progress: pick(ds.progress, Object.keys(PROGRESS), d.display.progress),
                scale: Math.round(num(ds.scale, 50, 100, d.display.scale)),
                showLabel: bool(ds.showLabel, true),
                showEndTime: bool(ds.showEndTime, true),
                clockSeconds: bool(ds.clockSeconds, true),
                flash: bool(ds.flash, true),
                showNoise: bool(ds.showNoise, true),
            },
            alert: {
                warnSec: Math.round(num(al.warnSec, 0, 600, d.alert.warnSec)),
                dangerSec: Math.round(num(al.dangerSec, 0, 120, d.alert.dangerSec)),
            },
            sound: {
                on: bool(so.on, true),
                volume: Math.round(num(so.volume, 0, 100, d.sound.volume)),
                end: sd(so.end, d.sound.end),
                endRepeat: Math.round(num(so.endRepeat, 1, 5, d.sound.endRepeat)),
                warn: bool(so.warn, true),
                warnSound: sd(so.warnSound, d.sound.warnSound),
                segment: sd(so.segment, d.sound.segment),
                ticks: Math.round(num(so.ticks, 0, 10, d.sound.ticks)),
            },
            behavior: {
                overtime: bool(be.overtime, true),
                wake: pick(be.wake, Object.keys(WAKE), d.behavior.wake),
                confirmReset: bool(be.confirmReset, true),
            },
            quick: (Array.isArray(r.quick) && r.quick.length === 5 ? r.quick : d.quick).map((v, i) => Math.round(num(v, 0.5, 180, d.quick[i]) * 2) / 2),
            noise: {
                sens: Math.round(num(no.sens, 0, 100, d.noise.sens)),
                yellow: Math.round(num(no.yellow, 5, 95, d.noise.yellow)),
                red: Math.round(num(no.red, 10, 100, d.noise.red)),
                alarm: bool(no.alarm, true),
                alarmSound: sd(no.alarmSound, d.noise.alarmSound),
                cooldown: Math.round(num(no.cooldown, 3, 60, d.noise.cooldown)),
            },
        };
    }

    function normSequence(q, ids) {
        const x = {
            id: q.id && !ids.has(q.id) ? String(q.id) : U.uid('q'),
            name: U.norm(q.name).slice(0, 80),
            auto: q.auto !== false,
            segments: (Array.isArray(q.segments) ? q.segments : []).filter((g) => g && typeof g === 'object').slice(0, MAX_SEGMENTS).map((g) => ({
                id: g.id ? String(g.id) : U.uid('g'),
                label: U.norm(g.label).slice(0, 60),
                sec: Math.round(num(g.sec, 1, 99 * 3600, 60)),
                color: /^#[0-9a-f]{6}$/i.test(str(g.color)) ? str(g.color) : SEG_COLORS[0],
            })),
        };
        if (!x.segments.length) x.segments.push({ id: U.uid('g'), label: '', sec: 300, color: SEG_COLORS[0] });
        ids.add(x.id);
        return x;
    }

    function normSchedule(raw) {
        const s = raw && typeof raw === 'object' ? raw : {};
        const ids = new Set();
        const periods = (Array.isArray(s.periods) ? s.periods : []).filter((p) => p && typeof p === 'object').map((p) => {
            const x = {
                id: p.id && !ids.has(p.id) ? String(p.id) : U.uid('p'),
                name: U.norm(p.name).slice(0, 40),
                start: isTime(p.start) ? U.fromMin(U.toMin(p.start)) : '',
                end: isTime(p.end) ? U.fromMin(U.toMin(p.end)) : '',
                kind: pick(p.kind, Object.keys(KINDS), 'class'),
            };
            ids.add(x.id);
            return x;
        }).filter((p) => p.start && p.end && U.toMin(p.end) > U.toMin(p.start));
        periods.sort((a, b) => U.toMin(a.start) - U.toMin(b.start));
        const subjects = {};
        for (let d = 0; d < 7; d += 1) {
            const src = (s.subjects && s.subjects[d]) || {};
            subjects[d] = {};
            periods.forEach((p) => { const v = U.norm(src[p.id]).slice(0, 80); if (v) subjects[d][p.id] = v; });
        }
        const days = [...new Set((Array.isArray(s.days) ? s.days : [1, 2, 3, 4, 5]).map((v) => U.toInt(v, -1)).filter((v) => v >= 0 && v <= 6))].sort();
        return {
            periods,
            subjects,
            days,
            bell: bool(s.bell, true),
            bellWarnMin: Math.round(num(s.bellWarnMin, 0, 30, 5)),
            bellSound: soundIds().includes(s.bellSound) ? s.bellSound : 'bell',
        };
    }

    function normalize(raw) {
        const d = Object.assign(newData(), raw || {});
        d.app = APP_ID;
        d.settings = normSettings(d.settings);
        const qids = new Set();
        d.sequences = (Array.isArray(d.sequences) ? d.sequences : []).filter((q) => q && typeof q === 'object').map((q) => normSequence(q, qids));
        d.schedule = normSchedule(d.schedule);
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
        return `${U.safeFileName(['นาฬิกาจับเวลา', 'ตั้งค่าและชุดเวลา', U.stamp()].join('_'))}.json`;
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
                    types: [{ description: 'ไฟล์ข้อมูลนาฬิกาจับเวลา (.json)', accept: { 'application/json': ['.json'] } }],
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
        if (obj.app !== APP_ID && !(obj.settings && Array.isArray(obj.sequences))) {
            return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์ข้อมูลของระบบนาฬิกาจับเวลาหน้าชั้นเรียน' };
        }
        if ((obj.schemaVersion || 1) > SCHEMA_VERSION) {
            return { ok: false, error: 'ไฟล์นี้สร้างจากระบบรุ่นใหม่กว่า กรุณาใช้โปรแกรมรุ่นล่าสุด' };
        }
        const d = normalize(U.clone(obj));
        return {
            ok: true,
            data: d,
            summary: {
                sequences: d.sequences.length,
                periods: d.schedule.periods.length,
                subjects: Object.values(d.schedule.subjects).reduce((a, x) => a + Object.keys(x).length, 0),
                savedAt: obj.exportedAt || obj.updatedAt,
            },
        };
    }

    function needsBackup() {
        if (!meta.lastChangeAt) return false;
        if (!meta.lastBackupAt) return true;
        return new Date(meta.lastChangeAt) > new Date(meta.lastBackupAt);
    }

    function isEmpty() { return !data.sequences.length && !data.schedule.periods.length; }

    function resetAll() { replaceAll(newData(), 'reset'); }

    function sequence(id) { return data.sequences.find((q) => q.id === id) || null; }
    const seqTotal = (q) => q.segments.reduce((a, g) => a + g.sec, 0);

    /* เปิดโปรแกรมไว้หลายหน้าต่าง: ใช้ข้อมูลล่าสุดเสมอ */
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
        KEY, SCHEMA_VERSION, BGS, PROGRESS, WAKE, KINDS, DAYS, DAYS_SHORT, SEG_COLORS, MAX_SEGMENTS,
        load, commit, replaceAll, resetAll, newData, newSequence, normalize, defaultSettings,
        exportFile, parseBackup, backupFileName, needsBackup, isEmpty, hasPrevious, restorePrevious,
        sequence, seqTotal,
        get data() { return data; },
        get settings() { return data.settings; },
        get meta() { return meta; },
        get storageOk() { return storageOk; },
        setMeta(patch) { Object.assign(meta, patch); saveMeta(); },
        on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        flush: persist,
    };
})();
