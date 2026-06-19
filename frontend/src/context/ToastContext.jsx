import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

const ToastContext = createContext(null)

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message, type = 'success') => {
      const id = ++idCounter
      setToasts((current) => [...current, { id, message, type }])
      setTimeout(() => dismiss(id), 4500)
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            {t.type === 'success' ? (
              <CheckCircle2 size={18} strokeWidth={2} />
            ) : (
              <XCircle size={18} strokeWidth={2} />
            )}
            <span className="toast__message">{t.message}</span>
            <button
              className="toast__close"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
