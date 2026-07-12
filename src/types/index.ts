export type Channel = 'instagram' | 'youtube'

export type IgFormat = '카드뉴스' | '릴스' | '스토리'
export type YtFormat = '롱폼' | '숏폼'
export type JieunChannel = '인스타그램' | '해당 없음'
export type JieunFormat = '릴스' | '포스트'

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

export type ViewMode = 'calendar' | 'board' | 'placement' | 'hooks'

export type HookMediaKind =
  | 'none'
  | 'image'
  | 'video_link'
  | 'video_file'

export interface Category {
  id: string
  workspace: import('../lib/workspace').Workspace
  account_id: string | null
  name: string
  channel: Channel
  sort_order: number
  created_at: string
}

export interface Idea {
  id: string
  workspace: import('../lib/workspace').Workspace
  account_id: string | null
  jieun_channel: JieunChannel | null
  jieun_format: JieunFormat | null
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

export interface Account {
  id: string
  workspace: import('../lib/workspace').Workspace
  name: string
  color: string | null
  notes: string | null
  sort_order: number
  archived: boolean
  created_at: string
}

export interface ContentHook {
  id: string
  content: string
  hook_type: string | null
  media_kind: HookMediaKind
  image_url: string | null
  video_url: string | null
  video_file_url: string | null
  source_note: string | null
  is_inbox: boolean
  used_count: number
  archived: boolean
  created_at: string
  updated_at: string
}

export interface HookType {
  id: string
  name: string
  description: string | null
  color: string | null
  sort_order: number
  created_at: string
}

export interface HookUsage {
  id: string
  hook_id: string
  idea_id: string | null
  rating: number | null
  note: string | null
  used_at: string
}

export interface HookUsageWithIdea extends HookUsage {
  idea_title: string | null
}

export interface HookItem extends ContentHook {
  account_ids: string[]
  average_rating: number | null
  usage_count: number
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
