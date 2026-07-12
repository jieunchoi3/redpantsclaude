import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  generateWithGemini,
  type GeminiImageInput,
  type GeminiRequestBody,
} from './geminiShared.js'

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

  let image: GeminiImageInput | undefined
  const rawImage = req.body?.image
  if (rawImage && typeof rawImage === 'object') {
    const mime =
      typeof rawImage.mime_type === 'string'
        ? rawImage.mime_type
        : typeof rawImage.mimeType === 'string'
          ? rawImage.mimeType
          : ''
    const data = typeof rawImage.data === 'string' ? rawImage.data : ''
    if (mime && data) {
      image = { mime_type: mime, data }
    }
  }

  const requestBody: GeminiRequestBody = { prompt, image }

  try {
    const result = await generateWithGemini(apiKey, requestBody)
    if (!result.ok) {
      return res.status(502).json({
        error: 'All Gemini model attempts failed',
        attempts: result.attempts,
      })
    }

    return res.status(200).json({
      text: result.text,
      model: result.model,
      failed_attempts: result.failed_attempts,
    })
  } catch (err) {
    console.error('[gemini]', err)
    return res.status(500).json({
      error: 'Gemini proxy error',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}
