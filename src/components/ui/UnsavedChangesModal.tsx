import React, { useEffect, useRef } from 'react';
import { Save, X, LogOut } from 'lucide-react';
import { Button } from './Button';

interface UnsavedChangesModalProps {
    isOpen: boolean;
    onSave: () => void;
    onDiscard: () => void;
    onCancel: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
    isOpen,
    onSave,
    onDiscard,
    onCancel,
}) => {
    const onCancelRef = useRef(onCancel);

    useEffect(() => {
        onCancelRef.current = onCancel;
    }, [onCancel]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancelRef.current();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="fixed inset-0" onClick={onCancel} />
            <div className="relative z-50 w-full max-w-md border border-border bg-background rounded-xl shadow-lg overflow-hidden">
                <div className="p-6 space-y-4">
                    <h2 className="text-title text-white">Unsaved Changes</h2>
                    <p className="text-body text-muted-foreground">
                        You have unsaved changes. What would you like to do?
                    </p>
                </div>
                <div className="flex gap-3 p-6 pt-0">
                    <Button onClick={onSave} className="flex-1 gap-2">
                        <Save className="w-4 h-4" /> Save & Leave
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onDiscard}
                        className="flex-1 gap-2"
                    >
                        <LogOut className="w-4 h-4" /> Discard
                    </Button>
                    <Button variant="outline" onClick={onCancel} className="flex-1 gap-2">
                        <X className="w-4 h-4" /> Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
};
