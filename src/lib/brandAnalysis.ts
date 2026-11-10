import { callGeminiImages, parseJsonFromAi } from './gemini'
import { imageSourceToPayload } from './videoFrames'
import type { BrandAnalysis, BrandShot, BrandShotKind } from '../types'

const KINDS: BrandShotKind[] = ['profile', 'bio', 'editing', 'other']

const KIND_LABEL: Record<BrandShotKind, string> = {
  profile: '프로필 사진',
  bio: '바이오',
  editing: '편집 스타일',
  other: '기타',
}

export function normalizeBrandAnalysis(value: unknown): BrandAnalysis | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<BrandAnalysis>
  const text = (field: unknown) => (typeof field === 'string' ? field.trim() : '')
  const analysis: BrandAnalysis = {
    profile: text(raw.profile),
    bio: text(raw.bio),
    editing: text(raw.editing),
    pattern: text(raw.pattern),
    takeaway: text(raw.takeaway),
    analyzed_at:
      typeof raw.analyzed_at === 'string' && raw.analyzed_at
        ? raw.analyzed_at
        : new Date().toISOString(),
  }
  if (!analysis.profile && !analysis.bio && !analysis.editing && !analysis.pattern) {
    return null
  }
  return analysis
}

function pickShots(shots: BrandShot[]): BrandShot[] {
  const groups = new Map<BrandShotKind, BrandShot[]>()
  for (const shot of shots) {
    const list = groups.get(shot.kind) ?? []
    list.push(shot)
    groups.set(shot.kind, list)
  }
  const picked: BrandShot[] = []
  let added = true
  while (picked.length < 6 && added) {
    added = false
    for (const kind of KINDS) {
      const next = groups.get(kind)?.shift()
      if (!next) continue
      picked.push(next)
      added = true
      if (picked.length === 6) break
    }
  }
  return picked
}

export async function analyzeBrandShots(
  name: string,
  handle: string | null,
  shots: BrandShot[],
): Promise<BrandAnalysis> {
  const picked = pickShots(shots)
  if (picked.length === 0) {
    throw new Error('분석할 스크린샷이 없어요.')
  }
  const images = await Promise.all(
    picked.map((shot) => imageSourceToPayload(shot.image_url)),
  )
  const order = picked
    .map((shot, index) => `${index + 1}. ${KIND_LABEL[shot.kind]}`)
    .join('\n')
  const prompt = `너는 인스타그램 계정 브랜딩을 비교하는 편집자다.
계정: ${name}${handle ? ` (@${handle.replace(/^@/, '')})` : ''}
아래 순서의 스크린샷만 보고, 화면에 있는 것만 적어라. 안 보이는 수치, 팔로워 수, 대사는 만들지 마라.
${order}

JSON만 반환:
{
  "profile": "프로필 사진의 얼굴, 구도, 색, 반복 요소",
  "bio": "바이오 문장 구조와 말투. 바이오 이미지가 없으면 빈 문자열",
  "editing": "자막, 컷, 색보정, 화면 구성처럼 반복되는 편집",
  "pattern": "이 계정이 반복하는 브랜딩을 한 줄로",
  "takeaway": "비슷하게 가져올 수 있는 점 한 줄"
}`
  const { text } = await callGeminiImages(prompt, images)
  const parsed = normalizeBrandAnalysis(parseJsonFromAi(text))
  if (!parsed) throw new Error('분석 결과를 읽지 못했어요.')
  return parsed
}
