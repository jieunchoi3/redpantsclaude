import type {
  Account,
  ContentHook,
  HookItem,
  HookMediaKind,
  HookType,
  HookUsage,
  HookUsageWithIdea,
} from '../types'
import { TABLES } from './constants'
import { getSupabase } from './supabase'

export type HookInput = {
  content: string
  hook_type: string | null
  media_kind: HookMediaKind
  image_url: string | null
  video_url: string | null
  video_file_url: string | null
  source_note: string | null
  is_inbox?: boolean
  account_ids: string[]
}

export type HookLibraryData = {
  hooks: HookItem[]
  types: HookType[]
  accounts: Account[]
  usages: HookUsage[]
  error: string | null
}

export async function fetchHookLibrary(): Promise<HookLibraryData> {
  const sb = getSupabase()
  if (!sb) {
    return {
      hooks: [],
      types: [],
      accounts: [],
      usages: [],
      error: 'Supabase 미설정',
    }
  }

  const [hookResult, typeResult, linkResult, usageResult, accountResult] =
    await Promise.all([
      sb.from(TABLES.hooks).select('*').order('created_at', { ascending: false }),
      sb
        .from(TABLES.hookTypes)
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      sb.from(TABLES.hookAccounts).select('hook_id, account_id'),
      sb.from(TABLES.hookUsages).select('*'),
      sb
        .from(TABLES.accounts)
        .select('*')
        .eq('archived', false)
        .order('workspace', { ascending: true })
        .order('sort_order', { ascending: true }),
    ])

  const firstError =
    hookResult.error ??
    typeResult.error ??
    linkResult.error ??
    usageResult.error ??
    accountResult.error
  if (firstError) {
    console.warn('[hook-library] fetch error:', firstError.message)
    return {
      hooks: [],
      types: [],
      accounts: (accountResult.data ?? []) as Account[],
      usages: [],
      error: firstError.message,
    }
  }

  const links = (linkResult.data ?? []) as {
    hook_id: string
    account_id: string
  }[]
  const usages = (usageResult.data ?? []) as HookUsage[]
  const accountIdsByHook = new Map<string, string[]>()
  const usagesByHook = new Map<string, HookUsage[]>()

  for (const link of links) {
    const current = accountIdsByHook.get(link.hook_id) ?? []
    current.push(link.account_id)
    accountIdsByHook.set(link.hook_id, current)
  }
  for (const usage of usages) {
    const current = usagesByHook.get(usage.hook_id) ?? []
    current.push(usage)
    usagesByHook.set(usage.hook_id, current)
  }

  const hooks = ((hookResult.data ?? []) as ContentHook[]).map((hook) => {
    const hookUsages = usagesByHook.get(hook.id) ?? []
    const ratings = hookUsages
      .map((usage) => usage.rating)
      .filter((rating): rating is number => typeof rating === 'number')
    return {
      ...hook,
      account_ids: accountIdsByHook.get(hook.id) ?? [],
      usage_count: Math.max(hook.used_count ?? 0, hookUsages.length),
      average_rating:
        ratings.length > 0
          ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
          : null,
    }
  })

  return {
    hooks,
    types: (typeResult.data ?? []) as HookType[],
    accounts: (accountResult.data ?? []) as Account[],
    usages,
    error: null,
  }
}

export async function recordHookUsage(
  hookId: string,
  ideaId: string,
): Promise<HookUsage | null> {
  const sb = getSupabase()
  if (!sb) return null

  const { data: usage, error } = await sb
    .from(TABLES.hookUsages)
    .insert({ hook_id: hookId, idea_id: ideaId })
    .select()
    .single()

  if (error) {
    console.warn('[cp_hook_usages] create error:', error.message)
    return null
  }

  const { data: hook, error: fetchError } = await sb
    .from(TABLES.hooks)
    .select('used_count')
    .eq('id', hookId)
    .single()

  if (!fetchError && hook) {
    const { error: countError } = await sb
      .from(TABLES.hooks)
      .update({
        used_count: (hook.used_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', hookId)
    if (countError) {
      console.warn('[cp_hooks] increment used_count error:', countError.message)
    }
  }

  return usage as HookUsage
}

export async function updateHookUsage(
  id: string,
  patch: Pick<HookUsage, 'rating' | 'note'>,
): Promise<HookUsage | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from(TABLES.hookUsages)
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) {
    console.warn('[cp_hook_usages] update error:', error.message)
    return null
  }
  return data as HookUsage
}

export async function fetchHookUsageHistory(
  hookId: string,
): Promise<HookUsageWithIdea[]> {
  const sb = getSupabase()
  if (!sb) return []

  const { data: usageRows, error } = await sb
    .from(TABLES.hookUsages)
    .select('*')
    .eq('hook_id', hookId)
    .order('used_at', { ascending: false })

  if (error) {
    console.warn('[cp_hook_usages] history error:', error.message)
    return []
  }

  const usages = (usageRows ?? []) as HookUsage[]
  const ideaIds = [
    ...new Set(
      usages
        .map((usage) => usage.idea_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]

  const titleById = new Map<string, string>()
  if (ideaIds.length > 0) {
    const { data: ideas, error: ideaError } = await sb
      .from(TABLES.ideas)
      .select('id, title')
      .in('id', ideaIds)
    if (ideaError) {
      console.warn('[cp_ideas] title lookup error:', ideaError.message)
    } else {
      for (const idea of ideas ?? []) {
        titleById.set(idea.id as string, idea.title as string)
      }
    }
  }

  return usages.map((usage) => ({
    ...usage,
    idea_title: usage.idea_id ? titleById.get(usage.idea_id) ?? null : null,
  }))
}

export async function createHook(input: HookInput): Promise<ContentHook | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { account_ids, ...payload } = input
  const { data, error } = await sb
    .from(TABLES.hooks)
    .insert({
      ...payload,
      archived: false,
      used_count: 0,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.warn('[cp_hooks] create error:', error.message)
    return null
  }

  if (account_ids.length > 0) {
    const { error: linkError } = await sb.from(TABLES.hookAccounts).insert(
      account_ids.map((accountId) => ({
        hook_id: data.id as string,
        account_id: accountId,
      })),
    )
    if (linkError) {
      console.warn('[cp_hook_accounts] create error:', linkError.message)
    }
  }
  return data as ContentHook
}

export async function updateHook(
  id: string,
  input: HookInput,
): Promise<ContentHook | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { account_ids, ...payload } = input
  const { data, error } = await sb
    .from(TABLES.hooks)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.warn('[cp_hooks] update error:', error.message)
    return null
  }

  const { error: clearError } = await sb
    .from(TABLES.hookAccounts)
    .delete()
    .eq('hook_id', id)
  if (clearError) {
    console.warn('[cp_hook_accounts] clear error:', clearError.message)
  } else if (account_ids.length > 0) {
    const { error: linkError } = await sb.from(TABLES.hookAccounts).insert(
      account_ids.map((accountId) => ({
        hook_id: id,
        account_id: accountId,
      })),
    )
    if (linkError) {
      console.warn('[cp_hook_accounts] update error:', linkError.message)
    }
  }
  return data as ContentHook
}

export async function setHookArchived(
  id: string,
  archived: boolean,
): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { error } = await sb
    .from(TABLES.hooks)
    .update({ archived, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    console.warn('[cp_hooks] archive error:', error.message)
    return false
  }
  return true
}

export async function createHookType(input: {
  name: string
  description?: string | null
  color?: string | null
  sort_order?: number
}): Promise<HookType | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from(TABLES.hookTypes)
    .insert(input)
    .select()
    .single()
  if (error) {
    console.warn('[cp_hook_types] create error:', error.message)
    return null
  }
  return data as HookType
}

export async function updateHookType(
  id: string,
  patch: Pick<HookType, 'name' | 'description' | 'color'>,
): Promise<HookType | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from(TABLES.hookTypes)
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) {
    console.warn('[cp_hook_types] update error:', error.message)
    return null
  }
  return data as HookType
}

export async function deleteHookType(id: string): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { error: unlinkError } = await sb
    .from(TABLES.hooks)
    .update({ hook_type: null, updated_at: new Date().toISOString() })
    .eq('hook_type', id)
  if (unlinkError) {
    console.warn('[cp_hooks] clear hook type error:', unlinkError.message)
    return false
  }
  const { error } = await sb.from(TABLES.hookTypes).delete().eq('id', id)
  if (error) {
    console.warn('[cp_hook_types] delete error:', error.message)
    return false
  }
  return true
}
