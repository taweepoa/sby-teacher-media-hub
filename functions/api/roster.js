import { ensureD1Schema } from "./_db.js";
/* =====================================================================
   GET /api/roster              — ดึงข้อมูลโรงเรียน + ห้องเรียนและรายชื่อนักเรียนของครู (Master Roster)
   GET /api/roster?scope=shared — ดึงรายการห้องเรียนกลางทั้งหมดที่ผู้ดูแลระบบ (Admin) เพิ่มไว้ ให้ครูเลือกดึงเฉพาะห้องที่สอนได้
   PUT /api/roster              — บันทึกข้อมูลโรงเรียนและรายชื่อนักเรียนส่วนกลาง พร้อมซิงค์ไปยังทุกสื่อ
   ===================================================================== */
import { jsonResponse, requireAuth, DEFAULT_ADMIN } from './_utils.js';

export async function onRequestGet(context) {
    const { request, env } = context;
    const user = await requireAuth(context);
    if (!user) return jsonResponse({ ok: false, error: 'กรุณาเข้าสู่ระบบ' }, 401);

    const url = new URL(request.url);
    const scope = url.searchParams.get('scope');

    if (env.DB) await ensureD1Schema(env.DB);
    if (!env.DB) {
        return jsonResponse({ ok: true, schoolProfile: user.schoolProfile || {}, classes: [] });
    }

    // โหมดดึงรายชื่อกลางจาก Admin เพื่อให้ครูที่เข้ามาใหม่เลือกดึงเฉพาะห้องที่สอนได้
    if (scope === 'shared' || scope === 'admin') {
        const defaultAdmin = String(env.ADMIN_EMAIL || DEFAULT_ADMIN).trim().toLowerCase();
        const sharedRows = await env.DB.prepare(`
            SELECT mc.id, mc.teacher_email, mc.name, mc.note, mc.students_json, mc.groups_json, mc.updated_at,
                   COALESCE(t.name, mc.teacher_email) AS owner_name
            FROM master_classes mc
            LEFT JOIN teachers t ON LOWER(t.email) = LOWER(mc.teacher_email)
            WHERE t.role = 'admin' OR LOWER(mc.teacher_email) = ?
            ORDER BY mc.name ASC, mc.updated_at DESC
        `).bind(defaultAdmin).all();

        const classes = (sharedRows.results || []).map((r) => {
            let students = [];
            let groups = [];
            try { students = JSON.parse(r.students_json || '[]'); } catch (e) { students = []; }
            try { groups = JSON.parse(r.groups_json || '[]'); } catch (e) { groups = []; }
            return {
                id: r.id,
                name: r.name,
                note: r.note || '',
                students: Array.isArray(students) ? students : [],
                groups: Array.isArray(groups) ? groups : [],
                ownerEmail: r.teacher_email,
                ownerName: r.owner_name || r.teacher_email,
                updatedAt: r.updated_at,
            };
        });

        return jsonResponse({
            ok: true,
            scope: 'shared',
            classes,
        });
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

    if (env.DB) await ensureD1Schema(env.DB);
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
