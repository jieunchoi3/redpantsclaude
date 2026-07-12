import { useCallback, useEffect, useState } from 'react'
import {
  ACCOUNT_COLORS,
  createAccount,
  fetchAccounts,
  updateAccount,
} from '../lib/accounts'
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
import type { Workspace } from '../lib/workspace'
import type {
  AppMeta,
  Account,
  Category,
  Channel,
  Idea,
} from '../types'

export function usePlannerData(workspace: Workspace) {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [archivedIdeas, setArchivedIdeas] = useState<Idea[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [appMeta, setAppMeta] = useState<AppMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase 미설정')
      setLoading(false)
      return
    }

    const [active, archived, cats, accountRows, meta] = await Promise.all([
      fetchIdeas(workspace, { archived: false }),
      fetchIdeas(workspace, { archived: true }),
      fetchCategories(workspace),
      fetchAccounts(workspace),
      workspace === 'redpants' ? fetchAppMeta() : Promise.resolve(null),
    ])

    setIdeas(active)
    setArchivedIdeas(archived)
    setCategories(cats)
    setAccounts(accountRows)
    setAppMeta(meta)
    setError(null)
    setLoading(false)
  }, [workspace])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addIdea = useCallback(async (input?: IdeaInsert) => {
    const created = await createIdea(workspace, input)
    if (created) setIdeas((prev) => [created, ...prev])
    return created
  }, [workspace])

  const patchIdea = useCallback(async (id: string, patch: IdeaUpdate) => {
    const updated = await updateIdea(workspace, id, patch)
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
  }, [workspace])

  const archiveIdea = useCallback(async (id: string) => {
    const ok = await softDeleteIdea(workspace, id)
    if (!ok) return false
    setIdeas((prev) => {
      const found = prev.find((i) => i.id === id)
      if (found) {
        setArchivedIdeas((arch) => [{ ...found, archived: true }, ...arch])
      }
      return prev.filter((i) => i.id !== id)
    })
    return true
  }, [workspace])

  const unarchiveIdea = useCallback(async (id: string) => {
    const ok = await restoreIdea(workspace, id)
    if (!ok) return false
    setArchivedIdeas((prev) => {
      const found = prev.find((i) => i.id === id)
      if (found) {
        setIdeas((active) => [{ ...found, archived: false }, ...active])
      }
      return prev.filter((i) => i.id !== id)
    })
    return true
  }, [workspace])

  const removeIdeaForever = useCallback(async (id: string) => {
    const ok = await permanentlyDeleteIdea(workspace, id)
    if (!ok) return false
    setArchivedIdeas((prev) => prev.filter((i) => i.id !== id))
    setIdeas((prev) => prev.filter((i) => i.id !== id))
    return true
  }, [workspace])

  const addCategory = useCallback(
    async (name: string, channel: Channel, accountId?: string | null) => {
      const maxOrder = categories
        .filter((c) => c.channel === channel)
        .reduce((max, c) => Math.max(max, c.sort_order), 0)
      const created = await createCategory({
        workspace,
        account_id: accountId ?? null,
        name,
        channel,
        sort_order: maxOrder + 1,
      })
      if (created) setCategories((prev) => [...prev, created])
      return created
    },
    [categories, workspace],
  )

  const renameCategory = useCallback(async (id: string, name: string) => {
    const updated = await updateCategory(workspace, id, { name })
    if (updated) {
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)))
    }
    return updated
  }, [workspace])

  const removeCategory = useCallback(async (id: string) => {
    const ok = await deleteCategory(workspace, id)
    if (!ok) return false
    setCategories((prev) => prev.filter((c) => c.id !== id))
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.category_id === id ? { ...idea, category_id: null } : idea,
      ),
    )
    return true
  }, [workspace])

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

  const addAccount = useCallback(
    async (name: string, color?: string) => {
      const maxOrder = accounts.reduce(
        (max, account) => Math.max(max, account.sort_order),
        0,
      )
      const created = await createAccount(workspace, {
        name,
        color:
          color ??
          ACCOUNT_COLORS[accounts.length % ACCOUNT_COLORS.length]!,
        sort_order: maxOrder + 1,
      })
      if (created) setAccounts((prev) => [...prev, created])
      return created
    },
    [accounts, workspace],
  )

  const patchAccount = useCallback(
    async (
      id: string,
      patch: Partial<Pick<Account, 'name' | 'color' | 'sort_order' | 'notes'>>,
    ) => {
      const updated = await updateAccount(workspace, id, patch)
      if (updated) {
        setAccounts((prev) =>
          prev.map((account) => (account.id === id ? updated : account)),
        )
      }
      return updated
    },
    [workspace],
  )

  const patchAccountNotes = useCallback(
    async (id: string, notes: string) => {
      const updated = await updateAccount(workspace, id, { notes })
      if (updated) {
        setAccounts((prev) =>
          prev.map((account) => (account.id === id ? updated : account)),
        )
        return true
      }
      return false
    },
    [workspace],
  )

  const archiveAccount = useCallback(
    async (id: string) => {
      const updated = await updateAccount(workspace, id, { archived: true })
      if (!updated) return false
      setAccounts((prev) => prev.filter((account) => account.id !== id))
      return true
    },
    [workspace],
  )

  return {
    ideas,
    archivedIdeas,
    categories,
    accounts,
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
    addAccount,
    patchAccount,
    patchAccountNotes,
    archiveAccount,
  }
}

export type PlannerData = ReturnType<typeof usePlannerData>
