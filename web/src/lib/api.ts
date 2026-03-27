/// <reference types="vite/client" />
import axios from 'axios';
import { User, UserRole, Sprint, SprintStatus } from '../types';

const api_url = import.meta.env.VITE_API_URL;

if (!api_url) {
  throw new Error('VITE_API_URL is not defined in environment variables. Please create a .env file in the web folder.');
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
      localStorage.removeItem('flowforce_token');
      localStorage.removeItem('flowforce_user');
      window.location.href = '/login';
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

export const assignTaskToSprint = async (taskId: string, sprintId: string | null): Promise<void> => {
  await api.patch(`/tasks/${taskId}/sprint`, { sprintId });
};

export const getActiveSprint = async (boardId: string): Promise<Sprint | null> => {
  const response = await api.get(`/sprints/boards/${boardId}/active`);
  return response.data;
};

export default api;
