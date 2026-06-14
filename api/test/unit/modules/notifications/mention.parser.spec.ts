import { MentionParser } from 'src/modules/notifications/infrastructure/mention.parser';

describe('MentionParser', () => {
  const users = [
    { id: 'u-alice', name: 'Alice' },
    { id: 'u-bob', name: 'Bob' },
    { id: 'u-carol', name: 'carol' },
  ];

  it('extracts multiple @mentions by name (case-insensitive)', () => {
    const result = MentionParser.parse('hi @alice and @Bob', users);
    expect(result).toEqual(['u-alice', 'u-bob']);
  });

  it('returns an empty array when there are no @mentions', () => {
    expect(MentionParser.parse('plain text', users)).toEqual([]);
  });

  it('ignores unknown names', () => {
    expect(MentionParser.parse('hi @nobody', users)).toEqual([]);
  });

  it('ignores email-like patterns (a@b.com)', () => {
    expect(MentionParser.parse('email me at a@b.com', users)).toEqual([]);
  });

  it('matches case-insensitively (@Alice matches alice)', () => {
    expect(MentionParser.parse('@Alice says hi', users)).toEqual(['u-alice']);
  });

  it('matches lowercase canonical name (@carol)', () => {
    expect(MentionParser.parse('@carol', users)).toEqual(['u-carol']);
  });

  it('preserves first occurrence order and de-duplicates repeats', () => {
    expect(MentionParser.parse('@alice @alice @bob', users)).toEqual([
      'u-alice',
      'u-bob',
    ]);
  });

  it('ignores users without a name', () => {
    const usersNoName = [{ id: 'u1' }];
    expect(MentionParser.parse('hi @alice', usersNoName)).toEqual([]);
  });
});
