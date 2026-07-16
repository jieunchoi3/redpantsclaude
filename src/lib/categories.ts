import { getSupabase } from './supabase'
import { TABLES } from './constants'
import type { Category, Channel } from '../types'
import {
  isMissingColumn,
  isWorkspaceColumnMissing,
  type Workspace,
} from './workspace'

export type CategoryCreateResult = {
  category: Category | null
  error: string | null
}

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

function formatCategoryError(error: {
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

export async function createCategory(input: {
  workspace: Workspace
  account_id?: string | null
  name: string
  channel: Channel
  sort_order?: number
}): Promise<CategoryCreateResult> {
  const sb = getSupabase()
  if (!sb) {
    return { category: null, error: 'Supabase 미설정' }
  }

  if (input.workspace === 'jieun' && !input.account_id) {
    return {
      category: null,
      error: 'jieun 워크스페이스에서는 계정을 선택한 뒤 카테고리를 추가해야 해요.',
    }
  }

  const payload = {
    name: input.name.trim(),
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
    .select('*')
    .maybeSingle()

  if (isMissingColumn(result.error, 'account_id')) {
    if (input.workspace === 'jieun') {
      return {
        category: null,
        error:
          'cp_categories.account_id 컬럼이 없어요. Supabase SQL Editor에서 supabase/v2_workspace_accounts.sql 을 실행해 주세요.',
      }
    }
    result = await sb
      .from(TABLES.categories)
      .insert({
        workspace: input.workspace,
        ...payload,
      })
      .select('*')
      .maybeSingle()
  }

  if (isWorkspaceColumnMissing(result.error) && input.workspace === 'redpants') {
    result = await sb
      .from(TABLES.categories)
      .insert(payload)
      .select('*')
      .maybeSingle()
  }

  if (isWorkspaceColumnMissing(result.error) && input.workspace === 'jieun') {
    return {
      category: null,
      error:
        'cp_categories.workspace 컬럼이 없어요. Supabase SQL Editor에서 supabase/v2_workspace_accounts.sql 을 실행해 주세요.',
    }
  }

  const { data, error } = result
  if (error) {
    const message = formatCategoryError(error)
    console.warn('[cp_categories] create error:', message)
    return { category: null, error: message }
  }

  if (!data) {
    let lookup = sb
      .from(TABLES.categories)
      .select('*')
      .eq('workspace', input.workspace)
      .eq('name', payload.name)
      .order('created_at', { ascending: false })
      .limit(1)

    if (input.account_id) {
      lookup = lookup.eq('account_id', input.account_id)
    }

    const { data: recovered } = await lookup.maybeSingle()
    if (recovered) {
      return { category: recovered as Category, error: null }
    }

    return {
      category: null,
      error:
        '카테고리는 저장됐을 수 있지만 응답을 받지 못했어요. supabase/v5_categories_rls_fix.sql 을 실행해 주세요.',
    }
  }

  return { category: data as Category, error: null }
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
