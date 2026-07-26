import { type ReactNode, useCallback, useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

import { usePreferences } from '../contexts/PreferencesContext';

import Button from './ui/Button';

interface ModalProps {
    title: ReactNode;
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg';
}

const maxWidthClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' } as const;

const FOCUSABLE =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ title, open, onClose, children, maxWidth = 'md' }: ModalProps) {
    const { t } = usePreferences();
    const panelRef = useRef<HTMLDivElement>(null);
    const previouslyFocused = useRef<HTMLElement | null>(null);
    const titleId = useId();

    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    const close = useCallback(() => onCloseRef.current(), []);

    useEffect(() => {
        if (!open) return;

        previouslyFocused.current = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                close();
                return;
            }
            if (event.key !== 'Tab' || !panelRef.current) return;

            const focusable = Array.from(
                panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
            ).filter(el => el.offsetParent !== null);

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!first || !last) return;

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        const focusTimer = window.setTimeout(() => {
            const panel = panelRef.current;
            const preferred = panel?.querySelector<HTMLElement>('[data-autofocus]');
            (preferred ?? panel?.querySelector<HTMLElement>(FOCUSABLE))?.focus();
        }, 0);

        return () => {
            window.clearTimeout(focusTimer);
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
            previouslyFocused.current?.focus();
        };
    }, [open, close]);

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 glass"
                        onClick={close}
                    />
                    <div className="absolute inset-0 flex items-end sm:items-center justify-center p-4">
                        <motion.div
                            ref={panelRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={titleId}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className={`w-full ${maxWidthClasses[maxWidth]} card shadow-lg`}
                        >
                            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
                                <div id={titleId} className="font-semibold">
                                    {title}
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={close}
                                    aria-label={t('close')}
                                >
                                    <X size={16} />
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
