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
