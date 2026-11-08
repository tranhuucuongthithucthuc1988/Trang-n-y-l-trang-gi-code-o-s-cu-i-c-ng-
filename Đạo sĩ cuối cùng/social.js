/* =======================================================
   SOCIAL.JS — Auth / Like / Comment / Subscribe / Settings
   ======================================================= */

let currentUser    = null;
let currentProfile = null;
let currentMovie   = null;
let currentVideoId = null;
let currentLikeState = false;
let currentSubState  = false;

let playerKeyboardBound = false;

/* ---------- USERNAME ---------- */
function cleanUsername(raw) {
    return String(raw || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/gi, 'd').toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
}

/* =======================================================
   AUTH MODAL
   ======================================================= */
function openAuthModal() {
    if (currentUser) {
        if (confirm('Bạn muốn đăng xuất khỏi tài khoản?')) logoutUser();
        return;
    }
    document.getElementById('authModal').classList.add('active');
    document.getElementById('authUsername').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('authUsername').focus();
}

async function handleAuth(e) {
    e.preventDefault();
    const usernameRaw = document.getElementById('authUsername').value.trim();
    const password    = document.getElementById('authPassword').value;
    const username    = cleanUsername(usernameRaw);
    const activeTab   = document.querySelector('.auth-tab.active')?.dataset.tab || 'login';
    const submitBtn   = document.getElementById('authSubmitBtn');

    if (!username || username.length < 3) {
        showToast('Tên tài khoản phải ≥ 3 ký tự (chữ, số, _)', 'error');
        return;
    }
    if (!password || password.length < 6) {
        showToast('Mật khẩu phải ≥ 6 ký tự!', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    try {
        const email = username + SYNTH_DOMAIN;

        if (activeTab === 'register') {
            const { data, error } = await sb.auth.signUp({ email, password });
            if (error) throw error;

            if (!data.session) {
                throw new Error('EMAIL_CONFIRM_REQUIRED');
            }

            if (data.user) {
                const { error: profErr } = await sb.from('profiles').upsert({
                    id: data.user.id,
                    username: username,
                    avatar_url: DEFAULT_AVATAR
                });
                if (profErr) console.warn('[profile upsert]', profErr);
            }
            showToast('✅ Đăng ký thành công!', 'success');
        } else {
            const { error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
            showToast('✅ Đăng nhập thành công!', 'success');
        }

        await refreshUserState();
        closeModal('authModal');
        e.target.reset();
    } catch (err) {
        console.error('[auth]', err);
        let msg = err.message || 'Lỗi xác thực';
        const low = msg.toLowerCase();
        if (msg === 'EMAIL_CONFIRM_REQUIRED') {
            msg = 'Vui lòng xác nhận email hoặc tắt "Confirm email" trong Supabase!';
        } else if (low.includes('invalid')) {
            msg = 'Sai tên hoặc mật khẩu!';
        } else if (low.includes('already')) {
            msg = 'Tên tài khoản đã tồn tại!';
        } else if (low.includes('password')) {
            msg = 'Mật khẩu không hợp lệ!';
        } else if (low.includes('rate')) {
            msg = 'Bạn thao tác quá nhanh, thử lại sau!';
        } else if (low.includes('fetch')) {
            msg = 'Lỗi kết nối Supabase (Đang bảo trì hoặc mất mạng)';
        }
        showToast('❌ ' + msg, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    }
}

async function logoutUser() {
    await sb.auth.signOut();
    currentUser = null;
    currentProfile = null;
    if (typeof activeUser !== 'undefined') {
        activeUser = null;
        localStorage.removeItem('activeUser');
    }
    updateUIForGuest();
    showToast('Đã đăng xuất!', 'info');
}

async function refreshUserState() {
    try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session?.user) {
            currentUser = null;
            currentProfile = null;
            updateUIForGuest();
            return;
        }
        currentUser = session.user;
        const { data: prof } = await sb.from('profiles')
            .select('*').eq('id', currentUser.id).maybeSingle();
        currentProfile = prof;

        const avatarImg = document.getElementById('user-avatar');
        const nameDisp  = document.getElementById('user-name-display');
        const displayName = prof?.username || 'User';
        if (avatarImg) avatarImg.src = prof?.avatar_url || DEFAULT_AVATAR;
        if (nameDisp)  nameDisp.textContent = displayName;

        if (typeof ten !== 'undefined') {
            ten = displayName;
            const helloEl = document.getElementById('hello');
            if (helloEl) helloEl.innerHTML = "Xin chào " + displayName;
        }
    } catch (e) {
        console.error('[refreshUserState]', e);
    }
    updateCommentSectionAuth();
}

function updateUIForGuest() {
    const avatarImg = document.getElementById('user-avatar');
    const nameDisp  = document.getElementById('user-name-display');
    if (avatarImg) avatarImg.src = DEFAULT_AVATAR;
    if (nameDisp)  nameDisp.textContent = 'Đăng nhập';
    updateCommentSectionAuth();
}

function updateCommentSectionAuth() {
    const hint   = document.getElementById('commentAuthHint');
    const form   = document.getElementById('commentForm');
    const avatar = document.getElementById('commentAvatar');
    if (!hint || !form) return;

    if (currentUser) {
        hint.style.display = 'none';
        form.style.display = 'flex';
        if (avatar) avatar.src = currentProfile?.avatar_url || DEFAULT_AVATAR;
    } else {
        hint.style.display = 'block';
        form.style.display = 'none';
    }
}

/* =======================================================
   PROGRESS STORAGE
   ======================================================= */
function getSavedTime(videoId) {
    try {
        const data = JSON.parse(localStorage.getItem('videoProgress') || '{}');
        return data[videoId] || 0;
    } catch { return 0; }
}
function saveVideoProgress(videoId, time) {
    try {
        const data = JSON.parse(localStorage.getItem('videoProgress') || '{}');
        data[videoId] = time;
        localStorage.setItem('videoProgress', JSON.stringify(data));
    } catch {}
}
function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

/* =======================================================
   PLAYER
   ======================================================= */
function openMovie(el) {
    if (!el) return;

    const id = parseInt(el.dataset.id, 10);
    if (!id) return;

    const movie = movieDatabase.find(m => m.id === id);
    if (!movie) {
        showToast('Không tìm thấy video!', 'error');
        return;
    }

    saveWatchHistory(movie.title, movie.url, movie.thumb || getThumb(movie));
    openPlayerByMovie(movie);
}

function openPlayerByMovie(movie) {
    if (!movie) return;

    const oldVideo = document.getElementById('playerVideo');
    if (oldVideo && currentMovie && currentMovie.url !== movie.url) {
        saveVideoProgress(currentMovie.url, oldVideo.currentTime);
    }

    currentMovie   = movie;
    currentVideoId = movie.url;

    const savedTime = getSavedTime(movie.url);

    const sandboxAttr = 'allow-scripts allow-same-origin allow-presentation';

    const html = movie.type === 'youtube'
        ? `<iframe id="playerFrame"
                src="${movie.url}${movie.url.includes('?') ? '&' : '?'}autoplay=1${savedTime > 5 ? '&start=' + Math.floor(savedTime) : ''}"
                sandbox="${sandboxAttr}"
                allow="autoplay; encrypted-media; fullscreen"
                allowfullscreen
                referrerpolicy="no-referrer"
                loading="eager"></iframe>`
        : `<video id="playerVideo" controls autoplay playsinline><source src="${movie.url}" type="video/mp4"></video>`;

    document.getElementById('videoContainer').innerHTML = html;
    document.getElementById('playerTitle').innerText = movie.title;
    document.getElementById('playerDesc').innerText  = movie.desc || '';

    currentLikeState = false;
    currentSubState  = false;
    updateLikeButton();
    updateSubButton();
    document.getElementById('likeCount').textContent    = '0';
    document.getElementById('commentCount').textContent = '0';
    document.getElementById('commentList').innerHTML = '<div class="comment-loading">Đang tải...</div>';
    const input = document.getElementById('commentInput');
    if (input) input.value = '';
    updateCommentSectionAuth();

    updateEpisodeNav(movie);

    const video = document.getElementById('playerVideo');
    if (video) setupVideoFeatures(video, movie);

    ensurePlayerKeyboard();
    document.getElementById('playerModal').classList.add('active');
    loadPlayerSocialState(movie.url);
}

function setupVideoFeatures(video, movie) {
    const savedTime = getSavedTime(movie.url);

    video.addEventListener('loadedmetadata', () => {
        if (savedTime > 5 && video.duration && savedTime < video.duration - 5) {
            video.currentTime = savedTime;
            showToast(`▶ Tiếp tục từ ${formatTime(savedTime)}`, 'info');
        }
    });

    let lastSave = 0;
    video.addEventListener('timeupdate', () => {
        if (Math.abs(video.currentTime - lastSave) > 5) {
            lastSave = video.currentTime;
            saveVideoProgress(movie.url, video.currentTime);
        }
    });

    const savedSpeed = parseFloat(localStorage.getItem('playbackSpeed') || '1');
    if (savedSpeed !== 1) video.playbackRate = savedSpeed;
    const sel = document.getElementById('playbackSpeed');
    if (sel) sel.value = String(savedSpeed);
}

function ensurePlayerKeyboard() {
    if (playerKeyboardBound) return;
    playerKeyboardBound = true;
    document.addEventListener('keydown', handlePlayerKeydown);
}

function handlePlayerKeydown(e) {
    const modal = document.getElementById('playerModal');
    if (!modal || !modal.classList.contains('active')) return;

    const tag = (e.target.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const video = document.getElementById('playerVideo');
    if (!video) return;

    switch (e.key) {
        case ' ':
            e.preventDefault();
            video.paused ? video.play() : video.pause();
            break;
        case 'ArrowRight':
            e.preventDefault();
            video.currentTime = Math.min(video.currentTime + 5, video.duration || video.currentTime);
            showToast(`⏩ +5s`, 'info');
            break;
        case 'ArrowLeft':
            e.preventDefault();
            video.currentTime = Math.max(video.currentTime - 5, 0);
            showToast(`⏪ -5s`, 'info');
            break;
        case 'ArrowUp':
            e.preventDefault();
            video.volume = Math.min(video.volume + 0.1, 1);
            showToast(`🔊 ${Math.round(video.volume * 100)}%`, 'info');
            break;
        case 'ArrowDown':
            e.preventDefault();
            video.volume = Math.max(video.volume - 0.1, 0);
            showToast(`🔉 ${Math.round(video.volume * 100)}%`, 'info');
            break;
        case 'f': case 'F':
            e.preventDefault();
            toggleFullscreen();
            break;
        case 'm': case 'M':
            e.preventDefault();
            video.muted = !video.muted;
            showToast(video.muted ? '🔇 Tắt tiếng' : '🔊 Bật tiếng', 'info');
            break;
    }
}

function toggleFullscreen() {
    const vc = document.getElementById('videoContainer');
    if (!vc) return;
    if (!document.fullscreenElement) {
        (vc.requestFullscreen || vc.webkitRequestFullscreen || vc.msRequestFullscreen || (()=>{})).call(vc);
    } else {
        (document.exitFullscreen || document.webkitExitFullscreen || (()=>{})).call(document);
    }
}

/* =======================================================
   EPISODE NAV + SPEED
   ======================================================= */
function updateEpisodeNav(movie) {
    const prevBtn = document.getElementById('prevEpisodeBtn');
    const nextBtn = document.getElementById('nextEpisodeBtn');
    if (!prevBtn || !nextBtn) return;

    const idx = movieDatabase.findIndex(m => m.url === movie.url);
    prevBtn.disabled = idx <= 0;
    nextBtn.disabled = idx === -1 || idx >= movieDatabase.length - 1;

    prevBtn.onclick = () => {
        if (idx > 0) playMovieDirect(movieDatabase[idx - 1]);
    };
    nextBtn.onclick = () => {
        if (idx >= 0 && idx < movieDatabase.length - 1) playMovieDirect(movieDatabase[idx + 1]);
    };
}

function playMovieDirect(movie) {
    if (!movie) return;
    const video = document.getElementById('playerVideo');
    if (video && currentMovie) saveVideoProgress(currentMovie.url, video.currentTime);
    document.getElementById('videoContainer').innerHTML = '';
    saveWatchHistory(movie.title, movie.url, getThumb(movie));
    openPlayerByMovie(movie);
}

function initSpeedControl() {
    const sel = document.getElementById('playbackSpeed');
    if (!sel) return;
    sel.addEventListener('change', () => {
        const speed = parseFloat(sel.value) || 1;
        const video = document.getElementById('playerVideo');
        if (video) video.playbackRate = speed;
        localStorage.setItem('playbackSpeed', String(speed));
        showToast(`⚡ Tốc độ: ${speed}x`, 'info');
    });
}

/* =======================================================
   SOCIAL STATE
   ======================================================= */
async function loadPlayerSocialState(videoId) {
    try {
        const [likeCount, commentCount] = await Promise.all([
            sb.from('likes').select('*', { count: 'exact', head: true }).eq('video_id', videoId),
            sb.from('comments').select('*', { count: 'exact', head: true }).eq('video_id', videoId)
        ]);
        document.getElementById('likeCount').textContent    = likeCount.count || 0;
        document.getElementById('commentCount').textContent = commentCount.count || 0;

        if (currentUser) {
            const [likeRow, subRow] = await Promise.all([
                sb.from('likes').select('id').eq('video_id', videoId).eq('user_id', currentUser.id).maybeSingle(),
                sb.from('site_subscribers').select('id').eq('user_id', currentUser.id).maybeSingle()
            ]);
            currentLikeState = !!likeRow.data;
            currentSubState  = !!subRow.data;
            updateLikeButton();
            updateSubButton();
        }
        loadCommentsForVideo(videoId);
    } catch (e) {
        console.error('[loadPlayerSocialState]', e);
        document.getElementById('commentList').innerHTML = '<div class="comment-loading">Không tải được dữ liệu.</div>';
    }
}

function updateLikeButton() {
    const btn = document.getElementById('likeBtn');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (currentLikeState) {
        btn.classList.add('liked');
        if (icon) icon.className = 'fa-solid fa-heart';
    } else {
        btn.classList.remove('liked');
        if (icon) icon.className = 'fa-regular fa-heart';
    }
}

async function toggleLike() {
    if (!currentUser) {
        showToast('Vui lòng đăng nhập để thích!', 'error');
        openAuthModal();
        return;
    }
    if (!currentVideoId) return;
    try {
        if (currentLikeState) {
            await sb.from('likes').delete().eq('video_id', currentVideoId).eq('user_id', currentUser.id);
            currentLikeState = false;
        } else {
            await sb.from('likes').insert({ video_id: currentVideoId, user_id: currentUser.id });
            currentLikeState = true;
        }
        updateLikeButton();
        const { count } = await sb.from('likes')
            .select('*', { count: 'exact', head: true }).eq('video_id', currentVideoId);
        document.getElementById('likeCount').textContent = count || 0;
    } catch (e) {
        console.error(e);
        showToast('Lỗi thao tác!', 'error');
    }
}

function updateSubButton() {
    const btn = document.getElementById('subscribeBtn');
    if (!btn) return;
    if (currentSubState) {
        btn.classList.add('subscribed');
        btn.innerHTML = '<i class="fa-solid fa-bell"></i> Đã đăng ký';
    } else {
        btn.classList.remove('subscribed');
        btn.innerHTML = '<i class="fa-regular fa-bell"></i> Đăng ký kênh';
    }
}

async function toggleSubscribe() {
    if (!currentUser) {
        showToast('Vui lòng đăng nhập!', 'error');
        openAuthModal();
        return;
    }
    try {
        if (currentSubState) {
            await sb.from('site_subscribers').delete().eq('user_id', currentUser.id);
            currentSubState = false;
            showToast('Đã hủy đăng ký!', 'info');
        } else {
            await sb.from('site_subscribers').insert({ user_id: currentUser.id });
            currentSubState = true;
            showToast('✅ Đã đăng ký kênh!', 'success');
        }
        updateSubButton();
    } catch (e) {
        console.error(e);
        showToast('Lỗi thao tác!', 'error');
    }
}

function shareVideo() {
    const url = window.location.href;
    const title = currentMovie?.title || document.title;
    if (navigator.share) {
        navigator.share({ title, url }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => showToast('📋 Đã copy link!', 'success'));
    } else {
        prompt('Copy link:', url);
    }
}

/* =======================================================
   COMMENTS
   ======================================================= */
async function loadCommentsForVideo(videoId) {
    const list = document.getElementById('commentList');
    if (!list) return;
    list.innerHTML = '<div class="comment-loading">Đang tải bình luận...</div>';
    try {
        const { data, error } = await sb.from('comments')
            .select('id, content, created_at, user_id, profiles(username, avatar_url)')
            .eq('video_id', videoId)
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) throw error;
        if (!data || !data.length) {
            list.innerHTML = '<div class="comment-loading">Chưa có bình luận. Hãy là người đầu tiên! 💬</div>';
            return;
        }
        list.innerHTML = data.map(renderComment).join('');
    } catch (e) {
        console.error('[comments]', e);
        list.innerHTML = '<div class="comment-loading">Không tải được bình luận.</div>';
    }
}

function renderComment(c) {
    const p = c.profiles || {};
    const time = new Date(c.created_at).toLocaleString('vi-VN');
    const canDel = currentUser && c.user_id === currentUser.id;
    return `
        <div class="comment-item" data-id="${c.id}">
            <img class="comment-avatar"
                 src="${escapeHTML(p.avatar_url || DEFAULT_AVATAR)}"
                 onerror="this.src='${DEFAULT_AVATAR}'">
            <div class="comment-body">
                <div class="comment-head">
                    <span class="comment-name">${escapeHTML(p.username || 'Ẩn danh')}</span>
                    <span class="comment-time">${time}</span>
                    ${canDel ? `<button class="comment-del" onclick="deleteComment(${c.id})"><i class="fa-solid fa-trash"></i></button>` : ''}
                </div>
                <div class="comment-text">${escapeHTML(c.content).replace(/\n/g, '<br>')}</div>
            </div>
        </div>`;
}

async function submitComment() {
    if (!currentUser) {
        showToast('Vui lòng đăng nhập!', 'error');
        openAuthModal();
        return;
    }
    const input = document.getElementById('commentInput');
    const content = input.value.trim();
    if (!content) return;
    if (!currentVideoId) return;

    try {
        const { error } = await sb.from('comments').insert({
            user_id: currentUser.id,
            video_id: currentVideoId,
            content: content,
            video_title: currentMovie?.title || ''
        });
        if (error) throw error;
        input.value = '';
        showToast('✅ Đã gửi bình luận!', 'success');
        await loadCommentsForVideo(currentVideoId);
        const { count } = await sb.from('comments')
            .select('*', { count: 'exact', head: true }).eq('video_id', currentVideoId);
        document.getElementById('commentCount').textContent = count || 0;
    } catch (e) {
        console.error(e);
        showToast('Không gửi được bình luận!', 'error');
    }
}

async function deleteComment(id) {
    if (!confirm('Xóa bình luận này?')) return;
    try {
        await sb.from('comments').delete().eq('id', id);
        showToast('🗑 Đã xóa!', 'success');
        if (currentVideoId) {
            await loadCommentsForVideo(currentVideoId);
            const { count } = await sb.from('comments')
                .select('*', { count: 'exact', head: true }).eq('video_id', currentVideoId);
            document.getElementById('commentCount').textContent = count || 0;
        }
    } catch (e) {
        showToast('Không xóa được!', 'error');
    }
}

/* =======================================================
   SETTINGS
   ======================================================= */
function openSettingsModal() {
    if (!currentUser) {
        showToast('Vui lòng đăng nhập để đổi avatar!', 'error');
        openAuthModal();
        return;
    }
    document.getElementById('inputAvatarUrl').value = currentProfile?.avatar_url || '';

    const fileInput = document.getElementById('inputAvatarFile');
    if (fileInput) fileInput.value = '';
    const nameEl = document.getElementById('avatarFileName');
    if (nameEl) {
        nameEl.textContent = 'Chưa chọn file';
        nameEl.classList.remove('has-file');
    }

    document.getElementById('inputLogoUrl').value = localStorage.getItem('customLogo') || '';
    document.getElementById('inputBgUrl').value   = localStorage.getItem('customBg')   || '';
    document.getElementById('settingsModal').classList.add('active');
}

async function saveSettings() {
    if (!currentUser) {
        showToast('Vui lòng đăng nhập!', 'error');
        return;
    }

    const avatarInputUrl = document.getElementById('inputAvatarUrl').value.trim();
    const avatarFileEl   = document.getElementById('inputAvatarFile');
    const avatarFile     = avatarFileEl?.files[0] || null;
    const logoUrl        = document.getElementById('inputLogoUrl').value.trim();
    const bgUrl          = document.getElementById('inputBgUrl').value.trim();

    let finalAvatarUrl = avatarInputUrl || currentProfile?.avatar_url || DEFAULT_AVATAR;

    if (avatarFile) {
        try {
            showToast('Đang tải ảnh lên...', 'info');
            const ext = (avatarFile.name.split('.').pop() || 'png').toLowerCase();
            const fileName = `${currentUser.id}-${Date.now()}.${ext}`;
            const filePath = `avatars/${fileName}`;
            const { error: upErr } = await sb.storage.from('avatars')
                .upload(filePath, avatarFile, { upsert: true, cacheControl: '3600' });
            if (upErr) throw upErr;
            const { data: urlData } = sb.storage.from('avatars').getPublicUrl(filePath);
            finalAvatarUrl = urlData.publicUrl;
        } catch (err) {
            console.error(err);
            showToast('Lỗi upload: ' + (err.message || 'Bucket "avatars" chưa tồn tại?'), 'error');
            return;
        }
    }

    try {
        const { error } = await sb.from('profiles')
            .update({ avatar_url: finalAvatarUrl })
            .eq('id', currentUser.id);
        if (error) throw error;

        currentProfile = { ...currentProfile, avatar_url: finalAvatarUrl };
        const navAvatar = document.getElementById('user-avatar');
        if (navAvatar) navAvatar.src = finalAvatarUrl;
        const commentAvatar = document.getElementById('commentAvatar');
        if (commentAvatar) commentAvatar.src = finalAvatarUrl;

        if (logoUrl) {
            localStorage.setItem('customLogo', logoUrl);
            const logoImg = document.getElementById('app-logo');
            if (logoImg) logoImg.src = logoUrl;
        }
        if (bgUrl) {
            localStorage.setItem('customBg', bgUrl);
            document.body.style.backgroundImage = `url('${bgUrl}')`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundAttachment = 'fixed';
        }
        showToast('✅ Đã lưu giao diện!', 'success');
        closeModal('settingsModal');
    } catch (e) {
        console.error(e);
        showToast('Lỗi cập nhật: ' + e.message, 'error');
    }
}

function applyUserSettings() {
    const logo = localStorage.getItem('customLogo');
    if (logo) {
        const el = document.getElementById('app-logo');
        if (el) el.src = logo;
    }
    const bg = localStorage.getItem('customBg');
    if (bg) {
        document.body.style.backgroundImage = `url('${bg}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
    }
}

/* =======================================================
   FILE INPUT
   ======================================================= */
function bindFileInputs() {
    const avatarInput = document.getElementById('inputAvatarFile');
    const avatarName  = document.getElementById('avatarFileName');
    if (avatarInput && avatarName && !avatarInput.dataset.bound) {
        avatarInput.dataset.bound = '1';
        avatarInput.addEventListener('change', function () {
            const file = this.files[0];
            if (file) {
                avatarName.textContent = file.name;
                avatarName.classList.add('has-file');
            } else {
                avatarName.textContent = 'Chưa chọn file';
                avatarName.classList.remove('has-file');
            }
        });
    }

    const bgInput = document.getElementById('bgFile');
    const bgName  = document.getElementById('bgFileName');
    if (bgInput && bgName && !bgInput.dataset.bound) {
        bgInput.dataset.bound = '1';
        bgInput.addEventListener('change', function () {
            const file = this.files[0];
            if (file) {
                bgName.textContent = file.name;
                bgName.classList.add('has-file');
            } else {
                bgName.textContent = 'Chưa chọn file';
                bgName.classList.remove('has-file');
            }
        });
    }
}

/* =======================================================
   AUTH TABS
   ======================================================= */
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
    });
});

/* =======================================================
   INIT
   ======================================================= */
(async function initSocial() {
    applyUserSettings();
    bindFileInputs();
    initSpeedControl();
    await refreshUserState();

    sb.auth.onAuthStateChange(async (event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
            await refreshUserState();
        }
    });
})();

console.log('✅ social.js loaded');