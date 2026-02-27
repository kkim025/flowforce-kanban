import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { KanbanProvider } from './store/KanbanContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <KanbanProvider>
            <App />
        </KanbanProvider>
    </React.StrictMode>
);
