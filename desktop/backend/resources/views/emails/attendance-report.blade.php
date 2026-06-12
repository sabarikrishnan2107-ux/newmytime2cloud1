<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{ $reportTypeLabel }}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;font-weight:400;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:32px 12px;">
  <tr>
    <td align="center">

      <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06),0 1px 2px rgba(15,23,42,0.04);">

        {{-- Header --}}
        <tr>
          <td style="padding:32px 36px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="top" style="font-size:20px;font-weight:400;color:#0f172a;letter-spacing:-0.2px;">
                  MyTime2Cloud
                </td>
                <td valign="top" align="right" style="font-size:13px;color:#475569;line-height:1.5;font-weight:400;">
                  <div style="color:#0f172a;">{{ $reportTypeLabel }}</div>
                  <div style="font-size:12px;color:#94a3b8;">{{ $periodValue }}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr><td style="padding:0 36px;"><div style="border-top:1px solid #e2e8f0;height:1px;line-height:1px;">&nbsp;</div></td></tr>

        {{-- Greeting --}}
        <tr>
          <td style="padding:32px 36px 20px;font-size:15px;color:#0f172a;font-weight:400;">
            Hi {{ $managerName }},
          </td>
        </tr>

        {{-- Info row --}}
        <tr>
          <td style="padding:0 36px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
              <tr>
                <td style="padding:18px 22px;width:50%;font-size:14px;color:#0f172a;font-weight:400;">
                  <span style="color:#64748b;">Company:</span>
                  <span style="color:#0f172a;">&nbsp;{{ $companyName }}</span>
                </td>
                <td style="padding:18px 22px;width:50%;font-size:14px;color:#0f172a;text-align:right;font-weight:400;">
                  <span style="color:#64748b;">{{ $periodLabel }}:</span>
                  <span style="color:#0f172a;">&nbsp;{{ $periodValue }}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        {{-- Stats tiles --}}
        @if (isset($stats) && is_array($stats))
        <tr>
          <td style="padding:0 36px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" valign="top" style="padding:18px 8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;width:25%;">
                  <div style="font-size:11px;font-weight:400;color:#15803d;letter-spacing:0.12em;text-transform:uppercase;">Present</div>
                  <div style="padding-top:8px;font-size:30px;font-weight:400;color:#15803d;line-height:1;">{{ str_pad($stats['present'] ?? 0, 2, '0', STR_PAD_LEFT) }}</div>
                </td>
                <td style="width:8px;"></td>
                <td align="center" valign="top" style="padding:18px 8px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;width:25%;">
                  <div style="font-size:11px;font-weight:400;color:#dc2626;letter-spacing:0.12em;text-transform:uppercase;">Absent</div>
                  <div style="padding-top:8px;font-size:30px;font-weight:400;color:#dc2626;line-height:1;">{{ str_pad($stats['absent'] ?? 0, 2, '0', STR_PAD_LEFT) }}</div>
                </td>
                <td style="width:8px;"></td>
                <td align="center" valign="top" style="padding:18px 8px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;width:25%;">
                  <div style="font-size:11px;font-weight:400;color:#475569;letter-spacing:0.12em;text-transform:uppercase;">Weekoff</div>
                  <div style="padding-top:8px;font-size:30px;font-weight:400;color:#475569;line-height:1;">{{ str_pad($stats['weekoff'] ?? 0, 2, '0', STR_PAD_LEFT) }}</div>
                </td>
                <td style="width:8px;"></td>
                <td align="center" valign="top" style="padding:18px 8px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;width:25%;">
                  <div style="font-size:11px;font-weight:400;color:#ea580c;letter-spacing:0.12em;text-transform:uppercase;">Missing</div>
                  <div style="padding-top:8px;font-size:30px;font-weight:400;color:#ea580c;line-height:1;">{{ str_pad($stats['missing'] ?? 0, 2, '0', STR_PAD_LEFT) }}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        @endif

        {{-- Message block --}}
        <tr>
          <td style="padding:0 36px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-left:3px solid #3b82f6;border-radius:6px;">
              <tr>
                <td style="padding:18px 22px;font-size:14px;line-height:1.65;color:#1e293b;font-weight:400;">
                  @if (!empty(trim($customMessage ?? '')))
                    {!! nl2br(e($customMessage)) !!}
                  @else
                    {{ $defaultMessage }}
                  @endif
                </td>
              </tr>
            </table>
          </td>
        </tr>

        {{-- Attachment chip(s) --}}
        @if (!empty($attachmentNames))
        <tr>
          <td style="padding:0 36px 28px;">
            @foreach ($attachmentNames as $attName)
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #cbd5e1;border-radius:9999px;margin-bottom:8px;">
                <tr>
                  <td style="padding:9px 18px;font-size:13px;color:#2563eb;font-weight:400;">
                    <span style="color:#94a3b8;font-weight:400;margin-right:6px;">📎</span>{{ $attName }}
                  </td>
                </tr>
              </table>
            @endforeach
          </td>
        </tr>
        @endif

        {{-- Sign-off --}}
        <tr>
          <td style="padding:0 36px 32px;font-size:14px;color:#0f172a;line-height:1.6;font-weight:400;">
            Regards,<br>
            MyTime2Cloud
          </td>
        </tr>

        {{-- Footer --}}
        <tr>
          <td style="background:#f8fafc;padding:22px 36px;text-align:center;font-size:12px;color:#64748b;line-height:1.6;border-top:1px solid #e2e8f0;font-weight:400;">
            This is an automated message from MyTime2Cloud Workforce Management System.<br>
            Please do not reply directly to this email.
            <div style="padding-top:14px;color:#94a3b8;">© {{ date('Y') }} MyTime2Cloud. All rights reserved.</div>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>
