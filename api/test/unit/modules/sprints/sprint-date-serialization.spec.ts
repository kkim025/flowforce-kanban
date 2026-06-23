/**
 * Standalone test to verify Sprint date serialization behavior.
 * This test does NOT need a database - it uses mock objects to demonstrate
 * how dates flow through the system.
 */
import { Sprint } from 'src/modules/sprints/domain/sprint.entity';

describe('Sprint Date Serialization', () => {
  describe('when creating a sprint with date-only strings', () => {
    it('should serialize dates as ISO strings with UTC timezone', () => {
      // Simulate what CreateSprintUseCase does:
      const startDate = new Date('2026-06-23');
      const endDate = new Date('2026-06-30');

      // Create sprint
      const sprintResult = Sprint.create({
        name: 'Sprint 1',
        startDate,
        endDate,
        status: 'PLANNING',
        boardId: 'board-1',
      });

      expect(sprintResult.isSuccess).toBe(true);
      const sprint = sprintResult.getValue();

      // Access the exposed getters - these use @Transform to convert to ISO string
      const serializedStartDate = sprint.startDate;
      const serializedEndDate = sprint.endDate;

      console.log('\n=== SPRINT DATE SERIALIZATION TEST ===');
      console.log('Input date strings: "2026-06-23", "2026-06-30"');
      console.log('After new Date():');
      console.log('  startDate:', startDate.toISOString());
      console.log('  endDate:', endDate.toISOString());
      console.log('');
      console.log('Sprint entity @Expose() @Transform() output:');
      console.log('  startDate:', serializedStartDate);
      console.log('  endDate:', serializedEndDate);

      // Verify the dates are ISO strings with UTC timezone
      expect(serializedStartDate).toBe('2026-06-23T00:00:00.000Z');
      expect(serializedEndDate).toBe('2026-06-30T00:00:00.000Z');
    });

    it('should demonstrate the timezone issue with date-only strings', () => {
      const startDate = new Date('2026-06-23');
      
      console.log('\n=== TIMEZONE ISSUE ===');
      console.log('Input: "2026-06-23" (user intends local date)');
      console.log('Parsed: new Date("2026-06-23") =', startDate.toISOString());
      console.log('');
      console.log('The problem: JavaScript Date.parse("2026-06-23") interprets');
      console.log('this as UTC midnight (00:00:00Z), NOT local midnight.');
      console.log('');
      console.log('In EDT (UTC-4): 2026-06-23T00:00:00.000Z = 2026-06-22 20:00:00 local');
      
      expect(startDate.toISOString()).toBe('2026-06-23T00:00:00.000Z');
    });
  });
});
