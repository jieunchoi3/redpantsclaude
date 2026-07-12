import { getSupabase } from './supabase'
import { TABLES } from './constants'
import type { Category, Channel } from '../types'
import {
  isWorkspaceColumnMissing,
  type Workspace,
} from './workspace'

export async function fetchCategories(workspace: Workspace): Promise<Category[]> {
  const sb = getSupabase()
  if (!sb) return []

  let result = await sb
    .from(TABLES.categories)
    .select('*')
    .eq('workspace', workspace)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (isWorkspaceColumnMissing(result.error)) {
    if (workspace === 'jieun') return []
    result = await sb
      .from(TABLES.categories)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
  }

  const { data, error } = result
  if (error) {
    console.warn('[cp_categories] fetch error:', error.message)
    return []
  }

  return (data ?? []) as Category[]
}

export async function createCategory(input: {
  workspace: Workspace
  account_id?: string | null
  name: string
  channel: Channel
  sort_order?: number
}): Promise<Category | null> {
  const sb = getSupabase()
  if (!sb) return null

  const payload = {
    name: input.name,
    channel: input.channel,
    sort_order: input.sort_order ?? 0,
  }

  let result = await sb
    .from(TABLES.categories)
    .insert({
      workspace: input.workspace,
      ...payload,
      account_id: input.account_id ?? null,
    })
    .select()
    .single()

  if (
    isWorkspaceColumnMissing(result.error) &&
    input.workspace === 'redpants'
  ) {
    result = await sb.from(TABLES.categories).insert(payload).select().single()
  }

  const { data, error } = result
  if (error) {
    console.warn('[cp_categories] create error:', error.message)
    return null
  }

  return data as Category
}

export async function updateCategory(
  workspace: Workspace,
  id: string,
  patch: Partial<Pick<Category, 'name' | 'sort_order'>>,
): Promise<Category | null> {
  const sb = getSupabase()
  if (!sb) return null

  let result = await sb
    .from(TABLES.categories)
    .update(patch)
    .eq('id', id)
    .eq('workspace', workspace)
    .select()
    .single()

  if (isWorkspaceColumnMissing(result.error) && workspace === 'redpants') {
    result = await sb
      .from(TABLES.categories)
      .update(patch)
      .eq('id', id)
      .select()
      .single()
  }

  const { data, error } = result
  if (error) {
    console.warn('[cp_categories] update error:', error.message)
    return null
  }

  return data as Category
}

export async function deleteCategory(
  workspace: Workspace,
  id: string,
): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false

  let result = await sb
    .from(TABLES.categories)
    .delete()
    .eq('id', id)
    .eq('workspace', workspace)

  if (isWorkspaceColumnMissing(result.error) && workspace === 'redpants') {
    result = await sb.from(TABLES.categories).delete().eq('id', id)
  }

  const { error } = result
  if (error) {
    console.warn('[cp_categories] delete error:', error.message)
    return false
  }

  return true
}
