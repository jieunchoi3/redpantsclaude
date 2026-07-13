import { useEffect, useState } from 'react'
import { Loader2, Star, X } from 'lucide-react'
import { fetchHookUsageHistory } from '../lib/hooks'
import type { HookAngle, HookItem, HookMedium, HookUsageWithIdea } from '../types'
import { HookAngleBadge, HookMediumBadge } from './HookBadges'

interface HookUsageHistoryModalProps {
  hook: HookItem
  mediums: HookMedium[]
  angles: HookAngle[]
  onClose: () => void
}

export function HookUsageHistoryModal({
  hook,
  mediums,
  angles,
  onClose,
}: HookUsageHistoryModalProps) {
  const [history, setHistory] = useState<HookUsageWithIdea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void fetchHookUsageHistory(hook.id).then((rows) => {
      if (!active) return
      setHistory(rows)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [hook.id])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[72] flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-[28px] bg-[#f7f7f9] shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-black/[0.06] bg-white/90 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-[#86868b]">훅 사용 이력</p>
            <h2 className="mt-1 line-clamp-3 text-[16px] font-semibold leading-6 text-[#1d1d1f]">
              {hook.content}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#8e8e93]">
              {mediums.map((medium) => (
                <HookMediumBadge key={medium.id} medium={medium} className="px-2 py-0.5" />
              ))}
              {angles.map((angle) => (
                <HookAngleBadge key={angle.id} angle={angle} className="px-2 py-0.5" />
              ))}
              <span>총 {hook.usage_count}회 사용</span>
              <span className="inline-flex items-center gap-0.5">
                <Star
                  className={`h-3 w-3 ${
                    hook.average_rating !== null
                      ? 'fill-[#d5b069] text-[#d5b069]'
                      : 'text-[#c6c6ca]'
                  }`}
                />
                {hook.average_rating !== null
                  ? hook.average_rating.toFixed(1)
                  : '평가 없음'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#f2f2f4] p-2 text-[#6e6e73] transition hover:bg-[#e8e8eb]"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="overflow-y-auto p-5">
          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#9b8990]" />
            </div>
          ) : history.length === 0 ? (
            <p className="py-10 text-center text-[12px] text-[#8e8e93]">
              아직 사용 이력이 없어요.
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#2c2c2e]">
                        {entry.idea_title ?? '아이디어 없음'}
                      </p>
                      <p className="mt-1 text-[10px] text-[#8e8e93]">
                        {new Date(entry.used_at).toLocaleString('ko-KR')}
                      </p>
                    </div>
                    {entry.rating !== null && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#fff8eb] px-2 py-1 text-[10px] font-semibold text-[#8a672f]">
                        <Star className="h-3 w-3 fill-[#d5b069] text-[#d5b069]" />
                        {entry.rating}
                      </span>
                    )}
                  </div>
                  {entry.note && (
                    <p className="mt-2 text-[11px] leading-5 text-[#6e6e73]">
                      {entry.note}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
