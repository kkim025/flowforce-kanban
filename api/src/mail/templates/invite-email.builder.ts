import { Injectable } from '@nestjs/common';

export interface InviteEmailParams {
  inviterName: string;
  boardName: string;
  permissionLabel: 'view' | 'edit';
  acceptUrl: string;
  declineUrl: string;
  expiresAt: Date;
}

// Renders the invite email — both plain text and HTML. Keeping the template
// in code (instead of a .hbs / .ejs file) means:
//   1. No template engine dependency, no extra build step.
//   2. Easy to test (call build() and assert on the strings).
//   3. No risk of the deployed container missing a template file.
//
// The HTML is intentionally small, inline-CSS, and table-based — works in
// every mail client including Outlook desktop. The plain text is what the
// Gmail "view as text" fallback shows.
@Injectable()
export class InviteEmailBuilder {
  build(params: InviteEmailParams): {
    subject: string;
    text: string;
    html: string;
  } {
    const subject = `${params.inviterName} invited you to ${params.permissionLabel === 'edit' ? 'edit' : 'view'} ${params.boardName} on FlowForce`;
    const text = this.renderText(params);
    const html = this.renderHtml(params);
    return { subject, text, html };
  }

  private renderText(p: InviteEmailParams): string {
    return [
      `${p.inviterName} invited you to ${p.permissionLabel} the board "${p.boardName}" on FlowForce.`,
      '',
      `Accept: ${p.acceptUrl}`,
      `Decline: ${p.declineUrl}`,
      '',
      `This invite expires on ${p.expiresAt.toUTCString()}.`,
      '',
      'If you did not expect this invite, you can safely ignore this email.',
    ].join('\n');
  }

  private renderHtml(p: InviteEmailParams): string {
    // Keep the formatting minimal — no external assets, no JS, no tracking
    // pixels. The two CTAs are the only call to action.
    const action = p.permissionLabel;
    return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f7f9;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="480" style="background:#ffffff;border-radius:12px;padding:32px;">
            <tr>
              <td>
                <h1 style="margin:0 0 16px 0;font-size:20px;line-height:1.3;">${escapeHtml(p.inviterName)} invited you to ${action} ${escapeHtml(p.boardName)}</h1>
                <p style="margin:0 0 24px 0;font-size:14px;line-height:1.5;color:#4b5563;">
                  You've been invited to ${action} a board on FlowForce. The invite expires on
                  <strong>${escapeHtml(p.expiresAt.toUTCString())}</strong>.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td align="left" style="padding-right:8px;">
                      <a href="${escapeAttr(p.acceptUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px;">Accept invite</a>
                    </td>
                    <td align="left" style="padding-left:8px;">
                      <a href="${escapeAttr(p.declineUrl)}" style="display:inline-block;background:#ffffff;color:#1a1a1a;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px;border:1px solid #d1d5db;">Decline</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#6b7280;">
                  Or copy and paste this link into your browser:<br />
                  <a href="${escapeAttr(p.acceptUrl)}" style="color:#2563eb;word-break:break-all;">${escapeHtml(p.acceptUrl)}</a>
                </p>
                <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#6b7280;">
                  If you did not expect this invite, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
