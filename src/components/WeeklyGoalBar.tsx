import { addWeeks, subWeeks } from 'date-fns'
import { Check, ChevronLeft, ChevronRight, Pencil, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { InstagramIcon, YoutubeIcon } from './ChannelBadge'
import {
  countWeeklyFormats,
  formatWeekLabel,
  type FormatProgress,
  type GoalKey,
} from '../lib/weeklyGoals'
import type { AppMeta, Idea } from '../types'

interface WeeklyGoalBarProps {
  weekAnchor: Date
  onWeekChange: (date: Date) => void
  ideas: Idea[]
  meta: AppMeta | null
  onUpdateGoals: (patch: Partial<Pick<AppMeta, GoalKey>>) => Promise<boolean>
}

const IG_KEYS: GoalKey[] = ['goal_ig_cardnews', 'goal_ig_reels']
const YT_KEYS: GoalKey[] = ['goal_yt_long', 'goal_yt_short']

export function WeeklyGoalBar({
  weekAnchor,
  onWeekChange,
  ideas,
  meta,
  onUpdateGoals,
}: WeeklyGoalBarProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    goal_ig_cardnews: meta?.goal_ig_cardnews ?? 2,
    goal_ig_reels: meta?.goal_ig_reels ?? 1,
    goal_yt_long: meta?.goal_yt_long ?? 1,
    goal_yt_short: meta?.goal_yt_short ?? 3,
  })
  const [saving, setSaving] = useState(false)

  const progress = useMemo(
    () => countWeeklyFormats(ideas, weekAnchor, meta),
    [ideas, weekAnchor, meta],
  )

  const igItems = progress.filter((p) => IG_KEYS.includes(p.key))
  const ytItems = progress.filter((p) => YT_KEYS.includes(p.key))

  function openEdit() {
    setDraft({
      goal_ig_cardnews: meta?.goal_ig_cardnews ?? 2,
      goal_ig_reels: meta?.goal_ig_reels ?? 1,
      goal_yt_long: meta?.goal_yt_long ?? 1,
      goal_yt_short: meta?.goal_yt_short ?? 3,
    })
    setEditing(true)
  }

  async function saveGoals() {
    setSaving(true)
    const ok = await onUpdateGoals(draft)
    setSaving(false)
    if (ok) setEditing(false)
  }

  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-sm)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onWeekChange(subWeeks(weekAnchor, 1))}
            className="rounded-lg p-1.5 text-[#6e6e73] transition hover:bg-[#f5f5f7]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[88px] text-center text-[13px] font-semibold text-[#1d1d1f]">
            {formatWeekLabel(weekAnchor)}
          </span>
          <button
            type="button"
            onClick={() => onWeekChange(addWeeks(weekAnchor, 1))}
            className="rounded-lg p-1.5 text-[#6e6e73] transition hover:bg-[#f5f5f7]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onWeekChange(new Date())}
            className="ml-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[#6e6e73] transition hover:bg-[#f5f5f7]"
          >
            이번 주
          </button>
        </div>

        {!editing ? (
          <button
            type="button"
            onClick={openEdit}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[#6e6e73] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
          >
            <Pencil className="h-3 w-3" />
            목표 수정
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg p-1.5 text-[#6e6e73] hover:bg-[#f5f5f7]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => void saveGoals()}
              disabled={saving}
              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <EditGroup
            title="인스타그램"
            icon={<InstagramIcon className="h-3.5 w-3.5" />}
            accent="pink"
            fields={[
              { key: 'goal_ig_cardnews', label: '카드뉴스' },
              { key: 'goal_ig_reels', label: '릴스' },
            ]}
            draft={draft}
            setDraft={setDraft}
          />
          <EditGroup
            title="유튜브"
            icon={<YoutubeIcon className="h-3.5 w-3.5" />}
            accent="red"
            fields={[
              { key: 'goal_yt_long', label: '롱폼' },
              { key: 'goal_yt_short', label: '숏폼' },
            ]}
            draft={draft}
            setDraft={setDraft}
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <ChannelGroup
            title="인스타그램"
            icon={<InstagramIcon className="h-3.5 w-3.5" />}
            accent="pink"
            items={igItems}
          />
          <ChannelGroup
            title="유튜브"
            icon={<YoutubeIcon className="h-3.5 w-3.5" />}
            accent="red"
            items={ytItems}
          />
        </div>
      )}
    </div>
  )
}

function ChannelGroup({
  title,
  icon,
  accent,
  items,
}: {
  title: string
  icon: React.ReactNode
  accent: 'pink' | 'red'
  items: FormatProgress[]
}) {
  const header =
    accent === 'pink'
      ? 'text-pink-600'
      : 'text-red-600'
  const box =
    accent === 'pink'
      ? 'bg-pink-50/40 ring-1 ring-pink-100/80'
      : 'bg-red-50/40 ring-1 ring-red-100/80'
  const doneBar = accent === 'pink' ? 'bg-pink-500' : 'bg-red-500'
  const planBar = accent === 'pink' ? 'bg-pink-200' : 'bg-red-200'

  return (
    <div className={`rounded-2xl px-3.5 py-3 ${box}`}>
      <div className={`mb-2.5 flex items-center gap-1.5 text-[12px] font-semibold ${header}`}>
        {icon}
        {title}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const done = item.completed
          const planned = item.planned
          const remainingPlanned = Math.max(0, planned - done)
          const goal = Math.max(item.goal, 1)
          const donePct = Math.min(100, (done / goal) * 100)
          const planPct = Math.min(100 - donePct, (remainingPlanned / goal) * 100)

          return (
            <div key={item.key}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-medium text-[#6e6e73]">
                  {item.label}
                </span>
                <span className="text-[12px] tabular-nums">
                  <span className="font-semibold text-[#1d1d1f]">{done}</span>
                  {remainingPlanned > 0 && (
                    <span className="font-medium text-[#aeaeb2]">
                      +{remainingPlanned}
                    </span>
                  )}
                  <span className="text-[#aeaeb2]">/{item.goal}</span>
                </span>
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-white/80">
                <div
                  className={`rounded-full transition-all duration-300 ${doneBar}`}
                  style={{ width: `${donePct}%` }}
                />
                <div
                  className={`rounded-full transition-all duration-300 ${planBar}`}
                  style={{ width: `${planPct}%` }}
                />
              </div>
              <p className="mt-0.5 text-[10px] text-[#aeaeb2]">
                완료 {done} · 계획 {planned}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EditGroup({
  title,
  icon,
  accent,
  fields,
  draft,
  setDraft,
}: {
  title: string
  icon: React.ReactNode
  accent: 'pink' | 'red'
  fields: { key: GoalKey; label: string }[]
  draft: Record<GoalKey, number>
  setDraft: React.Dispatch<React.SetStateAction<Record<GoalKey, number>>>
}) {
  const header = accent === 'pink' ? 'text-pink-600' : 'text-red-600'
  const box =
    accent === 'pink'
      ? 'bg-pink-50/40 ring-1 ring-pink-100/80'
      : 'bg-red-50/40 ring-1 ring-red-100/80'

  return (
    <div className={`rounded-2xl px-3.5 py-3 ${box}`}>
      <div className={`mb-2 flex items-center gap-1.5 text-[12px] font-semibold ${header}`}>
        {icon}
        {title}
      </div>
      <div className="flex flex-col gap-2">
        {fields.map((item) => (
          <label
            key={item.key}
            className="flex items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 text-[12px]"
          >
            <span className="text-[#6e6e73]">{item.label}</span>
            <input
              type="number"
              min={0}
              value={draft[item.key]}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  [item.key]: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              className="w-12 rounded-lg bg-white px-2 py-1 text-center text-[13px] font-medium outline-none ring-1 ring-[#d2d2d7]"
            />
          </label>
        ))}
      </div>
    </div>
  )
}
