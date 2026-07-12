import { Loader2, Palette, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { HookItem, HookType } from '../types'

const DEFAULT_COLORS = [
  '#D9A6AF',
  '#A8BFD8',
  '#B6AED5',
  '#A9C8B9',
  '#DCC08C',
  '#C4AD9D',
]

interface HookTypeManagerModalProps {
  types: HookType[]
  hooks: HookItem[]
  onClose: () => void
  onAdd: (input: {
    name: string
    description?: string | null
    color?: string | null
  }) => Promise<HookType | null>
  onUpdate: (
    id: string,
    patch: Pick<HookType, 'name' | 'description' | 'color'>,
  ) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

export function HookTypeManagerModal({
  types,
  hooks,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
}: HookTypeManagerModalProps) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(DEFAULT_COLORS[0]!)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hookCountByType = useMemo(() => {
    const counts = new Map<string, number>()
    for (const hook of hooks) {
      if (!hook.hook_type) continue
      counts.set(hook.hook_type, (counts.get(hook.hook_type) ?? 0) + 1)
    }
    return counts
  }, [hooks])

  function begin(type?: HookType) {
    setEditingId(type?.id ?? 'new')
    setName(type?.name ?? '')
    setDescription(type?.description ?? '')
    setColor(
      type?.color ?? DEFAULT_COLORS[types.length % DEFAULT_COLORS.length]!,
    )
    setError(null)
  }

  async function save() {
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    const ok =
      editingId === 'new'
        ? Boolean(
            await onAdd({
              name: name.trim(),
              description: description.trim() || null,
              color,
            }),
          )
        : editingId
          ? await onUpdate(editingId, {
              name: name.trim(),
              description: description.trim() || null,
              color,
            })
          : false
    setBusy(false)
    if (ok) setEditingId(null)
    else setError('유형을 저장하지 못했어요. 이름이 중복되지 않는지 확인해 주세요.')
  }

  async function remove(type: HookType) {
    const count = hookCountByType.get(type.id) ?? 0
    if (
      !window.confirm(
        count > 0
          ? `"${type.name}" 유형을 삭제할까요? 이 유형을 사용 중인 훅 ${count}개는 미분류로 이동합니다.`
          : `"${type.name}" 유형을 삭제할까요?`,
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    const ok = await onDelete(type.id)
    setBusy(false)
    if (!ok) setError('유형을 삭제하지 못했어요.')
    if (ok && editingId === type.id) setEditingId(null)
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
                훅 유형 관리
              </h2>
              <p className="text-[11px] text-[#8e8e93]">
                이름, 설명, 색상을 자유롭게 관리할 수 있어요
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#f2f2f4] p-2 text-[#6e6e73] transition hover:bg-[#e8e8eb]"
            aria-label="유형 관리 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="overflow-y-auto p-5 sm:p-6">
          <div className="space-y-2">
            {types.map((type) => {
              const count = hookCountByType.get(type.id) ?? 0
              return (
                <article
                  key={type.id}
                  className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.035]"
                >
                  <span
                    className="h-10 w-10 shrink-0 rounded-2xl ring-1 ring-black/[0.04]"
                    style={{ backgroundColor: type.color ?? '#b8b8bd' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[13px] font-semibold text-[#2c2c2e]">
                        {type.name}
                      </h3>
                      <span className="rounded-full bg-[#f2f2f4] px-2 py-0.5 text-[9px] font-medium text-[#8e8e93]">
                        훅 {count}개
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#8e8e93]">
                      {type.description || '설명 없음'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => begin(type)}
                    className="rounded-xl bg-[#f5f5f7] p-2 text-[#77777c] transition hover:bg-[#e9e9ec] hover:text-[#1d1d1f]"
                    aria-label={`${type.name} 편집`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(type)}
                    className="rounded-xl bg-[#fff3f4] p-2 text-[#b7737e] transition hover:bg-[#ffe7ea] hover:text-[#a84353] disabled:opacity-40"
                    aria-label={`${type.name} 삭제`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </article>
              )
            })}
          </div>

          {types.length === 0 && !editingId && (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white/55 px-5 py-10 text-center">
              <p className="text-[13px] font-medium text-[#6e6e73]">
                아직 등록된 유형이 없어요
              </p>
            </div>
          )}

          {editingId ? (
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
              <p className="mb-3 text-[12px] font-semibold text-[#3a3a3c]">
                {editingId === 'new' ? '새 유형 추가' : '유형 편집'}
              </p>
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="유형 이름"
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
                placeholder="이 유형을 언제 사용하는지 설명"
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
              새 유형 추가
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
