/* =====================================================================
   หน้าจอควบคุมเกม (ครูเห็นเฉลย นักเรียนไม่เห็น)
   ปุ่มหลัก "ขั้นต่อไป" · ให้คะแนนรายทีมตามรูปแบบเกม · ตัดสินกดออด · จับเวลา · ข้าม/ย้อนกลับ ·
   เลือกข้อ/กระดาน Jeopardy · ตัวอย่างจอแสดงผลสด
   ===================================================================== */
(function () {
    'use strict';
    const esc = U.esc;
    const KEY_PREVIEW = 'vs_team_quiz.ui.preview';

    let root = null;
    let raf = 0;
    let offPeers = null;
    let ro = null;

    const PHASE = {
        ready: { t: 'รอแสดงคำถาม', c: 'info', i: 'fa-hourglass-start' },
        show: { t: 'กำลังตอบ', c: 'warn', i: 'fa-circle-play' },
        reveal: { t: 'เฉลยแล้ว', c: 'ok', i: 'fa-eye' },
        end: { t: 'จบคำถามแล้ว', c: 'ok', i: 'fa-flag-checkered' },
        pick: { t: 'รอเลือกช่อง', c: 'info', i: 'fa-table-cells' },
    };
    const SCREEN = { title: 'หน้าชื่อการแข่งขัน', question: 'คำถาม', scores: 'ตารางคะแนน', board: 'กระดาน Jeopardy', final: 'ประกาศผล' };

    const answering = (s) => s.mode === 'buzz' || s.mode === 'jeopardy';
    const dispatch = (a) => Link.dispatch(a);

    function boardScreen(s) {
        if (s.screen === 'question' && s.phase === 'ready') return 'หน้า "ข้อที่ ' + (s.idx + 1) + '"';
        if (s.screen === 'question' && s.mode === 'jeopardy' && s.phase === 'pick') return SCREEN.board;
        if (s.phase === 'end' && s.screen !== 'final') return SCREEN.scores;
        return SCREEN[s.screen] || '-';
    }

    /* ---------- ส่วนหัว ---------- */
    function headHTML(s) {
        const p = Engine.progress(s);
        const pct = p.total ? Math.round(((p.done + p.skipped) / p.total) * 100) : 0;
        const peers = Link.peerInfo();
        return `
            <div class="ctl-head">
                <span class="ctl-ic"><i class="fas fa-gamepad"></i></span>
                <div class="min-w-0 flex-grow-1">
                    <h2>${esc(s.title)}</h2>
                    <div class="ctl-sub">${UI.modeTag(s.mode)}<span><i class="fas fa-layer-group"></i>${esc(s.setName || '-')}</span><span><i class="fas fa-users"></i>${s.teams.length} ทีม</span>
                        ${s.status === 'done' ? '<span class="tag ok"><i class="fas fa-flag-checkered"></i>ประกาศผลแล้ว</span>' : ''}</div>
                    <div class="ctl-prog"><span style="width:${pct}%"></span></div>
                    <small class="text-muted-2">${s.mode === 'jeopardy' ? `เล่นแล้ว ${p.done} จาก ${p.total} ช่อง` : `ตอบแล้ว ${p.done} • ข้าม ${p.skipped} • ทั้งหมด ${p.total} ข้อ`}</small>
                </div>
                <div class="ctl-head-tools">
                    <span class="link-chip ${peers.boards ? 'on' : ''}" id="ct-link"><i class="fas fa-${peers.boards ? 'circle-check' : 'display'}"></i>${peers.boards ? `จอแสดงผลเชื่อมต่อแล้ว${peers.boards > 1 ? ` ${peers.boards} จอ` : ''}` : 'ยังไม่ได้เปิดจอแสดงผล'}</span>
                    <button type="button" class="btn-x primary" data-act="board"><i class="fas fa-display"></i>เปิดจอแสดงผล</button>
                    <div class="dropdown">
                        <button type="button" class="btn-x ghost" data-bs-toggle="dropdown" aria-expanded="false" aria-label="เมนูเพิ่มเติม"><i class="fas fa-ellipsis"></i></button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><button class="dropdown-item" data-act="sound"><i class="fas fa-volume-${s.opts.sound === false ? 'xmark' : 'high'} me-2"></i>${s.opts.sound === false ? 'เปิดเสียงประกอบ' : 'ปิดเสียงประกอบ'}</button></li>
                            <li><button class="dropdown-item" data-act="title"><i class="fas fa-flag me-2"></i>แสดงหน้าชื่อการแข่งขัน</button></li>
                            <li><button class="dropdown-item" data-act="keys"><i class="fas fa-keyboard me-2"></i>คีย์ลัด / รีโมตพรีเซนต์</button></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="#/result?id=${encodeURIComponent(s.matchId)}"><i class="fas fa-ranking-star me-2"></i>ดูผลการแข่งขันนี้</a></li>
                            <li><button class="dropdown-item text-danger" data-act="stop"><i class="fas fa-power-off me-2"></i>ปิดเกมนี้ (เก็บผลไว้)</button></li>
                        </ul>
                    </div>
                </div>
            </div>`;
    }

    /* ---------- คำถามปัจจุบัน ---------- */
    function questionHTML(s) {
        const q = Engine.current(s);
        const ph = PHASE[s.phase] || PHASE.ready;
        if (s.status === 'done') return finalHTML(s);
        if (!q || (s.mode === 'jeopardy' && s.phase === 'pick')) {
            const turn = s.teams.find((t) => t.id === s.turn);
            return `<div class="ctl-q-empty"><i class="fas ${s.phase === 'end' ? 'fa-flag-checkered' : 'fa-table-cells'}"></i>
                <h3>${s.phase === 'end' ? 'จบคำถามทุกข้อแล้ว' : 'เลือกช่องบนกระดานด้านล่าง'}</h3>
                <p>${s.phase === 'end' ? 'จอแสดงผลกำลังแสดงตารางคะแนน — กด "ประกาศผล" เพื่อแสดงผู้ชนะ' : `${turn ? `<b>${esc(turn.name)}</b> ได้สิทธิ์เลือกช่อง • ` : ''}กดช่องคะแนนที่ทีมเลือก แล้วคำถามจะขึ้นจอทันที`}</p></div>`;
        }
        const pts = Engine.qPoints(s, q);
        return `
            <div class="ctl-q-head">
                <span class="q-no">${s.mode === 'jeopardy' ? esc(q.category || 'คำถาม') : `ข้อ ${s.idx + 1}/${s.deck.length}`}</span>
                <span class="mini-pill"><i class="fas fa-star"></i>${UI.fmt(pts)} คะแนน</span>
                ${q.category && s.mode !== 'jeopardy' ? `<span class="mini-pill"><i class="fas fa-tag"></i>${esc(q.category)}</span>` : ''}
                <span class="tag ${ph.c}"><i class="fas ${ph.i}"></i>${ph.t}</span>
                <span class="ms-auto ctl-onboard"><i class="fas fa-display"></i>จอแสดง: <b>${esc(boardScreen(s))}</b></span>
            </div>
            <div class="ctl-q-grid">
                <div class="ctl-q-body">${UI.qBody(q, { letters: Engine.LETTERS[s.opts.letters] })}
                    ${s.phase !== 'reveal' ? '<div class="secret"><i class="fas fa-eye-slash"></i>เฉลยแสดงเฉพาะหน้าจอนี้ นักเรียนจะเห็นเมื่อกด "เฉลยคำตอบ"</div>' : ''}</div>
                <div class="ctl-timer" id="ct-timer">
                    <div class="tm-num"><b>--</b><small>วินาที</small></div>
                    <div class="tm-bar"><span></span></div>
                    <div class="tm-btns">
                        <button type="button" class="btn-x soft sm" data-act="timer" title="เริ่ม/หยุดเวลา (T)"><i class="fas fa-play"></i><span>เริ่ม</span></button>
                        <button type="button" class="btn-x ghost sm" data-act="add10" title="เพิ่มเวลา 10 วินาที">+10</button>
                        <button type="button" class="btn-x ghost sm" data-act="treset" title="เริ่มนับใหม่"><i class="fas fa-rotate-left"></i></button>
                    </div>
                </div>
            </div>`;
    }

    function finalHTML(s) {
        const rk = Engine.ranking(s);
        return `<div class="ctl-final">
            <div class="cf-title"><i class="fas fa-trophy"></i><div><h3>ประกาศผลแล้ว</h3><p>จอแสดงผลกำลังแสดงโพเดียมผู้ชนะ • ผลถูกบันทึกไว้แล้ว</p></div></div>
            <div class="cf-rank">${rk.map((t) => `<div class="cf-row" style="--c:${esc(t.color)}">${UI.rankBadge(t.rank)}${UI.teamIcon(t)}<b>${esc(t.name)}</b>${UI.awardTag(t)}<span class="sc">${UI.fmt(t.score)}</span></div>`).join('')}</div>
            <div class="cf-btns">
                <a class="btn-x primary" href="#/result?id=${encodeURIComponent(s.matchId)}"><i class="fas fa-print"></i>ใบประกาศผล / ส่งออก Excel</a>
                <a class="btn-x ghost" href="#/reports?match=${encodeURIComponent(s.matchId)}"><i class="fas fa-file-word"></i>รายงาน .docx</a>
                <button type="button" class="btn-x ghost" data-act="scores"><i class="fas fa-ranking-star"></i>สลับตารางคะแนน/โพเดียม</button>
                <button type="button" class="btn-x ghost" data-act="reopenGame"><i class="fas fa-rotate-left"></i>กลับไปแข่งต่อ</button>
                <a class="btn-x orange" href="#/setup"><i class="fas fa-flag-checkered"></i>เริ่มการแข่งขันใหม่</a>
            </div></div>`;
    }

    /* ---------- ปุ่มหลัก ---------- */
    function actionsHTML(s) {
        if (s.status === 'done') return '';
        const n = Engine.nextStep(s);
        const q = Engine.current(s);
        const canSkip = q && s.phase !== 'end' && !(s.mode === 'jeopardy' && s.phase === 'pick');
        const undo = Link.undoCount ? Link.undoLabelText : '';
        const onScores = s.screen === 'scores';
        return `<div class="ctl-actions">
            <button type="button" class="btn-x cta lg big-next" data-act="next"${n ? '' : ' disabled'}><i class="fas ${n ? n.icon : 'fa-hand-pointer'}"></i><span>${n ? esc(n.label) : 'เลือกช่องบนกระดาน'}</span><kbd>Space</kbd></button>
            <button type="button" class="btn-x ghost lg" data-act="skip"${canSkip ? '' : ' disabled'} title="ข้ามข้อนี้ (ไม่มีใครได้คะแนน)"><i class="fas fa-forward-step"></i><span>ข้าม</span></button>
            <button type="button" class="btn-x ghost lg" data-act="undo"${undo ? '' : ' disabled'} title="${esc(undo ? `ย้อนกลับ: ${undo}` : 'ยังไม่มีอะไรให้ย้อนกลับ')}"><i class="fas fa-rotate-left"></i><span>ย้อนกลับ</span></button>
            <button type="button" class="btn-x ${onScores ? 'primary' : 'ghost'} lg" data-act="scores" title="สลับจอแสดงผลไปตารางคะแนน (S)"><i class="fas fa-ranking-star"></i><span>${onScores ? 'กลับไปคำถาม' : 'ตารางคะแนน'}</span></button>
            <button type="button" class="btn-x orange lg" data-act="finish" title="จบเกมและแสดงผู้ชนะบนจอ"><i class="fas fa-trophy"></i><span>ประกาศผล</span></button>
        </div>
        ${undo ? `<div class="undo-hint"><i class="fas fa-rotate-left"></i>ย้อนกลับได้: ${esc(undo)}</div>` : ''}`;
    }

    /* ---------- ทีม + การให้คะแนน ---------- */
    function buzzBox(s) {
        const q = Engine.current(s);
        if (!answering(s) || !q || s.status === 'done' || (s.mode === 'jeopardy' && s.phase === 'pick')) return '';
        const cur = s.teams.find((t) => t.id === s.buzz.current);
        const pts = Engine.qPoints(s, q);
        if (cur && s.phase === 'show') {
            return `<div class="buzz-box on" style="--c:${esc(cur.color)}">
                <div class="bb-who">${UI.teamIcon(cur, 'lg')}<div><small>กดออดก่อน</small><b>${esc(cur.name)}</b></div></div>
                <div class="bb-btns">
                    <button type="button" class="btn-x green lg" data-judge="1"><i class="fas fa-check"></i>ตอบถูก +${UI.fmt(pts)}</button>
                    <button type="button" class="btn-x danger-solid lg" data-judge="0"><i class="fas fa-xmark"></i>ตอบผิด${s.opts.penalty ? ` −${UI.fmt(s.opts.penalty)}` : ''}</button>
                </div>
                <button type="button" class="btn-link small" data-act="reopen">ยกเลิกสิทธิ์ เปิดให้กดใหม่</button>
            </div>`;
        }
        if (s.phase === 'show') {
            const outN = s.buzz.out.length;
            return `<div class="buzz-box ${s.buzz.open ? 'wait' : ''}">
                <div class="bb-wait"><i class="fas fa-bell"></i><div><b>${s.buzz.open ? 'รอทีมกดออด…' : 'ปิดรับการกดออด'}</b><small>${s.buzz.open ? 'ทีมกดปุ่มประจำทีม หรือครูกด "ให้ตอบ" ที่ทีมที่ยกมือก่อน' : (s.timer.expired ? 'หมดเวลา — กด "เฉลยคำตอบ" หรือเพิ่มเวลา' : 'ทุกทีมตอบผิดแล้ว — กด "เฉลยคำตอบ"')}</small></div></div>
                ${outN ? `<button type="button" class="btn-link small" data-act="reopenAll">ให้ทีมที่ตอบผิดกดได้อีกครั้ง</button>` : ''}
            </div>`;
        }
        if (s.phase === 'ready') return '<div class="buzz-box"><div class="bb-wait"><i class="fas fa-bell-slash"></i><div><b>ยังไม่เปิดให้กดออด</b><small>กด "แสดงคำถาม" แล้วระบบจะเปิดให้กดทันที</small></div></div></div>';
        return '';
    }

    function teamControls(s, t) {
        const q = Engine.current(s);
        if (!q || s.status === 'done' || s.phase === 'end' || (s.mode === 'jeopardy' && s.phase === 'pick')) return '';
        const a = (s.results[q.id] && s.results[q.id].answers[t.id]) || {};
        const L = Engine.LETTERS[s.opts.letters];
        const fin = s.phase === 'reveal' || answering(s) ? (a.final !== undefined ? a.final : a.result) : a.result;
        const mark = `<div class="mark-btns">
            <button type="button" class="mk ok${a.result === true ? ' on' : ''}" data-mark="${esc(t.id)}:1" title="ตอบถูก"><i class="fas fa-check"></i></button>
            <button type="button" class="mk bad${a.result === false ? ' on' : ''}" data-mark="${esc(t.id)}:0" title="ตอบผิด"><i class="fas fa-xmark"></i></button></div>`;
        if (answering(s)) {
            const out = s.buzz.out.includes(t.id);
            const cur = s.buzz.current === t.id;
            let st = '';
            if (fin === true) st = '<span class="tag ok"><i class="fas fa-check"></i>ถูก</span>';
            else if (fin === false) st = '<span class="tag bad"><i class="fas fa-xmark"></i>ผิด</span>';
            else if (cur) st = '<span class="tag warn"><i class="fas fa-bell"></i>กำลังตอบ</span>';
            const assign = s.phase === 'show' && !cur && !out && !s.buzz.current ? `<button type="button" class="btn-x soft sm" data-assign="${esc(t.id)}" title="ให้ทีมนี้ตอบ (ยกมือก่อน)"><i class="fas fa-hand"></i>ให้ตอบ</button>` : '';
            return `<div class="tc-ctrl">${st}${assign}${s.phase === 'reveal' ? mark : ''}</div>`;
        }
        let html = '';
        if (Engine.isChoice(q) && s.mode === 'mc') {
            html += `<div class="letter-btns">${q.choices.map((c, i) => `<button type="button" class="lb${a.choice === i ? ' on' : ''}${s.phase === 'reveal' && i === q.answer ? ' right' : ''}" data-choose="${esc(t.id)}:${i}" title="${esc(c)}">${esc(L[i])}</button>`).join('')}</div>`;
        }
        const res = s.phase === 'reveal' ? (fin === true ? '<span class="tag ok"><i class="fas fa-check"></i>ถูก</span>' : fin === false ? '<span class="tag bad"><i class="fas fa-xmark"></i>ผิด</span>' : '<span class="tag">ไม่ได้ตอบ</span>') : '';
        return `<div class="tc-ctrl">${html}${res}${mark}</div>`;
    }

    function teamsHTML(s) {
        const rk = Engine.ranking(s);
        const rankOf = Object.fromEntries(rk.map((t) => [t.id, t.rank]));
        const q = Engine.current(s);
        const step = q ? Engine.qPoints(s, q) : (s.opts.points || 10);
        const hint = s.mode === 'mc' && q && Engine.isChoice(q) && s.phase !== 'reveal' ? 'กดตัวอักษรที่แต่ละทีมเลือก (ทีมชูป้าย/บอกครู) ระบบตรวจให้เมื่อเฉลย'
            : s.mode === 'mc' || s.mode === 'write' ? 'กด ✓ / ✗ ให้แต่ละทีม — คะแนนขึ้นจอเมื่อกด "เฉลยคำตอบ" (แก้ได้หลังเฉลย)'
                : 'ทีมที่กดออดก่อนจะแสดงในกรอบด้านบน แล้วครูกด "ตอบถูก" หรือ "ตอบผิด"';
        return `${buzzBox(s)}
            <div class="tc-hint"><i class="fas fa-circle-info"></i>${hint}</div>
            <div class="tc-list">${s.teams.map((t) => `
                <div class="tc${s.buzz.current === t.id ? ' cur' : ''}${answering(s) && s.buzz.out.includes(t.id) ? ' out' : ''}" style="--c:${esc(t.color)}">
                    <div class="tc-top">
                        ${UI.teamIcon(t)}
                        <button type="button" class="tc-name" data-edit="${esc(t.id)}" title="แก้ไขชื่อ/ปุ่มของทีม"><b>${esc(t.name)}</b><small>อันดับ ${rankOf[t.id]}${answering(s) && t.key ? ` • ปุ่ม <kbd>${esc(t.key.toUpperCase())}</kbd>` : ''}</small></button>
                        <div class="tc-score">
                            <button type="button" class="adj" data-adj="${esc(t.id)}:-${step}" title="หัก ${step} คะแนน" aria-label="หักคะแนน ${esc(t.name)}">−</button>
                            <button type="button" class="sc" data-score="${esc(t.id)}" title="ปรับคะแนนเอง">${UI.fmt(t.score)}</button>
                            <button type="button" class="adj" data-adj="${esc(t.id)}:${step}" title="เพิ่ม ${step} คะแนน" aria-label="เพิ่มคะแนน ${esc(t.name)}">+</button>
                        </div>
                    </div>
                    ${teamControls(s, t)}
                </div>`).join('')}</div>`;
    }

    /* ---------- เลือกข้อ / กระดาน ---------- */
    function navHTML(s) {
        if (s.mode === 'jeopardy') {
            const g = Engine.jeopardyGrid(s.deck);
            const byId = new Map(s.deck.map((q) => [q.id, q]));
            let cells = g.cats.map((c) => `<div class="jg-h">${esc(c.name)}</div>`).join('');
            for (let r = 0; r < g.rows; r += 1) {
                g.cats.forEach((c) => {
                    const id = c.cells[r];
                    if (!id) { cells += '<div></div>'; return; }
                    const st = Engine.status(s, id);
                    const res = s.results[id];
                    const win = st === 'done' && s.teams.find((t) => res && res.answers[t.id] && res.answers[t.id].final === true);
                    const now = Engine.current(s) && Engine.current(s).id === id && s.phase !== 'pick';
                    cells += `<button type="button" class="jg ${st}${now ? ' now' : ''}" data-pick="${esc(id)}"${st === 'done' || s.status === 'done' ? ' disabled' : ''} title="${esc(byId.get(id).text)}">${win ? `<i class="fas ${esc(win.icon)}" style="color:${esc(win.color)}"></i>` : UI.fmt(Engine.qPoints(s, byId.get(id)))}</button>`;
                });
            }
            return `<div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-table-cells"></i></span><div><h3>กระดาน Jeopardy</h3><small>กดช่องที่ทีมเลือก → คำถามขึ้นจอและเปิดให้กดออด</small></div></div>
                <div class="panel-body"><div class="jgrid" style="grid-template-columns:repeat(${g.cats.length},minmax(0,1fr))">${cells}</div></div>`;
        }
        return `<div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-list-ol"></i></span><div><h3>คำถามทั้งหมด</h3><small>กดเลขข้อเพื่อข้ามไปข้อนั้น (เขียว = เล่นแล้ว, เทา = ข้าม)</small></div></div>
            <div class="panel-body"><div class="qnav">${s.deck.map((q, i) => {
                const st = Engine.status(s, q.id);
                return `<button type="button" class="qn ${st}${i === s.idx && s.phase !== 'end' ? ' now' : ''}" data-goto="${i}" title="${esc(q.text)}"${s.status === 'done' ? ' disabled' : ''}>${i + 1}</button>`;
            }).join('')}</div></div>`;
    }

    /* ---------- วาดหน้า ---------- */
    function render(el) {
        root = el;
        const s = Link.state;
        stopLoop();
        if (!s) {
            el.innerHTML = `${U.hero({ icon: 'fa-gamepad', title: 'หน้าจอควบคุมเกม', sub: 'ยังไม่มีการแข่งขันที่กำลังเล่น' })}
                <div class="panel"><div class="panel-body">${UI.empty('fa-gamepad', 'ยังไม่มีเกมที่กำลังเล่น', 'เริ่มการแข่งขันใหม่ หรือเลือกชุดคำถามจากคลังคำถามแล้วกด "เล่น"', '<a class="btn-x cta" href="#/setup"><i class="fas fa-flag-checkered"></i>เริ่มการแข่งขันใหม่</a>')}</div></div>`;
            return;
        }
        let pv = true;
        try { pv = localStorage.getItem(KEY_PREVIEW) !== '0'; } catch (e) { /* ค่าเริ่มต้น */ }
        el.innerHTML = `
            <div id="ct-head"></div>
            <div class="ctl-grid">
                <section class="ctl-main">
                    <div class="panel panel--theme ctl-q" id="ct-q"></div>
                    <div id="ct-actions"></div>
                    <div class="panel" id="ct-nav"></div>
                </section>
                <aside class="ctl-side">
                    <div class="panel panel--theme"><div class="panel-head"><span class="ic-box sm" style="--a:var(--ac);--b:var(--ac-2)"><i class="fas fa-users"></i></span><div><h3>ทีมและคะแนน</h3><small>กดคะแนนเพื่อปรับเอง</small></div></div>
                        <div class="panel-body" id="ct-teams"></div></div>
                    <div class="panel ctl-preview">
                        <div class="panel-head"><span class="ic-box sm" style="--a:#334155;--b:#0f172a"><i class="fas fa-display"></i></span><div><h3>ตัวอย่างจอแสดงผล</h3><small>สิ่งที่นักเรียนเห็นตอนนี้</small></div>
                            <div class="panel-tools"><button type="button" class="btn-x ghost sm" id="ct-pv-toggle">${pv ? 'ซ่อน' : 'แสดง'}</button></div></div>
                        <div class="pv-box" id="ct-pv"${pv ? '' : ' hidden'}>${pv ? `<iframe src="${App.boardUrl('preview=1')}" title="ตัวอย่างจอแสดงผล" tabindex="-1"></iframe>` : ''}</div>
                    </div>
                </aside>
            </div>`;
        fill(s);
        el.removeEventListener('click', onClick);
        el.addEventListener('click', onClick);
        el.querySelector('#ct-pv-toggle').onclick = togglePreview;
        fitPreview();
        offPeers = Link.onPeers(() => { const c = root && root.querySelector('#ct-link'); if (c && Link.state) root.querySelector('#ct-head').innerHTML = headHTML(Link.state); });
        startLoop();
    }

    function fill(s) {
        root.querySelector('#ct-head').innerHTML = headHTML(s);
        root.querySelector('#ct-q').innerHTML = questionHTML(s);
        root.querySelector('#ct-actions').innerHTML = actionsHTML(s);
        root.querySelector('#ct-nav').innerHTML = navHTML(s);
        root.querySelector('#ct-teams').innerHTML = teamsHTML(s);
        tick();
    }

    function togglePreview() {
        const box = root.querySelector('#ct-pv');
        const show = box.hidden;
        box.hidden = !show;
        if (show && !box.querySelector('iframe')) box.innerHTML = `<iframe src="${App.boardUrl('preview=1')}" title="ตัวอย่างจอแสดงผล" tabindex="-1"></iframe>`;
        if (!show) box.innerHTML = '';
        root.querySelector('#ct-pv-toggle').textContent = show ? 'ซ่อน' : 'แสดง';
        try { localStorage.setItem(KEY_PREVIEW, show ? '1' : '0'); } catch (e) { /* ข้าม */ }
        fitPreview();
    }
    /* ย่อหน้าจอแสดงผลขนาด 1280×720 ให้พอดีกรอบ (เหมือนจริงทุกพิกเซล) */
    function fitPreview() {
        const box = root && root.querySelector('#ct-pv');
        if (!box) return;
        const apply = () => { const f = box.querySelector('iframe'); if (f) f.style.transform = `scale(${box.clientWidth / 1280})`; };
        apply();
        if (ro) ro.disconnect();
        if (window.ResizeObserver) { ro = new ResizeObserver(apply); ro.observe(box); }
    }

    /* ---------- นาฬิกา ---------- */
    function tick() {
        const s = Link.state;
        const box = root && root.querySelector('#ct-timer');
        if (!s || !box) return;
        const t = s.timer;
        const left = Engine.timerLeft(t, Date.now());
        const num = box.querySelector('.tm-num b');
        const small = box.querySelector('.tm-num small');
        const bar = box.querySelector('.tm-bar span');
        const btn = box.querySelector('[data-act="timer"]');
        if (!t.dur) {
            box.classList.add('none');
            num.textContent = '—';
            small.textContent = 'ไม่จับเวลา';
            bar.style.width = '0';
            btn.disabled = true;
            return;
        }
        box.classList.remove('none');
        const sec = Math.ceil(left / 1000);
        const txt = t.expired || (left <= 0 && t.running) ? 'หมด' : String(sec);
        if (num.textContent !== txt) num.textContent = txt;
        small.textContent = t.expired ? 'หมดเวลาแล้ว' : t.running ? 'วินาที (กำลังนับ)' : `วินาที${s.phase === 'show' ? ' (หยุดอยู่)' : ''}`;
        bar.style.width = `${Math.max(0, Math.min(100, (left / t.dur) * 100))}%`;
        box.classList.toggle('hot', t.running && sec <= 5);
        box.classList.toggle('up', !!t.expired);
        const running = t.running;
        btn.innerHTML = running ? '<i class="fas fa-pause"></i><span>หยุด</span>' : `<i class="fas fa-play"></i><span>${s.phase === 'ready' ? 'แสดง+เริ่ม' : 'เริ่ม'}</span>`;
        btn.disabled = s.phase === 'reveal' || t.expired || s.status === 'done';
    }
    function startLoop() { const loop = () => { tick(); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); }
    function stopLoop() { cancelAnimationFrame(raf); raf = 0; if (offPeers) { offPeers(); offPeers = null; } if (ro) { ro.disconnect(); ro = null; } }

    /* ---------- คลิก ---------- */
    async function onClick(e) {
        const s = Link.state;
        if (!s) return;
        const b = e.target.closest('button, a');
        if (!b || b.disabled) return;
        const d = b.dataset;
        if (d.act) {
            const act = d.act;
            if (act === 'next') { const n = Engine.nextStep(s); if (n) dispatch({ type: n.type, name: n.name }); }
            else if (act === 'skip') dispatch({ type: 'skip' });
            else if (act === 'undo') { const l = Link.undo(); if (l && l !== 'sent') U.toast(`ย้อนกลับแล้ว: ${U.esc(l)}`, { type: 'ok', ms: 2200 }); }
            else if (act === 'scores') dispatch({ type: 'screen', name: s.screen === 'scores' ? (s.status === 'done' ? 'final' : s.mode === 'jeopardy' && s.phase === 'pick' ? 'board' : 'question') : 'scores' });
            else if (act === 'title') dispatch({ type: 'screen', name: 'title' });
            else if (act === 'finish') await finish(s);
            else if (act === 'reopenGame') dispatch({ type: 'reopenGame' });
            else if (act === 'timer') dispatch({ type: s.timer.running ? 'timerPause' : 'timerStart' });
            else if (act === 'add10') dispatch({ type: 'timerAdd', sec: 10 });
            else if (act === 'treset') dispatch({ type: 'timerReset' });
            else if (act === 'reopen') dispatch({ type: 'reopen' });
            else if (act === 'reopenAll') dispatch({ type: 'reopen', clearOut: true });
            else if (act === 'board') App.openBoard();
            else if (act === 'sound') dispatch({ type: 'opts', opts: { sound: s.opts.sound === false } });
            else if (act === 'keys') showKeys();
            else if (act === 'stop') await stopGame(s);
            return;
        }
        if (d.choose) { const [team, c] = d.choose.split(':'); dispatch({ type: 'choose', team, choice: +c }); return; }
        if (d.mark) { const [team, r] = d.mark.split(':'); dispatch({ type: 'mark', team, result: r === '1' }); return; }
        if (d.assign) { dispatch({ type: 'assign', team: d.assign }); return; }
        if (d.judge) { dispatch({ type: 'judge', result: d.judge === '1' }); return; }
        if (d.adj) { const i = d.adj.lastIndexOf(':'); dispatch({ type: 'adjust', team: d.adj.slice(0, i), delta: Number(d.adj.slice(i + 1)), note: 'ปรับคะแนนด้วยมือ' }); return; }
        if (d.score) { await customAdjust(s, d.score); return; }
        if (d.edit) { await editTeam(s, d.edit); return; }
        if (d.goto != null && d.goto !== '') {
            const i = +d.goto;
            if (i === s.idx && s.phase !== 'end') return;
            if (s.phase === 'show') {
                const ok = await U.confirm(`ไปข้อที่ ${i + 1}?`, 'ข้อปัจจุบันยังไม่ได้เฉลย จะถูกบันทึกว่า "ข้าม"', { confirmText: 'ไปข้อนั้น' });
                if (!ok) return;
            }
            dispatch({ type: 'goto', idx: i });
            return;
        }
        if (d.pick) {
            if (s.phase === 'show') {
                const ok = await U.confirm('เปิดช่องใหม่?', 'คำถามที่เปิดอยู่ยังไม่ได้เฉลย จะกลับไปเป็นช่องที่เลือกได้อีกครั้ง', { confirmText: 'เปิดช่องใหม่' });
                if (!ok) return;
            }
            dispatch({ type: 'pick', qid: d.pick, team: s.turn });
        }
    }

    async function finish(s) {
        const p = Engine.progress(s);
        const left = s.mode === 'jeopardy' ? p.total - p.done : p.left;
        const ok = await U.confirm('ประกาศผลการแข่งขัน?', `${left > 0 ? `ยังเหลือ${s.mode === 'jeopardy' ? 'ช่อง' : 'คำถาม'}ที่ยังไม่ได้เล่น <b>${left}</b> ${s.mode === 'jeopardy' ? 'ช่อง' : 'ข้อ'}<br>` : ''}จอแสดงผลจะแสดงโพเดียมผู้ชนะพร้อมเสียงแตร (กด "ย้อนกลับ" เพื่อแข่งต่อได้)`, { confirmText: '<i class="fas fa-trophy"></i> ประกาศผล', icon: 'question' });
        if (ok) dispatch({ type: 'finish' });
    }

    async function stopGame(s) {
        const ok = await U.confirm('ปิดเกมนี้?', `ผลล่าสุดของ <b>${esc(s.title)}</b> เก็บไว้ที่หน้า "ผลการแข่งขัน" แล้ว จอแสดงผลจะกลับไปหน้ารอ`, { confirmText: 'ปิดเกม', danger: true });
        if (!ok) return;
        Store.upsertMatch(Engine.toRecord(s));
        Link.clear();
        App.go('results');
    }

    async function customAdjust(s, teamId) {
        const t = s.teams.find((x) => x.id === teamId);
        const r = await UI.sheet({
            title: `ปรับคะแนน: ${t.name}`, icon: 'fa-plus-minus', width: 480, sub: `คะแนนตอนนี้ ${UI.fmt(t.score)} คะแนน`,
            body: `<label class="form-label">เพิ่ม (+) หรือหัก (−) คะแนน</label>
                <input class="form-control form-control-lg" id="adj-v" type="number" inputmode="numeric" step="1" placeholder="เช่น 5 หรือ -5">
                <div class="d-flex flex-wrap gap-2 mt-2">${[-10, -5, 5, 10, 20, 50].map((n) => `<button type="button" class="btn-x ${n > 0 ? 'soft' : 'ghost'} sm" onclick="document.getElementById('adj-v').value=${n}">${n > 0 ? '+' : ''}${n}</button>`).join('')}</div>
                <label class="form-label mt-3">หมายเหตุ (เช่น คะแนนพิเศษ, ทำผิดกติกา)</label><input class="form-control" id="adj-n" maxlength="80">`,
            confirmText: '<i class="fas fa-check"></i> บันทึก',
            preConfirm: () => {
                const v = Number(document.getElementById('adj-v').value);
                if (!Number.isFinite(v) || !v) { Swal.showValidationMessage('กรุณาใส่จำนวนคะแนน (ไม่ใช่ 0)'); return false; }
                return { v, n: document.getElementById('adj-n').value };
            },
        });
        if (r.isConfirmed) dispatch({ type: 'adjust', team: teamId, delta: r.value.v, note: U.norm(r.value.n) || 'ปรับคะแนนด้วยมือ' });
    }

    async function editTeam(s, teamId) {
        const t = s.teams.find((x) => x.id === teamId);
        const keys = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ...'abcdefghijklmnopqrstuvwxyz'.split('')];
        const r = await UI.sheet({
            title: 'แก้ไขทีมระหว่างแข่ง', icon: 'fa-pen', width: 560,
            body: `<label class="form-label">ชื่อทีม</label><input class="form-control mb-2" id="te-name" value="${esc(t.name)}" maxlength="40">
                <label class="form-label">สมาชิก (คั่นด้วยจุลภาค)</label><input class="form-control mb-2" id="te-mem" value="${esc(t.members.join(', '))}">
                <label class="form-label">ปุ่มกดออด</label><select class="form-select mb-2" id="te-key">${keys.map((k) => `<option value="${k}"${k === t.key ? ' selected' : ''}>${k ? k.toUpperCase() : '— ไม่มี —'}</option>`).join('')}</select>
                <label class="form-label">สีทีม</label>${UI.colorPicker('te-color', t.color)}`,
            preConfirm: () => {
                const name = U.norm(document.getElementById('te-name').value);
                const key = document.getElementById('te-key').value;
                if (!name) { Swal.showValidationMessage('กรุณาใส่ชื่อทีม'); return false; }
                if (s.teams.some((x) => x.id !== teamId && x.name === name)) { Swal.showValidationMessage('ชื่อทีมซ้ำกับทีมอื่น'); return false; }
                if (key && s.teams.some((x) => x.id !== teamId && x.key === key)) { Swal.showValidationMessage('ปุ่มนี้มีทีมอื่นใช้แล้ว'); return false; }
                return { name, key, members: document.getElementById('te-mem').value.split(/[,\n]/).map(U.norm).filter(Boolean), color: (document.querySelector('input[name="te-color"]:checked') || {}).value };
            },
        });
        if (r.isConfirmed) dispatch(Object.assign({ type: 'teamEdit', team: teamId }, r.value));
    }

    function showKeys() {
        U.alert('คีย์ลัด / รีโมตพรีเซนต์', `<div class="text-start keys-help">
            <p class="mb-2">ใช้ได้ทั้งที่หน้าจอนี้และหน้าต่างจอแสดงผล (คลิกที่หน้าต่างนั้นก่อน 1 ครั้ง) • รีโมตพรีเซนต์ไร้สายส่งปุ่ม PageDown/PageUp จึงใช้ได้ทันที</p>
            <table class="table table-sm mb-2">
                <tr><td><kbd>Space</kbd> <kbd>PageDown</kbd> <kbd>→</kbd></td><td>ขั้นต่อไป (แสดงคำถาม → เฉลย → ข้อถัดไป)</td></tr>
                <tr><td><kbd>PageUp</kbd> <kbd>←</kbd> <kbd>Ctrl</kbd>+<kbd>Z</kbd></td><td>ย้อนกลับ</td></tr>
                <tr><td><kbd>1</kbd>–<kbd>8</kbd></td><td>ปุ่มกดออดของทีม (เปลี่ยนได้)</td></tr>
                <tr><td><kbd>Enter</kbd> / <kbd>Y</kbd></td><td>ทีมที่กดออดตอบถูก</td></tr>
                <tr><td><kbd>Backspace</kbd> / <kbd>N</kbd></td><td>ทีมที่กดออดตอบผิด</td></tr>
                <tr><td><kbd>T</kbd></td><td>เริ่ม/หยุดเวลา</td></tr>
                <tr><td><kbd>S</kbd> / <kbd>B</kbd></td><td>สลับตารางคะแนน</td></tr>
            </table>
            <div class="note mb-0"><i class="fas fa-mobile-screen"></i><div><b>ใช้มือถือเป็นรีโมต:</b> ใช้แอปรีโมตพรีเซนต์/คีย์บอร์ดบลูทูธบนมือถือที่จับคู่กับคอมพิวเตอร์ (ส่งปุ่ม PageDown/PageUp) — ไม่ต้องใช้อินเทอร์เน็ต</div></div>
        </div>`, 'info');
    }

    /* คีย์ลัดจาก app.js (เฉพาะเมื่ออยู่หน้านี้) */
    function key(e, s) {
        const k = e.key;
        const tk = Engine.keyFromEvent(e);
        const team = tk && !e.ctrlKey && !e.metaKey && !e.altKey && s.teams.find((t) => t.key === tk);
        if (team && answering(s)) { e.preventDefault(); dispatch({ type: 'buzz', team: team.id }); return; }
        if (k === 'F5') { e.preventDefault(); return; }
        if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')) { e.preventDefault(); Link.undo(); return; }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if ([' ', 'PageDown', 'ArrowRight'].includes(k)) { e.preventDefault(); const n = Engine.nextStep(s); if (n) dispatch({ type: n.type, name: n.name }); return; }
        if (['PageUp', 'ArrowLeft'].includes(k)) { e.preventDefault(); const l = Link.undo(); if (l && l !== 'sent') U.toast(`ย้อนกลับแล้ว: ${U.esc(l)}`, { type: 'ok', ms: 2000 }); return; }
        if (answering(s) && s.buzz.current && (k === 'Enter' || k === 'y' || k === 'Y')) { e.preventDefault(); dispatch({ type: 'judge', result: true }); return; }
        if (answering(s) && s.buzz.current && (k === 'Backspace' || k === 'Delete' || k === 'n' || k === 'N')) { e.preventDefault(); dispatch({ type: 'judge', result: false }); return; }
        if (k === 't' || k === 'T') { dispatch({ type: s.timer.running ? 'timerPause' : 'timerStart' }); return; }
        if (k === 's' || k === 'S' || k === 'b' || k === 'B' || k === '.') dispatch({ type: 'screen', name: s.screen === 'scores' ? (s.mode === 'jeopardy' && s.phase === 'pick' ? 'board' : 'question') : 'scores' });
    }

    function live(s, prev) {
        if (!root || App.current !== 'control') return;
        if (!s || !prev || s.matchId !== prev.matchId || !root.querySelector('#ct-q')) { render(root); return; }
        fill(s);
    }

    window.Views.control = {
        render, live, key,
        refresh(reason) { if (reason === 'images' && Link.state && root) fill(Link.state); },
        leave() { stopLoop(); if (root) root.removeEventListener('click', onClick); root = null; },
    };
})();
