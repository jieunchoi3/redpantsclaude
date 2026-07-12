export type JieunCalendarMode = 'week' | 'month'

export function CalendarViewToggle({
  value,
  onChange,
}: {
  value: JieunCalendarMode
  onChange: (value: JieunCalendarMode) => void
}) {
  return (
    <div
      className="inline-flex rounded-xl bg-[#ebebed] p-1"
      role="tablist"
      aria-label="캘린더 보기"
    >
      {(
        [
          { id: 'week', label: '주간' },
          { id: 'month', label: '월간' },
        ] as const
      ).map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          onClick={() => onChange(option.id)}
          className={`rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition ${
            value === option.id
              ? 'bg-white text-[#1d1d1f] shadow-sm'
              : 'text-[#6e6e73] hover:text-[#1d1d1f]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
