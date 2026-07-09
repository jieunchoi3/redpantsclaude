import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarFilterBar } from './CalendarFilterBar'
import { InstagramIcon, YoutubeIcon } from './ChannelBadge'
import { StatusMenu } from './StatusMenu'
import { STATUS_COLORS, type CategoryAccent } from '../lib/colors'
import {
  accentForCategoryId,
  categoryAccentMap,
  shortCategoryLabel,
} from '../lib/categoryOrder'
import {
  isDimmedByFilter,
  isHiddenByFilter,
  isOverdue,
  type CalendarFilters,
} from '../lib/calendarFilters'
import type { Category, Idea, IdeaStatus } from '../types'
import type { PlacementSuggestion } from '../lib/autoPlace'

interface MonthCalendarProps {
  month: Date
  onMonthChange: (date: Date) => void
  ideas: Idea[]
  categories?: Category[]
  onOpenIdea: (idea: Idea) => void
  onAddForDate: (dateStr: string) => void
  onStatusChange: (ideaId: string, status: IdeaStatus) => Promise<unknown>
  /** 칩을 날짜로 드롭했을 때 scheduled_date 갱신 */
  onSchedule?: (ideaId: string, date: string) => Promise<unknown>
  filters: CalendarFilters
  onFiltersChange: (filters: CalendarFilters) => void
  /**
   * self: 이 컴포넌트가 DndContext를 소유 (월간 캘린더 뷰)
   * external: 부모가 DndContext를 소유 (배치 모드)
   * none: 드래그 비활성
   */
  dndMode?: 'self' | 'external' | 'none'
  showFilterBar?: boolean
  suggestions?: PlacementSuggestion[] | null
}

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

const dropAnimation: DropAnimation = {
  duration: 280,
  easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.4' } },
  }),
}

const calendarCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  if (hits.length > 0) return hits
  return closestCenter(args)
}

export function MonthCalendar({
  month,
  onMonthChange,
  ideas,
  categories = [],
  onOpenIdea,
  onAddForDate,
  onStatusChange,
  onSchedule,
  filters,
  onFiltersChange,
  dndMode = 'none',
  showFilterBar = true,
  suggestions = null,
}: MonthCalendarProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const dragEnabled = dndMode !== 'none' && Boolean(onSchedule)

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [month])

  const ideasByDate = useMemo(() => {
    const map = new Map<string, Idea[]>()
    for (const idea of ideas) {
      if (!idea.scheduled_date) continue
      if (isHiddenByFilter(idea, filters)) continue
      const list = map.get(idea.scheduled_date) ?? []
      list.push(idea)
      map.set(idea.scheduled_date, list)
    }
    return map
  }, [ideas, filters])

  const suggestionsByDate = useMemo(() => {
    const map = new Map<string, Idea[]>()
    if (!suggestions?.length) return map
    const ideaMap = Object.fromEntries(ideas.map((i) => [i.id, i]))
    for (const s of suggestions) {
      const idea = ideaMap[s.idea_id]
      if (!idea) continue
      const list = map.get(s.date) ?? []
      list.push(idea)
      map.set(s.date, list)
    }
    return map
  }, [suggestions, ideas])

  const activeIdea = activeId
    ? ideas.find((i) => i.id === activeId) ?? null
    : null

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  )

  const accentMap = useMemo(
    () => categoryAccentMap(categories),
    [categories],
  )

  function handleDragStart(event: DragStartEvent) {
    const ideaId = String(event.active.data.current?.ideaId ?? '')
    setActiveId(ideaId || null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const ideaId = String(event.active.data.current?.ideaId ?? '')
    const overId = event.over?.id
    setActiveId(null)
    if (!ideaId || !overId || !onSchedule) return

    const over = String(overId)
    if (!over.startsWith('date-')) return
    const date = over.replace('date-', '')
    const idea = ideas.find((i) => i.id === ideaId)
    if (!idea || idea.scheduled_date === date) return
    await onSchedule(ideaId, date)
  }

  const grid = (
    <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow)] sm:p-5">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3 sm:justify-start">
          <h2 className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
            {format(month, 'yyyy년 M월', { locale: ko })}
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onMonthChange(subMonths(month, 1))}
              className="rounded-xl p-2 text-[#6e6e73] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onMonthChange(new Date())}
              className="rounded-xl px-3 py-1.5 text-[12px] font-medium text-[#6e6e73] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
            >
              오늘
            </button>
            <button
              type="button"
              onClick={() => onMonthChange(addMonths(month, 1))}
              className="rounded-xl p-2 text-[#6e6e73] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        {showFilterBar && (
          <CalendarFilterBar
            filters={filters}
            onChange={onFiltersChange}
            categories={categories}
          />
        )}
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="min-w-[1260px]">
          <div className="mb-1 grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-1.5 text-center text-[12px] font-medium text-[#aeaeb2]"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayIdeas = ideasByDate.get(dateStr) ?? []
              return (
                <CalendarDayCell
                  key={dateStr}
                  day={day}
                  dateStr={dateStr}
                  inMonth={isSameMonth(day, month)}
                  ideas={dayIdeas}
                  suggestedIdeas={suggestionsByDate.get(dateStr) ?? []}
                  filters={filters}
                  dragEnabled={dragEnabled}
                  categoryMap={categoryMap}
                  accentMap={accentMap}
                  onOpenIdea={onOpenIdea}
                  onAddForDate={onAddForDate}
                  onStatusChange={onStatusChange}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

  if (dndMode === 'self' && dragEnabled) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={calendarCollision}
        onDragStart={handleDragStart}
        onDragEnd={(e) => void handleDragEnd(e)}
        onDragCancel={() => setActiveId(null)}
      >
        {grid}
        <DragOverlay dropAnimation={dropAnimation} adjustScale={false}>
          {activeIdea ? (
            <div className="w-[220px] origin-top-left scale-[1.04]">
              <CalendarChipVisual
                idea={activeIdea}
                category={
                  activeIdea.category_id
                    ? categoryMap[activeIdea.category_id]
                    : undefined
                }
                categoryAccent={accentForCategoryId(
                  activeIdea.category_id,
                  accentMap,
                )}
                overlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    )
  }

  return grid
}

function CalendarDayCell({
  day,
  dateStr,
  inMonth,
  ideas,
  suggestedIdeas,
  filters,
  dragEnabled,
  categoryMap,
  accentMap,
  onOpenIdea,
  onAddForDate,
  onStatusChange,
}: {
  day: Date
  dateStr: string
  inMonth: boolean
  ideas: Idea[]
  suggestedIdeas: Idea[]
  filters: CalendarFilters
  dragEnabled: boolean
  categoryMap: Record<string, Category>
  accentMap: Record<string, CategoryAccent>
  onOpenIdea: (idea: Idea) => void
  onAddForDate: (dateStr: string) => void
  onStatusChange: (ideaId: string, status: IdeaStatus) => Promise<unknown>
}) {
  const [showAll, setShowAll] = useState(false)
  const { setNodeRef, isOver } = useDroppable({
    id: `date-${dateStr}`,
    data: { type: 'date', date: dateStr },
    disabled: !dragEnabled,
  })

  const visible = ideas.slice(0, 3)
  const overflow = ideas.length - 3

  return (
    <div
      ref={setNodeRef}
      className={`group relative flex min-h-[190px] flex-col rounded-xl border p-2.5 transition-all duration-150 ${
        inMonth
          ? 'border-transparent bg-[#fafafa]'
          : 'border-transparent bg-transparent opacity-40'
      } ${
        isOver
          ? 'scale-[1.01] bg-blue-50 ring-2 ring-blue-300 ring-offset-1'
          : ''
      } ${isToday(day) && !isOver ? 'ring-1 ring-[#1d1d1f]/15' : ''}`}
    >
      <div className="mb-1 flex shrink-0 items-center justify-between">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-medium ${
            isToday(day) ? 'bg-[#1d1d1f] text-white' : 'text-[#1d1d1f]'
          }`}
        >
          {format(day, 'd')}
        </span>
        <button
          type="button"
          onClick={() => onAddForDate(dateStr)}
          className="rounded-md p-0.5 text-[#aeaeb2] opacity-0 transition group-hover:opacity-100 hover:bg-white hover:text-[#1d1d1f] md:opacity-0"
          title="이 날짜에 아이디어 추가"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
        {visible.map((idea) => (
          <CalendarIdeaChip
            key={idea.id}
            idea={idea}
            category={
              idea.category_id ? categoryMap[idea.category_id] : undefined
            }
            categoryAccent={accentForCategoryId(idea.category_id, accentMap)}
            dimmed={isDimmedByFilter(idea, filters)}
            dragEnabled={dragEnabled}
            onOpen={() => onOpenIdea(idea)}
            onStatusChange={onStatusChange}
          />
        ))}
        {suggestedIdeas.map((idea) => (
          <div
            key={`suggest-${idea.id}`}
            className="truncate rounded-md border border-dashed border-blue-300 bg-blue-50/70 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 opacity-70"
            title="자동 배치 제안 (미적용)"
          >
            {idea.title || '제목 없음'}
          </div>
        ))}
        {overflow > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="px-1 text-left text-[10px] font-medium text-[#6e6e73] transition hover:text-[#1d1d1f]"
          >
            +{overflow} 더보기
          </button>
        )}
      </div>

      {showAll && (
        <DayOverflowPopover
          dateStr={dateStr}
          ideas={ideas}
          filters={filters}
          dragEnabled={dragEnabled}
          categoryMap={categoryMap}
          accentMap={accentMap}
          onClose={() => setShowAll(false)}
          onOpenIdea={onOpenIdea}
          onStatusChange={onStatusChange}
        />
      )}
    </div>
  )
}

function DayOverflowPopover({
  dateStr,
  ideas,
  filters,
  dragEnabled,
  categoryMap,
  accentMap,
  onClose,
  onOpenIdea,
  onStatusChange,
}: {
  dateStr: string
  ideas: Idea[]
  filters: CalendarFilters
  dragEnabled: boolean
  categoryMap: Record<string, Category>
  accentMap: Record<string, CategoryAccent>
  onClose: () => void
  onOpenIdea: (idea: Idea) => void
  onStatusChange: (ideaId: string, status: IdeaStatus) => Promise<unknown>
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute top-8 left-0 z-40 w-[240px] rounded-xl bg-white p-2 shadow-[var(--shadow)] ring-1 ring-black/5"
    >
      <p className="mb-1.5 px-1 text-[11px] font-medium text-[#6e6e73]">
        {dateStr}
      </p>
      <div className="max-h-56 space-y-1 overflow-y-auto">
        {ideas.map((idea) => (
          <CalendarIdeaChip
            key={idea.id}
            idea={idea}
            category={
              idea.category_id ? categoryMap[idea.category_id] : undefined
            }
            categoryAccent={accentForCategoryId(idea.category_id, accentMap)}
            dimmed={isDimmedByFilter(idea, filters)}
            dragEnabled={dragEnabled}
            onOpen={() => {
              onOpenIdea(idea)
              onClose()
            }}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </div>
  )
}

function chipFormats(idea: Idea): string[] {
  return [
    idea.channels.includes('instagram') ? idea.ig_format : null,
    idea.channels.includes('youtube') ? idea.yt_format : null,
  ].filter(Boolean) as string[]
}

function chipTooltip(
  idea: Idea,
  category: Category | undefined,
  formats: string[],
): string {
  return [
    idea.title || '제목 없음',
    category?.name ?? '미분류',
    formats.join(' · '),
    idea.status,
  ]
    .filter(Boolean)
    .join(' · ')
}

function CalendarChipContent({
  idea,
  category,
  categoryAccent: catAccent,
  formats,
}: {
  idea: Idea
  category?: Category
  categoryAccent: CategoryAccent
  formats: string[]
}) {
  const categoryName = category?.name ?? '미분류'

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex shrink-0 items-center gap-1">
          {idea.channels.includes('instagram') && (
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600 text-white">
              <InstagramIcon className="h-4 w-4" />
            </span>
          )}
          {idea.channels.includes('youtube') && (
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500 text-white">
              <YoutubeIcon className="h-4 w-4" />
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-1">
          {formats.map((fmt) => (
            <span
              key={fmt}
              className="shrink-0 rounded-md bg-[#f0f0f2] px-2 py-1 text-[12px] font-medium leading-none text-[#6e6e73]"
            >
              {fmt}
            </span>
          ))}
        </span>
      </div>

      <span className="line-clamp-2 min-w-0 text-[16px] font-semibold leading-[1.4] text-[#1d1d1f]">
        {idea.title || '제목 없음'}
      </span>

      <span
        className={`inline-flex w-fit max-w-full items-center gap-1.5 truncate rounded-full px-2.5 py-1.5 text-[12px] font-medium leading-none ${catAccent.soft}`}
        title={categoryName}
      >
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${catAccent.dot}`} />
        <span className="truncate">
          {category ? shortCategoryLabel(category.name) : '미분류'}
        </span>
      </span>
    </div>
  )
}

/** 칩 비주얼 — DragOverlay에서도 재사용 */
export function CalendarChipVisual({
  idea,
  category,
  categoryAccent: catAccent,
  overlay,
  dimmed,
  placeholder,
}: {
  idea: Idea
  category?: Category
  categoryAccent: CategoryAccent
  overlay?: boolean
  dimmed?: boolean
  placeholder?: boolean
}) {
  const colors = STATUS_COLORS[idea.status]
  const overdue = isOverdue(idea)
  const formats = chipFormats(idea)

  return (
    <div
      title={chipTooltip(idea, category, formats)}
      className={`relative flex w-full overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/[0.04] ${
        overdue ? 'ring-1 ring-red-400' : ''
      } ${dimmed && !placeholder ? 'opacity-30' : ''} ${
        placeholder ? 'opacity-40' : ''
      } ${
        overlay
          ? 'shadow-[0_12px_28px_rgba(0,0,0,0.16)] ring-1 ring-black/8'
          : ''
      }`}
    >
      <div className={`w-1 min-h-[112px] shrink-0 ${colors.dot}`} />
      <CalendarChipContent
        idea={idea}
        category={category}
        categoryAccent={catAccent}
        formats={formats}
      />
    </div>
  )
}

function CalendarIdeaChip({
  idea,
  category,
  categoryAccent: catAccent,
  dimmed,
  dragEnabled,
  onOpen,
  onStatusChange,
}: {
  idea: Idea
  category?: Category
  categoryAccent: CategoryAccent
  dimmed: boolean
  dragEnabled: boolean
  onOpen: () => void
  onStatusChange: (ideaId: string, status: IdeaStatus) => Promise<unknown>
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const colors = STATUS_COLORS[idea.status]
  const formats = chipFormats(idea)
  const overdue = isOverdue(idea)
  const drag = useDraggable({
    id: `cal-idea-${idea.id}`,
    data: {
      type: 'idea',
      ideaId: idea.id,
      from: 'calendar',
      fromDate: idea.scheduled_date,
    },
    disabled: !dragEnabled,
  })

  const placeholder = drag.isDragging

  return (
    <div
      ref={dragEnabled ? drag.setNodeRef : undefined}
      className="relative"
      title={chipTooltip(idea, category, formats)}
    >
      <div
        className={`relative flex w-full overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/[0.04] ${
          overdue ? 'ring-1 ring-red-400' : ''
        } ${dimmed && !placeholder ? 'opacity-30' : ''} ${
          placeholder ? 'opacity-40' : ''
        }`}
      >
        <div className="relative shrink-0">
          <button
            type="button"
            title={`${idea.status} · 클릭하여 변경`}
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            className={`h-full w-1 min-h-[112px] transition hover:w-[5px] ${colors.dot}`}
          />
          {menuOpen && (
            <StatusMenu
              current={idea.status}
              onClose={() => setMenuOpen(false)}
              onSelect={(status) => {
                setMenuOpen(false)
                void onStatusChange(idea.id, status)
              }}
            />
          )}
        </div>

        <button
          type="button"
          onClick={onOpen}
          className={`flex min-w-0 flex-1 text-left ${
            dragEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
          }`}
          {...(dragEnabled ? { ...drag.listeners, ...drag.attributes } : {})}
        >
          <CalendarChipContent
            idea={idea}
            category={category}
            categoryAccent={catAccent}
            formats={formats}
          />
        </button>
      </div>
    </div>
  )
}
