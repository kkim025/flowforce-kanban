import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  MailTransport,
  MailMessage,
} from './transports/transport.interface';

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

export interface SendArgs {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Thin wrapper over the transport so callers don't have to know about the
// port. The service is the right place to add: bounce handling, retry-with-
// backoff, rate limiting, an outbox table for crash-safe delivery, and
// event emission (so other modules can react to "mail sent" without coupling
// to the transport). For Phase 2, none of those are needed — keep it small.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
  ) {}

  async send(args: SendArgs): Promise<void> {
    const message: MailMessage = {
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html,
    };
    try {
      await this.transport.send(message);
    } catch (err) {
      // Log the failure but don't throw — a mail-send failure must not roll
      // back the database row that triggered it. The caller can decide to
      // re-queue or alert from a later event. (For Phase 2 the caller is the
      // invite use-case; the BoardShare row is already created at that
      // point, so re-running the use-case would re-send without
      // double-creating thanks to the unique (boardId, email) constraint.)
      this.logger.error(
        `Failed to send mail to ${args.to}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
