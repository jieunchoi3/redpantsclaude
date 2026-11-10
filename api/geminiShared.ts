export const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
] as const

export type GeminiImageInput = {
  mime_type: string
  data: string
}

export type GeminiRequestBody = {
  prompt: string
  image?: GeminiImageInput
  images?: GeminiImageInput[]
}

function readImage(raw: unknown): GeminiImageInput | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as { mime_type?: unknown; mimeType?: unknown; data?: unknown }
  const mime =
    typeof record.mime_type === 'string'
      ? record.mime_type
      : typeof record.mimeType === 'string'
        ? record.mimeType
        : ''
  const data = typeof record.data === 'string' ? record.data : ''
  if (!mime || !data) return null
  return { mime_type: mime, data }
}

export function readGeminiImages(body: {
  image?: unknown
  images?: unknown
}): GeminiImageInput[] {
  const fromList = Array.isArray(body.images)
    ? body.images.flatMap((item) => {
        const image = readImage(item)
        return image ? [image] : []
      })
    : []
  if (fromList.length > 0) return fromList.slice(0, 6)
  const single = readImage(body.image)
  return single ? [single] : []
}

export type GeminiAttempt = {
  model: string
  google_status: number
  google_status_text: string
  google_body: unknown
}

export type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
  error?: {
    code?: number
    message?: string
    status?: string
    details?: unknown[]
  }
}

export function buildGeminiContents(body: GeminiRequestBody) {
  const parts: Array<
    { text: string } | { inline_data: { mime_type: string; data: string } }
  > = []

  const images =
    body.images && body.images.length > 0
      ? body.images.slice(0, 6)
      : body.image?.data && body.image.mime_type
        ? [body.image]
        : []
  for (const image of images) {
    if (!image.data || !image.mime_type) continue
    parts.push({
      inline_data: {
        mime_type: image.mime_type,
        data: image.data,
      },
    })
  }

  parts.push({ text: body.prompt })
  return [{ parts }]
}

export async function generateWithGemini(
  apiKey: string,
  body: GeminiRequestBody,
): Promise<
  | { ok: true; text: string; model: string; failed_attempts: GeminiAttempt[] }
  | { ok: false; attempts: GeminiAttempt[] }
> {
  const attempts: GeminiAttempt[] = []

  for (const model of GEMINI_MODELS) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: buildGeminiContents(body),
        }),
      },
    )

    const rawBody = await r.text()
    let data: GeminiResponse | string
    try {
      data = JSON.parse(rawBody) as GeminiResponse
    } catch {
      data = rawBody
    }

    if (!r.ok) {
      const attempt: GeminiAttempt = {
        model,
        google_status: r.status,
        google_status_text: r.statusText,
        google_body: data,
      }
      attempts.push(attempt)
      console.error('[gemini] Google API error', JSON.stringify(attempt))
      continue
    }

    const parsed = data as GeminiResponse
    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    return { ok: true, text, model, failed_attempts: attempts }
  }

  return { ok: false, attempts }
}
