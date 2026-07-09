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
import { STATUS_COLORS } from '../lib/colors'
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

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[11px] font-medium text-[#aeaeb2]"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
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
              onOpenIdea={onOpenIdea}
              onAddForDate={onAddForDate}
              onStatusChange={onStatusChange}
            />
          )
        })}
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
            <div className="w-[160px] origin-top-left scale-[1.04]">
              <CalendarChipVisual idea={activeIdea} overlay />
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
      className={`group relative flex min-h-[88px] flex-col rounded-xl border p-1.5 transition-all duration-150 sm:min-h-[104px] ${
        inMonth
          ? 'border-transparent bg-[#fafafa]'
          : 'border-transparent bg-transparent opacity-40'
      } ${
        isOver
          ? 'scale-[1.01] bg-blue-50 ring-2 ring-blue-300 ring-offset-1'
          : ''
      } ${isToday(day) && !isOver ? 'ring-1 ring-[#1d1d1f]/15' : ''}`}
    >
      <div className="mb-1 flex items-center justify-between">
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

      <div className="flex flex-1 flex-col gap-0.5 overflow-visible">
        {visible.map((idea) => (
          <CalendarIdeaChip
            key={idea.id}
            idea={idea}
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
  onClose,
  onOpenIdea,
  onStatusChange,
}: {
  dateStr: string
  ideas: Idea[]
  filters: CalendarFilters
  dragEnabled: boolean
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
      className="absolute top-8 left-0 z-40 w-[200px] rounded-xl bg-white p-2 shadow-[var(--shadow)] ring-1 ring-black/5"
    >
      <p className="mb-1.5 px-1 text-[11px] font-medium text-[#6e6e73]">
        {dateStr}
      </p>
      <div className="max-h-48 space-y-1 overflow-y-auto">
        {ideas.map((idea) => (
          <CalendarIdeaChip
            key={idea.id}
            idea={idea}
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

/** 칩 비주얼 — DragOverlay에서도 재사용 */
export function CalendarChipVisual({
  idea,
  overlay,
  dimmed,
  placeholder,
}: {
  idea: Idea
  overlay?: boolean
  dimmed?: boolean
  placeholder?: boolean
}) {
  const colors = STATUS_COLORS[idea.status]
  const overdue = isOverdue(idea)
  const formats = [
    idea.channels.includes('instagram') ? idea.ig_format : null,
    idea.channels.includes('youtube') ? idea.yt_format : null,
  ].filter(Boolean) as string[]

  return (
    <div
      className={`relative flex w-full overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/[0.04] ${
        overdue ? 'ring-1 ring-red-400' : ''
      } ${dimmed && !placeholder ? 'opacity-30' : ''} ${
        placeholder ? 'opacity-40' : ''
      } ${
        overlay
          ? 'shadow-[0_12px_28px_rgba(0,0,0,0.16)] ring-1 ring-black/8'
          : ''
      }`}
    >
      <div className={`w-[3px] min-h-[22px] shrink-0 ${colors.dot}`} />
      <div className="flex min-w-0 flex-1 items-center gap-1 px-1.5 py-1">
        <span className="flex shrink-0 items-center gap-0.5">
          {idea.channels.includes('instagram') && (
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600 text-white">
              <InstagramIcon className="h-2.5 w-2.5" />
            </span>
          )}
          {idea.channels.includes('youtube') && (
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] bg-red-500 text-white">
              <YoutubeIcon className="h-2.5 w-2.5" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-[10px] font-medium leading-tight text-[#1d1d1f]">
          {idea.title || '제목 없음'}
        </span>
        {formats.length > 0 && (
          <span className="max-w-[40%] shrink-0 truncate text-[9px] text-[#aeaeb2]">
            {formats.join('·')}
          </span>
        )}
      </div>
    </div>
  )
}

function CalendarIdeaChip({
  idea,
  dimmed,
  dragEnabled,
  onOpen,
  onStatusChange,
}: {
  idea: Idea
  dimmed: boolean
  dragEnabled: boolean
  onOpen: () => void
  onStatusChange: (ideaId: string, status: IdeaStatus) => Promise<unknown>
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const colors = STATUS_COLORS[idea.status]

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
    >
      <div
        className={`relative flex w-full overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/[0.04] ${
          isOverdue(idea) ? 'ring-1 ring-red-400' : ''
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
            className={`h-full w-[3px] min-h-[22px] transition hover:w-[4px] ${colors.dot}`}
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
          className={`flex min-w-0 flex-1 items-center gap-1 px-1.5 py-1 text-left ${
            dragEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
          }`}
          {...(dragEnabled ? { ...drag.listeners, ...drag.attributes } : {})}
        >
          <span className="flex shrink-0 items-center gap-0.5">
            {idea.channels.includes('instagram') && (
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600 text-white">
                <InstagramIcon className="h-2.5 w-2.5" />
              </span>
            )}
            {idea.channels.includes('youtube') && (
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] bg-red-500 text-white">
                <YoutubeIcon className="h-2.5 w-2.5" />
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1 truncate text-[10px] font-medium leading-tight text-[#1d1d1f]">
            {idea.title || '제목 없음'}
          </span>
          {([
            idea.channels.includes('instagram') ? idea.ig_format : null,
            idea.channels.includes('youtube') ? idea.yt_format : null,
          ].filter(Boolean) as string[]).length > 0 && (
            <span className="max-w-[40%] shrink-0 truncate text-[9px] text-[#aeaeb2]">
              {(
                [
                  idea.channels.includes('instagram') ? idea.ig_format : null,
                  idea.channels.includes('youtube') ? idea.yt_format : null,
                ].filter(Boolean) as string[]
              ).join('·')}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
