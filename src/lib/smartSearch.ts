import { callGemini, parseJsonFromAi } from './gemini'
import type { Category, Idea } from '../types'

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function keywordFilterIdeas(
  ideas: Idea[],
  query: string,
  categoryIds: string[],
): Idea[] {
  const q = query.trim().toLowerCase()
  return ideas.filter((idea) => {
    if (categoryIds.length > 0) {
      if (!idea.category_id || !categoryIds.includes(idea.category_id)) {
        return false
      }
    }
    if (!q) return true
    const hay = [
      idea.title,
      idea.ig_format ?? '',
      idea.yt_format ?? '',
      stripHtml(idea.brainstorm ?? ''),
    ]
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}

export async function aiSearchIdeaIds(
  query: string,
  ideas: Idea[],
  categories: Category[],
): Promise<string[] | null> {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))

  const catalog = ideas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    category: idea.category_id ? (catMap[idea.category_id] ?? null) : null,
    channels: idea.channels,
    formats: [idea.ig_format, idea.yt_format].filter(Boolean),
    summary: stripHtml(idea.brainstorm ?? '').slice(0, 200),
  }))

  const prompt = `당신은 콘텐츠 아이디어 검색 도우미입니다.
사용자 질의: "${query}"

아래 아이디어 목록에서 질의와 관련된 항목을 관련도 높은 순으로 골라주세요.
설명·마크다운·코드펜스 없이 JSON 배열만 출력하세요. 예: ["uuid-1","uuid-2"]
관련 항목이 없으면 [].

아이디어 목록:
${JSON.stringify(catalog)}`

  try {
    const text = await callGemini(prompt)
    const ids = parseJsonFromAi<string[]>(text)
    if (!Array.isArray(ids)) return null
    const valid = new Set(ideas.map((i) => i.id))
    return ids.filter((id) => typeof id === 'string' && valid.has(id))
  } catch (err) {
    console.warn('[aiSearch]', err)
    return null
  }
}
