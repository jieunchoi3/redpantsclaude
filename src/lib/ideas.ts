import { getSupabase } from './supabase'
import { TABLES } from './constants'
import type {
  Channel,
  Idea,
  IdeaStatus,
  IgFormat,
  JieunChannel,
  JieunFormat,
  YtFormat,
} from '../types'
import {
  isWorkspaceColumnMissing,
  type Workspace,
} from './workspace'

export type IdeaInsert = {
  title?: string
  brainstorm?: string
  channels?: Channel[]
  ig_format?: IgFormat | null
  yt_format?: YtFormat | null
  account_id?: string | null
  jieun_channel?: JieunChannel | null
  jieun_format?: JieunFormat | null
  category_id?: string | null
  status?: IdeaStatus
  scheduled_date?: string | null
  sort_order?: number
}

export type IdeaUpdate = Partial<
  Omit<Idea, 'id' | 'created_at' | 'workspace'>
>

export async function fetchIdeas(
  workspace: Workspace,
  options?: { archived?: boolean },
): Promise<Idea[]> {
  const sb = getSupabase()
  if (!sb) return []

  const archived = options?.archived ?? false

  let result = await sb
    .from(TABLES.ideas)
    .select('*')
    .eq('workspace', workspace)
    .eq('archived', archived)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (isWorkspaceColumnMissing(result.error)) {
    if (workspace === 'jieun') return []
    result = await sb
      .from(TABLES.ideas)
      .select('*')
      .eq('archived', archived)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
  }

  const { data, error } = result
  if (error) {
    console.warn('[cp_ideas] fetch error:', error.message)
    return []
  }

  return (data ?? []) as Idea[]
}

export async function createIdea(
  workspace: Workspace,
  input: IdeaInsert = {},
): Promise<Idea | null> {
  const sb = getSupabase()
  if (!sb) return null

  const payload = {
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
  }

  let result = await sb
    .from(TABLES.ideas)
    .insert({
      workspace,
      ...payload,
      account_id: input.account_id ?? null,
      jieun_channel: input.jieun_channel ?? null,
      jieun_format: input.jieun_format ?? null,
    })
    .select()
    .single()

  if (isWorkspaceColumnMissing(result.error) && workspace === 'redpants') {
    result = await sb.from(TABLES.ideas).insert(payload).select().single()
  }

  const { data, error } = result
  if (error) {
    console.warn('[cp_ideas] create error:', error.message)
    return null
  }

  return data as Idea
}

export async function updateIdea(
  workspace: Workspace,
  id: string,
  patch: IdeaUpdate,
): Promise<Idea | null> {
  const sb = getSupabase()
  if (!sb) return null

  const payload = {
    ...patch,
    updated_at: new Date().toISOString(),
  }

  let result = await sb
    .from(TABLES.ideas)
    .update(payload)
    .eq('id', id)
    .eq('workspace', workspace)
    .select()
    .single()

  if (isWorkspaceColumnMissing(result.error) && workspace === 'redpants') {
    result = await sb
      .from(TABLES.ideas)
      .update(payload)
      .eq('id', id)
      .select()
      .single()
  }

  const { data, error } = result
  if (error) {
    console.warn('[cp_ideas] update error:', error.message)
    return null
  }

  return data as Idea
}

export async function softDeleteIdea(
  workspace: Workspace,
  id: string,
): Promise<boolean> {
  return Boolean(await updateIdea(workspace, id, { archived: true }))
}

export async function restoreIdea(
  workspace: Workspace,
  id: string,
): Promise<boolean> {
  return Boolean(await updateIdea(workspace, id, { archived: false }))
}

export async function permanentlyDeleteIdea(
  workspace: Workspace,
  id: string,
): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false

  let result = await sb
    .from(TABLES.ideas)
    .delete()
    .eq('id', id)
    .eq('workspace', workspace)

  if (isWorkspaceColumnMissing(result.error) && workspace === 'redpants') {
    result = await sb.from(TABLES.ideas).delete().eq('id', id)
  }

  const { error } = result
  if (error) {
    console.warn('[cp_ideas] permanent delete error:', error.message)
    return false
  }

  return true
}
