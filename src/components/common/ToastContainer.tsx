import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { Radio, AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useSocket();

  return (
    <div id="erp_toast_container" className="fixed bottom-6 left-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isBiometric = toast.type === 'biometric';
          const isWarning = toast.type === 'warning';
          const isSuccess = toast.type === 'success';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto p-4 rounded-xl border shadow-lg flex items-start gap-3 backdrop-blur-md ${
                isBiometric
                  ? 'bg-indigo-50 text-slate-800 border-indigo-200 shadow-indigo-100'
                  : isWarning
                  ? 'bg-amber-50 text-slate-800 border-amber-200 shadow-amber-100'
                  : isSuccess
                  ? 'bg-emerald-50 text-slate-800 border-emerald-200'
                  : 'bg-white text-slate-800 border-slate-200 shadow-slate-200'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isBiometric && <Radio className="w-5 h-5 text-indigo-300 animate-pulse" />}
                {isWarning && <AlertCircle className="w-5 h-5 text-amber-300" />}
                {isSuccess && <CheckCircle className="w-5 h-5 text-emerald-300" />}
                {!isBiometric && !isWarning && !isSuccess && <Info className="w-5 h-5 text-sky-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 truncate">{toast.title}</h4>
                  <span className="text-[10px] text-slate-400 shrink-0">{toast.timestamp}</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{toast.message}</p>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
