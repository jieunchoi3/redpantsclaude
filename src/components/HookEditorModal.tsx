import { useEffect, useMemo, useState, type ClipboardEvent } from 'react'
import {
  Check,
  ChevronDown,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { accountColor } from '../lib/accounts'
import { GeminiApiError } from '../lib/gemini'
import {
  classifyHookType,
  generateHookVariations,
  type HookVariationContext,
} from '../lib/hookAi'
import { uploadHookMedia } from '../lib/storage'
import type {
  Account,
  HookItem,
  HookMediaKind,
  HookType,
} from '../types'
import type { HookInput } from '../lib/hooks'
import { HookImageExtractPanel } from './HookImageExtractPanel'

const TYPE_COLORS = [
  '#D9A6AF',
  '#A8BFD8',
  '#B6AED5',
  '#A9C8B9',
  '#DCC08C',
  '#C4AD9D',
]

interface HookEditorModalProps {
  hook: HookItem | null
  types: HookType[]
  accounts: Account[]
  existingHooks: HookItem[]
  onClose: () => void
  onSave: (input: HookInput) => Promise<boolean>
  onCreateHooks: (inputs: HookInput[]) => Promise<number>
  onAddType: (input: {
    name: string
    description?: string | null
    color?: string | null
  }) => Promise<HookType | null>
  onUpdateType: (
    id: string,
    patch: Pick<HookType, 'name' | 'description' | 'color'>,
  ) => Promise<boolean>
  onDeleteType: (id: string) => Promise<boolean>
  variationContext?: HookVariationContext
}

export function HookEditorModal({
  hook,
  types,
  accounts,
  existingHooks,
  onClose,
  onSave,
  onCreateHooks,
  onAddType,
  onUpdateType,
  onDeleteType,
  variationContext,
}: HookEditorModalProps) {
  const [content, setContent] = useState(hook?.content ?? '')
  const [hookType, setHookType] = useState(hook?.hook_type ?? '')
  const [accountIds, setAccountIds] = useState<string[]>(
    hook?.account_ids ?? [],
  )
  const [mediaKind, setMediaKind] = useState<HookMediaKind>(
    hook?.media_kind ?? 'none',
  )
  const [imageUrl, setImageUrl] = useState(hook?.image_url ?? '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState(hook?.video_url ?? '')
  const [videoFileUrl, setVideoFileUrl] = useState(
    hook?.video_file_url ?? '',
  )
  const [sourceNote, setSourceNote] = useState(hook?.source_note ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTypeManager, setShowTypeManager] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [variating, setVariating] = useState(false)
  const [variations, setVariations] = useState<string[]>([])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving && !uploading) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, saving, uploading])

  const sortedAccounts = useMemo(
    () =>
      [...accounts].sort((a, b) => {
        if (a.workspace !== b.workspace) {
          return a.workspace === 'redpants' ? -1 : 1
        }
        return a.sort_order - b.sort_order
      }),
    [accounts],
  )

  async function upload(file: File, kind: 'image' | 'video_file') {
    if (kind === 'video_file' && file.size > 100 * 1024 * 1024) {
      setError('영상은 100MB 이하만 업로드할 수 있어요.')
      return
    }
    if (kind === 'video_file' && file.size > 50 * 1024 * 1024) {
      setError('큰 영상이에요. 업로드에 시간이 걸릴 수 있어요.')
    } else {
      setError(null)
    }
    setUploading(true)
    const url = await uploadHookMedia(file)
    setUploading(false)
    if (!url) {
      setError('미디어 업로드에 실패했어요. Storage 설정을 확인해 주세요.')
      return
    }
    setMediaKind(kind)
    if (kind === 'image') {
      setImageUrl(url)
      setImageFile(file)
    } else setVideoFileUrl(url)
  }

  function clearImage() {
    setImageUrl('')
    setImageFile(null)
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const image = Array.from(event.clipboardData.items).find((item) =>
      item.type.startsWith('image/'),
    )
    const file = image?.getAsFile()
    if (!file) return
    event.preventDefault()
    void upload(file, 'image')
  }

  async function handleSave() {
    if (!content.trim()) {
      setError('훅 내용을 입력해 주세요.')
      return
    }
    if (mediaKind === 'video_link' && videoUrl) {
      try {
        new URL(videoUrl)
      } catch {
        setError('올바른 영상 링크를 입력해 주세요.')
        return
      }
    }
    setSaving(true)
    setError(null)
    const ok = await onSave({
      content: content.trim(),
      hook_type: hookType || null,
      media_kind: mediaKind,
      image_url: mediaKind === 'image' ? imageUrl || null : null,
      video_url: mediaKind === 'video_link' ? videoUrl || null : null,
      video_file_url:
        mediaKind === 'video_file' ? videoFileUrl || null : null,
      source_note: sourceNote.trim() || null,
      is_inbox: hook?.is_inbox
        ? !hookType && accountIds.length === 0
        : false,
      account_ids: accountIds,
    })
    setSaving(false)
    if (ok) onClose()
    else setError('저장하지 못했어요. 데이터베이스 설정을 확인해 주세요.')
  }

  async function handleAiClassify() {
    if (!content.trim()) {
      setError('분류할 훅 내용을 먼저 입력해 주세요.')
      return
    }
    if (types.length === 0) {
      setError('등록된 훅 유형이 없어요.')
      return
    }
    setClassifying(true)
    setError(null)
    try {
      const matched = await classifyHookType(content, types)
      if (!matched) {
        setError('AI가 맞는 유형을 찾지 못했어요. 직접 선택해 주세요.')
        return
      }
      setHookType(matched.id)
    } catch (err) {
      setError(
        err instanceof GeminiApiError
          ? err.message
          : 'AI 유형 분류에 실패했어요.',
      )
    } finally {
      setClassifying(false)
    }
  }

  async function handleGenerateVariations() {
    if (!content.trim()) {
      setError('변형할 훅 내용을 먼저 입력해 주세요.')
      return
    }
    setVariating(true)
    setError(null)
    setVariations([])
    try {
      const next = await generateHookVariations(content, variationContext)
      if (!next?.length) {
        setError('변형 문구를 만들지 못했어요. 다시 시도해 주세요.')
        return
      }
      setVariations(next)
    } catch (err) {
      setError(
        err instanceof GeminiApiError
          ? err.message
          : '훅 변형 생성에 실패했어요.',
      )
    } finally {
      setVariating(false)
    }
  }

  async function saveVariationAsHook(variation: string) {
    setSaving(true)
    setError(null)
    const count = await onCreateHooks([
      {
        content: variation,
        hook_type: hookType || null,
        media_kind: 'none',
        image_url: null,
        video_url: null,
        video_file_url: null,
        source_note: sourceNote.trim() || null,
        is_inbox: false,
        account_ids: accountIds,
      },
    ])
    setSaving(false)
    if (count > 0) setVariations((current) => current.filter((item) => item !== variation))
    else setError('새 훅으로 저장하지 못했어요.')
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/25 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <div
        onPaste={handlePaste}
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] bg-[#f7f7f9] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-black/[0.06] bg-white/85 px-5 py-4 backdrop-blur-xl sm:px-7">
          <div>
            <p className="text-[12px] font-medium text-[#86868b]">
              훅 라이브러리
            </p>
            <h2 className="text-[20px] font-semibold tracking-tight text-[#1d1d1f]">
              {hook ? '훅 편집' : '새 훅 추가'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#f2f2f4] p-2 text-[#6e6e73] transition hover:bg-[#e8e8eb]"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <div className="space-y-6">
            {hook?.is_inbox && (
              <div className="rounded-2xl bg-[#fff7e8] px-4 py-3 text-[11px] leading-5 text-[#8a6a38] ring-1 ring-[#ead8b5]/55">
                인박스에 저장된 미분류 훅이에요. 유형이나 적용 계정을 지정하면
                자동으로 정리 완료 처리됩니다.
              </div>
            )}
            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold text-[#3a3a3c]">
                훅 내용 <span className="text-[#c75d6d]">*</span>
              </span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={4}
                autoFocus
                placeholder="첫 3초 안에 시선을 잡을 문구나 영상 공식을 적어보세요."
                className="w-full resize-none rounded-2xl border-0 bg-white px-4 py-3.5 text-[15px] leading-6 text-[#1d1d1f] shadow-sm outline-none ring-1 ring-black/[0.05] transition placeholder:text-[#b0b0b5] focus:ring-2 focus:ring-[#b49ba1]/45"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={variating || !content.trim()}
                  onClick={() => void handleGenerateVariations()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#5f4d55] ring-1 ring-black/[0.06] transition hover:bg-[#f7f7f8] disabled:opacity-45"
                >
                  {variating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  이 훅 변형 만들기
                </button>
              </div>
              {variations.length > 0 && (
                <div className="mt-3 space-y-2 rounded-2xl bg-white p-3 ring-1 ring-black/[0.05]">
                  <p className="text-[11px] font-semibold text-[#6e6e73]">
                    AI 변형 문구
                  </p>
                  {variations.map((variation) => (
                    <div
                      key={variation}
                      className="rounded-xl bg-[#f7f7f9] p-3"
                    >
                      <p className="text-[12px] leading-5 text-[#2c2c2e]">
                        {variation}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setContent(variation)}
                          className="rounded-lg bg-[#1d1d1f] px-2.5 py-1.5 text-[10px] font-semibold text-white"
                        >
                          이 문구로 교체
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void saveVariationAsHook(variation)}
                          className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#5f4d55] ring-1 ring-black/[0.06]"
                        >
                          새 훅으로 저장
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </label>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-[#3a3a3c]">
                  훅 유형
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={classifying || !content.trim()}
                    onClick={() => void handleAiClassify()}
                    className="inline-flex items-center gap-1 rounded-full bg-[#f3f0f1] px-2.5 py-1 text-[11px] font-semibold text-[#6f5a62] transition hover:bg-[#ebe4e6] disabled:opacity-45"
                  >
                    {classifying ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    AI로 유형 분류
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTypeManager((current) => !current)}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-[#7c6870] transition hover:text-[#4c3f44]"
                  >
                    유형 관리
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition ${showTypeManager ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
              </div>
              <select
                value={hookType}
                onChange={(event) => {
                  if (event.target.value === '__manage__') {
                    setShowTypeManager(true)
                    return
                  }
                  setHookType(event.target.value)
                }}
                className="w-full appearance-none rounded-2xl border-0 bg-white px-4 py-3 text-[14px] text-[#1d1d1f] shadow-sm outline-none ring-1 ring-black/[0.05]"
              >
                <option value="">미지정</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
                <option value="__manage__">＋ 유형 추가 및 관리…</option>
              </select>
              {showTypeManager && (
                <HookTypeManager
                  types={types}
                  onAdd={onAddType}
                  onUpdate={onUpdateType}
                  onDelete={async (id) => {
                    const ok = await onDeleteType(id)
                    if (ok && hookType === id) setHookType('')
                    return ok
                  }}
                />
              )}
            </div>

            <div>
              <div className="mb-2">
                <span className="text-[13px] font-semibold text-[#3a3a3c]">
                  적용 대상 계정
                </span>
                <p className="mt-0.5 text-[11px] text-[#8e8e93]">
                  ALL은 모든 워크스페이스와 계정에서 사용할 수 있어요.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAccountIds([])}
                  className={`rounded-full px-3 py-2 text-[12px] font-semibold transition ${
                    accountIds.length === 0
                      ? 'bg-[#1d1d1f] text-white shadow-sm'
                      : 'bg-white text-[#6e6e73] ring-1 ring-black/[0.06] hover:bg-[#f0f0f2]'
                  }`}
                >
                  ALL
                </button>
                {sortedAccounts.map((account, index) => {
                  const selected = accountIds.includes(account.id)
                  const color = accountColor(account, index)
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() =>
                        setAccountIds((current) =>
                          current.includes(account.id)
                            ? current.filter((id) => id !== account.id)
                            : [...current, account.id],
                        )
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-medium transition ${
                        selected
                          ? 'bg-white text-[#1d1d1f] shadow-sm ring-2 ring-black/10'
                          : 'bg-white/60 text-[#6e6e73] ring-1 ring-black/[0.05] hover:bg-white'
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {account.name}
                      {selected && <Check className="h-3 w-3" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-[13px] font-semibold text-[#3a3a3c]">
                미디어
              </span>
              <div className="mb-3 flex flex-wrap gap-1 rounded-2xl bg-[#ebebee] p-1">
                {(
                  [
                    ['none', '없음'],
                    ['image', '이미지'],
                    ['video_link', '영상 링크'],
                    ['video_file', '영상 파일'],
                  ] as [HookMediaKind, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMediaKind(id)}
                    className={`rounded-xl px-3 py-2 text-[12px] font-medium transition ${
                      mediaKind === id
                        ? 'bg-white text-[#1d1d1f] shadow-sm'
                        : 'text-[#77777c] hover:text-[#1d1d1f]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mediaKind === 'image' && (
                <>
                  <MediaUploadBox
                    accept="image/*"
                    uploading={uploading}
                    url={imageUrl}
                    kind="image"
                    onFile={(file) => void upload(file, 'image')}
                    onClear={clearImage}
                  />
                  {(imageFile || imageUrl) && (
                    <div className="mt-3">
                      <HookImageExtractPanel
                        imageFile={imageFile}
                        imageUrl={imageUrl}
                        types={types}
                        existingHooks={existingHooks}
                        defaultHookTypeId={hookType}
                        defaultAccountIds={accountIds}
                        defaultSourceNote={sourceNote}
                        onSuggestedType={setHookType}
                        onCreateHooks={onCreateHooks}
                        onDone={onClose}
                      />
                    </div>
                  )}
                </>
              )}
              {mediaKind === 'video_link' && (
                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.05]">
                  <label className="text-[12px] font-medium text-[#6e6e73]">
                    인스타그램 릴스 등 외부 영상 URL
                  </label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(event) => setVideoUrl(event.target.value)}
                    placeholder="https://www.instagram.com/reel/..."
                    className="mt-2 w-full rounded-xl bg-[#f5f5f7] px-3 py-2.5 text-[13px] outline-none ring-1 ring-transparent focus:ring-[#b49ba1]/40"
                  />
                  <p className="mt-2 text-[11px] leading-4 text-[#8e8e93]">
                    앱 안에서 재생하지 않고, 클릭하면 원본 링크를 새 탭에서 열어요.
                  </p>
                </div>
              )}
              {mediaKind === 'video_file' && (
                <MediaUploadBox
                  accept="video/mp4,video/webm,video/quicktime"
                  uploading={uploading}
                  url={videoFileUrl}
                  kind="video"
                  onFile={(file) => void upload(file, 'video_file')}
                  onClear={() => setVideoFileUrl('')}
                />
              )}
            </div>

            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold text-[#3a3a3c]">
                출처 메모
              </span>
              <input
                value={sourceNote}
                onChange={(event) => setSourceNote(event.target.value)}
                placeholder="어디서 봤는지, 참고할 점 등"
                className="w-full rounded-2xl border-0 bg-white px-4 py-3 text-[14px] text-[#1d1d1f] shadow-sm outline-none ring-1 ring-black/[0.05] placeholder:text-[#b0b0b5] focus:ring-2 focus:ring-[#b49ba1]/45"
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] bg-white/90 px-5 py-4 backdrop-blur-xl sm:px-7">
          <p className="min-w-0 text-[11px] text-[#c75d6d]">{error}</p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-[13px] font-medium text-[#6e6e73] transition hover:bg-[#f2f2f4]"
            >
              취소
            </button>
            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => void handleSave()}
              className="inline-flex min-w-[88px] items-center justify-center gap-1.5 rounded-xl bg-[#1d1d1f] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-black disabled:opacity-45"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MediaUploadBox({
  accept,
  uploading,
  url,
  kind,
  onFile,
  onClear,
}: {
  accept: string
  uploading: boolean
  url: string
  kind: 'image' | 'video'
  onFile: (file: File) => void
  onClear: () => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.05]">
      {url ? (
        <div className="relative overflow-hidden rounded-xl bg-[#f1f1f3]">
          {kind === 'image' ? (
            <img
              src={url}
              alt="훅 이미지 미리보기"
              className="max-h-72 w-full object-contain"
            />
          ) : (
            <video
              src={url}
              controls
              className="max-h-72 w-full bg-black object-contain"
            />
          )}
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-2 rounded-full bg-black/55 p-1.5 text-white backdrop-blur transition hover:bg-black/70"
            aria-label="미디어 제거"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-black/15 bg-[#fafafa] px-4 text-center transition hover:bg-[#f5f5f7]">
          {uploading ? (
            <Loader2 className="mb-2 h-5 w-5 animate-spin text-[#8e8e93]" />
          ) : kind === 'image' ? (
            <ImagePlus className="mb-2 h-5 w-5 text-[#8e8e93]" />
          ) : (
            <Upload className="mb-2 h-5 w-5 text-[#8e8e93]" />
          )}
          <span className="text-[12px] font-medium text-[#6e6e73]">
            {kind === 'image'
              ? '이미지를 선택하거나 Cmd/Ctrl+V로 붙여넣기'
              : 'MP4·WebM·MOV 선택 (최대 100MB)'}
          </span>
          <input
            type="file"
            accept={accept}
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onFile(file)
              event.target.value = ''
            }}
          />
        </label>
      )}
    </div>
  )
}

function HookTypeManager({
  types,
  onAdd,
  onUpdate,
  onDelete,
}: {
  types: HookType[]
  onAdd: HookEditorModalProps['onAddType']
  onUpdate: HookEditorModalProps['onUpdateType']
  onDelete: HookEditorModalProps['onDeleteType']
}) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(TYPE_COLORS[0]!)
  const [busy, setBusy] = useState(false)

  function startEdit(type?: HookType) {
    setEditingId(type?.id ?? 'new')
    setName(type?.name ?? '')
    setDescription(type?.description ?? '')
    setColor(type?.color ?? TYPE_COLORS[types.length % TYPE_COLORS.length]!)
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

  return (
    <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.05]">
      <div className="space-y-1">
        {types.map((type) => (
          <div
            key={type.id}
            className="group flex items-start gap-2 rounded-xl px-2.5 py-2 transition hover:bg-[#f7f7f9]"
          >
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: type.color ?? '#b8b8bd' }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-[#3a3a3c]">
                {type.name}
              </p>
              {type.description && (
                <p className="mt-0.5 text-[10px] leading-4 text-[#8e8e93]">
                  {type.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => startEdit(type)}
              className="rounded-lg p-1.5 text-[#9a9a9f] opacity-0 transition hover:bg-white hover:text-[#4d4d50] group-hover:opacity-100"
              aria-label={`${type.name} 편집`}
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `"${type.name}" 유형을 삭제할까요? 기존 훅은 유형 미지정으로 바뀝니다.`,
                  )
                ) {
                  void onDelete(type.id)
                }
              }}
              className="rounded-lg p-1.5 text-[#b7a3a6] opacity-0 transition hover:bg-[#fff0f1] hover:text-[#bd5364] group-hover:opacity-100"
              aria-label={`${type.name} 삭제`}
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
              placeholder="유형 이름"
              className="min-w-0 flex-1 rounded-xl bg-[#f5f5f7] px-3 py-2 text-[12px] outline-none"
            />
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-9 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
              aria-label="유형 색상"
            />
          </div>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="이 유형에 대한 설명"
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
          새 유형
        </button>
      )}
    </div>
  )
}
