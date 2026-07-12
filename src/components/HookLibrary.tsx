import { useMemo, useState } from 'react'
import {
  ArchiveRestore,
  History,
  Inbox,
  LayoutGrid,
  Library,
  List,
  Loader2,
  Palette,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react'
import type { Account, HookItem, HookType } from '../types'
import type { HookInput } from '../lib/hooks'
import { hookTypeBadgeStyle } from '../lib/hookUi'
import { HookAccountChips, HookTypeBadge } from './HookBadges'
import { HookEditorModal } from './HookEditorModal'
import { HookMediaPreview } from './HookMediaPreview'
import { HookUsageHistoryModal } from './HookUsageHistoryModal'
import { HookTypeManagerModal } from './HookTypeManagerModal'

type HookSort = 'latest' | 'used' | 'rating'
type HookLayout = 'grid' | 'list'

interface HookLibraryProps {
  hooks: HookItem[]
  types: HookType[]
  accounts: Account[]
  loading: boolean
  error: string | null
  onAdd: (input: HookInput) => Promise<boolean>
  onUpdate: (id: string, input: HookInput) => Promise<boolean>
  onArchive: (id: string) => Promise<boolean>
  onRestore: (id: string) => Promise<boolean>
  onAddType: (input: {
    name: string
    description?: string | null
    color?: string | null
  }) => Promise<HookType | null>
  onUpdateType: (
    id: string,
    patch: Pick<HookType, 'name' | 'description' | 'color'>,
  ) => Promise<boolean>
  onDeleteType: (id: string) => Promise<boolean>
}

export function HookLibrary({
  hooks,
  types,
  accounts,
  loading,
  error,
  onAdd,
  onUpdate,
  onArchive,
  onRestore,
  onAddType,
  onUpdateType,
  onDeleteType,
}: HookLibraryProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [accountFilter, setAccountFilter] = useState('all')
  const [sort, setSort] = useState<HookSort>('latest')
  const [layout, setLayout] = useState<HookLayout>('grid')
  const [showTrash, setShowTrash] = useState(false)
  const [showInbox, setShowInbox] = useState(false)
  const [showTypeManager, setShowTypeManager] = useState(false)
  const [editing, setEditing] = useState<HookItem | null | undefined>()
  const [historyHook, setHistoryHook] = useState<HookItem | null>(null)

  const typeById = useMemo(
    () => new Map(types.map((type) => [type.id, type])),
    [types],
  )
  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  )
  const archivedCount = useMemo(
    () => hooks.filter((hook) => hook.archived).length,
    [hooks],
  )

  async function createMultiple(inputs: HookInput[]) {
    let created = 0
    for (const input of inputs) {
      if (await onAdd(input)) created += 1
    }
    return created
  }
  const inboxCount = useMemo(
    () => hooks.filter((hook) => !hook.archived && hook.is_inbox).length,
    [hooks],
  )

  const visibleHooks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ko')
    const filtered = hooks.filter((hook) => {
      if (hook.archived !== showTrash) return false
      if (!showTrash && showInbox && !hook.is_inbox) return false
      if (query && !hook.content.toLocaleLowerCase('ko').includes(query)) {
        return false
      }
      if (typeFilter !== 'all' && hook.hook_type !== typeFilter) return false
      if (
        accountFilter !== 'all' &&
        hook.account_ids.length > 0 &&
        !hook.account_ids.includes(accountFilter)
      ) {
        return false
      }
      return true
    })
    return filtered.sort((a, b) => {
      if (sort === 'used') return b.usage_count - a.usage_count
      if (sort === 'rating') {
        return (b.average_rating ?? -1) - (a.average_rating ?? -1)
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [
    accountFilter,
    hooks,
    search,
    showTrash,
    showInbox,
    sort,
    typeFilter,
  ])

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[28px] bg-white shadow-sm">
        <div className="text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#9b8990]" />
          <p className="mt-3 text-[13px] text-[#8e8e93]">
            훅 라이브러리를 불러오는 중…
          </p>
        </div>
      </div>
    )
  }

  return (
    <section className="min-h-[560px]">
      <div className="mb-5 flex flex-col gap-4 rounded-[26px] bg-white p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1e9ec] text-[#806972]">
              <Library className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[20px] font-semibold tracking-tight text-[#1d1d1f]">
                훅 라이브러리
              </h2>
              <p className="text-[12px] text-[#8e8e93]">
                워크스페이스와 관계없이 함께 쓰는 도입부 아이디어
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!showTrash && (
              <>
                <button
                  type="button"
                  onClick={() => setShowTypeManager(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5f5f7] px-3 py-2.5 text-[12px] font-medium text-[#6e6e73] transition hover:bg-[#ededf0]"
                >
                  <Palette className="h-3.5 w-3.5" />
                  유형 관리
                </button>
                <button
                  type="button"
                  onClick={() => setShowInbox((current) => !current)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[12px] font-medium transition ${
                    showInbox
                      ? 'bg-[#fff1d8] text-[#8a672f]'
                      : 'bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#ededf0]'
                  }`}
                >
                  <Inbox className="h-3.5 w-3.5" />
                  미분류
                  {inboxCount > 0 && (
                    <span className="rounded-full bg-white px-1.5 text-[10px] shadow-sm">
                      {inboxCount}
                    </span>
                  )}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setShowTrash((current) => !current)
                setShowInbox(false)
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[12px] font-medium transition ${
                showTrash
                  ? 'bg-[#eee8ea] text-[#68535b]'
                  : 'bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#ededf0]'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {showTrash ? '라이브러리로' : '휴지통'}
              {!showTrash && archivedCount > 0 && (
                <span className="rounded-full bg-white px-1.5 text-[10px] shadow-sm">
                  {archivedCount}
                </span>
              )}
            </button>
            {!showTrash && (
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d1d1f] px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-black hover:shadow"
              >
                <Plus className="h-4 w-4" />
                훅 추가
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a9f]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="훅 문구 검색"
              className="w-full rounded-2xl bg-[#f5f5f7] py-3 pl-10 pr-4 text-[13px] text-[#1d1d1f] outline-none ring-1 ring-transparent transition placeholder:text-[#a4a4a9] focus:bg-white focus:ring-[#b49ba1]/35"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <FilterSelect
              value={typeFilter}
              onChange={setTypeFilter}
              label="유형"
              options={[
                ['all', '모든 유형'],
                ...types.map((type) => [type.id, type.name] as [string, string]),
              ]}
            />
            <FilterSelect
              value={accountFilter}
              onChange={setAccountFilter}
              label="계정"
              options={[
                ['all', '모든 계정'],
                ...accounts.map(
                  (account) => [account.id, account.name] as [string, string],
                ),
              ]}
            />
            <FilterSelect
              value={sort}
              onChange={(value) => setSort(value as HookSort)}
              label="정렬"
              options={[
                ['latest', '최신순'],
                ['used', '사용 많은 순'],
                ['rating', '평점 높은 순'],
              ]}
            />
            <div className="flex rounded-xl bg-[#f5f5f7] p-1">
              <button
                type="button"
                onClick={() => setLayout('grid')}
                className={`rounded-lg p-2 transition ${
                  layout === 'grid'
                    ? 'bg-white text-[#1d1d1f] shadow-sm'
                    : 'text-[#9a9a9f]'
                }`}
                aria-label="그리드 보기"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLayout('list')}
                className={`rounded-lg p-2 transition ${
                  layout === 'list'
                    ? 'bg-white text-[#1d1d1f] shadow-sm'
                    : 'text-[#9a9a9f]'
                }`}
                aria-label="리스트 보기"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {!showTrash && types.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                typeFilter === 'all'
                  ? 'bg-[#1d1d1f] text-white shadow-sm'
                  : 'bg-[#f5f5f7] text-[#6e6e73] ring-1 ring-black/[0.05] hover:bg-[#ededf0]'
              }`}
            >
              전체
            </button>
            {types.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() =>
                  setTypeFilter((current) =>
                    current === type.id ? 'all' : type.id,
                  )
                }
                className="max-w-[220px] truncate rounded-full px-3 py-1.5 text-[11px] font-semibold transition"
                style={
                  typeFilter === type.id
                    ? {
                        ...hookTypeBadgeStyle(type),
                        boxShadow: `0 1px 3px ${type.color ?? '#bca8af'}33`,
                      }
                    : hookTypeBadgeStyle(type)
                }
                title={type.name}
              >
                {type.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error ? (
        <div className="rounded-[24px] border border-[#e9d8dc] bg-[#fff9fa] p-7 text-center">
          <p className="text-[14px] font-semibold text-[#76545e]">
            훅 데이터베이스를 연결해 주세요
          </p>
          <p className="mx-auto mt-2 max-w-xl text-[12px] leading-5 text-[#927680]">
            Supabase SQL Editor에서{' '}
            <code className="rounded bg-white px-1.5 py-0.5">
              supabase/v3_hook_library.sql
            </code>
            을 실행하면 훅과 미디어 버킷이 준비됩니다.
          </p>
          <p className="mt-2 text-[10px] text-[#ae929a]">{error}</p>
        </div>
      ) : visibleHooks.length === 0 ? (
        <HookEmptyState
          trash={showTrash}
          inbox={showInbox}
          hasFilters={
            Boolean(search) ||
            typeFilter !== 'all' ||
            accountFilter !== 'all' ||
            showInbox
          }
          onAdd={() => setEditing(null)}
        />
      ) : (
        <div
          className={
            layout === 'grid'
              ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'
              : 'flex flex-col gap-3'
          }
        >
          {visibleHooks.map((hook) => (
            <HookCard
              key={hook.id}
              hook={hook}
              type={hook.hook_type ? typeById.get(hook.hook_type) : undefined}
              accounts={hook.account_ids
                .map((id) => accountById.get(id))
                .filter((account): account is Account => Boolean(account))}
              layout={layout}
              trash={showTrash}
              onEdit={() => setEditing(hook)}
              onViewHistory={() => setHistoryHook(hook)}
              onArchive={() => void onArchive(hook.id)}
              onRestore={() => void onRestore(hook.id)}
            />
          ))}
        </div>
      )}

      {editing !== undefined && (
        <HookEditorModal
          hook={editing}
          types={types}
          accounts={accounts}
          existingHooks={hooks}
          onClose={() => setEditing(undefined)}
          onSave={(input) =>
            editing ? onUpdate(editing.id, input) : onAdd(input)
          }
          onCreateHooks={createMultiple}
          onAddType={onAddType}
          onUpdateType={onUpdateType}
          onDeleteType={onDeleteType}
        />
      )}
      {showTypeManager && (
        <HookTypeManagerModal
          types={types}
          hooks={hooks}
          onClose={() => setShowTypeManager(false)}
          onAdd={onAddType}
          onUpdate={onUpdateType}
          onDelete={onDeleteType}
        />
      )}
      {historyHook && (
        <HookUsageHistoryModal
          hook={historyHook}
          type={
            historyHook.hook_type
              ? typeById.get(historyHook.hook_type)
              : undefined
          }
          onClose={() => setHistoryHook(null)}
        />
      )}
    </section>
  )
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  options: [string, string][]
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="max-w-[190px] appearance-none rounded-xl border-0 bg-[#f5f5f7] px-3 py-2.5 text-[12px] font-medium text-[#5d5d62] outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-[#b49ba1]/30"
      >
        {options.map(([id, optionLabel]) => (
          <option key={id} value={id}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  )
}

function HookCard({
  hook,
  type,
  accounts,
  layout,
  trash,
  onEdit,
  onViewHistory,
  onArchive,
  onRestore,
}: {
  hook: HookItem
  type?: HookType
  accounts: Account[]
  layout: HookLayout
  trash: boolean
  onEdit: () => void
  onViewHistory: () => void
  onArchive: () => void
  onRestore: () => void
}) {
  const isList = layout === 'list'
  return (
    <article
      className={`group overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-sm)] ring-1 ring-black/[0.035] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow)] ${
        isList ? 'flex min-h-36' : 'flex flex-col'
      }`}
      style={
        !isList && type?.color
          ? { boxShadow: `var(--shadow-sm), inset 0 2px 0 0 ${type.color}55` }
          : undefined
      }
    >
      <HookMediaPreview
        hook={hook}
        compact={isList}
        accentColor={type?.color}
      />
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {hook.is_inbox && (
              <span className="rounded-full bg-[#fff1d8] px-2.5 py-1 text-[10px] font-semibold text-[#8a672f]">
                인박스
              </span>
            )}
            {type ? (
              <HookTypeBadge type={type} />
            ) : (
              <HookTypeBadge fallback="유형 미지정" />
            )}
          </div>
          <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
            {!trash && (
              <>
                <button
                  type="button"
                  onClick={onViewHistory}
                  className="rounded-lg bg-[#f5f5f7] p-1.5 text-[#77777c] transition hover:bg-[#e9e9ec] hover:text-[#1d1d1f]"
                  aria-label="사용 이력"
                >
                  <History className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-lg bg-[#f5f5f7] p-1.5 text-[#77777c] transition hover:bg-[#e9e9ec] hover:text-[#1d1d1f]"
                  aria-label="훅 편집"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onArchive}
                  className="rounded-lg bg-[#fff4f5] p-1.5 text-[#b7737e] transition hover:bg-[#ffe8eb] hover:text-[#a84353]"
                  aria-label="훅 삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {trash && (
              <button
                type="button"
                onClick={onRestore}
                className="inline-flex items-center gap-1 rounded-lg bg-[#eef5f1] px-2 py-1.5 text-[10px] font-medium text-[#5f7d6c] transition hover:bg-[#e1eee7]"
              >
                <ArchiveRestore className="h-3.5 w-3.5" />
                복원
              </button>
            )}
          </div>
        </div>

        <p
          className={`whitespace-pre-wrap font-medium leading-relaxed text-[#242426] ${
            isList ? 'line-clamp-3 text-[15px]' : 'line-clamp-5 text-[16px]'
          }`}
        >
          {hook.content}
        </p>

        {hook.source_note && (
          <p className="mt-2 line-clamp-1 text-[11px] text-[#9a9a9f]">
            출처 · {hook.source_note}
          </p>
        )}

        <div className="mt-auto pt-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            <HookAccountChips accounts={accounts} />
          </div>
          <div className="flex items-center justify-between border-t border-black/[0.055] pt-3 text-[11px] text-[#8e8e93]">
            <span>사용 {hook.usage_count}회</span>
            <span className="inline-flex items-center gap-1">
              <Star
                className={`h-3.5 w-3.5 ${
                  hook.average_rating !== null
                    ? 'fill-[#d5b069] text-[#d5b069]'
                    : 'text-[#c6c6ca]'
                }`}
              />
              {hook.average_rating !== null
                ? hook.average_rating.toFixed(1)
                : '평가 없음'}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

function HookEmptyState({
  trash,
  inbox,
  hasFilters,
  onAdd,
}: {
  trash: boolean
  inbox: boolean
  hasFilters: boolean
  onAdd: () => void
}) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-dashed border-black/[0.08] bg-gradient-to-b from-white to-[#fafafa] px-6 py-16 text-center shadow-[var(--shadow-sm)]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#f3ecee]/80 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-[#e8eef5]/70 blur-2xl" />
      <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-white shadow-sm ring-1 ring-black/[0.05]">
        {trash ? (
          <Trash2 className="h-7 w-7 text-[#b49ba1]" />
        ) : inbox ? (
          <Inbox className="h-7 w-7 text-[#c9a56b]" />
        ) : hasFilters ? (
          <Search className="h-7 w-7 text-[#9b8990]" />
        ) : (
          <Sparkles className="h-7 w-7 text-[#9b8990]" />
        )}
      </div>
      <p className="relative mt-5 text-[18px] font-semibold tracking-tight text-[#1d1d1f]">
        {trash
          ? '휴지통이 비어 있어요'
          : inbox
            ? '미분류 훅이 없어요'
            : hasFilters
              ? '조건에 맞는 훅이 없어요'
              : '첫 훅을 저장해 보세요'}
      </p>
      <p className="relative mx-auto mt-2 max-w-md text-[13px] leading-6 text-[#6e6e73]">
        {trash
          ? '삭제한 훅은 여기에 모이고, 언제든 복원할 수 있어요.'
          : inbox
            ? '빠르게 저장한 훅이 여기에 쌓여요. 지금은 모두 정리된 상태예요.'
            : hasFilters
              ? '검색어나 필터를 바꾸면 다른 훅을 찾을 수 있어요.'
              : '스크롤을 멈추게 하는 문구와 영상 공식을 한곳에 모아두세요. 이미지·영상도 함께 저장할 수 있어요.'}
      </p>
      {!trash && !inbox && !hasFilters && (
        <button
          type="button"
          onClick={onAdd}
          className="relative mt-6 inline-flex items-center gap-1.5 rounded-2xl bg-[#1d1d1f] px-5 py-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-black hover:shadow"
        >
          <Plus className="h-4 w-4" />
          첫 훅 추가
        </button>
      )}
      {inbox && !hasFilters && (
        <p className="relative mt-4 text-[11px] text-[#aeaeb2]">
          우하단 <span className="font-medium text-[#8a672f]">+ 훅</span>으로
          빠르게 저장할 수 있어요.
        </p>
      )}
    </div>
  )
}
