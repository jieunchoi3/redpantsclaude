import { getSupabase } from './supabase'
import { TABLES } from './constants'
import type { Category, Channel } from '../types'

export async function fetchCategories(): Promise<Category[]> {
  const sb = getSupabase()
  if (!sb) return []

  const { data, error } = await sb
    .from(TABLES.categories)
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[cp_categories] fetch error:', error.message)
    return []
  }

  return (data ?? []) as Category[]
}

export async function createCategory(input: {
  name: string
  channel: Channel
  sort_order?: number
}): Promise<Category | null> {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from(TABLES.categories)
    .insert({
      name: input.name,
      channel: input.channel,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.warn('[cp_categories] create error:', error.message)
    return null
  }

  return data as Category
}

export async function updateCategory(
  id: string,
  patch: Partial<Pick<Category, 'name' | 'sort_order'>>,
): Promise<Category | null> {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from(TABLES.categories)
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.warn('[cp_categories] update error:', error.message)
    return null
  }

  return data as Category
}

export async function deleteCategory(id: string): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false

  const { error } = await sb.from(TABLES.categories).delete().eq('id', id)

  if (error) {
    console.warn('[cp_categories] delete error:', error.message)
    return false
  }

  return true
}
