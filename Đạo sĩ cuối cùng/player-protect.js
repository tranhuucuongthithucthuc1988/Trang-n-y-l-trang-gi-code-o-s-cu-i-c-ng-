/* =====================================================
   PLAYER PROTECT — Chặn popup / new tab / redirect từ fembed
   ===================================================== */
(function () {
    'use strict';

    const FEMBED_HOSTS = ['fembed.co', 'fembed.com', 'vdohide', 'vstream'];

    function isFembed(url) {
        if (!url) return false;
        return FEMBED_HOSTS.some(h => url.includes(h));
    }

    const css = document.createElement('style');
    css.textContent = `
        .protect-badge {
            position: absolute;
            top: 8px; right: 8px;
            background: rgba(74, 222, 128, 0.92);
            color: #000;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            z-index: 100;
            pointer-events: none;
            box-shadow: 0 0 15px rgba(74, 222, 128, 0.7);
            font-family: Arial, sans-serif;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .protect-badge.warning {
            background: rgba(255, 60, 60, 0.92);
            color: white;
            box-shadow: 0 0 20px rgba(255, 60, 60, 0.9);
            animation: badgeShake 0.4s ease;
        }
        @keyframes badgeShake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
    `;
    (document.head || document.documentElement).appendChild(css);

    function attachProtection() {
        const iframe = document.getElementById('playerFrame');
        if (!iframe) return;
        if (iframe.dataset.protected) return;

        const src = iframe.getAttribute('src') || '';
        if (!isFembed(src)) return;

        iframe.dataset.protected = '1';
        console.log('[PlayerProtect] 🛡️ Fembed detected — sandbox active');

        const container = iframe.closest('.video-container');
        if (container && !container.querySelector('.protect-badge')) {
            container.style.position = 'relative';
            const badge = document.createElement('div');
            badge.className = 'protect-badge';
            badge.id = 'protectBadge';
            badge.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Đã chặn popup';
            container.appendChild(badge);
        }

        new MutationObserver(() => {
            const curSandbox = iframe.getAttribute('sandbox') || '';
            if (!curSandbox.includes('allow-scripts')) {
                console.warn('[PlayerProtect] 🚫 Sandbox bị gỡ! Đang khôi phục...');
                iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
            }
        }).observe(iframe, { attributes: true, attributeFilter: ['sandbox', 'src'] });
    }

    new MutationObserver(attachProtection)
        .observe(document.body, { childList: true, subtree: true });
    setInterval(attachProtection, 500);

    let lastHiddenTime = 0;

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            lastHiddenTime = Date.now();
            return;
        }
        const away = Date.now() - lastHiddenTime;
        if (away > 300 && away < 8000 && isPlayerFembedActive()) {
            console.warn('[PlayerProtect] 🚫 Popup detected — user was away for', away + 'ms');
            showProtectWarning();
        }
    });

    function isPlayerFembedActive() {
        const iframe = document.getElementById('playerFrame');
        if (!iframe) return false;
        return isFembed(iframe.getAttribute('src') || '');
    }

    function showProtectWarning() {
        const badge = document.getElementById('protectBadge');
        if (badge) {
            badge.classList.add('warning');
            badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Vừa có popup mở!';
            setTimeout(() => {
                badge.classList.remove('warning');
                badge.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Đã chặn popup';
            }, 3000);
        }
        if (typeof showToast === 'function') {
            showToast('⚠️ Phát hiện popup quảng cáo vừa mở! Đã cảnh báo — hãy đóng tab lạ.', 'error');
        }
    }

    const origOpen = window.open;
    window.open = function (url) {
        if (url) {
            const u = String(url);
            if (isFembed(u)) {
                console.warn('[PlayerProtect] 🚫 Blocked popup:', u);
                showProtectWarning();
                return null;
            }
        }
        return origOpen.apply(window, arguments);
    };

    document.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (!a) return;
        const href = a.getAttribute('href') || '';
        const target = a.getAttribute('target') || '';
        if (target === '_blank' && href && isFembed(href)) {
            e.preventDefault();
            e.stopPropagation();
            console.warn('[PlayerProtect] 🚫 Blocked new-tab ad link:', href);
            showProtectWarning();
            return false;
        }
    }, true);

    console.log('%c✅ PlayerProtect active — popup shield ready', 'color:#4ade80;font-weight:bold');
})();