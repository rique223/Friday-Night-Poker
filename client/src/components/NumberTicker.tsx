import { useEffect, useState } from 'react';
import { animate, useMotionValue } from 'framer-motion';

type NumberTickerProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  formatter?: (n: number) => string;
};

export default function NumberTicker({ value, prefix = '', suffix = '', formatter }: NumberTickerProps) {
  const mv = useMotionValue(0);
  const [text, setText] = useState('0');

  useEffect(() => {
    // Initialize text with current value using the latest formatter
    setText((formatter || defaultFormatter)(Math.round(mv.get() as number)));

    const unsubscribe = mv.on('change', (latest) => {
      const rounded = Math.round(latest as number);
      setText((formatter || defaultFormatter)(rounded));
    });
    return unsubscribe;
  }, [formatter]);

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.6, ease: 'easeOut' });
    return controls.stop;
  }, [value]);

  return (
    <span>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}

function defaultFormatter(n: number): string {
  return n.toLocaleString();
}
