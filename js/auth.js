/* ================================================================
   Auth – Respuesta PQRSF  |  Clínica Santa Bárbara
================================================================ */

/* ── Supabase client ─────────────────────────────────────────── */
const SUPABASE_URL = 'https://cdarbygwhtwkdgkelktw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hBoCRcO2ozNu8l9lcRSTOw_NHWUZ-Qb';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── Login ──────────────────────────────────────────────────── */
async function doLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pwd   = document.getElementById('loginPwd').value;
  const btn   = document.getElementById('btnLogin');
  const errEl = document.getElementById('loginError');

  errEl.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando…';

  const { error } = await db.auth.signInWithPassword({ email, password: pwd });

  if (error) {
    errEl.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> ' +
      (error.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos.'
        : error.message);
    errEl.style.display = 'flex';
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Iniciar sesión';
    return;
  }
  window.location.href = 'respuesta.html';
}

function togglePwd() {
  const input = document.getElementById('loginPwd');
  const icon  = document.getElementById('pwdIcon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fa-solid fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fa-solid fa-eye';
  }
}

/* ── Guard: redirige a login si no hay sesión ───────────────── */
async function requireAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}

/* ── Perfil del usuario desde consola_perfiles ──────────────── */
async function loadUserProfile() {
  /* Intenta con RPC SECURITY DEFINER (bypass RLS) */
  try {
    const { data, error } = await db.rpc('get_my_console_profile');
    if (!error && data) {
      // Supabase puede devolver objeto o array de un elemento
      return Array.isArray(data) ? (data[0] ?? null) : data;
    }
  } catch (_) {}

  /* Fallback: query directa */
  try {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return null;
    const { data } = await db
      .from('consola_perfiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    return data || null;
  } catch (_) {
    return null;
  }
}

/* ── Logout ─────────────────────────────────────────────────── */
async function doLogout() {
  await db.auth.signOut();
  window.location.href = 'index.html';
}

/* ── Auto-check: si ya hay sesión activa en login → redirigir ── */
if (document.getElementById('loginForm')) {
  db.auth.getSession().then(({ data: { session } }) => {
    if (session) window.location.href = 'respuesta.html';
  });
}
