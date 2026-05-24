export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  minutes: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITimeEntriesRepository {
  create(data: {
    taskId: string;
    userId: string;
    minutes: number;
    date: Date;
  }): Promise<TimeEntry>;
  findById(id: string): Promise<TimeEntry | null>;
  findByTaskId(taskId: string): Promise<TimeEntry[]>;
  delete(id: string): Promise<void>;
}
