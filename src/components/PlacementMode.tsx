import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DropAnimation,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useMemo, useState } from 'react'
import { AutoPlaceBar } from './AutoPlaceBar'
import { EmptyState } from './EmptyState'
import { IdeaCard } from './IdeaCard'
import { CalendarChipVisual, MonthCalendar } from './MonthCalendar'
import { SmartSearchBar } from './SmartSearchBar'
import { InstagramIcon, YoutubeIcon } from './ChannelBadge'
import { useSmartSearch } from '../hooks/useSmartSearch'
import {
  suggestMonthlyPlacement,
  type PlacementSuggestion,
} from '../lib/autoPlace'
import type { CalendarFilters } from '../lib/calendarFilters'
import {
  accentForCategoryId,
  categoryAccentMap,
} from '../lib/categoryOrder'
import { CHANNEL_COLORS, PILL_IDLE } from '../lib/colors'
import type { AppMeta, Category, Idea, IdeaStatus } from '../types'

interface PlacementModeProps {
  month: Date
  onMonthChange: (date: Date) => void
  ideas: Idea[]
  categories: Category[]
  appMeta: AppMeta | null
  onOpenIdea: (idea: Idea) => void
  onAddForDate: (dateStr: string) => void
  onSchedule: (ideaId: string, date: string) => Promise<unknown>
  onStatusChange: (ideaId: string, status: IdeaStatus) => Promise<unknown>
  onApplySuggestions: (suggestions: PlacementSuggestion[]) => Promise<void>
  filters: CalendarFilters
  onFiltersChange: (filters: CalendarFilters) => void
  onToast: (message: string) => void
}

const dropAnimation: DropAnimation = {
  duration: 280,
  easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: { opacity: '0.4' },
    },
  }),
}

const calendarCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  if (hits.length > 0) return hits
  return closestCenter(args)
}

export function PlacementMode({
  month,
  onMonthChange,
  ideas,
  categories,
  appMeta,
  onOpenIdea,
  onAddForDate,
  onSchedule,
  onStatusChange,
  onApplySuggestions,
  filters,
  onFiltersChange,
  onToast,
}: PlacementModeProps) {
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(true)
  const [channelFilter, setChannelFilter] = useState<
    'all' | 'instagram' | 'youtube'
  >('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeFrom, setActiveFrom] = useState<'list' | 'calendar' | null>(
    null,
  )
  const [suggestions, setSuggestions] = useState<PlacementSuggestion[] | null>(
    null,
  )
  const [placing, setPlacing] = useState(false)

  const search = useSmartSearch(ideas, categories)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  )

  const accentMap = useMemo(
    () => categoryAccentMap(categories),
    [categories],
  )

  const displayIdeas = useMemo(() => {
    return search.filtered.filter((idea) => {
      if (showUnassignedOnly && idea.scheduled_date) return false
      if (channelFilter !== 'all' && !idea.channels.includes(channelFilter)) {
        return false
      }
      return true
    })
  }, [search.filtered, showUnassignedOnly, channelFilter])

  const activeIdea = activeId
    ? ideas.find((i) => i.id === activeId) ?? null
    : null

  function handleDragStart(event: DragStartEvent) {
    const ideaId = String(event.active.data.current?.ideaId ?? '')
    const from = event.active.data.current?.from
    setActiveId(ideaId || null)
    setActiveFrom(from === 'calendar' ? 'calendar' : 'list')
  }

  async function handleDragEnd(event: DragEndEvent) {
    const ideaId = String(event.active.data.current?.ideaId ?? '')
    const overId = event.over?.id
    setActiveId(null)
    setActiveFrom(null)
    if (!ideaId || !overId) return

    const over = String(overId)
    if (!over.startsWith('date-')) return
    const date = over.replace('date-', '')
    const idea = ideas.find((i) => i.id === ideaId)
    if (idea?.scheduled_date === date) return
    await onSchedule(ideaId, date)
  }

  async function generateSuggestions() {
    setPlacing(true)
    const result = await suggestMonthlyPlacement({
      ideas,
      meta: appMeta,
      month,
      preferredWeekdays: [1, 2, 3, 4, 5],
    })
    setPlacing(false)

    if (result === null) {
      onToast('자동 배치 제안 실패 — 잠시 후 다시 시도하세요')
      return
    }
    if (result.length === 0) {
      onToast('미배정 아이디어가 없습니다')
      setSuggestions([])
      return
    }
    setSuggestions(result)
    onToast(`배치 제안 ${result.length}건 미리보기`)
  }

  async function applySuggestions() {
    if (!suggestions?.length) return
    await onApplySuggestions(suggestions)
    setSuggestions(null)
    onToast('배치가 적용되었습니다')
  }

  return (
    <div className="space-y-4">
      <AutoPlaceBar
        month={month}
        loading={placing}
        suggestions={suggestions}
        onGenerate={() => void generateSuggestions()}
        onApply={() => void applySuggestions()}
        onRetry={() => void generateSuggestions()}
        onCancel={() => setSuggestions(null)}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={calendarCollision}
        onDragStart={handleDragStart}
        onDragEnd={(e) => void handleDragEnd(e)}
        onDragCancel={() => {
          setActiveId(null)
          setActiveFrom(null)
        }}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
          <MonthCalendar
            month={month}
            onMonthChange={onMonthChange}
            ideas={ideas}
            categories={categories}
            onOpenIdea={onOpenIdea}
            onAddForDate={onAddForDate}
            onStatusChange={onStatusChange}
            onSchedule={onSchedule}
            filters={filters}
            onFiltersChange={onFiltersChange}
            dndMode="external"
            suggestions={suggestions}
          />

          <aside className="flex max-h-[720px] flex-col rounded-2xl bg-white p-4 shadow-[var(--shadow)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
                아이디어 리스트
              </h3>
              <div className="inline-flex rounded-xl bg-[#f5f5f7] p-0.5">
                <button
                  type="button"
                  onClick={() => setShowUnassignedOnly(true)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    showUnassignedOnly
                      ? 'bg-white text-[#1d1d1f] shadow-sm'
                      : 'text-[#6e6e73]'
                  }`}
                >
                  미배정
                </button>
                <button
                  type="button"
                  onClick={() => setShowUnassignedOnly(false)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    !showUnassignedOnly
                      ? 'bg-white text-[#1d1d1f] shadow-sm'
                      : 'text-[#6e6e73]'
                  }`}
                >
                  전체
                </button>
              </div>
            </div>

            <div className="mb-3">
              <SmartSearchBar
                search={search}
                categories={categories}
                placeholder="리스트 검색 / AI 검색…"
              />
            </div>

            <div className="mb-3 flex gap-1.5">
              <button
                type="button"
                onClick={() => setChannelFilter('all')}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ${
                  channelFilter === 'all'
                    ? 'bg-[#1d1d1f] text-white shadow-sm'
                    : PILL_IDLE
                }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('instagram')}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ${
                  channelFilter === 'instagram'
                    ? CHANNEL_COLORS.instagram.pillActive
                    : CHANNEL_COLORS.instagram.pillIdle
                }`}
              >
                <InstagramIcon className="h-3 w-3" />
                인스타
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('youtube')}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ${
                  channelFilter === 'youtube'
                    ? CHANNEL_COLORS.youtube.pillActive
                    : CHANNEL_COLORS.youtube.pillIdle
                }`}
              >
                <YoutubeIcon className="h-3 w-3" />
                유튜브
              </button>
            </div>

            <p className="mb-2 hidden text-[11px] text-[#aeaeb2] md:block">
              카드를 왼쪽 날짜로 드래그해 배정하세요
            </p>
            <p className="mb-2 text-[11px] text-[#aeaeb2] md:hidden">
              모바일에서는 상세에서 일정을 지정하세요
            </p>

            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {displayIdeas.length === 0 ? (
                <EmptyState
                  title="표시할 아이디어가 없습니다"
                  description="필터를 바꾸거나 새 아이디어를 추가해 보세요."
                />
              ) : (
                displayIdeas.map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    category={
                      idea.category_id
                        ? categoryMap[idea.category_id]
                        : undefined
                    }
                    onClick={() => onOpenIdea(idea)}
                    muted={Boolean(idea.scheduled_date)}
                    draggable
                    dragData={{ from: 'list' }}
                    compact
                  />
                ))
              )}
            </div>
          </aside>
        </div>

        <DragOverlay dropAnimation={dropAnimation} adjustScale={false}>
          {activeIdea ? (
            activeFrom === 'calendar' ? (
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
            ) : (
              <div className="w-56 origin-top-left scale-[1.03]">
                <IdeaCard
                  idea={activeIdea}
                  category={
                    activeIdea.category_id
                      ? categoryMap[activeIdea.category_id]
                      : undefined
                  }
                  onClick={() => undefined}
                  compact
                  overlay
                />
              </div>
            )
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
