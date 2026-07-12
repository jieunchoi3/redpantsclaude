import type { Account } from '../types'
import { TABLES } from './constants'
import { getSupabase } from './supabase'
import type { Workspace } from './workspace'

export const ACCOUNT_COLORS = [
  '#E9A6B3',
  '#A9C7E8',
  '#B8B0DF',
  '#9CCFC1',
  '#E6C58F',
  '#C7B39C',
  '#AFC3A5',
] as const

export function accountColor(account: Account, index = 0): string {
  return account.color || ACCOUNT_COLORS[index % ACCOUNT_COLORS.length]!
}

export async function fetchAccounts(
  workspace: Workspace,
): Promise<Account[]> {
  if (workspace !== 'jieun') return []
  const sb = getSupabase()
  if (!sb) return []

  const { data, error } = await sb
    .from(TABLES.accounts)
    .select('*')
    .eq('workspace', workspace)
    .eq('archived', false)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[cp_accounts] fetch error:', error.message)
    return []
  }
  return (data ?? []) as Account[]
}

export async function createAccount(
  workspace: Workspace,
  input: Pick<Account, 'name' | 'color' | 'sort_order'>,
): Promise<Account | null> {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from(TABLES.accounts)
    .insert({ workspace, ...input, archived: false })
    .select()
    .single()

  if (error) {
    console.warn('[cp_accounts] create error:', error.message)
    return null
  }
  return data as Account
}

export async function updateAccount(
  workspace: Workspace,
  id: string,
  patch: Partial<
    Pick<Account, 'name' | 'color' | 'sort_order' | 'archived' | 'notes'>
  >,
): Promise<Account | null> {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from(TABLES.accounts)
    .update(patch)
    .eq('id', id)
    .eq('workspace', workspace)
    .select()
    .single()

  if (error) {
    console.warn('[cp_accounts] update error:', error.message)
    return null
  }
  return data as Account
}

export function flushAccountNotes(accountId: string, notes: string) {
  const sbUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const sbKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!sbUrl || !sbKey) return

  void fetch(`${sbUrl}/rest/v1/cp_accounts?id=eq.${accountId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: sbKey,
      Authorization: `Bearer ${sbKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      notes,
      updated_at: new Date().toISOString(),
    }),
    keepalive: true,
  })
}

export function accountHasNotes(account: Account): boolean {
  return Boolean(account.notes?.trim())
}
