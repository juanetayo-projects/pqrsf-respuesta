/* ================================================================
   App 2 – Respuesta PQRSF
   Clínica de Alta Complejidad Santa Bárbara
================================================================ */

/* ── Supabase ───────────────────────────────────────────────── */
const SUPABASE_URL = 'https://cdarbygwhtwkdgkelktw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hBoCRcO2ozNu8l9lcRSTOw_NHWUZ-Qb';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── Estado global ──────────────────────────────────────────── */
let currentStep     = 1;
const TOTAL_STEPS   = 4;   // pasos visibles (5 = éxito)
let reporteActual   = null; // datos del reporte encontrado
let selectedFile    = null;

/* ── Colores y config por tipo ──────────────────────────────── */
const TIPO_CONFIG = {
  'Petición'    : { color: '#2471c8', bg: '#eff6ff', icon: 'fa-file-lines' },
  'Queja'       : { color: '#ea580c', bg: '#fff7ed', icon: 'fa-triangle-exclamation' },
  'Reclamo'     : { color: '#dc2626', bg: '#fef2f2', icon: 'fa-gavel' },
  'Sugerencia'  : { color: '#16a34a', bg: '#f0fdf4', icon: 'fa-lightbulb' },
  'Felicitación': { color: '#ca8a04', bg: '#fefce8', icon: 'fa-star' },
};

/* ── Etapas Odoo-style ──────────────────────────────────────── */
const ETAPAS = ['Recibida', 'En gestión', 'Respondida', 'Cerrada'];

/* ════════════════════════════════════════════════════════════
   NAVEGACIÓN
════════════════════════════════════════════════════════════ */
function startForm() {
  document.getElementById('hero').style.display = 'none';
  const fs = document.getElementById('formSection');
  fs.style.display = 'block';
  currentStep = 1;
  setDateDefaults();
  renderStepIndicator();
  updateProgress();
  showStep(1);
}

function goHero() {
  document.getElementById('formSection').style.display = 'none';
  document.getElementById('hero').style.display = 'block';
}

function showStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('step' + n);
  if (el) el.classList.add('active');
}

function nextStep(from) {
  clearError(from);
  if (!validateStep(from)) return;
  if (from === 3) buildSummary();
  currentStep = from + 1;
  showStep(currentStep);
  updateProgress();
  renderStepIndicator();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevStep(from) {
  clearError(from);
  currentStep = from - 1;
  showStep(currentStep);
  updateProgress();
  renderStepIndicator();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress() {
  const pct = Math.round((currentStep / TOTAL_STEPS) * 100);
  document.getElementById('progressBar').style.width = pct + '%';
}

function renderStepIndicator() {
  const labels = [
    { icon: 'fa-magnifying-glass', label: 'Radicado'  },
    { icon: 'fa-pen-to-square',    label: 'Respuesta' },
    { icon: 'fa-paperclip',        label: 'Adjunto'   },
    { icon: 'fa-check-double',     label: 'Resumen'   },
  ];
  const wrap = document.getElementById('stepIndicator');
  wrap.innerHTML = labels.map((s, i) => {
    const n = i + 1;
    const cls = n < currentStep ? 'done' : n === currentStep ? 'active' : '';
    const icon = n < currentStep ? 'fa-circle-check' : s.icon;
    return `<div class="step-dot ${cls}"><i class="fa-solid ${icon}"></i>${s.label}</div>`;
  }).join('<span style="color:#e5e7eb;font-size:10px;margin:0 2px;">›</span>');
}

/* ════════════════════════════════════════════════════════════
   STEP 1 – BÚSQUEDA DE RADICADO
════════════════════════════════════════════════════════════ */
async function buscarRadicado() {
  const raw    = document.getElementById('inputRadicado').value.trim();
  const cardWrap = document.getElementById('pqrsfCardWrap');
  const notFound = document.getElementById('notFoundState');
  const btnNext  = document.getElementById('btnStep1Next');

  if (!raw) { showError(1, 'Ingrese el número de radicado.'); return; }
  clearError(1);

  // Extraer número: acepta "PQRSF-000001", "000001" o "1"
  const match = raw.match(/(\d+)$/);
  if (!match) { showError(1, 'Formato inválido. Use: PQRSF-000001 o simplemente el número.'); return; }
  const id = parseInt(match[1], 10);

  showLoading('Buscando radicado…');
  cardWrap.style.display = 'none';
  notFound.style.display = 'none';
  btnNext.style.display = 'none';
  reporteActual = null;

  const { data, error } = await db
    .from('reportes_pqrsf')
    .select('*')
    .eq('id', id)
    .single();

  hideLoading();

  if (error || !data) {
    notFound.style.display = 'block';
    return;
  }

  reporteActual = data;
  cardWrap.innerHTML = buildPqrsfCard(data);
  cardWrap.style.display = 'block';
  btnNext.style.display = 'inline-flex';

  // Actualizar mini-card del step 2
  renderMiniCard(data);
}

/* ── Tarjeta Odoo-style del PQRSF ───────────────────────────── */
function buildPqrsfCard(r) {
  const radicado = `PQRSF-${String(r.id).padStart(6, '0')}`;
  const cfg      = TIPO_CONFIG[r.tipo_reporte] ?? { color: '#1a4f9b', bg: '#f0f6ff', icon: 'fa-file' };
  const estado   = r.estado ?? 'Recibida';
  const etapaIdx = ETAPAS.indexOf(estado);

  const stagesHtml = ETAPAS.map((e, i) => {
    const cls = i < etapaIdx ? 'done' : i === etapaIdx ? 'current' : '';
    const icon = i < etapaIdx ? '<i class="fa-solid fa-check" style="margin-right:4px"></i>' : '';
    return `<div class="status-stage ${cls}">${icon}${e}</div>`;
  }).join('');

  const fechaMan = r.fecha_manifestacion
    ? new Date(r.fecha_manifestacion + 'T12:00:00').toLocaleDateString('es-CO',
        { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return `
  <div class="pqrsf-card">
    <div class="pqrsf-card-header">
      <span class="card-radicado">${radicado}</span>
      <div class="card-badges">
        <span class="badge-tipo" style="background:${cfg.color}">
          <i class="fa-solid ${cfg.icon}" style="margin-right:5px"></i>${r.tipo_reporte ?? '—'}
        </span>
        <span class="badge-estado">${estado}</span>
      </div>
    </div>

    <div class="status-bar">${stagesHtml}</div>

    <div class="pqrsf-card-body">
      <div class="record-section-title"><i class="fa-solid fa-building-shield" style="margin-right:6px"></i>Información institucional</div>
      <div class="record-grid">
        ${field('Entidad',           r.entidad)}
        ${field('Sede',              r.sede)}
        ${field('Proceso / Servicio',r.proceso)}
        ${field('Fuente',            r.fuente)}
        ${field('Fecha manifestación', fechaMan)}
        ${field('Estado actual',     estado)}
      </div>

      <div class="record-section-title" style="margin-top:16px"><i class="fa-solid fa-user" style="margin-right:6px"></i>Datos del usuario</div>
      <div class="record-grid">
        ${field('Paciente',          r.nombre_paciente)}
        ${field('Identificación',    r.numero_identificacion)}
        ${field('Teléfono',          r.telefono)}
        ${field('Tipo usuario',      r.tipo_usuario)}
        ${field('Convenio / EPS',    r.convenio_eps)}
        ${field('Régimen',           r.regimen)}
        ${fieldFull('Correo notificación', r.email_reporta || '<span class="empty">No registrado</span>')}
      </div>

      <div class="record-section-title" style="margin-top:16px"><i class="fa-solid fa-pen-clip" style="margin-right:6px"></i>Descripción del caso</div>
      <div class="record-grid">
        ${field('Falla / Atributo',  r.falla_atributo)}
        ${field('Especialidad',      r.especialidad)}
        ${field('Colaborador',       r.colaborador)}
      </div>
      ${r.descripcion ? `
      <div class="record-description" style="margin-top:12px">
        <div class="record-label">Descripción completa</div>
        <div class="record-value">${escHtml(r.descripcion)}</div>
      </div>` : ''}
    </div>
  </div>`;
}

function field(label, value) {
  const v = value ?? '';
  return `<div class="record-field">
    <div class="record-label">${label}</div>
    <div class="record-value ${v ? '' : 'empty'}">${v || '—'}</div>
  </div>`;
}
function fieldFull(label, value) {
  const v = value ?? '';
  return `<div class="record-field full">
    <div class="record-label">${label}</div>
    <div class="record-value">${v || '—'}</div>
  </div>`;
}

function renderMiniCard(r) {
  const radicado = `PQRSF-${String(r.id).padStart(6, '0')}`;
  const cfg = TIPO_CONFIG[r.tipo_reporte] ?? { color: '#1a4f9b' };
  document.getElementById('miniCard').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;
                background:#f0f6ff;border:1.5px solid #deeaf8;border-radius:10px;">
      <span style="font-size:18px;font-weight:800;color:#0d2d6b;letter-spacing:2px;">${radicado}</span>
      <span style="background:${cfg.color};color:#fff;font-size:12px;font-weight:700;
                   padding:4px 12px;border-radius:99px;">${r.tipo_reporte ?? ''}</span>
      <span style="font-size:13px;color:#6b7280;margin-left:auto;">${r.nombre_paciente ?? ''}</span>
    </div>`;
}

/* ════════════════════════════════════════════════════════════
   VALIDACIÓN
════════════════════════════════════════════════════════════ */
function validateStep(n) {
  if (n === 1) {
    if (!reporteActual) { showError(1, 'Primero busque un radicado válido.'); return false; }
    return true;
  }
  if (n === 2) {
    if (!v('fecha_respuesta'))    { showError(2, 'La fecha de respuesta es obligatoria.'); return false; }
    if (!v('respondido_por_nombre').trim()) { showError(2, 'Ingrese el nombre del responsable.'); return false; }
    if (!v('respuesta_texto').trim())       { showError(2, 'La respuesta oficial es obligatoria.'); return false; }
    return true;
  }
  return true;
}

/* ════════════════════════════════════════════════════════════
   RESUMEN
════════════════════════════════════════════════════════════ */
function buildSummary() {
  const radicado = `PQRSF-${String(reporteActual.id).padStart(6, '0')}`;
  const fecha = v('fecha_respuesta')
    ? new Date(v('fecha_respuesta') + 'T12:00:00').toLocaleDateString('es-CO',
        { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const rows = [
    ['fa-hashtag',       'Radicado',              radicado],
    ['fa-tag',           'Tipo de solicitud',      reporteActual.tipo_reporte],
    ['fa-user',          'Paciente',               reporteActual.nombre_paciente],
    ['fa-envelope',      'Correo paciente',        reporteActual.email_reporta || 'No registrado'],
    ['fa-calendar-check','Fecha de respuesta',     fecha],
    ['fa-user-tie',      'Respondido por',         v('respondido_por_nombre')],
    ['fa-envelope-open', 'Correo responsable',     v('respondido_por_email') || '—'],
    ['fa-user-nurse',    'Colaborador involucrado',v('colaborador') || '—'],
  ];

  let html = rows.map(([icon, label, val]) => `
    <div class="summary-label"><i class="fa-solid ${icon}"></i>${label}</div>
    <div class="summary-value">${escHtml(val ?? '—')}</div>
  `).join('');

  if (selectedFile) {
    html += `
      <div class="summary-label"><i class="fa-solid fa-paperclip"></i>Archivo adjunto</div>
      <div class="summary-value">${escHtml(selectedFile.name)} (${formatSize(selectedFile.size)})</div>`;
  }

  html += `
    <div class="summary-label" style="align-items:flex-start;padding-top:12px;">
      <i class="fa-solid fa-pen-to-square"></i>Respuesta oficial
    </div>
    <div class="summary-value full-row">${escHtml(v('respuesta_texto'))}</div>`;

  document.getElementById('summaryContent').innerHTML = html;
}

/* ════════════════════════════════════════════════════════════
   SUBMIT
════════════════════════════════════════════════════════════ */
async function submitRespuesta() {
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';
  clearError(4);

  try {
    showLoading('Guardando respuesta…');

    // 1. Subir archivo si existe
    let archivo_url = null, archivo_nombre = null;
    if (selectedFile) {
      showLoading('Subiendo documento…');
      const up = await uploadFile(selectedFile);
      if (up) { archivo_url = up.url; archivo_nombre = up.nombre; }
    }

    const radicado = `PQRSF-${String(reporteActual.id).padStart(6, '0')}`;

    // 2. Insertar respuesta en DB
    showLoading('Registrando respuesta…');
    const payload = {
      reporte_id           : reporteActual.id,
      numero_radicado      : radicado,
      fecha_respuesta      : v('fecha_respuesta'),
      respuesta            : v('respuesta_texto'),
      colaborador          : v('colaborador') || null,
      respondido_por_nombre: v('respondido_por_nombre'),
      respondido_por_email : v('respondido_por_email') || null,
      archivo_url,
      archivo_nombre,
    };

    const { data: respData, error: respError } = await db
      .from('respuestas_pqrsf')
      .insert([payload])
      .select()
      .single();

    if (respError) throw respError;

    // 3. Actualizar estado del reporte
    await db
      .from('reportes_pqrsf')
      .update({ estado: 'Respondida' })
      .eq('id', reporteActual.id);

    // 4. Enviar notificación por correo
    hideLoading();
    let emailNote = '';
    if (reporteActual.email_reporta) {
      showLoading('Enviando notificación…');
      try {
        const { error: fnErr } = await db.functions.invoke('notify-respuesta', {
          body: {
            respuesta: { ...payload, id: respData.id },
            reporte  : { ...reporteActual },
          },
        });
        if (!fnErr) {
          emailNote = `📧 Notificación enviada a <strong>${reporteActual.email_reporta}</strong>`;
        } else {
          emailNote = '⚠️ Respuesta guardada. El correo no pudo enviarse (reintente desde Supabase).';
        }
      } catch (_) {
        emailNote = '⚠️ Respuesta guardada. El correo no pudo enviarse.';
      }
    } else {
      emailNote = '⚠️ El usuario no tiene correo registrado. Respuesta guardada sin notificación.';
    }

    hideLoading();

    // 5. Mostrar éxito
    document.getElementById('ticketNumber').textContent = radicado;
    document.getElementById('emailSentNote').innerHTML = emailNote;
    currentStep = 5;
    showStep(5);
    updateProgress();
    renderStepIndicator();
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (err) {
    hideLoading();
    showError(4, 'Error al guardar: ' + (err.message ?? String(err)));
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Registrar y Notificar';
  }
}

/* ════════════════════════════════════════════════════════════
   ARCHIVO ADJUNTO
════════════════════════════════════════════════════════════ */
function handleFileSelect(input) {
  const file = input.files?.[0];
  if (!file) return;
  validateAndSetFile(file);
}
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('fileDrop').classList.add('drag-over');
}
function handleDragLeave(e) {
  document.getElementById('fileDrop').classList.remove('drag-over');
}
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('fileDrop').classList.remove('drag-over');
  const file = e.dataTransfer?.files?.[0];
  if (file) validateAndSetFile(file);
}
function validateAndSetFile(file) {
  const allowed = ['application/pdf','text/plain','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png','image/jpeg'];
  if (!allowed.includes(file.type)) {
    showError(3, 'Tipo de archivo no permitido. Use PDF, DOC, DOCX, TXT, PNG o JPG.'); return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showError(3, 'El archivo supera los 10 MB.'); return;
  }
  clearError(3);
  selectedFile = file;
  document.getElementById('filePreviewName').textContent = file.name;
  document.getElementById('filePreviewSize').textContent = formatSize(file.size);
  document.getElementById('filePreview').style.display = 'flex';
  document.getElementById('fileDrop').style.display    = 'none';
}
function removeFile() {
  selectedFile = null;
  document.getElementById('archivoAdjunto').value = '';
  document.getElementById('filePreview').style.display = 'none';
  document.getElementById('fileDrop').style.display    = 'flex';
}
async function uploadFile(file) {
  try {
    const ext  = file.name.split('.').pop();
    const name = `resp_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await db.storage
      .from('pqrsf-adjuntos')
      .upload(name, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data: { publicUrl } } = db.storage.from('pqrsf-adjuntos').getPublicUrl(name);
    return { url: publicUrl, nombre: file.name };
  } catch (err) {
    console.warn('Upload error:', err);
    return null;
  }
}

/* ════════════════════════════════════════════════════════════
   RESET
════════════════════════════════════════════════════════════ */
function resetForm() {
  reporteActual = null;
  selectedFile  = null;
  document.getElementById('inputRadicado').value    = '';
  document.getElementById('pqrsfCardWrap').style.display = 'none';
  document.getElementById('notFoundState').style.display = 'none';
  document.getElementById('btnStep1Next').style.display  = 'none';
  document.getElementById('pqrsfCardWrap').innerHTML     = '';
  document.getElementById('fecha_respuesta').value       = '';
  document.getElementById('respondido_por_nombre').value = '';
  document.getElementById('respondido_por_email').value  = '';
  document.getElementById('respuesta_texto').value       = '';
  document.getElementById('colaborador').value           = '';
  document.getElementById('charCount').textContent       = '0';
  document.getElementById('filePreview').style.display   = 'none';
  document.getElementById('fileDrop').style.display      = 'flex';
  document.getElementById('archivoAdjunto').value        = '';
  document.getElementById('submitBtn').disabled          = false;
  document.getElementById('submitBtn').innerHTML =
    '<i class="fa-solid fa-paper-plane"></i> Registrar y Notificar';
  setDateDefaults();
  currentStep = 1;
  showStep(1);
  updateProgress();
  renderStepIndicator();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ════════════════════════════════════════════════════════════
   UTILIDADES
════════════════════════════════════════════════════════════ */
function v(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}
function showError(step, msg) {
  const el = document.getElementById('err' + step);
  if (!el) return;
  el.textContent = '⚠️  ' + msg;
  el.classList.add('visible');
}
function clearError(step) {
  const el = document.getElementById('err' + step);
  if (el) { el.textContent = ''; el.classList.remove('visible'); }
}
function showLoading(msg) {
  document.getElementById('loadingMsg').textContent = msg || 'Procesando…';
  document.getElementById('loadingOverlay').classList.add('visible');
}
function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('visible');
}
function formatSize(bytes) {
  if (bytes < 1024)       return bytes + ' B';
  if (bytes < 1024*1024)  return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1024/1024).toFixed(1) + ' MB';
}
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function updateCharCount() {
  const len = document.getElementById('respuesta_texto').value.length;
  const el  = document.getElementById('charCount');
  el.textContent = len;
  el.parentElement.classList.toggle('warn', len > 1800);
}
function setDateDefaults() {
  const hoy = new Date().toISOString().split('T')[0];
  const el  = document.getElementById('fecha_respuesta');
  if (el) el.value = hoy;
}

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderStepIndicator();
  updateProgress();
});
