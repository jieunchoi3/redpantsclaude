import { useMemo, useState } from 'react'
import { Check, Layers3, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { Account, Idea } from '../types'
import { ACCOUNT_COLORS, accountColor } from '../lib/accounts'

interface AccountSidebarProps {
  loading?: boolean
  accounts: Account[]
  ideas: Idea[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onClear: () => void
  onAdd: (name: string, color: string) => Promise<unknown>
  onUpdate: (
    id: string,
    patch: Pick<Account, 'name' | 'color'>,
  ) => Promise<unknown>
  onArchive: (id: string) => Promise<unknown>
}

export function AccountSidebar({
  loading = false,
  accounts,
  ideas,
  selectedIds,
  onToggle,
  onClear,
  onAdd,
  onUpdate,
  onArchive,
}: AccountSidebarProps) {
  const [editing, setEditing] = useState<Account | 'new' | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(ACCOUNT_COLORS[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const counts = useMemo(() => {
    const next = new Map<string, number>()
    for (const idea of ideas) {
      if (idea.account_id) {
        next.set(idea.account_id, (next.get(idea.account_id) ?? 0) + 1)
      }
    }
    return next
  }, [ideas])

  function startAdd() {
    setEditing('new')
    setName('')
    setColor(ACCOUNT_COLORS[accounts.length % ACCOUNT_COLORS.length]!)
    setError('')
  }

  function startEdit(account: Account, index: number) {
    setEditing(account)
    setName(account.name)
    setColor(accountColor(account, index))
    setError('')
  }

  async function save() {
    const trimmed = name.trim()
    if (!trimmed || busy || !editing) return
    setBusy(true)
    const result =
      editing === 'new'
        ? await onAdd(trimmed, color)
        : await onUpdate(editing.id, { name: trimmed, color })
    setBusy(false)
    if (!result) {
      setError('저장하지 못했어요. 데이터베이스 설정을 확인해주세요.')
      return
    }
    setEditing(null)
  }

  async function archive(account: Account) {
    if (!window.confirm(`‘${account.name}’ 계정을 삭제할까요?`)) return
    await onArchive(account.id)
  }

  return (
    <aside className="z-20 flex h-full w-[248px] shrink-0 flex-col border-r border-black/[0.06] bg-white">
      <div className="flex items-center gap-2 border-b border-black/[0.04] px-4 py-4">
        <Layers3 className="h-4 w-4 text-[#6e6e73]" />
        <h2 className="min-w-0 flex-1 text-[14px] font-semibold tracking-tight text-[#1d1d1f]">
          계정
        </h2>
        <button
          type="button"
          onClick={startAdd}
          disabled={loading}
          title="계정 추가"
          className="flex h-8 w-8 items-center justify-center rounded-xl text-[#6e6e73] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="space-y-2" aria-label="계정 불러오는 중">
            <div className="h-10 animate-pulse rounded-xl bg-[#f0f0f2]" />
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="flex h-10 animate-pulse items-center gap-2.5 rounded-xl px-3"
                style={{ animationDelay: `${index * 55}ms` }}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e7]" />
                <span className="h-2.5 flex-1 rounded-full bg-[#ededee]" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <button
          type="button"
          onClick={onClear}
          className={`mb-2 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${
            selectedIds.length === 0
              ? 'bg-[#1d1d1f] text-white shadow-sm'
              : 'text-[#6e6e73] hover:bg-[#f5f5f7]'
          }`}
        >
          전체 계정
          <span className="text-[11px] opacity-65">{ideas.length}</span>
            </button>

            <ul className="space-y-1">
          {accounts.map((account, index) => {
            const selected = selectedIds.includes(account.id)
            return (
              <li
                key={account.id}
                className={`group flex items-center gap-1 rounded-xl transition ${
                  selected ? 'bg-[#f0f0f2]' : 'hover:bg-[#f7f7f8]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggle(account.id)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left"
                  aria-pressed={selected}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ring-1 ring-black/5"
                    style={{ backgroundColor: accountColor(account, index) }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#1d1d1f]">
                    {account.name}
                  </span>
                  <span className="text-[11px] text-[#aeaeb2]">
                    {counts.get(account.id) ?? 0}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(account, index)}
                  title="계정 수정"
                  className="hidden rounded-lg p-1.5 text-[#86868b] hover:bg-white group-hover:block focus-visible:block"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void archive(account)}
                  title="계정 삭제"
                  className="mr-1 hidden rounded-lg p-1.5 text-[#aeaeb2] hover:bg-red-50 hover:text-red-500 group-hover:block focus-visible:block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            )
          })}
            </ul>

            {accounts.length === 0 && (
              <div className="px-3 py-10 text-center">
                <p className="text-[13px] font-medium text-[#6e6e73]">
                  계정이 없습니다
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#aeaeb2]">
                  콘텐츠를 나눠 관리할
                  <br />
                  첫 계정을 만들어보세요.
                </p>
                <button
                  type="button"
                  onClick={startAdd}
                  className="mt-3 rounded-xl bg-[#f5f5f7] px-3 py-2 text-[12px] font-medium text-[#1d1d1f] transition hover:bg-[#ebebed]"
                >
                  첫 계정 추가
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {editing && !loading && (
        <div className="border-t border-black/[0.05] p-3">
          <div className="rounded-2xl bg-[#f5f5f7] p-3 shadow-inner">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] font-semibold text-[#1d1d1f]">
                {editing === 'new' ? '새 계정' : '계정 수정'}
              </p>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg p-1 text-[#86868b] hover:bg-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void save()
              }}
              autoFocus
              placeholder="계정 이름"
              className="w-full rounded-xl bg-white px-3 py-2.5 text-[13px] outline-none ring-1 ring-black/[0.04] focus:ring-[#c7c7cc]"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {ACCOUNT_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setColor(option)}
                  className={`h-6 w-6 rounded-full transition ${
                    color === option
                      ? 'scale-110 ring-2 ring-[#1d1d1f] ring-offset-2'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: option }}
                  aria-label={`색상 ${option}`}
                />
              ))}
            </div>
            {error && (
              <p className="mt-2 text-[11px] leading-relaxed text-red-500">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={!name.trim() || busy}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#1d1d1f] py-2 text-[12px] font-semibold text-white transition disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" />
              {busy ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
