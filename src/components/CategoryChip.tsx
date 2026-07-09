import type { Channel } from '../types'

interface CategoryChipProps {
  id: string
  name: string
  channel?: Channel
  compact?: boolean
  /** 필터에서 선택됨 */
  active?: boolean
  onClick?: () => void
}

export function CategoryChip({
  name,
  channel,
  compact,
  active,
  onClick,
}: CategoryChipProps) {
  const size = compact
    ? 'gap-1 px-1.5 py-0.5 text-[10px]'
    : 'gap-1.5 px-2 py-0.5 text-[11px]'

  const base = active
    ? 'bg-neutral-200 text-neutral-800 ring-1 ring-neutral-300/80'
    : 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200/70 hover:bg-neutral-150 hover:bg-neutral-200/70'

  const dot =
    channel === 'youtube'
      ? 'bg-red-500'
      : channel === 'instagram'
        ? 'bg-pink-500'
        : 'bg-neutral-400'

  const className = `inline-flex max-w-full items-center truncate rounded-full font-medium transition-all duration-200 ${base} ${size}`

  const content = (
    <>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      <span className="truncate">{name}</span>
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={name} className={className}>
        {content}
      </button>
    )
  }

  return (
    <span className={className} title={name}>
      {content}
    </span>
  )
}
