import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Props = {
    ariaLabel: string;
    children: React.ReactNode;
    buttonClassName?: string;
    panelClassName?: string;
    buttonContent?: React.ReactNode;
};

export default function OverflowMenu({
    ariaLabel,
    children,
    buttonClassName,
    panelClassName,
    buttonContent = '⋮',
}: Props) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <button
                aria-label={ariaLabel}
                aria-haspopup="menu"
                aria-expanded={open}
                className={buttonClassName || 'btn btn-secondary px-3 py-2'}
                onClick={() => setOpen(v => !v)}
            >
                {buttonContent}
            </button>
            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            className={
                                panelClassName ||
                                'absolute right-0 mt-2 w-60 card shadow-lg z-20 p-3 space-y-2'
                            }
                            role="menu"
                        >
                            {children}
                        </motion.div>
                        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
