/** 프론트 → /api/gemini 프록시 호출 (키는 서버에만 존재) */
export async function callGemini(prompt: string): Promise<string> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(err?.error ?? `Gemini 요청 실패 (${res.status})`)
  }

  const data = (await res.json()) as { text?: string }
  return data.text ?? ''
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
