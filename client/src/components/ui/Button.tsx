import { type ButtonHTMLAttributes, forwardRef } from 'react';

import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /**
     * `ghostDanger` is the resting state of a destructive control: it reads as quiet
     * until hovered or focused. Rows full of solid red delete buttons made deletion the
     * loudest thing on the screen, which is backwards.
     */
    variant?: 'primary' | 'secondary' | 'danger' | 'ghostDanger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        { className, variant = 'primary', size = 'md', loading, disabled, children, ...props },
        ref,
    ) => {
        const baseClasses = 'btn';
        const variantClasses = {
            primary: 'btn-primary',
            secondary: 'btn-secondary',
            danger: 'btn-danger',
            ghostDanger: 'btn-ghost-danger',
        };
        const sizeClasses = {
            sm: 'btn-sm px-2 py-1 text-sm',
            md: 'px-3 py-2',
            lg: 'px-4 py-3 text-lg',
        };

        return (
            <button
                ref={ref}
                className={cn(
                    baseClasses,
                    variantClasses[variant],
                    sizeClasses[size],
                    loading && 'opacity-50 cursor-not-allowed',
                    className,
                )}
                disabled={disabled || loading}
                {...props}
            >
                {loading ? '...' : children}
            </button>
        );
    },
);

Button.displayName = 'Button';

export default Button;
