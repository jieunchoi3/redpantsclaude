import { getSupabase } from './supabase'
import { HOOK_MEDIA_BUCKET, STORAGE_BUCKET } from './constants'

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

export async function uploadHookMedia(file: File): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return null

  const namedExtension = file.name.split('.').pop()?.toLowerCase()
  const extension =
    namedExtension && /^[a-z0-9]{2,5}$/.test(namedExtension)
      ? namedExtension
      : extensionFromMime(file.type || 'image/jpeg')
  const folder = file.type.startsWith('video/') ? 'videos' : 'images'
  const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`

  const { error } = await sb.storage.from(HOOK_MEDIA_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })

  if (error) {
    console.warn('[cp-hook-media] upload error:', error.message)
    return null
  }

  const { data } = sb.storage.from(HOOK_MEDIA_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
