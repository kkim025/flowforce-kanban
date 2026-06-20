import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '../types';
import api from '../lib/api';
import { useAuth } from './AuthContext';

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
    message?: string;
}

interface UserContextType {
    users: User[];
    userMap: Map<string, User>;
    isLoading: boolean;
    error: string | null;
    refreshUsers: () => Promise<void>;
    getUserName: (userId: string | null | undefined) => string;
    getInitials: (userId: string | null | undefined) => string;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshUsers = useCallback(async () => {
        if (!isAuthenticated || currentUser?.role !== 'ADMIN') {
            setUsers([]);
            return;
        }
        
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (err: unknown) {
            console.error('Failed to fetch users:', err);
            const error = err as ApiError;
            setError(error.response?.data?.message || error.message || 'Failed to fetch users');
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, currentUser?.role]);

    useEffect(() => {
        if (isAuthenticated && currentUser?.role === 'ADMIN') {
            refreshUsers();
        } else {
            setUsers([]);
        }
    }, [isAuthenticated, currentUser?.role, refreshUsers]);

    const userMap = useMemo(() => {
        return new Map(users.map(u => [u.id, u]));
    }, [users]);

    const getUserName = useCallback((userId: string | null | undefined) => {
        if (!userId) return 'Unknown User';
        
        // If it's the current user, we can get it from AuthContext even if not in users list
        if (currentUser && userId === currentUser.id) {
            return currentUser.name || currentUser.email.split('@')[0] || 'Me';
        }

        const u = userMap.get(userId);
        if (!u) return 'User';
        return u.name || u.email?.split('@')[0] || 'User';
    }, [userMap, currentUser]);

    const getInitials = useCallback((userId: string | null | undefined) => {
        if (!userId) return '?';

        if (currentUser && userId === currentUser.id) {
            return currentUser.name?.[0] || currentUser.email?.[0]?.toUpperCase() || '?';
        }

        const u = userMap.get(userId);
        if (!u) return '?';
        return u.name?.[0] || u.email?.[0]?.toUpperCase() || '?';
    }, [userMap, currentUser]);

    return (
        <UserContext.Provider value={{ users, userMap, isLoading, error, refreshUsers, getUserName, getInitials }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUsers = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUsers must be used within a UserProvider');
    }
    return context;
};
