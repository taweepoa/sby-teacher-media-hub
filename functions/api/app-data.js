/* =====================================================================
   GET /api/app-data?appId=... — ดึงข้อมูลของสื่อการสอน (หรือดึงทั้งหมด 7 ระบบเมื่อไม่ระบุ appId)
   PUT /api/app-data           — บันทึกข้อมูลของสื่อการสอนลง Cloudflare D1 พร้อมซิงค์รายชื่อนักเรียนกลางอัตโนมัติ
   ===================================================================== */
import { jsonResponse, requireAuth } from './_utils.js';

const VALID_APPS = new Set([
    'vs-random-picker',
    'vs-class-points',
    'vs-millionaire-quiz',
    'vs-memory-game',
    'vs-snake-ladder-quiz',
    'vs-buzzer',
    'vs-classroom-timer',
]);

export async function onRequestGet(context) {
    const { request, env } = context;
    const user = await requireAuth(context);
    if (!user) return jsonResponse({ ok: false, error: 'กรุณาเข้าสู่ระบบ' }, 401);

    const url = new URL(request.url);
    const appId = url.searchParams.get('appId');

    if (!env.DB) {
        return jsonResponse({ ok: true, appId, data: null, states: {} });
    }

    if (appId) {
        const row = await env.DB.prepare('SELECT data_json, updated_at FROM app_states WHERE teacher_email = ? AND app_id = ?')
            .bind(user.email, appId)
            .first();
        return jsonResponse({
            ok: true,
            appId,
            data: row ? JSON.parse(row.data_json) : null,
            updatedAt: row ? row.updated_at : null,
        });
    }

    // ดึงข้อมูลของทั้ง 7 แอปสำหรับหน้า Dashboard / Full Backup
    const rows = await env.DB.prepare('SELECT app_id, data_json, updated_at FROM app_states WHERE teacher_email = ?')
        .bind(user.email)
        .all();
    const states = {};
    for (const r of rows.results || []) {
        try {
            states[r.app_id] = {
                data: JSON.parse(r.data_json),
                updatedAt: r.updated_at,
            };
        } catch (e) { /* skip malformed */ }
    }
    return jsonResponse({ ok: true, states });
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

    const appId = String(body.appId || (body.data && body.data.app) || '').trim();
    if (!VALID_APPS.has(appId) || !body.data) {
        return jsonResponse({ ok: false, error: 'รหัสสื่อการสอน (appId) หรือข้อมูลไม่ถูกต้อง' }, 400);
    }

    const now = new Date().toISOString();
    if (!env.DB) {
        return jsonResponse({ ok: true, appId, savedAt: now });
    }

    await env.DB.prepare(`
        INSERT INTO app_states (teacher_email, app_id, data_json, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(teacher_email, app_id) DO UPDATE SET
            data_json = excluded.data_json,
            updated_at = excluded.updated_at
    `).bind(user.email, appId, JSON.stringify(body.data), now).run();

    // Auto-Harvest: หากครูเพิ่มหรือแก้ไขรายชื่อนักเรียนในแอป "วงล้อสุ่มชื่อ" หรือ "กระดานแต้มพฤติกรรม"
    // ให้ซิงค์กลับเข้าตาราง master_classes ส่วนกลางด้วย เพื่อให้สื่ออื่นเห็นรายชื่อล่าสุดทันที
    if (body.syncMasterRoster !== false) {
        try {
            if (appId === 'vs-random-picker' && Array.isArray(body.data.lists)) {
                const classLists = body.data.lists.filter((l) => l && l.kind !== 'custom' && Array.isArray(l.items) && l.items.length > 0);
                for (const l of classLists) {
                    await env.DB.prepare(`
                        INSERT INTO master_classes (id, teacher_email, name, note, students_json, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON CONFLICT(teacher_email, id) DO UPDATE SET
                            name = excluded.name,
                            note = excluded.note,
                            students_json = excluded.students_json,
                            updated_at = excluded.updated_at
                    `).bind(
                        String(l.id),
                        user.email,
                        String(l.name),
                        String(l.note || ''),
                        JSON.stringify(l.items),
                        now
                    ).run();
                }
            } else if (appId === 'vs-class-points' && Array.isArray(body.data.classes) && Array.isArray(body.data.students)) {
                for (const c of body.data.classes) {
                    if (!c || !c.id) continue;
                    const cStudents = body.data.students.filter((s) => s && s.classId === c.id);
                    if (cStudents.length > 0) {
                        await env.DB.prepare(`
                            INSERT INTO master_classes (id, teacher_email, name, note, students_json, groups_json, updated_at)
                            VALUES (?, ?, ?, '', ?, ?, ?)
                            ON CONFLICT(teacher_email, id) DO UPDATE SET
                                name = excluded.name,
                                students_json = excluded.students_json,
                                groups_json = excluded.groups_json,
                                updated_at = excluded.updated_at
                        `).bind(
                            String(c.id),
                            user.email,
                            String(c.name),
                            JSON.stringify(cStudents),
                            JSON.stringify(Array.isArray(c.groups) ? c.groups : []),
                            now
                        ).run();
                    }
                }
            }
        } catch (err) {
            // ไม่ให้กระทบการบันทึกหลักของแอป
        }
    }

    return jsonResponse({
        ok: true,
        appId,
        savedAt: now,
    });
}
