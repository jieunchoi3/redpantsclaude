import type { BrandAnalysis, BrandProfile, BrandShot, BrandShotKind } from '../types'
import { TABLES } from './constants'
import { normalizeBrandAnalysis } from './brandAnalysis'
import { getSupabase } from './supabase'

const KINDS = new Set<BrandShotKind>(['profile', 'bio', 'editing', 'other'])

function readableError(message: string): string {
  if (/cp_brand_|schema cache|does not exist|relation/i.test(message)) {
    return '브랜딩 저장 공간이 아직 없어요. supabase/v7_branding.sql 을 실행해 주세요.'
  }
  return message
}

function asProfile(row: BrandProfile): BrandProfile {
  return {
    ...row,
    handle: row.handle?.replace(/^@/, '') || null,
    analysis: normalizeBrandAnalysis(row.analysis),
  }
}

function asShot(row: BrandShot): BrandShot | null {
  if (!KINDS.has(row.kind)) return null
  return row
}

export async function fetchBranding(): Promise<{
  profiles: BrandProfile[]
  shots: BrandShot[]
  error: string | null
}> {
  const sb = getSupabase()
  if (!sb) {
    return { profiles: [], shots: [], error: 'Supabase가 연결되지 않았어요.' }
  }

  const [profileResult, shotResult] = await Promise.all([
    sb
      .from(TABLES.brandProfiles)
      .select('*')
      .eq('archived', false)
      .order('created_at', { ascending: false }),
    sb
      .from(TABLES.brandShots)
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  const error = profileResult.error ?? shotResult.error
  return {
    profiles: ((profileResult.data ?? []) as BrandProfile[]).map(asProfile),
    shots: ((shotResult.data ?? []) as BrandShot[])
      .map(asShot)
      .filter((shot): shot is BrandShot => Boolean(shot)),
    error: error ? readableError(error.message) : null,
  }
}

export async function createBrandProfile(input: {
  name: string
  handle?: string
}): Promise<{ profile: BrandProfile | null; error: string | null }> {
  const sb = getSupabase()
  if (!sb) return { profile: null, error: 'Supabase가 연결되지 않았어요.' }

  const { data, error } = await sb
    .from(TABLES.brandProfiles)
    .insert({
      name: input.name.trim(),
      handle: input.handle?.trim().replace(/^@/, '') || null,
    })
    .select()
    .single()

  if (error) return { profile: null, error: readableError(error.message) }
  return { profile: asProfile(data as BrandProfile), error: null }
}

export async function updateBrandProfile(
  id: string,
  patch: Partial<Pick<BrandProfile, 'name' | 'handle' | 'notes' | 'analysis' | 'archived'>>,
): Promise<{ profile: BrandProfile | null; error: string | null }> {
  const sb = getSupabase()
  if (!sb) return { profile: null, error: 'Supabase가 연결되지 않았어요.' }

  const next: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (patch.name !== undefined) next.name = patch.name.trim()
  if (patch.handle !== undefined) {
    next.handle = patch.handle?.trim().replace(/^@/, '') || null
  }
  if (patch.notes !== undefined) next.notes = patch.notes
  if (patch.analysis !== undefined) next.analysis = patch.analysis
  if (patch.archived !== undefined) next.archived = patch.archived

  const { data, error } = await sb
    .from(TABLES.brandProfiles)
    .update(next)
    .eq('id', id)
    .select()
    .single()

  if (error) return { profile: null, error: readableError(error.message) }
  return { profile: asProfile(data as BrandProfile), error: null }
}

export async function createBrandShot(input: {
  profile_id: string
  kind: BrandShotKind
  image_url: string
}): Promise<{ shot: BrandShot | null; error: string | null }> {
  const sb = getSupabase()
  if (!sb) return { shot: null, error: 'Supabase가 연결되지 않았어요.' }

  const { data, error } = await sb
    .from(TABLES.brandShots)
    .insert(input)
    .select()
    .single()

  if (error) return { shot: null, error: readableError(error.message) }
  return { shot: data as BrandShot, error: null }
}

export async function deleteBrandShot(id: string): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return 'Supabase가 연결되지 않았어요.'
  const { error } = await sb.from(TABLES.brandShots).delete().eq('id', id)
  return error ? readableError(error.message) : null
}

export type { BrandAnalysis }
