import type { HookAngle, HookItem, HookMedium } from '../types'
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

function taxonomyLines(items: { name: string; description?: string | null }[]) {
  return items.length > 0
    ? items
        .map((item) => {
          const desc = item.description ? `: ${item.description}` : ''
          return `- ${item.name}${desc}`
        })
        .join('\n')
    : '- (없음)'
}

export type HookClassifyResult = {
  mediums: HookMedium[]
  angles: HookAngle[]
}

export function buildHookClassifyPrompt(
  content: string,
  mediums: HookMedium[],
  angles: HookAngle[],
): string {
  return `당신은 SNS 콘텐츠 훅 분류기입니다.

아래 훅 문구를 읽고, 매체와 앵글 목록에서 각각 맞는 항목 이름을 모두 골라 JSON으로 반환하세요.
매체와 앵글은 독립적이에요. 둘 다 복수 선택 가능합니다.
설명·마크다운·코드펜스 없이 JSON 객체만 출력하세요.

형식: {"mediums":["릴스 음성 훅"],"angles":["비교형","공감형"]}
맞는 항목이 없으면 빈 배열을 넣으세요.

매체 목록:
${taxonomyLines(mediums)}

앵글 목록:
${taxonomyLines(angles)}

훅 문구:
${content.trim()}`
}

export function buildAngleClassifyPrompt(
  content: string,
  angles: HookAngle[],
): string {
  return buildHookClassifyPrompt(content, [], angles)
}

function namesFromClassifyPayload(raw: string): string[] {
  const parsed = parseJsonFromAi<
    string[] | { mediums?: unknown; angles?: unknown }
  >(raw)
  if (Array.isArray(parsed)) {
    return parsed.filter((item): item is string => typeof item === 'string')
  }
  if (parsed && typeof parsed === 'object') {
    const names: string[] = []
    for (const key of ['mediums', 'angles'] as const) {
      const value = parsed[key]
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string') names.push(item)
        }
      }
    }
    if (names.length > 0) return names
  }
  return [raw]
}

export function matchTaxonomyNames<T extends { name: string }>(
  raw: string,
  items: T[],
): T[] {
  const names = namesFromClassifyPayload(raw)
  const matched: T[] = []
  for (const name of names) {
    const cleaned = String(name)
      .trim()
      .replace(/^["'`]|["'`]$/g, '')
    if (!cleaned) continue
    const exact = items.find((item) => item.name === cleaned)
    if (exact && !matched.some((item) => item.name === exact.name)) {
      matched.push(exact)
      continue
    }
    const partial = items.find(
      (item) =>
        item.name.includes(cleaned) || cleaned.includes(item.name),
    )
    if (partial && !matched.some((item) => item.name === partial.name)) {
      matched.push(partial)
    }
  }
  return matched
}

export async function classifyHookTaxonomy(
  content: string,
  mediums: HookMedium[],
  angles: HookAngle[],
): Promise<HookClassifyResult> {
  if (!content.trim()) return { mediums: [], angles: [] }
  if (mediums.length === 0 && angles.length === 0) {
    return { mediums: [], angles: [] }
  }

  const raw = await callGemini(
    buildHookClassifyPrompt(content, mediums, angles),
  )
  const parsed = parseJsonFromAi<{ mediums?: unknown; angles?: unknown }>(raw)

  const mediumNames = Array.isArray(parsed?.mediums)
    ? parsed.mediums.filter((item): item is string => typeof item === 'string')
    : []
  const angleNames = Array.isArray(parsed?.angles)
    ? parsed.angles.filter((item): item is string => typeof item === 'string')
    : []

  return {
    mediums: matchTaxonomyNames(JSON.stringify(mediumNames), mediums),
    angles: matchTaxonomyNames(JSON.stringify(angleNames), angles),
  }
}

export async function classifyHookAngles(
  content: string,
  angles: HookAngle[],
): Promise<HookAngle[]> {
  if (!content.trim() || angles.length === 0) return []
  const result = await classifyHookTaxonomy(content, [], angles)
  return result.angles
}

/** @deprecated Use classifyHookAngles */
export async function classifyHookType(
  content: string,
  types: HookAngle[],
): Promise<HookAngle | null> {
  const matched = await classifyHookAngles(content, types)
  return matched[0] ?? null
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
  mediums: HookMedium[],
  angles: HookAngle[],
): Promise<HookRecommendation[] | null> {
  const candidates = hooks.filter((hook) => !hook.archived).slice(0, 80)
  if (candidates.length === 0) return []

  const mediumById = new Map(mediums.map((medium) => [medium.id, medium]))
  const angleById = new Map(angles.map((angle) => [angle.id, angle]))
  const catalog = candidates.map((hook) => ({
    id: hook.id,
    content: hook.content.slice(0, 220),
    mediums: hook.medium_ids
      .map((id) => mediumById.get(id)?.name)
      .filter(Boolean),
    angles: hook.angle_ids.map((id) => angleById.get(id)?.name).filter(Boolean),
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
- 카테고리: ${idea.context.categoryName ?? '(미지정)'}

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
  mediumById: Map<string, HookMedium>,
  angleById: Map<string, HookAngle>,
  limit = 8,
): HookRecommendation[] {
  return hooks
    .filter((hook) => !hook.archived)
    .map((hook) => ({
      hook,
      score: scoreHookForIdea(hook, context, mediumById, angleById),
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
