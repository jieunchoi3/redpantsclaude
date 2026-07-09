import { getSupabase } from './supabase'
import { TABLES } from './constants'
import type { AppMeta } from '../types'

export async function fetchAppMeta(): Promise<AppMeta | null> {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from(TABLES.appMeta)
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    console.warn('[cp_app_meta] fetch error:', error.message)
    return null
  }

  return data as AppMeta | null
}

export async function updateFreeNotes(freeNotes: string): Promise<boolean> {
  return updateAppMeta({ free_notes: freeNotes })
}

export async function updateAppMeta(
  patch: Partial<
    Pick<
      AppMeta,
      | 'free_notes'
      | 'goal_ig_cardnews'
      | 'goal_ig_reels'
      | 'goal_yt_long'
      | 'goal_yt_short'
    >
  >,
): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false

  // merge-duplicates: 충돌 시 전달한 컬럼만 갱신 (다른 컬럼 덮어쓰지 않음)
  const { error } = await sb.from(TABLES.appMeta).upsert(
    {
      id: 1,
      ...patch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )

  if (error) {
    console.warn('[cp_app_meta] save error:', error.message)
    return false
  }

  return true
}
