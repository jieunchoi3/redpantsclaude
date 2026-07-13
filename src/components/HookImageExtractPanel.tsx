import { useMemo, useState } from 'react'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { GeminiApiError } from '../lib/gemini'
import {
  extractHooksFromImage,
  imageSourceToBase64,
  type ExtractedPhrase,
} from '../lib/hookImageExtract'
import type { HookInput } from '../lib/hooks'
import type { HookAngle, HookItem, HookMedium } from '../types'
import { HookAxisMultiSelect } from './HookAxisMultiSelect'

interface HookImageExtractPanelProps {
  imageFile: File | null
  imageUrl: string | null
  mediums: HookMedium[]
  angles: HookAngle[]
  existingHooks: HookItem[]
  defaultMediumIds: string[]
  defaultAngleIds: string[]
  defaultAccountIds: string[]
  defaultSourceNote: string
  onSuggestedMediums: (ids: string[]) => void
  onSuggestedAngles: (ids: string[]) => void
  onCreateHooks: (inputs: HookInput[]) => Promise<number>
  onDone: () => void
}

export function HookImageExtractPanel({
  imageFile,
  imageUrl,
  mediums,
  angles,
  existingHooks,
  defaultMediumIds,
  defaultAngleIds,
  defaultAccountIds,
  defaultSourceNote,
  onSuggestedMediums,
  onSuggestedAngles,
  onCreateHooks,
  onDone,
}: HookImageExtractPanelProps) {
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phrases, setPhrases] = useState<ExtractedPhrase[]>([])
  const [mediumIds, setMediumIds] = useState(defaultMediumIds)
  const [angleIds, setAngleIds] = useState(defaultAngleIds)
  const [hasExtracted, setHasExtracted] = useState(false)

  const existingContents = useMemo(
    () =>
      new Set(
        existingHooks
          .filter((hook) => !hook.archived)
          .map((hook) => hook.content.trim()),
      ),
    [existingHooks],
  )

  const selectedCount = phrases.filter(
    (phrase) => phrase.selected && !phrase.duplicate,
  ).length

  async function runExtract() {
    setExtracting(true)
    setError(null)
    try {
      const image = await imageSourceToBase64(imageFile, imageUrl)
      if (!image) {
        setError('이미지를 읽지 못했어요. 다시 붙여넣거나 업로드해 주세요.')
        return
      }

      const result = await extractHooksFromImage(
        image,
        mediums,
        angles,
        existingContents,
      )
      setPhrases(result.phrases)
      setHasExtracted(true)

      if (result.phrases.length === 0) {
        setError('이미지에서 훅 문구를 찾지 못했어요.')
        return
      }

      if (result.suggestedMediums.length > 0) {
        const ids = result.suggestedMediums.map((medium) => medium.id)
        setMediumIds(ids)
        onSuggestedMediums(ids)
      }
      if (result.suggestedAngles.length > 0) {
        const ids = result.suggestedAngles.map((angle) => angle.id)
        setAngleIds(ids)
        onSuggestedAngles(ids)
      }
    } catch (err) {
      setError(
        err instanceof GeminiApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : '훅 추출에 실패했어요.',
      )
    } finally {
      setExtracting(false)
    }
  }

  async function saveSelected() {
    const selected = phrases.filter(
      (phrase) => phrase.selected && !phrase.duplicate && phrase.text.trim(),
    )
    if (selected.length === 0) {
      setError('저장할 훅을 하나 이상 선택해 주세요.')
      return
    }

    setSaving(true)
    setError(null)
    const inputs: HookInput[] = selected.map((phrase) => ({
      content: phrase.text.trim(),
      medium_ids: mediumIds,
      angle_ids: angleIds,
      media_kind: imageUrl ? 'image' : 'none',
      image_url: imageUrl,
      video_url: null,
      video_file_url: null,
      source_note: defaultSourceNote.trim() || null,
      is_inbox: false,
      account_ids: defaultAccountIds,
    }))

    const created = await onCreateHooks(inputs)
    setSaving(false)
    if (created === 0) {
      setError('훅을 저장하지 못했어요.')
      return
    }
    onDone()
  }

  function togglePhrase(index: number) {
    setPhrases((current) =>
      current.map((phrase, i) =>
        i === index && !phrase.duplicate
          ? { ...phrase, selected: !phrase.selected }
          : phrase,
      ),
    )
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.05]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-[#2c2c2e]">
            AI 훅 추출
          </p>
          <p className="mt-0.5 text-[10px] leading-4 text-[#8e8e93]">
            카드뉴스 커버·릴스 프레임에서 훅 문구를 뽑아요
          </p>
        </div>
        {!hasExtracted && (
          <button
            type="button"
            disabled={extracting || (!imageFile && !imageUrl)}
            onClick={() => void runExtract()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#1d1d1f] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-black disabled:opacity-45"
          >
            {extracting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            이미지에서 훅 추출
          </button>
        )}
      </div>

      {error && (
        <pre className="mb-3 max-h-36 overflow-auto whitespace-pre-wrap rounded-xl bg-[#fff4f5] px-3 py-2 text-[10px] leading-4 text-[#9a4f5d]">
          {error}
        </pre>
      )}

      {hasExtracted && phrases.length > 0 && (
        <div className="space-y-3">
          <HookAxisMultiSelect
            kind="medium"
            label="추천 매체"
            items={mediums}
            selectedIds={mediumIds}
            onChange={(ids) => {
              setMediumIds(ids)
              onSuggestedMediums(ids)
            }}
          />
          <HookAxisMultiSelect
            kind="angle"
            label="추천 앵글"
            items={angles}
            selectedIds={angleIds}
            onChange={(ids) => {
              setAngleIds(ids)
              onSuggestedAngles(ids)
            }}
          />

          <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-xl bg-[#f7f7f9] p-2">
            {phrases.map((phrase, index) => (
              <label
                key={`${phrase.text}-${index}`}
                className={`flex cursor-pointer items-start gap-2 rounded-xl px-2.5 py-2 transition ${
                  phrase.duplicate
                    ? 'bg-[#f0f0f2] opacity-70'
                    : phrase.selected
                      ? 'bg-white shadow-sm ring-1 ring-black/[0.05]'
                      : 'hover:bg-white/70'
                }`}
              >
                <input
                  type="checkbox"
                  checked={phrase.selected}
                  disabled={phrase.duplicate}
                  onChange={() => togglePhrase(index)}
                  className="mt-0.5"
                />
                <span className="min-w-0 flex-1 text-[12px] leading-5 text-[#2c2c2e]">
                  {phrase.text}
                </span>
                {phrase.duplicate ? (
                  <span className="shrink-0 rounded-full bg-[#ececf0] px-2 py-0.5 text-[9px] font-medium text-[#8e8e93]">
                    중복
                  </span>
                ) : phrase.selected ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#5f7d6c]" />
                ) : null}
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => void runExtract()}
              disabled={extracting || saving}
              className="rounded-xl px-3 py-2 text-[11px] font-medium text-[#6e6e73] transition hover:bg-[#f5f5f7]"
            >
              다시 추출
            </button>
            <button
              type="button"
              disabled={saving || selectedCount === 0}
              onClick={() => void saveSelected()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d1d1f] px-3.5 py-2 text-[11px] font-semibold text-white transition hover:bg-black disabled:opacity-45"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              선택한 {selectedCount}개 저장
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
