import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { FreeNotes } from './components/FreeNotes'
import { ViewToggle } from './components/ViewToggle'
import { IdeaBoard } from './components/IdeaBoard'
import { MonthCalendar } from './components/MonthCalendar'
import { PlacementMode } from './components/PlacementMode'
import { IdeaDetailPanel } from './components/IdeaDetailPanel'
import { CategoryManager } from './components/CategoryManager'
import { TrashPanel } from './components/TrashPanel'
import { WeeklyGoalBar } from './components/WeeklyGoalBar'
import { BoardSkeleton, LoadingSkeleton } from './components/EmptyState'
import { SmartSearchBar } from './components/SmartSearchBar'
import { Toast, useToast } from './components/Toast'
import { usePlannerData } from './hooks/usePlannerData'
import { useSmartSearch } from './hooks/useSmartSearch'
import type { PlacementSuggestion } from './lib/autoPlace'
import type { CalendarFilters } from './lib/calendarFilters'
import type { Idea, ViewMode } from './types'

const DEFAULT_FILTERS: CalendarFilters = {
  instagram: false,
  youtube: false,
  showCompleted: false,
  categoryIds: [],
}

export default function App() {
  const [view, setView] = useState<ViewMode>('board')
  const [month, setMonth] = useState(() => new Date())
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCategories, setShowCategories] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [filters, setFilters] = useState<CalendarFilters>(DEFAULT_FILTERS)
  const toast = useToast()

  const {
    ideas,
    archivedIdeas,
    categories,
    appMeta,
    loading,
    error,
    addIdea,
    patchIdea,
    archiveIdea,
    unarchiveIdea,
    removeIdeaForever,
    addCategory,
    renameCategory,
    removeCategory,
    patchGoals,
  } = usePlannerData()

  const boardSearch = useSmartSearch(ideas, categories)

  const selectedIdea = useMemo(() => {
    if (!selectedId) return null
    return (
      ideas.find((i) => i.id === selectedId) ??
      archivedIdeas.find((i) => i.id === selectedId) ??
      null
    )
  }, [selectedId, ideas, archivedIdeas])

  async function handleCreateIdea(scheduledDate?: string | null) {
    const created = await addIdea({
      title: '제목 없음',
      scheduled_date: scheduledDate ?? null,
      status: '기획하기',
    })
    if (created) setSelectedId(created.id)
  }

  function openIdea(idea: Idea) {
    setSelectedId(idea.id)
  }

  async function applyPlacementSuggestions(
    suggestions: PlacementSuggestion[],
  ) {
    await Promise.all(
      suggestions.map((s) =>
        patchIdea(s.idea_id, { scheduled_date: s.date }),
      ),
    )
  }

  const showCalendarChrome = view === 'calendar' || view === 'placement'

  return (
    <div className="flex h-svh overflow-hidden bg-[#F5F5F7]">
      <FreeNotes />

      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 py-5 sm:px-8 sm:py-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="shrink-0">
              <p className="text-[13px] font-medium tracking-wide text-[#6e6e73]">
                콘텐츠 플래너
              </p>
              <h1 className="text-[26px] font-semibold tracking-tight text-[#1d1d1f] sm:text-[28px]">
                Red Pants
              </h1>
            </div>

            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:max-w-xl lg:max-w-2xl">
              {view === 'board' && (
                <div className="min-w-0 flex-1 basis-full sm:basis-auto sm:min-w-[240px]">
                  <SmartSearchBar
                    search={boardSearch}
                    categories={categories}
                    showCategoryFilters={false}
                    compact
                    placeholder="내 아이디어 검색하기"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowTrash(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium text-[#6e6e73] transition hover:bg-white hover:text-[#1d1d1f]"
              >
                <Trash2 className="h-4 w-4" />
                휴지통
                {archivedIdeas.length > 0 && (
                  <span className="rounded-full bg-white px-1.5 text-[11px] shadow-sm">
                    {archivedIdeas.length}
                  </span>
                )}
              </button>
            </div>
          </header>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <ViewToggle value={view} onChange={setView} />
            {error && <p className="text-[12px] text-red-500">{error}</p>}
          </div>

          {showCalendarChrome && (
            <WeeklyGoalBar
              weekAnchor={weekAnchor}
              onWeekChange={setWeekAnchor}
              ideas={ideas}
              meta={appMeta}
              onUpdateGoals={patchGoals}
            />
          )}

          <main className="transition-opacity duration-200">
            {loading ? (
              view === 'board' ? (
                <BoardSkeleton />
              ) : (
                <LoadingSkeleton rows={4} />
              )
            ) : view === 'board' ? (
              <IdeaBoard
                ideas={ideas}
                categories={categories}
                search={boardSearch}
                onOpenIdea={openIdea}
                onCreateIdea={() => void handleCreateIdea()}
                onStatusChange={(id, status) => patchIdea(id, { status })}
                onCategoryChange={(id, categoryId) =>
                  patchIdea(id, { category_id: categoryId })
                }
                onDeleteIdea={archiveIdea}
              />
            ) : view === 'calendar' ? (
              <MonthCalendar
                month={month}
                onMonthChange={setMonth}
                ideas={ideas}
                categories={categories}
                onOpenIdea={openIdea}
                onAddForDate={(date) => void handleCreateIdea(date)}
                onStatusChange={(id, status) => patchIdea(id, { status })}
                onSchedule={(id, date) =>
                  patchIdea(id, { scheduled_date: date })
                }
                filters={filters}
                onFiltersChange={setFilters}
                dndMode="self"
              />
            ) : (
              <PlacementMode
                month={month}
                onMonthChange={setMonth}
                ideas={ideas}
                categories={categories}
                appMeta={appMeta}
                onOpenIdea={openIdea}
                onAddForDate={(date) => void handleCreateIdea(date)}
                onSchedule={(id, date) =>
                  patchIdea(id, { scheduled_date: date })
                }
                onStatusChange={(id, status) => patchIdea(id, { status })}
                onApplySuggestions={applyPlacementSuggestions}
                filters={filters}
                onFiltersChange={setFilters}
                onToast={toast.show}
              />
            )}
          </main>
        </div>
      </div>

      {selectedIdea && (
        <IdeaDetailPanel
          idea={selectedIdea}
          categories={categories}
          onClose={() => setSelectedId(null)}
          onSave={patchIdea}
          onArchive={archiveIdea}
          onOpenCategoryManager={() => setShowCategories(true)}
        />
      )}

      {showCategories && (
        <CategoryManager
          categories={categories}
          onAdd={addCategory}
          onRename={renameCategory}
          onDelete={removeCategory}
          onClose={() => setShowCategories(false)}
        />
      )}

      {showTrash && (
        <TrashPanel
          ideas={archivedIdeas}
          onClose={() => setShowTrash(false)}
          onRestore={unarchiveIdea}
          onDeleteForever={removeIdeaForever}
        />
      )}

      <Toast message={toast.message} onClear={toast.clear} />
    </div>
  )
}
