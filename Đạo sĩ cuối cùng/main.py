# -*- coding: utf-8 -*-
"""
Đạo Sĩ Cuối Cùng — Launcher v16 (Fix Title & WinForms Icon)
"""

import atexit
import http.server
import logging
import os
import shutil
import signal
import sys
import threading
import time
from logging.handlers import RotatingFileHandler
from urllib.parse import unquote, urlparse

# ============================================================
# CONFIG
# ============================================================
APP_NAME  = "DaoSiCuoiCung"
APP_TITLE = "Đạo Sĩ Cuối Cùng" # Đã sửa lại đúng chính tả
APP_VER   = "16"
APP_ID    = "DaoSiCuoiCung.Launcher.v16"

HTTP_PORT = 0 
DEVTOOLS  = os.environ.get("DSC_DEVTOOLS") == "1"

# Fix cứng icon cho Taskbar Windows
if sys.platform == "win32":
    try:
        import ctypes
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(APP_ID)
    except Exception:
        pass

# ============================================================
# PATHS & ICON
# ============================================================
def _base_dir() -> str:
    if getattr(sys, "frozen", False):
        meipass = getattr(sys, "_MEIPASS", None)
        if meipass:
            return meipass
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

def _find_web_dir() -> str:
    here = _base_dir()
    cands = []
    if getattr(sys, "frozen", False):
        exe_dir = os.path.dirname(sys.executable)
        cands += [exe_dir, here, os.path.join(exe_dir, "web")]
    else:
        cands += [here, os.path.join(here, "web")]
        
    for c in cands:
        if os.path.isdir(c) and os.path.isfile(os.path.join(c, "index.html")):
            return c
    return here

def _find_icon() -> str:
    here = _base_dir()
    if hasattr(sys, '_MEIPASS'):
        p = os.path.join(sys._MEIPASS, "icon.ico")
        if os.path.exists(p): return p
    p = os.path.join(here, "icon.ico")
    if os.path.exists(p): return p
    return None

WEB_DIR = _find_web_dir()
ICON_PATH = _find_icon()

_APP_DATA_ROOT = os.environ.get("LOCALAPPDATA") or os.path.expanduser("~")
APP_DATA_DIR = os.path.join(_APP_DATA_ROOT, APP_NAME)
STORAGE_DIR  = os.path.join(APP_DATA_DIR, "webview_data")
MARKER_FILE  = os.path.join(APP_DATA_DIR, ".storage_migrated_v1")
LOG_FILE     = os.path.join(APP_DATA_DIR, "app.log")
LOCK_FILE    = os.path.join(APP_DATA_DIR, ".app.lock")

try: os.makedirs(APP_DATA_DIR, exist_ok=True)
except Exception: pass

# ============================================================
# LOGGING
# ============================================================
_logger = logging.getLogger(APP_NAME)
_logger.setLevel(logging.INFO)
_logger.propagate = False
if not _logger.handlers:
    try:
        _fh = RotatingFileHandler(LOG_FILE, maxBytes=2*1024*1024, backupCount=3, encoding="utf-8")
        _fh.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
        _logger.addHandler(_fh)
    except Exception: pass

def log(msg, level="info"):
    try: getattr(_logger, level, _logger.info)(str(msg))
    except Exception: pass

def _show_error(title, message):
    try:
        import ctypes
        ctypes.windll.user32.MessageBoxW(0, message, title, 0x10 | 0x40000)
        return
    except Exception: pass

# ============================================================
# MIGRATION (Data)
# ============================================================
def migrate_webview_storage_if_needed():
    if os.path.exists(MARKER_FILE): return
    old_candidates = []
    if sys.platform == "win32":
        lad = os.environ.get("LOCALAPPDATA", "")
        if lad:
            try: exe_name = os.path.splitext(os.path.basename(sys.executable))[0]
            except Exception: exe_name = APP_NAME
            old_candidates = [
                os.path.join(lad, exe_name, "EBWebView"),
                os.path.join(lad, APP_NAME, "EBWebView"),
                os.path.join(lad, "pywebview"),
            ]
    migrated_from = None
    for old in old_candidates:
        if old == STORAGE_DIR: continue
        try:
            if not os.path.isdir(old) or not os.listdir(old): continue
        except Exception: continue
        tmp_path = STORAGE_DIR + ".tmp"
        try:
            os.makedirs(os.path.dirname(STORAGE_DIR), exist_ok=True)
            if os.path.isdir(tmp_path): shutil.rmtree(tmp_path, ignore_errors=True)
            shutil.copytree(old, tmp_path)
            if os.path.isdir(STORAGE_DIR): shutil.rmtree(STORAGE_DIR, ignore_errors=True)
            os.replace(tmp_path, STORAGE_DIR)
            migrated_from = old
            break
        except Exception as e:
            log(f"Migration failed: {e}", "warning")
            return
    try:
        with open(MARKER_FILE, "w", encoding="utf-8") as f:
            f.write(f"ok {time.time()} from={migrated_from or 'none'}\n")
    except Exception: pass

# ============================================================
# HTTP SERVER
# ============================================================
class _Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args): log(f"HTTP — {fmt % args}", "debug")
    def end_headers(self):
        try: path = unquote(urlparse(self.path).path or "/")
        except Exception: path = "/"
        if path in ("/", "") or path.endswith(".html"):
            self.send_header("Cache-Control", "no-store, must-revalidate")
        else:
            self.send_header("Cache-Control", "public, max-age=3600")
        super().end_headers()

def _start_http_server():
    handler = lambda *a, **kw: _Handler(*a, directory=WEB_DIR, **kw)
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", HTTP_PORT), handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, name="http-server", daemon=True).start()
    return httpd, port

# ============================================================
# SINGLE INSTANCE
# ============================================================
def _acquire_lock():
    try: fh = open(LOCK_FILE, "a+")
    except Exception: return None
    try:
        if sys.platform == "win32":
            import msvcrt
            fh.seek(0)
            msvcrt.locking(fh.fileno(), msvcrt.LK_NBLCK, 1)
            return fh
        import fcntl
        fcntl.flock(fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        return fh
    except OSError:
        try: fh.close()
        except Exception: pass
        return False
    except Exception:
        try: fh.close()
        except Exception: pass
        return None

# ============================================================
# CLEANUP & ICON SETTER
# ============================================================
def _safe_shutdown(holder):
    h = holder.get("httpd")
    if not h: return
    try: h.shutdown(); h.server_close()
    except Exception: pass
    holder["httpd"] = None

def _install_signals(holder):
    def _h(signum, _):
        _safe_shutdown(holder)
        sys.exit(0)
    for sig in (getattr(signal, "SIGINT", None), getattr(signal, "SIGTERM", None)):
        if sig is None: continue
        try: signal.signal(sig, _h)
        except Exception: pass

def _set_window_icon(window, icon_path):
    """Dùng WinForms (pythonnet) để ép đổi icon cửa sổ trên Windows"""
    if sys.platform != "win32" or not icon_path:
        return
    
    time.sleep(0.5) # Chờ cửa sổ khởi tạo xong
    try:
        import clr
        clr.AddReference("System.Drawing")
        import System.Drawing
        # window.gui.window là đối tượng Form của WinForms
        if hasattr(window, 'gui') and hasattr(window.gui, 'window'):
            window.gui.window.Icon = System.Drawing.Icon(icon_path)
            log("Đã set icon WinForms thành công")
    except Exception as e:
        log(f"Lỗi set icon WinForms: {e}", "warning")

# ============================================================
# MAIN
# ============================================================
def main() -> int:
    log("=" * 64)
    log(f"{APP_TITLE} — v{APP_VER} | WEB_DIR={WEB_DIR} | ICON={ICON_PATH}")
    
    if not os.path.isdir(WEB_DIR) or not os.path.isfile(os.path.join(WEB_DIR, "index.html")):
        _show_error(APP_TITLE, f"Không tìm thấy 'index.html'.\nĐường dẫn: {WEB_DIR}")
        return 1

    lock = _acquire_lock()
    if lock is False:
        _show_error(APP_TITLE, "Ứng dụng đang chạy sẵn.")
        return 0

    try: migrate_webview_storage_if_needed()
    except Exception: pass

    try: httpd, port = _start_http_server()
    except Exception as e:
        _show_error(APP_TITLE, f"Lỗi HTTP Server:\n{e}")
        return 1

    holder = {"httpd": httpd}
    _install_signals(holder)
    atexit.register(lambda: _safe_shutdown(holder))

    try:
        import webview
    except ImportError:
        _show_error(APP_TITLE, "Thiếu pywebview.\n\nMở CMD gõ: pip install pywebview")
        _safe_shutdown(holder)
        return 1

    url = f"http://127.0.0.1:{port}/index.html"

    try:
        window = webview.create_window(
            title=APP_TITLE, 
            url=url,
            width=1280, height=800, min_size=(800, 600),
            resizable=True, confirm_close=False, text_select=True
        )
        
        webview.start(
            gui="edgechromium", 
            debug=DEVTOOLS, 
            private_mode=False, 
            storage_path=STORAGE_DIR,
            func=_set_window_icon,
            args=(window, ICON_PATH)
        )
            
    except Exception as e:
        _show_error(APP_TITLE, f"Lỗi WebView:\n{e}\n\nCài WebView2 Runtime nếu thiếu.")
        return 1
    finally:
        _safe_shutdown(holder)
        if lock:
            try: lock.close()
            except Exception: pass

    return 0

if __name__ == "__main__":
    try: sys.exit(main())
    except SystemExit: raise
    except Exception as e:
        log(f"Unhandled: {e}", "critical")
        _show_error(APP_TITLE, f"Lỗi: {e}")
        sys.exit(1)