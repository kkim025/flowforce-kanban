import { Logger } from '@nestjs/common';
import { MailMessage, MailTransport } from './transport.interface';

interface ConsoleTransportOptions {
  from: string;
}

// Dev / test transport. Logs the full message so the developer can copy the
// link out of the logs. Never throws — failures here are operational noise,
// not a real outage, so the caller (MailService) doesn't need to special-case
// dev behavior.
export class ConsoleMailTransport implements MailTransport {
  private readonly logger = new Logger(ConsoleMailTransport.name);

  constructor(private readonly options: ConsoleTransportOptions) {}

  async send(message: MailMessage): Promise<void> {
    this.logger.log(`[MAIL] from=${this.options.from} to=${message.to}`);
    this.logger.log(`[MAIL] subject=${message.subject}`);
    this.logger.log(`[MAIL] text=${message.text}`);
    // HTML is verbose; trim it for the log so a console reader can see the
    // full text body in one line. The full HTML is still in the message
    // object for any caller that wants to assert against it in tests.
    this.logger.debug(`[MAIL] html length=${message.html.length}`);
  }
}
