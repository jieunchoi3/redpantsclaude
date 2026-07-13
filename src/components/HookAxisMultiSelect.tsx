import { Check } from 'lucide-react'
import type { HookAngle, HookMedium } from '../types'
import { hookAngleBadgeStyle, hookMediumBadgeStyle } from '../lib/hookUi'

type AxisKind = 'medium' | 'angle'

interface HookAxisMultiSelectProps {
  kind: AxisKind
  label: string
  hint?: string
  items: (HookMedium | HookAngle)[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onManage?: () => void
}

export function HookAxisMultiSelect({
  kind,
  label,
  hint,
  items,
  selectedIds,
  onChange,
  onManage,
}: HookAxisMultiSelectProps) {
  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((item) => item !== id)
        : [...selectedIds, id],
    )
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <span className="text-[13px] font-semibold text-[#3a3a3c]">{label}</span>
          {hint && (
            <p className="mt-0.5 text-[11px] text-[#8e8e93]">{hint}</p>
          )}
        </div>
        {onManage && (
          <button
            type="button"
            onClick={onManage}
            className="text-[12px] font-medium text-[#7c6870] transition hover:text-[#4c3f44]"
          >
            관리
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-[12px] text-[#8e8e93] ring-1 ring-black/[0.05]">
          등록된 항목이 없어요. 관리에서 추가해 주세요.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const selected = selectedIds.includes(item.id)
            const style =
              kind === 'medium'
                ? hookMediumBadgeStyle(item as HookMedium)
                : hookAngleBadgeStyle(item as HookAngle)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold transition ${
                  selected ? 'shadow-sm' : 'opacity-80 hover:opacity-100'
                }`}
                style={
                  selected
                    ? style
                    : {
                        ...style,
                        opacity: 0.72,
                      }
                }
                title={item.description ?? item.name}
              >
                {kind === 'medium' && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color ?? '#b8b8bd' }}
                  />
                )}
                <span className="truncate">{item.name}</span>
                {selected && <Check className="h-3 w-3 shrink-0 opacity-70" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface HookAxisFilterRowProps {
  kind: AxisKind
  label: string
  items: (HookMedium | HookAngle)[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onClear: () => void
}

export function HookAxisFilterRow({
  kind,
  label,
  items,
  selectedIds,
  onToggle,
  onClear,
}: HookAxisFilterRowProps) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="shrink-0 text-[11px] font-semibold text-[#8e8e93]">
        {label}
      </span>
      <button
        type="button"
        onClick={onClear}
        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
          selectedIds.size === 0
            ? 'bg-[#1d1d1f] text-white shadow-sm'
            : 'bg-[#f5f5f7] text-[#6e6e73] ring-1 ring-black/[0.05] hover:bg-[#ededf0]'
        }`}
      >
        전체
      </button>
      {items.map((item) => {
        const active = selectedIds.has(item.id)
        const style =
          kind === 'medium'
            ? hookMediumBadgeStyle(item as HookMedium)
            : hookAngleBadgeStyle(item as HookAngle)
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className="max-w-[220px] truncate rounded-full px-3 py-1.5 text-[11px] font-semibold transition"
            style={
              active
                ? {
                    ...style,
                    boxShadow: `0 1px 3px ${item.color ?? '#bca8af'}33`,
                  }
                : style
            }
            title={item.name}
          >
            {item.name}
          </button>
        )
      })}
    </div>
  )
}
