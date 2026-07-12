import type { Account, HookType } from '../types'
import { accountColor } from './accounts'

const DEFAULT_TYPE_COLOR = '#bca8af'
const DEFAULT_TYPE_TEXT = '#76636a'

export function withAlpha(color: string, alpha: number): string {
  const hex = color.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    return `rgba(188, 168, 175, ${alpha})`
  }
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

export function hookTypeBadgeStyle(type?: HookType | null) {
  const color = type?.color ?? DEFAULT_TYPE_COLOR
  return {
    color: type?.color ?? DEFAULT_TYPE_TEXT,
    backgroundColor: withAlpha(color, 0.16),
    boxShadow: `inset 0 0 0 1px ${withAlpha(color, 0.22)}`,
  } as const
}

export function accountChipStyle(account: Account, index: number) {
  const color = accountColor(account, index)
  return {
    color: '#4d4d50',
    backgroundColor: withAlpha(color, 0.12),
    boxShadow: `inset 0 0 0 1px ${withAlpha(color, 0.2)}`,
  } as const
}

export type VideoLinkMeta = {
  label: string
  host: string
  gradient: string
  accent: string
}

export function getVideoLinkMeta(url: string): VideoLinkMeta {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    if (host.includes('instagram')) {
      return {
        label: 'Instagram 릴스',
        host,
        gradient: 'from-[#fce4ec] via-[#f3e5f5] to-[#fff3e0]',
        accent: '#c13584',
      }
    }
    if (host.includes('youtube') || host.includes('youtu.be')) {
      return {
        label: 'YouTube',
        host,
        gradient: 'from-[#ffe8e8] via-[#fff0f0] to-[#f7f7f8]',
        accent: '#ff0000',
      }
    }
    if (host.includes('tiktok')) {
      return {
        label: 'TikTok',
        host,
        gradient: 'from-[#e8f7f7] via-[#f0f4f8] to-[#f7f7f8]',
        accent: '#111111',
      }
    }
    return {
      label: '외부 영상 링크',
      host,
      gradient: 'from-[#f1e7ea] via-[#eceef4] to-[#f7f7f8]',
      accent: '#765f68',
    }
  } catch {
    return {
      label: '영상 링크',
      host: '링크',
      gradient: 'from-[#f1e7ea] via-[#eceef4] to-[#f7f7f8]',
      accent: '#765f68',
    }
  }
}
