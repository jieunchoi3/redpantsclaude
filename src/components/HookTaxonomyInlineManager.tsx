import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { HookAngle, HookMedium } from '../types'

const DEFAULT_COLORS = [
  '#D9A6AF',
  '#A8BFD8',
  '#B6AED5',
  '#A9C8B9',
  '#DCC08C',
  '#C4AD9D',
]

type TaxonomyItem = HookMedium | HookAngle

interface HookTaxonomyInlineManagerProps {
  axisLabel: string
  items: TaxonomyItem[]
  onAdd: (input: {
    name: string
    description?: string | null
    color?: string | null
  }) => Promise<TaxonomyItem | null>
  onUpdate: (
    id: string,
    patch: Pick<TaxonomyItem, 'name' | 'description' | 'color'>,
  ) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  onSelectionChange?: (ids: string[], removedId: string) => void
  selectedIds?: string[]
}

export function HookTaxonomyInlineManager({
  axisLabel,
  items,
  onAdd,
  onUpdate,
  onDelete,
  onSelectionChange,
  selectedIds = [],
}: HookTaxonomyInlineManagerProps) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(DEFAULT_COLORS[0]!)
  const [busy, setBusy] = useState(false)

  function startEdit(item?: TaxonomyItem) {
    setEditingId(item?.id ?? 'new')
    setName(item?.name ?? '')
    setDescription(item?.description ?? '')
    setColor(item?.color ?? DEFAULT_COLORS[items.length % DEFAULT_COLORS.length]!)
  }

  async function save() {
    if (!name.trim()) return
    setBusy(true)
    if (editingId === 'new') {
      await onAdd({
        name: name.trim(),
        description: description.trim() || null,
        color,
      })
    } else if (editingId) {
      await onUpdate(editingId, {
        name: name.trim(),
        description: description.trim() || null,
        color,
      })
    }
    setBusy(false)
    setEditingId(null)
  }

  async function remove(id: string) {
    const item = items.find((entry) => entry.id === id)
    if (
      !window.confirm(
        `"${item?.name ?? axisLabel}"을(를) 삭제할까요? 이 분류를 쓰는 훅은 매핑만 해제됩니다.`,
      )
    ) {
      return
    }
    const ok = await onDelete(id)
    if (ok) {
      if (selectedIds.includes(id)) {
        onSelectionChange?.(
          selectedIds.filter((entry) => entry !== id),
          id,
        )
      }
      if (editingId === id) setEditingId(null)
    }
  }

  return (
    <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.05]">
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-start gap-2 rounded-xl px-2.5 py-2 transition hover:bg-[#f7f7f9]"
          >
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color ?? '#b8b8bd' }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-[#3a3a3c]">{item.name}</p>
              {item.description && (
                <p className="mt-0.5 text-[10px] leading-4 text-[#8e8e93]">
                  {item.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => startEdit(item)}
              className="rounded-lg p-1.5 text-[#9a9a9f] opacity-0 transition hover:bg-white hover:text-[#4d4d50] group-hover:opacity-100"
              aria-label={`${item.name} 편집`}
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => void remove(item.id)}
              className="rounded-lg p-1.5 text-[#b7a3a6] opacity-0 transition hover:bg-[#fff0f1] hover:text-[#bd5364] group-hover:opacity-100"
              aria-label={`${item.name} 삭제`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {editingId ? (
        <div className="mt-3 space-y-2 border-t border-black/[0.06] pt-3">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={`${axisLabel} 이름`}
              className="min-w-0 flex-1 rounded-xl bg-[#f5f5f7] px-3 py-2 text-[12px] outline-none"
            />
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-9 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
              aria-label={`${axisLabel} 색상`}
            />
          </div>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="설명 (선택)"
            className="w-full rounded-xl bg-[#f5f5f7] px-3 py-2 text-[12px] outline-none"
          />
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-lg px-2.5 py-1.5 text-[11px] text-[#77777c]"
            >
              취소
            </button>
            <button
              type="button"
              disabled={busy || !name.trim()}
              onClick={() => void save()}
              className="rounded-lg bg-[#1d1d1f] px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-40"
            >
              저장
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => startEdit()}
          className="mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#7c6870] transition hover:bg-[#f5f5f7]"
        >
          <Plus className="h-3 w-3" />
          새 {axisLabel}
        </button>
      )}
    </div>
  )
}
