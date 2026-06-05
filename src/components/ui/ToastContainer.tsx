import React from 'react';
import { useToastStore } from '../../store/useToastStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToastStore();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
            {toasts.map((toast) => {
                const isSuccess = toast.type === 'success';
                const isError = toast.type === 'error';
                
                const iconColor = isSuccess 
                    ? 'text-emerald-400' 
                    : isError 
                    ? 'text-rose-400' 
                    : 'text-[#4A72FF]';
                
                const borderColor = isSuccess 
                    ? 'border-emerald-500/30' 
                    : isError 
                    ? 'border-rose-500/30' 
                    : 'border-[#4A72FF]/30';

                const glowColor = isSuccess 
                    ? 'shadow-[0_4px_12px_rgba(16,185,129,0.15)]' 
                    : isError 
                    ? 'shadow-[0_4px_12px_rgba(239,68,68,0.15)]' 
                    : 'shadow-[0_4px_12px_rgba(74,114,255,0.15)]';

                return (
                    <div
                        key={toast.id}
                        className={`flex items-start gap-3 p-4 rounded-xl bg-gradient-to-b from-[#111827] to-[#0b0f19] border ${borderColor} ${glowColor} backdrop-blur-md animate-toast-slide-in pointer-events-auto select-none overflow-hidden relative group`}
                    >
                        <div className="flex-shrink-0 mt-0.5">
                            {isSuccess && <CheckCircle2 className={`w-4 h-4 ${iconColor}`} />}
                            {isError && <AlertCircle className={`w-4 h-4 ${iconColor}`} />}
                            {!isSuccess && !isError && <Info className={`w-4 h-4 ${iconColor}`} />}
                        </div>

                        <div className="flex-1 min-w-0 pr-4">
                            <p className="text-xs font-semibold text-white leading-relaxed break-words">
                                {toast.message}
                            </p>
                        </div>

                        <button
                            onClick={() => removeToast(toast.id)}
                            className="flex-shrink-0 text-zinc-500 hover:text-white hover:bg-white/[0.04] p-1 rounded-md transition-colors cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
