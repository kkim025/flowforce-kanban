import React, { useState, useEffect } from 'react';
import { getUsers, inviteUser, deleteUser } from '../../lib/api';
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
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmationModal from '../ConfirmationModal';
import { UI_LABELS } from '../../lib/constants';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
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
            // Re-fetch users to show the new one (if they are immediately visible as PENDING)
            // Note: In our current implementation, invited users only appear after they accept.
            // We might want to show Invitations separately later.
            fetchUsers();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to send invitation');
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
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete user');
        }
    };

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
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{u.name || 'Invited User'}</p>
                                                <p className="text-xs text-slate-500 font-medium">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            u.role === 'ADMIN' 
                                                ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' 
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-white/5'
                                        }`}>
                                            {u.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                                            {u.role}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${
                                            u.status === 'ACTIVE' ? 'text-emerald-500' : 
                                            u.status === 'PENDING' ? 'text-amber-500' : 'text-slate-400'
                                        }`}>
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
