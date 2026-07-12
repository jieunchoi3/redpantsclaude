import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarOff, Settings2, Trash2, X } from 'lucide-react'
import { AppleSelect, ChannelSelectPills, SelectPills } from './AppleSelect'
import { BrainstormEditor } from './BrainstormEditor'
import { STATUS_COLORS } from '../lib/colors'
import type {
  Account,
  Category,
  Channel,
  Idea,
  IdeaStatus,
  IgFormat,
  JieunChannel,
  JieunFormat,
  YtFormat,
} from '../types'
import { IDEA_STATUSES } from '../types'
import type { IdeaUpdate } from '../lib/ideas'
import type { Workspace } from '../lib/workspace'

interface IdeaDetailPanelProps {
  idea: Idea
  workspace: Workspace
  accounts: Account[]
  categories: Category[]
  onClose: () => void
  onSave: (id: string, patch: IdeaUpdate) => Promise<unknown>
  onArchive: (id: string) => Promise<unknown>
  onOpenCategoryManager: (accountId?: string | null) => void
}

const IG_FORMATS: IgFormat[] = ['카드뉴스', '릴스', '스토리']
const YT_FORMATS: YtFormat[] = ['롱폼', '숏폼']
const CLOSE_MS = 180

export function IdeaDetailPanel({
  idea,
  workspace,
  accounts,
  categories,
  onClose,
  onSave,
  onArchive,
  onOpenCategoryManager,
}: IdeaDetailPanelProps) {
  const [title, setTitle] = useState(idea.title)
  const [brainstorm, setBrainstorm] = useState(idea.brainstorm)
  const [channels, setChannels] = useState<Channel[]>(idea.channels ?? [])
  const [igFormat, setIgFormat] = useState<IgFormat | null>(idea.ig_format)
  const [ytFormat, setYtFormat] = useState<YtFormat | null>(idea.yt_format)
  const [accountId, setAccountId] = useState<string | null>(idea.account_id)
  const [jieunChannel, setJieunChannel] = useState<JieunChannel>(
    idea.jieun_channel ?? '인스타그램',
  )
  const [jieunFormat, setJieunFormat] = useState<JieunFormat>(
    idea.jieun_format ?? '릴스',
  )
  const [categoryId, setCategoryId] = useState<string | null>(idea.category_id)
  const [status, setStatus] = useState<IdeaStatus>(idea.status)
  const [scheduledDate, setScheduledDate] = useState<string | null>(
    idea.scheduled_date,
  )
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    setTitle(idea.title)
    setBrainstorm(idea.brainstorm)
    setChannels(idea.channels ?? [])
    setIgFormat(idea.ig_format)
    setYtFormat(idea.yt_format)
    setAccountId(idea.account_id)
    setJieunChannel(idea.jieun_channel ?? '인스타그램')
    setJieunFormat(idea.jieun_format ?? '릴스')
    setCategoryId(idea.category_id)
    setStatus(idea.status)
    setScheduledDate(idea.scheduled_date)
  }, [idea])

  // 등장 애니메이션 + 배경 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const raf = requestAnimationFrame(() => setOpen(true))

    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = prev
    }
  }, [])

  const requestClose = useCallback(() => {
    if (closing || saving) return
    setClosing(true)
    setOpen(false)
    window.setTimeout(() => onClose(), CLOSE_MS)
  }, [closing, saving, onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        requestClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestClose])

  const filteredCategories = useMemo(() => {
    if (workspace === 'jieun') {
      return accountId
        ? categories.filter((category) => category.account_id === accountId)
        : []
    }
    if (channels.length === 0) return categories
    return categories.filter((c) => channels.includes(c.channel))
  }, [accountId, categories, channels, workspace])

  const categoryOptions = useMemo(
    () => [
      { value: '', label: '선택 안 함' },
      ...filteredCategories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [filteredCategories],
  )

  const statusOptions = useMemo(
    () =>
      IDEA_STATUSES.map((s) => ({
        value: s,
        label: s,
        dotClass: STATUS_COLORS[s].dot,
      })),
    [],
  )

  const accountOptions = useMemo(
    () => [
      { value: '', label: '계정을 선택해주세요' },
      ...accounts.map((account) => ({
        value: account.id,
        label: account.name,
      })),
    ],
    [accounts],
  )

  function toggleChannel(channel: Channel) {
    setChannels((prev) => {
      const next = prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
      if (!next.includes('instagram')) setIgFormat(null)
      if (!next.includes('youtube')) setYtFormat(null)
      return next
    })
  }

  async function handleSave() {
    if (workspace === 'jieun' && !accountId) return
    setSaving(true)
    const nextCategory =
      categoryId && filteredCategories.some((c) => c.id === categoryId)
        ? categoryId
        : null

    const common = {
      title: title.trim() || '제목 없음',
      brainstorm,
      category_id: nextCategory,
      status,
      scheduled_date: scheduledDate,
    }
    await onSave(
      idea.id,
      workspace === 'jieun'
        ? {
            ...common,
            account_id: accountId,
            jieun_channel: jieunChannel,
            jieun_format: jieunFormat,
          }
        : {
            ...common,
            channels,
            ig_format: channels.includes('instagram') ? igFormat : null,
            yt_format: channels.includes('youtube') ? ytFormat : null,
          },
    )
    setSaving(false)
    requestClose()
  }

  async function handleArchive() {
    if (!window.confirm('휴지통으로 이동할까요?')) return
    await onArchive(idea.id)
    requestClose()
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-[180ms] ease-out ${
        open ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="idea-detail-title"
    >
      {/* 오버레이 */}
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={requestClose}
      />

      {/* 중앙 모달 — 화면의 약 80% */}
      <div
        className={`relative z-10 flex h-[min(80vh,900px)] w-[min(80vw,1100px)] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)] transition-all duration-[180ms] ease-out ${
          open
            ? 'scale-100 translate-y-0 opacity-100'
            : 'scale-[0.96] translate-y-2 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-5 py-4 sm:px-6">
          <h3
            id="idea-detail-title"
            className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]"
          >
            아이디어 상세
          </h3>
          <button
            type="button"
            onClick={requestClose}
            className="rounded-full p-1.5 text-[#6e6e73] transition hover:bg-[#f5f5f7]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <Field label="제목">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl bg-[#f5f5f7] px-3.5 py-2.5 text-[15px] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#d2d2d7]"
              placeholder="제목"
            />
          </Field>

          <Field label="브레인스토밍">
            <BrainstormEditor value={brainstorm} onChange={setBrainstorm} />
          </Field>

          {workspace === 'jieun' ? (
            <>
              <Field label="계정 (필수)">
                <AppleSelect
                  value={accountId ?? ''}
                  options={accountOptions}
                  placeholder="계정을 선택해주세요"
                  onChange={(value) => {
                    setAccountId(value || null)
                    setCategoryId(null)
                  }}
                />
                {!accountId && (
                  <p className="mt-1.5 text-[11px] font-medium text-amber-600">
                    저장하려면 계정을 선택해주세요.
                  </p>
                )}
              </Field>

              <Field label="채널">
                <SelectPills
                  options={[
                    { value: '인스타그램', label: '인스타그램' },
                    { value: '해당 없음', label: '해당 없음' },
                  ]}
                  value={jieunChannel}
                  tone="pink"
                  onChange={(value) => setJieunChannel(value as JieunChannel)}
                />
              </Field>

              <Field label="포맷">
                <SelectPills
                  options={[
                    { value: '릴스', label: '릴스' },
                    { value: '포스트', label: '포스트' },
                  ]}
                  value={jieunFormat}
                  tone="pink"
                  onChange={(value) => setJieunFormat(value as JieunFormat)}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="채널">
                <ChannelSelectPills value={channels} onChange={toggleChannel} />
              </Field>

              {channels.includes('instagram') && (
                <Field label="인스타그램 포맷">
                  <SelectPills
                    options={IG_FORMATS.map((f) => ({ value: f, label: f }))}
                    value={igFormat}
                    tone="pink"
                    onChange={setIgFormat}
                  />
                </Field>
              )}

              {channels.includes('youtube') && (
                <Field label="유튜브 포맷">
                  <SelectPills
                    options={YT_FORMATS.map((f) => ({ value: f, label: f }))}
                    value={ytFormat}
                    tone="red"
                    onChange={setYtFormat}
                  />
                </Field>
              )}
            </>
          )}

          <Field
            label="카테고리"
            action={
              <button
                type="button"
                onClick={() => onOpenCategoryManager(accountId)}
                disabled={workspace === 'jieun' && !accountId}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[#6e6e73] transition hover:text-[#1d1d1f]"
              >
                <Settings2 className="h-3.5 w-3.5" />
                관리
              </button>
            }
          >
            <AppleSelect
              value={categoryId ?? ''}
              options={categoryOptions}
              placeholder="선택 안 함"
              onChange={(v) => setCategoryId(v || null)}
            />
          </Field>

          <Field label="진행 현황">
            <AppleSelect
              value={status}
              options={statusOptions}
              statusStyle
              onChange={(v) => setStatus(v as IdeaStatus)}
            />
          </Field>

          {scheduledDate && (
            <Field label="배정 일정">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f5f5f7] px-3.5 py-2.5">
                <span className="text-[14px] font-medium text-[#1d1d1f]">
                  {scheduledDate}
                </span>
                <button
                  type="button"
                  onClick={() => setScheduledDate(null)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-[#6e6e73] transition hover:bg-white hover:text-[#1d1d1f]"
                >
                  <CalendarOff className="h-3.5 w-3.5" />
                  일정 제거
                </button>
              </div>
            </Field>
          )}

        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-black/5 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => void handleArchive()}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-red-500 transition hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            삭제
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={requestClose}
            className="rounded-xl px-4 py-2.5 text-[13px] font-medium text-[#6e6e73] transition hover:bg-[#f5f5f7]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || (workspace === 'jieun' && !accountId)}
            className="rounded-xl bg-[#1d1d1f] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-black disabled:opacity-50"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  action,
}: {
  label: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-medium text-[#6e6e73]">{label}</label>
        {action}
      </div>
      {children}
    </div>
  )
}
