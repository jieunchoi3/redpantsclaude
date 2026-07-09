import { STATUS_COLORS } from '../lib/colors'
import type { IdeaStatus } from '../types'

interface StatusDotProps {
  status: IdeaStatus
  showLabel?: boolean
  /** filled pill 뱃지 */
  pill?: boolean
  compact?: boolean
}

export function StatusDot({
  status,
  showLabel,
  pill = false,
  compact,
}: StatusDotProps) {
  const colors = STATUS_COLORS[status]

  if (pill) {
    return (
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-full font-medium ${colors.pill} ${
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full bg-current opacity-80`} />
        {status}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 shrink-0 rounded-full ${colors.dot}`} />
      {showLabel && (
        <span className={`text-[11px] font-medium ${colors.label}`}>
          {status}
        </span>
      )}
    </span>
  )
}
