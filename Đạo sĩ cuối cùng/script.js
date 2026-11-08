/* =======================================================
   DATABASE — load từ video-vault.js (URL obfuscated)
   ======================================================= */
const CLOUD_THUMB_FALLBACK = window.__VAULT_FB
    || 'https://res.cloudinary.com/l5czhek5/image/upload/v1788314155/62a6b656-186e-4a3f-94d0-e2e2bce51033.jpg';

const movieDatabase = window.__MOVIE_DB || [];

let usersDB      = JSON.parse(localStorage.getItem('usersDB')) || {};
let activeUser   = JSON.parse(localStorage.getItem('activeUser')) || null;
let watchHistory = JSON.parse(localStorage.getItem('watchHistory')) || [];

/* =======================================================
   HELPERS
   ======================================================= */
function escapeHTML(text) {
    return String(text ?? '')
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getThumb(m) {
    if (m && m.thumb) return m.thumb;
    if (!m) return CLOUD_THUMB_FALLBACK;

    if (m.type === 'youtube' && m.url) {
        if (/youtube(?:-nocookie)?\.com/.test(m.url)) {
            const match = m.url.match(/(?:embed\/|watch\?v=|youtu\.be\/)([^?&/]+)/);
            if (match) return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
        }
        return CLOUD_THUMB_FALLBACK;
    }
    if (m.type === 'mp4' && m.url) {
        if (m.url.includes('cloudinary.com')) {
            return m.url.replace('/video/upload/', '/video/upload/so_1/').replace(/\.mp4$/i, '.jpg');
        }
        return CLOUD_THUMB_FALLBACK;
    }
    return CLOUD_THUMB_FALLBACK;
}

function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.style.borderColor = type === 'error' ? '#ff2a5f' : (type === 'success' ? '#4ade80' : 'gold');
    t.classList.add('show');
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => t.classList.remove('show'), 3000);
}

/* =======================================================
   SCROLL PROGRESS
   ======================================================= */
function initScrollProgress() {
    const bar = document.getElementById('scrollProgress');
    if (!bar) return;
    window.addEventListener('scroll', () => {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
        bar.style.width = pct + '%';
    }, { passive: true });
}
initScrollProgress();

/* =======================================================
   TÊN + MENU + BG
   ======================================================= */
let ten = activeUser ? activeUser.username : 'Người dùng';
const helloEl = document.getElementById("hello");
if (helloEl) helloEl.innerHTML = "Xin chào " + ten;

async function doiTen() {
    const newNameRaw = prompt("Nhập tên mới:", ten);
    if (!newNameRaw || !newNameRaw.trim()) return;
    const newName = newNameRaw.trim();

    if (typeof currentUser !== 'undefined' && currentUser) {
        const cleanName = cleanUsername(newName);
        if (!cleanName || cleanName.length < 3) {
            showToast('Tên phải ≥ 3 ký tự (chữ, số, _)', 'error');
            return;
        }
        try {
            const { error } = await sb.from('profiles')
                .update({ username: cleanName })
                .eq('id', currentUser.id);
            if (error) throw error;
            currentProfile = { ...currentProfile, username: cleanName };
            ten = cleanName;
            if (helloEl) helloEl.innerHTML = "Xin chào " + cleanName;
            const disp = document.getElementById('user-name-display');
            if (disp) disp.textContent = cleanName;
            showToast('✅ Đã đổi tên!', 'success');
        } catch (e) {
            console.error(e);
            showToast('❌ Không đổi được tên!', 'error');
        }
        return;
    }

    ten = newName;
    if (helloEl) helloEl.innerHTML = "Xin chào " + ten;
    if (activeUser) {
        const oldName = activeUser.username;
        if (oldName !== ten) delete usersDB[oldName];
        activeUser.username = ten;
        usersDB[ten] = activeUser;
        localStorage.setItem('usersDB', JSON.stringify(usersDB));
        localStorage.setItem('activeUser', JSON.stringify(activeUser));
    }
    showToast('✅ Đã đổi tên!', 'success');
}

const hamburgerBtn = document.getElementById("hamburgerBtn");
const menuEl = document.getElementById("menu");
if (hamburgerBtn && menuEl) {
    hamburgerBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        const isOpen = menuEl.style.display === "block";
        menuEl.style.display = isOpen ? "none" : "block";
        hamburgerBtn.classList.toggle("active", !isOpen);
        renderMenuHistory();
    });
    document.addEventListener("click", function(e) {
        if (!menuEl.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            menuEl.style.display = "none";
            hamburgerBtn.classList.remove("active");
        }
    });
}

let bg = localStorage.getItem("background");
if (bg && !activeUser) {
    document.body.style.backgroundImage = "url('" + bg + "')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
}
let bgFile = document.getElementById("bgFile");
if (bgFile) {
    bgFile.onchange = function() {
        let file = this.files[0];
        if (!file) return;
        let reader = new FileReader();
        reader.onload = function() {
            document.body.style.backgroundImage = "url('" + reader.result + "')";
            document.body.style.backgroundSize = "cover";
            document.body.style.backgroundPosition = "center";
            document.body.style.backgroundAttachment = "fixed";
            localStorage.setItem("background", reader.result);
            if (activeUser) {
                activeUser.bg = reader.result;
                usersDB[activeUser.username] = activeUser;
                localStorage.setItem('usersDB', JSON.stringify(usersDB));
                localStorage.setItem('activeUser', JSON.stringify(activeUser));
            }
            showToast('Đã đổi hình nền!', 'success');
        };
        reader.readAsDataURL(file);
    };
}

history.scrollRestoration = "manual";
window.addEventListener("load", () => window.scrollTo(0, 0));

/* =======================================================
   CANVAS
   ======================================================= */
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
let width, height, particles = [];
const mouse = { x: null, y: null, maxRadius: 220 };

const PARTICLE_COUNT = 80;
const CONNECT_DIST   = 130;
const CONNECT_DIST2  = CONNECT_DIST * CONNECT_DIST;
const MOUSE_R2       = 220 * 220;

const sprite = document.createElement('canvas');
sprite.width = sprite.height = 32;
(function() {
    const s = sprite.getContext('2d');
    const g = s.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,220,1)');
    g.addColorStop(0.25, 'rgba(255,230,0,0.95)');
    g.addColorStop(0.55, 'rgba(255,200,0,0.45)');
    g.addColorStop(0.8, 'rgba(255,170,0,0.15)');
    g.addColorStop(1, 'rgba(255,150,0,0)');
    s.fillStyle = g;
    s.fillRect(0, 0, 32, 32);
})();

function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 1.6;
        this.vy = (Math.random() - 0.5) * 1.6;
        this.radius = Math.random() * 1.8 + 1.4;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
    }
}
for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

function animateCanvas() {
    requestAnimationFrame(animateCanvas);
    ctx.clearRect(0, 0, width, height);
    const pList = particles, len = pList.length;
    const mx = mouse.x, my = mouse.y;
    const hasMouse = mx !== null && my !== null;

    ctx.lineWidth = 0.8;
    for (let i = 0; i < len; i++) {
        const p = pList[i];
        for (let j = i + 1; j < len; j++) {
            const q = pList[j];
            const dx = p.x - q.x, dy = p.y - q.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < CONNECT_DIST2) {
                const d = Math.sqrt(d2);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
                ctx.strokeStyle = 'rgba(255,215,0,' + (0.2 * (1 - d / CONNECT_DIST)).toFixed(3) + ')';
                ctx.stroke();
            }
        }
    }
    const s = sprite;
    for (let i = 0; i < len; i++) {
        const p = pList[i];
        p.update();
        const r = p.radius * 2.6;
        ctx.drawImage(s, p.x - r, p.y - r, r * 2, r * 2);
        if (hasMouse) {
            const dx = mx - p.x, dy = my - p.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < MOUSE_R2) {
                const dist = Math.sqrt(d2);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y); ctx.lineTo(mx, my);
                ctx.strokeStyle = 'rgba(255,230,0,' + (1 - dist / mouse.maxRadius).toFixed(3) + ')';
                ctx.lineWidth = 1.6;
                ctx.stroke();
            }
        }
    }
}
animateCanvas();

/* =======================================================
   EYES + MOUSE + FIREFLY
   ======================================================= */
const pupils = document.querySelectorAll('.pupil');
const eyes = document.querySelectorAll('.eye');
const mouseGlow = document.getElementById('mouseGlow');

let lastFireflyTime = 0, lastSpiritTime = 0;
let pendingMouseX = 0, pendingMouseY = 0;
let mouseRAF = null, firstMouse = true;

function updatePupils(mx, my) {
    for (let i = 0; i < pupils.length; i++) {
        const pupil = pupils[i];
        const eye = pupil.parentElement;
        const rect = eye.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(my - cy, mx - cx);
        const distance = Math.min(rect.width / 4, Math.hypot(mx - cx, my - cy) / 10);
        pupil.style.transform = `translate(${(Math.cos(angle) * distance).toFixed(1)}px, ${(Math.sin(angle) * distance).toFixed(1)}px)`;
    }
}

document.addEventListener("mousemove", function(e) {
    pendingMouseX = e.clientX;
    pendingMouseY = e.clientY;
    if (mouseRAF) return;
    mouseRAF = requestAnimationFrame(() => {
        mouseRAF = null;
        mouse.x = pendingMouseX;
        mouse.y = pendingMouseY;
        if (mouseGlow) {
            mouseGlow.style.transform = `translate3d(${pendingMouseX - 50}px, ${pendingMouseY - 50}px, 0)`;
            if (firstMouse) { mouseGlow.style.opacity = '0.9'; firstMouse = false; }
        }
        updatePupils(pendingMouseX, pendingMouseY);

        const now = performance.now();
        if (now - lastFireflyTime > 90) {
            lastFireflyTime = now;
            const dot = document.createElement('div');
            dot.className = 'firefly';
            dot.style.setProperty('--fx', (pendingMouseX - 10) + 'px');
            dot.style.setProperty('--fy', (pendingMouseY - 10) + 'px');
            document.body.appendChild(dot);
            setTimeout(() => dot.remove(), 950);
        }
        if (now - lastSpiritTime > 160 && Math.random() > 0.5) {
            lastSpiritTime = now;
            const p = document.createElement('div');
            p.className = 'spirit-particle';
            const ox = (Math.random() - 0.5) * 20;
            const oy = (Math.random() - 0.5) * 20;
            p.style.setProperty('--px', (pendingMouseX + ox) + 'px');
            p.style.setProperty('--py', (pendingMouseY + oy) + 'px');
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 950);
        }
    });
});

document.addEventListener("mousedown", function() {
    eyes.forEach(eye => {
        eye.classList.add('blink');
        setTimeout(() => eye.classList.remove('blink'), 220);
    });
});

/* =======================================================
   SEARCH
   ======================================================= */
const searchText = document.getElementById("searchText");
const searchResults = document.getElementById("searchResults");

function renderSearchItems(matched) {
    return matched.map(m => {
        const thumb = getThumb(m);
        const typeClass = m.type === 'youtube' ? 'yt' : 'mp4';
        const typeLabel = m.type === 'youtube' ? 'YT' : 'MP4';
        const newTag = m.isNew ? ' <span style="color:#ff2a5f;">🔥</span>' : '';
        return `
            <div class="search-item" onclick="playSearchResult(${m.id})">
                <img src="${thumb}" onerror="this.onerror=null;this.src='${CLOUD_THUMB_FALLBACK}'">
                <div class="search-item-info">
                    <div class="s-title">${escapeHTML(m.title)}${newTag}</div>
                    <div class="s-desc">${escapeHTML(m.desc || '')}</div>
                </div>
                <span class="search-item-type ${typeClass}">${typeLabel}</span>
            </div>`;
    }).join('');
}

function findMatches(q) {
    const query = q.toLowerCase().trim();
    if (!query) return [];
    return movieDatabase.filter(m =>
        m.title.toLowerCase().includes(query) ||
        (m.desc || '').toLowerCase().includes(query));
}

let liveSearchTimer = null;
searchText.addEventListener("input", function() {
    clearTimeout(liveSearchTimer);
    const q = this.value.trim();
    if (!q) { searchResults.classList.remove('active'); return; }
    liveSearchTimer = setTimeout(() => {
        const matched = findMatches(q);
        if (matched.length > 0) {
            searchResults.innerHTML = renderSearchItems(matched);
            searchResults.classList.add('active');
        } else {
            searchResults.classList.remove('active');
        }
    }, 120);
});

searchText.addEventListener("keydown", function(e) {
    if (e.key === "Escape") { searchResults.classList.remove('active'); return; }
    if (e.key !== "Enter") return;
    if (e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    clearTimeout(liveSearchTimer);
    searchInWeb();
});

document.addEventListener("click", e => {
    if (!e.target.closest(".search-box")) searchResults.classList.remove('active');
});

function searchInWeb() {
    const q = searchText.value.trim();
    if (!q) { showToast('Vui lòng nhập từ khóa!', 'error'); searchText.focus(); return; }
    const matched = findMatches(q);
    if (matched.length === 0) {
        searchResults.innerHTML = `<div class="search-empty">
            <i class="fa-solid fa-circle-exclamation" style="font-size:34px;"></i>
            <span class="big">Video chưa có trong web!</span>
            Không tìm thấy "<strong style="color:gold">${escapeHTML(q)}</strong>".
        </div>`;
        searchResults.classList.add('active');
        return;
    }
    searchResults.innerHTML = renderSearchItems(matched);
    searchResults.classList.add('active');
}

function duckSearch() {
    const text = searchText.value.trim();
    if (!text) { showToast('Nhập từ khóa!', 'error'); return; }
    window.open("https://duckduckgo.com/?q=" + encodeURIComponent(text), "_blank");
}

function playSearchResult(id) {
    searchResults.classList.remove('active');
    searchText.value = '';
    const movie = movieDatabase.find(m => m.id === id);
    if (!movie) return;

    const thumbEl = document.querySelector(`.movie-thumb[data-id="${movie.id}"]`);
    if (thumbEl) {
        thumbEl.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
            const seal = thumbEl.querySelector(".movie-play");
            if (seal) seal.click();
        }, 600);
    } else if (typeof openPlayerByMovie === 'function') {
        openPlayerByMovie(movie);
    }
}

/* =======================================================
   START SCREEN
   ======================================================= */
const startScreen = document.getElementById("startScreen");
const website = document.getElementById("website");
const startButton = document.getElementById("startBtn");

startButton.addEventListener("click", function() {
    if (startScreen.classList.contains("sealing")) return;
    startScreen.classList.add("sealing");
    for (let i = 0; i < 25; i++) {
        setTimeout(() => {
            const p = document.createElement('div');
            p.className = 'spirit-particle';
            const x = window.innerWidth / 2 + (Math.random() - 0.5) * 400;
            const y = window.innerHeight / 2 + (Math.random() - 0.5) * 300;
            p.style.setProperty('--px', x + 'px');
            p.style.setProperty('--py', y + 'px');
            p.style.width = (Math.random() * 8 + 4) + 'px';
            p.style.height = p.style.width;
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 1200);
        }, i * 30);
    }
    setTimeout(() => {
        startScreen.style.display = "none";
        website.classList.add("show");
    }, 2200);
});

/* =======================================================
   DOWNLOAD
   ======================================================= */
function downloadEpisode(btn) {
    const card = btn.closest('.movie-thumb');
    if (!card) return;

    const id = parseInt(card.dataset.id, 10);
    const movie = movieDatabase.find(m => m.id === id);
    if (!movie || !movie.url) { showToast('Không có link!', 'error'); return; }

    const url   = movie.url;
    const title = movie.title || 'video';

    if (url.includes('fembed.co') || url.includes('youtube.com')) {
        showToast('Không hỗ trợ tải trực tiếp video nhúng!', 'error');
        return;
    }

    const dlUrl = url.includes('/upload/') ? url.replace('/upload/', '/upload/fl_attachment/') : url;
    const a = document.createElement('a');
    a.href = dlUrl; a.download = title; a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast('⬇ Đang tải: ' + title, 'success');
}

function downloadAllMovies() {
    const mp4List = movieDatabase.filter(m => m.type === 'mp4');
    if (!mp4List.length) return;
    if (!confirm(`Tải ${mp4List.length} tập phim MP4?`)) return;
    showToast(`Đang tải ${mp4List.length} tập...`, 'success');
    mp4List.forEach((m, i) => {
        setTimeout(() => {
            const link = document.createElement('a');
            link.href = m.url.includes('/upload/') ? m.url.replace('/upload/', '/upload/fl_attachment/') : m.url;
            link.download = m.title; link.target = '_blank';
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
        }, i * 1200);
    });
}

function downloadApp() {
    const a = document.createElement('a');
    a.href = encodeURI('Đạo sĩ cuối cùng.exe');
    a.download = 'Đạo sĩ cuối cùng.exe';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('⬇ Đang tải Đạo sĩ cuối cùng.exe...', 'success');
}

/* =======================================================
   HISTORY
   ======================================================= */
function saveWatchHistory(title, video, thumbnail) {
    watchHistory = watchHistory.filter(item => (item.video || item.url) !== video);
    watchHistory.unshift({
        title, video, url: video, thumbnail, thumb: thumbnail,
        watchedAt: new Date().toLocaleString('vi-VN'),
        time: Date.now()
    });
    watchHistory = watchHistory.slice(0, 30);
    localStorage.setItem('watchHistory', JSON.stringify(watchHistory));
    renderMenuHistory();
}

function renderMenuHistory() {
    const list = document.getElementById("menuHistoryList");
    if (!list) return;
    if (watchHistory.length === 0) {
        list.innerHTML = '<p class="empty-history">Bạn chưa xem phim nào.</p>';
        return;
    }
    list.innerHTML = watchHistory.map((item, index) => `
        <div class="menu-history-item" onclick="playHistoryFromMenu(${index})">
            <img class="menu-history-thumb" src="${item.thumbnail || item.thumb || CLOUD_THUMB_FALLBACK}" onerror="this.onerror=null;this.src='${CLOUD_THUMB_FALLBACK}'">
            <div class="menu-history-name">${escapeHTML(item.title)}</div>
        </div>`).join("");
}

function playHistoryFromMenu(index) {
    const item = watchHistory[index];
    if (!item) return;
    const videoURL = item.video || item.url;
    const movie = movieDatabase.find(m => m.url === videoURL);
    if (!movie) { showToast('Video không có trong danh sách!', 'error'); return; }

    if (menuEl) menuEl.style.display = "none";
    if (hamburgerBtn) hamburgerBtn.classList.remove("active");

    const target = document.querySelector(`.movie-thumb[data-id="${movie.id}"]`);
    if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
            const seal = target.querySelector(".movie-play");
            if (seal) seal.click();
        }, 600);
    } else {
        if (typeof openPlayerByMovie === 'function') openPlayerByMovie(movie);
    }
}

function clearAllHistory() {
    if (watchHistory.length === 0) { showToast('Lịch sử đã trống!', 'info'); return; }
    if (!confirm("Xóa toàn bộ lịch sử xem?")) return;
    watchHistory = [];
    localStorage.removeItem('watchHistory');
    renderMenuHistory();
    openHistoryModal();
    showToast('Đã xóa lịch sử!', 'success');
}
const menuClearBtn = document.getElementById("menuClearHistoryBtn");
if (menuClearBtn) menuClearBtn.addEventListener("click", clearAllHistory);
renderMenuHistory();

function openHistoryModal() {
    const list = document.getElementById('historyList');
    if (watchHistory.length === 0) {
        list.innerHTML = `<p style="color:#a0a5b5; text-align:center; padding:20px; font-size:20px;">Chưa có lịch sử.</p>`;
    } else {
        list.innerHTML = watchHistory.map((item, idx) => `
            <div class="history-item" onclick="closeModal('historyModal'); playHistoryFromMenu(${idx});">
                <img src="${item.thumbnail || item.thumb || CLOUD_THUMB_FALLBACK}" onerror="this.onerror=null;this.src='${CLOUD_THUMB_FALLBACK}'">
                <div style="flex:1; min-width:0;">
                    <div class="hi-title">${escapeHTML(item.title)}</div>
                    <div class="hi-time">${item.watchedAt || new Date(item.time).toLocaleString('vi-VN')}</div>
                </div>
                <i class="fa-solid fa-play" style="color:gold; font-size:22px;"></i>
            </div>`).join('');
    }
    document.getElementById('historyModal').classList.add('active');
}

/* =======================================================
   NGÔN NGỮ
   ======================================================= */
const translations = {
    vi: { language: "Tiếng Việt", home: "Trang chủ",
        title: "Đây chính là web lưu trữ tất cả tập phim Đạo Sĩ Cuối Cùng",
        welcome: "Chào mừng bạn đến với trang web của chúng tôi!",
        searchPlaceholder: "🔍 Nhập tên phim... rồi bấm nút hoặc Enter",
        episodeList: "Danh sách các tập phim", start: "▶ BẮT ĐẦU" },
    en: { language: "English", home: "Home",
        title: "This is the website storing all episodes of The Last Taoist",
        welcome: "Welcome to our website!",
        searchPlaceholder: "🔍 Enter movie name...",
        episodeList: "Episode List", start: "▶ START" },
    zh: { language: "中文", home: "首页",
        title: "这里是《最后的道士》所有剧集的存储网站",
        welcome: "欢迎来到我们的网站！",
        searchPlaceholder: "🔍 输入电影名...",
        episodeList: "剧集列表", start: "▶ 开始" }
};

const languageBtn = document.getElementById("languageBtn");
const languageMenu = document.getElementById("languageMenu");
const currentLanguage = document.getElementById("currentLanguage");

languageBtn.addEventListener("click", e => { e.stopPropagation(); languageMenu.classList.toggle("show"); });
languageMenu.addEventListener("click", e => e.stopPropagation());
document.addEventListener("click", () => languageMenu.classList.remove("show"));

document.querySelectorAll(".language-option").forEach(btn => {
    btn.addEventListener("click", () => changeLanguage(btn.dataset.lang));
});

function changeLanguage(lang) {
    const t = translations[lang];
    if (!t) return;
    currentLanguage.textContent = t.language;
    const navHome = document.getElementById("navHomeText"); if (navHome) navHome.textContent = t.home;
    const mainTitle = document.getElementById("mainTitle"); if (mainTitle) mainTitle.textContent = t.title;
    const welcome = document.getElementById("mainWelcome"); if (welcome) welcome.textContent = t.welcome;
    if (searchText) searchText.placeholder = t.searchPlaceholder;
    const epList = document.getElementById("episodeListText"); if (epList) epList.textContent = t.episodeList;
    if (startButton) startButton.textContent = t.start;
    document.querySelectorAll(".language-option").forEach(b => b.classList.remove("active"));
    const sel = document.querySelector('.language-option[data-lang="' + lang + '"]');
    if (sel) sel.classList.add("active");
    localStorage.setItem("siteLanguage", lang);
    languageMenu.classList.remove("show");
}

const savedLanguage = localStorage.getItem("siteLanguage");
if (savedLanguage) changeLanguage(savedLanguage);

/* =======================================================
   MODAL HELPERS
   ======================================================= */
function closeModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('active');
    if (id === 'playerModal') {
        const video = document.getElementById('playerVideo');
        if (video && typeof currentMovie !== 'undefined' && currentMovie) {
            try {
                const data = JSON.parse(localStorage.getItem('videoProgress') || '{}');
                data[currentMovie.url] = video.currentTime;
                localStorage.setItem('videoProgress', JSON.stringify(data));
            } catch(e) {}
        }
        document.getElementById('videoContainer').innerHTML = '';
    }
}
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal.id); });
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => closeModal(m.id));
        if (searchResults) searchResults.classList.remove('active');
    }
});

/* =======================================================
   RENDER TẤT CẢ CARD / EMBED TỪ VAULT (không có URL trong HTML)
   ======================================================= */
function renderMovieCards() {
    const grid = document.getElementById('movieGrid');
    if (!grid) return;

    const cardIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 32, 33, 34];
    grid.innerHTML = cardIds.map(id => {
        const m = movieDatabase.find(x => x.id === id);
        if (!m) return '';
        const thumb   = getThumb(m);
        const newCls  = m.isNew ? ' is-new' : '';
        const newBadge = m.isNew
            ? '<div class="new-badge"><i class="fa-solid fa-fire"></i> MỚI</div>'
            : '';
        return `
            <div class="movie-thumb${newCls}" data-id="${m.id}">
                <img src="${thumb}"
                     alt="${escapeHTML(m.title)}"
                     loading="lazy"
                     onerror="this.onerror=null;this.src='${CLOUD_THUMB_FALLBACK}'">
                ${newBadge}
                <button class="movie-download" onclick="event.stopPropagation(); downloadEpisode(this)">
                    <i class="fa-solid fa-download"></i>
                </button>
                <div class="movie-play" onclick="event.stopPropagation(); openMovie(this.closest('.movie-thumb'))"></div>
                <div class="movie-title-overlay">${escapeHTML(m.title)}</div>
            </div>`;
    }).join('');

    if (typeof bindTalismanPlayButtons === 'function') bindTalismanPlayButtons();
}

function renderThiensuSection() {
    const wrap = document.getElementById('thiensuSection');
    if (!wrap) return;
    const list = [11, 12, 13].map(id => movieDatabase.find(m => m.id === id)).filter(Boolean);
    let html = '';
    if (list[0]) html += `<a href="${list[0].url}" target="_blank">Thiên sứ bắt ma phần 1,2,3</a><br><br>`;
    html += list.map(m => `<video width="850" height="500" controls><source src="${m.url}" type="video/mp4"></video><br><br>`).join('');
    wrap.innerHTML = html;
}

function renderYoutubeSection() {
    const wrap = document.getElementById('youtubeSection');
    if (!wrap) return;

    const linkLabels = {
        15: 'Full bộ thiên sứ bắt ma phần 1',
        28: 'Full bộ Khử ma đạo trưởng',
        29: 'When Fortune Smiles (1990)',
        31: 'Long Hổ Đặc Cảnh'
    };

    const ids = [14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31];
    wrap.innerHTML = ids.map(id => {
        const m = movieDatabase.find(x => x.id === id);
        if (!m) return '';
        const link = linkLabels[id] ? `<a href="${m.url}" target="_blank">${linkLabels[id]}</a><br><br>` : '';
        return `<div class="movie-block">${link}<iframe width="850" height="500" src="${m.url}" frameborder="0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen loading="lazy"></iframe></div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    renderMovieCards();
    renderThiensuSection();
    renderYoutubeSection();
});

console.log('✅ script.js loaded');