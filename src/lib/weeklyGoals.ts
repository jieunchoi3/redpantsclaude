import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfWeek,
} from 'date-fns'
import type { AppMeta, Idea } from '../types'

export type GoalKey =
  | 'goal_ig_cardnews'
  | 'goal_ig_reels'
  | 'goal_yt_long'
  | 'goal_yt_short'

export interface FormatProgress {
  key: GoalKey
  label: string
  planned: number
  completed: number
  goal: number
}

export function getWeekRange(weekAnchor: Date) {
  const start = startOfWeek(weekAnchor, { weekStartsOn: 1 })
  const end = endOfWeek(weekAnchor, { weekStartsOn: 1 })
  return { start, end }
}

export function formatWeekLabel(weekAnchor: Date): string {
  const { start, end } = getWeekRange(weekAnchor)
  return `${format(start, 'M/d')} – ${format(end, 'M/d')}`
}

export function countWeeklyFormats(
  ideas: Idea[],
  weekAnchor: Date,
  meta: AppMeta | null,
): FormatProgress[] {
  const { start, end } = getWeekRange(weekAnchor)
  const inWeek = ideas.filter((idea) => {
    if (!idea.scheduled_date) return false
    const d = parseISO(idea.scheduled_date)
    return isWithinInterval(d, { start, end })
  })

  const goals = {
    goal_ig_cardnews: meta?.goal_ig_cardnews ?? 2,
    goal_ig_reels: meta?.goal_ig_reels ?? 1,
    goal_yt_long: meta?.goal_yt_long ?? 1,
    goal_yt_short: meta?.goal_yt_short ?? 3,
  }

  function count(
    predicate: (idea: Idea) => boolean,
  ): { planned: number; completed: number } {
    const matched = inWeek.filter(predicate)
    return {
      planned: matched.length,
      completed: matched.filter((i) => i.status === '업로드 완료').length,
    }
  }

  const card = count((i) => i.ig_format === '카드뉴스')
  const reels = count((i) => i.ig_format === '릴스')
  const long = count((i) => i.yt_format === '롱폼')
  const short = count((i) => i.yt_format === '숏폼')

  return [
    {
      key: 'goal_ig_cardnews',
      label: '카드뉴스',
      planned: card.planned,
      completed: card.completed,
      goal: goals.goal_ig_cardnews,
    },
    {
      key: 'goal_ig_reels',
      label: '릴스',
      planned: reels.planned,
      completed: reels.completed,
      goal: goals.goal_ig_reels,
    },
    {
      key: 'goal_yt_long',
      label: '롱폼',
      planned: long.planned,
      completed: long.completed,
      goal: goals.goal_yt_long,
    },
    {
      key: 'goal_yt_short',
      label: '숏폼',
      planned: short.planned,
      completed: short.completed,
      goal: goals.goal_yt_short,
    },
  ]
}

export function weekDays(weekAnchor: Date) {
  const { start, end } = getWeekRange(weekAnchor)
  return eachDayOfInterval({ start, end })
}
