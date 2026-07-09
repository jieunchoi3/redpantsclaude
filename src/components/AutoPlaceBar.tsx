import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Loader2, RefreshCw, Sparkles, X } from 'lucide-react'
import type { PlacementSuggestion } from '../lib/autoPlace'

interface AutoPlaceBarProps {
  month: Date
  loading: boolean
  suggestions: PlacementSuggestion[] | null
  onGenerate: () => void
  onApply: () => void
  onRetry: () => void
  onCancel: () => void
}

export function AutoPlaceBar({
  month,
  loading,
  suggestions,
  onGenerate,
  onApply,
  onRetry,
  onCancel,
}: AutoPlaceBarProps) {
  const previewing = suggestions !== null

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[#1d1d1f]">
          {previewing
            ? `배치 제안 ${suggestions.length}건 — 적용 전에 미리보기`
            : `${format(month, 'M월', { locale: ko })} 목표에 맞춰 자동 배치`}
        </p>
        <p className="text-[11px] text-[#6e6e73]">
          {previewing
            ? '캘린더에 반투명으로 표시됩니다. 확인 후 적용하세요.'
            : '미배정 아이디어를 주간 목표에 맞춰 한 달에 분산 제안합니다.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {previewing ? (
          <>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-[12px] font-medium text-[#6e6e73] transition hover:bg-[#f5f5f7]"
            >
              <X className="h-3.5 w-3.5" />
              취소
            </button>
            <button
              type="button"
              onClick={onRetry}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-xl bg-[#f5f5f7] px-3 py-2 text-[12px] font-medium text-[#1d1d1f] transition hover:bg-[#ebebed] disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              다시 제안
            </button>
            <button
              type="button"
              onClick={onApply}
              disabled={suggestions.length === 0}
              className="inline-flex items-center gap-1 rounded-xl bg-[#1d1d1f] px-3 py-2 text-[12px] font-medium text-white transition hover:bg-black disabled:opacity-40"
            >
              적용
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d1d1f] px-3.5 py-2 text-[12px] font-medium text-white transition hover:bg-black disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            이번 달 목표에 맞춰 자동 배치
          </button>
        )}
      </div>
    </div>
  )
}
