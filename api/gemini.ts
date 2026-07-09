import type { VercelRequest, VercelResponse } from '@vercel/node'

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
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    )

    const data = (await r.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
      error?: { message?: string }
    }

    if (!r.ok) {
      console.error('[gemini]', data?.error?.message ?? r.statusText)
      return res.status(502).json({
        error: data?.error?.message ?? 'Gemini request failed',
      })
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    return res.status(200).json({ text })
  } catch (err) {
    console.error('[gemini]', err)
    return res.status(500).json({ error: 'Gemini proxy error' })
  }
}
