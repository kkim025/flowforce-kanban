import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '../types';
import api from '../lib/api';
import { useAuth } from './AuthContext';

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
    const { isAuthenticated } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshUsers = useCallback(async () => {
        if (!isAuthenticated) return;
        
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (err: any) {
            console.error('Failed to fetch users:', err);
            setError(err.message || 'Failed to fetch users');
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            refreshUsers();
        } else {
            setUsers([]);
        }
    }, [isAuthenticated, refreshUsers]);

    const userMap = useMemo(() => {
        return new Map(users.map(u => [u.id, u]));
    }, [users]);

    const getUserName = useCallback((userId: string | null | undefined) => {
        if (!userId) return 'Unknown User';
        const u = userMap.get(userId);
        if (!u) return 'Unknown User';
        return u.name || u.email?.split('@')[0] || 'Unknown User';
    }, [userMap]);

    const getInitials = useCallback((userId: string | null | undefined) => {
        if (!userId) return '?';
        const u = userMap.get(userId);
        if (!u) return '?';
        return u.name?.[0] || u.email?.[0]?.toUpperCase() || '?';
    }, [userMap]);

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
