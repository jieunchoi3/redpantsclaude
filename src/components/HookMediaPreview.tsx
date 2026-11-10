import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ExternalLink, Film, Image as ImageIcon, Play } from 'lucide-react'
import type { HookItem } from '../types'
import { getVideoLinkMeta, youtubeThumbnailUrl } from '../lib/hookUi'

interface HookMediaPreviewProps {
  hook: HookItem
  compact?: boolean
}

function MediaBadge({
  children,
  className = 'left-2.5 top-2.5',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`absolute ${className} rounded-lg bg-black/50 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm`}
    >
      {children}
    </span>
  )
}

function useLinkPreview(url: string) {
  const direct = youtubeThumbnailUrl(url)
  const [remote, setRemote] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (direct) return
    let cancelled = false
    fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
      .then((response) => response.json())
      .then((body: { data?: { image?: { url?: string } } }) => {
        const image = body.data?.image?.url
        if (cancelled) return
        if (typeof image === 'string' && image) setRemote(image)
        else setFailed(true)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [direct, url])

  return { src: direct ?? remote, failed }
}

function LinkPreview({ url, compact }: { url: string; compact: boolean }) {
  const meta = getVideoLinkMeta(url)
  const { src, failed } = useLinkPreview(url)
  const [broken, setBroken] = useState(false)
  const frameClass = compact
    ? 'relative block w-52 shrink-0 self-start'
    : 'relative block w-full'

  if (src && !failed && !broken) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={frameClass}
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={src}
          alt=""
          className="block h-auto w-full bg-[#f3f3f5]"
          onError={() => setBroken(true)}
        />
        <MediaBadge>
          <Film className="mr-1 inline h-3 w-3" />
          {meta.label}
        </MediaBadge>
      </a>
    )
  }

  return (
    <a
      href={url}
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
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#9a9a9f]" />
      </div>
      <div className="min-w-0 pt-6">
        <p className="text-[12px] font-semibold text-[#2c2c2e]">{meta.label}</p>
        <p className="mt-0.5 truncate text-[10px] text-[#8e8e93]">{meta.host}</p>
        <p className="mt-2 break-all text-[10px] leading-4 text-[#6e6e73]">{url}</p>
      </div>
    </a>
  )
}

export function HookMediaPreview({
  hook,
  compact = false,
}: HookMediaPreviewProps) {
  const frameClass = compact
    ? 'relative w-52 shrink-0 self-start'
    : 'relative w-full'

  if (hook.media_kind === 'image' && hook.image_url) {
    return (
      <div className={frameClass}>
        <img
          src={hook.image_url}
          alt=""
          className="block h-auto w-full bg-[#f3f3f5]"
        />
        <MediaBadge>
          <ImageIcon className="mr-1 inline h-3 w-3" />
          이미지
        </MediaBadge>
      </div>
    )
  }

  if (hook.media_kind === 'video_file' && hook.video_file_url) {
    return <HoverVideo src={hook.video_file_url} frameClass={frameClass} />
  }

  if (hook.media_kind === 'video_link' && hook.video_url) {
    return <LinkPreview url={hook.video_url} compact={compact} />
  }

  return null
}

function HoverVideo({ src, frameClass }: { src: string; frameClass: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  function play() {
    const video = videoRef.current
    if (!video) return
    video.muted = true
    void video.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }

  function stop() {
    const video = videoRef.current
    if (!video) return
    video.pause()
    video.currentTime = 0
    setPlaying(false)
  }

  return (
    <div className={frameClass} onMouseEnter={play} onMouseLeave={stop}>
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        loop
        preload="metadata"
        className="block h-auto w-full bg-black"
      />
      {!playing && (
        <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white">
          <Play className="h-4 w-4 fill-white" />
        </span>
      )}
      <MediaBadge>
        <Film className="mr-1 inline h-3 w-3" />
        영상
      </MediaBadge>
    </div>
  )
}
