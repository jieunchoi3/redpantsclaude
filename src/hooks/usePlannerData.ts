import { useCallback, useEffect, useState } from 'react'
import { fetchAppMeta, updateAppMeta } from '../lib/appMeta'
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from '../lib/categories'
import {
  createIdea,
  fetchIdeas,
  permanentlyDeleteIdea,
  restoreIdea,
  softDeleteIdea,
  updateIdea,
  type IdeaInsert,
  type IdeaUpdate,
} from '../lib/ideas'
import { isSupabaseConfigured } from '../lib/supabase'
import type { GoalKey } from '../lib/weeklyGoals'
import type {
  AppMeta,
  Category,
  Channel,
  Idea,
} from '../types'

export function usePlannerData() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [archivedIdeas, setArchivedIdeas] = useState<Idea[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [appMeta, setAppMeta] = useState<AppMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase 미설정')
      setLoading(false)
      return
    }

    const [active, archived, cats, meta] = await Promise.all([
      fetchIdeas({ archived: false }),
      fetchIdeas({ archived: true }),
      fetchCategories(),
      fetchAppMeta(),
    ])

    setIdeas(active)
    setArchivedIdeas(archived)
    setCategories(cats)
    setAppMeta(meta)
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addIdea = useCallback(async (input?: IdeaInsert) => {
    const created = await createIdea(input)
    if (created) setIdeas((prev) => [created, ...prev])
    return created
  }, [])

  const patchIdea = useCallback(async (id: string, patch: IdeaUpdate) => {
    const updated = await updateIdea(id, patch)
    if (!updated) return null

    if (updated.archived) {
      setIdeas((prev) => prev.filter((i) => i.id !== id))
      setArchivedIdeas((prev) => {
        const without = prev.filter((i) => i.id !== id)
        return [updated, ...without]
      })
    } else {
      setArchivedIdeas((prev) => prev.filter((i) => i.id !== id))
      setIdeas((prev) => {
        const exists = prev.some((i) => i.id === id)
        if (!exists) return [updated, ...prev]
        return prev.map((i) => (i.id === id ? updated : i))
      })
    }

    return updated
  }, [])

  const archiveIdea = useCallback(async (id: string) => {
    const ok = await softDeleteIdea(id)
    if (!ok) return false
    setIdeas((prev) => {
      const found = prev.find((i) => i.id === id)
      if (found) {
        setArchivedIdeas((arch) => [{ ...found, archived: true }, ...arch])
      }
      return prev.filter((i) => i.id !== id)
    })
    return true
  }, [])

  const unarchiveIdea = useCallback(async (id: string) => {
    const ok = await restoreIdea(id)
    if (!ok) return false
    setArchivedIdeas((prev) => {
      const found = prev.find((i) => i.id === id)
      if (found) {
        setIdeas((active) => [{ ...found, archived: false }, ...active])
      }
      return prev.filter((i) => i.id !== id)
    })
    return true
  }, [])

  const removeIdeaForever = useCallback(async (id: string) => {
    const ok = await permanentlyDeleteIdea(id)
    if (!ok) return false
    setArchivedIdeas((prev) => prev.filter((i) => i.id !== id))
    setIdeas((prev) => prev.filter((i) => i.id !== id))
    return true
  }, [])

  const addCategory = useCallback(
    async (name: string, channel: Channel) => {
      const maxOrder = categories
        .filter((c) => c.channel === channel)
        .reduce((max, c) => Math.max(max, c.sort_order), 0)
      const created = await createCategory({
        name,
        channel,
        sort_order: maxOrder + 1,
      })
      if (created) setCategories((prev) => [...prev, created])
      return created
    },
    [categories],
  )

  const renameCategory = useCallback(async (id: string, name: string) => {
    const updated = await updateCategory(id, { name })
    if (updated) {
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)))
    }
    return updated
  }, [])

  const removeCategory = useCallback(async (id: string) => {
    const ok = await deleteCategory(id)
    if (!ok) return false
    setCategories((prev) => prev.filter((c) => c.id !== id))
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.category_id === id ? { ...idea, category_id: null } : idea,
      ),
    )
    return true
  }, [])

  const patchGoals = useCallback(
    async (patch: Partial<Pick<AppMeta, GoalKey>>) => {
      const ok = await updateAppMeta(patch)
      if (ok) {
        setAppMeta((prev) =>
          prev
            ? { ...prev, ...patch, updated_at: new Date().toISOString() }
            : prev,
        )
      }
      return ok
    },
    [],
  )

  return {
    ideas,
    archivedIdeas,
    categories,
    appMeta,
    loading,
    error,
    refresh,
    addIdea,
    patchIdea,
    archiveIdea,
    unarchiveIdea,
    removeIdeaForever,
    addCategory,
    renameCategory,
    removeCategory,
    patchGoals,
  }
}

export type PlannerData = ReturnType<typeof usePlannerData>
