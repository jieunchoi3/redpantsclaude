import type { HookItem, HookType } from '../types'
import { callGemini, parseJsonFromAi } from './gemini'
import { scoreHookForIdea, type IdeaHookContext } from './hookRelevance'

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type HookRecommendation = {
  id: string
  reason: string
}

export type IdeaAiPayload = {
  title: string
  brainstorm: string
  context: IdeaHookContext
  accountName: string | null
}

export type HookVariationContext = {
  ideaTitle?: string
  brainstorm?: string
  accountName?: string | null
  categoryName?: string | null
  formats?: string[]
}

export function buildTypeClassifyPrompt(
  content: string,
  types: HookType[],
): string {
  const typeLines =
    types.length > 0
      ? types
          .map((type) => {
            const desc = type.description ? `: ${type.description}` : ''
            return `- ${type.name}${desc}`
          })
          .join('\n')
      : '- (유형 없음)'

  return `당신은 SNS 콘텐츠 훅 분류기입니다.

아래 훅 문구를 읽고, 주어진 유형 목록 중 가장 맞는 유형 이름을 정확히 하나만 반환하세요.
설명·마크다운·JSON·코드펜스 없이 유형 이름 텍스트만 출력하세요. 다른 글자는 쓰지 마세요.

유형 목록:
${typeLines}

훅 문구:
${content.trim()}`
}

export function matchHookTypeName(
  raw: string,
  types: HookType[],
): HookType | null {
  const cleaned = raw
    .trim()
    .replace(/^```[\s\S]*?```$/i, '')
    .replace(/^["'`]|["'`]$/g, '')
    .trim()
  if (!cleaned) return null

  const exact = types.find((type) => type.name === cleaned)
  if (exact) return exact

  const partial = types.find(
    (type) => type.name.includes(cleaned) || cleaned.includes(type.name),
  )
  return partial ?? null
}

export async function classifyHookType(
  content: string,
  types: HookType[],
): Promise<HookType | null> {
  if (!content.trim() || types.length === 0) return null
  const raw = await callGemini(buildTypeClassifyPrompt(content, types))
  return matchHookTypeName(raw, types)
}

function activeFormats(context: IdeaHookContext): string[] {
  return [
    context.jieunFormat,
    context.igFormat,
    context.ytFormat,
  ].filter((format): format is NonNullable<typeof format> => Boolean(format))
}

export async function recommendHooksWithAi(
  idea: IdeaAiPayload,
  hooks: HookItem[],
  types: HookType[],
): Promise<HookRecommendation[] | null> {
  const candidates = hooks.filter((hook) => !hook.archived).slice(0, 80)
  if (candidates.length === 0) return []

  const typeById = new Map(types.map((type) => [type.id, type]))
  const catalog = candidates.map((hook) => ({
    id: hook.id,
    content: hook.content.slice(0, 220),
    type: hook.hook_type ? (typeById.get(hook.hook_type)?.name ?? null) : null,
    average_rating: hook.average_rating,
    usage_count: hook.usage_count,
  }))

  const formats = activeFormats(idea.context)
  const prompt = `당신은 SNS 콘텐츠 훅 추천 도우미입니다.

현재 작성 중인 아이디어:
- 제목: ${idea.title}
- 브레인스토밍 요약: ${stripHtml(idea.brainstorm).slice(0, 500) || '(없음)'}
- 계정: ${idea.accountName ?? '(미지정)'}
- 포맷: ${formats.join(', ') || '(미지정)'}
- 카테고리: ${idea.context.categoryName ?? '(없음)'}

아래 후보 훅 목록에서 이 아이디어에 가장 어울리는 훅 id를 관련도 높은 순으로 골라주세요.
설명·마크다운·코드펜스 없이 JSON 배열만 출력하세요.

형식: [{"id":"uuid","reason":"이 훅이 왜 맞는지 한 줄"}]
관련 훅이 없으면 [].

후보 훅:
${JSON.stringify(catalog)}`

  const raw = await callGemini(prompt)
  const parsed = parseJsonFromAi<HookRecommendation[]>(raw)
  if (!parsed || !Array.isArray(parsed)) return null

  const validIds = new Set(candidates.map((hook) => hook.id))
  return parsed
    .filter((item) => item?.id && validIds.has(item.id))
    .slice(0, 12)
    .map((item) => ({
      id: item.id,
      reason: String(item.reason ?? '이 아이디어와 잘 맞아요.').slice(0, 160),
    }))
}

export function fallbackHookRecommendations(
  hooks: HookItem[],
  context: IdeaHookContext,
  typeById: Map<string, HookType>,
  limit = 8,
): HookRecommendation[] {
  return hooks
    .filter((hook) => !hook.archived)
    .map((hook) => ({
      hook,
      score: scoreHookForIdea(hook, context, typeById),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ hook }) => ({
      id: hook.id,
      reason: '계정·포맷·사용 기록 기준으로 관련도가 높아요.',
    }))
}

export async function generateHookVariations(
  hookContent: string,
  context?: HookVariationContext,
): Promise<string[] | null> {
  if (!hookContent.trim()) return null

  const toneLines = [
    context?.ideaTitle ? `- 아이디어 제목: ${context.ideaTitle}` : null,
    context?.brainstorm
      ? `- 브레인스토밍: ${stripHtml(context.brainstorm).slice(0, 400)}`
      : null,
    context?.accountName ? `- 계정 톤: ${context.accountName}` : null,
    context?.categoryName ? `- 카테고리: ${context.categoryName}` : null,
    context?.formats?.length
      ? `- 포맷: ${context.formats.join(', ')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `당신은 한국어 SNS 콘텐츠 훅 카피라이터입니다.

아래 원본 훅을 참고해, 같은 의도를 유지하면서 톤과 표현만 다르게 3~5개 변형 문구를 만들어주세요.
${toneLines ? `\n맥락:\n${toneLines}\n` : ''}
원본 훅:
${hookContent.trim()}

설명·마크다운·코드펜스 없이 JSON 문자열 배열만 출력하세요.
예: ["변형1","변형2","변형3"]`

  const raw = await callGemini(prompt)
  const parsed = parseJsonFromAi<string[]>(raw)
  if (!parsed || !Array.isArray(parsed)) return null

  return parsed
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 5)
}
