import type { Account, HookType } from '../types'
import { accountColor } from '../lib/accounts'
import { accountChipStyle, hookTypeBadgeStyle } from '../lib/hookUi'

export function HookTypeBadge({
  type,
  fallback = '유형 미지정',
  className = '',
}: {
  type?: HookType | null
  fallback?: string
  className?: string
}) {
  if (!type) {
    return (
      <span
        className={`rounded-full bg-[#f1f1f3] px-2.5 py-1 text-[10px] font-medium text-[#8e8e93] ${className}`}
      >
        {fallback}
      </span>
    )
  }

  return (
    <span
      className={`max-w-full truncate rounded-full px-2.5 py-1 text-[10px] font-semibold ${className}`}
      style={hookTypeBadgeStyle(type)}
      title={type.description ?? type.name}
    >
      {type.name}
    </span>
  )
}

export function HookAccountChips({
  accounts,
  max = 4,
}: {
  accounts: Account[]
  max?: number
}) {
  if (accounts.length === 0) {
    return (
      <span className="rounded-full bg-[#f0f0f2] px-2.5 py-1 text-[10px] font-semibold text-[#6e6e73] ring-1 ring-black/[0.04]">
        ALL
      </span>
    )
  }

  return (
    <>
      {accounts.slice(0, max).map((account, index) => (
        <span
          key={account.id}
          className="inline-flex max-w-[120px] items-center gap-1 truncate rounded-full px-2 py-1 text-[10px] font-medium"
          style={accountChipStyle(account, index)}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/80"
            style={{ backgroundColor: accountColor(account, index) }}
          />
          <span className="truncate">{account.name}</span>
        </span>
      ))}
      {accounts.length > max && (
        <span className="rounded-full bg-[#f7f7f8] px-2 py-1 text-[10px] text-[#8e8e93] ring-1 ring-black/[0.04]">
          +{accounts.length - max}
        </span>
      )}
    </>
  )
}
