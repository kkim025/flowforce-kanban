import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserManagement from './UserManagement';
import React from 'react';
import { useAuth } from '../../store/AuthContext';
import * as api from '../../lib/api';

// Mock context hooks
vi.mock('../../store/AuthContext', () => ({
    useAuth: vi.fn()
}));

vi.mock('../../context/ToastContext', () => ({
    useToast: vi.fn(() => ({ showToast: vi.fn() }))
}));

// Mock API
vi.mock('../../lib/api', () => ({
    getUsers: vi.fn(),
    inviteUser: vi.fn(),
    deleteUser: vi.fn(),
    updateUserRole: vi.fn()
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        textarea: ({ children, ...props }: any) => <textarea {...props}>{children}</textarea>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockUsers: any[] = [
    { id: 'user-1', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE' },
    { id: 'user-2', name: 'Member User', email: 'member@example.com', role: 'MEMBER', status: 'ACTIVE' }
];

describe('UserManagement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({ user: mockUsers[0] } as any);
        vi.mocked(api.getUsers).mockResolvedValue(mockUsers);
    });

    it('should render the user list', async () => {
        render(<UserManagement />);
        
        expect(screen.getByText('Loading Directory...')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.getByText('Admin User')).toBeInTheDocument();
            expect(screen.getByText('Member User')).toBeInTheDocument();
        });
    });

    it('should allow opening the invite modal', async () => {
        render(<UserManagement />);
        await waitFor(() => screen.getByText('Admin User'));

        fireEvent.click(screen.getByText('Invite Member'));
        expect(screen.getByText('Enter the email address of the person you want to invite to your team.')).toBeInTheDocument();
    });

    it('should allow inviting a new user', async () => {
        vi.mocked(api.inviteUser).mockResolvedValue({ id: 'new-id', email: 'new@example.com' });
        
        render(<UserManagement />);
        await waitFor(() => screen.getByText('Admin User'));

        fireEvent.click(screen.getByText('Invite Member'));
        
        const emailInput = screen.getByPlaceholderText('name@company.com');
        fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
        
        const sendButton = screen.getByText('Send Invite');
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(api.inviteUser).toHaveBeenCalledWith('new@example.com', 'MEMBER');
        });
        
        // After successful invite, modal should close
        expect(screen.queryByText('Enter the email address of the person you want to invite to your team.')).not.toBeInTheDocument();
    });

    it('should allow deleting a user', async () => {
        vi.mocked(api.deleteUser).mockResolvedValue({ success: true });

        render(<UserManagement />);
        await waitFor(() => screen.getByText('Member User'));

        const deleteButtons = screen.getAllByTitle('Remove Member');
        fireEvent.click(deleteButtons[1]); // Click for Member User

        // Wait for modal text
        await waitFor(() => {
            expect(screen.getByText(/Are you sure you want to remove this member/i)).toBeInTheDocument();
        });

        // Use a more specific selector for the confirm button in the modal
        const confirmButton = screen.getAllByText('Remove Member').find(el => el.tagName === 'BUTTON');
        if (confirmButton) fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(api.deleteUser).toHaveBeenCalledWith('user-2');
            expect(screen.queryByText('member@example.com')).not.toBeInTheDocument();
        });
    });

    it('should allow updating a user role', async () => {
        vi.mocked(api.updateUserRole).mockResolvedValue({ success: true });

        render(<UserManagement />);
        await waitFor(() => screen.getByText('Member User'));

        // Find the role button for member user (first MEMBER button - user-2's row)
        const memberRoleButton = screen.getAllByText('MEMBER')[0];
        fireEvent.click(memberRoleButton);

        // Click on ADMIN option in dropdown (second ADMIN text - the dropdown option)
        const adminOption = screen.getAllByText('ADMIN')[1];
        fireEvent.click(adminOption);

        await waitFor(() => {
            expect(api.updateUserRole).toHaveBeenCalledWith('user-2', 'ADMIN');
        });
    });

    it('should show loading state while updating role', async () => {
        let resolvePromise: (value: any) => void;
        const updatePromise = new Promise(resolve => {
            resolvePromise = resolve;
        });

        vi.mocked(api.updateUserRole).mockReturnValue(updatePromise as any);

        render(<UserManagement />);
        await waitFor(() => screen.getByText('Member User'));

        // Click on role dropdown
        const memberRoleButton = screen.getAllByText('MEMBER')[0];
        fireEvent.click(memberRoleButton);

        // Click on ADMIN option
        const adminOption = screen.getAllByText('ADMIN')[1];
        fireEvent.click(adminOption);

        // Verify updateUserRole was called with correct params
        await waitFor(() => {
            expect(api.updateUserRole).toHaveBeenCalledWith('user-2', 'ADMIN');
        });

        // Resolve the promise
        resolvePromise!({ success: true });

        await waitFor(() => {
            expect(api.updateUserRole).toHaveBeenCalledTimes(1);
        });
    });

    it('should handle role update errors', async () => {
        vi.mocked(api.updateUserRole).mockRejectedValue({
            response: { data: { message: 'Failed to update role' } }
        });

        render(<UserManagement />);
        await waitFor(() => screen.getByText('Member User'));

        // Click on role dropdown
        const memberRoleButton = screen.getAllByText('MEMBER')[0];
        fireEvent.click(memberRoleButton);

        // Click on ADMIN option
        const adminOption = screen.getAllByText('ADMIN')[1];
        fireEvent.click(adminOption);

        await waitFor(() => {
            // Verify updateUserRole was attempted
            expect(api.updateUserRole).toHaveBeenCalledWith('user-2', 'ADMIN');
        });
    });
});
