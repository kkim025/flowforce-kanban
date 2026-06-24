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
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  exports: [JwtModule],
})
export class JwtAuthModule {}
