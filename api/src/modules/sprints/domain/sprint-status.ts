export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED';

export const SprintStatus = {
  PLANNING: 'PLANNING' as const,
  ACTIVE: 'ACTIVE' as const,
  COMPLETED: 'COMPLETED' as const,
};
