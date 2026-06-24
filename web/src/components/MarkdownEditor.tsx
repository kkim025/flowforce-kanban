import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Bold, 
    Italic, 
    List, 
    Link, 
    Code, 
    Heading, 
    Quote, 
    Strikethrough, 
    Edit3, 
    Eye, 
    Info 
} from 'lucide-react';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const ToolbarButton: React.FC<{ 
    onClick: () => void; 
    icon: React.ElementType; 
    label: string 
}> = ({ onClick, icon: Icon, label }) => (
    <button
        type="button"
        onClick={(e) => {
            e.preventDefault();
            onClick();
        }}
        className="p-1.5 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg text-slate-500 hover:text-accent-blue transition-all group relative"
        title={label}
    >
        <Icon className="w-3.5 h-3.5" />
    </button>
);

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, placeholder }) => {
    const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const insertMarkdown = (prefix: string, suffix: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        const before = value.substring(0, start);
        const after = value.substring(end);

        const placeholderText = selectedText || 'text';
        const newText = `${prefix}${placeholderText}${suffix}`;
        onChange(before + newText + after);

        // Reset cursor position after React re-renders
        setTimeout(() => {
            textarea.focus();
            if (selectedText) {
                textarea.setSelectionRange(
                    start + prefix.length,
                    start + prefix.length + selectedText.length
                );
            } else {
                textarea.setSelectionRange(
                    start + prefix.length,
                    start + prefix.length + placeholderText.length
                );
            }
        }, 0);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
                <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl border border-white/10">
                    <button
                        onClick={() => setActiveTab('write')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'write'
                                ? 'bg-white dark:bg-slate-900 text-accent-blue shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                        Write
                    </button>
                    <button
                        onClick={() => setActiveTab('preview')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'preview'
                                ? 'bg-white dark:bg-slate-900 text-accent-blue shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                    </button>
                </div>
                
                <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <Info className="w-3 h-3" />
                    Markdown Supported
                </div>
            </div>

            <div className="flex-1 glass rounded-2xl overflow-hidden min-h-[300px] flex flex-col relative group transition-all duration-300 focus-within:ring-2 focus-within:ring-accent-blue/30 border-white/10">
                {activeTab === 'write' && (
                    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-white/5 bg-slate-50/20 dark:bg-slate-900/20 overflow-x-auto no-scrollbar">
                        <ToolbarButton onClick={() => insertMarkdown('**', '**')} icon={Bold} label="Bold" />
                        <ToolbarButton onClick={() => insertMarkdown('*', '*')} icon={Italic} label="Italic" />
                        <ToolbarButton onClick={() => insertMarkdown('~~', '~~')} icon={Strikethrough} label="Strikethrough" />
                        <div className="w-px h-4 bg-white/10 mx-1" />
                        <ToolbarButton onClick={() => insertMarkdown('### ', '')} icon={Heading} label="Heading" />
                        <ToolbarButton onClick={() => insertMarkdown('- ', '')} icon={List} label="Bullet List" />
                        <ToolbarButton onClick={() => insertMarkdown('> ', '')} icon={Quote} label="Quote" />
                        <div className="w-px h-4 bg-white/10 mx-1" />
                        <ToolbarButton onClick={() => insertMarkdown('[', '](url)')} icon={Link} label="Link" />
                        <ToolbarButton onClick={() => insertMarkdown('`', '`')} icon={Code} label="Code" />
                    </div>
                )}
                
                <AnimatePresence mode="wait">
                    {activeTab === 'write' ? (
                        <motion.textarea
                            key="write"
                            ref={textareaRef}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={placeholder || "Describe this task..."}
                            className="flex-1 w-full bg-transparent p-6 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none resize-none font-mono text-sm leading-relaxed custom-scrollbar"
                        />
                    ) : (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 w-full p-6 text-slate-700 dark:text-slate-200 overflow-y-auto custom-scrollbar prose prose-slate dark:prose-invert max-w-none"
                        >
                            {value ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                                    {value}
                                </ReactMarkdown>
                            ) : (
                                <p className="text-slate-400 italic">Nothing to preview</p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default MarkdownEditor;
