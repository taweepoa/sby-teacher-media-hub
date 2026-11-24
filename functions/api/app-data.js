import { ensureD1Schema } from "./_db.js";
/* =====================================================================
   GET /api/app-data?appId=... — ดึงข้อมูลของสื่อการสอน (หรือดึงทั้งหมด 7 ระบบเมื่อไม่ระบุ appId)
   PUT /api/app-data           — บันทึกข้อมูลของสื่อการสอนลง Cloudflare D1 (ไม่เขียนทับ master_classes)
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

    if (env.DB) await ensureD1Schema(env.DB);
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
    if (env.DB) await ensureD1Schema(env.DB);
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

    // ปิดระบบ Auto-Harvest: ให้หน้าหลัก (portal.js ผ่าน /api/roster) เป็นแหล่งข้อมูลหลักเพียงแห่งเดียว
    // (Single Source of Truth) สำหรับตาราง master_classes เพื่อป้องกันห้องที่ลบไปแล้วกลับมาใหม่และป้องกันฟิลด์ code หาย

    return jsonResponse({
        ok: true,
        appId,
        savedAt: now,
    });
}
