/* =====================================================
   TALISMAN BURST — Flash TỨC THÌ khi bấm play
   ===================================================== */
function spawnTalismanBurst(sealEl) {
    const rect = sealEl.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;

    sealEl.classList.add('flash-now');
    setTimeout(() => sealEl.classList.remove('flash-now'), 130);

    [0, 90].forEach(delay => {
        setTimeout(() => {
            const ring = document.createElement('div');
            ring.className = 'talisman-ring';
            ring.style.left = cx + 'px';
            ring.style.top  = cy + 'px';
            document.body.appendChild(ring);
            setTimeout(() => ring.remove(), 800);
        }, delay);
    });

    for (let i = 0; i < 16; i++) {
        const p = document.createElement('div');
        p.className = 'talisman-smoke';
        const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.4;
        const dist  = 45 + Math.random() * 70;
        p.style.setProperty('--sx', cx + 'px');
        p.style.setProperty('--sy', cy + 'px');
        p.style.setProperty('--dx', (Math.cos(angle) * dist) + 'px');
        p.style.setProperty('--dy', (Math.sin(angle) * dist - 40) + 'px');
        p.style.animationDelay = (Math.random() * 0.08) + 's';
        const s = 0.7 + Math.random() * 0.7;
        p.style.width  = (22 * s) + 'px';
        p.style.height = (22 * s) + 'px';
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1500);
    }

    for (let i = 0; i < 14; i++) {
        const s = document.createElement('div');
        s.className = 'talisman-spark';
        const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.6;
        const dist  = 60 + Math.random() * 90;
        s.style.setProperty('--sx', cx + 'px');
        s.style.setProperty('--sy', cy + 'px');
        s.style.setProperty('--dx', (Math.cos(angle) * dist) + 'px');
        s.style.setProperty('--dy', (Math.sin(angle) * dist - 20) + 'px');
        s.style.animationDelay = (Math.random() * 0.06) + 's';
        document.body.appendChild(s);
        setTimeout(() => s.remove(), 1000);
    }

    const flash = document.createElement('div');
    flash.className = 'screen-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 500);
}

function bindTalismanPlayButtons() {
    document.querySelectorAll('.movie-play').forEach(seal => {
        if (seal.dataset.burstBound === '1') return;
        seal.dataset.burstBound = '1';

        seal.addEventListener('click', (e) => {
            e.stopPropagation();
            seal.classList.add('active');
            spawnTalismanBurst(seal);
        });
        seal.addEventListener('touchstart', () => {
            seal.classList.add('active');
        }, { passive: true });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindTalismanPlayButtons);
} else {
    bindTalismanPlayButtons();
}
new MutationObserver(bindTalismanPlayButtons)
    .observe(document.body, { childList: true, subtree: true });