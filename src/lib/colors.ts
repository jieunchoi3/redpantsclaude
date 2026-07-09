import type { Channel, IdeaStatus } from '../types'

/** 진행 현황 — 의미색 (소프트 톤) */
export const STATUS_COLORS: Record<
  IdeaStatus,
  {
    dot: string
    label: string
    soft: string
    pill: string
  }
> = {
  기획하기: {
    dot: 'bg-slate-400',
    label: 'text-slate-600',
    soft: 'bg-slate-100 text-slate-600',
    pill: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',
  },
  촬영하기: {
    dot: 'bg-blue-500',
    label: 'text-blue-600',
    soft: 'bg-blue-50 text-blue-700',
    pill: 'bg-blue-500 text-white shadow-sm shadow-blue-500/25',
  },
  편집하기: {
    dot: 'bg-violet-500',
    label: 'text-violet-600',
    soft: 'bg-violet-50 text-violet-700',
    pill: 'bg-violet-500 text-white shadow-sm shadow-violet-500/25',
  },
  '업로드 하기': {
    dot: 'bg-amber-500',
    label: 'text-amber-700',
    soft: 'bg-amber-50 text-amber-800',
    pill: 'bg-amber-500 text-white shadow-sm shadow-amber-500/25',
  },
  '업로드 완료': {
    dot: 'bg-emerald-500',
    label: 'text-emerald-700',
    soft: 'bg-emerald-50 text-emerald-800',
    pill: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25',
  },
}

/** 채널 — 인스타 핑크 그라데이션 / 유튜브 레드 */
export const CHANNEL_COLORS: Record<
  Channel,
  {
    badge: string
    badgeSolid: string
    pillActive: string
    pillIdle: string
    icon: string
  }
> = {
  instagram: {
    badge:
      'bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600 text-white shadow-sm shadow-pink-500/20',
    badgeSolid: 'bg-pink-500 text-white',
    pillActive:
      'bg-gradient-to-r from-amber-400 via-pink-500 to-fuchsia-600 text-white shadow-md shadow-pink-500/25 ring-0',
    pillIdle:
      'bg-pink-50/80 text-pink-600 ring-1 ring-pink-200/70 hover:bg-pink-100 hover:text-pink-700',
    icon: 'text-pink-500',
  },
  youtube: {
    badge: 'bg-red-500 text-white shadow-sm shadow-red-500/20',
    badgeSolid: 'bg-red-500 text-white',
    pillActive: 'bg-red-500 text-white shadow-md shadow-red-500/25 ring-0',
    pillIdle:
      'bg-red-50/80 text-red-600 ring-1 ring-red-200/70 hover:bg-red-100 hover:text-red-700',
    icon: 'text-red-500',
  },
}

/** 포맷 선택 pill 톤 */
export const FORMAT_PILL = {
  ig: {
    active: 'bg-pink-500 text-white shadow-sm shadow-pink-500/25 ring-0',
    idle: 'bg-white text-[#6e6e73] ring-1 ring-black/[0.06] hover:bg-pink-50 hover:text-pink-600 hover:ring-pink-200',
  },
  yt: {
    active: 'bg-red-500 text-white shadow-sm shadow-red-500/25 ring-0',
    idle: 'bg-white text-[#6e6e73] ring-1 ring-black/[0.06] hover:bg-red-50 hover:text-red-600 hover:ring-red-200',
  },
  neutral: {
    active: 'bg-[#1d1d1f] text-white shadow-sm ring-0',
    idle: 'bg-white text-[#6e6e73] ring-1 ring-black/[0.06] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]',
  },
} as const

/** 기본 미선택 pill */
export const PILL_IDLE =
  'bg-white text-[#6e6e73] ring-1 ring-black/[0.06] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] hover:ring-black/10'

/** 카테고리 컬럼 액센트 — 소프트 파스텔 */
export type CategoryAccent = {
  dot: string
  soft: string
  tint: string
  underline: string
}

const CATEGORY_ACCENT_PALETTE: CategoryAccent[] = [
  {
    dot: 'bg-rose-400',
    soft: 'bg-rose-50 text-rose-700',
    tint: 'bg-rose-50/60',
    underline: 'bg-rose-300',
  },
  {
    dot: 'bg-orange-400',
    soft: 'bg-orange-50 text-orange-700',
    tint: 'bg-orange-50/60',
    underline: 'bg-orange-300',
  },
  {
    dot: 'bg-amber-400',
    soft: 'bg-amber-50 text-amber-800',
    tint: 'bg-amber-50/60',
    underline: 'bg-amber-300',
  },
  {
    dot: 'bg-pink-400',
    soft: 'bg-pink-50 text-pink-700',
    tint: 'bg-pink-50/60',
    underline: 'bg-pink-300',
  },
  {
    dot: 'bg-sky-400',
    soft: 'bg-sky-50 text-sky-700',
    tint: 'bg-sky-50/60',
    underline: 'bg-sky-300',
  },
  {
    dot: 'bg-teal-400',
    soft: 'bg-teal-50 text-teal-700',
    tint: 'bg-teal-50/60',
    underline: 'bg-teal-300',
  },
  {
    dot: 'bg-violet-400',
    soft: 'bg-violet-50 text-violet-700',
    tint: 'bg-violet-50/60',
    underline: 'bg-violet-300',
  },
  {
    dot: 'bg-indigo-400',
    soft: 'bg-indigo-50 text-indigo-700',
    tint: 'bg-indigo-50/60',
    underline: 'bg-indigo-300',
  },
]

export const UNCATEGORIZED_ACCENT: CategoryAccent = {
  dot: 'bg-neutral-400',
  soft: 'bg-neutral-100 text-neutral-600',
  tint: 'bg-neutral-50/80',
  underline: 'bg-neutral-300',
}

/** 카테고리 id / 순서 기준 파스텔 액센트 */
export function categoryAccent(_categoryId: string, index = 0): CategoryAccent {
  return CATEGORY_ACCENT_PALETTE[index % CATEGORY_ACCENT_PALETTE.length]!
}

