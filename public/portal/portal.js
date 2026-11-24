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
        {
            id: 'vs-bingo-maker',
            slug: 'bingo',
            storageKey: 'vs_bingo_maker.data.v1',
            tag: 'เกมทบทวนคำศัพท์ & สร้างการ์ด',
            name: 'เกมบิงโกคำศัพท์และสร้างการ์ดอัตโนมัติ',
            desc: 'สร้างชุดคำศัพท์/คำถาม-คำตอบ สุ่มการ์ดบิงโก 3×3, 4×4, 5×5 อัตโนมัติไม่ซ้ำใบ พิมพ์การ์ด A4 พร้อมจอเรียกคำหน้าชั้นเรียน ตรวจบิงโกอัตโนมัติ และออกรายงาน .docx',
            icon: 'fa-table-cells',
            gradient: 'linear-gradient(135deg, #9d174d 0%, #db2777 55%, #f472b6 100%)',
            path: 'apps/bingo/index.html',
            manual: 'apps/bingo/docs/คู่มือการใช้งาน.pdf',
            features: ['สุ่มการ์ดไม่ซ้ำใบ', 'พิมพ์การ์ด A4', 'จอเรียกคำหน้าห้อง', 'ตรวจบิงโก & .docx'],
            usesRoster: true,
        },
    ];

    const DEFAULT_ROSTER = {
        schoolProfile: {
            name: 'โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
            agency: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาลำปาง ลำพูน',
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
                if (json.ok && Array.isArray(json.classes)) {
                    const cloudClasses = json.classes;
                    saveLocalRoster({
                        schoolProfile: Object.assign({}, DEFAULT_ROSTER.schoolProfile, json.schoolProfile || {}),
                        classes: cloudClasses,
                    });
                    if (!cloudClasses.some((c) => c.id === state.activeClassId)) {
                        state.activeClassId = cloudClasses[0]?.id || '';
                    }
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
     * พร้อมลบห้องเรียนที่ถูกลบออกจากแอปย่อย (vs-random-picker และ vs-class-points) และรักษาฟิลด์ code
     */
    function syncRosterToAllLocalApps() {
        const sp = state.roster.schoolProfile || {};
        const classes = Array.isArray(state.roster.classes) ? state.roster.classes : [];

        APPS.forEach((app) => {
            try {
                const raw = localStorage.getItem(app.storageKey);
                const d = raw ? JSON.parse(raw) : { app: app.id, schemaVersion: 1, updatedAt: '' };
                d.school = Object.assign({}, d.school || {}, {
                    name: sp.name || 'โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
                    agency: sp.agency || 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาลำปาง ลำพูน',
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
                    const customLists = d.lists.filter((l) => l && l.kind === 'custom');
                    const prevClassLists = d.lists.filter((l) => l && l.kind !== 'custom');
                    const usedPrevIds = new Set();
                    const syncedClassLists = [];

                    classes.forEach((cls) => {
                        if (!cls || !cls.id) return;
                        const existing = prevClassLists.find((l) => l.id === cls.id)
                            || prevClassLists.find((l) => !usedPrevIds.has(l.id) && l.name === cls.name);
                        if (existing) usedPrevIds.add(existing.id);

                        const prevItemMap = new Map();
                        if (existing && Array.isArray(existing.items)) {
                            existing.items.forEach((it) => {
                                if (it && it.id) prevItemMap.set(String(it.id), it);
                            });
                        }

                        // ย้ายสถานะวงล้อหาก ID ห้องเรียนถูกปรับให้ตรงกับฐานข้อมูลกลาง
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

                        const items = (cls.students || []).map((s, idx) => {
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
                            items,
                        });
                    });

                    // ลบห้องเรียนที่ไม่มีในฐานข้อมูลกลางออก โดยคงรายการกำหนดเอง (custom) ไว้
                    d.lists = [...syncedClassLists, ...customLists];
                    const validListIds = new Set(d.lists.map((l) => l.id));
                    if (d.wheel && d.wheel.removed) {
                        Object.keys(d.wheel.removed).forEach((lid) => {
                            if (!validListIds.has(lid)) delete d.wheel.removed[lid];
                        });
                    }
                    if (d.wheel && d.wheel.round) {
                        Object.keys(d.wheel.round).forEach((lid) => {
                            if (!validListIds.has(lid)) delete d.wheel.round[lid];
                        });
                    }
                    if (!validListIds.has(d.currentListId)) {
                        d.currentListId = d.lists[0] ? d.lists[0].id : '';
                    }
                } else if (app.id === 'vs-class-points') {
                    if (!Array.isArray(d.classes)) d.classes = [];
                    if (!Array.isArray(d.students)) d.students = [];
                    const prevClasses = d.classes;
                    const prevStudentById = new Map();
                    d.students.forEach((s) => {
                        if (s && s.id) prevStudentById.set(String(s.id), s);
                    });

                    const usedPrevIds = new Set();
                    const nextClasses = [];
                    const nextStudents = [];

                    classes.forEach((cls) => {
                        if (!cls || !cls.id) return;
                        const ex = prevClasses.find((c) => c.id === cls.id)
                            || prevClasses.find((c) => !usedPrevIds.has(c.id) && c.name === cls.name);
                        if (ex) usedPrevIds.add(ex.id);

                        if (ex && ex.id !== cls.id && d.settings && d.settings.classId === ex.id) {
                            d.settings.classId = cls.id;
                        }

                        const groups = ex && Array.isArray(ex.groups) && ex.groups.length
                            ? ex.groups
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

                    // ลบห้องเรียนและนักเรียนที่ไม่มีในฐานข้อมูลกลางออก
                    const validClassIds = new Set(nextClasses.map((c) => c.id));
                    const validStudentIds = new Set(nextStudents.map((s) => s.id));
                    nextClasses.forEach((c) => {
                        if (Array.isArray(c.groups)) {
                            c.groups = c.groups.map((g) => Object.assign({}, g, {
                                members: Array.isArray(g.members) ? g.members.filter((id) => validStudentIds.has(id)) : [],
                            }));
                        }
                    });
                    d.classes = nextClasses;
                    d.students = nextStudents;
                    if (!d.settings) d.settings = { classId: '', sound: true };
                    if (!validClassIds.has(d.settings.classId)) {
                        d.settings.classId = nextClasses[0] ? nextClasses[0].id : '';
                    }
                }

                d.updatedAt = raw ? new Date().toISOString() : '';
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
       TAB 1: คลังสื่อการสอนทั้ง 9 ระบบ (Media Launcher Grid)
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
            if (app.id === 'vs-bingo-maker') {
                const cards = (d.games || []).reduce((sum, g) => sum + ((g.cards && g.cards.length) || 0), 0);
                return `ชุดคำศัพท์ ${(d.sets || []).length} ชุด • เกม ${(d.games || []).length} เกม • การ์ด ${cards} ใบ`;
            }
            if (app.id === 'vs-team-quiz') {
                return `ชุดคำถาม ${(d.sets || []).length} ชุด • ทีม ${(d.teams || []).length} ทีม • แข่งขัน ${(d.matches || []).length} ครั้ง`;
            }
        } catch (e) { /* ignore */ }
        return 'พร้อมใช้งานทันที';
    }

    function renderAppsTab(container) {
        const hasClasses = Array.isArray(state.roster?.classes) && state.roster.classes.length > 0;
        container.innerHTML = `
            <div class="sby-section-header">
                <div class="sby-section-title">
                    <h2><i class="fas fa-layer-group" style="color:#e11d48;margin-right:8px;"></i>คลังสื่อการสอนและเกมการศึกษาเชิงรุก (9 ระบบ)</h2>
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

            ${!hasClasses ? `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;background:linear-gradient(135deg,#eff6ff 0%,#f0f9ff 100%);border:1px solid #bae6fd;border-radius:14px;padding:16px 20px;margin-bottom:20px;">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <span style="width:42px;height:42px;border-radius:12px;background:#0284c7;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">
                            <i class="fas fa-cloud-arrow-down"></i>
                        </span>
                        <div>
                            <b style="color:#07164a;font-size:15px;">ยังไม่มีรายชื่อนักเรียนในบัญชีของคุณครู</b>
                            <div style="color:#475569;font-size:13.5px;">คุณครูสามารถดึงรายชื่อนักเรียนจากฐานข้อมูลกลางที่ผู้ดูแลระบบ (Admin) เพิ่มไว้ โดยเลือกเฉพาะห้องเรียนที่สอนได้ทันที</div>
                        </div>
                    </div>
                    <button type="button" class="sby-btn sby-btn-primary sby-btn-sm" id="btn-apps-pull-admin">
                        <i class="fas fa-cloud-arrow-down"></i><span>ดึงรายชื่อกลาง (เลือกห้องที่สอน)</span>
                    </button>
                </div>
            ` : ''}

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
                title: 'ซิงค์ข้อมูลเข้าทั้ง 9 สื่อเรียบร้อย',
                text: 'ข้อมูลโรงเรียนและรายชื่อนักเรียนทุกห้องถูกอัปเดตไปยังสื่อการสอนทุกตัวแล้ว',
                timer: 2000,
                showConfirmButton: false,
            });
        };

        document.getElementById('btn-goto-roster').onclick = () => switchTab('roster');

        const pullFromAppsBtn = document.getElementById('btn-apps-pull-admin');
        if (pullFromAppsBtn) {
            pullFromAppsBtn.onclick = () => openPullAdminRosterModal(() => renderAppsTab(container));
        }
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
                    <h3><i class="fas fa-school" style="color:#0d257c;"></i>ข้อมูลโรงเรียนและครูผู้สอนส่วนกลาง (ใช้ในหัวรายงานราชการ .docx ทั้ง 9 ระบบ)</h3>
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
                        <input type="text" id="sp-agency" value="${esc(sp.agency || 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาลำปาง ลำพูน')}">
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
                        <button type="button" class="sby-btn sby-btn-primary sby-btn-sm" id="btn-pull-admin-roster" title="ดึงรายชื่อนักเรียนจากฐานข้อมูลกลางที่ผู้ดูแลระบบ (Admin) เพิ่มไว้ โดยเลือกเฉพาะห้องที่สอนได้">
                            <i class="fas fa-cloud-arrow-down"></i><span>ดึงรายชื่อกลาง (Admin)</span>
                        </button>
                        <button type="button" class="sby-btn sby-btn-outline sby-btn-sm" id="btn-add-class">
                            <i class="fas fa-plus"></i><span>เพิ่มห้องเรียนใหม่</span>
                        </button>
                        <button type="button" class="sby-btn sby-btn-outline sby-btn-sm" id="btn-export-excel-roster" title="ดาวน์โหลดไฟล์ Excel รายชื่อนักเรียนห้องนี้เพื่อนำไปแก้ไขแล้วนำเข้ากลับมาอัปเดตตามเลขประจำตัวนักเรียน">
                            <i class="fas fa-file-arrow-down" style="color:#0284c7;"></i><span>ส่งออก Excel (แก้ไข/อัปเดต)</span>
                        </button>
                        <label class="sby-btn sby-btn-outline sby-btn-sm" style="margin:0;cursor:pointer;" title="นำเข้าไฟล์ Excel/CSV เพื่อเพิ่มหรืออัปเดตข้อมูลตามเลขประจำตัวนักเรียน">
                            <i class="fas fa-file-excel" style="color:#16a34a;"></i><span>นำเข้า/อัปเดต Excel (.xlsx/.csv)</span>
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
                            ${activeClass.note ? `<span style="color:#475569;font-size:13px;margin-left:8px;">• ${esc(activeClass.note)}</span>` : ''}
                            <div style="color:#64748b;font-size:12px;margin-top:2px;">
                                <i class="fas fa-circle-info" style="color:#0284c7;"></i> สามารถส่งออกไฟล์ Excel ไปแก้ไขแล้วนำเข้ากลับได้ — ระบบจะยึด<b>เลขประจำตัวนักเรียน</b>เป็นหลักในการอัปเดตข้อมูลเดิมโดยไม่ทำให้แต้มหรือประวัติหาย
                            </div>
                        </div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            <button type="button" class="sby-btn sby-btn-outline sby-btn-sm" id="btn-add-student-row">
                                <i class="fas fa-user-plus"></i><span>เพิ่มนักเรียนรายคน</span>
                            </button>
                            <button type="button" class="sby-btn sby-btn-outline sby-btn-sm" id="btn-rename-class" title="แก้ไขชื่อห้องเรียนหรือหมายเหตุ">
                                <i class="fas fa-pen-to-square" style="color:#0284c7;"></i><span>แก้ไขชื่อห้อง</span>
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
                                    <th style="width:116px;">จัดการ</th>
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
                                            <div style="display:inline-flex;gap:6px;">
                                                <button type="button" class="sby-btn sby-btn-outline sby-btn-sm" data-edit-student="${idx}" title="แก้ไขข้อมูลนักเรียน">
                                                    <i class="fas fa-pen" style="color:#0284c7;"></i>
                                                </button>
                                                <button type="button" class="sby-btn sby-btn-outline sby-btn-sm" data-del-student="${idx}" title="ลบรายชื่อนี้">
                                                    <i class="fas fa-trash" style="color:#be123c;"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div style="text-align:center;padding:34px 20px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:14px;">
                        <i class="fas fa-users-rectangle" style="font-size:36px;color:#0284c7;margin-bottom:10px;"></i>
                        <h4 style="margin:0 0 6px;color:#07164a;font-size:17px;">ยังไม่มีห้องเรียนในบัญชีของคุณครู</h4>
                        <p style="margin:0 0 18px;color:#64748b;font-size:14px;">คุณครูสามารถดึงรายชื่อนักเรียนจากฐานข้อมูลกลางที่ผู้ดูแลระบบ (Admin) เพิ่มไว้โดยเลือกเฉพาะห้องที่สอน หรือสร้างห้องเรียนใหม่เองได้เลย</p>
                        <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">
                            <button type="button" class="sby-btn sby-btn-primary" id="btn-empty-pull-admin">
                                <i class="fas fa-cloud-arrow-down"></i><span>ดึงรายชื่อกลาง (เลือกห้องจาก Admin)</span>
                            </button>
                            <button type="button" class="sby-btn sby-btn-outline" id="btn-empty-add-class">
                                <i class="fas fa-plus"></i><span>เพิ่มห้องเรียนใหม่เอง</span>
                            </button>
                        </div>
                    </div>
                `}
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
                text: 'ข้อมูลโรงเรียนและรายชื่อนักเรียนถูกซิงค์ไปยังสื่อทั้ง 9 ระบบแล้ว',
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

        // Event: Pull classes selectively from Admin central roster
        const pullAdminBtn = document.getElementById('btn-pull-admin-roster');
        if (pullAdminBtn) {
            pullAdminBtn.onclick = () => openPullAdminRosterModal(() => renderRosterTab(container));
        }
        const emptyPullBtn = document.getElementById('btn-empty-pull-admin');
        if (emptyPullBtn) {
            emptyPullBtn.onclick = () => openPullAdminRosterModal(() => renderRosterTab(container));
        }

        // Event: Add new class
        const triggerAddClass = () => {
            Swal.fire({
                title: 'เพิ่มห้องเรียนใหม่',
                input: 'text',
                inputLabel: 'ชื่อชั้น/ห้องเรียน (เช่น ม.1/1, ม.2/3, ม.4/1)',
                inputPlaceholder: 'เช่น ม.2/2',
                showCancelButton: true,
                confirmButtonText: 'สร้างห้องเรียน',
                cancelButtonText: 'ยกเลิก',
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
        document.getElementById('btn-add-class').onclick = triggerAddClass;
        const emptyAddBtn = document.getElementById('btn-empty-add-class');
        if (emptyAddBtn) emptyAddBtn.onclick = triggerAddClass;

        // Event: Rename active class
        const renameClsBtn = document.getElementById('btn-rename-class');
        if (renameClsBtn && activeClass) {
            renameClsBtn.onclick = () => openRenameClassModal(activeClass, container);
        }

        // Event: Export active class roster to Excel for editing & re-import
        const exportExcelBtn = document.getElementById('btn-export-excel-roster');
        if (exportExcelBtn) {
            exportExcelBtn.onclick = () => {
                if (!activeClass) {
                    Swal.fire({ icon: 'warning', title: 'กรุณาสร้างหรือเลือกห้องเรียนก่อน' });
                    return;
                }
                if (!window.XLSX) {
                    Swal.fire({ icon: 'error', title: 'ไม่พบไลบรารี Excel (XLSX)' });
                    return;
                }
                exportClassToExcel(activeClass);
            };
        }

        // Event: Paste students from Excel (supports upsert by code)
        document.getElementById('btn-paste-students').onclick = () => {
            if (!activeClass) return;
            Swal.fire({
                title: `วางรายชื่อนักเรียนห้อง ${activeClass.name}`,
                html: `
                    <p style="font-size:13px;color:#475569;text-align:left;margin-bottom:8px;">
                        คัดลอกตารางจาก Excel หรือพิมพ์รายชื่อบรรทัดละ 1 คน (เช่น <code>1  26201  ด.ช.  ธนกฤต  สุขสวัสดิ์  ต้นกล้า</code> หรือ <code>ด.ญ.ณัฐธิดา ทองดี</code>)<br>
                        <small style="color:#0284c7;">* หากเลขประจำตัวนักเรียนตรงกับที่มีอยู่แล้ว ระบบจะอัปเดตข้อมูลนักเรียนคนนั้นให้อัตโนมัติ</small>
                    </p>
                    <textarea id="paste-lines-area" rows="8" style="width:100%;font-family:inherit;font-size:13.5px;padding:10px;border:1px solid #cbd5e1;border-radius:10px;" placeholder="1\t26201\tด.ช.\tธนกฤต\tสุขสวัสดิ์\tต้นกล้า"></textarea>
                `,
                showCancelButton: true,
                confirmButtonText: 'นำเข้า / อัปเดตรายชื่อ',
                confirmButtonColor: '#0d257c',
                preConfirm: () => document.getElementById('paste-lines-area').value,
            }).then(async (res) => {
                if (res.isConfirmed && res.value) {
                    const parsed = parseStudentText(res.value, activeClass.students.length);
                    if (parsed.rows.length) {
                        const summary = upsertStudentsByCode(activeClass, parsed.rows, parsed.fields);
                        await pushCloudRoster();
                        renderRosterTab(container);
                        Swal.fire({
                            icon: 'success',
                            title: 'นำเข้าและอัปเดตรายชื่อสำเร็จ',
                            text: `อัปเดตข้อมูลเดิม ${summary.updated} คน • เพิ่มนักเรียนใหม่ ${summary.added} คน`,
                            timer: 2200,
                            showConfirmButton: false,
                        });
                    } else {
                        Swal.fire({ icon: 'warning', title: 'ไม่พบรายชื่อที่อ่านได้', text: 'กรุณาตรวจสอบรูปแบบข้อมูลที่วาง' });
                    }
                }
            });
        };

        // Event: Add single student
        const addStudentBtn = document.getElementById('btn-add-student-row');
        if (addStudentBtn && activeClass) {
            addStudentBtn.onclick = () => openStudentModal(activeClass, null, container);
        }

        // Event: Edit single student
        container.querySelectorAll('[data-edit-student]').forEach((btn) => {
            btn.onclick = () => {
                const idx = Number(btn.getAttribute('data-edit-student'));
                if (activeClass && activeClass.students[idx]) {
                    openStudentModal(activeClass, idx, container);
                }
            };
        });

        // Event: Delete single student
        container.querySelectorAll('[data-del-student]').forEach((btn) => {
            btn.onclick = async () => {
                const idx = Number(btn.getAttribute('data-del-student'));
                const stu = activeClass && activeClass.students[idx];
                if (!stu) return;
                const fullName = `${stu.prefix || ''}${stu.firstName || ''}${stu.lastName ? ' ' + stu.lastName : ''}`.trim();
                const confirmRes = await Swal.fire({
                    icon: 'warning',
                    title: `ลบรายชื่อ ${fullName || 'นักเรียน'}?`,
                    text: stu.code ? `รหัสนักเรียน ${stu.code} จะถูกลบออกจากห้อง ${activeClass.name}` : `จะถูกลบออกจากห้อง ${activeClass.name}`,
                    showCancelButton: true,
                    confirmButtonText: 'ลบรายชื่อ',
                    cancelButtonText: 'ยกเลิก',
                    confirmButtonColor: '#be123c',
                });
                if (!confirmRes.isConfirmed) return;
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
                const confirmRes = await Swal.fire({
                    icon: 'warning',
                    title: `ลบห้องเรียน ${activeClass.name}?`,
                    text: `รายชื่อนักเรียน ${(activeClass.students || []).length} คนในห้องนี้จะถูกลบออกจากระบบกลางและทุกสื่อการสอน`,
                    showCancelButton: true,
                    confirmButtonText: 'ลบห้องนี้',
                    cancelButtonText: 'ยกเลิก',
                    confirmButtonColor: '#be123c',
                });
                if (!confirmRes.isConfirmed) return;
                state.roster.classes = state.roster.classes.filter((c) => c.id !== activeClass.id);
                state.activeClassId = state.roster.classes[0]?.id || '';
                await pushCloudRoster();
                renderRosterTab(container);
            };
        }

        // Event: Excel upload (upsert by student code)
        const excelInput = document.getElementById('excel-roster-input');
        if (excelInput) {
            excelInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file || !window.XLSX || !activeClass) return;
                const reader = new FileReader();
                reader.onload = async (evt) => {
                    try {
                        const buf = evt.target.result;
                        let wb;
                        if (/\.csv$/i.test(file.name)) {
                            let text;
                            try {
                                text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
                            } catch (err) {
                                text = new TextDecoder('windows-874').decode(buf);
                            }
                            wb = XLSX.read(text.replace(/^\uFEFF/, ''), { type: 'string', raw: true });
                        } else {
                            wb = XLSX.read(buf, { type: 'array' });
                        }
                        const firstSheet = wb.Sheets[wb.SheetNames[0]];
                        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: '' });
                        const parsed = parseStudentRows(rows, activeClass.students.length);
                        if (!parsed.rows.length) {
                            Swal.fire({ icon: 'warning', title: 'ไม่พบรายชื่อในไฟล์', text: 'กรุณาตรวจสอบว่าไฟล์มีคอลัมน์รหัสนักเรียนหรือชื่อนักเรียน' });
                            return;
                        }
                        const summary = upsertStudentsByCode(activeClass, parsed.rows, parsed.fields);
                        await pushCloudRoster();
                        renderRosterTab(container);
                        Swal.fire({
                            icon: 'success',
                            title: 'นำเข้าและอัปเดตจาก Excel สำเร็จ',
                            html: `ห้อง <b>${esc(activeClass.name)}</b><br>อัปเดตข้อมูลเดิม <b>${summary.updated}</b> คน • เพิ่มใหม่ <b>${summary.added}</b> คน<br><small style="color:#64748b;">(ยึดเลขประจำตัวนักเรียนเป็นหลักในการอัปเดต และซิงค์ไปยังทุกสื่อแล้ว)</small>`,
                            timer: 2600,
                            showConfirmButton: false,
                        });
                    } catch (err) {
                        Swal.fire({ icon: 'error', title: 'อ่านไฟล์ไม่สำเร็จ', text: err.message || 'ไฟล์ Excel/CSV ไม่ถูกต้อง' });
                    } finally {
                        e.target.value = '';
                    }
                };
                reader.readAsArrayBuffer(file);
            };
        }
    }

    function openRenameClassModal(activeClass, container) {
        Swal.fire({
            title: `แก้ไขชื่อห้องเรียน (${activeClass.name})`,
            html: `
                <div style="text-align:left;display:grid;gap:12px;font-size:13.5px;">
                    <div>
                        <label style="font-weight:700;">ชื่อชั้น/ห้องเรียน</label>
                        <input id="cls-edit-name" type="text" class="swal2-input" style="margin:4px 0 0;width:100%;height:40px;" maxlength="40" value="${esc(activeClass.name || '')}" placeholder="เช่น ม.2/1">
                    </div>
                    <div>
                        <label style="font-weight:700;">หมายเหตุ (ไม่บังคับ)</label>
                        <input id="cls-edit-note" type="text" class="swal2-input" style="margin:4px 0 0;width:100%;height:40px;" maxlength="120" value="${esc(activeClass.note || '')}" placeholder="เช่น ครูประจำชั้น / รายวิชาที่สอน">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'บันทึกชื่อห้อง',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#0d257c',
            preConfirm: () => {
                const name = document.getElementById('cls-edit-name').value.trim();
                const note = document.getElementById('cls-edit-note').value.trim();
                if (!name) {
                    Swal.showValidationMessage('กรุณากรอกชื่อห้องเรียน');
                    return false;
                }
                const dup = (state.roster.classes || []).some((c) => c.id !== activeClass.id && c.name.trim() === name);
                if (dup) {
                    Swal.showValidationMessage(`มีห้องเรียนชื่อ "${name}" อยู่แล้ว`);
                    return false;
                }
                return { name, note };
            },
        }).then(async (res) => {
            if (res.isConfirmed && res.value) {
                activeClass.name = res.value.name;
                activeClass.note = res.value.note;
                await pushCloudRoster();
                renderRosterTab(container);
                Swal.fire({
                    icon: 'success',
                    title: 'แก้ไขชื่อห้องเรียบร้อย',
                    text: `เปลี่ยนเป็นห้อง "${activeClass.name}" และซิงค์ไปยังสื่อทั้งหมดแล้ว`,
                    timer: 1600,
                    showConfirmButton: false,
                });
            }
        });
    }

    function mergeSelectedAdminClasses(selectedClasses) {
        if (!Array.isArray(state.roster.classes)) state.roster.classes = [];
        const allFields = new Set(['no', 'code', 'prefix', 'firstName', 'lastName', 'nick', 'gender']);
        let addedClasses = 0;
        let updatedClasses = 0;
        let totalStudents = 0;
        let firstTouchedId = '';

        selectedClasses.forEach((src, i) => {
            if (!src || !src.name) return;
            const srcStudents = Array.isArray(src.students) ? src.students : [];
            const existing = state.roster.classes.find((c) => c.id === src.id)
                || state.roster.classes.find((c) => c.name.trim() === src.name.trim());

            if (existing) {
                if (src.note && !existing.note) existing.note = src.note;
                const mapped = srcStudents.map((s, idx) => ({
                    no: s.no != null && s.no !== '' ? Number(s.no) : idx + 1,
                    code: normThaiDigits(s.code).trim(),
                    prefix: s.prefix || '',
                    firstName: s.firstName || '',
                    lastName: s.lastName || '',
                    nick: s.nick || '',
                    gender: s.gender || parseGenderVal('', s.prefix),
                }));
                upsertStudentsByCode(existing, mapped, allFields);
                updatedClasses += 1;
                totalStudents += mapped.length;
                if (!firstTouchedId) firstTouchedId = existing.id;
            } else {
                const usedIds = new Set(state.roster.classes.map((c) => c.id));
                const newId = src.id && !usedIds.has(src.id) ? String(src.id) : `cls_${Date.now()}_${i}`;
                const clonedStudents = srcStudents.map((s, idx) => ({
                    id: s.id || `s_${newId}_${idx + 1}`,
                    no: s.no != null && s.no !== '' ? Number(s.no) : idx + 1,
                    code: normThaiDigits(s.code).trim(),
                    prefix: s.prefix || '',
                    firstName: s.firstName || '',
                    lastName: s.lastName || '',
                    nick: s.nick || '',
                    gender: s.gender || parseGenderVal('', s.prefix),
                }));
                sortStudentsByNo(clonedStudents);
                state.roster.classes.push({
                    id: newId,
                    name: src.name,
                    note: src.note || '',
                    students: clonedStudents,
                    groups: [],
                });
                addedClasses += 1;
                totalStudents += clonedStudents.length;
                if (!firstTouchedId) firstTouchedId = newId;
            }
        });

        if (firstTouchedId) state.activeClassId = firstTouchedId;
        return { addedClasses, updatedClasses, totalStudents };
    }

    async function openPullAdminRosterModal(onAfterPull) {
        if (!state.token) {
            Swal.fire({ icon: 'warning', title: 'กรุณาเข้าสู่ระบบก่อน', text: 'การดึงรายชื่อกลางจาก Admin จำเป็นต้องเข้าสู่ระบบออนไลน์' });
            return;
        }

        Swal.fire({
            title: 'กำลังโหลดรายชื่อกลางจากผู้ดูแลระบบ...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
        });

        let adminClasses = [];
        try {
            const res = await fetch('/api/roster?scope=shared', {
                headers: { 'Authorization': `Bearer ${state.token}` },
            });
            const json = await res.json();
            if (!res.ok || !json.ok) {
                throw new Error(json.error || 'ไม่สามารถดึงข้อมูลจากฐานข้อมูลกลางได้');
            }
            adminClasses = Array.isArray(json.classes) ? json.classes : [];
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'ดึงรายชื่อกลางไม่สำเร็จ',
                text: err.message || 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง',
            });
            return;
        }

        if (!adminClasses.length) {
            Swal.fire({
                icon: 'info',
                title: 'ยังไม่มีรายชื่อนักเรียนในฐานข้อมูลกลาง',
                text: 'ผู้ดูแลระบบ (Admin) ยังไม่ได้เพิ่มรายชื่อห้องเรียนในฐานข้อมูลกลาง คุณครูสามารถเพิ่มห้องเรียนและนำเข้าไฟล์ Excel เองได้ทันที',
            });
            return;
        }

        const myClasses = state.roster.classes || [];
        const hasExisting = (cls) => myClasses.some((c) => c.id === cls.id || c.name.trim() === String(cls.name || '').trim());

        const res = await Swal.fire({
            title: 'ดึงรายชื่อนักเรียนจากฐานข้อมูลกลาง (Admin)',
            width: 680,
            html: `
                <div style="text-align:left;font-size:13.5px;">
                    <p style="margin:0 0 10px;color:#475569;">
                        เลือกห้องเรียนที่ต้องการดึงเข้าสู่บัญชีของคุณครู (พบทั้งหมด <b>${adminClasses.length}</b> ห้องเรียน)
                        <br><small style="color:#0284c7;">* หากเลือกห้องที่มีอยู่แล้ว ระบบจะอัปเดตข้อมูลตามเลขประจำตัวนักเรียนโดยคงแต้มและประวัติเดิมไว้</small>
                    </p>
                    <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap;">
                        <input id="adm-cls-search" type="text" placeholder="ค้นหาชื่อห้อง เช่น ม.2, ม.4..." style="flex:1 1 200px;padding:7px 11px;border:1px solid #cbd5e1;border-radius:8px;font-family:inherit;font-size:13.5px;">
                        <button type="button" id="adm-cls-sel-all" class="sby-btn sby-btn-outline sby-btn-sm">เลือกทั้งหมด</button>
                        <button type="button" id="adm-cls-sel-none" class="sby-btn sby-btn-outline sby-btn-sm">ล้างการเลือก</button>
                        <span id="adm-cls-count" style="font-size:12.5px;font-weight:700;color:#0d257c;">เลือกแล้ว 0 ห้อง</span>
                    </div>
                    <div id="adm-cls-list" style="max-height:320px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:10px;padding:6px;background:#f8fafc;display:flex;flex-direction:column;gap:6px;">
                        ${adminClasses.map((cls, idx) => {
                            const exists = hasExisting(cls);
                            const count = (cls.students || []).length;
                            return `
                                <label data-cls-row="${esc(String(cls.name || '').toLowerCase())} ${esc(String(cls.note || '').toLowerCase())}" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;border-radius:8px;background:#ffffff;border:1px solid #e2e8f0;cursor:pointer;">
                                    <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                                        <input type="checkbox" class="adm-cls-chk" value="${idx}" style="width:18px;height:18px;accent-color:#0d257c;cursor:pointer;">
                                        <div style="min-width:0;">
                                            <div style="font-weight:700;color:#07164a;font-size:14.5px;">
                                                ห้อง ${esc(cls.name)}
                                                <span style="font-weight:600;color:#64748b;font-size:12.5px;margin-left:6px;">(${count} คน)</span>
                                            </div>
                                            ${cls.note || cls.ownerName ? `<div style="font-size:12px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${cls.note ? `${esc(cls.note)} • ` : ''}โดย ${esc(cls.ownerName || 'Admin')}</div>` : ''}
                                        </div>
                                    </div>
                                    <span class="sby-badge ${exists ? 'sby-badge-amber' : 'sby-badge-green'}" style="flex-shrink:0;">
                                        ${exists ? 'มีห้องนี้แล้ว (อัปเดต)' : 'ห้องใหม่'}
                                    </span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-cloud-arrow-down"></i> ดึงห้องที่เลือก',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#0d257c',
            didOpen: (popup) => {
                const countEl = popup.querySelector('#adm-cls-count');
                const searchEl = popup.querySelector('#adm-cls-search');
                const rows = Array.from(popup.querySelectorAll('[data-cls-row]'));
                const chks = Array.from(popup.querySelectorAll('.adm-cls-chk'));

                const updateCount = () => {
                    const n = chks.filter((c) => c.checked).length;
                    if (countEl) countEl.textContent = `เลือกแล้ว ${n} ห้อง`;
                };
                chks.forEach((c) => c.addEventListener('change', updateCount));

                popup.querySelector('#adm-cls-sel-all').onclick = () => {
                    rows.forEach((row) => {
                        if (row.style.display !== 'none') {
                            const cb = row.querySelector('.adm-cls-chk');
                            if (cb) cb.checked = true;
                        }
                    });
                    updateCount();
                };
                popup.querySelector('#adm-cls-sel-none').onclick = () => {
                    chks.forEach((cb) => { cb.checked = false; });
                    updateCount();
                };
                searchEl.oninput = () => {
                    const q = searchEl.value.trim().toLowerCase();
                    rows.forEach((row) => {
                        const hay = row.getAttribute('data-cls-row') || '';
                        row.style.display = !q || hay.includes(q) ? 'flex' : 'none';
                    });
                };
            },
            preConfirm: () => {
                const checked = Array.from(document.querySelectorAll('.adm-cls-chk:checked')).map((c) => Number(c.value));
                if (!checked.length) {
                    Swal.showValidationMessage('กรุณาเลือกอย่างน้อย 1 ห้องเรียน');
                    return false;
                }
                return checked.map((i) => adminClasses[i]).filter(Boolean);
            },
        });

        if (!res.isConfirmed || !res.value || !res.value.length) return;

        const summary = mergeSelectedAdminClasses(res.value);
        await pushCloudRoster();
        if (typeof onAfterPull === 'function') onAfterPull();
        Swal.fire({
            icon: 'success',
            title: 'ดึงรายชื่อนักเรียนกลางสำเร็จ',
            html: `เพิ่มห้องใหม่ <b>${summary.addedClasses}</b> ห้อง • อัปเดตห้องเดิม <b>${summary.updatedClasses}</b> ห้อง<br><small style="color:#64748b;">รวมรายชื่อนักเรียน ${summary.totalStudents} คน และซิงค์ไปยังสื่อทั้ง 9 ระบบแล้ว</small>`,
            timer: 2600,
            showConfirmButton: false,
        });
    }

    function openStudentModal(activeClass, studentIndex, container) {
        const isEdit = studentIndex != null && activeClass.students[studentIndex];
        const existing = isEdit ? activeClass.students[studentIndex] : null;
        const maxNo = (activeClass.students || []).reduce((m, s) => Math.max(m, Number(s.no) || 0), 0);
        const cur = existing || {
            no: maxNo + 1,
            code: '',
            prefix: 'ด.ช.',
            firstName: '',
            lastName: '',
            nick: '',
            gender: '',
        };
        const prefixChoices = ['', 'ด.ช.', 'ด.ญ.', 'นาย', 'นางสาว', 'นาง'];
        const curPrefix = prefixChoices.includes(cur.prefix || '') ? (cur.prefix || '') : '';

        Swal.fire({
            title: isEdit ? `แก้ไขข้อมูลนักเรียน (ห้อง ${activeClass.name})` : `เพิ่มนักเรียนห้อง ${activeClass.name}`,
            html: `
                <div style="text-align:left;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13.5px;">
                    <div><label>เลขที่</label><input id="st-no" type="number" inputmode="numeric" class="swal2-input" style="margin:4px 0 0;width:100%;height:38px;" value="${esc(cur.no ?? '')}"></div>
                    <div><label>รหัสนักเรียน (เลขประจำตัว)</label><input id="st-code" type="text" inputmode="numeric" class="swal2-input" style="margin:4px 0 0;width:100%;height:38px;" value="${esc(cur.code || '')}" placeholder="เช่น 26207"></div>
                    <div>
                        <label>คำนำหน้า</label>
                        <select id="st-prefix" class="swal2-input" style="margin:4px 0 0;width:100%;height:38px;">
                            ${prefixChoices.map((p) => `<option value="${esc(p)}"${p === curPrefix ? ' selected' : ''}>${p || '— ไม่ระบุ —'}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label>เพศ</label>
                        <select id="st-gender" class="swal2-input" style="margin:4px 0 0;width:100%;height:38px;">
                            <option value=""${!cur.gender ? ' selected' : ''}>ตามคำนำหน้า</option>
                            <option value="m"${cur.gender === 'm' ? ' selected' : ''}>ชาย</option>
                            <option value="f"${cur.gender === 'f' ? ' selected' : ''}>หญิง</option>
                        </select>
                    </div>
                    <div><label>ชื่อจริง</label><input id="st-first" type="text" class="swal2-input" style="margin:4px 0 0;width:100%;height:38px;" value="${esc(cur.firstName || '')}"></div>
                    <div><label>นามสกุล</label><input id="st-last" type="text" class="swal2-input" style="margin:4px 0 0;width:100%;height:38px;" value="${esc(cur.lastName || '')}"></div>
                    <div style="grid-column:1 / -1;"><label>ชื่อเล่น (แสดงบนจอหน้าห้อง)</label><input id="st-nick" type="text" class="swal2-input" style="margin:4px 0 0;width:100%;height:38px;" value="${esc(cur.nick || '')}" placeholder="เช่น ต้นกล้า"></div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มนักเรียน',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#0d257c',
            preConfirm: () => {
                const prefix = document.getElementById('st-prefix').value;
                const firstName = document.getElementById('st-first').value.trim();
                if (!firstName) {
                    Swal.showValidationMessage('กรุณากรอกชื่อนักเรียน');
                    return false;
                }
                const noVal = document.getElementById('st-no').value.trim();
                const genderInput = document.getElementById('st-gender').value;
                const derivedGender = ['ด.ช.', 'นาย'].includes(prefix) ? 'm' : ['ด.ญ.', 'นางสาว', 'นาง'].includes(prefix) ? 'f' : '';
                return {
                    no: noVal === '' ? '' : Number(noVal),
                    code: normThaiDigits(document.getElementById('st-code').value).trim(),
                    prefix,
                    firstName,
                    lastName: document.getElementById('st-last').value.trim(),
                    nick: document.getElementById('st-nick').value.trim(),
                    gender: genderInput || derivedGender,
                };
            },
        }).then(async (res) => {
            if (res.isConfirmed && res.value) {
                if (isEdit) {
                    Object.assign(existing, res.value);
                } else {
                    activeClass.students.push(Object.assign({ id: 's_' + Date.now() }, res.value));
                }
                sortStudentsByNo(activeClass.students);
                await pushCloudRoster();
                renderRosterTab(container);
                Swal.fire({
                    icon: 'success',
                    title: isEdit ? 'บันทึกการแก้ไขเรียบร้อย' : 'เพิ่มนักเรียนเรียบร้อย',
                    timer: 1400,
                    showConfirmButton: false,
                });
            }
        });
    }

    function exportClassToExcel(activeClass) {
        const sorted = (activeClass.students || []).slice();
        sortStudentsByNo(sorted);
        const rows = [['เลขที่', 'รหัสนักเรียน', 'คำนำหน้า', 'ชื่อ', 'นามสกุล', 'ชื่อเล่น', 'เพศ']];
        sorted.forEach((s, idx) => {
            rows.push([
                s.no != null && s.no !== '' ? Number(s.no) : idx + 1,
                String(s.code || ''),
                String(s.prefix || ''),
                String(s.firstName || ''),
                String(s.lastName || ''),
                String(s.nick || ''),
                s.gender === 'm' ? 'ชาย' : s.gender === 'f' ? 'หญิง' : '',
            ]);
        });
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 11 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 10 }];
        const wsHelp = XLSX.utils.aoa_to_sheet([
            ['คำแนะนำการแก้ไขและนำเข้ากลับเพื่ออัปเดตข้อมูล'],
            ['1. คอลัมน์ "รหัสนักเรียน" ใช้เป็นรหัสหลักในการจับคู่เพื่ออัปเดตข้อมูลนักเรียนเดิมโดยไม่ทำให้แต้มหรือประวัติหาย'],
            ['2. คุณครูสามารถแก้ไข เลขที่ คำนำหน้า ชื่อ นามสกุล ชื่อเล่น หรือเพศ แล้วบันทึกไฟล์นี้'],
            ['3. หากเพิ่มแถวนักเรียนใหม่ที่ยังไม่มีรหัสนักเรียนในห้อง ระบบจะเพิ่มเป็นนักเรียนใหม่ให้โดยอัตโนมัติ'],
            ['4. นำไฟล์ที่แก้ไขแล้วกลับมากดปุ่ม "นำเข้า/อัปเดต Excel (.xlsx/.csv)" ที่หน้าหลักเพื่ออัปเดตและซิงค์ทุกสื่อ'],
        ]);
        wsHelp['!cols'] = [{ wch: 90 }];
        const wb = XLSX.utils.book_new();
        const sheetName = String(activeClass.name || 'รายชื่อนักเรียน').replace(/[\\/?*[\]:]/g, '-').slice(0, 31) || 'รายชื่อนักเรียน';
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.utils.book_append_sheet(wb, wsHelp, 'คำอธิบาย');
        const safeName = String(activeClass.name || 'class').replace(/[\\/:*?"<>|\s]+/g, '_');
        const stamp = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `รายชื่อนักเรียน_${safeName}_${stamp}.xlsx`);
    }

    const ROSTER_PREFIX_RE = /^(เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|ดช\.|ดญ\.|นางสาว|น\.ส\.|นาย|นาง)\s*/;
    const ROSTER_PREFIX_MAP = { 'เด็กชาย': 'ด.ช.', 'เด็กหญิง': 'ด.ญ.', 'ดช.': 'ด.ช.', 'ดญ.': 'ด.ญ.', 'น.ส.': 'นางสาว' };
    const ROSTER_HEADER_FIELDS = [
        { f: 'no', alias: ['เลขที่', 'ที่', 'no', 'ลำดับ', 'ลำดับที่'] },
        { f: 'code', alias: ['รหัสนักเรียน', 'เลขประจำตัว', 'เลขประจำตัวนักเรียน', 'รหัสประจำตัว', 'รหัสประจำตัวนักเรียน', 'รหัส', 'studentid', 'studentcode', 'id', 'code'] },
        { f: 'prefix', alias: ['คำนำหน้า', 'คำนำหน้าชื่อ', 'prefix', 'title'] },
        { f: 'firstName', alias: ['ชื่อ', 'ชื่อจริง', 'firstname', 'name'] },
        { f: 'lastName', alias: ['สกุล', 'นามสกุล', 'lastname', 'surname'] },
        { f: 'fullName', alias: ['ชื่อสกุล', 'ชื่อนามสกุล', 'ชื่อและนามสกุล', 'ชื่อ-สกุล', 'fullname', 'ชื่อนักเรียน'] },
        { f: 'nick', alias: ['ชื่อเล่น', 'nickname', 'nick'] },
        { f: 'gender', alias: ['เพศ', 'gender', 'sex'] },
    ];

    function normThaiDigits(v) {
        return String(v ?? '').replace(/[๐-๙]/g, (d) => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d)));
    }

    function matchRosterHeader(h) {
        const k = String(h || '').toLowerCase().replace(/[\s._\-/()]/g, '');
        if (!k) return '';
        const hit = ROSTER_HEADER_FIELDS.find((x) => x.alias.some((a) => a.toLowerCase().replace(/[\s._\-/()]/g, '') === k));
        return hit ? hit.f : '';
    }

    function parseGenderVal(g, prefix) {
        const s = String(g || '').trim().toLowerCase();
        if (/^(ชาย|ช|m|male|ผู้ชาย)$/.test(s)) return 'm';
        if (/^(หญิง|ญ|f|female|ผู้หญิง)$/.test(s)) return 'f';
        if (['ด.ช.', 'นาย'].includes(prefix)) return 'm';
        if (['ด.ญ.', 'นางสาว', 'นาง'].includes(prefix)) return 'f';
        return '';
    }

    function sortStudentsByNo(list) {
        if (!Array.isArray(list)) return;
        list.sort((a, b) => {
            const na = a.no === '' || a.no == null || Number.isNaN(Number(a.no)) ? Infinity : Number(a.no);
            const nb = b.no === '' || b.no == null || Number.isNaN(Number(b.no)) ? Infinity : Number(b.no);
            return na - nb;
        });
    }

    function parseStudentRows(rows, startNo) {
        const clean = (rows || []).map((r) => (Array.isArray(r) ? r : [r]).map((c) => String(c ?? '').replace(/\s+/g, ' ').trim()));
        let headerIdx = -1;
        let bestHits = 0;
        clean.slice(0, 10).forEach((r, i) => {
            const hits = r.filter((c) => matchRosterHeader(c)).length;
            if (hits >= 2 && hits > bestHits) { bestHits = hits; headerIdx = i; }
        });

        const out = [];
        const fields = new Set();

        if (headerIdx >= 0) {
            const used = new Set();
            const map = clean[headerIdx].map((c) => {
                const f = matchRosterHeader(c);
                if (!f || used.has(f)) return '';
                used.add(f);
                fields.add(f);
                return f;
            });
            if (fields.has('fullName')) {
                fields.add('prefix');
                fields.add('firstName');
                fields.add('lastName');
            }
            const get = (r, f) => {
                const i = map.indexOf(f);
                return i >= 0 ? String(r[i] ?? '').trim() : '';
            };

            clean.slice(headerIdx + 1).forEach((r) => {
                if (!r.some(Boolean)) return;
                const noRaw = normThaiDigits(get(r, 'no')).trim();
                const code = normThaiDigits(get(r, 'code')).trim();
                let prefix = get(r, 'prefix');
                let firstName = get(r, 'firstName');
                let lastName = get(r, 'lastName');
                const fullName = get(r, 'fullName');
                const nick = get(r, 'nick');
                const genderRaw = get(r, 'gender');

                if (fullName && !firstName) {
                    let rest = fullName;
                    const m = ROSTER_PREFIX_RE.exec(rest);
                    if (m) {
                        prefix = prefix || m[1];
                        rest = rest.slice(m[0].length).trim();
                    }
                    const sp = rest.split(/\s+/);
                    firstName = sp.shift() || '';
                    lastName = lastName || sp.join(' ');
                }
                if (!prefix && firstName) {
                    const m = ROSTER_PREFIX_RE.exec(firstName);
                    if (m) {
                        prefix = m[1];
                        firstName = firstName.slice(m[0].length).trim();
                    }
                }
                prefix = ROSTER_PREFIX_MAP[prefix] || prefix;
                const no = noRaw !== '' && /^\d+$/.test(noRaw) ? Number(noRaw) : '';
                const gender = parseGenderVal(genderRaw, prefix);

                if (firstName || code) {
                    out.push({
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
            return { rows: out, fields };
        }

        // ไม่มีหัวตาราง: วิเคราะห์ทีละแถว
        const preList = ['เด็กชาย', 'เด็กหญิง', 'นางสาว', 'ด.ช.', 'ด.ญ.', 'ดช.', 'ดญ.', 'น.ส.', 'นาย', 'นาง'];
        clean.forEach((origCols) => {
            const cols = origCols.filter((c) => c !== '');
            if (!cols.length) return;
            if (/^(เลขที่|ลำดับ|รหัส|ชื่อ)/.test(cols[0])) return;

            let no = '';
            let code = '';
            let prefix = '';
            let firstName = '';
            let lastName = '';
            let nick = '';
            let genderRaw = '';

            const c0 = normThaiDigits(cols[0]);
            if (/^\d{1,3}$/.test(c0)) {
                no = Number(c0);
                cols.shift();
                if (cols.length && /^\d{4,}$/.test(normThaiDigits(cols[0]))) {
                    code = normThaiDigits(cols.shift());
                }
            } else if (/^\d{4,}$/.test(c0)) {
                code = c0;
                cols.shift();
            }

            if (cols.length && /^(ชาย|หญิง|ช|ญ|m|f|male|female)$/i.test(cols[cols.length - 1])) {
                genderRaw = cols.pop();
            }

            if (cols.length >= 3 && preList.includes(cols[0])) {
                prefix = ROSTER_PREFIX_MAP[cols[0]] || cols[0];
                firstName = cols[1] || '';
                lastName = cols[2] || '';
                nick = cols[3] || '';
            } else if (cols.length >= 2 && !preList.some((p) => cols[0].startsWith(p))) {
                firstName = cols[0] || '';
                lastName = cols[1] || '';
                nick = cols[2] || '';
            } else if (cols.length) {
                let rest = cols[0];
                const m = ROSTER_PREFIX_RE.exec(rest);
                if (m) {
                    prefix = ROSTER_PREFIX_MAP[m[1]] || m[1];
                    rest = rest.slice(m[0].length).trim();
                }
                const sp = rest.split(/\s+/);
                firstName = sp.shift() || '';
                lastName = sp.join(' ');
                nick = cols[1] || '';
            }

            if (firstName || code) {
                out.push({
                    no: no !== '' ? no : (startNo + out.length + 1),
                    code,
                    prefix,
                    firstName,
                    lastName,
                    nick,
                    gender: parseGenderVal(genderRaw, prefix),
                });
            }
        });
        return { rows: out, fields: null };
    }

    function parseStudentText(text, startNo) {
        const lines = String(text || '').replace(/\r/g, '').split('\n').filter((l) => l.trim());
        const rows = lines.map((l) => (l.includes('\t') ? l.split('\t') : l.includes(',') ? l.split(',') : [l]));
        return parseStudentRows(rows, startNo);
    }

    /**
     * อัปเดตหรือเพิ่มรายชื่อนักเรียนโดยยึด "รหัสนักเรียน (code)" เป็นข้อมูลหลัก
     * - หากพบรหัสนักเรียนตรงกับที่มีอยู่ในห้อง: อัปเดตข้อมูลนักเรียนคนเดิม (คง id และ avatar เดิมไว้)
     * - หากไม่พบรหัส (หรือไม่มีรหัส): เพิ่มเป็นนักเรียนใหม่
     */
    function upsertStudentsByCode(activeClass, parsedRows, fields) {
        if (!Array.isArray(activeClass.students)) activeClass.students = [];
        const byCode = new Map();
        activeClass.students.forEach((s) => {
            const c = normThaiDigits(s.code).trim();
            if (c) byCode.set(c, s);
        });

        let maxNo = activeClass.students.reduce((m, s) => Math.max(m, Number(s.no) || 0), 0);
        let updated = 0;
        let added = 0;
        const hasField = (f) => (fields ? fields.has(f) : false);

        parsedRows.forEach((item, idx) => {
            const c = normThaiDigits(item.code).trim();
            const existing = c ? byCode.get(c) : null;

            if (existing) {
                existing.code = c;
                if (fields) {
                    if (hasField('no') && item.no !== '') existing.no = Number(item.no);
                    if (hasField('prefix')) existing.prefix = item.prefix;
                    if (hasField('firstName') && item.firstName) existing.firstName = item.firstName;
                    if (hasField('lastName')) existing.lastName = item.lastName;
                    if (hasField('nick')) existing.nick = item.nick;
                    if (hasField('gender')) {
                        existing.gender = item.gender;
                    } else if (hasField('prefix')) {
                        const derived = parseGenderVal('', existing.prefix);
                        if (derived) existing.gender = derived;
                    }
                } else {
                    if (item.no !== '' && item.no != null) existing.no = Number(item.no);
                    if (item.prefix) existing.prefix = item.prefix;
                    if (item.firstName) existing.firstName = item.firstName;
                    if (item.lastName) existing.lastName = item.lastName;
                    if (item.nick) existing.nick = item.nick;
                    if (item.gender) existing.gender = item.gender;
                }
                updated += 1;
            } else if (item.firstName) {
                const noVal = item.no !== '' && item.no != null ? Number(item.no) : ++maxNo;
                if (noVal > maxNo) maxNo = noVal;
                const newStu = {
                    id: `s_${Date.now()}_${idx}`,
                    no: noVal,
                    code: c,
                    prefix: item.prefix || '',
                    firstName: item.firstName,
                    lastName: item.lastName || '',
                    nick: item.nick || '',
                    gender: item.gender || parseGenderVal('', item.prefix),
                };
                activeClass.students.push(newStu);
                if (c) byCode.set(c, newStu);
                added += 1;
            }
        });

        sortStudentsByNo(activeClass.students);
        return { updated, added };
    }

    /* =====================================================================
       TAB 3: ซิงค์ & สำรองข้อมูลรวมทั้ง 9 ระบบ (Unified Cloud & Backup)
       ===================================================================== */
    function renderBackupTab(container) {
        container.innerHTML = `
            <div class="sby-panel">
                <div class="sby-panel-head">
                    <h3><i class="fas fa-cloud-arrow-up" style="color:#0284c7;"></i>ศูนย์สำรองและกู้คืนข้อมูลรวมทั้ง 9 ระบบ (Unified Full Backup)</h3>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button type="button" class="sby-btn sby-btn-primary" id="btn-export-full-bundle">
                            <i class="fas fa-download"></i><span>ดาวน์โหลดข้อมูลทั้งหมด 9 ระบบ (.json)</span>
                        </button>
                        <label class="sby-btn sby-btn-outline" style="margin:0;cursor:pointer;">
                            <i class="fas fa-folder-open"></i><span>กู้คืนข้อมูลจากไฟล์สำรองรวม (.json)</span>
                            <input type="file" id="import-full-bundle-input" accept=".json" style="display:none;">
                        </label>
                    </div>
                </div>
                <p style="color:#475569;font-size:14px;margin-top:0;">
                    นอกจากการบันทึกอัตโนมัติขึ้นฐานข้อมูลออนไลน์ (Cloudflare D1) แล้ว คุณครูยังสามารถดาวน์โหลดข้อมูลของสื่อทั้ง 9 ระบบรวมกันเป็นไฟล์ <code>.json</code> ไฟล์เดียว เพื่อเก็บสำรองไว้ในแฟลชไดรฟ์หรือ Google Drive ได้ตลอดเวลา
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
                    Swal.fire({ icon: 'success', title: 'กู้คืนข้อมูลทั้ง 9 ระบบสำเร็จ', timer: 1800, showConfirmButton: false });
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
                    ข้อมูลรายชื่อนักเรียน ชุดคำถาม และผลการทำกิจกรรมทั้ง 9 ระบบ จะถูกบันทึกและซิงค์เข้าบัญชีคุณครูอัตโนมัติบน Cloudflare D1
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
