/// <reference types="vite/client" />
import axios from 'axios';
import { User, UserRole, Sprint, SprintStatus, SubTask, Priority, AppNotification, NotificationType, UserNotificationPref } from '../types';

const api_url =
  import.meta.env.VITE_API_URL ||
  // Fallback for local dev: assume the NestJS API on the standard port.
  // In production, VITE_API_URL must be set explicitly via the build env.
  (import.meta.env.DEV ? 'http://localhost:5000' : '');

if (!api_url) {
  throw new Error(
    'VITE_API_URL is not defined. Set it in web/.env (see web/.env.example) or pass it at build time.',
  );
}

if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  // Surface this once on dev startup so misconfiguration is obvious
  // without crashing the app. The fallback above keeps things working.
  // eslint-disable-next-line no-console
  console.warn(
    '[flowforce] VITE_API_URL not set — falling back to http://localhost:5000. Copy web/.env.example to web/.env to silence this warning.',
  );
}

const api = axios.create({
  baseURL: api_url,
});

// Add a request interceptor to add the JWT token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('flowforce_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Flowforce-kanban#29: 401 used to silently nuke storage and hard-redirect
      // to /login with zero feedback. Now we dispatch a window event so
      // AuthContext can show a toast ("Session expired — please sign in again")
      // and centralize the storage wipe + redirect in one place. The
      // window.location.href fallback is kept as a last resort for cases
      // where AuthProvider isn't mounted (e.g. raw API consumers).
      const hadToken = !!localStorage.getItem('flowforce_token');
      localStorage.removeItem('flowforce_token');
      localStorage.removeItem('flowforce_user');
      if (hadToken) {
        window.dispatchEvent(new CustomEvent('flowforce:auth-expired'));
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// User Management API
export const getUsers = async (): Promise<User[]> => {
  const response = await api.get('/users');
  return response.data;
};

export const inviteUser = async (email: string, role: UserRole = 'MEMBER') => {
  const response = await api.post('/users/invite', { email, role });
  return response.data;
};

export const deleteUser = async (id: string) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};

export const updateUserRole = async (id: string, role: UserRole) => {
  const response = await api.post(`/users/${id}/role`, { role });
  return response.data;
};

// Sprint API
export interface CreateSprintInput {
  name: string;
  startDate: string;
  endDate: string;
  boardId: string;
  color?: string;
}

export interface UpdateSprintInput {
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: SprintStatus;
  color?: string;
}

export const getSprints = async (boardId: string): Promise<Sprint[]> => {
  const response = await api.get(`/sprints/boards/${boardId}`);
  return response.data;
};

export const getSprint = async (sprintId: string): Promise<Sprint> => {
  const response = await api.get(`/sprints/${sprintId}`);
  return response.data;
};

export const createSprint = async (boardId: string, data: Omit<CreateSprintInput, 'boardId'>): Promise<Sprint> => {
  const response = await api.post('/sprints', { ...data, boardId });
  return response.data;
};

export const updateSprint = async (sprintId: string, data: UpdateSprintInput): Promise<Sprint> => {
  const response = await api.patch(`/sprints/${sprintId}`, data);
  return response.data;
};

export const deleteSprint = async (sprintId: string): Promise<void> => {
  await api.delete(`/sprints/${sprintId}`);
};

export const activateSprint = async (sprintId: string): Promise<Sprint> => {
  const response = await api.post(`/sprints/${sprintId}/activate`);
  return response.data;
};

export const archiveSprint = async (sprintId: string): Promise<Sprint> => {
  const response = await api.post(`/sprints/${sprintId}/archive`);
  return response.data;
};

export const assignTaskToSprint = async (taskId: string, sprintId: string | null): Promise<void> => {
  await api.patch(`/tasks/${taskId}/sprint`, { sprintId });
};

export const getActiveSprint = async (boardId: string): Promise<Sprint | null> => {
  const response = await api.get(`/sprints/boards/${boardId}/active`);
  return response.data;
};

// Subtask API
// Backend returns: { id, content, completed, priority, order, checklistId, createdAt, updatedAt }
// Frontend SubTask uses: { id, title, isCompleted, checklistId, priority, order }
export interface SubtaskApiResponse {
  id: string;
  content: string;
  completed: boolean;
  priority?: Priority;
  order?: number;
  checklistId?: string;
  createdAt?: string;
  updatedAt?: string;
}

function mapApiSubtaskToSubTask(api: SubtaskApiResponse): SubTask {
  return {
    id: api.id,
    title: api.content,
    isCompleted: api.completed,
    checklistId: api.checklistId,
    priority: api.priority,
    order: api.order,
  };
}

export interface CreateSubtaskInput {
  content: string;
  checklistId: string;
  priority?: Priority;
}

export interface UpdateSubtaskInput {
  content?: string;
  completed?: boolean;
  order?: number;
  priority?: Priority | null;  // null = inherit from parent task
}

export const createSubtask = async (data: CreateSubtaskInput): Promise<SubTask> => {
  const response = await api.post<SubtaskApiResponse>('/subtasks', data);
  return mapApiSubtaskToSubTask(response.data);
};

export const updateSubtask = async (id: string, data: UpdateSubtaskInput): Promise<SubTask> => {
  const response = await api.patch<SubtaskApiResponse>(`/subtasks/${id}`, data);
  return mapApiSubtaskToSubTask(response.data);
};

export const toggleSubtask = async (id: string): Promise<SubTask> => {
  const response = await api.patch<SubtaskApiResponse>(`/subtasks/${id}/toggle`);
  return mapApiSubtaskToSubTask(response.data);
};

export const deleteSubtask = async (id: string): Promise<void> => {
  await api.delete(`/subtasks/${id}`);
};

export const reorderSubtasks = async (checklistId: string, orderedIds: string[]): Promise<void> => {
  await api.patch('/subtasks/reorder', { checklistId, orderedIds });
};

export const getSubtasksByChecklist = async (checklistId: string): Promise<SubTask[]> => {
  const response = await api.get<SubtaskApiResponse[]>('/subtasks', { params: { checklistId } });
  return response.data.map(mapApiSubtaskToSubTask);
};

// Time Tracking API
export interface TimeEntryApiResponse {
  id: string;
  taskId: string;
  userId: string;
  userName?: string;
  minutes: number;
  date: string;
  createdAt: string;
}

export interface SprintReportApiResponse {
  sprintId: string;
  sprintName: string;
  startDate: string;
  endDate: string;
  totalEstimated: number;
  totalLogged: number;
  taskCount: number;
  tasks: Array<{
    taskId: string;
    content: string;
    estimatedMinutes: number | null;
    loggedMinutes: number;
    variance: number;
  }>;
}

export const logTime = async (taskId: string, minutes: number, date?: string): Promise<TimeEntryApiResponse> => {
  const response = await api.post<TimeEntryApiResponse>(`/tasks/${taskId}/time-entries`, { minutes, date });
  return response.data;
};

export const getTimeEntries = async (taskId: string): Promise<TimeEntryApiResponse[]> => {
  const response = await api.get<TimeEntryApiResponse[]>(`/tasks/${taskId}/time-entries`);
  return response.data;
};

export const deleteTimeEntry = async (id: string): Promise<{ success: boolean }> => {
  const response = await api.delete<{ success: boolean }>(`/time-entries/${id}`);
  return response.data;
};

export const getSprintReport = async (boardId: string, sprintId: string): Promise<SprintReportApiResponse> => {
  const response = await api.get<SprintReportApiResponse>(`/boards/${boardId}/sprint-reports`, { params: { sprintId } });
  return response.data;
};

// Notifications API
export interface NotificationsListResponse {
  items: AppNotification[];
  nextCursor: string | null;
}

export interface ListNotificationsParams {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
}

export const getNotifications = async (params?: ListNotificationsParams): Promise<NotificationsListResponse> => {
  const response = await api.get<NotificationsListResponse>('/notifications', { params });
  return response.data;
};

export const getUnreadCount = async (): Promise<number> => {
  const response = await api.get<{ count: number }>('/notifications/unread-count');
  return response.data.count;
};

export const markNotificationRead = async (id: string): Promise<AppNotification> => {
  const response = await api.patch<AppNotification>(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async (): Promise<number> => {
  const response = await api.post<{ updated: number }>('/notifications/mark-all-read');
  return response.data.updated;
};

export const getNotificationPrefs = async (): Promise<UserNotificationPref[]> => {
  const response = await api.get<UserNotificationPref[]>('/users/me/notification-prefs');
  return response.data;
};

export const upsertNotificationPref = async (
  type: NotificationType,
  inAppEnabled: boolean,
): Promise<UserNotificationPref> => {
  const response = await api.put<UserNotificationPref>(`/users/me/notification-prefs/${type}`, {
    inAppEnabled,
  });
  return response.data;
};

export default api;
