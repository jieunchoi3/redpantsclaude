import { getSupabase } from './supabase'
import { STORAGE_BUCKET } from './constants'

function extensionFromMime(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

export async function uploadIdeaImage(file: File): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return null

  const ext = extensionFromMime(file.type || 'image/jpeg')
  const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`

  const { error } = await sb.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || `image/${ext}`,
  })

  if (error) {
    console.warn('[cp-idea-images] upload error:', error.message)
    return null
  }

  const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
