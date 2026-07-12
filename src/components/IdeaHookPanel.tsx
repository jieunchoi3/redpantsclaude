import { useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Star,
} from 'lucide-react'
import { GeminiApiError } from '../lib/gemini'
import {
  fallbackHookRecommendations,
  recommendHooksWithAi,
  type HookRecommendation,
} from '../lib/hookAi'
import {
  appendHookToBrainstorm,
  scoreHookForIdea,
  type IdeaHookContext,
} from '../lib/hookRelevance'
import type { Account, HookItem, HookType, HookUsage } from '../types'
import { HookAccountChips, HookTypeBadge } from './HookBadges'

interface IdeaHookPanelProps {
  ideaId: string
  ideaTitle: string
  ideaBrainstorm: string
  accountName: string | null
  context: IdeaHookContext
  hooks: HookItem[]
  types: HookType[]
  accounts: Account[]
  usages: HookUsage[]
  loading: boolean
  brainstorm: string
  onBrainstormChange: (value: string) => void
  onApplyHook: (hookId: string, ideaId: string) => Promise<HookUsage | null>
  onUpdateUsage: (
    id: string,
    patch: Pick<HookUsage, 'rating' | 'note'>,
  ) => Promise<boolean>
}

export function IdeaHookPanel({
  ideaId,
  ideaTitle,
  ideaBrainstorm,
  accountName,
  context,
  hooks,
  types,
  accounts,
  usages,
  loading,
  brainstorm,
  onBrainstormChange,
  onApplyHook,
  onUpdateUsage,
}: IdeaHookPanelProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [expanded, setExpanded] = useState(true)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiRecommendations, setAiRecommendations] = useState<
    HookRecommendation[] | null
  >(null)
  const [aiUsedFallback, setAiUsedFallback] = useState(false)

  const typeById = useMemo(
    () => new Map(types.map((type) => [type.id, type])),
    [types],
  )
  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  )
  const ideaUsages = useMemo(
    () => usages.filter((usage) => usage.idea_id === ideaId),
    [ideaId, usages],
  )
  const usedHookIds = useMemo(
    () => new Set(ideaUsages.map((usage) => usage.hook_id)),
    [ideaUsages],
  )

  const rankedHooks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ko')
    return hooks
      .filter((hook) => {
        if (hook.archived) return false
        if (query && !hook.content.toLocaleLowerCase('ko').includes(query)) {
          return false
        }
        if (typeFilter !== 'all' && hook.hook_type !== typeFilter) return false
        return true
      })
      .map((hook) => ({
        hook,
        score: scoreHookForIdea(hook, context, typeById),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 24)
  }, [context, hooks, search, typeById, typeFilter])

  const aiReasonById = useMemo(
    () => new Map((aiRecommendations ?? []).map((item) => [item.id, item.reason])),
    [aiRecommendations],
  )

  const hookById = useMemo(
    () => new Map(hooks.map((hook) => [hook.id, hook])),
    [hooks],
  )

  async function runAiRecommend() {
    setAiLoading(true)
    setAiError(null)
    setAiUsedFallback(false)
    try {
      const result = await recommendHooksWithAi(
        {
          title: ideaTitle,
          brainstorm: ideaBrainstorm,
          context,
          accountName,
        },
        hooks,
        types,
      )
      if (result && result.length > 0) {
        setAiRecommendations(result)
        return
      }
      const fallback = fallbackHookRecommendations(hooks, context, typeById)
      setAiRecommendations(fallback)
      setAiUsedFallback(true)
      if (fallback.length === 0) {
        setAiError('추천할 훅이 없어요. 훅 라이브러리에 먼저 저장해 보세요.')
      }
    } catch (err) {
      const fallback = fallbackHookRecommendations(hooks, context, typeById)
      setAiRecommendations(fallback)
      setAiUsedFallback(true)
      setAiError(
        err instanceof GeminiApiError
          ? `${err.message}\n\n키워드 기준 추천으로 대체했어요.`
          : 'AI 추천에 실패해 키워드 기준으로 표시했어요.',
      )
    } finally {
      setAiLoading(false)
    }
  }

  async function insertHook(hook: HookItem) {
    setApplyingId(hook.id)
    const usage = await onApplyHook(hook.id, ideaId)
    setApplyingId(null)
    if (!usage) return
    onBrainstormChange(appendHookToBrainstorm(brainstorm, hook.content))
  }

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col border-t border-black/5 bg-[#fafafa] lg:w-[340px] lg:border-l lg:border-t-0">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex items-center justify-between px-4 py-3.5 text-left lg:cursor-default"
      >
        <div>
          <p className="text-[13px] font-semibold text-[#1d1d1f]">훅</p>
          <p className="text-[10px] text-[#8e8e93]">
            계정·포맷에 맞는 훅을 검색하고 삽입해요
          </p>
        </div>
        <span className="lg:hidden">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[#8e8e93]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#8e8e93]" />
          )}
        </span>
      </button>

      <div
        className={`min-h-0 flex-1 flex-col overflow-hidden ${
          expanded ? 'flex' : 'hidden lg:flex'
        }`}
      >
        <div className="space-y-2 border-b border-black/5 px-4 pb-3">
          <button
            type="button"
            disabled={aiLoading || loading}
            onClick={() => void runAiRecommend()}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#f3f0f1] px-3 py-2.5 text-[12px] font-semibold text-[#5f4d55] transition hover:bg-[#ebe4e6] disabled:opacity-45"
          >
            {aiLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            AI 훅 추천
          </button>
          {aiError && (
            <p className="whitespace-pre-wrap rounded-xl bg-[#fff4f4] px-3 py-2 text-[10px] leading-4 text-[#a45a5a]">
              {aiError}
            </p>
          )}
          {aiRecommendations && aiRecommendations.length > 0 && (
            <div className="rounded-2xl bg-white p-2.5 ring-1 ring-[#d8c4cb]/35">
              <p className="mb-2 px-1 text-[10px] font-semibold text-[#7c6870]">
                {aiUsedFallback ? '관련 훅 (키워드 기준)' : 'AI 추천 훅'}
              </p>
              <div className="max-h-52 space-y-2 overflow-y-auto">
                {aiRecommendations.map((item) => {
                  const hook = hookById.get(item.id)
                  if (!hook) return null
                  return (
                    <AiHookCard
                      key={item.id}
                      hook={hook}
                      reason={item.reason}
                      type={hook.hook_type ? typeById.get(hook.hook_type) : undefined}
                      usedHere={usedHookIds.has(hook.id)}
                      applying={applyingId === hook.id}
                      onInsert={() => void insertHook(hook)}
                    />
                  )
                })}
              </div>
            </div>
          )}
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9f]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="훅 검색"
              className="w-full rounded-xl bg-white py-2.5 pl-9 pr-3 text-[12px] outline-none ring-1 ring-black/[0.05] placeholder:text-[#b0b0b5] focus:ring-[#b49ba1]/35"
            />
          </label>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="w-full rounded-xl bg-white px-3 py-2 text-[11px] text-[#5d5d62] outline-none ring-1 ring-black/[0.05]"
          >
            <option value="all">모든 유형</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex min-h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#9b8990]" />
            </div>
          ) : rankedHooks.length === 0 ? (
            <p className="px-2 py-8 text-center text-[11px] leading-5 text-[#8e8e93]">
              조건에 맞는 훅이 없어요.
              <br />
              훅 라이브러리에서 먼저 저장해 보세요.
            </p>
          ) : (
            <div className="space-y-2">
              {rankedHooks.map(({ hook, score }) => {
                const type = hook.hook_type
                  ? typeById.get(hook.hook_type)
                  : undefined
                const usedHere = usedHookIds.has(hook.id)
                const hookAccounts = hook.account_ids
                  .map((id) => accountById.get(id))
                  .filter((account): account is Account => Boolean(account))
                return (
                  <article
                    key={hook.id}
                    className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap gap-1">
                        <HookTypeBadge
                          type={type}
                          fallback="미지정"
                          className="px-2 py-0.5 text-[9px]"
                        />
                        {score >= 48 && !aiReasonById.has(hook.id) && (
                          <span className="rounded-full bg-[#eef5f1] px-2 py-0.5 text-[9px] font-medium text-[#5f7d6c]">
                            추천
                          </span>
                        )}
                        {aiReasonById.has(hook.id) && (
                          <span className="rounded-full bg-[#f3f0f1] px-2 py-0.5 text-[9px] font-medium text-[#7c6870]">
                            AI
                          </span>
                        )}
                      </div>
                      {usedHere && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#eef5f1] px-1.5 py-0.5 text-[9px] font-semibold text-[#5f7d6c]">
                          <Check className="h-3 w-3" />
                          사용함
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-3 text-[12px] leading-5 text-[#2c2c2e]">
                      {hook.content}
                    </p>
                    {aiReasonById.get(hook.id) && (
                      <p className="mt-1.5 text-[10px] leading-4 text-[#8e8e93]">
                        {aiReasonById.get(hook.id)}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] text-[#8e8e93]">
                      <span>사용 {hook.usage_count}회</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5">
                        <Star
                          className={`h-3 w-3 ${
                            hook.average_rating !== null
                              ? 'fill-[#d5b069] text-[#d5b069]'
                              : 'text-[#c6c6ca]'
                          }`}
                        />
                        {hook.average_rating !== null
                          ? hook.average_rating.toFixed(1)
                          : '평가 없음'}
                      </span>
                      <HookAccountChips accounts={hookAccounts} max={2} />
                    </div>
                    <button
                      type="button"
                      disabled={applyingId === hook.id}
                      onClick={() => void insertHook(hook)}
                      className="mt-2.5 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-[#1d1d1f] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-black disabled:opacity-45"
                    >
                      {applyingId === hook.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          브레인스토밍에 삽입
                        </>
                      )}
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        {ideaUsages.length > 0 && (
          <div className="border-t border-black/5 bg-white/70 px-4 py-3">
            <p className="mb-2 text-[11px] font-semibold text-[#3a3a3c]">
              이 아이디어에 사용한 훅
            </p>
            <div className="max-h-44 space-y-2 overflow-y-auto">
              {ideaUsages.map((usage) => {
                const hook = hooks.find((item) => item.id === usage.hook_id)
                if (!hook) return null
                return (
                  <UsageRatingRow
                    key={usage.id}
                    hookContent={hook.content}
                    usage={usage}
                    onUpdate={onUpdateUsage}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

function AiHookCard({
  hook,
  reason,
  type,
  usedHere,
  applying,
  onInsert,
}: {
  hook: HookItem
  reason: string
  type?: HookType
  usedHere: boolean
  applying: boolean
  onInsert: () => void
}) {
  return (
    <div className="rounded-xl bg-[#fafafa] p-2.5 ring-1 ring-black/[0.04]">
      <div className="mb-1 flex items-start justify-between gap-2">
        <HookTypeBadge
          type={type}
          fallback="미지정"
          className="px-2 py-0.5 text-[9px]"
        />
        {usedHere && (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#eef5f1] px-1.5 py-0.5 text-[9px] font-semibold text-[#5f7d6c]">
            <Check className="h-3 w-3" />
            사용함
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-[11px] leading-4 text-[#2c2c2e]">
        {hook.content}
      </p>
      <p className="mt-1 text-[10px] leading-4 text-[#8e8e93]">{reason}</p>
      <button
        type="button"
        disabled={applying}
        onClick={onInsert}
        className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#1d1d1f] px-2.5 py-1.5 text-[10px] font-semibold text-white disabled:opacity-45"
      >
        {applying ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <>
            <Plus className="h-3 w-3" />
            삽입
          </>
        )}
      </button>
    </div>
  )
}

function UsageRatingRow({
  hookContent,
  usage,
  onUpdate,
}: {
  hookContent: string
  usage: HookUsage
  onUpdate: (
    id: string,
    patch: Pick<HookUsage, 'rating' | 'note'>,
  ) => Promise<boolean>
}) {
  const [rating, setRating] = useState(usage.rating ?? 0)
  const [note, setNote] = useState(usage.note ?? '')
  const [saving, setSaving] = useState(false)

  async function saveRating(nextRating: number) {
    setRating(nextRating)
    setSaving(true)
    await onUpdate(usage.id, { rating: nextRating || null, note: note || null })
    setSaving(false)
  }

  async function saveNote() {
    setSaving(true)
    await onUpdate(usage.id, {
      rating: rating || null,
      note: note.trim() || null,
    })
    setSaving(false)
  }

  return (
    <div className="rounded-xl bg-[#f7f7f9] p-2.5">
      <p className="line-clamp-2 text-[10px] leading-4 text-[#4d4d50]">
        {hookContent}
      </p>
      <div className="mt-1.5 flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            disabled={saving}
            onClick={() => void saveRating(value)}
            className="rounded p-0.5 transition hover:bg-white"
            aria-label={`${value}점`}
          >
            <Star
              className={`h-3.5 w-3.5 ${
                value <= rating
                  ? 'fill-[#d5b069] text-[#d5b069]'
                  : 'text-[#c6c6ca]'
              }`}
            />
          </button>
        ))}
      </div>
      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        onBlur={() => void saveNote()}
        placeholder="반응 메모 (조회수 등)"
        className="mt-1.5 w-full rounded-lg bg-white px-2 py-1.5 text-[10px] outline-none ring-1 ring-black/[0.04] placeholder:text-[#b0b0b5]"
      />
    </div>
  )
}
