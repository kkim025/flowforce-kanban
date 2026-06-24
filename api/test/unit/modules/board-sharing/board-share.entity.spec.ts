import {
  BoardShare,
  PermissionLevel,
  BoardShareStatus,
} from 'src/modules/board-sharing/domain/board-share.entity';

const NOW = new Date();
const FUTURE = new Date(Date.now() + 86400000);
const PAST = new Date(Date.now() - 1000);

function createShare(
  overrides: Partial<{
    boardId: string;
    email: string;
    permissionLevel: PermissionLevel;
    status: BoardShareStatus;
    invitedById: string;
    inviteToken: string;
    tokenExpiresAt: Date;
    acceptedAt?: Date;
    declinedAt?: Date;
    revokedAt?: Date;
    publicId: string;
    createdAt: Date;
  }> = {},
): BoardShare {
  return BoardShare.create(
    {
      boardId: 'board-1',
      email: 'alice@example.com',
      permissionLevel: 'VIEW',
      status: 'PENDING',
      invitedById: 'user-1',
      inviteToken: 'token-abc',
      tokenExpiresAt: FUTURE,
      publicId: 'pub-1',
      createdAt: NOW,
      ...overrides,
    },
    'share-1',
  ).getValue();
}

describe('BoardShare entity', () => {
  describe('state transitions', () => {
    it('starts as PENDING', () => {
      const share = createShare();
      expect(share.status).toBe('PENDING');
      expect(share.isPending()).toBe(true);
    });

    it('accept() transitions to ACCEPTED', () => {
      const share = createShare();
      share.accept();
      expect(share.status).toBe('ACCEPTED');
      expect(share.acceptedAt).toBeInstanceOf(Date);
    });

    it('decline() transitions to DECLINED', () => {
      const share = createShare();
      share.decline();
      expect(share.status).toBe('DECLINED');
      expect(share.declinedAt).toBeInstanceOf(Date);
    });

    it('revoke() transitions to REVOKED', () => {
      const share = createShare();
      share.revoke();
      expect(share.status).toBe('REVOKED');
      expect(share.revokedAt).toBeInstanceOf(Date);
    });

    it('cannot accept a non-PENDING share', () => {
      const share = createShare();
      share.revoke();
      expect(() => share.accept()).toThrow('Cannot accept');
    });

    it('cannot decline a non-PENDING share', () => {
      const share = createShare();
      share.revoke();
      expect(() => share.decline()).toThrow('Cannot decline');
    });

    it('cannot revoke an already REVOKED share', () => {
      const share = createShare({ status: 'REVOKED' });
      expect(() => share.revoke()).toThrow('Cannot revoke');
    });

    it('cannot revoke an EXPIRED share', () => {
      const share = createShare({ status: 'EXPIRED' });
      expect(() => share.revoke()).toThrow('Cannot revoke');
    });
  });

  describe('isExpired', () => {
    it('returns false when token has not expired', () => {
      const share = createShare({ tokenExpiresAt: FUTURE });
      expect(share.isExpired()).toBe(false);
    });

    it('returns true when token has expired', () => {
      const share = createShare({ tokenExpiresAt: PAST });
      expect(share.isExpired()).toBe(true);
    });
  });

  describe('updatePermissionLevel', () => {
    it('updates permission level when status is PENDING', () => {
      const share = createShare({ permissionLevel: 'VIEW' });
      share.updatePermissionLevel('EDIT');
      expect(share.permissionLevel).toBe('EDIT');
    });

    it('throws when status is not PENDING', () => {
      const share = createShare({ status: 'ACCEPTED' });
      expect(() => share.updatePermissionLevel('EDIT')).toThrow(
        'Cannot update permission level',
      );
    });

    it('throws when status is REVOKED', () => {
      const share = createShare({ status: 'REVOKED' });
      expect(() => share.updatePermissionLevel('EDIT')).toThrow(
        'Cannot update permission level',
      );
    });

    it('throws when status is EXPIRED', () => {
      const share = createShare({ status: 'EXPIRED' });
      expect(() => share.updatePermissionLevel('EDIT')).toThrow(
        'Cannot update permission level',
      );
    });
  });

  describe('createdAt', () => {
    it('exposes createdAt from props', () => {
      const customDate = new Date('2025-01-01');
      const share = createShare({ createdAt: customDate });
      expect(share.createdAt).toEqual(customDate);
    });
  });
});
