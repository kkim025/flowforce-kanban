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
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
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
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;