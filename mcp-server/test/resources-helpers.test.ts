import { describe, it, expect } from 'vitest';
import { singleString } from '../src/resources/_helpers.js';

describe('singleString (URI-template variable guard)', () => {
  it('returns the string when the variable is a single string', () => {
    expect(singleString({ boardId: 'b1' }, 'boardId')).toBe('b1');
    expect(singleString({ pageId: 'p1' }, 'pageId')).toBe('p1');
  });

  it('throws a typed error when the variable is missing', () => {
    expect(() => singleString({}, 'boardId')).toThrow(/missing/);
  });

  it('throws a typed error when the variable is an array', () => {
    expect(() => singleString({ boardId: ['b1', 'b2'] }, 'boardId')).toThrow(
      /array/,
    );
  });

  it('produces a useful error message identifying the offending variable', () => {
    expect(() => singleString({}, 'boardId')).toThrow(/boardId/);
    expect(() =>
      singleString({ boardId: ['b1', 'b2'] }, 'boardId'),
    ).toThrow(/boardId/);
  });
});
