import { useEffect, useMemo, useState } from 'react'
import { LogOut, Trash2 } from 'lucide-react'
import { FreeNotes } from './components/FreeNotes'
import { AccountSidebar } from './components/AccountSidebar'
import { WorkspaceGate } from './components/WorkspaceGate'
import { ViewToggle } from './components/ViewToggle'
import { IdeaBoard } from './components/IdeaBoard'
import { MonthCalendar } from './components/MonthCalendar'
import { WeeklyPlanner } from './components/WeeklyPlanner'
import {
  CalendarViewToggle,
  type JieunCalendarMode,
} from './components/CalendarViewToggle'
import { PlacementMode } from './components/PlacementMode'
import { IdeaDetailPanel } from './components/IdeaDetailPanel'
import { CategoryManager } from './components/CategoryManager'
import { TrashPanel } from './components/TrashPanel'
import { WeeklyGoalBar } from './components/WeeklyGoalBar'
import { HookLibrary } from './components/HookLibrary'
import { QuickHookCapture } from './components/QuickHookCapture'
import {
  BoardSkeleton,
  LoadingSkeleton,
  WeeklyPlannerSkeleton,
} from './components/EmptyState'
import { SmartSearchBar } from './components/SmartSearchBar'
import { Toast, useToast } from './components/Toast'
import { usePlannerData } from './hooks/usePlannerData'
import { useHookLibrary } from './hooks/useHookLibrary'
import { useSmartSearch } from './hooks/useSmartSearch'
import type { PlacementSuggestion } from './lib/autoPlace'
import type { CalendarFilters } from './lib/calendarFilters'
import {
  workspaceFromUrl,
  writeWorkspaceToUrl,
  type Workspace,
} from './lib/workspace'
import type { Idea, ViewMode } from './types'

const DEFAULT_FILTERS: CalendarFilters = {
  instagram: false,
  youtube: false,
  showCompleted: false,
  categoryIds: [],
}

export default function App() {
  const hookLibrary = useHookLibrary()
  const [workspace, setWorkspace] = useState<Workspace | null>(() =>
    workspaceFromUrl(),
  )

  useEffect(() => {
    function handlePopState() {
      setWorkspace(workspaceFromUrl())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function enterWorkspace(nextWorkspace: Workspace) {
    writeWorkspaceToUrl(nextWorkspace)
    setWorkspace(nextWorkspace)
  }

  function exitWorkspace() {
    writeWorkspaceToUrl(null)
    setWorkspace(null)
  }

  if (!workspace) {
    return (
      <WorkspaceGate
        onEnter={enterWorkspace}
        onQuickHookSave={hookLibrary.addHook}
      />
    )
  }

  return (
    <PlannerApp
      key={workspace}
      workspace={workspace}
      onExitWorkspace={exitWorkspace}
      hookLibrary={hookLibrary}
    />
  )
}

function PlannerApp({
  workspace,
  onExitWorkspace,
  hookLibrary,
}: {
  workspace: Workspace
  onExitWorkspace: () => void
  hookLibrary: ReturnType<typeof useHookLibrary>
}) {
  const [view, setView] = useState<ViewMode>('board')
  const [month, setMonth] = useState(() => new Date())
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [jieunCalendarMode, setJieunCalendarMode] =
    useState<JieunCalendarMode>('week')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCategories, setShowCategories] = useState(false)
  const [categoryAccountId, setCategoryAccountId] = useState<string | null>(null)
  const [showTrash, setShowTrash] = useState(false)
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [filters, setFilters] = useState<CalendarFilters>(DEFAULT_FILTERS)
  const toast = useToast()

  const {
    ideas,
    archivedIdeas,
    categories,
    accounts,
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
    addAccount,
    patchAccount,
    patchAccountNotes,
    archiveAccount,
  } = usePlannerData(workspace)
  const visibleIdeas = useMemo(
    () =>
      workspace === 'jieun' && selectedAccountIds.length > 0
        ? ideas.filter(
            (idea) =>
              idea.account_id && selectedAccountIds.includes(idea.account_id),
          )
        : ideas,
    [ideas, selectedAccountIds, workspace],
  )

  const boardSearch = useSmartSearch(visibleIdeas, categories)

  const selectedIdea = useMemo(() => {
    if (!selectedId) return null
    return (
      ideas.find((i) => i.id === selectedId) ??
      archivedIdeas.find((i) => i.id === selectedId) ??
      null
    )
  }, [selectedId, ideas, archivedIdeas])

  async function handleCreateIdea(
    scheduledDate?: string | null,
    accountId?: string | null,
  ) {
    const presetAccountId =
      accountId ??
      (workspace === 'jieun' && selectedAccountIds.length === 1
        ? selectedAccountIds[0]!
        : null)
    const created = await addIdea({
      title: '제목 없음',
      scheduled_date: scheduledDate ?? null,
      status: '기획하기',
      account_id: presetAccountId,
      jieun_channel: workspace === 'jieun' ? '인스타그램' : null,
      jieun_format: workspace === 'jieun' ? '릴스' : null,
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
    <div className="fade-in flex h-svh overflow-hidden bg-[#F5F5F7]">
      {workspace === 'redpants' && <FreeNotes />}
      {workspace === 'jieun' && (
        <AccountSidebar
          loading={loading}
          accounts={accounts}
          ideas={ideas}
          selectedIds={selectedAccountIds}
          onToggle={(id) =>
            setSelectedAccountIds((current) =>
              current.includes(id)
                ? current.filter((accountId) => accountId !== id)
                : [...current, id],
            )
          }
          onClear={() => setSelectedAccountIds([])}
          onAdd={addAccount}
          onUpdate={patchAccount}
          onSaveNotes={patchAccountNotes}
          onArchive={async (id) => {
            const archived = await archiveAccount(id)
            if (archived) {
              setSelectedAccountIds((current) =>
                current.filter((accountId) => accountId !== id),
              )
            }
            return archived
          }}
        />
      )}

      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 py-5 sm:px-8 sm:py-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="shrink-0">
              <p className="text-[13px] font-medium tracking-wide text-[#6e6e73]">
                콘텐츠 플래너
              </p>
              <h1 className="text-[26px] font-semibold tracking-tight text-[#1d1d1f] sm:text-[28px]">
                {workspace === 'redpants' ? 'Red Pants' : 'Jieun'}
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
              <button
                type="button"
                onClick={onExitWorkspace}
                title="워크스페이스 나가기"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[13px] font-medium text-[#6e6e73] shadow-[var(--shadow-sm)] ring-1 ring-black/[0.04] transition hover:text-[#1d1d1f] hover:shadow-[var(--shadow)]"
              >
                <LogOut className="h-4 w-4" />
                나가기
              </button>
            </div>
          </header>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <ViewToggle
              value={view}
              onChange={setView}
              calendarLabel={workspace === 'jieun' ? '캘린더' : undefined}
            />
            <div className="flex items-center gap-2">
              {workspace === 'jieun' && view === 'calendar' && (
                <CalendarViewToggle
                  value={jieunCalendarMode}
                  onChange={setJieunCalendarMode}
                />
              )}
              {error && <p className="text-[12px] text-red-500">{error}</p>}
            </div>
          </div>

          {showCalendarChrome && workspace === 'redpants' && (
            <WeeklyGoalBar
              weekAnchor={weekAnchor}
              onWeekChange={setWeekAnchor}
              ideas={ideas}
              meta={appMeta}
              onUpdateGoals={patchGoals}
            />
          )}

          <main
            key={`${view}-${workspace === 'jieun' ? jieunCalendarMode : 'default'}`}
            className="fade-in transition-opacity duration-200"
          >
            {view === 'hooks' ? (
              <HookLibrary
                hooks={hookLibrary.hooks}
                types={hookLibrary.hookTypes}
                accounts={hookLibrary.hookAccounts}
                loading={hookLibrary.loading}
                error={hookLibrary.error}
                onAdd={hookLibrary.addHook}
                onUpdate={hookLibrary.patchHook}
                onArchive={hookLibrary.archiveHook}
                onRestore={hookLibrary.restoreHook}
                onAddType={hookLibrary.addHookType}
                onUpdateType={hookLibrary.patchHookType}
                onDeleteType={hookLibrary.removeHookType}
              />
            ) : loading ? (
              view === 'board' ? (
                <BoardSkeleton />
              ) : workspace === 'jieun' &&
                view === 'calendar' &&
                jieunCalendarMode === 'week' ? (
                <WeeklyPlannerSkeleton />
              ) : (
                <LoadingSkeleton rows={4} />
              )
            ) : view === 'board' ? (
              <IdeaBoard
                ideas={visibleIdeas}
                workspace={workspace}
                accounts={accounts}
                categories={categories}
                search={boardSearch}
                onOpenIdea={openIdea}
                onCreateIdea={() => void handleCreateIdea()}
                onStatusChange={(id, status) => patchIdea(id, { status })}
                onCategoryChange={(id, categoryId) =>
                  patchIdea(id, { category_id: categoryId })
                }
                onAccountChange={(id, accountId) =>
                  patchIdea(id, { account_id: accountId })
                }
                onDeleteIdea={archiveIdea}
              />
            ) : view === 'calendar' ? (
              workspace === 'jieun' && jieunCalendarMode === 'week' ? (
                <WeeklyPlanner
                  weekAnchor={weekAnchor}
                  onWeekChange={setWeekAnchor}
                  accounts={accounts}
                  ideas={ideas}
                  categories={categories}
                  selectedAccountIds={selectedAccountIds}
                  onCreate={(accountId, date) =>
                    void handleCreateIdea(date, accountId)
                  }
                  onOpenIdea={openIdea}
                  onMove={patchIdea}
                />
              ) : (
                <MonthCalendar
                  month={month}
                  onMonthChange={setMonth}
                  ideas={workspace === 'jieun' ? ideas : visibleIdeas}
                  workspace={workspace}
                  accounts={accounts}
                  selectedAccountIds={selectedAccountIds}
                  onAccountFilterChange={setSelectedAccountIds}
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
              )
            ) : (
              <PlacementMode
                month={month}
                onMonthChange={setMonth}
                ideas={visibleIdeas}
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
          workspace={workspace}
          accounts={accounts}
          categories={categories}
          onClose={() => setSelectedId(null)}
          onSave={patchIdea}
          onArchive={archiveIdea}
          onOpenCategoryManager={(accountId) => {
            setCategoryAccountId(accountId ?? null)
            setShowCategories(true)
          }}
          hooks={hookLibrary.hooks}
          hookTypes={hookLibrary.hookTypes}
          hookAccounts={hookLibrary.hookAccounts}
          hookUsages={hookLibrary.usages}
          hooksLoading={hookLibrary.loading}
          onApplyHook={hookLibrary.applyHookToIdea}
          onUpdateHookUsage={hookLibrary.patchHookUsage}
        />
      )}

      {showCategories && (
        <CategoryManager
          categories={categories}
          workspace={workspace}
          accountId={categoryAccountId}
          accountName={
            accounts.find((account) => account.id === categoryAccountId)?.name
          }
          onAdd={(name, channel) =>
            addCategory(name, channel, categoryAccountId)
          }
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

      <QuickHookCapture variant="floating" onSave={hookLibrary.addHook} />
      <Toast message={toast.message} onClear={toast.clear} />
    </div>
  )
}
