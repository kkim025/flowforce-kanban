import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Single source of truth for JWT registration. Re-exports `JwtModule` so that
 * any module importing `JwtAuthModule` can inject `JwtService` without
 * duplicating the secret/expiresIn config (which would create multiple
 * `JwtService` instances and let the policy drift between sites).
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        // 8h covers a normal workday without forcing re-login mid-task.
        // Flowforce-kanban#29: 15m was far too aggressive and matched no
        // realistic usage pattern. Long-term, add refresh-token rotation.
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  exports: [JwtModule],
})
export class JwtAuthModule {}
