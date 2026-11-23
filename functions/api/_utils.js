/* =====================================================================
   Cloudflare Pages Functions — Auth & Access Control Helper
   โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน | พัฒนาระบบโดย ครูทวีป นวคุณานนท์
   ===================================================================== */

const STUDENT_RE = /^sby_\d{5}@sby\.ac\.th$/i;
const SCHOOL_DOMAIN = 'sby.ac.th';
const DEFAULT_ADMIN = 'taweep@sby.ac.th';

export function jsonResponse(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            ...extraHeaders,
        },
    });
}

/**
 * ตรวจสอบรูปแบบอีเมลตามนโยบายโรงเรียนส่วนบุญโญปถัมภ์ ลำพูน
 * 1. บล็อกอีเมลนักเรียน sby_XXXXX@sby.ac.th (เลขประจำตัว 5 หลัก) ทันที
 * 2. ตรวจสอบว่าเป็น @sby.ac.th หรืออยู่ในรายชื่อครูที่อนุมัติ (รวมถึง @gmail.com ที่ Admin เพิ่ม)
 */
export function evaluateEmailRules(email) {
    const clean = String(email || '').trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
        return { valid: false, isStudent: false, isSchoolDomain: false, reason: 'รูปแบบอีเมลไม่ถูกต้อง' };
    }
    if (STUDENT_RE.test(clean)) {
        return {
            valid: false,
            isStudent: true,
            isSchoolDomain: true,
            reason: 'ระบบไม่อนุญาตให้ใช้อีเมลนักเรียน (sby_รหัสประจำตัว 5 หลัก@sby.ac.th) เข้าใช้งานระบบสื่อสำหรับครู',
        };
    }
    const domain = clean.split('@')[1];
    const isSchoolDomain = domain === SCHOOL_DOMAIN;
    return {
        valid: true,
        email: clean,
        domain,
        isStudent: false,
        isSchoolDomain,
    };
}

/**
 * สร้างและตรวจสอบ Session Token (HMAC-SHA256)
 */
async function getHmacKey(secret) {
    const enc = new TextEncoder();
    return crypto.subtle.importKey(
        'raw',
        enc.encode(secret || 'sby-teacher-media-hub-secret-key-2026'),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

function toBase64Url(buf) {
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

export async function signSessionToken(payload, secret) {
    const enc = new TextEncoder();
    const body = toBase64Url(enc.encode(JSON.stringify({
        ...payload,
        exp: Date.now() + 1000 * 60 * 60 * 24 * 14, // 14 วัน
    })));
    const key = await getHmacKey(secret);
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
    return `${body}.${toBase64Url(sig)}`;
}

export async function verifySessionToken(token, secret) {
    try {
        if (!token || !token.includes('.')) return null;
        const [body, sig] = token.split('.');
        const enc = new TextEncoder();
        const key = await getHmacKey(secret);
        const ok = await crypto.subtle.verify('HMAC', key, fromBase64Url(sig), enc.encode(body));
        if (!ok) return null;
        const data = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
        if (data.exp && Date.now() > data.exp) return null;
        return data;
    } catch (e) {
        return null;
    }
}

export async function requireAuth(context) {
    const { request, env } = context;
    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const user = await verifySessionToken(token, env.JWT_SECRET);
    if (!user || !user.email) return null;
    return user;
}

export { DEFAULT_ADMIN, SCHOOL_DOMAIN, STUDENT_RE };
