import { useEffect, useRef, useState } from 'react';
import { animate, useMotionValue } from 'framer-motion';

interface NumberTickerProps {
    value: number;
    formatter?: (value: number) => string;
}

const defaultFormatter = (value: number) => value.toLocaleString();

/**
 * Q65: the motion value used to start at `0` and animate up on mount, so switching the
 * Active/Inactive tab replayed a 0.6 s count-up on every card, and the initial `text`
 * state was a hardcoded unformatted `'0'`. It now renders the real value immediately and
 * only animates when the value actually changes.
 */
export default function NumberTicker({ value, formatter = defaultFormatter }: NumberTickerProps) {
    const motionValue = useMotionValue(value);
    const [text, setText] = useState(() => formatter(value));
    const isFirstRender = useRef(true);

    useEffect(() => {
        const unsubscribe = motionValue.on('change', latest =>
            setText(formatter(Math.round(latest))),
        );
        // Re-render the current value when the formatter changes (currency or locale
        // switch) without waiting for the next animation.
        setText(formatter(Math.round(motionValue.get())));
        return unsubscribe;
    }, [motionValue, formatter]);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            motionValue.set(value);
            return;
        }
        const controls = animate(motionValue, value, { duration: 0.6, ease: 'easeOut' });
        return () => controls.stop();
    }, [motionValue, value]);

    return <span>{text}</span>;
}
