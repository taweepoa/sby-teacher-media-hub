-- =====================================================================
-- ฐานข้อมูลระบบศูนย์รวมสื่อการสอนสำหรับครูมืออาชีพ (Cloudflare D1 / SQLite)
-- โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน | พัฒนาระบบโดย ครูทวีป นวคุณานนท์
-- =====================================================================

-- 1. ตารางรายชื่อครูผู้สอนและสิทธิ์การใช้งาน (Teacher Whitelist & Profile)
CREATE TABLE IF NOT EXISTS teachers (
    email TEXT PRIMARY KEY,
    google_sub TEXT,
    name TEXT NOT NULL,
    position TEXT DEFAULT 'ครูชำนาญการ',
    department TEXT DEFAULT 'กลุ่มสาระการเรียนรู้',
    avatar_url TEXT DEFAULT '',
    role TEXT DEFAULT 'teacher',          -- 'admin' | 'teacher'
    is_active INTEGER DEFAULT 1,          -- 1 = อนุญาต, 0 = ระงับ
    allow_external INTEGER DEFAULT 0,     -- 1 = อนุญาตอีเมลนอกโดเมน (@gmail.com)
    school_profile_json TEXT DEFAULT '{}',-- ข้อมูลโรงเรียน/ผอ./ปีการศึกษา/ภาคเรียน
    last_login_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ตั้งค่าผู้ดูแลระบบหลัก (ครูทวีป นวคุณานนท์) เป็น Admin เริ่มต้น
INSERT OR IGNORE INTO teachers (email, name, position, department, role, is_active, school_profile_json)
VALUES (
    'taweep@sby.ac.th',
    'ครูทวีป นวคุณานนท์',
    'ครูชำนาญการพิเศษ',
    'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี (คอมพิวเตอร์)',
    'admin',
    1,
    '{"name":"โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน","agency":"สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาลำพูน ลำปาง","director":"","academicYear":"2569","semester":"1","teacherName":"นายทวีป นวคุณานนท์","teacherPosition":"ครูชำนาญการพิเศษ"}'
);

-- 2. ตารางห้องเรียนและรายชื่อนักเรียนส่วนกลาง (Master Student Roster)
-- ใช้ซิงค์เข้าสู่ทุกแอป (วงล้อสุ่มชื่อ, กระดานแต้มพฤติกรรม, เกมเศรษฐี, บันไดงู, จับคู่, Buzzer)
CREATE TABLE IF NOT EXISTS master_classes (
    id TEXT NOT NULL,
    teacher_email TEXT NOT NULL,
    name TEXT NOT NULL,                   -- เช่น 'ม.2/1'
    note TEXT DEFAULT '',
    students_json TEXT NOT NULL DEFAULT '[]',
    groups_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (teacher_email, id),
    FOREIGN KEY (teacher_email) REFERENCES teachers(email) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_master_classes_teacher ON master_classes(teacher_email);

-- 3. ตารางเก็บสถานะและข้อมูลของสื่อการสอนทั้ง 7 ระบบ (App States)
CREATE TABLE IF NOT EXISTS app_states (
    teacher_email TEXT NOT NULL,
    app_id TEXT NOT NULL,                 -- 'vs-random-picker' | 'vs-class-points' | 'vs-millionaire-quiz' | 'vs-memory-game' | 'vs-snake-ladder-quiz' | 'vs-buzzer' | 'vs-classroom-timer'
    data_json TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (teacher_email, app_id),
    FOREIGN KEY (teacher_email) REFERENCES teachers(email) ON DELETE CASCADE
);

-- 4. ตารางบันทึกประวัติการเข้าใช้งานและซิงค์ข้อมูล (Audit Log)
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_email TEXT NOT NULL,
    action TEXT NOT NULL,
    app_id TEXT DEFAULT 'portal',
    detail TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);
