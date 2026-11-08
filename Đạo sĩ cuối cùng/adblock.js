/* =====================================================
   ADBLOCK v2 — Chặn popup + click link độc hại
   ===================================================== */
(function () {
    'use strict';

    const BLOCKED_KEYWORDS = [
        'vdohide', 'popads', 'popcash', 'popmyads', 'propellerads',
        'propeller', 'onclickads', 'onclckds', 'adcash', 'adsterra',
        'exoclick', 'juicyads', 'trafficjunky', 'clickadu', 'hilltopads',
        'mgid', 'revcontent', 'taboola', 'outbrain', 'bidvertiser',
        'adf.ly', 'shorte.st', 'ouo.io', 'linkvertise', 'adfoc',
        'doubleclick', 'googlesyndication', 'googleadservices',
        'cacuoc', 'cược', 'nhacai', 'nhà cái', 'nohu', 'nổ hũ',
        'banca', 'bắn cá', 'xoso', 'xổ số', 'lode', 'lô đề',
        'winbet', 'fabet', 'fb88', 'm88', 'w88', 'fun88', '188bet',
        'jun88', 'sv388', 'kubet', 'ku11', 'new88', 'shbet',
        'vnd188', 'ae888', 'zbet', 'j88', '123b', '789bet', '8day',
        'oxbet', 'nhatvip', 'sunwin', 'go88', 'rikvip', 'b52',
        'gamebai', 'gamebaidoithuong', 'sbobet', 'ibet', 'dafabet',
        '12bet', 'letou', 'v9bet', 'm88asia', 'bk8', 'fi88',
        'one88', 'ae388', 'jbo', 'saba', 'cmd368', 'fb88vn',
        'happy8', 'happyluke', 'vwin', 'vn88', 'vip79', 'vip777',
        'kingfun', 'top88', 'sun88', 'zingplay', 'iwin', 'macau',
        'sodo', 'số đỏ', 'loc86', 'lộc 86', 'big79', 'kubet88',
        'casino', 'bet365', '1xbet', 'betway', 'betvictor',
        'casumo', 'leovegas', 'poker', 'slot', 'jackpot'
    ];

    const ALLOWED_CLICK_HOSTS = [
        location.hostname || '127.0.0.1',
        'localhost',
        '127.0.0.1',
        'cloudinary.com',
        'drive.google.com',
        'youtube.com',
        'youtu.be',
        'youtube-nocookie.com',
        'ytimg.com',
        'googlevideo.com',
        'fembed.co',
        'fembed.com',
        'supabase.co',
        'cdn.jsdelivr.net',
        'cdnjs.cloudflare.com',
        'cdn-icons-png.flaticon.com',
        'flaticon.com',
        'duckduckgo.com'
    ];

    function isAllowedHost(host) {
        if (!host) return false;
        const h = String(host).toLowerCase();
        return ALLOWED_CLICK_HOSTS.some(a => {
            if (!a) return false;
            const x = String(a).toLowerCase();
            return h === x || h.endsWith('.' + x);
        });
    }

    function isBlockedURL(url) {
        try {
            const u = new URL(url, location.href);
            const host = u.hostname.toLowerCase();
            const full = u.href.toLowerCase();
            return BLOCKED_KEYWORDS.some(k => host.includes(k) || full.includes(k));
        } catch (e) { return false; }
    }

    const _nativeOpen = window.open;
    window.open = function (url, name, features) {
        if (url) {
            const u = String(url);
            if (!u || u === 'about:blank' || u === '') {
                console.warn('[AdBlock] 🚫 blank popup blocked');
                return null;
            }
            try {
                const parsed = new URL(u, location.href);
                if (isBlockedURL(u) || !isAllowedHost(parsed.hostname)) {
                    console.warn('[AdBlock] 🚫 popup blocked:', u);
                    notifyBlocked(u);
                    return null;
                }
            } catch (e) { return null; }
        }
        return _nativeOpen.apply(window, arguments);
    };

    let lastNotify = 0;
    let blockCount = 0;

    function notifyBlocked(url) {
        blockCount++;
        const now = Date.now();
        if (now - lastNotify < 1500) return;
        lastNotify = now;

        if (typeof showToast === 'function') {
            showToast(`🛡️ Đã chặn link độc hại! (${blockCount} lần)`, 'error');
        } else {
            const el = document.createElement('div');
            el.style.cssText = `
                position:fixed; bottom:30px; left:50%; transform:translateX(-50%);
                background:#ff2a5f; color:#fff; padding:14px 24px;
                border-radius:10px; z-index:2147483647;
                font-weight:bold; font-size:15px; font-family:Arial,sans-serif;
                box-shadow:0 0 30px rgba(255,42,95,0.8);
            `;
            el.textContent = `🛡️ Đã chặn link độc hại! (${blockCount} lần)`;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 2500);
        }
    }

    document.addEventListener('click', function (e) {
        const a = e.target.closest('a');
        if (!a) return;

        const href = a.getAttribute('href');
        if (!href) return;
        if (href.startsWith('#')) return;
        if (href.startsWith('javascript:')) return;
        if (href.startsWith('mailto:')) return;
        if (href.startsWith('tel:')) return;

        try {
            const targetUrl = new URL(href, location.href);

            if (isBlockedURL(targetUrl.href)) {
                e.preventDefault(); e.stopPropagation();
                console.warn('[AdBlock] 🚫 Click blocked (keyword):', targetUrl.href);
                notifyBlocked(targetUrl.href);
                return false;
            }

            if (!isAllowedHost(targetUrl.hostname)) {
                e.preventDefault(); e.stopPropagation();
                console.warn('[AdBlock] 🚫 Click blocked (unknown host):', targetUrl.href);
                notifyBlocked(targetUrl.href);
                return false;
            }
        } catch (err) {
            e.preventDefault(); e.stopPropagation();
            console.warn('[AdBlock] 🚫 Malformed URL blocked:', href);
            return false;
        }
    }, true);

    const BLOCK_SELECTORS = [
        'iframe[src*="vdohide"]',
        'iframe[src*="popads"]',
        'iframe[src*="popcash"]',
        'iframe[src*="propeller"]',
        'iframe[src*="adsterra"]',
        'iframe[src*="exoclick"]',
        'iframe[src*="doubleclick"]',
        'iframe[src*="googlesyndication"]',
        'div[id^="ad-"]',
        'div[id*="-ad-"]',
        'div[class*="ad-banner"]',
        'div[class*="advertisement"]',
        'div[id*="adsbygoogle"]',
        'ins.adsbygoogle'
    ];

    function killAds(root) {
        BLOCK_SELECTORS.forEach(sel => {
            try {
                root.querySelectorAll(sel).forEach(el => {
                    if (el.id === 'playerFrame') return;
                    if (el.closest('#playerModal .video-container')) return;
                    console.warn('[AdBlock] 🚫 removing ad:', sel);
                    el.remove();
                });
            } catch (e) {}
        });
    }

    const _mo = new MutationObserver(muts => {
        muts.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType === 1) killAds(node);
            });
        });
    });

    function startObserver() {
        if (!document.body) return;
        killAds(document);
        _mo.observe(document.body, { childList: true, subtree: true });
    }
    if (document.body) startObserver();
    else document.addEventListener('DOMContentLoaded', startObserver);

    function watchPlayerIframe() {
        const iframe = document.getElementById('playerFrame');
        if (!iframe || iframe.dataset.adblockWatched) return;
        iframe.dataset.adblockWatched = '1';
        const origSrc = iframe.src;
        new MutationObserver(() => {
            const cur = iframe.getAttribute('src') || '';
            if (cur && cur !== origSrc && !cur.startsWith('about:') && isBlockedURL(cur)) {
                console.warn('[AdBlock] 🚫 iframe hijack blocked:', cur);
                iframe.setAttribute('src', origSrc);
            }
        }).observe(iframe, { attributes: true, attributeFilter: ['src'] });
    }
    setInterval(watchPlayerIframe, 1000);

    setInterval(() => {
        document.querySelectorAll('iframe').forEach(f => {
            if (f.id === 'playerFrame') return;
            if (f.closest('#playerModal .video-container')) return;
            const src = f.getAttribute('src') || '';
            if (src && isBlockedURL(src)) {
                console.warn('[AdBlock] 🚫 rogue iframe removed:', src);
                f.remove();
            }
        });
    }, 1500);

    console.log('✅ AdBlock v2 active — popup + click shield ready');
})();