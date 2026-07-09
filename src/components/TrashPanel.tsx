import { RotateCcw, Trash2, X } from 'lucide-react'
import type { Idea } from '../types'

interface TrashPanelProps {
  ideas: Idea[]
  onClose: () => void
  onRestore: (id: string) => Promise<unknown>
  onDeleteForever: (id: string) => Promise<unknown>
}

export function TrashPanel({
  ideas,
  onClose,
  onRestore,
  onDeleteForever,
}: TrashPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-[var(--shadow)]">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">휴지통</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#6e6e73] transition hover:bg-[#f5f5f7]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {ideas.length === 0 ? (
            <p className="py-10 text-center text-[14px] text-[#aeaeb2]">
              휴지통이 비어 있습니다
            </p>
          ) : (
            <ul className="space-y-2">
              {ideas.map((idea) => (
                <li
                  key={idea.id}
                  className="flex items-center gap-3 rounded-xl bg-[#f5f5f7] px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-[#1d1d1f]">
                      {idea.title || '제목 없음'}
                    </p>
                    <p className="text-[12px] text-[#6e6e73]">{idea.status}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onRestore(idea.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-medium text-[#1d1d1f] transition hover:bg-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    복구
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('영구 삭제할까요? 되돌릴 수 없습니다.')) {
                        void onDeleteForever(idea.id)
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-medium text-red-500 transition hover:bg-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    영구삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
