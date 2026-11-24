/* =====================================================================
   自動สร้างตารางฐานข้อมูล Cloudflare D1 (Auto-Initialize Schema)
   ทำงานอัตโนมัติใน API โดยไม่ต้องพึ่งการรัน SQL ในหน้า Console เพียงอย่างเดียว
   ===================================================================== */

let schemaInitialized = false;

export async function ensureD1Schema(db) {
    if (!db || schemaInitialized) return;
    try {
        await db.batch([
            db.prepare(`CREATE TABLE IF NOT EXISTS teachers (email TEXT PRIMARY KEY, google_sub TEXT, name TEXT NOT NULL, position TEXT DEFAULT 'ครูชำนาญการ', department TEXT DEFAULT 'กลุ่มสาระการเรียนรู้', avatar_url TEXT DEFAULT '', role TEXT DEFAULT 'teacher', is_active INTEGER DEFAULT 1, allow_external INTEGER DEFAULT 0, school_profile_json TEXT DEFAULT '{}', last_login_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`),
            db.prepare(`INSERT OR IGNORE INTO teachers (email, name, position, department, role, is_active, school_profile_json) VALUES ('taweep@sby.ac.th', 'ครูทวีป นวคุณานนท์', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี (คอมพิวเตอร์)', 'admin', 1, '{"name":"โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน","agency":"สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาลำปาง ลำพูน","director":"","academicYear":"2569","semester":"1","teacherName":"นายทวีป นวคุณานนท์","teacherPosition":"ครูชำนาญการพิเศษ"}')`),
            db.prepare(`CREATE TABLE IF NOT EXISTS master_classes (id TEXT NOT NULL, teacher_email TEXT NOT NULL, name TEXT NOT NULL, note TEXT DEFAULT '', students_json TEXT NOT NULL DEFAULT '[]', groups_json TEXT NOT NULL DEFAULT '[]', updated_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (teacher_email, id))`),
            db.prepare(`CREATE INDEX IF NOT EXISTS idx_master_classes_teacher ON master_classes(teacher_email)`),
            db.prepare(`CREATE TABLE IF NOT EXISTS app_states (teacher_email TEXT NOT NULL, app_id TEXT NOT NULL, data_json TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (teacher_email, app_id))`),
            db.prepare(`CREATE TABLE IF NOT EXISTS activity_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, teacher_email TEXT NOT NULL, action TEXT NOT NULL, app_id TEXT DEFAULT 'portal', detail TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`),
        ]);
        schemaInitialized = true;
    } catch (e) {
        // กรณีรันใน local mock หรือตารางมีอยู่แล้ว
    }
}
