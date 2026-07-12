import type { VercelRequest, VercelResponse } from '@vercel/node'

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
] as const

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
  error?: {
    code?: number
    message?: string
    status?: string
    details?: unknown[]
  }
}

/**
 * Gemini 프록시 — API 키는 서버(process.env)에서만 사용.
 * 프론트엔드에 GEMINI_API_KEY를 노출하지 말 것.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  }

  const prompt =
    typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : ''
  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' })
  }

  try {
    const attempts: {
      model: string
      google_status: number
      google_status_text: string
      google_body: GeminiResponse | string
    }[] = []

    for (const model of GEMINI_MODELS) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
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
        const attempt = {
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
      return res.status(200).json({ text, model, failed_attempts: attempts })
    }

    return res.status(502).json({
      error: 'All Gemini model attempts failed',
      attempts,
    })
  } catch (err) {
    console.error('[gemini]', err)
    return res.status(500).json({ error: 'Gemini proxy error' })
  }
}
