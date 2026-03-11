import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'success' | 'destructive' | 'outline' | 'secondary';
}

export const Badge: React.FC<BadgeProps> = ({ className = '', variant = 'default', ...props }) => {
    const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
    const variants = {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        success: "border-transparent bg-green-600 text-white hover:bg-green-600/80",
        outline: "text-foreground",
    };

    return (
        <div className={`${base} ${variants[variant]} ${className}`} {...props} />
    );
}
