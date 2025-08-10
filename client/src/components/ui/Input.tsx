import { forwardRef, InputHTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: string;
    label?: string;
    helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = 'text', error, label, helperText, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="space-y-1 flex-1">
                {label && (
                    <label htmlFor={inputId} className="block text-sm font-medium">
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    type={type}
                    className={cn(
                        'input w-full',
                        error && 'border-red-500 focus:border-red-500',
                        className,
                    )}
                    ref={ref}
                    {...props}
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                {helperText && !error && (
                    <p className="text-sm text-[var(--text-dim)]">{helperText}</p>
                )}
            </div>
        );
    },
);

Input.displayName = 'Input';

export default Input;
