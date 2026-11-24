import { ensureD1Schema } from "./_db.js";
/* =====================================================================
   GET    /api/admin — ดึงรายชื่อครูผู้มีสิทธิ์ใช้งานทั้งหมด (เฉพาะ Admin)
   POST   /api/admin — เพิ่ม/แก้ไขสิทธิ์ครู (รองรับทั้ง @sby.ac.th และ @gmail.com รายบุคคล)
   DELETE /api/admin — ลบรายชื่อครูออกจากระบบ
   ===================================================================== */
import { jsonResponse, requireAuth, evaluateEmailRules, DEFAULT_ADMIN } from './_utils.js';

async function checkAdmin(context) {
    const user = await requireAuth(context);
    if (!user) return { ok: false, status: 401, error: 'กรุณาเข้าสู่ระบบ' };
    const { env } = context;
    if (user.email === (env.ADMIN_EMAIL || DEFAULT_ADMIN) || user.role === 'admin') {
        return { ok: true, user };
    }
    if (env.DB) { await ensureD1Schema(env.DB);
        const row = await env.DB.prepare('SELECT role FROM teachers WHERE email = ?').bind(user.email).first();
        if (row && row.role === 'admin') return { ok: true, user };
    }
    return { ok: false, status: 403, error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่จัดการสิทธิ์ครูได้' };
}

export async function onRequestGet(context) {
    const check = await checkAdmin(context);
    if (!check.ok) return jsonResponse({ ok: false, error: check.error }, check.status);

    const { env } = context;
    if (!env.DB) return jsonResponse({ ok: true, teachers: [] });

    const rows = await env.DB.prepare(`
        SELECT email, name, position, department, avatar_url, role, is_active, allow_external, last_login_at, created_at
        FROM teachers
        ORDER BY role ASC, name ASC
    `).all();

    return jsonResponse({
        ok: true,
        teachers: rows.results || [],
    });
}

export async function onRequestPost(context) {
    const check = await checkAdmin(context);
    if (!check.ok) return jsonResponse({ ok: false, error: check.error }, check.status);

    const { request, env } = context;
    let body = {};
    try {
        body = await request.json();
    } catch (e) {
        return jsonResponse({ ok: false, error: 'ข้อมูล JSON ไม่ถูกต้อง' }, 400);
    }

    const rule = evaluateEmailRules(body.email);
    if (!rule.valid) {
        return jsonResponse({ ok: false, error: rule.reason }, 400);
    }

    const email = rule.email;
    const name = String(body.name || email.split('@')[0]).trim();
    const position = String(body.position || 'ครู').trim();
    const department = String(body.department || 'โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน').trim();
    const role = body.role === 'admin' ? 'admin' : 'teacher';
    const isActive = body.isActive === false || body.isActive === 0 ? 0 : 1;
    const allowExternal = !rule.isSchoolDomain ? 1 : 0;

    if (env.DB) await ensureD1Schema(env.DB);
    if (!env.DB) {
        return jsonResponse({ ok: true, teacher: { email, name, position, department, role, is_active: isActive } });
    }

    const defaultSchool = JSON.stringify({
        name: 'โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
        agency: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาลำปาง ลำพูน',
        director: '',
        academicYear: String(new Date().getFullYear() + 543),
        semester: '1',
        teacherName: name,
        teacherPosition: position,
    });

    await env.DB.prepare(`
        INSERT INTO teachers (email, name, position, department, role, is_active, allow_external, school_profile_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(email) DO UPDATE SET
            name = excluded.name,
            position = excluded.position,
            department = excluded.department,
            role = excluded.role,
            is_active = excluded.is_active,
            allow_external = excluded.allow_external,
            updated_at = datetime('now')
    `).bind(email, name, position, department, role, isActive, allowExternal, defaultSchool).run();

    return jsonResponse({
        ok: true,
        message: `บันทึกสิทธิ์ของ ${name} (${email}) เรียบร้อยแล้ว`,
    });
}

export async function onRequestDelete(context) {
    const check = await checkAdmin(context);
    if (!check.ok) return jsonResponse({ ok: false, error: check.error }, check.status);

    const { request, env } = context;
    const url = new URL(request.url);
    const email = String(url.searchParams.get('email') || '').trim().toLowerCase();
    if (!email) return jsonResponse({ ok: false, error: 'กรุณาระบุอีเมลที่ต้องการลบ' }, 400);
    if (email === (env.ADMIN_EMAIL || DEFAULT_ADMIN)) {
        return jsonResponse({ ok: false, error: 'ไม่สามารถลบบัญชีผู้ดูแลระบบหลักได้' }, 400);
    }

    if (env.DB) { await ensureD1Schema(env.DB);
        await env.DB.prepare('DELETE FROM teachers WHERE email = ?').bind(email).run();
    }
    return jsonResponse({ ok: true, deleted: email });
}
