import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'PQRSF Santa Bárbara <notificaciones@cacsantabarbara.co>';
const APP_URL        = 'https://juanetayo-projects.github.io/pqrsf-reporte/';

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TIPO_COLOR: Record<string, string> = {
  'Petición'    : '#2471c8',
  'Queja'       : '#ea580c',
  'Reclamo'     : '#dc2626',
  'Sugerencia'  : '#16a34a',
  'Felicitación': '#ca8a04',
};

function row(label: string, value: string | null | undefined): string {
  if (!value) return '';
  return `
  <tr>
    <td style="padding:9px 0;font-size:13px;font-weight:600;color:#6b7280;width:42%;
               border-bottom:1px solid #f3f4f6;vertical-align:top;">${label}</td>
    <td style="padding:9px 0 9px 14px;font-size:13px;color:#111827;
               border-bottom:1px solid #f3f4f6;vertical-align:top;">${value}</td>
  </tr>`;
}

function buildHtml(resp: Record<string, string>, rep: Record<string, string>): string {
  const radicado   = `PQRSF-${String(rep.id).padStart(6, '0')}`;
  const color      = TIPO_COLOR[rep.tipo_reporte] ?? '#1a4f9b';
  const fechaResp  = resp.fecha_respuesta
    ? new Date(resp.fecha_respuesta + 'T12:00:00').toLocaleDateString('es-CO',
        { year:'numeric', month:'long', day:'numeric' })
    : new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' });
  const fechaMan   = rep.fecha_manifestacion
    ? new Date(rep.fecha_manifestacion + 'T12:00:00').toLocaleDateString('es-CO',
        { year:'numeric', month:'long', day:'numeric' })
    : '—';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Respuesta a su ${rep.tipo_reporte} – ${radicado}</title>
</head>
<body style="margin:0;padding:24px 8px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">

  <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:14px;
              overflow:hidden;box-shadow:0 4px 28px rgba(26,79,155,.13);">

    <!-- HEADER -->
    <div style="background:linear-gradient(135deg,#0d2d6b 0%,#1a4f9b 55%,#2471c8 100%);
                padding:36px 44px;text-align:center;">
      <div style="color:rgba(255,255,255,.65);font-size:11px;letter-spacing:2px;
                  text-transform:uppercase;margin-bottom:10px;">Sistema PQRSF</div>
      <div style="color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">
        Clínica de Alta Complejidad<br>Santa Bárbara
      </div>
      <div style="color:rgba(255,255,255,.65);font-size:12px;margin-top:8px;">
        Respuesta Oficial a su Solicitud
      </div>
    </div>

    <!-- AVISO RESPUESTA -->
    <div style="text-align:center;padding:28px 44px 6px;">
      <div style="display:inline-block;background:#dcfce7;border:1px solid #86efac;
                  border-radius:10px;padding:14px 28px;">
        <div style="font-size:13px;color:#166534;font-weight:700;margin-bottom:4px;">
          ✅ Su solicitud ha sido atendida
        </div>
        <div style="font-size:12px;color:#166534;">
          Le informamos que su ${rep.tipo_reporte ?? 'PQRSF'} ha recibido respuesta oficial.
        </div>
      </div>
    </div>

    <!-- TIPO + RADICADO -->
    <div style="text-align:center;padding:20px 44px 4px;">
      <span style="display:inline-block;background:${color};color:#fff;font-size:13px;
                   font-weight:700;padding:6px 22px;border-radius:99px;letter-spacing:.5px;">
        ${rep.tipo_reporte ?? 'PQRSF'}
      </span>
    </div>
    <div style="text-align:center;padding:12px 44px 4px;">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;
                  color:#6b7280;">Número de radicado</div>
      <div style="font-size:30px;font-weight:800;color:#0d2d6b;letter-spacing:3px;
                  margin:6px 0;">${radicado}</div>
      <div style="font-size:12px;color:#9ca3af;">Fecha de respuesta: ${fechaResp}</div>
    </div>

    <div style="height:1px;background:#deeaf8;margin:20px 44px;"></div>

    <!-- RESPUESTA OFICIAL -->
    <div style="margin:0 44px 24px;background:#f0f6ff;border-left:4px solid #1a4f9b;
                border-radius:0 8px 8px 0;padding:18px 22px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;
                  color:#1a4f9b;margin-bottom:10px;">Respuesta oficial</div>
      <div style="font-size:14px;color:#374151;line-height:1.7;">${resp.respuesta ?? '—'}</div>
    </div>

    <!-- DATOS DE LA RESPUESTA -->
    <div style="padding:4px 44px 20px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;
                  color:#0d2d6b;margin-bottom:14px;">Detalles de la gestión</div>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Radicado',              radicado)}
        ${row('Tipo de solicitud',     rep.tipo_reporte)}
        ${row('Fecha manifestación',   fechaMan)}
        ${row('Fecha de respuesta',    fechaResp)}
        ${row('Proceso / Servicio',    rep.proceso)}
        ${row('Respondido por',        resp.respondido_por_nombre)}
        ${resp.colaborador ? row('Colaborador involucrado', resp.colaborador) : ''}
        ${resp.archivo_nombre ? row('Documento adjunto',
          resp.archivo_url
            ? `<a href="${resp.archivo_url}" style="color:#2471c8;">${resp.archivo_nombre}</a>`
            : resp.archivo_nombre) : ''}
      </table>
    </div>

    <!-- DATOS ORIGINALES -->
    <div style="padding:4px 44px 24px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;
                  color:#0d2d6b;margin-bottom:14px;">Su solicitud original</div>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Entidad',   rep.entidad)}
        ${row('Sede',      rep.sede)}
        ${row('Paciente',  rep.nombre_paciente)}
        ${row('Falla / Atributo', rep.falla_atributo)}
      </table>
    </div>

    <div style="margin:0 44px 28px;background:#fffbeb;border-left:4px solid #f59e0b;
                border-radius:0 8px 8px 0;padding:14px 18px;">
      <div style="font-size:12px;color:#92400e;line-height:1.6;">
        <strong>Recuerde:</strong> Si tiene alguna inquietud adicional sobre esta respuesta,
        puede radicar una nueva PQRSF o comunicarse directamente con el SIAU de la clínica.
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;padding:0 44px 36px;">
      <a href="${APP_URL}"
         style="display:inline-block;background:#1a4f9b;color:#ffffff;text-decoration:none;
                padding:12px 30px;border-radius:8px;font-size:14px;font-weight:600;">
        Radicar nueva PQRSF &rarr;
      </a>
    </div>

    <!-- FOOTER -->
    <div style="background:#0d2d6b;padding:22px 44px;text-align:center;">
      <div style="color:rgba(255,255,255,.9);font-size:13px;font-weight:600;">
        Clínica de Alta Complejidad Santa Bárbara
      </div>
      <div style="color:rgba(255,255,255,.55);font-size:12px;margin-top:4px;">
        SIAU – Sistema de Información y Atención al Usuario
      </div>
      <div style="color:rgba(255,255,255,.35);font-size:11px;margin-top:10px;">
        Este es un mensaje automático generado por el sistema PQRSF. Por favor no responder.
      </div>
    </div>

  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { respuesta, reporte } = await req.json();

    if (!reporte?.email_reporta) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Sin correo del paciente' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const radicado  = `PQRSF-${String(reporte.id).padStart(6, '0')}`;
    const subject   = `✅ Respuesta a su ${reporte.tipo_reporte ?? 'PQRSF'} – ${radicado}`;

    // Destinatarios: paciente + copia al proceso
    const destinatarios: string[] = [reporte.email_reporta];
    if (reporte.correo_proceso) {
      reporte.correo_proceso
        .split(',')
        .map((e: string) => e.trim())
        .filter(Boolean)
        .forEach((e: string) => {
          if (!destinatarios.includes(e)) destinatarios.push(e);
        });
    }
    // Copia al respondedor
    if (respuesta.respondido_por_email && !destinatarios.includes(respuesta.respondido_por_email)) {
      destinatarios.push(respuesta.respondido_por_email);
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method : 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type' : 'application/json',
      },
      body: JSON.stringify({
        from   : FROM_EMAIL,
        to     : destinatarios,
        subject,
        html   : buildHtml(respuesta, reporte),
      }),
    });

    const result = await resendRes.json();

    return new Response(
      JSON.stringify({ ok: resendRes.ok, result }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
