/* =====================================================
   SUPABASE CONFIG
   ===================================================== */
const SUPABASE_URL      = 'https://ouwnbwazwgklzyrqsiod.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91d25id2F6d2drbHp5cnFzaW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0NTMwNjQsImV4cCI6MjEwNjAyOTA2NH0.Fv6zcMVORdPtD9QlvMZJ0PWqlyshHUViatix-wNzsPs';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
const DEFAULT_LOGO   = 'https://res.cloudinary.com/l5czhek5/image/upload/v1790481620/icon.ico';
const DEFAULT_BG     = 'https://res.cloudinary.com/l5czhek5/image/upload/v1789661167/upscalemedia-transformed.png';
const SYNTH_DOMAIN   = '@daosicuoicung.app';

console.log('✅ Supabase connected');