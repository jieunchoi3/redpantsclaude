import type { HookAnalysis, HookSourceKind } from '../types'
import { callGeminiImages, parseJsonFromAi, type GeminiImagePayload } from './gemini'

export function normalizeHookAnalysis(value: unknown): HookAnalysis | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const text = (key: string) =>
    typeof row[key] === 'string' ? row[key].trim() : ''
  const analysis: HookAnalysis = {
    hook_line: text('hook_line'),
    visual: text('visual'),
    spoken: text('spoken'),
    structure: text('structure'),
    why: text('why'),
    pattern: text('pattern'),
    takeaway: text('takeaway'),
    analyzed_at: text('analyzed_at') || new Date().toISOString(),
  }
  if (!analysis.hook_line && !analysis.pattern && !analysis.why) return null
  return analysis
}

export function analysisSearchText(analysis: HookAnalysis | null): string {
  if (!analysis) return ''
  return [
    analysis.hook_line,
    analysis.visual,
    analysis.spoken,
    analysis.structure,
    analysis.why,
    analysis.pattern,
    analysis.takeaway,
  ].join('\n')
}

export function buildReelAnalysisPrompt(input: {
  sourceKind: HookSourceKind
  accountNames: string[]
  link: string
  note: string
  frameCount: number
}): string {
  const accounts =
    input.accountNames.length > 0 ? input.accountNames.join(', ') : '미지정'
  const source =
    input.sourceKind === 'own'
      ? '이 계정이 직접 올린 콘텐츠'
      : '잘 걸린 남의 릴스를 모아 둔 레퍼런스'
  return `당신은 숏폼 훅 분석가입니다.
첨부 이미지는 릴스(또는 숏폼)에서 시간 순서대로 뽑은 프레임 ${input.frameCount}장입니다. 첫 장이 초반 훅입니다.
화면의 글, 얼굴, 움직임, 자막을 보고 사람이 왜 멈추는지 분해하세요. 보이지 않는 대사는 지어내지 마세요.

출처: ${source}
계정: ${accounts}
원본 링크: ${input.link || '없음'}
메모: ${input.note || '없음'}

설명 없이 JSON 객체만 출력하세요.
{
  "hook_line": "스크롤을 멈추게 하는 한 줄",
  "visual": "처음에 눈에 보이는 것",
  "spoken": "자막이나 첫 대사. 없으면 빈 문자열",
  "structure": "초반 → 중간 → 끝을 한 문단으로",
  "why": "왜 멈추는지",
  "pattern": "다음에 다시 꺼내 쓸 패턴 이름과 공식 한 줄",
  "takeaway": "이 계정 데이터에서 기억할 포인트 한 줄"
}`
}

export async function analyzeReelFrames(input: {
  frames: GeminiImagePayload[]
  sourceKind: HookSourceKind
  accountNames: string[]
  link: string
  note: string
}): Promise<HookAnalysis> {
  if (input.frames.length === 0) {
    throw new Error('분석할 화면이 없어요.')
  }
  const result = await callGeminiImages(
    buildReelAnalysisPrompt({
      sourceKind: input.sourceKind,
      accountNames: input.accountNames,
      link: input.link,
      note: input.note,
      frameCount: input.frames.length,
    }),
    input.frames,
  )
  const parsed = normalizeHookAnalysis(parseJsonFromAi(result.text))
  if (!parsed) {
    throw new Error('AI 분해 결과를 읽지 못했어요. 한 번 더 시도해 주세요.')
  }
  return { ...parsed, analyzed_at: new Date().toISOString() }
}
