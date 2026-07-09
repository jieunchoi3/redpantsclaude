import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { fetchAppMeta, updateFreeNotes } from '../lib/appMeta'
import { isSupabaseConfigured } from '../lib/supabase'

const COLLAPSED_KEY = 'cp_free_notes_collapsed'

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

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
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

    // 저장 중 추가 입력이 있으면 최신 dirty 상태 유지
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

  /** 대기 중인 debounce를 즉시 저장 (blur / 이탈) */
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

  return (
    <section className="rounded-2xl bg-white shadow-[var(--shadow)] transition-shadow duration-200">
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-2 px-5 py-4 text-left transition hover:bg-[#fafafa] rounded-2xl"
      >
        <h2 className="text-[15px] font-semibold tracking-tight text-[#1d1d1f]">
          자유 노트
        </h2>
        <span
          className={`ml-auto text-xs font-medium transition-opacity duration-150 ${
            status === 'error' || status === 'unconfigured'
              ? 'text-red-500'
              : status === 'saved'
                ? 'text-emerald-600'
                : 'text-[#6e6e73]'
          } ${status === 'idle' || collapsed ? 'opacity-0' : 'opacity-100'}`}
        >
          {statusLabel[status]}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#aeaeb2] transition-transform duration-200 ${
            collapsed ? '-rotate-90' : 'rotate-0'
          }`}
        />
      </button>

      {!collapsed && (
        <div className="px-5 pb-5">
          {loadError && (
            <p className="mb-2 text-[12px] leading-relaxed text-amber-600">
              {loadError}
            </p>
          )}

          {loading ? (
            <div className="h-28 animate-pulse rounded-xl bg-[#f5f5f7]" />
          ) : (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => flushPendingSave()}
              placeholder="아이디어, 메모, 이번 주 할 일…"
              disabled={status === 'unconfigured'}
              className="min-h-28 w-full resize-y rounded-xl border border-transparent bg-[#f5f5f7] px-4 py-3 text-[15px] leading-relaxed text-[#1d1d1f] outline-none transition-all duration-200 placeholder:text-[#aeaeb2] focus:border-[#d2d2d7] focus:bg-white focus:shadow-[var(--shadow-sm)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          )}
        </div>
      )}
    </section>
  )
}
