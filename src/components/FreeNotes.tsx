import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, StickyNote } from 'lucide-react'
import { fetchAppMeta, updateFreeNotes } from '../lib/appMeta'
import { isSupabaseConfigured } from '../lib/supabase'

const COLLAPSED_KEY = 'cp_free_notes_collapsed'
const SIDEBAR_EXPANDED_W = 280
const SIDEBAR_COLLAPSED_W = 52

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unconfigured'

const DEBOUNCE_MS = 150

function syncFlushToSupabase(value: string) {
  const sbUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const sbKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!sbUrl || !sbKey) return

  void fetch(`${sbUrl}/rest/v1/cp_app_meta?on_conflict=id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: sbKey,
      Authorization: `Bearer ${sbKey}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: 1,
      free_notes: value,
      updated_at: new Date().toISOString(),
    }),
    keepalive: true,
  })
}

export function FreeNotes() {
  const [notes, setNotes] = useState('')
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })
  const [status, setStatus] = useState<SaveStatus>(
    isSupabaseConfigured ? 'idle' : 'unconfigured',
  )
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [loadError, setLoadError] = useState<string | null>(null)

  function setCollapsedPersist(next: boolean) {
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
    } catch {
      // ignore
    }
  }

  const notesRef = useRef(notes)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipNextSave = useRef(true)
  const dirtyRef = useRef(false)
  const lastSavedRef = useRef<string | null>(null)

  notesRef.current = notes

  async function persist(value: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false
    if (lastSavedRef.current === value && !dirtyRef.current) {
      setStatus('saved')
      return true
    }

    setStatus('saving')
    const ok = await updateFreeNotes(value)

    if (notesRef.current !== value) {
      if (ok) lastSavedRef.current = value
      return ok
    }

    if (ok) {
      lastSavedRef.current = value
      dirtyRef.current = false
      setStatus('saved')
      setLoadError(null)
    } else {
      dirtyRef.current = true
      setStatus('error')
      setLoadError(
        '저장에 실패했습니다. Supabase에서 cp_app_meta 테이블과 anon RLS를 확인하세요.',
      )
    }
    return ok
  }

  function scheduleSave(value: string) {
    dirtyRef.current = true
    setStatus('saving')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      void persist(value)
    }, DEBOUNCE_MS)
  }

  function flushPendingSave(opts?: { keepalive?: boolean }) {
    const pending = Boolean(debounceRef.current) || dirtyRef.current
    if (!pending) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    const value = notesRef.current
    if (opts?.keepalive) {
      syncFlushToSupabase(value)
      dirtyRef.current = false
      lastSavedRef.current = value
      return
    }

    void persist(value)
  }

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let cancelled = false

    async function load() {
      const meta = await fetchAppMeta()
      if (cancelled) return

      if (meta) {
        const value = meta.free_notes ?? ''
        skipNextSave.current = true
        dirtyRef.current = false
        lastSavedRef.current = value
        setNotes(value)
        setStatus(value ? 'saved' : 'idle')
        setLoadError(null)
      } else {
        skipNextSave.current = true
        setNotes('')
        setStatus('idle')
        setLoadError(
          '노트를 불러오지 못했습니다. supabase/schema.sql 실행과 네트워크를 확인하세요.',
        )
      }
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || loading) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    scheduleSave(notes)
  }, [notes, loading])

  useEffect(() => {
    function flushKeepalive() {
      flushPendingSave({ keepalive: true })
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        flushKeepalive()
      }
    }

    window.addEventListener('beforeunload', flushKeepalive)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', flushKeepalive)

    return () => {
      window.removeEventListener('beforeunload', flushKeepalive)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', flushKeepalive)
      flushPendingSave()
    }
  }, [])

  const statusLabel: Record<SaveStatus, string> = {
    idle: '',
    saving: '저장 중…',
    saved: '저장됨',
    error: '저장 실패',
    unconfigured: 'Supabase 미설정',
  }

  const width = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W

  return (
    <aside
      className="z-20 flex h-full shrink-0 flex-col border-r border-black/[0.06] bg-white transition-[width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
      style={{ width }}
      aria-label="자유 메모"
    >
      {collapsed ? (
        <div className="flex h-full flex-col items-center gap-2 py-3">
          <button
            type="button"
            onClick={() => setCollapsedPersist(false)}
            title="자유 메모 펼치기"
            aria-label="자유 메모 펼치기"
            aria-expanded={false}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#6e6e73] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
          >
            <StickyNote className="h-[18px] w-[18px]" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 items-center gap-2 border-b border-black/[0.04] px-3 py-3">
            <StickyNote className="h-4 w-4 shrink-0 text-[#6e6e73]" />
            <h2 className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-tight text-[#1d1d1f]">
              자유 메모
            </h2>
            <span
              className={`shrink-0 text-[11px] font-medium transition-opacity duration-150 ${
                status === 'error' || status === 'unconfigured'
                  ? 'text-red-500'
                  : status === 'saved'
                    ? 'text-emerald-600'
                    : 'text-[#6e6e73]'
              } ${status === 'idle' ? 'opacity-0' : 'opacity-100'}`}
            >
              {statusLabel[status]}
            </span>
            <button
              type="button"
              onClick={() => setCollapsedPersist(true)}
              title="사이드바 접기"
              aria-label="사이드바 접기"
              aria-expanded={true}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#aeaeb2] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-3">
            {loadError && (
              <p className="mb-2 text-[11px] leading-relaxed text-amber-600">
                {loadError}
              </p>
            )}

            {loading ? (
              <div className="h-full min-h-40 animate-pulse rounded-xl bg-[#f5f5f7]" />
            ) : (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => flushPendingSave()}
                placeholder="아이디어, 메모, 이번 주 할 일…"
                disabled={status === 'unconfigured'}
                className="h-full min-h-0 w-full flex-1 resize-none rounded-xl border border-transparent bg-[#f5f5f7] px-3.5 py-3 text-[14px] leading-relaxed text-[#1d1d1f] outline-none transition-all duration-200 placeholder:text-[#aeaeb2] focus:border-[#d2d2d7] focus:bg-white focus:shadow-[var(--shadow-sm)] disabled:cursor-not-allowed disabled:opacity-60"
              />
            )}
          </div>
        </>
      )}
    </aside>
  )
}
