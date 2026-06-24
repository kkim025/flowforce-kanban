export interface MentionParserUser {
  id: string;
  name?: string | null;
}

/**
 * Extracts `@name` mentions from comment text and resolves them to user ids.
 *
 * - Matches `@<word>` where word starts at a non-word boundary (so `a@b.com` is ignored).
 * - Case-insensitive: `@Alice` matches user `alice`.
 * - Unknown names are dropped silently.
 * - Repeats are de-duplicated; first occurrence wins.
 */
export class MentionParser {
  // \B ensures we don't match inside a word (e.g. `foo@bar` is ignored).
  // We also reject matches that immediately follow `.` or `:` or `/` (typical email
  // separators) by requiring the boundary to be a non-word char.
  private static readonly MENTION_RE = /\B@([a-zA-Z0-9_.-]+)/g;

  /**
   * Returns the unique lowercase mention tokens present in `content`. Useful
   * when the caller wants to pre-fetch only the users that could possibly
   * match (e.g. a `WHERE LOWER(name) IN (...)` query) instead of loading
   * the entire user table.
   */
  public static extractTokens(content: string): string[] {
    if (!content) return [];
    const out = new Set<string>();
    for (const m of content.matchAll(MentionParser.MENTION_RE)) {
      out.add(m[1].toLowerCase());
    }
    return [...out];
  }

  public static parse(content: string, users: MentionParserUser[]): string[] {
    if (!content) return [];
    const seen = new Set<string>();
    const ids: string[] = [];

    // Build a lowercase-name → id index once for O(1) lookups. With thousands
    // of users on a board the linear scan per match would dominate the request.
    const byName = new Map<string, string>();
    for (const u of users) {
      if (u.name) byName.set(u.name.toLowerCase(), u.id);
    }

    const matches = content.matchAll(MentionParser.MENTION_RE);
    for (const m of matches) {
      const token = m[1].toLowerCase();
      // Email-like patterns are rejected naturally: `a@b` is only a valid
      // mention if a user is literally named `a@b`, which is the spec'd
      // behavior (`email me at a@b.com` → `[]`).
      const id = byName.get(token);
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }

    return ids;
  }
}
