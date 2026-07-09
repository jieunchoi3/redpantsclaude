import { useCallback, useMemo, useState } from 'react'
import { aiSearchIdeaIds, keywordFilterIdeas } from '../lib/smartSearch'
import type { Category, Idea } from '../types'

export function useSmartSearch(ideas: Idea[], categories: Category[]) {
  const [query, setQuery] = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [aiIds, setAiIds] = useState<string[] | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [usedAi, setUsedAi] = useState(false)

  const filtered = useMemo(() => {
    if (aiIds) {
      const order = new Map(aiIds.map((id, i) => [id, i]))
      return ideas
        .filter((idea) => order.has(idea.id))
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    }
    return keywordFilterIdeas(ideas, query, categoryIds)
  }, [ideas, query, categoryIds, aiIds])

  const clearAi = useCallback(() => {
    setAiIds(null)
    setUsedAi(false)
    setAiError(null)
  }, [])

  const setQueryAndClearAi = useCallback(
    (value: string) => {
      setQuery(value)
      if (aiIds) clearAi()
    },
    [aiIds, clearAi],
  )

  const toggleCategory = useCallback(
    (id: string) => {
      setCategoryIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      )
      if (aiIds) clearAi()
    },
    [aiIds, clearAi],
  )

  const runAiSearch = useCallback(async () => {
    const q = query.trim()
    if (!q || aiLoading) return

    setAiLoading(true)
    setAiError(null)
    const ids = await aiSearchIdeaIds(q, ideas, categories)
    setAiLoading(false)

    if (ids === null) {
      setAiError('AI 검색 실패 — 키워드 검색으로 표시합니다')
      setAiIds(null)
      setUsedAi(false)
      return
    }

    setAiIds(ids)
    setUsedAi(true)
  }, [query, ideas, categories, aiLoading])

  return {
    query,
    setQuery: setQueryAndClearAi,
    categoryIds,
    toggleCategory,
    filtered,
    aiLoading,
    aiError,
    usedAi,
    runAiSearch,
    clearAi,
  }
}

export type SmartSearchState = ReturnType<typeof useSmartSearch>
