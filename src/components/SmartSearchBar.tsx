import { Loader2, Search, Sparkles, X } from 'lucide-react'
import { useMemo } from 'react'
import { CategoryChip } from './CategoryChip'
import { sortCategories, splitCategoriesByChannel } from '../lib/categoryOrder'
import type { Category } from '../types'
import type { SmartSearchState } from '../hooks/useSmartSearch'

interface SmartSearchBarProps {
  search: SmartSearchState
  categories: Category[]
  placeholder?: string
  /** Hide category filter pills (e.g. Idea Board category columns already cover this) */
  showCategoryFilters?: boolean
  /** Compact header layout (logo row) */
  compact?: boolean
}

export function SmartSearchBar({
  search,
  categories,
  placeholder = '내 아이디어 검색하기',
  showCategoryFilters = true,
  compact = false,
}: SmartSearchBarProps) {
  const { instagram, youtube } = useMemo(
    () => splitCategoriesByChannel(categories),
    [categories],
  )
  const ordered = useMemo(() => sortCategories(categories), [categories])
  const showDivider = instagram.length > 0 && youtube.length > 0
  const canSearch = Boolean(search.query.trim()) && !search.aiLoading

  function submitSearch() {
    if (!canSearch) return
    void search.runAiSearch()
  }

  return (
    <div className={compact ? 'w-full space-y-1.5' : 'space-y-2'}>
      <div
        className={
          compact
            ? 'flex items-center gap-1.5'
            : 'flex flex-col gap-2 sm:flex-row sm:items-center'
        }
      >
        <div className="relative min-w-0 flex-1">
          <Search
            className={`pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#aeaeb2] ${
              compact ? 'h-3.5 w-3.5' : 'h-4 w-4'
            }`}
          />
          <input
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              submitSearch()
            }}
            placeholder={placeholder}
            className={`w-full border border-transparent bg-white outline-none transition-all duration-200 placeholder:text-[#aeaeb2] focus:border-[#d2d2d7] focus:shadow-[var(--shadow)] ${
              compact
                ? 'rounded-xl py-2 pr-9 pl-9 text-[13px] shadow-[var(--shadow-sm)]'
                : 'rounded-2xl py-2.5 pr-10 pl-10 text-[14px] shadow-[var(--shadow-sm)]'
            }`}
          />
          {search.query && (
            <button
              type="button"
              onClick={() => {
                search.setQuery('')
                search.clearAi()
              }}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-0.5 text-[#aeaeb2] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={submitSearch}
          disabled={!canSearch}
          className={`inline-flex shrink-0 items-center justify-center gap-1.5 font-medium text-white transition hover:bg-black disabled:opacity-40 ${
            compact
              ? 'rounded-xl bg-[#1d1d1f] px-3 py-2 text-[12px]'
              : 'rounded-2xl bg-[#1d1d1f] px-4 py-2.5 text-[13px]'
          }`}
        >
          {search.aiLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          검색
        </button>
      </div>

      {showCategoryFilters && ordered.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {instagram.map((cat) => (
            <CategoryChip
              key={cat.id}
              id={cat.id}
              name={cat.name}
              channel={cat.channel}
              active={search.categoryIds.includes(cat.id)}
              onClick={() => search.toggleCategory(cat.id)}
            />
          ))}
          {showDivider && (
            <span
              className="mx-0.5 h-4 w-px shrink-0 bg-[#d2d2d7]"
              aria-hidden
            />
          )}
          {youtube.map((cat) => (
            <CategoryChip
              key={cat.id}
              id={cat.id}
              name={cat.name}
              channel={cat.channel}
              active={search.categoryIds.includes(cat.id)}
              onClick={() => search.toggleCategory(cat.id)}
            />
          ))}
        </div>
      )}

      {search.usedAi && (
        <div className="flex items-center gap-2 text-[12px] text-[#6e6e73]">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          AI 검색 결과 {search.filtered.length}개
          <button
            type="button"
            onClick={search.clearAi}
            className="font-medium text-[#1d1d1f] underline-offset-2 hover:underline"
          >
            초기화
          </button>
        </div>
      )}

      {search.aiError && (
        <p className="text-[12px] text-amber-600">{search.aiError}</p>
      )}
    </div>
  )
}
