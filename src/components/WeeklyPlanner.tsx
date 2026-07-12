import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isToday,
  startOfWeek,
  subWeeks,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Account, Category, Idea } from '../types'
import type { IdeaUpdate } from '../lib/ideas'
import { accountColor } from '../lib/accounts'
import { STATUS_COLORS } from '../lib/colors'

interface WeeklyPlannerProps {
  weekAnchor: Date
  onWeekChange: (date: Date) => void
  accounts: Account[]
  ideas: Idea[]
  categories: Category[]
  selectedAccountIds: string[]
  onCreate: (accountId: string, date: string) => void
  onOpenIdea: (idea: Idea) => void
  onMove: (ideaId: string, patch: IdeaUpdate) => Promise<unknown>
}

const weekCollision: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args)
  return pointerHits.length > 0 ? pointerHits : closestCenter(args)
}

export function WeeklyPlanner({
  weekAnchor,
  onWeekChange,
  accounts,
  ideas,
  categories,
  selectedAccountIds,
  onCreate,
  onOpenIdea,
  onMove,
}: WeeklyPlannerProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(weekAnchor, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category])),
    [categories],
  )
  const ideasByCell = useMemo(() => {
    const map = new Map<string, Idea[]>()
    for (const idea of ideas) {
      if (!idea.account_id || !idea.scheduled_date) continue
      const key = `${idea.account_id}:${idea.scheduled_date}`
      const list = map.get(key) ?? []
      list.push(idea)
      map.set(key, list)
    }
    return map
  }, [ideas])

  const activeIdea = activeId
    ? ideas.find((idea) => idea.id === activeId) ?? null
    : null

  function handleDragStart(event: DragStartEvent) {
    const ideaId = String(event.active.data.current?.ideaId ?? '')
    setActiveId(ideaId || null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const ideaId = String(event.active.data.current?.ideaId ?? '')
    const accountId = String(event.over?.data.current?.accountId ?? '')
    const date = String(event.over?.data.current?.date ?? '')
    setActiveId(null)
    if (!ideaId || !accountId || !date) return

    const idea = ideas.find((item) => item.id === ideaId)
    if (
      !idea ||
      (idea.account_id === accountId && idea.scheduled_date === date)
    ) {
      return
    }
    await onMove(ideaId, { account_id: accountId, scheduled_date: date })
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-[var(--shadow)]">
      <div className="flex flex-col gap-3 border-b border-black/[0.05] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[12px] font-medium text-[#86868b]">주간 플래너</p>
          <h2 className="mt-0.5 text-[18px] font-semibold tracking-tight text-[#1d1d1f]">
            {format(weekStart, 'M/d')} – {format(weekEnd, 'M/d')}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onWeekChange(subWeeks(weekAnchor, 1))}
            aria-label="이전 주"
            className="rounded-xl p-2 text-[#6e6e73] transition hover:bg-[#f5f5f7]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onWeekChange(new Date())}
            className="rounded-xl px-3 py-2 text-[12px] font-medium text-[#6e6e73] transition hover:bg-[#f5f5f7]"
          >
            오늘
          </button>
          <button
            type="button"
            onClick={() => onWeekChange(addWeeks(weekAnchor, 1))}
            aria-label="다음 주"
            className="rounded-xl p-2 text-[#6e6e73] transition hover:bg-[#f5f5f7]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={weekCollision}
        onDragStart={handleDragStart}
        onDragEnd={(event) => void handleDragEnd(event)}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="overflow-auto">
          <div className="min-w-[1240px]">
            <div className="grid grid-cols-[180px_repeat(7,minmax(145px,1fr))] border-b border-black/[0.05] bg-[#fafafa]">
              <div className="sticky left-0 z-10 border-r border-black/[0.05] bg-[#fafafa] px-4 py-3 text-[11px] font-semibold text-[#aeaeb2]">
                계정
              </div>
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className="border-r border-black/[0.04] px-3 py-3 text-center last:border-r-0"
                >
                  <p className="text-[11px] font-medium text-[#86868b]">
                    {format(day, 'EEE', { locale: ko })}
                  </p>
                  <span
                    className={`mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold ${
                      isToday(day)
                        ? 'bg-[#1d1d1f] text-white'
                        : 'text-[#1d1d1f]'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
              ))}
            </div>

            {accounts.map((account, accountIndex) => {
              const color = accountColor(account, accountIndex)
              const dimmed =
                selectedAccountIds.length > 0 &&
                !selectedAccountIds.includes(account.id)
              return (
                <div
                  key={account.id}
                  className={`grid grid-cols-[180px_repeat(7,minmax(145px,1fr))] border-b border-black/[0.05] last:border-b-0 transition-opacity ${
                    dimmed ? 'opacity-35' : ''
                  }`}
                >
                  <div className="sticky left-0 z-10 flex min-h-[150px] items-start gap-2.5 border-r border-black/[0.05] bg-white px-4 py-4">
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full shadow-sm ring-1 ring-black/5"
                      style={{ backgroundColor: color }}
                    />
                    <span className="min-w-0 text-[13px] font-semibold leading-snug text-[#1d1d1f]">
                      {account.name}
                    </span>
                  </div>

                  {days.map((day) => {
                    const date = format(day, 'yyyy-MM-dd')
                    const cellIdeas =
                      ideasByCell.get(`${account.id}:${date}`) ?? []
                    return (
                      <WeeklyCell
                        key={date}
                        accountId={account.id}
                        date={date}
                        ideas={cellIdeas}
                        categoryMap={categoryMap}
                        onCreate={() => onCreate(account.id, date)}
                        onOpenIdea={onOpenIdea}
                      />
                    )
                  })}
                </div>
              )
            })}

            {accounts.length === 0 && (
              <div className="px-6 py-16 text-center">
                <p className="text-[14px] font-medium text-[#6e6e73]">
                  먼저 계정을 추가해주세요
                </p>
              </div>
            )}
          </div>
        </div>

        <DragOverlay adjustScale={false}>
          {activeIdea ? (
            <div className="w-[150px] rotate-1">
              <WeeklyCardVisual
                idea={activeIdea}
                category={
                  activeIdea.category_id
                    ? categoryMap[activeIdea.category_id]
                    : undefined
                }
                overlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  )
}

function WeeklyCell({
  accountId,
  date,
  ideas,
  categoryMap,
  onCreate,
  onOpenIdea,
}: {
  accountId: string
  date: string
  ideas: Idea[]
  categoryMap: Record<string, Category>
  onCreate: () => void
  onOpenIdea: (idea: Idea) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `week-cell-${accountId}-${date}`,
    data: { type: 'week-cell', accountId, date },
  })

  return (
    <div
      ref={setNodeRef}
      className={`group relative min-h-[150px] border-r border-black/[0.04] p-2.5 last:border-r-0 transition-colors ${
        isOver ? 'bg-blue-50/70 ring-2 ring-inset ring-blue-200' : 'bg-white'
      }`}
    >
      <button
        type="button"
        onClick={onCreate}
        title="이 셀에 아이디어 추가"
        className={`absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-lg text-[#aeaeb2] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f] ${
          ideas.length === 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      <div className="flex flex-col gap-2 pr-1">
        {ideas.map((idea) => (
          <WeeklyIdeaCard
            key={idea.id}
            idea={idea}
            category={
              idea.category_id ? categoryMap[idea.category_id] : undefined
            }
            onOpen={() => onOpenIdea(idea)}
          />
        ))}
      </div>
    </div>
  )
}

function WeeklyIdeaCard({
  idea,
  category,
  onOpen,
}: {
  idea: Idea
  category?: Category
  onOpen: () => void
}) {
  const drag = useDraggable({
    id: `week-idea-${idea.id}`,
    data: { type: 'idea', ideaId: idea.id },
  })
  return (
    <div
      ref={drag.setNodeRef}
      className={drag.isDragging ? 'opacity-35' : ''}
    >
      <button
        type="button"
        onClick={onOpen}
        {...drag.listeners}
        {...drag.attributes}
        className="w-full cursor-grab text-left active:cursor-grabbing"
      >
        <WeeklyCardVisual idea={idea} category={category} />
      </button>
    </div>
  )
}

function WeeklyCardVisual({
  idea,
  category,
  overlay,
}: {
  idea: Idea
  category?: Category
  overlay?: boolean
}) {
  const status = STATUS_COLORS[idea.status]
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-white p-2.5 pl-3.5 ring-1 ring-black/[0.05] ${
        overlay
          ? 'shadow-[0_14px_30px_rgba(0,0,0,0.18)]'
          : 'shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)]'
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${status.dot}`} />
      <span className="inline-flex rounded-md bg-[#f0f0f2] px-1.5 py-0.5 text-[10px] font-medium text-[#6e6e73]">
        {idea.jieun_format ?? '포맷 미정'}
      </span>
      <p className="mt-1.5 line-clamp-2 text-[12px] font-semibold leading-snug text-[#1d1d1f]">
        {idea.title || '제목 없음'}
      </p>
      {category && (
        <p className="mt-1 truncate text-[10px] font-medium text-[#86868b]">
          {category.name}
        </p>
      )}
    </div>
  )
}
