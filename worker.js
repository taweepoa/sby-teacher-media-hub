/* =====================================================================
   Cloudflare Worker Entry Point (worker.js)
   รวมสื่อการสอนสำหรับครูมืออาชีพ โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน
   รองรับทั้งการ Deploy ผ่าน Cloudflare Workers (npx wrangler deploy)
   และ Cloudflare Pages (functions/api/*)
   ===================================================================== */
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

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const pathname = url.pathname.replace(/\/+$/, '') || '/';

        // 1. ตรวจสอบว่าเป็น API Route (/api/auth, /api/roster, /api/app-data, /api/admin)
        if (API_ROUTES[pathname]) {
            const mod = API_ROUTES[pathname];
            const method = request.method.toUpperCase();
            const handlerName = `onRequest${method[0]}${method.slice(1).toLowerCase()}`;
            const handler = mod[handlerName] || mod.onRequest;
            if (!handler) {
                return new Response(JSON.stringify({ ok: false, error: 'Method Not Allowed' }), {
                    status: 405,
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                });
            }
            try {
                return await handler({ request, env, ctx });
            } catch (err) {
                return new Response(JSON.stringify({ ok: false, error: err.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                });
            }
        }

        // 2. เสิร์ฟไฟล์ Static Assets จากโฟลเดอร์ ./public (Cloudflare Workers Static Assets)
        if (env.ASSETS) {
            return env.ASSETS.fetch(request);
        }

        return new Response('Not Found', { status: 404 });
    },
};
