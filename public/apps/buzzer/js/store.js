/* =====================================================================
   ที่เก็บข้อมูล: localStorage + สำรอง/เปิดไฟล์ .json (แบบเดียวกับระบบจัดตารางสอน)
   ===================================================================== */
(function () {
    'use strict';
    const KEY = 'vs_buzzer.data.v1';
    const KEY_PREV = 'vs_buzzer.data.v1.previous';
    const KEY_META = 'vs_buzzer.meta.v1';
    const APP_ID = 'vs-buzzer';
    const listeners = [];

    function newData() {
        const now = new Date().toISOString();
        return {
            app: APP_ID, schemaVersion: 1, createdAt: now, updatedAt: now,
            school: { name: '', agency: '', director: '', directorPos: '', reporter: '', reporterPos: '', docPrefix: '', academicYear: String(new Date().getFullYear() + 543) },
            settings: { points: 10, penalty: 5, answerSec: 15, armDelay: 0, sound: true, volume: 0.7, allowPass: true, autoNext: false },
            teams: [], questions: [], matches: [],
            templates: Object.assign({}, Core.DEFAULT_TEMPLATES),
            prizes: Core.DEFAULT_PRIZES.map((p) => Object.assign({}, p)),
            nextRegNo: 1,
        };
    }
    const str = (v) => (v == null ? '' : String(v));

    function normalize(raw) {
        const base = newData();
        const d = Object.assign(base, raw || {});
        d.app = APP_ID;
        d.school = Object.assign(newData().school, d.school || {});
        d.settings = Object.assign(newData().settings, d.settings || {});
        d.templates = Object.assign({}, Core.DEFAULT_TEMPLATES, d.templates || {});
        ['teams', 'questions', 'matches', 'prizes'].forEach((k) => { if (!Array.isArray(d[k])) d[k] = []; });
        d.teams = d.teams.filter((t) => t && t.id).slice(0, 8).map((t, i) => ({ id: str(t.id), name: str(t.name) || `ทีม ${i + 1}`, color: str(t.color) || Core.TEAM_COLORS[i % 8], key: str(t.key), members: str(t.members) }));
        d.questions = d.questions.filter((q) => q && q.id).map((q) => ({ id: str(q.id), cat: str(q.cat), text: str(q.text), answer: str(q.answer), points: q.points === '' || q.points == null ? '' : Number(q.points) || '', img: str(q.img) }));
        d.matches = d.matches.filter((m) => m && m.id);
        d.prizes = d.prizes.map((p) => ({ label: str(p.label), amount: Number(p.amount) || 0, item: str(p.item) }));
        d.nextRegNo = Math.max(Number(d.nextRegNo) || 1, ...d.matches.map((m) => (Number(m.regNo) || 0) + 1), 1);
        return d;
    }

    const Store = {
        data: newData(),
        meta: {},
        load() {
            try { this.meta = JSON.parse(localStorage.getItem(KEY_META) || '{}') || {}; } catch (e) { this.meta = {}; }
            try { const raw = localStorage.getItem(KEY); this.data = raw ? normalize(JSON.parse(raw)) : newData(); } catch (e) { this.data = newData(); }
        },
        isEmpty() { const d = this.data; return !d.teams.length && !d.questions.length && !d.matches.length && !d.school.name; },
        setMeta(o) { Object.assign(this.meta, o); try { localStorage.setItem(KEY_META, JSON.stringify(this.meta)); } catch (e) { /* เต็ม */ } },
        on(fn) { listeners.push(fn); },
        _t: null,
        save() {
            this.data.updatedAt = new Date().toISOString();
            this.setMeta({ dirty: true, savedAt: this.data.updatedAt });
            clearTimeout(this._t);
            this._t = setTimeout(() => this.flush(), 250);
            listeners.forEach((fn) => fn());
        },
        flush() {
            clearTimeout(this._t);
            try { localStorage.setItem(KEY, JSON.stringify(this.data)); }
            catch (e) { U.toast('พื้นที่เก็บข้อมูลในเบราว์เซอร์เต็ม — ลองลดขนาดรูปในคลังคำถาม แล้วบันทึกไฟล์ข้อมูล (.json) สำรองไว้', { type: 'bad', ms: 6000 }); }
        },
        replace(d) {
            try { const cur = localStorage.getItem(KEY); if (cur) localStorage.setItem(KEY_PREV, cur); } catch (e) { /* ไม่เป็นไร */ }
            this.data = normalize(d);
            this.save();
            this.flush();
        },
        reset() { this.replace(newData()); },
        /** บันทึกไฟล์ข้อมูล (.json) */
        exportJson() {
            this.flush();
            const blob = new Blob([JSON.stringify(this.data, null, 1)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `ข้อมูลระบบกดปุ่มตอบเร็ว_${U.stamp()}.json`;
            document.body.appendChild(a); a.click();
            setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
            this.setMeta({ dirty: false, backupAt: new Date().toISOString() });
            listeners.forEach((fn) => fn());
        },
        parseJson(text) {
            const d = JSON.parse(text);
            if (!d || d.app !== APP_ID) throw new Error('ไฟล์นี้ไม่ใช่ไฟล์ข้อมูลของระบบกดปุ่มตอบเร็ว');
            return normalize(d);
        },
        newData, normalize,
    };
    window.Store = Store;
})();
