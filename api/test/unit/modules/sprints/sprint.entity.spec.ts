import { instanceToPlain } from 'class-transformer';
import { Sprint } from '../../../../src/modules/sprints/domain/sprint.entity';

/**
 * Regression test for issue #34 — "cannot switch between sprints".
 *
 * Background: the Sprint domain entity has `@Exclude()` at the class level,
 * which hides every property from JSON serialization unless explicitly
 * `@Expose()`-decorated. The `id` getter was originally MISSING `@Expose()`,
 * causing the API to return sprint objects with no `id` field:
 *
 *     { name, startDate, endDate, status, boardId }   // no id
 *
 * That broke the frontend:
 *   - KanbanContext.tsx — `activeSprint.id || null` was always `null`,
 *     so the active sprint was never auto-selected on page load.
 *   - SprintFilterBar.tsx — `sprints.find(s => s.id === activeSprintId)`
 *     never matched, so the button always rendered "All Tasks".
 *   - Clicking a sprint in the dropdown dispatched `sprintId: undefined`.
 *
 * Fix: `@Expose()` on the `get id()` getter in sprint.entity.ts. This test
 * guards against any future change that strips it again — the existing
 * sprints.controller.spec.ts mocks the use-cases and never touches the
 * serializer, so it would not have caught this regression.
 *
 * We assert the exact JSON shape the frontend relies on:
 *   - `id` must be present and equal to the value passed to Sprint.create()
 *   - All other @Expose()-decorated getters must serialize
 *   - Internal `props` and `_id` storage must NOT leak through
 */
describe('Sprint entity — JSON serialization (issue #34 regression)', () => {
  const make = (
    overrides: Partial<{ id: string; name: string; status: string }> = {},
  ) => {
    const r = Sprint.create(
      {
        name: overrides.name ?? 'test 1',
        startDate: new Date('2026-06-23T00:00:00Z'),
        endDate: new Date('2026-07-07T00:00:00Z'),
        status: (overrides.status as any) ?? 'ACTIVE',
        boardId: 'board-1',
      },
      overrides.id ?? 'sprint-abc-123',
    );
    if (r.isFailure) throw new Error(`setup failed: ${String(r.error)}`);
    return r.getValue();
  };

  it('includes id in the serialized JSON', () => {
    const sprint = make({ id: 'sprint-abc-123' });
    const json = instanceToPlain(sprint) as Record<string, unknown>;
    expect(json.id).toBe('sprint-abc-123');
  });

  it('includes all exposed fields (id, name, startDate, endDate, status, boardId)', () => {
    const sprint = make({
      id: 'sprint-xyz',
      name: 'Sprint 42',
      status: 'PLANNING',
    });
    const json = instanceToPlain(sprint) as Record<string, unknown>;
    expect(json).toEqual({
      id: 'sprint-xyz',
      name: 'Sprint 42',
      startDate: '2026-06-23T00:00:00.000Z',
      endDate: '2026-07-07T00:00:00.000Z',
      status: 'PLANNING',
      boardId: 'board-1',
    });
  });

  it('serializes startDate/endDate as ISO strings (not raw Date objects)', () => {
    const sprint = make();
    const json = instanceToPlain(sprint) as Record<string, unknown>;
    expect(typeof json.startDate).toBe('string');
    expect(typeof json.endDate).toBe('string');
    expect(json.startDate).toBe('2026-06-23T00:00:00.000Z');
    expect(json.endDate).toBe('2026-07-07T00:00:00.000Z');
  });

  it('does not leak internal storage (props, _id)', () => {
    const sprint = make();
    const json = instanceToPlain(sprint) as Record<string, unknown>;
    expect(json).not.toHaveProperty('props');
    expect(json).not.toHaveProperty('_id');
  });

  it('preserves the assigned id across multiple sprints (no cross-contamination)', () => {
    // The precise scenario from issue #34: state.activeSprintId='test-1'
    // could not be matched against a sprint list because every sprint
    // serialized with id=undefined. Two sprints must serialize to two
    // distinct ids, not collapse to a shared undefined.
    const a = make({ id: 'test-1' });
    const b = make({ id: 'test-2' });
    expect((instanceToPlain(a) as any).id).toBe('test-1');
    expect((instanceToPlain(b) as any).id).toBe('test-2');
    expect((instanceToPlain(a) as any).id).not.toBe(
      (instanceToPlain(b) as any).id,
    );
  });
});
