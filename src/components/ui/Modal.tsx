import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'default' | 'xl' | 'full';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'default' }) => {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        default: 'max-w-lg rounded-xl',
        xl: 'max-w-4xl rounded-xl',
        full: 'max-w-[95vw] w-full h-[95vh] rounded-xl'
    };

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-all flex justify-center items-center p-4">
            <div
                className="fixed inset-0"
                onClick={onClose}
            />
            <div className={`relative z-50 flex flex-col w-full border bg-background shadow-lg overflow-hidden ${sizeClasses[size]}`}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border bg-card">
                    <h2 className="text-xl font-bold leading-none tracking-tight">{title}</h2>
                    <button
                        className="p-2 rounded-md hover:bg-muted transition-colors cursor-pointer"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>

                {/* Footer (Optional) */}
                <div className="flex justify-end p-4 border-t border-border bg-muted/30">
                    <button
                        className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
