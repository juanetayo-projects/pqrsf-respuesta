-- ================================================================
--  App 2 – Respuesta PQRSF  |  Clínica Santa Bárbara
--  Ejecutar en: Supabase → SQL Editor
-- ================================================================

-- ── 1. Columna de estado en reportes_pqrsf ─────────────────────
ALTER TABLE public.reportes_pqrsf
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'Recibida';

-- ── 2. Tabla principal de respuestas ───────────────────────────
CREATE TABLE IF NOT EXISTS public.respuestas_pqrsf (
  id                    SERIAL PRIMARY KEY,
  reporte_id            INTEGER NOT NULL REFERENCES public.reportes_pqrsf(id) ON DELETE CASCADE,
  numero_radicado       TEXT    NOT NULL,
  fecha_respuesta       DATE    NOT NULL,
  respuesta             TEXT    NOT NULL,
  colaborador           TEXT,
  respondido_por_nombre TEXT,
  respondido_por_email  TEXT,
  archivo_url           TEXT,
  archivo_nombre        TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. RLS en respuestas_pqrsf ─────────────────────────────────
ALTER TABLE public.respuestas_pqrsf ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario puede insertar (formulario público interno)
CREATE POLICY "resp_anon_insert"
  ON public.respuestas_pqrsf FOR INSERT TO anon
  WITH CHECK (true);

-- Usuarios autenticados pueden leer
CREATE POLICY "resp_auth_select"
  ON public.respuestas_pqrsf FOR SELECT TO authenticated
  USING (true);

-- Permisos de secuencia para anon
GRANT ALL  ON public.respuestas_pqrsf TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ── 4. RLS en reportes_pqrsf: anon puede leer (para búsqueda) ──
-- (Si ya existe esta política en supabase-schema.sql, ignorar)
DROP POLICY IF EXISTS "resp_anon_select_reportes" ON public.reportes_pqrsf;
CREATE POLICY "resp_anon_select_reportes"
  ON public.reportes_pqrsf FOR SELECT TO anon
  USING (true);

-- ── 5. Bucket adjuntos (reutiliza el de App 1) ─────────────────
-- El bucket 'pqrsf-adjuntos' ya existe; solo agregar columnas
-- si por alguna razón no se ejecutó supabase-storage.sql antes:
ALTER TABLE public.respuestas_pqrsf
  ADD COLUMN IF NOT EXISTS archivo_url    TEXT,
  ADD COLUMN IF NOT EXISTS archivo_nombre TEXT;

-- ── 6. Índices útiles ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_respuestas_reporte_id
  ON public.respuestas_pqrsf(reporte_id);

CREATE INDEX IF NOT EXISTS idx_respuestas_radicado
  ON public.respuestas_pqrsf(numero_radicado);
