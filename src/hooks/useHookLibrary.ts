import { useCallback, useEffect, useState } from 'react'
import type { HookItem, HookType, HookUsage } from '../types'
import {
  createHook,
  createHookType,
  deleteHookType,
  fetchHookLibrary,
  recordHookUsage,
  setHookArchived,
  updateHook,
  updateHookType,
  updateHookUsage,
  type HookInput,
} from '../lib/hooks'

export function useHookLibrary() {
  const [hooks, setHooks] = useState<HookItem[]>([])
  const [hookTypes, setHookTypes] = useState<HookType[]>([])
  const [hookAccounts, setHookAccounts] = useState<
    Awaited<ReturnType<typeof fetchHookLibrary>>['accounts']
  >([])
  const [usages, setUsages] = useState<HookUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [diagnostics, setDiagnostics] = useState<
    Awaited<ReturnType<typeof fetchHookLibrary>>['diagnostics']
  >([])

  const reload = useCallback(async () => {
    setLoading(true)
    const data = await fetchHookLibrary()
    setHooks(data.hooks)
    setHookTypes(data.types)
    setHookAccounts(data.accounts)
    setUsages(data.usages)
    setError(data.error)
    setDiagnostics(data.diagnostics)
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function addHook(input: HookInput) {
    const created = await createHook(input)
    if (!created) return false
    await reload()
    return true
  }

  async function patchHook(id: string, input: HookInput) {
    const updated = await updateHook(id, input)
    if (!updated) return false
    await reload()
    return true
  }

  async function archiveHook(id: string) {
    const ok = await setHookArchived(id, true)
    if (ok) {
      setHooks((current) =>
        current.map((hook) =>
          hook.id === id ? { ...hook, archived: true } : hook,
        ),
      )
    }
    return ok
  }

  async function restoreHook(id: string) {
    const ok = await setHookArchived(id, false)
    if (ok) {
      setHooks((current) =>
        current.map((hook) =>
          hook.id === id ? { ...hook, archived: false } : hook,
        ),
      )
    }
    return ok
  }

  async function addHookType(input: {
    name: string
    description?: string | null
    color?: string | null
  }) {
    const created = await createHookType({
      ...input,
      sort_order: hookTypes.length + 1,
    })
    if (!created) return null
    setHookTypes((current) => [...current, created])
    return created
  }

  async function patchHookType(
    id: string,
    patch: Pick<HookType, 'name' | 'description' | 'color'>,
  ) {
    const updated = await updateHookType(id, patch)
    if (!updated) return false
    setHookTypes((current) =>
      current.map((type) => (type.id === id ? updated : type)),
    )
    return true
  }

  async function removeHookType(id: string) {
    const ok = await deleteHookType(id)
    if (ok) {
      setHookTypes((current) => current.filter((type) => type.id !== id))
      setHooks((current) =>
        current.map((hook) =>
          hook.hook_type === id ? { ...hook, hook_type: null } : hook,
        ),
      )
    }
    return ok
  }

  async function applyHookToIdea(hookId: string, ideaId: string) {
    const usage = await recordHookUsage(hookId, ideaId)
    if (!usage) return null
    setUsages((current) => [...current, usage])
    setHooks((current) =>
      current.map((hook) =>
        hook.id === hookId
          ? {
              ...hook,
              usage_count: hook.usage_count + 1,
            }
          : hook,
      ),
    )
    return usage
  }

  async function patchHookUsage(
    id: string,
    patch: Pick<HookUsage, 'rating' | 'note'>,
  ) {
    const updated = await updateHookUsage(id, patch)
    if (!updated) return false
    setUsages((current) =>
      current.map((usage) => (usage.id === id ? updated : usage)),
    )
    await reload()
    return true
  }

  return {
    hooks,
    hookTypes,
    hookAccounts,
    usages,
    loading,
    error,
    diagnostics,
    addHook,
    patchHook,
    archiveHook,
    restoreHook,
    addHookType,
    patchHookType,
    removeHookType,
    applyHookToIdea,
    patchHookUsage,
  }
}
