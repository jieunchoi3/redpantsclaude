import { ExternalLink, Film, Image as ImageIcon, Play } from 'lucide-react'
import type { HookItem } from '../types'
import { getVideoLinkMeta } from '../lib/hookUi'

interface HookMediaPreviewProps {
  hook: HookItem
  compact?: boolean
  accentColor?: string | null
}

export function HookMediaPreview({
  hook,
  compact = false,
  accentColor,
}: HookMediaPreviewProps) {
  const frameClass = compact
    ? 'relative hidden w-52 shrink-0 overflow-hidden sm:block'
    : 'relative aspect-[16/10] overflow-hidden'

  const accent = accentColor ?? '#bca8af'

  if (hook.media_kind === 'image' && hook.image_url) {
    return (
      <div className={frameClass}>
        <div className="absolute inset-0 bg-[#efeff1]" />
        <img
          src={hook.image_url}
          alt=""
          className="relative h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-black/50 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
          <ImageIcon className="mr-1 inline h-3 w-3" />
          이미지
        </span>
      </div>
    )
  }

  if (hook.media_kind === 'video_file' && hook.video_file_url) {
    return (
      <div className={frameClass}>
        <video
          src={hook.video_file_url}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full bg-[#111] object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-white/90 p-3 shadow-lg ring-1 ring-black/10">
            <Play className="h-5 w-5 fill-[#1d1d1f] text-[#1d1d1f]" />
          </span>
        </div>
        <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-black/50 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
          <Film className="mr-1 inline h-3 w-3" />
          영상 파일
        </span>
      </div>
    )
  }

  if (hook.media_kind === 'video_link' && hook.video_url) {
    const meta = getVideoLinkMeta(hook.video_url)
    return (
      <a
        href={hook.video_url}
        target="_blank"
        rel="noreferrer"
        className={`${frameClass} group/link flex flex-col justify-between bg-gradient-to-br ${meta.gradient} p-4 text-[#4d4d50] transition hover:brightness-[0.98]`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div
            className="rounded-2xl bg-white/80 p-2.5 shadow-sm ring-1 ring-black/[0.04]"
            style={{ color: meta.accent }}
          >
            <Film className="h-5 w-5" />
          </div>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#9a9a9f] opacity-0 transition group-hover/link:opacity-100" />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[#2c2c2e]">
            {meta.label}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-[#8e8e93]">
            {meta.host}
          </p>
          <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-[#6e6e73]">
            {hook.video_url}
          </p>
        </div>
      </a>
    )
  }

  if (compact) return null

  return (
    <div
      className={`${frameClass} flex items-center justify-center bg-gradient-to-br from-[#f7f7f8] to-[#efeff1]`}
      style={{ boxShadow: `inset 0 3px 0 0 ${accent}` }}
    >
      <div className="text-center opacity-70">
        <div
          className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${accent}22`, color: accent }}
        >
          <Film className="h-4 w-4" />
        </div>
        <p className="text-[10px] font-medium text-[#9a9a9f]">미디어 없음</p>
      </div>
    </div>
  )
}
