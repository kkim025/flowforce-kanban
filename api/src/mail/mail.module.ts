import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService, MAIL_TRANSPORT } from './mail.service';
import { ConsoleMailTransport } from './transports/console.transport';
import { SmtpMailTransport } from './transports/smtp.transport';
import { InviteEmailBuilder } from './templates/invite-email.builder';

// Why this is @Global: nearly every module that sends transactional mail
// (invites, password reset, etc.) needs the MailService. Forcing each consumer
// to re-import the module adds noise and creates dependency cycles when a
// module is both a producer and a consumer of mail.
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    InviteEmailBuilder,
    {
      // Pick the transport based on env. NODE_ENV !== 'production' and no
      // explicit SMTP_URL falls back to the console transport, which logs
      // the message and pretends the send succeeded. This keeps dev / test
      // runs hermetic — no real emails get sent, no test suites need a
      // mock SMTP server.
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('MailModule');
        const smtpUrl = config.get<string>('SMTP_URL');
        if (smtpUrl) {
          logger.log('Using SMTP mail transport');
          return new SmtpMailTransport({
            url: smtpUrl,
            from:
              config.get<string>('MAIL_FROM') ??
              'FlowForce <noreply@flowforce.app>',
          });
        }
        logger.log(
          'No SMTP_URL configured — falling back to console mail transport',
        );
        return new ConsoleMailTransport({
          from:
            config.get<string>('MAIL_FROM') ??
            'FlowForce <noreply@flowforce.app>',
        });
      },
    },
    MailService,
  ],
  exports: [MailService, InviteEmailBuilder],
})
export class MailModule {}
