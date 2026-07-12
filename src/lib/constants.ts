/** 콘텐츠 플래너 전용 — 기존 Supabase 공유 시 충돌 방지 */
export const TABLES = {
  categories: 'cp_categories',
  ideas: 'cp_ideas',
  accounts: 'cp_accounts',
  hooks: 'cp_hooks',
  hookTypes: 'cp_hook_types',
  hookAccounts: 'cp_hook_accounts',
  hookUsages: 'cp_hook_usages',
  appMeta: 'cp_app_meta',
} as const

export const STORAGE_BUCKET = 'cp-idea-images'
export const HOOK_MEDIA_BUCKET = 'cp-hook-media'
