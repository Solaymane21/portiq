<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificación PortIQ</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

  <!-- Fondo principal (zinc-100) -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding: 48px 16px;">
    <tr>
      <td align="center">

        <!-- Card principal (bg: zinc-50, border: zinc-300) -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#fafafa; border:1px solid #d4d4d8; border-radius:16px; overflow:hidden;">

          <!-- Header con logo -->
          <tr>
            <td align="center" style="padding: 36px 40px 28px 40px; border-bottom: 1px solid #e4e4e7;">
              <!-- Logo: Texto principal en zinc-900, "IQ" en naranja -->
              <span style="font-size:26px; font-weight:700; color:#18181b; letter-spacing:-0.5px;">
                PortIQ
              </span>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding: 40px 40px 32px 40px;">

              <!-- Título (zinc-900) -->
              <p style="margin:0 0 8px 0; font-size:20px; font-weight:600; color:#18181b; line-height:1.3;">
                Verifica tu dirección de correo
              </p>
              
              <!-- Texto secundario (zinc-500), resaltado (zinc-800) -->
              <p style="margin:0 0 32px 0; font-size:14px; color:#71717a; line-height:1.6;">
                Usa el siguiente código para completar tu registro en PortIQ. El código expirará en <strong style="color:#27272a;">15 minutos</strong>.
              </p>

              <!-- Caja del Código -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Fondo de caja (zinc-100), borde sutil (zinc-200) -->
                  <td align="center" style="background-color:#f4f4f5; border:1px solid #e4e4e7; border-radius:12px; padding:24px 20px;">
                    <p style="margin:0 0 6px 0; font-size:11px; font-weight:600; color:#71717a; letter-spacing:2px; text-transform:uppercase;">
                      Código de verificación
                    </p>
                    <p style="margin:0; font-size:38px; font-weight:700; color:#18181b; letter-spacing:10px; font-family:'Courier New', monospace;">
                      {{ $code }}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Aviso de seguridad -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td>
                    <p style="margin:0; font-size:12px; line-height:1.6;">
                      Si no has solicitado esta verificación, puedes ignorar este mensaje. Tu cuenta permanece segura.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px 40px; border-top:1px solid #e4e4e7; text-align:center;">
              <p style="margin:0; font-size:11px; color:#a1a1aa;">
                Este es un mensaje automático, por favor no respondas a este correo.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>