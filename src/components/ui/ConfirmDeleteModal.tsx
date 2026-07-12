import React, { useEffect, useId, useRef } from 'react';
import { Trash2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
    /** The type of item being deleted (e.g., "Project", "Mission", "Test Run") */
    itemType: string;
    /** The display name of the item being deleted */
    itemName: string;
    /** Description of what will be permanently lost */
    warningDescription: string;
    /** Optional subtitle shown below the item name (e.g., a timestamp) */
    subtitle?: string;
    /** Called when the user confirms deletion */
    onConfirm: () => void;
    /** Called when the user cancels */
    onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
    itemType,
    itemName,
    warningDescription,
    subtitle,
    onConfirm,
    onCancel,
}) => {
    const onCancelRef = useRef(onCancel);
    const dialogRef = useRef<HTMLDivElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        onCancelRef.current = onCancel;
    }, [onCancel]);

    useEffect(() => {
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        cancelButtonRef.current?.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancelRef.current();
                return;
            }
            if (e.key !== 'Tab' || !dialogRef.current) return;
            const focusable = Array.from(
                dialogRef.current.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            );
            if (focusable.length === 0) {
                e.preventDefault();
                dialogRef.current.focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
            previousFocus?.focus();
        };
    }, []);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with blur and fade-in */}
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-300 animate-modal-fade-in cursor-pointer"
                onClick={onCancel}
                aria-hidden="true"
            />

            {/* Modal panel */}
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                tabIndex={-1}
                className="relative bg-gradient-to-b from-[#111827] to-[#0b0f19] border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.8),_inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl max-w-sm w-full p-6 z-10 animate-modal-scale-in overflow-hidden text-center space-y-6"
            >
                {/* Destructive top accent line */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

                {/* Warning icon with glow */}
                <div className="relative flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                    <Trash2 className="w-8 h-8 text-red-500" />
                </div>

                {/* Title and item name */}
                <div className="space-y-2">
                    <h3 id={titleId} className="text-title text-white">Delete {itemType}?</h3>
                    <p className="text-body text-slate-400">
                        You are about to permanently delete the {itemType.toLowerCase()}:
                    </p>
                    <div className="inline-block font-semibold text-white bg-slate-900/60 border border-white/5 px-3 py-1 rounded-lg text-body max-w-full truncate shadow-inner">
                        "{itemName}"
                    </div>
                    {subtitle && (
                        <span className="text-label text-slate-500 block mt-1">
                            {subtitle}
                        </span>
                    )}
                </div>

                {/* Irreversible warning callout */}
                <div className="bg-red-500/[0.03] border border-red-500/10 p-4 rounded-lg text-left space-y-1">
                    <span className="text-label text-red-400 block">⚠️ Irreversible Action</span>
                    <p id={descriptionId} className="text-body text-slate-400">
                        {warningDescription}
                    </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-2">
                    <button
                        ref={cancelButtonRef}
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white text-label transition-all duration-200 cursor-pointer active:scale-[0.98] border-b-[2px] border-b-black/20 hover:border-white/[0.12]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white text-label shadow-[0_4px_12px_rgba(239,68,68,0.25)] hover:shadow-[0_4px_16px_rgba(239,68,68,0.35)] hover:-translate-y-[1px] transition-all duration-200 cursor-pointer active:scale-[0.98] active:translate-y-0"
                    >
                        Yes, Delete
                    </button>
                </div>
            </div>
        </div>
    );
};
