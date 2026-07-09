import { format, isBefore, parseISO, startOfDay } from 'date-fns'
import type { Idea } from '../types'

export interface CalendarFilters {
  instagram: boolean
  youtube: boolean
  showCompleted: boolean
  /** 선택된 카테고리 id — 비어 있으면 전체 */
  categoryIds: string[]
}

export function isOverdue(idea: Idea, today = startOfDay(new Date())): boolean {
  if (!idea.scheduled_date) return false
  if (idea.status === '업로드 완료') return false
  const scheduled = startOfDay(parseISO(idea.scheduled_date))
  return isBefore(scheduled, today)
}

/** 업로드 완료는 필터 OFF면 숨김. 채널/카테고리 필터는 흐림만 적용. */
export function isHiddenByFilter(idea: Idea, filters: CalendarFilters): boolean {
  if (idea.status === '업로드 완료' && !filters.showCompleted) return true
  return false
}

export function isDimmedByFilter(idea: Idea, filters: CalendarFilters): boolean {
  const channelFilterOn = filters.instagram || filters.youtube
  if (channelFilterOn) {
    const channels = idea.channels ?? []
    const matchIg = filters.instagram && channels.includes('instagram')
    const matchYt = filters.youtube && channels.includes('youtube')
    if (!(matchIg || matchYt)) return true
  }

  if (filters.categoryIds.length > 0) {
    if (!idea.category_id || !filters.categoryIds.includes(idea.category_id)) {
      return true
    }
  }

  return false
}

export function todayStr(): string {
  return format(startOfDay(new Date()), 'yyyy-MM-dd')
}
