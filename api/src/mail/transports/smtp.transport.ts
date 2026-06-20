import { Logger } from '@nestjs/common';
// Dynamic import for nodemailer so the dev console transport doesn't pull
// the production SMTP code path at module load. Keeps dev start-up fast
// and the dep tree honest.
import type { Transporter } from 'nodemailer';
import { MailMessage, MailTransport } from './transport.interface';

interface SmtpTransportOptions {
  url: string;
  from: string;
}

// Real SMTP transport. Uses nodemailer, which is the de-facto Node.js
// library and supports SendGrid's SMTP API, AWS SES, Postmark, etc. with
// no changes — the URL encodes the right host/port/auth.
//
// The transporter is created lazily on first send so that module
// initialization never fails just because SMTP is misconfigured. A failure
// at send time is logged and surfaced through MailService.
export class SmtpMailTransport implements MailTransport {
  private readonly logger = new Logger(SmtpMailTransport.name);
  private transporter: Transporter | null = null;
  private creating: Promise<Transporter> | null = null;

  constructor(private readonly options: SmtpTransportOptions) {}

  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) return this.transporter;
    if (this.creating) return this.creating;
    this.creating = (async () => {
      const nodemailer = await import('nodemailer');
      const t = nodemailer.default.createTransport(this.options.url);
      this.transporter = t;
      return t;
    })();
    return this.creating;
  }

  async send(message: MailMessage): Promise<void> {
    const transporter = await this.getTransporter();
    await transporter.sendMail({
      from: this.options.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
