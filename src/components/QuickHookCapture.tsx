import {
  CheckCircle2,
  ImagePlus,
  Loader2,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'
import { useState, type ClipboardEvent, type FormEvent } from 'react'
import type { HookInput } from '../lib/hooks'
import { uploadHookMedia } from '../lib/storage'

interface QuickHookCaptureProps {
  variant: 'gate' | 'floating'
  onSave: (input: HookInput) => Promise<boolean>
}

export function QuickHookCapture({
  variant,
  onSave,
}: QuickHookCaptureProps) {
  const [open, setOpen] = useState(variant === 'gate')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function uploadImage(file: File) {
    setUploading(true)
    setError(null)
    const url = await uploadHookMedia(file)
    setUploading(false)
    if (!url) {
      setError('이미지를 올리지 못했어요.')
      return
    }
    setImageUrl(url)
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const image = Array.from(event.clipboardData.items).find((item) =>
      item.type.startsWith('image/'),
    )
    const file = image?.getAsFile()
    if (!file) return
    event.preventDefault()
    void uploadImage(file)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!content.trim()) {
      setError('훅 문구를 입력해 주세요.')
      return
    }
    setSaving(true)
    setError(null)
    const ok = await onSave({
      content: content.trim(),
      hook_type: null,
      media_kind: imageUrl ? 'image' : 'none',
      image_url: imageUrl || null,
      video_url: null,
      video_file_url: null,
      source_note: null,
      is_inbox: true,
      account_ids: [],
    })
    setSaving(false)
    if (!ok) {
      setError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
      return
    }
    setContent('')
    setImageUrl('')
    setSaved(true)
    window.setTimeout(() => {
      setSaved(false)
      if (variant === 'floating') setOpen(false)
    }, 1200)
  }

  if (variant === 'floating' && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-2xl bg-[#1d1d1f] px-4 py-3 text-[13px] font-semibold text-white shadow-[0_12px_35px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-black hover:shadow-[0_16px_40px_rgba(0,0,0,0.25)]"
      >
        <Plus className="h-4 w-4" />
        훅
      </button>
    )
  }

  const form = (
    <form
      onSubmit={handleSubmit}
      className={
        variant === 'floating'
          ? 'fixed bottom-6 right-6 z-50 w-[min(360px,calc(100vw-32px))] rounded-[24px] bg-white p-4 shadow-[0_22px_65px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.05]'
          : 'w-full rounded-[24px] bg-white/80 p-4 shadow-[var(--shadow-sm)] ring-1 ring-black/[0.04] backdrop-blur-xl'
      }
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f1e9ec] text-[#806972]">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-[#2c2c2e]">
              훅 빠르게 저장
            </p>
            <p className="text-[10px] text-[#9a9a9f]">
              인박스에 미분류 상태로 저장돼요
            </p>
          </div>
        </div>
        {variant === 'floating' && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full bg-[#f2f2f4] p-1.5 text-[#7f7f84] transition hover:bg-[#e8e8eb]"
            aria-label="빠른 저장 닫기"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {saved ? (
        <div className="flex min-h-24 flex-col items-center justify-center text-[#688272]">
          <CheckCircle2 className="h-6 w-6" />
          <p className="mt-2 text-[12px] font-semibold">인박스에 저장했어요</p>
        </div>
      ) : (
        <>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onPaste={handlePaste}
            rows={variant === 'gate' ? 2 : 3}
            placeholder="지금 떠오른 훅을 바로 적어두세요"
            className="w-full resize-none rounded-2xl bg-[#f5f5f7] px-3.5 py-3 text-[13px] leading-5 text-[#1d1d1f] outline-none ring-1 ring-transparent transition placeholder:text-[#aaaab0] focus:bg-white focus:ring-[#b49ba1]/35"
          />

          {imageUrl && (
            <div className="relative mt-2 h-20 overflow-hidden rounded-xl bg-[#f0f0f2]">
              <img
                src={imageUrl}
                alt="붙여넣은 훅 이미지"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/55 p-1 text-white"
                aria-label="이미지 제거"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl px-2.5 py-2 text-[11px] font-medium text-[#77777c] transition hover:bg-[#f5f5f7]">
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="h-3.5 w-3.5" />
                )}
                이미지
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void uploadImage(file)
                    event.target.value = ''
                  }}
                />
              </label>
              {error && (
                <p className="truncate text-[10px] text-[#bd5364]">{error}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={!content.trim() || uploading || saving}
              className="inline-flex min-w-[58px] items-center justify-center rounded-xl bg-[#1d1d1f] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-black disabled:opacity-35"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                '저장'
              )}
            </button>
          </div>
          {!imageUrl && (
            <p className="mt-1 text-[9px] text-[#b0b0b5]">
              이미지 복사 후 입력창에서 Cmd/Ctrl+V도 가능해요
            </p>
          )}
        </>
      )}
    </form>
  )

  return form
}
