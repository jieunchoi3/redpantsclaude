import { useEffect, useState } from 'react'

interface ToastProps {
  message: string | null
  onClear: () => void
}

export function Toast({ message, onClear }: ToastProps) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onClear, 1800)
    return () => clearTimeout(t)
  }, [message, onClear])

  if (!message) return null

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2">
      <div className="rounded-full bg-[#1d1d1f] px-4 py-2 text-[13px] font-medium text-white shadow-lg">
        {message}
      </div>
    </div>
  )
}

export function useToast() {
  const [message, setMessage] = useState<string | null>(null)
  return {
    message,
    show: (msg: string) => setMessage(msg),
    clear: () => setMessage(null),
  }
}
