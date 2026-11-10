import { useEffect, useMemo, useState, type ClipboardEvent } from 'react'
import {
  Check,
  ImagePlus,
  Loader2,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import { accountColor } from '../lib/accounts'
import { GeminiApiError } from '../lib/gemini'
import { analyzeReelFrames } from '../lib/hookAnalysis'
import {
  classifyHookTaxonomy,
  generateHookVariations,
  type HookVariationContext,
} from '../lib/hookAi'
import { captureVideoFrames, imageSourceToPayload } from '../lib/videoFrames'
import { uploadHookMedia } from '../lib/storage'
import type {
  Account,
  HookAnalysis,
  HookAngle,
  HookItem,
  HookMediaKind,
  HookMedium,
  HookSourceKind,
} from '../types'
import type { HookInput } from '../lib/hooks'
import { HookAxisMultiSelect } from './HookAxisMultiSelect'
import { HookImageExtractPanel } from './HookImageExtractPanel'
import { HookTaxonomyInlineManager } from './HookTaxonomyInlineManager'

interface HookEditorModalProps {
  hook: HookItem | null
  mediums: HookMedium[]
  angles: HookAngle[]
  accounts: Account[]
  existingHooks: HookItem[]
  onClose: () => void
  onSave: (input: HookInput) => Promise<boolean>
  onCreateHooks: (inputs: HookInput[]) => Promise<number>
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
  variationContext?: HookVariationContext
  defaultSourceKind?: HookSourceKind
}

export function HookEditorModal({
  hook,
  mediums,
  angles,
  accounts,
  existingHooks,
  onClose,
  onSave,
  onCreateHooks,
  onAddMedium,
  onUpdateMedium,
  onDeleteMedium,
  onAddAngle,
  onUpdateAngle,
  onDeleteAngle,
  variationContext,
  defaultSourceKind = 'reference',
}: HookEditorModalProps) {
  const [content, setContent] = useState(hook?.content ?? '')
  const [mediumIds, setMediumIds] = useState<string[]>(hook?.medium_ids ?? [])
  const [angleIds, setAngleIds] = useState<string[]>(hook?.angle_ids ?? [])
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
  const [sourceKind, setSourceKind] = useState<HookSourceKind>(
    hook?.source_kind ?? defaultSourceKind,
  )
  const [analysis, setAnalysis] = useState<HookAnalysis | null>(
    hook?.analysis ?? null,
  )
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMediumManager, setShowMediumManager] = useState(false)
  const [showAngleManager, setShowAngleManager] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [variating, setVariating] = useState(false)
  const [variations, setVariations] = useState<string[]>([])

  useEffect(() => {
    setContent(hook?.content ?? '')
    setMediumIds(hook?.medium_ids ?? [])
    setAngleIds(hook?.angle_ids ?? [])
    setAccountIds(hook?.account_ids ?? [])
    setMediaKind(hook?.media_kind ?? 'none')
    setImageUrl(hook?.image_url ?? '')
    setImageFile(null)
    setVideoUrl(hook?.video_url ?? '')
    setVideoFileUrl(hook?.video_file_url ?? '')
    setSourceNote(hook?.source_note ?? '')
    setSourceKind(hook?.source_kind ?? defaultSourceKind)
    setAnalysis(hook?.analysis ?? null)
    setVideoFile(null)
    setShowMediumManager(false)
    setShowAngleManager(false)
    setVariations([])
    setError(null)
  }, [defaultSourceKind, hook])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving && !uploading && !analyzing) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [analyzing, onClose, saving, uploading])

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
      setError('첨부 파일 업로드에 실패했어요. Storage 설정을 확인해 주세요.')
      return
    }
    setMediaKind(kind)
    if (kind === 'image') {
      setImageUrl(url)
      setImageFile(file)
    } else {
      setVideoFileUrl(url)
      setVideoFile(file)
    }
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
    const hookText = content.trim() || analysis?.hook_line.trim() || ''
    if (!hookText) {
      setError('훅 내용을 입력하거나, 영상을 올리고 AI 분해를 먼저 해 주세요.')
      return
    }
    if (sourceKind === 'own' && accountIds.length === 0) {
      setError('내 콘텐츠는 계정을 하나 골라야 나중에 계정별 데이터로 모을 수 있어요.')
      return
    }
    if ((mediaKind === 'video_link' || mediaKind === 'video_file') && videoUrl.trim()) {
      try {
        new URL(videoUrl.trim())
      } catch {
        setError('올바른 영상 링크를 입력해 주세요.')
        return
      }
    }
    const fileUrl = mediaKind === 'video_file' ? videoFileUrl || null : null
    const image = mediaKind === 'image' ? imageUrl || null : null
    const link =
      mediaKind === 'video_file' || mediaKind === 'video_link'
        ? videoUrl.trim() || null
        : null
    const resolvedKind: HookMediaKind = fileUrl
      ? 'video_file'
      : image
        ? 'image'
        : link
          ? 'video_link'
          : 'none'
    setSaving(true)
    setError(null)
    const ok = await onSave({
      content: hookText,
      medium_ids: mediumIds,
      angle_ids: angleIds,
      media_kind: resolvedKind,
      image_url: image,
      video_url: link,
      video_file_url: fileUrl,
      source_note: sourceNote.trim() || null,
      source_kind: sourceKind,
      analysis,
      is_inbox: hook?.is_inbox
        ? mediumIds.length === 0 &&
          angleIds.length === 0 &&
          accountIds.length === 0
        : false,
      account_ids: accountIds,
    })
    setSaving(false)
    if (ok) onClose()
    else
      setError(
        '저장하지 못했어요. Supabase에서 supabase/v6_hook_analysis.sql 을 한 번 실행해 주세요.',
      )
  }

  async function handleAnalyze() {
    if (sourceKind === 'own' && accountIds.length === 0) {
      setError('내 콘텐츠는 계정을 먼저 고르면, 그 계정 데이터로 쌓여요.')
      return
    }
    const hasVideo = Boolean(videoFile || videoFileUrl)
    const hasImage = Boolean(imageFile || imageUrl)
    if (!hasVideo && !hasImage) {
      setError(
        '인스타 링크만으로는 릴스를 가져올 수 없어요. 영상 파일을 올리면 AI가 초반 화면을 분해합니다.',
      )
      return
    }
    setAnalyzing(true)
    setError(null)
    try {
      const frames = hasVideo
        ? await captureVideoFrames(videoFile ?? videoFileUrl)
        : [await imageSourceToPayload(imageFile ?? imageUrl)]
      const accountNames = accounts
        .filter((account) => accountIds.includes(account.id))
        .map((account) => account.name)
      const next = await analyzeReelFrames({
        frames,
        sourceKind,
        accountNames,
        link: videoUrl.trim(),
        note: sourceNote.trim(),
      })
      setAnalysis(next)
      if (!content.trim()) setContent(next.hook_line)
    } catch (err) {
      const message =
        err instanceof GeminiApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'AI 분해에 실패했어요.'
      setError(message)
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleAiClassify() {
    if (!content.trim()) {
      setError('분류할 훅 내용을 먼저 입력해 주세요.')
      return
    }
    if (mediums.length === 0 && angles.length === 0) {
      setError('등록된 매체·앵글이 없어요. 분류 관리에서 추가해 주세요.')
      return
    }
    setClassifying(true)
    setError(null)
    try {
      const matched = await classifyHookTaxonomy(content, mediums, angles)
      if (matched.mediums.length === 0 && matched.angles.length === 0) {
        setError('AI가 맞는 매체·앵글을 찾지 못했어요. 직접 선택해 주세요.')
        return
      }
      if (matched.mediums.length > 0) {
        setMediumIds(matched.mediums.map((medium) => medium.id))
      }
      if (matched.angles.length > 0) {
        setAngleIds(matched.angles.map((angle) => angle.id))
      }
    } catch (err) {
      setError(
        err instanceof GeminiApiError
          ? err.message
          : 'AI 분류에 실패했어요.',
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
        medium_ids: mediumIds,
        angle_ids: angleIds,
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
                인박스에 저장된 미분류 훅이에요. 매체·앵글·적용 계정을 지정하면
                자동으로 정리 완료 처리됩니다.
              </div>
            )}
            <div>
              <span className="mb-2 block text-[13px] font-semibold text-[#3a3a3c]">
                어디에 둘까요
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ['reference', '레퍼런스', '잘 걸린 남의 릴스. 나중에 패턴으로 검색해요.'],
                    ['own', '내 콘텐츠', '내 영상을 올리면 계정별 데이터로 쌓여요.'],
                  ] as [HookSourceKind, string, string][]
                ).map(([id, label, hint]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSourceKind(id)}
                    className={`rounded-2xl px-4 py-3 text-left transition ${
                      sourceKind === id
                        ? 'bg-white shadow-sm ring-2 ring-[#1d1d1f]'
                        : 'bg-white/70 ring-1 ring-black/[0.05] hover:bg-white'
                    }`}
                  >
                    <span className="block text-[13px] font-semibold text-[#1d1d1f]">
                      {label}
                    </span>
                    <span className="mt-1 block text-[11px] leading-4 text-[#8e8e93]">
                      {hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>
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
              <label className="mt-3 block">
                <span className="mb-2 block text-[13px] font-semibold text-[#3a3a3c]">
                  추가 메모
                </span>
                <input
                  value={sourceNote}
                  onChange={(event) => setSourceNote(event.target.value)}
                  placeholder="참고할 점, 느낌, 맥락 등"
                  className="w-full rounded-2xl border-0 bg-white px-4 py-3 text-[14px] text-[#1d1d1f] shadow-sm outline-none ring-1 ring-black/[0.05] placeholder:text-[#b0b0b5] focus:ring-2 focus:ring-[#b49ba1]/45"
                />
              </label>
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

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[13px] font-semibold text-[#3a3a3c]">
                    분류
                  </span>
                  <p className="mt-0.5 text-[11px] text-[#8e8e93]">
                    매체와 앵글은 독립적으로 복수 선택할 수 있어요
                  </p>
                </div>
                <button
                  type="button"
                  disabled={classifying || !content.trim()}
                  onClick={() => void handleAiClassify()}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f3f0f1] px-2.5 py-1.5 text-[11px] font-semibold text-[#6f5a62] transition hover:bg-[#ebe4e6] disabled:opacity-45"
                >
                  {classifying ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  AI 분류
                </button>
              </div>

              <div>
                <HookAxisMultiSelect
                  kind="medium"
                  label="매체"
                  hint="카드뉴스 커버 / 릴스 음성 / 릴스 시각 / 캡션 텍스트"
                  items={mediums}
                  selectedIds={mediumIds}
                  onChange={setMediumIds}
                  onManage={() =>
                    setShowMediumManager((current) => !current)
                  }
                />
                {showMediumManager && (
                  <HookTaxonomyInlineManager
                    axisLabel="매체"
                    items={mediums}
                    selectedIds={mediumIds}
                    onAdd={onAddMedium}
                    onUpdate={onUpdateMedium}
                    onDelete={onDeleteMedium}
                    onSelectionChange={(ids) => setMediumIds(ids)}
                  />
                )}
              </div>

              <div>
                <HookAxisMultiSelect
                  kind="angle"
                  label="앵글"
                  hint="시작형 / 정보성 / 비교형 / 긴급형 / 공감형 / 분노형"
                  items={angles}
                  selectedIds={angleIds}
                  onChange={setAngleIds}
                  onManage={() =>
                    setShowAngleManager((current) => !current)
                  }
                />
                {showAngleManager && (
                  <HookTaxonomyInlineManager
                    axisLabel="앵글"
                    items={angles}
                    selectedIds={angleIds}
                    onAdd={onAddAngle}
                    onUpdate={onUpdateAngle}
                    onDelete={onDeleteAngle}
                    onSelectionChange={(ids) => setAngleIds(ids)}
                  />
                )}
              </div>
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
                첨부
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
                        mediums={mediums}
                        angles={angles}
                        existingHooks={existingHooks}
                        defaultMediumIds={mediumIds}
                        defaultAngleIds={angleIds}
                        defaultAccountIds={accountIds}
                        defaultSourceNote={sourceNote}
                        onSuggestedMediums={setMediumIds}
                        onSuggestedAngles={setAngleIds}
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
                    링크만 저장하면 나중에 원본은 열 수 있지만, 인스타 영상 자체는 가져오지 못해요. 파일을 올리면 AI가 초반 화면을 분해합니다.
                  </p>
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#f5f5f7] px-3 py-2 text-[12px] font-medium text-[#3a3a3c]">
                    <Upload className="h-3.5 w-3.5" />
                    영상 파일 올리기
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) {
                          setMediaKind('video_file')
                          void upload(file, 'video_file')
                        }
                        event.target.value = ''
                      }}
                    />
                  </label>
                </div>
              )}
              {mediaKind === 'video_file' && (
                <div className="space-y-3">
                  <MediaUploadBox
                    accept="video/mp4,video/webm,video/quicktime"
                    uploading={uploading}
                    url={videoFileUrl}
                    kind="video"
                    onFile={(file) => void upload(file, 'video_file')}
                    onClear={() => {
                      setVideoFileUrl('')
                      setVideoFile(null)
                    }}
                  />
                  <label className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.05]">
                    <span className="text-[12px] font-medium text-[#6e6e73]">
                      원본 릴스 링크 (있으면)
                    </span>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(event) => setVideoUrl(event.target.value)}
                      placeholder="https://www.instagram.com/reel/..."
                      className="mt-2 w-full rounded-xl bg-[#f5f5f7] px-3 py-2.5 text-[13px] outline-none ring-1 ring-transparent focus:ring-[#b49ba1]/40"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.05]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-[#1d1d1f]">
                    AI 분해
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-[#8e8e93]">
                    영상에서 초반·중간·끝 화면을 보고, 검색할 수 있는 패턴으로 저장해요.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={analyzing || uploading}
                  onClick={() => void handleAnalyze()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#1d1d1f] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-45"
                >
                  {analyzing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  분해하기
                </button>
              </div>
              {analysis && (
                <dl className="mt-4 space-y-3 border-t border-black/[0.06] pt-4 text-[12px] leading-5">
                  {(
                    [
                      ['훅', analysis.hook_line],
                      ['처음 보이는 것', analysis.visual],
                      ['대사·자막', analysis.spoken],
                      ['구조', analysis.structure],
                      ['왜 멈추나', analysis.why],
                      ['다시 쓸 패턴', analysis.pattern],
                      ['계정에 남길 것', analysis.takeaway],
                    ] as [string, string][]
                  )
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-[10px] font-semibold tracking-wide text-[#8d6d76]">
                          {label}
                        </dt>
                        <dd className="mt-0.5 whitespace-pre-wrap text-[#2c2c2e]">
                          {value}
                        </dd>
                      </div>
                    ))}
                </dl>
              )}
            </div>

            {error && (
              <p className="rounded-xl bg-[#fff4f4] px-3 py-2 text-[11px] leading-5 text-[#a45a5a]">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-black/[0.06] bg-white/90 px-5 py-4 backdrop-blur-xl sm:px-7">
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
              disabled={saving || uploading || analyzing}
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
              className="block h-auto w-full bg-[#f3f3f5]"
            />
          ) : (
            <video
              src={url}
              controls
              className="block h-auto w-full bg-black"
            />
          )}
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-2 rounded-full bg-black/55 p-1.5 text-white backdrop-blur transition hover:bg-black/70"
            aria-label="첨부 제거"
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
