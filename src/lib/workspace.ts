export type Workspace = 'redpants' | 'jieun'

const WORKSPACE_CODES: Record<string, Workspace> = {
  '1234': 'redpants',
  '4321': 'jieun',
}

export function workspaceFromCode(code: string): Workspace | null {
  return WORKSPACE_CODES[code.trim()] ?? null
}

export function workspaceFromUrl(): Workspace | null {
  const value = new URLSearchParams(window.location.search).get('ws')
  return value === 'redpants' || value === 'jieun' ? value : null
}

export function writeWorkspaceToUrl(workspace: Workspace | null): void {
  const url = new URL(window.location.href)
  if (workspace) {
    url.searchParams.set('ws', workspace)
  } else {
    url.searchParams.delete('ws')
  }
  window.history.pushState({}, '', url)
}

export function workspaceLabel(workspace: Workspace): string {
  return workspace === 'redpants' ? 'Red Pants' : 'Jieun'
}

export function isWorkspaceColumnMissing(error: {
  code?: string
  message?: string
} | null): boolean {
  return Boolean(
    error &&
      (error.code === '42703' ||
        error.message?.includes('column') &&
          error.message.includes('workspace') &&
          error.message.includes('does not exist')),
  )
}
