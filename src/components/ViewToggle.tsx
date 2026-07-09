import type { ViewMode } from '../types'

interface ViewToggleProps {
  value: ViewMode
  onChange: (view: ViewMode) => void
}

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: 'calendar', label: '월간 캘린더' },
  { id: 'board', label: '아이디어 보드' },
  { id: 'placement', label: '이분할 모드' },
]

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-2xl bg-white p-1 shadow-[var(--shadow-sm)]">
      {VIEWS.map((view) => {
        const active = value === view.id
        return (
          <button
            key={view.id}
            type="button"
            onClick={() => onChange(view.id)}
            className={`rounded-xl px-4 py-2 text-[13px] font-medium transition-all duration-200 ${
              active
                ? 'bg-[#1d1d1f] text-white shadow-sm'
                : 'text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]'
            }`}
          >
            {view.label}
          </button>
        )
      })}
    </div>
  )
}
