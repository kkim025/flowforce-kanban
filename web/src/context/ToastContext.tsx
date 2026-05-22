import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast, { ToastProps, ToastType } from '../components/common/Toast';

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastProps[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 5000) => {
        const id = `${Date.now()}-${Math.random()}`;
        const newToast: ToastProps = {
            id,
            message,
            type,
            duration,
            onClose: (id) => {
                setToasts(prev => prev.filter(t => t.id !== id));
            },
        };
        setToasts(prev => [...prev, newToast]);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} />
            ))}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};