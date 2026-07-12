import type { HookType } from '../types'
import { callGeminiMultimodal, parseJsonFromAi } from './gemini'

export type ExtractedPhrase = {
  text: string
  selected: boolean
  duplicate: boolean
}

export type HookExtractResult = {
  phrases: ExtractedPhrase[]
  suggestedTypeName: string | null
}

type GeminiExtractPayload = {
  phrases?: unknown
  hook_type?: unknown
}

export function buildHookExtractPrompt(types: HookType[]): string {
  const typeLines =
    types.length > 0
      ? types
          .map((type) => {
            const desc = type.description ? ` — ${type.description}` : ''
            return `- ${type.name}${desc}`
          })
          .join('\n')
      : '- (유형 없음)'

  return `이 이미지에 보이는 한국어 텍스트를 읽어주세요.

목표: 카드뉴스 커버 문구, 릴스 초반 대사, 캡션 첫 줄처럼 시선을 잡는 "훅" 문구만 추출하세요.

제외할 것:
- UI 요소(버튼, 탭, 상태바, 알림)
- 사용자명, 워터마크, 페이지 번호
- 본문 캡션 전체, 해시태그, 광고 문구
- 이미지에 없는 추측 문구

훅 유형 목록 (가장 맞는 이름을 hook_type에 정확히 하나만):
${typeLines}

반환 형식 (JSON만, 마크다운·설명·코드펜스 금지):
{"phrases":["훅 문구1","훅 문구2"],"hook_type":"유형 이름"}

phrases가 없으면 {"phrases":[],"hook_type":""} 를 반환하세요.`
}

export async function fileToBase64(
  file: File,
): Promise<{ mime_type: string; data: string }> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return {
    mime_type: file.type || 'image/png',
    data: btoa(binary),
  }
}

export async function imageSourceToBase64(
  file: File | null,
  url: string | null,
): Promise<{ mime_type: string; data: string } | null> {
  if (file) return fileToBase64(file)
  if (!url) return null
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    const mime = blob.type || 'image/png'
    const buffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (const byte of bytes) {
      binary += String.fromCharCode(byte)
    }
    return { mime_type: mime, data: btoa(binary) }
  } catch {
    return null
  }
}

export function resolveHookTypeId(
  typeName: string | null | undefined,
  types: HookType[],
): string {
  if (!typeName?.trim()) return ''
  const normalized = typeName.trim()
  const exact = types.find((type) => type.name === normalized)
  if (exact) return exact.id
  const loose = types.find(
    (type) =>
      type.name.includes(normalized) || normalized.includes(type.name),
  )
  return loose?.id ?? ''
}

export function markDuplicatePhrases(
  phrases: string[],
  existingContents: Set<string>,
): ExtractedPhrase[] {
  return phrases.map((text) => {
    const trimmed = text.trim()
    return {
      text: trimmed,
      selected: trimmed.length > 0 && !existingContents.has(trimmed),
      duplicate: existingContents.has(trimmed),
    }
  })
}

export async function extractHooksFromImage(
  image: { mime_type: string; data: string },
  types: HookType[],
  existingContents: Set<string>,
): Promise<HookExtractResult> {
  const raw = await callGeminiMultimodal(buildHookExtractPrompt(types), image)
  const parsed = parseJsonFromAi<GeminiExtractPayload | string[]>(raw.text)

  let phrases: string[] = []
  let suggestedTypeName: string | null = null

  if (Array.isArray(parsed)) {
    phrases = parsed.filter((item): item is string => typeof item === 'string')
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.phrases)) {
      phrases = parsed.phrases.filter(
        (item): item is string => typeof item === 'string',
      )
    }
    if (typeof parsed.hook_type === 'string') {
      suggestedTypeName = parsed.hook_type.trim() || null
    }
  }

  phrases = [...new Set(phrases.map((phrase) => phrase.trim()).filter(Boolean))]

  return {
    phrases: markDuplicatePhrases(phrases, existingContents),
    suggestedTypeName,
  }
}
