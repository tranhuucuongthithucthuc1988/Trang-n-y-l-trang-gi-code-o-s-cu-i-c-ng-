/* =====================================================
   ANTI-DEBUG v2 — Sửa false-positive khi mở sidebar
   ===================================================== */
(function () {
    'use strict';

    if (location.search.indexOf('safe=1') !== -1) {
        console.log('%c[AntiDebug] ⚠️ SAFE MODE — bảo vệ đã tắt', 'color:orange;font-weight:bold;font-size:14px');
        return;
    }

    const css = document.createElement('style');
    css.textContent = `
        body.devtools-locked #website,
        body.devtools-locked .navbar,
        body.devtools-locked #menu,
        body.devtools-locked .modal,
        body.devtools-locked #bg-canvas,
        body.devtools-locked #mouseGlow { display: none !important; }
        #__antiDebugOverlay {
            position: fixed; inset: 0; z-index: 2147483647;
            background: radial-gradient(circle, #1a0000 0%, #000 70%);
            display: none; align-items: center; justify-content: center;
            flex-direction: column; text-align: center; padding: 30px;
            font-family: "Times New Roman", Times, serif; color: #ff3333;
        }
        body.devtools-locked #__antiDebugOverlay { display: flex !important; }
        #__antiDebugOverlay .lock-icon {
            font-size: 90px; margin-bottom: 20px;
            animation: adPulse 1s infinite alternate;
        }
        #__antiDebugOverlay h1 {
            font-size: 42px; color: #ff2a2a; letter-spacing: 3px;
            text-shadow: 0 0 20px #ff0000, 0 0 40px #ff0000;
            margin: 0 0 20px;
        }
        #__antiDebugOverlay p {
            font-size: 22px; color: #ffaaaa; max-width: 600px;
            line-height: 1.6; margin: 0 0 15px;
        }
        #__antiDebugOverlay .big {
            color: gold; font-weight: bold; font-size: 26px;
            text-shadow: 0 0 15px gold; margin-top: 10px;
        }
        @keyframes adPulse {
            from { transform: scale(1); opacity: 0.7; }
            to   { transform: scale(1.1); opacity: 1; }
        }
    `;
    (document.head || document.documentElement).appendChild(css);

    function ensureOverlay() {
        if (document.getElementById('__antiDebugOverlay')) return;
        const o = document.createElement('div');
        o.id = '__antiDebugOverlay';
        o.innerHTML = `
            <div class="lock-icon">🚫</div>
            <h1>ĐÃ PHÁT HIỆN DEVTOOLS</h1>
            <p>Bạn đã mở công cụ dành cho lập trình viên (F12 / DevTools).</p>
            <p>Để bảo vệ bản quyền nội dung, <b>toàn bộ video và liên kết đã bị xoá khỏi trang.</b></p>
            <p class="big">→ Đóng F12 rồi bấm F5 để tiếp tục.</p>
        `;
        (document.body || document.documentElement).appendChild(o);
    }

    function nukeVideo() {
        const vc = document.getElementById('videoContainer');
        if (vc) vc.innerHTML = '';

        const pm = document.getElementById('playerModal');
        if (pm) pm.classList.remove('active');

        document.querySelectorAll('video, iframe, audio').forEach(el => {
            try {
                if (el.tagName === 'VIDEO' || el.tagName === 'AUDIO') {
                    el.pause();
                    el.removeAttribute('src');
                    while (el.firstChild) el.removeChild(el.firstChild);
                    el.load();
                }
                el.remove();
            } catch (_) {}
        });

        const grid = document.getElementById('movieGrid');
        if (grid) grid.innerHTML = '';
        const yt = document.getElementById('youtubeSection');
        if (yt) yt.innerHTML = '';
        const ts = document.getElementById('thiensuSection');
        if (ts) ts.innerHTML = '';

        try { localStorage.removeItem('watchHistory'); } catch (_) {}
        try { localStorage.removeItem('videoProgress'); } catch (_) {}

        try {
            if (typeof movieDatabase !== 'undefined' && Array.isArray(movieDatabase)) {
                movieDatabase.length = 0;
            }
            window.__MOVIE_DB = [];
        } catch (_) {}
    }

    let triggered = false;
    function trigger(reason) {
        if (triggered) return;
        triggered = true;
        console.warn('[AntiDebug] 🚫 Triggered:', reason);
        nukeVideo();
        ensureOverlay();
        document.body && document.body.classList.add('devtools-locked');
    }

    let debuggerHits = 0;

    function checkDebugger() {
        if (triggered) return;
        const t0 = performance.now();
        try { Function('debugger')(); } catch (_) {}
        const dt = performance.now() - t0;

        if (dt > 200) {
            debuggerHits++;
            if (debuggerHits >= 2) {
                trigger('debugger-timing (' + dt.toFixed(0) + 'ms x' + debuggerHits + ')');
            }
        } else {
            debuggerHits = 0;
        }
    }

    const SIZE_THRESHOLD = 500;
    let sizeHits = 0;

    function checkSize() {
        if (triggered) return;
        if (window.outerWidth === 0 || window.outerHeight === 0) return;

        const dw = window.outerWidth  - window.innerWidth;
        const dh = window.outerHeight - window.innerHeight;

        if (dw > SIZE_THRESHOLD) {
            sizeHits++;
            if (sizeHits >= 3) {
                trigger('size-diff (' + dw + 'x' + dh + ')');
            }
        } else {
            sizeHits = 0;
        }
    }

    function installConsoleTrap() {
        try {
            const trap = new Image();
            let fired = false;
            Object.defineProperty(trap, 'id', {
                get() {
                    if (!fired) { fired = true; trigger('console-trap'); }
                    return 'x';
                }
            });
            setInterval(() => {
                if (triggered) return;
                console.log(trap);
                console.clear();
            }, 2000);
        } catch (_) {}
    }

    function blockKeys() {
        document.addEventListener('keydown', function (e) {
            if (e.key === 'F12' || e.keyCode === 123) {
                e.preventDefault(); e.stopPropagation();
                trigger('F12-key');
                return false;
            }
            if (e.ctrlKey && e.shiftKey && /^[ijc]$/i.test(e.key)) {
                e.preventDefault(); e.stopPropagation();
                trigger('ctrl-shift-' + e.key);
                return false;
            }
            if (e.ctrlKey && /^u$/i.test(e.key)) {
                e.preventDefault(); e.stopPropagation();
                return false;
            }
            if (e.ctrlKey && /^s$/i.test(e.key)) {
                e.preventDefault(); e.stopPropagation();
                return false;
            }
            if (e.ctrlKey && e.shiftKey && /^s$/i.test(e.key)) {
                e.preventDefault(); e.stopPropagation();
                return false;
            }
            if (e.metaKey && e.altKey && /^[ijc]$/i.test(e.key)) {
                e.preventDefault(); e.stopPropagation();
                trigger('cmd-alt-' + e.key);
                return false;
            }
        }, true);
    }

    function blockRightClick() {
        document.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            return false;
        }, true);
    }

    function boot() {
        blockKeys();
        blockRightClick();
        installConsoleTrap();

        setTimeout(() => {
            checkDebugger();
            checkSize();
            setInterval(checkDebugger, 1500);
            setInterval(checkSize, 1200);
        }, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    console.log('%c🛡 AntiDebug v2 ACTIVE', 'color:#4ade80;font-weight:bold;font-size:14px');
    console.log('%cOwner bypass: thêm ?safe=1 vào URL', 'color:#ffd700;font-style:italic');
})();