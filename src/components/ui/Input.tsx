import React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', ...props }, ref) => {
        return (
            <input
                className={`flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A72FF] focus-visible:border-[#4A72FF] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = 'Input';
