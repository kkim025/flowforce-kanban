import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Board from './components/Board';
import TaskViewer from './components/TaskViewer';
import TaskEditor from './components/TaskEditor';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ProtectedRoute from './components/auth/ProtectedRoute';
import UserManagement from './components/admin/UserManagement';
import SprintReportPage from './components/reports/SprintReportPage';
import { NotificationCenterPage } from './components/notifications/NotificationCenterPage';
import { NotificationPreferences } from './components/notifications/NotificationPreferences';
import { WikiLayout } from './components/wiki/WikiLayout';
import { AuthProvider } from './store/AuthContext';
import { NotificationsProvider } from './store/NotificationsContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <NotificationsProvider>
            <Router>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginForm />} />
                <Route path="/register" element={<RegisterForm />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Board />}>
                    <Route path="tasks/new" element={<TaskEditor />} />
                    <Route path="tasks/:taskId" element={<TaskViewer />} />
                    <Route path="tasks/:taskId/edit" element={<TaskEditor />} />

                    {/* Admin Routes */}
                    <Route path="admin/users" element={<UserManagement />} />
                    <Route path="board/:boardId/reports" element={<SprintReportPage />} />
                  </Route>

                  {/* Top-level notification routes */}
                  <Route path="/notifications" element={<NotificationCenterPage />} />
                  <Route path="/settings/notifications" element={<NotificationPreferences />} />

                  {/* Wiki routes — plural 'boards' to match the API controller.
                      Standalone top-level routes (not nested under Board.tsx)
                      so they have their own layout. */}
                  <Route path="/boards/:boardId/wiki" element={<WikiLayout />}>
                    <Route index element={null} />
                    <Route path="trash" element={null} />
                    <Route path=":pageId" element={null} />
                  </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </NotificationsProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;