export type Workspace = 'redpants' | 'jieun'

const WORKSPACE_CODES: Record<string, Workspace> = {
  '1234': 'redpants',
  '4321': 'jieun',
}


export function workspaceFromCode(code: string): Workspace | null {
  return WORKSPACE_CODES[code.trim()] ?? null
}

function isWorkspace(value: string | null | undefined): value is Workspace {
  return value === 'redpants' || value === 'jieun'
}

/** Parse ws from query string, including malformed accumulated params. */
export function workspaceFromUrl(
  search = window.location.search,
): Workspace | null {
  const params = new URLSearchParams(search)
  const allWs = params.getAll('ws').filter(isWorkspace)
  if (allWs.length > 0) return allWs[allWs.length - 1]!

  for (const [key, value] of params.entries()) {
    if (isWorkspace(value)) return value

    const decodedKey = decodeURIComponent(key).trim()
    if (decodedKey === 'ws' && isWorkspace(value)) return value

    const embedded = decodedKey.match(/^ws=(redpants|jieun)/)
    if (embedded) return embedded[1] as Workspace
  }

  const decoded = decodeURIComponent(search)
  const matches = [
    ...decoded.matchAll(/(?:^|[?&])ws=(redpants|jieun)(?:&|$)/g),
  ]
  if (matches.length > 0) {
    return matches[matches.length - 1]![1] as Workspace
  }

  return null
}

function buildWorkspaceUrl(workspace: Workspace | null): string {
  const url = new URL(window.location.origin + window.location.pathname)
  if (window.location.hash) url.hash = window.location.hash
  if (workspace) url.searchParams.set('ws', workspace)
  return url.pathname + url.search + url.hash
}

/** Replace the URL with exactly one clean `ws` param (or none). */
export function normalizeWorkspaceUrl(workspace: Workspace | null): void {
  const target = buildWorkspaceUrl(workspace)
  const current =
    window.location.pathname + window.location.search + window.location.hash
  if (target !== current) {
    window.history.replaceState(window.history.state, '', target)
  }
}

export function writeWorkspaceToUrl(workspace: Workspace | null): void {
  const target = buildWorkspaceUrl(workspace)
  window.history.pushState(window.history.state, '', target)
}

export function workspaceLabel(workspace: Workspace): string {
  return workspace === 'redpants' ? 'Red Pants' : 'Jieun'
}

export function documentTitle(workspace: Workspace | null): string {
  if (!workspace) return '콘텐츠 플래너'
  return `${workspaceLabel(workspace)} · 콘텐츠 플래너`
}

export function isWorkspaceColumnMissing(error: {
  code?: string
  message?: string
} | null): boolean {
  return Boolean(
    error &&
      (error.code === '42703' ||
        (error.message?.includes('column') &&
          error.message.includes('workspace') &&
          error.message.includes('does not exist'))),
  )
}
