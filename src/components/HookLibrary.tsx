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
import type { Account, HookAngle, HookItem, HookMedium, HookSourceKind } from '../types'
import type { HookFetchDiagnostic, HookInput } from '../lib/hooks'
import { analysisSearchText } from '../lib/hookAnalysis'
import { HookAccountChips, HookAngleBadge, HookMediumBadge } from './HookBadges'
import { HookAxisFilterRow } from './HookAxisMultiSelect'
import { HookEditorModal } from './HookEditorModal'
import { HookMediaPreview } from './HookMediaPreview'
import { HookUsageHistoryModal } from './HookUsageHistoryModal'
import { HookTaxonomyManagerModal } from './HookTypeManagerModal'

type HookSort = 'latest' | 'used' | 'rating'
type HookLayout = 'grid' | 'list'

interface HookLibraryProps {
  hooks: HookItem[]
  mediums: HookMedium[]
  angles: HookAngle[]
  accounts: Account[]
  loading: boolean
  error: string | null
  diagnostics: HookFetchDiagnostic[]
  onAdd: (input: HookInput) => Promise<boolean>
  onUpdate: (id: string, input: HookInput) => Promise<boolean>
  onArchive: (id: string) => Promise<boolean>
  onRestore: (id: string) => Promise<boolean>
  onAddMedium: (input: {
    name: string
    description?: string | null
    color?: string | null
  }) => Promise<HookMedium | null>
  onUpdateMedium: (
    id: string,
    patch: Pick<HookMedium, 'name' | 'description' | 'color'>,
  ) => Promise<boolean>
  onDeleteMedium: (id: string) => Promise<boolean>
  onAddAngle: (input: {
    name: string
    description?: string | null
    color?: string | null
  }) => Promise<HookAngle | null>
  onUpdateAngle: (
    id: string,
    patch: Pick<HookAngle, 'name' | 'description' | 'color'>,
  ) => Promise<boolean>
  onDeleteAngle: (id: string) => Promise<boolean>
}

export function HookLibrary({
  hooks,
  mediums,
  angles,
  accounts,
  loading,
  error,
  diagnostics,
  onAdd,
  onUpdate,
  onArchive,
  onRestore,
  onAddMedium,
  onUpdateMedium,
  onDeleteMedium,
  onAddAngle,
  onUpdateAngle,
  onDeleteAngle,
}: HookLibraryProps) {
  const [search, setSearch] = useState('')
  const [mediumFilter, setMediumFilter] = useState<Set<string>>(new Set())
  const [angleFilter, setAngleFilter] = useState<Set<string>>(new Set())
  const [accountFilter, setAccountFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState<HookSourceKind | 'all'>('all')
  const [draftSource, setDraftSource] = useState<HookSourceKind>('reference')
  const [sort, setSort] = useState<HookSort>('latest')
  const [layout, setLayout] = useState<HookLayout>('grid')
  const [showTrash, setShowTrash] = useState(false)
  const [showInbox, setShowInbox] = useState(false)
  const [showTaxonomyManager, setShowTaxonomyManager] = useState(false)
  const [editing, setEditing] = useState<HookItem | null | undefined>()
  const [historyHook, setHistoryHook] = useState<HookItem | null>(null)

  const mediumById = useMemo(
    () => new Map(mediums.map((medium) => [medium.id, medium])),
    [mediums],
  )
  const angleById = useMemo(
    () => new Map(angles.map((angle) => [angle.id, angle])),
    [angles],
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
      if (sourceFilter !== 'all' && hook.source_kind !== sourceFilter) {
        return false
      }
      if (query) {
        const haystack = [
          hook.content,
          hook.source_note,
          hook.video_url,
          analysisSearchText(hook.analysis),
        ]
          .filter(Boolean)
          .join('\n')
          .toLocaleLowerCase('ko')
        if (!haystack.includes(query)) return false
      }
      if (mediumFilter.size > 0) {
        const hasMedium = hook.medium_ids.some((id) => mediumFilter.has(id))
        if (!hasMedium) return false
      }
      if (angleFilter.size > 0) {
        const hasAngle = hook.angle_ids.some((id) => angleFilter.has(id))
        if (!hasAngle) return false
      }
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
    angleFilter,
    hooks,
    mediumFilter,
    search,
    showTrash,
    showInbox,
    sort,
    sourceFilter,
  ])

  const accountDigest = useMemo(() => {
    if (accountFilter === 'all') return null
    const account = accountById.get(accountFilter)
    if (!account) return null
    const related = hooks.filter(
      (hook) => !hook.archived && hook.account_ids.includes(account.id),
    )
    const own = related.filter((hook) => hook.source_kind === 'own')
    const reference = related.filter((hook) => hook.source_kind !== 'own')
    const patterns = new Map<string, number>()
    for (const hook of own) {
      const pattern = hook.analysis?.pattern.trim()
      if (!pattern) continue
      patterns.set(pattern, (patterns.get(pattern) ?? 0) + 1)
    }
    return {
      account,
      own,
      reference,
      analyzed: own.filter((hook) => hook.analysis).length,
      patterns: [...patterns.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4),
    }
  }, [accountById, accountFilter, hooks])

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
                저장만 하지 않고, 분해된 패턴으로 다시 찾습니다
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!showTrash && (
              <>
                <button
                  type="button"
                  onClick={() => setShowTaxonomyManager(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5f5f7] px-3 py-2.5 text-[12px] font-medium text-[#6e6e73] transition hover:bg-[#ededf0]"
                >
                  <Palette className="h-3.5 w-3.5" />
                  분류 관리
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
                onClick={() => {
                  setDraftSource(sourceFilter === 'own' ? 'own' : 'reference')
                  setEditing(null)
                }}
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
              placeholder="훅, 패턴, 분해 내용 검색"
              className="w-full rounded-2xl bg-[#f5f5f7] py-3 pl-10 pr-4 text-[13px] text-[#1d1d1f] outline-none ring-1 ring-transparent transition placeholder:text-[#a4a4a9] focus:bg-white focus:ring-[#b49ba1]/35"
            />
          </label>
          <div className="flex flex-wrap gap-2">
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

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['all', '전체'],
              ['reference', '레퍼런스'],
              ['own', '내 콘텐츠'],
            ] as [HookSourceKind | 'all', string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSourceFilter(id)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                sourceFilter === id
                  ? 'bg-[#1d1d1f] text-white'
                  : 'bg-[#f5f5f7] text-[#5d5d62] hover:bg-[#ededf0]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!showTrash && (mediums.length > 0 || angles.length > 0) && (
          <div className="space-y-2">
            <HookAxisFilterRow
              kind="medium"
              label="매체"
              items={mediums}
              selectedIds={mediumFilter}
              onToggle={(id) =>
                setMediumFilter((current) => {
                  const next = new Set(current)
                  if (next.has(id)) next.delete(id)
                  else next.add(id)
                  return next
                })
              }
              onClear={() => setMediumFilter(new Set())}
            />
            <HookAxisFilterRow
              kind="angle"
              label="앵글"
              items={angles}
              selectedIds={angleFilter}
              onToggle={(id) =>
                setAngleFilter((current) => {
                  const next = new Set(current)
                  if (next.has(id)) next.delete(id)
                  else next.add(id)
                  return next
                })
              }
              onClear={() => setAngleFilter(new Set())}
            />
          </div>
        )}
      </div>

      {accountDigest && (
        <div className="mb-4 rounded-[24px] bg-white p-5 shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[12px] font-medium text-[#8e8e93]">계정 데이터</p>
              <h3 className="mt-1 text-[18px] font-semibold text-[#1d1d1f]">
                {accountDigest.account.name}
              </h3>
            </div>
            <p className="text-[12px] text-[#6e6e73]">
              내 콘텐츠 {accountDigest.own.length}개 · 분해{' '}
              {accountDigest.analyzed}개 · 레퍼런스 {accountDigest.reference.length}개
            </p>
          </div>
          {accountDigest.patterns.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {accountDigest.patterns.map(([pattern, count]) => (
                <li
                  key={pattern}
                  className="rounded-xl bg-[#f6f4f5] px-3 py-2 text-[12px] leading-5 text-[#3a3a3c]"
                >
                  <span className="mr-2 text-[10px] font-semibold text-[#8d6d76]">
                    {count}회
                  </span>
                  {pattern}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[12px] leading-5 text-[#8e8e93]">
              이 계정으로 내 영상을 올리고 AI 분해를 하면, 반복되는 패턴이 여기에 모여요.
            </p>
          )}
        </div>
      )}

      {error ? (
        <div className="rounded-[24px] border border-[#e9d8dc] bg-[#fff9fa] p-7 text-center">
          <p className="text-[14px] font-semibold text-[#76545e]">
            훅 데이터를 불러오지 못했어요
          </p>
          <p className="mx-auto mt-2 max-w-xl text-[12px] leading-5 text-[#927680]">
            Supabase SQL Editor에서{' '}
            <code className="rounded bg-white px-1.5 py-0.5">
              supabase/v3_hook_library.sql
            </code>{' '}
            또는{' '}
            <code className="rounded bg-white px-1.5 py-0.5">
              supabase/v4_hook_taxonomy_rls.sql
            </code>
            을 실행해 주세요.
          </p>
          <pre className="mx-auto mt-3 max-w-2xl whitespace-pre-wrap break-words rounded-xl bg-white px-4 py-3 text-left font-mono text-[10px] leading-5 text-[#a45a5a]">
            {error}
          </pre>
          {diagnostics.length > 0 && (
            <details className="mx-auto mt-3 max-w-2xl text-left">
              <summary className="cursor-pointer text-[11px] font-medium text-[#8e8e93]">
                테이블별 raw 응답
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-[#f5f5f7] px-3 py-2 font-mono text-[10px] leading-5 text-[#6e6e73]">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </details>
          )}
        </div>
      ) : visibleHooks.length === 0 ? (
        <HookEmptyState
          trash={showTrash}
          inbox={showInbox}
          hasFilters={
            Boolean(search) ||
            mediumFilter.size > 0 ||
            angleFilter.size > 0 ||
            accountFilter !== 'all' ||
            showInbox
          }
          onAdd={() => setEditing(null)}
        />
      ) : (
        <div
          className={
            layout === 'grid'
              ? 'columns-1 gap-4 md:columns-2 xl:columns-3'
              : 'flex flex-col gap-3'
          }
        >
          {visibleHooks.map((hook) => (
            <HookCard
              key={hook.id}
              hook={hook}
              mediums={hook.medium_ids
                .map((id) => mediumById.get(id))
                .filter((medium): medium is HookMedium => Boolean(medium))}
              angles={hook.angle_ids
                .map((id) => angleById.get(id))
                .filter((angle): angle is HookAngle => Boolean(angle))}
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
          key={editing?.id ?? 'new'}
          hook={editing}
          mediums={mediums}
          angles={angles}
          accounts={accounts}
          existingHooks={hooks}
          onClose={() => setEditing(undefined)}
          onSave={(input) =>
            editing ? onUpdate(editing.id, input) : onAdd(input)
          }
          onCreateHooks={createMultiple}
          onAddMedium={onAddMedium}
          onUpdateMedium={onUpdateMedium}
          onDeleteMedium={onDeleteMedium}
          onAddAngle={onAddAngle}
          onUpdateAngle={onUpdateAngle}
          onDeleteAngle={onDeleteAngle}
          defaultSourceKind={draftSource}
        />
      )}
      {showTaxonomyManager && (
        <HookTaxonomyManagerModal
          mediums={mediums}
          angles={angles}
          hooks={hooks}
          loading={loading}
          fetchError={error}
          diagnostics={diagnostics}
          onClose={() => setShowTaxonomyManager(false)}
          onAddMedium={onAddMedium}
          onUpdateMedium={onUpdateMedium}
          onDeleteMedium={onDeleteMedium}
          onAddAngle={onAddAngle}
          onUpdateAngle={onUpdateAngle}
          onDeleteAngle={onDeleteAngle}
        />
      )}
      {historyHook && (
        <HookUsageHistoryModal
          hook={historyHook}
          mediums={historyHook.medium_ids
            .map((id) => mediumById.get(id))
            .filter((medium): medium is HookMedium => Boolean(medium))}
          angles={historyHook.angle_ids
            .map((id) => angleById.get(id))
            .filter((angle): angle is HookAngle => Boolean(angle))}
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
  mediums,
  angles,
  accounts,
  layout,
  trash,
  onEdit,
  onViewHistory,
  onArchive,
  onRestore,
}: {
  hook: HookItem
  mediums: HookMedium[]
  angles: HookAngle[]
  accounts: Account[]
  layout: HookLayout
  trash: boolean
  onEdit: () => void
  onViewHistory: () => void
  onArchive: () => void
  onRestore: () => void
}) {
  const isList = layout === 'list'
  const accentColor = angles[0]?.color ?? mediums[0]?.color
  const missingFile =
    (hook.media_kind === 'image' && !hook.image_url) ||
    (hook.media_kind === 'video_file' && !hook.video_file_url)
  return (
    <article
      className={`group overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-sm)] ring-1 ring-black/[0.035] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow)] ${
        isList ? 'flex min-h-36' : 'mb-4 flex break-inside-avoid flex-col'
      }`}
      style={
        !isList && accentColor
          ? { boxShadow: `var(--shadow-sm), inset 0 2px 0 0 ${accentColor}55` }
          : undefined
      }
    >
      <HookMediaPreview hook={hook} compact={isList} />
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {hook.source_kind === 'own' && (
              <span className="rounded-full bg-[#eef3f8] px-2.5 py-1 text-[10px] font-semibold text-[#4d6278]">
                내 콘텐츠
              </span>
            )}
            {hook.is_inbox && (
              <span className="rounded-full bg-[#fff1d8] px-2.5 py-1 text-[10px] font-semibold text-[#8a672f]">
                인박스
              </span>
            )}
            {mediums.map((medium) => (
              <HookMediumBadge key={medium.id} medium={medium} />
            ))}
            {angles.map((angle) => (
              <HookAngleBadge key={angle.id} angle={angle} />
            ))}
            {mediums.length === 0 && angles.length === 0 && (
              <HookAngleBadge fallback="분류 미지정" />
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

        {hook.analysis && (
          <div className="mt-3 rounded-xl bg-[#f6f4f5] px-3 py-2.5">
            <p className="text-[10px] font-semibold text-[#8d6d76]">다시 쓸 패턴</p>
            <p className="mt-0.5 text-[12px] leading-5 text-[#2c2c2e]">
              {hook.analysis.pattern || hook.analysis.hook_line}
            </p>
            {hook.analysis.takeaway && (
              <p className="mt-1 text-[11px] leading-4 text-[#6e6e73]">
                {hook.analysis.takeaway}
              </p>
            )}
          </div>
        )}

        {hook.media_kind === 'video_file' && hook.video_url && (
          <a
            href={hook.video_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block truncate text-[11px] text-[#6d5a62] underline-offset-2 hover:underline"
          >
            원본 릴스 열기
          </a>
        )}

        {hook.source_note && (
          <p className="mt-2 line-clamp-1 text-[11px] text-[#9a9a9f]">
            추가 메모 · {hook.source_note}
          </p>
        )}
        {missingFile && (
          <p className="mt-2 text-[11px] text-[#b0a0a4]">
            파일이 저장되지 않았어요. 편집에서 다시 올려 주세요.
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
