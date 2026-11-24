import { ensureD1Schema } from "./_db.js";
/* =====================================================================
   POST /api/auth — ยืนยันตัวตนด้วย Google Sign-In & ตรวจสอบสิทธิ์ครูโรงเรียนส่วนบุญโญปถัมภ์ ลำพูน
   GET  /api/auth — ตรวจสอบสถานะ Session ปัจจุบัน
   ===================================================================== */
import {
    jsonResponse,
    evaluateEmailRules,
    signSessionToken,
    requireAuth,
    DEFAULT_ADMIN,
} from './_utils.js';

const DEFAULT_SCHOOL_PROFILE = {
    name: 'โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
    agency: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาลำปาง ลำพูน',
    director: '',
    academicYear: String(new Date().getFullYear() + 543),
    semester: '1',
    teacherName: '',
    teacherPosition: 'ครู',
};

/**
 * ตรวจสอบ Google ID Token (JWT) กับ Google TokenInfo Endpoint
 */
async function verifyGoogleIdToken(credential, expectedClientId) {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!res.ok) throw new Error('ไม่สามารถยืนยัน Google ID Token ได้');
    const payload = await res.json();
    if (expectedClientId && payload.aud !== expectedClientId) {
        throw new Error('Google Client ID ไม่ตรงกับที่ตั้งค่าไว้ในระบบ');
    }
    if (payload.email_verified !== 'true' && payload.email_verified !== true) {
        throw new Error('อีเมล Google นี้ยังไม่ได้รับการยืนยัน');
    }
    return {
        email: String(payload.email || '').toLowerCase(),
        name: payload.name || payload.given_name || payload.email,
        picture: payload.picture || '',
        sub: payload.sub || '',
        hd: payload.hd || '',
    };
}

export async function onRequestGet(context) {
    const { env } = context;
    const user = await requireAuth(context);
    if (!user) {
        return jsonResponse({ authenticated: false, googleClientId: env.GOOGLE_CLIENT_ID || '' }, 200);
    }

    if (env.DB) { await ensureD1Schema(env.DB);
        const row = await env.DB.prepare('SELECT * FROM teachers WHERE email = ?').bind(user.email).first();
        if (!row || !row.is_active) {
            return jsonResponse({ authenticated: false, reason: 'บัญชีถูกระงับหรือไม่มีในระบบ' }, 403);
        }
        return jsonResponse({
            authenticated: true,
            googleClientId: env.GOOGLE_CLIENT_ID || '',
            teacher: {
                email: row.email,
                name: row.name,
                position: row.position,
                department: row.department,
                avatarUrl: row.avatar_url,
                role: row.role,
                schoolProfile: JSON.parse(row.school_profile_json || '{}'),
            },
        });
    }

    return jsonResponse({
        authenticated: true,
        googleClientId: env.GOOGLE_CLIENT_ID || '',
        teacher: user,
    });
}

export async function onRequestPost(context) {
    const { request, env } = context;
    let body = {};
    try {
        body = await request.json();
    } catch (e) {
        return jsonResponse({ ok: false, error: 'ข้อมูล JSON ไม่ถูกต้อง' }, 400);
    }

    let profile = null;
    if (body.credential) {
        try {
            profile = await verifyGoogleIdToken(body.credential, env.GOOGLE_CLIENT_ID);
        } catch (err) {
            return jsonResponse({ ok: false, error: err.message }, 401);
        }
    } else if (body.email && !env.GOOGLE_CLIENT_ID) {
        // โหมดทดสอบบน Local Dev เฉพาะกรณีที่ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID
        profile = {
            email: String(body.email || '').trim().toLowerCase(),
            name: String(body.name || '').trim() || 'คุณครูโรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
            picture: String(body.picture || ''),
            sub: 'local_' + String(body.email || '').trim().toLowerCase(),
        };
    } else {
        return jsonResponse({ ok: false, error: 'กรุณาเข้าสู่ระบบผ่านปุ่ม Sign in with Google ของโรงเรียน' }, 401);
    }

    // 1. ตรวจสอบกฎการกรองอีเมลอัตโนมัติ (บล็อก sby_XXXXX@sby.ac.th ทันที)
    const rule = evaluateEmailRules(profile.email);
    if (!rule.valid) {
        return jsonResponse({
            ok: false,
            code: rule.isStudent ? 'STUDENT_BLOCKED' : 'INVALID_EMAIL',
            error: rule.reason,
        }, 403);
    }

    const email = rule.email;
    const isDefaultAdmin = email === (env.ADMIN_EMAIL || DEFAULT_ADMIN);

    // 2. ตรวจสอบกับตารางรายชื่อครูที่อนุมัติใน Cloudflare D1
    let teacherRow = null;
    if (env.DB) { await ensureD1Schema(env.DB);
        teacherRow = await env.DB.prepare('SELECT * FROM teachers WHERE email = ?').bind(email).first();

        if (!teacherRow) {
            // กรณีไม่มีชื่อในตาราง teachers:
            // - หากเป็นอีเมลนอกโรงเรียน (เช่น @gmail.com) ต้องได้รับการเพิ่มชื่อโดย Admin ก่อนเท่านั้น
            if (!rule.isSchoolDomain && !isDefaultAdmin) {
                return jsonResponse({
                    ok: false,
                    code: 'EXTERNAL_NOT_WHITELISTED',
                    error: `อีเมล ${email} เป็นอีเมลภายนอก (@gmail.com) ซึ่งยังไม่ได้รับการอนุมัติ กรุณาแจ้งผู้ดูแลระบบ (ครูทวีป นวคุณานนท์) เพื่อเพิ่มสิทธิ์รายบุคคล`,
                }, 403);
            }

            // - หากตั้งค่า AUTH_POLICY = 'strict' แม้เป็น @sby.ac.th ก็ต้องอยู่ในตารางรายชื่อครูที่อนุมัติ
            if (env.AUTH_POLICY === 'strict' && !isDefaultAdmin) {
                return jsonResponse({
                    ok: false,
                    code: 'TEACHER_NOT_APPROVED',
                    error: `อีเมล ${email} ยังไม่อยู่ในทะเบียนครูที่อนุมัติ กรุณาติดต่อผู้ดูแลระบบ`,
                }, 403);
            }

            // สร้างบัญชีครูให้อัตโนมัติสำหรับครูในโดเมน @sby.ac.th (ที่ไม่ใช่นักเรียน sby_XXXXX)
            const initSchool = {
                ...DEFAULT_SCHOOL_PROFILE,
                teacherName: profile.name,
            };
            const role = isDefaultAdmin ? 'admin' : 'teacher';
            await env.DB.prepare(`
                INSERT INTO teachers (email, google_sub, name, position, department, avatar_url, role, is_active, school_profile_json, last_login_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
            `).bind(
                email,
                profile.sub,
                profile.name,
                isDefaultAdmin ? 'ครูชำนาญการพิเศษ' : 'ครู',
                'โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
                profile.picture,
                role,
                JSON.stringify(initSchool)
            ).run();

            teacherRow = await env.DB.prepare('SELECT * FROM teachers WHERE email = ?').bind(email).first();
        } else {
            if (!teacherRow.is_active) {
                return jsonResponse({
                    ok: false,
                    code: 'ACCOUNT_DISABLED',
                    error: 'บัญชีผู้ใช้นี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ',
                }, 403);
            }
            // อัปเดตเวลาเข้าสู่ระบบล่าสุดและรูปโปรไฟล์
            await env.DB.prepare(`
                UPDATE teachers
                SET last_login_at = datetime('now'),
                    google_sub = COALESCE(NULLIF(?, ''), google_sub),
                    avatar_url = COALESCE(NULLIF(?, ''), avatar_url)
                WHERE email = ?
            `).bind(profile.sub, profile.picture, email).run();
        }
    } else {
        // Fallback กรณีรันโดยยังไม่ได้ผูก D1
        if (!rule.isSchoolDomain && !isDefaultAdmin) {
            return jsonResponse({
                ok: false,
                code: 'EXTERNAL_NOT_WHITELISTED',
                error: `อีเมล ${email} ไม่ใช่โดเมน @sby.ac.th และยังไม่ได้รับการอนุมัติโดยผู้ดูแลระบบ`,
            }, 403);
        }
        teacherRow = {
            email,
            name: profile.name,
            position: isDefaultAdmin ? 'ครูชำนาญการพิเศษ' : 'ครู',
            department: 'โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
            avatar_url: profile.picture,
            role: isDefaultAdmin ? 'admin' : 'teacher',
            school_profile_json: JSON.stringify({ ...DEFAULT_SCHOOL_PROFILE, teacherName: profile.name }),
        };
    }

    const teacherPayload = {
        email: teacherRow.email,
        name: teacherRow.name,
        position: teacherRow.position,
        department: teacherRow.department,
        avatarUrl: teacherRow.avatar_url,
        role: teacherRow.role,
        schoolProfile: JSON.parse(teacherRow.school_profile_json || '{}'),
    };

    const token = await signSessionToken(teacherPayload, env.JWT_SECRET);
    return jsonResponse({
        ok: true,
        token,
        teacher: teacherPayload,
    });
}
