import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import {
  CHANNEL_COLORS,
  FORMAT_PILL,
  PILL_IDLE,
  STATUS_COLORS,
} from '../lib/colors'
import type { Channel, IdeaStatus } from '../types'
import { InstagramIcon, YoutubeIcon } from './ChannelBadge'

export interface SelectOption {
  value: string
  label: string
  /** 옵션 앞에 표시할 작은 점 색상 클래스 */
  dotClass?: string
  /** 선택된 트리거에 적용할 soft pill 클래스 */
  pillClass?: string
}

interface AppleSelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  /** 선택된 값을 상태 pill로 표시 */
  statusStyle?: boolean
}

export function AppleSelect({
  value,
  options,
  onChange,
  placeholder = '선택…',
  disabled,
  statusStyle,
}: AppleSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selected = options.find((o) => o.value === value)
  const statusPill =
    statusStyle && value in STATUS_COLORS
      ? STATUS_COLORS[value as IdeaStatus].pill
      : null

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-left text-[14px] transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f]/10 disabled:opacity-50 ${
          open
            ? 'bg-white ring-1 ring-[#d2d2d7] shadow-[var(--shadow-sm)]'
            : 'bg-[#f5f5f7] hover:bg-[#ebebed]'
        }`}
      >
        {statusPill ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${statusPill}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
            {selected?.label}
          </span>
        ) : (
          <>
            {selected?.dotClass && (
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${selected.dotClass}`}
              />
            )}
            <span
              className={`min-w-0 flex-1 truncate ${
                selected ? 'font-medium text-[#1d1d1f]' : 'text-[#aeaeb2]'
              }`}
            >
              {selected?.label ?? placeholder}
            </span>
          </>
        )}
        {!statusPill && <span className="flex-1" />}
        <ChevronDown
          className={`ml-auto h-4 w-4 shrink-0 text-[#aeaeb2] transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-[calc(100%+6px)] right-0 left-0 z-50 max-h-56 overflow-y-auto rounded-2xl bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5"
        >
          {options.map((opt) => {
            const active = opt.value === value
            const soft =
              statusStyle && opt.value in STATUS_COLORS
                ? STATUS_COLORS[opt.value as IdeaStatus].soft
                : null
            return (
              <li key={opt.value || '__empty'}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] transition ${
                    active
                      ? soft
                        ? `${soft} font-semibold`
                        : 'bg-[#f5f5f7] font-semibold text-[#1d1d1f]'
                      : 'text-[#1d1d1f] hover:bg-[#f5f5f7]'
                  }`}
                >
                  {opt.dotClass ? (
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${opt.dotClass}`}
                    />
                  ) : (
                    <span className="h-2.5 w-2.5 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                  {active && (
                    <Check className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

type PillTone = 'neutral' | 'pink' | 'red' | 'instagram' | 'youtube'

interface SelectPillsProps<T extends string> {
  options: { value: T; label: string; icon?: 'instagram' | 'youtube' }[]
  value: T | T[] | null
  onChange: (value: T) => void
  multiple?: boolean
  tone?: PillTone
}

export function SelectPills<T extends string>({
  options,
  value,
  onChange,
  multiple = false,
  tone = 'neutral',
}: SelectPillsProps<T>) {
  function isActive(v: T) {
    if (multiple && Array.isArray(value)) return value.includes(v)
    return value === v
  }

  function activeClass(optValue: T): string {
    if (tone === 'instagram' || optValue === 'instagram') {
      return CHANNEL_COLORS.instagram.pillActive
    }
    if (tone === 'youtube' || optValue === 'youtube') {
      return CHANNEL_COLORS.youtube.pillActive
    }
    if (tone === 'pink') return FORMAT_PILL.ig.active
    if (tone === 'red') return FORMAT_PILL.yt.active
    return FORMAT_PILL.neutral.active
  }

  function idleClass(optValue: T): string {
    if (tone === 'instagram' || optValue === 'instagram') {
      return CHANNEL_COLORS.instagram.pillIdle
    }
    if (tone === 'youtube' || optValue === 'youtube') {
      return CHANNEL_COLORS.youtube.pillIdle
    }
    if (tone === 'pink') return FORMAT_PILL.ig.idle
    if (tone === 'red') return FORMAT_PILL.yt.idle
    return PILL_IDLE
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = isActive(opt.value)
        const showIg = opt.icon === 'instagram' || opt.value === 'instagram'
        const showYt = opt.icon === 'youtube' || opt.value === 'youtube'
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200 active:scale-[0.97] ${
              active ? activeClass(opt.value) : idleClass(opt.value)
            }`}
          >
            {showIg && <InstagramIcon className="h-3.5 w-3.5" />}
            {showYt && <YoutubeIcon className="h-3.5 w-3.5" />}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/** 채널 전용 멀티 선택 pill */
export function ChannelSelectPills({
  value,
  onChange,
}: {
  value: Channel[]
  onChange: (channel: Channel) => void
}) {
  return (
    <SelectPills
      options={[
        { value: 'instagram', label: '인스타그램', icon: 'instagram' },
        { value: 'youtube', label: '유튜브', icon: 'youtube' },
      ]}
      value={value}
      multiple
      onChange={onChange}
    />
  )
}
