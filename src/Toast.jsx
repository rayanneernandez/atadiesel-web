import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export const ToastContext = React.createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto animate-slide-in-right"
          >
            <ToastItem {...toast} onClose={() => removeToast(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastItem = ({ message, type, duration, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: { bg: 'bg-white', border: 'border-emerald-500', icon: <CheckCircle className="text-emerald-500" size={20} /> },
    error: { bg: 'bg-white', border: 'border-red-500', icon: <AlertCircle className="text-red-500" size={20} /> },
    warning: { bg: 'bg-white', border: 'border-amber-500', icon: <AlertTriangle className="text-amber-500" size={20} /> },
    info: { bg: 'bg-white', border: 'border-blue-500', icon: <Info className="text-blue-500" size={20} /> },
  };

  const style = styles[type] || styles.info;

  return (
    <div className={`${style.bg} border-l-4 ${style.border} shadow-lg rounded-r-lg p-4 min-w-[300px] max-w-md flex items-start gap-3 transform transition-all hover:scale-[1.02]`}>
      <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
      <div className="flex-1 text-sm font-medium text-slate-700">{message}</div>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
        <X size={16} />
      </button>
    </div>
  );
};