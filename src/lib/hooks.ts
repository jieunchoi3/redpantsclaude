import type {
  Account,
  ContentHook,
  HookAngle,
  HookItem,
  HookMediaKind,
  HookMedium,
  HookTaxonomy,
  HookUsage,
  HookUsageWithIdea,
} from '../types'
import { TABLES } from './constants'
import { getSupabase } from './supabase'

export type HookInput = {
  content: string
  medium_ids: string[]
  angle_ids: string[]
  media_kind: HookMediaKind
  image_url: string | null
  video_url: string | null
  video_file_url: string | null
  source_note: string | null
  is_inbox?: boolean
  account_ids: string[]
}

export type TaxonomyInput = {
  name: string
  description?: string | null
  color?: string | null
  sort_order?: number
}

export type HookFetchDiagnostic = {
  table: string
  status: number | null
  rowCount: number
  error: string | null
}

export type HookLibraryData = {
  hooks: HookItem[]
  mediums: HookMedium[]
  angles: HookAngle[]
  accounts: Account[]
  usages: HookUsage[]
  error: string | null
  diagnostics: HookFetchDiagnostic[]
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
  mediums: HookMedium[],
  angles: HookAngle[],
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

  if (mediums.length > 0 || angles.length > 0) return null

  const mediumsDiag = diagnostics.find(
    (entry) => entry.table === TABLES.hookMediums,
  )
  const anglesDiag = diagnostics.find((entry) => entry.table === TABLES.hookAngles)
  const hooksDiag = diagnostics.find((entry) => entry.table === TABLES.hooks)
  const projectHost = (() => {
    try {
      return new URL(import.meta.env.VITE_SUPABASE_URL as string).host
    } catch {
      return 'unknown'
    }
  })()

  const lines = [
    `cp_hook_mediums: ${mediumsDiag?.rowCount ?? 0} rows (HTTP ${mediumsDiag?.status ?? '?'})`,
    `cp_hook_angles: ${anglesDiag?.rowCount ?? 0} rows (HTTP ${anglesDiag?.status ?? '?'})`,
    `cp_hooks: ${hooksDiag?.rowCount ?? hooks.length} rows (HTTP ${hooksDiag?.status ?? '?'})`,
    `Supabase project: ${projectHost}`,
  ]

  if ((mediumsDiag?.rowCount ?? 0) === 0 && (anglesDiag?.rowCount ?? 0) === 0) {
    lines.push(
      'SQL Editor에 데이터가 보이는데 앱이 0건이면 RLS 정책이 빠졌을 수 있어요. supabase/v4_hook_taxonomy_rls.sql 을 실행하세요.',
    )
  }

  return lines.join('\n')
}

function buildIdsByHook<T extends { hook_id: string }>(
  rows: T[],
  idKey: keyof T,
): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const row of rows) {
    const hookId = row.hook_id
    const refId = String(row[idKey])
    const current = map.get(hookId) ?? []
    current.push(refId)
    map.set(hookId, current)
  }
  return map
}

async function syncHookMediumMap(
  hookId: string,
  mediumIds: string[],
): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { error: clearError } = await sb
    .from(TABLES.hookMediumMap)
    .delete()
    .eq('hook_id', hookId)
  if (clearError) {
    console.warn('[cp_hook_medium_map] clear error:', clearError.message)
    return false
  }
  if (mediumIds.length === 0) return true
  const { error } = await sb.from(TABLES.hookMediumMap).insert(
    mediumIds.map((mediumId) => ({ hook_id: hookId, medium_id: mediumId })),
  )
  if (error) {
    console.warn('[cp_hook_medium_map] insert error:', error.message)
    return false
  }
  return true
}

async function syncHookAngleMap(
  hookId: string,
  angleIds: string[],
): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { error: clearError } = await sb
    .from(TABLES.hookAngleMap)
    .delete()
    .eq('hook_id', hookId)
  if (clearError) {
    console.warn('[cp_hook_angle_map] clear error:', clearError.message)
    return false
  }
  if (angleIds.length === 0) return true
  const { error } = await sb.from(TABLES.hookAngleMap).insert(
    angleIds.map((angleId) => ({ hook_id: hookId, angle_id: angleId })),
  )
  if (error) {
    console.warn('[cp_hook_angle_map] insert error:', error.message)
    return false
  }
  return true
}

export async function fetchHookLibrary(): Promise<HookLibraryData> {
  const sb = getSupabase()
  if (!sb) {
    return {
      hooks: [],
      mediums: [],
      angles: [],
      accounts: [],
      usages: [],
      error: 'Supabase 미설정 — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 확인',
      diagnostics: [],
    }
  }

  const [
    hookResult,
    mediumResult,
    angleResult,
    mediumMapResult,
    angleMapResult,
    linkResult,
    usageResult,
    accountResult,
  ] = await Promise.all([
    sb.from(TABLES.hooks).select('*').order('created_at', { ascending: false }),
    sb
      .from(TABLES.hookMediums)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    sb
      .from(TABLES.hookAngles)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    sb.from(TABLES.hookMediumMap).select('hook_id, medium_id'),
    sb.from(TABLES.hookAngleMap).select('hook_id, angle_id'),
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
    diagnosticFromResult(TABLES.hookMediums, mediumResult),
    diagnosticFromResult(TABLES.hookAngles, angleResult),
    diagnosticFromResult(TABLES.hookMediumMap, mediumMapResult),
    diagnosticFromResult(TABLES.hookAngleMap, angleMapResult),
    diagnosticFromResult(TABLES.hookAccounts, linkResult),
    diagnosticFromResult(TABLES.hookUsages, usageResult),
    diagnosticFromResult(TABLES.accounts, accountResult),
  ]

  console.info('[hook-library] fetch diagnostics:', diagnostics)

  const mediums = (mediumResult.error ? [] : (mediumResult.data ?? [])) as HookMedium[]
  const angles = (angleResult.error ? [] : (angleResult.data ?? [])) as HookAngle[]
  const hookRows = (hookResult.error ? [] : (hookResult.data ?? [])) as ContentHook[]
  const mediumMaps = (mediumMapResult.error ? [] : (mediumMapResult.data ?? [])) as {
    hook_id: string
    medium_id: string
  }[]
  const angleMaps = (angleMapResult.error ? [] : (angleMapResult.data ?? [])) as {
    hook_id: string
    angle_id: string
  }[]
  const links = (linkResult.error ? [] : (linkResult.data ?? [])) as {
    hook_id: string
    account_id: string
  }[]
  const usages = (usageResult.error ? [] : (usageResult.data ?? [])) as HookUsage[]
  const accounts = (accountResult.error ? [] : (accountResult.data ?? [])) as Account[]
  const error = buildHookFetchError(diagnostics, mediums, angles, hookRows)

  if (error) {
    console.warn('[hook-library] fetch issue:', error, diagnostics)
  }

  const mediumIdsByHook = buildIdsByHook(mediumMaps, 'medium_id')
  const angleIdsByHook = buildIdsByHook(angleMaps, 'angle_id')
  const accountIdsByHook = buildIdsByHook(links, 'account_id')
  const usagesByHook = new Map<string, HookUsage[]>()

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
      medium_ids: mediumIdsByHook.get(hook.id) ?? [],
      angle_ids: angleIdsByHook.get(hook.id) ?? [],
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
    mediums,
    angles,
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
  const { account_ids, medium_ids, angle_ids, ...payload } = input
  const { data, error } = await sb
    .from(TABLES.hooks)
    .insert({
      ...payload,
      hook_type: null,
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

  const hookId = data.id as string
  if (account_ids.length > 0) {
    const { error: linkError } = await sb.from(TABLES.hookAccounts).insert(
      account_ids.map((accountId) => ({
        hook_id: hookId,
        account_id: accountId,
      })),
    )
    if (linkError) {
      console.warn('[cp_hook_accounts] create error:', linkError.message)
    }
  }
  await syncHookMediumMap(hookId, medium_ids)
  await syncHookAngleMap(hookId, angle_ids)
  return data as ContentHook
}

export async function updateHook(
  id: string,
  input: HookInput,
): Promise<ContentHook | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { account_ids, medium_ids, angle_ids, ...payload } = input
  const { data, error } = await sb
    .from(TABLES.hooks)
    .update({
      ...payload,
      hook_type: null,
      updated_at: new Date().toISOString(),
    })
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
  await syncHookMediumMap(id, medium_ids)
  await syncHookAngleMap(id, angle_ids)
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

async function createTaxonomy(
  table: typeof TABLES.hookMediums | typeof TABLES.hookAngles,
  input: TaxonomyInput,
): Promise<HookTaxonomy | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb.from(table).insert(input).select().single()
  if (error) {
    console.warn(`[${table}] create error:`, error.message)
    return null
  }
  return data as HookTaxonomy
}

async function updateTaxonomy(
  table: typeof TABLES.hookMediums | typeof TABLES.hookAngles,
  id: string,
  patch: Pick<HookTaxonomy, 'name' | 'description' | 'color'>,
): Promise<HookTaxonomy | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from(table)
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) {
    console.warn(`[${table}] update error:`, error.message)
    return null
  }
  return data as HookTaxonomy
}

async function deleteTaxonomy(
  table: typeof TABLES.hookMediums | typeof TABLES.hookAngles,
  mapTable: typeof TABLES.hookMediumMap | typeof TABLES.hookAngleMap,
  idColumn: 'medium_id' | 'angle_id',
  id: string,
): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { error: unlinkError } = await sb
    .from(mapTable)
    .delete()
    .eq(idColumn, id)
  if (unlinkError) {
    console.warn(`[${mapTable}] unlink error:`, unlinkError.message)
    return false
  }
  const { error } = await sb.from(table).delete().eq('id', id)
  if (error) {
    console.warn(`[${table}] delete error:`, error.message)
    return false
  }
  return true
}

export async function createHookMedium(
  input: TaxonomyInput,
): Promise<HookMedium | null> {
  return (await createTaxonomy(TABLES.hookMediums, input)) as HookMedium | null
}

export async function updateHookMedium(
  id: string,
  patch: Pick<HookMedium, 'name' | 'description' | 'color'>,
): Promise<HookMedium | null> {
  return (await updateTaxonomy(TABLES.hookMediums, id, patch)) as HookMedium | null
}

export async function deleteHookMedium(id: string): Promise<boolean> {
  return deleteTaxonomy(
    TABLES.hookMediums,
    TABLES.hookMediumMap,
    'medium_id',
    id,
  )
}

export async function createHookAngle(
  input: TaxonomyInput,
): Promise<HookAngle | null> {
  return (await createTaxonomy(TABLES.hookAngles, input)) as HookAngle | null
}

export async function updateHookAngle(
  id: string,
  patch: Pick<HookAngle, 'name' | 'description' | 'color'>,
): Promise<HookAngle | null> {
  return (await updateTaxonomy(TABLES.hookAngles, id, patch)) as HookAngle | null
}

export async function deleteHookAngle(id: string): Promise<boolean> {
  return deleteTaxonomy(TABLES.hookAngles, TABLES.hookAngleMap, 'angle_id', id)
}
