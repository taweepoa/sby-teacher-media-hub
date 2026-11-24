/* =====================================================================
   ซิงก์เกมระหว่างหน้าต่าง (หน้าจอครู ↔ จอแสดงผล) แบบออฟไลน์ ไม่ต้องมีเซิร์ฟเวอร์
   - ช่องทาง: BroadcastChannel (หลัก) + เหตุการณ์ storage ของ localStorage (สำรอง/ใช้ได้กับ file://)
   - สถานะเกมเก็บใน localStorage เสมอ เปิดหน้าต่างใหม่/รีเฟรชแล้วเห็นสถานะล่าสุดทันที
   - "หัวหน้า" (leader) เป็นผู้เปลี่ยนสถานะคนเดียว: หน้าต่างอื่นส่งคำสั่งไปให้หัวหน้า → ไม่ชนกัน
     ลำดับความสำคัญ: หน้าจอครูที่เปิดอยู่ > หน้าต่างโปรแกรมอื่น > จอแสดงผล (ใช้จอเดียวก็เล่นได้)
   - หัวหน้าเป็นผู้เล่นเสียงประกอบ (เสียงออกลำโพง/HDMI เดียวกันอยู่แล้ว)
   ===================================================================== */
(function () {
    'use strict';

    const KEY = 'vs_team_quiz.live.v1';
    const KEY_HIST = 'vs_team_quiz.live.hist.v1';
    const KEY_MSG = 'vs_team_quiz.msg.v1';
    const CHANNEL = 'vs-team-quiz';
    const HB_MS = 1000;
    const DEAD_MS = 3500;
    const MAX_HIST = 40;

    const wid = `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const since = Date.now();
    let role = 'control';
    let prioFn = () => 1;
    let state = null;
    let hist = [];
    let bc = null;
    const peers = new Map();
    const listeners = new Set();
    const fxListeners = new Set();
    const peerListeners = new Set();
    let lastLeader = null;
    let started = false;

    function readJSON(key) {
        try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    }
    function writeJSON(key, val) {
        try {
            if (val == null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val));
            return true;
        } catch (e) { console.error('บันทึกสถานะเกมไม่สำเร็จ', e); return false; }
    }

    /* ---------- ส่งข้อความ ---------- */
    function post(msg) {
        const m = Object.assign({}, msg, { from: wid });
        if (bc) {
            try { bc.postMessage(m); return; } catch (e) { /* ใช้ช่องทางสำรอง */ }
        }
        try { localStorage.setItem(KEY_MSG, JSON.stringify(Object.assign({ n: Math.random() }, m))); } catch (e) { /* เต็ม */ }
    }

    function emit(prev, info) { listeners.forEach((fn) => { try { fn(state, prev, info || {}); } catch (e) { console.error(e); } }); }

    /* รับสถานะใหม่จากหน้าต่างอื่น (ใช้เมื่อใหม่กว่าของเรา) */
    function adopt(s, source) {
        if (!s) return;
        const newer = !state || s.matchId !== state.matchId || s.rev > state.rev || (s.rev === state.rev && (s.at || 0) > (state.at || 0));
        if (!newer) return;
        const prev = state;
        state = s;
        emit(prev, { source, fx: s.fx && (!prev || !prev.fx || s.fx.seq !== prev.fx.seq) ? s.fx.list : [] });
    }

    function onMessage(m) {
        if (!m || m.from === wid) return;
        if (m.t === 'hb') {
            const known = peers.has(m.from);
            peers.set(m.from, { wid: m.from, role: m.role, prio: m.prio || 0, since: m.since || 0, seen: Date.now() });
            if (!known) { peersChanged(); if (isLeader()) post({ t: 'hb', role, prio: prioFn(), since }); }
            return;
        }
        if (m.t === 'bye') { peers.delete(m.from); peersChanged(); return; }
        if (m.t === 'state') { adopt(m.state, 'remote'); return; }
        if (m.t === 'hist') { hist = readJSON(KEY_HIST) || []; emit(state, { source: 'hist' }); return; }
        if (m.t === 'clear') { const prev = state; state = null; hist = []; emit(prev, { source: 'clear' }); return; }
        if (m.t === 'act' && m.to === wid) {
            if (m.action && m.action.type === 'undo') undo();
            else dispatch(m.action);
        }
    }

    /* ---------- หัวหน้า ---------- */
    function prune() {
        const now = Date.now();
        let changed = false;
        peers.forEach((p, k) => { if (now - p.seen > DEAD_MS) { peers.delete(k); changed = true; } });
        if (changed) peersChanged();
    }
    function candidates() {
        const me = { wid, role, prio: prioFn(), since };
        return [me, ...peers.values()].filter((p) => p.role !== 'preview');
    }
    function leaderId() {
        const c = candidates().sort((a, b) => (b.prio - a.prio) || (a.since - b.since) || (a.wid < b.wid ? -1 : 1));
        return c.length ? c[0].wid : wid;
    }
    function isLeader() { return role !== 'preview' && leaderId() === wid; }
    function peersChanged() {
        const l = leaderId();
        if (l !== lastLeader) { lastLeader = l; }
        peerListeners.forEach((fn) => { try { fn(peerInfo()); } catch (e) { console.error(e); } });
    }
    function peerInfo() {
        const list = [...peers.values()];
        return {
            boards: list.filter((p) => p.role === 'board').length,
            controls: list.filter((p) => p.role === 'control').length + (role === 'control' ? 1 : 0),
            leader: isLeader(),
        };
    }

    /* ---------- เปลี่ยนสถานะ ---------- */
    function commit(next, fx, histChanged) {
        const prev = state;
        next.rev = (prev ? prev.rev : 0) + 1;
        state = next;
        writeJSON(KEY, state);
        if (histChanged) writeJSON(KEY_HIST, hist);
        post({ t: 'state', state });
        if (histChanged) post({ t: 'hist' });
        emit(prev, { source: 'local', fx: fx || [] });
        if (fx && fx.length) fxListeners.forEach((fn) => { try { fn(fx, state); } catch (e) { console.error(e); } });
    }

    /* เก็บสถานะก่อนเปลี่ยนไว้ย้อนกลับ (นาฬิกาเก็บเป็นแบบหยุด ไม่ให้หมดเวลาทันทีเมื่อย้อน) */
    function snapshot(s, label) {
        const x = Engine.clone(Object.assign({}, s, { deck: undefined }));
        if (x.timer.running) { x.timer.left = Math.max(0, x.timer.endsAt - Date.now()); x.timer.running = false; }
        return { label, state: x };
    }

    function undoLabel(action, s) {
        const team = action.team && s.teams.find((t) => t.id === action.team);
        const tn = team ? ` ${team.name}` : '';
        return ({
            show: 'แสดงคำถาม', reveal: 'เฉลยคำตอบ', next: 'ไปข้อถัดไป', skip: 'ข้ามข้อ', goto: 'เปลี่ยนข้อ', pick: 'เลือกช่องบนกระดาน',
            choose: `บันทึกคำตอบ${tn}`, mark: `ให้ผลถูก/ผิด${tn}`, buzz: `กดออด${tn}`, assign: `ให้สิทธิ์ตอบ${tn}`,
            judge: action.result ? 'ตัดสินว่าตอบถูก' : 'ตัดสินว่าตอบผิด', reopen: 'เปิดให้กดออดใหม่', adjust: `ปรับคะแนน${tn}`,
            finish: 'ประกาศผล', reopenGame: 'กลับไปแข่งต่อ', teamEdit: `แก้ไขทีม${tn}`, opts: 'เปลี่ยนการตั้งค่า',
        })[action.type] || 'การกระทำล่าสุด';
    }

    function dispatch(action) {
        if (!state || !action) return false;
        const a = Object.assign({ at: Date.now() }, action);
        if (!isLeader()) { post({ t: 'act', to: leaderId(), action: a }); return true; }
        const r = Engine.reduce(state, a);
        if (r.state === state) return false;
        let histChanged = false;
        if (!Engine.NO_UNDO.has(a.type)) {
            hist.push(snapshot(state, undoLabel(a, state)));
            if (hist.length > MAX_HIST) hist.shift();
            histChanged = true;
        }
        commit(r.state, r.fx, histChanged);
        return true;
    }

    function undo() {
        if (!state) return null;
        if (!isLeader()) { post({ t: 'act', to: leaderId(), action: { type: 'undo' } }); return 'sent'; }
        const h = hist.pop();
        if (!h) return null;
        const next = Object.assign(h.state, { deck: state.deck, at: Date.now() });
        commit(next, ['undo'], true);
        return h.label;
    }

    /* เริ่มการแข่งขันใหม่ (แทนที่เกมเดิม) */
    function start(s) {
        hist = [];
        writeJSON(KEY_HIST, hist);
        const prev = state;
        state = Object.assign(s, { rev: (prev ? prev.rev : 0) + 1 });
        writeJSON(KEY, state);
        post({ t: 'state', state });
        post({ t: 'hist' });
        emit(prev, { source: 'local', fx: [] });
    }

    function clear() {
        const prev = state;
        state = null;
        hist = [];
        writeJSON(KEY, null);
        writeJSON(KEY_HIST, null);
        post({ t: 'clear' });
        emit(prev, { source: 'clear' });
    }

    /* หัวหน้าเฝ้านาฬิกา: หมดเวลา → timeUp, 5 วินาทีสุดท้ายมีเสียงติ๊ก
       หน้าต่างอื่นช่วยเตือนหัวหน้าเมื่อเลยเวลา (กรณีหน้าต่างหัวหน้าถูกเบราว์เซอร์ลดความถี่) */
    let lastTickSec = null;
    function watchTimer() {
        if (!state || !state.timer || !state.timer.running) { lastTickSec = null; return; }
        const left = state.timer.endsAt - Date.now();
        if (isLeader()) {
            const sec = Math.ceil(left / 1000);
            if (left > 0 && sec <= 5 && sec !== lastTickSec) {
                lastTickSec = sec;
                fxListeners.forEach((fn) => { try { fn(['tick'], state); } catch (e) { console.error(e); } });
            }
            if (left <= 0) dispatch({ type: 'timeUp' });
        } else if (left < -900 && role !== 'preview') {
            post({ t: 'act', to: leaderId(), action: { type: 'timeUp', at: Date.now() } });
        }
    }

    function heartbeat() {
        prune();
        if (role !== 'preview') post({ t: 'hb', role, prio: prioFn(), since });
        const l = leaderId();
        if (l !== lastLeader) peersChanged();
    }

    function init(opts) {
        if (started) return;
        started = true;
        role = opts.role || 'control';
        if (opts.prio) prioFn = opts.prio;
        state = readJSON(KEY);
        hist = readJSON(KEY_HIST) || [];
        try { bc = new BroadcastChannel(CHANNEL); bc.onmessage = (e) => onMessage(e.data); } catch (e) { bc = null; }
        window.addEventListener('storage', (e) => {
            if (e.key === KEY) {
                if (e.newValue == null) { if (state) { const prev = state; state = null; hist = []; emit(prev, { source: 'clear' }); } return; }
                try { adopt(JSON.parse(e.newValue), 'storage'); } catch (err) { /* ข้าม */ }
            } else if (e.key === KEY_HIST) {
                hist = readJSON(KEY_HIST) || [];
            } else if (e.key === KEY_MSG && e.newValue && !bc) {
                try { onMessage(JSON.parse(e.newValue)); } catch (err) { /* ข้าม */ }
            }
        });
        window.addEventListener('pagehide', () => { if (role !== 'preview') post({ t: 'bye' }); });
        document.addEventListener('visibilitychange', heartbeat);
        heartbeat();
        setInterval(heartbeat, HB_MS);
        setInterval(watchTimer, 200);
    }

    window.Link = {
        KEY, KEY_HIST,
        init, dispatch, undo, start, clear, isLeader, peerInfo,
        get state() { return state; },
        get wid() { return wid; },
        get role() { return role; },
        get undoCount() { return hist.length; },
        get undoLabelText() { return hist.length ? hist[hist.length - 1].label : ''; },
        on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        onFx(fn) { fxListeners.add(fn); return () => fxListeners.delete(fn); },
        onPeers(fn) { peerListeners.add(fn); return () => peerListeners.delete(fn); },
        /* เรียกเมื่อเปลี่ยนหน้า/เปลี่ยนการมองเห็น เพื่อประกาศลำดับความสำคัญใหม่ทันที */
        ping: heartbeat,
    };
})();
