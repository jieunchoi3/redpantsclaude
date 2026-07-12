import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { accountColor, flushAccountNotes } from '../lib/accounts'
import { isSupabaseConfigured } from '../lib/supabase'
import type { Account } from '../types'

const CLOSE_MS = 180
const DEBOUNCE_MS = 150

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AccountNotesModalProps {
  account: Account
  accountIndex: number
  onClose: () => void
  onSave: (id: string, notes: string) => Promise<boolean>
}

export function AccountNotesModal({
  account,
  accountIndex,
  onClose,
  onSave,
}: AccountNotesModalProps) {
  const [notes, setNotes] = useState(account.notes ?? '')
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [status, setStatus] = useState<SaveStatus>('idle')

  const notesRef = useRef(notes)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyRef = useRef(false)
  const lastSavedRef = useRef(account.notes ?? '')
  const skipNextSave = useRef(true)

  notesRef.current = notes

  const persist = useCallback(
    async (value: string): Promise<boolean> => {
      if (!isSupabaseConfigured) {
        setStatus('error')
        return false
      }
      if (lastSavedRef.current === value && !dirtyRef.current) {
        setStatus('saved')
        return true
      }

      setStatus('saving')
      const ok = await onSave(account.id, value)

      if (notesRef.current !== value) return ok

      if (ok) {
        lastSavedRef.current = value
        dirtyRef.current = false
        setStatus('saved')
      } else {
        setStatus('error')
      }
      return ok
    },
    [account.id, onSave],
  )

  const flushNow = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    const value = notesRef.current
    if (!dirtyRef.current && lastSavedRef.current === value) return
    void persist(value)
    if (isSupabaseConfigured) {
      flushAccountNotes(account.id, value)
    }
  }, [account.id, persist])

  const requestClose = useCallback(() => {
    if (closing) return
    flushNow()
    setClosing(true)
    setOpen(false)
    window.setTimeout(() => onClose(), CLOSE_MS)
  }, [closing, flushNow, onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const raf = requestAnimationFrame(() => setOpen(true))
    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestClose])

  useEffect(() => {
    function onBeforeUnload() {
      if (!dirtyRef.current) return
      flushAccountNotes(account.id, notesRef.current)
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [account.id])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (dirtyRef.current && isSupabaseConfigured) {
        flushAccountNotes(account.id, notesRef.current)
      }
    }
  }, [account.id])

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    dirtyRef.current = true
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      void persist(notesRef.current)
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [notes, persist])

  const color = accountColor(account, accountIndex)

  return (
    <div
      className={`fixed inset-0 z-[65] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-[180ms] ease-out ${
        open ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-notes-title"
    >
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={requestClose}
      />

      <div
        className={`relative z-10 flex h-[min(78vh,860px)] w-[min(78vw,980px)] flex-col overflow-hidden rounded-2xl bg-[#fbfbfd] shadow-[0_24px_80px_rgba(0,0,0,0.22)] transition-all duration-[180ms] ease-out ${
          open
            ? 'scale-100 translate-y-0 opacity-100'
            : 'scale-[0.96] translate-y-2 opacity-0'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-black/5 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: color }}
            />
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-[#86868b]">계정 노트</p>
              <h2
                id="account-notes-title"
                className="truncate text-[20px] font-semibold tracking-tight text-[#1d1d1f]"
              >
                {account.name}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SaveIndicator status={status} />
            <button
              type="button"
              onClick={requestClose}
              className="rounded-full p-1.5 text-[#6e6e73] transition hover:bg-[#f0f0f2]"
              aria-label="노트 닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 px-6 py-5 sm:px-8 sm:py-6">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            autoFocus
            placeholder="이 계정의 방향, 목표, 메모를 자유롭게 적어두세요."
            className="h-full w-full resize-none rounded-[20px] border-0 bg-white px-6 py-5 text-[16px] leading-[1.75] tracking-[-0.01em] text-[#1d1d1f] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] outline-none transition placeholder:text-[#b0b0b5] focus:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08),0_0_0_3px_rgba(0,0,0,0.03)]"
          />
        </div>
      </div>
    </div>
  )
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  const label =
    status === 'saving'
      ? '저장 중…'
      : status === 'saved'
        ? '저장됨'
        : '저장 실패'
  const color =
    status === 'error'
      ? 'text-[#c75d6d]'
      : status === 'saved'
        ? 'text-[#6e8f7d]'
        : 'text-[#8e8e93]'
  return (
    <span className={`text-[11px] font-medium transition ${color}`}>
      {label}
    </span>
  )
}
