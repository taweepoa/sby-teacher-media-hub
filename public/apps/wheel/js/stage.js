/* =====================================================================
   โหมดเต็มจอ (ฉายโปรเจกเตอร์): ขยาย "พื้นที่แสดงผล" ของหน้านั้นให้เต็มจอ ซ่อนเมนู/แถบบน
   - ขอเต็มจอทั้งเอกสาร (document.documentElement) เพื่อให้หน้าต่าง SweetAlert/ข้อความแจ้งเตือนยังแสดงได้
   - เครื่องที่ไม่รองรับ Fullscreen API (เช่น iPhone) ยังได้โหมดเต็มหน้าต่างด้วย CSS
   - กด Esc หรือปุ่ม "ออกจากเต็มจอ" เพื่อกลับ
   ===================================================================== */
(function () {
    'use strict';

    const Stage = {
        el: null,
        usedFs: false,

        isOn() { return !!this.el; },

        enter(el) {
            if (!el || this.el === el) return;
            if (this.el) this.exit();
            this.el = el;
            el.classList.add('is-stage');
            document.body.classList.add('stage-on');
            const root = document.documentElement;
            // โหมดทดลองใช้: ย่อแถบ "โหมดทดลองใช้" ระหว่างฉายเต็มจอ ไม่ให้บังวงล้อ (คืนสถานะเดิมตอนออก)
            this.hadMin = root.classList.contains('vsd-min');
            if (window.VSDemo && VSDemo.active) root.classList.add('vsd-min');
            const req = root.requestFullscreen || root.webkitRequestFullscreen;
            this.usedFs = false;
            if (req && !document.fullscreenElement && !document.webkitFullscreenElement) {
                try {
                    const p = req.call(root, { navigationUI: 'hide' });
                    this.usedFs = true;
                    if (p && p.catch) p.catch(() => { this.usedFs = false; });
                } catch (e) { this.usedFs = false; }
            }
            this.emit();
        },

        exit() {
            const el = this.el;
            if (!el) return;
            this.el = null;
            el.classList.remove('is-stage');
            document.body.classList.remove('stage-on');
            if (window.VSDemo && VSDemo.active && !this.hadMin) document.documentElement.classList.remove('vsd-min');
            if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
            else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
            this.usedFs = false;
            this.emit();
        },

        toggle(el) {
            if (this.el) this.exit(); else this.enter(el);
        },

        emit() {
            window.dispatchEvent(new CustomEvent('stagechange', { detail: { on: !!this.el } }));
            // ให้ ResizeObserver/วงล้อคำนวณขนาดใหม่หลังจัดหน้าเสร็จ
            requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
        },
    };

    function onFsChange() {
        const fs = document.fullscreenElement || document.webkitFullscreenElement;
        if (!fs && Stage.el && Stage.usedFs) Stage.exit();
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && Stage.el && !document.querySelector('.swal2-container') && !document.querySelector('.win-overlay.show')) Stage.exit();
    });

    window.Stage = Stage;
})();
