import { useState, type FormEvent } from 'react'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { workspaceFromCode, type Workspace } from '../lib/workspace'
import type { HookInput } from '../lib/hooks'
import { QuickHookCapture } from './QuickHookCapture'

interface WorkspaceGateProps {
  onEnter: (workspace: Workspace) => void
  onQuickHookSave: (input: HookInput) => Promise<boolean>
}

export function WorkspaceGate({
  onEnter,
  onQuickHookSave,
}: WorkspaceGateProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const [errorKey, setErrorKey] = useState(0)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const workspace = workspaceFromCode(code)
    if (!workspace) {
      setError(true)
      setErrorKey((current) => current + 1)
      return
    }
    onEnter(workspace)
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#f5f5f7] px-5 py-10">
      <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-rose-100/55 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-28 h-80 w-80 rounded-full bg-sky-100/60 blur-3xl" />

      <div className="relative w-full max-w-sm space-y-4">
        <section
          key={errorKey}
          className={`fade-in rounded-[28px] bg-white/90 p-7 shadow-[0_20px_60px_rgba(0,0,0,0.09)] ring-1 ring-black/[0.04] backdrop-blur-xl sm:p-9 ${
            error ? 'workspace-shake' : ''
          }`}
        >
        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1d1d1f] text-white shadow-sm">
          <LockKeyhole className="h-5 w-5" />
        </div>

        <p className="mb-1 text-[13px] font-medium tracking-wide text-[#86868b]">
          콘텐츠 플래너
        </p>
        <h1 className="text-[26px] font-semibold tracking-tight text-[#1d1d1f]">
          워크스페이스 입장
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#6e6e73]">
          전달받은 숫자 코드를 입력해주세요.
        </p>

        <form className="mt-7 space-y-3" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="workspace-code">
            워크스페이스 코드
          </label>
          <input
            id="workspace-code"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            autoFocus
            maxLength={4}
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, '').slice(0, 4))
              setError(false)
            }}
            placeholder="••••"
            className={`h-14 w-full rounded-2xl border bg-[#f5f5f7] px-4 text-center text-[22px] font-semibold tracking-[0.45em] text-[#1d1d1f] outline-none transition-all placeholder:text-[#c7c7cc] focus:bg-white focus:shadow-[var(--shadow)] ${
              error
                ? 'border-red-300 ring-2 ring-red-100'
                : 'border-transparent focus:border-[#d2d2d7]'
            }`}
          />

          <button
            type="submit"
            disabled={code.length !== 4}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] text-[14px] font-semibold text-white shadow-sm transition hover:bg-black active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35"
          >
            입장
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p
          role="alert"
          aria-live="polite"
          className={`mt-3 text-center text-[13px] font-medium text-red-500 transition-opacity ${
            error ? 'opacity-100' : 'opacity-0'
          }`}
        >
          코드를 확인해주세요
        </p>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-[#aeaeb2]">
          워크스페이스 코드는 데이터 구분을 위한 값이며
          <br />
          보안 로그인이 아닙니다.
        </p>
        </section>
        <QuickHookCapture variant="gate" onSave={onQuickHookSave} />
      </div>
    </main>
  )
}
