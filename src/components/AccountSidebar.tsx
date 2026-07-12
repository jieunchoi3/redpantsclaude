import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronLeft,
  Ellipsis,
  Layers3,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react'
import type { Account, Idea } from '../types'
import {
  ACCOUNT_COLORS,
  accountColor,
  accountHasNotes,
} from '../lib/accounts'
import { AccountNotesModal } from './AccountNotesModal'

const COLLAPSED_KEY = 'cp-jieun-accounts-collapsed'

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
  onSaveNotes: (id: string, notes: string) => Promise<boolean>
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
  onSaveNotes,
  onArchive,
}: AccountSidebarProps) {
  const [editing, setEditing] = useState<Account | 'new' | null>(null)
  const [notesTarget, setNotesTarget] = useState<{
    account: Account
    index: number
  } | null>(null)
  const [menuAccountId, setMenuAccountId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    account: Account
    index: number
    x: number
    y: number
  } | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(ACCOUNT_COLORS[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })

  function setCollapsedPersist(next: boolean) {
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
    } catch {
      // localStorage가 차단된 환경에서는 현재 세션 상태만 유지
    }
  }

  function openNotes(account: Account, index: number) {
    setNotesTarget({ account, index })
    setMenuAccountId(null)
    setContextMenu(null)
  }

  useEffect(() => {
    if (!menuAccountId && !contextMenu) return
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current?.contains(event.target as Node)) return
      setMenuAccountId(null)
      setContextMenu(null)
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [menuAccountId, contextMenu])

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
    <aside
      className="z-20 flex h-full shrink-0 flex-col border-r border-black/[0.06] bg-white transition-[width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
      style={{ width: collapsed ? 52 : 248 }}
      aria-label="계정"
    >
      {collapsed ? (
        <div className="flex h-full flex-col items-center py-3">
          <button
            type="button"
            onClick={() => setCollapsedPersist(false)}
            title="계정 사이드바 펼치기"
            aria-label="계정 사이드바 펼치기"
            aria-expanded={false}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#6e6e73] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
          >
            <Layers3 className="h-[18px] w-[18px]" />
          </button>
        </div>
      ) : (
        <>
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
            <button
              type="button"
              onClick={() => setCollapsedPersist(true)}
              title="계정 사이드바 접기"
              aria-label="계정 사이드바 접기"
              aria-expanded={true}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[#aeaeb2] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
            >
              <ChevronLeft className="h-4 w-4" />
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
            const hasNotes = accountHasNotes(account)
            return (
              <li
                key={account.id}
                className={`group flex items-center gap-0.5 rounded-xl transition ${
                  selected ? 'bg-[#f0f0f2]' : 'hover:bg-[#f7f7f8]'
                }`}
                onContextMenu={(event) => {
                  event.preventDefault()
                  setMenuAccountId(null)
                  setContextMenu({
                    account,
                    index,
                    x: event.clientX,
                    y: event.clientY,
                  })
                }}
              >
                <button
                  type="button"
                  onClick={() => onToggle(account.id)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left"
                  aria-pressed={selected}
                >
                  <span
                    className="relative h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ring-1 ring-black/5"
                    style={{ backgroundColor: accountColor(account, index) }}
                  >
                    {hasNotes && (
                      <span
                        className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#6e8f7d] ring-1 ring-white"
                        title="노트 있음"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#1d1d1f]">
                    {account.name}
                  </span>
                  <span className="text-[11px] text-[#aeaeb2]">
                    {counts.get(account.id) ?? 0}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    openNotes(account, index)
                  }}
                  title="계정 노트"
                  className={`rounded-lg p-1.5 transition ${
                    hasNotes
                      ? 'text-[#6e8f7d] opacity-100'
                      : 'text-[#86868b] opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
                  } hover:bg-white`}
                >
                  <StickyNote className="h-3.5 w-3.5" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setContextMenu(null)
                      setMenuAccountId((current) =>
                        current === account.id ? null : account.id,
                      )
                    }}
                    title="더보기"
                    className="rounded-lg p-1.5 text-[#86868b] opacity-0 transition hover:bg-white group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Ellipsis className="h-3.5 w-3.5" />
                  </button>
                  {menuAccountId === account.id && (
                    <div
                      ref={menuRef}
                      className="absolute right-0 top-full z-30 mt-1 min-w-[120px] rounded-xl border border-black/[0.06] bg-white py-1 shadow-lg"
                    >
                      <button
                        type="button"
                        onClick={() => openNotes(account, index)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
                      >
                        <StickyNote className="h-3.5 w-3.5 text-[#86868b]" />
                        노트 열기
                      </button>
                    </div>
                  )}
                </div>
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
        </>
      )}

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[120px] rounded-xl border border-black/[0.06] bg-white py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            onClick={() => openNotes(contextMenu.account, contextMenu.index)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
          >
            <StickyNote className="h-3.5 w-3.5 text-[#86868b]" />
            노트 열기
          </button>
        </div>
      )}

      {notesTarget && (
        <AccountNotesModal
          account={notesTarget.account}
          accountIndex={notesTarget.index}
          onClose={() => setNotesTarget(null)}
          onSave={onSaveNotes}
        />
      )}
    </aside>
  )
}
