import { type ReactNode, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MoreVertical } from 'lucide-react';

import Button from './ui/Button';

interface OverflowMenuProps {
    ariaLabel: string;
    children: ReactNode;
    buttonClassName?: string;
    panelClassName?: string;
    buttonContent?: ReactNode;
}

/**
 * Q64: the panel had `role="menu"` but no focusable children handling and no way back to
 * the trigger. Escape now returns focus to the button, and a click outside closes it —
 * the old click-outside overlay existed but the `menuRef` on the archived page was never
 * wired to anything.
 */
export default function OverflowMenu({
    ariaLabel,
    children,
    buttonClassName,
    panelClassName,
    buttonContent,
}: OverflowMenuProps) {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            setOpen(false);
            buttonRef.current?.focus();
        };
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
            setOpen(false);
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('pointerdown', onPointerDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('pointerdown', onPointerDown);
        };
    }, [open]);

    return (
        <div className="relative">
            <Button
                ref={buttonRef}
                variant="secondary"
                aria-label={ariaLabel}
                aria-haspopup="menu"
                aria-expanded={open}
                className={buttonClassName}
                onClick={() => setOpen(value => !value)}
            >
                {buttonContent ?? <MoreVertical size={16} />}
            </Button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        ref={panelRef}
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        role="menu"
                        className={
                            panelClassName ??
                            'absolute right-0 mt-2 w-60 card shadow-lg z-20 p-3 space-y-2'
                        }
                        onClick={event => {
                            const item = (event.target as Element).closest('button, a[href]');
                            if (item && panelRef.current?.contains(item)) setOpen(false);
                        }}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
