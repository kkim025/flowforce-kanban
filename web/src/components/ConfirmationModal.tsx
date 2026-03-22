import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { UI_LABELS } from '../lib/constants';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = UI_LABELS.CONFIRM,
    cancelLabel = UI_LABELS.CANCEL,
    onConfirm,
    onCancel,
    variant = 'danger'
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10"
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className={`p-2 rounded-xl ${
                                    variant === 'danger' ? 'bg-red-500/10 text-red-500' : 
                                    variant === 'warning' ? 'bg-amber-500/10 text-amber-500' : 
                                    'bg-blue-500/10 text-blue-500'
                                }`}>
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <button 
                                    onClick={onCancel}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{title}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                {message}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 p-6 bg-slate-50 dark:bg-white/5">
                            <button
                                onClick={onCancel}
                                className="flex-1 px-4 py-3 rounded-2xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onCancel();
                                }}
                                className={`flex-1 px-4 py-3 rounded-2xl font-bold text-sm text-white transition-all shadow-lg shadow-current/20 ${
                                    variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 
                                    variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600' : 
                                    'bg-accent-blue hover:bg-blue-600'
                                }`}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmationModal;
