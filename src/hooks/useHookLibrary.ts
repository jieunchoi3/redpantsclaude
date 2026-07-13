import { useCallback, useEffect, useState } from 'react'
import type { HookAngle, HookItem, HookMedium, HookUsage } from '../types'
import {
  createHook,
  createHookAngle,
  createHookMedium,
  deleteHookAngle,
  deleteHookMedium,
  fetchHookLibrary,
  recordHookUsage,
  setHookArchived,
  updateHook,
  updateHookAngle,
  updateHookMedium,
  updateHookUsage,
  type HookInput,
} from '../lib/hooks'

export function useHookLibrary() {
  const [hooks, setHooks] = useState<HookItem[]>([])
  const [hookMediums, setHookMediums] = useState<HookMedium[]>([])
  const [hookAngles, setHookAngles] = useState<HookAngle[]>([])
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
    setHookMediums(data.mediums)
    setHookAngles(data.angles)
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

  async function addHookMedium(input: {
    name: string
    description?: string | null
    color?: string | null
  }) {
    const created = await createHookMedium({
      ...input,
      sort_order: hookMediums.length + 1,
    })
    if (!created) return null
    setHookMediums((current) => [...current, created])
    return created
  }

  async function patchHookMedium(
    id: string,
    patch: Pick<HookMedium, 'name' | 'description' | 'color'>,
  ) {
    const updated = await updateHookMedium(id, patch)
    if (!updated) return false
    setHookMediums((current) =>
      current.map((medium) => (medium.id === id ? updated : medium)),
    )
    return true
  }

  async function removeHookMedium(id: string) {
    const ok = await deleteHookMedium(id)
    if (ok) {
      setHookMediums((current) => current.filter((medium) => medium.id !== id))
      setHooks((current) =>
        current.map((hook) => ({
          ...hook,
          medium_ids: hook.medium_ids.filter((mediumId) => mediumId !== id),
        })),
      )
    }
    return ok
  }

  async function addHookAngle(input: {
    name: string
    description?: string | null
    color?: string | null
  }) {
    const created = await createHookAngle({
      ...input,
      sort_order: hookAngles.length + 1,
    })
    if (!created) return null
    setHookAngles((current) => [...current, created])
    return created
  }

  async function patchHookAngle(
    id: string,
    patch: Pick<HookAngle, 'name' | 'description' | 'color'>,
  ) {
    const updated = await updateHookAngle(id, patch)
    if (!updated) return false
    setHookAngles((current) =>
      current.map((angle) => (angle.id === id ? updated : angle)),
    )
    return true
  }

  async function removeHookAngle(id: string) {
    const ok = await deleteHookAngle(id)
    if (ok) {
      setHookAngles((current) => current.filter((angle) => angle.id !== id))
      setHooks((current) =>
        current.map((hook) => ({
          ...hook,
          angle_ids: hook.angle_ids.filter((angleId) => angleId !== id),
        })),
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
    hookMediums,
    hookAngles,
    hookAccounts,
    usages,
    loading,
    error,
    diagnostics,
    addHook,
    patchHook,
    archiveHook,
    restoreHook,
    addHookMedium,
    patchHookMedium,
    removeHookMedium,
    addHookAngle,
    patchHookAngle,
    removeHookAngle,
    applyHookToIdea,
    patchHookUsage,
  }
}
