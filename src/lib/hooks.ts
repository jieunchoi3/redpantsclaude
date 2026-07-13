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

export type HookFetchDiagnostic = {
  table: string
  status: number | null
  rowCount: number
  error: string | null
}

export type HookLibraryData = {
  hooks: HookItem[]
  types: HookType[]
  accounts: Account[]
  usages: HookUsage[]
  error: string | null
  diagnostics: HookFetchDiagnostic[]
}

function buildHookTypeIndex(types: HookType[]) {
  const byId = new Map(types.map((type) => [type.id, type]))
  const byName = new Map(types.map((type) => [type.name.trim(), type.id]))
  return { byId, byName }
}

/** Seeds may store cp_hooks.hook_type as a type id or type name. */
export function resolveHookTypeId(
  hookType: string | null | undefined,
  types: HookType[],
): string | null {
  if (!hookType) return null
  const trimmed = hookType.trim()
  if (!trimmed) return null

  const { byId, byName } = buildHookTypeIndex(types)
  if (byId.has(trimmed)) return trimmed
  return byName.get(trimmed) ?? trimmed
}

function formatFetchError(error: {
  code?: string
  message?: string
  details?: string
  hint?: string
}): string {
  const parts = [
    error.code ? `[${error.code}]` : null,
    error.message ?? 'Unknown error',
    error.details ? `details: ${error.details}` : null,
    error.hint ? `hint: ${error.hint}` : null,
  ].filter(Boolean)
  return parts.join(' ')
}

function diagnosticFromResult(
  table: string,
  result: {
    data: unknown[] | null
    error: {
      code?: string
      message?: string
      details?: string
      hint?: string
    } | null
    status?: number
    statusText?: string
  },
): HookFetchDiagnostic {
  return {
    table,
    status: result.status ?? null,
    rowCount: result.data?.length ?? 0,
    error: result.error ? formatFetchError(result.error) : null,
  }
}

function buildHookFetchError(
  diagnostics: HookFetchDiagnostic[],
  types: HookType[],
  hooks: ContentHook[],
): string | null {
  const failures = diagnostics.filter((entry) => entry.error)
  if (failures.length > 0) {
    return failures
      .map(
        (entry) =>
          `${entry.table}: HTTP ${entry.status ?? '?'} — ${entry.error}`,
      )
      .join('\n')
  }

  if (types.length > 0) return null

  const typesDiag = diagnostics.find((entry) => entry.table === TABLES.hookTypes)
  const hooksDiag = diagnostics.find((entry) => entry.table === TABLES.hooks)
  const projectHost = (() => {
    try {
      return new URL(import.meta.env.VITE_SUPABASE_URL as string).host
    } catch {
      return 'unknown'
    }
  })()

  const lines = [
    `cp_hook_types: ${typesDiag?.rowCount ?? 0} rows (HTTP ${typesDiag?.status ?? '?'})`,
    `cp_hooks: ${hooksDiag?.rowCount ?? hooks.length} rows (HTTP ${hooksDiag?.status ?? '?'})`,
    `Supabase project: ${projectHost}`,
  ]

  if ((typesDiag?.rowCount ?? 0) === 0) {
    lines.push(
      'SQL Editor에 데이터가 보이는데 앱이 0건이면 RLS 정책이 빠졌을 수 있어요. supabase/v3_hook_library.sql 84–95행(anon all 정책)을 실행하세요.',
    )
  }

  return lines.join('\n')
}

export async function fetchHookLibrary(): Promise<HookLibraryData> {
  const sb = getSupabase()
  if (!sb) {
    return {
      hooks: [],
      types: [],
      accounts: [],
      usages: [],
      error: 'Supabase 미설정 — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 확인',
      diagnostics: [],
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

  const diagnostics: HookFetchDiagnostic[] = [
    diagnosticFromResult(TABLES.hooks, hookResult),
    diagnosticFromResult(TABLES.hookTypes, typeResult),
    diagnosticFromResult(TABLES.hookAccounts, linkResult),
    diagnosticFromResult(TABLES.hookUsages, usageResult),
    diagnosticFromResult(TABLES.accounts, accountResult),
  ]

  console.info('[hook-library] fetch diagnostics:', diagnostics)

  const types = (typeResult.error ? [] : (typeResult.data ?? [])) as HookType[]
  const hookRows = (hookResult.error ? [] : (hookResult.data ?? [])) as ContentHook[]
  const links = (linkResult.error ? [] : (linkResult.data ?? [])) as {
    hook_id: string
    account_id: string
  }[]
  const usages = (usageResult.error ? [] : (usageResult.data ?? [])) as HookUsage[]
  const accounts = (accountResult.error ? [] : (accountResult.data ?? [])) as Account[]
  const error = buildHookFetchError(diagnostics, types, hookRows)

  if (error) {
    console.warn('[hook-library] fetch issue:', error, diagnostics)
  }
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

  const hooks = hookRows.map((hook) => {
    const hookUsages = usagesByHook.get(hook.id) ?? []
    const ratings = hookUsages
      .map((usage) => usage.rating)
      .filter((rating): rating is number => typeof rating === 'number')
    return {
      ...hook,
      hook_type: resolveHookTypeId(hook.hook_type, types),
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
    types,
    accounts,
    usages,
    error,
    diagnostics,
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
