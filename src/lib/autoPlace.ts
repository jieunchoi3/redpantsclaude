import {
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
} from 'date-fns'
import { callGemini, parseJsonFromAi } from './gemini'
import type { AppMeta, Idea } from '../types'

export type PlacementSuggestion = { idea_id: string; date: string }

export async function suggestMonthlyPlacement(input: {
  ideas: Idea[]
  meta: AppMeta | null
  month: Date
  preferredWeekdays?: number[] // 0=Sun … 6=Sat, optional
}): Promise<PlacementSuggestion[] | null> {
  const unassigned = input.ideas.filter((i) => !i.scheduled_date)
  if (unassigned.length === 0) return []

  const monthStart = startOfMonth(input.month)
  const monthEnd = endOfMonth(input.month)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd }).map((d) =>
    format(d, 'yyyy-MM-dd'),
  )

  const goals = {
    카드뉴스: input.meta?.goal_ig_cardnews ?? 2,
    릴스: input.meta?.goal_ig_reels ?? 1,
    롱폼: input.meta?.goal_yt_long ?? 1,
    숏폼: input.meta?.goal_yt_short ?? 3,
  }

  const catalog = unassigned.map((idea) => ({
    id: idea.id,
    title: idea.title,
    channels: idea.channels,
    ig_format: idea.ig_format,
    yt_format: idea.yt_format,
  }))

  const preferred =
    input.preferredWeekdays && input.preferredWeekdays.length > 0
      ? `선호 요일(0=일~6=토): ${input.preferredWeekdays.join(',')}`
      : '선호 요일 없음 — 평일 위주로 고르게 분산'

  const prompt = `당신은 콘텐츠 캘린더 배치 도우미입니다.
목표: 주간 목표를 지키며 ${format(input.month, 'yyyy-MM')} 한 달에 미배정 아이디어를 골고루 배치하세요.

주간 목표(주당): ${JSON.stringify(goals)}
${preferred}
배치 가능 날짜: ${JSON.stringify(days)}

미배정 아이디어:
${JSON.stringify(catalog)}

규칙:
- 각 아이디어는 최대 1회 배정
- date는 위 날짜 목록에 있는 값만 사용
- 같은 날짜에 너무 몰리지 않게 분산
- 설명·마크다운·코드펜스 없이 JSON 배열만 출력
- 형식: [{"idea_id":"uuid","date":"yyyy-MM-dd"}]`

  try {
    const text = await callGemini(prompt)
    const parsed = parseJsonFromAi<PlacementSuggestion[]>(text)
    if (!Array.isArray(parsed)) return null

    const validIds = new Set(unassigned.map((i) => i.id))
    const validDays = new Set(days)

    return parsed.filter(
      (row) =>
        row &&
        typeof row.idea_id === 'string' &&
        typeof row.date === 'string' &&
        validIds.has(row.idea_id) &&
        validDays.has(row.date),
    )
  } catch (err) {
    console.warn('[autoPlace]', err)
    return null
  }
}
