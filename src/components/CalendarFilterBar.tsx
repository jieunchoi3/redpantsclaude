import { Check, ChevronDown, Tags } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CHANNEL_COLORS, STATUS_COLORS } from '../lib/colors'
import type { CalendarFilters } from '../lib/calendarFilters'
import type { Category } from '../types'
import { InstagramIcon, YoutubeIcon } from './ChannelBadge'

interface CalendarFilterBarProps {
  filters: CalendarFilters
  onChange: (next: CalendarFilters) => void
  categories: Category[]
}

export function CalendarFilterBar({
  filters,
  onChange,
  categories,
}: CalendarFilterBarProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const igCategories = useMemo(
    () =>
      categories
        .filter((c) => c.channel === 'instagram')
        .sort((a, b) => a.sort_order - b.sort_order),
    [categories],
  )
  const ytCategories = useMemo(
    () =>
      categories
        .filter((c) => c.channel === 'youtube')
        .sort((a, b) => a.sort_order - b.sort_order),
    [categories],
  )

  const selectedCount = filters.categoryIds.length

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggleChannel(key: 'instagram' | 'youtube' | 'showCompleted') {
    onChange({ ...filters, [key]: !filters[key] })
  }

  function toggleCategory(id: string) {
    const next = filters.categoryIds.includes(id)
      ? filters.categoryIds.filter((x) => x !== id)
      : [...filters.categoryIds, id]
    onChange({ ...filters, categoryIds: next })
  }

  function clearCategories() {
    onChange({ ...filters, categoryIds: [] })
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => toggleChannel('instagram')}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-200 ${
          filters.instagram
            ? CHANNEL_COLORS.instagram.pillActive
            : CHANNEL_COLORS.instagram.pillIdle
        }`}
      >
        <InstagramIcon className="h-3.5 w-3.5" />
        인스타그램
      </button>

      <button
        type="button"
        onClick={() => toggleChannel('youtube')}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-200 ${
          filters.youtube
            ? CHANNEL_COLORS.youtube.pillActive
            : CHANNEL_COLORS.youtube.pillIdle
        }`}
      >
        <YoutubeIcon className="h-3.5 w-3.5" />
        유튜브
      </button>

      <button
        type="button"
        onClick={() => toggleChannel('showCompleted')}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-200 ${
          filters.showCompleted
            ? STATUS_COLORS['업로드 완료'].pill
            : 'bg-white text-[#6e6e73] ring-1 ring-black/[0.06] hover:bg-emerald-50 hover:text-emerald-700 hover:ring-emerald-200'
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            filters.showCompleted ? 'bg-white/90' : 'bg-emerald-500'
          }`}
        />
        업로드 완료
      </button>

      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-200 ${
            selectedCount > 0
              ? 'bg-[#1d1d1f] text-white shadow-sm'
              : 'bg-white text-[#6e6e73] ring-1 ring-black/[0.06] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]'
          }`}
        >
          <Tags className="h-3.5 w-3.5" />
          {selectedCount > 0 ? `카테고리 ${selectedCount}` : '카테고리'}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        {open && (
          <div className="absolute top-[calc(100%+8px)] right-0 z-50 w-[260px] rounded-2xl bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5 sm:left-0 sm:right-auto">
            <div className="mb-1.5 flex items-center justify-between px-2 py-1">
              <span className="text-[11px] font-medium text-[#aeaeb2]">
                복수 선택 가능
              </span>
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={clearCategories}
                  className="text-[11px] font-medium text-[#6e6e73] transition hover:text-[#1d1d1f]"
                >
                  초기화
                </button>
              )}
            </div>

            <CategorySection
              title="인스타그램"
              icon={<InstagramIcon className="h-3.5 w-3.5 text-pink-500" />}
              items={igCategories}
              selectedIds={filters.categoryIds}
              onToggle={toggleCategory}
              emptyLabel="인스타 카테고리 없음"
            />

            <div className="my-1.5 border-t border-black/5" />

            <CategorySection
              title="유튜브"
              icon={<YoutubeIcon className="h-3.5 w-3.5 text-red-500" />}
              items={ytCategories}
              selectedIds={filters.categoryIds}
              onToggle={toggleCategory}
              emptyLabel="유튜브 카테고리 없음"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function CategorySection({
  title,
  icon,
  items,
  selectedIds,
  onToggle,
  emptyLabel,
}: {
  title: string
  icon: React.ReactNode
  items: Category[]
  selectedIds: string[]
  onToggle: (id: string) => void
  emptyLabel: string
}) {
  return (
    <div className="px-1 py-1">
      <div className="mb-1 flex items-center gap-1.5 px-1.5 py-1 text-[11px] font-semibold text-[#6e6e73]">
        {icon}
        {title}
      </div>
      {items.length === 0 ? (
        <p className="px-2 py-2 text-[11px] text-[#aeaeb2]">{emptyLabel}</p>
      ) : (
        <ul className="max-h-40 space-y-0.5 overflow-y-auto">
          {items.map((cat) => {
            const checked = selectedIds.includes(cat.id)
            const dot =
              cat.channel === 'instagram' ? 'bg-pink-500' : 'bg-red-500'
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => onToggle(cat.id)}
                  className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[12px] transition ${
                    checked
                      ? 'bg-[#f5f5f7] font-medium text-[#1d1d1f]'
                      : 'text-[#1d1d1f] hover:bg-[#f5f5f7]'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition ${
                      checked
                        ? 'border-[#1d1d1f] bg-[#1d1d1f] text-white'
                        : 'border-[#d2d2d7] bg-white'
                    }`}
                  >
                    {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                  <span className="min-w-0 flex-1 truncate">{cat.name}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
