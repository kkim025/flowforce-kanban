import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getUsers, inviteUser, deleteUser, updateUserRole } from '../../lib/api';
import { User, UserRole } from '../../types';
import {
    UserPlus,
    Trash2,
    Shield,
    User as UserIcon,
    Mail,
    Clock,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw,
    ChevronDown,
    Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmationModal from '../ConfirmationModal';
import { useToast } from '../../context/ToastContext';

const RoleDropdownPortal: React.FC<{
    user: User;
    anchorRect: DOMRect | null;
    onClose: () => void;
    onUpdateRole: (user: User, newRole: UserRole) => void;
}> = ({ user, anchorRect, onClose, onUpdateRole }) => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    if (!anchorRect) return null;

    // Position relative to viewport, accounting for any scroll offset
    const top = anchorRect.bottom + 8;
    const left = anchorRect.left;

    return createPortal(
        <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            style={{ 
                position: 'absolute', 
                top, 
                left,
                width: '12rem',
                zIndex: 9999
            }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 py-2 overflow-hidden"
        >
            {(['MEMBER', 'ADMIN'] as UserRole[]).map((role) => (
                <button
                    key={role}
                    onClick={() => onUpdateRole(user, role)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                        user.role === role 
                            ? 'bg-accent-blue/5 text-accent-blue' 
                            : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                        {role}
                    </div>
                    {user.role === role && <Check className="w-3.5 h-3.5" />}
                </button>
            ))}
            <div className="px-4 py-2 mt-1 border-t border-slate-100 dark:border-white/5">
                <p className="text-[9px] font-bold text-slate-400 leading-tight">
                    {user.role === 'ADMIN' 
                        ? 'Administrators can manage users, settings, and all boards.' 
                        : 'Members can view and edit boards they are assigned to.'}
                </p>
            </div>
        </motion.div>,
        document.body
    );
};

const UserManagement: React.FC = () => {
    const { showToast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
    const [dropdownUserId, setDropdownUserId] = useState<string | null>(null);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
    
    // Invite Modal State
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>('MEMBER');
    const [isInviting, setIsInviting] = useState(false);

    // Delete State
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const data = await getUsers();
            setUsers(data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch users');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        try {
            setIsInviting(true);
            await inviteUser(inviteEmail, inviteRole);
            setShowInviteModal(false);
            setInviteEmail('');
            setInviteRole('MEMBER');
            fetchUsers();
            showToast('Invitation sent successfully', 'success');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to send invitation', 'error');
        } finally {
            setIsInviting(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingUserId) return;

        try {
            await deleteUser(deletingUserId);
            setUsers(users.filter(u => u.id !== deletingUserId));
            setDeletingUserId(null);
            showToast('User removed successfully', 'success');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to delete user', 'error');
        }
    };

    const handleUpdateRole = async (user: User, newRole: UserRole) => {
        if (user.role === newRole) {
            setDropdownUserId(null);
            return;
        }

        try {
            setUpdatingUserId(user.id);
            setDropdownUserId(null);
            await updateUserRole(user.id, newRole);
            setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
            showToast('User role updated successfully', 'success');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to update user role', 'error');
        } finally {
            setUpdatingUserId(null);
        }
    };

    const toggleDropdown = (e: React.MouseEvent, userId: string) => {
        if (dropdownUserId === userId) {
            setDropdownUserId(null);
            setAnchorRect(null);
        } else {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setAnchorRect(rect);
            setDropdownUserId(userId);
        }
    };

    // Close dropdown on scroll to avoid mispositioning
    useEffect(() => {
        if (!dropdownUserId) return;
        const handleScroll = () => {
            setDropdownUserId(null);
            setAnchorRect(null);
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [dropdownUserId]);

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-accent-blue animate-spin mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Directory...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden px-8 py-6">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Team Management</h2>
                    <p className="text-slate-500 font-medium">Manage your team members and their access levels.</p>
                </div>

                <button 
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 bg-accent-blue hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-accent-blue/20 active:scale-95"
                >
                    <UserPlus className="w-5 h-5" />
                    Invite Member
                </button>
            </header>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-center gap-3 mb-6 text-sm font-bold">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <div className="flex-1 glass rounded-[2rem] border border-white/20 shadow-lg overflow-hidden flex flex-col">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Member</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-accent-blue font-black text-xs">
                                                {u.name?.[0] || u.email[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{u.name || u.email.split('@')[0]}</p>
                                                <p className="text-xs text-slate-500 font-medium">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={(e) => toggleDropdown(e, u.id)}
                                            disabled={updatingUserId === u.id}
                                            className={`group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 ${
                                                u.role === 'ADMIN' 
                                                    ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20 hover:bg-purple-500/20' 
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                                            }`}
                                        >
                                            {updatingUserId === u.id ? (
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                            ) : (
                                                u.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />
                                            )}
                                            {u.role}
                                            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${dropdownUserId === u.id ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {dropdownUserId === u.id && (
                                                <RoleDropdownPortal
                                                    user={u}
                                                    anchorRect={anchorRect}
                                                    onClose={() => setDropdownUserId(null)}
                                                    onUpdateRole={handleUpdateRole}
                                                />
                                            )}
                                        </AnimatePresence>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div 
                                            className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${
                                                u.status === 'ACTIVE' ? 'text-emerald-500' : 
                                                u.status === 'PENDING' ? 'text-amber-500' : 'text-slate-400'
                                            }`}
                                            title={
                                                u.status === 'ACTIVE' ? 'Account verified and active' : 
                                                u.status === 'PENDING' ? 'Waiting for user to accept invitation' : 
                                                'Account deactivated'
                                            }
                                        >
                                            {u.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                            {u.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => setDeletingUserId(u.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-500/10"
                                            title="Remove Member"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invite Modal */}
            <AnimatePresence>
                {showInviteModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowInviteModal(false)}
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10"
                        >
                            <form onSubmit={handleInvite}>
                                <div className="p-8">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="p-3 bg-accent-blue/10 rounded-2xl text-accent-blue font-black">
                                            <UserPlus className="w-6 h-6" />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setShowInviteModal(false)}
                                            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-400"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Invite Member</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
                                        Enter the email address of the person you want to invite to your team.
                                    </p>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input 
                                                    autoFocus
                                                    type="email"
                                                    required
                                                    value={inviteEmail}
                                                    onChange={(e) => setInviteEmail(e.target.value)}
                                                    placeholder="name@company.com"
                                                    className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent-blue/30 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Level</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {(['MEMBER', 'ADMIN'] as UserRole[]).map(r => (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        onClick={() => setInviteRole(r)}
                                                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                                                            inviteRole === r 
                                                                ? 'bg-accent-blue/5 border-accent-blue text-accent-blue' 
                                                                : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-500'
                                                        }`}
                                                    >
                                                        {r === 'ADMIN' ? <Shield className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                                                        <span className="text-[10px] font-black uppercase tracking-wider">{r}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 bg-slate-50 dark:bg-white/5 flex gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setShowInviteModal(false)}
                                        className="flex-1 px-6 py-3 rounded-2xl font-bold text-sm text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={isInviting || !inviteEmail.trim()}
                                        className="flex-1 bg-accent-blue hover:bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-accent-blue/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                        Send Invite
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete User Confirmation */}
            <ConfirmationModal 
                isOpen={!!deletingUserId}
                title="Remove Member"
                message="Are you sure you want to remove this member? They will lose all access to the workspace immediately."
                confirmLabel="Remove Member"
                onConfirm={handleDelete}
                onCancel={() => setDeletingUserId(null)}
                variant="danger"
            />
        </div>
    );
};

export default UserManagement;
