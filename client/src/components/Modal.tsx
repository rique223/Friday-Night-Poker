import { ReactNode, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import Button from './ui/Button';

interface ModalProps {
    title: ReactNode;
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg';
}

export default function Modal({ title, open, onClose, children, maxWidth = 'md' }: ModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (open) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'auto';
        };
    }, [open, onClose]);

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 glass"
                        onClick={onClose}
                    />
                    <div className="absolute inset-0 flex items-end sm:items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className={`w-full ${maxWidthClasses[maxWidth]} card shadow-lg`}
                        >
                            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                                <div className="font-semibold">{title}</div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={onClose}
                                    aria-label="Close modal"
                                >
                                    ✕
                                </Button>
                            </div>
                            <div className="p-4">{children}</div>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
