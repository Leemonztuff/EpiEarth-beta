
// @ts-nocheck
import React, { useEffect, useRef } from 'react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
    onClose?: () => void;
}

const toastIcons = {
    success: '✨',
    error: '❌',
    info: '💡',
    warning: '⚠️'
};

const toastColors = {
    success: 'from-emerald-600/90 to-emerald-800/90 border-emerald-400',
    error: 'from-red-600/90 to-red-800/90 border-red-400',
    info: 'from-blue-600/90 to-blue-800/90 border-blue-400',
    warning: 'from-amber-600/90 to-amber-800/90 border-amber-400'
};

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 3000, onClose }) => {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => onClose?.(), duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    return (
        <div className={`
            animate-[toast-in_0.4s_cubic-bezier(0.34,1.56,0.64,1)]
            flex items-center gap-3 px-5 py-3 rounded-2xl border-2 
            bg-gradient-to-br ${toastColors[type]}
            shadow-[0_0_30px_rgba(0,0,0,0.5),0_0_15px_rgba(255,255,255,0.1)]
            text-white font-bold text-sm
            backdrop-blur-md
            max-w-sm
        `}>
            <span className="text-xl">{toastIcons[type]}</span>
            <span className="flex-1">{message}</span>
            <button 
                onClick={onClose}
                className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
                ✕
            </button>
        </div>
    );
};

export const ToastContainer: React.FC<{ toasts?: any[], removeToast?: (id: string) => void }> = ({ toasts = [], removeToast }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                    <Toast 
                        message={toast.message} 
                        type={toast.type} 
                        onClose={() => removeToast?.(toast.id)} 
                    />
                </div>
            ))}
        </div>
    );
};

// Hook para usar toasts globalmente
export const useToast = () => {
    // Este hook se usaría con el store
    return {
        addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
            console.log(`[TOAST ${type.toUpperCase()}]: ${message}`);
        }
    };
};
