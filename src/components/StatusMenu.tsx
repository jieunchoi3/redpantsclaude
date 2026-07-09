import { useEffect, useRef } from 'react'
import { STATUS_COLORS } from '../lib/colors'
import { IDEA_STATUSES, type IdeaStatus } from '../types'

interface StatusMenuProps {
  current: IdeaStatus
  onSelect: (status: IdeaStatus) => void
  onClose: () => void
  anchorRef?: React.RefObject<HTMLElement | null>
}

export function StatusMenu({ current, onSelect, onClose }: StatusMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 z-50 mt-1 min-w-[140px] rounded-xl bg-white p-1 shadow-[var(--shadow)] ring-1 ring-black/5"
      role="menu"
    >
      {IDEA_STATUSES.map((status) => {
        const colors = STATUS_COLORS[status]
        const active = status === current
        return (
          <button
            key={status}
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation()
              onSelect(status)
            }}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition hover:bg-[#f5f5f7] ${
              active ? 'font-semibold text-[#1d1d1f]' : 'text-[#6e6e73]'
            }`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${colors.dot}`} />
            {status}
          </button>
        )
      })}
    </div>
  )
}
