import { CHANNEL_COLORS } from '../lib/colors'
import type { Channel } from '../types'

interface ChannelBadgeProps {
  channel: Channel
  compact?: boolean
  /** 아이콘만 (카드용 작은 배지) */
  iconOnly?: boolean
}

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z" />
    </svg>
  )
}

export function ChannelBadge({
  channel,
  compact,
  iconOnly,
}: ChannelBadgeProps) {
  const isIg = channel === 'instagram'
  const colors = CHANNEL_COLORS[channel]
  const size = compact || iconOnly ? 'h-3 w-3' : 'h-3.5 w-3.5'

  if (iconOnly) {
    return (
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${colors.badge}`}
        title={isIg ? '인스타그램' : '유튜브'}
      >
        {isIg ? (
          <InstagramIcon className="h-3 w-3" />
        ) : (
          <YoutubeIcon className="h-3 w-3" />
        )}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${colors.badge} ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
      }`}
    >
      {isIg ? <InstagramIcon className={size} /> : <YoutubeIcon className={size} />}
      {!compact && (isIg ? '인스타' : '유튜브')}
    </span>
  )
}
