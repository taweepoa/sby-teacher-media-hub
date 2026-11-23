/* =====================================================================
   GET /api/roster — ดึงข้อมูลโรงเรียน + ห้องเรียนและรายชื่อนักเรียนส่วนกลาง (Master Roster)
   PUT /api/roster — บันทึกข้อมูลโรงเรียนและรายชื่อนักเรียนส่วนกลาง พร้อมซิงค์ไปยังทุกสื่อ
   ===================================================================== */
import { jsonResponse, requireAuth } from './_utils.js';

export async function onRequestGet(context) {
    const { env } = context;
    const user = await requireAuth(context);
    if (!user) return jsonResponse({ ok: false, error: 'กรุณาเข้าสู่ระบบ' }, 401);

    if (!env.DB) {
        return jsonResponse({ ok: true, schoolProfile: user.schoolProfile || {}, classes: [] });
    }

    const teacherRow = await env.DB.prepare('SELECT school_profile_json, name, position, department FROM teachers WHERE email = ?')
        .bind(user.email)
        .first();
    const classRows = await env.DB.prepare('SELECT id, name, note, students_json, groups_json, updated_at FROM master_classes WHERE teacher_email = ? ORDER BY name ASC')
        .bind(user.email)
        .all();

    const classes = (classRows.results || []).map((r) => ({
        id: r.id,
        name: r.name,
        note: r.note || '',
        students: JSON.parse(r.students_json || '[]'),
        groups: JSON.parse(r.groups_json || '[]'),
        updatedAt: r.updated_at,
    }));

    return jsonResponse({
        ok: true,
        schoolProfile: teacherRow ? JSON.parse(teacherRow.school_profile_json || '{}') : (user.schoolProfile || {}),
        classes,
    });
}

export async function onRequestPut(context) {
    const { request, env } = context;
    const user = await requireAuth(context);
    if (!user) return jsonResponse({ ok: false, error: 'กรุณาเข้าสู่ระบบ' }, 401);

    let body = {};
    try {
        body = await request.json();
    } catch (e) {
        return jsonResponse({ ok: false, error: 'ข้อมูล JSON ไม่ถูกต้อง' }, 400);
    }

    if (!env.DB) {
        return jsonResponse({ ok: true, savedAt: new Date().toISOString() });
    }

    const now = new Date().toISOString();

    // 1. บันทึกข้อมูลโรงเรียนและข้อมูลครูผู้สอน
    if (body.schoolProfile && typeof body.schoolProfile === 'object') {
        const sp = body.schoolProfile;
        await env.DB.prepare(`
            UPDATE teachers
            SET school_profile_json = ?,
                name = COALESCE(NULLIF(?, ''), name),
                position = COALESCE(NULLIF(?, ''), position),
                updated_at = ?
            WHERE email = ?
        `).bind(
            JSON.stringify(sp),
            sp.teacherName || '',
            sp.teacherPosition || '',
            now,
            user.email
        ).run();
    }

    // 2. บันทึกรายการห้องเรียนและนักเรียนส่วนกลาง
    if (Array.isArray(body.classes)) {
        await env.DB.prepare('DELETE FROM master_classes WHERE teacher_email = ?').bind(user.email).run();
        for (const cls of body.classes) {
            if (!cls || !cls.id) continue;
            await env.DB.prepare(`
                INSERT INTO master_classes (id, teacher_email, name, note, students_json, groups_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
                String(cls.id),
                user.email,
                String(cls.name || 'ห้องเรียน'),
                String(cls.note || ''),
                JSON.stringify(Array.isArray(cls.students) ? cls.students : []),
                JSON.stringify(Array.isArray(cls.groups) ? cls.groups : []),
                now
            ).run();
        }
    }

    return jsonResponse({
        ok: true,
        savedAt: now,
    });
}
