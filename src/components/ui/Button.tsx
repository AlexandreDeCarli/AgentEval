import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'success';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center rounded-lg font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A72FF] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer';

        const variants = {
            primary: 'bg-[#4A72FF] text-white hover:bg-[#395CE6] shadow-[0_4px_14px_rgba(74,114,255,0.3)] border border-[#4A72FF]/20',
            secondary: 'bg-white text-black hover:bg-white/90 shadow-md border border-white/10',
            destructive: 'bg-gradient-to-r from-red-600 to-rose-500 text-white hover:from-red-500 hover:to-rose-400 shadow-[0_4px_12px_rgba(220,38,38,0.2)]',
            outline: 'border border-[#2D3036] bg-[#1C2026] text-[#4A72FF] hover:bg-[#272D35] hover:text-[#4A72FF]',
            ghost: 'text-[#4A72FF] hover:bg-white/[0.04]',
            success: 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.2)] border border-emerald-500/20',
        };

        const sizes = {
            sm: 'h-9 px-3 text-label',
            md: 'h-10 py-2 px-4 text-body font-bold',
            lg: 'h-11 px-8 text-base font-bold',
        };

        const combinedClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

        return (
            <button ref={ref} className={combinedClasses} {...props} />
        );
    }
);

Button.displayName = 'Button';
