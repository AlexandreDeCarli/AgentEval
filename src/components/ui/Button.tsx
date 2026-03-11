import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none ring-offset-background';

        const variants = {
            primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
            secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
            ghost: 'hover:bg-accent hover:text-accent-foreground',
        };

        const sizes = {
            sm: 'h-9 px-3 text-xs',
            md: 'h-10 py-2 px-4 text-sm',
            lg: 'h-11 px-8 text-base',
        };

        const combinedClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

        return (
            <button ref={ref} className={combinedClasses} {...props} />
        );
    }
);

Button.displayName = 'Button';
