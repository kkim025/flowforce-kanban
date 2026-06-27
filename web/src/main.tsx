import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { KanbanProvider } from './store/KanbanContext';
import { AuthProvider } from './store/AuthContext';
import { UserProvider } from './store/UserContext';
import { TagsProvider } from './store/TagsContext';
// Note: import path changed from './components/Toast' (legacy, separate
// toast system) to './context/ToastContext' (canonical, used by every
// useToast() consumer — KanbanProvider, Board, NotificationsContext,
// UserManagement, and the Wiki module via hooks/useToast.ts).
// We also lift <ToastProvider> ABOVE <KanbanProvider> so useToast() works
// inside KanbanProvider. Previously the provider was nested inside App.tsx,
// under <KanbanProvider>, which made useToast() throw at render time.
// See flowforce-kanban#25 and PR #27.
import { ToastProvider } from './context/ToastContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <AuthProvider>
                    <UserProvider>
                        <TagsProvider>
                            <KanbanProvider>
                                <App />
                            </KanbanProvider>
                        </TagsProvider>
                    </UserProvider>
                </AuthProvider>
            </ToastProvider>
        </QueryClientProvider>
    </React.StrictMode>
);