import { Loader2, Palette, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { HookFetchDiagnostic } from '../lib/hooks'
import type { HookAngle, HookItem, HookMedium } from '../types'

const DEFAULT_COLORS = [
  '#D9A6AF',
  '#A8BFD8',
  '#B6AED5',
  '#A9C8B9',
  '#DCC08C',
  '#C4AD9D',
]

type TaxonomyTab = 'medium' | 'angle'

interface HookTaxonomyManagerModalProps {
  mediums: HookMedium[]
  angles: HookAngle[]
  hooks: HookItem[]
  loading: boolean
  fetchError: string | null
  diagnostics: HookFetchDiagnostic[]
  onClose: () => void
  onAddMedium: (input: {
    name: string
    description?: string | null
    color?: string | null
  }) => Promise<HookMedium | null>
  onUpdateMedium: (
    id: string,
    patch: Pick<HookMedium, 'name' | 'description' | 'color'>,
  ) => Promise<boolean>
  onDeleteMedium: (id: string) => Promise<boolean>
  onAddAngle: (input: {
    name: string
    description?: string | null
    color?: string | null
  }) => Promise<HookAngle | null>
  onUpdateAngle: (
    id: string,
    patch: Pick<HookAngle, 'name' | 'description' | 'color'>,
  ) => Promise<boolean>
  onDeleteAngle: (id: string) => Promise<boolean>
}

export function HookTaxonomyManagerModal({
  mediums,
  angles,
  hooks,
  loading,
  fetchError,
  diagnostics,
  onClose,
  onAddMedium,
  onUpdateMedium,
  onDeleteMedium,
  onAddAngle,
  onUpdateAngle,
  onDeleteAngle,
}: HookTaxonomyManagerModalProps) {
  const [tab, setTab] = useState<TaxonomyTab>('medium')
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(DEFAULT_COLORS[0]!)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const items = tab === 'medium' ? mediums : angles
  const hookCountById = useMemo(() => {
    const counts = new Map<string, number>()
    for (const hook of hooks) {
      const ids = tab === 'medium' ? hook.medium_ids : hook.angle_ids
      for (const id of ids) {
        counts.set(id, (counts.get(id) ?? 0) + 1)
      }
    }
    return counts
  }, [hooks, tab])

  function begin(item?: HookMedium | HookAngle) {
    setEditingId(item?.id ?? 'new')
    setName(item?.name ?? '')
    setDescription(item?.description ?? '')
    setColor(
      item?.color ??
        DEFAULT_COLORS[(tab === 'medium' ? mediums : angles).length % DEFAULT_COLORS.length]!,
    )
    setError(null)
  }

  async function save() {
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    const input = {
      name: name.trim(),
      description: description.trim() || null,
      color,
    }
    const ok =
      editingId === 'new'
        ? Boolean(
            tab === 'medium' ? await onAddMedium(input) : await onAddAngle(input),
          )
        : editingId
          ? tab === 'medium'
            ? await onUpdateMedium(editingId, input)
            : await onUpdateAngle(editingId, input)
          : false
    setBusy(false)
    if (ok) setEditingId(null)
    else setError('저장하지 못했어요. 이름이 중복되지 않는지 확인해 주세요.')
  }

  async function remove(item: HookMedium | HookAngle) {
    const count = hookCountById.get(item.id) ?? 0
    const axisLabel = tab === 'medium' ? '매체' : '앵글'
    if (
      !window.confirm(
        count > 0
          ? `"${item.name}" ${axisLabel}을(를) 삭제할까요? 이 분류를 쓰는 훅 ${count}개는 매핑만 해제됩니다.`
          : `"${item.name}" ${axisLabel}을(를) 삭제할까요?`,
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    const ok =
      tab === 'medium'
        ? await onDeleteMedium(item.id)
        : await onDeleteAngle(item.id)
    setBusy(false)
    if (!ok) setError('삭제하지 못했어요.')
    if (ok && editingId === item.id) setEditingId(null)
  }

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <section className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-[#f7f7f9] shadow-2xl">
        <header className="flex items-center justify-between border-b border-black/[0.06] bg-white/90 px-6 py-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f1e9ec] text-[#806972]">
              <Palette className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-[19px] font-semibold tracking-tight text-[#1d1d1f]">
                훅 분류 관리
              </h2>
              <p className="text-[11px] text-[#8e8e93]">
                매체와 앵글을 독립적으로 관리할 수 있어요
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#f2f2f4] p-2 text-[#6e6e73] transition hover:bg-[#e8e8eb]"
            aria-label="분류 관리 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="border-b border-black/[0.06] bg-white/70 px-5 py-3">
          <div className="flex rounded-xl bg-[#f5f5f7] p-1">
            <button
              type="button"
              onClick={() => {
                setTab('medium')
                setEditingId(null)
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-semibold transition ${
                tab === 'medium'
                  ? 'bg-white text-[#1d1d1f] shadow-sm'
                  : 'text-[#77777c]'
              }`}
            >
              매체
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('angle')
                setEditingId(null)
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-semibold transition ${
                tab === 'angle'
                  ? 'bg-white text-[#1d1d1f] shadow-sm'
                  : 'text-[#77777c]'
              }`}
            >
              앵글
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6">
          <div className="space-y-2">
            {items.map((item) => {
              const count = hookCountById.get(item.id) ?? 0
              return (
                <article
                  key={item.id}
                  className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.035]"
                >
                  <span
                    className="h-10 w-10 shrink-0 rounded-2xl ring-1 ring-black/[0.04]"
                    style={{ backgroundColor: item.color ?? '#b8b8bd' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[13px] font-semibold text-[#2c2c2e]">
                        {item.name}
                      </h3>
                      <span className="rounded-full bg-[#f2f2f4] px-2 py-0.5 text-[9px] font-medium text-[#8e8e93]">
                        훅 {count}개
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#8e8e93]">
                      {item.description || '설명 없음'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => begin(item)}
                    className="rounded-xl bg-[#f5f5f7] p-2 text-[#77777c] transition hover:bg-[#e9e9ec] hover:text-[#1d1d1f]"
                    aria-label={`${item.name} 편집`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(item)}
                    className="rounded-xl bg-[#fff3f4] p-2 text-[#b7737e] transition hover:bg-[#ffe7ea] hover:text-[#a84353] disabled:opacity-40"
                    aria-label={`${item.name} 삭제`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </article>
              )
            })}
          </div>

          {items.length === 0 && !editingId && (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white/55 px-5 py-10 text-center">
              {loading ? (
                <>
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#9b8990]" />
                  <p className="mt-3 text-[13px] font-medium text-[#6e6e73]">
                    분류를 불러오는 중…
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[13px] font-medium text-[#6e6e73]">
                    아직 등록된 {tab === 'medium' ? '매체' : '앵글'}가 없어요
                  </p>
                  {fetchError && (
                    <div className="mx-auto mt-4 max-w-lg rounded-xl bg-[#fff4f4] px-4 py-3 text-left">
                      <p className="text-[11px] font-semibold text-[#8f4d57]">
                        Supabase fetch 응답
                      </p>
                      <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[10px] leading-5 text-[#a45a5a]">
                        {fetchError}
                      </pre>
                    </div>
                  )}
                  {diagnostics.length > 0 && (
                    <details className="mx-auto mt-3 max-w-lg text-left">
                      <summary className="cursor-pointer text-[11px] font-medium text-[#8e8e93]">
                        테이블별 raw 응답 보기
                      </summary>
                      <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-[#f5f5f7] px-3 py-2 font-mono text-[10px] leading-5 text-[#6e6e73]">
                        {JSON.stringify(diagnostics, null, 2)}
                      </pre>
                    </details>
                  )}
                </>
              )}
            </div>
          )}

          {editingId ? (
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
              <p className="mb-3 text-[12px] font-semibold text-[#3a3a3c]">
                {editingId === 'new'
                  ? `새 ${tab === 'medium' ? '매체' : '앵글'} 추가`
                  : `${tab === 'medium' ? '매체' : '앵글'} 편집`}
              </p>
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="이름"
                  autoFocus
                  className="min-w-0 flex-1 rounded-xl bg-[#f5f5f7] px-3 py-2.5 text-[13px] outline-none ring-1 ring-transparent focus:bg-white focus:ring-[#b49ba1]/35"
                />
                <label className="flex h-10 items-center gap-2 rounded-xl bg-[#f5f5f7] px-2.5 text-[10px] text-[#77777c]">
                  색상
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent"
                  />
                </label>
              </div>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="설명 (선택)"
                rows={2}
                className="mt-2 w-full resize-none rounded-xl bg-[#f5f5f7] px-3 py-2.5 text-[12px] outline-none ring-1 ring-transparent focus:bg-white focus:ring-[#b49ba1]/35"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[10px] text-[#bd5364]">{error}</p>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-xl px-3 py-2 text-[11px] font-medium text-[#77777c] hover:bg-[#f5f5f7]"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={busy || !name.trim()}
                    onClick={() => void save()}
                    className="inline-flex min-w-[62px] items-center justify-center rounded-xl bg-[#1d1d1f] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-40"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      '저장'
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => begin()}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-black/10 bg-white/60 py-3 text-[12px] font-semibold text-[#765f68] transition hover:bg-white"
            >
              <Plus className="h-4 w-4" />
              새 {tab === 'medium' ? '매체' : '앵글'} 추가
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

/** @deprecated Use HookTaxonomyManagerModal */
export const HookTypeManagerModal = HookTaxonomyManagerModal
