'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
}

let toastListeners: ((toasts: Toast[]) => void)[] = []
let toasts: Toast[] = []

function notify() {
  toastListeners.forEach(listener => listener([...toasts]))
}

export function toast(message: string, type: ToastType = 'info') {
  const id = Math.random().toString(36).substring(7)
  toasts.push({ id, message, type })
  notify()
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    notify()
  }, 5000)
}

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setCurrentToasts(newToasts)
    }
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  if (currentToasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {currentToasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md',
            {
              'bg-green-50 text-green-800 border border-green-200': toast.type === 'success',
              'bg-red-50 text-red-800 border border-red-200': toast.type === 'error',
              'bg-blue-50 text-blue-800 border border-blue-200': toast.type === 'info',
              'bg-yellow-50 text-yellow-800 border border-yellow-200': toast.type === 'warning',
            }
          )}
        >
          {toast.type === 'success' && <CheckCircle className="h-5 w-5" />}
          {toast.type === 'error' && <XCircle className="h-5 w-5" />}
          {toast.type === 'info' && <Info className="h-5 w-5" />}
          {toast.type === 'warning' && <AlertCircle className="h-5 w-5" />}
          <p className="flex-1 text-sm font-medium" data-testid="toast-message">{toast.message}</p>
          <button
            onClick={() => {
              toasts = toasts.filter(t => t.id !== toast.id)
              notify()
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

