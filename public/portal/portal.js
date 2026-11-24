/* =====================================================================
   SBY Teacher Media Hub — Main Portal Controller (portal.js)
   รวมสื่อการสอนสำหรับครูมืออาชีพ โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน
   พัฒนาระบบโดย ครูทวีป นวคุณานนท์
   ===================================================================== */
(function () {
    'use strict';

    const TOKEN_KEY = 'sby_media_hub.auth_token.v1';
    const USER_KEY = 'sby_media_hub.auth_user.v1';
    const MASTER_ROSTER_KEY = 'sby_media_hub.master_roster.v1';
    const LOCAL_TEACHERS_KEY = 'sby_media_hub.local_teachers.v1';

    const STUDENT_EMAIL_RE = /^sby_\d{5}@sby\.ac\.th$/i;

    const APPS = [
        {
            id: 'vs-random-picker',
            slug: 'wheel',
            storageKey: 'vs_random_picker.data.v1',
            tag: 'ระบบสุ่ม & จัดกลุ่ม',
            name: 'วงล้อสุ่มรายชื่อนักเรียน',
            desc: 'สุ่มชื่อด้วยวงล้อเรขาคณิต สุ่มจับกลุ่มคละเพศชาย-หญิง สุ่มลำดับนำเสนอ สุ่มตัวเลข จับฉลากของรางวัล และสุ่มผังที่นั่งในชั้นเรียน',
            icon: 'fa-dharmachakra',
            gradient: 'linear-gradient(135deg, #be123c 0%, #e11d48 55%, #fb7185 100%)',
            path: 'apps/wheel/index.html',
            manual: 'apps/wheel/docs/คู่มือการใช้งาน.pdf',
            features: ['วงล้อสุ่มชื่อ', 'จับกลุ่มคละเพศ', 'สุ่มผังที่นั่ง', 'รายงาน .docx'],
            usesRoster: true,
        },
        {
            id: 'vs-class-points',
            slug: 'class-points',
            storageKey: 'vs_class_points.data.v1',
            tag: 'บริหารจัดการชั้นเรียน',
            name: 'กระดานแต้มพฤติกรรมห้องเรียน',
            desc: 'สะสมแต้มความดีและทักษะเชิงบวก รายบุคคลและรายกลุ่ม แลกของรางวัลในชั้นเรียน พร้อมกราฟสถิติและรายงานสรุปพฤติกรรม',
            icon: 'fa-star',
            gradient: 'linear-gradient(135deg, #0369a1 0%, #0284c7 55%, #38bdf8 100%)',
            path: 'apps/class-points/index.html',
            manual: 'apps/class-points/docs/คู่มือการใช้งาน.pdf',
            features: ['ให้แต้มรายคน/กลุ่ม', 'อวตารนักเรียน', 'แลกของรางวัล', 'รายงาน .docx'],
            usesRoster: true,
        },
        {
            id: 'vs-millionaire-quiz',
            slug: 'millionaire',
            storageKey: 'vs_millionaire_quiz.data.v1',
            tag: 'เกมแข่งขันตอบคำถาม',
            name: 'เกมเศรษฐีตอบคำถามหน้าชั้นเรียน',
            desc: 'เกมตอบคำถามไต่ระดับคะแนน 15 ขั้น พร้อมตัวช่วย 50:50 โหวตถามเพื่อนในห้อง เปลี่ยนคำถาม และระบบออกเกียรติบัตรอัตโนมัติ',
            icon: 'fa-trophy',
            gradient: 'linear-gradient(135deg, #312e81 0%, #4338ca 55%, #6366f1 100%)',
            path: 'apps/millionaire/index.html',
            manual: 'apps/millionaire/docs/คู่มือการใช้งาน.pdf',
            features: ['บันไดคะแนน 15 ขั้น', 'ตัวช่วย 3 รูปแบบ', 'โหมดเดี่ยว & ทีม', 'พิมพ์เกียรติบัตร'],
            usesRoster: true,
        },
        {
            id: 'vs-memory-game',
            slug: 'memory',
            storageKey: 'vs_memory_game.data.v1',
            tag: 'เกมฝึกสมอง & ทบทวนบทเรียน',
            name: 'เกมจับคู่ความจำและเกมทายใจ',
            desc: 'เกมเปิดไพ่จับคู่ คำ-ความหมาย ภาพ-คำ โจทย์-คำตอบ รวมถึงโหมดลากเส้นจับคู่ โหมดทายใจ และกล่องสุ่มรางวัลหน้าชั้นเรียน',
            icon: 'fa-clone',
            gradient: 'linear-gradient(135deg, #6b21a8 0%, #9333ea 55%, #c084fc 100%)',
            path: 'apps/memory/index.html',
            manual: 'apps/memory/docs/คู่มือการใช้งาน.pdf',
            features: ['เปิดไพ่จับคู่', 'ลากเส้น & ทายใจ', 'รองรับรูปภาพ/อีโมจิ', 'รายงานผล .docx'],
            usesRoster: true,
        },
        {
            id: 'vs-snake-ladder-quiz',
            slug: 'snake-ladder',
            storageKey: 'vs_snake_ladder_quiz.data.v1',
            tag: 'เกมกระดาน интеракティブ',
            name: 'เกมบันไดงูตอบคำถามหน้าชั้นเรียน',
            desc: 'ทอยลูกเต๋าเดินบนกระดานบันไดงู ตกช่องคำถามต้องตอบให้ทันเวลา ตอบถูกเดินหน้า ตอบผิดถอยหลัง แข่งขันได้สูงสุดหลายทีมพร้อมกัน',
            icon: 'fa-dice',
            gradient: 'linear-gradient(135deg, #166534 0%, #16a34a 55%, #4ade80 100%)',
            path: 'apps/snake-ladder/index.html',
            manual: 'apps/snake-ladder/docs/คู่มือการใช้งาน.pdf',
            features: ['กระดานอัตโนมัติ', 'ปรนัย/ถูกผิด/เติมคำ', 'นำเข้าข้อสอบ Excel', 'บันทึกข้อความ .docx'],
            usesRoster: true,
        },
        {
            id: 'vs-buzzer',
            slug: 'buzzer',
            storageKey: 'vs_buzzer.data.v1',
            tag: 'แข่งขันความไวหน้าชั้นเรียน',
            name: 'ระบบกดปุ่มตอบเร็ว (Buzzer)',
            desc: 'เปลี่ยนคีย์บอร์ดหรือหน้าจอสัมผัสเป็นปุ่มกดชิงสิทธิ์ตอบคำถาม รองรับ 2–8 ทีม จับเวลาตอบ ตัดคะแนนเมื่อตอบผิด หรือโยนสิทธิ์ให้ทีมอื่น',
            icon: 'fa-bell',
            gradient: 'linear-gradient(135deg, #9a3412 0%, #ea580c 55%, #fb923c 100%)',
            path: 'apps/buzzer/index.html',
            manual: 'apps/buzzer/docs/คู่มือการใช้งาน.pdf',
            features: ['รองรับ 2-8 ทีม', 'ตั้งปุ่มคีย์ลัดอิสระ', 'คลังคำถามพร้อมภาพ', 'สรุปผล & เกียรติบัตร'],
            usesRoster: true,
        },
        {
            id: 'vs-classroom-timer',
            slug: 'timer',
            storageKey: 'vs_classroom_timer.data.v1',
            tag: 'เครื่องมือควบคุมเวลา & ชั้นเรียน',
            name: 'นาฬิกาจับเวลาหน้าชั้นเรียน',
            desc: 'นาฬิกาจับเวลาขนาดใหญ่สำหรับจอโปรเจกเตอร์ ตั้งชุดจับเวลาหลายช่วงต่อเนื่อง ตารางออดคาบเรียน และไฟจราจรวัดระดับเสียงดังผ่านไมโครโฟน',
            icon: 'fa-stopwatch',
            gradient: 'linear-gradient(135deg, #115e59 0%, #0d9488 55%, #2dd4bf 100%)',
            path: 'apps/timer/index.html',
            manual: 'apps/timer/docs/คู่มือการใช้งาน.pdf',
            features: ['เวลาด่วน 1-15 นาที', 'ไฟจราจรวัดเสียงดัง', 'จับเวลาหลายช่วง', 'ตารางออดคาบเรียน'],
            usesRoster: false,
        },
    ];

    const DEFAULT_ROSTER = {
        schoolProfile: {
            name: 'โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
            agency: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาลำพูน ลำปาง',
            director: '',
            academicYear: String(new Date().getFullYear() + 543),
            semester: '1',
            teacherName: 'ครูทวีป นวคุณานนท์',
            teacherPosition: 'ครูชำนาญการพิเศษ',
        },
        classes: [
            {
                id: 'cls_m2_1',
                name: 'ม.2/1',
                note: 'ห้องเรียนตัวอย่าง โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
                students: [
                    { id: 's_1', no: 1, code: '26201', prefix: 'ด.ช.', firstName: 'ธนกฤต', lastName: 'สุขสวัสดิ์', nick: 'ต้นกล้า', gender: 'm' },
                    { id: 's_2', no: 2, code: '26202', prefix: 'ด.ช.', firstName: 'ภูมิพัฒน์', lastName: 'ศรีสุข', nick: 'ภูมิ', gender: 'm' },
                    { id: 's_3', no: 3, code: '26203', prefix: 'ด.ช.', firstName: 'ณัฐวุฒิ', lastName: 'แก้วมณี', nick: 'บอส', gender: 'm' },
                    { id: 's_4', no: 4, code: '26204', prefix: 'ด.ญ.', firstName: 'ณัฐธิดา', lastName: 'ทองดี', nick: 'น้ำฝน', gender: 'f' },
                    { id: 's_5', no: 5, code: '26205', prefix: 'ด.ญ.', firstName: 'ปุณยวีร์', lastName: 'บุญมา', nick: 'ปุณ', gender: 'f' },
                    { id: 's_6', no: 6, code: '26206', prefix: 'ด.ญ.', firstName: 'กัญญาณัฐ', lastName: 'จันทร์หอม', nick: 'กัญ', gender: 'f' },
                ],
                groups: [],
            },
        ],
    };

    const DEFAULT_TEACHERS = [
        {
            email: 'taweep@sby.ac.th',
            name: 'ครูทวีป นวคุณานนท์',
            position: 'ครูชำนาญการพิเศษ',
            department: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี (คอมพิวเตอร์)',
            role: 'admin',
            is_active: 1,
            allow_external: 0,
        },
    ];

    let state = {
        currentTab: 'apps',
        token: localStorage.getItem(TOKEN_KEY) || '',
        user: null,
        googleClientId: '473018933968-vseqpb3eh0mj84viutv0dcrnipo3j9qs.apps.googleusercontent.com',
        roster: loadLocalRoster(),
        teachers: loadLocalTeachers(),
        activeClassId: '',
    };

    try {
        state.user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch (e) {
        state.user = null;
    }

    function esc(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function loadLocalRoster() {
        try {
            const raw = localStorage.getItem(MASTER_ROSTER_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify(DEFAULT_ROSTER));
        return JSON.parse(JSON.stringify(DEFAULT_ROSTER));
    }

    function saveLocalRoster(r) {
        state.roster = r;
        localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify(r));
        updateHeroStats();
    }

    function loadLocalTeachers() {
        try {
            const raw = localStorage.getItem(LOCAL_TEACHERS_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        localStorage.setItem(LOCAL_TEACHERS_KEY, JSON.stringify(DEFAULT_TEACHERS));
        return JSON.parse(JSON.stringify(DEFAULT_TEACHERS));
    }

    function saveLocalTeachers(list) {
        state.teachers = list;
        localStorage.setItem(LOCAL_TEACHERS_KEY, JSON.stringify(list));
    }

    function updateHeroStats() {
        const classes = state.roster?.classes || [];
        const totalStudents = classes.reduce((sum, c) => sum + ((c.students && c.students.length) || 0), 0);
        const stEl = document.getElementById('stat-total-students');
        const clEl = document.getElementById('stat-total-classes');
        if (stEl) stEl.textContent = `${totalStudents.toLocaleString()} คน`;
        if (clEl) clEl.textContent = `ในฐานข้อมูลกลาง ${classes.length} ห้องเรียน`;
    }

    /* =====================================================================
       ตรวจสอบอีเมลครู vs นักเรียน ตามกฎโรงเรียนส่วนบุญโญปถัมภ์ ลำพูน
       ===================================================================== */
    function checkEmailPermission(email) {
        const clean = String(email || '').trim().toLowerCase();
        if (!clean || !clean.includes('@')) {
            return { allowed: false, reason: 'กรุณากรอกอีเมลให้ถูกต้อง' };
        }
        // กฎข้อที่ 2: บล็อกอีเมลนักเรียน sby_เลขประจำตัวนักเรียนห้าหลัก@sby.ac.th ทันที
        if (STUDENT_EMAIL_RE.test(clean)) {
            return {
                allowed: false,
                isStudent: true,
                reason: `อีเมล "${clean}" เป็นรูปแบบอีเมลนักเรียน (sby_รหัส 5 หลัก@sby.ac.th) ระบบสงวนสิทธิ์เฉพาะคุณครูโรงเรียนส่วนบุญโญปถัมภ์ ลำพูน เท่านั้น`,
            };
        }
        const domain = clean.split('@')[1];
        const approved = state.teachers.find((t) => t.email.toLowerCase() === clean);
        if (approved) {
            if (!approved.is_active) {
                return { allowed: false, reason: 'บัญชีนี้ถูกระงับสิทธิ์ชั่วคราว กรุณาติดต่อผู้ดูแลระบบ' };
            }
            return { allowed: true, teacher: approved };
        }
        // กฎข้อที่ 1: หากเป็นโดเมน @sby.ac.th และไม่ใช่นักเรียน อนุญาตให้เข้าใช้งานเป็นครูได้
        if (domain === 'sby.ac.th') {
            return {
                allowed: true,
                teacher: {
                    email: clean,
                    name: clean === 'taweep@sby.ac.th' ? 'ครูทวีป นวคุณานนท์' : `คุณครู (${clean.split('@')[0]})`,
                    position: 'ครู',
                    department: 'โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
                    role: clean === 'taweep@sby.ac.th' ? 'admin' : 'teacher',
                    is_active: 1,
                },
            };
        }
        // หากเป็น @gmail.com หรือโดเมนอื่น ต้องอยู่ในรายชื่อที่ Admin อนุมัติรายบุคคลเท่านั้น
        return {
            allowed: false,
            reason: `อีเมล "${clean}" ไม่ใช่โดเมน @sby.ac.th และยังไม่อยู่ในรายชื่อที่ผู้ดูแลระบบอนุมัติเป็นรายบุคคล (คุณครูสามารถให้ Admin เพิ่มอีเมล @gmail.com ได้ที่เมนู "จัดการสิทธิ์ครู")`,
        };
    }

    /* =====================================================================
       เข้าสู่ระบบและออกจากระบบ
       ===================================================================== */
    async function performLogin(payload) {
        // 1. ลองเรียก Cloudflare Pages Function (/api/auth) ก่อน
        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (res.ok && json.ok) {
                state.token = json.token;
                state.user = json.teacher;
                localStorage.setItem(TOKEN_KEY, state.token);
                localStorage.setItem(USER_KEY, JSON.stringify(state.user));
                await fetchCloudRoster();
                if (state.user.role === 'admin') await fetchAdminTeachers();
                syncRosterToAllLocalApps();
                renderHeaderUser();
                renderMain();
                Swal.fire({
                    icon: 'success',
                    title: 'เข้าสู่ระบบสำเร็จ',
                    text: `ยินดีต้อนรับ ${state.user.name} (${state.user.email})`,
                    timer: 2000,
                    showConfirmButton: false,
                });
                return;
            }
            if (!res.ok && json.error) {
                Swal.fire({ icon: 'error', title: 'ไม่อนุญาตให้เข้าใช้งาน', text: json.error, confirmButtonColor: '#0d257c' });
                return;
            }
        } catch (err) {
            // กรณีรันผ่าน Static Preview / Offline Server ที่ไม่มี Cloudflare Worker runtime
        }

        // 2. ตรวจสอบด้วยกฎ Client-side Security Filter (รองรับทั้งโหมดจำลองและโหมด Static)
        const check = checkEmailPermission(payload.email);
        if (!check.allowed) {
            Swal.fire({
                icon: 'error',
                title: check.isStudent ? 'ตรวจพบอีเมลนักเรียน' : 'ไม่อนุญาตให้เข้าใช้งาน',
                text: check.reason,
                confirmButtonColor: '#e11d48',
            });
            return;
        }

        const t = check.teacher;
        if (payload.name) t.name = payload.name;
        // บันทึกครูเข้าทะเบียนหากยังไม่มี
        if (!state.teachers.some((x) => x.email.toLowerCase() === t.email.toLowerCase())) {
            state.teachers.push(t);
            saveLocalTeachers(state.teachers);
        }

        state.token = 'local_token_' + btoa(encodeURIComponent(t.email));
        state.user = t;
        localStorage.setItem(TOKEN_KEY, state.token);
        localStorage.setItem(USER_KEY, JSON.stringify(state.user));

        // อัปเดตชื่อครูใน schoolProfile
        if (state.roster && state.roster.schoolProfile) {
            state.roster.schoolProfile.teacherName = t.name;
            state.roster.schoolProfile.teacherPosition = t.position || 'ครู';
            saveLocalRoster(state.roster);
        }

        renderHeaderUser();
        renderMain();
        Swal.fire({
            icon: 'success',
            title: 'เข้าสู่ระบบสำเร็จ',
            text: `ยินดีต้อนรับ ${t.name} (${t.email})`,
            timer: 1800,
            showConfirmButton: false,
        });
    }

    function logout() {
        state.token = '';
        state.user = null;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        renderHeaderUser();
        renderMain();
    }

    async function fetchCloudRoster() {
        if (!state.token) return;
        try {
            const res = await fetch('/api/roster', {
                headers: { 'Authorization': `Bearer ${state.token}` },
            });
            if (res.ok) {
                const json = await res.json();
                if (json.ok && (json.classes?.length || json.schoolProfile?.name)) {
                    saveLocalRoster({
                        schoolProfile: Object.assign({}, DEFAULT_ROSTER.schoolProfile, json.schoolProfile || {}),
                        classes: json.classes && json.classes.length ? json.classes : state.roster.classes,
                    });
                }
            }
        } catch (e) { /* use local cache */ }
    }

    async function pushCloudRoster() {
        saveLocalRoster(state.roster);
        // ซิงค์เข้า localStorage ของทั้ง 7 แอปในเครื่องนี้ทันทีด้วย
        syncRosterToAllLocalApps();

        if (!state.token) return true;
        try {
            const res = await fetch('/api/roster', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.token}`,
                },
                body: JSON.stringify(state.roster),
            });
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    /**
     * ซิงค์ข้อมูลโรงเรียนและรายชื่อนักเรียนส่วนกลางเข้าสู่ LocalStorage ของทั้ง 7 แอปทันที
     */
    function syncRosterToAllLocalApps() {
        const sp = state.roster.schoolProfile || {};
        const classes = state.roster.classes || [];

        APPS.forEach((app) => {
            try {
                const raw = localStorage.getItem(app.storageKey);
                const d = raw ? JSON.parse(raw) : { app: app.id, schemaVersion: 1, updatedAt: new Date().toISOString() };
                d.school = Object.assign({}, d.school || {}, {
                    name: sp.name || 'โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
                    agency: sp.agency || 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาลำพูน ลำปาง',
                    academicYear: sp.academicYear || '2569',
                    semester: sp.semester || '1',
                    director: sp.director || '',
                    teacherName: sp.teacherName || '',
                    teacherPosition: sp.teacherPosition || '',
                    reporterName: sp.teacherName || '',
                    reporterPosition: sp.teacherPosition || '',
                    reporter: sp.teacherName || '',
                    reporterPos: sp.teacherPosition || '',
                });

                if (app.id === 'vs-random-picker') {
                    if (!Array.isArray(d.lists)) d.lists = [];
                    classes.forEach((cls) => {
                        const items = (cls.students || []).map((s, idx) => ({
                            id: s.id || `s_${cls.id}_${idx + 1}`,
                            no: Number(s.no) || idx + 1,
                            code: s.code || '',
                            prefix: s.prefix || '',
                            firstName: s.firstName || '',
                            lastName: s.lastName || '',
                            nick: s.nick || '',
                            gender: s.gender || '',
                            weight: 1,
                            active: true,
                            kind: 'class',
                        }));
                        const existing = d.lists.find((l) => l.id === cls.id || l.name === cls.name);
                        if (existing) {
                            existing.name = cls.name;
                            existing.note = cls.note || '';
                            existing.items = items;
                        } else {
                            d.lists.push({ id: cls.id, kind: 'class', name: cls.name, note: cls.note || '', items });
                        }
                    });
                    if (!d.currentListId && d.lists[0]) d.currentListId = d.lists[0].id;
                } else if (app.id === 'vs-class-points') {
                    if (!Array.isArray(d.classes)) d.classes = [];
                    if (!Array.isArray(d.students)) d.students = [];
                    classes.forEach((cls) => {
                        let ex = d.classes.find((c) => c.id === cls.id || c.name === cls.name);
                        if (!ex) {
                            ex = { id: cls.id, name: cls.name, groups: cls.groups || [] };
                            d.classes.push(ex);
                        } else {
                            ex.name = cls.name;
                        }
                        // แทนที่รายชื่อนักเรียนในห้องนั้นโดยคงรหัส ID เดิมไว้ให้แต้มไม่หาย
                        d.students = d.students.filter((s) => s.classId !== ex.id);
                        (cls.students || []).forEach((s, idx) => {
                            d.students.push({
                                id: s.id || `s_${ex.id}_${idx + 1}`,
                                classId: ex.id,
                                no: Number(s.no) || idx + 1,
                                prefix: s.prefix || '',
                                firstName: s.firstName || '',
                                lastName: s.lastName || '',
                                nick: s.nick || '',
                                avatar: Number(s.avatar) || (idx % 12),
                            });
                        });
                    });
                }

                d.updatedAt = new Date().toISOString();
                localStorage.setItem(app.storageKey, JSON.stringify(d));
            } catch (e) { /* ignore */ }
        });
    }

    /* =====================================================================
       Render Top Header User Info
       ===================================================================== */
    function mountGoogleButton(targetEl, attempt = 0) {
        if (!targetEl) return;
        if (window.google && google.accounts && google.accounts.id && state.googleClientId) {
            targetEl.innerHTML = '';
            google.accounts.id.initialize({
                client_id: state.googleClientId,
                callback: (resp) => {
                    if (Swal.isVisible()) Swal.close();
                    performLogin({ credential: resp.credential });
                },
            });
            google.accounts.id.renderButton(targetEl, {
                theme: 'filled_blue',
                size: 'large',
                shape: 'pill',
                text: 'signin_with',
                width: 300,
                locale: 'th',
            });
            return;
        }
        if (attempt < 25) {
            setTimeout(() => mountGoogleButton(targetEl, attempt + 1), 250);
        } else {
            targetEl.innerHTML = '<div style="color:#be123c;font-size:13px;">ไม่สามารถโหลดปุ่ม Google Sign-In ได้ กรุณารีเฟรชหน้าเว็บหรือตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</div>';
        }
    }

    function renderHeaderUser() {
        const box = document.getElementById('nav-user-box');
        const navTabs = document.getElementById('portal-nav-tabs');
        const adminBtn = document.getElementById('tab-btn-admin');
        if (!box) return;

        if (!state.user || !state.token) {
            if (navTabs) navTabs.style.display = 'none';
            box.innerHTML = `
                <button type="button" class="sby-btn sby-btn-primary sby-btn-sm" id="header-login-btn">
                    <i class="fab fa-google"></i><span>เข้าสู่ระบบครู (@sby.ac.th)</span>
                </button>
            `;
            document.getElementById('header-login-btn').onclick = () => showLoginModal();
            return;
        }

        if (navTabs) navTabs.style.display = 'flex';
        if (adminBtn) adminBtn.style.display = state.user.role === 'admin' ? 'inline-flex' : 'none';

        const u = state.user;
        const initials = (u.name || u.email || 'ครู').slice(0, 2);
        box.innerHTML = `
            <div class="sby-user-chip">
                ${u.avatarUrl ? `<img src="${esc(u.avatarUrl)}" alt="" class="sby-user-avatar">` : `<div class="sby-user-avatar">${esc(initials)}</div>`}
                <div class="sby-user-meta">
                    <b>${esc(u.name)}</b>
                    <small>${esc(u.email)} ${u.role === 'admin' ? '• <span style="color:#e11d48;font-weight:700;">Admin</span>' : ''}</small>
                </div>
            </div>
            <button type="button" class="sby-btn sby-btn-outline sby-btn-sm" id="header-logout-btn" title="ออกจากระบบ">
                <i class="fas fa-right-from-bracket"></i>
            </button>
        `;
        document.getElementById('header-logout-btn').onclick = logout;
    }

    function showLoginModal() {
        Swal.fire({
            title: 'เข้าสู่ระบบสำหรับครู โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
            html: `
                <div style="text-align:left;font-size:14px;">
                    <div class="sby-policy-box" style="margin-top:8px;">
                        <b style="color:#07164a;"><i class="fas fa-shield-check"></i> เงื่อนไขการตรวจสอบสิทธิ์อัตโนมัติ:</b>
                        <ul>
                            <li>อนุญาตเฉพาะคุณครูที่ใช้อีเมลโรงเรียน <b>@sby.ac.th</b></li>
                            <li>ระบบกรองและ<b>ไม่อนุญาต</b>อีเมลนักเรียน (<code>sby_รหัส 5 หลัก@sby.ac.th</code>) โดยอัตโนมัติ</li>
                            <li>รองรับอีเมล <b>@gmail.com</b> เฉพาะรายบุคคลที่ผู้ดูแลระบบ (Admin) อนุมัติไว้แล้ว</li>
                        </ul>
                    </div>
                    <div id="g-signin-modal-wrap" style="display:flex;justify-content:center;margin:20px 0 10px;min-height:44px;">
                        <span style="color:#64748b;font-size:13px;"><i class="fas fa-spinner fa-spin"></i> กำลังโหลดปุ่ม Sign in with Google...</span>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'ปิดหน้าต่าง',
            didOpen: () => {
                mountGoogleButton(document.getElementById('g-signin-modal-wrap'));
            },
        });
    }

    /* =====================================================================
       TAB 1: คลังสื่อการสอนทั้ง 7 ระบบ (Media Launcher Grid)
       ===================================================================== */
    function getAppSummaryText(app) {
        try {
            const raw = localStorage.getItem(app.storageKey);
            if (!raw) return 'พร้อมเริ่มใช้งาน (เชื่อมข้อมูลนักเรียนกลางแล้ว)';
            const d = JSON.parse(raw);
            if (app.id === 'vs-random-picker') {
                return `มี ${(d.lists || []).length} ห้องเรียน • ประวัติสุ่ม ${(d.history || []).length} ครั้ง`;
            }
            if (app.id === 'vs-class-points') {
                return `มี ${(d.classes || []).length} ห้อง • นักเรียน ${(d.students || []).length} คน • ให้แต้ม ${(d.events || []).length} ครั้ง`;
            }
            if (app.id === 'vs-millionaire-quiz') {
                return `ชุดคำถาม ${(d.sets || []).length} ชุด • ผู้เล่น/ทีม ${(d.players || []).length + (d.teams || []).length} รายการ`;
            }
            if (app.id === 'vs-memory-game') {
                return `ชุดการ์ดจับคู่ ${(d.sets || []).length} ชุด • ประวัติการเล่น ${(d.games || []).length} เกม`;
            }
            if (app.id === 'vs-snake-ladder-quiz') {
                return `ชุดคำถาม ${(d.sets || []).length} ชุด • กระดาน ${(d.boards || []).length} แบบ`;
            }
            if (app.id === 'vs-buzzer') {
                return `คลังคำถาม ${(d.questions || []).length} ข้อ • ทีมแข่งขัน ${(d.teams || []).length} ทีม`;
            }
            if (app.id === 'vs-classroom-timer') {
                return `ชุดจับเวลาต่อเนื่อง ${(d.sequences || []).length} ชุด • รองรับไฟจราจรวัดเสียง`;
            }
        } catch (e) { /* ignore */ }
        return 'พร้อมใช้งานทันที';
    }

    function renderAppsTab(container) {
        container.innerHTML = `
            <div class="sby-section-header">
                <div class="sby-section-title">
                    <h2><i class="fas fa-layer-group" style="color:#e11d48;margin-right:8px;"></i>คลังสื่อการสอนและเกมการศึกษาเชิงรุก (7 ระบบ)</h2>
                    <p>เลือกสื่อการสอนที่ต้องการเปิดใช้งานบนจอโปรเจกเตอร์ ข้อมูลรายชื่อนักเรียนและข้อมูลโรงเรียนจะเชื่อมโยงถึงกันอัตโนมัติ</p>
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button type="button" class="sby-btn sby-btn-outline" id="btn-sync-all-now">
                        <i class="fas fa-arrows-rotate"></i><span>ซิงค์รายชื่อนักเรียนเข้าทุกสื่อทันที</span>
                    </button>
                    <button type="button" class="sby-btn sby-btn-primary" id="btn-goto-roster">
                        <i class="fas fa-user-plus"></i><span>จัดการรายชื่อนักเรียนกลาง</span>
                    </button>
                </div>
            </div>

            <div class="sby-apps-grid">
                ${APPS.map((app, idx) => `
                    <article class="sby-app-card" id="app-card-${app.slug}">
                        <div class="sby-app-banner" style="background: ${app.gradient};">
                            <div class="sby-app-banner-info">
                                <span class="sby-app-tag">ระบบที่ ${idx + 1} • ${esc(app.tag)}</span>
                                <h3>${esc(app.name)}</h3>
                            </div>
                            <div class="sby-app-art">
                                <i class="fas ${app.icon}"></i>
                            </div>
                        </div>
                        <div class="sby-app-body">
                            <div>
                                <p class="sby-app-desc">${esc(app.desc)}</p>
                                <div class="sby-app-features">
                                    ${app.features.map((f) => `<span class="sby-feat-pill"><i class="fas fa-check-circle" style="color:#16a34a;"></i>${esc(f)}</span>`).join('')}
                                </div>
                            </div>
                            <div>
                                <div style="font-size:12.5px;color:#0284c7;font-weight:700;margin-bottom:10px;background:#f0f9ff;padding:6px 10px;border-radius:8px;">
                                    <i class="fas fa-database"></i> ${esc(getAppSummaryText(app))}
                                </div>
                                <div class="sby-app-foot">
                                    <a href="${esc(app.manual)}" target="_blank" class="sby-btn sby-btn-outline sby-btn-sm" title="เปิดคู่มือการใช้งาน PDF">
                                        <i class="fas fa-file-pdf" style="color:#e11d48;"></i><span>คู่มือ PDF</span>
                                    </a>
                                    <a href="${esc(app.path)}" class="sby-btn sby-btn-primary">
                                        <span>เปิดใช้งานสื่อ</span><i class="fas fa-arrow-up-right-from-square"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </article>
                `).join('')}
            </div>
        `;

        document.getElementById('btn-sync-all-now').onclick = async () => {
            await pushCloudRoster();
            renderAppsTab(container);
            Swal.fire({
                icon: 'success',
                title: 'ซิงค์ข้อมูลเข้าทั้ง 7 สื่อเรียบร้อย',
                text: 'ข้อมูลโรงเรียนและรายชื่อนักเรียนทุกห้องถูกอัปเดตไปยังสื่อการสอนทุกตัวแล้ว',
                timer: 2000,
                showConfirmButton: false,
            });
        };

        document.getElementById('btn-goto-roster').onclick = () => switchTab('roster');
    }

    /* =====================================================================
       TAB 2: ฐานข้อมูลนักเรียนและข้อมูลโรงเรียนส่วนกลาง (Master Roster)
       ===================================================================== */
    function renderRosterTab(container) {
        const sp = state.roster.schoolProfile || {};
        const classes = state.roster.classes || [];
        if (!state.activeClassId && classes[0]) state.activeClassId = classes[0].id;
        const activeClass = classes.find((c) => c.id === state.activeClassId) || classes[0] || null;

        container.innerHTML = `
            <div class="sby-panel">
                <div class="sby-panel-head">
                    <h3><i class="fas fa-school" style="color:#0d257c;"></i>ข้อมูลโรงเรียนและครูผู้สอนส่วนกลาง (ใช้ในหัวรายงานราชการ .docx ทั้ง 7 ระบบ)</h3>
                    <button type="button" class="sby-btn sby-btn-primary" id="btn-save-school">
                        <i class="fas fa-floppy-disk"></i><span>บันทึกและซิงค์ข้อมูลโรงเรียน</span>
                    </button>
                </div>
                <div class="sby-form-grid">
                    <div class="sby-field">
                        <label>ชื่อโรงเรียน</label>
                        <input type="text" id="sp-name" value="${esc(sp.name || 'โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน')}">
                    </div>
                    <div class="sby-field">
                        <label>สังกัด / เขตพื้นที่การศึกษา</label>
                        <input type="text" id="sp-agency" value="${esc(sp.agency || 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาลำพูน ลำปาง')}">
                    </div>
                    <div class="sby-field">
                        <label>ชื่อ-สกุล ครูผู้สอน (ผู้ลงนามในรายงาน)</label>
                        <input type="text" id="sp-teacher" value="${esc(sp.teacherName || 'ครูทวีป นวคุณานนท์')}">
                    </div>
                    <div class="sby-field">
                        <label>ตำแหน่งครูผู้สอน</label>
                        <input type="text" id="sp-pos" value="${esc(sp.teacherPosition || 'ครูชำนาญการพิเศษ')}">
                    </div>
                    <div class="sby-field">
                        <label>ชื่อผู้อำนวยการโรงเรียน (สำหรับบันทึกข้อความ/เกียรติบัตร)</label>
                        <input type="text" id="sp-director" value="${esc(sp.director || '')}" placeholder="ระบุชื่อผู้อำนวยการโรงเรียน">
                    </div>
                    <div class="sby-field" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div>
                            <label>ปีการศึกษา (พ.ศ.)</label>
                            <input type="text" id="sp-year" value="${esc(sp.academicYear || '2569')}">
                        </div>
                        <div>
                            <label>ภาคเรียนที่</label>
                            <select id="sp-sem">
                                <option value="1" ${sp.semester === '1' ? 'selected' : ''}>1</option>
                                <option value="2" ${sp.semester === '2' ? 'selected' : ''}>2</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div class="sby-panel">
                <div class="sby-panel-head">
                    <h3><i class="fas fa-users-rectangle" style="color:#e11d48;"></i>ทะเบียนห้องเรียนและรายชื่อนักเรียนส่วนกลาง (Master Student Roster)</h3>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button type="button" class="sby-btn sby-btn-outline sby-btn-sm" id="btn-add-class">
                            <i class="fas fa-plus"></i><span>เพิ่มห้องเรียนใหม่</span>
                        </button>
                        <label class="sby-btn sby-btn-outline sby-btn-sm" style="margin:0;cursor:pointer;">
                            <i class="fas fa-file-excel" style="color:#16a34a;"></i><span>นำเข้าไฟล์ Excel (.xlsx/.csv)</span>
                            <input type="file" id="excel-roster-input" accept=".xlsx,.xls,.csv" style="display:none;">
                        </label>
                        <button type="button" class="sby-btn sby-btn-crimson sby-btn-sm" id="btn-paste-students">
                            <i class="fas fa-paste"></i><span>วางรายชื่อจาก Excel</span>
                        </button>
                    </div>
                </div>

                <!-- แถบเลือกห้องเรียน -->
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;">
                    ${classes.map((c) => `
                        <button type="button" class="sby-btn ${activeClass && activeClass.id === c.id ? 'sby-btn-primary' : 'sby-btn-outline'} sby-btn-sm" data-select-class="${esc(c.id)}">
                            <i class="fas fa-door-open"></i>
                            <span>${esc(c.name)} (${(c.students || []).length} คน)</span>
                        </button>
                    `).join('')}
                </div>

                ${activeClass ? `
                    <div style="display:flex;align-items:center;justify-content:space-between;background:#f8fafc;padding:12px 16px;border-radius:12px;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
                        <div>
                            <b style="font-size:16px;color:#07164a;">ห้อง ${esc(activeClass.name)}</b>
                            <span style="color:#64748b;font-size:13.5px;margin-left:10px;">จำนวนนักเรียน ${(activeClass.students || []).length} คน</span>
                        </div>
                        <div style="display:flex;gap:8px;">
                            <button type="button" class="sby-btn sby-btn-outline sby-btn-sm" id="btn-add-student-row">
                                <i class="fas fa-user-plus"></i><span>เพิ่มนักเรียนรายคน</span>
                            </button>
                            <button type="button" class="sby-btn sby-btn-outline sby-btn-sm" id="btn-delete-class" style="color:#be123c;">
                                <i class="fas fa-trash"></i><span>ลบห้องนี้</span>
                            </button>
                        </div>
                    </div>

                    <div class="sby-table-wrap">
                        <table class="sby-table">
                            <thead>
                                <tr>
                                    <th style="width:70px;">เลขที่</th>
                                    <th style="width:120px;">รหัสนักเรียน</th>
                                    <th style="width:110px;">คำนำหน้า</th>
                                    <th>ชื่อ</th>
                                    <th>นามสกุล</th>
                                    <th style="width:120px;">ชื่อเล่น</th>
                                    <th style="width:90px;">เพศ</th>
                                    <th style="width:80px;">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(activeClass.students || []).map((s, idx) => `
                                    <tr>
                                        <td><b>${esc(s.no || idx + 1)}</b></td>
                                        <td><code>${esc(s.code || '-')}</code></td>
                                        <td>${esc(s.prefix || '')}</td>
                                        <td><b>${esc(s.firstName || '')}</b></td>
                                        <td>${esc(s.lastName || '')}</td>
                                        <td>${esc(s.nick || '')}</td>
                                        <td>
                                            ${s.gender === 'm' ? '<span class="sby-badge sby-badge-blue">ชาย</span>' : s.gender === 'f' ? '<span class="sby-badge sby-badge-red">หญิง</span>' : '-'}
                                        </td>
                                        <td>
                                            <button type="button" class="sby-btn sby-btn-outline sby-btn-sm" data-del-student="${idx}" title="ลบรายชื่อนี้">
                                                <i class="fas fa-xmark" style="color:#be123c;"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : '<p>ยังไม่มีห้องเรียน กดปุ่ม "เพิ่มห้องเรียนใหม่" เพื่อเริ่มต้น</p>'}
            </div>
        `;

        // Event: Save school profile
        document.getElementById('btn-save-school').onclick = async () => {
            state.roster.schoolProfile = {
                name: document.getElementById('sp-name').value.trim() || 'โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
                agency: document.getElementById('sp-agency').value.trim(),
                teacherName: document.getElementById('sp-teacher').value.trim(),
                teacherPosition: document.getElementById('sp-pos').value.trim(),
                director: document.getElementById('sp-director').value.trim(),
                academicYear: document.getElementById('sp-year').value.trim(),
                semester: document.getElementById('sp-sem').value,
            };
            await pushCloudRoster();
            Swal.fire({
                icon: 'success',
                title: 'บันทึกและซิงค์เรียบร้อย',
                text: 'ข้อมูลโรงเรียนและรายชื่อนักเรียนถูกซิงค์ไปยังสื่อทั้ง 7 ระบบแล้ว',
                timer: 1800,
                showConfirmButton: false,
            });
        };

        // Event: Switch active class
        container.querySelectorAll('[data-select-class]').forEach((btn) => {
            btn.onclick = () => {
                state.activeClassId = btn.getAttribute('data-select-class');
                renderRosterTab(container);
            };
        });

        // Event: Add new class
        document.getElementById('btn-add-class').onclick = () => {
            Swal.fire({
                title: 'เพิ่มห้องเรียนใหม่',
                input: 'text',
                inputLabel: 'ชื่อชั้น/ห้องเรียน (เช่น ม.1/1, ม.2/3, ม.4/1)',
                inputPlaceholder: 'เช่น ม.2/2',
                showCancelButton: true,
                confirmButtonText: 'สร้างห้องเรียน',
                confirmButtonColor: '#0d257c',
            }).then(async (res) => {
                if (res.isConfirmed && res.value && res.value.trim()) {
                    const newCls = {
                        id: 'cls_' + Date.now(),
                        name: res.value.trim(),
                        note: '',
                        students: [],
                        groups: [],
                    };
                    state.roster.classes.push(newCls);
                    state.activeClassId = newCls.id;
                    await pushCloudRoster();
                    renderRosterTab(container);
                }
            });
        };

        // Event: Paste students from Excel
        document.getElementById('btn-paste-students').onclick = () => {
            if (!activeClass) return;
            Swal.fire({
                title: `วางรายชื่อนักเรียนห้อง ${activeClass.name}`,
                html: `
                    <p style="font-size:13px;color:#475569;text-align:left;">
                        คัดลอกตารางจาก Excel หรือพิมพ์รายชื่อบรรทัดละ 1 คน (เช่น <code>1  26201  ด.ช.ธนกฤต  สุขสวัสดิ์  ต้นกล้า</code> หรือ <code>ด.ญ.ณัฐธิดา ทองดี</code>)
                    </p>
                    <textarea id="paste-lines-area" rows="8" style="width:100%;font-family:inherit;font-size:13.5px;padding:10px;border:1px solid #cbd5e1;border-radius:10px;" placeholder="1\t26201\tด.ช.\tธนกฤต\tสุขสวัสดิ์\tต้นกล้า"></textarea>
                `,
                showCancelButton: true,
                confirmButtonText: 'นำเข้ารายชื่อ',
                confirmButtonColor: '#0d257c',
                preConfirm: () => document.getElementById('paste-lines-area').value,
            }).then(async (res) => {
                if (res.isConfirmed && res.value) {
                    const parsed = parseStudentLines(res.value, activeClass.students.length);
                    if (parsed.length) {
                        activeClass.students.push(...parsed);
                        await pushCloudRoster();
                        renderRosterTab(container);
                        Swal.fire({ icon: 'success', title: `นำเข้าสำเร็จ ${parsed.length} คน`, timer: 1600, showConfirmButton: false });
                    }
                }
            });
        };

        // Event: Add single student
        const addStudentBtn = document.getElementById('btn-add-student-row');
        if (addStudentBtn && activeClass) {
            addStudentBtn.onclick = () => {
                const nextNo = (activeClass.students?.length || 0) + 1;
                Swal.fire({
                    title: `เพิ่มนักเรียนห้อง ${activeClass.name}`,
                    html: `
                        <div style="text-align:left;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13.5px;">
                            <div><label>เลขที่</label><input id="st-no" type="number" class="swal2-input" style="margin:4px 0 0;width:100%;height:38px;" value="${nextNo}"></div>
                            <div><label>รหัสนักเรียน (5 หลัก)</label><input id="st-code" type="text" class="swal2-input" style="margin:4px 0 0;width:100%;height:38px;" placeholder="เช่น 26207"></div>
                            <div><label>คำนำหน้า</label><select id="st-prefix" class="swal2-input" style="margin:4px 0 0;width:100%;height:38px;"><option value="ด.ช.">ด.ช.</option><option value="ด.ญ.">ด.ญ.</option><option value="นาย">นาย</option><option value="นางสาว">นางสาว</option></select></div>
                            <div><label>ชื่อเล่น</label><input id="st-nick" type="text" class="swal2-input" style="margin:4px 0 0;width:100%;height:38px;"></div>
                            <div><label>ชื่อจริง</label><input id="st-first" type="text" class="swal2-input" style="margin:4px 0 0;width:100%;height:38px;"></div>
                            <div><label>นามสกุล</label><input id="st-last" type="text" class="swal2-input" style="margin:4px 0 0;width:100%;height:38px;"></div>
                        </div>
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'เพิ่มนักเรียน',
                    confirmButtonColor: '#0d257c',
                    preConfirm: () => {
                        const prefix = document.getElementById('st-prefix').value;
                        const firstName = document.getElementById('st-first').value.trim();
                        if (!firstName) {
                            Swal.showValidationMessage('กรุณากรอกชื่อนักเรียน');
                            return false;
                        }
                        return {
                            id: 's_' + Date.now(),
                            no: Number(document.getElementById('st-no').value) || nextNo,
                            code: document.getElementById('st-code').value.trim(),
                            prefix,
                            firstName,
                            lastName: document.getElementById('st-last').value.trim(),
                            nick: document.getElementById('st-nick').value.trim(),
                            gender: ['ด.ช.', 'นาย'].includes(prefix) ? 'm' : 'f',
                        };
                    },
                }).then(async (res) => {
                    if (res.isConfirmed && res.value) {
                        activeClass.students.push(res.value);
                        await pushCloudRoster();
                        renderRosterTab(container);
                    }
                });
            };
        }

        // Event: Delete single student
        container.querySelectorAll('[data-del-student]').forEach((btn) => {
            btn.onclick = async () => {
                const idx = Number(btn.getAttribute('data-del-student'));
                activeClass.students.splice(idx, 1);
                await pushCloudRoster();
                renderRosterTab(container);
            };
        });

        // Event: Delete class
        const delClsBtn = document.getElementById('btn-delete-class');
        if (delClsBtn && activeClass) {
            delClsBtn.onclick = async () => {
                if (state.roster.classes.length <= 1) {
                    Swal.fire({ icon: 'warning', title: 'ต้องมีอย่างน้อย 1 ห้องเรียน' });
                    return;
                }
                state.roster.classes = state.roster.classes.filter((c) => c.id !== activeClass.id);
                state.activeClassId = state.roster.classes[0]?.id || '';
                await pushCloudRoster();
                renderRosterTab(container);
            };
        }

        // Event: Excel upload
        const excelInput = document.getElementById('excel-roster-input');
        if (excelInput) {
            excelInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file || !window.XLSX) return;
                const reader = new FileReader();
                reader.onload = async (evt) => {
                    const wb = XLSX.read(evt.target.result, { type: 'array' });
                    const firstSheet = wb.Sheets[wb.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                    const lines = rows.map((r) => (r || []).join('\t')).join('\n');
                    const parsed = parseStudentLines(lines, activeClass ? activeClass.students.length : 0);
                    if (parsed.length && activeClass) {
                        activeClass.students.push(...parsed);
                        await pushCloudRoster();
                        renderRosterTab(container);
                        Swal.fire({ icon: 'success', title: `นำเข้าจาก Excel สำเร็จ ${parsed.length} คน`, timer: 1800, showConfirmButton: false });
                    }
                };
                reader.readAsArrayBuffer(file);
            };
        }
    }

    function parseStudentLines(text, startNo) {
        const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const out = [];
        const prefRe = /^(เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|นาย|นางสาว|น\.ส\.)\s*/;
        const prefMap = { 'เด็กชาย': 'ด.ช.', 'เด็กหญิง': 'ด.ญ.', 'น.ส.': 'นางสาว' };

        lines.forEach((line) => {
            if (/^(เลขที่|ลำดับ|รหัส|ชื่อ)/.test(line)) return;
            const parts = line.split(/[\t,]+/).map((p) => p.trim()).filter(Boolean);
            let no = startNo + out.length + 1;
            let code = '';
            let prefix = '';
            let firstName = '';
            let lastName = '';
            let nick = '';

            parts.forEach((p) => {
                if (/^\d{1,2}$/.test(p)) no = Number(p);
                else if (/^\d{4,6}$/.test(p)) code = p;
                else if (/^(ด\.ช\.|ด\.ญ\.|เด็กชาย|เด็กหญิง|นาย|นางสาว|น\.ส\.)$/.test(p)) prefix = prefMap[p] || p;
                else if (!firstName) {
                    let rest = p;
                    const m = prefRe.exec(rest);
                    if (m) {
                        prefix = prefMap[m[1]] || m[1];
                        rest = rest.slice(m[0].length).trim();
                    }
                    const sp = rest.split(/\s+/);
                    firstName = sp[0] || '';
                    if (sp[1] && !lastName) lastName = sp.slice(1).join(' ');
                } else if (!lastName) lastName = p;
                else if (!nick) nick = p;
            });

            if (firstName) {
                const gender = ['ด.ช.', 'นาย'].includes(prefix) ? 'm' : ['ด.ญ.', 'นางสาว'].includes(prefix) ? 'f' : '';
                out.push({
                    id: `s_${Date.now()}_${out.length}`,
                    no,
                    code,
                    prefix,
                    firstName,
                    lastName,
                    nick,
                    gender,
                });
            }
        });
        return out;
    }

    /* =====================================================================
       TAB 3: ซิงค์ & สำรองข้อมูลรวมทั้ง 7 ระบบ (Unified Cloud & Backup)
       ===================================================================== */
    function renderBackupTab(container) {
        container.innerHTML = `
            <div class="sby-panel">
                <div class="sby-panel-head">
                    <h3><i class="fas fa-cloud-arrow-up" style="color:#0284c7;"></i>ศูนย์สำรองและกู้คืนข้อมูลรวมทั้ง 7 ระบบ (Unified Full Backup)</h3>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button type="button" class="sby-btn sby-btn-primary" id="btn-export-full-bundle">
                            <i class="fas fa-download"></i><span>ดาวน์โหลดข้อมูลทั้งหมด 7 ระบบ (.json)</span>
                        </button>
                        <label class="sby-btn sby-btn-outline" style="margin:0;cursor:pointer;">
                            <i class="fas fa-folder-open"></i><span>กู้คืนข้อมูลจากไฟล์สำรองรวม (.json)</span>
                            <input type="file" id="import-full-bundle-input" accept=".json" style="display:none;">
                        </label>
                    </div>
                </div>
                <p style="color:#475569;font-size:14px;margin-top:0;">
                    นอกจากการบันทึกอัตโนมัติขึ้นฐานข้อมูลออนไลน์ (Cloudflare D1) แล้ว คุณครูยังสามารถดาวน์โหลดข้อมูลของสื่อทั้ง 7 ระบบรวมกันเป็นไฟล์ <code>.json</code> ไฟล์เดียว เพื่อเก็บสำรองไว้ในแฟลชไดรฟ์หรือ Google Drive ได้ตลอดเวลา
                </p>

                <div class="sby-table-wrap">
                    <table class="sby-table">
                        <thead>
                            <tr>
                                <th>ระบบสื่อการสอน</th>
                                <th>คีย์ข้อมูล</th>
                                <th>สรุปข้อมูลปัจจุบัน</th>
                                <th>สถานะ</th>
                                <th>การจัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${APPS.map((app) => `
                                <tr>
                                    <td><b><i class="fas ${app.icon}" style="margin-right:8px;color:#0d257c;"></i>${esc(app.name)}</b></td>
                                    <td><code>${esc(app.id)}</code></td>
                                    <td>${esc(getAppSummaryText(app))}</td>
                                    <td><span class="sby-badge sby-badge-green"><i class="fas fa-check"></i> พร้อมซิงค์ออนไลน์</span></td>
                                    <td>
                                        <a href="${esc(app.path)}" class="sby-btn sby-btn-outline sby-btn-sm">เปิดสื่อ</a>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('btn-export-full-bundle').onclick = () => {
            const bundle = {
                bundleApp: 'sby-teacher-media-hub',
                school: 'โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
                creator: 'ครูทวีป นวคุณานนท์',
                exportedAt: new Date().toISOString(),
                masterRoster: state.roster,
                apps: {},
            };
            APPS.forEach((app) => {
                try {
                    const raw = localStorage.getItem(app.storageKey);
                    if (raw) bundle.apps[app.id] = JSON.parse(raw);
                } catch (e) { /* skip */ }
            });
            const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `SBY_Media_Hub_Backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        };

        document.getElementById('import-full-bundle-input').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const json = JSON.parse(evt.target.result);
                    if (json.masterRoster) {
                        saveLocalRoster(json.masterRoster);
                    }
                    if (json.apps && typeof json.apps === 'object') {
                        APPS.forEach((app) => {
                            if (json.apps[app.id]) {
                                localStorage.setItem(app.storageKey, JSON.stringify(json.apps[app.id]));
                            }
                        });
                    }
                    await pushCloudRoster();
                    renderBackupTab(container);
                    Swal.fire({ icon: 'success', title: 'กู้คืนข้อมูลทั้ง 7 ระบบสำเร็จ', timer: 1800, showConfirmButton: false });
                } catch (err) {
                    Swal.fire({ icon: 'error', title: 'ไฟล์ข้อมูลไม่ถูกต้อง' });
                }
            };
            reader.readAsText(file);
        };
    }

    /* =====================================================================
       TAB 4: จัดการสิทธิ์ครู (Admin Panel — @sby.ac.th & @gmail.com Whitelist)
       ===================================================================== */
    function renderAdminTab(container) {
        container.innerHTML = `
            <div class="sby-panel">
                <div class="sby-panel-head">
                    <h3><i class="fas fa-user-shield" style="color:#0d257c;"></i>จัดการสิทธิ์คุณครูผู้ใช้งานระบบ (Teacher Access Control &amp; Whitelist)</h3>
                    <button type="button" class="sby-btn sby-btn-primary" id="btn-add-teacher">
                        <i class="fas fa-user-plus"></i><span>อนุมัติอีเมลครูเพิ่ม (@sby.ac.th / @gmail.com)</span>
                    </button>
                </div>

                <div class="sby-policy-box" style="margin-top:0;margin-bottom:20px;">
                    <b><i class="fas fa-filter"></i> กฎการรักษาความปลอดภัยและการกรองอีเมลของโรงเรียนส่วนบุญโญปถัมภ์ ลำพูน:</b>
                    <ul>
                        <li><b>กฎข้อที่ 1 (โดเมนโรงเรียน):</b> อีเมลคุณครูภายใต้โดเมน <code>@sby.ac.th</code> สามารถเข้าใช้งานด้วย Google Sign-In ได้</li>
                        <li><b>กฎข้อที่ 2 (บล็อกอีเมลนักเรียนอัตโนมัติ):</b> รูปแบบอีเมลนักเรียน <code>sby_เลขประจำตัว 5 หลัก@sby.ac.th</code> (เช่น <code>sby_26201@sby.ac.th</code>) จะถูกระบบกรองและปฏิเสธการเข้าถึงโดยอัตโนมัติ และไม่สามารถเพิ่มเข้าตารางครูได้</li>
                        <li><b>กฎข้อที่ 3 (อนุญาต @gmail.com รายบุคคล):</b> ผู้ดูแลระบบสามารถเพิ่มอีเมล <code>@gmail.com</code> เป็นรายบุคคลในตารางด้านล่าง เพื่อให้ครูอัตราจ้างหรือนักศึกษาฝึกสอนล็อกอินเข้าใช้งานได้</li>
                    </ul>
                </div>

                <div class="sby-table-wrap">
                    <table class="sby-table">
                        <thead>
                            <tr>
                                <th>ชื่อ-นามสกุลครู</th>
                                <th>อีเมล Google</th>
                                <th>ตำแหน่ง / กลุ่มสาระฯ</th>
                                <th>ประเภทบัญชี</th>
                                <th>ระดับสิทธิ์</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${state.teachers.map((t, idx) => {
                                const isSchool = t.email.endsWith('@sby.ac.th');
                                return `
                                    <tr>
                                        <td><b>${esc(t.name)}</b></td>
                                        <td><code>${esc(t.email)}</code></td>
                                        <td>${esc(t.position || 'ครู')} • ${esc(t.department || '')}</td>
                                        <td>
                                            ${isSchool
                                                ? '<span class="sby-badge sby-badge-blue"><i class="fas fa-building-columns"></i> โดเมนโรงเรียน (@sby.ac.th)</span>'
                                                : '<span class="sby-badge sby-badge-amber"><i class="fas fa-envelope"></i> บัญชีภายนอกอนุมัติรายบุคคล</span>'}
                                        </td>
                                        <td>
                                            ${t.role === 'admin'
                                                ? '<span class="sby-badge sby-badge-red"><i class="fas fa-crown"></i> ผู้ดูแลระบบ (Admin)</span>'
                                                : '<span class="sby-badge sby-badge-green"><i class="fas fa-user-check"></i> ครูผู้สอน</span>'}
                                        </td>
                                        <td>
                                            ${t.email === 'taweep@sby.ac.th'
                                                ? '<small style="color:#64748b;">ผู้พัฒนาระบบหลัก</small>'
                                                : `<button type="button" class="sby-btn sby-btn-outline sby-btn-sm" data-del-teacher="${idx}"><i class="fas fa-trash" style="color:#be123c;"></i></button>`}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('btn-add-teacher').onclick = () => {
            Swal.fire({
                title: 'เพิ่มรายชื่อครูผู้มีสิทธิ์เข้าใช้งาน',
                html: `
                    <div style="text-align:left;font-size:13.5px;">
                        <div style="margin-bottom:10px;">
                            <label style="font-weight:700;">อีเมลคุณครู (@sby.ac.th หรือ @gmail.com รายบุคคล)</label>
                            <input id="adm-email" type="email" class="swal2-input" style="margin:4px 0 0;width:100%;height:40px;" placeholder="เช่น teacher@sby.ac.th หรือ kru.sby@gmail.com">
                        </div>
                        <div style="margin-bottom:10px;">
                            <label style="font-weight:700;">ชื่อ-นามสกุลครู</label>
                            <input id="adm-name" type="text" class="swal2-input" style="margin:4px 0 0;width:100%;height:40px;" placeholder="เช่น ครูกมลวรรณ สุขใจ">
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                            <div>
                                <label style="font-weight:700;">ตำแหน่ง</label>
                                <input id="adm-pos" type="text" class="swal2-input" style="margin:4px 0 0;width:100%;height:40px;" value="ครู">
                            </div>
                            <div>
                                <label style="font-weight:700;">ระดับสิทธิ์</label>
                                <select id="adm-role" class="swal2-input" style="margin:4px 0 0;width:100%;height:40px;">
                                    <option value="teacher">ครูผู้สอน (Teacher)</option>
                                    <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'อนุมัติสิทธิ์ครู',
                confirmButtonColor: '#0d257c',
                preConfirm: () => {
                    const email = document.getElementById('adm-email').value.trim().toLowerCase();
                    const name = document.getElementById('adm-name').value.trim();
                    if (!email || !email.includes('@')) {
                        Swal.showValidationMessage('กรุณากรอกอีเมลให้ถูกต้อง');
                        return false;
                    }
                    if (STUDENT_EMAIL_RE.test(email)) {
                        Swal.showValidationMessage('ไม่สามารถอนุมัติอีเมลนักเรียน (sby_รหัส 5 หลัก@sby.ac.th) เป็นบัญชีครูได้');
                        return false;
                    }
                    if (!name) {
                        Swal.showValidationMessage('กรุณากรอกชื่อ-นามสกุลครู');
                        return false;
                    }
                    return {
                        email,
                        name,
                        position: document.getElementById('adm-pos').value.trim() || 'ครู',
                        department: 'โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
                        role: document.getElementById('adm-role').value,
                        is_active: 1,
                    };
                },
            }).then(async (res) => {
                if (res.isConfirmed && res.value) {
                    const t = res.value;
                    const idx = state.teachers.findIndex((x) => x.email.toLowerCase() === t.email);
                    if (idx >= 0) state.teachers[idx] = t;
                    else state.teachers.push(t);
                    saveLocalTeachers(state.teachers);

                    if (state.token) {
                        try {
                            await fetch('/api/admin', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
                                body: JSON.stringify(t),
                            });
                        } catch (e) { /* saved locally */ }
                    }
                    renderAdminTab(container);
                    Swal.fire({ icon: 'success', title: `อนุมัติสิทธิ์ ${t.name} เรียบร้อย`, timer: 1600, showConfirmButton: false });
                }
            });
        };

        container.querySelectorAll('[data-del-teacher]').forEach((btn) => {
            btn.onclick = async () => {
                const idx = Number(btn.getAttribute('data-del-teacher'));
                const target = state.teachers[idx];
                if (!target) return;
                state.teachers.splice(idx, 1);
                saveLocalTeachers(state.teachers);
                if (state.token) {
                    try {
                        await fetch(`/api/admin?email=${encodeURIComponent(target.email)}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${state.token}` },
                        });
                    } catch (e) { /* ignore */ }
                }
                renderAdminTab(container);
            };
        });
    }

    /* =====================================================================
       Navigation & Bootstrapping
       ===================================================================== */
    function switchTab(tab) {
        state.currentTab = tab;
        document.querySelectorAll('#portal-nav-tabs .sby-tab-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
        });
        renderMain();
    }

    function renderLoginGate(container) {
        container.innerHTML = `
            <div class="sby-login-gate">
                <img src="assets/img/school-logo.png" alt="ตราโรงเรียนส่วนบุญโญปถัมภ์ ลำพูน">
                <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#07164a;">เข้าสู่ระบบศูนย์รวมสื่อการสอนสำหรับครูมืออาชีพ</h2>
                <p style="margin:0;font-size:14px;color:#475569;">โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน • พัฒนาระบบโดย ครูทวีป นวคุณานนท์</p>

                <div class="sby-policy-box">
                    <b style="color:#07164a;"><i class="fas fa-shield-halved"></i> สิทธิ์การเข้าใช้งานระบบ:</b>
                    <ul>
                        <li>เฉพาะคุณครูที่เข้าสู่ระบบด้วยบัญชี Google ของโรงเรียน <b>@sby.ac.th</b></li>
                        <li>ระบบกรองและ<b>ไม่อนุญาต</b>อีเมลนักเรียน (<code>sby_รหัส 5 หลัก@sby.ac.th</code>) โดยอัตโนมัติ</li>
                        <li>รองรับอีเมล <b>@gmail.com</b> เฉพาะรายบุคคลที่ผู้ดูแลระบบอนุมัติไว้แล้ว</li>
                    </ul>
                </div>

                <div id="g-signin-gate-wrap" style="display:flex;justify-content:center;margin:22px 0 12px;min-height:46px;">
                    <span style="color:#64748b;font-size:13.5px;"><i class="fas fa-spinner fa-spin"></i> กำลังเตรียมปุ่ม Sign in with Google...</span>
                </div>
                <p style="margin:12px 0 0;font-size:12.5px;color:#64748b;">
                    ข้อมูลรายชื่อนักเรียน ชุดคำถาม และผลการทำกิจกรรมทั้ง 7 ระบบ จะถูกบันทึกและซิงค์เข้าบัญชีคุณครูอัตโนมัติบน Cloudflare D1
                </p>
            </div>
        `;
        mountGoogleButton(document.getElementById('g-signin-gate-wrap'));
    }

    async function fetchAdminTeachers() {
        if (!state.token || !state.user || state.user.role !== 'admin') return;
        try {
            const res = await fetch('/api/admin', {
                headers: { 'Authorization': `Bearer ${state.token}` },
            });
            if (res.ok) {
                const json = await res.json();
                if (json.ok && Array.isArray(json.teachers)) {
                    saveLocalTeachers(json.teachers);
                }
            }
        } catch (e) { /* keep local cache */ }
    }

    function renderMain() {
        const container = document.getElementById('portal-main-view');
        if (!container) return;
        updateHeroStats();

        if (!state.user || !state.token) {
            renderLoginGate(container);
            return;
        }

        if (state.currentTab === 'roster') renderRosterTab(container);
        else if (state.currentTab === 'backup') renderBackupTab(container);
        else if (state.currentTab === 'admin') {
            if (state.user.role !== 'admin') {
                state.currentTab = 'apps';
                renderAppsTab(container);
                return;
            }
            renderAdminTab(container);
        } else renderAppsTab(container);
    }

    async function init() {
        document.querySelectorAll('#portal-nav-tabs .sby-tab-btn').forEach((btn) => {
            btn.onclick = async () => {
                const tab = btn.getAttribute('data-tab');
                if (tab === 'admin') await fetchAdminTeachers();
                switchTab(tab);
            };
        });

        // ตรวจสอบ Session จริงกับ Cloudflare Pages Functions (/api/auth)
        try {
            const headers = state.token ? { 'Authorization': `Bearer ${state.token}` } : {};
            const res = await fetch('/api/auth', { headers });
            if (res.ok) {
                const json = await res.json();
                if (json.googleClientId) state.googleClientId = json.googleClientId;
                if (json.authenticated && json.teacher) {
                    state.user = json.teacher;
                    localStorage.setItem(USER_KEY, JSON.stringify(state.user));
                    await fetchCloudRoster();
                    if (state.user.role === 'admin') await fetchAdminTeachers();
                    syncRosterToAllLocalApps();
                } else {
                    state.user = null;
                    state.token = '';
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(USER_KEY);
                }
            }
        } catch (e) { /* offline fallback */ }

        renderHeaderUser();
        renderMain();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
