/* =====================================================================
   Local Cloudflare Pages + D1 Emulator Server (local-server.mjs)
   จำลองการทำงานของ Cloudflare Pages + Pages Functions (/api/*) + SQLite D1
   สำหรับการทดสอบและพรีวิวระบบทั้งหมดแบบครบวงจร
   ===================================================================== */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 8788;

// จำลองฐานข้อมูล Cloudflare D1 ในหน่วยความจำพร้อมบันทึกลงไฟล์ .local-d1.json
const DB_FILE = path.join(__dirname, '.local-d1.json');

function loadDb() {
    try {
        if (fs.existsSync(DB_FILE)) {
            return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        }
    } catch (e) { /* ignore */ }
    return {
        teachers: [
            {
                email: 'taweep@sby.ac.th',
                google_sub: 'admin_taweep',
                name: 'ครูทวีป นวคุณานนท์',
                position: 'ครูชำนาญการพิเศษ',
                department: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี (คอมพิวเตอร์)',
                avatar_url: '',
                role: 'admin',
                is_active: 1,
                allow_external: 0,
                school_profile_json: JSON.stringify({
                    name: 'โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
                    agency: 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาลำพูน ลำปาง',
                    director: '',
                    academicYear: '2569',
                    semester: '1',
                    teacherName: 'ครูทวีป นวคุณานนท์',
                    teacherPosition: 'ครูชำนาญการพิเศษ',
                }),
                last_login_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
            },
        ],
        master_classes: [
            {
                id: 'cls_m2_1',
                teacher_email: 'taweep@sby.ac.th',
                name: 'ม.2/1',
                note: 'ห้องเรียนตัวอย่าง โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
                students_json: JSON.stringify([
                    { id: 's_1', no: 1, code: '26201', prefix: 'ด.ช.', firstName: 'ธนกฤต', lastName: 'สุขสวัสดิ์', nick: 'ต้นกล้า', gender: 'm' },
                    { id: 's_2', no: 2, code: '26202', prefix: 'ด.ช.', firstName: 'ภูมิพัฒน์', lastName: 'ศรีสุข', nick: 'ภูมิ', gender: 'm' },
                    { id: 's_3', no: 3, code: '26203', prefix: 'ด.ช.', firstName: 'ณัฐวุฒิ', lastName: 'แก้วมณี', nick: 'บอส', gender: 'm' },
                    { id: 's_4', no: 4, code: '26204', prefix: 'ด.ญ.', firstName: 'ณัฐธิดา', lastName: 'ทองดี', nick: 'น้ำฝน', gender: 'f' },
                    { id: 's_5', no: 5, code: '26205', prefix: 'ด.ญ.', firstName: 'ปุณยวีร์', lastName: 'บุญมา', nick: 'ปุณ', gender: 'f' },
                    { id: 's_6', no: 6, code: '26206', prefix: 'ด.ญ.', firstName: 'กัญญาณัฐ', lastName: 'จันทร์หอม', nick: 'กัญ', gender: 'f' },
                ]),
                groups_json: '[]',
                updated_at: new Date().toISOString(),
            },
        ],
        app_states: {},
    };
}

let dbState = loadDb();
function saveDb() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf8');
    } catch (e) { /* ignore */ }
}

// สร้าง Mock D1 Binding ที่รองรับ SQL queries หลักของระบบ
const mockD1 = {
    prepare(sql) {
        const q = sql.replace(/\s+/g, ' ').trim();
        return {
            _args: [],
            bind(...args) {
                this._args = args;
                return this;
            },
            async first() {
                if (q.includes('FROM teachers WHERE email = ?')) {
                    const email = String(this._args[0] || '').toLowerCase();
                    return dbState.teachers.find((t) => t.email.toLowerCase() === email) || null;
                }
                if (q.includes('FROM app_states WHERE teacher_email = ? AND app_id = ?')) {
                    const key = `${this._args[0]}::${this._args[1]}`;
                    return dbState.app_states[key] || null;
                }
                return null;
            },
            async all() {
                if (q.includes('FROM master_classes WHERE teacher_email = ?')) {
                    const email = String(this._args[0] || '').toLowerCase();
                    return { results: dbState.master_classes.filter((c) => c.teacher_email.toLowerCase() === email) };
                }
                if (q.includes('FROM app_states WHERE teacher_email = ?')) {
                    const email = String(this._args[0] || '').toLowerCase();
                    const results = Object.values(dbState.app_states).filter((r) => r.teacher_email.toLowerCase() === email);
                    return { results };
                }
                if (q.includes('FROM teachers')) {
                    return { results: dbState.teachers };
                }
                return { results: [] };
            },
            async run() {
                if (q.startsWith('INSERT INTO teachers')) {
                    const [email, subOrName, nameOrPos] = this._args;
                    const cleanEmail = String(email).toLowerCase();
                    const existingIdx = dbState.teachers.findIndex((t) => t.email.toLowerCase() === cleanEmail);
                    let record;
                    if (this._args.length === 8 && q.includes('google_sub')) {
                        const [em, sub, name, pos, dept, avatar, role, spJson] = this._args;
                        record = {
                            email: cleanEmail,
                            google_sub: sub,
                            name,
                            position: pos,
                            department: dept,
                            avatar_url: avatar,
                            role,
                            is_active: 1,
                            allow_external: cleanEmail.endsWith('@sby.ac.th') ? 0 : 1,
                            school_profile_json: spJson,
                            last_login_at: new Date().toISOString(),
                        };
                    } else {
                        const [em, name, pos, dept, role, isActive, allowExt, spJson] = this._args;
                        record = {
                            email: cleanEmail,
                            name,
                            position: pos,
                            department: dept,
                            role,
                            is_active: isActive,
                            allow_external: allowExt,
                            school_profile_json: spJson,
                            updated_at: new Date().toISOString(),
                        };
                    }
                    if (existingIdx >= 0) {
                        dbState.teachers[existingIdx] = Object.assign(dbState.teachers[existingIdx], record);
                    } else {
                        dbState.teachers.push(record);
                    }
                    saveDb();
                } else if (q.startsWith('UPDATE teachers SET school_profile_json')) {
                    const [spJson, tName, tPos, now, email] = this._args;
                    const t = dbState.teachers.find((x) => x.email.toLowerCase() === String(email).toLowerCase());
                    if (t) {
                        t.school_profile_json = spJson;
                        if (tName) t.name = tName;
                        if (tPos) t.position = tPos;
                        t.updated_at = now;
                        saveDb();
                    }
                } else if (q.startsWith('DELETE FROM teachers WHERE email = ?')) {
                    const email = String(this._args[0] || '').toLowerCase();
                    dbState.teachers = dbState.teachers.filter((t) => t.email.toLowerCase() !== email);
                    saveDb();
                } else if (q.startsWith('DELETE FROM master_classes WHERE teacher_email = ?')) {
                    const email = String(this._args[0] || '').toLowerCase();
                    dbState.master_classes = dbState.master_classes.filter((c) => c.teacher_email.toLowerCase() !== email);
                    saveDb();
                } else if (q.startsWith('INSERT INTO master_classes')) {
                    const [id, teacher_email, name, note, students_json, groups_json, updated_at] =
                        this._args.length === 7
                            ? this._args
                            : [this._args[0], this._args[1], this._args[2], this._args[3], this._args[4], '[]', this._args[5]];
                    const idx = dbState.master_classes.findIndex((c) => c.teacher_email === teacher_email && c.id === id);
                    const rec = { id, teacher_email, name, note, students_json, groups_json, updated_at };
                    if (idx >= 0) dbState.master_classes[idx] = rec;
                    else dbState.master_classes.push(rec);
                    saveDb();
                } else if (q.startsWith('INSERT INTO app_states')) {
                    const [teacher_email, app_id, data_json, updated_at] = this._args;
                    const key = `${teacher_email}::${app_id}`;
                    dbState.app_states[key] = { teacher_email, app_id, data_json, updated_at };
                    saveDb();
                }
                return { success: true };
            },
        };
    },
};

const env = {
    DB: mockD1,
    SCHOOL_NAME: 'โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน',
    SCHOOL_DOMAIN: 'sby.ac.th',
    ADMIN_EMAIL: 'taweep@sby.ac.th',
    GOOGLE_CLIENT_ID: '',
    AUTH_POLICY: 'domain_teachers',
    JWT_SECRET: 'sby-teacher-media-hub-secret-2026',
};

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain; charset=utf-8',
};

import * as apiAuth from './functions/api/auth.js';
import * as apiRoster from './functions/api/roster.js';
import * as apiAppData from './functions/api/app-data.js';
import * as apiAdmin from './functions/api/admin.js';

const API_ROUTES = {
    '/api/auth': apiAuth,
    '/api/roster': apiRoster,
    '/api/app-data': apiAppData,
    '/api/admin': apiAdmin,
};

const server = http.createServer(async (req, res) => {
    const urlObj = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = decodeURIComponent(urlObj.pathname);

    // 1. Handle Cloudflare Pages Functions (/api/*)
    if (API_ROUTES[pathname]) {
        const mod = API_ROUTES[pathname];
        const method = req.method.toUpperCase();
        const handlerName = `onRequest${method[0]}${method.slice(1).toLowerCase()}`;
        const handler = mod[handlerName] || mod.onRequest;
        if (!handler) {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
            return;
        }

        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const bodyBuf = Buffer.concat(chunks);

        const webReq = new Request(urlObj.toString(), {
            method,
            headers: req.headers,
            body: ['GET', 'HEAD'].includes(method) ? undefined : bodyBuf,
        });

        try {
            const webRes = await handler({ request: webReq, env });
            const headersObj = {};
            webRes.headers.forEach((v, k) => { headersObj[k] = v; });
            res.writeHead(webRes.status, headersObj);
            const respText = await webRes.text();
            res.end(respText);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: err.message }));
        }
        return;
    }

    // 2. Serve Static Files from public/
    let safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    if (safePath === '/' || safePath === '') safePath = '/index.html';
    let filePath = path.join(PUBLIC_DIR, safePath);

    try {
        let stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
            stat = fs.statSync(filePath);
        }
        const ext = path.extname(filePath).toLowerCase();
        const mime = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        fs.createReadStream(filePath).pipe(res);
    } catch (e) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`SBY Teacher Media Hub Server running at http://localhost:${PORT}`);
});
