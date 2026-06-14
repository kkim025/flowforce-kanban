import { DueDateScanner } from 'src/modules/notifications/infrastructure/due-date.scanner';
import { CreateNotificationUseCase } from 'src/modules/notifications/application/use-cases/create-notification.use-case';
import { NotificationType } from 'src/modules/notifications/domain/notification-type.value-object';

describe('DueDateScanner', () => {
  let scanner: DueDateScanner;
  let mockPrisma: {
    task: { findMany: jest.Mock; count: jest.Mock };
  };
  let mockUseCase: jest.Mocked<CreateNotificationUseCase>;
  let mockSchedulerRegistry: any;

  beforeEach(() => {
    jest.useFakeTimers();
    mockPrisma = {
      task: {
        findMany: jest.fn(),
        // Pre-check: must return > 0 to enter the per-window scans; tests
        // that want the early-exit path can override with mockResolvedValue(0).
        count: jest.fn().mockResolvedValue(1),
      },
    };
    mockUseCase = { execute: jest.fn() } as any;
    mockSchedulerRegistry = {};
    scanner = new DueDateScanner(
      mockPrisma as any,
      mockUseCase,
      mockSchedulerRegistry,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a notification for each (task, milestone) pair in the 24h window', async () => {
    const now = new Date('2026-06-12T10:00:00Z');
    jest.setSystemTime(now);

    mockPrisma.task.findMany
      .mockResolvedValueOnce([
        { id: 't1', assigneeId: 'u1', content: 'Fix bug' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    mockUseCase.execute.mockImplementation(async (n) => n);

    await scanner.scan();

    expect(mockUseCase.execute).toHaveBeenCalledTimes(1);
    const call = mockUseCase.execute.mock.calls[0][0];
    expect(call.type).toBe(NotificationType.DUE_DATE);
    expect(call.milestone).toBe('24h');
    expect(call.recipientId).toBe('u1');
    expect(call.refId).toBe('t1');
    expect(call.refType).toBe('task');
    expect(call.actorId).toBeUndefined();
  });

  it('creates notifications in the 1h window', async () => {
    const now = new Date('2026-06-12T10:00:00Z');
    jest.setSystemTime(now);

    mockPrisma.task.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 't2', assigneeId: 'u2', content: 'Deploy' },
      ])
      .mockResolvedValueOnce([]);

    mockUseCase.execute.mockImplementation(async (n) => n);

    await scanner.scan();

    expect(mockUseCase.execute).toHaveBeenCalledTimes(1);
    const call = mockUseCase.execute.mock.calls[0][0];
    expect(call.milestone).toBe('1h');
  });

  it('creates notifications for tasks already due (milestone=due)', async () => {
    const now = new Date('2026-06-12T10:00:00Z');
    jest.setSystemTime(now);

    const past = new Date('2026-06-12T09:00:00Z');
    mockPrisma.task.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 't3', assigneeId: 'u3', content: 'Overdue', dueDate: past },
      ]);

    mockUseCase.execute.mockImplementation(async (n) => n);

    await scanner.scan();

    expect(mockUseCase.execute).toHaveBeenCalledTimes(1);
    const call = mockUseCase.execute.mock.calls[0][0];
    expect(call.milestone).toBe('due');
  });

  it('skips tasks with no assignee', async () => {
    const now = new Date('2026-06-12T10:00:00Z');
    jest.setSystemTime(now);

    mockPrisma.task.findMany
      .mockResolvedValueOnce([
        { id: 't1', assigneeId: null, content: 'No owner' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await scanner.scan();

    expect(mockUseCase.execute).not.toHaveBeenCalled();
  });

  it('does not stop the scan when the use case fails for one task', async () => {
    const now = new Date('2026-06-12T10:00:00Z');
    jest.setSystemTime(now);

    mockPrisma.task.findMany
      .mockResolvedValueOnce([
        { id: 't1', assigneeId: 'u1', content: 'A' },
        { id: 't2', assigneeId: 'u2', content: 'B' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    mockUseCase.execute
      .mockRejectedValueOnce(new Error('boom'))
      .mockImplementationOnce(async (n) => n);

    await expect(scanner.scan()).resolves.toBeUndefined();
    expect(mockUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('does not throw when prisma findMany fails', async () => {
    mockPrisma.task.findMany.mockRejectedValue(new Error('db down'));
    await expect(scanner.scan()).resolves.toBeUndefined();
  });

  it('skips the per-window scans entirely when the pre-check count is 0', async () => {
    mockPrisma.task.count.mockResolvedValue(0);
    await scanner.scan();
    expect(mockPrisma.task.findMany).not.toHaveBeenCalled();
    expect(mockUseCase.execute).not.toHaveBeenCalled();
  });
});
