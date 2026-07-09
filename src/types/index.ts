export type Channel = 'instagram' | 'youtube'

export type IgFormat = '카드뉴스' | '릴스' | '스토리'
export type YtFormat = '롱폼' | '숏폼'

export type IdeaStatus =
  | '기획하기'
  | '촬영하기'
  | '편집하기'
  | '업로드 하기'
  | '업로드 완료'

export const IDEA_STATUSES: IdeaStatus[] = [
  '기획하기',
  '촬영하기',
  '편집하기',
  '업로드 하기',
  '업로드 완료',
]

export type ViewMode = 'calendar' | 'board' | 'placement'

export interface Category {
  id: string
  name: string
  channel: Channel
  sort_order: number
  created_at: string
}

export interface Idea {
  id: string
  title: string
  brainstorm: string
  channels: Channel[]
  ig_format: IgFormat | null
  yt_format: YtFormat | null
  category_id: string | null
  status: IdeaStatus
  scheduled_date: string | null
  sort_order: number
  archived: boolean
  created_at: string
  updated_at: string
}

export interface AppMeta {
  id: number
  free_notes: string
  goal_ig_cardnews: number
  goal_ig_reels: number
  goal_yt_long: number
  goal_yt_short: number
  updated_at: string
}
