import { getSupabase } from './supabase'
import { TABLES } from './constants'
import type {
  Channel,
  Idea,
  IdeaStatus,
  IgFormat,
  YtFormat,
} from '../types'

export type IdeaInsert = {
  title?: string
  brainstorm?: string
  channels?: Channel[]
  ig_format?: IgFormat | null
  yt_format?: YtFormat | null
  category_id?: string | null
  status?: IdeaStatus
  scheduled_date?: string | null
  sort_order?: number
}

export type IdeaUpdate = Partial<
  Omit<Idea, 'id' | 'created_at'>
>

export async function fetchIdeas(options?: {
  archived?: boolean
}): Promise<Idea[]> {
  const sb = getSupabase()
  if (!sb) return []

  const archived = options?.archived ?? false

  const { data, error } = await sb
    .from(TABLES.ideas)
    .select('*')
    .eq('archived', archived)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[cp_ideas] fetch error:', error.message)
    return []
  }

  return (data ?? []) as Idea[]
}

export async function createIdea(input: IdeaInsert = {}): Promise<Idea | null> {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from(TABLES.ideas)
    .insert({
      title: input.title ?? '제목 없음',
      brainstorm: input.brainstorm ?? '',
      channels: input.channels ?? [],
      ig_format: input.ig_format ?? null,
      yt_format: input.yt_format ?? null,
      category_id: input.category_id ?? null,
      status: input.status ?? '기획하기',
      scheduled_date: input.scheduled_date ?? null,
      sort_order: input.sort_order ?? 0,
      archived: false,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.warn('[cp_ideas] create error:', error.message)
    return null
  }

  return data as Idea
}

export async function updateIdea(
  id: string,
  patch: IdeaUpdate,
): Promise<Idea | null> {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from(TABLES.ideas)
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.warn('[cp_ideas] update error:', error.message)
    return null
  }

  return data as Idea
}

export async function softDeleteIdea(id: string): Promise<boolean> {
  return Boolean(await updateIdea(id, { archived: true }))
}

export async function restoreIdea(id: string): Promise<boolean> {
  return Boolean(await updateIdea(id, { archived: false }))
}

export async function permanentlyDeleteIdea(id: string): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false

  const { error } = await sb.from(TABLES.ideas).delete().eq('id', id)

  if (error) {
    console.warn('[cp_ideas] permanent delete error:', error.message)
    return false
  }

  return true
}
