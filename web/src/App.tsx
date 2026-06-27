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
import WikiLayout from './components/wiki/WikiLayout';
import { NotificationsProvider } from './store/NotificationsContext';
import { ThemeProvider } from './context/ThemeContext';

// Note: <ToastProvider> from ./context/ToastContext is now mounted in main.tsx
// so it sits ABOVE <KanbanProvider> (which renders this <App />). Previously it
// was nested inside <App /> under <KanbanProvider>, which meant useToast()
// called from inside KanbanProvider had no provider ancestor and threw.
// See flowforce-kanban#25 and the production-bug note on PR #27.
//
// Note: <AuthProvider> is mounted ONCE in main.tsx so it is the single
// source of truth for `isAuthenticated` across the tree. Mounting a
// second <AuthProvider> here used to shadow the outer one — KanbanProvider
// (in main.tsx, outside <App />) read `isAuthenticated: false` even after
// login, so its `loadBoardData` never ran and the Board hung on
// "Loading Board..." forever. See flowforce-kanban#25.
const App: React.FC = () => {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
};

export default App;