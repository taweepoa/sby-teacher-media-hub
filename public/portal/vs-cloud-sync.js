/* =====================================================================
   SBY Cloud Sync & Unified Navigation SDK (vs-cloud-sync.js)
   โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน | พัฒนาระบบโดย ครูทวีป นวคุณานนท์
   - เชื่อมโยงระบบยืนยันตัวตน Google Sign-In (@sby.ac.th + รายชื่อครูอนุมัติ)
   - ซิงค์ข้อมูลโรงเรียนและรายชื่อนักเรียนส่วนกลาง (Master Roster Bridge) เข้าสู่ทั้ง 7 แอป
   - บันทึกข้อมูลขึ้น Cloudflare D1 อัตโนมัติ (Offline-First + Real-time Cloud Sync)
   - แสดงแถบนำทางส่วนกลาง (SBY Portal Bar) เพื่อสลับไปมาระหว่างสื่อทั้ง 7 ระบบได้ทันที
   ===================================================================== */
(function () {
    'use strict';

    const TOKEN_KEY = 'sby_media_hub.auth_token.v1';
    const USER_KEY = 'sby_media_hub.auth_user.v1';
    const MASTER_ROSTER_KEY = 'sby_media_hub.master_roster.v1';

    const APPS_META = [
        { id: 'vs-random-picker', slug: 'wheel', name: 'วงล้อสุ่มรายชื่อนักเรียน', short: 'วงล้อสุ่มชื่อ', icon: 'fa-dharmachakra', color: '#e11d48', path: '/apps/wheel/index.html' },
        { id: 'vs-class-points', slug: 'class-points', name: 'กระดานแต้มพฤติกรรมห้องเรียน', short: 'แต้มพฤติกรรม', icon: 'fa-star', color: '#0284c7', path: '/apps/class-points/index.html' },
        { id: 'vs-millionaire-quiz', slug: 'millionaire', name: 'เกมเศรษฐีตอบคำถามหน้าชั้นเรียน', short: 'เกมเศรษฐี', icon: 'fa-trophy', color: '#4f46e5', path: '/apps/millionaire/index.html' },
        { id: 'vs-memory-game', slug: 'memory', name: 'เกมจับคู่ความจำและทายใจ', short: 'เกมจับคู่ความจำ', icon: 'fa-clone', color: '#9333ea', path: '/apps/memory/index.html' },
        { id: 'vs-snake-ladder-quiz', slug: 'snake-ladder', name: 'เกมบันไดงูตอบคำถามหน้าชั้นเรียน', short: 'เกมบันไดงู', icon: 'fa-dice', color: '#16a34a', path: '/apps/snake-ladder/index.html' },
        { id: 'vs-buzzer', slug: 'buzzer', name: 'ระบบกดปุ่มตอบเร็ว (Buzzer)', short: 'กดปุ่มตอบเร็ว', icon: 'fa-bell', color: '#ea580c', path: '/apps/buzzer/index.html' },
        { id: 'vs-classroom-timer', slug: 'timer', name: 'นาฬิกาจับเวลาหน้าชั้นเรียน', short: 'นาฬิกาจับเวลา', icon: 'fa-stopwatch', color: '#0d9488', path: '/apps/timer/index.html' },
    ];

    function getAuth() {
        try {
            const token = localStorage.getItem(TOKEN_KEY) || '';
            const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
            return { token, user };
        } catch (e) {
            return { token: '', user: null };
        }
    }

    function getMasterRosterLocal() {
        try {
            return JSON.parse(localStorage.getItem(MASTER_ROSTER_KEY) || 'null');
        } catch (e) {
            return null;
        }
    }

    function saveMasterRosterLocal(roster) {
        try {
            localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify(roster));
        } catch (e) { /* ignore */ }
    }

    function detectCurrentApp() {
        if (window.Store && Store.data && Store.data.app) {
            const found = APPS_META.find((a) => a.id === Store.data.app);
            if (found) return found;
        }
        const p = location.pathname;
        return APPS_META.find((a) => p.includes(`/apps/${a.slug}/`)) || APPS_META[0];
    }

    /* =====================================================================
       แปลงข้อมูลโรงเรียนและรายชื่อนักเรียนส่วนกลางเข้าสู่โครงสร้างของแต่ละแอป
       ===================================================================== */
    function applyMasterRosterToApp(appId, d, roster) {
        if (!d || !roster) return false;
        let changed = false;

        // 1. ซิงค์ข้อมูลโรงเรียนและชื่อครูผู้สอน
        const sp = roster.schoolProfile || {};
        if (d.school && typeof d.school === 'object') {
            const mapFields = {
                name: sp.name || 'โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
                agency: sp.agency || 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาลำพูน ลำปาง',
                academicYear: sp.academicYear || String(new Date().getFullYear() + 543),
                semester: sp.semester || '1',
                director: sp.director || '',
                teacherName: sp.teacherName || '',
                teacherPosition: sp.teacherPosition || '',
                reporterName: sp.teacherName || '',
                reporterPosition: sp.teacherPosition || '',
                reporter: sp.teacherName || '',
                reporterPos: sp.teacherPosition || '',
            };
            Object.keys(mapFields).forEach((k) => {
                if (k in d.school && mapFields[k] && !d.school[k]) {
                    d.school[k] = mapFields[k];
                    changed = true;
                }
            });
            // บังคับอัปเดตชื่อโรงเรียนหากยังว่าง
            if (!d.school.name) {
                d.school.name = 'โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน';
                changed = true;
            }
        }

        if (!Array.isArray(roster.classes)) return changed;
        const classes = roster.classes;

        // 2. ซิงค์รายชื่อนักเรียนเข้าแอป "วงล้อสุ่มรายชื่อนักเรียน" (vs-random-picker)
        // ซิงค์ครบทุกห้อง + รหัสนักเรียน (code) และลบห้องเรียนที่ไม่มีในฐานข้อมูลกลางออก (คงรายการกำหนดเอง custom ไว้)
        if (appId === 'vs-random-picker' && Array.isArray(d.lists)) {
            const customLists = d.lists.filter((l) => l && l.kind === 'custom');
            const prevClassLists = d.lists.filter((l) => l && l.kind !== 'custom');
            const usedPrevIds = new Set();
            const syncedClassLists = [];

            classes.forEach((cls) => {
                if (!cls || !cls.id || !cls.name) return;
                const existing = prevClassLists.find((l) => l.id === cls.id)
                    || prevClassLists.find((l) => !usedPrevIds.has(l.id) && l.name === cls.name);
                if (existing) usedPrevIds.add(existing.id);

                const prevItemMap = new Map();
                if (existing && Array.isArray(existing.items)) {
                    existing.items.forEach((it) => {
                        if (it && it.id) prevItemMap.set(String(it.id), it);
                    });
                }

                if (existing && existing.id !== cls.id) {
                    if (d.wheel && d.wheel.removed && d.wheel.removed[existing.id]) {
                        d.wheel.removed[cls.id] = d.wheel.removed[existing.id];
                        delete d.wheel.removed[existing.id];
                    }
                    if (d.wheel && d.wheel.round && d.wheel.round[existing.id]) {
                        d.wheel.round[cls.id] = d.wheel.round[existing.id];
                        delete d.wheel.round[existing.id];
                    }
                    if (d.currentListId === existing.id) d.currentListId = cls.id;
                }

                const mappedItems = (cls.students || []).map((s, idx) => {
                    const sid = s.id || `s_${cls.id}_${idx + 1}`;
                    const prev = prevItemMap.get(String(sid));
                    return {
                        id: sid,
                        no: s.no != null && s.no !== '' ? Number(s.no) : idx + 1,
                        code: s.code != null ? String(s.code).trim() : '',
                        prefix: s.prefix || '',
                        firstName: s.firstName || '',
                        lastName: s.lastName || '',
                        nick: s.nick || '',
                        gender: s.gender || '',
                        weight: prev ? (Number(prev.weight) || 1) : (Number(s.weight) || 1),
                        active: prev ? (prev.active !== false) : (s.active !== false),
                        kind: 'class',
                    };
                });

                syncedClassLists.push({
                    id: cls.id,
                    kind: 'class',
                    name: cls.name,
                    note: cls.note || '',
                    items: mappedItems,
                });
            });

            const nextLists = [...syncedClassLists, ...customLists];
            const validListIds = new Set(nextLists.map((l) => l.id));

            if (JSON.stringify(d.lists) !== JSON.stringify(nextLists)) {
                d.lists = nextLists;
                changed = true;
            }
            if (d.wheel && d.wheel.removed) {
                Object.keys(d.wheel.removed).forEach((lid) => {
                    if (!validListIds.has(lid)) {
                        delete d.wheel.removed[lid];
                        changed = true;
                    }
                });
            }
            if (d.wheel && d.wheel.round) {
                Object.keys(d.wheel.round).forEach((lid) => {
                    if (!validListIds.has(lid)) {
                        delete d.wheel.round[lid];
                        changed = true;
                    }
                });
            }
            if (!validListIds.has(d.currentListId)) {
                d.currentListId = d.lists[0] ? d.lists[0].id : '';
                changed = true;
            }
        }

        // 3. ซิงค์รายชื่อนักเรียนเข้าแอป "กระดานแต้มพฤติกรรมห้องเรียน" (vs-class-points)
        // ซิงค์ครบทุกห้อง + รหัสนักเรียน (code) และลบห้องเรียนที่ไม่มีในฐานข้อมูลกลางออก
        if (appId === 'vs-class-points' && Array.isArray(d.classes) && Array.isArray(d.students)) {
            const prevClasses = d.classes;
            const prevStudentById = new Map();
            d.students.forEach((s) => {
                if (s && s.id) prevStudentById.set(String(s.id), s);
            });

            const usedPrevIds = new Set();
            const nextClasses = [];
            const nextStudents = [];

            classes.forEach((cls) => {
                if (!cls || !cls.id || !cls.name) return;
                const existingCls = prevClasses.find((c) => c.id === cls.id)
                    || prevClasses.find((c) => !usedPrevIds.has(c.id) && c.name === cls.name);
                if (existingCls) usedPrevIds.add(existingCls.id);

                if (existingCls && existingCls.id !== cls.id && d.settings && d.settings.classId === existingCls.id) {
                    d.settings.classId = cls.id;
                    changed = true;
                }

                const groups = existingCls && Array.isArray(existingCls.groups) && existingCls.groups.length
                    ? existingCls.groups
                    : (Array.isArray(cls.groups) ? cls.groups : []);

                nextClasses.push({
                    id: cls.id,
                    name: cls.name,
                    groups,
                });

                (cls.students || []).forEach((s, idx) => {
                    const sid = s.id || `s_${cls.id}_${idx + 1}`;
                    const prevStu = prevStudentById.get(String(sid));
                    const avatar = prevStu && prevStu.avatar != null
                        ? Number(prevStu.avatar)
                        : (s.avatar != null && s.avatar !== '' ? Number(s.avatar) : (idx % 12));
                    nextStudents.push({
                        id: sid,
                        classId: cls.id,
                        no: s.no != null && s.no !== '' ? Number(s.no) : idx + 1,
                        code: s.code != null ? String(s.code).trim() : '',
                        prefix: s.prefix || '',
                        firstName: s.firstName || '',
                        lastName: s.lastName || '',
                        nick: s.nick || '',
                        avatar,
                    });
                });
            });

            const validClassIds = new Set(nextClasses.map((c) => c.id));
            const validStudentIds = new Set(nextStudents.map((s) => s.id));
            nextClasses.forEach((c) => {
                if (Array.isArray(c.groups)) {
                    c.groups = c.groups.map((g) => Object.assign({}, g, {
                        members: Array.isArray(g.members) ? g.members.filter((id) => validStudentIds.has(id)) : [],
                    }));
                }
            });

            if (JSON.stringify(d.classes) !== JSON.stringify(nextClasses) || JSON.stringify(d.students) !== JSON.stringify(nextStudents)) {
                d.classes = nextClasses;
                d.students = nextStudents;
                changed = true;
            }
            if (d.settings && !validClassIds.has(d.settings.classId)) {
                d.settings.classId = nextClasses[0] ? nextClasses[0].id : '';
                changed = true;
            }
        }

        // 4. ซิงค์รายชื่อผู้เล่นเข้าแอป "เกมเศรษฐีตอบคำถามหน้าชั้นเรียน" (vs-millionaire-quiz)
        if (appId === 'vs-millionaire-quiz' && Array.isArray(d.players)) {
            if (d.players.length === 0 && classes.length > 0) {
                classes.forEach((cls) => {
                    (cls.students || []).forEach((s, idx) => {
                        const fullName = `${s.prefix || ''}${s.firstName || ''}${s.lastName ? ' ' + s.lastName : ''}`.trim();
                        if (fullName) {
                            d.players.push({
                                id: s.id || `p_${cls.id}_${idx + 1}`,
                                name: fullName,
                                className: cls.name,
                                type: 'single',
                            });
                            changed = true;
                        }
                    });
                });
            }
        }

        return changed;
    }

    /* =====================================================================
       สร้างแถบนำทางส่วนกลาง (SBY Portal Floating Top Ribbon)
       ===================================================================== */
    let statusBadgeEl = null;

    function setSyncState(state, text) {
        if (!statusBadgeEl) return;
        const states = {
            synced: { icon: 'fa-cloud-check', color: '#10b981', bg: 'rgba(16,185,129,0.14)', label: text || 'บันทึกออนไลน์แล้ว' },
            syncing: { icon: 'fa-arrows-rotate fa-spin', color: '#f59e0b', bg: 'rgba(245,158,11,0.16)', label: text || 'กำลังซิงค์ข้อมูล...' },
            local: { icon: 'fa-laptop-file', color: '#94a3b8', bg: 'rgba(148,163,184,0.16)', label: text || 'บันทึกในเครื่อง (ออฟไลน์)' },
            error: { icon: 'fa-triangle-exclamation', color: '#ef4444', bg: 'rgba(239,68,68,0.16)', label: text || 'ซิงค์ไม่สำเร็จ (เก็บในเครื่องแล้ว)' },
        };
        const st = states[state] || states.local;
        statusBadgeEl.style.background = st.bg;
        statusBadgeEl.style.color = st.color;
        statusBadgeEl.innerHTML = `<i class="fas ${st.icon}"></i><span>${st.label}</span>`;
    }

    function injectPortalRibbon(currentApp) {
        if (document.getElementById('sby-portal-ribbon')) return;

        const style = document.createElement('style');
        style.textContent = `
            :root {
                --sby-ribbon-h: 42px;
            }
            body.sby-has-ribbon {
                padding-top: var(--sby-ribbon-h);
            }
            body.sby-has-ribbon .app-shell {
                min-height: calc(100vh - var(--sby-ribbon-h));
            }
            body.sby-has-ribbon .app-sidebar {
                top: var(--sby-ribbon-h) !important;
                height: calc(100vh - var(--sby-ribbon-h));
            }
            body.sby-has-ribbon .app-topbar {
                top: var(--sby-ribbon-h) !important;
            }
            body.sby-has-ribbon .sb-backdrop {
                top: var(--sby-ribbon-h) !important;
            }
            #sby-portal-ribbon {
                background: linear-gradient(90deg, #001a66 0%, #002899 60%, #1e3a8a 100%);
                color: #ffffff;
                font-family: 'Sarabun', sans-serif;
                font-size: 13px;
                height: var(--sby-ribbon-h);
                padding: 0 14px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.22);
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 1050;
                user-select: none;
            }
            #sby-portal-ribbon .sby-rb-left {
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 0;
                flex: 1 1 auto;
            }
            #sby-portal-ribbon .sby-rb-right {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-shrink: 0;
            }
            #sby-portal-ribbon .sby-home-btn {
                display: inline-flex;
                align-items: center;
                gap: 7px;
                background: rgba(255,255,255,0.16);
                color: #ffffff;
                text-decoration: none;
                padding: 4px 11px;
                border-radius: 7px;
                font-weight: 700;
                white-space: nowrap;
                flex-shrink: 0;
                transition: background 0.18s ease, transform 0.15s ease;
                border: 1px solid rgba(255,255,255,0.26);
            }
            #sby-portal-ribbon .sby-home-btn:hover {
                background: rgba(255,255,255,0.28);
                color: #ffffff;
                transform: translateY(-1px);
            }
            #sby-portal-ribbon .sby-home-btn img {
                width: 20px;
                height: 20px;
                object-fit: contain;
                background: #fff;
                border-radius: 50%;
                padding: 1px;
            }
            #sby-portal-ribbon .sby-app-switcher {
                display: flex;
                align-items: center;
                gap: 4px;
                overflow-x: auto;
                scrollbar-width: none;
                min-width: 0;
            }
            #sby-portal-ribbon .sby-app-switcher::-webkit-scrollbar {
                display: none;
            }
            #sby-portal-ribbon .sby-app-pill {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                color: rgba(255,255,255,0.85);
                text-decoration: none;
                padding: 4px 9px;
                border-radius: 6px;
                font-size: 12.5px;
                font-weight: 500;
                white-space: nowrap;
                flex-shrink: 0;
                transition: all 0.15s ease;
            }
            #sby-portal-ribbon .sby-app-pill:hover {
                background: rgba(255,255,255,0.16);
                color: #fff;
            }
            #sby-portal-ribbon .sby-app-pill.active {
                background: #ffffff;
                color: #001a66;
                font-weight: 700;
                box-shadow: 0 1px 4px rgba(0,0,0,0.2);
            }
            #sby-portal-ribbon .sby-sync-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 3px 10px;
                border-radius: 99px;
                font-size: 12px;
                font-weight: 600;
                white-space: nowrap;
            }
            #sby-portal-ribbon .sby-roster-btn {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                background: rgba(250,204,21,0.18);
                color: #fde047;
                border: 1px solid rgba(250,204,21,0.35);
                padding: 3px 9px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                white-space: nowrap;
                text-decoration: none;
                transition: all 0.15s ease;
            }
            #sby-portal-ribbon .sby-roster-btn:hover {
                background: rgba(250,204,21,0.3);
                color: #fef08a;
            }
            #sby-portal-ribbon .sby-teacher-tag {
                color: rgba(255,255,255,0.92);
                font-size: 12px;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                white-space: nowrap;
            }
            /* ปุ่มกลับหน้าหลักภายในแถบเมนูด้านซ้าย (.app-sidebar) */
            #sby-sb-home-wrap {
                padding: 10px 12px 6px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.14);
                flex: 0 0 auto;
            }
            #sby-sb-home-wrap .sby-sb-home-link {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 9px 12px;
                border-radius: 11px;
                background: rgba(255, 255, 255, 0.16);
                border: 1px solid rgba(255, 255, 255, 0.28);
                color: #ffffff;
                text-decoration: none;
                font-weight: 700;
                font-size: 0.9rem;
                transition: background 0.18s ease, transform 0.15s ease;
            }
            #sby-sb-home-wrap .sby-sb-home-link:hover {
                background: rgba(255, 255, 255, 0.28);
                color: #ffffff;
                transform: translateX(2px);
            }
            #sby-sb-home-wrap .sby-sb-home-link i {
                width: 20px;
                text-align: center;
            }
            @media (max-width: 1120px) {
                #sby-portal-ribbon .sby-teacher-tag { display: none; }
            }
            @media (max-width: 920px) {
                #sby-portal-ribbon .sby-app-switcher { display: none; }
            }
            /* ซ่อนแถบ Portal อัตโนมัติในโหมดฉายเต็มจอและขณะพิมพ์ */
            body.stage-on #sby-portal-ribbon,
            body.game-fs #sby-portal-ribbon,
            body.stage-full #sby-portal-ribbon,
            :fullscreen #sby-portal-ribbon {
                display: none !important;
            }
            :fullscreen body.sby-has-ribbon,
            body.stage-on,
            body.game-fs,
            body.stage-full {
                padding-top: 0 !important;
            }
            :fullscreen body.sby-has-ribbon .app-sidebar,
            :fullscreen body.sby-has-ribbon .app-topbar,
            :fullscreen body.sby-has-ribbon .sb-backdrop {
                top: 0 !important;
            }
            :fullscreen body.sby-has-ribbon .app-sidebar {
                height: 100vh !important;
            }
            @media print {
                body.sby-has-ribbon { padding-top: 0 !important; }
                #sby-portal-ribbon, #sby-sb-home-wrap { display: none !important; }
            }
        `;
        document.head.appendChild(style);
        if (document.body && document.body.classList) {
            document.body.classList.add('sby-has-ribbon');
        }

        const { user } = getAuth();
        const bar = document.createElement('div');
        bar.id = 'sby-portal-ribbon';
        bar.innerHTML = `
            <div class="sby-rb-left">
                <a href="/index.html" class="sby-home-btn" title="กลับหน้าเว็บไซต์หลัก ศูนย์รวมสื่อการสอน โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน">
                    <img src="/assets/img/school-logo.png" alt="สบ.">
                    <i class="fas fa-house"></i>
                    <span>หน้าหลักศูนย์สื่อฯ สบ.</span>
                </a>
                <nav class="sby-app-switcher" aria-label="สลับสื่อการสอน">
                    ${APPS_META.map((a) => `
                        <a href="${a.path}" class="sby-app-pill${a.id === currentApp.id ? ' active' : ''}" title="${a.name}">
                            <i class="fas ${a.icon}"></i>
                            <span>${a.short}</span>
                        </a>
                    `).join('')}
                </nav>
            </div>
            <div class="sby-rb-right">
                <button type="button" class="sby-roster-btn" id="sby-pull-roster-btn" title="ดึงรายชื่อนักเรียนและข้อมูลโรงเรียนจากฐานข้อมูลกลาง">
                    <i class="fas fa-users-gear"></i>
                    <span>ซิงค์รายชื่อนักเรียนกลาง</span>
                </button>
                <span class="sby-sync-badge" id="sby-sync-badge"></span>
                ${user ? `<span class="sby-teacher-tag"><i class="fas fa-user-check"></i><span>${user.name || user.email}</span></span>` : `<a href="/index.html" class="sby-roster-btn"><i class="fas fa-right-to-bracket"></i><span>เข้าสู่ระบบครู</span></a>`}
            </div>
        `;
        document.body.insertBefore(bar, document.body.firstChild);
        statusBadgeEl = document.getElementById('sby-sync-badge');

        // แทรกเมนูลิงก์ "กลับหน้าหลักศูนย์สื่อการสอน สบ." ไว้ด้านบนของแถบเมนูด้านซ้าย (.app-sidebar)
        const sidebar = document.querySelector && document.querySelector('.app-sidebar');
        if (sidebar && !document.getElementById('sby-sb-home-wrap')) {
            const sbHome = document.createElement('div');
            sbHome.id = 'sby-sb-home-wrap';
            sbHome.innerHTML = `
                <a href="/index.html" class="sby-sb-home-link" title="กลับหน้าหลัก ศูนย์รวมสื่อการสอน โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน">
                    <i class="fas fa-arrow-left"></i>
                    <span>กลับหน้าหลักศูนย์สื่อฯ สบ.</span>
                </a>
            `;
            const sbMenu = sidebar.querySelector('.sb-menu');
            if (sbMenu) sidebar.insertBefore(sbHome, sbMenu);
            else sidebar.appendChild(sbHome);
        }

        const pullBtn = document.getElementById('sby-pull-roster-btn');
        if (pullBtn) {
            pullBtn.addEventListener('click', () => manualPullMasterRoster(currentApp));
        }
    }

    /* =====================================================================
       ระบบดึงและบันทึกข้อมูลกับ Cloudflare Pages Functions API
       ===================================================================== */
    let isPulling = false;
    let syncTimer = null;

    async function pushAppDataToCloud(currentApp) {
        if (isPulling || !window.Store || !Store.data) return;
        const { token, user } = getAuth();
        if (!token || !user) {
            setSyncState('local', 'โหมดออฟไลน์ (ไม่ได้ล็อกอิน)');
            return;
        }

        setSyncState('syncing', 'กำลังบันทึกออนไลน์...');
        try {
            const res = await fetch('/api/app-data', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    appId: currentApp.id,
                    data: Store.data,
                    syncMasterRoster: false,
                }),
            });
            if (res.ok) {
                const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                setSyncState('synced', `ซิงค์ออนไลน์แล้ว ${timeStr} น.`);
            } else {
                setSyncState('error', 'บันทึกคลาวด์ไม่สำเร็จ');
            }
        } catch (err) {
            setSyncState('local', 'ออฟไลน์ (บันทึกในเครื่องแล้ว)');
        }
    }

    function scheduleCloudPush(currentApp) {
        if (isPulling) return;
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => pushAppDataToCloud(currentApp), 1200);
    }

    function refreshAppView(d) {
        if (!window.Store) return;
        if (typeof Store.replaceAll === 'function') {
            Store.replaceAll(d, 'cloud-sync');
        } else if (typeof Store.replace === 'function') {
            Store.replace(d);
        }
        if (window.App && typeof App.refreshChrome === 'function') App.refreshChrome();
        if (window.App && typeof App.render === 'function') App.render();
    }

    async function manualPullMasterRoster(currentApp) {
        const { token } = getAuth();
        let roster = getMasterRosterLocal();

        if (token) {
            setSyncState('syncing', 'กำลังดึงรายชื่อกลาง...');
            try {
                const res = await fetch('/api/roster', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.ok) {
                        roster = { schoolProfile: json.schoolProfile, classes: json.classes };
                        saveMasterRosterLocal(roster);
                    }
                }
            } catch (e) { /* fallback to local master roster */ }
        }

        if (!roster || (!roster.classes?.length && !roster.schoolProfile?.name)) {
            if (window.U && U.toast) {
                U.toast('ยังไม่มีรายชื่อนักเรียนในฐานข้อมูลกลาง คุณครูสามารถเพิ่มได้ที่หน้าเว็บไซต์หลัก หรือนำเข้าจาก Excel ในหน้านี้ได้เลย', { type: 'warn', ms: 5000 });
            }
            setSyncState(token ? 'synced' : 'local');
            return;
        }

        isPulling = true;
        try {
            const copy = JSON.parse(JSON.stringify(Store.data));
            // บังคับอัปเดตรายชื่อนักเรียนและข้อมูลโรงเรียนจากส่วนกลาง
            if (copy.school && roster.schoolProfile) {
                Object.assign(copy.school, {
                    name: roster.schoolProfile.name || copy.school.name,
                    agency: roster.schoolProfile.agency || copy.school.agency,
                    academicYear: roster.schoolProfile.academicYear || copy.school.academicYear,
                    semester: roster.schoolProfile.semester || copy.school.semester,
                    director: roster.schoolProfile.director || copy.school.director,
                    teacherName: roster.schoolProfile.teacherName || copy.school.teacherName,
                    teacherPosition: roster.schoolProfile.teacherPosition || copy.school.teacherPosition,
                });
            }
            applyMasterRosterToApp(currentApp.id, copy, roster);
            refreshAppView(copy);
            if (window.U && U.toast) {
                U.toast(`ซิงค์ข้อมูลโรงเรียนและรายชื่อนักเรียนส่วนกลาง (${(roster.classes || []).length} ห้องเรียน) เรียบร้อยแล้ว`, { type: 'ok', ms: 4000 });
            }
        } finally {
            isPulling = false;
            scheduleCloudPush(currentApp);
        }
    }

    async function bootSync(currentApp) {
        const { token, user } = getAuth();
        const localRoster = getMasterRosterLocal();
        const initialLocalUpdated = window.Store && Store.data && Store.data.updatedAt
            ? new Date(Store.data.updatedAt).getTime() || 0
            : 0;
        const initialLocalEmpty = window.Store && typeof Store.isEmpty === 'function' ? Store.isEmpty() : false;

        // 1. หากมี Master Roster ในเครื่อง ให้ซิงค์ข้อมูลโรงเรียนและห้องเรียนตั้งต้นทันที
        if (localRoster && window.Store && Store.data) {
            isPulling = true;
            try {
                const copy = JSON.parse(JSON.stringify(Store.data));
                if (applyMasterRosterToApp(currentApp.id, copy, localRoster)) {
                    refreshAppView(copy);
                }
            } finally {
                isPulling = false;
            }
        }

        if (!token || !user) {
            setSyncState('local', 'บันทึกในเครื่อง (ยังไม่ได้ล็อกอิน)');
            return;
        }

        setSyncState('syncing', 'กำลังโหลดข้อมูลออนไลน์...');
        try {
            const [appRes, rosterRes] = await Promise.all([
                fetch(`/api/app-data?appId=${encodeURIComponent(currentApp.id)}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                }),
                fetch('/api/roster', {
                    headers: { 'Authorization': `Bearer ${token}` },
                }),
            ]);

            let roster = localRoster;
            if (rosterRes.ok) {
                const rJson = await rosterRes.json();
                if (rJson.ok) {
                    roster = { schoolProfile: rJson.schoolProfile, classes: rJson.classes };
                    saveMasterRosterLocal(roster);
                }
            }

            if (appRes.ok) {
                const aJson = await appRes.json();
                let shouldPush = false;
                isPulling = true;
                try {
                    if (aJson.ok && aJson.data) {
                        const cloudData = aJson.data;
                        const cloudUpdated = cloudData.updatedAt ? new Date(cloudData.updatedAt).getTime() || 0 : 0;

                        if (initialLocalEmpty || cloudUpdated >= initialLocalUpdated) {
                            if (roster && applyMasterRosterToApp(currentApp.id, cloudData, roster)) {
                                shouldPush = true;
                            }
                            refreshAppView(cloudData);
                        } else {
                            shouldPush = true;
                            if (roster) {
                                const copy = JSON.parse(JSON.stringify(Store.data));
                                if (applyMasterRosterToApp(currentApp.id, copy, roster)) {
                                    refreshAppView(copy);
                                }
                            }
                        }
                    } else {
                        shouldPush = true;
                        if (roster) {
                            const copy = JSON.parse(JSON.stringify(Store.data));
                            if (applyMasterRosterToApp(currentApp.id, copy, roster)) {
                                refreshAppView(copy);
                            }
                        }
                    }
                } finally {
                    isPulling = false;
                }
                setSyncState('synced', 'ซิงค์ออนไลน์พร้อมใช้งาน');
                // หากบน Cloud ยังไม่มีข้อมูลของแอปนี้ หรือ Master Roster มีการปรับรายการห้อง/รหัสนักเรียน ให้ซิงค์ app_states ขึ้น Cloud
                if (shouldPush) {
                    scheduleCloudPush(currentApp);
                }
            } else {
                setSyncState('local', 'ใช้ข้อมูลในเครื่อง');
            }
        } catch (err) {
            setSyncState('local', 'โหมดออฟไลน์ (บันทึกในเครื่อง)');
        }
    }

    function init() {
        const currentApp = detectCurrentApp();
        injectPortalRibbon(currentApp);

        if (window.Store && typeof Store.on === 'function') {
            Store.on(() => {
                scheduleCloudPush(currentApp);
            });
        }
        bootSync(currentApp);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 50);
    }
})();
