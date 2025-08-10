import { forwardRef, SelectHTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    options: SelectOption[];
    error?: string;
    label?: string;
    placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, options, error, label, placeholder, id, ...props }, ref) => {
        const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="space-y-1 flex-1">
                {label && (
                    <label htmlFor={selectId} className="block text-sm font-medium">
                        {label}
                    </label>
                )}
                <select
                    id={selectId}
                    className={cn(
                        'input w-full',
                        error && 'border-red-500 focus:border-red-500',
                        className,
                    )}
                    ref={ref}
                    {...props}
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options.map(({ value, label, disabled }) => (
                        <option key={value} value={value} disabled={disabled}>
                            {label}
                        </option>
                    ))}
                </select>
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
        );
    },
);

Select.displayName = 'Select';

export default Select;
