export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export const SprintStatus = {
  PLANNING: 'PLANNING' as const,
  ACTIVE: 'ACTIVE' as const,
  COMPLETED: 'COMPLETED' as const,
  ARCHIVED: 'ARCHIVED' as const,
};
