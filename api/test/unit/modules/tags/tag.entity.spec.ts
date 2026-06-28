import { Tag } from '../../../../src/modules/tags/domain/tag.entity';

describe('Tag entity', () => {
  const baseProps = {
    boardId: 'b1',
    name: 'frontend',
    color: '#3b82f6',
  };

  it('creates a tag from valid props', () => {
    const result = Tag.create(baseProps);
    expect(result.isSuccess).toBe(true);
    const tag = result.getValue();
    expect(tag.name).toBe('frontend');
    expect(tag.color).toBe('#3b82f6');
    expect(tag.boardId).toBe('b1');
    expect(tag.id).toBeDefined();
  });

  it('trims whitespace from name', () => {
    const result = Tag.create({ ...baseProps, name: '  frontend  ' });
    expect(result.isSuccess).toBe(true);
    expect(result.getValue().name).toBe('frontend');
  });

  it('rejects empty name', () => {
    const result = Tag.create({ ...baseProps, name: '' });
    expect(result.isFailure).toBe(true);
  });

  it('rejects whitespace-only name', () => {
    const result = Tag.create({ ...baseProps, name: '   ' });
    expect(result.isFailure).toBe(true);
  });

  it('rejects names longer than 32 characters', () => {
    const result = Tag.create({ ...baseProps, name: 'a'.repeat(33) });
    expect(result.isFailure).toBe(true);
  });

  it('accepts exactly-32-character names', () => {
    const result = Tag.create({ ...baseProps, name: 'a'.repeat(32) });
    expect(result.isSuccess).toBe(true);
  });

  it('rejects malformed color', () => {
    expect(Tag.create({ ...baseProps, color: 'red' }).isFailure).toBe(true);
    expect(Tag.create({ ...baseProps, color: '#abc' }).isFailure).toBe(true);
    expect(Tag.create({ ...baseProps, color: '#GGGGGG' }).isFailure).toBe(true);
  });

  it('accepts uppercase hex colors', () => {
    const result = Tag.create({ ...baseProps, color: '#AABBCC' });
    expect(result.isSuccess).toBe(true);
    expect(result.getValue().color).toBe('#AABBCC');
  });

  it('rejects empty boardId', () => {
    const result = Tag.create({ ...baseProps, boardId: '' });
    expect(result.isFailure).toBe(true);
  });

  it('preserves a provided id (e.g. when loading from persistence)', () => {
    const result = Tag.create(baseProps, 'existing-id-123');
    expect(result.isSuccess).toBe(true);
    expect(result.getValue().id).toBe('existing-id-123');
  });
});
