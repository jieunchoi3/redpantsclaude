/** 프론트 → /api/gemini 프록시 호출 (키는 서버에만 존재) */

export type GeminiImagePayload = {
  mime_type: string
  data: string
}

export type GeminiAttempt = {
  model: string
  google_status: number
  google_status_text: string
  google_body: unknown
}

export class GeminiApiError extends Error {
  status: number
  attempts?: GeminiAttempt[]
  detail?: string

  constructor(
    message: string,
    status: number,
    options?: { attempts?: GeminiAttempt[]; detail?: string },
  ) {
    super(message)
    this.name = 'GeminiApiError'
    this.status = status
    this.attempts = options?.attempts
    this.detail = options?.detail
  }
}

function formatGeminiError(
  status: number,
  payload: {
    error?: string
    detail?: string
    attempts?: GeminiAttempt[]
  },
): string {
  const parts = [payload.error ?? `Gemini 요청 실패 (${status})`]
  if (payload.detail) parts.push(payload.detail)
  if (payload.attempts?.length) {
    parts.push(JSON.stringify(payload.attempts, null, 2))
  }
  return parts.join('\n\n')
}

async function postGemini(body: {
  prompt: string
  image?: GeminiImagePayload
}): Promise<{ text: string; model?: string }> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const payload = (await res.json().catch(() => ({}))) as {
    text?: string
    model?: string
    error?: string
    detail?: string
    attempts?: GeminiAttempt[]
  }

  if (!res.ok) {
    throw new GeminiApiError(
      formatGeminiError(res.status, payload),
      res.status,
      {
        attempts: payload.attempts,
        detail: payload.detail,
      },
    )
  }

  return { text: payload.text ?? '', model: payload.model }
}

export async function callGemini(prompt: string): Promise<string> {
  const result = await postGemini({ prompt })
  return result.text
}

export async function callGeminiMultimodal(
  prompt: string,
  image: GeminiImagePayload,
): Promise<{ text: string; model?: string }> {
  return postGemini({ prompt, image })
}

/** 마크다운 코드펜스 등을 제거하고 JSON 파싱 */
export function parseJsonFromAi<T>(raw: string): T | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const candidates = [
    trimmed,
    trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, ''),
  ]

  const arrayMatch = trimmed.match(/\[[\s\S]*\]/)
  if (arrayMatch) candidates.push(arrayMatch[0])

  const objectMatch = trimmed.match(/\{[\s\S]*\}/)
  if (objectMatch) candidates.push(objectMatch[0])

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T
    } catch {
      // try next
    }
  }

  return null
}
