import type { Category, Channel } from '../types'

/** 기본 카테고리 표시 순서 (인스타 → 유튜브) */
export const CATEGORY_ORDER: { name: string; channel: Channel }[] = [
  { name: '1분 인문학', channel: 'instagram' },
  { name: '정보성 (맛집,카페,마트,핫플)', channel: 'instagram' },
  { name: '영국에 대한 모든 것 (문화충격,여행팁)', channel: 'instagram' },
  { name: '투어 홍보', channel: 'instagram' },
  { name: '대표님 인생 썰', channel: 'youtube' },
  { name: '대표님 잡지식', channel: 'youtube' },
]

function orderKey(cat: Category): number {
  const idx = CATEGORY_ORDER.findIndex(
    (o) => o.name === cat.name && o.channel === cat.channel,
  )
  if (idx >= 0) return idx
  // 알 수 없는 카테고리: 채널별 뒤로
  const channelBase = cat.channel === 'instagram' ? 100 : 200
  return channelBase + cat.sort_order
}

/** 인스타 → 유튜브 순으로 정렬 */
export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => {
    const ka = orderKey(a)
    const kb = orderKey(b)
    if (ka !== kb) return ka - kb
    if (a.channel !== b.channel) {
      return a.channel === 'instagram' ? -1 : 1
    }
    return a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ko')
  })
}

/** 인스타 그룹과 유튜브 그룹으로 분리 (각각 정렬됨) */
export function splitCategoriesByChannel(categories: Category[]): {
  instagram: Category[]
  youtube: Category[]
} {
  const sorted = sortCategories(categories)
  return {
    instagram: sorted.filter((c) => c.channel === 'instagram'),
    youtube: sorted.filter((c) => c.channel === 'youtube'),
  }
}
