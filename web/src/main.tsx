import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { KanbanProvider } from './store/KanbanContext';
import { AuthProvider } from './store/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <KanbanProvider>
                    <App />
                </KanbanProvider>
            </AuthProvider>
        </QueryClientProvider>
    </React.StrictMode>
);
