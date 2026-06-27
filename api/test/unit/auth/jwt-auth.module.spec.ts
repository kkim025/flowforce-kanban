import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthModule } from '../../../src/auth/jwt-auth.module';

describe('JwtAuthModule TTL (flowforce-kanban#29)', () => {
  let jwt: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtAuthModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn().mockReturnValue('test-secret-for-jwt-module-ttl-spec'),
      })
      .compile();

    jwt = module.get<JwtService>(JwtService);
  });

  it('issues tokens with an 8-hour expiry', () => {
    const token = jwt.sign({ sub: 'user-1', email: 'me@example.com' });
    const decoded = jwt.verify(token);
    const lifetimeSeconds = decoded.exp - decoded.iat;
    // Allow ±5 seconds of jitter for test execution time.
    expect(lifetimeSeconds).toBeGreaterThanOrEqual(8 * 3600 - 5);
    expect(lifetimeSeconds).toBeLessThanOrEqual(8 * 3600 + 5);
  });
});
