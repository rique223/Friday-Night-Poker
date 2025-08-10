import { ButtonHTMLAttributes, forwardRef } from 'react';

import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
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
        };
        const sizeClasses = {
            sm: 'px-2 py-1 text-sm',
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
