import { useDraggable } from '@dnd-kit/core'
import { Trash2 } from 'lucide-react'
import { ChannelBadge } from './ChannelBadge'
import { CategoryChip } from './CategoryChip'
import { StatusDot } from './StatusDot'
import type { Account, Category, Idea } from '../types'

interface IdeaCardProps {
  idea: Idea
  account?: Account
  category?: Category
  onClick: () => void
  muted?: boolean
  draggable?: boolean
  dragData?: Record<string, unknown>
  compact?: boolean
  /** 보드 컬럼처럼 상태가 이미 보이는 곳에선 숨김 */
  showStatus?: boolean
  /** 카테고리 컬럼처럼 채널이 이미 보이는 곳에선 숨김 */
  showChannel?: boolean
  /** 카테고리 컬럼처럼 카테고리가 이미 보이는 곳에선 숨김 */
  showCategory?: boolean
  /** 진행현황 컬럼에서 계정 정보를 표시 */
  showAccount?: boolean
  /** DragOverlay 안에서 렌더 — 들린 스타일 */
  overlay?: boolean
  /** 호버 시 우측 삭제(휴지통) 버튼 */
  onDelete?: (idea: Idea) => void
}

export function IdeaCard({
  idea,
  account,
  category,
  onClick,
  muted,
  draggable = false,
  dragData,
  compact,
  showStatus = true,
  showChannel = true,
  showCategory = true,
  showAccount = false,
  overlay = false,
  onDelete,
}: IdeaCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `idea-${idea.id}`,
    data: { type: 'idea', ideaId: idea.id, ...dragData },
    disabled: !draggable || overlay,
  })

  const isJieun = idea.workspace === 'jieun'
  const formatLabel = isJieun
    ? idea.jieun_format
    : [
        idea.channels.includes('instagram') && idea.ig_format,
        idea.channels.includes('youtube') && idea.yt_format,
      ]
        .filter(Boolean)
        .join(' · ')

  // DragOverlay 사용 시 원본에는 transform을 걸지 않음 — placeholder만
  const placeholder = isDragging && !overlay
  const showDelete = Boolean(onDelete) && !overlay && !placeholder

  return (
    <div
      ref={draggable && !overlay ? setNodeRef : undefined}
      className={`group relative w-full rounded-2xl border border-black/[0.03] bg-white text-left transition-shadow duration-200 ${
        compact ? 'p-2.5' : 'p-3.5'
      } ${muted && !placeholder ? 'opacity-45' : ''} ${
        placeholder
          ? 'cursor-grabbing opacity-40 shadow-none'
          : overlay
            ? 'cursor-grabbing shadow-[0_16px_40px_rgba(0,0,0,0.18)] ring-1 ring-black/5'
            : 'shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)]'
      } ${
        draggable && !overlay && !placeholder
          ? 'cursor-grab active:cursor-grabbing'
          : !draggable && !overlay
            ? 'cursor-pointer'
            : ''
      }`}
    >
      <button
        type="button"
        {...(draggable && !overlay ? { ...listeners, ...attributes } : {})}
        onClick={onClick}
        className="w-full text-left"
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <p
            className={`line-clamp-2 font-medium text-[#1d1d1f] ${
              compact ? 'text-[12px]' : 'text-[14px]'
            } ${showDelete ? 'pr-6' : ''}`}
          >
            {idea.title || '제목 없음'}
          </p>
          {showStatus && (
            <StatusDot status={idea.status} pill compact={compact} />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {showAccount && account && (
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#f5f5f7] px-2 py-0.5 text-[10px] font-medium text-[#6e6e73]">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: account.color ?? '#C7C7CC' }}
              />
              <span className="truncate">{account.name}</span>
            </span>
          )}
          {!isJieun &&
            showChannel &&
            idea.channels.map((ch) => (
              <ChannelBadge
                key={ch}
                channel={ch}
                compact={compact}
                iconOnly={compact}
              />
            ))}
          {formatLabel && (
            <span className="rounded-full bg-[#f5f5f7] px-2 py-0.5 text-[10px] font-medium text-[#6e6e73]">
              {formatLabel}
            </span>
          )}
          {showCategory &&
            category &&
            (isJieun ? (
              <span className="max-w-full truncate rounded-full bg-[#f0f0f2] px-2 py-0.5 text-[10px] font-medium text-[#6e6e73]">
                {category.name}
              </span>
            ) : (
              <CategoryChip
                id={category.id}
                name={category.name}
                channel={category.channel}
                compact={compact}
              />
            ))}
        </div>
      </button>

      {showDelete && (
        <button
          type="button"
          title="휴지통으로 이동"
          aria-label="삭제"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onDelete?.(idea)
          }}
          className="absolute top-2.5 right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg text-[#aeaeb2] opacity-0 transition-all duration-150 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
