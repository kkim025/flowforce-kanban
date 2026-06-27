import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DropdownProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
    zIndex?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ isOpen, onClose: _onClose, children, className = "", zIndex = "z-50" }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className={`absolute top-full left-0 right-0 mt-2 glass border border-white/10 rounded-xl shadow-2xl ${zIndex} overflow-hidden bg-white dark:bg-slate-900 ${className}`}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Dropdown;
