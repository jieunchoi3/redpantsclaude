import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  useDroppable,
  useSensor,
  useSensors,
  type DropAnimation,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { LayoutGrid, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { InstagramIcon, YoutubeIcon } from './ChannelBadge'
import { EmptyState } from './EmptyState'
import { IdeaCard } from './IdeaCard'
import type { SmartSearchState } from '../hooks/useSmartSearch'
import {
  STATUS_COLORS,
  UNCATEGORIZED_ACCENT,
  categoryAccent,
  type CategoryAccent,
} from '../lib/colors'
import { sortCategories, splitCategoriesByChannel } from '../lib/categoryOrder'
import { accountColor } from '../lib/accounts'
import type { Workspace } from '../lib/workspace'
import {
  IDEA_STATUSES,
  type Account,
  type Category,
  type Idea,
  type IdeaStatus,
} from '../types'

type GroupBy = 'category' | 'account' | 'status'

interface IdeaBoardProps {
  ideas: Idea[]
  workspace: Workspace
  accounts: Account[]
  categories: Category[]
  search: SmartSearchState
  onOpenIdea: (idea: Idea) => void
  onCreateIdea: (preset?: {
    categoryId?: string | null
    accountId?: string | null
  }) => void
  onStatusChange: (ideaId: string, status: IdeaStatus) => Promise<unknown>
  onCategoryChange: (
    ideaId: string,
    categoryId: string | null,
  ) => Promise<unknown>
  onAccountChange: (
    ideaId: string,
    accountId: string | null,
  ) => Promise<unknown>
  onDeleteIdea: (ideaId: string) => Promise<unknown>
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

const UNCATEGORIZED_ID = '__uncategorized__'

export function IdeaBoard({
  ideas,
  workspace,
  accounts,
  categories,
  search,
  onOpenIdea,
  onCreateIdea,
  onStatusChange,
  onCategoryChange,
  onAccountChange,
  onDeleteIdea,
}: IdeaBoardProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>(
    workspace === 'jieun' ? 'account' : 'category',
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const orderedCategories = useMemo(
    () => sortCategories(categories),
    [categories],
  )

  const { instagram: igCategories, youtube: ytCategories } = useMemo(
    () => splitCategoriesByChannel(categories),
    [categories],
  )

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(
      IDEA_STATUSES.map((s) => [s, [] as Idea[]]),
    ) as Record<IdeaStatus, Idea[]>
    for (const idea of search.filtered) {
      map[idea.status]?.push(idea)
    }
    return map
  }, [search.filtered])

  const byCategory = useMemo(() => {
    const map = new Map<string, Idea[]>()
    for (const cat of orderedCategories) {
      map.set(cat.id, [])
    }
    map.set(UNCATEGORIZED_ID, [])
    for (const idea of search.filtered) {
      if (workspace === 'redpants' && idea.status === '업로드 완료') continue
      const key = idea.category_id ?? UNCATEGORIZED_ID
      const list = map.get(key)
      if (list) list.push(idea)
      else map.get(UNCATEGORIZED_ID)!.push(idea)
    }
    return map
  }, [search.filtered, orderedCategories, workspace])

  const byAccount = useMemo(() => {
    const map = new Map<string, Idea[]>()
    for (const account of accounts) map.set(account.id, [])
    map.set(UNCATEGORIZED_ID, [])
    for (const idea of search.filtered) {
      const key = idea.account_id ?? UNCATEGORIZED_ID
      const list = map.get(key)
      if (list) list.push(idea)
      else map.get(UNCATEGORIZED_ID)!.push(idea)
    }
    return map
  }, [accounts, search.filtered])

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  )
  const accountMap = useMemo(
    () =>
      Object.fromEntries(
        accounts.map((account, index) => [
          account.id,
          { ...account, color: accountColor(account, index) },
        ]),
      ),
    [accounts],
  )

  const activeIdea = activeId
    ? ideas.find((i) => i.id === activeId) ?? null
    : null

  const isEmpty = ideas.length === 0
  const noResults = !isEmpty && search.filtered.length === 0

  function handleDragStart(event: DragStartEvent) {
    const ideaId = String(event.active.data.current?.ideaId ?? '')
    setActiveId(ideaId || null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const ideaId = String(event.active.data.current?.ideaId ?? '')
    const overId = event.over?.id
    setActiveId(null)
    if (!ideaId || !overId) return

    const over = String(overId)
    const idea = ideas.find((i) => i.id === ideaId)
    if (!idea) return

    if (groupBy === 'status') {
      if (!over.startsWith('status-')) return
      const status = over.replace('status-', '') as IdeaStatus
      if (!IDEA_STATUSES.includes(status)) return
      if (idea.status === status) return
      await onStatusChange(ideaId, status)
      return
    }

    if (groupBy === 'account') {
      if (!over.startsWith('account-')) return
      const raw = over.replace('account-', '')
      const nextAccountId = raw === UNCATEGORIZED_ID ? null : raw
      if (idea.account_id === nextAccountId) return
      await onAccountChange(ideaId, nextAccountId)
      return
    }

    if (!over.startsWith('category-')) return
    const raw = over.replace('category-', '')
    const nextCategoryId = raw === UNCATEGORIZED_ID ? null : raw
    if (idea.category_id === nextCategoryId) return
    await onCategoryChange(ideaId, nextCategoryId)
  }

  const hint =
    groupBy === 'account'
      ? '카드를 다른 계정 컬럼으로 드래그해 계정을 변경하세요'
      : groupBy === 'category'
      ? '카드를 다른 카테고리 컬럼으로 드래그해 분류하세요'
      : '카드를 다른 컬럼으로 드래그해 상태를 변경하세요'
  const primaryGroup: GroupBy =
    workspace === 'jieun' ? 'account' : 'category'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div
          className="inline-flex shrink-0 rounded-xl bg-[#ebebed] p-1"
          role="tablist"
          aria-label="보드 그룹 기준"
        >
          <button
            type="button"
            role="tab"
            aria-selected={groupBy === primaryGroup}
            onClick={() => setGroupBy(primaryGroup)}
            className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition sm:px-4 sm:py-2 ${
              groupBy === primaryGroup
                ? 'bg-white text-[#1d1d1f] shadow-sm'
                : 'text-[#6e6e73] hover:text-[#1d1d1f]'
            }`}
          >
            {workspace === 'jieun' ? '계정' : '카테고리'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={groupBy === 'status'}
            onClick={() => setGroupBy('status')}
            className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition sm:px-4 sm:py-2 ${
              groupBy === 'status'
                ? 'bg-white text-[#1d1d1f] shadow-sm'
                : 'text-[#6e6e73] hover:text-[#1d1d1f]'
            }`}
          >
            진행 현황
          </button>
        </div>

        <p className="hidden min-w-0 flex-1 truncate text-center text-[13px] text-[#6e6e73] md:block">
          {hint}
        </p>

        <button
          type="button"
          onClick={() => onCreateIdea()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#1d1d1f] px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-black active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          아이디어 추가
        </button>
      </div>

      {isEmpty && workspace === 'redpants' ? (
        <EmptyState
          icon={LayoutGrid}
          title="아직 아이디어가 없어요"
          description="첫 아이디어를 추가하고 칸반으로 관리해 보세요."
          action={
            <button
              type="button"
              onClick={() => onCreateIdea()}
              className="rounded-xl bg-[#1d1d1f] px-4 py-2 text-[13px] font-medium text-white"
            >
              아이디어 추가
            </button>
          }
        />
      ) : noResults ? (
        <EmptyState
          title="검색 결과가 없습니다"
          description="다른 키워드로 검색하거나 AI 검색을 시도해 보세요."
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={(e) => void handleDragEnd(e)}
          onDragCancel={() => setActiveId(null)}
        >
          {groupBy === 'status' ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
              {IDEA_STATUSES.map((status) => (
                <StatusColumn
                  key={status}
                  status={status}
                  ideas={byStatus[status]}
                  categoryMap={categoryMap}
                  accountMap={accountMap}
                  onOpenIdea={onOpenIdea}
                  onDeleteIdea={onDeleteIdea}
                />
              ))}
            </div>
          ) : groupBy === 'account' ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
              {accounts.map((account, index) => (
                <AccountColumn
                  key={account.id}
                  account={account}
                  color={accountColor(account, index)}
                  ideas={byAccount.get(account.id) ?? []}
                  categoryMap={categoryMap}
                  accountMap={accountMap}
                  onOpenIdea={onOpenIdea}
                  onDeleteIdea={onDeleteIdea}
                  onCreateIdea={() => onCreateIdea({ accountId: account.id })}
                />
              ))}
              {(byAccount.get(UNCATEGORIZED_ID)?.length ?? 0) > 0 && (
                <AccountColumn
                  account={null}
                  color="#C7C7CC"
                  ideas={byAccount.get(UNCATEGORIZED_ID) ?? []}
                  categoryMap={categoryMap}
                  accountMap={accountMap}
                  onOpenIdea={onOpenIdea}
                  onDeleteIdea={onDeleteIdea}
                  onCreateIdea={() => onCreateIdea({ accountId: null })}
                />
              )}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
              {igCategories.map((cat, i) => (
                <CategoryColumn
                  key={cat.id}
                  category={cat}
                  accent={categoryAccent(cat.id, i)}
                  ideas={byCategory.get(cat.id) ?? []}
                  categoryMap={categoryMap}
                  onOpenIdea={onOpenIdea}
                  onDeleteIdea={onDeleteIdea}
                  onCreateIdea={() => onCreateIdea({ categoryId: cat.id })}
                />
              ))}

              {igCategories.length > 0 && ytCategories.length > 0 && (
                <ChannelDivider />
              )}

              {ytCategories.map((cat, i) => (
                <CategoryColumn
                  key={cat.id}
                  category={cat}
                  accent={categoryAccent(cat.id, igCategories.length + i)}
                  ideas={byCategory.get(cat.id) ?? []}
                  categoryMap={categoryMap}
                  onOpenIdea={onOpenIdea}
                  onDeleteIdea={onDeleteIdea}
                  onCreateIdea={() => onCreateIdea({ categoryId: cat.id })}
                />
              ))}

              <CategoryColumn
                category={null}
                accent={UNCATEGORIZED_ACCENT}
                ideas={byCategory.get(UNCATEGORIZED_ID) ?? []}
                categoryMap={categoryMap}
                onOpenIdea={onOpenIdea}
                onDeleteIdea={onDeleteIdea}
                onCreateIdea={() => onCreateIdea({ categoryId: null })}
              />
            </div>
          )}

          <DragOverlay dropAnimation={dropAnimation} adjustScale={false}>
            {activeIdea ? (
              <div
                className="w-64 origin-top-left scale-[1.03]"
                style={{ cursor: 'grabbing' }}
              >
                <IdeaCard
                  idea={activeIdea}
                  category={
                    activeIdea.category_id
                      ? categoryMap[activeIdea.category_id]
                      : undefined
                  }
                  onClick={() => undefined}
                  showStatus={groupBy !== 'status'}
                  showChannel={workspace === 'redpants' && groupBy === 'status'}
                  showCategory={groupBy !== 'category'}
                  showAccount={workspace === 'jieun' && groupBy === 'status'}
                  account={
                    activeIdea.account_id
                      ? accountMap[activeIdea.account_id]
                      : undefined
                  }
                  overlay
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}

function ChannelDivider() {
  return (
    <div
      className="flex w-6 shrink-0 snap-start flex-col items-center justify-center self-stretch py-4"
      aria-hidden
    >
      <div className="h-full w-px bg-gradient-to-b from-transparent via-[#d2d2d7] to-transparent" />
    </div>
  )
}

/** Fixed header block so accent underlines align across all columns */
const COLUMN_HEADER_BLOCK =
  'flex h-[72px] shrink-0 flex-col justify-between px-3 pt-3 pb-2'

function StatusColumn({
  status,
  ideas,
  categoryMap,
  accountMap,
  onOpenIdea,
  onDeleteIdea,
}: {
  status: IdeaStatus
  ideas: Idea[]
  categoryMap: Record<string, Category>
  accountMap: Record<string, Account>
  onOpenIdea: (idea: Idea) => void
  onDeleteIdea: (ideaId: string) => Promise<unknown>
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `status-${status}`,
    data: { type: 'status', status },
  })
  const colors = STATUS_COLORS[status]

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[min(16rem,85vw)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white/80 shadow-[var(--shadow-sm)] transition-colors duration-200 ${
        isOver ? 'bg-white ring-2 ring-[#1d1d1f]/10' : ''
      }`}
    >
      <div className={COLUMN_HEADER_BLOCK}>
        <div className="flex min-h-0 flex-1 items-center gap-2 overflow-hidden">
          <span
            className={`inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-semibold ${colors.soft}`}
            title={status}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${colors.dot}`} />
            <span className="truncate">{status}</span>
          </span>
          <span className="ml-auto shrink-0 rounded-full bg-[#f5f5f7] px-2 py-0.5 text-[11px] text-[#6e6e73]">
            {ideas.length}
          </span>
        </div>
        <div className={`h-0.5 w-full shrink-0 rounded-full ${colors.dot}`} />
      </div>

      <div className="flex flex-1 flex-col p-3 pt-2">
        <ColumnCards
          ideas={ideas}
          categoryMap={categoryMap}
          accountMap={accountMap}
          onOpenIdea={onOpenIdea}
          onDeleteIdea={onDeleteIdea}
          groupBy="status"
        />
      </div>
    </div>
  )
}

function AccountColumn({
  account,
  color,
  ideas,
  categoryMap,
  accountMap,
  onOpenIdea,
  onDeleteIdea,
  onCreateIdea,
}: {
  account: Account | null
  color: string
  ideas: Idea[]
  categoryMap: Record<string, Category>
  accountMap: Record<string, Account>
  onOpenIdea: (idea: Idea) => void
  onDeleteIdea: (ideaId: string) => Promise<unknown>
  onCreateIdea: () => void
}) {
  const dropId = account
    ? `account-${account.id}`
    : `account-${UNCATEGORIZED_ID}`
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    data: { type: 'account', accountId: account?.id ?? null },
  })

  return (
    <div
      ref={setNodeRef}
      data-account-column={account?.id ?? 'unassigned'}
      className={`group/col flex w-[min(16rem,85vw)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white/80 shadow-[var(--shadow-sm)] transition-all duration-200 ${
        isOver ? 'bg-white ring-2 ring-[#1d1d1f]/10' : ''
      }`}
    >
      <div
        className={COLUMN_HEADER_BLOCK}
        style={{ backgroundColor: `${color}18` }}
      >
        <div className="flex min-h-0 flex-1 items-center gap-2 overflow-hidden">
          <span
            className="h-3 w-3 shrink-0 rounded-full shadow-sm ring-1 ring-black/5"
            style={{ backgroundColor: color }}
          />
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#1d1d1f]">
            {account?.name ?? '계정 미지정'}
          </p>
          <button
            type="button"
            onClick={onCreateIdea}
            title={`${account?.name ?? '계정 미지정'}에 아이디어 추가`}
            aria-label={`${account?.name ?? '계정 미지정'}에 아이디어 추가`}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[#aeaeb2] transition hover:bg-white/90 hover:text-[#1d1d1f] ${
              ideas.length === 0
                ? 'opacity-100'
                : 'opacity-0 group-hover/col:opacity-100'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-[#6e6e73]">
            {ideas.length}
          </span>
        </div>
        <div
          className="h-0.5 w-full shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>

      <div className="flex flex-1 flex-col p-3 pt-2">
        <ColumnCards
          ideas={ideas}
          categoryMap={categoryMap}
          accountMap={accountMap}
          onOpenIdea={onOpenIdea}
          onDeleteIdea={onDeleteIdea}
          groupBy="account"
        />
      </div>
    </div>
  )
}

function CategoryColumn({
  category,
  accent,
  ideas,
  categoryMap,
  onOpenIdea,
  onDeleteIdea,
  onCreateIdea,
}: {
  category: Category | null
  accent: CategoryAccent
  ideas: Idea[]
  categoryMap: Record<string, Category>
  onOpenIdea: (idea: Idea) => void
  onDeleteIdea: (ideaId: string) => Promise<unknown>
  onCreateIdea: () => void
}) {
  const dropId = category
    ? `category-${category.id}`
    : `category-${UNCATEGORIZED_ID}`
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    data: {
      type: 'category',
      categoryId: category?.id ?? null,
    },
  })

  const title = category?.name ?? '미분류'
  const channel = category?.channel

  return (
    <div
      ref={setNodeRef}
      className={`group/col flex w-[min(16rem,85vw)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white/80 shadow-[var(--shadow-sm)] transition-colors duration-200 ${
        isOver ? 'ring-2 ring-[#1d1d1f]/10' : ''
      }`}
    >
      <div className={`${COLUMN_HEADER_BLOCK} ${accent.tint}`}>
        <div className="flex min-h-0 flex-1 items-center gap-2 overflow-hidden">
          {channel === 'instagram' ? (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600 text-white">
              <InstagramIcon className="h-3 w-3" />
            </span>
          ) : channel === 'youtube' ? (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-red-500 text-white">
              <YoutubeIcon className="h-3 w-3" />
            </span>
          ) : (
            <span className={`h-2 w-2 shrink-0 rounded-full ${accent.dot}`} />
          )}
          <p
            className="min-w-0 flex-1 overflow-hidden text-[12px] font-semibold leading-snug text-[#1d1d1f]"
            title={title}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {title}
          </p>
          <button
            type="button"
            onClick={onCreateIdea}
            title={`${title}에 아이디어 추가`}
            aria-label={`${title}에 아이디어 추가`}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[#aeaeb2] transition hover:bg-white/90 hover:text-[#1d1d1f] ${
              ideas.length === 0
                ? 'opacity-100'
                : 'opacity-0 group-hover/col:opacity-100'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-[#6e6e73]">
            {ideas.length}
          </span>
        </div>
        <div
          className={`h-0.5 w-full shrink-0 rounded-full ${accent.underline}`}
        />
      </div>

      <div className="flex flex-1 flex-col p-3 pt-2">
        <ColumnCards
          ideas={ideas}
          categoryMap={categoryMap}
          onOpenIdea={onOpenIdea}
          onDeleteIdea={onDeleteIdea}
          groupBy="category"
        />
      </div>
    </div>
  )
}

function ColumnCards({
  ideas,
  categoryMap,
  accountMap = {},
  onOpenIdea,
  onDeleteIdea,
  groupBy,
}: {
  ideas: Idea[]
  categoryMap: Record<string, Category>
  accountMap?: Record<string, Account>
  onOpenIdea: (idea: Idea) => void
  onDeleteIdea: (ideaId: string) => Promise<unknown>
  groupBy: GroupBy
}) {
  return (
    <div className="flex min-h-24 flex-col gap-2">
      {ideas.length === 0 ? (
        <p className="px-1 py-6 text-center text-[11px] text-[#aeaeb2]">
          비어 있음
        </p>
      ) : (
        ideas.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            category={
              idea.category_id ? categoryMap[idea.category_id] : undefined
            }
            account={
              idea.account_id ? accountMap[idea.account_id] : undefined
            }
            onClick={() => onOpenIdea(idea)}
            draggable
            dragData={{ from: 'board' }}
            showStatus={groupBy !== 'status'}
            showChannel={groupBy === 'status'}
            showCategory={groupBy !== 'category'}
            showAccount={groupBy === 'status'}
            onDelete={(item) => {
              if (!window.confirm('휴지통으로 이동할까요?')) return
              void onDeleteIdea(item.id)
            }}
          />
        ))
      )}
    </div>
  )
}
