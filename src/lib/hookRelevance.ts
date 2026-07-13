import type { HookAngle, HookItem, HookMedium } from '../types'
import type { Idea } from '../types'
import type { Workspace } from './workspace'

export type IdeaHookContext = {
  workspace: Workspace
  accountId: string | null
  categoryName: string | null
  igFormat: Idea['ig_format']
  ytFormat: Idea['yt_format']
  jieunFormat: Idea['jieun_format']
  channels: Idea['channels']
}

const FORMAT_MEDIUM_HINTS: Record<string, string[]> = {
  릴스: ['릴스'],
  카드뉴스: ['카드뉴스'],
  스토리: ['릴스', '시각'],
  롱폼: ['릴스', '시각', '음성'],
  숏폼: ['릴스', '시각', '음성'],
  포스트: ['캡션', '카드뉴스', '텍스트'],
}

function activeFormats(context: IdeaHookContext): string[] {
  const formats: string[] = []
  if (context.jieunFormat) formats.push(context.jieunFormat)
  if (context.igFormat) formats.push(context.igFormat)
  if (context.ytFormat) formats.push(context.ytFormat)
  return formats
}

function mediumMatchesFormat(medium: HookMedium, format: string): boolean {
  const hints = FORMAT_MEDIUM_HINTS[format] ?? []
  return hints.some((hint) => medium.name.includes(hint))
}

export function scoreHookForIdea(
  hook: HookItem,
  context: IdeaHookContext,
  mediumById: Map<string, HookMedium>,
  angleById: Map<string, HookAngle>,
): number {
  let score = 0
  const mediums = hook.medium_ids
    .map((id) => mediumById.get(id))
    .filter((medium): medium is HookMedium => Boolean(medium))
  const angles = hook.angle_ids
    .map((id) => angleById.get(id))
    .filter((angle): angle is HookAngle => Boolean(angle))

  if (
    !context.accountId ||
    hook.account_ids.length === 0 ||
    hook.account_ids.includes(context.accountId)
  ) {
    score += 40
  }

  for (const format of activeFormats(context)) {
    if (mediums.some((medium) => mediumMatchesFormat(medium, format))) {
      score += 24
    }
  }

  if (angles.length > 0) score += 6

  if (context.categoryName && hook.content.includes(context.categoryName)) {
    score += 8
  }

  score += Math.min(hook.usage_count, 20) * 0.8
  if (hook.average_rating !== null) {
    score += hook.average_rating * 4
  }

  if (hook.is_inbox) score -= 12
  return score
}

export function appendHookToBrainstorm(current: string, hookContent: string): string {
  const block = `[훅] ${hookContent}`
  if (/<[a-z][\s\S]*>/i.test(current)) {
    const escaped = hookContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    const trimmed = current.trim()
    return trimmed
      ? `${trimmed}<p><strong>[훅]</strong> ${escaped}</p>`
      : `<p><strong>[훅]</strong> ${escaped}</p>`
  }
  const trimmed = current.trim()
  return trimmed ? `${trimmed}\n\n${block}` : block
}
