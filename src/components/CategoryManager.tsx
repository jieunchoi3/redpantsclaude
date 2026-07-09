import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import type { Category, Channel } from '../types'

interface CategoryManagerProps {
  categories: Category[]
  onAdd: (name: string, channel: Channel) => Promise<unknown>
  onRename: (id: string, name: string) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
  onClose: () => void
}

export function CategoryManager({
  categories,
  onAdd,
  onRename,
  onDelete,
  onClose,
}: CategoryManagerProps) {
  const [channel, setChannel] = useState<Channel>('instagram')
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [busy, setBusy] = useState(false)

  const filtered = categories
    .filter((c) => c.channel === channel)
    .sort((a, b) => a.sort_order - b.sort_order)

  async function handleAdd() {
    const name = newName.trim()
    if (!name || busy) return
    setBusy(true)
    await onAdd(name, channel)
    setNewName('')
    setBusy(false)
  }

  async function handleRename(id: string) {
    const name = editName.trim()
    if (!name || busy) return
    setBusy(true)
    await onRename(id, name)
    setEditingId(null)
    setBusy(false)
  }

  async function handleDelete(id: string) {
    if (busy) return
    if (!window.confirm('이 카테고리를 삭제할까요?')) return
    setBusy(true)
    await onDelete(id)
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-[var(--shadow)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">카테고리 관리</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#6e6e73] transition hover:bg-[#f5f5f7]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 inline-flex rounded-xl bg-[#f5f5f7] p-1">
          {(
            [
              { id: 'instagram', label: '인스타그램' },
              { id: 'youtube', label: '유튜브' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setChannel(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                channel === tab.id
                  ? 'bg-white text-[#1d1d1f] shadow-sm'
                  : 'text-[#6e6e73]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ul className="mb-4 max-h-64 space-y-2 overflow-y-auto">
          {filtered.length === 0 && (
            <li className="py-6 text-center text-[13px] text-[#aeaeb2]">
              카테고리가 없습니다
            </li>
          )}
          {filtered.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center gap-2 rounded-xl bg-[#f5f5f7] px-3 py-2"
            >
              {editingId === cat.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border-0 bg-white px-2 py-1 text-[13px] outline-none ring-1 ring-[#d2d2d7]"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleRename(cat.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleRename(cat.id)}
                    className="rounded-lg p-1.5 text-emerald-600 hover:bg-white"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg p-1.5 text-[#6e6e73] hover:bg-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-[#1d1d1f]">
                    {cat.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(cat.id)
                      setEditName(cat.name)
                    }}
                    className="rounded-lg p-1.5 text-[#6e6e73] hover:bg-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(cat.id)}
                    className="rounded-lg p-1.5 text-red-500 hover:bg-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="새 카테고리 이름"
            className="min-w-0 flex-1 rounded-xl bg-[#f5f5f7] px-3 py-2.5 text-[13px] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#d2d2d7]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAdd()
            }}
          />
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={!newName.trim() || busy}
            className="inline-flex items-center gap-1 rounded-xl bg-[#1d1d1f] px-3 py-2.5 text-[13px] font-medium text-white transition hover:bg-black disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            추가
          </button>
        </div>
      </div>
    </div>
  )
}
