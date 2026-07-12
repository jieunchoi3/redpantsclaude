import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  action?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white/60 px-6 py-14 text-center shadow-[var(--shadow-sm)]">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#aeaeb2]">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-[15px] font-semibold text-[#1d1d1f]">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-[#6e6e73]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-2xl bg-white shadow-[var(--shadow-sm)]"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  )
}

export function BoardSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-72 w-64 shrink-0 animate-pulse rounded-2xl bg-white/80 shadow-[var(--shadow-sm)]"
        />
      ))}
    </div>
  )
}

export function WeeklyPlannerSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--shadow)]">
      <div className="flex items-center justify-between border-b border-black/[0.05] px-5 py-4">
        <div className="space-y-2">
          <div className="h-2.5 w-20 animate-pulse rounded-full bg-[#ededee]" />
          <div className="h-4 w-28 animate-pulse rounded-full bg-[#e5e5e7]" />
        </div>
        <div className="h-8 w-28 animate-pulse rounded-xl bg-[#f0f0f2]" />
      </div>
      <div className="overflow-hidden">
        <div className="min-w-[1100px]">
          <div className="grid grid-cols-[180px_repeat(7,1fr)] border-b border-black/[0.05] bg-[#fafafa]">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-14 border-r border-black/[0.04] p-4 last:border-r-0"
              >
                <div className="mx-auto h-2.5 w-10 animate-pulse rounded-full bg-[#e5e5e7]" />
              </div>
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, row) => (
            <div
              key={row}
              className="grid grid-cols-[180px_repeat(7,1fr)] border-b border-black/[0.05]"
            >
              {Array.from({ length: 8 }).map((_, column) => (
                <div
                  key={column}
                  className="h-28 border-r border-black/[0.04] p-4 last:border-r-0"
                >
                  {column === 0 && (
                    <div className="h-3 w-24 animate-pulse rounded-full bg-[#ededee]" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
